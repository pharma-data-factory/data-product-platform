# Phase 4A — P1 classification and execution order

**Baseline:** PDF-PC-VAL-BL-1.0  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22  
**Inputs:** frozen baseline, remediation backlog, `validation/reviews/P0-Independent-Review.md`, P0 evidence, current production code and tests  

This record classifies P1 work. It does not change URS meaning, invent OPEN-LEG-001 operations, execute formal IQ/OQ/UAT, or authorize a Validation Expert plugin.

## Authoritative Create path (RB-P0-001 / RB-P1-007)

Production Create is authorized by `PlatformPermissionPolicy.handle()` after Backstage Scaffolder asks the permission backend.

1. Scaffolder / permission framework invokes the policy.
2. RBAC (`decidePermission`) runs first.
3. For `scaffolder.template.parameter.read` / `step.read` only, commercial entitlement and RELEASED/GA checks AND with RBAC.
4. `scaffolder.task.create`, `scaffolder.action.execute`, and `data-product.create` are the validation-relevant **Create execution** permissions. Those decisions are the records URS-AUD-001 requires.
5. `POST /api/entitlements/authorize-create` is a real API and still records if called. Marketplace UI does not call it. It is not the official Create gate.

The durable audit must therefore be written from the policy decision, on the same JSONL store (`commercial.createAuthorizationAuditPath`).

Residual: `scaffolder.task.create` without a template `resourceRef` is RBAC-only (current Backstage permission shape). Dual `createEntitlementRuntime` instances share the configured file path.

## Items

| ID | Source | Class | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| RB-P1-001 | Existing backlog | FORMAL_VERIFICATION_ONLY | GitHub App, URS-AUTH-001 | Interactive OAuth Create UAT |
| RB-P1-002 | Existing backlog | IMPLEMENTABLE | none | Marketplace register must not create tenant/session |
| RB-P1-003 | Existing backlog | IMPLEMENTABLE | URS-CFG-001 | Hosted configs omit `catalog/samples/` |
| RB-P1-004 | Existing backlog / OPEN-LEG-001 | HUMAN_DECISION_REQUIRED | DEC-LEGAL-001 | Do not invent the operation list |
| RB-P1-005 | Existing backlog | IMPLEMENTABLE | URS-CI-001, URS-CERT-001 | Qualify CERTIFIED/RELEASED vs GMP |
| RB-P1-006 | Existing backlog | FORMAL_VERIFICATION_ONLY | RB-P0-002, RB-P0-007 | Unauthenticated API OQ matrix |
| RB-P1-007 | P0 review finding | IMPLEMENTABLE | RB-P0-001, RB-P1-008 | Official Create-path durable audit |
| RB-P1-008 | P0 review finding | IMPLEMENTABLE | RB-P0-001 | Torn JSONL `list()` |

Not executed in 4A (remain FORMAL_VERIFICATION_REQUIRED): live Viewer session, live AWS Marketplace, live GitHub Actions Read-only, compiled frontend bundle secret scan, formal authentication OQ, IQ, UAT.

## Execution order

1. RB-P1-008 — safe torn JSONL `list()` (unblocks reliable retrieval of 007 records)
2. RB-P1-007 — record the real policy Create decision
3. RB-P1-002, RB-P1-003, RB-P1-005 — independent product gaps
4. RB-P1-004 — decision request only
5. RB-P1-001, RB-P1-006 — evidence records only

No BASELINE_CHANGE_REQUIRED was identified.
