# RC1 change inventory

| Field | Value |
| --- | --- |
| Product repo | `data-product-platform` |
| HEAD | `d96ab0cbd97ea86314ddcbd468ff5faf756df212` |
| Branch | `main` |
| Date | 2026-08-22 |
| Staged | 0 |
| Tracked changes | 144 (143 modified, 1 deleted) |
| Untracked files | 96 |
| Total worktree paths | **240** |
| Validation package | **Outside** this git repo (`IDP/validation/`). See migration plan. |

No file was committed or discarded in Phase 5A.1.

**Include in RC1** means “include in a *minimal Core* candidate” unless marked REVIEW_REQUIRED. A full product-snapshot candidate would require a separate human decision.

---

## Classification summary

| Class | Count (approx.) | Include in minimal Core RC1 |
| --- | --- | --- |
| P0_REMEDIATION | 28 | YES |
| P1_REMEDIATION | 12 | YES |
| REQUIRED_RC1_CONFIGURATION | 6 | YES (config keys); overlays also contain unrelated keys → REVIEW_REQUIRED where noted |
| VALIDATION_DOCUMENTATION | 0 in product git | YES after copy into repo |
| UNRELATED_CHANGE | 185 | NO |
| UNKNOWN | 9 | REVIEW_REQUIRED |

Exact row counts are in the tables below.

---

## P0_REMEDIATION

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `packages/backend/src/permission/policy.ts` | M | Official Create authorization decision | YES |
| `packages/backend/src/permission/policy.test.ts` | M | Permission / Create audit tests | YES |
| `packages/backend/src/permission/module.ts` | M | Injects durable audit store | YES |
| `packages/backend/src/pilotHardening.test.ts` | M | Hosted overlay / permission / samples | YES |
| `packages/platform-common/src/entitlement-service.ts` | M | Durable audit + authorizeCreate | YES |
| `packages/platform-common/src/entitlement-service.test.ts` | M | Audit / legal / entitlement tests | YES |
| `packages/platform-common/src/entitlements.ts` | M | Audit event fields | YES |
| `packages/platform-common/src/index.ts` | M | Exports (also may export nexora — REVIEW if mixed) | REVIEW_REQUIRED |
| `plugins/entitlements-backend/src/router.ts` | M | Admin audit + register | YES |
| `plugins/entitlements-backend/src/router.test.ts` | M | AWS / register / cookie | YES |
| `plugins/entitlements-backend/src/runtime.ts` | M | Audit path + AWS fail-closed wiring | YES |
| `plugins/entitlements-backend/src/awsMarketplace.test.ts` | M | Fail-closed tests | YES |
| `plugins/data-products-backend/src/router.ts` | M | Authorize on reads/mutations | YES |
| `plugins/data-products-backend/src/router.test.ts` | M | Permission tests | YES |
| `plugins/data-products-backend/src/types.ts` | M | CI status types | YES |
| `plugins/data-products-backend/src/mapCiStatus.test.ts` | M | UNKNOWN / DEGRADED | YES |
| `plugins/data-products-backend/src/releaseRouter.test.ts` | M | Releases authorize | YES |
| `plugins/data-products/src/ciStatus.ts` | M | DEGRADED / UNVERIFIED | YES |
| `plugins/data-products/src/components/CiStatusChip.tsx` | M | CI claim control | YES |
| `plugins/data-products/src/components/CiQualityGateCard.test.tsx` | M | Quality Gate copy | YES |
| `plugins/data-products/src/api.test.ts` | M | CI API | YES |
| `app-config.yaml` | M | permission / audit path / also local samples | REVIEW_REQUIRED |
| `app-config.docker.yaml` | M | permission.enabled; no samples | YES |
| `app-config.production.yaml` | M | permission / audit path | YES |
| `app-config.marketplace-test.yaml` | M | audit path / AWS overlay | YES |
| `.env.example` | M | Env names (must not contain secrets) | YES |

---

