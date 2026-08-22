# Open Gaps — Platform Core Validation Baseline

**Document ID:** VAL-GAP-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

This artifact was generated as a PROPOSED validation baseline from repository evidence. Human review and approval are required before it can become part of an approved validation baseline.

Gaps are classified. Pilot findings are **not** silently converted into URS.

Class values:

| Class | Meaning |
| --- | --- |
| validation scope issue | In or out of Platform Core boundary |
| requirement gap | Intended capability has no URS, or URS is inferred |
| design gap | SYS/TDS missing or IMPLEMENTATION_NOT_VERIFIED |
| test gap | No suitable proposed or automated test |
| evidence gap | Requirement/design exist; execution not established |
| compliance gap | Regulatory/CSV package item; not a product URS in this baseline |

---

## 1. Pilot findings (explicit)

### GAP-P-001 — `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`

| Field | Content |
| --- | --- |
| Source | `data-product-platform/docs/pilot-exit-gate.md` |
| Class | **evidence gap** (primary). Secondary: test gap for UAT/OQ |
| Converted to URS? | **No.** URS-SCF-001 / URS-AUTH-001 already state intended Create/sign-in. The finding is that those URS lack execution evidence. |
| Related | TEST-AUTH-005, TEST-SCF-001, TEST-UAT-001, RA-016 |
| Human decision | Whether Pilot Exit must complete before any later OQ sign-off |

### GAP-P-002 — `OEE_GITHUB_LIVE_PROOF_NOT_RUN`

| Field | Content |
| --- | --- |
| Source | `pilot-exit-gate.md`; `ROADMAP.md` MVP 1.1 |
| Class | **validation scope issue** (out of Platform Core). Also **evidence gap** for a future Golden Path / OEE package |
| Converted to URS? | **No.** OEE template publish is excluded from Core URS. |
| Related | RA-016 (honesty only) |
| Human decision | Keep excluded vs open a separate Golden Path validation package |

### GAP-P-003 — Quality Gate UNKNOWN (Actions Read-only missing)

| Field | Content |
| --- | --- |
| Source | `pilot-exit-gate.md`; `githubActions.ts` |
| Class | **evidence gap** + operational/configuration gap. Not a missing URS (URS-GH-003 already requires resolve/display, including documented UNKNOWN) |
| Converted to URS? | **No.** Do not add “App must have Actions Read-only” as a silent user requirement; it is a **control** for RA-012 |
| Related | TEST-GH-003, TEST-OQ-002, RA-012 |
| Human decision | Grant App permission vs accept UNKNOWN in the portal |

### GAP-P-004 — In-memory entitlement audit trail

| Field | Content |
| --- | --- |
| Source | `entitlement-service.ts` `events[]`; Phase 1 `validation-gap-analysis.md` |
| Class | **design gap** relative to durable audit. **requirement gap** only if humans upgrade URS-AUD-001. Currently URS-AUD-001 is NEEDS_REVIEW and does **not** require durability |
| Converted to URS? | **Yes as durability on URS-AUD-001** (BASELINED). Part 11 still **not** added (DEC-P11-001). Implementation remains PARTIALLY_IMPLEMENTED. |
| Related | RA-007, TEST-AUD-002, URS-AUD-001 |
| Human decision | Accept in-memory recording as the intended MVP behavior, or later specify durable audit as a **new** approved URS |

### GAP-P-005 — In-memory AAS audit trail

| Field | Content |
| --- | --- |
| Source | `packages/backend/src/aas/repository.ts` |
| Class | **validation scope issue** (AAS excluded). **compliance gap** if anyone cites `/api/aas/audit` as GxP |
| Converted to URS? | **No** |
| Related | RA-008 |
| Human decision | Keep AAS out of production-pilot image / disable routes |

### GAP-P-006 — Absence of Part 11 controls

| Field | Content |
| --- | --- |
| Source | `docs/status-model.md`; `validation-gap-analysis.md` §5; `PRODUCT.md` out of MVP |
| Class | **compliance gap**. Not a requirement gap for current MVP |
| Converted to URS? | **No.** Inferring Part 11 because some `record()` calls exist would fabricate a regulatory requirement |
| Related | RA-017, URS-LEG-002 (claim-control only) |
| Human decision | Whether a future edition will enter Part 11 scope at all |

### GAP-P-007 — Absence of IQ/OQ/PQ package

| Field | Content |
| --- | --- |
| Source | `validation-gap-analysis.md` §8; this `validation/` tree is PROPOSED draft only |
| Class | **compliance gap** + **evidence gap** |
| Converted to URS? | **No.** IQ/OQ/PQ are validation *process* deliverables, not user requirements of the product |
| Related | TEST-IQ-*, TEST-OQ-*, `validation/evidence/README.md` |
| Human decision | Who owns CSV; whether this draft becomes the protocol source |

### Other Pilot Exit items (not converted)

