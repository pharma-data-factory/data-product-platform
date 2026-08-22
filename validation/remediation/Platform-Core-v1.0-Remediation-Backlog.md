# Platform Core v1.0 Remediation Backlog

**Baseline:** Platform Core Validation Baseline v1.0 (`PDF-PC-VAL-BL-1.0`)  
**Type:** Analysis only  
**Validation status:** NOT_VALIDATED  

This backlog does **not** authorize product-code changes, configuration changes, test execution, or a Validation Expert plugin. Nothing here is PASSED or VALIDATED.

Part 11 is **NOT CLAIMED**. Required evidence is reviewed or approved execution evidence, not electronic signatures.

Priority:

| Priority | Meaning |
| --- | --- |
| P0 | Validation/security blocker |
| P1 | Required before Platform Core validation |
| P2 | Evidence/quality improvement |
| P3 | Future / non-blocking |

---

## Summary

| Priority | Count | IDs |
| --- | --- | --- |
| P0 | 7 | RB-P0-001 … RB-P0-007 |
| P1 | 8 | RB-P1-001 … RB-P1-008 |
| P2 | 22 | RB-P2-001 … RB-P2-022 (IMPLEMENTED URS lacking reviewed execution evidence) |
| P3 | 3 | RB-P3-001 … RB-P3-003 |

Active URS covered: 38. REJECTED URS-AUTH-005 is not a remediation item.

---

## P0 — validation / security blockers

### RB-P0-001

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-001 |
| Priority | P0 |
| Related URS | URS-AUD-001 |
| Related SYS | SYS-AUD-001 |
| Related TDS | TDS-AUD-001 |
| Related Risk | RA-007 |
| Current state | PARTIALLY_IMPLEMENTED — in-memory `events[]`; lost on restart |
| Required target state | IMPLEMENTED + reviewed execution evidence that records survive restart |
| Proposed implementation area | Persist Create-authorization records outside process memory (e.g. Control Plane PostgreSQL or equivalent durable store). Not Part 11. |
| Proposed tests | TEST-AUD-001, TEST-AUD-002 |
| Required evidence | Restart test showing actor, timestamp, action, decision, authorization context retained |
| Dependencies | URS-DATA-001 hosted DB; DEC-P11-001 (do not add e-signatures) |
| Validation impact | Without this, Create history cannot be reviewed after restart |

### RB-P0-002

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-002 |
| Priority | P0 |
| Related URS | URS-RBAC-003 |
| Related SYS | SYS-RBAC-003 |
| Related TDS | TDS-RBAC-003 |
| Related Risk | RA-003 |
| Current state | PARTIALLY_IMPLEMENTED — central policy exists; not every custom route proven to authorize |
| Required target state | IMPLEMENTED + reviewed security evidence for each custom API prefix |
| Proposed implementation area | Route-by-route `permissions.authorize` (or equivalent) for custom backends |
| Proposed tests | TEST-RBAC-003, TEST-SEC-002 |
| Required evidence | Viewer cannot mutate certification, entitlements admin, or Create via API |
| Dependencies | URS-CFG-002 |
| Validation impact | UI-only gating would invalidate RBAC claims |

### RB-P0-003

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-003 |
| Priority | P0 |
| Related URS | URS-ENT-004 |
| Related SYS | SYS-ENT-004 |
| Related TDS | TDS-ENT-004 |
| Related Risk | RA-005 |
| Current state | NOT_VERIFIED |
| Required target state | IMPLEMENTED (verified fail-closed) + reviewed execution evidence |
| Proposed implementation area | `plugins/entitlements-backend/src/awsMarketplace.ts` / `runtime.ts` |
| Proposed tests | TEST-ENT-004 |
| Required evidence | Failed AWS lookup does not grant INTERNAL entitlements |
| Dependencies | AWS test credentials or a controlled fail-closed fixture |
| Validation impact | Silent entitlement grant in production AWS mode |

