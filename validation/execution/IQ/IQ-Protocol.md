# IQ Protocol — Platform Core 1.0-RC1

| Field | Value |
| --- | --- |
| Document | VAL-IQ-PC-RC1 |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Candidate | 1.0-RC1 |
| Validation status | NOT_VALIDATED |
| Execution | **NOT_EXECUTED** |

Installation Qualification confirms the candidate is installed and configured as specified. It does not demonstrate operational use (OQ) or intended-use journeys (UAT).

All Actual Result and Status fields below are **NOT_EXECUTED**.

---

## IQ-001 — Candidate identity

| Field | Content |
| --- | --- |
| ID | IQ-001 |
| Objective | Record the running candidate version and Git identity |
| Related requirement(s) | URS-CFG-001 |
| Preconditions | Access to the verification host and `validation/execution/RC1-Manifest.yaml` |
| Procedure | Compare running image/build metadata to the manifest. Record commit, branch, and whether the worktree/image is dirty relative to HEAD `d96ab0cbd97ea86314ddcbd468ff5faf756df212`. |
| Expected Result | Identity is recorded. Discrepancies are findings. A dirty worktree is reported, not hidden. |
| Evidence Required | Version/commit printout; image tag if used |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-002 — Production configuration overlay

| Field | Content |
| --- | --- |
| ID | IQ-002 |
| Objective | Confirm the hosted instance loads the intended production/docker overlays |
| Related requirement(s) | URS-CFG-001, URS-CFG-002, TEST-CFG-001 |
| Preconditions | Hosted or compose start command known |
| Procedure | Record the `--config` chain (expected: `app-config.yaml` + `app-config.docker.yaml` and/or `app-config.production.yaml` + `app-config.github.yaml` as applicable). |
| Expected Result | Overlay set matches the intended hosted profile. Guest-enabled local-only yaml is not the sole hosted config. |
| Evidence Required | Process command line or start script excerpt |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-003 — Permission Framework enabled

| Field | Content |
| --- | --- |
| ID | IQ-003 |
| Objective | Confirm `permission.enabled` is true on the running hosted configuration |
| Related requirement(s) | URS-RBAC-001, URS-CFG-001, RA-003 |
| Preconditions | IQ-002 |
| Procedure | Inspect merged configuration for `permission.enabled`. |
| Expected Result | `enabled: true`. No hosted overlay sets `false`. |
| Evidence Required | Merged config excerpt |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-004 — Authentication provider configuration

| Field | Content |
| --- | --- |
| ID | IQ-004 |
| Objective | Confirm production-like auth uses GitHub OAuth and omits Guest |
| Related requirement(s) | URS-AUTH-001, URS-AUTH-002, URS-AUTH-003 |
| Preconditions | Hosted overlay loaded |
| Procedure | Inspect `auth.environment` and `auth.providers`. Confirm Guest is absent on hosted overlays. Confirm GitHub provider keys are env-substituted. |
| Expected Result | `auth.environment` is production on docker/production overlays. Guest provider is omitted. No hard-coded OAuth secret. |
| Evidence Required | Redacted config excerpt |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-005 — Database connectivity

| Field | Content |
| --- | --- |
| ID | IQ-005 |
| Objective | Confirm hosted Backstage state uses PostgreSQL |
| Related requirement(s) | URS-DATA-001, RA-018 |
| Preconditions | Postgres service running |
| Procedure | Confirm `backend.database.client` is `pg` on docker/production. Confirm a successful connection (health or backend start log). |
| Expected Result | Hosted instance is not using SQLite. Database is reachable. |
| Evidence Required | Config excerpt; connection/health log (no passwords) |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-006 — Audit persistence configuration

| Field | Content |
| --- | --- |
| ID | IQ-006 |
| Objective | Confirm Create-authorization audit path is configured and writable |
| Related requirement(s) | URS-AUD-001, RA-007 |
| Preconditions | IQ-002 |
| Procedure | Inspect `commercial.createAuthorizationAuditPath`. Confirm the directory exists or is created on first write and is on a persistent volume if hosted. |
| Expected Result | Path is present after merge. Default `.runtime/create-authorization-audit.jsonl` is accepted only if the volume is durable for the intended host. |
| Evidence Required | Config excerpt; path listing (no audit content required) |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-007 — Required plugins and modules

| Field | Content |
| --- | --- |
| ID | IQ-007 |
| Objective | Confirm Core plugins/modules are loaded |
| Related requirement(s) | URS-CFG-001 |
| Preconditions | Backend started |
| Procedure | Confirm permission policy module, entitlements backend, data-products backend, catalog, scaffolder, auth, and search/techdocs are present in the running backend. |
| Expected Result | Modules listed in `packages/backend/src/index.ts` for Core are loaded. AAS/Nexora industrial plugins may be loaded but remain out of Core validation scope. |
| Evidence Required | Startup log or module list |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-008 — Production catalog configuration

