# Phase 3B — Independent P0 Remediation Review

| Field | Value |
| --- | --- |
| Document | VAL-REV-PC-P0-3B |
| Baseline | Platform Core Validation Baseline v1.0 (`PDF-PC-VAL-BL-1.0`) |
| Review type | Independent technical review (CSV / security / architecture) |
| Reviewer | Independent AI reviewer (not the Phase 3A implementer). No named human sign-off. |
| Date | 2026-08-22 |
| Product/test/evidence changes | None. Review only. |
| Formal IQ / OQ / UAT | Not executed |
| Part 11 | NOT_CLAIMED |
| Validation status | **NOT_VALIDATED** |

This review is **not** a validation approval, qualification, or formal verification.

Review statuses used below are technical readiness judgements only:

| Status | Meaning |
| --- | --- |
| REVIEW_ACCEPTED | Remediation aligns with the baselined requirement; remaining work is formal verification only |
| REVIEW_ACCEPTED_WITH_OBSERVATIONS | Requirement is met at developer-technical level; observations do not reopen P0 |
| REVIEW_FINDING | Material gap versus the baselined requirement or versus claimed evidence |
| REVIEW_BLOCKED | Cannot complete the review (missing inputs or OPEN-LEG-001 dependency) |

---

## Executive Summary

Seven P0 backlog items (RB-P0-001 … RB-P0-007) were reviewed against the frozen baseline, the Phase 3A evidence files, and the current production/test code.

| Bucket | Count | IDs |
| --- | --- | --- |
| P0 reviewed | 7 | RB-P0-001 … RB-P0-007 |
| REVIEW_ACCEPTED | 0 | — |
| REVIEW_ACCEPTED_WITH_OBSERVATIONS | 6 | RB-P0-002, RB-P0-003, RB-P0-004, RB-P0-005, RB-P0-006, RB-P0-007 |
| REVIEW_FINDING | 1 | RB-P0-001 |
| REVIEW_BLOCKED | 0 | — |

**P0 READY FOR NEXT PHASE: YES**

That answer means only: this review found no unresolved P0 remediation blocker that must be re-worked before P1 analysis and later formal verification can start. It does **not** mean validated, qualified, IQ passed, OQ passed, or UAT passed.

### Formal verification items (not done here)

- Live Viewer/Developer/Admin sessions against the running Control Plane (TEST-RBAC-003, TEST-SEC-002, TEST-OQ-001).
- Hosted IQ of merged `permission.enabled`, secret injection, and audit-file path on the production image (TEST-CFG-001, TEST-IQ-001, TEST-IQ-002).
- Compiled frontend bundle scan (TEST-GH-002).
- Live GitHub Actions Read-only Quality Gate (TEST-GH-003 / TEST-OQ-002).
- Live AWS Marketplace fail-closed (TEST-ENT-004 system run).
- Application-process restart with administrator retrieval via admin API (formal TEST-AUD-002).
- Controlled TDS/traceability update so frozen TDS-AUD-001 no longer describes the pre-remediation in-memory design.

### P1 follow-ups

- **P1_REMEDIATION_REQUIRED:** Durable audit is not produced on the official Scaffolder Create authorization path. `authorizeCreate` is not called from `PlatformPermissionPolicy` or from Marketplace/App UI. Records exist only if something posts `/api/entitlements/authorize-create`.
- **P1_REMEDIATION_REQUIRED:** `FileCreateAuthorizationAuditStore.list()` throws on a malformed/partial JSONL line, which can make *all* administrator retrieval fail after a torn write.
- Permission-policy runtime and entitlements-plugin runtime are separate `createEntitlementRuntime` instances (shared file path if configured; Create decisions still not recorded on the policy instance).
- COMPILED_BUNDLE_SCAN remains open as TEST-GH-002 (see RB-P0-004: not a P0 closure blocker).

### Baseline change requests

