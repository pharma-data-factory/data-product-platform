# RC1 reconciled candidate model

**Date:** 2026-08-22  
**Validation status:** NOT_VALIDATED  
**Canonical identity:** annotated tag `platform-core-v1.0-rc1` (set in Phase 5A.2B)  

## Intended candidate

```
Repository state (all understood 240 paths + existing HEAD)
  + Explicit Platform Core validation boundary (URS 38 / DEC-SCOPE-001)
  + Out-of-scope register (may remain in the tree)
  + Exact dependencies (yarn.lock as workspace truth; Core SOUP subset documented)
  + Validation package (to be copied into data-product-platform/validation/)
  + RC1 Manifest (commit/tag filled after fixation)
```

The candidate is **not** “a repository containing only validated Core files.”

## Repository state

- Snapshot commit `20d221bd3887134250c033b7467035137919289e` plus 5A.2B branding (class C).
- Validation package is in-repo. Canonical identifier is the annotated tag, not a self-SHA in the manifest.

## Platform Core validation boundary

In-scope claim remains: Control Plane authentication, authorization, entitlements, legal Customer Handoff, Catalog, Scaffolder *as configured*, CI status display, Core persistence, Marketplace/Data Products/Developer Hub/Search/TechDocs as hosted by Core.

Out-of-scope claim: Golden Path **content**, generated products, pilots, AAS, UNS, Wave 1 as runtime, live plant data, Part 11.

## Out-of-scope register

See `RC1-Out-of-Scope-Register.md`. Presence is allowed. Runtime loads of nexora/AAS are **SCOPE_BOUNDARY_RISK**, not automatic scope expansion.

## Exact dependencies

- `yarn.lock` = actual workspace (class B).
- Core SOUP subset: Backstage packages + `@internal/platform-common`, data-products*, entitlements-backend, marketplace, app, backend.
- Nexora workspace packages are in the lockfile because they are in the workspace; they are **not** Core URS SOUP unless humans expand scope.

## Validation package

53 files at `IDP/validation/`. Copy to `data-product-platform/validation/` without content change. Not copied in this phase.

## Manifest

`RC1-Manifest.yaml` stays `NOT_VALIDATED` / DIRTY until the snapshot commit exists.

---

## Recommended commit strategy

### STRATEGY A — SNAPSHOT CURRENT REPOSITORY

**Recommended.**

All 240 paths are classified. Zero unexplained. `yarn.lock` matches the workspace. Out-of-scope work is legitimate product development and must not be deleted to “purify” Core.

The RC1 git object is the **complete snapshot**. The validation claim is the **documented boundary** plus the out-of-scope register.

### STRATEGY B — SELECTIVE RELEASE BRANCH

**Not recommended** unless a later human finds an unexplained or experimental change that breaks reproducibility. None was found in this reconciliation.

Do not execute A or B in this phase.

---

## Fixation still required (not this phase)

1. Copy validation package (keep sibling source).
2. Human commit of the snapshot (no history rewrite).
3. Confirm clean worktree.
4. Tag `platform-core-v1.0-rc1`.
5. Update manifest `git.commit` / `worktree_status: CLEAN`.
