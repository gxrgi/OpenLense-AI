# app/experts/chat_expert.py
import os
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from google import genai  # Official Google GenAI SDK
from agno.agent import Agent
from agno.agent.group import AgentGroup
from agno.memory import Memory
from agno.models.google import Gemini  # agno wrapper for Google Gemini models

# ---------- Config and .env ----------
APP_DIR = Path(__file__).resolve().parents[1]
load_dotenv((APP_DIR / ".env").as_posix())  # Loads GOOGLE_API_KEY / GEMINI_API_KEY
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("Set GOOGLE_API_KEY or GEMINI_API_KEY in app/.env")

# Default model; override via env if needed
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ---------- Data models ----------
@dataclass
class Entity:
    name: str
    category: str
    attributes: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ConversationConfig:
    entities: List[Entity]
    user_goal: str
    system_style: str = (
        "Be helpful, concise, and consistent across turns. Keep answers factual; "
        "do not identify real people in images. Decline unsafe or sensitive requests."
    )
    # Conversation length / generation limits
    max_output_tokens: int = 500
    temperature: float = 0.2

# ---------- Helpers to load entities from JSON ----------
def load_entities_from_json(json_path: str) -> List[Entity]:
    """
    Supports two shapes:
    1) object_details.json:
       {"primary_object": {"name": "...", "category": "...", "attributes": {...}}}
    2) objects_response.json:
       {"items":[{"name":"...","description":"..."}], "object_count": N}
    """
    data = json.loads(Path(json_path).read_text(encoding="utf-8"))
    entities: List[Entity] = []
    if "primary_object" in data:
        po = data["primary_object"]
        entities.append(
            Entity(
                name=po.get("name", "Unknown"),
                category=po.get("category", "object"),
                attributes=po.get("attributes", {}),
            )
        )
    elif "items" in data:
        for item in data["items"]:
            entities.append(
                Entity(
                    name=item.get("name", "Unknown"),
                    category="object",
                    attributes={"description": item.get("description", "")},
                )
            )
    return entities

# ---------- Build an Agent for each entity ----------
def build_entity_agent(entity: Entity, shared_memory: Memory) -> Agent:
    """
    Each entity agent gets:
    - a role prompt describing its identity and constraints
    - Gemini model via agno.models.google.Gemini
    - shared memory to retain cross-turn context
    """
    system = (
        f"You are speaking as the entity: {entity.name} "
        f"(category: {entity.category}). "
        f"Attributes: {json.dumps(entity.attributes, ensure_ascii=False)}. "
        "Speak in first person as this entity. "
        "Stay factual and avoid unsafe content. "
        "If unsure, say you are unsure."
    )
    model = Gemini(
        model=GEMINI_MODEL,
        api_key=GOOGLE_API_KEY,
        temperature=0.2,
        max_output_tokens=500,
    )
    return Agent(
        name=entity.name,
        model=model,
        system=system,
        memory=shared_memory,  # shared across entity agents
    )

# ---------- Build a Moderator agent ----------
def build_moderator_agent(entity_names: List[str], shared_memory: Memory) -> Agent:
    system = (
        "You are the moderator. Coordinate a short, coherent conversation among the entities: "
        f"{', '.join(entity_names)}. Ensure turns are on-topic, factual, and concise. "
        "Summarize at the end with key points. Do not identify real people."
    )
    model = Gemini(
        model=GEMINI_MODEL,
        api_key=GOOGLE_API_KEY,
        temperature=0.2,
        max_output_tokens=600,
    )
    return Agent(
        name="Moderator",
        model=model,
        system=system,
        memory=shared_memory,
    )

# ---------- Orchestrate a group conversation ----------
def run_group_conversation(config: ConversationConfig) -> Dict[str, Any]:
    """
    Spins up N entity agents and a moderator. Returns structured transcript + summary.
    """
    # Shared memory retains user goal and prior turns for context
    shared_memory = Memory()
    shared_memory.add("conversation_goal", config.user_goal)

    # Create entity agents
    agents: List[Agent] = [build_entity_agent(e, shared_memory) for e in config.entities]

    # Moderator agent
    mod = build_moderator_agent([a.name for a in agents], shared_memory)

    # Group configuration
    group = AgentGroup(
        agents=agents,
        moderator=mod,        # Moderator orchestrates turns
        memory=shared_memory, # Shared context across all agents
        max_rounds=4,         # keep it short; tune per UX
    )

    # Kick off with the user goal
    transcript = group.run(config.user_goal)

    # Compose final payload
    return {
        "model": GEMINI_MODEL,
        "entities": [e.__dict__ for e in config.entities],
        "goal": config.user_goal,
        "transcript": transcript,  # list of {speaker, message}
    }

# ---------- Public API: entry points for FastAPI or scripts ----------
def prepare_entities_for_chat(json_path: str, top_k: Optional[int] = None) -> List[Entity]:
    """
    Load all detected entities from a JSON file and keep the first top_k if provided.
    The frontend can display these and let the user choose which N to chat with.
    """
    entities = load_entities_from_json(json_path)
    if top_k is not None:
        entities = entities[: max(0, int(top_k))]
    return entities

def chat_with_selected_entities(
    json_path: str,
    selected_indices: List[int],
    user_goal: str,
) -> Dict[str, Any]:
    """
    Given a JSON file of detected entities and the user-selected indices, run a group chat.
    """
    all_entities = load_entities_from_json(json_path)
    chosen = []
    for idx in selected_indices:
        if 0 <= idx < len(all_entities):
            chosen.append(all_entities[idx])
    if not chosen:
        raise ValueError("No valid entities selected.")

    cfg = ConversationConfig(
        entities=chosen,
        user_goal=user_goal,
    )
    return run_group_conversation(cfg)

# ---------- Example CLI usage ----------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Entity chat using Gemini + agno agents")
    parser.add_argument("--json", type=str, required=True, help="Path to objects_response.json or object_details.json")
    parser.add_argument("--select", type=str, default="0", help="Comma-separated indices of entities to include (e.g., 0,2)")
    parser.add_argument("--goal", type=str, default="Introduce yourselves and discuss your roles in the scene.")
    args = parser.parse_args()

    indices = [int(x.strip()) for x in args.select.split(",") if x.strip().isdigit()]
    result = chat_with_selected_entities(args.json, indices, args.goal)

    # Print minimal response; your API layer can return this as JSON to the frontend
    print(json.dumps(result, ensure_ascii=False, indent=2))