### RB-P0-004

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-004 |
| Priority | P0 |
| Related URS | URS-GH-002 |
| Related SYS | SYS-GH-002 |
| Related TDS | TDS-GH-002 |
| Related Risk | RA-009 |
| Current state | PARTIALLY_IMPLEMENTED — env placeholders; artifact/log/UI exposure not proven |
| Required target state | IMPLEMENTED + reviewed evidence that secrets/tokens/keys are absent from source, generated artifacts, logs, UI, and public config (clientId may be public) |
| Proposed implementation area | Config visibility, logging redaction, frontend bundle |
| Proposed tests | TEST-GH-002 |
| Required evidence | Bundle/log/UI inspection record |
| Dependencies | URS-DATA-002 |
| Validation impact | Credential leak breaks trust boundary |

### RB-P0-005

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-005 |
| Priority | P0 |
| Related URS | URS-GH-003 |
| Related SYS | SYS-GH-003 |
| Related TDS | TDS-GH-003 |
| Related Risk | RA-012 |
| Current state | PARTIALLY_IMPLEMENTED — server-side fetch; live UNKNOWN; not shown as DEGRADED/UNVERIFIED |
| Required target state | IMPLEMENTED representation DEC-CI-001 + reviewed evidence; UNKNOWN never treated as PASS |
| Proposed implementation area | `githubActions.ts`; `CiQualityGateCard.tsx`; GitHub App Actions Read-only (operational) |
| Proposed tests | TEST-GH-003, TEST-OQ-002 |
| Required evidence | UI/API shows DEGRADED/UNVERIFIED when unread; real conclusion when readable |
| Dependencies | DEC-CI-001; App permission grant |
| Validation impact | UNKNOWN-as-PASS would falsify Quality Gate |

### RB-P0-006

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-006 |
| Priority | P0 |
| Related URS | URS-DATA-002 |
| Related SYS | SYS-DATA-002 |
| Related TDS | TDS-DATA-002 |
| Related Risk | RA-010 |
| Current state | PARTIALLY_IMPLEMENTED — YAML uses `${}`; full-tree secret scan not established |
| Required target state | IMPLEMENTED + reviewed scan/IQ evidence |
| Proposed implementation area | Committed config and CI secret-scan policy (analysis only here) |
| Proposed tests | TEST-DATA-002, TEST-IQ-002 |
| Required evidence | Reviewed scan of committed config; env-only secrets on host |
| Dependencies | RB-P0-004 |
| Validation impact | Hard-coded secrets invalidate configuration integrity |

### RB-P0-007

| Field | Content |
| --- | --- |
| Backlog ID | RB-P0-007 |
| Priority | P0 |
| Related URS | URS-CFG-002 |
| Related SYS | SYS-CFG-002 |
| Related TDS | TDS-CFG-002 |
| Related Risk | RA-010 |
| Current state | PARTIALLY_IMPLEMENTED — base `permission.enabled: true`; overlays not verified |
| Required target state | IMPLEMENTED on all intended RBAC deployments + reviewed IQ evidence |
| Proposed implementation area | `app-config.docker.yaml`; `app-config.production.yaml`; other overlays |
| Proposed tests | TEST-CFG-001, TEST-IQ-001 |
| Required evidence | Overlay file review showing permission.enabled remains true |
| Dependencies | URS-CFG-001 |
| Validation impact | Disabled permission framework voids URS-RBAC-* |

---

## P1 — required before Platform Core validation

