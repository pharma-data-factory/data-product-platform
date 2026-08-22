# Risk Assessment — Platform Core

**Document ID:** VAL-RA-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

This artifact was generated as a PROPOSED validation baseline from repository evidence. Human review and approval are required before it can become part of an approved validation baseline.

This is a **preliminary** risk assessment. Risks are **not accepted**. Residual risk is not residual-accepted. No RA item is marked APPROVED.

Severity / probability are qualitative (H/M/L) for human ranking only.

GxP impact is **potential** if this Control Plane were later placed in a validated context. It does **not** create Part 11 requirements.

---

## RA-001 — Unauthenticated or weakly authenticated access

| Field | Content |
| --- | --- |
| ID | RA-001 |
| Theme | Authentication |
| Hazard | Protected Create, catalog write, or admin APIs used without an approved identity |
| GxP / integrity impact | Indirect — unauthorized change of catalog or generated repos |
| Severity | H |
| Probability (current) | M (dev Guest + dangerous sign-in flag in development) |
| Current controls | Permission enabled; production Guest omitted (`identity.test.ts`); production Catalog User required (`accessPolicy.ts`) |
| Missing controls | Executed production OQ of sign-in; system test of API without cookie |
| Proposed controls | IQ of production config; OQ SYS-AUTH-001–003; periodic review of `dangerouslyAllow*` flags |
| Related URS | URS-AUTH-001, URS-AUTH-002, URS-AUTH-003 |
| Acceptance | **NOT ACCEPTED** |

## RA-002 — Guest privilege escalation in a hosted environment

| Field | Content |
| --- | --- |
| ID | RA-002 |
| Theme | Authentication / privilege escalation |
| Hazard | Guest enabled on a non-local host; Guest is in `data-product-developers` |
| Impact | Unauthenticated-equivalent Developer Create if Guest provider is on |
| Severity | H |
| Probability | M if compose/host mis-set to development |
| Current controls | `allowsGuestSignIn` false in production; docker/production tests assert no guest (`identity.test.ts`) |
| Missing controls | Runtime IQ checklist signed per host; alert if `auth.environment=development` on a shared URL |
| Proposed controls | Deployment IQ item: Guest provider absent; Guest group not used in prod org |
| Related URS | URS-AUTH-002, URS-AUTH-005 |
| Acceptance | **NOT ACCEPTED** |

## RA-003 — Privilege escalation via UI-only gating

| Field | Content |
| --- | --- |
| ID | RA-003 |
| Theme | Authorization / privilege escalation |
| Hazard | User calls APIs that a hidden button would hide; route does not authorize |
| Severity | H |
| Probability | M (nexora-industrial default auth only; no `usePermission`) |
| Current controls | Central `PlatformPermissionPolicy`; selected routers `permissions.authorize()` |
| Missing controls | Complete route-by-route authorize matrix; security tests for each custom prefix |
| Proposed controls | TEST-SEC-002; human TDS-RBAC-003 review |
| Related URS | URS-RBAC-003 |
| Acceptance | **NOT ACCEPTED** |

## RA-004 — RBAC bypass via missing role mapping

| Field | Content |
| --- | --- |
| ID | RA-004 |
| Theme | Authorization |
| Hazard | GitHub user in Catalog without platform group, or group name typo, yields unexpected allow |
| Severity | H |
| Probability | L if policy deny-on-no-role holds; M if generic read fallback is too wide |
| Current controls | `decidePermission` deny without role; production unknown users not implicit Viewer |
| Missing controls | Review of generic read fallback in `policy.ts` (`isPrivilegedRead`) |
| Proposed controls | TEST-RBAC-002; code review of privileged-read list |
| Related URS | URS-RBAC-001, URS-RBAC-002 |
| Acceptance | **NOT ACCEPTED** |

## RA-005 — Entitlement bypass on Create

