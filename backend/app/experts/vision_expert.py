import os, json, sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# ---------- .env loading ----------
# Adjust base to .../app so app/.env is found
BASE = Path(__file__).resolve().parent  # put this file in app/experts or adjust accordingly
APP_DIR = BASE if BASE.name == "app" else BASE.parent if BASE.name == "experts" else BASE
ENV_PATH = APP_DIR / ".env"
load_dotenv(ENV_PATH.as_posix())  # loads GOOGLE_API_KEY / GEMINI_API_KEY from app/.env [web:146]

# ---------- Inputs ----------
IMAGE_PATH =r'C:\Users\Kanak\OneDrive\Desktop\OpenLense\proj\backend\app\upload\image.png'
OUT_JSON = Path(sys.argv[2]) if len(sys.argv) > 2 else (APP_DIR / "upload" / "objects_response.json")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("Set GOOGLE_API_KEY or GEMINI_API_KEY in app/.env")
if not Path(IMAGE_PATH).exists():
    raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

# ---------- Gemini client ----------
client = genai.Client(api_key=API_KEY)  # Official GenAI SDK client [web:96]

# Upload local file to Files API and reuse the File object directly
uploaded = client.files.upload(file=IMAGE_PATH)  # returns File with uri/mimeType [web:72]

# Prompt for strict JSON
prompt = (
    'Analyze the image and return ONLY valid JSON: '
    '{"items":[{"name":"<object name>","description":"<brief factual description>"}],'
    '"object_count": <integer>}. '
    'Be concise and avoid duplicates.'
    'Identify the most prominent object with fine-grained details (e.g., breed/model/species).'
    'Do not identify real people. If uncertain, choose the closest plausible label and lower confidence.'
)

# Multimodal call: pass prompt + uploaded file
resp = client.models.generate_content(  # Core generateContent call [web:96]
    model=MODEL,
    contents=[prompt, uploaded],
    config={"max_output_tokens": 300, "temperature": 0.1},
)

# Extract and validate JSON
text = getattr(resp, "text", "") or ""
start, end = text.find("{"), text.rfind("}") + 1
if start == -1 or end <= 0:
    raise ValueError(f"Gemini did not return JSON. Raw text:\n{text}")
data = json.loads(text[start:end])

# Ensure object_count is present
if "items" in data and "object_count" not in data:
    data["object_count"] = len(data["items"])

# Save output
OUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {OUT_JSON.resolve()}")
