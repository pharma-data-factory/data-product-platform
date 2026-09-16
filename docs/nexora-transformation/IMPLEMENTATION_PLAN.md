# Nexora Transformation Implementation Plan

## Phase 0 — Stabilize and Baseline
Audit architecture, plugin boundaries, domain ownership, databases/APIs, permissions, Product lifecycle, URS lifecycle, Validation lifecycle, Marketplace, Composer, Data Contracts, CI/tests and hard-coded special cases.

Exit: current behavior documented; baseline test state recorded; migration risks documented.

## Phase 1 — Core Domain Foundation
Consolidate Product/Artifact/Publisher/Dependency/Contract concepts. Preserve Product/ProductVersion compatibility. Fix foundational lifecycle/version defects. Add domain invariants and tests. Do not introduce new RBAC/auth systems.

## Phase 2 — Artifact Registry and Marketplace 2.0
Create persistent Artifact Registry, ArtifactVersion and Publisher lifecycle, namespace ownership, manifest validation and registry API. Adapt legacy marketplace items. Move Marketplace reads to registry. Add Producer/Consumer permissions.

## Phase 3 — Product Studio and AI-assisted Development
Implement generic Golden Path resolution, dependency/compatibility resolution, configuration schemas, Product generation, Development Context, repository scaffolding and AI provider abstraction. Remove hard-coded domain composition only after parity.

## Phase 4 — Data Exchange, Contracts and Lineage
Make DataContract first-class. Implement ProductDependency and Subscription semantics. Add provider-neutral exchange definitions, contract compatibility, initial lineage graph and Data Quality contracts.

## Phase 5 — Continuous Verification and Pharma Validation
Integrate CI evidence → ProductBaseline → ValidationContext → IQ/OQ/UAT/optional PQ → evidence → findings/retest → independent review → Validation Decision → Release Gate.

## Phase 6 — Consumer Experience, Analytics and Operations
Implement Product/Data overview, safe Data preview, Data Quality status, Consumers/Dependencies, Lineage UI, Analytics providers, Runtime Health vs Data Health, usage/upgrades and governed AI Data Analyst foundations.

## Phase 7 — Ecosystem, Scale and Commercialization
Add external publishers, vendor Artifacts, publisher trust/certification, multiple source/package providers, entitlements and commercial marketplace capabilities only after the core lifecycle is stable.

## Working method
For every phase:
1. Read `STATUS.md`.
2. Re-audit relevant code.
3. Define the smallest coherent vertical slice.
4. Update this plan if repository reality requires refinement.
5. Implement the slice.
6. Add/update tests.
7. Run TypeScript compile.
8. Run lint.
9. Run relevant tests.
10. Run CI-equivalent validation where practical.
11. Fix regressions.
12. Update `STATUS.md`.
13. Record architecture decisions in `DECISIONS.md`.
14. Commit coherent changes.
15. Continue unless a stop condition is reached.

## Stop conditions
Stop for human input only for destructive/irreversible migration, contradictory requirements, unresolved regulatory/business decisions, credentials/secrets, legal/licensing choices, dependency changes requiring approval under `AGENTS.md`, or product-owner architecture choices exposed by tests.
