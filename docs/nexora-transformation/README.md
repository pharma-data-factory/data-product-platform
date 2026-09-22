# Nexora Transformation

Start here for the controlled transformation of Nexora.

Read in this order:
1. `/AGENTS.md`
2. `/NEXORA_STRATEGY.md`
3. `PRODUCT_STRATEGY.md`
4. `TARGET_ARCHITECTURE.md`
5. `IMPLEMENTATION_PLAN.md`
6. `PHASE_CLOSURE_PLAN.md`
7. `STATUS.md`
8. `DECISIONS.md`
9. `CLAUDE_MASTER_PROMPT.md`

`IMPLEMENTATION_PLAN.md` defines the eight phases. `PHASE_CLOSURE_PLAN.md`
defines how the gaps still open in them get closed, in what order, and what
counts as closed — read it before scoping any slice.

For a new Claude session use:

> Read `AGENTS.md`, `NEXORA_STRATEGY.md`, `docs/nexora-transformation/STATUS.md` and `docs/nexora-transformation/PHASE_CLOSURE_PLAN.md`. Continue the Nexora transformation from the next unfinished slice in the closure plan. Re-audit relevant code before changing it, honour the plan's Definition of Done in full — including executing one real path — update STATUS/DECISIONS in the same commit, run all four gates, and respect all stop conditions.
