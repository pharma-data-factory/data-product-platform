# Phase 4B — Independent P1 Remediation Review

| Field | Value |
| --- | --- |
| Document | VAL-REV-PC-P1-4B |
| Baseline | Platform Core Validation Baseline v1.0 (`PDF-PC-VAL-BL-1.0`) |
| Review type | Independent technical review (CSV / GxP software validation / security / architecture) |
| Reviewer | Independent AI reviewer (not the Phase 4A implementer). No named human sign-off. |
| Date | 2026-08-22 |
| Product / test / evidence changes | None. Review only. Phase 4A artifacts were read, not rewritten. |
| Formal IQ / OQ / UAT | Not executed |
| Part 11 | NOT_CLAIMED |
| Validation Expert plugin | Not created |
| Regulatory compliance | Not approved |
| Validation status | **NOT_VALIDATED** |

This review is **not** a validation approval, qualification, or formal verification.

Review statuses used below:

| Status | Meaning |
| --- | --- |
| REVIEW_ACCEPTED | Remediation aligns with the baselined requirement at developer-technical level; remaining work is only formal verification |
| REVIEW_ACCEPTED_WITH_OBSERVATIONS | Requirement is met at developer-technical level; observations do not reopen an implementation blocker |
| REVIEW_FINDING | Material gap versus the baselined requirement or versus claimed evidence |
| REVIEW_BLOCKED | Review cannot be completed |
| FORMAL_VERIFICATION_PENDING | Item correctly remains formal IQ/OQ/UAT; developer tests are not formal evidence |
| HUMAN_DECISION_PENDING | Item correctly remains a human policy decision; list was not invented |

---

## 1. Executive summary

Eight P1 items (RB-P1-001 … RB-P1-008) were reviewed against the frozen baseline, Phase 4A classification, P0 independent review, P1 evidence, OPEN-LEG-001, and the current production/test code.

| Bucket | Count | IDs |
| --- | --- | --- |
| P1 reviewed | 8 | RB-P1-001 … RB-P1-008 |
| REVIEW_ACCEPTED | 0 | — |
| REVIEW_ACCEPTED_WITH_OBSERVATIONS | 5 | RB-P1-002, RB-P1-003, RB-P1-005, RB-P1-007, RB-P1-008 |
| REVIEW_FINDING | 0 | — |
| REVIEW_BLOCKED | 0 | — |
| FORMAL_VERIFICATION_PENDING | 2 | RB-P1-001, RB-P1-006 |
| HUMAN_DECISION_PENDING | 1 | RB-P1-004 |

The Phase 3B P0 findings on RB-P0-001 (official Create not audited; torn JSONL `list()` crash) are addressed in code on the real permission-policy path. That does **not** close URS-AUD-001 verification.

**P1 READY FOR VERIFICATION PREPARATION: YES**

That answer means only: this review found no unresolved P1 *implementation* blocker that must be re-worked before formal IQ/OQ/UAT *preparation* can start. It does **not** mean validated, qualified, IQ passed, OQ passed, UAT passed, or code-frozen for a validation release.

---

## 2. Per-P1 status

### RB-P1-001 — Interactive OAuth Create

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-SCF-001 / SYS-SCF-001 / TDS-SCF-001 |
| Related risk | RA-009, RA-016 |
| Related tests (baseline) | TEST-SCF-001, TEST-AUTH-005, TEST-UAT-001 |
| Evidence | `validation/evidence/remediation/p1/RB-P1-001-Evidence.md` — FORMAL_VERIFICATION_REQUIRED |
| Review status | **FORMAL_VERIFICATION_PENDING** |

Classification is correct. `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` remains. No developer test was converted into UAT/OQ evidence. No substitute Create was invented.

---

### RB-P1-002 — Marketplace register: no tenant / no session

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-ENT-003 / SYS-ENT-003 / TDS-ENT-003 |
| Related risk | RA-005 |
| Related tests (baseline) | TEST-ENT-003 |
| Evidence | `RB-P1-002-Evidence.md` — TECHNICAL_EVIDENCE_AVAILABLE |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

