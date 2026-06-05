Use this command to batch-score cooled-down parked ideas.

Expected input:

```text
/score [days-old]
```

Run:

```bash
curl -s -X POST http://localhost:8000/claude/score \
  -H "Content-Type: application/json" \
  -d '{"daysOld":14}'
```

Report how many ideas were scored and list each idea ID with its updated score.