## P1_REMEDIATION

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `packages/platform-common/src/create-authorization-audit-store.ts` | ?? | Torn JSONL store | YES |
| `packages/platform-common/src/create-authorization-audit-store.test.ts` | ?? | Torn/malformed tests | YES |
| `packages/backend/src/config/claimControl.test.ts` | ?? | Claim-control scan | YES |
| `packages/backend/src/config/committedConfigIntegrity.test.ts` | ?? | permission / samples / secrets | YES |
| `packages/app/src/modules/composer/ComposePage.tsx` | M | CERTIFIED ≠ GMP | YES |
| `packages/app/src/modules/composer/ComposePage.test.tsx` | M | Claim-control assertions | YES |
| `packages/app/src/modules/releases/ReleaseCatalogPage.tsx` | M | Technical certification copy | YES |
| `plugins/data-products/src/components/DataProductsPage.tsx` | M | May include claim/nav; confirm before freeze | REVIEW_REQUIRED |
| `plugins/data-products/src/navigation.ts` | M | Navigation; may be unrelated UX | REVIEW_REQUIRED |
| `plugins/data-products/src/navigation.test.ts` | M | Same | REVIEW_REQUIRED |
| `packages/platform-common/src/documentation.ts` | M | CI “not GxP” copy | YES |
| `packages/platform-common/src/commercial.ts` | M | Commercial catalog / release helpers | YES |
| `packages/platform-common/src/commercial.test.ts` | M | Same | YES |

---

## REQUIRED_RC1_CONFIGURATION

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `app-config.github.yaml` | unchanged in this list | Publish overlay; no worktree change listed | n/a (clean) |

Worktree overlays already listed under P0. `yarn.lock` is mixed (below).

---

## UNRELATED_CHANGE — Nexora identity / UI

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `README.md` | M | Product identity / Nexora copy | NO |
| `packages/app/src/App.tsx` | M | Loads nexora plugins | NO |
| `packages/app/package.json` | M | Nexora plugin deps | NO |
| `packages/backend/package.json` | M | Nexora backend dep | NO |
| `packages/backend/src/index.ts` | M | Adds `nexora-backend` + existing Core modules | REVIEW_REQUIRED |
| `packages/app/src/modules/identity/HomeGraphics.tsx` | D | Landing rewrite | NO |
| `packages/app/src/modules/identity/ArchitecturePrinciple.tsx` | M | Branding | NO |
| `packages/app/src/modules/identity/LandingSignInPage.test.tsx` | M | Landing | NO |
| `packages/app/src/modules/identity/LearnSection.tsx` | M | Landing | NO |
| `packages/app/src/modules/identity/PublicLanding.test.tsx` | M | Landing | NO |
| `packages/app/src/modules/identity/PublicLanding.tsx` | M | Landing | NO |
| `packages/app/src/modules/identity/landingI18n.tsx` | M | Landing | NO |
| `packages/app/src/modules/identity/landingTokens.ts` | M | Landing | NO |
| `packages/app/src/modules/identity/GoldenPathShowcase.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/GoldenPathShowcase.test.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/HeroScene.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/ConnectionLines.test.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/ConnectionLines.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/HeroArchitecture.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/HeroSection.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/HomeStyles.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/PlatformCore.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/PlatformDashboard.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/SystemNode.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/WhyNexoraSection.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/identity/home/icons.tsx` | ?? | Landing | NO |
| `packages/app/src/modules/nav/BrandMark.tsx` | M | Branding | NO |
| `packages/app/src/modules/nav/LogoFull.tsx` | M | Branding | NO |
| `packages/app/src/modules/nav/LogoIcon.tsx` | M | Branding | NO |
| `packages/app/src/modules/nav/Sidebar.tsx` | M | May add nexora nav | NO |
| `packages/app/src/modules/nav/SidebarLogo.tsx` | M | Branding | NO |
| `packages/app/src/modules/theme/theme.ts` | M | Branding | NO |
| `packages/app/src/modules/theme/theme.test.ts` | M | Branding | NO |
| `packages/app/src/modules/home/HomeDashboard.tsx` | M | Home UX | NO |
| `packages/app/src/modules/home/HomeDashboard.test.tsx` | M | Home UX | NO |
| `packages/app/src/modules/architecture/ArchitecturePage.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/ArchitecturePage.test.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/DeveloperArchitectureDiagram.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/DeveloperArchitecturePage.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/DeveloperArchitecturePage.test.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/constants.ts` | M | Architecture UX | NO |
| `packages/app/src/modules/architecture/diagrams.tsx` | M | Architecture UX | NO |
| `packages/app/src/modules/composer/CompositionArchitectureVisual.tsx` | M | Composer visuals | NO |
| `packages/app/src/modules/developer-hub/DeveloperHubPage.tsx` | M | Copy/UX (DOC URS surface; content change is branding) | REVIEW_REQUIRED |
| `packages/app/src/modules/entitlements/EntitlementsAdminPage.tsx` | M | UX copy | REVIEW_REQUIRED |
| `packages/app/src/modules/entitlements/MarketplaceIntegrationPage.tsx` | M | UX copy | REVIEW_REQUIRED |
| `packages/app/src/modules/platform-components/BuildingBlocksVisual.tsx` | M | Visuals | NO |
| `packages/app/e2e-tests/app.test.ts` | M | E2E vs new landing | NO |
| `plugins/marketplace/src/components/MarketplacePage.tsx` | M | Marketplace UX | REVIEW_REQUIRED |
| `plugins/marketplace/src/data.ts` | M | Offerings + building-block helper | REVIEW_REQUIRED |

