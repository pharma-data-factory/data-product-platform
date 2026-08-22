# Technical Design Specification — Platform Core

**Document ID:** VAL-TDS-PC-001  
**Baseline:** Platform Core Validation Baseline v1.0  
**Document status:** BASELINED  
**Validation status:** NOT_VALIDATED  
**Date:** 2026-08-22  
**Parent SYS:** `System-Specification.md`

This TDS describes **existing** implementation only. It does not invent design. Where the repository does not prove a SYS, the entry is marked **IMPLEMENTATION_NOT_VERIFIED**. TDS-AUTH-005 is historical (parent URS REJECTED).

Paths are relative to `data-product-platform/` unless noted.

---

## TDS-AUTH-001

| Field | Content |
| --- | --- |
| ID | TDS-AUTH-001 |
| Parent SYS | SYS-AUTH-001 |
| Component | Auth backend + Permission backend |
| Paths | `packages/backend/src/index.ts`; `app-config.yaml` (`permission.enabled`) |
| Configuration | `auth.environment`; `auth.providers` |
| Dependencies | `@backstage/plugin-auth-backend`, `@backstage/plugin-permission-backend` |
| How it satisfies | Backstage session identity is required for permission-protected routes. Guest token is required in dev when permission is on (`app-config.yaml` comments). |
| Requirement state | BASELINED |

## TDS-AUTH-002

| Field | Content |
| --- | --- |
| ID | TDS-AUTH-002 |
| Parent SYS | SYS-AUTH-002 |
| Component | Production auth config + access policy |
| Paths | `packages/platform-common/src/accessPolicy.ts`; `app-config.production.yaml`; `packages/backend/src/auth/identity.test.ts` |
| Configuration | Production omits Guest provider (asserted by identity.test.ts) |
| Dependencies | `@backstage/plugin-auth-backend-module-guest-provider` registered in `index.ts` but unused when provider absent |
| How it satisfies | `allowsGuestSignIn` is false when environment is production; production YAML has no guest provider. |
| Requirement state | BASELINED |

## TDS-AUTH-003

| Field | Content |
| --- | --- |
| ID | TDS-AUTH-003 |
| Parent SYS | SYS-AUTH-003 |
| Component | GitHub sign-in resolver + access policy |
| Paths | `app-config.yaml` (`usernameMatchingUserEntityName`, `dangerouslyAllowSignInWithoutUserInCatalog` in **development only**); `accessPolicy.ts` |
| Configuration | Production must not set the dangerous flag (`identity.test.ts`) |
| Dependencies | `@backstage/plugin-auth-backend-module-github-provider` |
| How it satisfies | Production resolver requires Catalog User name match. Policy denies unknown users in production. |
| Requirement state | BASELINED |

## TDS-AUTH-004

| Field | Content |
| --- | --- |
| ID | TDS-AUTH-004 |
| Parent SYS | SYS-AUTH-004 |
| Component | Split GitHub configs |
| Paths | `app-config.yaml` (`AUTH_GITHUB_*`); `app-config.github.yaml` (`GITHUB_APP_*`); comments in both files |
| Configuration | `yarn start:github` loads both configs (`package.json` `start:github`) |
| Dependencies | scaffolder GitHub module |
| How it satisfies | Distinct env keys and file comments forbid mixing login and App secrets. |
| Requirement state | BASELINED |

## TDS-AUTH-005

| Field | Content |
| --- | --- |
| ID | TDS-AUTH-005 |
| Parent SYS | SYS-AUTH-005 |
| Component | Guest provider + org.yaml |
| Paths | `app-config.yaml` guest block; `catalog/org.yaml` user guest; `packages/app/src/modules/identity/guestIdentity.ts` |
| Configuration | Guest `ownershipEntityRefs` include `data-product-developers` |
| Dependencies | guest-provider |
| How it satisfies | Historical DEVELOPMENT_ONLY Guest mapping. Not an active design obligation. Residual privilege if Guest leaks to production: RA-002. |
| Requirement state | REJECTED |