None. No URS meaning is unimplemented-as-written in a way that requires rewriting the requirement. JSONL is accepted for the non-Part-11 durability wording. PostgreSQL is not required by URS-AUD-001.

`OPEN-LEG-001` was not required by any P0 and was not invented.

---

## Per-P0 Review

### RB-P0-001 — Durable Create-authorization audit

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-AUD-001 / SYS-AUD-001 / TDS-AUD-001 |
| Related risk | RA-007 |
| Related tests (baseline) | TEST-AUD-001, TEST-AUD-002 |
| Review status | **REVIEW_FINDING** |

#### Implementation reviewed

- `packages/platform-common/src/create-authorization-audit-store.ts`
- `packages/platform-common/src/entitlement-service.ts` (`recordCreateAuthorization`, `auditTrail`, optional `FileCreateAuthorizationAuditStore`)
- `plugins/entitlements-backend/src/runtime.ts` (`createAuthorizationAuditPath`)
- `app-config.yaml`, `app-config.production.yaml`, `app-config.marketplace-test.yaml`
- `packages/backend/src/permission/module.ts` and `policy.ts` (actual Create gate)
- `plugins/marketplace/src/entitlementApi.ts` and Marketplace pages

Checklist versus the Phase 3B brief:

| Check | Independent result |
| --- | --- |
| Persistence survives process restart | Met for the *instrumented* path: JSONL append + new service instance reads the same file |
| Actor recorded | Met (`actor`) |
| Timestamp recorded | Met (`at` ISO string) |
| Action recorded | Met (`action: 'authorizeCreate'`) |
| GRANT / DENY recorded | Met (`decision`) |
| Authorization context recorded | Met (reason, templateId, role, handoff, rbac/entitled/release/legal layers) |
| Append-oriented | Met (`appendFileSync` + newline) |
| Concurrent writes considered | Not addressed (no lock / no multi-writer protocol) |
| Malformed / partial records handled safely | **Not met.** `JSON.parse(line)` is unguarded; one torn line fails the entire `list()` |
| Write failure behavior defined | Not specified. `appendFileSync` throws and aborts `authorizeCreate` if that path is used |
| Storage path configuration-controlled | Met when `commercial.createAuthorizationAuditPath` is present; omitted path ⇒ in-memory only |
| Secrets not written into audit context | Met on inspected fields (no token/secret fields). Registration token still not persisted (existing test) |
| JSONL sufficient for non-Part-11 baseline | **Yes**, as a durable store that survives application/service restart. Lifecycle risks are observations, not a PostgreSQL mandate |

#### Tests reviewed

- `entitlement-service.test.ts` — restart simulation for a Viewer **DENY** only. Asserts actor, `at`, action, decision, RBAC context. Demonstrates the URS field set for that path.
- No GRANT restart test (same write path; weaker coverage, not contradictory).
- No malformed-line, disk-full, or concurrent-writer test.
- No test that Scaffolder or `PlatformPermissionPolicy.handle` writes a durable record.

The developer test is a valid **TEST-AUD-002 candidate** for the entitlement-service function. It is not a Control Plane process restart and not an administrator GET `/admin/entitlements` retrieval.

#### Evidence reviewed

`validation/evidence/remediation/RB-P0-001-Evidence.md` — status `TECHNICAL_EVIDENCE_AVAILABLE`.

Evidence overclaim: it presents URS-AUD-001 as remediated without stating that the official Create authorization decision (Scaffolder + permission policy) does not call `authorizeCreate`. Frozen **TDS-AUD-001** still describes in-memory-only design; that is documentation lag, not a silent URS rewrite.

#### Independent findings

