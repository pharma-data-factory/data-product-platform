# RB-P0-006 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-006 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-DATA-002 |
| SYS | SYS-DATA-002 |
| TDS | TDS-DATA-002 |
| Risk | RA-010 |
| Tests | TEST-DATA-002, TEST-IQ-002 (developer execution only; IQ not claimed) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree

## Files changed

- `data-product-platform/packages/backend/src/config/committedConfigIntegrity.test.ts` (added)

Committed overlays already used `${ENV}` placeholders. Remediation established an automated scan rather than changing secret wiring.

## Implementation rationale

URS-DATA-002 requires secrets to come from environment or uncommitted files, not hard-coded committed config. The test walks `app-config.yaml`, `.docker.yaml`, `.production.yaml`, `.github.yaml`, `.marketplace-test.yaml`, and `.local.yaml` and requires `clientSecret`, `privateKey`, `webhookSecret`, `password`, `secret`, and `token` assignments to be `${VAR}` or `${VAR:-default}`. Also forbids PEM blocks and GitHub token prefixes.

## Tests added/modified

- `does not hard-code secrets in committed app-config overlays`

## Test commands

```
cd data-product-platform/packages/backend
yarn test --watchAll=false --testPathPatterns="committedConfigIntegrity|hostingProduction"
```

## Test results

- committedConfigIntegrity.test.ts: passed
- hostingProduction.test.ts (CI YAML / env example): passed

## Remaining limitations

- Scan covers committed app-config overlays and known secret key names, not the entire repository tree (e.g. docs examples).
- Host env values are not inspected (uncommitted `.env` is out of scope).
- Not formal IQ.

## Residual risk

A newly introduced secret key name would need to be added to the scanner.
