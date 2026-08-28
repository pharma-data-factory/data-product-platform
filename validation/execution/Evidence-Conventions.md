# Formal evidence conventions — Platform Core 1.0-RC2

**Baseline:** PDF-PC-VAL-BL-1.0  
**Candidate:** Platform Core 1.0-RC2  
**Validation status:** NOT_VALIDATED  

These rules apply to IQ, OQ, and UAT evidence under `validation/execution/`. They do not introduce Part 11 electronic signatures.

## Required fields on every evidence record

| Field | Rule |
| --- | --- |
| candidate_version | `1.0-RC2` (or later candidate ID) |
| test_id | Protocol ID (e.g. IQ-003, OQ-AUTH-002, UAT-001) |
| execution_timestamp | Actual ISO-8601 time of execution. Do not invent. |
| executor | Named human executor. Do not invent. |
| environment | Hosted/local identifiers actually used |
| actual_result | Observed outcome |
| objective_evidence_reference | Path to log, screenshot, or file that was actually captured |
| status | PASS / FAIL / BLOCKED / NOT_APPLICABLE_CURRENT_RELEASE / NOT_EXECUTED |

## Forbidden

Do not fabricate:

- executor names
- timestamps
- screenshots
- logs
- signatures
- approvals
- VALIDATED / QUALIFIED / GMP / Part 11 claims

Developer Jest/CI results are **technical candidates**, not formal IQ/OQ/UAT evidence, unless a human protocol record explicitly adopts them as reviewed execution evidence.

## Storage

Place records under `validation/execution/evidence/` using `{test_id}-{date}.md` or an equivalent unique name. Findings go to `validation/execution/findings/`.

RC2 OQ evidence: `validation/execution/evidence/OQ/RC2/`.

## Findings

A failed or blocked formal test requires a finding record: test ID, URS, severity, impact, and whether a post-candidate change record is required.
