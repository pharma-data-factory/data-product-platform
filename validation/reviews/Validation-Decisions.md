# Validation Decisions — Human Review Package

**Document ID:** VAL-DEC-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED (decisions applied)  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22

Phase 2B recorded AI recommendations with Human Decision PENDING. Phase 2C applies the authoritative human baseline decisions below. No named individual or electronic signature is fabricated.

Original Phase 2B recommendation text is retained under each item. Applied freeze values replace only the Human Decision field.

---

## DEC-SCOPE-001 — Platform Core boundary [APPLIED: ACCEPT]

**Question:** Is the validated computerized system limited to the Platform Core / Control Plane as defined in `validation/baseline/Validation-Scope.md`, excluding Golden Path source, generated Data Products, Wave 1 libraries, pilot harnesses, UNS, and AAS?

**Current state:** Phase 2 scope document proposes that boundary. Official Golden Paths are CERTIFIED / RELEASED technically and remain **NOT VALIDATED**. AAS and UNS are DEVELOPMENT.

**Recommendation:** Accept the proposed boundary for this baseline. Keep Golden Paths and instances as *interfaces/dependencies* only (template IDs, Catalog listing, CI-status read).

**Rationale:** Validating the portal that authenticates, authorizes, catalogs, and publishes is a different system from validating a generated OEE or MQTT runtime. Collapsing them invents a plant-system URS set the product explicitly deferred.

**Related:** `validation/baseline/Validation-Scope.md`; `data-product-platform/docs/mvp-1.0-baseline.md`

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-SOUP-001 — Backstage / SOUP treatment [APPLIED: ACCEPT]

**Question:** How will upstream Backstage be controlled as a third-party / SOUP (software of unknown pedigree) dependency?

**Current state:** Backstage is the foundation and is not forked. Platform Core *configures and extends* it. There is no signed SOUP assessment, no formal upgrade-impact procedure, and no claimed validation of Backstage internals. Evidence: `AGENTS.md` §3; `data-product-platform/packages/backend/src/index.ts`; `data-product-platform/package.json` (`@backstage/cli` ^0.36.4).

**Recommendation:** Treat Backstage (and its plugins listed in app/backend `package.json`) as SOUP. Do **not** validate Backstage source. Control it with:

| Proposed control | Intent |
| --- | --- |
| Pinned versions | Lockfile / immutable install (`yarn install --immutable` in platform CI) |
| Dependency inventory | Maintain a list of Backstage packages actually loaded |
| Vulnerability scanning | Periodic advisory review (platform CI does not currently publish a Core container CVE record) |
| Release / change assessment | Assess Backstage upgrades before adoption |
| Regression testing | Re-run Platform Core automated suite after upgrades |
| Upgrade impact assessment | Document impact on auth, permission policy, scaffolder, catalog |

**Rationale:** A validated Core that sits on an uncontrolled upstream cannot claim configuration integrity. SOUP control is a *process* decision, not a new functional URS and not a Part 11 requirement.

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-GUEST-001 — Guest production policy [APPLIED: ACCEPT]

**Question:** Is Guest access a validated production capability, a development-only convenience, or outside validation scope?

**Current state:** Guest exists in local `app-config.yaml`, maps to `user:default/guest` and `data-product-developers`, and is omitted from production config (asserted by `packages/backend/src/auth/identity.test.ts`). `URS-AUTH-002` forbids Guest in production. `URS-AUTH-005` describes local Guest as optional.

**Recommendation:**

| Environment | Policy |
| --- | --- |
| Validated production / hosted pilot | **Guest shall not be available.** Production requirement is `URS-AUTH-002`. |
| Local development | Guest may exist. It is **outside the validated configuration**. |
| Validation scope | Guest is **not** a validated Platform Core capability. |

Do not promote development convenience into a validated production URS. Recommend **REJECT** `URS-AUTH-005` from the validated set (see URS review). Keep `URS-AUTH-002`.

