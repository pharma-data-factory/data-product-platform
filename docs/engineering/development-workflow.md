# Development Workflow

Owner: Platform Team
Last reviewed: 2026-09-26
Audience: INTERNAL ENGINEERING
Status: AUTHORITATIVE for how changes are made in this repository

How a change moves through this repository. What counts as finished is
`definition-of-done.md`; this document is the process around it.

---

## 1. Vertical slices, not layers

Work is scoped as a **vertical slice**: one user-visible capability, from the
screen that reaches it down to the column that stores it, shipped together.

Not a slice: "add the backend routes for X" with the UI to follow. That is
how `NXD-053` happened — four features written, routed and tested, reachable
from no caller, all green.

A slice is named after what a person can now do, not after the layer touched.
`feat(step-2): one door — a product is born with a repository, an entity and
a row` is a slice. `feat: add columns to products` is not.

---

## 2. Before writing code

1. **Read `STATUS.md`** — what is in progress, what closed last.
2. **Read the relevant `DECISIONS.md` records** — most surprising code has an
   NXD record explaining it. Changing it without reading that is how a
   deliberate decision gets undone by accident.
3. **Re-audit the code.** Documentation may be stale; 91% of `docs/` predates
   the bulk of development. The code is the current state.
4. **Check the capability does not already exist** — under Backstage
   (`AGENTS.md` extension-first rule), under another name in Nexora
   (`CLAUDE.md` §7), or as an existing dependency.

---

## 3. While writing

- Match the surrounding code: its comment density, naming and idiom.
- **Comments explain why, not what.** The prevailing style in this repository
  explains the decision and the failure it prevents. Keep it.
- Plugins own their tables. Cross-plugin access is HTTP.
- Typed errors, always (`definition-of-done.md` §3).
- Enforce identity rules in the database as well as the service — a service
  check cannot close a race.

**Stop and report** — do not work around — on any `AGENTS.md` stop condition:
Backstage modification, `node_modules` patching, private internals, direct
Backstage schema changes, a proprietary replacement of Catalog / Scaffolder /
Auth / RBAC, or an unapproved dependency change.

---

## 4. Running it

```bash
yarn install
yarn start                 # frontend + backend
yarn start:github          # with GitHub App credentials from .env
yarn start:demo            # demo identities, for walking the approval chain
```

**Walking the approval chain needs more than one identity.** Segregation of
duties is enforced server-side, so a single seat cannot complete a GxP chain.
Use the local-only `demo` provider (`auth.providers.demo.users`); it is inert
unless users are named and refused outright when `auth.environment` is
production.

**Persistence.** The shipped default is PostgreSQL, for local development as
well as production. `yarn start` needs a database:

```bash
cp .env.example .env          # POSTGRES_* match the compose db service
docker compose up -d db       # publishes 5432
yarn start
```

**This changed on 2026-09-27** (MVP1 item 8 / `NXD-064` C-1). The default used
to be file-backed SQLite with `ursComposer.persistence.mode: memory`, so a
plain `yarn start` ran without the controls that exist only in the Postgres
schema — no single-open-version index, no content immutability trigger, no
durable audit trail. If your stack stopped starting after pulling this, the
database is what is missing.

To work without one, layer the overlay that says what it costs:

```bash
yarn start --config app-config.yaml --config app-config.memory.yaml
```

That file turns permissions off, and has to: the backend refuses to start in
memory mode while `permission.enabled` is true, because an authorization
decision about who may approve or sign is only meaningful if the record of it
survives. So role and authorization work cannot be done in memory mode — use
the default. Neither can anything touching requirements, approvals,
signatures, baselines or releases; there you would be testing a different
system.

### Calling a route from a shell

Two kinds of caller reach a backend route, and they need different
credentials. Getting this wrong reads as a bug in the route.

**As a person** — a user principal, which is what nearly every route wants.
Needs `AUTH_GUEST_ENABLED=true` in `.env`:

```bash
TOKEN=$(curl -s -X POST http://localhost:7007/api/auth/guest/refresh \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["backstageIdentity"]["token"])')
curl -H "Authorization: Bearer $TOKEN" http://localhost:7007/api/composer/products
```

Guest is a VIEWER, so writes answer 403 until you raise `AUTH_GUEST_ROLE`.

**As another backend or another installation** — a service principal. Layer
`app-config.service-token.yaml`, which is **not** auto-loaded and has to be
named:

```bash
yarn start --config app-config.yaml \
           --config app-config.local.yaml \
           --config app-config.service-token.yaml

curl -H "Authorization: Bearer dev-consumer-token-not-a-secret" \
  http://localhost:7007/api/artifact-registry/artifacts
```

This half was undocumented until `NXD-087`, and the cost was not theoretical:
every live verification of a service-principal route had to invent an
uncommitted overlay, and none of them wrote down what it was — so the runs
were not reproducible from the repository.

**Which principal a route wants is not guessable from the outside**, and the
two refusals differ:

| You present | Route wants a user | Route wants a service | Route takes either |
| --- | --- | --- | --- |
| nothing | 401 | 401 | 401 |
| user token | 200 / 403 by role | **403** | 200 / 403 by role |
| service token | **403** | 200 | 200 |

The 403s are `NotAllowedError` — *"This endpoint does not allow 'service'
credentials"*. Backstage reserves 401 for a caller presenting nothing, and
answers a disallowed *kind* of credential with 403. Worth knowing before
debugging: an earlier version of `NXD-074` and of the `authorizeReadOrService`
docblock both said this case was a 401, because both were written from reading
the code rather than from calling the route.

---

## 5. The four gates

```bash
yarn guard:platform
yarn tsc
yarn lint:all
yarn test
```

Run them all before committing. `yarn lint` alone only covers changes since
`origin/main`.

**Tests need PostgreSQL.** Without it, 65 tests across 3 suites — the GxP
invariants, the persistence proofs and the URS→Validation integration — skip
**silently** while the run still reports green. CI provisions
`postgres:16-alpine` on port 5435 with the credentials in
`plugins/urs-composer-backend/src/__testUtils__/testDatabase.ts`. Locally,
report the skip count rather than reporting a pass.

Debugging a flaky suite: read the literal error string first, and use
`--runInBand` as the reproduction, not as the fix.

---

## 6. Committing

One coherent change per commit. The message explains **why**, and — for a
slice — **what was walked**.

The prevailing style in this repository is a short declarative subject that
states the outcome, then prose that explains the problem, the decision and
what was rejected. Follow it; it is the reason this codebase is legible.

In the **same** commit:

- `docs/nexora-transformation/STATUS.md` updated;
- a `DECISIONS.md` record for any durable decision, including findings
  deliberately **not** fixed.

Branch from `main`. Do not commit live override files
(`catalog/certification-overrides.json`, `.runtime/`, `.sqlite/`).

---

## 7. Reviewing

Ask, in this order:

1. **Who calls this?** If nothing does, it is not done.
2. **Was the path walked?** Not "do the tests pass".
3. **Does a refusal reach the user as a usable 4xx?**
4. **Does every written field have a column?**
5. **Did an existing test change, and if so, was it passing for the wrong
   reason before?**
6. **Is the record updated in this commit?**

---

## 8. Documentation changes

Before adding a document, read `CLAUDE.md` §1. There are already 619 markdown
files and 21 that called themselves authoritative. Extend an existing
authority rather than creating a new one, and never place a new document in a
new directory when `docs/developer/` (onboarding) or `docs/engineering/`
(internal process) fits.
