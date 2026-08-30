# PHARMA DATA FACTORY — PLATFORM GUARDRAILS REPORT

**Gate:** Complete Platform Guardrails — automated Backstage Core + dependency protection
**Date:** 2026-08-29
**Status:** Implemented, executed, negatively tested. No Backstage Core or dependency changes.
**Evidence key:** CODE_INSPECTED / TEST_EXECUTED / NOT_RUN

---

## EXECUTIVE SUMMARY

The repository-level guardrails required by the root `AGENTS.md` are now
mechanically verifiable:

1. `AGENTS.md` verified complete (no rewrite needed — all mandated rule
   areas already covered).
2. Automated guard created: `scripts/verify-platform-guardrails.mjs`
   (Node.js standard library only, zero new dependencies).
3. Root command added: `yarn guard:platform`.
4. Dependency governance documented from actual repository evidence:
   `docs/architecture/DEPENDENCY_GOVERNANCE.md`.
5. CI integration: one early `yarn guard:platform` step in the primary
   `Platform CI` workflow test job.
6. Guard execution: **exit 0** — PASS: 10, WARNING: 14, FAIL: 0. All
   warnings are classified PRE_EXISTING / UPGRADE_RISK / REVIEW_REQUIRED.
7. Negative tests prove detection of `"latest"` ranges, foreign
   `package-lock.json`, and private `@backstage/.../src` imports; all
   fixtures removed afterwards.
8. `yarn.lock` checksum BEFORE == AFTER. No dependency was installed,
   upgraded, or downgraded. No Backstage / React / MUI change.

**Verdict:** `PLATFORM_GUARDRAILS_COMPLETE_WITH_EXISTING_FINDINGS`

---

## CURRENT PLATFORM BASELINE

Evidence: CODE_INSPECTED (`backstage.json`, `package.json`, `.yarnrc.yml`,
workspace `package.json` files).

| Item | Value | Source |
| --- | --- | --- |
| Backstage release | **1.53.0** | `backstage.json` |
| Backstage CLI | `^0.36.4` | root `package.json` |
| Package manager | **Yarn 4.13.0 (Berry)** | `packageManager` field |
| Yarn linker | `node-modules` | `.yarnrc.yml` |
| Yarn release artifact | `.yarn/releases/yarn-4.13.0.cjs` | `.yarnrc.yml` |
| Node engines | `22 \|\| 24` | root `package.json` |
| React | `^18.0.2` (23 workspaces) | workspace manifests |
| TypeScript | `~5.8.0` (root baseline) | root `package.json` |
| Material UI | MUI **v4 generation** (`@material-ui/core ^4.12.2`, `@material-ui/icons ^4.9.1`); no `@mui/*` v5 present | workspace manifests |
| Lockfile | `yarn.lock`, sha256 `f4a72f4c575d46c257f31936a5044770ba613f07da53fc81954895a93faffd9d` | repository root |

---

## AGENTS.MD STATUS

CODE_INSPECTED. `AGENTS.md` exists at repository root (currently
untracked — PRE_EXISTING state, not committed in this gate).

Verified coverage of all mandated rule areas:

| Required rule | Covered |
| --- | --- |
| Backstage Core immutability | YES — PRIME DIRECTIVE + BACKSTAGE CORE PROTECTION |
| Extension-first architecture | YES — EXTENSION-FIRST RULE |
| app/backend thin composition layers | YES — APP / BACKEND COMPOSITION |
| No `@backstage` source patches | YES — BACKSTAGE CORE PROTECTION |
| No `node_modules` patches | YES — BACKSTAGE CORE PROTECTION |
| No direct Backstage DB schema changes | YES — BACKSTAGE CORE PROTECTION |
| No proprietary Catalog replacement | YES — CATALOG + STOP CONDITIONS |
| No proprietary Scaffolder replacement | YES — SCAFFOLDER + STOP CONDITIONS |
| No proprietary Auth replacement | YES — STOP CONDITIONS |
| No second RBAC engine | YES — RBAC |
| Dependency governance | YES — DEPENDENCY GOVERNANCE |
| No automatic `yarn add` / `yarn up` | YES — DEPENDENCY GOVERNANCE |
| No `latest` | YES — DEPENDENCY GOVERNANCE |
| `yarn.lock` controlled baseline | YES — YARN.LOCK IS AUTHORITATIVE |
| Dedicated Backstage upgrade gate | YES — BACKSTAGE VERSION GOVERNANCE |
| Explicit dependency-change approval | YES — `DEPENDENCY_CHANGE_REQUIRED` protocol |

