# CLAUDE.md — Nexora

This file is loaded into every session. It is deliberately short. It tells you
**where truth lives** and **what must hold**; it does not restate what the
documents it points at already say.

Nexora is the Open Manufacturing Platform for Life Sciences: a Backstage-based
control plane that governs requirements, products, verification and release
under GxP conditions.

---

## 1. Authority ranking

The repository contains 619 markdown files and, as of the 2026-09-26
documentation inventory, **21 of them called themselves "authoritative"** —
several while contradicting each other. When two documents disagree, the one
higher in this list wins. There is no other tie-break.

| #   | Source                                                                                | Authority                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **The running code and its tests**                                                    | Absolute. A document that disagrees with green tests is wrong.                                                                                               |
| 2   | **`AGENTS.md`**                                                                       | Normative law. Stop conditions, Backstage core protection, dependency governance. Never overridden by any other document.                                    |
| 3   | **`NEXORA_STRATEGY.md`**                                                              | Mandatory principles.                                                                                                                                        |
| 4   | **`docs/nexora-transformation/DECISIONS.md`**                                         | Durable decisions (NXD records). The reason something is the way it is.                                                                                      |
| 5   | **`docs/nexora-transformation/STATUS.md`**                                            | Current implementation state and the slice in progress.                                                                                                      |
| 6   | **`docs/audits/TARGET_CONFORMANCE_AUDIT.md`**                                         | Measured current-state baseline, with its date and commit.                                                                                                   |
| 7   | **`docs/nexora-transformation/PRODUCT_STRATEGY.md`**, **`PHASE_CLOSURE_PLAN.md`**     | Product direction and how open gaps get closed.                                                                                                              |
| 8   | **`docs/vision/NEXORA_VISION.md`**, **`docs/architecture/TARGET_OPERATING_MODEL.md`** | Target state. Describes what does **not** exist yet.                                                                                                         |
| 9   | **`ROADMAP.md`**                                                                      | Product plan and release status.                                                                                                                             |
| 10  | Everything else under `docs/`                                                         | Reference. Treat as a claim, not as proof.                                                                                                                   |
| —   | **`docs/archive/**`\*\*                                                               | Historical. Never cite as current.                                                                                                                           |
| —   | **`validation/**`\*\*                                                                 | **Not documentation.** This is the platform's own validation package, parsed by `validation-expert-backend`. Read-only unless the task is validation itself. |
| —   | **`templates/**/\*.md`\*\*                                                            | Payload shipped into generated repositories. Not governance.                                                                                                 |

**Do not add a document that claims authority.** Extend one of #2–#9 instead.

**Retired, do not follow:** `docs/nexora-transformation/CLAUDE_MASTER_PROMPT.md`
is superseded by this file. It instructs you to execute the eight phases of
`IMPLEMENTATION_PLAN.md` — all of which closed on 2026-09-21 — and carries a
narrower stop-condition list than `AGENTS.md`.

---

## 2. Word traps that have caused real problems

### "Phase" means three different things

| Source                   | What "Phase 1" means there                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMPLEMENTATION_PLAN.md` | Core Domain Foundation — **closed**, along with Phases 0–7                                                                                                     |
| `STATUS.md`              | nothing. Work is now Waves, remediation IDs and review items, and STATUS says explicitly: _"These IDs are not phases and have no exit criteria of their own."_ |
| Any newer plan           | whatever that plan defined                                                                                                                                     |

**Never write or accept a bare "Phase N".** Say `IMPLEMENTATION_PLAN Phase 3`,
or `closure Slice 2`, or name the work. An instruction to "continue Phase 1"
is ambiguous and has no safe reading.

### `AGENTS.md` has documented exceptions

`AGENTS.md` is law, but three of its rules are knowingly deviated from today.
Before "fixing" an apparent violation, read
`docs/architecture/ARCHITECTURE_GUARDRAILS.md` §2.

The one that bites: `AGENTS.md` §RBAC says to use Community RBAC.
**Community RBAC is deliberately disabled** — it claims the same `/alpha`
`policyExtensionPoint` as `PlatformPermissionPolicy`, and a second
`setPolicy()` throws _"Policy already set"_, breaking the backend at startup.
Re-enabling it is not a fix.

---

## 3. Non-negotiables

- **Backstage is the kernel** (`AGENTS.md`, confirmed 2026-09-26). Extend it
  through plugins, modules and extension points. Never patch, vendor, fork or
  import private internals. `yarn guard:platform` enforces this mechanically.
- **Plugins own their tables.** Cross-plugin reads go over an authenticated
  HTTP resolver, never into another plugin's schema. See
  `composer-backend/src/urs-baseline-resolver.ts` for the established shape.
- **`packages/app` and `packages/backend` are wiring only.** No domain logic.
- **No dependency changes without approval.** Report `DEPENDENCY_CHANGE_REQUIRED`
  as specified in `AGENTS.md` and wait.
- **AI proposes, humans approve.** Anything an AI generates that a person will
  act on must be persisted and auditable before it is applied.

---

## 4. The four gates

Every change must leave all four green. "Tests pass" alone is not done.

```bash
yarn guard:platform   # AGENTS.md rules, mechanically checked
yarn tsc              # typecheck
yarn lint:all
yarn test             # 223 suites; PostgreSQL required for the 65 GxP proofs
```

Without a reachable PostgreSQL the GxP invariant, persistence and
URS→Validation integration suites **skip silently**. CI provisions one
(`.github/workflows/ci.yml`). Locally, a green run with skipped suites is not
a green run — say so rather than reporting it as a pass.

---

## 5. How work is done here

Work proceeds in **vertical slices**, not in layers. A slice is finished when
a real user path through it has been executed, not when its unit tests pass.

Per session:

1. Read `STATUS.md` and the relevant `DECISIONS.md` records.
2. Re-audit the code before changing it. Documentation may be stale; the code
   is not.
3. Implement the next unfinished slice.
4. Meet `docs/development/DEFINITION_OF_DONE.md` in full.
5. Update `STATUS.md` and add a `DECISIONS.md` record in the **same** commit.
6. Run all four gates.
7. Stop and report on any `AGENTS.md` stop condition.

---

## 6. The failure mode to watch for

`NXD-053` names it: code that was **"written, routed, tested, and reachable
from no caller."** Four defects of that shape shipped with full green test
suites and were found only by walking the journey as a user.

A feature that no screen can reach is not implemented. Before calling
something done, name the caller.

---

## 7. Known naming collisions

The same word means different things in different places. Be explicit:

| Word          | Meanings in this repository                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Composer**  | `/compose` (component-selection sandbox, `packages/app/src/modules/composer`) **and** the Product domain (`plugins/composer-backend`, `/products`). Unrelated systems. |
| **Product**   | `products` table · Catalog entity · Artifact kind `DATA_PRODUCT` · commercial SKU                                                                                      |
| **Component** | `product_components` · Platform Component library · Artifact kind `COMPONENT` · Backstage `Component` kind                                                             |
| **Baseline**  | URS `baselines` · `product_baselines` · `validation/baseline/`                                                                                                         |

---

## 8. Language

Code, identifiers, comments, commit messages and documentation are English.
Conversation with the maintainer may be German.