---

## UNRELATED_CHANGE — Nexora / AAS plugins and industrial

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `packages/platform-common/src/nexora-industrial.ts` | ?? | Industrial/AAS-adjacent; DEC-SCOPE-001 | NO |
| `packages/platform-common/src/nexora-industrial.test.ts` | ?? | Same | NO |
| `platform-components/asset-semantic/aas-foundation/src/pdf_aas/data/__init__.py` | ?? | AAS; out of Core | NO |
| `plugins/nexora-assets/.eslintrc.js` | ?? | Out of Core | NO |
| `plugins/nexora-assets/package.json` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/components/EquipmentDetailPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/components/EquipmentPage.test.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/components/EquipmentPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/index.ts` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/plugin.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-assets/src/routes.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/.eslintrc.js` | ?? | Out of Core | NO |
| `plugins/nexora-backend/config.d.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/package.json` | ?? | Out of Core | NO |
| `plugins/nexora-backend/src/fixtures.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/src/index.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/src/plugin.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/src/router.test.ts` | ?? | Out of Core | NO |
| `plugins/nexora-backend/src/router.ts` | ?? | Out of Core | NO |
| `plugins/nexora-common/.eslintrc.js` | ?? | Out of Core | NO |
| `plugins/nexora-common/package.json` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/api.test.ts` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/api.ts` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/components/Cards.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/components/StatusBadge.test.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/components/StatusBadge.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/index.ts` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/plugin.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/testUtils.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-common/src/tokens.ts` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/.eslintrc.js` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/package.json` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/components/ContractExplorerPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/components/ProductContractPage.test.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/components/ProductContractPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/index.ts` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/plugin.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-contracts/src/routes.ts` | ?? | Out of Core | NO |
| `plugins/nexora-quality/.eslintrc.js` | ?? | Out of Core | NO |
| `plugins/nexora-quality/package.json` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/components/QualityDetailPage.test.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/components/QualityDetailPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/components/QualityPage.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/index.ts` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/plugin.tsx` | ?? | Out of Core | NO |
| `plugins/nexora-quality/src/routes.ts` | ?? | Out of Core | NO |
| `docs/nexora/asset-explorer.md` | ?? | Out of Core | NO |
| `docs/nexora/contract-explorer.md` | ?? | Out of Core | NO |
| `docs/nexora/index.md` | ?? | Out of Core | NO |
| `docs/nexora/quality-connectivity.md` | ?? | Out of Core | NO |

---

## UNRELATED_CHANGE — OEE Golden Path / pilot (DEC-SCOPE-001 / DEC-OEE-001)

All of the following are **NO** for a minimal Core RC1.

