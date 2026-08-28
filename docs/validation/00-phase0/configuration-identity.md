# Configuration Identity — CSV Phase 0

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-CI-001 |
| Phase | CSV Phase 0 — Configuration Management foundation |
| Product validation status | **NOT_VALIDATED** (must not be changed by this document) |
| Document status | DRAFT — Configuration Management record candidate |
| Assessment input | `docs/assessment/CURRENT-IMPLEMENTATION-STATUS.md`, `docs/assessment/current-implementation-status.yaml` |
| Recorded on | 2026-08-23 |

---

## 1. Freeze status

```text
BASELINE NOT YET FROZEN
```

**Reason:** The Git working tree is **dirty** (modified and untracked files, including untracked `plugins/validation-expert*`, `plugins/plugin-directory*`). A dirty tree is **not** a controlled validation configuration identity.

This Phase 0 package identifies a **baseline candidate** and entry criteria. It does **not** freeze, tag, or validate the system.

---

## 2. Repository identity (observed 2026-08-23)

| Attribute | Value | Evidence |
| --- | --- | --- |
| Repository name | `data-product-platform` | `git remote` / package root |
| Remote | `https://github.com/pharma-data-factory/data-product-platform.git` | `git remote -v` |
| Branch | `main` | `git branch --show-current` |
| HEAD commit SHA | `6e8318a093da871a665df92c2ac004d895a49b1f` | `git rev-parse HEAD` |
| Relation to origin | `main...origin/main [ahead 7]` | `git status -sb` |
| Working tree | **DIRTY** (~71 porcelain entries) | `git status --porcelain` |
| Existing related tags (not Phase-0 freeze) | `platform-core-v1.0-rc1`, `platform-core-v1.0-rc2` | `git tag --list` |

**Authoritative product validation flag (unchanged):**

| Source | Value |
| --- | --- |
| `validation/baseline/BASELINE.yaml` | `validation_status: NOT_VALIDATED` |
| Assessment YAML | `product_validation_status: NOT_VALIDATED` |

---

## 3. Platform stack identity

| Attribute | Value | Evidence |
| --- | --- | --- |
| Backstage version | `1.53.0` | `backstage.json` |
| Node engines | `22 \|\| 24` | root `package.json` |
| Node observed (assessment host) | `v22.12.0` | `node -v` |
| Package manager | Yarn `4.13.0` (Corepack) | `packageManager` / `yarn -v` |
| Python observed (assessment host) | `3.11.9` | `python --version` |
| Python required by official GP templates | `>=3.12` (template metadata) | template `pyproject.toml` / packaging |
| Docker observed | `29.5.3` | `docker -v` |
| Local DB technology | better-sqlite3 / SQLite files under gitignored path | `app-config.yaml` + assessment |
| Compose / validation DB | PostgreSQL 16 (`postgres:16-alpine`) | `docker-compose.yml`, `docker-compose.validation.yml` |

---

## 4. Runtime / environment configuration (identity-relevant)

| Item | Identity note |
| --- | --- |
| Primary config | `app-config.yaml` (+ overlays: local, production, docker, github, marketplace-test) |
| Secrets | Loaded via environment / `.env` (gitignored); examples only in repo |
| Auth (development) | Guest provider configured; GitHub OAuth configured via env |
| Auth (production/docker overlays) | Guest forbidden (per Compose/config comments and overlays) |
| Permissions | `permission.enabled: true` |
| Local ports (observed) | Backend `:7007` (dev), validation Compose `:7008`; frontend `:3000` not verified during AS-IS |

Environment-specific secrets and host paths are **local-only** and are not part of a frozen software baseline until captured in a controlled environment record (IQ/OQ environment definition).

---

## 5. HEAD plugin / package set (committed configuration)

Plugins present under `HEAD:plugins` (verified via `git ls-tree HEAD:plugins`):

- `data-products`, `data-products-backend`
- `entitlements-backend`
- `marketplace`
- `nexora-assets`, `nexora-backend`, `nexora-common`, `nexora-contracts`, `nexora-quality`

**Not in HEAD (working-tree only — must not be treated as frozen baseline components):**

- `plugins/validation-expert`, `plugins/validation-expert-backend`
- `plugins/plugin-directory`, `plugins/plugin-directory-backend`

Packages of identity interest: `packages/app`, `packages/backend`, `packages/platform-common`.

---

## 6. Golden Path / template identity (repository content)

| Template directory | Role | Notes |
| --- | --- | --- |
| `templates/mqtt-temperature-product` | Official Golden Path candidate | Content tests executed in AS-IS |
| `templates/rest-equipment-product` | Official Golden Path candidate | Content tests executed in AS-IS |
| `templates/oee-data-product` | Official Golden Path; commercial FUTURE | Content tests executed in AS-IS |
| `templates/python-service`, `templates/node-service`, `templates/mqtt-connector` | Supporting / non-core | Not Platform Core by default |
| `templates/machine-state-consumer` | Composition / reference | Not official commercial GP per product docs |
| `templates/unified-namespace` | DEVELOPMENT | Out of Platform Core baseline candidate |
| `templates/aas-asset` | DEVELOPMENT / Level 0 scaffold | Out of Platform Core baseline candidate |

Template **semantic versions** are defined per template metadata (e.g. `dataprod.platform/templateVersion` where present). Exact per-template version pins for freeze must be extracted at freeze time from the tagged commit.

---

## 7. Baseline candidate naming (not applied)

Proposed future freeze identity (when entry criteria pass):

| Field | Proposed value |
| --- | --- |
| Baseline name | PLATFORM CORE VALIDATION BASELINE 0.1 |
| Recommended tag | `platform-core-v0.1.0-csv-baseline` |
| Basis commit | Must be a **clean** commit (not current dirty WT) |

---

## 8. Alignment with existing requirements baseline package

A requirements package already exists under `validation/baseline/` (`BASELINE.yaml`, status `BASELINED`, `validation_status: NOT_VALIDATED`). That package is a **requirements** baseline, not a frozen **software configuration** baseline for CSV execution.

Phase 0 separates:

1. **Requirements baseline** (already BASELINED / NOT_VALIDATED)  
2. **Software configuration identity** (this document — **NOT YET FROZEN**)

---

## 9. Statements requiring human confirmation

- Whether freeze uses HEAD `6e8318a093da871a665df92c2ac004d895a49b1f` after WIP is parked, or a new commit that intentionally includes selected WIP.
- Whether RC2 tag `platform-core-v1.0-rc2` is superseded by, or referenced from, CSV Baseline 0.1.
- Environment of record for IQ (developer host vs `docker-compose.validation.yml`).

**AI recommendation only — no approval implied.**
