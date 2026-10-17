# Contributing to OpenLense

Thank you for your interest in contributing to **OpenLense**! We welcome contributions to multimodal vision analysis, agent architectures, document RAG, and UI enhancements.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Python**: 3.10+
- **Node.js**: 20+
- **API Keys**:
  - Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))
  - Groq Cloud API key ([Groq Console](https://console.groq.com/))

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start server
python main.py
```

### 3. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start dev server
npm run dev
```

---

## 🌿 Git Workflow

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit** your changes with clear, descriptive messages:
   ```bash
   git commit -m "feat(vision): enhance object bounding box detection"
   ```
3. **Push** to your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
4. **Open a Pull Request** against the `main` branch.

---

## 📋 Guidelines

- **No Secrets in Code**: Never commit `.env` files, API keys, or personal credentials.
- **Clean Commits**: Do not commit virtual environments (`venv/`), build artifacts, or temporary files.
- **Code Style**:
  - Python: Follow PEP 8 guidelines.
  - TypeScript/React: Use ESLint and Prettier standards.