- `MarketplaceRegistrationResult` types `tenantCreated: false`, `accessGranted: false`, `requiresSignIn: true` (not optional).
- Every return path inspected in `registration.ts` (including `ENTITLED` / `NOT_ENTITLED`) sets those flags.
- `POST /marketplace/register` does not call `res.cookie` / `Set-Cookie`. HTML fulfillment restates that sign-in is required and that the step does not create a tenant or grant access.
- Registration token is redacted in logs and HTML (`<` stripped).

#### Observations

- Router test covers the **NOT_CONFIGURED (503)** path only, plus cookie absence on that path. The HTTP 200 `ENTITLED` path is not asserted for `Set-Cookie` or activation implication.
- Status `ENTITLED` plus `entitledProductIds` on HTTP 200 can be misread as commercial activation if a client ignores `accessGranted` / `requiresSignIn`. The typed payload and message contradict that reading.
- Live AWS Marketplace register remains formal (out of 4A scope).
- Frozen URS-ENT-003 Implementation is still **NOT_VERIFIED**. Evidence `TECHNICAL_EVIDENCE_AVAILABLE` is not an overclaim of formal verification, but the URS implementation field was not aligned.

---

### RB-P1-003 — Sample catalog omitted from hosted configs

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-CAT-002 / SYS-CAT-002 / TDS-CAT-002 |
| Related risk | RA-010 |
| Related tests (baseline) | TEST-CAT-002, TEST-IQ-001 |
| Evidence | `RB-P1-003-Evidence.md` — TECHNICAL_EVIDENCE_AVAILABLE |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Configuration evidence (inspected)

`app-config.docker.yaml` and `app-config.production.yaml` catalog locations do **not** contain `catalog/samples`. Local `app-config.yaml` still loads `catalog/samples/entities.yaml` and `catalog/samples/industrial.yaml`. `app-config.marketplace-test.yaml` does not add samples.

Root `Dockerfile` CMD is `yarn start --config app-config.yaml --config app-config.docker.yaml`. The docker overlay **redefines** `catalog.locations` without samples. File tests in `committedConfigIntegrity.test.ts` and `pilotHardening.test.ts` match that.

#### Hosted IQ evidence

**Not established.** A catalog query after hosted boot is required to prove merge/runtime behavior. Evidence correctly leaves that as formal IQ. Frozen URS-CAT-002 Implementation remains **NOT_VERIFIED**.

Do not treat the file scan as TEST-IQ-001.

---

### RB-P1-004 — OPEN-LEG-001 operation list

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-LEG-001 / SYS-LEG-001 / TDS-LEG-001 |
| Related risk | RA-006 |
| Related tests (baseline) | TEST-LEG-001 |
| Evidence | `RB-P1-004-Evidence.md` — HUMAN_DECISION_REQUIRED |
| Review status | **HUMAN_DECISION_PENDING** |

The decision request does **not** invent the list. Human Decision is `PENDING`. Current software still applies Legal Gate only when `authorizeCreate` is called with `handoff === 'customer'`.

The official Scaffolder path (`PlatformPermissionPolicy.handle`) does **not** apply the Legal Gate. That is consistent with DEC-LEGAL-001 (Legal Gate is not all internal Create) and with the still-open policy definition.

#### Which future gate this blocks

| Gate | Blocked? |
| --- | --- |
| Unrelated P1 implementation / verification *preparation* | **No** |
| Code freeze of *other* Core implementation | **No** |
| IQ of auth, catalog, PostgreSQL, permission.enabled, audit file path | **No** |
| OQ of RBAC / entitlement / official Create (non-legal layers) | **No** |
| OQ / UAT of Legal Gate applicability (TEST-LEG-001) | **Yes** |
| Final validation release of URS-LEG-001 / Platform Core package | **Yes**, while the operation list remains `OPEN_POLICY_DEFINITION` |