| Field | Content |
| --- | --- |
| ID | RA-005 |
| Theme | Entitlement bypass |
| Hazard | Commercial template created without active entitlement (direct scaffolder API, wrong product map, local provider always-on) |
| Severity | H (commercial); M integrity |
| Probability | M |
| Current controls | Policy AND-gate for scaffolder template permissions; `authorizeCreate`; commercial product catalog |
| Missing controls | Proof every Create path hits policy with `resourceRef` template id; AWS fail-closed verified |
| Proposed controls | TEST-ENT-001; TEST-SEC-003; complete TDS-ENT-004 review |
| Related URS | URS-ENT-001, URS-ENT-004, URS-SCF-002 |
| Acceptance | **NOT ACCEPTED** |

## RA-006 — Legal gate bypass

| Field | Content |
| --- | --- |
| ID | RA-006 |
| Theme | Legal gate bypass |
| Hazard | Customer artifacts delivered while `legalDistributionStatus=BLOCKED` because legal check applies only to `handoff=customer`, and Scaffolder may use internal handoff |
| Severity | H (legal/commercial) |
| Probability | H for internal Create (by design); M for accidental customer delivery |
| Current controls | `authorizeCreate` LEGAL when `handoff=customer`; default BLOCKED; unit tests. DEC-LEGAL-001: Legal Gate does not automatically block all internal Create. |
| Missing controls | Process control for customer delivery of internally created artifacts; implemented Legal Gate only exists for Customer Handoff API. Export / activation / commercial release / tenant provisioning are NOT_APPLICABLE_CURRENT_RELEASE. |
| Proposed controls | OPEN-LEG-001 CLOSED (DEC-LEGAL-002) without inventing operations; keep RBAC/entitlement independent |
| Related URS | URS-LEG-001 |
| Note | Operation list is defined. Risk remains **NOT ACCEPTED**. Formal Legal Gate OQ is NOT_EXECUTED. |
| Acceptance | **NOT ACCEPTED** |

## RA-007 — Audit trail loss (in-memory entitlements)

| Field | Content |
| --- | --- |
| ID | RA-007 |
| Theme | Audit trail loss / in-memory persistence |
| Hazard | Entitlement grant/deny events disappear on restart; no reconstructable Create history |
| Severity | H if audit is later claimed; M operational |
| Probability | H (every restart) |
| Current controls | In-process `events[]` and admin API |
| Missing controls | Durable store that survives restart; export for administrator review |
| Proposed controls | Implement URS-AUD-001 as BASELINED (durable Create-authorization records). Do **not** add Part 11 claims (DEC-P11-001). |
| Related URS | URS-AUD-001 (BASELINED; PARTIALLY_IMPLEMENTED) |
| Pilot finding | In-memory entitlement audit trail |
| Acceptance | **NOT ACCEPTED** |

## RA-008 — AAS in-memory audit (excluded feature still in process)

| Field | Content |
| --- | --- |
| ID | RA-008 |
| Theme | In-memory persistence |
| Hazard | Operators treat `GET /api/aas/audit` as evidence |
| Severity | M (claim risk) |
| Probability | M |
| Current controls | AAS excluded from this baseline; catalog Audit component DEVELOPMENT |
| Missing controls | Feature flag / removal from production-pilot if unused |
| Proposed controls | Scope exclusion remains; do not validate AAS |
| Related URS | none (excluded) |
| Pilot finding | In-memory AAS audit trail |
| Acceptance | **NOT ACCEPTED** as a Core residual — **out of scope** but recorded so it is not silent |

## RA-009 — Unauthorized or failed GitHub publishing

| Field | Content |
| --- | --- |
| ID | RA-009 |
| Theme | GitHub publishing |
| Hazard | App credentials leak; or publish to wrong org; or unauthenticated scaffolder task |
| Severity | H |
| Probability | M |
| Current controls | Server-side App; frontend without private key; production scaffolder 401 without auth (Pilot Exit) |
| Missing controls | Interactive OAuth Create proof; secret rotation SOP; App permission review |
| Proposed controls | TEST-GH-001; operational least-privilege review |
| Related URS | URS-GH-001, URS-GH-002, URS-SCF-001 |
| Acceptance | **NOT ACCEPTED** |