1. **Finding — Create path not instrumented.** `authorizeCreate(` has no callers in `packages/app` or Marketplace UI. `PlatformPermissionPolicy` uses `hasEntitlement` only and does not record GRANT/DENY. Marketplace `authorizeCreate` client exists but is unused. A successful or denied Scaffolder Create therefore need not leave a durable URS-AUD-001 record. This is the validation-relevant Create action (URS-SCF-001 / SYS-AUD-001).
2. **Finding — retrieval not crash-safe.** A partial last JSONL line makes `auditTrail()` throw; administrator review of *good* prior records can fail.
3. Dual `createEntitlementRuntime` (permission module vs entitlements plugin) means two services; only the plugin instance is used for `/authorize-create`.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Official Create history still empty after restart | **P1_REMEDIATION_REQUIRED** |
| Torn JSONL line blinds admin GET | **P1_REMEDIATION_REQUIRED** |
| File volume wipe / default `.runtime/` not on a durable volume | **FORMAL_VERIFICATION_REQUIRED** (hosted IQ) |
| Multi-instance concurrent append interleaving | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (single-process Control Plane assumed; observe for later scale) |
| JSONL vs PostgreSQL | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (URS does not require PostgreSQL for this record type) |
| Stale TDS-AUD-001 / traceability matrix “in-memory only” | **FORMAL_VERIFICATION_REQUIRED** (controlled document update, not requirement change) |

#### Rationale

The store and field set are a correct *design* for the entitlement `authorizeCreate` function and JSONL is adequate for the non-Part-11 URS. The remediator did not connect that function to the authorization decision that actually gates Create. Until that wiring exists, RA-007 is only partially reduced. That is a finding, classified for P1, not a baseline rewrite.

---

### RB-P0-002 — Backend authorize on custom routes

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-RBAC-003 / SYS-RBAC-003 / TDS-RBAC-003 |
| Related risk | RA-003 |
| Related tests (baseline) | TEST-RBAC-003, TEST-SEC-002 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

In-scope custom routers:

| Prefix | Mutation / read | Authorize | Permission | Notes |
| --- | --- | --- | --- | --- |
| nexora industrial GETs except `/health` | read | yes | `data-product.view` | Fail-closed if `httpAuth`/`permissions` omitted |
| nexora `/health` | read | no | — | Unauthenticated by policy; acceptable |
| data-products GET `/ci-status` (with entityRef) | read | yes | `data-product.view` | Fail-closed if permissions missing |
| data-products GET `/ci-status` (empty entityRef) | read | **no** | — | Returns public UNKNOWN / DEGRADED; no catalog fetch |
| data-products GET `/releases` | read | yes | `data-product.view` | |
| data-products POST `/certification` | mutation | yes | `data-product.certification.manage` | |
| data-products POST `/releases/transition` | mutation | yes | create / certification.manage / release.manage by target | |
| entitlements reads | read | yes | `entitlement.view` | |
| entitlements admin / integration / links | admin | yes | `entitlement.admin` (+ role check on approve/disable) | |
| entitlements POST `/authorize-create` | decision API | yes | `entitlement.view` then service RBAC | Viewer can *invoke*; service returns 403 RBAC |
| entitlements POST `/marketplace/register` | unauthenticated | n/a | — | By design; no tenant (out of this P0 except as non-Create) |

AAS custom routes authorize `aas.read` / `aas.manage`. AAS is **out of Platform Core scope** (DEC-SCOPE-001). Observed only to confirm they are not an unnoticed Core hole.

No default-allow on the remediated prefixes when permissions are injected. Nexora `RouterOptions` marks auth optional; the plugin injects both services. Tests that omit them receive 403 (fail-closed).

Wrong-permission check: industrial and CI reads use view, not manage. Certification and release transitions use mutation permissions. No read/write confusion found on those routes.

#### Tests reviewed