This reviewer does not accept residual legal-scope risk on behalf of counsel or the product owner.

---

### RB-P1-005 — Claim control

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-LEG-002 / SYS-LEG-002 / TDS-LEG-002 |
| Related risk | RA-014, RA-017 |
| Related tests (baseline) | TEST-LEG-002 |
| Evidence | `RB-P1-005-Evidence.md` — TECHNICAL_EVIDENCE_AVAILABLE |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Surfaces inspected (not only the 4A scan list)

Composer and Release Catalog now qualify technical CERTIFIED / composition VALIDATED as **not GMP validation** and keep **NOT_VALIDATED**. Legal, Quality Gate, Marketplace detail, Data Product detail, landing footnote, and Platform Component copy inspected in source also separate technical CERTIFIED from GxP.

No `GMP VALIDATED`, `GxP COMPLIANT`, or `PART 11 COMPLIANT` claim was found on the scanned Core surfaces. Technical state names were not renamed.

#### Observations

- `claimControl.test.ts` is a **source-string** scan of six files. It does not render UI and omits landing, architecture, Developer Hub, and Platform Components.
- Landing uses the heading **“Secure & compliant”** with an immediate “not GxP, CSV, or regulatory validation” body. Adjacent CERTIFIED chips still need a UAT walk.
- Architecture card copy “Wave 1 … pieces are CERTIFIED” is not qualified in that sentence (nearby cards say “not GxP”).
- Composer shows CERTIFIED count and composition **VALIDATED** on the same summary. Qualifiers are present; a human UAT still needs to confirm the combination is not reasonably read as GMP validation.
- Frozen URS-LEG-002 Implementation remains **PARTIALLY_IMPLEMENTED**. That is more conservative than the evidence title and is appropriate until UAT.

Technical lifecycle names need not be renamed.

---

### RB-P1-006 — Unauthenticated API OQ

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-AUTH-001 / SYS-AUTH-001 / TDS-AUTH-001 |
| Related risk | RA-001 |
| Related tests (baseline) | TEST-AUTH-004, TEST-SEC-001, TEST-OQ-001 |
| Evidence | `RB-P1-006-Evidence.md` — FORMAL_VERIFICATION_REQUIRED |
| Review status | **FORMAL_VERIFICATION_PENDING** |

Classification is correct. Phase 3A route-level authorize tests are developer evidence only. They are not formal authentication OQ.

---

### RB-P1-007 — Official Create-path durable audit

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-AUD-001 / SYS-AUD-001 / TDS-AUD-001 |
| Related risk | RA-007 |
| Related tests (baseline) | TEST-AUD-001, TEST-AUD-002 |
| Evidence | `RB-P1-007-Evidence.md` — TECHNICAL_EVIDENCE_AVAILABLE |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Authoritative decision point (independent trace)

1. Backstage Permission Framework is enabled on intended overlays (`permission.enabled: true`).
2. `permissionModulePlatformPolicy` sets `PlatformPermissionPolicy` as the policy.
3. Scaffolder and custom routers that call `permissions.authorize` therefore hit `handle()`.
4. Marketplace / App UI do **not** call `authorizeCreate`. The entitlements client method exists and is unused by UI.
5. `POST /api/entitlements/authorize-create` remains a real API and still records `action: 'authorizeCreate'` if invoked. It is **not** the official Create gate.

**Confirmed:** `PlatformPermissionPolicy.handle()` is the production authorization decision for:

| Permission | Used for | Audited by policy? |
| --- | --- | --- |
| `scaffolder.task.create` | Scaffolder task launch (basic; typically no `resourceRef`) | Yes, if `auditStore` injected |
| `scaffolder.action.execute` | Scaffolder action execution | Yes, same gate |
| `data-product.create` | RBAC create; also release transition to `TESTING` | Yes, same gate |

GRANT and DENY for those names are appended after the existing allow/deny computation, with:

