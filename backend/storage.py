"""
JSON file-backed storage for Idea Journal.

Replaces localStorage with a durable JSON file so the FastAPI backend
can serve as the single source of truth — and Hermes can log ideas
without opening a browser.
"""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

DATA_DIR = Path(__file__).parent / "data"
DATA_FILE = DATA_DIR / "ideas.json"

_lock = threading.Lock()


def _ensure_file():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]", encoding="utf-8")


def _read():
    _ensure_file()
    with _lock:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def _write(ideas):
    with _lock:
        DATA_FILE.write_text(
            json.dumps(ideas, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )


def _now():
    return datetime.now(timezone.utc).isoformat()


def _generate_id():
    import random
    ts = int(datetime.now().timestamp() * 1000)
    rand = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=5))
    return f"idea_{ts}_{rand}"


# ── Public API ──────────────────────────────────────────────────────────────

def list_ideas(status: Optional[str] = None, tag: Optional[str] = None, search: Optional[str] = None):
    """Return ideas, optionally filtered."""
    ideas = _read()
    q = search.lower() if search else None
    result = []
    for idea in ideas:
        if status and idea.get("status") != status:
            continue
        if tag and tag not in idea.get("tags", []):
            continue
        if q:
            haystack = " ".join([
                idea.get("hook", ""),
                idea.get("seed", ""),
                idea.get("footprint", ""),
                " ".join(idea.get("tags", [])),
            ]).lower()
            if q not in haystack:
                continue
        result.append(idea)
    return result


def get_idea(idea_id: str):
    for idea in _read():
        if idea["id"] == idea_id:
            return idea
    return None


def create_idea(data: dict) -> dict:
    ideas = _read()
    idea = {
        "id": _generate_id(),
        "createdAt": _now(),
        "updatedAt": _now(),
        "status": "raw",
        "hook": "",
        "seed": "",
        "footprint": "",
        "tags": [],
        "score": None,
        **data,
    }
    ideas.insert(0, idea)
    _write(ideas)
    return idea


def update_idea(idea_id: str, patch: dict):
    """Returns updated idea or None if not found."""
    ideas = _read()
    for i, idea in enumerate(ideas):
        if idea["id"] == idea_id:
            updated = {**idea, **patch, "id": idea_id, "updatedAt": _now()}
            ideas[i] = updated
            _write(ideas)
            return updated
    return None


def delete_idea(idea_id: str) -> bool:
    ideas = _read()
    filtered = [i for i in ideas if i["id"] != idea_id]
    if len(filtered) == len(ideas):
        return False
    _write(filtered)
    return True


def all_tags():
    tags = set()
    for idea in _read():
        tags.update(idea.get("tags", []))
    return sorted(tags)