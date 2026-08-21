# Read CI failures

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

On the Data Product page, open **CI Quality Gate**.

| Status | Meaning | What to do |
| --- | --- | --- |
| PASSED | Lint, tests, Docker succeeded | Continue |
| RUNNING | GitHub Actions in progress | Wait |
| FAILED | A named stage failed | Open GitHub, fix the stage, push |
| CANCELLED | Workflow cancelled | Re-run if still needed |
| UNKNOWN | No readable Actions result | Check GitHub App **Actions: Read-only**. Not a product defect |

Failed stages map to workflow job names (Lint, Unit Tests, Contract
tests, Data quality tests, Compatibility tests, Docker build).

Local equivalents: [Local development](../developer/local-development.md).