- actor (`userEntityRef` or `unauthenticated`)
- timestamp (`at` ISO, via `createEntitlementAuditEvent`)
- action = permission name
- decision GRANT / DENY
- context: reason, templateId, role, permission, rbacAllowed, entitled, releaseEligible (entitled/release only when the commercial template-permission AND ran)

Catalog reads are not recorded. That matches the test and the intended Create set.

#### `scaffolder.task.create` without `resourceRef`

Independently confirmed: entitlement and RELEASED/GA AND apply **only** to `scaffolder.template.parameter.read` / `step.read` (`isScaffolderTemplatePermission`). `scaffolder.task.create` is RBAC-only. The durable record therefore stores `reason: 'OK' | 'RBAC'` and usually no templateId/productId.

This is **consistent with the frozen baseline as written for URS-AUD-001** (record the decision that was actually produced, including layers *where produced*). It is also consistent with current Backstage permission shape and with DEC-LEGAL-001 (legal is not applied to every internal Create).

It is **not** a silent rewrite of URS-SCF-002 / URS-SCF-003. Those URS still require layered Create deny (RBAC, release, entitlement, applicable legal). Those layers are implemented on template-form permissions and on `authorizeCreate`, not on `task.create`. That layered-Create residual predates 4A (P2 / formal OQ). It is **not** a P1-007 implementation defect and is **not** a baseline change request.

Formal verification must confirm that the official interactive Create always hits template permissions before task create. Direct Scaffolder task API without a prior template-permission check is a residual authorization concern (see §8).

#### Alternate paths

- Unused UI `authorizeCreate` does not bypass policy.
- Release `TESTING` uses `data-product.create` and therefore **is** audited as a Create-authorization permission (broader than “Scaffolder Create”).
- If `commercial.createAuthorizationAuditPath` is omitted, `auditStore` is undefined and `handle()` still allows/denies **without** a durable record. Default path is present in `app-config.yaml` and `app-config.production.yaml`; docker CMD merges `app-config.yaml` first. Hosted IQ must prove the merged path and volume.

#### Error / write-failure / duplicates / sensitivity

| Check | Independent result |
| --- | --- |
| Audit write failure | `appendFileSync` is uncaught. A write error rejects `handle()` after the decision is computed. Fail-closed for that request is likely; not specified or tested |
| Missing store | Silent no-op; Create proceeds |
| Duplicates | One user Create can emit `task.create` plus many `action.execute` records. That is multiple decisions, not silent duplication. A parallel `/authorize-create` call would add a second *kind* of record |
| Secrets in context | Inspected fields have no token/secret. Registration token handling is out of this path |
| Dual runtime | Permission module and entitlements plugin each call `createEntitlementRuntime`. Shared configured file path makes admin `auditTrail()` able to read policy writes. Two in-memory stores if path omitted |

Phase 4A updated frozen TDS/SYS/traceability/URS *evidence and implementation fields* for AUD-001. **URS requirement text was not changed.** That document-control edit is an observation, not a URS meaning change.

Evidence does not claim formal restart. Frozen TEST-AUD-001 still describes `authorizeCreate` → `auditTrail()` only; that test-spec sentence is stale relative to the official path (traceability observation).

---

### RB-P1-008 — Torn / malformed JSONL

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-AUD-001 / SYS-AUD-001 / TDS-AUD-001 |
| Related risk | RA-007 |
| Evidence | `RB-P1-008-Evidence.md` — TECHNICAL_EVIDENCE_AVAILABLE |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

Chosen behavior (inspected, not Part 11):

1. `list()` does not rewrite or truncate the file.
2. Valid prior JSON objects with required string fields (`type`, `at`, `actor`, `organizationId`) remain readable.
3. `JSON.parse` failure → `MALFORMED_JSON`; line skipped.
4. Parsed JSON lacking required shape, or with `decision` not GRANT/DENY → `MALFORMED_RECORD`; not returned as an event; bytes unchanged.
5. Empty lines ignored.
6. Admin GET `/admin/entitlements` calls `auditTrail()` (which calls `list()`) then returns `auditIssues`.

