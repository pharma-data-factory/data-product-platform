# PHARMA DATA FACTORY — REPOSITORY GUARDRAILS RESTORATION
# BACKSTAGE CORE PROTECTION + DEPENDENCY GOVERNANCE

Continue from the current repository state.

OBJECTIVE

Reintroduce hard repository-level development guardrails so AI coding agents
and developers cannot silently:

- modify Backstage Core
- patch @backstage/* packages
- add arbitrary dependencies
- install "latest"
- introduce incompatible Backstage / React / Material UI versions
- regenerate dependency state without control
- create hidden dependency drift

The guardrails must live entirely in Pharma Data Factory-owned repository files.

BACKSTAGE CORE MUST REMAIN UNCHANGED.

Do not commit.
Do not push.

==================================================
1. INSPECT CURRENT REPOSITORY FIRST
==================================================

Inspect:

git status --short
git diff --stat
package.json
yarn.lock
.yarnrc.yml
backstage.json

Determine:

- Yarn version
- workspace configuration
- current Backstage release/version baseline
- current React version
- current Material UI / MUI versions
- whether package.json contains resolutions
- whether patch-package exists
- whether .yarn/patches exists
- whether multiple lockfiles exist
- whether npm/pnpm artifacts exist
- whether dependency versions are already inconsistent

Do not change anything before this inspection.

Do not normalize or upgrade dependencies in this task.

==================================================
2. CREATE ROOT AGENTS.MD
==================================================

Create:

AGENTS.md

at repository root.

This file is the mandatory repository instruction for AI coding agents.

Use the following content and adapt only repository-specific paths if evidence
requires it.

--------------------------------------------------

# Pharma Data Factory — Repository Guardrails

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

Do not place significant Pharma Data Factory domain logic in these packages.

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

PHARMA DATA FACTORY = PRODUCT / EXTENSION LAYER

The dependency direction is:

Pharma Data Factory
        ↓
Backstage Public APIs / Extension Points
        ↓
Backstage

Never the reverse.

--------------------------------------------------

==================================================
3. CREATE DEPENDENCY / CORE GUARD SCRIPT
==================================================

Create a lightweight repository-owned validation script.

Preferred:

scripts/verify-platform-guardrails.mjs

Use Node.js standard library only if reasonably possible.

Do NOT add a dependency just to implement this guard.

The script should inspect repository source/configuration and fail with exit 1
for clear violations.

At minimum check:

A. forbidden Backstage patch mechanisms

Detect:

patch-package patches targeting @backstage
.yarn/patches entries targeting @backstage
scripts that modify node_modules/@backstage
postinstall patch logic targeting Backstage

B. multiple package managers

Fail if unexpected:

package-lock.json
pnpm-lock.yaml

exist in the controlled root/workspaces unless documented as intentional.

C. private/internal Backstage imports

Search owned source for suspicious imports such as:

@backstage/.../src/
@backstage/.../dist/

Do NOT blanket-fail documented /alpha imports.

Classify /alpha as:

UPGRADE_RISK

not necessarily a hard violation.

D. forbidden Backstage source vendoring

Detect obvious checked-in copied Backstage implementation directories/files.

Do not produce false positives for normal @backstage package names in
package.json.

E. dependency governance

Inspect root and workspace package.json files.

Report:

- new / duplicate React majors
- mixed package manager references
- suspicious "*" dependency versions
- "latest" dependency versions
- git/http dependencies where unexpected
- Backstage package version skew

Do not automatically rewrite versions.

F. resolutions

List all root resolutions.

Do not automatically fail all resolutions.

Classify them:

REVIEW_REQUIRED

If a resolution targets @backstage/*, React, Material UI, or other core
platform dependencies, fail unless explicitly allowlisted in the script with a
documented reason.

G. app/backend thinness

Do a lightweight warning-only heuristic for unusually large domain/business
logic in:

packages/app
packages/backend

Do not hard fail solely on file size.

H. direct node_modules mutation scripts

Fail if repository scripts contain commands that rewrite package source under
node_modules.

==================================================
4. ADD PACKAGE SCRIPT
==================================================

Add one root package.json script:

"guard:platform": "node scripts/verify-platform-guardrails.mjs"

Do not alter unrelated scripts.

Do not upgrade dependencies.

==================================================
5. OPTIONAL CI INTEGRATION
==================================================

Inspect existing GitHub Actions.

If there is an existing primary CI workflow, add:

yarn guard:platform

as an early validation step.

Do not create an entirely new CI architecture if unnecessary.

Do not change deployment behavior.

Do not alter secrets.

If CI integration is not safe due to current workflow debt, document:

CI_INTEGRATION_DEFERRED

instead of making speculative changes.

==================================================
6. CREATE DEPENDENCY BASELINE DOCUMENT
==================================================

Create:

docs/architecture/DEPENDENCY_GOVERNANCE.md

Document the current actual repository baseline:

- package manager
- Yarn version
- Backstage release baseline
- Node version if defined
- React baseline
- Material UI / MUI baseline
- lockfile policy
- Backstage upgrade policy
- dependency-change approval policy

Do not invent versions.

Read them from actual repository files.

Include:

NORMAL FEATURE DEVELOPMENT

Must NOT modify platform dependencies unless approved.

BACKSTAGE UPGRADE

Must be a dedicated controlled gate.

EMERGENCY DEPENDENCY REPAIR

May repair installation only after documented root-cause evidence and must not
silently upgrade platform packages.

==================================================
7. BACKSTAGE PACKAGE INVENTORY
==================================================

Generate a report section listing the currently declared @backstage/* packages
and their declared versions.

Also identify:

- duplicate Backstage packages with conflicting ranges
- obvious version drift
- Community Backstage packages
- React versions
- Material UI / MUI versions

Do NOT fix version drift in this gate.

This task establishes governance first.

==================================================
8. TEST THE GUARD
==================================================

Run:

yarn guard:platform

Record exit code and findings.

If it reports existing violations:

DO NOT hide or auto-fix them.

Classify:

PRE_EXISTING_VIOLATION
UPGRADE_RISK
REVIEW_REQUIRED
NEW_GUARD_FAILURE

Only fix problems introduced by the guard implementation itself.

==================================================
9. NORMAL BUILD SAFETY
==================================================

Run the smallest relevant build/test proving the repository configuration still
works after adding the guard files.

Do not trigger Backstage upgrades.

Do not regenerate dependencies unless required by the package.json script edit.

==================================================
10. NO BACKSTAGE MODIFICATION
==================================================

Explicitly prove:

@backstage source modified             NO
node_modules patched                   NO
Backstage fork introduced              NO
Backstage package upgraded             NO
Backstage package downgraded           NO
React version changed                  NO
Material UI version changed            NO
new runtime dependency installed       NO
RBAC authority changed                 NO
Golden Paths modified                  NO

These should all be NO.

==================================================
11. REPORT
==================================================

Create:

PLATFORM_GUARDRAILS_REPORT.md

Include:

CURRENT DEPENDENCY BASELINE
AGENTS.MD CREATED
GUARD SCRIPT
CI INTEGRATION
BACKSTAGE PACKAGE INVENTORY
DEPENDENCY RISKS
EXISTING RESOLUTIONS
TEST EVIDENCE
FILES CHANGED
BACKSTAGE CORE INTEGRITY
REMAINING DEBT

Use:

CODE_INSPECTED
TEST_EXECUTED
NOT_RUN

==================================================
12. GIT SAFETY
==================================================

Do not commit.
Do not push.

At the end show:

git status --short
git diff --stat

Classify every change:

PRE_EXISTING
GUARDRAILS
DOCUMENTATION
CI_GUARD
UNRELATED

Do not include:

.env
credentials
private keys
runtime scratch files

==================================================
13. REQUIRED FINAL ANSWERS
==================================================

Answer:

1. Does AGENTS.md now protect Backstage Core?

YES / NO

2. Does AGENTS.md prohibit arbitrary dependency installation?

YES / NO

3. Does AGENTS.md prohibit "latest" dependency installation?

YES / NO

4. Does AGENTS.md require explicit approval before new dependencies?

YES / NO

5. Is yarn.lock treated as controlled baseline?

YES / NO

6. Can individual @backstage packages be upgraded during normal feature work?

YES / NO

Required:
NO

7. Does an automated platform guard exist?

YES / NO

8. Does the guard detect Backstage patching?

YES / NO

9. Does the guard detect npm/pnpm lockfile drift?

YES / NO

10. Does the guard report dependency-version risks?

YES / NO

11. Were any Backstage packages changed during this gate?

YES / NO

Required:
NO

12. Were any new runtime dependencies installed?

YES / NO

Required:
NO

==================================================
14. FINAL VERDICT
==================================================

Finish with exactly ONE:

PLATFORM_REPOSITORY_GUARDRAILS_ESTABLISHED

PLATFORM_REPOSITORY_GUARDRAILS_ESTABLISHED_WITH_GAPS

PLATFORM_REPOSITORY_GUARDRAILS_NOT_ESTABLISHED

STOP.

Do NOT automatically:

- upgrade Backstage
- normalize dependencies
- remove existing resolutions
- change RBAC
- modify Golden Paths
- redesign the portal
- install new dependencies