- Nexora deny-without-view: demonstrates route authorize, **mocked** `AuthorizeResult.DENY`.
- POST `/certification` 403 on mocked DENY: proves the route honors DENY, not that a Viewer identity is evaluated.
- Policy unit tests: Viewer DENY for `data-product.create`, `data-product.certification.manage`, `entitlement.admin`, scaffolder create — **requirement-aligned** for the policy module.
- Entitlements router: Viewer userInfo ⇒ `/authorize-create` 403 `RBAC`; admin GET 403 on mocked deny.
- `releaseRouter.test` was updated to *supply* ALLOW for GET `/releases`. That is a fixture correction after a new deny, not inversion of a security assert. Developer-deny on POST transition remains.

Missing versus TEST-RBAC-003 / TEST-SEC-002: authenticated **Viewer session** against a live process. Mocked `permissions.authorize` is not UAT.

#### Evidence reviewed

`RB-P0-002-Evidence.md` correctly lists the mocked limitation. Citing TEST-RBAC-003 as developer-executed is slightly generous: the baseline method is “Authenticated API as viewer user.” Composition of policy unit + route mock is technical evidence, not that protocol.

#### Independent findings

None that reopen P0. Observations only.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Live Viewer mutation abuse not executed | **FORMAL_VERIFICATION_REQUIRED** |
| Unauthenticated GET `/ci-status` without entityRef | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (no product data) |
| `/authorize-create` gated by view, not create | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (service still denies Viewer) |
| GET `/ci-status` credentials not restricted to `user` | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (still authorize view) |
| AAS in the same process | Out of Core; not expanded here |

#### Rationale

Backend authorize is present on in-scope custom prefixes that carry product or admin data. Viewer mutation denial is technically evidenced at policy + route layers. Formal TEST-SEC-002 remains open.

---

### RB-P0-003 — AWS production fail-closed

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-ENT-004 / SYS-ENT-004 / TDS-ENT-004 |
| Related risk | RA-005 (and RA-013 as listed in the matrix) |
| Related tests (baseline) | TEST-ENT-004 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

- `failClosed: provider === 'aws'`
- Mixed `environment: local` + `entitlementProvider: aws` ⇒ `FailClosedEntitlementProvider` (empty grants)
- Unconfigured AWS ⇒ fail-closed empty grants
- `AwsMarketplaceEntitlementProvider.getEntitlements` catch returns `[]`; comment states no INTERNAL fallback
- Runtime constructs either AWS provider or fail-closed provider — local provider is not wrapped underneath AWS

Lookup failure cannot GRANT: `hasEntitlement` is false; `authorizeCreate` reason `ENTITLEMENT`. Exceptions convert to empty entitlements, not INTERNAL defaults. Timeout classified and still returns `[]`.

#### Tests reviewed

Existing fail-closed / MIXED / credentials-missing cases plus `does not grant INTERNAL or local default entitlements when AWS lookup fails` (local product IDs in config + throwing client + `authorizeCreate` denied). Negative-path coverage for the fixture is adequate for TEST-ENT-004 *unit* intent.

No live Marketplace account. That is formal verification, as required by this brief.

#### Evidence reviewed

`RB-P0-003-Evidence.md` accurately states fixture-only limits and that production code was already fail-closed.

#### Independent findings

None. Implementation matches URS-ENT-004.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Live AWS Marketplace proof outstanding | **FORMAL_VERIFICATION_REQUIRED** |
| Future code path that wraps local under AWS | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (not present now) |

#### Rationale

Fail-closed is implemented and unit-verified. Live AWS is not a P0 remediator gap.

---

### RB-P0-004 — Secrets not in artifacts / logs / UI

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-GH-002 / SYS-GH-002 / TDS-GH-002 |
| Related risk | RA-009 |
| Related tests (baseline) | TEST-GH-002 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation / scan reviewed

**SOURCE_SCAN (present):**

