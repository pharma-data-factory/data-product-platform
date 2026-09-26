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
