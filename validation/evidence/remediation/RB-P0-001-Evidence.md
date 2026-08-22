# RB-P0-001 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P0-001 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |
| Evidence status | TECHNICAL_EVIDENCE_AVAILABLE |
| Date | 2026-08-22 |
| Phase | 3A developer remediation (not IQ/OQ/UAT) |

## Traceability

| Layer | ID |
| --- | --- |
| URS | URS-AUD-001 |
| SYS | SYS-AUD-001 |
| TDS | TDS-AUD-001 |
| Risk | RA-007 |
| Tests | TEST-AUD-001, TEST-AUD-002 (developer execution only) |

## Worktree

- Repository: `data-product-platform`
- HEAD: `d96ab0cbd97ea86314ddcbd468ff5faf756df212`
- Changes: uncommitted worktree (no commit created in this phase)
- Part 11: NOT_CLAIMED (no e-signatures added)

## Files changed

- `data-product-platform/packages/platform-common/src/create-authorization-audit-store.ts` (added)
- `data-product-platform/packages/platform-common/src/entitlement-service.ts`
- `data-product-platform/packages/platform-common/src/entitlements.ts`
- `data-product-platform/packages/platform-common/src/index.ts`
- `data-product-platform/packages/platform-common/src/entitlement-service.test.ts`
- `data-product-platform/plugins/entitlements-backend/src/runtime.ts`
- `data-product-platform/app-config.yaml`
- `data-product-platform/app-config.production.yaml`
- `data-product-platform/app-config.marketplace-test.yaml`

## Implementation rationale

URS-AUD-001 requires validation-relevant Create authorization decisions to survive application/service restart, with actor, timestamp, action, decision, and authorization context. The previous in-memory `events[]` array was lost on restart.

Smallest durable store consistent with existing Control Plane overlays: append-only JSONL on a configured filesystem path (`commercial.createAuthorizationAuditPath`, default `.runtime/create-authorization-audit.jsonl`). PostgreSQL remains the Backstage state store (URS-DATA-001) and is not required by the URS wording for this record type. No Part 11 controls were added.

## Tests added/modified

- Added restart simulation: write Create deny → new `PlatformEntitlementService` on the same file → record retained with actor, `at`, `action=authorizeCreate`, `decision=DENY`, RBAC context.

## Test commands

```
cd data-product-platform/packages/platform-common
yarn test --watchAll=false --testPathPatterns=entitlement-service.test
```

## Test results

- Suites: 1 passed
- Tests: 15 passed, 0 failed
- Includes: `retains Create authorization records after a new service instance reads the same store`

## Remaining limitations

- File/JSONL store, not PostgreSQL. Process restart is covered; host volume wipe is not.
- Default path is local `.runtime/` (gitignored). Hosted deployments must persist that path or set `CREATE_AUTHORIZATION_AUDIT_PATH`.
- Developer unit test is not formal TEST-AUD-002 / OQ.
- Frozen TDS-AUD-001 text still describes the pre-remediation in-memory design.

## Residual risk

Administrator review after restart depends on the configured file remaining on disk. Not an ALCOA+ / Part 11 record.