- Committed `app-config*` secret assignments must be `${VAR}` / `${VAR:-…}`.
- `clientId` is not treated as a secret (correct per URS-GH-002 MODIFY).
- `@visibility frontend` is not applied to `clientSecret` / `privateKey` / password / secret / token keys on the following line.
- Frontend `packages/app/src` and `plugins/data-products/src` scanned for PEM and `ghp_` / `ghs_` / `github_pat_` literals (not for the *names* of env vars used in redaction tests).
- Landing/login identity tests still assert UI modules do not embed client secrets / private key env names.
- Registration logger redacts marketplace tokens; public CI payload strips `token` / headers.
- `app-config.github.yaml` uses placeholders only.

**COMPILED_BUNDLE_SCAN (absent):**

- TEST-GH-002 objective is explicitly “Built frontend assets do not contain GITHUB_PRIVATE_KEY or client secrets.”
- No webpack/dist inspection was performed in Phase 3A.

Classification of missing bundle scan, based on the baselined requirement:

| Option | Decision |
| --- | --- |
| P0 closure blocker | **No.** Secrets are not in committed source or frontend-visible config keys; a bundle cannot invent `GITHUB_PRIVATE_KEY` / client secrets from those inputs. |
| P1 verification item | Optional engineering confirmation if a bundler later inlines env at build time. |
| Formal OQ evidence item | **Yes — this is TEST-GH-002.** Required before claiming URS-GH-002 verified. |

#### Tests reviewed

`committedConfigIntegrity.test.ts` demonstrates URS-DATA-002 / visibility more than TEST-GH-002’s built-asset objective. Identity and hostingProduction tests are complementary SOURCE_SCAN / CI-YAML scans. Entitlements registration test is a real negative log assert.

Weakness: visibility regex is adjacent-line only; a blank line between `@visibility frontend` and `clientSecret` would evade it. Secret key-name list is finite.

#### Evidence reviewed

`RB-P0-004-Evidence.md` discloses the missing bundle scan. Status `TECHNICAL_EVIDENCE_AVAILABLE` is acceptable for SOURCE_SCAN; it must not be read as TEST-GH-002 complete.

#### Independent findings

None that reopen P0.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Compiled bundle not scanned | **FORMAL_VERIFICATION_REQUIRED** (TEST-GH-002) |
| Scanner key-name / adjacency gaps | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** |
| Live process log volume not reviewed | **FORMAL_VERIFICATION_REQUIRED** |

#### Rationale

Public client IDs are correctly allowed. Secrets/tokens/keys are prohibited in the inspected source and config. Bundle scan is outstanding formal evidence, not a P0 remediator blocker.

---

### RB-P0-005 — CI UNKNOWN as DEGRADED / UNVERIFIED

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-GH-003 + DEC-CI-001 / SYS-GH-003 / TDS-GH-003 |
| Related risk | RA-012 |
| Related tests (baseline) | TEST-GH-003, TEST-OQ-002 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

- Machine enum still includes `UNKNOWN` (not rewritten to drop the code).
- `ciStatusRepresentation('UNKNOWN') === 'DEGRADED / UNVERIFIED'`.
- `publicCiStatus` *computes* representation from normalized status; a spoofed `representation: 'PASSED'` on UNKNOWN is ignored.
- Invalid status values normalize to UNKNOWN + DEGRADED / UNVERIFIED.
- `mapGithubRunToPlatformStatus`: unknown/null conclusion ⇒ UNKNOWN, never PASSED.
- UI: `CiStatusChip` label uses representation; UNKNOWN style is grey (`#9e9e9e`), not the PASSED green (`#2e7d32`).
- `CiQualityGateCard` passes `status.status` into the chip (representation derived in the chip). Disclaimer remains “not GxP”.
- Home “CI Quality Gate” is a link only; it does not render a CI enum.
- List/marketplace pages are asserted not to host the Quality Gate card.

No inspected path treats UNKNOWN as PASS, green success, or GxP validated.

#### Tests reviewed

Requirement-aligned: public payload representation; Quality Gate / chip text; “never PASSED” on UNKNOWN view. `resolveCiStatus` tests still assert machine `UNKNOWN` (correct; they are pre-`publicCiStatus`).

