# IQ-001 Evidence — Candidate identity

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-001 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T18:00:07+02:00 |
| executor | NOT_ESTABLISHED (named human). Technical operator: Cursor agent / host SCHMECKM |
| environment | See IQ-Environment.md |
| status | PASS |

## Procedure performed

`git rev-parse`, `git tag`, `git status --porcelain`, `git ls-files validation/**`, `git diff --stat` tag vs HEAD.

## Expected result (unchanged)

Identity is recorded. Discrepancies are findings. A dirty worktree is reported, not hidden.

## Actual result

| Item | Observed |
| --- | --- |
| Repository | `C:/Users/marku/OneDrive/Dokumente/node_project/IDP/data-product-platform` |
| Remote | `https://github.com/pharma-data-factory/data-product-platform.git` |
| Tag | `platform-core-v1.0-rc1` exists |
| Tag target | `dcc937370e325cbaf493ed28ab02dccca3557d53` |
| Worktree | CLEAN |
| Validation files tracked | 57 |
| Baseline | PDF-PC-VAL-BL-1.0 present |
| Manifest | `validation/execution/RC1-Manifest.yaml` present |
| HEAD | `33e7fa0ab2d3074cb8b76036137432ce6c06f32e` (finalization record only vs tag) |
| Protocol procedure text | Still cites pre-snapshot HEAD `d96ab0cbd97ea86314ddcbd468ff5faf756df212` |

Dirty worktree: no. Running image metadata: no RC1 image running (see IQ-013).

## Objective evidence

Command output captured 2026-08-22T18:00:07+02:00. Protocol SHA citation is a document observation, not a product defect.