## TDS-RBAC-001

| Field | Content |
| --- | --- |
| ID | TDS-RBAC-001 |
| Parent SYS | SYS-RBAC-001 |
| Component | platform-common roles |
| Paths | `packages/platform-common/src/roles.ts`; `catalog/org.yaml` |
| Configuration | Group names must match `PLATFORM_GROUPS` |
| Dependencies | Catalog User/Group entities |
| How it satisfies | `GROUP_TO_ROLE` maps the four groups to VIEWER / DEVELOPER / DATA_PRODUCT_OWNER / PLATFORM_ADMIN. |
| Requirement state | BASELINED |

## TDS-RBAC-002

| Field | Content |
| --- | --- |
| ID | TDS-RBAC-002 |
| Parent SYS | SYS-RBAC-002 |
| Component | decidePermission + PlatformPermissionPolicy |
| Paths | `packages/platform-common/src/policy.ts`; `packages/backend/src/permission/policy.ts` |
| Configuration | none beyond identity ownership refs |
| Dependencies | Permission Framework |
| How it satisfies | No role → `deny`. Policy uses `hasApprovedPlatformAccess` before resolving role. |
| Requirement state | BASELINED |

## TDS-RBAC-003

| Field | Content |
| --- | --- |
| ID | TDS-RBAC-003 |
| Parent SYS | SYS-RBAC-003 |
| Component | Permission policy module |
| Paths | `packages/backend/src/permission/module.ts`; `policy.ts` |
| Configuration | `permission.enabled: true` |
| Dependencies | `@backstage/plugin-permission-backend` |
| How it satisfies | Backend `handle()` is the authorization decision. Frontend helpers are not the policy. |
| Note | UI does not call `usePermission`. API-level enforcement depends on each router calling authorize. **IMPLEMENTATION_NOT_VERIFIED** that every custom route authorizes (nexora-industrial uses default backend auth per Phase 1). |
| Requirement state | BASELINED |

## TDS-RBAC-004 … TDS-RBAC-007

| ID | Parent SYS | Implementation |
| --- | --- | --- |
| TDS-RBAC-004 | SYS-RBAC-004 | `permissions.ts` `VIEWER_PERMISSION_NAMES` |
| TDS-RBAC-005 | SYS-RBAC-005 | `DEVELOPER_PERMISSION_NAMES` + scaffolder names |
| TDS-RBAC-006 | SYS-RBAC-006 | `OWNER_PERMISSION_NAMES` adds certification/governance/aas.manage |
| TDS-RBAC-007 | SYS-RBAC-007 | `ADMIN_PERMISSION_NAMES` adds admin/release/entitlement.admin |

Configuration: `catalog/org.yaml` membership. Tests: `packages/platform-common/src/policy.test.ts`; `packages/backend/src/permission/policy.test.ts`. Status: PROPOSED.

AAS permissions exist in the sets but AAS is **out of this baseline**. They are listed only because they appear in the same permission objects.

## TDS-ENT-001

| Field | Content |
| --- | --- |
| ID | TDS-ENT-001 |
| Parent SYS | SYS-ENT-001 |
| Component | PlatformPermissionPolicy commercial gate + EntitlementService |
| Paths | `packages/backend/src/permission/policy.ts`; `packages/platform-common/src/entitlement-service.ts`; `config/commercial-products.yaml` |
| Configuration | `commercial.localEntitlements`; `commercial.entitlementProvider` |
| Dependencies | product catalog mapping templateId → productId |
| How it satisfies | After RBAC allow, scaffolder template permissions call `hasEntitlement` for commercially offered products. |
| Requirement state | BASELINED |

## TDS-ENT-002

| Field | Content |
| --- | --- |
| ID | TDS-ENT-002 |
| Parent SYS | SYS-ENT-002 |
| Component | authorizeCreate |
| Paths | `packages/platform-common/src/entitlement-service.ts` |
| Configuration | none |
| Dependencies | `canCreateDataProduct` vs `hasEntitlement` |
| How it satisfies | Sequential checks set distinct `reason` values. |
| Requirement state | BASELINED |

