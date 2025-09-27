from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from typing import List
import uvicorn  # Import uvicorn

# LangChain components
from langchain_groq import ChatGroq
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceInstructEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.document_loaders import UnstructuredFileLoader 
# Utility and environment loading
from dotenv import load_dotenv

# -----------------
# INITIAL SETUP
# -----------------

load_dotenv()
groq_api_key = os.getenv('GROQ_API_KEY')
if not groq_api_key:
    raise ValueError("Missing GROQ_API_KEY!")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to hold the vector store in memory
vector_store = None

# -----------------
# API ENDPOINTS
# -----------------

@app.post("/process-documents/")
async def process_documents(
    files: List[UploadFile] = File(...),
    chunk_size: str = Form("800"),
    embedding_model: str = Form("text-embedding-ada-002")
):
    """
    Endpoint to upload and process one or more PDF files.
    """
    global vector_store

    print(f"Received {len(files)} files. Chunk size: {chunk_size}, Embedding Model: {embedding_model}")

    all_docs = []

    try:
        for file in files:
            # This check is now optional, as Unstructured can handle many types,
            # but it's good practice to validate against what the frontend allows.
            allowed_extensions = (".pdf", ".docx", ".pptx", ".txt")
            if not file.filename.endswith(allowed_extensions):
                print(f"Skipping unsupported file type: {file.filename}")
                continue

            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            # USE THE NEW LOADER
            loader = UnstructuredFileLoader(tmp_file_path)
            docs = loader.load()
            all_docs.extend(docs)

            os.remove(tmp_file_path)

        if not all_docs:
            raise HTTPException(status_code=400, detail="No processable PDF content found.")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=int(chunk_size), chunk_overlap=200)
        final_documents = text_splitter.split_documents(all_docs)

        print(f"Using embedding model: BAAI/bge-base-en-v1.5 (frontend selected '{embedding_model}')")
        embeddings = HuggingFaceInstructEmbeddings(model_name="BAAI/bge-base-en-v1.5")
        vector_store = FAISS.from_documents(final_documents, embeddings)

        return {"status": "success", "message": f"Successfully processed {len(all_docs)} pages."}

    except Exception as e:
        vector_store = None
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@app.post("/chat/")
async def chat_with_doc(query: dict):
    """
    Endpoint to ask a question and get an answer.
    """
    global vector_store
    user_question = query.get("question")

    if vector_store is None:
        raise HTTPException(status_code=400, detail="Please process a document first.")

    if not user_question:
        raise HTTPException(status_code=400, detail="No question provided.")

    try:
        llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.1-8b-instant")
        prompt = ChatPromptTemplate.from_template(
            """
        
You are a helpful Q&A assistant. Your task is to answer the user's question based ONLY on the provided context.

If the information to answer the question is not in the context, you MUST state that you cannot find the answer in the provided documents. Do not make up information or use any external knowledge.

<context>
{context}
</context>

Question: {input}
            """
        )

        document_chain = create_stuff_documents_chain(llm, prompt)
        retriever = vector_store.as_retriever()
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        response = retrieval_chain.invoke({'input': user_question})

        return {"answer": response['answer']}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during chat: {e}")

# This block allows running the script directly
if __name__ == "__main__":
    uvicorn.run("rag_expert:app", host="0.0.0.0", port=8002, reload=True)