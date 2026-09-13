# Intended Use — URS Composer

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-URS-IU-001 |
| Status | **DRAFT — PRODUCT / QUALITY DECISION RECORD** |
| Subsystem | URS Composer (`plugins/urs-composer`, `plugins/urs-composer-backend`) |
| Validation status | **NOT VALIDATED** (aligns with [subsystem-status.md](../../subsystem-status.md)) |
| Date | 2026-09-10 |

This document records the intended-use and CSV posture for URS Composer as a
**separate** Validation Package from Platform Core. It does **not** approve
release or claim GxP validation.

---

## 1. Classification

URS Composer is a **GxP-relevant engineering subsystem under development** for
capturing user requirements, baselines, approval chains, and technical
electronic-signature (e-sign) controls.

It is **not** part of the MVP 1.0 customer value proposition until Product and
Quality explicitly promote it from **DRAFT** release status.

---

## 2. Current validation status

| Dimension | Status |
| --- | --- |
| Implementation | TESTED |
| Release | DRAFT |
| Commercial | FUTURE (no SKU) |
| Validation | **NOT VALIDATED** |

Authoritative table: [docs/subsystem-status.md](../../subsystem-status.md).

---

## 3. Electronic signatures — written position

Electronic signatures in URS Composer are **technical workflow controls**.

They are:

- **not** a 21 CFR Part 11 compliance claim,
- **not** an EU Annex 11 compliance claim,
- **not** the sole regulated approval of record for the customer organization.

Platform Core Part 11 ER/ES remains out of scope per **DEC-P11-001**
(see `validation/reviews/Validation-Decisions.md`). URS Composer e-sign does
not change that Platform Core decision.

Customer-facing wording must match [subsystem-status.md](../../subsystem-status.md)
(“Electronic signature — written GxP position”).

---

## 4. Scope IN

Formal CSV for URS Composer (when promoted) is intended to cover:

| Area | Description |
| --- | --- |
| Requirement sets | Capture and lifecycle of user requirement sets |
| Baselines | Immutable approved baselines (ADR-006) |
| Approval | Configurable approval workflows (ADR-007) |
| Change requests | Controlled change against approved baselines |
| Audit trail | Append-oriented audit of controlled actions |
| Validation Expert handoff | HTTP seam to create validation contexts from APPROVED baselines only |

---

## 5. Scope OUT

| Out of scope | Reason |
| --- | --- |
| Replacing customer QMS / eDMS | Customer quality system remains system of record for regulated approval |
| Platform Core as Part 11 ER/ES | DEC-P11-001 — Part 11 not claimed for Platform Core |
| Automatic GxP decisions | No automated acceptance of GxP risk, validation package approval, or regulated release |

---

## 6. Decision

**Proceed toward formal CSV as a separate Validation Package for URS Composer
(not Platform Core)** when Product and Quality promote the subsystem release
from **DRAFT**.

Until that promotion:

- Validation status remains **NOT VALIDATED**.
- E-sign and approval remain technical controls only.
- IQ/OQ/UAT for URS Composer are planned, not executed
  ([validation-package-outline.md](./validation-package-outline.md)).

---

## 7. Next gates

| Gate | Status / note |
| --- | --- |
| Wire e-sign in UI | Done / in progress — productized as technical controls |
| Change control UI | Next product gate |
| Durable Validation Expert persistence | Postgres mode available; subsystem still NOT VALIDATED |
| IQ/OQ package | Scaffold only — see [validation-package-outline.md](./validation-package-outline.md) |

---

## Related

- [subsystem-status.md](../../subsystem-status.md)
- [ADR-006 / ADR-007](../../architecture/adr/README.md)
- [validation-package-outline.md](./validation-package-outline.md)
- DEC-P11-001 — `validation/reviews/Validation-Decisions.md`