**No rewrite performed** — the existing content already provides all
required protection (gate instruction: only add genuinely missing
protection).

---

## AUTOMATED GUARD IMPLEMENTATION

File: `scripts/verify-platform-guardrails.mjs`
Runner: Node.js standard library only (`node:fs`, `node:path`,
`node:crypto`, `node:process`). **No dependency was installed.**

- Runs from repository root via `yarn guard:platform`.
- Recursively inspects `packages/*`, `plugins/*`, `scripts/`, root
  manifests and config.
- Output: PASS / WARNING / FAIL per check, inventory tables, summary.
- Exit code: `0` when no hard violations, `1` on any FAIL.
- False-positive controls: normal `node_modules/@backstage/cli/bin`
  execution in scripts is not flagged as mutation; `/alpha` APIs are not
  blanket-failed; Backstage packages are not required to share one npm
  version number; documented unsafe ranges are allowlisted with reasons.

---

## CHECKS IMPLEMENTED

| # | Check | Severity | Status in current repo |
| --- | --- | --- | --- |
| A | Backstage Core patching (`patch-package`, Yarn patches, postinstall mutation, vendored dirs) | FAIL | PASS |
| B | Private `@backstage/.../src` or `.../dist` imports | FAIL | PASS |
| B' | `/alpha` API usage | WARNING (UPGRADE_RISK) | 3 findings |
| C | Foreign lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `bun.lock`) | FAIL | PASS |
| D | Unsafe ranges `latest` / `*` | FAIL (unless allowlisted) | PASS (1 allowlisted warning) |
| E | Dependency baseline drift (Backstage, React, MUI, TS inventory; React major + MUI generation are hard failures) | FAIL / WARNING | PASS + warnings |
| F | Root resolutions governance (BASELINE / REVIEW_REQUIRED / HIGH_RISK) | FAIL for undocumented HIGH_RISK | PASS (all classified) |
| G | `node_modules` mutation scripts against protected packages | FAIL | PASS |
| H | app/backend composition thinness | WARNING only | PASS (within limits) |
| I | Cross-plugin private implementation imports | WARNING only | PASS |

---

## BACKSTAGE CORE PROTECTION

Evidence: CODE_INSPECTED + TEST_EXECUTED.

- No `patches/` directory, no `.yarn/patches` directory.
- No `patch-package` dependency or script invocation anywhere.
- Root `postinstall` (`scripts/link-internal-packages.js`) only creates
  `@internal` workspace symlinks for Windows/OneDrive resolution; it never
  touches `node_modules/@backstage`.
- No vendored Backstage directories.
- No `node_modules/@backstage` mutation in any package script or repo
  script.

---

## DEPENDENCY GOVERNANCE

Documented at `docs/architecture/DEPENDENCY_GOVERNANCE.md` from actual
repository evidence: platform baseline, six-step dependency approval rule,
lockfile policy, Backstage upgrade gate checklist, emergency repair rules,
AI agent policy.

---

## BACKSTAGE PACKAGE INVENTORY

Full inventory is printed by `yarn guard:platform` (DEPENDENCY BASELINE
INVENTORY). Summary of declared families:

- `@backstage/*`: 60 packages across 25 workspaces (app, backend,
  platform-common, data-product-consumption, all plugins).
- `@backstage-community/*`: `plugin-rbac ^2.1.2`,
  `plugin-rbac-backend ^7.17.0` (declared; community RBAC backend is
  currently commented out in `packages/backend/src/index.ts` — known
  authority gap, explicitly out of scope for this gate).

