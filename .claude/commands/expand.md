Use this command to expand an Idea Journal entry through the FastAPI sidecar.

Expected input:

```text
/expand <idea-id> [instruction]
```

Run:

```bash
curl -s -X POST http://localhost:8000/claude/expand \
  -H "Content-Type: application/json" \
  -d '{"ideaId":"<idea-id>","instruction":"<instruction>"}'
```

Return the updated `hook`, `seed`, and `footprint` fields to the user. If the
sidecar returns a rationale, summarize it in one short paragraph.
