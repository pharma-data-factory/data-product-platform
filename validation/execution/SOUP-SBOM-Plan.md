# SOUP / SBOM plan — Platform Core 1.0-RC1

**Baseline:** PDF-PC-VAL-BL-1.0  
**Decision:** DEC-SOUP-001 (Backstage is SOUP; not itself validated)  
**SOUP approval:** **NOT CLAIMED**  
**Date:** 2026-08-22  

This plan describes how to produce a reproducible inventory. It does not approve residual risk RA-013.

## Current capability

| Item | Status |
| --- | --- |
| Lockfile | `data-product-platform/yarn.lock` present (`packageManager: yarn@4.13.0`) |
| Immutable install | `yarn install --immutable` used in platform CI (DEC-SOUP-001) |
| In-repo SBOM artifact | **NOT_ESTABLISHED** (no sbom file found) |
| In-package SBOM plugin | **Not present** in `package.json` |
| Signed SOUP assessment | **NOT_ESTABLISHED** |

## Backstage version (declared)

Do not invent resolved lockfile versions here.

| Package | Declared |
| --- | --- |
| `@backstage/cli` | `^0.36.4` |
| `@backstage/backend-defaults` | `^0.17.5` |
| `@backstage/plugin-scaffolder-backend` | `^4.0.2` |
| `@backstage/plugin-catalog-backend` | `^3.8.1` |
| `@backstage/plugin-permission-backend` | `^0.7.14` |

Exact resolved versions: extract from `yarn.lock` at candidate commit (`NOT_ESTABLISHED` until lockfile is clean).

## Direct dependencies

Record from:

- `package.json` (root)
- `packages/backend/package.json`
- `packages/app/package.json`
- `packages/platform-common/package.json`
- in-scope plugin `package.json` files

Exclude Golden Path Python template dependencies from the **Core** SOUP list (DEC-SCOPE-001). List them separately if a product-snapshot candidate is chosen.

## Lockfile strategy

1. One committed `yarn.lock` for the candidate.
2. Install with `yarn install --immutable`.
3. Do not hand-edit the lockfile.
4. If Nexora/OEE workspaces are excluded from RC1, regenerate the lockfile from that reduced workspace **before** tagging (change record required).

## SBOM generation method (preferred: no new runtime dependency)

**Preferred:** one-off generation at fixation time, artifact stored under `validation/execution/evidence/` after generation (not now).

Options, in order:

1. `yarn npm audit --recursive` (Yarn 4 built-in; advisory list, not a full SBOM).
2. One-off CycloneDX without adding a workspace dependency, e.g. `npx @cyclonedx/cyclonedx-npm` or Yarn CycloneDX plugin used once. Justify if a plugin is committed.
3. External `syft` on the install directory or image, if the executor already has it. Do not require installing syft into the product.

Do not invent an SBOM in documentation.

## Vulnerability scan method

| Method | Use |
| --- | --- |
| `yarn npm audit` | Primary, lockfile-based |
| GitHub Dependabot / advisory review | Process, if the remote is used |
| Image CVE scan | Only if a candidate image is built (IQ-013) |

Record date, tool version, and unfixed High/Critical IDs. Do not silently ignore findings.

## Upgrade / change assessment

Before any Backstage or lockfile change after RC1:

1. Change record
2. Impact on auth, permission policy, scaffolder, catalog, TechDocs
3. Re-run Core automated tests
4. New candidate version if product code or lockfile changes

## Evidence required (when generated)

- Lockfile hash
- `yarn --version` / `node --version`
- Direct-dependency list
- SBOM file **or** written `NOT_ESTABLISHED`
- Audit/advisory output (redact tokens)
- Human SOUP review decision (not fabricated)

**SOUP status remains: NOT APPROVED.**