Version skew findings (all PRE_EXISTING, WARNING/REVIEW_REQUIRED — Backstage
packages do not share one npm version; skew judged against release
baseline 1.53.0, not failed):

| Package | Baseline range | Drifted range | Location |
| --- | --- | --- | --- |
| `@backstage/cli` | `^0.36.4` | `^0.26.0` | `plugins/validation-manager` |
| `@backstage/core-components` | `^0.18.12` | `^0.13.0` | `plugins/validation-manager` |
| `@backstage/core-plugin-api` | `^1.12.8` | `^1.8.0` | `plugins/validation-manager` |
| `@backstage/plugin-catalog-react` | `^1.21.6` | `^1.8.0` | `plugins/validation-manager` |
| `@backstage/catalog-model` | `^1.7.6` | `^1.4.0` | `plugins/validation-manager` |
| `typescript` | `~5.8.0` | `~5.4.0` / `^5.0.0` | `plugins/authorization-registry-backend` / `plugins/validation-manager` |

Drift is concentrated in `plugins/validation-manager` (older baseline
manifest) plus one devDependency in `plugins/authorization-registry-backend`.
Yarn Berry resolves these to baseline-compatible single versions in
`yarn.lock`; manifests should be aligned in a dedicated
dependency-governance cleanup gate (NOT in this gate).

---

## REACT / UI DEPENDENCY INVENTORY

- **React**: `^18.0.2` in 23 workspaces; `^18.2.0` peer ranges in
  `plugins/validation-manager`. Same major — WARNING (REVIEW_REQUIRED),
  not a major drift.
- **Material UI**: single generation (MUI v4). `@material-ui/core`
  `^4.12.2` (12 ws) vs `^4.12.0` (2 ws, validation-manager); icons
  `^4.9.1` vs `^4.11.3` — same major/generation, WARNING only.
  **No `@mui/*` v5 packages anywhere** — no mixed-generation failure.
- **TypeScript**: `~5.8.0` baseline vs `~5.4.0` / `^5.0.0` drift —
  WARNING (REVIEW_REQUIRED).

---

## RESOLUTIONS

Root `package.json` resolutions — all classified by the guard:

| Resolution | Range | Classification |
| --- | --- | --- |
| `@types/react` | `^18` | BASELINE (React 18 type alignment) |
| `@types/react-dom` | `^18` | BASELINE (React 18 type alignment) |
| `@backstage/plugin-permission-react` | `^0.5.2` | REVIEW_REQUIRED — PRE_EXISTING legacy resolution while backend declares `^0.7.2`; documented in guard allowlist; review in dependency-governance cleanup gate |
| `@material-ui/lab` | `^4.0.0-alpha.61` | REVIEW_REQUIRED — PRE_EXISTING baseline alignment of Material UI lab alpha with Backstage core-components; documented in guard allowlist |

No resolution was added or removed in this gate. The two `@backstage` /
`@material-ui` targeting resolutions are PRE_EXISTING working-tree changes
(visible in `git diff package.json`) that predate this gate.

---

## YARN LOCK INTEGRITY

TEST_EXECUTED.

- BEFORE sha256: `f4a72f4c575d46c257f31936a5044770ba613f07da53fc81954895a93faffd9d`
- AFTER sha256:  `f4a72f4c575d46c257f31936a5044770ba613f07da53fc81954895a93faffd9d`

**YARN_LOCK_INTEGRITY = PASS.** The guard additionally prints the lockfile
checksum on every run. (The working tree carries a PRE_EXISTING modified
`yarn.lock` versus HEAD — unchanged by this gate.)

---

## PRIVATE / ALPHA API FINDINGS

CODE_INSPECTED.

