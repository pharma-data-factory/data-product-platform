# Traceability and GMP position

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING / QUALITY
Status: AUTHORITATIVE for Nexora's compliance capability and its limits

**Scope distinction.** This document describes **what Nexora provides to the
products it governs**. It is not the platform's own validation package — that
is `validation/**` (parsed by `validation-expert-backend`) and
`docs/validation/00-phase0/`. Do not merge the two: one is a capability, the
other is evidence about this system.

**Standing claim:** Nexora itself is **NOT VALIDATED**. Nothing in this
document is a regulatory claim. `CERTIFIED` never implies GxP validated.

---

## 1. What is implemented

### 1.1 GxP classification changes behaviour

Classification is not metadata here. It switches four things:

| Switch                                                                                                                                                                   | Where                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Approval workflow**: `DIRECT`/`INDIRECT` → `standard-gxp-urs` (Business Reviewer → Product Manager → **Quality Reviewer**); otherwise `non-gxp-urs` (two steps, no QA) | `urs-composer-backend/src/service.ts`, `data/approvalWorkflows.ts` |
| **Release-gate obligations** with `appliesTo: 'gxp'`                                                                                                                     | `composer-backend/src/service.ts`                                  |
| **ValidationDecision required** — blocker `NO_APPROVED_VALIDATION_DECISION`                                                                                              | `composer-backend/src/service.ts`                                  |
| **Change impact** — `impact_assessments.gxp_impact` gates change-request approval                                                                                        | `urs-composer-backend/src/service.ts`                              |

Levels: `NONE | INDIRECT | DIRECT`, plus `patient_impact`,
`data_integrity_impact`, `electronic_records` on the requirement set.
There is **no `Hybrid`/`Shared` classification** — if the target model needs
one, it does not exist yet.

### 1.2 Electronic signatures (21 CFR Part 11 / EU Annex 11 shape)

`urs-composer-backend/src/domain/signature-service.ts` enforces four things
before a signature is recorded:

1. a second factor was proven (`domain/reauth.ts`, PIN with lockout);
2. the content still hashes to what it hashed to when stored — a mismatch
   means the record moved under an existing signature;
3. the signatory holds the approval role the meaning requires
   (`AUTHORED` / `REVIEWED` → Business Reviewer / `APPROVED_QA` → Quality Reviewer);
4. segregation of duties — nobody reviews their own authorship, nobody
   approves what they reviewed.

A signature is never updated or withdrawn. A wrong signature is corrected by
rejecting the version and opening a new one, so both statements stay on record.

`APPROVED` is reachable **only** through a valid QA signature, never through a
status endpoint.

### 1.3 Database-level invariants

Enforced in PostgreSQL, not only in application code — _"a regulated audit
trail may not depend on application code being correct"_
(`urs-composer-backend/src/db/migrations.ts`):

- partial unique index: a requirement has at most one open version
  (`DRAFT`/`IN_REVIEW`/`REVIEWED`/`IN_APPROVAL`);
- row trigger: content is frozen once a version leaves `DRAFT`; a released
  version may only change status.

### 1.4 Segregation of duties beyond signatures

- Product version `APPROVED`: the author may not approve
  (`composer-backend/src/service.ts`).
- Product baseline approval: the creator may not approve (closed 2026-09-25).
- URS approval chain: a step is refused while any required lower-sequence
  step is open (closed 2026-09-25).

### 1.5 Audit

Three append-only stores — `audit_events` (URS), `composer_audit_events`
(Product), `user_audit_events` / `user_sign_in_events` — plus a durable
authorization-decision store for every Create decision.

### 1.6 The release gate

Eleven blocker codes, fail-closed, evaluated before any `RELEASED`
transition and surfaced read-only at `GET /versions/:id/release-gate` so
blockers can be seen and cleared beforehand. An unknown policy check **fails
loudly** rather than passing.

### 1.7 Requirement provenance

A Product Version does not point at a URS baseline — it **snapshots** it.
`product_requirements` copies every pinned requirement including its
`content_hash`, so a released product keeps the wording it was built against
even after the URS side revises.

---

## 2. What is not implemented

Stated plainly, because a compliance document that overstates is worse than
none.

### G-1 — Requirement→Test verification is asserted, not proven

`VERIFIED_BY` exists as a relationship type and **has no automated producer
anywhere in the codebase**. Every verification link is typed by a human.
There is no test entity, no execution record, and no evidence ingestion for
product tests.

**Consequence:** Nexora can show that a requirement was _declared_ verified.
It cannot show that a test ran, what it returned, or against which commit.

### G-2 — Product test evidence is not captured

The only build evidence a product carries is `release_commit_sha` and
`artifact_digest`, posted by CI to `POST /baselines/:id/provenance`
(write-once). No test results, no reports, no artefacts.

`validation_evidence` exists but belongs to the platform's own validation
runs, not to governed products.

### G-3 — The release gate asks the weaker question

`INCOMPLETE_TRACEABILITY` checks _"does every component have some link?"_.
The regulated question — _"is every requirement implemented, verified and
validated?"_ — is computed correctly by `getRequirementCoverage` and **the
gate does not consume it**.

### G-4 — The shipped default disables the invariants

`app-config.yaml` sets `ursComposer.persistence.mode: memory`. In memory mode
none of §1.3 exists and the audit trail is process-local.
`app-config.production.yaml` overrides it explicitly, with a comment warning
that config layering would otherwise let `memory` survive the merge. The
safety net exists; the default is the unsafe one.

### G-5 — The product-side audit cannot answer "why"

`composer_audit_events` has no `reason` and no `entity_version` column. URS
has both.

### G-6 — Coverage is explicitly not a GxP claim

`validation-expert-backend/src/coverage.ts` labels its own output: _"Lite join
… Not a GxP validation claim."_ Treat it accordingly.

### G-7 — No FS, no TDS

The left arm of the V-model does not exist. Traceability runs
UAS → Baseline → ProductRequirement → Component, with nothing between
requirement and design.

---

## 3. Current traceability chain

```
URS RequirementVersion  --FK-->  Baseline           IMPLEMENTED
Baseline  --HTTP snapshot-->  ProductRequirement    IMPLEMENTED
ProductRequirement  --link-->  ProductComponent     PARTIAL  (manual, no FK)
ProductComponent  -->  Repository                   PARTIAL  (2 of 10 templates)
Implementation  -->  Test                           MISSING
Test  -->  Evidence                                 MISSING
Implementation  -->  Evidence (commit + digest)     INDIRECT
Baseline  --HTTP-->  ValidationDecision             IMPLEMENTED
everything  -->  Release gate                       IMPLEMENTED
UAS -> FS -> TDS -> Component                       MISSING
```

`traceability_links` carries **no foreign keys** — source and target are
unvalidated strings.

---

## 4. Rules that hold today

1. A GxP-relevant product cannot be released without an approved URS baseline
   and an approved ValidationDecision.
2. Nobody approves their own work — at requirement, baseline or version level.
3. Approved content cannot be edited; it is superseded.
4. An unreachable validation resolver blocks release; it never reads as "not
   required".
5. AI may propose; only a person applies.

## 5. Rules that do not hold yet

1. A requirement cannot be proven tested.
2. A release does not carry the test evidence for its requirements.
3. Running with the shipped default configuration produces no durable audit
   trail.