### RB-P1-001

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-001 |
| Priority | P1 |
| Related URS | URS-SCF-001 |
| Related SYS | SYS-SCF-001 |
| Related TDS | TDS-SCF-001 |
| Related Risk | RA-009, RA-016 |
| Current state | PARTIALLY_IMPLEMENTED — mechanism present; `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| Required target state | IMPLEMENTED + reviewed UAT/OQ evidence of interactive Create |
| Proposed implementation area | No product invent; execute authorized Developer OAuth Create (later phase) |
| Proposed tests | TEST-SCF-001, TEST-AUTH-005, TEST-UAT-001 |
| Required evidence | Reviewed UAT record (not e-signed unless customer governance requires) |
| Dependencies | URS-AUTH-001, URS-GH-001, GitHub App |
| Validation impact | Create cannot be operationally qualified without this |

### RB-P1-002

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-002 |
| Priority | P1 |
| Related URS | URS-ENT-003 |
| Related SYS | SYS-ENT-003 |
| Related TDS | TDS-ENT-003 |
| Related Risk | RA-005 |
| Current state | NOT_VERIFIED |
| Required target state | Verified no portal session / no tenant from marketplace register |
| Proposed implementation area | `plugins/entitlements-backend/src/registration.ts` |
| Proposed tests | TEST-ENT-003 |
| Required evidence | HTTP register does not set Backstage session cookie |
| Dependencies | none |
| Validation impact | Procurement identity must not become Catalog identity |

### RB-P1-003

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-003 |
| Priority | P1 |
| Related URS | URS-CAT-002 |
| Related SYS | SYS-CAT-002 |
| Related TDS | TDS-CAT-002 |
| Related Risk | RA-010 |
| Current state | NOT_VERIFIED |
| Required target state | Verified production/docker configs omit `catalog/samples/` |
| Proposed implementation area | `app-config.docker.yaml`; `app-config.production.yaml` |
| Proposed tests | TEST-CAT-002, TEST-IQ-001 |
| Required evidence | File review + catalog query after hosted boot |
| Dependencies | URS-CFG-001 |
| Validation impact | Sample entities in a hosted catalog |

### RB-P1-004

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-004 |
| Priority | P1 |
| Related URS | URS-LEG-001 |
| Related SYS | SYS-LEG-001 |
| Related TDS | TDS-LEG-001 |
| Related Risk | RA-006 |
| Current state | Policy list **CLOSED** (DEC-LEGAL-002). Software remains `handoff=customer` on `authorizeCreate` only. |
| Required target state | Policy list defined (done) then formally verified for existing operations |
| Proposed implementation area | Policy document first; software only after the list exists |
| Proposed tests | TEST-LEG-001 (extend once list is defined) |
| Required evidence | Written operation list; tests against that list |
| Dependencies | DEC-LEGAL-001; counsel/product owner |
| Validation impact | Undefined handoff set leaves legal-gate applicability incomplete |

### RB-P1-005

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-005 |
| Priority | P1 |
| Related URS | URS-LEG-002 |
| Related SYS | SYS-LEG-002 |
| Related TDS | TDS-LEG-002 |
| Related Risk | RA-014, RA-017 |
| Current state | PARTIALLY_IMPLEMENTED — many disclaimers; not every surface verified |
| Required target state | IMPLEMENTED across Core UI/docs + reviewed UAT |
| Proposed implementation area | Marketplace, Data Products, Quality Gate, releases, landing copy |
| Proposed tests | TEST-LEG-002 |
| Required evidence | Surface checklist: no GxP/validated/commercially-distributable collapse |
| Dependencies | URS-CI-001, URS-CERT-001 |
| Validation impact | Claim collapse is a compliance/communication blocker |

### RB-P1-006

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-006 |
| Priority | P1 |
| Related URS | URS-AUTH-001 (and supporting AUTH-002/003) |
| Related SYS | SYS-AUTH-001 |
| Related TDS | TDS-AUTH-001 |
| Related Risk | RA-001 |
| Current state | IMPLEMENTED in wiring; unauthenticated API matrix not reviewed as execution evidence |
| Required target state | Reviewed OQ/security evidence for protected routes |
| Proposed implementation area | No design change required if policy already denies; verify HTTP |
| Proposed tests | TEST-AUTH-004, TEST-SEC-001, TEST-OQ-001 |
| Required evidence | Unauthenticated Scaffolder/admin/certification denied |
| Dependencies | RB-P0-002, RB-P0-007 |
| Validation impact | Authentication claim lacks operational evidence |

### RB-P1-007

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-007 |
| Priority | P1 |
| Origin | Phase 3B independent review finding on RB-P0-001 |
| Related URS | URS-AUD-001 |
| Related SYS | SYS-AUD-001 |
| Related TDS | TDS-AUD-001 |
| Related Risk | RA-007 |
| Current state | Official Scaffolder Create is authorized by `PlatformPermissionPolicy.handle()`. Durable audit is appended for `scaffolder.task.create`, `scaffolder.action.execute`, and `data-product.create`. |
| Required target state | Durable record of the real Create authorization decision (not a parallel `/authorize-create` substitute) |
| Proposed implementation area | `packages/backend/src/permission/policy.ts`; `module.ts` injects `createAuthorizationAuditStore()` |
| Proposed tests | TEST-AUD-001 (developer); policy persistence test |
| Required evidence | Policy GRANT/DENY survives a new store instance |
| Dependencies | RB-P0-001 store; RB-P1-008 list() robustness |
| Validation impact | Without this, Create audit does not represent production Create |
| Phase 4A class | IMPLEMENTABLE |
| Phase 4A evidence | `validation/evidence/remediation/p1/RB-P1-007-Evidence.md` |

### RB-P1-008

| Field | Content |
| --- | --- |
| Backlog ID | RB-P1-008 |
| Priority | P1 |
| Origin | Phase 3B independent review finding on RB-P0-001 |
| Related URS | URS-AUD-001 |
| Related SYS | SYS-AUD-001 |
| Related TDS | TDS-AUD-001 |
| Related Risk | RA-007 |
| Current state | `FileCreateAuthorizationAuditStore.list()` skips torn/malformed lines, reports `issues()`, does not rewrite the file |
| Required target state | Valid prior records remain readable; malformed data detectable and not promoted to valid events |
| Proposed implementation area | `packages/platform-common/src/create-authorization-audit-store.ts` |
| Proposed tests | Torn JSONL + MALFORMED_RECORD tests |
| Required evidence | Deterministic list() behavior documented |
| Dependencies | RB-P0-001 JSONL store |
| Validation impact | Torn write must not hide prior Create authorization evidence |
| Phase 4A class | IMPLEMENTABLE |
| Phase 4A evidence | `validation/evidence/remediation/p1/RB-P1-008-Evidence.md` |

---

## Phase 4A classification (2026-08-22)

URS meaning was not changed. Formal IQ/OQ/UAT was not executed. Validation Expert plugin was not created.

| Backlog ID | Class | Phase 4A outcome |
| --- | --- | --- |
| RB-P1-001 | FORMAL_VERIFICATION_ONLY | Not executed. Evidence: FORMAL_VERIFICATION_REQUIRED |
| RB-P1-002 | IMPLEMENTABLE | Technical register/cookie assertions. Evidence: TECHNICAL_EVIDENCE_AVAILABLE |
| RB-P1-003 | IMPLEMENTABLE | Hosted overlays omit samples (file test). Hosted catalog query remains formal IQ |
| RB-P1-004 | HUMAN_DECISION_REQUIRED | Decision request written. List not invented |
| RB-P1-005 | IMPLEMENTABLE | Technical CERTIFIED/RELEASED qualified; NOT_VALIDATED retained |
| RB-P1-006 | FORMAL_VERIFICATION_ONLY | Not executed. Evidence: FORMAL_VERIFICATION_REQUIRED |
| RB-P1-007 | IMPLEMENTABLE | Policy Create decision recorded to durable store |
| RB-P1-008 | IMPLEMENTABLE | Torn/malformed JSONL list() is deterministic |

Execution order used: RB-P1-008 → RB-P1-007 → RB-P1-002 / RB-P1-003 / RB-P1-005 → RB-P1-004 decision request. Formal items (001, 006) recorded only.

---

## P2 — evidence / quality (IMPLEMENTED URS without reviewed execution evidence)

Each item: current state IMPLEMENTED; target = same implementation + reviewed execution evidence; verification NOT_EXECUTED.

| Backlog ID | URS | SYS / TDS | Risk | Proposed tests | Validation impact |
| --- | --- | --- | --- | --- | --- |
| RB-P2-001 | URS-AUTH-002 | SYS/TDS-AUTH-002 | RA-002 | TEST-AUTH-001, TEST-IQ-001 | Production Guest prohibition unproven as reviewed IQ |
| RB-P2-002 | URS-AUTH-003 | SYS/TDS-AUTH-003 | RA-001 | TEST-AUTH-002 | Catalog-user rule unproven as OQ |
| RB-P2-003 | URS-AUTH-004 | SYS/TDS-AUTH-004 | RA-009 | TEST-AUTH-003, TEST-GH-001 | Credential-split unproven as reviewed evidence |
| RB-P2-004 | URS-RBAC-001 | SYS/TDS-RBAC-001 | RA-004 | TEST-RBAC-001, TEST-OQ-001 | Role model unproven as OQ |
| RB-P2-005 | URS-RBAC-002 | SYS/TDS-RBAC-002 | RA-004 | TEST-RBAC-002 | No-role deny unproven as OQ |
| RB-P2-006 | URS-RBAC-004 | SYS/TDS-RBAC-004 | RA-003 | TEST-SCF-002, TEST-OQ-001 | Viewer Create deny unproven as OQ |
| RB-P2-007 | URS-RBAC-005 | SYS/TDS-RBAC-005 | RA-005 | TEST-OQ-001 | Developer Create path unproven as OQ |
| RB-P2-008 | URS-RBAC-006 | SYS/TDS-RBAC-006 | RA-003 | TEST-AUD-003, TEST-OQ-001 | Owner cert write unproven as OQ |
| RB-P2-009 | URS-RBAC-007 | SYS/TDS-RBAC-007 | RA-003 | TEST-OQ-001 | Admin privileges unproven as OQ |
| RB-P2-010 | URS-ENT-001 | SYS/TDS-ENT-001 | RA-005 | TEST-ENT-001, TEST-ENT-002, TEST-SEC-003 | Entitlement AND-gate unproven as system test |
| RB-P2-011 | URS-ENT-002 | SYS/TDS-ENT-002 | RA-005 | TEST-ENT-001 | Distinct deny reasons unproven as OQ |
| RB-P2-012 | URS-SCF-002 | SYS/TDS-SCF-002 | RA-005 | TEST-SCF-002 | Layered Create deny unproven as OQ |
| RB-P2-013 | URS-SCF-003 | SYS/TDS-SCF-003 | RA-005 | TEST-SCF-003 | RELEASED-only Create unproven as OQ |
| RB-P2-014 | URS-GH-001 | SYS/TDS-GH-001 | RA-009 | TEST-GH-001, TEST-IQ-002 | App-vs-OAuth publish unproven as IQ |
| RB-P2-015 | URS-CI-001 | SYS/TDS-CI-001 | RA-012 | TEST-LEG-002, TEST-OQ-002 | “Technical only” copy unproven as UAT |
| RB-P2-016 | URS-AUD-002 | SYS/TDS-AUD-002 | RA-003 | TEST-AUD-003 | Cert permission unproven as OQ |
| RB-P2-017 | URS-DATA-001 | SYS/TDS-DATA-001 | RA-018 | TEST-DATA-001, TEST-IQ-001 | Hosted Postgres unproven as IQ |
| RB-P2-018 | URS-CFG-001 | SYS/TDS-CFG-001 | RA-010 | TEST-CFG-001 | Overlay set unproven as IQ |
| RB-P2-019 | URS-CAT-001 | SYS/TDS-CAT-001 | RA-010 | TEST-CAT-001 | Catalog ingest unproven as IQ |
| RB-P2-020 | URS-CAT-003 | SYS/TDS-CAT-003 | — | TEST-CAT-003, TEST-UAT-001 | Data Products UX unproven as UAT |
| RB-P2-021 | URS-MKT-001 | SYS/TDS-MKT-001 | — | TEST-MKT-001 | Marketplace/no-pay unproven as UAT |
| RB-P2-022 | URS-CERT-001 | SYS/TDS-CERT-001 | RA-014 | TEST-CERT-001 | Overlay-not-GxP unproven as reviewed evidence |

Common fields for RB-P2-001–022:

| Field | Content |
| --- | --- |
| Proposed implementation area | None required if implementation stands; produce reviewed execution evidence |
| Required evidence | Reviewed IQ/OQ/UAT record mapped to the URS |
| Dependencies | P0/P1 blockers that affect the same path |
| Current state | IMPLEMENTED / verification NOT_EXECUTED |
| Required target state | IMPLEMENTED + reviewed execution evidence |

---

## P3 — future / non-blocking

### RB-P3-001

| Field | Content |
| --- | --- |
| Backlog ID | RB-P3-001 |
| Priority | P3 |
| Related URS | URS-DOC-001 |
| Related SYS / TDS | SYS-DOC-001 / TDS-DOC-001 |
| Related Risk | — |
| Current state | PARTIALLY_IMPLEMENTED (TechDocs index gap) |
| Required target state | IMPLEMENTED + reviewed evidence |
| Proposed implementation area | TechDocs builder/index |
| Proposed tests | TEST-DOC-001 |
| Required evidence | Authenticated `/developer` and `/docs` open |
| Dependencies | none |
| Validation impact | Documentation discoverability; not a security blocker |

### RB-P3-002

| Field | Content |
| --- | --- |
| Backlog ID | RB-P3-002 |
| Priority | P3 |
| Related URS | URS-SRC-001 |
| Related SYS / TDS | SYS-SRC-001 / TDS-SRC-001 |
| Related Risk | — |
| Current state | PARTIALLY_IMPLEMENTED |
| Required target state | IMPLEMENTED + reviewed evidence |
| Proposed implementation area | Search indexes |
| Proposed tests | TEST-DOC-001 |
| Required evidence | Search returns catalog/TechDocs hits when indexes built |
| Dependencies | RB-P3-001 |
| Validation impact | Discover completeness |

### RB-P3-003

| Field | Content |
| --- | --- |
| Backlog ID | RB-P3-003 |
| Priority | P3 |
| Related URS | URS-MKT-002 |
| Related SYS / TDS | SYS-MKT-002 / TDS-MKT-002 |
| Related Risk | RA-014 |
| Current state | NOT_VERIFIED |
| Required target state | Verified building-block labels |
| Proposed implementation area | `plugins/marketplace/src/data.ts` |
| Proposed tests | TEST-MKT-002 |
| Required evidence | Label review checklist |
| Dependencies | URS-MKT-001 |
| Validation impact | Claim-control for building blocks |

---

## Out of backlog (explicit)

| Item | Why not a Core remediation story |
| --- | --- |
| URS-AUTH-005 | REJECTED / DEVELOPMENT_ONLY |
| OEE GitHub live proof | DEC-OEE-001 outside Core |
| Part 11 / e-signatures | DEC-P11-001 NOT CLAIMED |
| Implementing this backlog | Forbidden in the original analysis phase. Phase 4A remediates classified P1 items only |

---

## Dependency note (DEC-SOUP-001)

SOUP controls (pin, inventory/SBOM, vulnerability scan, change/upgrade assessment, regression) are **process** obligations under DEC-SOUP-001. They are not a URS ID. They should be planned with P1 evidence work and RA-013. Do not claim Backstage is validated.