Live readable Actions conclusion is not tested (TEST-GH-003 live clause).

#### Evidence reviewed

`RB-P0-005-Evidence.md` correctly residualizes App Actions Read-only as operational.

#### Independent findings

None.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Live unread repos remain machine UNKNOWN | **FORMAL_VERIFICATION_REQUIRED** / operational grant — representation is already DEGRADED / UNVERIFIED |
| Duplicate frontend/backend representation helpers could drift | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** |

#### Rationale

DEC-CI-001 is implemented in API and Quality Gate UI. UNKNOWN ≠ PASS. Formal live OQ remains open.

---

### RB-P0-006 — Secrets not hard-coded in committed config

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-DATA-002 / SYS-DATA-002 / TDS-DATA-002 |
| Related risk | RA-010 |
| Related tests (baseline) | TEST-DATA-002, TEST-IQ-002 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

Inspected committed overlays use `${AUTH_GITHUB_CLIENT_SECRET}`, `${GITHUB_PRIVATE_KEY}`, `${POSTGRES_PASSWORD}`, `${BACKEND_SECRET}`, `${GITHUB_TOKEN}` (and equivalents). No PEM or `ghp_` literals in those files. This complements RB-P0-004 SOURCE_SCAN.

URS-DATA-002 is config-integrity (env/uncommitted), not the full GH-002 artifact/UI clause.

#### Tests reviewed

`committedConfigIntegrity` walks the six committed app-config files. `hostingProduction.test.ts` covers workflow / `.env.example` / dockerignore. That matches TEST-DATA-002’s objective more closely than a full-repository secret crawl (docs, templates, examples remain out of that test).

#### Evidence reviewed

`RB-P0-006-Evidence.md` states the scan is not a full-tree IQ. Appropriate.

#### Independent findings

None.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Full-tree / hosted env IQ not executed | **FORMAL_VERIFICATION_REQUIRED** |
| New secret key names evade the list | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** |

#### Rationale

Committed Core overlays meet URS-DATA-002 as written. Formal IQ is still NOT_EXECUTED.

---

### RB-P0-007 — Permission Framework enabled on RBAC overlays

| Field | Content |
| --- | --- |
| Related URS / SYS / TDS | URS-CFG-002 / SYS-CFG-002 / TDS-CFG-002 |
| Related risk | RA-010 |
| Related tests (baseline) | TEST-CFG-001, TEST-IQ-001 |
| Review status | **REVIEW_ACCEPTED_WITH_OBSERVATIONS** |

#### Implementation reviewed

| Overlay | `permission.enabled: true` | Role |
| --- | --- | --- |
| `app-config.yaml` | yes (pre-existing) | local / base |
| `app-config.docker.yaml` | yes (added) | Docker `yarn start` overlay |
| `app-config.production.yaml` | yes (added) | Hosted image (with base + github) |
| `app-config.marketplace-test.yaml` | yes (added) | Explicit AWS test overlay |
| `app-config.github.yaml` | omitted | App credentials only; not a standalone RBAC deploy |
| `app-config.local.yaml` | omitted | Title-only; auto-merged with base |

Production image CMD: `app-config.yaml` + `app-config.production.yaml` + `app-config.github.yaml`. Docker root image: `app-config.yaml` + `app-config.docker.yaml`. In both intended RBAC launches the flag is explicit on an overlay that is loaded.

No overlay sets `permission.enabled: false`.

Gap: no runtime assertion of the *merged* Backstage config object. File presence is not IQ of the running process. A hypothetical future overlay that replaced the `permission` object without `enabled` could disable the framework if loaded last; current files do not do that.

#### Tests reviewed

Asserts the four RBAC deployment files contain `permission:` and `enabled: true`, and none set `false`. Does not load `app-config.github.yaml` / `.local.yaml` as standalone RBAC deploys (correct). The `enabled: true` regex could theoretically match an unrelated key; current files do not make that fail the intent.

