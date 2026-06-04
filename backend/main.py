"""
Idea Journal — FastAPI sidecar

Provides a REST API for the idea-journal frontend and for Hermes agent
integration.  Replaces the browser-only localStorage backend with a
durable JSON file.
"""

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .storage import (
    list_ideas,
    get_idea,
    create_idea,
    update_idea,
    delete_idea,
    all_tags,
)

app = FastAPI(
    title="Idea Journal API",
    version="1.0.0",
    description="Structured idea capture — park ideas before they become projects.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ─────────────────────────────────────────────────────────────────

class IdeaCreate(BaseModel):
    hook: str = ""
    seed: str = ""
    footprint: str = ""
    tags: List[str] = Field(default_factory=list)
    status: str = "raw"
    score: Optional[int] = None


class IdeaPatch(BaseModel):
    hook: Optional[str] = None
    seed: Optional[str] = None
    footprint: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    score: Optional[int] = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/ideas")
def get_ideas(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
):
    """List all ideas, with optional filtering by status, tag, or full-text search."""
    return list_ideas(status=status, tag=tag, search=search)


@app.get("/ideas/{idea_id}")
def get_idea_by_id(idea_id: str):
    """Get a single idea by its ID."""
    idea = get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@app.post("/ideas", status_code=201)
def post_idea(data: IdeaCreate):
    """Create a new idea."""
    return create_idea(data.model_dump(exclude_unset=True))


@app.patch("/ideas/{idea_id}")
def patch_idea(idea_id: str, data: IdeaPatch):
    """Update an existing idea (partial patch)."""
    patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    updated = update_idea(idea_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Idea not found")
    return updated


@app.delete("/ideas/{idea_id}", status_code=204)
def delete_idea_by_id(idea_id: str):
    """Delete an idea."""
    if not delete_idea(idea_id):
        raise HTTPException(status_code=404, detail="Idea not found")


@app.get("/tags")
def get_tags():
    """List all unique tags across all ideas, sorted alphabetically."""
    return all_tags()


@app.get("/health")
def health():
    """Simple health check."""
    return {"status": "ok", "version": "1.0.0"}