## RA-010 — Configuration integrity failure

| Field | Content |
| --- | --- |
| ID | RA-010 |
| Theme | Configuration integrity |
| Hazard | Wrong overlay enables Guest, samples, or INTERNAL entitlements in a hosted environment |
| Severity | H |
| Probability | M |
| Current controls | Split config files; some assertions in `identity.test.ts` |
| Missing controls | Signed IQ per environment; permission.enabled check on all overlays |
| Proposed controls | IQ candidate tests TEST-IQ-001–003 |
| Related URS | URS-CFG-001, URS-CFG-002, URS-CAT-002, URS-DATA-002 |
| Acceptance | **NOT ACCEPTED** |

## RA-011 — Generated repository content / secret leakage

| Field | Content |
| --- | --- |
| ID | RA-011 |
| Theme | Generated repositories |
| Hazard | Template renders secrets or unsafe defaults into customer GitHub |
| Severity | H |
| Probability | M |
| Current controls | Template engineering contract; `.env.example` pattern (AGENTS.md). **Out of Core product validation** except as Create interface. |
| Missing controls | Secret-scan of rendered official templates as a Core OQ (not established) |
| Proposed controls | Future Golden Path package; optional TEST-SCF-003 render dry-run |
| Related URS | URS-SCF-001 (interface only) |
| Acceptance | **NOT ACCEPTED** |

## RA-012 — CI/CD status misrepresentation

| Field | Content |
| --- | --- |
| ID | RA-012 |
| Theme | CI/CD execution / traceability |
| Hazard | Quality Gate UNKNOWN or stale run shown as PASS; or CI pass implied as GxP |
| Severity | H (claim); M (ops) |
| Probability | H today (Actions Read-only missing → UNKNOWN) |
| Current controls | Disclaimer text; server-side fetch |
| Missing controls | GitHub App Actions Read-only; UI representation of UNKNOWN as DEGRADED / UNVERIFIED (DEC-CI-001) |
| Proposed controls | Operational permission grant; TEST-GH-003; never treat UNKNOWN as PASS |
| Related URS | URS-GH-003, URS-CI-001 |
| Pilot finding | Quality Gate UNKNOWN |
| Acceptance | **NOT ACCEPTED** |

## RA-013 — Dependency integrity (SOUP / supply chain)

| Field | Content |
| --- | --- |
| ID | RA-013 |
| Theme | Dependency integrity |
| Hazard | Compromised npm/Backstage/Python dep changes Core behavior |
| Severity | H |
| Probability | M |
| Current controls | `yarn install --immutable` in platform CI; Golden Path `pip-audit` (generated products, not Core) |
| Missing controls | Formal SOUP inventory/SBOM, vulnerability scanning of Core, upgrade impact assessment (DEC-SOUP-001) |
| Proposed controls | Apply DEC-SOUP-001 lifecycle controls. Do not claim Backstage is validated. |
| Related URS | none (process decision DEC-SOUP-001) |
| Acceptance | **NOT ACCEPTED** |

## RA-014 — Traceability / evidence gap

| Field | Content |
| --- | --- |
| ID | RA-014 |
| Theme | Traceability |
| Hazard | Claiming validation from CERTIFIED/RELEASED or from this AI draft |
| Severity | H |
| Probability | H if drafts are misused |
| Current controls | Status model; this package marked PROPOSED; AI disclaimer |
| Missing controls | Human approval workflow; executed OQ |
| Proposed controls | Reviews folder; forbid APPROVED status by AI |
| Related URS | URS-LEG-002 |
| Acceptance | **NOT ACCEPTED** |

## RA-015 — AI-generated validation content