- Private `@backstage/.../src` or `.../dist` imports: **none**.
- `/alpha` usage (UPGRADE_RISK, documented Backstage extension APIs):
  1. `packages/app/src/App.tsx:2` — `@backstage/plugin-catalog/alpha`
  2. `packages/app/src/modules/search/index.tsx:2` — `@backstage/plugin-search-react/alpha`
  3. `packages/backend/src/permission/module.ts:5` — `@backstage/plugin-permission-node/alpha` (required by the standard permission policy module extension point)

---

## APP/BACKEND COMPOSITION WARNINGS

CODE_INSPECTED. Warning-only heuristics:

- `packages/app/src`: 128 files / 22,305 lines — within limits
  (thresholds 300 files / 40,000 lines). No `APP_COMPOSITION_WARNING`.
- `packages/backend/src`: 48 files / 6,476 lines — within limits
  (thresholds 150 files / 15,000 lines). No `BACKEND_COMPOSITION_WARNING`.

---

## CROSS-PLUGIN WARNINGS

CODE_INSPECTED. No plugin imports another plugin's private implementation
(`@internal/*/src/...` or relative paths crossing plugin boundaries).
Shared access goes through workspace packages (`platform-common`,
`@internal/*` public exports). No warnings.

---

## CI INTEGRATION

`.github/workflows/ci.yml` is the primary `Platform CI` workflow. One step
added early in the `test` job, after `yarn install --immutable` and before
Typecheck/Lint/tests:

```yaml
      - name: Platform guardrails
        run: yarn guard:platform
```

The `image` job already declares `needs: test`, so a guardrail failure
also blocks image builds on `main`. No secrets, deployment behavior, or
workflow structure changed.

CI_GUARD_INTEGRATION = DONE (minimal, safe).

---

## GUARD EXECUTION RESULT

TEST_EXECUTED — `yarn guard:platform`:

- **Exit code: 0**
- **PASS: 10** — patching, private imports, package manager, unsafe
  ranges, MUI generation, resolutions, node_modules mutation, app
  composition, backend composition, cross-plugin boundaries.
- **WARNING: 14** — 3 UPGRADE_RISK alpha APIs; 1 allowlisted unsafe range;
  8 dependency-drift REVIEW_REQUIRED items; 2 documented resolutions.
- **FAIL: 0**

Result line: `RESULT: GUARDRAILS_OK`.

---

## NEGATIVE TEST EVIDENCE

TEST_EXECUTED. Fixtures created and fully removed afterwards
(`git status` shows no test artifacts):

| # | Fixture | Expected | Observed |
| --- | --- | --- | --- |
| 1 | `"some-fake-package": "latest"` in `plugins/marketplace/package.json` | FAIL + exit 1 | `FAIL [UNSAFE_DEPENDENCY_RANGES] unsafe dependency range some-fake-package@latest` — exit 1 |
| 2 | root `package-lock.json` | FAIL + exit 1 | `FAIL [PACKAGE_MANAGER_CONSISTENCY] foreign lockfile present: package-lock.json` — exit 1 |
| 3 | `import ... from '@backstage/backend-defaults/src/entrypoints/alpha'` in a temp source file | FAIL + exit 1 | `FAIL [PRIVATE_BACKSTAGE_IMPORTS] private Backstage import: .../negative-test-fixture.ts:1` — exit 1 |

Post-restore re-run: exit 0. No negative-test artifacts remain.

---

## PRE_EXISTING VIOLATIONS / FINDINGS

Nothing was silently repaired. Classification:

| Finding | Classification |
| --- | --- |
| `plugins/validation-manager` old Backstage/React/MUI/TS manifest ranges | PRE_EXISTING / REVIEW_REQUIRED |
| `plugins/authorization-registry-backend` `typescript ~5.4.0` | PRE_EXISTING / REVIEW_REQUIRED |
| `packages/app` `@types/react-dom: "*"` | PRE_EXISTING / REVIEW_REQUIRED (allowlisted with documented reason) |
| Root resolutions on `@backstage/plugin-permission-react` + `@material-ui/lab` | PRE_EXISTING / REVIEW_REQUIRED (documented) |
| 3 `/alpha` imports | PRE_EXISTING / UPGRADE_RISK |
| Untracked `AGENTS.md`, reports, `.tmp_*` scratch files, modified `yarn.lock` | PRE_EXISTING (repo hygiene deferred, per gate boundary) |
| Community RBAC authority gap (backend commented out) | PRE_EXISTING — explicitly out of scope |

