"""
Idea Journal — FastAPI sidecar

Provides a REST API for the idea-journal frontend and for Hermes, Claude Code,
and Codex integrations.
"""

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .ai import (
    active_ideas,
    codex_command_stream,
    command_stream,
    expand_idea,
    plan_idea,
    scaffold_idea,
    score_parked_ideas,
)
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
    version="1.1.0",
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


class IdeaAction(BaseModel):
    ideaId: str
    instruction: str = ""


class ClaudeCommand(BaseModel):
    ideaId: str
    command: str


class ScoreRequest(BaseModel):
    daysOld: int = 14


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/ideas")
def get_ideas(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
):
    """List all ideas, with optional filtering by status, tag, or full-text search."""
    return list_ideas(status=status, tag=tag, search=search)


@app.get("/ideas/active")
def get_active_ideas():
    """List ideas currently in flight for Claude Code and Codex polling."""
    return active_ideas()


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


@app.post("/claude/expand")
def post_claude_expand(data: IdeaAction):
    """Ask Claude to expand an idea and patch the journal entry."""
    try:
        return expand_idea(data.ideaId, data.instruction)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None


@app.post("/claude/scaffold")
def post_claude_scaffold(data: IdeaAction):
    """Return a scaffold brief for Claude Code or Codex."""
    try:
        return scaffold_idea(data.ideaId, data.instruction)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None


@app.post("/claude/score")
def post_claude_score(data: ScoreRequest = ScoreRequest()):
    """Batch-score parked ideas older than the cooldown window."""
    return score_parked_ideas(days_old=data.daysOld)


@app.post("/claude/command")
def post_claude_command(data: ClaudeCommand):
    """Stream a slash-command response for inline journal UI use."""
    try:
        stream = command_stream(data.ideaId, data.command)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None
    return StreamingResponse(stream, media_type="text/plain")


@app.post("/codex/expand")
def post_codex_expand(data: IdeaAction):
    """Ask the agent sidecar to expand an idea for Codex handoff."""
    try:
        return expand_idea(data.ideaId, data.instruction)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None


@app.post("/codex/scaffold")
def post_codex_scaffold(data: IdeaAction):
    """Return a scaffold brief shaped for Codex implementation work."""
    try:
        return scaffold_idea(data.ideaId, data.instruction)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None


@app.post("/codex/plan")
def post_codex_plan(data: IdeaAction):
    """Return a concise implementation plan for Codex."""
    try:
        return plan_idea(data.ideaId, data.instruction)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None


@app.post("/codex/command")
def post_codex_command(data: ClaudeCommand):
    """Stream a Codex-oriented command response for inline journal UI use."""
    try:
        stream = codex_command_stream(data.ideaId, data.command)
    except KeyError:
        raise HTTPException(status_code=404, detail="Idea not found") from None
    return StreamingResponse(stream, media_type="text/plain")


@app.get("/health")
def health():
    """Simple health check."""
    return {"status": "ok", "version": "1.1.0"}