| Finding | Class |
| --- | --- |
| `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED` | evidence gap; no timing URS written (would invent a performance requirement) |
| TechDocs search index empty for fixture | evidence gap for URS-DOC-001 / URS-SRC-001 |
| Legal counsel gates OPEN | compliance / legal process; URS-LEG-001 already matches software behavior |
| Plant MQTT anonymous | **validation scope issue** (out of Core) |

---

## 2. Requirement gaps (NEEDS_REVIEW)

| ID | Issue |
| --- | --- |
| URS-AUTH-005 | Guest-as-Developer may be too much privilege for a “dev fallback” URS |
| URS-AUD-001 | Inferred from code + “Auditable CI/CD”; not from a signed product URS |
| URS-ENT-004 | Fail-closed claimed in docs; implementation not verified in TDS |
| URS-CAT-002 | Docker/production file proof NEEDS_REVIEW |
| URS-GH-002 | OAuth clientId is frontend-visible by design |
| URS-MKT-002 | Label requirement needs human check of marketplace data |
| URS-CFG-002 | Overlay files not all re-read |

No Entra/OIDC, billing, multi-tenancy, or Part 11 URS were added. Their absence is **intentional**, not an accidental requirement gap.

---

## 3. Design gaps

| Item | Class detail |
| --- | --- |
| Legal gate not in PermissionPolicy | Design matches URS-LEG-001 (customer handoff only). Residual RA-006 |
| Frontend no `usePermission` | Design gap vs defense-in-depth; backend still required (URS-RBAC-003) |
| Entitlement/AAS audit not in Postgres | Design gap for durability |
| AWS fail-closed | IMPLEMENTATION_NOT_VERIFIED |
| Marketplace register session | IMPLEMENTATION_NOT_VERIFIED |
| Certification overlay mutable JSON | Not WORM; acceptable only because no Part 11 URS |
| nexora-industrial authorize depth | IMPLEMENTATION_NOT_VERIFIED |

---

## 4. Test gaps

| Item | Detail |
| --- | --- |
| Signed OQ/UAT | All TEST-* Result NOT EXECUTED |
| Security route matrix | TEST-SEC-002 not implemented as code |
| Bundle secret scan | TEST-GH-002 |
| Restart audit empty | TEST-AUD-002 documents a limitation |
| Playwright not in platform CI | Candidate exists, not evidence |
| TEST-ENT-002 coverage | NEEDS_REVIEW whether policy.test.ts actually covers entitlement deny |

---

## 5. Evidence gaps

See `validation/evidence/README.md` and the traceability “Missing execution evidence” section.

Critical:

- No signed IQ/OQ/PQ
- Interactive Create not executed
- Quality Gate live read not proven
- No independent QA witness
- CI logs are not validation records

---

## 6. Compliance gaps (do not implement in this phase)

- GxP / CSV validated status
- 21 CFR Part 11 / ALCOA+
- Formal URS approval
- Supplier / OSS legal notices (counsel OPEN)
- Training, deviation, CAPA
- Periodic review / revalidation triggers

These remain **out of MVP** per `PRODUCT.md` and `AGENTS.md` unless a human explicitly changes product scope.

---

## 7. Items requiring human decision

1. Accept Platform Core boundary (Golden Paths, Wave 1, AAS, UNS, pilot out).
2. Accept or rewrite all `NEEDS_REVIEW` URS.
3. Accept URS-LEG-001 as customer-handoff-only vs change product later (not in this phase).
4. Accept in-memory URS-AUD-001 or defer audit URS entirely.
5. Grant GitHub App Actions Read-only (operations) vs live with UNKNOWN.
6. Complete interactive OAuth Create (evidence) vs keep Pilot Exit FAIL.
7. Keep OEE live proof out of Core.
8. Whether Backstage is formally assessed as SOUP.
9. Whether a future edition enters Part 11 — **do not invent that URS now**.
10. Who reviews this AI package (`validation/reviews/`) and what sampling of Evidence paths is required (RA-015).
11. Guest Developer membership acceptable for local-only.
12. Whether production-pilot IQ will use `app-config.production.yaml` as the qualified configuration.

---

## 8. Critical gaps after Baseline v1.0 freeze

1. Requirements are BASELINED; the system is still **NOT_VALIDATED**.
2. Zero reviewed IQ/OQ/UAT execution evidence.
3. URS-AUD-001 durability is implemented on the official permission-policy Create path (RB-P0-001 / RB-P1-007 / RB-P1-008). Formal restart OQ remains NOT_EXECUTED.
4. Quality Gate UNKNOWN representation was remediated in P0 (RB-P0-005); formal OQ of live Actions remains outstanding.
5. Interactive Create unproven (RB-P1-001) — FORMAL_VERIFICATION_REQUIRED.
6. OPEN-LEG-001 operation list **CLOSED** (DEC-LEGAL-002). Unimplemented commercial operations remain NOT_APPLICABLE_CURRENT_RELEASE. RA-006 not accepted.
7. CERTIFIED ≠ GMP; Part 11 NOT CLAIMED. Technical certification wording qualified in P1 (RB-P1-005); UAT surface walk remains outstanding.
