# Codex Integration

Idea Journal v1.1 exposes a FastAPI sidecar that Codex can use as the source of
truth for active work.

## Sidecar Contract

- `GET /ideas/active` returns ideas currently in flight.
- `POST /codex/plan` returns a scoped implementation plan for an idea ID.
- `POST /codex/scaffold` returns a scaffold brief for an idea ID.
- `POST /codex/expand` patches an idea with stronger `hook`, `seed`, and
  `footprint` fields.
- `POST /codex/command` streams compact Codex-oriented guidance for the journal
  UI.
- Claude-compatible `/claude/*` routes remain available for expansion,
  scaffold, scoring, and free-form commands.

## Codex Workflow

1. Poll `GET http://localhost:8000/ideas/active` before starting project work.
2. For the selected idea, request an implementation plan with
   `POST http://localhost:8000/codex/plan`.
3. If the project structure is still unclear, request a scaffold brief with
   `POST http://localhost:8000/codex/scaffold`.
4. Make scoped edits, run local verification, and report changed files.
5. If implementation changes the idea shape, update the journal through
   `PATCH /ideas/{id}`.

Codex should treat the journal as planning memory, not as a replacement for
reading the repository. Always inspect local code before editing.
