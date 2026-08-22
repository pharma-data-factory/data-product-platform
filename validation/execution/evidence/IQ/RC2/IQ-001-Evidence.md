# IQ-001 Evidence (RC2) — Candidate identity

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC2 |
| tag | platform-core-v1.0-rc2 |
| commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| test_id | IQ-001 |
| related | URS-CFG-001 |
| execution_timestamp | 2026-08-22T19:37:39+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | See RC2/IQ-Environment.md |
| status | PASS |

## Procedure

Verified tag, peeled commit, RC1 unchanged, clean worktree, validation package tracked, baseline, RC2 manifest.

## Actual result

| Check | Result |
| --- | --- |
| Tag exists | YES |
| Tag → commit | e2b2297a1506603ba05e6fb1dcf973ac046ad009 |
| Matches expected | YES |
| RC1 unchanged | dcc937370e325cbaf493ed28ab02dccca3557d53 |
| Worktree | CLEAN |
| Baseline | PDF-PC-VAL-BL-1.0 |
| RC2 manifest | present |

## Evidence

`git rev-parse`, `git status --porcelain`, `git ls-files validation/**`.