| Path | Status |
| --- | --- |
| `catalog/samples/README.md` | M |
| `catalog/samples/industrial.yaml` | ?? |
| `docs/catalog.md` | M |
| `docs/demo-guide.md` | M |
| `docs/how-to/oee.md` | M |
| `docs/index.md` | M |
| `docs/oee/api.md` | M |
| `docs/oee/calculation.md` | M |
| `docs/oee/contracts.md` | M |
| `docs/oee/decisions.md` | M |
| `docs/oee/domain-model.md` | M |
| `docs/oee/edge-case-matrix.md` | M |
| `docs/oee/index.md` | M |
| `docs/oee/mvp-boundary.md` | M |
| `docs/oee/quality.md` | M |
| `docs/oee/losses.md` | ?? |
| `docs/oee/schemas/oee-result.schema.json` | M |
| `docs/oee/schemas/production-context.schema.json` | M |
| `docs/oee/schemas/counter-event.schema.json` | ?? |
| `docs/oee/schemas/machine-state-event.schema.json` | ?? |
| `docs/releases/oee-1.0.0.md` | M |
| `mkdocs.yml` | M |
| `pilot/oee/generate.py` | M |
| `pilot/oee/tests/test_failures.py` | M |
| `pilot/oee/tests/test_scenarios.py` | M |
| `pilot/oee/tests/test_soak_volume.py` | M |
| `packages/backend/src/oeeGoldenPath.test.ts` | M |
| `packages/backend/src/oeeGoldenPathDesign.test.ts` | M |
| `packages/backend/src/dataProductConformance.test.ts` | M |
| `packages/backend/src/apiIdentityCollision.test.ts` | M |
| `packages/backend/src/templateContract.test.ts` | M |
| `templates/oee-data-product/template.yaml` | M |
| `templates/oee-data-product/content/.env.example` | M |
| `templates/oee-data-product/content/.github/workflows/ci.yml` | M |
| `templates/oee-data-product/content/Dockerfile` | M |
| `templates/oee-data-product/content/README.md` | M |
| `templates/oee-data-product/content/app/config.py` | M |
| `templates/oee-data-product/content/app/domain/calculator.py` | M |
| `templates/oee-data-product/content/app/domain/models.py` | M |
| `templates/oee-data-product/content/app/domain/quality.py` | M |
| `templates/oee-data-product/content/app/domain/timeline.py` | M |
| `templates/oee-data-product/content/app/domain/windows.py` | M |
| `templates/oee-data-product/content/app/ingest.py` | M |
| `templates/oee-data-product/content/app/ingestion/mappings.py` | M |
| `templates/oee-data-product/content/app/main.py` | M |
| `templates/oee-data-product/content/app/quality.py` | M |
| `templates/oee-data-product/content/app/store.py` | M |
| `templates/oee-data-product/content/catalog-info.yaml` | M |
| `templates/oee-data-product/content/compat/published.schema.json` | M |
| `templates/oee-data-product/content/contracts/machine-state-event.schema.json` | M |
| `templates/oee-data-product/content/contracts/oee-result.schema.json` | M |
| `templates/oee-data-product/content/contracts/production-context.schema.json` | M |
| `templates/oee-data-product/content/contracts/quality-count-event.schema.json` | M |
| `templates/oee-data-product/content/docker-compose.yml` | M |
| `templates/oee-data-product/content/docs/api.md` | M |
| `templates/oee-data-product/content/docs/architecture.md` | M |
| `templates/oee-data-product/content/docs/configuration.md` | M |
| `templates/oee-data-product/content/docs/create.md` | M |
| `templates/oee-data-product/content/docs/data-contract.md` | M |
| `templates/oee-data-product/content/docs/index.md` | M |
| `templates/oee-data-product/content/docs/input-contracts.md` | M |
| `templates/oee-data-product/content/docs/oee-model.md` | M |
| `templates/oee-data-product/content/docs/release-notes.md` | M |
| `templates/oee-data-product/content/docs/result-contract.md` | M |
| `templates/oee-data-product/content/docs/troubleshooting.md` | M |
| `templates/oee-data-product/content/mkdocs.yml` | M |
| `templates/oee-data-product/content/tests/conftest.py` | M |
| `templates/oee-data-product/content/tests/fixtures.py` | M |
| `templates/oee-data-product/content/tests/test_api.py` | M |
| `templates/oee-data-product/content/tests/test_compatibility.py` | M |
| `templates/oee-data-product/content/tests/test_contract.py` | M |
| `templates/oee-data-product/content/tests/test_edges.py` | M |
| `templates/oee-data-product/content/tests/test_independence.py` | M |
| `templates/oee-data-product/content/tests/test_model.py` | M |
| `templates/oee-data-product/content/tests/test_scenarios.py` | M |
| `templates/oee-data-product/content/PRODUCT.md` | ?? |
| `templates/oee-data-product/content/app/capabilities.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/__init__.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/availability.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/calculation_status.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/oee.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/performance.py` | ?? |
| `templates/oee-data-product/content/app/domain/calculation/quality.py` | ?? |
| `templates/oee-data-product/content/app/domain/losses.py` | ?? |
| `templates/oee-data-product/content/app/domain/reason_codes.py` | ?? |
| `templates/oee-data-product/content/app/loss_routes.py` | ?? |
| `templates/oee-data-product/content/app/loss_service.py` | ?? |
| `templates/oee-data-product/content/app/query.py` | ?? |
| `templates/oee-data-product/content/capabilities.yaml` | ?? |
| `templates/oee-data-product/content/contracts/asyncapi.yaml` | ?? |
| `templates/oee-data-product/content/contracts/counter-event.schema.json` | ?? |
| `templates/oee-data-product/content/contracts/loss-event.schema.json` | ?? |
| `templates/oee-data-product/content/contracts/openapi.yaml` | ?? |
| `templates/oee-data-product/content/contracts/reason-code.schema.json` | ?? |
| `templates/oee-data-product/content/docs/losses.md` | ?? |
| `templates/oee-data-product/content/docs/product.md` | ?? |
| `templates/oee-data-product/content/tests/test_calculation.py` | ?? |
| `templates/oee-data-product/content/tests/test_loss_api.py` | ?? |
| `templates/oee-data-product/content/tests/test_losses.py` | ?? |
| `templates/oee-data-product/content/tests/test_oee_1_0.py` | ?? |