INTRODUCED_BY_THIS_GATE findings: **none**.

---

## FILES CHANGED

| File | Change | Classification |
| --- | --- | --- |
| `scripts/verify-platform-guardrails.mjs` | NEW | GUARDRAIL_IMPLEMENTATION |
| `package.json` | +1 script line `guard:platform` | GUARDRAIL_IMPLEMENTATION |
| `.github/workflows/ci.yml` | +1 CI step | CI_GUARD |
| `docs/architecture/DEPENDENCY_GOVERNANCE.md` | NEW | DOCUMENTATION |
| `PLATFORM_GUARDRAILS_REPORT.md` | NEW (this file) | DOCUMENTATION |
| `AGENTS.md` | verified, UNCHANGED | PRE_EXISTING (untracked) |

All other modified/untracked files (`packages/app/**`, `plugins/**`,
`yarn.lock`, report MDs, examples, templates) are PRE_EXISTING and were not
touched by this gate.

---

## BACKSTAGE CORE INTEGRITY

CODE_INSPECTED + TEST_EXECUTED.

```
@backstage source modified              NO
node_modules/@backstage modified        NO
Backstage fork introduced               NO
Backstage package upgraded              NO
Backstage package downgraded            NO
Catalog replaced                        NO
Scaffolder replaced                     NO
Auth replaced                           NO
Permission Framework replaced           NO
Backstage DB schema modified            NO
Community plugin patched                NO
RBAC authority changed                  NO
React changed                           NO
Material UI / MUI changed               NO
new runtime dependency installed        NO
Yarn changed                            NO
yarn.lock changed by this gate          NO
```

---

## REMAINING GOVERNANCE DEBT

1. Align `plugins/validation-manager` manifest ranges to the platform
   baseline (dedicated dependency-governance cleanup gate).
2. Align `plugins/authorization-registry-backend` TypeScript devDependency
   to `~5.8.0`.
3. Replace `packages/app` `@types/react-dom: "*"` with `^18`.
4. Review/retire the legacy `@backstage/plugin-permission-react ^0.5.2`
   resolution.
5. Commit the guardrails gate artifacts (this gate does not commit).
6. Repository hygiene: report-file consolidation and `.tmp_*` scratch
   cleanup (separate controlled step, per gate boundary).
7. Resolve the community RBAC authority gap (separate RBAC gate).

---

## REQUIRED FINAL ANSWERS

1. Is AGENTS.md present at repository root? — **YES**
2. Does an executable automated platform guard exist? — **YES**
3. Can the guard detect Backstage Core patching? — **YES**
4. Can the guard detect private @backstage source imports? — **YES** (negative test 3)
5. Are /alpha APIs treated as upgrade risks rather than automatically forbidden? — **YES**
6. Can the guard detect incompatible package-manager artifacts? — **YES** (negative test 2)
7. Can the guard detect unsafe "latest" / "*" dependency ranges? — **YES** (negative test 1)
8. Does the guard inventory Backstage dependency drift? — **YES**
9. Is yarn.lock treated as a controlled baseline? — **YES**
10. Was yarn.lock unchanged during this gate? — **YES** (sha256 BEFORE == AFTER)
11. Were any new dependencies installed? — **NO**
12. Were any Backstage packages upgraded or downgraded? — **NO**
13. Was React changed? — **NO**
14. Was Material UI / MUI changed? — **NO**
15. Was RBAC authority changed? — **NO**
16. Was Backstage Core modified? — **NO**
17. Does `yarn guard:platform` execute successfully as a repository command? — **YES** (exit 0)
18. Is dependency governance documented? — **YES**

---

## FINAL VERDICT

**PLATFORM_GUARDRAILS_COMPLETE_WITH_EXISTING_FINDINGS**
