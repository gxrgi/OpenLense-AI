# OpenLense Backend ⚙️

The FastAPI backend powering **OpenLense**. Provides intelligent multimodal vision object segmentation, conversational persona agents, and document RAG pipelines.

---

## ⚡ Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/)
- **Vision & Multi-Entity Agents**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Document Processing**: `PyMuPDF`, `python-docx`, `pypdf`, `Pillow`
- **Vector Search**: [FAISS](https://github.com/facebookresearch/faiss) (Facebook AI Similarity Search)
- **Embeddings**: HuggingFace (`BAAI/bge-base-en-v1.5`) via `sentence-transformers`
- **Fast LLM Generation**: [Groq Cloud](https://groq.com/) running Llama 3.1 8B Instant via `langchain-groq`

---

## 🚀 Setup & Execution

### 1. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure `.env`
```bash
cp .env.example .env
```
Fill in your API keys:
- `GOOGLE_API_KEY`: For Gemini vision analysis and persona chat.
- `GROQ_API_KEY`: For fast document retrieval Q&A.

### 4. Run Server

#### Mode 1: Dual Services (Standard development matching frontend ports)
Spawns both microservices concurrently:
- Vision API on `http://localhost:8001`
- Document RAG API on `http://localhost:8002`

```bash
python main.py --mode=dual
```

#### Mode 2: Unified API (Single Port 8000)
Runs all endpoints under a single server with interactive Swagger documentation:

```bash
python main.py
```
Visit [http://localhost:8000/docs](http://localhost:8000/docs) for the OpenAPI interactive playground.

---

## 📡 API Endpoints Summary

| Endpoint | Method | Service | Description |
| :--- | :---: | :--- | :--- |
| `/analyze` | `POST` | Vision | Upload image and detect 1-5 prominent objects with attributes. |
| `/chat/message` | `POST` | Vision / Chat | Send message to specific object or full group with moderator. |
| `/process-documents/` | `POST` | RAG | Upload PDF, DOCX, TXT files for chunking and FAISS indexing. |
| `/chat/` | `POST` | RAG | Query the indexed documents with natural language question. |
| `/health` | `GET` | System | Healthcheck & API key status probe. |
| `/docs` | `GET` | System | Interactive Swagger UI. |
