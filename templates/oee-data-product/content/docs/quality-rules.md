# Quality Rules

`GET /api/v1/quality` uses the Data Product quality-report (`PASS` / `FAIL`).

MANDATORY checks reject events: invalid state, invalid timestamp, negative
counts, `idealCycleTimeSeconds <= 0`, equipment identity mismatch, invalid window.

WARNING: count mismatch, counter reset, unobserved time.
INFORMATIONAL: duplicate `eventId` (first wins).