## TDS-ENT-003

| Field | Content |
| --- | --- |
| ID | TDS-ENT-003 |
| Parent SYS | SYS-ENT-003 |
| Component | Marketplace registration router |
| Paths | `plugins/entitlements-backend/src/registration.ts`; `plugins/entitlements-backend/src/router.ts` (`POST /marketplace/register` unauthenticated) |
| Configuration | AWS marketplace config keys |
| Dependencies | link store |
| How it satisfies | Architecture states no tenant/session. **IMPLEMENTATION_NOT_VERIFIED** that register cannot mint a Backstage cookie. |
| Requirement state | BASELINED |

## TDS-ENT-004

| Field | Content |
| --- | --- |
| ID | TDS-ENT-004 |
| Parent SYS | SYS-ENT-004 |
| Component | AWS Marketplace adapter |
| Paths | `plugins/entitlements-backend/src/awsMarketplace.ts`; `plugins/entitlements-backend/src/runtime.ts` |
| Configuration | `commercial.environment`; `commercial.entitlementProvider` |
| Dependencies | AWS SDK (when configured) |
| How it satisfies | Product docs claim fail-closed. **IMPLEMENTATION_NOT_VERIFIED** in this TDS pending line-level human review. |
| Requirement state | BASELINED |

## TDS-LEG-001

| Field | Content |
| --- | --- |
| ID | TDS-LEG-001 |
| Parent SYS | SYS-LEG-001 |
| Component | PlatformEntitlementService.authorizeCreate |
| Paths | `packages/platform-common/src/entitlement-service.ts`; `packages/platform-common/src/entitlement-service.test.ts` |
| Configuration | `commercial.legalDistributionStatus` default BLOCKED (`app-config.yaml`) |
| Dependencies | `LegalDistributionStatus` |
| How it satisfies | Current code denies when `handoff === 'customer'` and status ≠ APPROVED (Customer Handoff). Permission policy does **not** repeat this check (internal Scaffolder Create is not a Legal Gate operation). OPEN-LEG-001 CLOSED (DEC-LEGAL-002). Other listed commercial operations: NOT_APPLICABLE_CURRENT_RELEASE. |
| Requirement state | BASELINED |

Residual: RA-006 (process control for unimplemented commercial operations; risk not accepted).

## TDS-LEG-002

| Field | Content |
| --- | --- |
| ID | TDS-LEG-002 |
| Parent SYS | SYS-LEG-002 |
| Component | Status model + UI copy |
| Paths | `docs/status-model.md`; `plugins/marketplace/src/data.ts`; OEE template/docs disclaimers |
| Configuration | none |
| Dependencies | none |
| How it satisfies | Documented four dimensions; product strings include “not GxP”. Completeness of every screen: **IMPLEMENTATION_NOT_VERIFIED**. |
| Requirement state | BASELINED |

## TDS-CAT-001

| Field | Content |
| --- | --- |
| ID | TDS-CAT-001 |
| Parent SYS | SYS-CAT-001 |
| Component | Catalog backend |
| Paths | `packages/backend/src/index.ts`; `app-config.yaml` `catalog.locations` |
| Configuration | location targets under `catalog/`, `templates/`, `platform-components/` |
| Dependencies | `@backstage/plugin-catalog-backend` |
| How it satisfies | File locations ingest entities. |
| Requirement state | BASELINED |

## TDS-CAT-002

| Field | Content |
| --- | --- |
| ID | TDS-CAT-002 |
| Parent SYS | SYS-CAT-002 |
| Component | Config overlays |
| Paths | `app-config.yaml` includes `catalog/samples/`; production/docker must omit |
| Configuration | overlay files |
| Dependencies | none |
| How it satisfies | Pilot Exit states production does not load samples. **IMPLEMENTATION_NOT_VERIFIED** here without quoting docker/production YAML in this review pass — human reviewer must open those files. |
| Requirement state | BASELINED |

