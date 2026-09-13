# Validation Expert — Validation Impact

**Component:** Validation Expert v0.1  
**Platform candidate:** Platform Core 1.0-RC2 (`platform-core-v1.0-rc2`)  
**Platform validation status:** `NOT_VALIDATED`  
**Validation Expert validation status:** `NOT_VALIDATED`  
**Date:** 2026-08-22

## Summary

Validation Expert is a native Backstage workbench that presents and orchestrates the existing `validation/` package. It is **not** an AI agent and is **not** itself validated.

## Why this component is validation-relevant

Validation Expert becomes a validation-relevant platform component because it:

1. **Orchestrates formal test execution** (IQ/OQ/UAT runs, including automated MVP runners and manual workflows).
2. **Records validation evidence metadata** (runtime evidence references, checksums, timestamps).
3. **Associates identity with test execution** (Backstage authenticated `userEntityRef`, provider reference, timestamps).
4. **Manages findings** generated from failed formal tests (OPEN → REMEDIATED_PENDING_RETEST → CLOSED workflow reserved for controlled retest).

Therefore Validation Expert will require its **own controlled validation baseline** before it may be relied upon as the authoritative formal validation execution system.

## Authoritative fallback (MVP)

Until Validation Expert is independently validated:

- Existing manual validation artifacts under `validation/baseline/` and `validation/execution/` remain the **authoritative** Source of Truth.
- Runtime store under `validation/runtime/` is a development/orchestration aid, not a Part 11 or GxP claim.
- Product status must continue to display **NOT_VALIDATED** regardless of successful Validation Expert developer tests.

## Persistence

`validationExpert.persistence.mode` may be `file` (default), `memory`, or
`postgres`. Postgres mode uses the Backstage database client for durable run /
finding / evidence / context storage. **Durable storage does not change
validation status**: Validation Expert remains **NOT VALIDATED** and makes **no
Part 11** claim.

## Explicit non-claims

- No electronic signatures
- No 21 CFR Part 11 claim
- No GxP validation claim for Validation Expert or Platform Core
- No AI approval / risk acceptance / requirement generation
- No automatic validation package approval

## Next controlled step (not v0.1)

Establish a Validation Expert requirements baseline, risk assessment, and IQ/OQ for the plugin itself before promoting it to authoritative formal execution.
