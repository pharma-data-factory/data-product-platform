# Dependency Governance

Controlled dependency policy for the Pharma Data Factory / Nexora repository.

This document records the ACTUAL repository baseline (evidence from
`backstage.json`, root `package.json`, `.yarnrc.yml`, and workspace
`package.json` files at the time of the Platform Guardrails gate) and the
rules every human or AI agent must follow when touching dependencies.

Automated verification: `yarn guard:platform`
(`scripts/verify-platform-guardrails.mjs`).

---

## Platform Baseline

| Item | Baseline | Evidence |
| --- | --- | --- |
| Backstage release | **1.53.0** | `backstage.json` |
| Backstage CLI | `^0.36.4` | root `package.json` devDependencies |
| Node.js | **22 or 24** | root `package.json` `engines.node` |
| Package manager | **Yarn 4.13.0 (Berry)** | `packageManager` field, `.yarn/releases/yarn-4.13.0.cjs` |
| Yarn linker | `node-modules` | `.yarnrc.yml` |
| React | **^18.0.2 (React 18)** | 23 workspace `package.json` files |
| TypeScript | **~5.8.0** | root `package.json` devDependencies |
| Material UI | **MUI v4 generation** (`@material-ui/core ^4.12.2`, `@material-ui/icons ^4.9.1`) | workspace `package.json` files; no `@mui/*` v5 packages present |
| Lockfile | `yarn.lock` (controlled artifact) | repository root |

Known PRE_EXISTING drift recorded by the guardrails gate (do not fix
silently — repair only inside a dedicated dependency-governance cleanup):

- `plugins/validation-manager` declares older Backstage / Material UI /
  React / TypeScript ranges than the platform baseline.
- `plugins/authorization-registry-backend` declares `typescript ~5.4.0`
  (devDependency) against the `~5.8.0` baseline.
- `packages/app` declares `@types/react-dom: "*"`.
- Root resolutions include a legacy `@backstage/plugin-permission-react`
  pin (`^0.5.2`) and a `@material-ui/lab` alpha alignment — both reviewed
  and documented in `PLATFORM_GUARDRAILS_REPORT.md`.

## Rules

Normal feature development MUST NOT independently change platform
dependency versions.

New dependencies require explicit review. Before adding any dependency:

1. Check existing repository packages — is the capability already present?
2. Check Backstage capability — does Backstage or a sanctioned community
   plugin already provide it?
3. Check existing shared libraries (`packages/platform-common`,
   `packages/data-product-sdk`, owned `@internal/*` plugins).
4. Check compatibility with the platform baseline above
   (Backstage release, React major, MUI generation, TypeScript).
5. Document the reason, requested version, and compatibility evidence.
6. Obtain explicit approval before installing.

Stop and report `DEPENDENCY_CHANGE_REQUIRED` before any `yarn add`,
`yarn up`, resolution change, or lockfile regeneration.

Never:

- install `latest`
- use `*` ranges
- independently upgrade or downgrade `@backstage/*` packages
- change React majors
- mix Material UI generations without explicit approval
- add resolutions as a silent workaround
- use npm/pnpm/bun in this Yarn repository

## Lockfile Policy

`yarn.lock` is a controlled platform artifact.

- Never delete or regenerate it merely to solve a local dependency issue.
- Treat unexpected large lockfile diffs as a dependency-governance
  failure, not a normal side effect.
- Lockfile changes are only legitimate when an approved dependency change
  or a controlled Backstage upgrade gate produced them.

## Backstage Upgrade Policy

Backstage upgrades happen only in a dedicated upgrade gate — never ad hoc
during feature work.

The upgrade gate must include:

- install (immutable lockfile check)
- build (`yarn tsc`, backend bundle)
- tests (`yarn test:all --watchAll=false`)
- browser smoke test of authenticated portal surfaces
- platform guard (`yarn guard:platform`)
- plugin compatibility review (all owned `@internal/*` plugins)
- permission compatibility review (policy module, admin surfaces)
- Golden Path verification (Scaffolder create → publish dry run)

Use the official Backstage upgrade process appropriate to this repository
(`backstage-cli versions:bump` within the controlled gate) and review all
`@backstage/*` package changes together — never individually.

## Emergency Dependency Repair

A dependency repair requires documented root-cause evidence first.

Do NOT use as repair techniques:

- `latest`
- silent resolutions
- lockfile deletion or regeneration
- random package upgrades

Repair may restore a working install but must not silently change platform
package versions. If a platform package must move, it becomes an upgrade
gate, not a repair.

## AI Agent Policy

AI coding agents may RECOMMEND dependencies but may NOT install them or
modify platform dependency versions without explicit human approval.

Repository-wide behavioral rules for agents are defined in the root
`AGENTS.md` (Backstage Core protection, extension-first architecture,
stop conditions). This document is the dependency-specific extension of
those rules.
