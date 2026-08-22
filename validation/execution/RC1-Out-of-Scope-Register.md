# RC1 out-of-scope register

**Baseline:** PDF-PC-VAL-BL-1.0 / DEC-SCOPE-001  
**Candidate model:** complete repository snapshot; validation claim = Platform Core only  
**Date:** 2026-08-22  

Components below **may remain** in the RC1 repository state. They are **not** part of the Platform Core validation claim.

| Component | Repository path | Why outside Core claim | Loaded at runtime? | Can influence Core? | Isolation / control | Validation impact |
| --- | --- | --- | --- | --- | --- | --- |
| OEE Golden Path **content** | `templates/oee-data-product/**`, `docs/oee/**`, `docs/releases/oee-1.0.0.md` | §4.11 template source / DEC-OEE-001 | Template registered in catalog overlays; generated service is a separate runtime | Scaffolder can *create* from the template (Core interface). Domain OEE APIs are not Core URS | Official template ID / release catalog only | Do not OQ OEE formulas. Create journey may use the template as an *interface* |
| OEE design tests in backend | `packages/backend/src/oeeGoldenPath*.ts`, `dataProductConformance.test.ts`, `templateContract.test.ts` | Golden Path contract tests | Test-time only | No production request path | Jest | Not formal Core evidence |
| Pilot harness | `pilot/oee/**` | §4.12 | No (local harness) | No | Separate process | Out of Core OQ |
| AAS Foundation file | `platform-components/asset-semantic/aas-foundation/src/pdf_aas/data/__init__.py` | §5 AAS excluded | Not the Control Plane unless separately run | No | Separate Python package | Out of Core |
| AAS Control Plane plugin | `packages/backend/src/aas/**` (already on HEAD; not in the 240 as a new tree) | §5 DEVELOPMENT | **Yes** — `aasPlugin` in `index.ts` | Authz via `aas.read` / `aas.manage`; in-process routes | Distinct permissions; excluded URS | **SCOPE_BOUNDARY_RISK** (pre-existing) |
| Nexora industrial backend | `plugins/nexora-backend/**` | §5 industrial mock/remote not shopfloor truth | **Yes** — added in worktree | View permission + optional remote fetch; no policy/scaffolder change | `dataProductViewPermission`; `/health` unauthenticated | **SCOPE_BOUNDARY_RISK** (new load) |
| Nexora industrial UI | `plugins/nexora-assets`, `nexora-common`, `nexora-contracts`, `nexora-quality`; `docs/nexora/**` | Industrial views; not Core URS set | **Yes** — `App.tsx` | Routing / same session | Client plugins | **SCOPE_BOUNDARY_RISK** (routing) |
| Industrial helpers | `packages/platform-common/src/nexora-industrial.ts` | Industrial model | Imported by nexora plugins | Shared package with Core | Export-only unless Core imports it | Coupling |
| Industrial catalog sample | `catalog/samples/industrial.yaml` | Local fixture | Local `app-config.yaml` only | Local Catalog | Hosted overlays omit `catalog/samples` | IQ/OQ hosted catalog must use docker/production |
| Wave 1 libraries | `platform-components/**` (mostly unchanged) | §4.13 runtime libraries | Catalog listing only | Catalog interface | Catalog entities | Catalog URS only |
| Branding / Nexora chrome | `packages/app/src/modules/identity/**`, `nav/Brand*`, `theme/**`, architecture pages, `README.md` | Branding | **Yes** (SPA) | Presentation; login page is Core *surface* | Theme/modules | Claim-control UAT still walks landing copy |
| Machine-state / other templates | existing `templates/*` not newly invented here | Reference / non-OEE GP | Catalog Template entities | Scaffolder interface | Template IDs | Same as other templates |

---

## Isolation summary

| Control | Holds? |
| --- | --- |
| Permission policy class unchanged by nexora | Yes (`policy.ts` is Core-only logic) |
| Entitlement/Legal gate unchanged by nexora | Yes |
| Hosted catalog omits industrial samples | Yes (docker/production) |
| Nexora GETs use existing `data-product.view` | Yes |
| AAS still loaded from HEAD | Yes — pre-existing exclusion |

Do not treat presence in the repo as a Core URS expansion.
