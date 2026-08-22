# RB-P1-007 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P1-007 |
| Origin | Phase 3B P0 finding on RB-P0-001 (official Create path) |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Related URS / SYS / TDS | URS-AUD-001 / SYS-AUD-001 / TDS-AUD-001 |
| Related risk | RA-007 |
| Evidence status | **TECHNICAL_EVIDENCE_AVAILABLE** |
| Date | 2026-08-22 |
| Phase | 4A |

## Authoritative Create decision

Production Create is authorized by `PlatformPermissionPolicy.handle()` for:

- `scaffolder.task.create`
- `scaffolder.action.execute`
- `data-product.create`

Commercial template form gates (`scaffolder.template.parameter.read` / `step.read`) still apply entitlement/release AND; those are not the Create execution permission and are not written as Create-authorization records.

The same durable JSONL store (`commercial.createAuthorizationAuditPath`) is injected from `createEntitlementRuntime` into the policy (`module.ts`). Policy GRANT/DENY for the permissions above is appended with actor, timestamp, action (permission name), decision, and context (RBAC/entitlement/release where produced).

`/authorize-create` remains a real API and still records if called. It is not a substitute for the policy path.

## Tests

- `packages/backend/src/permission/policy.test.ts` — Viewer DENY and Developer GRANT for `scaffolder.task.create` survive a new store instance; catalog reads are not recorded.

## Remaining limitations

- Formal process-restart + admin GET retrieval is still FORMAL_VERIFICATION_REQUIRED.
- `scaffolder.task.create` without a template resourceRef is recorded as RBAC-only (current Backstage permission shape).
- Dual runtime instances remain; they share the configured file path.
