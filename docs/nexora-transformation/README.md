# Nexora Transformation

Start here for the controlled transformation of Nexora.

Read in this order:

1. `/CLAUDE.md` — authority ranking, gates, and the word traps
2. `/AGENTS.md`
3. `/NEXORA_STRATEGY.md`
4. `PRODUCT_STRATEGY.md`
5. `TARGET_ARCHITECTURE.md`
6. `IMPLEMENTATION_PLAN.md` — **historical**: all eight phases closed 2026-09-21
7. `PHASE_CLOSURE_PLAN.md`
8. `STATUS.md`
9. `DECISIONS.md`

`CLAUDE_MASTER_PROMPT.md` was **removed on 2026-09-26**. If you still have its
session-start prompt saved outside the repository, discard it: it instructed
agents to execute the eight `IMPLEMENTATION_PLAN.md` phases, all of which
closed on 2026-09-21, under a narrower stop-condition list than `AGENTS.md`.
Use `/CLAUDE.md` instead.

`IMPLEMENTATION_PLAN.md` defines the eight phases. `PHASE_CLOSURE_PLAN.md`
defines how the gaps still open in them get closed, in what order, and what
counts as closed — read it before scoping any slice.

For a new Claude session use:

> Read `AGENTS.md`, `NEXORA_STRATEGY.md`, `docs/nexora-transformation/STATUS.md` and `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md`. Continue the Nexora transformation from the next unfinished slice in the closure plan. Re-audit relevant code before changing it, honour the plan's Definition of Done in full — including executing one real path — update STATUS/DECISIONS in the same commit, run all four gates, and respect all stop conditions.
