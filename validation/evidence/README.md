# Validation Evidence

**Baseline:** Platform Core Validation Baseline v1.0  
**Validation status:** NOT_VALIDATED

This artifact was generated as a PROPOSED validation baseline from repository evidence. Human review and approval are required before it can become part of an approved validation baseline.

## Purpose

This folder is reserved for **reviewed execution evidence** or **approved execution evidence** (test runs, configuration IQ records, review minutes). Electronic signatures are not required by Baseline v1.0.

Formal IQ/OQ/UAT records are **not** present. Phase 3A added **developer technical evidence** only under `validation/evidence/remediation/` (`TECHNICAL_EVIDENCE_*`). That does not change validation status: **NOT_VALIDATED**.

## What may be cited today (technical only)

These are **evidence candidates**, not approved validation evidence:

| Candidate | Path | Limitation |
| --- | --- | --- |
| Automated unit / integration tests | `data-product-platform/**/*.test.ts`, `**/*.test.tsx` | Not signed; not IQ/OQ |
| Platform CI definition | `data-product-platform/.github/workflows/ci.yml` | Workflow definition, not a witnessed run in this package |
| Identity / Guest config tests | `data-product-platform/packages/backend/src/auth/identity.test.ts` | Config-as-code assertions |
| Permission policy tests | `data-product-platform/packages/backend/src/permission/policy.test.ts` | Unit, not system |
| Access policy tests | `data-product-platform/packages/platform-common/src/accessPolicy.test.ts` | Unit |
| Entitlement authorizeCreate tests | `data-product-platform/packages/platform-common/src/entitlement-service.test.ts` | Unit; legal gate for `handoff=customer` |
| GitHub integration config tests | `data-product-platform/packages/backend/src/githubIntegration.test.ts` | Config / wiring |
| GitHub Actions client tests | `data-product-platform/plugins/data-products-backend/src/githubActions.test.ts` | Unit; live Actions Read-only not proven |
| Pilot Exit write-up | `data-product-platform/docs/pilot-exit-gate.md` | Historical engineering note; **PILOT_EXIT_FAIL** |

## What is not present

| Record | Status |
| --- | --- |
| Reviewed IQ execution evidence | NOT ESTABLISHED |
| Reviewed OQ execution evidence | NOT ESTABLISHED |
| Reviewed PQ execution evidence | NOT ESTABLISHED |
| Approved URS / FS / DS (beyond this requirements baseline) | NOT ESTABLISHED |
| Independent QA witness | NOT ESTABLISHED |
| Interactive OAuth Create run | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` |
| OEE GitHub live proof | `OEE_GITHUB_LIVE_PROOF_NOT_RUN` (out of Platform Core product scope; listed for honesty) |
| Durable audit export | NOT ESTABLISHED |
| 21 CFR Part 11 assessment | NOT ESTABLISHED (out of MVP; not fabricated here) |

## Citation rule

Preferred: `Evidence: data-product-platform/packages/.../filename.ts`

If a fact cannot be shown from the repository or a named execution record: `Evidence: NOT ESTABLISHED`
