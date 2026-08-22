# RB-P0-004 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-004 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-GH-002 |
| SYS | SYS-GH-002 |
| TDS | TDS-GH-002 |
| Risk | RA-009 |
| Tests | TEST-GH-002 (developer execution only) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree
- OAuth client IDs may be public (DEC / URS-GH-002 MODIFY)

## Files changed

- `data-product-platform/packages/backend/src/config/committedConfigIntegrity.test.ts` (added)

Reused without change: `identity.test.ts` (landing/login lack secrets); `hostingProduction.test.ts` (CI/env example); `awsMarketplace.ts` `redactRegistrationToken`; entitlements router registration log test; `mapCiStatus` / `publicCiStatus` token stripping.

## Implementation rationale

URS-GH-002 forbids exposing client secrets, tokens, and private keys in source, generated artifacts, logs, UI, or public config. Client IDs may be public.

Added committed-config and frontend-source scans: no PEM/token literals; `clientSecret` / `privateKey` / passwords must use `${ENV}` and must not carry `@visibility frontend`. Existing registration logging already redacts marketplace tokens.

## Tests added/modified

- Committed YAML secret-placeholder scan
- No `@visibility frontend` on secret keys
- Frontend source has no PEM / `ghp_` / `ghs_` / `github_pat_` literals

## Test commands

```
cd data-product-platform/packages/backend
yarn test --watchAll=false --testPathPatterns="committedConfigIntegrity|identity.test|hostingProduction"

cd data-product-platform/plugins/entitlements-backend
yarn test --watchAll=false --testPathPatterns=router.test
```

## Test results

- backend group including config/identity/hosting: 25 passed, 0 failed
- entitlements router (token not logged): passed

## Remaining limitations

- Compiled webpack/frontend bundle was not generated or scanned in this run.
- Runtime log capture of a live process was not performed; unit assertions cover registration redaction and public CI payload stripping.
- Not formal IQ.

## Residual risk

A future config key with a new secret name could evade the scanner until the test list is extended. Live log volume is not reviewed.