## TDS-CAT-003

| Field | Content |
| --- | --- |
| ID | TDS-CAT-003 |
| Parent SYS | SYS-CAT-003 |
| Component | data-products frontend plugin |
| Paths | `plugins/data-products/src/plugin.tsx` |
| Configuration | none |
| Dependencies | Catalog API |
| How it satisfies | Routes `/data-products` and `/data-products/:name`. |
| Requirement state | BASELINED |

## TDS-SCF-001

| Field | Content |
| --- | --- |
| ID | TDS-SCF-001 |
| Parent SYS | SYS-SCF-001 |
| Component | Scaffolder + GitHub publisher |
| Paths | `packages/backend/src/index.ts`; official `templates/*/template.yaml` `publish:github` |
| Configuration | GitHub App via `app-config.github.yaml` |
| Dependencies | `@backstage/plugin-scaffolder-backend`, `plugin-scaffolder-backend-module-github` |
| How it satisfies | Standard Backstage publish action. Interactive OAuth Create: Evidence: NOT ESTABLISHED. |
| Requirement state | BASELINED |

## TDS-SCF-002

| Field | Content |
| --- | --- |
| ID | TDS-SCF-002 |
| Parent SYS | SYS-SCF-002 |
| Component | authorize-create API |
| Paths | `plugins/entitlements-backend/src/router.ts`; `entitlement-service.ts` |
| Configuration | commercial.* |
| Dependencies | identity → role |
| How it satisfies | POST returns structured CreateAuthorization. |
| Requirement state | BASELINED |

## TDS-SCF-003

| Field | Content |
| --- | --- |
| ID | TDS-SCF-003 |
| Parent SYS | SYS-SCF-003 |
| Component | Release catalog |
| Paths | `packages/platform-common/src/releases.ts`; `packages/platform-common/src/golden-path-releases.json`; permission policy GA check |
| Configuration | optional release overlay API (`/api/data-products/releases`) |
| Dependencies | none |
| How it satisfies | Official IDs gated by `isGenerallyAvailableRelease` / `canCreateOfficialGoldenPath`. |
| Requirement state | BASELINED |

## TDS-GH-001

| Field | Content |
| --- | --- |
| ID | TDS-GH-001 |
| Parent SYS | SYS-GH-001 |
| Component | GitHub App integration |
| Paths | `app-config.github.yaml` |
| Configuration | `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` |
| Dependencies | GitHub.com |
| How it satisfies | App credentials for publish. |
| Requirement state | BASELINED |

## TDS-GH-002

| Field | Content |
| --- | --- |
| ID | TDS-GH-002 |
| Parent SYS | SYS-GH-002 |
| Component | Config visibility |
| Paths | `app-config.yaml` (`clientId` `@visibility frontend`; clientSecret not marked frontend) |
| Configuration | env |
| Dependencies | Backstage config visibility |
| How it satisfies | clientId may be public. Secrets/tokens/keys must not appear in source, artifacts, logs, UI, or public config. Artifact/log/UI proof: Evidence: NOT ESTABLISHED. |
| Requirement state | BASELINED |

## TDS-GH-003

| Field | Content |
| --- | --- |
| ID | TDS-GH-003 |
| Parent SYS | SYS-GH-003 |
| Component | data-products-backend GitHub Actions client |
| Paths | `plugins/data-products-backend/src/githubActions.ts`; `resolveCiStatus.ts`; `router.ts` GET `/ci-status` |
| Configuration | same GitHub App; requires Actions Read-only for success |
| Dependencies | GitHub API |
| How it satisfies | Server-side fetch of `ci.yml` latest run. Missing permission currently yields UNKNOWN. DEC-CI-001: UNKNOWN must never be PASS; must be shown as DEGRADED / UNVERIFIED. That representation is **IMPLEMENTATION_NOT_VERIFIED**. |
| Requirement state | BASELINED |

## TDS-CI-001

