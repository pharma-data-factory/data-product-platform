# Authorization Profiles — LEGACY

> # ARCHIVED 2026-09-26 · NONE OF THIS IS ENFORCED
>
> Moved here during Phase 2.0 (code/documentation reconciliation) because the
> permissions described below **do not exist in the running system** and the
> files were read by nothing.
>
> For the authorization model that actually runs, see
> [identity and RBAC](../../../identity-and-rbac.md),
> [platform roles](../../../rbac/platform-roles.md) and
> `packages/platform-common/src/{permissions,policy,roles}.ts`.

## What was here

An "Authorization Profile" design: each Golden Path would declare its own
domain permissions, suggested roles and platform-role mappings in an
`authorization.yaml` beside its `template.yaml`, and Community RBAC
administrators would turn those suggestions into real roles.

Six profiles (`aas`, `machine-state`, `mqtt`, `oee`, `equipment`, `uns`)
declaring **24 permissions** in a `<domain>.{read,operate,configure,admin}`
pattern, plus a registry, a schema reference, an architecture document and a
permission matrix.

## What was measured, 2026-09-26

| Check                                             | Result                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `authorization.yaml` read by any source file      | **no** — zero references in `packages/`, `plugins/`, `scripts/`, `app-config*.yaml`                        |
| referenced by any `template.yaml`                 | **no**                                                                                                     |
| loaded by the Backstage Catalog                   | **no** — `kind: AuthorizationProfile` is not an allowed kind and no catalog location points at these files |
| of the 24 declared permissions, present in source | **1** (`aas.read`)                                                                                         |
| of the 24, present in generated template content  | **0**                                                                                                      |

The one survivor is a coincidence rather than evidence. The profiles declare
`aas.read` with `runtimeEnforcement: IMPLEMENTED` and
`mechanism: fastapi-permission-check` — enforcement inside the _generated
Python data product_. The `aas.read` that exists is a **control-plane**
permission, defined in `packages/platform-common/src/permissions.ts` and
enforced in `plugins/aas-backend/src/router.ts`. Same name, different thing.
No generated product checks any of these permissions.

Several files carried `runtimeEnforcement: IMPLEMENTED` on permissions with
no implementation anywhere. That claim is the reason this material could not
stay in the active documentation: a reader planning an access model would
have built it on twenty-four permissions that deny nothing.

## Why it did not land

The profiles were the client half of a design whose server half was reversed.
They depended on Community RBAC providing central role administration, and
Community RBAC is deliberately disabled — Backstage 1.53 exposes
`policyExtensionPoint` only under `/alpha` and admits a single policy. See
`NXD-060` in [`DECISIONS.md`](../../../nexora-transformation/DECISIONS.md)
and deviation D-1 in
[`ARCHITECTURE_GUARDRAILS.md`](../../../architecture/ARCHITECTURE_GUARDRAILS.md).

`AGENTS.md` still carries a rule about this material — _"Authorization
Profile Registry is metadata/configuration. It is NOT an authorization
decision engine."_ The rule is sound and is left in place; note only that
there is currently no registry for it to govern.

## Related historical records

- `docs/PHASE9_EVIDENCE_MATRIX.md` — the acceptance evidence for this work,
  itself a phase report
- `docs/archive/GOLDEN_PATH_AUTHORIZATION_PLATFORM_MIGRATION_REPORT.md`
- `docs/archive/architecture/adr-legacy/ADR-004-central-platform-rbac.md`

## Files

| File                                         | Was                                   |
| -------------------------------------------- | ------------------------------------- |
| `*-authorization.yaml` (6)                   | `templates/<name>/authorization.yaml` |
| `authorization-profile-registry.yaml`        | `docs/architecture/`                  |
| `authorization-profile-registry-evidence.md` | `docs/architecture/`                  |
| `AUTHORIZATION_SCHEMA_REFERENCE.md`          | `docs/architecture/`                  |
| `GOLDEN_PATH_AUTHORIZATION_ARCHITECTURE.md`  | `docs/architecture/`                  |
| `GOLDEN_PATH_AUTHORIZATION_MATRIX.md`        | `docs/architecture/`                  |