| Field | Content |
| --- | --- |
| ID | IQ-008 |
| Objective | Confirm hosted catalog locations are the production set |
| Related requirement(s) | URS-CAT-001, URS-CAT-002 |
| Preconditions | IQ-002 |
| Procedure | Record merged `catalog.locations`. |
| Expected Result | Hosted locations include org/entities/templates as specified by docker/production overlays, not local-only sample files. |
| Evidence Required | Merged locations list |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-009 — Sample catalog absence

| Field | Content |
| --- | --- |
| ID | IQ-009 |
| Objective | Confirm hosted catalog does not register `catalog/samples/` |
| Related requirement(s) | URS-CAT-002, RA-010, TEST-CAT-002, TEST-IQ-001 |
| Preconditions | IQ-008; catalog ingest complete |
| Procedure | Confirm merged locations omit `catalog/samples`. Query catalog for a known sample-only entity and expect it absent. |
| Expected Result | No `catalog/samples` location. Sample-only entities are not present. |
| Evidence Required | Locations excerpt; catalog query result |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-010 — Secret configuration mechanism

| Field | Content |
| --- | --- |
| ID | IQ-010 |
| Objective | Confirm secrets are supplied by environment substitution, not committed values |
| Related requirement(s) | URS-DATA-002, URS-GH-002, RA-010 |
| Preconditions | Access to committed app-config overlays (not `.env` contents in evidence) |
| Procedure | Review committed overlays for secret keys. Confirm values are `${ENV}` placeholders. Do not copy secret values into evidence. |
| Expected Result | No committed raw secrets. Public `clientId` may appear as configured. |
| Evidence Required | Redacted overlay excerpts |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-011 — Dependency inventory

| Field | Content |
| --- | --- |
| ID | IQ-011 |
| Objective | Record SOUP / lockfile identity for the candidate |
| Related requirement(s) | DEC-SOUP-001, RA-013 |
| Preconditions | `yarn.lock` available |
| Procedure | Record Node, Yarn, and `@backstage/cli` declared versions. Record lockfile presence. A signed SOUP assessment is not created here. |
| Expected Result | Inventory recorded. Missing signed SOUP assessment is noted as NOT_ESTABLISHED, not invented. |
| Evidence Required | Version list; lockfile hash if computed |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-012 — SBOM

| Field | Content |
| --- | --- |
| ID | IQ-012 |
| Objective | Attach an SBOM if one exists for the candidate |
| Related requirement(s) | DEC-SOUP-001, RA-013 |
| Preconditions | None |
| Procedure | Search the candidate for an SBOM artifact. If none, record NOT_ESTABLISHED. |
| Expected Result | SBOM attached **or** explicitly NOT_ESTABLISHED. Do not fabricate an SBOM. |
| Evidence Required | SBOM path or written NOT_ESTABLISHED |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-013 — Build artifact

| Field | Content |
| --- | --- |
| ID | IQ-013 |
| Objective | Identify the backend/frontend build or image used for verification |
| Related requirement(s) | URS-CFG-001 |
| Preconditions | Build or image available |
| Procedure | Record image tag and/or `yarn build:backend` artifact identity. |
| Expected Result | A single artifact identity is recorded for the execution environment. |
| Evidence Required | Image digest or build log excerpt |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-014 — Runtime versions

| Field | Content |
| --- | --- |
| ID | IQ-014 |
| Objective | Record runtime versions on the verification host |
| Related requirement(s) | URS-CFG-001 |
| Preconditions | Host access |
| Procedure | Record Node, OS, Postgres (if hosted), and container runtime versions actually used. |
| Expected Result | Versions recorded. Manifest observed values may be used as a starting point and must be confirmed. |
| Evidence Required | `node -v`, `yarn -v`, Postgres version |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-015 — Environment variables (names)

| Field | Content |
| --- | --- |
| ID | IQ-015 |
| Objective | Confirm required secret-bearing environment variable *names* are set, without recording values |
| Related requirement(s) | URS-AUTH-004, URS-GH-001, URS-DATA-002 |
| Preconditions | Hosted GitHub/Postgres intended |
| Procedure | Check presence of `AUTH_GITHUB_*`, `GITHUB_APP_*` / `GITHUB_PRIVATE_KEY` as required by the profile, and Postgres variables. Record only set/unset. |
| Expected Result | Required names are set for the chosen profile. Values are not copied into the evidence pack. |
| Evidence Required | Name/presence checklist |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |

## IQ-016 — Health endpoints

| Field | Content |
| --- | --- |
| ID | IQ-016 |
| Objective | Confirm Core health endpoints respond on the installed instance |
| Related requirement(s) | URS-CFG-001 |
| Preconditions | Backend listening |
| Procedure | Call documented health endpoints (backend health; entitlements health if present). |
| Expected Result | Health responses indicate the process is up. This is not an OQ of authorization. |
| Evidence Required | HTTP status and redacted body |
| Actual Result | NOT_EXECUTED |
| Status | NOT_EXECUTED |