| Field | Content |
| --- | --- |
| ID | TDS-CI-001 |
| Parent SYS | SYS-CI-001 |
| Component | Developer Hub / Quality Gate copy |
| Paths | `packages/platform-common/src/documentation.ts`; `plugins/data-products/src/components/CiQualityGateCard.tsx` |
| Configuration | none |
| Dependencies | none |
| How it satisfies | Text states not GxP. |
| Requirement state | BASELINED |

## TDS-AUD-001

| Field | Content |
| --- | --- |
| ID | TDS-AUD-001 |
| Parent SYS | SYS-AUD-001 |
| Component | Permission policy Create decision + durable JSONL store |
| Paths | `packages/backend/src/permission/policy.ts`; `packages/backend/src/permission/module.ts`; `packages/platform-common/src/create-authorization-audit-store.ts`; `plugins/entitlements-backend/src/router.ts` admin GET |
| Configuration | `commercial.createAuthorizationAuditPath` (default `.runtime/create-authorization-audit.jsonl`) |
| Dependencies | Permission Framework; filesystem path shared by policy and entitlements runtime |
| How it satisfies | The authoritative Create authorization decision is `PlatformPermissionPolicy.handle()`. Validation-relevant permissions (`scaffolder.task.create`, `scaffolder.action.execute`, `data-product.create`) are appended after the existing allow/deny computation. Records include actor, timestamp, action, GRANT/DENY, and authorization context. `list()` keeps valid prior records readable when the final JSONL line is torn or a line is not a well-formed event; malformed bytes stay on disk and are reported as `auditIssues` (`MALFORMED_JSON` / `MALFORMED_RECORD`). `POST /authorize-create` may also append if called; it is not a substitute for the policy path. Not Part 11. Formal restart OQ: NOT_EXECUTED. |
| Requirement state | BASELINED |

## TDS-AUD-002

| Field | Content |
| --- | --- |
| ID | TDS-AUD-002 |
| Parent SYS | SYS-AUD-002 |
| Component | Certification API + overlay |
| Paths | `plugins/data-products-backend/src/router.ts`; `certificationOverlay.ts`; `catalog/certification-overrides.json` |
| Configuration | `dataProducts.certification.overlayPath` |
| Dependencies | permission `data-product.certification.manage` |
| How it satisfies | POST authorized; annotation/overlay technical statuses only. |
| Requirement state | BASELINED |

## TDS-DATA-001

| Field | Content |
| --- | --- |
| ID | TDS-DATA-001 |
| Parent SYS | SYS-DATA-001 |
| Component | Backstage database |
| Paths | `app-config.yaml` better-sqlite3 `.sqlite`; `docker-compose.yml` `postgres:16-alpine`; production `pg` env |
| Configuration | `POSTGRES_*` |
| Dependencies | `better-sqlite3`, `pg` (`packages/backend/package.json`) |
| How it satisfies | Client switches by config file. |
| Requirement state | BASELINED |

## TDS-DATA-002

| Field | Content |
| --- | --- |
| ID | TDS-DATA-002 |
| Parent SYS | SYS-DATA-002 |
| Component | Env-based secrets |
| Paths | `app-config.yaml`; `app-config.github.yaml`; `app-config.production.yaml` |
| Configuration | `.env` local (not a validation record) |
| Dependencies | none |
| How it satisfies | Placeholders only in committed YAML reviewed here. Whole-repo secret scan: Evidence: NOT ESTABLISHED. |
| Requirement state | BASELINED |

## TDS-CFG-001

| Field | Content |
| --- | --- |
| ID | TDS-CFG-001 |
| Parent SYS | SYS-CFG-001 |
| Component | Layered app-config |
| Paths | `app-config.yaml`, `.local.yaml`, `.github.yaml`, `.docker.yaml`, `.production.yaml`, `.marketplace-test.yaml` |
| Configuration | Backstage `--config` chain |
| Dependencies | none |
| How it satisfies | Overlay model. IQ of a specific host: Evidence: NOT ESTABLISHED. |
| Requirement state | BASELINED |

## TDS-CFG-002

