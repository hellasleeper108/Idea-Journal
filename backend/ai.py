"""
AI integration helpers for Idea Journal v1.1.

Claude is the execution model for idea expansion and scoring. Codex uses the
same sidecar contract so code agents can inspect active ideas and scaffold from
the journal without needing browser access.
"""

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover - exercised when optional SDK is absent
    Anthropic = None

from .storage import get_idea, list_ideas, update_idea


SYSTEM_PROMPT = """You are Claude inside Idea Journal, a structured capture
tool for a developer-builder. Keep ideas grounded in practical implementation.

Builder stack context:
- Rust and Python for durable systems, tools, and backend sidecars
- React, Vite, FastAPI, JSON persistence, and local-first workflows
- ESP32 and hardware automation when physical prototypes make sense
- Ollama/local models for private iteration
- Claude Code and Codex for agentic scaffolding, review, and implementation

Use the journal's three fields:
- hook: the core insight and why it matters
- seed: the technical architecture or implementation seed
- footprint: the smallest shippable v0.1

Be concrete, terse, and useful. Prefer buildable next steps over vague vision.
"""


def _client() -> Optional[Any]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or Anthropic is None:
        return None
    return Anthropic(api_key=api_key)


def _idea_context(idea: Dict[str, Any]) -> str:
    return json.dumps(
        {
            "id": idea.get("id"),
            "status": idea.get("status"),
            "hook": idea.get("hook", ""),
            "seed": idea.get("seed", ""),
            "footprint": idea.get("footprint", ""),
            "tags": idea.get("tags", []),
            "score": idea.get("score"),
            "createdAt": idea.get("createdAt"),
            "updatedAt": idea.get("updatedAt"),
        },
        indent=2,
    )


def _complete(prompt: str, *, max_tokens: int = 900) -> str:
    client = _client()
    if not client:
        return _fallback_response(prompt)

    message = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return "\n".join(
        block.text for block in message.content if getattr(block, "type", None) == "text"
    ).strip()


def _stream(prompt: str, *, max_tokens: int = 900) -> Iterable[str]:
    client = _client()
    if not client:
        yield _fallback_response(prompt)
        return

    with client.messages.stream(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def _fallback_response(prompt: str) -> str:
    lower = prompt.lower()
    if "scaffold" in lower:
        return (
            "Scaffold brief:\n"
            "- Create a minimal repo with README, source entrypoint, tests, and a config file.\n"
            "- Keep the first implementation focused on the captured footprint.\n"
            "- Add one smoke test that proves the core loop works."
        )
    if "codex implementation plan" in lower or "implementation plan" in lower:
        return (
            "Codex implementation plan:\n"
            "- Inspect the repository structure, existing UI surfaces, and local tests first.\n"
            "- Make the smallest scoped change that supports the captured footprint.\n"
            "- Run lint, tests, or a focused smoke check before reporting changed files."
        )
    if "expand" in lower:
        return (
            "Expansion draft:\n"
            "- Hook: sharpen the user-visible promise and the moment this solves.\n"
            "- Technical seed: identify the smallest working architecture and one risky dependency.\n"
            "- Minimum footprint: ship a thin vertical slice with a README, demo path, and one verification test."
        )
    if "score" in lower or "cooldown" in lower:
        return "Score: 6\nRationale: promising enough to revisit, but needs a tighter v0.1 and proof of demand."
    return (
        "Expansion draft:\n"
        "- Hook: sharpen the user-visible promise and the moment this solves.\n"
        "- Technical seed: identify the smallest working architecture and one risky dependency.\n"
        "- Minimum footprint: ship a thin vertical slice with a README, demo path, and one verification test."
    )


def expand_idea(idea_id: str, instruction: str = "") -> Dict[str, Any]:
    idea = get_idea(idea_id)
    if not idea:
        raise KeyError(idea_id)

    prompt = f"""Expand this journal idea into sharper fields.

Instruction: {instruction or "tighten the hook, seed, and footprint"}

Idea:
{_idea_context(idea)}

Return JSON only with keys hook, seed, footprint, tags, rationale.
Tags should be lowercase slugs."""
    raw = _complete(prompt)
    patch = _json_patch(raw, idea)
    updated = update_idea(idea_id, patch)
    return {"idea": updated, "rationale": patch.pop("_rationale", ""), "raw": raw}


def scaffold_idea(idea_id: str, instruction: str = "") -> Dict[str, Any]:
    idea = get_idea(idea_id)
    if not idea:
        raise KeyError(idea_id)

    prompt = f"""Create a Claude Code/Codex scaffold brief for this idea.

Instruction: {instruction or "generate a practical project structure"}

Idea:
{_idea_context(idea)}

Return a concise Markdown brief with:
- Project goal
- Suggested stack
- Directory structure
- First three implementation tasks
- Verification checklist"""
    return {"ideaId": idea_id, "brief": _complete(prompt, max_tokens=1200)}


def plan_idea(idea_id: str, instruction: str = "") -> Dict[str, Any]:
    idea = get_idea(idea_id)
    if not idea:
        raise KeyError(idea_id)

    prompt = f"""Create a Codex implementation plan for this Idea Journal entry.

Instruction: {instruction or "turn this into a scoped coding task"}

Idea:
{_idea_context(idea)}

Return concise Markdown with:
- Implementation objective
- Repository context Codex should inspect first
- Smallest useful change set
- Verification commands
- Journal update to make when complete"""
    return {"ideaId": idea_id, "plan": _complete(prompt, max_tokens=1200)}


def score_parked_ideas(days_old: int = 14) -> Dict[str, Any]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)
    candidates = []
    for idea in list_ideas(status="parked"):
        created_at = _parse_datetime(idea.get("createdAt"))
        if created_at and created_at <= cutoff:
            candidates.append(idea)

    scored = []
    for idea in candidates:
        prompt = f"""Cooldown-score this parked idea from 1-10.

Idea:
{_idea_context(idea)}

Return JSON only with keys score and rationale."""
        raw = _complete(prompt, max_tokens=300)
        score = _extract_score(raw)
        updated = update_idea(idea["id"], {"score": score})
        scored.append({"idea": updated, "rationale": raw})

    return {"count": len(scored), "daysOld": days_old, "scored": scored}