This is **adequate for the current non-Part-11 baseline** (URS-AUD-001 durability + administrator review of produced records). It is not an ALCOA+ / Part 11 control. Concurrent multi-writer interleaving and volume wipe remain unaddressed (same as P0 observations).

`issues()` reports only the last `list()` pass. `type` is not restricted to the entitlement event enum; a complete but invented object can be returned as an event. That is not silent conversion of torn bytes; it is a schema-looseness observation.

---

## 3. Implementation findings

No **REVIEW_FINDING** (no material unimplemented-as-written P1 gap that reopens remediation before verification preparation).

Implementation observations that must not be forgotten in IQ/OQ design:

1. Official Create audit is the permission-policy decision, not `/authorize-create`.
2. `task.create` records are RBAC-only unless a future change ANDs entitlement on that permission (do not treat 4A as having done that).
3. Legal Gate is still only on `authorizeCreate` + `handoff=customer`.
4. Dual entitlement runtimes; durability depends on the shared configured path.
5. Audit append failure behavior is undefined in tests.
6. `data-product.create` audit includes release `TESTING` transitions.

---

## 4. Test-quality findings

Do not change tests. These are review comments only.

| Area | Assessment |
| --- | --- |
| Policy Create audit test | Real `FileCreateAuthorizationAuditStore`; Viewer DENY + Developer GRANT; catalog read excluded; timestamp shape checked. **Missing:** `scaffolder.action.execute`, `data-product.create`, unauthenticated actor, missing `auditStore`, append failure |
| Policy source-contains `auditStore` | Implementation-detail assertion; low assurance |
| JSONL tests | Torn last line + schema-invalid JSON + bytes preserved. Adequate for the P0 finding. **Missing:** admin GET `auditIssues`, mid-file torn line, `issues()` without prior `list()` |
| Register cookie test | Useful negative path, but only NOT_CONFIGURED. ENTITLED/PENDING_ACCESS HTTP not covered |
| Sample catalog | File absence only. Correctly not hosted IQ |
| Claim control | Source regex; narrow file list; whitespace-tolerant after 4A fix. Not UAT |
| Over-mocking | Policy audit test is not over-mocked. Entitlements router uses mocked identity (acceptable for unit HTTP) |
| Accidental weakening | No inversion of a previously failing production assertion was identified for these P1 suites |
| Formal vs developer | Phase 4A evidence labels FORMAL_VERIFICATION_REQUIRED where required. Frozen TEST-AUD-001 wording still points at `authorizeCreate` |

Developer tests must not be filed as TEST-OQ / TEST-UAT / TEST-IQ execution evidence.

---

## 5. Traceability findings

| ID | Backlog → URS → SYS → TDS → Code → Test → Evidence | Flag |
| --- | --- | --- |
| RB-P1-001 | Present; evidence FORMAL_VERIFICATION_REQUIRED | None |
| RB-P1-002 | Present; URS Implementation still NOT_VERIFIED | Field lag, not overclaim of VALIDATED |
| RB-P1-003 | Present; config test ≠ IQ | Evidence states the distinction |
| RB-P1-004 | Present; OPEN-LEG-001 PENDING | Correct |
| RB-P1-005 | Present; URS still PARTIALLY_IMPLEMENTED | Conservative; good |
| RB-P1-006 | Present; formal only | None |
| RB-P1-007 | Present after 4A TDS/SYS update; TEST-AUD-001 still names `authorizeCreate` | **Stale test-spec objective** vs official path. Not an evidence overclaim of formal restart |
| RB-P1-008 | Present in TDS-AUD-001 how-it-satisfies | None |

Phase 4A changed frozen URS-AUD-001 **Implementation** to IMPLEMENTED and updated Evidence reference. Requirement text is unchanged. `BASELINE.yaml` counts (`partially_implemented: 10`) were not refreshed. That is document-control drift, not a requirement rewrite.

No evidence file uses VALIDATED or QUALIFIED.

