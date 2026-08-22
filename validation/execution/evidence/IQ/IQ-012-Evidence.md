# IQ-012 Evidence — SBOM

| Field | Value |
| --- | --- |
| candidate_version | 1.0-RC1 |
| test_id | IQ-012 |
| related | DEC-SOUP-001, RA-013 |
| execution_timestamp | 2026-08-22T18:01:55+02:00 |
| executor | NOT_ESTABLISHED (named human) |
| environment | Candidate tree; no SBOM tool preinstalled |
| status | PASS |

## Procedure performed

Searched the candidate for SBOM artifacts. Checked `syft` availability. Did not install CycloneDX/`syft` into the product (`npx --no-install` canceled: package not present).

## Expected result (unchanged)

SBOM attached **or** explicitly NOT_ESTABLISHED. Do not fabricate an SBOM.

## Actual result

In-repo SBOM file: **NOT_ESTABLISHED** (search found only `validation/execution/SOUP-SBOM-Plan.md`).

Generation method: none executed. Tool versions: syft not installed; `@cyclonedx/cyclonedx-npm` not present without download.

SOUP approval: not claimed.

## Objective evidence

Search result; syft not found; npx `--no-install` canceled.
