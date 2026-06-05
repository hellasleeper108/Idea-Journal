Use this command to request a build scaffold brief for a journal idea.

Expected input:

```text
/scaffold <idea-id> [instruction]
```

Run:

```bash
curl -s -X POST http://localhost:8000/claude/scaffold \
  -H "Content-Type: application/json" \
  -d '{"ideaId":"<idea-id>","instruction":"<instruction>"}'
```

Use the returned Markdown brief as the project structure contract. Do not create
files until the target workspace and implementation scope are clear.