---

## 6. Formal verification requirements

Still required (not executed here; not converted from developer tests):

- Interactive authorized Developer OAuth Create (RB-P1-001 / TEST-SCF-001 / TEST-UAT-001)
- Unauthenticated / authentication OQ matrix (RB-P1-006)
- Application-process restart + administrator GET retrieval of policy Create records (TEST-AUD-002)
- Hosted catalog query after docker/production boot (TEST-CAT-002 / TEST-IQ-001)
- Claim-control UAT walk of rendered Core surfaces (TEST-LEG-002)
- Live Viewer session, live AWS Marketplace, live GitHub Actions Read-only, compiled frontend bundle scan
- IQ of merged `createAuthorizationAuditPath` and durable volume
- Confirmation that official Scaffolder Create always evaluates template permissions before `task.create`

---

## 7. Human decisions

| Item | Status | Owner |
| --- | --- | --- |
| OPEN-LEG-001 / RB-P1-004 | **HUMAN_DECISION_REQUIRED** / PENDING | Counsel / product owner |
| Residual legal-scope risk if Scaffolder Create is later classified as customer handoff | Not accepted by this review | Same |

The operation list was not invented.

---

## 8. Residual risks

| Residual | Classification |
| --- | --- |
| Interactive Create unproven | **FORMAL_VERIFICATION_REQUIRED** |
| Unauthenticated API matrix unproven | **FORMAL_VERIFICATION_REQUIRED** |
| Process restart + admin GET of policy audit | **FORMAL_VERIFICATION_REQUIRED** |
| Hosted catalog sample absence at runtime | **FORMAL_VERIFICATION_REQUIRED** |
| Claim-control UAT / “compliant” + CERTIFIED combinations | **FORMAL_VERIFICATION_REQUIRED** |
| OPEN-LEG-001 operation list | **HUMAN_DECISION_REQUIRED** |
| `task.create` RBAC-only / possible direct task API without template AND | **FORMAL_VERIFICATION_REQUIRED** (confirm official path); **FUTURE_IMPROVEMENT** (AND entitlement on execution permission) if humans want defense-in-depth |
| Dual entitlement runtimes | **FUTURE_IMPROVEMENT** |
| Audit write-failure / missing-path silent skip | **FUTURE_IMPROVEMENT** (hosted IQ should still prove path present) |
| JSONL schema accepts any object with required strings | **FUTURE_IMPROVEMENT** (not Part 11) |
| Multi-instance append interleaving / volume wipe | **FORMAL_VERIFICATION_REQUIRED** (IQ/ops) / **FUTURE_IMPROVEMENT** (scale) |
| JSONL vs PostgreSQL for Create audit | Not a URS conflict (same as P0) |
| Stale TEST-AUD-001 / BASELINE.yaml counts | **FUTURE_IMPROVEMENT** (controlled document hygiene) |

No residual is classified **REMEDIATION_REQUIRED** or **BASELINE_CHANGE_REQUIRED**.

This review does not accept residual risks on behalf of humans.

---

## 9. Baseline change requests

**None.**

URS meanings were not found unimplemented-as-written in a way that requires rewriting a requirement. OPEN-LEG-001 remains an open *policy detail*, not a URS text defect.

---

## 10. Code-freeze readiness

| Question | Answer |
| --- | --- |
| Unresolved P1 *implementation* blocker? | **No** |
| Ready to *prepare* formal IQ/OQ/UAT protocols? | **Yes** |
| Ready to freeze the validation package / declare a validation release? | **No** — formal verification not executed; OPEN-LEG-001 open; status NOT_VALIDATED |
| Ready to claim GMP / GxP / Part 11? | **No** |

Implementation code-freeze of the P1 remediable items is a project decision, not a validation decision. OPEN-LEG-001 does not require further Legal Gate *code* before verification preparation; it does require a human list before Legal Gate OQ and before final Core release.

---

P1 READY FOR VERIFICATION PREPARATION: YES
