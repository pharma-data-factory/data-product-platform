# Subsystem status and GxP position

Owner: Platform Team  
Last reviewed: 2026-09-09  
Audience: INTERNAL ENGINEERING / PRODUCT / PILOT  
Version: 1.0.0

Authoritative status for **Control Plane product subsystems** that are not
Golden Paths or Wave 1 components. Use the four dimensions from
[Status model](status-model.md). Do not collapse them into one badge.

MVP 1.0 freeze remains [mvp-1.0-baseline.md](mvp-1.0-baseline.md).
Anything in this document that is outside that freeze is **not** part of the
MVP 1.0 customer value proposition until explicitly promoted.

## How to read this table

| Column | Source definition |
| --- | --- |
| Implementation | DEVELOPMENT / TESTED / CERTIFIED ([status-model](status-model.md)) |
| Release | Whether a version is offered for general Create / production use |
| Commercial | SKU / entitlement posture |
| Validation | GxP / CSV claim — default **NOT VALIDATED** |

CERTIFIED (implementation) never implies GxP VALIDATED.

## Control Plane subsystems

| Subsystem | Packages | Implementation | Release | Commercial | Validation | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Platform Core (Catalog, Create, Marketplace, Data Products, RBAC, TechDocs, Developer Hub) | `packages/app`, `packages/backend`, `plugins/data-products*`, `plugins/marketplace`, `plugins/entitlements-backend`, … | CERTIFIED (MVP 1.0 technical baseline) | RELEASED for pilot under conditions | Legal distribution **BLOCKED** | **NOT VALIDATED** | [mvp-1.0-baseline](mvp-1.0-baseline.md) |
| URS Composer | `plugins/urs-composer`, `plugins/urs-composer-backend` | **TESTED** | **DRAFT** — not a released customer module | **FUTURE** (no SKU) | **NOT VALIDATED** | Requirements, baselines, approval chain, e-sign *mechanism*. Outside MVP 1.0 value proposition. |
| Validation Expert | `plugins/validation-expert`, `plugins/validation-expert-backend` | **TESTED** | **DRAFT** | **FUTURE** | **NOT VALIDATED** | IQ/OQ/UAT run tooling and URS baseline HTTP seam. Not a validated CSV system. |
| Solution / Composition Builder | `packages/app` Compose UI, `plugins/composer-backend` | **TESTED** | **DRAFT** | n/a | **NOT VALIDATED** | Composition drafts and presets; not a Golden Path. |
| Model Company | `plugins/model-company`, `plugins/model-company-backend` | **TESTED** | **DRAFT** (demo) | n/a | **NOT VALIDATED** | Demonstration / scenario plant only. |
| Plugin Directory | `plugins/plugin-directory`, `plugins/plugin-directory-backend` | **TESTED** | **DRAFT** | n/a | **NOT VALIDATED** | Internal inventory UI. |
| Users admin API | `plugins/users-backend` | **DEVELOPMENT** | **DRAFT** | n/a | **NOT VALIDATED** | Thin admin surface; not a complete IAM product. |
| AAS Control Plane adapter | `plugins/aas-backend`, Assets UI | **DEVELOPMENT** (in-memory prototype) | **DRAFT** | n/a | **NOT VALIDATED** | Not BaSyx; not a certified fourth Golden Path in this freeze. See ROADMAP. |
| Unified Namespace | `uns/`, related templates | **DEVELOPMENT** | **DRAFT** | n/a | **NOT VALIDATED** | Outside MVP 1.0 value proposition. |

### AAS honesty

Parent marketing copy and some catalog annotations have called AAS
CERTIFIED. **This freeze treats AAS as DEVELOPMENT** for the Control Plane
adapter and keeps it outside the MVP 1.0 value proposition, consistent with
[ROADMAP.md](../ROADMAP.md) and [mvp-1.0-baseline.md](mvp-1.0-baseline.md).
Do not promote AAS as a buyable fourth Golden Path until implementation,
quality gate, and status annotations are reconciled.

## Electronic signature — written GxP position

### What the product does

URS Composer can capture **electronic signatures** on requirement versions
and related controlled records. The implementation includes:

- re-authentication via a user signing PIN (something you know),
- binding of the signature to a content hash of the signed payload,
- append-oriented audit events,
- segregation-of-duties checks against approval roles,
- PostgreSQL immutability controls for regulated tables when persistence
  mode is `postgres`.

These are **technical controls** intended to support a future formal
computerized-system-validation (CSV) effort.

### What the product does not claim

| Claim | Position |
| --- | --- |
| GxP validated | **No.** Validation status remains **NOT VALIDATED**. |
| 21 CFR Part 11 compliant | **No.** Mechanisms may be *informed by* Part 11 / EU Annex 11 themes; this is not a compliance certification. |
| EU Annex 11 compliant | **No.** Same as above. |
| Validated computerized system (CSV complete) | **No.** |
| Customer may use URS e-sign as the sole regulated approval of record | **No**, not under this freeze. |

### Customer-facing wording (required)

Use wording equivalent to:

> Electronic signature and approval features in URS Composer are **technical
> workflow controls**. They are **not** GxP validation, not a Part 11 / Annex 11
> compliance claim, and not a substitute for the organization's validated
> quality system.

Do **not** describe URS Composer, Validation Expert, or e-sign as
"GxP ready", "Part 11 ready", or "validated" in Landing Page, sales decks,
Marketplace copy, or pilot contracts unless Quality has approved a different
written position and this document is updated.

### Pilot / go-live implication

| Audience | Guidance |
| --- | --- |
| Internal engineering | Ship and test the mechanism; keep validation status NOT VALIDATED. |
| Pilot customers | Disclose the position above. Do not sell URS e-sign as regulated approval of record. |
| Formal CSV / IQ-OQ-PQ | Separate program; out of MVP 1.0 and out of this subsystem freeze. |

## Relationship to MVP 1.0

| In MVP 1.0 value proposition | Outside MVP 1.0 (present in repo) |
| --- | --- |
| Platform Core, Wave 1, MQTT / REST / OEE Golden Paths | URS Composer, Validation Expert, Model Company, Plugin Directory, AAS adapter, UNS |

Outside subsystems may be demonstrated in pilot **only** with the status
labels above and the e-sign disclosure. They must not be silently folded into
"MVP 1.0 CERTIFIED" messaging.

## Change control

Status changes for a subsystem require:

1. Update of this document (implementation / release / commercial / validation).
2. Alignment of [capability-matrix.md](capability-matrix.md) and [ROADMAP.md](../ROADMAP.md) when the subsystem enters a customer-facing release.
3. Explicit Quality review before any Validation column moves off **NOT VALIDATED**.