**Rationale:** Guest currently carries Developer group membership. If Guest appears on a hosted system, Create and other Developer actions become available without GitHub identity. That is incompatible with a validated production identity model.

**Related URS:** URS-AUTH-002, URS-AUTH-005  
**Related risk:** RA-002

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-AUDIT-001 — Durable audit requirement [APPLIED: ACCEPT WITH MODIFICATION]

**Question:** Shall the *intended* validated Platform Core require a **durable** record of validation-relevant actions (at minimum entitlement Create grant/deny with actor, time, reason), surviving process restart?

**Current state:** `URS-AUD-001` requires recording for administrator review but **omits durability** because the implementation is an in-memory array (`packages/platform-common/src/entitlement-service.ts`). Events are lost on restart. This is not Part 11.

**Recommendation:** **Yes — durable recording should be the intended requirement** for validation-relevant Control Plane actions (Create authorization outcomes; later, humans may add certification writes and admin entitlement approve/disable). Classify current software as **PARTIALLY_IMPLEMENTED**. **MODIFY** `URS-AUD-001` accordingly. Do **not** weaken the URS to match in-memory storage. Do **not** add 21 CFR Part 11 / e-signatures (see DEC-P11-001).

**Rationale:** A requirement that exists only while the process is up cannot support retrospective review after a restart or incident. Implementation must not define the intended requirement.

**Related URS:** URS-AUD-001  
**Related risk:** RA-007

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-LEGAL-001 — Legal gate scope [APPLIED: MODIFY]

**Question:** For a validated Platform Core, shall the legal distribution gate deny **only** customer artifact handoff (`handoff=customer`), or also deny internal Scaffolder Create / GitHub publish while status is BLOCKED?

**Current state:** Software denies customer handoff when `legalDistributionStatus` is not APPROVED. Internal generation remains allowed. `URS-LEG-001` was written to match that behavior. Default status is BLOCKED. Evidence: `packages/platform-common/src/entitlement-service.ts`; `data-product-platform/app-config.yaml`.

**Recommendation:** **NEEDS DISCUSSION.** The commercial/legal *intent* (distribution BLOCKED) can be bypassed in practice if internal Create produces a repo that is then handed to a customer. Either:

- keep URS-LEG-001 as a narrow software gate **plus** a mandatory process control for export, or  
- MODIFY the URS later so publish itself is blocked when status is BLOCKED.

Do not silently expand the URS in this review. Do not treat current code as automatically correct.

**Related URS:** URS-LEG-001, URS-SCF-002  
**Related risk:** RA-006

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-LEGAL-002 — OPEN-LEG-001 operation list [APPLIED: ACCEPT]

**Question:** Which operations require the Legal Gate?

**Current state:** OPEN-LEG-001 was OPEN_POLICY_DEFINITION. Software denies `authorizeCreate` when `handoff=customer` and `legalDistributionStatus` is not APPROVED. Official Scaffolder Create is not legally gated.

**Human Decision:** `APPLIED — CLOSE OPEN-LEG-001`

Internal development (Browse Catalog; Create internal Data Product; Scaffolder / Repository Create; Build and Test; Internal Development Deployment): Legal Gate **not** required. RBAC and entitlement (where applicable) remain required.

Commercial / customer (Customer Package Export; Customer Handoff; Commercial Activation; Marketplace Commercial Release; Customer Tenant Provisioning): Legal Gate **required**, together with RBAC and entitlement.

Principle: the Legal Gate controls commercial/customer transfer, provisioning or activation. It is not an additional authorization mechanism for normal internal development.

Operations that do not exist in RC1 are **NOT_APPLICABLE_CURRENT_RELEASE**. No implementation was invented.

**Related URS:** URS-LEG-001, URS-SCF-002  
**Related risk:** RA-006  
**Record:** `validation/reviews/OPEN-LEG-001-Decision-Request.md`

