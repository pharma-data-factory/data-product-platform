# Definition of Done

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING
Status: AUTHORITATIVE for what "done" means in this repository

Placed in `docs/engineering/` rather than in a new `docs/development/`
directory: `docs/developer/` (onboarding) and `docs/engineering/` (internal
process) already exist, and a third near-identical directory is the
duplication problem this document set is meant to reduce.

---

## Why this document exists

`NXD-053` records four defects that shipped with a **fully green test suite**
and were found only when someone walked the journey as a user. Each was, in
its own words:

> written, routed, tested, and reachable from no caller.

A requirement version could not leave DRAFT from the browser, so no baseline a
user created could ever be released. `createProductBaseline` was called from
no page, so `NO_APPROVED_BASELINE` was a blocker no user could clear.
`updateProduct` silently dropped three fields, so three policy obligations
were permanently unclearable — and stored `gxpRelevance:
'TOTALLY_MADE_UP_VALUE'` as a satisfied classification.

None of that is caught by unit tests. All of it is caught by this checklist.

---

## The checklist

A change is done when **every** line holds. Not most.

### 1. It is reachable

- [ ] **Name the caller.** For every new or changed service method and route,
      state which screen, action or scheduled job invokes it. If the answer is
      "a test", it is not done.
- [ ] **Walk one real path.** Execute the user journey the change belongs to
      against a running stack — not a mock. Say in the commit message what you
      walked.
- [ ] Nothing the change makes possible is reachable only from React state
      that a page reload would discard.

### 2. The four gates are green

```bash
yarn guard:platform
yarn tsc
yarn lint:all
yarn test
```

- [ ] `guard:platform` reports `RESULT: GUARDRAILS_OK` with **0 FAIL**.
- [ ] `yarn test` ran **with PostgreSQL reachable**. A run that skips suites
      is not a pass — the GxP invariant, persistence and URS→Validation
      integration suites skip silently without it. Report the skip count.
- [ ] No test was weakened to make it pass. If an existing test changed, say
      why in the commit message; a test that passed for the wrong reason is a
      finding, not an inconvenience.

### 3. Errors say what happened

- [ ] Every refusal throws a typed error — `InputError` (400),
      `NotFoundError` (404), `ConflictError` (409), `NotAllowedError` (403).
      A plain `Error` reaches the caller as **500 Internal server error**, and
      a control nobody can see is a control nobody obeys.
- [ ] The message names what to do next, not only what went wrong.
- [ ] An unknown identifier answers 404, not 200 with an empty list.

### 4. Persistence is real

- [ ] Every field the code writes has a column. A value that survives in
      memory mode and vanishes under PostgreSQL is a defect, not a difference.
- [ ] Migrations are idempotent and safe against databases that already hold
      rows.
- [ ] Identity rules that matter are enforced **in the database as well as the
      service** — a service check cannot close a race between two concurrent
      writes (`NXD-009`).

### 5. Governance and evidence

Applies to anything touching requirements, approvals, signatures, baselines,
classification or the release gate.

- [ ] The action writes an audit event with actor, timestamp, and — where the
      store supports it — old value, new value and reason.
- [ ] Segregation of duties is enforced server-side, not assumed.
- [ ] A GxP-relevant invariant is enforced at the database level where
      PostgreSQL allows it. Application code being correct is not a control.
- [ ] Nothing an AI generated is applied without having been persisted first.

### 6. The record is updated in the same commit

- [ ] `docs/nexora-transformation/STATUS.md` reflects the new state.
- [ ] A `DECISIONS.md` record exists for any durable decision, including the
      ones you decided **not** to act on.
- [ ] Findings discovered but deliberately not fixed are written down with
      that status. Six were recorded this way on 2026-09-25; two were closed
      the same day and four remain open and visible.

### 7. Nothing was quietly widened

- [ ] No dependency added, removed or moved without the
      `DEPENDENCY_CHANGE_REQUIRED` report and explicit approval.
- [ ] No new document claims authority (see `CLAUDE.md` §1).
- [ ] No `AGENTS.md` stop condition was crossed.

---

## Not done, specifically

These look finished and are not:

| Looks done                 | Is not done until                                     |
| -------------------------- | ----------------------------------------------------- |
| Route exists and is tested | a screen calls it                                     |
| Service method written     | the route exposes it **and** a caller reaches it      |
| Field added to the type    | a column holds it and a migration creates it          |
| Refusal implemented        | it arrives at the client as 4xx with a usable message |
| Tests green locally        | they were green with PostgreSQL up                    |
| Feature works              | the journey containing it was walked end to end       |