#### Evidence reviewed

`RB-P0-007-Evidence.md` is consistent with file review. It does not overclaim IQ.

#### Independent findings

None.

#### Residual risks

| Risk | Classification |
| --- | --- |
| Merged runtime config not witnessed | **FORMAL_VERIFICATION_REQUIRED** |
| github / local overlays omit the key | **ACCEPTABLE_FOR_CURRENT_BASELINE_REVIEW** (not standalone RBAC configs) |

#### Rationale

Intended RBAC deployments now state `permission.enabled: true` explicitly. URS-CFG-002 is met at configuration-file level.

---

## Traceability review

| P0 | Chain | Flag |
| --- | --- | --- |
| RB-P0-001 | URS-AUD-001 → SYS-AUD-001 → TDS-AUD-001 → entitlement-service + JSONL → entitlement-service.test → evidence | **Broken alignment:** TDS-AUD-001 and the traceability matrix still say in-memory only. **Inadequate coverage of official Create.** Evidence claims more than Scaffolder Create proves. |
| RB-P0-002 | URS-RBAC-003 → SYS/TDS-RBAC-003 → routers → mocked + policy tests → evidence | IDs match. TEST-RBAC-003 / TEST-SEC-002 methods not fully met (no live Viewer). |
| RB-P0-003 | URS-ENT-004 → SYS/TDS-ENT-004 → awsMarketplace / runtime → awsMarketplace.test → evidence | IDs match. TEST-ENT-004 unit intent met; system run not met. |
| RB-P0-004 | URS-GH-002 → SYS/TDS-GH-002 → config + redaction → SOURCE_SCAN tests → evidence | IDs match. TEST-GH-002 (built assets) still unmatched. |
| RB-P0-005 | URS-GH-003 → SYS/TDS-GH-003 → types/UI → map/chip tests → evidence | IDs match. TEST-OQ-002 / live TEST-GH-003 unmatched. |
| RB-P0-006 | URS-DATA-002 → SYS/TDS-DATA-002 → YAML → committedConfigIntegrity → evidence | IDs match. Formal TEST-IQ-002 unmatched. |
| RB-P0-007 | URS-CFG-002 → SYS/TDS-CFG-002 → overlays → committedConfigIntegrity → evidence | IDs match. Formal TEST-IQ-001 unmatched. |

No mismatched backlog IDs. Frozen baseline Implementation fields were correctly left unchanged (still PARTIALLY_IMPLEMENTED / NOT_VERIFIED / NOT_EXECUTED).

---

## Test-adequacy summary (do not change tests)

| Pattern | Where observed |
| --- | --- |
| Demonstrates requirement (not just internals) | Fail-closed authorizeCreate; CI representation; permission overlay flags; secret placeholders |
| Over-mocking | Route 403 tests inject `AuthorizeResult` instead of a Viewer session |
| Fixture updated to match new deny | GET `/releases` ALLOW mock — justified, not a weakened security assert |
| Happy-path-only | Durable audit GRANT restart; live AWS; live CI |
| Missing negative | JSONL parse failure; Scaffolder-without-authorizeCreate produces no audit |
| Evidence citing formal TEST-* IDs | Developer runs only; baseline Result remains **NOT EXECUTED** |

---

## Final decision

```
P0 READY FOR NEXT PHASE: YES
```

Meaning: no unresolved P0 remediation blocker prevents starting P1 and planning formal verification. The single REVIEW_FINDING (RB-P0-001 Create-path coverage and JSONL parse robustness) is classified **P1_REMEDIATION_REQUIRED**.

```
Overall validation status: NOT_VALIDATED
```

Not validated. Not qualified. Not formally verified. Part 11 not claimed.

STOP. P1 not started. Formal IQ/OQ/UAT not executed. Validation Expert plugin not created.
