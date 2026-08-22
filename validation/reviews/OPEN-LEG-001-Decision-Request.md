# OPEN-LEG-001 — Human policy decision request

| Field | Value |
| --- | --- |
| ID | OPEN-LEG-001 |
| Related URS | URS-LEG-001 |
| Related SYS / TDS | SYS-LEG-001 / TDS-LEG-001 |
| Related backlog | RB-P1-004 |
| Related decisions | DEC-LEGAL-001 (APPLIED); DEC-LEGAL-002 (APPLIED 2026-08-22) |
| Status | **CLOSED** |
| Closed on | 2026-08-22 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Validation status | NOT_VALIDATED |

This file preserves the original Phase 4A request. The human decision is recorded below. It does **not** invent product implementation for operations that do not exist in RC1.

---

## Original request (preserved)

Software at the time of the request applied the Legal Gate only when `authorizeCreate` is called with `handoff === 'customer'` and `legalDistributionStatus !== 'APPROVED'`. The exact set of operations that *must* use the Legal Gate was `OPEN_POLICY_DEFINITION`.

### Question for human reviewers (historical)

Which Control Plane operations are **commercial / customer-handoff** operations that the Legal Gate must deny unless legal distribution status is APPROVED?

Examples of categories to accept or reject (do not treat the historical list as the policy):

- Customer artifact / repository handoff
- Customer AWS destination publish
- Customer pipeline export
- Internal Developer Create of an official Golden Path
- Internal dry-run / preview
- Marketplace browse
- Technical certification write
- Release lifecycle transition

### What must not happen (historical)

- Do not invent the list in software.
- Do not apply the Legal Gate to every internal Create.
- Do not block RBAC or entitlement (they remain independent).

### Historical Human Decision field

`PENDING` (superseded 2026-08-22)

### Historical Human Comment

`[TO BE COMPLETED — counsel / product owner]` (superseded 2026-08-22)

---

## Human Decision (APPLIED)

`CLOSED — operation list defined`

Policy principle:

> The Legal Gate controls commercial/customer transfer, provisioning or activation. It is not an additional authorization mechanism for normal internal development.

### Internal development operations — Legal Gate NOT required

Required controls: RBAC; entitlement where applicable.

| Operation | Legal Gate | RC1 software |
| --- | --- | --- |
| Browse Catalog | Not required | Exists. Catalog read. |
| Create internal Data Product | Not required | Exists. Official Scaffolder / `data-product.create` / policy Create. |
| Scaffolder / Repository Create | Not required | Exists. Scaffolder task/action. |
| Build and Test | Not required | Exists as GitHub Actions / CI Quality Gate (technical). |
| Internal Development Deployment | Not required | Hosted/local Control Plane deploy. Not a customer transfer. |

### Commercial / customer operations — Legal Gate required

Required controls: RBAC; entitlement; Legal Gate.

| Operation | Legal Gate | RC1 software |
| --- | --- | --- |
| Customer Handoff | Required | **Exists** as `POST /api/entitlements/authorize-create` with `handoff=customer`. Denied unless `legalDistributionStatus=APPROVED`. Official Scaffolder Create is **internal** and does not use this gate (DEC-LEGAL-001 / this decision). |
| Customer Package Export | Required | **NOT_APPLICABLE_CURRENT_RELEASE** — no export API or UI |
| Commercial Activation | Required | **NOT_APPLICABLE_CURRENT_RELEASE** — Marketplace register does not activate portal access (`accessGranted: false`) |
| Marketplace Commercial Release | Required | **NOT_APPLICABLE_CURRENT_RELEASE** — no commercial marketplace publish/release operation. Technical RELEASED is not this operation. |
| Customer Tenant Provisioning | Required | **NOT_APPLICABLE_CURRENT_RELEASE** — SaaS/tenant provisioning is not enabled (`tenantCreated: false`) |

No product code was added for the four non-existing operations.

### Human Comment

Recorded from the Phase 5A human instruction. No named individual signature is fabricated.

Related: `validation/reviews/Validation-Decisions.md` DEC-LEGAL-002.
