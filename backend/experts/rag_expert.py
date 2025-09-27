import streamlit as st
import os
import time
import tempfile
import base64
import io

# LangChain components
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceInstructEmbeddings
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage

# Utility and environment loading
from dotenv import load_dotenv
import fitz  # PyMuPDF
from PIL import Image

# -----------------
# INITIAL SETUP
# -----------------

# Load environment variables from .env file
load_dotenv()
groq_api_key = os.getenv('GROQ_API_KEY')
google_api_key = os.getenv('GOOGLE_API_KEY')

# Set up Streamlit page
st.set_page_config(page_title="Chat with Your Document", layout="wide")
st.title("📄 Chat with Your Document (Text & Visuals) ✨")

# Check for necessary API keys at the start
if not groq_api_key or not google_api_key:
    st.error("🚨 Missing API Keys! Please make sure GROQ_API_KEY and GOOGLE_API_KEY are in your .env file.")
    st.stop()

# -----------------
# CORE FUNCTIONS
# -----------------

@st.cache_resource
def get_embedding_model():
    """Loads the embedding model and caches it."""
    return HuggingFaceInstructEmbeddings(model_name="BAAI/bge-base-en-v1.5")

def get_image_description_gemini(image_bytes):
    """Generates a detailed description for an image using the Gemini 1.5 Flash API."""
    try:
        # Initialize the Gemini model. Using "-latest" ensures compatibility with AI Studio keys.
        vision_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", google_api_key=google_api_key)
        
        # Prepare the message for the model
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": "Describe this image, chart, or graph in detail. What information does it convey? Be specific about data points, trends, and labels.",
                },
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"}},
            ]
        )
        
        # Get the response from the model
        response = vision_llm.invoke([message])
        return response.content
    except Exception as e:
        # Provide a more specific error message if possible
        st.error(f"An error occurred while analyzing the image with Gemini: {e}")
        return None

def process_and_embed_pdf(uploaded_file):
    """
    Extracts text and images from a PDF, generates descriptions for the images,
    and creates a searchable vector store of all content.
    """
    all_docs = []
    
    with st.status("Processing your document...", expanded=True) as status:
        try:
            # Save uploaded file to a temporary path
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                tmp_file.write(uploaded_file.getvalue())
                tmp_file_path = tmp_file.name

            # 1. Extract TEXT and IMAGES from the PDF
            status.update(label="Opening and reading the PDF...")
            pdf_document = fitz.open(tmp_file_path)
            
            # Extract text from each page
            for page_num, page in enumerate(pdf_document):
                text = page.get_text()
                if text:
                    all_docs.append(Document(page_content=text, metadata={"source": f"text_page_{page_num+1}"}))

            # 2. Analyze IMAGES
            status.update(label="Extracting images from the document...")
            total_images = sum(len(page.get_images(full=True)) for page in pdf_document)
            image_count = 0

            for page_num, page in enumerate(pdf_document):
                for img_index, img in enumerate(page.get_images(full=True)):
                    xref = img[0]
                    base_image = pdf_document.extract_image(xref)
                    image_bytes = base_image["image"]

                    # Filter out small, likely irrelevant images
                    try:
                        image = Image.open(io.BytesIO(image_bytes))
                        if image.width < 150 or image.height < 150:
                            total_images -= 1 # Adjust total count
                            continue
                    except Exception:
                        total_images -= 1 # Adjust total count for invalid images
                        continue
                    
                    image_count += 1
                    status.update(label=f"Analyzing text and image {image_count} of {total_images}...")
                    description = get_image_description_gemini(image_bytes)
                    
                    if description:
                        all_docs.append(Document(
                            page_content=f"Description of image/chart on page {page_num+1}: {description}",
                            metadata={"source": f"image_page_{page_num+1}img{img_index+1}"}
                        ))

            # 3. Create Vector Store
            status.update(label="Embedding text and image descriptions...")
            if not all_docs:
                st.warning("Could not find any content (text or images) to process in this PDF.")
                status.update(label="Processing failed.", state="error")
                return

            embeddings = get_embedding_model()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            final_documents = text_splitter.split_documents(all_docs)
            st.session_state.vectors = FAISS.from_documents(final_documents, embeddings)
            
            status.update(label="Processing Complete!", state="complete")

        except Exception as e:
            st.error(f"An error occurred during processing: {e}")
            status.update(label="An error occurred.", state="error")
        finally:
            # Clean up the temporary file
            if 'pdf_document' in locals():
                pdf_document.close()
            os.remove(tmp_file_path)

    st.success("Document processed successfully! You can now ask questions.")
    # Initialize chat history
    st.session_state.messages = [{"role": "assistant", "content": f"I'm ready! Ask me anything about {pdf_file.name}."}]


# -----------------
# APP LAYOUT & LOGIC
# -----------------

# Sidebar for PDF upload
with st.sidebar:
    st.header("Upload Your Document")
    pdf_file = st.file_uploader("Choose a PDF file and click 'Process'", type="pdf")

    if st.button("Process Document"):
        if pdf_file:
            st.session_state.clear() # Clear old session data
            process_and_embed_pdf(pdf_file)
        else:
            st.warning("Please upload a PDF file first.")

# Main chat interface
if "vectors" in st.session_state:
    # LLM and prompt for the main chat
    llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.1-8b-instant")
    prompt = ChatPromptTemplate.from_template(
        """
        Answer the questions based on the provided context only. This context may include text from a document as well as detailed descriptions of charts or images.
        Provide the most accurate and detailed response. If the answer comes from an image description, mention that your information is based on a visual element (e.g., a chart or image).
        If you don't know the answer from the context, just say that you don't know. Do not make up an answer.

        <context>
        {context}
        <context>

        Question: {input}
        """
    )

    # Display chat messages from history
    for message in st.session_state.get("messages", []):
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            if message["role"] == "assistant" and "context" in message:
                with st.expander("View Document Context"):
                    for i, doc in enumerate(message["context"]):
                        st.write(f"*Source:* {doc.metadata.get('source', 'N/A')}")
                        st.write(doc.page_content)
                        st.markdown("---")

    # Accept user input
    if question := st.chat_input("Ask a question about your document..."):
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.markdown(question)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    document_chain = create_stuff_documents_chain(llm, prompt)
                    retriever = st.session_state.vectors.as_retriever()
                    retrieval_chain = create_retrieval_chain(retriever, document_chain)
                    
                    start_time = time.process_time()
                    response = retrieval_chain.invoke({'input': question})
                    processing_time = time.process_time() - start_time

                    answer = response['answer']
                    st.markdown(answer)
                    st.caption(f"Response generated in {processing_time:.2f} seconds.")

                    assistant_message = {
                        "role": "assistant",
                        "content": answer,
                        "context": response["context"]
                    }
                    st.session_state.messages.append(assistant_message)
                    
                    # Rerun to show context expander immediately
                    st.rerun()

                except Exception as e:
                    st.error(f"An error occurred while generating the response: {e}")
else:
    st.info("Please upload a PDF document and click 'Process' in the sidebar to begin.")