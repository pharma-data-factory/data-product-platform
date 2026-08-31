# Nexora — Repository Guardrails

## PRIME DIRECTIVE

Backstage is the platform kernel.

WE EXTEND BACKSTAGE.
WE DO NOT MODIFY BACKSTAGE.

All development must preserve the ability to upgrade to future supported
Backstage releases.

If a requested implementation conflicts with this rule:

STOP.

Do not implement the change.

Report:

BACKSTAGE_CORE_PROTECTION_BLOCKED

and propose a supported plugin / module / extension-point solution.

## BACKSTAGE CORE PROTECTION

Never modify, fork, patch, vendor or copy implementation code from:

- @backstage/*
- Backstage Core
- Backstage Catalog internals
- Backstage Scaffolder internals
- Backstage Auth internals
- Backstage Permission Framework internals
- Backstage Search internals
- Backstage frontend framework internals
- Backstage backend framework internals

Never edit:

node_modules/@backstage/**

Never introduce:

- patch-package patches against @backstage/*
- Yarn patches against @backstage/*
- postinstall modifications of Backstage
- monkey patches
- copied Backstage source
- private/internal Backstage implementation imports
- direct Backstage database schema modifications

Community plugins must also be consumed/configured rather than patched.

## EXTENSION-FIRST RULE

Before implementing functionality, determine whether Backstage already provides:

- Plugin
- Backend Plugin
- Frontend Plugin
- Backend Module
- Extension Point
- Core Service
- Catalog Processor
- Catalog Provider
- Scaffolder Action
- Permission Framework integration
- Auth provider
- Configuration mechanism

If such a capability exists:

USE THE STANDARD BACKSTAGE EXTENSION MECHANISM.

Do not replace it with proprietary platform infrastructure.

## APP / BACKEND COMPOSITION

packages/app and packages/backend are composition and wiring layers.

Allowed:

- plugin registration
- module registration
- route binding
- service configuration
- navigation composition

Do not place significant Nexora domain logic in these packages.

Domain logic belongs in owned plugins/packages.

## DEPENDENCY GOVERNANCE

AI agents MUST NOT install, upgrade, downgrade or replace dependencies without
first inspecting the existing dependency graph.

Before any:

- yarn add
- yarn up
- package.json dependency change
- resolution change
- lockfile regeneration

perform:

1. Check whether the capability already exists in the repository.
2. Check whether Backstage already provides the capability.
3. Inspect the current repository Backstage version baseline.
4. Inspect package.json.
5. Inspect yarn.lock.
6. Reuse an existing compatible dependency whenever possible.

NEVER:

- install "latest"
- independently upgrade @backstage/* packages
- independently downgrade @backstage/* packages
- change React versions independently
- introduce another React version to solve a local issue
- mix Material UI generations without explicit approval
- add resolutions as a silent workaround
- delete yarn.lock to fix installation problems
- regenerate yarn.lock unnecessarily
- use npm install in this Yarn repository
- introduce package-lock.json
- introduce pnpm-lock.yaml
- patch node_modules
- use NODE_PATH hacks
- bypass Yarn workspace resolution

Backstage dependency upgrades require a dedicated Backstage upgrade gate.

If a new dependency is genuinely required:

STOP BEFORE INSTALLATION.

Report:

DEPENDENCY_CHANGE_REQUIRED

with:

Package:
Requested version:
Existing alternative checked:
Backstage capability checked:
Reason:
Compatibility evidence:
Expected package.json impact:
Expected yarn.lock impact:

Wait for explicit approval before installing.

## YARN.LOCK IS AUTHORITATIVE

The repository's yarn.lock is part of the controlled platform baseline.

Do not delete or regenerate it merely to solve local dependency errors.

Unexpected large lockfile changes must be treated as a dependency-governance
failure.

## BACKSTAGE VERSION GOVERNANCE

Do not update individual Backstage packages ad hoc.

Backstage upgrades must happen as a deliberate platform upgrade using the
repository's supported Backstage upgrade workflow.

All Backstage package changes must be reviewed together for compatibility.

## RBAC

Do not build another RBAC engine.

Use:

Catalog Users / Groups
→ Community RBAC
→ Backstage Permission Framework
→ domain Permission objects

Authorization Profile Registry is metadata/configuration.

It is NOT an authorization decision engine.

## CATALOG

Use standard Backstage Catalog.

Never:

- replace Catalog
- patch Catalog source
- access Catalog private database schemas
- modify Catalog-owned tables directly

Use supported APIs, processors, providers, annotations and relations.

## SCAFFOLDER

Use standard Backstage Scaffolder.

Golden Paths may use templates and supported custom Scaffolder Actions.

Do not fork or replace Scaffolder.

## PLUGIN BOUNDARIES

Plugins own their domain behavior and persistence.

Do not create direct cross-plugin private-database access.

Prefer public API / service boundaries.

## STOP CONDITIONS

Stop implementation if a task requires:

- Backstage source modification
- @backstage package patching
- node_modules patching
- private Backstage internals
- direct Backstage database changes
- proprietary replacement of Catalog
- proprietary replacement of Scaffolder
- proprietary replacement of Auth
- proprietary RBAC engine
- unapproved dependency installation
- unapproved dependency upgrade/downgrade

Report the conflict instead.

## GOLDEN RULE

BACKSTAGE = PLATFORM KERNEL

NEXORA = PRODUCT / EXTENSION LAYER

The dependency direction is:

Nexora
        ↓
Backstage Public APIs / Extension Points
        ↓
Backstage

Never the reverse.
