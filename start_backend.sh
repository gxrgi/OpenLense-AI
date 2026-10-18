#!/usr/bin/env bash
set -e

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Create virtual environment if not present
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install dependencies
echo "Installing backend Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check for API keys
if grep -q "your_gemini_api_key_here" .env 2>/dev/null; then
    echo "⚠️  Note: GOOGLE_API_KEY is not yet configured in backend/.env."
    echo "   Vision entity extraction will need a valid key from https://aistudio.google.com/app/apikey"
fi

if grep -q "your_groq_api_key_here" .env 2>/dev/null; then
    echo "⚠️  Note: GROQ_API_KEY is not yet configured in backend/.env."
    echo "   Document RAG will need a valid key from https://console.groq.com/keys"
fi

echo "Starting OpenLense backend services..."
echo " - Vision API: http://localhost:8001"
echo " - RAG API:    http://localhost:8002"
python main.py --mode=dual