| Field | Content |
| --- | --- |
| ID | RA-015 |
| Theme | AI-generated validation content |
| Hazard | Hallucinated requirements, evidence, or approvals enter a controlled validation file |
| Severity | H |
| Probability | H unless reviewed (this package is AI-generated) |
| Current controls | Disclaimer on every artifact; Evidence paths; NEEDS_REVIEW / IMPLEMENTATION_NOT_VERIFIED / NOT ESTABLISHED markers; no APPROVED status |
| Missing controls | Independent CSV review; line-by-line evidence sampling |
| Proposed controls | Mandatory human review before any status change; reject unverifiable IDs |
| Related URS | none |
| Acceptance | **NOT ACCEPTED** |

## RA-016 — Interactive Create and OEE publish unproven

| Field | Content |
| --- | --- |
| ID | RA-016 |
| Theme | CI/CD / GitHub / evidence |
| Hazard | Design assumed working while Pilot Exit records missing interactive Create and OEE live proof |
| Severity | H for “Create works in production” claim |
| Probability | H (findings exist) |
| Current controls | Documented Pilot Exit FAIL; MQTT App-API fallback noted in `pilot-exit-gate.md` |
| Missing controls | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`; `OEE_GITHUB_LIVE_PROOF_NOT_RUN` (OEE is out of Core URS) |
| Proposed controls | Evidence generation — not a new URS |
| Related URS | URS-SCF-001 (evidence gap only) |
| Acceptance | **NOT ACCEPTED** |

## RA-017 — Absence of Part 11 / IQ-OQ-PQ used as if present

| Field | Content |
| --- | --- |
| ID | RA-017 |
| Theme | Compliance gap (not converted to URS) |
| Hazard | Marketing or QA treats Core as Part 11 or validated CSV |
| Severity | H |
| Probability | M |
| Current controls | Explicit NOT VALIDATED; GxP out of MVP |
| Missing controls | IQ/OQ/PQ package; Part 11 assessment (intentionally not specified as product URS) |
| Proposed controls | Keep claim-control URS-LEG-002; do not implement GxP in this phase |
| Related URS | URS-LEG-002 only |
| Pilot finding | Absence of Part 11; absence of IQ/OQ/PQ |
| Acceptance | **NOT ACCEPTED** |

## RA-018 — Control Plane DB loss / SQLite misuse in hosted mode

| Field | Content |
| --- | --- |
| ID | RA-018 |
| Theme | In-memory / persistence |
| Hazard | Hosted Core run on SQLite file without backup; catalog/auth/scaffolder state lost |
| Severity | M |
| Probability | M |
| Current controls | Compose uses Postgres; docs recommend Postgres for hosted |
| Missing controls | Backup/restore SOP; encryption-at-rest claim |
| Proposed controls | IQ: Postgres healthy; no production SQLite |
| Related URS | URS-DATA-001 |
| Acceptance | **NOT ACCEPTED** |

---

## Summary counts

| | Count |
| --- | --- |
| Risks identified | **18** |
| Risks accepted | **0** |
| Risks with current controls only (still not accepted) | 18 |
| Risks with missing controls | 18 |

## Required theme coverage

| Theme | RA IDs |
| --- | --- |
| Authentication | RA-001, RA-002 |
| Authorization | RA-003, RA-004 |
| Privilege escalation | RA-002, RA-003 |
| Entitlement bypass | RA-005 |
| Legal gate bypass | RA-006 |
| Audit trail loss | RA-007, RA-008 |
| In-memory persistence | RA-007, RA-008, RA-018 |
| GitHub publishing | RA-009, RA-016 |
| Configuration integrity | RA-010 |
| Generated repositories | RA-011 |
| CI/CD execution | RA-012, RA-016 |
| Dependency integrity | RA-013 |
| Traceability | RA-014 |
| AI-generated validation content | RA-015 |
| Part 11 / IQ-OQ-PQ absence | RA-017 (compliance, not a URS) |