| Field | Content |
| --- | --- |
| ID | TDS-CFG-002 |
| Parent SYS | SYS-CFG-002 |
| Component | permission.enabled |
| Paths | `app-config.yaml` |
| Configuration | must remain true |
| Dependencies | permission backend |
| How it satisfies | Flag present in base config. Overlays: **IMPLEMENTATION_NOT_VERIFIED**. |
| Requirement state | BASELINED |

## TDS-MKT-001

| Field | Content |
| --- | --- |
| ID | TDS-MKT-001 |
| Parent SYS | SYS-MKT-001 |
| Component | marketplace plugin |
| Paths | `plugins/marketplace/` |
| Configuration | none (static + catalog enrichment) |
| Dependencies | entitlements for Create CTA |
| How it satisfies | Technical listing; no payment engine (`PRODUCT.md`). |
| Requirement state | BASELINED |

## TDS-MKT-002

| Field | Content |
| --- | --- |
| ID | TDS-MKT-002 |
| Parent SYS | SYS-MKT-002 |
| Component | marketplace curated data |
| Paths | `plugins/marketplace/src/data.ts` |
| Configuration | none |
| Dependencies | none |
| How it satisfies | Labels must be human-checked. **IMPLEMENTATION_NOT_VERIFIED** for every item. |
| Requirement state | BASELINED |

## TDS-DOC-001

| Field | Content |
| --- | --- |
| ID | TDS-DOC-001 |
| Parent SYS | SYS-DOC-001 |
| Component | Developer Hub + TechDocs |
| Paths | `packages/app/src/modules/developer-hub`; TechDocs backend in `index.ts`; `mkdocs.yml` |
| Configuration | `techdocs.builder: local` in `app-config.yaml` |
| Dependencies | Docker or local generator |
| How it satisfies | Hosted docs. Fixture search index empty in Pilot Exit. |
| Requirement state | BASELINED |

## TDS-SRC-001

| Field | Content |
| --- | --- |
| ID | TDS-SRC-001 |
| Parent SYS | SYS-SRC-001 |
| Component | Search backend |
| Paths | `index.ts` search + catalog + techdocs modules |
| Configuration | none additional in base file reviewed |
| Dependencies | database for index |
| How it satisfies | Stock Backstage search wiring. |
| Requirement state | BASELINED |

## TDS-CERT-001

| Field | Content |
| --- | --- |
| ID | TDS-CERT-001 |
| Parent SYS | SYS-CERT-001 |
| Component | Certification overlay processor |
| Paths | `plugins/data-products-backend/src/certificationOverlay.ts`; `certificationProcessor.ts`; `catalogModule.ts` |
| Configuration | `dataProducts.certification.overlayPath` |
| Dependencies | Catalog |
| How it satisfies | Annotation canonical; JSON overlay documented. File is mutable — not WORM. |
| Requirement state | BASELINED |

---

## Count

38 active BASELINED TDS items. TDS-AUTH-005 is REJECTED (historical).

## IMPLEMENTATION_NOT_VERIFIED summary

| TDS | Reason |
| --- | --- |
| TDS-RBAC-003 (partial) | Not every custom route proven to call authorize |
| TDS-ENT-003 | No witnessed proof register cannot create a session |
| TDS-ENT-004 | AWS fail-closed not line-reviewed in this pass |
| TDS-LEG-002 (partial) | Not every UI surface reviewed |
| TDS-CAT-002 | Production/docker YAML not re-quoted here |
| TDS-CFG-002 | Overlay permission flag not re-quoted |
| TDS-MKT-002 | Label audit not performed |
| TDS-GH-002 | No bundle secret scan |

## Upstream vs custom

| Kind | Examples |
| --- | --- |
| Backstage upstream (configured, not specified as custom design) | Catalog, Scaffolder, Auth, Search, TechDocs, Permission engine |
| Custom design | `PlatformPermissionPolicy`, `PlatformEntitlementService`, accessPolicy, certification overlay, CI status client, marketplace plugin, Nexora UI modules |