**Human Comment:** Recorded from the Phase 5A human instruction. No named signature fabricated.

---

## DEC-CI-001 — GitHub Actions read access / UNKNOWN behavior [APPLIED: MODIFY]

**Question:** Must a validated Platform Core successfully read GitHub Actions (App **Actions: Read-only**), or is a documented UNKNOWN Quality Gate an acceptable specified behavior?

**Current state:** `URS-GH-003` requires server-side resolve and display as technical status, not GxP. Pilot Exit: Quality Gate **UNKNOWN** because the App lacks Actions Read-only. Evidence: `data-product-platform/docs/pilot-exit-gate.md`; `plugins/data-products-backend/src/githubActions.ts`.

**Recommendation:** The *intended* requirement is that the portal show **true pipeline status** when a cataloged repo has Actions. UNKNOWN is acceptable only as a **degraded / error** state, not as the normal qualified behavior. Granting Actions Read-only is an operational control, not a new URS. Do not treat UNKNOWN as PASS.

**Related URS:** URS-GH-003, URS-CI-001  
**Related risk:** RA-012

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-OEE-001 — OEE live proof outside Platform Core [APPLIED: ACCEPT]

**Question:** Is `OEE_GITHUB_LIVE_PROOF_NOT_RUN` inside Platform Core validation, or outside (Golden Path / pilot evidence)?

**Current state:** OEE is an official Golden Path (CERTIFIED / RELEASED technically, commercial FUTURE). Live GitHub publish of OEE was not executed. Core URS do not include OEE domain behavior.

**Recommendation:** Keep **outside** Platform Core. Record as a future Golden Path / Pilot Exit evidence item. Do not create a Core URS for OEE live publish.

**Related:** `validation/baseline/Open-Gaps.md` GAP-P-002; `ROADMAP.md` MVP 1.1

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-P11-001 — Part 11 applicability [APPLIED: ACCEPT — PART 11: NOT CLAIMED]

**Question:** Is the Platform Core intended to perform regulated electronic records / electronic signature functions requiring 21 CFR Part 11 controls?

**Current state:** Product MVP excludes GxP validation claims. Status model: **NOT VALIDATED**. No e-signatures, WORM, or ALCOA+ design. `URS-AUD-001` is technical recording only.

**Recommended current answer:** **NO / FUTURE CAPABILITY**

Do not introduce Part 11 requirements into the URS set. Durable audit (DEC-AUDIT-001) can be specified without Part 11.

**Rationale:** Inferring Part 11 because `record()` exists would fabricate a regulatory obligation. A future edition may reopen this decision.

**Related URS:** none (intentionally omitted)  
**Related risk:** RA-017

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`

---

## DEC-REVIEW-001 — Reviewer roles [APPLIED: DEFINE]

**Question:** Who must review and (later, not now) approve the Platform Core validation baseline before any document leaves PROPOSED?

**Current state:** `validation/reviews/` had no reviews. This package is AI-generated. AI must not assign APPROVED.

**Recommendation:** Minimum roles before any future status change:

| Role | Reviews |
| --- | --- |
| Product owner | Intended use, Marketplace/Create, commercial/legal intent |
| Platform architect | Boundary, SOUP, GitHub, config |
| CSV / QA | URS set, traceability, IQ/OQ need, claim-control |
| Security | Auth, secrets, Guest, fail-closed |
| Legal (as needed) | DEC-LEGAL-001, distribution BLOCKED |

Phase 2C recorded URS dispositions in `validation/baseline/URS.md`. Named reviewers and signatures are not fabricated. Roles remain: Author / System Owner; Independent Technical Reviewer; QA / Validation Approver where required by the customer's GxP governance.

**Rationale:** RA-015 — AI-generated validation content is itself a high risk if treated as approved.

**Human Decision:** `APPLIED — see item header`

**Human Comment:** `[TO BE COMPLETED — no named signature recorded]`