def active_ideas() -> List[Dict[str, Any]]:
    return list_ideas(status="active")


def command_stream(idea_id: str, command: str) -> Iterable[str]:
    idea = get_idea(idea_id)
    if not idea:
        raise KeyError(idea_id)

    normalized = command.strip()
    prompt = f"""Run this slash command for the current idea.

Command: {normalized}

Idea:
{_idea_context(idea)}

Respond inline for the journal UI. If the command asks to expand, scaffold, or
score, include concrete output in Markdown. Keep it compact."""
    return _stream(prompt)


def codex_command_stream(idea_id: str, command: str) -> Iterable[str]:
    idea = get_idea(idea_id)
    if not idea:
        raise KeyError(idea_id)

    normalized = command.strip()
    prompt = f"""Run this Codex-facing slash command for the current idea.

Command: {normalized}

Idea:
{_idea_context(idea)}

Respond as a pragmatic coding agent. Prefer repository inspection steps,
implementation boundaries, verification commands, and the journal patch Codex
should make after completion. Keep it compact."""
    return _stream(prompt)


def _json_patch(raw: str, idea: Dict[str, Any]) -> Dict[str, Any]:
    try:
        parsed = json.loads(_trim_json(raw))
    except json.JSONDecodeError:
        return {
            "hook": idea.get("hook") or "Expanded idea",
            "seed": f"{idea.get('seed', '').strip()}\n\n{raw}".strip(),
        }

    patch = {
        key: parsed[key]
        for key in ("hook", "seed", "footprint", "tags")
        if key in parsed and parsed[key] is not None
    }
    if "rationale" in parsed:
        patch["_rationale"] = str(parsed["rationale"])
    return patch


def _trim_json(raw: str) -> str:
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end >= start:
        return raw[start : end + 1]
    return raw


def _extract_score(raw: str) -> int:
    try:
        parsed = json.loads(_trim_json(raw))
        score = int(parsed.get("score", 5))
    except (json.JSONDecodeError, TypeError, ValueError):
        digits = [int(ch) for ch in raw if ch.isdigit()]
        score = digits[0] if digits else 5
    return min(10, max(1, score))


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed
