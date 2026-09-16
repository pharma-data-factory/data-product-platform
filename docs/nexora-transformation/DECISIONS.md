# Nexora Transformation Decisions

Use this file for durable architecture decisions.

## Decision template

### NXD-XXX — Title
- Date:
- Context:
- Decision:
- Alternatives considered:
- Consequences:
- Affected components:

---

### NXD-001 — Backstage remains the platform kernel
- Date: 2026-09-15
- Context: Nexora needs identity, permissions, catalog, scaffolder, plugin runtime, search and documentation capabilities without owning platform plumbing.
- Decision: Backstage remains the technical kernel. Nexora extends it through supported public APIs, plugins, modules and extension points.
- Alternatives considered: Replace Backstage; fork Backstage; custom portal kernel.
- Consequences: Backstage upgradeability is protected and Nexora domain logic remains in owned packages/plugins.
- Affected components: all.

### NXD-002 — Producer and Consumer are capabilities
- Date: 2026-09-15
- Context: The same user/team may consume and publish.
- Decision: No global Producer/Consumer mode. Access is determined by permissions, capabilities, publisher membership, lifecycle and policy gates.
- Alternatives considered: Separate portals; global installation mode.
- Consequences: One Nexora platform and shared lifecycle.
- Affected components: identity, permissions, Marketplace, Product Studio.

### NXD-003 — AI proposes; humans govern
- Date: 2026-09-15
- Context: AI assists development and analysis but controlled approvals require accountability.
- Decision: AI may implement and propose but may not approve controlled Requirements, regulated risk, Validation or Release.
- Alternatives considered: autonomous AI approval.
- Consequences: AI provider integration remains separated from governance decision authority.
- Affected components: Product Studio, AI providers, URS, Validation, Release.

### NXD-004 — `packages/app` owns an explicit jest project id
- Date: 2026-09-16
- Context: `packages/app/src/App.test.tsx` passed when run alone and failed in
  the full repository run with `Cannot find module
  '@backstage/plugin-app-module-user-settings'`. That package ships no
  `dist/index.cjs.js` despite declaring it as `main`, so the app carries a
  `moduleNameMapper` pointing at the ESM build. The Backstage CLI derives each
  jest project's cache `id` from a hash of the Backstage version and the
  project's `transform` only (`cli-module-test-jest/config/jest.js`), so
  `packages/app` shared one id with 11 other frontend projects that have
  identical transforms. Jest keys its resolver cache on that id, so whichever
  project instantiated the resolver first supplied it to all of them — and the
  app's `moduleNameMapper` was bypassed. The error text named the app's rootDir
  relative to `plugins/validation-expert/src`, which is what identified the
  collision.
- Decision: set an explicit `jest.id` for `packages/app`. Any workspace that
  needs resolver-affecting config (`moduleNameMapper`, `resolver`,
  `modulePaths`) must also declare its own `jest.id`, because the generated id
  does not account for those fields.
- Alternatives considered: patch or vendor the upstream package to add the
  missing CJS entry point (forbidden by `AGENTS.md` — no `node_modules`
  mutation, no patching); move the mapping to the root `jest` config (the
  per-package `jest` field is merged with `Object.assign`, so any package
  defining its own `moduleNameMapper` would still drop it); pin jest
  `maxWorkers` (masks the collision rather than removing it, and the failure is
  deterministic, not a race).
- Consequences: `packages/app` no longer shares a jest module/resolver cache
  with the plugin projects, at the cost of one additional cache bucket. The
  shallow `Object.assign` merge also meant the app's `jest` field had been
  silently discarding the CLI's default `jest-css-modules` mapping; that entry
  is restored alongside the id, and `packages/app/src/index.tsx` does import a
  `.css` file.
- Affected components: `packages/app` test configuration.