---

## UNKNOWN / mixed

| Path | Status | Reason | Include |
| --- | --- | --- | --- |
| `yarn.lock` | M | Lockfile mixes Core remediations and Nexora/OEE workspace adds | REVIEW_REQUIRED |
| `packages/platform-common/src/index.ts` | M | Exports Core audit store and possibly industrial | REVIEW_REQUIRED |
| `packages/backend/src/index.ts` | M | Core plugins plus nexora-backend | REVIEW_REQUIRED |
| `catalog/samples/industrial.yaml` | ?? | Local-only sample; not hosted, but new fixture | NO (or REVIEW if local IQ uses it) |
| `packages/app/src/modules/developer-hub/DeveloperHubPage.tsx` | M | DOC surface + branding | REVIEW_REQUIRED |
| `plugins/marketplace/src/data.ts` | M | URS-MKT-002 labels plus catalog edits | REVIEW_REQUIRED |
| `plugins/data-products/src/components/DataProductsPage.tsx` | M | Core UX + possible unrelated | REVIEW_REQUIRED |
| `packages/app/src/modules/entitlements/EntitlementsAdminPage.tsx` | M | Admin UX | REVIEW_REQUIRED |
| `packages/app/src/modules/entitlements/MarketplaceIntegrationPage.tsx` | M | Integration UX | REVIEW_REQUIRED |

---

## Validation package (not in product git)

The entire `IDP/validation/` tree (baseline, reviews, evidence, remediation, execution) is **VALIDATION_DOCUMENTATION**. Include in RC1: **YES**, after copy into `data-product-platform/validation/` per the migration plan. Do not delete the current tree until the copy is verified.

---

## Human decisions required before fix

1. Minimal Core candidate vs product-snapshot candidate.
2. Disposition of every REVIEW_REQUIRED path.
3. Whether `yarn.lock` is regenerated from a Core-only workspace or kept mixed.
4. When to copy `validation/` into the product repo.
