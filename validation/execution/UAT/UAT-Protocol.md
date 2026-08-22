# UAT Protocol — Platform Core 1.0-RC1

| Field | Value |
| --- | --- |
| Document | VAL-UAT-PC-RC1 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Candidate | 1.0-RC1 |
| Validation status | NOT_VALIDATED |
| Execution | **NOT_EXECUTED** |

User Acceptance tests intended use from the operator’s perspective. Golden Path *business content* (OEE formulas, MQTT payloads, equipment semantics) is **outside** Platform Core validation scope. Official Golden Paths are used only as Catalog/Scaffolder interfaces.

All Actual Result and Status fields are **NOT_EXECUTED**.

---

## UAT-001 — Developer end-to-end Create

| Field | Content |
| --- | --- |
| ID | UAT-001 |
| User role | Developer (approved Catalog User; entitled if the selected Golden Path is commercial) |
| Related URS | URS-AUTH-001, URS-CAT-001, URS-CAT-003, URS-SCF-001, URS-SCF-003, URS-GH-001, URS-GH-003, URS-CI-001, URS-AUD-001, URS-MKT-001 |
| Preconditions | IQ complete enough to use the hosted candidate. GitHub OAuth and GitHub App publish configured. Official Golden Path is generally available. |
| Business scenario | An authorized Developer signs in, finds an available official Golden Path, creates a Data Product repository, sees it in Catalog, sees technical CI status, and an administrator can retrieve the Create-authorization audit record. |
| Procedure | 1. GitHub Login. 2. Browse Catalog / Marketplace / Data Products. 3. Select an available official Golden Path (interface only). 4. Create Data Product via official Scaffolder. 5. Observe authorization (allow). 6. Confirm repository creation. 7. Confirm Catalog registration. 8. Open CI / Quality Gate status (technical only). 9. Retrieve audit evidence for the Create decision. |
| Expected Result | Journey completes when configuration allows. CI is technical, not GxP. Audit record exists for the official policy decision. Golden Path domain correctness is not judged. |
| Evidence Required | Redacted screenshots/logs for each step; repo URL; audit excerpt; no secrets |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## UAT-002 — Unauthenticated user

| Field | Content |
| --- | --- |
| ID | UAT-002 |
| User role | None |
| Related URS | URS-AUTH-001 |
| Preconditions | Public base URL |
| Business scenario | An unauthenticated person tries to use protected Create and admin functions. |
| Procedure | Without signing in, attempt Scaffolder Create and entitlements/certification admin actions (UI and/or API). |
| Expected Result | Protected functions are unavailable. No session is implied. |
| Evidence Required | Screenshots / HTTP statuses |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## UAT-003 — Viewer attempts Create

| Field | Content |
| --- | --- |
| ID | UAT-003 |
| User role | Viewer |
| Related URS | URS-RBAC-004, URS-SCF-002 |
| Preconditions | Viewer Catalog identity |
| Business scenario | A Viewer browses but must not create. |
| Procedure | Sign in as Viewer. Browse Catalog. Attempt official Golden Path Create. |
| Expected Result | Create is denied. Browse remains available as specified. |
| Evidence Required | Deny evidence |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## UAT-004 — Missing entitlement

| Field | Content |
| --- | --- |
| ID | UAT-004 |
| User role | Developer without the commercial entitlement |
| Related URS | URS-ENT-001, URS-ENT-002, URS-SCF-002 |
| Preconditions | Developer identity; official commercial Golden Path not entitled |
| Business scenario | A Developer who may create other templates cannot create an official commercial Golden Path without entitlement. |
| Procedure | Attempt Create / template parameter access for the not-entitled official Golden Path. Optionally confirm a non-commercial template still works. |
| Expected Result | Official path denied with an ENTITLEMENT-distinct reason. RBAC is not blamed for a missing entitlement. |
| Evidence Required | Deny evidence |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

---

## UAT-005 — Degraded CI status

| Field | Content |
| --- | --- |
| ID | UAT-005 |
| User role | Viewer or Developer |
| Related URS | URS-GH-003, URS-CI-001, URS-LEG-002 |
| Preconditions | A cataloged Data Product whose Actions status is UNKNOWN or otherwise unverified |
| Business scenario | A user reads CI status and must not treat missing pipeline data as a validation pass. |
| Procedure | Open Quality Gate / CI status for that entity. Read labels and disclaimer. |
| Expected Result | UNKNOWN is shown as **DEGRADED / UNVERIFIED** (or equivalent specified label). Copy states this is not GxP validation. Status is not presented as PASS or GMP VALIDATED. |
| Evidence Required | Screenshot |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |
