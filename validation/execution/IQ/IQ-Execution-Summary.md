# IQ Execution Summary — Platform Core 1.0-RC1

| Field | Value |
| --- | --- |
| Document | VAL-IQ-PC-RC1-SUM |
| Candidate | 1.0-RC1 |
| Canonical tag | `platform-core-v1.0-rc1` |
| Tag target | `dcc937370e325cbaf493ed28ab02dccca3557d53` |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Execution date | 2026-08-22 |
| Named human executor | NOT_ESTABLISHED |
| Product validation status | **NOT_VALIDATED** |
| OQ | NOT_EXECUTED |
| UAT | NOT_EXECUTED |

IQ execution does **not** validate the product.

## Counts

| Status | Count |
| --- | --- |
| Total IQ tests | 16 |
| PASS | 11 |
| FAIL | 1 |
| BLOCKED | 4 |
| NOT_EXECUTED | 0 |
| NOT_APPLICABLE | 0 |

| ID | Status |
| --- | --- |
| IQ-001 | PASS |
| IQ-002 | BLOCKED |
| IQ-003 | PASS |
| IQ-004 | PASS |
| IQ-005 | BLOCKED |
| IQ-006 | FAIL |
| IQ-007 | PASS |
| IQ-008 | PASS |
| IQ-009 | BLOCKED |
| IQ-010 | PASS |
| IQ-011 | PASS |
| IQ-012 | PASS |
| IQ-013 | BLOCKED |
| IQ-014 | PASS |
| IQ-015 | PASS |
| IQ-016 | PASS |

## Findings

| ID | Origin | Severity | Summary |
| --- | --- | --- | --- |
| IQ-FIND-001 | IQ-006 | Major | Hosted compose/production image do not mount a durable volume for `.runtime/create-authorization-audit.jsonl` |

No remediation was performed.

## Deviations / observations (not product FAILs)

- Protocol IQ-001 procedure text still cites pre-snapshot HEAD `d96ab0c`. Identity was recorded against the RC1 tag. Expected Result not rewritten.
- HEAD at execution `33e7fa0` is one documentation commit after the tag (finalization record only). Worktree CLEAN.
- Named human executor required by evidence conventions: NOT_ESTABLISHED; not fabricated.
- Running Control Plane on the host is local `yarn start`, not docker/production.

## Missing evidence

- Hosted/compose process command line (IQ-002)
- Hosted PostgreSQL connection/health log (IQ-005)
- Hosted catalog query proving sample entities absent (IQ-009)
- RC1 image digest or tag-bound backend bundle (IQ-013)
- Hosted backend startup module log (IQ-007 limitation)
- Signed SOUP assessment (IQ-011, explicitly NOT_ESTABLISHED)
- SBOM artifact (IQ-012, explicitly NOT_ESTABLISHED — protocol allows this)

## Environment limitations

- Product `docker compose` not running; `pdf-pilot-pg` exited.
- Host :5432 belongs to unrelated `hap-postgres` — not used as candidate evidence.
- Browser version NOT_ESTABLISHED (not required for these IQ HTTP checks).
- SBOM tools (syft / cyclonedx-npm) not preinstalled; not installed into the product.

## Prerequisites for re-test

1. Named human executor recorded on evidence.
2. Start the candidate with the intended hosted overlay (`app-config.yaml` + docker and/or production + github) and product Postgres.
3. Durable volume (or equivalent) for Create-authorization audit path — requires a change record if product/compose is modified (IQ-FIND-001).
4. Build or load an image/bundle whose identity is the RC1 tag.
5. Authenticated or authorized catalog query on that hosted instance for IQ-009.
6. Optional: generate SBOM by an approved one-off method and attach under evidence.

## Decision

IQ-006 failed a required installation criterion (durable audit path on the intended hosted host). BLOCKED tests are not reinterpreted as PASS.

**IQ EXECUTION RESULT: FAIL**
