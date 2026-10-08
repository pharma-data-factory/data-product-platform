# Nexora Transformation Status

## Current Phase

Post-plan, and the phase frame is **retired** — see
[`NXD-073`](DECISIONS.md). It meant three different things at once and carried
orderings nobody could still justify. Work is ranked on merit in
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) §9.

All eight phases of `IMPLEMENTATION_PLAN.md` have met their exit criteria. The
last to close was **Phase 7, on 2026-09-28**, through Slice 6 — package and
source providers ([`NXD-076`](DECISIONS.md)).

> **Corrected 2026-09-29.** This section said "Phase 7 closed on 2026-09-21"
> for eight days. That was the belief before the code audit of 2026-09-22
> written for `PHASE_CLOSURE_PLAN.md`, which found Phases 2, 3, 4 and 7 still
> open against their own criteria; §4 of that document carries the verified
> table. The date here was never re-checked against it, which is the ordinary
> way a status document goes wrong — not by being written carelessly, but by
> not being re-read after something else moved.

Work since the plan realizes `PRODUCT_STRATEGY.md` directly, in three Waves
(Wave 1 = `P-EXT-S1..S5`, Wave 2 = `W2-1..4`, Wave 3 = `W3-1..8`) followed by a
numbered remediation series (`5-R1`, `6-R1..R3`, `7-R1..R6`, `A-2`, `A-3`) and
a review-item series (items 1–9). These IDs are not phases and have no exit
criteria of their own.

## Current Vertical Slice

**Maturity-audit remediation, wave 4 — frontend (2026-09-30).** Waves 1–3
barely touched the frontend, and a recount at `7fb817b` found it where the
re-audit left it: six failed loads rendered as empty states, one retry
affordance in the whole UI, no keyboard handling, 38 of 59 pages without a
test, and no end-to-end test of the regulated path in CI. This wave takes the
four quick wins F1–F4, one commit and one record each.

- **F1 — a load that failed stops looking like an empty result.**
  `useLoadable` and `LoadError` in `plugin-nexora-common`; six pages
  converted. The approval page was worse than reported: a failed approval
  lookup showed "No approval workflow active" and offered **Create
  baseline**. See [`NXD-094`](DECISIONS.md).
- **F2 — the keyboard gets a way in.** The wizard's first, mandatory step
  could not be completed without a mouse (a `readOnly` checkbox inside a
  clickable card). Clickable table rows gain real links, icon-only buttons
  get names, the footer status stops being colour-only, and a guard test
  keeps two of those rules from regressing. See [`NXD-095`](DECISIONS.md).
- **F3 — the wizard stops discarding typed work without asking.** Cancel
  with unsaved changes asks first; deleting a requirement or a criterion
  offers Undo, which re-inserts into the current list. The criterion delete
  was writing into React state in place. See [`NXD-096`](DECISIONS.md).
- **F4 — the approval chain is walked in a browser.** Three demo seats, real
  PostgreSQL, every regulated act through the e-signature dialog, SoD
  asserted live, a new `e2e` CI job. Its first runs found two defects: the
  demo sign-in buttons never rendered (config schema), and a created
  baseline stayed invisible until reload. axe awaits a dependency approval.
  See [`NXD-097`](DECISIONS.md).
- **Follow-up — the scaffolder's author tools leave production.** Template
  Editor, Actions and Templating Extensions are disabled in
  `app-config.production.yaml`; the editor showed a 404 to every non-admin.
  The overlay repeats the base extension list, because a list overlay
  replaces rather than extends. See [`NXD-098`](DECISIONS.md).
- **Follow-up — honest sign-in and publish messages.** A network failure
  no longer reads "GitHub is unavailable" (it said so for Guest sign-ins
  too); Golden Paths stop at their first step when the environment has no
  GitHub credentials, and the Build page says so before anyone starts.
  Verified with a live task. See [`NXD-099`](DECISIONS.md).
- **Follow-up — release readiness at a glance.** Every product version
  shows its release-gate verdict, requirement coverage as meters, and
  readable blockers, loaded automatically instead of at RELEASE_CANDIDATE
  on request. No invented "n of m checks"; validation shows *unknown* rather
  than zero; colours validated, not eyeballed. See [`NXD-100`](DECISIONS.md).
- **Defect — an expired session crashed a page (React error #31).**
  Backstage's nested error body was rendered as an object by the URS client;
  three more clients showed "[object Object]". One helper now reads both
  shapes, and an ended session says so. See [`NXD-101`](DECISIONS.md).
- **Defect — every "Docs" link was a 404.** Eleven catalog entities pointed
  TechDocs at directories it will not build, and the platform docs entity
  they needed was never registered. They now borrow its docs via
  `techdocs-entity`, links use the entity's real kind, and a guard checks
  every reference. Production still cannot build TechDocs (no MkDocs in the
  image) — named, not fixed. See [`NXD-102`](DECISIONS.md).
- **Navigation and in-page help.** Build holds the two ways to a new Data
  Product (*New from Golden Path*, *Compose from components*); *Release &
  Governance* is its own step; *Help & Docs* reaches the Developer Hub,
  which had no nav entry. Build, Compose and Release show where they sit in
  Build → Release → Operate and what comes next. See [`NXD-103`](DECISIONS.md).
- **Defect — a manual walk of the OEE approval chain (URS-EPM).** It got
  from DRAFT to an approved baseline, and the page misreported it four
  times. A role refusal reached the signer as "Signing failed."; Approve
  was offered to seats without the step's role; "NOT_STARTED" meant
  "waiting for the first signature"; and the approved baseline and set
  stayed DRAFT on screen until a reload. New read route
  `GET /approval-roles/me`. See [`NXD-104`](DECISIONS.md).
- **Defect — the OEE Golden Path had never completed a run.** A Python
  literal `"${{"` in the skeleton is an unterminated placeholder to
  `fetch:template`, so every run stopped at *Fetch skeleton*. The template
  tests render with a regex and could not see it. A new test runs
  Backstage's real `fetch:template` over every template. See
  [`NXD-105`](DECISIONS.md).
- **Administrator installation, readable without the app.** `README.md`
  now covers the three topologies (one container, separate containers,
  workspace with only PostgreSQL in Docker), has a diagram of how GitHub and
  AWS Marketplace connect, and lists every root config file. A test system
  is `AUTH_DEMO_ENABLED=true`: one sign-in per approval role, including the
  new `demo-pm`. `yarn start` now honours the `.env` sign-in flags. A fresh
  production install gets its first administrator from
  `USERS_BOOTSTRAP_ADMIN`. See [`NXD-106`](DECISIONS.md). Proposed, not in
  force: the source of truth for roles ([`NXD-107`](DECISIONS.md)) and
  provisioning users into GitHub ([`NXD-108`](DECISIONS.md)).
- **Decided, and the configuration clean-up.** Approval roles are granted
  only in Nexora ([`NXD-107`](DECISIONS.md), accepted). GitHub team
  membership follows platform roles, opt-in ([`NXD-108`](DECISIONS.md),
  accepted, not yet built). `GITHUB_ORG` is read, the AWS link-store
  variable has one name, `app-config.p1a-test.yaml` is gone, and the user
  onboarding docs describe Admin → Users & Roles. AWS Marketplace stays a
  test integration until distribution is approved. See
  [`NXD-109`](DECISIONS.md).
- **NXD-108 GitHub team sync, part 1.** `users.githubTeamSync` in
  `app-config.github.yaml` (off by default), validated at startup; a
  `urs-*` group stops the backend. GitHub team client (four calls, App
  credentials, native `fetch`) and the `github_team_sync_state` table.
  Nothing writes to GitHub yet. See [`NXD-110`](DECISIONS.md).
- **NXD-108 GitHub team sync, part 2 — complete.** The reconciler runs on
  the scheduler (one global, locked task, every 15 minutes) and right after
  every role change. It removes before it adds, only touches logins Nexora
  manages, and isolates failures per team. Every change goes to
  `user_audit_events`. `GET/POST /api/users/github-sync[/run]`; banner and
  per-user team chips in Admin → Users & Roles. Off by default. See
  [`NXD-111`](DECISIONS.md).
- **A group may map to several GitHub teams.** `platform-admins` is now in
  `nexora-admins`, `nexora-developers` and `nexora-owners`. Repository
  rights are set on the teams in GitHub. See [`NXD-112`](DECISIONS.md).
- **GitHub setup as one checklist.** `docs/github-setup.md` opens with the
  full GitHub prerequisite setup in order: OAuth App, GitHub App permissions
  (including the collapsed Members setting), installation acceptance,
  credentials, teams, `.env`, verification. Linked from README and
  `START.md`. See [`NXD-113`](DECISIONS.md).
- **Installation docs before sign-in.** `/install` on the landing page shows
  six curated setup documents without sign-in, bundled at build time and
  linked from the footer and the login view. `NEXORA_PUBLIC_DOCS=false`
  hides it. Audits, strategy and decision records stay behind sign-in. See
  [`NXD-114`](DECISIONS.md).
- **Flaky migration test — the refusal was real, the assertion was not.**
  better-sqlite3 keeps the `SqliteError` class of the first test file per
  Jest worker, so later files saw a refused insert as "did not throw".
  `github_team_sync_state` refusals are now asserted by SQLite error code.
  See [`NXD-115`](DECISIONS.md).
- **Team sync adds only organization members, with a dry run.** The first
  run would have invited the GitHub accounts behind the seed and demo
  logins (`admin`, `developer`, `demo-pm`, …) into the organization. Each run
  now reads the organization's members and adds only those.
  `GITHUB_TEAM_SYNC_DRY_RUN=true` reports the plan and writes nothing. See
  [`NXD-116`](DECISIONS.md).
- **CI image job: a vanished action tag.** The first `main` run after the
  merge failed `image` at *Set up job*: `aquasecurity/trivy-action@0.28.0` no
  longer exists upstream (tags are now `v`-prefixed). Pinned by commit to
  v0.28.0. See [`NXD-117`](DECISIONS.md).
- **First complete Golden Path run.** The OEE Golden Path as `demo-author`
  failed at registration (403: `catalog.location.create` is admin-only),
  then on a malformed descriptor (`policy-version` rendered as a number).
  `nexora:catalog:register` registers only repositories of the platform
  organisation, for initiators who may create entities, after a dry run; the
  annotation is quoted in all nine templates. Run 3 completed all six steps.
  See [`NXD-118`](DECISIONS.md).
- **Validation decisions are signed.** The validation expert signs, then QA
  when a GMP-relevant product (INDIRECT, DIRECT or unanswered) depends on the
  baseline; otherwise one signature suffices. PIN via the URS Composer,
  append-only signatures, no administrator approval. A GMP product needs a
  decision under that rule at the release gate. Demo seat `demo-validator`.
  See [`NXD-119`](DECISIONS.md).
- **Decision panel.** The validation context page states the GMP rule,
  lists the signatures, and offers *Sign as …* only to the role that is due,
  with verdict, justification and PIN; *Set signing PIN* included. See
  [`NXD-120`](DECISIONS.md).
- **First product released end to end.** `oee-e2e-test-20261005-c` went
  from the OEE Golden Path to RELEASED in the browser: seven demo seats,
  validation signed by the expert and QA. A second QA seat `demo-qa-lead` was
  needed, because the first had created the validation context. Open findings
  are listed in the record. See [`NXD-121`](DECISIONS.md).
- **OEE tests name their requirements (C1).** `@pytest.mark.urs(...)` on ten
  modules, a new test for URS-EPM-005, conftest hooks writing
  `test-evidence/`, uploaded by CI as `nexora-test-evidence`. Found: the loss
  tests (URS-EPM-002) were in no CI step. See [`NXD-122`](DECISIONS.md).
- **CI evidence imported (C2).** data-products reads the newest CI run's
  `nexora-test-evidence` artifact; Composer records one test execution per
  matched requirement; *Import CI evidence* on the Tests tab. Live:
  `oee-e2e-test-20261005-d`, 5 of 5 requirements verified from 81 CI
  outcomes. See [`NXD-123`](DECISIONS.md).
- **Product evidence review, and no approval without it (C3, C4).** Runs of
  type EVIDENCE judge each context requirement on the product's recorded CI
  evidence; coverage counts them; every approval needs a complete review.
  Product pages no longer read *Validated: Unknown*. Live: 5/5 for
  `oee-e2e-test-20261005-d`. See [`NXD-124`](DECISIONS.md).
- **CI image job, second link.** After PR #13 `image` failed again: the
  pinned trivy-action v0.28.0 itself calls `setup-trivy@v0.2.1`, also gone.
  Now v0.36.0, which pins its own actions by hash. See
  [`NXD-125`](DECISIONS.md).
- **CI image job, third link.** Past *Set up job* at last, the build failed:
  SBOM/provenance attestations need a Buildx builder. Added
  `docker/setup-buildx-action`. See [`NXD-126`](DECISIONS.md).
- **Validation decision per product version.** Decision, signatures and
  evidence review carry the version; the gate asks for exactly the version it
  releases; the panel has a version picker. The pre-NXD-127 decision covers no
  version. See [`NXD-127`](DECISIONS.md).
- **Signed approval and release.** For a GMP-relevant product, version
  approval, baseline approval and release need a justification and the PIN;
  NONE confirms. Every act is recorded append-only and listed on the product
  page. See [`NXD-128`](DECISIONS.md).
- **MVP1 step 2, decided: the runtime provider seam.** An Installation is
  governed desired state in Nexora. A runtime provider outside the Backstage
  backend pulls it with a service token and executes it, Docker Compose
  first. This refines NXD-074's "does not deploy" to "does not execute".
  Record only, no code. See [`NXD-129`](DECISIONS.md).
- **MVP1 step 1, the schema: `nexora.yaml` is the canonical Data Product
  manifest.** `nexora-manifest.schema.json` (JSON Schema 2020-12) in
  `platform-common` adds `metadata.license`, `spec.runtime`,
  `spec.interfaces` and `spec.config` to `nexora.dev/v1alpha1`, additively;
  21 of 21 shipped manifests stay valid. **Enforced** at the registry's
  registration gate through `validateRunnableManifestSections` (ajv,
  approved). Not in `validateArtifactManifest`, because the browser runs
  that. Cross-field port and uniqueness rules are code beside it. See [`NXD-130`](DECISIONS.md).
- **MVP1 step 3: the OEE Golden Path ships `nexora.yaml`.** It renders valid
  against the schema, `validateArtifactManifest` and the registry gate, and
  agrees with `catalog-info.yaml`; a test renders it through the real
  `fetch:template`. All four unread `dataproduct.yaml` files are gone.
  `asyncapi.yaml` is now valid AsyncAPI 3.0 and says *receive*. Topics stay
  config until a provider binds them. See [`NXD-131`](DECISIONS.md).
- **MVP1 step 4a: a version tag builds, pushes and records one image.** The
  OEE skeleton gains `release.yml`. A `v*` tag runs the same gate, checks the
  tag against `nexora.yaml`, pushes to GHCR with SBOM and provenance, and
  publishes `nexora-release.json` on a GitHub Release. No Nexora secret:
  Nexora will pull it (4b). `openapi.yaml` now documents all 24 operations,
  and a route-coverage test keeps it so. Not yet run live. See
  [`NXD-132`](DECISIONS.md).
- **MVP1 step 4b: Nexora reads the release record into the approved
  baseline.** *Import release provenance* on the Tests tab. data-products
  finds the version's GitHub Release (`1.0` ≡ `v1.0.0`) and reads
  `nexora-release.json` and the tag's commit. Composer refuses a record for
  another version, tag or commit, and writes through NXD-052's write-once
  path. The release, not the person, is the recorder; the person is the
  audit actor. See [`NXD-133`](DECISIONS.md).
- **Defect: a lint error since NXD-128.** A nested ternary in
  `signedVersionTransition` kept CI's `lint:all` red from `62667a3` on. It is
  now a lookup, with no behaviour change, and `lint:all` is clean. See
  [`NXD-134`](DECISIONS.md).
- **MVP1 step 4, live.** In `oee-e2e-test-20261005-d`, tag `v1.0.0` ran the
  gate, pushed `ghcr.io/pharma-data-factory/oee-e2e-test-20261005-d@sha256:6e696d5f…`,
  and published `nexora-release.json`. *Import release provenance* recorded
  commit and digest on the approved baseline `1.0`; a re-import was a no-op.
  This ran on a personal token, not a GitHub App. Open finding:
  `PUT /signing-pin` needs no current PIN. See [`NXD-135`](DECISIONS.md).
- **Follow-up recorded: signing-PIN re-enrolment.** A PIN can be replaced
  without the current one, so a session alone resets a Part 11 second factor.
  Proposed fix: change needs the current PIN, plus an audited admin reset. Not
  in force; ranked in the closure plan. See [`NXD-136`](DECISIONS.md).
  _Decided 2026-10-07 and in force since `NXD-138`, the last item below._
- **MVP1 step 5: a recorded release becomes a registry version.** The import
  registers the build as a DRAFT ArtifactVersion on the importer's behalf,
  from the `nexora.yaml` at the tagged commit, with image, digest, commit and
  release on the version. The registry refuses to certify or publish a
  runnable version without a build (R8). An *Artifact Registry* card on the
  Tests tab walks submit → review → certify → publish. Live: `…@1.0.0`
  reached RELEASED with digest `sha256:6e696d5f…`. Found: no SoD in the
  registry; COMMUNITY publishers can publish despite the claim; publish does
  not ask the release gate. See [`NXD-137`](DECISIONS.md).
- **A signing PIN can no longer be replaced by the session it protects.**
  The user decided `NXD-136` (options 1 + 2). A first PIN is free. A change
  needs the current PIN: missing → 400, wrong → 403 and counted, locked →
  403. A platform administrator (`platform.user.manage`) can clear a seat's
  PIN, failed attempts and lockout, with a reason, audited append-only as
  `PIN_RESET`, never set one, and never their own. The URS Composer's PIN
  dialog asks for the current PIN only when one exists and tells a locked
  seat why it cannot change it. *Reset signing PIN* is on Admin → Users &
  Roles. No demo-seat exemption; `demo-pm`'s PIN is left as it is. OIDC
  step-up remains the target. See [`NXD-138`](DECISIONS.md).
- **MVP1 step 6, slice 1 of NXD-129: the installations store.** A new
  `installations-backend` holds runtime targets and installations: a
  RELEASED, built registry version at its recorded digest, on one target,
  with configuration validated against `spec.config`; a secret is a
  reference only. Desired and observed state are separate columns; only the
  provider API (slice 2) will write the observed ones. Installing, upgrading
  and removing a GMP-relevant product needs a justification and the PIN
  (the user's QA decision); otherwise a confirmation. Every act is recorded
  in one transaction, in append-only trails. A GMP install opens an IQ
  record `PENDING_EVIDENCE`; evidence intake and QA sign-off come later.
  The GMP classification comes from the Composer product that governs the
  artifact. No provider, no UI, no live run yet. See [`NXD-139`](DECISIONS.md).
- **Two rules confirmed by the user.** An artifact that no Composer
  product governs is now installed as GMP-relevant: justification, PIN and
  an IQ record. Only a governing product answering NONE waives the
  signature. An administrator still cannot reset their own signing PIN; that
  rule from NXD-138 is now decided, not proposed. See [`NXD-140`](DECISIONS.md).
- **MVP1 step 7: Install in the Marketplace.** A released, built Data
  Product is now listed in the Marketplace even without a `spec.marketplace`
  block. Before this, the product released in NXD-137 was not listed at all.
  Its page has an *Install* card: where it is installed, and for owners and
  admins a dialog with version, target, name, the `spec.config` fields
  (secrets by reference) and the signature or confirmation the store will
  ask for, read in advance from a new classification route. Verified live up
  to the dialog. No install was run live, because there is no runtime target
  and no demo seat may register one. See [`NXD-141`](DECISIONS.md).
- **MVP1, before step 8: storage in the manifest.** `nexora.yaml` can now
  declare the state a product keeps (`spec.runtime.storage`: name, absolute
  `mountPath`, optional size). The provider supplies each area per
  installation, and it survives restart and upgrade. What backs it and
  whether it is kept on removal belong to the target and the installation.
  The OEE template declares `/app/data`, where its SQLite database lives.
  A test keeps the manifest, Dockerfile and Compose file in step. See
  [`NXD-142`](DECISIONS.md).
- **MVP1 step 8, part 1: the provider API.** A runtime provider reads its
  target's desired state, each installation with its released runtime
  (ports, health, storage), and reports what runs. Only the service
  principal named as the target's `providerSubject` may call either route,
  and no person may. A report updates the observed state without moving the
  installation's revision. The audit trail records changes, not polls. A
  report showing the desired revision RUNNING at the desired digest and
  configuration records the IQ evidence (`EVIDENCE_RECORDED`). Found and
  fixed: every act wrote the observed columns back as it had read them,
  which would have erased a report that arrived in between. Not yet: QA
  sign-off, drift handling, rebinding a provider. See
  [`NXD-143`](DECISIONS.md).
- **MVP1 step 8, part 2: the Docker Compose provider.** A new package,
  `runtime-provider-compose`, runs beside Docker, never in the backend. It
  pulls its target's desired state and runs each installation as a Compose
  project: the image by digest, a named volume per storage area, ephemeral
  host ports, and secrets resolved from files into a 0600 env file. It
  reports what Docker shows: labels, RepoDigests and health. Removal keeps
  the volumes. Proven against real Docker with a public image: install,
  leave alone, upgrade with the data surviving, removal keeping the volume.
  It has not yet run against Nexora; that is the live run. See
  [`NXD-144`](DECISIONS.md).
- **The live run paused at the image pull; the supplier track comes first.**
  The released OEE product was installed (a signed GMP act) on a registered
  target. The provider read it and reported FAILED: the GHCR package is
  private, and no available token has `read:packages`. The user decided to
  close the supplier-side gaps first, then automatic CI evidence, then
  AI-assisted build (`PHASE_CLOSURE_PLAN.md` §9.7, S1–S6). The run resumes
  after S3.
- **S1: a URS baseline is required only of a GMP product.** A product
  answering NONE may now be released without a URS binding. Making that
  conditional exposed three different "is GMP" rules in the composer. All
  of them now use the shared one, under which only an explicit NONE is
  exempt. As a result, a product that has not answered is now also asked
  for its criticality. See [`NXD-145`](DECISIONS.md).
- **S2: registry governance.** Every lifecycle transition is now recorded,
  append-only, with its actor; before this the registry recorded none. The
  submitter may not review or certify, and the reviewer may not certify.
  A COMMUNITY publisher may not certify or publish. A version of a
  governed artifact is published only once its product version is
  RELEASED in Nexora; if the Composer cannot answer, nothing is published.
  Live finding: the OEE version published on 2026-10-07 would not pass
  this rule. It stays published, because the rule is not retroactive. See
  [`NXD-146`](DECISIONS.md).
- **S3: a consumer can pull private images.** A runtime target names, for
  each registry, a reference to a secret in its own store, never the
  credential itself. The provider logs in with it in an isolated Docker
  configuration per target, then pulls. Proven against a password-protected
  local registry: refused without the credential, running with it. The
  live run now needs only a token with `read:packages`, placed as a secret
  file. See [`NXD-147`](DECISIONS.md).
- **MVP1 live: install → run → IQ evidence.** The released OEE product,
  installed in Nexora as a signed GMP act, was pulled from private GHCR
  through the target's credential reference. It ran healthy on the local
  Docker host and was reported RUNNING. The provider's facts (digest,
  configuration hash, target) matched the desire, so the IQ record moved to
  `EVIDENCE_RECORDED` without anyone typing a value. QA sign-off is the
  open step. See [`NXD-148`](DECISIONS.md).

## Previous Vertical Slices

**Maturity-audit remediation, wave 3 (2026-09-30).** A re-audit against
`958c00f`, after waves 1 and 2, placed the platform at roughly 2.5 of 5: the
GxP reference implementation in `urs-composer` is at 3–4, the product and
release path in `composer-backend` and the operability story at 1–2. This
wave takes the four quick wins that stand between it and stage 3, one commit
and one record each.

- **S1 — validation evidence stops living in the container.** Production fell
  back to a JSON file for Validation Expert runs because no overlay set the
  key; the backend now refuses anything but `postgres` when
  `auth.environment` is production, and both production-auth overlays set it.
  See [`NXD-090`](DECISIONS.md).
- **S2 — a catalog author no longer chooses where the Control Plane
  connects.** The consume-base-url annotation is followed only for an
  allow-listed origin resolving to public addresses; operator configuration
  stays trusted, the rest path may not change the host, and redirects are
  refused. See [`NXD-091`](DECISIONS.md).
- **D2 — the product and user trails become append-only in the database.**
  `composer_audit_events`, `user_audit_events` and `user_sign_in_events`
  refuse `UPDATE`, `DELETE` and `TRUNCATE` by trigger, as the URS trail has
  refused the first two since `NXD-064`. Proven on PostgreSQL. See
  [`NXD-092`](DECISIONS.md).
- **W1 — traceability links are scoped in the database.**
  `listTraceabilityLinks` takes the ids a caller asks about and has no
  unscoped form. The existing pair indexes lead with the type and could not
  serve an id-only lookup — `EXPLAIN` showed a sequential scan — so two
  single-column indexes were added. See [`NXD-093`](DECISIONS.md).

**Maturity-audit remediation, wave 2 (2026-09-29).** Closes the finding wave 1
could not: relationship computation moves out of the browser. Backstage
already materializes `apiConsumedBy`, `apiProvidedBy` and `dependencyOf` as
reverse edges, and `model.ts` already used one of them sixty lines from a
full-catalog scan asking the same question. `fetchProductNeighbourhood` walks
those edges and hands the bounded result to the *existing*
`toRelatedDataProducts`, so the logic is not reimplemented — a parity test
compares both paths with `toEqual` rather than assuming they agree.
`ContractRelationProcessor` makes the graph trustworthy for entities that
carry only the legacy `dataprod.platform/providesContract` annotation, by
copying it into `spec.*Apis` so the catalog emits the relation itself. See
[`NXD-089`](DECISIONS.md).

`ProductContractPage` turned out to be wrong as well as slow: it matched
consumers with `ref.includes(name)`, so `filler-01` collected the consumers of
`filler-01-extended`. The `dependencyOf` relation is an exact edge.

Three pages still scan, and are untouched rather than half-converted:
`PlatformComponentDetailPage`, `EquipmentDetailPage`,
`MarketplaceDetailPage`. Each needs its own neighbourhood shape; the pattern
is now proven.

**Maturity-audit remediation, wave 1 (2026-09-29).** A product-maturity audit
run against the running code placed the platform at the upper end of stage 2
of 5 — construction quality at 3–4, operability at 1–2 — and this closes the
low-effort half of it. Outbound LLM calls get a deadline, a startup assertion
refuses an AWS Marketplace integration whose customer links would only live in
memory, `/metrics` exposes the prom-client registry the catalog has been
writing to all along, Backstage's own rate limiter is switched on, and CodeQL,
Trivy, `yarn npm audit`, SBOM and a coverage ratchet enter CI. See
[`NXD-088`](DECISIONS.md).

Three of the audit's own findings did not survive contact with the code, and
those are the part worth carrying forward:

- **"No helmet" was wrong.** `rootHttpRouterServiceFactory` has always applied
  it. What the same reading did find is that its `rateLimit()` is a
  pass-through while `backend.rateLimit` is unset — so the only rate limiting
  in the repository guarded entitlement registration, in one process.
- **"No code splitting" was a grep artifact.** The audit searched for
  `React.lazy`; this app is on the new frontend system, where splitting is
  `loader: () => import(…)` in a page extension. All 28 have one.
- **"Replace the catalog scans with `getEntityByRef`" was too optimistic, and
  the correction makes the defect worse.** Only one of seven detail pages
  converts safely. Five compute cross-entity relationships in the browser, so
  resolving one entity by ref would have returned empty consumers and
  `UNKNOWN` compatibility — silently wrong rather than loudly broken. The real
  defect is relationship computation living in the client. **Open decision:**
  whether to answer it from the catalog's own reverse relations
  (`apiConsumedBy`, `dependencyOf` — already used a few lines away in the same
  file, and populated by every Golden Path template) or from a new backend
  endpoint. The first is possible only if the legacy
  `dataprod.platform/providesContract` annotation path may stop feeding
  relationship computation; nothing in the repository currently emits it.

## Previous Vertical Slices

**T3 — a consuming installation can read (2026-09-29).** Wave 4 of
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) §9.4a. Six artifact-registry
read routes moved from `authorize` to `authorizeReadOrService`, the helper
that had sat in the same file since closure Slice 3 wired to one route. A
downstream installation presents a static `backend.auth.externalAccess` token
and reads; no write route admits one, and a test pins that. See
[`NXD-087`](DECISIONS.md).

Three claims the repository made about this change did not survive being
executed, and they are the part worth carrying forward:

- **The refusal was a 403, not a 401.** Four documents said 401 — `NXD-074`,
  the T3 row, the helper's own docblock, `TARGET_OPERATING_MODEL.md` §6.5.
  Backstage answers a disallowed *kind* of credential with `NotAllowedError`
  and keeps 401 for a caller presenting none. Nothing behaved differently, so
  it survived four readings; it would have sent anyone debugging by status
  code after a malformed credential rather than a wrong-kind one.
- **The credential was unpresentable, not merely unissued.** No committed
  configuration enabled a service principal outside the production image, so
  every earlier live check of such a route used an uncommitted overlay nobody
  wrote down. `app-config.service-token.yaml` now exists — deliberately not
  auto-loaded — and the recipe is in
  [`development-workflow.md`](../engineering/development-workflow.md).
- **The plan for this slice was itself wrong about one thing.** It argued the
  `artifactRegistry.federation` config block had to be declared because
  Backstage would reject the undeclared keys. It does not; a backend starts
  clean with them. Only `config:check --strict` complains, it is in no gate,
  and it already reports ten other undeclared blocks. The schema was added
  anyway — `apiKey` is `@visibility secret` now rather than merely undeclared
  — but with the reason restated rather than the original one kept.

**Found in passing — [`NXD-016`](DECISIONS.md) recurred a third time.** The
first full run after this change failed `evidencePackage.test.ts`, a suite
this slice does not touch, with "Received function did not throw" on a
foreign-key refusal — the native-driver realm crossing `NXD-016` recorded and
banned the bare `.rejects.toThrow()` for. Written into the suite the day
before by `NXD-083`, green on landing, red on the next full run, green in
isolation. Changed to `expectRefusedByDatabase`. **Not reproduced
deterministically** — `--runInBand` within the workspace passes either way —
so this is a matching signature and the prescribed remedy, not a
caught-in-the-act diagnosis. A suite can land green and still carry a
known-and-recorded defect, because the defect is invisible whenever the
scheduling is kind.

**What it does not do:** nothing renders a federated result. The merge still
keys on `namespace/name` without a version, so a higher upstream version is
discarded by construction, and the manifest is still discarded, so no card
could be built from one. That is T4.

**Governance consolidation (2026-09-26).** No feature work. A read-only
conformance audit was taken first
([`docs/audits/TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md),
commit `d68308f`), and the documentation was then brought into agreement with
the code. What changed, and where the current answer now lives:

| Was                                                                                  | Now                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 21 documents called themselves "authoritative"                                       | one ranking, in [`/CLAUDE.md`](../../CLAUDE.md) §1                                                                        |
| three decision-record systems                                                        | **`DECISIONS.md` (NXD) only**; ADR-001..010 and the second ADR-004 archived under `docs/archive/architecture/adr-legacy/` |
| `capability-matrix.md` claimed AAS CERTIFIED/RELEASED                                | **DEPRECATED**; the Catalog annotation is the status source per `engineering/source-of-truth.md`                          |
| 24 Authorization-Profile permissions, 1 in source, 0 enforced                        | archived under `docs/archive/architecture/authorization-profiles-legacy/` with the measurement (`NXD-062`)                |
| two permission registries, the dead one holding a wrong `validation.approve` comment | one registry; dead module removed (`NXD-061`)                                                                             |
| 44 broken documentation links                                                        | 0, and a guardrail check that keeps it there                                                                              |
| "Solution Composer" as a third name                                                  | **Product Composer** everywhere (`NXD-063`)                                                                               |
| "Phase N" meaning three different things                                             | qualified form required (`CLAUDE.md` §2)                                                                                  |

Compliance positions that are held rather than fixed are written down in
`NXD-064` and in
[`docs/compliance/traceability-and-gmp.md`](../compliance/traceability-and-gmp.md).
Three of the four are now closed: the missing `reason` on
`composer_audit_events` ([`NXD-066`](DECISIONS.md)), and the shipped `memory`
persistence default together with un-persisted AI spec drafts
([`NXD-070`](DECISIONS.md)). Community RBAC stays disabled and is re-evaluated
at each Backstage upgrade gate.

`guard:platform` now runs **eleven** checks; the eleventh is documentation link
integrity (`scripts/check-doc-links.mjs`).

**MVP1-B (2026-09-26 / 2026-09-27).** The completion list this series works
against is [`TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md)
§11 — twelve items, of which **2–5 are named the critical path**. Landed so far:

- **B-1 — three routes that answered 200 for an id that does not exist.** A
  private `assertRequirementSetExists` now precedes `getRequirements`,
  `getCurrentVersions` and `advanceRequirementSetVersions`, so all four URS
  set-id paths answer 404 alike. The second half of the finding it closes did
  not survive checking: there was one identifier and three missing guards, not
  two identifiers. See [`NXD-059`](DECISIONS.md) item 6. `updateProduct`'s
  vocabulary refusal became an `InputError` in the same commit.
- **B-2 — a client type that promised three fields the server never sent.**
  `ApprovalInstance` in `plugins/urs-composer/src/api/types.ts` declared
  `currentStepId`, `createdAt` and `createdBy`; the backend sends
  `currentStepSequence`, `startedAt` and `startedBy`. Two of the three
  phantoms were non-optional, so the type asserted a value that was
  `undefined` on every response the server has ever returned. The two
  workspaces cannot import each other, so they declared the shape twice and
  drifted; the fix is a third declaration in `@internal/platform-common` that
  both check against, listing what a client may rely on rather than
  everything the server emits.
- **B-3 — one operation, one correlation id.** `audit_events.correlation_id`
  had existed since the table was created and **every row was NULL** across 35
  write sites. `AuditEvent.correlationId` is required now, supplied from an
  `AuditContext` opened at the service entry point. See
  [`NXD-065`](DECISIONS.md). Scope is `urs-composer-backend` only — the
  product side has no such mechanism yet, and cross-plugin threading was
  explicitly left open.
- **Quality pre-work (`15ea5e7`).** `docs/subsystem-status.md` still carried
  the Composer row under its retired third name; renamed per
  [`NXD-063`](DECISIONS.md). `CROSS_PLUGIN_BOUNDARY` reported one violation in
  `validation-context-integration.test.ts` and there were five — the guard
  matches its private-import pattern with a non-global regex and stops at the
  first hit per file. The per-suite PostgreSQL driver moved to
  `packages/backend-test-utils` as `createTestSchema(suite, {migrate, seed})`,
  the URS test-database helper became a wrapper keeping its exact signature,
  and what the cross-plugin suite needs from URS is published from the package
  index instead of reached for through `src/`. The coupling is a declared API
  now rather than a path into someone else's source.
- **Audit correlation on the product side** ([`NXD-066`](DECISIONS.md)). B-3
  fixed the URS trail; `composer_audit_events` had no `correlation_id`
  column at all and `audit()` minted a fresh UUID per event at 22 sites, so
  applying an AI spec draft wrote eight or more unjoinable rows for one
  reviewer's act. `reason` and `entity_version` landed with it, which closes
  audit item 9 and `NXD-064` C-2.
- **B-4a — validated references on `traceability_links`**
  ([`NXD-067`](DECISIONS.md)). `source_type`/`target_type` were free strings
  nobody checked and had drifted into three spellings of "a requirement";
  `relationshipType` had a closed vocabulary since Phase 1 that the
  validator never consulted. Closed vocabulary now, a real foreign key for
  the one endpoint in this schema, CHECK constraints on PostgreSQL, and
  existence checks in the service scoped to the bound version's snapshot.
  `test_executions` arrived with it, append-only. **Closes audit item 4.**
- **B-4b / B-4c — evidence reaches the gate**
  ([`NXD-068`](DECISIONS.md), [`NXD-069`](DECISIONS.md)).
  `POST /api/composer/test-executions` under a service token; a passing run
  derives its own `VERIFIED_BY` link. `checkReleaseGate` now consumes
  `getRequirementCoverage`: `INCOMPLETE_TRACEABILITY` means
  `verified < total` and names the refs, and the old component check became
  `UNTRACED_COMPONENT`. A later failing run of a test case revokes the
  verification. **Closes audit items 2, 3 and 5 — the critical path.**

- **Seventeen refusals that answered "Internal server error"** (`3857589`).
  Audit completion item 7. `service.ts` threw seventeen bare `Error`s and
  `respondError` has no branch for one, so a correct refusal reached the
  caller as 500 — the same wording problem `ae62aa4` fixed on the URS side.
  Typed by what happened, not uniformly: `NotFoundError` 404 (6 sites),
  `ConflictError` 409 (4), `NotImplementedError` 501 (3, the AI capabilities
  that are off by default — "won't", not "broken"), `InputError` 400 (1),
  and `ServiceUnavailableError` 503 (1, an absent URS baseline resolver —
  deliberately distinct from 501 because nobody chose it and an operator has
  to fix it). `respondError` gained the 501 and 503 branches. Three route
  handlers had been matching on message text
  (`err.message.includes('not enabled')`) to answer 501 themselves, so the
  mapping was held together by string comparisons against prose in three
  places; `respondError` does it once now. `errorMapping.test.ts` asserts
  status codes over HTTP rather than the type of a thrown object, because
  every service-level test would keep passing if a branch were lost.
  **Closes audit item 7.** Noted
  and deliberately not changed at the time: the segregation-of-duties refusal
  in `transitionProductVersionStatus` is an `InputError`, so a correct
  authorization refusal answers 400 where 403 would say it better. It is
  already typed, so it falls outside "type the bare throws" — it wants its
  own decision. **That decision was taken on 2026-09-28 and it is now a
  `NotAllowedError`** — see [`NXD-072`](DECISIONS.md) and the correctness
  batch below. The original note stays because the sequence is the point:
  noticed, deferred with a reason, then closed.
- **B-4d — the whole journey, driven once**
  (`e2eProductReleaseFlow.test.ts`). Audit completion item 12. Every other
  suite proves one joint; nothing had ever walked the full path, which is how
  four defects shipped under a green suite ([`NXD-053`](DECISIONS.md),
  [`NXD-059`](DECISIONS.md)). The suite drives a real `URSService` on a real
  PostgreSQL schema through authoring, the three-step advance, QA signatures
  and baseline approval, binds the resulting baseline to a product, watches
  the release gate refuse on `INCOMPLETE_TRACEABILITY`, posts passing
  evidence over HTTP to `POST /test-executions`, and sees the gate open and
  the version reach `RELEASED`. The cross-plugin HTTP hop is the one thing
  substituted — at `UrsBaselineResolver`, the real boundary, because the two
  plugins own separate databases and cannot share a process in production.
  **Closes audit item 12.**
- **Seven templates that published two thirds of a product** (`b1b60f0`,
  `a3f26b2`, `7f6a559`, `139f493`). Audit completion item 1, the last
  non-critical-path item with code behind it. `nexora:product:create` reached
  the catalog from two templates out of nine; from the other seven a task
  produced a repository and a Catalog entity and no governed row, so
  `/products` could not find them and the release gate had nothing to gate.

  Two tiers. `aas-data-product`, `machine-state-consumer` and
  `mqtt-temperature-product` already asked for a baseline and verified it, so
  they needed only the step and the task link. `mqtt-connector`,
  `node-service`, `python-service` and `unified-namespace` had none of it and
  gained the whole chain — parameter, `verify-urs`, the `urs-baseline` and
  `policy-version` annotations, and the record — because half is what created
  this problem on the data-product side.

  **Three choices worth not rediscovering.** `templates/aas-asset` is
  excluded, permanently: one `debug:log` step, no repository, no entity, and
  its own description says it creates no Data Product, so "the remaining
  eight" was always seven. `productType` is `SERVICE` for all four
  service/infra templates — `PRODUCT_TYPES` has no platform-component member
  and `PLATFORM_PRODUCT` is the Nexora-manages-Nexora singleton, so
  `unified-namespace` is a SERVICE whose Catalog entity stays a
  platform-component; the join is by `catalogEntityRef`, not by type, so the
  two coexist, but anything that later infers product type from entity kind
  will disagree. And the URS parameter is asserted to be on the **first**
  parameter page behind `UrsBaselinePicker`, because a binding the author
  pages forward to find is one that does not get set.

  **What the gate was doing meanwhile.** The contract assertion was written so
  that a template *without* the step reported the passing shape — which is why
  seven templates could stay open under a green suite — and the URS assertion
  compared a value against itself. Both are binding now and both were
  mutation-checked. Two further gaps fell out: `aas-data-product` was
  registered in development, absent from production and in no contract test,
  and its generated health endpoint answered `{"status": "healthy"}` with no
  `service` field against a platform contract of `UP`/`DOWN` — and pinned
  `service_name` to the template's own name, so every product built from it
  reported the wrong identity. **Closes audit item 1.**

- **The last two in-memory volatilities** (`6acd589`, `afb857c`). Audit
  completion items 8 and 6, and `NXD-064` C-1 and C-3 with them — see
  [`NXD-070`](DECISIONS.md).

  Item 8 was never about the fallback. The code had defaulted to postgres
  since P1A and refused memory in a production auth environment; none of it
  helped, because `app-config.yaml` shipped `mode: memory` and is layered
  first, so an overlay that merely omitted the key inherited it. The default
  moved rather than the fallback: `app-config.yaml` now sets `mode: postgres`
  and `client: pg`, and memory lives in `app-config.memory.yaml`, which states
  what it costs and turns permissions off — because `getPersistenceMode` also
  refuses memory while `permission.enabled` is true now, which is the half of
  C-1 that does not depend on remembering to set `auth.environment`.
  **This changes how the stack starts**: `yarn start` needs
  `docker compose up -d db`. See
  [`development-workflow.md`](../engineering/development-workflow.md).

  Item 6 made AI proposals durable. The subtle part is that persisting the
  *parsed* draft would not have closed C-3: `parseProductSpecResponse` drops
  requirement refs the model invented and falls back to `PROCESSING` for an
  unknown component type, so the parsed spec records what was accepted, never
  what was said. `ai_spec_drafts` carries `model_id`, `prompt_hash` and
  `raw_response`, all `notNullable`, proven on real PostgreSQL. The prompt is
  hashed rather than stored — it embeds requirement text the URS Composer
  owns. **Closes audit items 6 and 8.**

- **Stage 3, the left arm of the V-model** (`82a8867`). Audit completion item
  11, the last of the twelve — see [`NXD-071`](DECISIONS.md).
  `functional_specifications` derives one item per bound requirement from the
  `product_requirements` snapshot, and `getFunctionalSpecTrace` resolves
  URS ↔ FS ↔ Component. Scope is an FS bridge only: TDS, stories and tasks
  stay out, because `TARGET_OPERATING_MODEL.md` already said Nexora owns the FS
  and not a backlog, and nothing in the platform reads a TDS.

  **The FS is additive, and that limit matters more than the feature.**
  `getRequirementCoverage` joins requirement straight to component and the
  release gate reads it, so making FS a mandatory hop would have flipped every
  coverage row to `UNMAPPED` and blocked every release. The chain is resolved,
  not rewritten; a test asserts coverage is unchanged across a derivation.

  **It also exposed a guard that only agreed with the code on an empty
  database.** The PostgreSQL CHECK constraints on the traceability vocabulary
  were created when absent and never rebuilt — correct exactly once, and this
  was the first growth of either array since they landed. An existing database
  would have refused every FS link in production while a fresh test schema
  passed. Fixed and mutation-checked. Worth generalising: in a migration file
  that is one idempotent `up()` with no version table, "create if absent" means
  "never correct again". **Closes audit item 11.**

- **The correctness batch** (2026-09-28). Not a slice from
  `PHASE_CLOSURE_PLAN.md`; it answers
  [`TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md) §12
  open decision 9 — the loose defects, fixed as one batch rather than folded
  into later work. See [`NXD-072`](DECISIONS.md).

  **A rule that lived in the page.** `ArchitectureTab.tsx` disabled the
  add-component form outside DRAFT and its doc comment said the rule belonged
  in the service. It never got there, so an API client could change the
  architecture of a RELEASED version. Five methods are guarded now, each with
  its own sentence — what a version is built from, is made of, publishes,
  consumes and specifies — through a `requireDraftVersion(id, refusal)` helper
  whose refusal argument is required so the next author has to state theirs.
  Three of the five were missing a 404 as well, and because `data_contracts`
  and `product_version_dependencies` carry real foreign keys, **on PostgreSQL
  that was a 500**: the database refused what the service had not checked, and
  SQLite let every test write the row. `createTraceabilityLink`,
  `ingestTestExecution` and `createProductBaseline` are deliberately exempt —
  evidence arrives after release — and a test asserts that, so the exemption
  cannot be "completed" by accident.

  `deleteTraceabilityLink` deleted blind: 204 for an id that never existed,
  **and an audit event for the deletion that had not happened**. A trail
  claiming an act nobody performed is worse than a missing entry.

  **Segregation of duties answers 403.** Two sites; `respondError` already had
  the branch. The third occurrence, in `validation-expert-backend`, stays a 400
  on purpose — that router discards the message, so 403 would say less.

  **The approval chain is numbered, and the numbering exposed something
  worse.** `currentStepSequence` started at `0` and was *incremented* rather
  than set to the step the advance had activated, which was itself found by
  array position. The two errors partly cancel on the dense seeded workflows,
  so only a sparse out-of-order chain separates them; both halves are
  mutation-checked. Then the real finding: **step one of every chain was
  unapprovable from the browser.** `ACTIVE` is set only when advancing, every
  step of a fresh instance is `PENDING`, and the Approve button was gated on
  that flag — so it rendered on no step at all. The page reads
  `currentStepSequence` now, which is what the backend enforces against.
  Nothing was added to the wire contract: `sequence` was on the wire all along,
  and `NXD-059`'s "no `stepNumber`" was a search for a name that never existed.

**The MVP1-B critical path (Slices B-1 through B-4) is COMPLETE.** All four
items the audit names as the critical path — 2, 3, 4 and 5 — are closed, and
the end-to-end spec that proves them as one journey is closed with them.

**MVP1 is COMPLETE — twelve of twelve completion items closed**: 1, 2, 3, 4,
5, 6, 7, 8, 9, 10, 11 and 12. Nothing on the audit's MVP1 list remains open.

Read that for what it is. It means the twelve items
[`TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md) §11
named as "required to complete a coherent MVP1" are done, each with tests and
each recorded. It does not mean the platform matches the vision documents —
the list below is unchanged by it, and `NEXORA_VISION.md` still describes a
target state that does not exist. The audit's own §12 open decisions are also
not all closed: the Composer name collision remains, and so do the Hybrid GMP
classification and the Community RBAC deviation.

**What a 2026-09-27 target-architecture audit found beyond that list**, so
it is written down rather than rediscovered:

- **There are two V-models in this repository and they are easy to
  conflate.** `validation/**` is the platform's own GAMP package —
  hand-authored markdown, read-only, parsed by `validation-expert-backend`,
  covering Nexora itself. The Validation Expert UI renders *that*. It is not
  a live traceability over customer products, and its automated runners
  match hard-coded platform test ids (`IQ-001`, `IQ-016`, `OQ-CI-003/004`).
- **FS exists since item 11; TDS, user stories and task backlogs do not, and
  will not.** `functional_specifications` derives one item per bound
  requirement and the URS ↔ FS ↔ Component chain resolves. The backlog is
  GitHub's by [`NXD-071`](DECISIONS.md), and TDS is omitted because nothing
  reads one. Still true, and still the honest caveat: the AI spec draft
  proposes components and contracts, which is an architecture proposal, not a
  functional specification — the two are separate paths.
- **The two named AI agents are not started.** No Test Coordinator, no GMP
  Impact Agent — no stub, no interface. The change-request impact assessment
  is a human typing `gxpImpact` and `affectedVersionIds` into a request body.
- **No Kubernetes, no platform observability.** Deployment is Docker Compose
  plus Portainer; `"Kubernetes"` appears once, as a vocabulary string.
- **Product-side change control does not exist.** `ChangeRequest` has no
  occurrences in `composer-backend`; the workflow is URS-side only.
- ~~**No evidence-package export.** There is no endpoint that produces an
  audit-ready package for a product.~~ **Closed 2026-09-28** by rank 2 —
  `GET /versions/:id/evidence-package` aggregates read-only over the endpoints
  that already held every piece ([`NXD-077`](DECISIONS.md)), and it carries a
  `limits` array that states the URS/product signature asymmetry in its own
  words rather than letting a reader infer equivalence. It shipped untested and
  threw for every version on any driver that does not return a `Date` for a
  timestamp column; that was found and fixed on 2026-09-29
  ([`NXD-083`](DECISIONS.md)).
- **`GXP_RELEVANCE_LEVELS` is `NONE | INDIRECT | DIRECT`** — there is no
  `HYBRID`, which the target model names. The conformance audit already
  excludes Hybrid from MVP1; the vision text does not.

None of this contradicts
[`TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md) §11,
which excludes the agents, Marketplace install, runtime operation and Hybrid
GMP from MVP1 explicitly. The divergence is between the **vision documents**
and the code, not between the code and its own record.

**Batch 1 — the journey the platform describes can be walked.** Committed
2026-09-25 (`b7378b0` and the four commits that follow it) and green on all
four gates. Driving the URS → Product → Release
path as a user, rather than testing its modules, found it broken at four
joints, each the same shape as [`NXD-053`](DECISIONS.md): written, routed,
tested, and reachable from no caller.

- A requirement version could not leave DRAFT from the browser — no client
  method existed for the two transition routes and nothing called
  `signRequirementVersion`. A baseline is releasable only once every version it
  pins is APPROVED, so **no baseline a user created could ever be released** and
  `/baselines/approved`, the list the Product page binds against, was
  permanently empty.
- `createProductBaseline` and `approveProductBaseline` were called from no page,
  so `NO_APPROVED_BASELINE` was a blocker no user could clear.
- `updateProduct` dropped `dataClassification`, `lifecycle` and
  `declaredPolicies` in its mapping and validated nothing, so the three
  platform-policy obligations were unclearable — and
  `gxpRelevance: 'TOTALLY_MADE_UP_VALUE'` was stored and _satisfied_
  `gxp-relevance-set`.
- The approval chain could not be walked by one identity, correctly, and there
  was only one. Three demo identities now exist behind a local-only provider;
  the separation is unchanged. See [`NXD-057`](DECISIONS.md).

`releaseGateProgress.test.ts` measures the result instead of asserting it in
prose: it drives the gate with the operations the Product page now offers and
records which codes clear and which remain. Two remain deliberately —
`INCOMPLETE_TRACEABILITY` and `NO_URS_BASELINE`. Two storage defects were found
the same way: `baselines.approval_instance_id` was read off a column no
migration ever created, and the two approval workflows existed only in the
Postgres seed, so `submitBaseline` failed with `Workflow not found` on the
shipped `memory` mode. See [`NXD-058`](DECISIONS.md).

**The journey was then walked on a running stack, and it completes.** See
[`NXD-059`](DECISIONS.md). URS → review chain → QA signature → baseline → three
role-separated approvals → Product → binding → release gate, as three
identities. The gate ends at `INCOMPLETE_TRACEABILITY` and
`NO_APPROVED_VALIDATION_DECISION`; `NO_URS_BASELINE` is gone because the binding
is real. **This is the first time the deepest branch of the release gate has
been reached in the application**, and it retires the note that closes
[`NXD-054`](DECISIONS.md), [`NXD-055`](DECISIONS.md) and
[`NXD-056`](DECISIONS.md).

It did not complete on the first attempt. **Signing a requirement version was
impossible and had been since the feature was written**: the role lookup and the
PIN re-authentication were both made from inside `repository.withTransaction`,
which holds the only connection they need, so knex waited 60 seconds and the two
failures arrived disguised as a 401 about permissions and a 500. No version
could be signed, so none could reach APPROVED, so no baseline could be released.
Fixed — roles and second factor are resolved before the transaction opens, with
`transactionBoundary.test.ts` pinning the ordering. Six further findings are
recorded in `NXD-059` and **not** fixed; the most serious is that approval order
is not enforced.

**`/products` is the Product page, and it is reachable.** The 2026-09-24 slice
executed [`NXD-056`](DECISIONS.md): the page went into the sidebar under
_Build_, where the group previously offered `/create` and `/compose` and then no
destination, and the single 856-line scroll became six tabs — Overview,
Requirements, Architecture, Contracts, Tests, Validation.

Three of those tabs show data that already existed and no page had ever
displayed: contracts by coordinate with their exchange definition (closure
Slices 1 and 2), CI build provenance on the ProductBaseline (closure Slice 3),
and the verification/validation axes per requirement (Slice 1b). No new
endpoint was needed for any of them.

**`Development` was not built at the time of this slice** — the seventh tab
NXD-056 names. `Product` had no repository field, no entity reference and no
scaffolder bearing, so the tab would have held only an explanation of what was
missing. It was to land with Step 2, which creates that identity. **It did:
`DevelopmentTab.tsx` shipped in `9d80d16` together with Step 2, and the tab
set has been seven since 2026-09-25** (`ProductDetailPage.tsx`). Two defects
were fixed in passing here: the add-component
form wrote against the _latest_ version while the picker selected any version
(the write-path twin of the bug NXD-055 fixed on the read path), and every
`TextField` on the page was unlabelled because Material UI v4 generates no
`id`. See the addendum on [`NXD-056`](DECISIONS.md).

**URS → Product Slice 1a/1b is done.** A Product Version can now be bound to an
approved URS baseline, holds that baseline's requirements as an immutable
snapshot, and reports per-requirement coverage across both axes — engineering
verification and formal validation. See [`NXD-055`](DECISIONS.md).

This is not from `PHASE_CLOSURE_PLAN.md`; it came out of a 2026-09-23 analysis
of the URS → Product Development handoff, which found the journey broken at one
joint and everything downstream blocked by it. The product side held no
requirements at all, so there was nothing to map, count, show coverage against
or hand to a developer. Four further steps were planned on top of it (one door
for product creation, export into the generated repo, CI coverage feedback,
then mandatory binding with change control). **Step 2 — "one door", a
`nexora:product:create` scaffolder action writing the repo, the Catalog entity
and the `products` row in one act — landed in `9d80d16`**, together with the
`Development` tab that was waiting on it. Steps 3, 4 and 5 are not started;
they are ranked in [`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) §9 rather
than here. The other item this paragraph deferred — the cross-link between
`/products` and `/data-products` — is still open.

One side effect is worth naming: the release gate's `NO_URS_BASELINE` check and
the `urs-baseline-bound` policy obligation have existed and been tested since
Phase 5, but nothing except `applySpecDraft` ever set `ursBaselineIds`, so on
the normal path they could not fire. `createProductBaseline` now inherits the
version's binding, which makes an already-written gate reachable.

Slices 0, 1, 2 and 3 of
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) are done. **Phase 4 is
closed** — `DataContract` is first-class and carries a provider-neutral
exchange definition, the two criteria the phase text names that were missing.
**Phase 5 is closed** — CI now writes release provenance into the
ProductBaseline, which was the last link in the phase's evidence chain.

A re-read of the literal exit criteria on 2026-09-22 corrected an earlier
over-count in this document. Per-namespace scoping is recorded below as
_deferred, not part of Phase 2_; GP-7 is a component registry, not the
"hard-coded domain composition" Phase 3 names; and Editions and Federation
appear in no phase text at all — they are Wave 3, post-plan. Counting those
against phases made five phases look open when three were. The remaining
phase-level gap is ~~**Phase 7** (no multiple source/package providers)~~ —
**closed 2026-09-28 by Slice 6, [`NXD-076`](DECISIONS.md). All eight phases
are now closed.** Phase 5's
gap — CI does not write baseline evidence — was closed by closure Slice 3.

The gate went red after the 2026-09-21 evening commits — 50 type errors, 9 lint
errors and 5 failing suites — and was **restored to green on 2026-09-22**. See
`## Test Status`.

## Completed

- Strategy and architecture guardrails defined.
- Eight-phase implementation plan defined.
- Existing Backstage extension-first guardrails remain authoritative.
- **P0-S1 — Green baseline restored.** The repository baseline was red on
  arrival: 9 of 188 test suites failed. All nine are fixed and the full
  CI-equivalent gate now passes. See "Baseline findings" below.
- **P0-S2 — Infrastructure-dependent suites now run in CI.** 62 tests that
  skipped in every CI run now execute. Running them for the first time found a
  real defect. See [`NXD-005`](DECISIONS.md).
- **P0-S3 — Hard-coded domain surface inventoried.** Seven items recorded in
  [`HARDCODED_DOMAIN_INVENTORY.md`](HARDCODED_DOMAIN_INVENTORY.md) with their
  consumers and removal conditions. The five composition lists that Core
  duplicated from `catalog/compositions/*.yaml` had nothing keeping them in
  step; they agree today and are now guarded by
  `packages/backend/src/compositionManifestParity.test.ts`.

**Phase 0 exit criteria are met:** current behaviour documented, baseline test
state recorded and green, migration risks documented.

- **P1-S1 — ProductVersion identity invariants.** `createProductVersion`
  accepted any caller-supplied string as a version label and derived the
  ordinal from the row count. Both are fixed, with the rules as
  framework-independent functions in `platform-common`. See
  [`NXD-006`](DECISIONS.md). No data migration; existing rows are untouched.
- **P1-S2 — ProductBaseline identity invariants.** The same defect family, plus
  two worse ones: `product_baselines` has no unique index, so duplicate labels
  were simply stored; and the method superseded the APPROVED baseline before
  deciding whether the request was valid. Adopted the rule the URS side already
  reached — presence and case-insensitive uniqueness, not a version grammar,
  because baseline labels are often QMS document numbers. See
  [`NXD-007`](DECISIONS.md). No data migration.
- **P1-S4 — Baseline-label logic consolidated.** `urs-composer-backend` no
  longer carries its own copy: `nextBaselineVersion` is the shared
  `nextMajorVersionLabel` under the name the URS domain speaks, and
  `assertBaselineVersionAvailable` uses the shared `findVersionLabelClash`.
  Equivalence was checked across the URS test vectors and edge cases before
  the swap. All 418 URS tests pass, including the GxP invariants against real
  PostgreSQL. See [`NXD-008`](DECISIONS.md).
- **P1-S3 — Identity enforced by the database.** Unique indexes on
  `(product_id, version_number)` and
  `(product_version_id, lower(baseline_version))`, closing the race the service
  check cannot. The migration refuses to install them over data that already
  violates them, listing the offending keys and changing nothing — per the
  product decision not to relabel a controlled identifier unattended. Verified
  on PostgreSQL, not just SQLite. See [`NXD-009`](DECISIONS.md).
- **P1-S5 — DataContract input validation.** `DATA_CONTRACT_SCHEMA_TYPES` had
  always existed and was never enforced: `addDataContract` cast any string
  through, so stored rows could hold values the type said were impossible.
  `version` was unvalidated free text. Both fixed, no schema change. Contract
  _identity_ (name, owner, uniqueness) is deliberately left to Phase 4 rather
  than half-built now. See [`NXD-010`](DECISIONS.md).
- **Flake introduced in P1-S3, closed in P2-S3.**
  `identityConstraints.test.ts` failed ~60% of full runs while passing in
  isolation. Two separate causes: a knex QueryBuilder handed to
  `expect().rejects` ([`NXD-011`](DECISIONS.md)), which was real but not what
  drove the flake, and a native-module realm crossing that made jest misread a
  genuine `SqliteError` as "did not throw" ([`NXD-016`](DECISIONS.md)). Both
  fixed — see Test Status.

**Phase 1 exit criteria are met:** core version/baseline/contract identity
invariants are defined in `platform-common`, enforced in the service, backed by
database constraints where a key exists, and covered by tests.

- **P2-S1 — Artifact domain model.** `Artifact`, `ArtifactVersion`,
  `Publisher`, the seven Artifact kinds, coordinate identity
  (`namespace/name@version`) and `nexora.yaml` manifest validation, all
  framework-independent in `packages/platform-common/src/artifact.ts`. The
  lifecycle reuses the Golden Path states rather than declaring a parallel set
  ([`NXD-012`](DECISIONS.md)); dependencies pin exact versions
  ([`NXD-013`](DECISIONS.md)). No persistence yet — that is P2-S2.
- **P2-S2 — Persistent registry.** `plugins/artifact-registry-backend` owns
  `publishers`, `artifacts` and `artifact_versions`. Identity is in the
  database as well as the service, per [`NXD-009`](DECISIONS.md): unique
  indexes on `(namespace)`, `(namespace, name)` and `(artifact_id, version)`,
  plus `lower()` expression indexes wherever the service compares
  case-insensitively, so `Acme` and `acme` cannot become two publishers.
  Registration is manifest-driven — the service knows nothing about SAP, MQTT
  or OEE — and refuses a namespace no publisher owns, a kind change between
  versions, and dependencies that do not resolve. Every version starts in
  DRAFT, so registering content can never by itself publish it. Verified on
  PostgreSQL, not just SQLite.
- **P2-S3 — Registry API and permissions.** Twelve routes over the Backstage
  permission framework, and eight permissions tiered across the _existing_
  roles rather than new Producer/Consumer roles — reviewing sits at DEVELOPER,
  certifying and publishing at DATA_PRODUCT_OWNER, so no single grant carries
  a version from draft to released. Review records evidence
  (`certificationStatus: TESTED`) without moving the lifecycle; certifying
  refuses to run without it. See [`NXD-014`](DECISIONS.md). Each transition
  names the one state it may start from and returns 409 otherwise, and the
  write is guarded on the revision it was checked against, so a concurrent
  transition loses rather than overwrites — [`NXD-015`](DECISIONS.md).
- **P2-S4 — Legacy Marketplace adapter.** All 12 offerings in
  `plugins/marketplace/src/data.ts` now map onto the registry model and come
  back unchanged. The adapter is framework-independent in
  `packages/platform-common/src/marketplace-artifact.ts` and names no domain
  capability — the offerings keep SAP, MQTT and OEE to themselves. Parity is a
  test over the real array, not a claim: 55 assertions across mappability,
  manifest validity, round trip, kind derivation, coordinate uniqueness.
  Two decisions came out of it. The display category is stored in the manifest
  rather than inverted back out of the Artifact kind
  ([`NXD-018`](DECISIONS.md)), and a manifest may not declare its own
  certification ([`NXD-019`](DECISIONS.md)). Nothing deleted, nothing seeded,
  no schema change — the array is still what the UI reads.

- **P2-S5a — Manifests on disk, loaded into the registry.** The registry is no
  longer empty. `catalog/artifacts/nexora/` holds a `kind: Publisher`
  declaration and 12 `nexora.yaml` manifests, and
  `plugins/artifact-registry-backend/src/manifestLoader.ts` registers them
  when the plugin initialises, through the same service an HTTP caller uses.
  Content is files, not a seed from the array and not a migration —
  [`NXD-020`](DECISIONS.md). The loader is idempotent, non-fatal on bad
  content, and cannot publish: every version lands in DRAFT with no
  certification status.

  Verified live, not only in tests: first start logged
  `12 registered, 1 publishers created, 0 failed`; a reload logged
  `0 registered, 12 already present, 0 failed`. The database holds 1 publisher
  and 12 artifacts across 4 kinds (TEMPLATE, CONNECTOR, DATA_PRODUCT,
  COMPONENT), all 12 versions DRAFT. The Marketplace UI is unchanged — still
  12 entries from the array, which is the point: this slice adds content and
  changes nothing a user sees.

  One real bug was caught by running it rather than by testing it: `yarn start`
  and `serve` mode have different working directories, so the default path
  resolved to `packages/backend/catalog/artifacts` and loaded nothing. Fixed
  by walking up — [`NXD-021`](DECISIONS.md), which also records that this is
  now the second copy of that logic in the repository.

- **P2-S5b — The Marketplace reads the registry.** The twelve cards on the
  Marketplace page now come from `GET /artifacts?includeVersions=true`, not
  from the array. A read-only client in the Marketplace goes over the
  permissioned API rather than into the registry's tables
  ([`NXD-022`](DECISIONS.md)); `loadOfferings` never rejects, so a registry
  that is failing or empty falls back to `marketplaceItems` and says why in
  the console. The array is still there — this is the switch, not the
  retirement.

  Verified live: one request to the registry per page load, 12 rows, no
  fallback warning, detail pages resolve from the same source.

  **Running it caught a parity break the tests did not.** The registry returns
  artifacts by name, so the catalogue silently re-sorted itself
  alphabetically. Order is visible, so that is a behaviour change, and the
  migration rule does not allow one while the switch is being proven. Fixed by
  sorting on each offering's position in the array — derived, not restated —
  and the assertion is now on the exact list rather than the set
  ([`NXD-023`](DECISIONS.md)). Worth noting what the fidelity is to: the
  array's order is the order things were added over time, not a designed one.

- **Blocked-port guard swept.** `listenOnFetchablePort` now lives once, in a
  new `@internal/backend-test-utils` workspace, and every test file that binds
  an ephemeral port and drives it with `fetch` uses it. The flake class that
  failed a full run during P2-S5b is closed.

  The sweep corrected the recorded count in both directions
  ([`NXD-024`](DECISIONS.md)): thirteen files bind a port rather than twelve,
  but only nine could ever hit the bug, because the blocklist is a `fetch`
  rule and four suites drive their servers with `http.request`. Eight needed
  fixing, not eleven.

- **P2-S5c — `marketplaceItems` retired.** The array, its fallback in
  `offeringSource.ts`, the legacy-order function that derived from it, and the
  two hand-maintained twelve-id lists are all deleted — see
  [`NXD-026`](DECISIONS.md). `loadOfferings` now rejects on a registry failure
  instead of substituting anything, which the Marketplace pages already render
  as an error state. This also forced the question P2-S5b deferred:
  _which certification does the UI show._ The manifest can no longer state one
  at all; the Marketplace shows the registry's own
  `ArtifactVersion.certificationStatus`, floored at `DEVELOPMENT` for a
  version nothing has reviewed — see [`NXD-025`](DECISIONS.md). Two of the
  twelve (`aas-data-product`, `oee-data-product`) visibly lose the CERTIFIED
  badge they showed as legacy metadata; that is the intended outcome, not a
  regression to paper over — the badge now means what it says. Card order
  changed from array-insertion order to the registry's own (alphabetical by
  name), which NXD-023 named as the question for after the array was gone.

**Phase 2 exit criteria are met:** the registry persists Artifacts,
ArtifactVersions and Publishers with identity enforced in the database; the
lifecycle is manifest-driven, permissioned across the existing five roles with
no single grant carrying a version from draft to release, and guarded against
lost updates; the legacy Marketplace has been fully replaced — it reads the
registry, the array is deleted, and the certification it shows is the
registry's own rather than an inherited claim.

- **P3-S1a — Compositions are Artifacts.** The eight manifests under
  `catalog/compositions/` are now `GOLDEN_PATH` Artifacts in
  `catalog/artifacts/nexora/`, and that directory is deleted. The registry
  loads, versions and serves them through the machinery P2 already built — no
  second pipeline, and `GOLDEN_PATH` was a declared kind no manifest used.
  `compositionOfArtifactManifest` adapts a manifest to the existing
  `GoldenPathComposition` model so validation is untouched. See
  [`NXD-027`](DECISIONS.md).

  **The audit corrected GP-1 before any code changed.** The inventory recorded
  the Core constants as copies of the manifests; in fact nothing read those
  manifests at runtime, so the constants were the truth and the manifests were
  documentation. The slice was therefore about giving the manifests a runtime,
  not about stopping a duplication.

  Two things the format could not express before: `spec.components[].optional`
  now carries the Equipment Use Log optional pair that lived only in Core, and
  `validateArtifactManifest` requires a non-empty component list for
  `GOLDEN_PATH` so a typo fails loudly instead of resolving to an empty
  composition. One rename was forced by the registry's identity rules — the
  Mode B example is `oee-data-product-uns`, because `nexora/oee-data-product`
  is already the DATA_PRODUCT ([`NXD-028`](DECISIONS.md)).

  Verified live, not only in tests: startup logged
  `8 registered, 12 already present, 0 publishers created, 0 failed`. The
  Marketplace is unchanged at 12 cards, because a manifest with no
  `spec.marketplace` block yields no view — now asserted over the real
  composition files rather than left to inference.

  **The constants are not deleted.** They still feed `composer.ts`,
  `oeeBuiltWithSummary` and `DeveloperHubPage.tsx`, which are GP-2/GP-3/GP-4
  and out of this slice's scope. `compositionManifestParity.test.ts` survives,
  repointed, and still guards the duplication.

- **P3-S1b — the consumers read the registry; the constants are gone.** The
  five pages that imported composition lists from Core —`ComposePage`,
  `PlatformComponentsPage`, `PlatformComponentDetailPage`,
  `MarketplaceDetailPage`, `DeveloperHubPage` — now take them from
  `useGoldenPathCompositions`, one loader beside the registry client. The six
  `*_COMPOSITION_REFS` constants, `LIBRARY_COMPOSITION_USAGE` and 97 lines with
  them are deleted, and `compositionManifestParity.test.ts` too: it existed to
  hold the constants and the files in step, and there is nothing left to hold.
  See [`NXD-029`](DECISIONS.md).

  **GP-1 and GP-4 are closed.** `oeeBuiltWithSummary(catalog)` became
  `builtWithSummary(catalog, componentRefs, productLabel)`, so Core describes
  the shape of a "built with" panel without naming the product. Two manifest
  fields made it possible: `spec.usage` carries the consumer label and kind the
  Core table held, and `spec.builtFrom` on the OEE DATA_PRODUCT names the
  composition it is built from — which removed the
  `item.id === 'oee-data-product'` literal that gated the panel.

  One visible change, asserted rather than discovered: "used by" labels are now
  ordered by composition name, so `mqtt-consumer` reads "Machine Metrics
  Reference, OEE Data Product" instead of the reverse. The old order was the
  order the table happened to be written in.

  Verified live against a fresh registry: `20 registered, 0 already present,
1 publishers created, 0 failed`, 8 GOLDEN_PATH artifacts, `usage` stored on
  exactly the six that declare it, `builtFrom` resolved, all 20 versions DRAFT.

  **Running it found something the tests could not**
  ([`NXD-030`](DECISIONS.md)): editing a manifest without bumping its version
  does not reach a registry that already holds that coordinate. The loader
  logged `8 registered, 12 already present` and kept serving the old manifests;
  the new fields appeared only after the registry database was dropped. That is
  the immutability rule working, not a defect — but it is now a recorded
  operational constraint rather than something to rediscover.

- **P3-S2 — Golden Path identity and presets are manifest-driven.** GP-2 and
  GP-3 are closed. `officialGoldenPathForSelection` and `officialGoldenPathForDraft`
  now accept `ReadonlyMap<string, readonly string[]>` of all `runtime` GOLDEN_PATH
  compositions from the registry and return the composition name (`string | undefined`),
  not the literal `'oee-data-product'`. `ComposerPreset.kind` is now
  `'baseline' | 'official' | 'example'`; `composerPresets` derives one preset
  per composition from `officialCompositions` and `exampleCompositions` maps.
  `GoldenPathCompositions` gains `official`, `examples` and `builtFromIndex`
  (composition name → DATA_PRODUCT name via `spec.builtFrom`) so the Composer
  can still navigate to `/marketplace/oee-data-product` without hardcoding it
  in Core. See [`NXD-031`](DECISIONS.md).

  409 tests, 0 failures (tsc + lint + yarn test subset).

**Phase 3 exit criteria are met:** generic Golden Path resolution, AI provider
abstraction, product generation (AI spec + catalog loader + owner), development
context (config summary), repository scaffolding (2 Golden Paths linked), and
the Hardcoded Domain Inventory reduced from 8 items to 2 (GP-7 waits on Phase
4, GP-8 waits on Phase 4/6).

**Phase 4 exit criteria are met:** DataContract is first-class (name, owner,
uniqueness); ProductDependency exists; initial lineage graph computable; contract
compatibility evaluation in platform-common; Data Quality contracts in the model.

**Phase 5 exit criteria are met:** CI evidence → ProductBaseline → ValidationContext
→ IQ/OQ/UAT/optional PQ → evidence → findings/retest → independent review →
Validation Decision → Release Gate. All links in the chain are implemented and
testable. See NXD-036, NXD-037.

**Phase 5 closed.** See above.

**Phase 6 closed.**

**Phase 7 exit criteria met:** external publishers, vendor Artifacts, publisher trust/certification,
per-namespace scoping (partial), entitlements verdrahtet, commercial marketplace trust badges.

**Off-plan work (2026-09-22).** Two commits that are not closure slices and
close no phase gap. Recorded here because `STATUS.md` had fallen behind them —
both wrote to `DECISIONS.md` and neither wrote here, which is DoD point 3 of
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) slipping. They were the right
work to interrupt for: `ab8d681` fixed a defect that was silently discarding
role changes and audit records in every container deployment.

- **`ab8d681` — users, roles and the audit trail live in the database.** See
  [`NXD-051`](DECISIONS.md). User records were kept in
  `catalog/users.seed.yaml` and rewritten in place, with the audit trail in
  JSONL files beside it; both paths resolved against `process.cwd()`, which
  differs between the dev server and the image. In a container the plugin
  wrote `/catalog/users.seed.yaml` while the catalog read
  `/app/catalog/users.seed.yaml` — **a role assignment had no effect** — and
  neither path was on a persistent volume, so **every role change and every
  audit record died with the container**. For a platform whose validation
  story rests on attributability that is not a deferrable defect.

  Records now live in `platform_users`, `user_audit_events` and
  `user_sign_in_events`, owned by `users-backend` through
  `coreServices.database`. `knex@^3.0.0` was added to that package — the same
  version three sibling plugins already declare and already in `yarn.lock`, so
  no new dependency entered the repository. The seed runs **once, against an
  empty table** (the `urs-composer-backend` pattern), so a restart never
  rewrites a role an administrator changed, and under
  `auth.environment: production` it installs only `users.bootstrapAdmin`
  rather than the eight committed demo accounts — two of which hold
  `platform-admins` and, because the seed never runs again, would have stayed.

  The Catalog reads `catalog/runtime/platform-users.yaml`, a projection
  rewritten _from_ the database and never into it. An entity provider would be
  tidier but is registered through `catalogProcessingExtensionPoint`, and an
  extension point may only be consumed by a module of that plugin — which
  would then receive the catalog's database, not this one's.

- **`f39d801` — URS authoring is a governance tier plus an assignable role.**
  See [`NXD-050`](DECISIONS.md). Two axes, granted and audited separately: the
  platform tier (`urs.create` restated on DATA_PRODUCT_OWNER, added to
  BUSINESS_CAPABILITY_LEAD) and the URS domain groups (`urs-authors`,
  `urs-owners`, `urs-business-reviewers`, `urs-product-managers`,
  `urs-quality-reviewers`) applied on top by `decidePermission`. A developer
  authors requirements by holding `urs-authors`, not by being a developer.

  Collapsing the two into the tier would have removed `urs-quality-reviewers`
  and with it `urs.sign` — a 21 CFR Part 11 signature — and the separation
  between whoever writes a requirement and whoever approves it.
  BUSINESS_CAPABILITY_LEAD was also corrected: it ranks above DEVELOPER but
  inherited from VIEWER, so it held fewer rights than the tier below it.

  **No test pinned any of this** — removing `urs.create` from DEVELOPER left
  all 1822 tests green. The rules are now asserted directly.

**Phase-closure plan (2026-09-22 →).** Slices from
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md), newest first.

- **Follow-up to Slice 3 — the last three cross-plugin clients work.** See
  [`NXD-054`](DECISIONS.md). `urs-baseline-resolver`,
  `catalog-component-loader` and `validation-decision-resolver` now pass
  `auth.getOwnServiceCredentials()` instead of `{} as never`, and every
  silent failure path logs.

  **The characterisation in [`NXD-053`](DECISIONS.md) was wrong for two of the
  three and is corrected.** Only the catalog loader failed _open_. The URS and
  ValidationDecision resolvers fail **closed** — a failed call becomes a
  `NO_APPROVED_URS_BASELINE` or `NO_APPROVED_VALIDATION_DECISION` blocker. So
  they were not letting bad releases through; they were **blocking good ones**,
  reporting an approved baseline as unapproved and naming the product for a
  fault in the platform. No release was wrongly permitted by these two.

  **Fixing the clients was not enough.** Both target plugins authorize reads
  with `allow: ['user'], allowLimitedAccess: true`, which admits a forwarded
  limited _user_ token but not a service principal — so a correctly minted
  token would still have been refused. Five read routes now use an
  `authorizeReadOrService` helper: `GET /baselines/:id`,
  `/requirement-sets/:id`, `/requirement-versions/:id`, `/contexts` and
  `/contexts/:id/decision`. Nothing writable was opened; recording a
  ValidationDecision is still PLATFORM_ADMIN with SoD intact.

  Service identity is the right answer rather than forwarding the caller's:
  whether a baseline is approved is a fact about a controlled record and must
  not vary with the URS permissions of whoever opened the page.

  **A second defect in the validation resolver.** `GET /contexts` answers
  `{ items: [...] }`; the client read it as a bare array, so `.find` threw on
  every call and `hasApprovedDecision` could never return `true` even with
  auth fixed. Both shapes are accepted now.

  `getOwnServiceCredentials` is **required, not optional**, so a mock that
  omits it fails to compile — the old signature let production pass `{}` while
  the mock passed nothing, which is why no test could have caught this.
  `crossPluginAuth.test.ts` adds 10 tests that assert the call _shape_ rather
  than the parsed response.

  Verified live: all five routes accept a service principal (404 "Baseline not
  found", 200 `{"items":[]}` — not 401); the gate reported
  `NO_APPROVED_URS_BASELINE: … (HTTP 404)`, the real answer reached with a
  minted token; the log shows 2 authenticated requests to `urs-composer` and 3
  to `validation-expert`, **0 token-minting failures and 0 401/403**.
  **The APPROVED branch was not executed live** — producing an approved URS
  baseline needs several identities under SoD and local guest auth supplies
  one. That branch is covered by unit test only, and is the one step of the
  chain still unproven in the application.

- **Slice 3 — CI evidence reaches the ProductBaseline. Phase 5 closed.** See
  [`NXD-052`](DECISIONS.md). `POST /baselines/:id/provenance` records
  `releaseCommitSha`, `artifactDigest` and `provenanceTimestamp` on the
  baseline, written by the release build rather than typed by a human, and
  `.github/workflows/ci.yml` posts them after `docker/build-push-action`
  succeeds on `main`.

  Four things the slice had to decide, each recorded in `NXD-052`:

  - **Provenance is not part of the checksummed snapshot.** `snapshot`
    carries a `_provenance.snapshotChecksum` from `P-EXT-S1` that covers its
    own canonical JSON; writing CI evidence into it after the fact would
    invalidate the checksum the block exists to provide. The three fields are
    new columns on `product_baselines` instead, so the tamper-evidence of the
    snapshot and the provenance of the build stay separable.
  - **Write-once, not editable.** A second post with identical values is a
    200 (CI retries and re-runs are normal); a second post with _different_
    values is a 409. Release provenance is an attestation about a build that
    happened, so the platform records it or refuses it — it never overwrites
    one SHA with another.
  - **The audit event goes to `composer_audit_events`, not
    `user_audit_events`.** The latter belongs to `users-backend`, lives in
    that plugin's own `coreServices.database`, and carries a user/role schema
    (`actor`/`action`/`entity`). Writing into it from the Composer is the
    direct cross-plugin private-database access `AGENTS.md` forbids, and it is
    not reachable from this plugin's connection in any case. The Composer's
    own append-only trail already records `PRODUCT_BASELINE` events; the new
    one is `PROVENANCE_RECORDED`.
  - **CI authenticates as a service, not as a user.** The route is the first
    in the repository to accept `httpAuth.credentials(req, { allow:
['service'] })`, backed by Backstage's own
    `backend.auth.externalAccess` static-token mechanism. No new credential
    type and no new dependency — the mechanism was always there, unused.

  The gate learns `MISSING_CI_PROVENANCE`: a distinct blocker code rather
  than the generic `POLICY_OBLIGATION_UNMET`, because the remedy is not
  "fill in a field" but "run the release build". It fires only when the
  product declares a policy carrying the new `ci-provenance-recorded`
  obligation, so products that do not ask for build provenance are unaffected.

  **The CI step cannot fail the build.** It runs `continue-on-error` against a
  best-effort `curl`: a Composer that is unreachable from the runner must not
  turn a good build red. The absence then shows up at the release gate, where
  a human is already looking, which is the same fail-visible-not-fail-loud
  placement `5-R1` chose for policy resolution.

  **Executing the path found four defects that every test passed** — see
  [`NXD-053`](DECISIONS.md). None was introduced here; all four were in code
  already marked done, and all four share one shape: the unit tests exercise
  the modules directly, so nothing had ever gone through the wiring. The
  release gate answered 500 for _every_ product because
  `platform-policy.ts` and `platform-policy.json` shared a basename and the
  backend resolved the JSON; `POST /policies/resolve` answered 500 on a
  dynamic `import()` that destructured to `undefined` under CJS; that route
  then rejected its only caller by admitting `user` credentials when the
  Composer calls it with a plugin token; and the Composer never sent the
  request at all, because its client passed `{} as never` as `onBehalfOf` and
  swallowed the resulting throw into a silent fail-open.

  Taken together this means **Phase 5's terminal control had never executed in
  the application**, and `5-R1`'s Policy Pack enforcement has reported nothing
  since it landed, while reading as a pass. Every fail-open return in the
  policy client now logs why.

  **Three sibling clients carried the same `onBehalfOf` defect. Closed —
  see [`NXD-054`](DECISIONS.md) and the entry below.**

  Verified live, not only in tests. Blocker list before the build:
  `INVALID_STATUS, INCOMPLETE_TRACEABILITY, POLICY_OBLIGATION_UNMET ×4,
MISSING_CI_PROVENANCE, NO_URS_BASELINE`. After CI posted: the same list
  without `MISSING_CI_PROVENANCE`. A user token on the route is refused 403,
  a re-post of the same build returns 200 with an unchanged timestamp, a
  different build is refused 409, and a malformed SHA is refused 400.

- **Slice 2 — provider-neutral exchange definitions. Phase 4 closed.** See
  [`NXD-049`](DECISIONS.md). `DataContract.exchange` carries
  `deliveryMechanism`, `endpoint`, `accessMode`, `classification` and `sla`.
  The mechanism is an **open vocabulary** — validated for shape, never for
  membership in a list — because `ProductComponent.interfaceType` is a closed
  enum and the strategy makes exchange technologies providers, not Core domain
  truth. `s3-parquet` works today with no platform change. `accessMode` is
  closed (`OPEN | REQUEST | ENTITLEMENT`) and defaults to `REQUEST`, since an
  unstated access rule should not read as "help yourself".

  A new `exchange-declared` release-gate obligation blocks when _any_ output
  contract lacks a mechanism.

  Exercising it exposed a defect that made the whole of 5-R1 inert:
  **`createProduct` never mapped `declaredPolicies`** from the request,
  although the request type declares it and the column exists. The gate only
  resolves Policy Packs when that field is non-empty, so for every
  API-created product it resolved nothing and reported nothing — and looked
  like a pass. Fixed here.

- **Slice 1 — `DataContract` is identified by its coordinate.** See
  [`NXD-048`](DECISIONS.md). Identity moves from
  `(product_component_id, lower(name))` to `namespace/name@version`;
  `product_component_id` becomes the relation to the providing component.
  `GET /contracts/resolve?ref=…` resolves a contract without the caller knowing
  which component — or which Product — declares it. The coordinate grammar is
  the Artifact one, reused: `isArtifactSegment` now delegates to a single
  `isNameSegment` in `product.ts`, so the two cannot drift.

  Names tighten from free text to lowercase kebab-case, and the migration
  refuses rather than guesses — it stops on an unnamed contract, a name that is
  not a segment, or two rows that would collide, listing every offender at
  once. Promoted rows land in a `legacy` namespace rather than one derived from
  the Product name, because Product names are free text and slugifying two of
  them can produce one segment.

  The executed path found a defect no test had: `/contracts/resolve` against an
  absent coordinate answered **500**, because `respondError` had no
  `NotFoundError` branch. Fixed, and the service tests now assert error types
  rather than only messages, since the router maps by instance check and this
  plugin has no router harness.

- **Slice 0 — the record made trustworthy.** See
  [`NXD-043`](DECISIONS.md)–[`NXD-047`](DECISIONS.md). Four image names for one
  artifact reduced to the one production already publishes
  (`data-product-platform`); `platform-core:1.0-rc2` deliberately untouched
  because formal validation records carry it as the validated product
  candidate. `DECISIONS.md` backfilled for Wave 1 and the remediation series —
  about twenty commits that had produced two decision records between them,
  including that policy resolution fails _open_ and why. GP-8 struck from
  `HARDCODED_DOMAIN_INVENTORY.md`, leaving GP-7 as the only open row.

**Post-plan strategy work (2026-09-21, 16:22–19:00).** Everything below down to
the Docker entry landed after Phase 7 closed and is not part of the eight-phase
plan. `DECISIONS.md` records this work only as far as
[`NXD-042`](DECISIONS.md) (Wave 3); the remediation series that follows it has
no decision records yet.

- **Review items 1–9 — post-implementation review fixes.** A numbered review of
  the Wave 3 and remediation work; all nine closed across five commits
  (`2fc06a3`, `124ff36`, `4835e4c`, `e226bb7`, `beeab2a`). The list itself was
  never written to the repository, so only the commits record it.

  - Policy obligations were surfaced wholesale as blockers instead of being
    evaluated. `checkReleaseGate` now maps all nine checks of
    `gxp-data-product-policy.yaml` onto real product data
    (`product-owner-set` → `product.owner`, `urs-baseline-bound` →
    `approvedBaseline.ursBaselineIds`, `quality-checks-declared` → any
    `QualityRule`, …). `appliesTo` scoping is honoured: `all` always,
    `gxp` only when `gxpRelevance` is set and not `NONE`, `commercial` only
    when `declaredPolicies` is non-empty. An unknown check id raises
    `POLICY_OBLIGATION_UNMET` rather than passing silently — the same
    fail-loud principle as `platform-policy.ts`.
  - `ArtifactManifest.spec.policyDocument` is typed with `obligations[]`;
    `policyResolver.ts` reads the typed field instead of a duplicated inline
    type.
  - `GET /artifacts?includeVersions=true&includeFederated=true` merges remote
    registries into the local list, local coordinates winning. ~~The Marketplace
    query passes the flag.~~ **It does not, and never did** — corrected
    2026-09-28. `artifactRegistryApi.ts` fetches
    `?includeVersions=true` only, so federated results are unreachable from
    every screen. Two further facts found with it: the federated response
    carries **no manifest** (the client reads one field off it and discards
    the rest), and `marketplaceOfferingsFromRegistry` skips any entry without
    a manifest — so a federated artifact would be dropped even if the flag
    were passed. See [`NXD-074`](DECISIONS.md).
  - `schema_snapshots` persists the A-2 workflow (below).
  - `bootstrapPlatformProduct` wrote lifecycle `'production'`, which is not a
    member of the `ProductLifecycle` union — corrected to `'PRODUCTION'`.
  - `ConfigSummary` renders a `SECRET` badge for `type: 'secret'` keys and
    shows each key's description inline. Keys without schema metadata are
    unaffected.
  - The SSE client map moved off the `(service as any).__sseClients` property
    bag onto a real `ComposerService` field injected through
    `ComposerServiceOptions`. The router reads `service.sseClients` with no
    cast.
  - `packages/nexora-industrial-vocab` gained 39 unit tests (376 lines) over
    the annotation keys, the four parse helpers and their fallback paths,
    `entityRefOf`/`entityNameFromRef`, the two entity predicates, the
    converters, the filters, `groupAssetsByHierarchy` and
    `relatedDataProducts`.

- **GP-8 closed — `nexora-industrial.ts` is a 9-line shim.** The last and
  largest item of the hard-coded domain inventory. All 62 exports
  (`NEXORA_ANNOTATIONS`, `DataProductHealth`, `ConnectivityInterface`,
  `EquipmentStateView`, `MetricValue`, `CapabilityGroup`, the parse helpers)
  now live in `packages/nexora-industrial-vocab/src/index.ts` (598 lines), and
  `platform-common/src/nexora-industrial.ts` is nothing but
  `export * from '@internal/nexora-industrial-vocab'` under a `@deprecated`
  notice. No consumer import changed. The dependency direction is
  vocab → platform-common for `CatalogEntityLike`, platform-common → vocab for
  the shim re-export. **Core is domain-neutral.** Landed in two steps: `7-R1`
  created the package as a pure re-export so consumers could migrate
  incrementally, `b3fc357` moved the content and reversed the direction.

  This move is the source of 16 of the 50 open typecheck errors: the extracted
  file uses `CatalogEntityLike` in nine signatures without importing it.

- **5-R1 / 7-R4 — Policy Packs are enforced by the Release Gate.**
  `nexora/gxp-data-product-policy@1.0.0` exists as a `POLICY_PACK` Artifact
  (`catalog/artifacts/nexora/gxp-data-product-policy.yaml`) with 8 obligations
  across Product Identity, Validation Evidence, Data Handling and Quality,
  derived from FDA 21 CFR Part 11, EU Annex 11 and GAMP 5, distributed with the
  life-sciences edition. `Product.declaredPolicies` (nullable
  `declared_policies` TEXT column, JSON array of coordinates) records which
  packs a product claims. `checkReleaseGate` resolves them through an injected
  `policyResolverClient` and raises `POLICY_PACK_UNRESOLVABLE` or
  `POLICY_OBLIGATION_UNMET`. `createHttpPolicyResolverClient` follows the same
  cross-plugin HTTP pattern as `UrsBaselineResolver` and
  `ValidationDecisionResolver`, and **fails open** — an unreachable resolver
  returns null and does not block a release.

- **6-R1..R3 — Consumer experience.**
  R1: all 8 component profiles carry a typed `configurationSchema[]`
  (`health`, `observability`, `rest-api`, `rest-source`, `mqtt-consumer`,
  `timeseries`, `aas-foundation`, `unified-namespace`). Each key has type,
  `required`, description, default and example; `type: 'secret'` marks
  `SOURCE_API_TOKEN`, `MQTT_PASSWORD` and `UNS_MQTT_PASSWORD` as never-log,
  never-display. The legacy flat `configurationKeys[]` stays for
  backward compatibility and `compositionConfigSummary` prefers the schema.
  R2: `GET /subscribe/notifications?consumer=X` is a Server-Sent Events stream
  pushed by `dispatchUpgradeNotifications`, so consumers no longer poll. Built
  on Express alone — no new dependency. 30s heartbeat and
  `X-Accel-Buffering: no` keep it alive through nginx. Polling via
  `GET /notifications` remains the fallback for missed pushes.
  R3: `LineageDAGView.tsx` is an interactive SVG graph — rank-based layout,
  Bezier edges with arrowheads, drag-to-pan, hover states — replacing the
  column layout. Again no charting library.

- **7-R2/R3/R5/R6 — Ecosystem.**
  R2: `createFederationClient` fans `GET /artifacts` out to every enabled
  remote registry via `Promise.allSettled`, so one unreachable peer cannot
  block the rest. Namespace whitelisting, 15s `AbortSignal.timeout` per peer,
  trust enrichment from `registry.defaultTrustLevel`, and
  `loadFederationConfig()` reading `artifactRegistry.federation` from
  app-config.
  R3: `PATCH /publishers/:id/promote` (PLATFORM_ADMIN only) completes the
  self-registration → COMMUNITY → review → PARTNER path opened by `P-EXT-S2`.
  Both `trust_level` and `member_groups` are nullable, so pre-Phase-7 rows are
  untouched.
  R5: `PRODUCT_TYPES` gains `PLATFORM_PRODUCT`, and `bootstrapPlatformProduct()`
  registers `nexora-core` on plugin init — idempotent, non-fatal, declaring
  `nexora/gxp-data-product-policy@1.0.0`. Nexora is now a managed Product of
  the platform it provides, closing the "Nexora manages Nexora" principle
  that `W3-3` set up on the catalog side.
  R6: all 8 scaffolder templates now ship `agent-instructions.md` — controlled
  artefacts (`nexora.yaml`, `composition.yaml`, `urs.yaml`, `contracts/`,
  `dataprod/`) versus free implementation space (`app/`, `tests/`,
  `Dockerfile`), requirements traceability, contract obligations, security
  rules and AI autonomy limits.

- **A-2 / A-3 — Drift detection and federation sync.**
  A-2: `detectSchemaDrift(baseline, current, version)` in
  `contract-compatibility.ts` compares two `SchemaSnapshot`s through
  `evaluateContractCompatibility`. The `schema_snapshots` table and
  `captureSchemaSnapshot(contractId, actor)` make it operational:
  `POST /contracts/:id/snapshot` captures and, when a previous snapshot
  exists, returns a `driftResult` in the same response;
  `GET /contracts/:id/snapshots` lists them. A `BREAKING_CHANGE` status is
  the trigger for notifying subscribers.
  A-3: the artifact-registry plugin reads the federation config at startup and
  runs an initial fan-out plus a `setInterval` sync, logging artifact and
  unreachable-registry counts. Best-effort: a scheduler failure does not stop
  plugin startup. **This is an in-process interval, not a durable job** — a
  real cron (pg-boss or the Backstage scheduler) is the intended upgrade.

- **W3-1..8 — Wave 3.** See [`NXD-042`](DECISIONS.md).
  W3-1: `getFullLineageDAG(versionId, maxDepth)` — BFS to N hops with cycle
  detection, `GET /versions/:id/lineage/dag?depth=N` (max 10).
  W3-2: `nexora-industrial.ts` marked `@deprecated` with a migration plan
  (superseded by the GP-8 closure above).
  W3-3: `catalog/nexora-core-product.yaml` registers the platform as a
  Backstage Component and as the `nexora/nexora-core` DATA_PRODUCT Artifact.
  W3-4: first `LineageDAGView.tsx`, column layout (superseded by `6-R3`).
  W3-5: `agent-instructions.md` in the first 5 templates (completed by `7-R6`).
  W3-6: `policyResolver.ts` — `resolvePolicies(refs, service)` fetches
  POLICY_PACK manifests, returns their obligations and surfaces unresolved
  refs. Route `POST /artifact-registry/policies/resolve`.
  W3-7: `registry-federation.ts` types (`FederatedRegistry`,
  `FederatedArtifact`, `FederatedSearchResult`, `FederationConfig`) — the
  contract the `7-R2` client implements.
  W3-8: `catalog/editions.yaml` — four editions (`nexora-core`,
  `nexora-life-sciences`, `nexora-manufacturing`, `nexora-enterprise`) with an
  `extends` hierarchy, typed as `PlatformEdition` / `EditionCatalogue`. Adding
  an edition needs no Core change.
  Reported 440 tests, 0 failures at the time of the commit.

- **W2-1..4 — Wave 2.** See [`NXD-041`](DECISIONS.md).
  W2-1: `upgrade_notifications` table plus `dispatchUpgradeNotifications`
  (one record per active subscriber), `POST /contracts/:id/notify`,
  `GET /notifications`, `PATCH /notifications/:id/read`. Producer announces,
  consumers poll — the push path arrived later as `6-R2`.
  W2-2: `ConfigKeySchema { key, description, type, required, defaultValue,
example }` with `ConfigKeyType` of `string|number|boolean|url|secret`;
  `ComponentLibraryProfile.configurationSchema?` supersedes the flat key list.
  W2-3: `GET /versions/:id/revalidation-scope` diffs the current version
  against the previous approved baseline and returns added/removed components
  and contracts plus a recommendation ("Full IQ and targeted OQ/UAT for changed
  components" / "Regression test only" / "First baseline"). Null when no
  approved baseline exists.
  W2-4: `spec.policies?` (exact-version Policy Pack coordinates, validated as
  `namespace/name@exact-version`) and `spec.requirements?` (URS requirement
  IDs) in the Artifact manifest. Closes section 7 of the product strategy.
  Reported 280 tests, 0 failures.

- **P-EXT-S1..S5 — Wave 1.** No `NXD` record was written for this wave.
  S1: `ProductBaseline.snapshot` gains a `_provenance` block
  (`snapshotChecksum` as `sha256:hex`, `snapshotTimestamp`, `createdBy`); the
  audit event carries the checksum so tampering is detectable.
  S2: `POST /publishers/self-register` lets a DEVELOPER register a COMMUNITY
  external publisher and adds the registrant to `memberGroups` — the first
  read path for the `memberGroups` field that `NXD-014` recorded as written
  but unread.
  S3: change impact analysis — `GET /contracts/:id/impact` and
  `GET /impact/artifact?name=`, one hop over direct `ProductDependency` links.
  S4: `ContractSubscription` and the `contract_subscriptions` table (unique per
  contract + consumer), with subscribe, list-by-contract, list-mine and
  `ACTIVE|PAUSED|CANCELLED` status transitions.
  S5: the `UpgradeNotification` type (`CONTRACT_VERSION_BUMP`,
  `ARTIFACT_VERSION_BUMP`, `BREAKING_CHANGE`, `DEPRECATION`,
  `SECURITY_UPDATE`), persisted a wave later by `W2-1`.
  Reported 121 tests, 0 failures.

- **Docker: the platform runs as an image.** `docker-compose.yml` offers a
  single-container mode (`docker compose up nexora`, backend on 7007 serving
  the built frontend — the production pattern, no CORS) and a split mode
  (`--profile split`, nginx on 3000 proxying `/api/*`, `/.backstage/*`,
  `/oauth2/*` and the SSE route to the backend), both against PostgreSQL 16 on
  the `nexora_db` volume. Four fixes were needed to make the image build:
  `scripts/link-internal-packages.js` had to be copied _before_
  `yarn workspaces focus --all --production` (its postinstall runs during that
  step), the script early-exits on `NODE_ENV=production` as a second guard,
  `model-company/` was missing from the `COPY` list although the plugin reads
  its YAML at startup, and `app-config.docker-local.yaml` was added as a
  guest-only overlay so local runs need no GitHub credentials.

- **P7-S1..S5 — Phase 7.** See [`NXD-039`](DECISIONS.md), [`NXD-040`](DECISIONS.md).
  S1: Publisher `trustLevel` (INTERNAL/PARTNER/COMMUNITY) + `externalPublisher` flag + DB migration.
  S2: Per-namespace permission scoping — `certify`/`publish` check actor in `publisher.memberGroups`. Partial NXD-014 closure.
  S3: `MarketplaceOfferingView` + `listArtifactsWithVersions` carry publisher trust data.
  S4: `MarketplaceItem.publisherTrustLevel/externalPublisher`; Marketplace table shows "Publisher" column with `✓ Partner` / `⚠ Community` trust badges.
  S5: Marketplace detail page shows trust disclaimer for Community publishers and certification note for Partners. Entitlements fully integrated (PENDING_ACCESS, NOT_ENTITLED, ENTITLED flows already existed; trust context added).

- **P6-S1..S6 — Phase 6.** See [`NXD-038`](DECISIONS.md).
  S1: `AnalyticsProvider` model + catalog annotation `dataprod.platform/analytics-providers` + OverviewTab panel.
  S2: Governed AI Data Analyst — `POST /api/composer/ai/analyze-product`;
  governance-bounded system prompt prevents data fabrication or false validation claims.
  S3: Safe Data Preview row cap (100 rows); `preview: true` flag.
  S4: `DependencyCard` — "Used By" and "Depends On" are navigable links to product detail pages.
  S5: Usage Recording — `GET /consume/usage/:entityRef` returns access stats; access is recorded on each product view.
  S6: Live Quality Health — `QualityTab` shows live `DataProductHealth` checks from `nexoraDataQualityApiRef` alongside declared annotation metadata (Runtime Health vs. Data Health distinction).

- **P5-S2..S5 — Phase 5 completion.**
  S2: SoD on APPROVED transition — version author cannot approve own work.
  S3: HTTP `ValidationDecisionResolver` wired in `plugin.ts`; the release gate
  check is now exercised in production, not just in tests.
  S4: `ProtocolType` gains `'PQ'` (optional); `parsePqProtocol` returns `[]`
  when no PQ protocol file exists.
  S5: `ProductBaseline.snapshot` now includes `releaseCommitSha`,
  `artifactDigest`, contract `name`, and declared `dependencies` (contractIds
  at baseline time). See [`NXD-037`](DECISIONS.md).

- **P5-S1 — Validation Decision step, SoD, release gate integration.**
  `ValidationDecision { id, contextId, status, justification, conditions, decidedBy, decidedAt }`
  is the terminal step of the validation lifecycle. `validation.approve` is
  enabled for `PLATFORM_ADMIN` only. Service enforces Segregation of Duties
  (decider ≠ context creator) and one-decision-per-context invariant.
  Routes: `POST /contexts/:id/decision`, `GET /contexts/:id/decision`.
  `ValidationDecisionResolver` interface is injected into `ComposerService`;
  `checkReleaseGate` adds `NO_APPROVED_VALIDATION_DECISION` blocker when the
  resolver reports no APPROVED decision. 11 tests (9 decision invariants + 2
  release gate). `risk.accept` and `baseline.modify` remain reserved.
  See [`NXD-036`](DECISIONS.md).

- **P4-S6 — Data Quality contracts: declarative quality rules in DataContract.**
  `QualityRule` and `QualityRuleType` are added to `platform-common/src/product.ts`.
  Supported rule types: `completeness`, `uniqueness`, `range`, `regex` — matching
  the Python SDK's `run_check` / `unique_field_check` vocabulary.
  `DataContract.qualityRules: QualityRule[]` is stored as JSON in a new
  `quality_rules` column (nullable migration, safe on existing DBs). The service
  validates rule names, types and fields at creation time. 4 new tests.

- **P4-S5 — Contract compatibility in platform-common + API endpoint.**

- **P4-S4 — Initial data lineage graph.** `GET /versions/:id/lineage` returns
  one-hop upstream (what this version consumes) and downstream (who consumes this
  version's contracts), traced through ProductDependency + DataContract →
  ProductComponent → ProductVersion → Product. 3 tests.

- **P4-S3 — ProductDependency domain model and API.**

- **P4-S2 — Contract GET endpoints.**

- **P4-S1 — DataContract identity: name, owner, uniqueness.** `DataContract`
  gains `name: string` (required, trimmed) and `owner?: string`. DB migration
  adds both columns as nullable (existing rows unaffected) and a unique index on
  `(product_component_id, lower(name))`. The service enforces name presence and
  case-insensitive uniqueness per component via `findDataContractByName`. 16
  tests (5 new identity cases + 11 pre-existing validation cases). See
  [`NXD-034`](DECISIONS.md).

- **P3-S9 — Machine State Consumer linked to its GOLDEN_PATH composition.**
  `machine-state-consumer-data-product.yaml` gains `spec.builtFrom: "machine-state-consumer"`,
  the second entry in `builtFromIndex`. The Composer now offers "Generate Data
  Product" and "Continue to Golden Path" for the Machine State Consumer
  selection without any Core change.

- **P3-S8 — Composition config summary (development context).** `compositionConfigSummary(selected)`
  aggregates all `configurationKeys` and `configurationNotes` from the selected
  components into a cross-component checklist. `ComposePage` renders it below
  the YAML preview. Exported as `CompositionConfigKey` / `CompositionConfigSummary`
  from `platform-common`. 3 tests.

- **P3-S7 — Catalog component loader wired into AI spec generation.** The
  `generateProductSpec` backend call now loads real Platform Component entities
  from the Catalog API via `createHttpCatalogComponentLoader`, following the
  same HTTP + `discovery` + `auth` pattern as the URS baseline resolver. No new
  dependency added — uses `@backstage/plugin-catalog-node` transitively. The
  loader is best-effort: any HTTP failure returns an empty list so spec
  generation degrades gracefully. 4 tests cover: correct filter, HTTP error,
  network error, and missing title fallback.

- **P3-S6 — AI spec apply sets owner.** `applySpecDraft` now sets `owner:
actor` so the `owner-declared` platform policy obligation is met at apply
  time. `dataClassification` and `gxpRelevance` still require deliberate manual
  entry before release. Test updated to assert `product.owner === actor`.

- **P3-S5 — GP-5 deleted.** `WAVE1_COMPONENT_TITLES` is removed from Core
  and `index.ts`. `DeveloperHubPage.tsx` declares a local `OEE_COMPONENT_TITLES`
  constant — the app layer may know which product it displays. `builtWithSummary`
  loses the middle fallback and uses `match?.title || name`. See
  [`NXD-033`](DECISIONS.md).

- **P3-S4 — AI provider abstraction: Anthropic client added.** The Composer
  backend can now use Claude in addition to OpenAI. `AnthropicComposerLLMClient`
  implements `ComposerLLMClient` via raw `fetch` against
  `https://api.anthropic.com/v1/messages` (no new SDK dependency). A new config
  key `composer.ai.provider` (`'openai'` default, `'anthropic'`) selects the
  provider; `composer.ai.model` overrides the per-provider default
  (`gpt-4o-mini` / `claude-haiku-4-5`). Thinking blocks (Opus 5) are silently
  skipped when extracting the text response. Six tests cover: correct headers,
  JSON parsing, thinking-block skip, API error, missing text block, and
  non-JSON content. Phase 3 AI provider abstraction goal partially met.

- **P3-S3 — GP-6 deleted.** `EQUIPMENT_USE_LOG_COMPOSITION_YAML` and
  `parseEquipmentUseLogExample()` had no production consumers after P3-S2; both
  are deleted from `platform-component-library.ts` and `index.ts`. The two
  tests that used them now read from the disk manifest via `compositionOnDisk()`
  and `readGoldenPathComposition()`. See [`NXD-032`](DECISIONS.md).

## In Progress

Nothing in flight. Batch 1 is committed (`b7378b0`) and the live walk that
followed it is recorded in [`NXD-059`](DECISIONS.md).

**From the walk, in the order they matter.** Four of the five are closed; the
strikethroughs stay so the record shows what was found, not only what remains:

1. ~~**Approval order is not enforced.**~~ **Closed 2026-09-25** — a step is
   refused while any required step with a lower `sequence` is still open, and
   the refusal names the blocker. Only required steps block.
2. ~~**A Product baseline can be approved by whoever created it.**~~
   **Closed 2026-09-25** — the rule P5-S2 put on the version transition now
   covers the baseline too.
3. ~~**Approval steps carry no `stepNumber` over the API.**~~ **Closed
   2026-09-28** — and the finding was misdiagnosed. There is no `stepNumber`
   anywhere and there never was; the ordinal is `sequence`, and it was already
   in the database, the service, the wire contract and the client type. What
   was missing is that the page never rendered it. Rendering it surfaced the
   defect that mattered: step one of every chain was unapprovable from the
   browser. See [`NXD-072`](DECISIONS.md).
4. ~~Three refusals answer 500 instead of 409/400.~~ **Closed 2026-09-26**
   (`ae62aa4`, Slice B-1). Each sat one layer away from where the note placed
   it: the 500s were four untyped approval *lookups*, not the status check,
   and five plain `Error`s in `urs-baseline-resolver.ts` — the cross-plugin
   HTTP boundary — rather than in `bindUrsBaseline`. The resolver's failures
   are now typed by cause, not uniformly: upstream 404 → `NotFoundError`, not
   APPROVED → `ConflictError` naming the actual status, a partially resolved
   requirement list → `ConflictError`, and anything else left untyped so a
   genuinely broken upstream still reads as 500.
5. ~~An unknown requirement-set id answers 200 with an empty list.~~
   **Closed 2026-09-26** (Slice B-1) — see the MVP1-B notes under
   `## Current Vertical Slice`. The second half of this item was wrong: all
   four paths take `requirement_sets.id`, so there was one identifier and
   three missing guards, not two identifiers.

The **MVP1-B core phase** — a TestExecution entity with evidence ingestion,
automated `VERIFIED_BY` production, validated references on
`traceability_links`, and a release gate that consumes
`getRequirementCoverage` — is **done**. Those are items 2–5 of
[`TARGET_CONFORMANCE_AUDIT.md`](../audits/TARGET_CONFORMANCE_AUDIT.md) §11,
the four it names as the critical path; all four are closed, together with
the end-to-end spec (item 12) that drives them as one journey. See the
MVP1-B notes under [Current Vertical Slice](#current-vertical-slice). Step 2
— "one door" — landed in `9d80d16`.

Item 1 — `nexora:product:create` in every publishing template — is closed
too, and with it the last MVP1 item that was a matter of wiring rather than
of building something new. What that unblocks is worth naming: every
scaffolded product now has a governed row joined to its repository and its
Catalog entity at birth, which is the precondition the `Development` tab
([`NXD-056`](DECISIONS.md)) was specified against and left unbuilt for,
because it would otherwise have had nothing to display for seven of the nine
templates.

Items 6, 8 and 11 closed after it, which completes the audit's MVP1 list.
What follows MVP1 is sequenced in
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md), not here.

## Next

**Sequencing now lives in [`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md)**
(written 2026-09-22). A code audit for that plan found four phases still open
against `IMPLEMENTATION_PLAN.md` — 2, 3, 4 and 7 — and that the entries below
understated Phase 4 in particular: `DataContract` was never promoted to a
first-class namespace despite `product.ts:192` saying a later slice would do
it, and provider-neutral exchange definitions do not exist at all. Phase 5's
CI-evidence chain is also not automated. The nine slices, their order and the
Definition of Done are in that document; the notes below remain accurate as
context.

**0 — ~~`addProductComponent` does not check the version status.~~ Done
2026-09-28.** The guard went next to the one `bindUrsBaseline` already had —
and it was a family of five, not one method. See [`NXD-072`](DECISIONS.md) and
the correctness batch under `## Current Vertical Slice`.

**1 — ~~Restore the green gate.~~ Done 2026-09-22.** All four gates pass again;
see `## Test Status` for what was wrong and what each fix was. One item was
left deliberately open: `build-image` tags `pharma-data-factory:mvp-1.0` while
`docker-compose.yml` tags `nexora:latest`, so two product names are live at
once. `brandSeparation.test.ts` now accepts either and says so in a comment.
**Pick one name and tighten the assertion back to it.**

**2 — ~~`DECISIONS.md` stops at `NXD-042`; Wave 1 and the remediation series
exist only as commit messages.~~ Wrong since `NXD-047`; corrected 2026-09-29.**
Every item this entry named has a record, and has had one for some time:

| Named as missing | Actually recorded in |
| --- | --- |
| Wave 1 (`P-EXT-S1..S5`) | [`NXD-044`](DECISIONS.md), item by item |
| `5-R1` fail-open policy resolution | [`NXD-045`](DECISIONS.md) — including the fail-open as the deliberate part |
| `7-R5` `PLATFORM_PRODUCT` | [`NXD-046`](DECISIONS.md) |
| `A-3` in-process interval | [`NXD-047`](DECISIONS.md), titled "knowingly" |

The entry was written when it was true and never re-read after the records
landed. It is the second note in this document found doing that — see the GP-8
correction below — and both sent a reader to do work that was already done.

**3 — `A-3`'s scheduler is an in-process `setInterval`.** It dies with the
process, runs once per replica, and has no retry or backoff. A durable job
(pg-boss or the Backstage scheduler) is the intended upgrade and was named as
such when it landed.

**4 — ~~Re-audit what Phase 3 still owes.~~ Done 2026-09-28**, by the §4
correction in [`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md): Phase 3 is
closed, and GP-7 is inventory debt rather than the composition hard-coding the
phase was about. The four corrections this entry called for are already in that
table — dependency and compatibility resolution landed in `P4-S3`/`P4-S5`,
configuration schemas in `W2-2`/`6-R1`, Development Context in `P3-S8`, and the
AI provider abstraction is partial after `P3-S4` (OpenAI and Anthropic clients
behind `ComposerLLMClient`). Nothing further is owed here.

GP-8 is **closed** — see the Completed entry. That leaves **GP-7** as the only
open row in `HARDCODED_DOMAIN_INVENTORY.md`: `RUNTIME_PACKAGE_*` and
`CATALOG_ONLY_COMPONENT_NAMES` in `platform-component-library.ts` are still a
fixed component registry in Core, rated Medium.

> **Corrected 2026-09-29.** This paragraph used to end "the inventory table
> itself has not been updated for the GP-8 closure and still shows the row as
> open". It does not: the table reads `~~GP-8~~ … **REMOVED 2026-09-21**` and
> its own text says "GP-7 is now the only open row". The note outlived the
> thing it was about — a stale correction is its own kind of wrong answer,
> because it sends a reader to fix what is already fixed.

Deferred, not part of Phase 2: **per-namespace permission scoping.** The eight
registry permissions are platform-wide, so a DATA_PRODUCT_OWNER may certify in
any namespace, not only their own.

> Partly overtaken by events. `Publisher.memberGroups` is no longer write-only:
> `P7-S2` reads it in the `certify` and `publish` checks, `P-EXT-S2` seeds it
> with the self-registrant, and `7-R3` added the update path
> (`PATCH /publishers/:id/promote`). What remains open is the list-filtering
> problem described below, not the missing plumbing.

Closing the rest still needs ground the repository has never used: all eight
permissions are
`BasicPermission`, not `ResourcePermission`, the policy's decision type
(`'allow' | 'deny'`) cannot express a conditional or a list filter, no
Backstage conditional-permission or permission-rule machinery is used
anywhere in the repository, and the registry router authorizes the five
lifecycle transitions before it knows which namespace a version belongs to.
`resourceRef`-aware but non-conditional gating exists once, for scaffolder
templates (`allowScaffolderTemplateIfReleased`), but it cannot filter a list
and is not a precedent for a list-filtering decision. See
[`NXD-014`](DECISIONS.md).

Carried into Phase 4 rather than done early: **`DataContract` identity**. A
contract is keyed to a `productComponentId` and has no name, owner or
independent version, so it cannot be referenced or versioned on its own.
Phase 4 needs the whole first-class model in one designed migration — see
[`NXD-010`](DECISIONS.md).

## Test Status

**GREEN.** Verified on 2026-09-29 the way CI runs it (`CI=true`, PostgreSQL up
via `docker-compose.test.yml`), at the close of Welle 4 of
`PHASE_CLOSURE_PLAN.md` §9.4a. The previous measurement was 2026-09-28 at the
close of §9.2 ([`NXD-076`](DECISIONS.md)) — 233 suites and 2129 tests. The five
suites added since are `editions.test.ts`, `installation.test.ts` and
`evidencePackage.test.ts` from wave 1 ([`NXD-081`](DECISIONS.md),
[`NXD-082`](DECISIONS.md), [`NXD-083`](DECISIONS.md)), plus
`appRouting.test.ts` and `LineageDAGView.test.tsx` from wave 3
([`NXD-085`](DECISIONS.md)).

| Gate       | Command                           | Result                                        |
| ---------- | --------------------------------- | --------------------------------------------- |
| Guardrails | `yarn guard:platform`             | PASS (11 pass, 9 documented warnings, 0 fail) |
| Typecheck  | `yarn tsc:full`                   | PASS                                          |
| Lint       | `yarn lint:all`                   | PASS                                          |
| Doc links  | `node scripts/check-doc-links.mjs`| PASS — 275 files, all relative links resolve  |
| Unit tests | `CI=true yarn test`               | PASS — 238 suites, 2239 tests, **0 skipped**  |

**One local prerequisite that CI holds and a fresh container does not.**
`compatibilityPolicyParity` runs the shared compatibility policy through the
Python SDK, and under `CI=true` it *throws* rather than skipping when no
interpreter can import `dataprod` — deliberately, because cross-language parity
is the whole point of the test and a skip would report green for a check that
never ran. CI installs the toolchain (`ci.yml`: `pip install pydantic
'jsonschema[format]' -e packages/data-product-sdk`). A container without `pip`
therefore reports one red suite that is not a defect. Install the SDK, or pass
`PYTHON=` pointing at an interpreter that can import it. Worth stating here
because the failure message names the cause but the gate table above did not
name the prerequisite.

`CROSS_PLUGIN_BOUNDARY` moved from WARNING to PASS in `15ea5e7`. The nine
warnings are all documented and deliberately held: five `/alpha` API imports,
the `@types/react-dom` wildcard, the two legacy resolutions
(`@backstage/plugin-permission-react@^0.5.2` against a backend declaring
`^0.7.2`, and the Material UI lab alpha baseline), and — new on 2026-09-28 —
`TEST_GATE_COVERAGE`, which names the one workspace the repo-wide run does not
reach. See [`NXD-073`](DECISIONS.md).

The doc-link checker is listed separately because it has no yarn script — it
runs standalone as above and again inside `guard:platform` as
`DOC_LINK_INTEGRITY`.

**`plugins/urs-composer` is not in that figure, and never has been.** The
workspace runs `BACKSTAGE_OLD_TESTS=true` through its own `bin/test.js`
wrapper, so `backstage-cli repo test` skips it entirely — zero of its files
appear in a root run. Its suite is green on its own (`CI=true yarn test` from
the workspace: 9 suites, 79 tests) **except for `CreateWizard.test.tsx`, where
9 tests fail with "A component suspended while responding to synchronous
input".** That failure is **pre-existing** — verified against a stashed tree on
2026-09-28, not introduced by this batch — but it means the frontend plugin
that owns the URS authoring journey is outside the gate the rest of the
repository is measured by. **The omission is now enforced rather than merely
recorded**: `TEST_GATE_COVERAGE` in `guard:platform` requires a named reason
for any workspace outside the repo-wide run, and fails both on an undeclared
exclusion and on a stale exemption ([`NXD-073`](DECISIONS.md)). Re-including
the workspace, and the nine failures that would come with it, is ranked in
[`PHASE_CLOSURE_PLAN.md`](PHASE_CLOSURE_PLAN.md) §9.4.

Earlier figures, for the trend: 232 / 2088 at `4599234` on 2026-09-27,
231 / 2066 at `1a3bafe` earlier the same day, 231 / 2063 at `fab5b0a`,
229 / 2051 at `34c9a6c`, 226 / 2008 at `15ea5e7`, 222 / 1961 on 2026-09-25,
221 / 1958 for Batch 1 alone, 215 / 1909 on 2026-09-24.

The correctness batch added one suite and 28 tests to the root figure:
`versionStatusGuards.test.ts` (12 — the five refusals on their wording, the
DRAFT accept path, the 404s, and the three exemptions that must keep working
after release), plus additions to `errorMapping.test.ts` (403 over HTTP for
both SoD sites, 409 for the three guarded writes, 404 for the blind delete and
the two dangling references, and five new rows in the never-500 table),
`traceabilityIntegrity.test.ts`, `approval-chain.test.ts` (including a
sparse 10/20/30 workflow), `approval-contract.test.ts` and
`gxp-invariants.test.ts`. A further suite, `approvalStepper.test.ts` (10
tests), lives in `urs-composer` and therefore does not move the figure.

Four mutation checks, each confirmed to fail on the restored defect:
reinstating the `+ 1` breaks the sparse-sequence assertion; removing the
`currentStepSequence` initialisation breaks four assertions across two suites;
removing the `deleteTraceabilityLink` lookup breaks four; and dropping the
`(approval_instance_id, sequence)` index breaks the PostgreSQL proof. The
first two are worth stating together: the old initialisation to `0` and the
increment **partly cancelled**, so either fix alone looks correct on every
seeded workflow. Only the out-of-order sparse chain separates them.

Item 11 added one suite and fourteen tests: `functionalSpecification.test.ts`
(12 — derivation, idempotence, the two refusals, the chain resolved four ways,
and the assertion that coverage is unchanged) and two PostgreSQL proofs, the
constraint rebuild and the table's two unique identities. The rebuild proof was
mutation-checked: restoring the old skip-if-exists behaviour fails it.

Items 6 and 8 added eight tests and no suites: two on `getPersistenceMode`
for the new refusal and its consequence, two in `startup.test.ts` pinning the
shipped default and the opt-out file, four in `ai-spec-draft.test.ts` for
durability and provenance, and one in `migrations.postgres.test.ts` — the
`notNullable` columns are proven on the dialect that enforces them, because
the draft suites run on SQLite where a missing NOT NULL costs nothing.

**No suite was added for audit item 1**, which is why the count moved by
three tests and no suites: the work was templates and the gates that were
already supposed to check them. The three are `templateContract.test.ts`
running its per-template cases over a ninth template. Removing the escape
hatch added no test at all — it made an existing one capable of failing,
which the count cannot show.

The two suites added since `34c9a6c` are `errorMapping.test.ts` (11 tests,
commit `3857589` — the typed-error item, which landed after that figure was
written and is why the table moved by more than the end-to-end spec alone)
and `e2eProductReleaseFlow.test.ts` (1 test, the whole URS → Product →
Release journey). The three before them were the B-4 ones: product-side
audit correlation, traceability link integrity, and test evidence
ingestion — the last being the first router-level suite in
`composer-backend`. The four before *them* came from B-1 to B-3: the
unknown-identifier guards, the approval-instance client contract on both
sides, and URS audit correlation. The eight added on 2026-09-25 were the
governance vocabulary, the product update path, release-gate progress, the
approval-workflow seed in both persistence modes, the approval-instance column,
the review chain, the guest role, and the transaction boundary.

**One test is worth a caveat.** `e2eProductReleaseFlow.test.ts` contributes a
single test to that count and covers more ground than any other line in it,
so the totals understate it. It was mutation-checked rather than trusted:
posting `FAILED` instead of `PASSED` evidence fails it at
`verifiedByLinkId`, which is the assertion that would otherwise let a
silently broken ingestion path pass as green.

**The gate did not catch the defect that mattered most on 2026-09-25**, and it
is worth being plain about why. Signing a requirement version was impossible on a real
connection pool for as long as the feature has existed, and every suite passed
throughout, because they drive the service with an in-memory repository and a
stub catalog where the two offending calls cost nothing. See
[`NXD-059`](DECISIONS.md). `transactionBoundary.test.ts` now pins the ordering
rather than the symptom, and was mutation-checked against the fix.

### The 2026-09-24 flake — NXD-016 regressed in Slice 1a, now fixed

`Slice 1a › enforces one row per pinned requirement version in the database`
failed three full-repository runs in eight, always on the same assertion, and
passed everywhere else: 25 consecutive runs of the file alone under CPU load,
nine runs of `yarn test plugins/composer-backend` including `--maxWorkers=12`,
and serially. The "green at 214 suites / 1903 tests" recorded on 2026-09-23 was
therefore a run that happened to pass.

**The constraint always fired.** A probe capturing the rejection showed the
same `SqliteError` carrying the same message —
`UNIQUE constraint failed: product_requirements.product_version_id,
product_requirements.urs_requirement_version_id` — on every run, while
`rejection instanceof Error` flipped between `true` and `false` from run to
run. That is the mechanism [`NXD-016`](DECISIONS.md) already records:
better-sqlite3 is a native module whose binding is loaded once per worker
process, so its `SqliteError` carries the `Error` intrinsic of whichever jest
module realm loaded it first. When another project's file got there first,
`instanceof Error` reads false inside this file, and `toThrow()` reports
_"Received function did not throw"_ for a rejection that did happen.

The literal message was the tell and was misread for several runs. Jest says
_"Received promise resolved instead of rejected"_ when nothing is thrown. "Did
not throw" meant a value **was** thrown and was not an `Error`.

**Fix.** `expectRefusedByDatabase` — which `identityConstraints.test.ts` had
carried as a local function since NXD-016, mechanism spelled out in its doc
comment — moved to
`plugins/composer-backend/src/__testUtils__/databaseRefusal.ts`, and both
suites import it. `productRequirements.test.ts` now asserts the constraint by
name, which is a stronger claim than the bare `.rejects.toThrow()` it replaced.

The standing rule, since it did not stick the first time: **a bare
`.rejects.toThrow()` on a database-level refusal is a latent flake in this
repository.** Slice 1a introduced one days after NXD-016 explained why. The
helper is now importable, which is the only reason it will not recur.

One other suite is load-sensitive and is **not** fixed: `Plugin Directory UI ›
renders directory summary and Validation Expert entry` failed one full run on a
`waitFor` left at the 1 s default. It passes in isolation and in its project.

Slice 1a/1b added 21 tests in `productRequirements.test.ts` and a new
`ursBaselineResolver.test.ts`, and changed one existing fixture: the AI spec
draft's stub resolver returned a requirement with no stable `requirementId`,
which the new binding refuses. That was a test double predating the field, not
a behaviour the product ever had.

### The 2026-09-22 repair

Earlier the same day the gate was red: 50 type errors in 12 files, 9 lint errors
in 4 workspaces and 5 failing suites, all of it fallout from the 2026-09-21
evening commits, which were not put through steps 7–10 of the working method.
Recorded here because the causes are instructive, not just the counts.

**Type errors.** The largest cluster, 16 of the 50, was the GP-8 extraction:
`nexora-industrial-vocab/src/index.ts` used `CatalogEntityLike` in nine
signatures without importing it, and two `relation` callbacks lost their
inference with it. Fixed with one `import type` — type-only, because
platform-common re-exports this package as a shim and a value import would
close a runtime cycle. Fourteen more were Marketplace fixtures that never
gained the `publisherTrustLevel` and `externalPublisher` that `P7-S4` made
required; they now get those defaults from one `.map` rather than twelve
repetitions. The rest: `detectSchemaDrift`, `SchemaSnapshot` and
`SchemaDriftResult` were never re-exported from platform-common's index;
`SUBSCRIPTION_STATUSES` and `UPGRADE_NOTIFICATION_TYPES` are `const`s that sat
in an `export type` block, so using them as values raised TS1362;
`llm-client.ts` called two prompt builders that exist in `prompt-template.ts`
but were not imported; `getArtifactChangeImpact` called the paginated
`listProducts()` with no arguments and treated `{ items, total }` as an array;
and `DataProductDetailPage.tsx` read `.value` off a `ProviderResult`, whose
field is `data`.

**Lint.** `packages/nexora-industrial-vocab` had no `.eslintrc.js` at all —
created in `7-R1` without one, so the default parser choked on the first
`import` and the package holding all 62 vocabulary exports was silently
unlinted. It now has the same one-line config as every sibling. The rest were
two `useEffect` cleanups returning inconsistently, four nested ternaries (the
lineage node colours are now a `NodeRole` lookup table, the Marketplace trust
badge a `publisherLabel` function, the revalidation recommendation an
if/else chain), and one shadowed `components` that was a redundant second
query for a list already in scope.

**Failing suites.** Four asserted on strings in `docker-compose.yml` that
`f2d4ad5` removed when it replaced the file wholesale. Two of those were real
regressions, not stale tests, and were fixed in the compose file rather than
the test:

- **CC-001 was genuinely weakened.** The new compose mounted a named volume at
  `/app/.runtime` but called it `nexora_runtime` and dropped the explicit
  `CREATE_AUTHORIZATION_AUDIT_PATH` pin, breaking the convention that
  `docker-compose.production.yml` and `.validation.yml` both follow. The volume
  is renamed back to `create_authorization_audit` and the env var restored.
- **The "not the production image" warning was lost** — and the new file needs
  it more than the old one did, because it runs with `NODE_ENV=production`
  against `app-config.production.yaml` and so reads as production at a glance.
  Restored in the header comment.

The fifth failure was `colourTokens` catching a real violation: review item 7's
`SECRET` badge hard-coded `#b71c1c` and `#fff`. It now uses
`NEXORA_TONE.danger`.

**One assertion was deliberately relaxed rather than satisfied.**
`brandSeparation.test.ts` required `image: pharma-data-factory` in the compose
file, which now says `nexora:latest` while `build-image` still tags
`pharma-data-factory:mvp-1.0`. Both names are live; picking one is a product
decision, not a test fix. The assertion now accepts either and still rejects
`image: backstage`, which is the guarantee it actually exists to make. See
`## Next`.

### Test infrastructure notes (unchanged)

**The identityConstraints flake is closed (2026-09-17).** It was never a
missing constraint. better-sqlite3 is a native module, so its binding loads
once per jest _worker_ and the `SqliteError` it raises carries the `Error`
intrinsic of whichever module realm loaded it first; in a later file in the
same worker `error instanceof Error` is false, and jest renders a non-Error
rejection value as "Received function did not throw". The insert always
raised, and the message was always correct — the assertion was what broke.
Fixed by matching the message instead of the type, see
[`NXD-016`](DECISIONS.md), which also corrects [`NXD-011`](DECISIONS.md).

The direction of this risk was recorded backwards. It was a false **red**, not
a false green: a green `yarn test` was never able to hide a missing
constraint, so no identity guarantee went unverified while this was open.

`--runInBand` makes it deterministic rather than ~2-in-10 (one process, so the
realm crossing is guaranteed), and is now the repro for this class of bug.

Without the optional infrastructure the same 62 infrastructure-dependent tests
skip and the command still exits 0 — that is the intended developer-machine
behaviour under `NXD-005`. (The absolute pass count that used to stand here
was measured before P2-S4 added 81 tests and has been dropped rather than
adjusted by arithmetic; only the skip count was ever the point.) To run
everything locally:

```bash
docker compose -f docker-compose.test.yml up -d
python -m pip install pydantic 'jsonschema[format]' -e packages/data-product-sdk
yarn test
```

`yarn prettier:check` reports style drift in 883 files. It is **not** part of
the CI gate (`.github/workflows/ci.yml` runs guardrails, tsc, lint and tests
only) and was left untouched rather than mixed into a baseline commit.

### Baseline findings (all fixed in P0-S1)

Nine failing suites resolved to five root causes. Eight were stale tests that
contradicted deliberate, already-committed behaviour; one was a real defect.

1. **Stale Golden Path template contracts (5 suites).** Commits `e06e886` and
   `407eee4` added a `ursBaselineId` parameter and a `verify-urs` step to the
   five data-product templates; the contract tests were never updated.
   Re-expressed the assertions by step id rather than array index, and turned
   the parameter/step pair into an invariant: a template that asks for a URS
   baseline must verify it before `publish`.
2. **Stale Catalog Graph assertion (1 suite).** Commit `c0a2f5c` removed a
   relative-URL entity link because Backstage rejected the whole entity over
   it. The test still asserted the broken link. Replaced with a regression
   guard that every entity link is an absolute URL.
3. **Stale colour literal (1 suite).** `StatusChip.test.tsx` pinned the
   pre-contrast-fix teal `#0D9488`; the managed token is now `#0F766E`
   (darkened to clear WCAG AA). Rebound the test to `NEXORA_TONE`.
4. **Non-portable Python invocation (1 suite).** `compatibilityPolicyParity`
   hard-coded the `python` binary. Now resolves `$PYTHON`/`$PYTHON_BIN`/
   `python3`/`python` and verifies the interpreter has a working standard
   library. Missing interpreter fails in CI, skips locally with a reason.
5. **Jest resolver cache collision (1 suite) — real defect.** See
   [`NXD-004`](DECISIONS.md). `packages/app` shared a jest cache `id` with 11
   other frontend projects, so its `moduleNameMapper` was silently bypassed
   whenever another project instantiated the shared resolver first. The suite
   passed in isolation and failed in the full run.

## Known Risks

- ~~`identityConstraints.test.ts` still fails intermittently under full-run
  load with no identified mechanism.~~ **Root-caused and fixed 2026-09-17**,
  see [`NXD-016`](DECISIONS.md) and Test Status. The risk was also stated
  backwards: it was a false red, not a gate that could go green over a missing
  constraint.
- ~~Legacy Marketplace is a static, hard-coded TypeScript array
  (`plugins/marketplace/src/data.ts`), not a registry.~~ **Closed in P2-S5c
  (2026-09-19).** The array is deleted; the registry is the only source and a
  failure of it is now a visible error, not a silent substitution — see
  [`NXD-026`](DECISIONS.md).
- Composer/Core contains domain-specific Golden Path logic (OEE, Machine
  State) inside `packages/platform-common`. **Wider than recorded** — the
  status audit of 2026-09-17 added
  [`GP-8`](HARDCODED_DOMAIN_INVENTORY.md): `nexora-industrial.ts` is 589 lines
  and 62 exports of manufacturing vocabulary in Core, larger than GP-1..GP-7
  combined and missed by the P0-S3 sweep, which looked for Golden Paths and
  composition lists rather than for a domain vocabulary.
- URS/Validation lifecycle integration. **Four of the five findings from the
  2026-09-17 audit are closed; re-measured 2026-09-29.** The originals are
  struck through rather than deleted, because this block was the platform's
  largest stated risk and what happened to it is worth reading:

  - ~~`policy.ts:53-60` denies `validation.approve`, `risk.accept` and
    `baseline.modify` to every role including PLATFORM_ADMIN, and no route
    authorizes against them.~~ **Half closed.** `validation.approve` is granted
    to PLATFORM_ADMIN since `P5-S1` and is authorized by a real route
    (`validation-expert-backend/src/router.ts:431`). **`risk.accept` and
    `baseline.modify` are still denied to everyone**, PLATFORM_ADMIN included,
    and still have no route. That half of the finding stands.
  - ~~The actor requesting a transition becomes the approver, with no check
    that they differ from the creator — product release has no Segregation of
    Duties.~~ **Closed 2026-09-25 / `NXD-072`.** `transitionProductVersionStatus`
    refuses `APPROVED` when `actor === version.createdBy`, and
    `approveProductBaseline` refuses when `actor === baseline.createdBy`. Both
    answer 403, not 400: there is no correction to the request body that makes
    self-approval succeed.
  - ~~The release gate never consults validation; the only occurrence of
    "validation" in `composer-backend/src/service.ts` is a comment.~~
    **Closed.** The word appears 31 times, and the gate reaches validation
    through coverage: a requirement counts as verified by a passing test
    execution, a `VERIFIED_BY` link, **or an executed Validation Expert
    protocol test** — and a later failing run of the same test case revokes it.
    `INCOMPLETE_TRACEABILITY` is a blocker, so a version can no longer reach
    RELEASED with nothing verified.
  - ~~`ProtocolType` is `'IQ' | 'OQ' | 'UAT'`; there is no PQ.~~ **Closed.**
    `validation-expert-backend/src/types.ts:14` reads
    `'IQ' | 'OQ' | 'UAT' | 'PQ'`.

  What remains of this risk is one line: **`risk.accept` and `baseline.modify`
  are declared, unit-tested and unreachable.** That is a smaller and much more
  specific statement than the block it replaces.

- **`ProductBaseline` records most of what was built.** Re-measured 2026-09-29;
  the previous text said it recorded none of it. The snapshot carries the
  version with its `releaseCommitSha` and `artifactDigest` when present
  (`P5-S5` — absent rather than null, so "not yet built" is distinguishable
  from "explicitly unknown"), components, contracts, traceability links,
  declared data dependencies (`P4-S3`), and a SHA-256 checksum over the
  canonical JSON with the taker and the timestamp (`P-EXT-S1`).

  Still absent: **registry Artifact versions, configuration and policy
  versions.** So exact Artifact-version provenance still has no carrier, and
  revalidation scope can diff contracts and dependencies but not the artifacts
  a version was composed from. Connecting the registry to the baseline remains
  the fix.
- Formal Validation approval and SoD require consolidation.
- Data Exchange, Lineage and Analytics concepts are not yet unified.
- ~~**Socket test flake.**~~ **Closed 2026-09-17.** `fetch` refuses the Fetch
  standard's blocked ports (6000, 6697, 10080, …) before opening a socket,
  raising `TypeError: fetch failed` with cause `bad port`; this container's
  `ip_local_port_range` is `1024 65535` instead of the usual `32768 60999`, so
  `app.listen(0)` can hand one straight to a test server. The guard now lives
  once, in `@internal/backend-test-utils`, and every affected file uses it.

  The sweep corrected the count in both directions — see
  [`NXD-024`](DECISIONS.md). **Thirteen** files bind an ephemeral port, not
  twelve. But only **nine** could ever hit this: the blocklist is a `fetch`
  rule, and `http.request` does not consult it, so the three
  `urs-composer-backend` HTTP suites and
  `validation-expert-backend/validation-context-integration.test.ts` were
  never affected. Eight needed fixing, not eleven.

  It stopped being theoretical first: a full run during P2-S5b failed on
  `data-products-backend/src/router.test.ts` with an empty `Cause:`, passing in
  isolation and on re-run.

## Phase 0 audit — discovered reality

> **Historical snapshot, not current state.** This section records what the
> audit found at the start of the transformation and is deliberately left as
> written. Most of what it lists as missing now exists: the `Artifact` /
> `ArtifactVersion` and `Publisher` types landed in Phase 2, `ProductDependency`
> and `Subscription` in Phase 4 and `P-EXT-S4`, `DataContract` became
> first-class in `P4-S1`, and the hard-coded OEE and Machine State
> compositions were deleted across `P3-S1`–`P3-S5`. Read `## Completed` for the
> current picture.

### Domain ownership

`packages/platform-common/src/product.ts` is the single Product domain. It
already owns `Product`, `ProductVersion`, `ProductComponent`, `DataContract`,
`TraceabilityLink`, `ProductBaseline` and `ProductBaselineDelta`. No second
Product domain exists — the consolidation constraint currently holds.

Missing relative to the target model:

- No `Artifact` / `ArtifactVersion` type anywhere (Phase 2).
- No `Publisher` type anywhere (Phase 2).
- No `ProductDependency` / `Subscription` type (Phase 4).
- `DataContract` is **not** first-class: it hangs off `productComponentId` and
  has no owner, semantics, quality rules, SLA, classification, access policy,
  delivery mechanism or compatibility rules (Phase 4).

### Persistence

Only three backends own a database, all via the Backstage
`coreServices.database` service with their own `db/migrations.ts`:
`urs-composer-backend`, `composer-backend`, `validation-expert-backend`.
Everything else (`aas`, `data-products`, `entitlements`, `model-company`,
`plugin-directory`, `users`) persists to the filesystem or holds state in
memory. Phase 2's Artifact Registry needs real persistence and cannot follow
the filesystem pattern.

### Hard-coded domain in Core

`packages/platform-common/src/platform-component-library.ts` and
`composer.ts` hard-code OEE and Machine State compositions
(`OEE_DIRECT_COMPOSITION_REFS`, `MACHINE_STATE_COMPOSITION_REFS`,
`oeeBuiltWithSummary`, and an `'oee-data-product'` return type in the
composition resolver). This is the Phase 3 target: Golden Paths must become
dynamically resolvable Artifacts.

### Permissions

45 custom permissions across URS (5), Validation (8), Data Product (8),
Marketplace/Plugin Directory (4) and others, inventoried in
`packages/platform-common/src/permissions-inventory.md`. All ride the
Backstage permission framework — no second permission engine. The target
`artifact.*` / `publisher.manage` capability set does not exist yet (Phase 2).

### Composition layer

`packages/app` is 27k lines across 151 files. `guard:platform` reports it
within its configured composition limits, but it is far larger than a pure
wiring layer and should be watched as Phase 3/6 move UI into owned plugins.

## Migration Debt

- **No automated test posts to `POST /api/scaffolder/v2/tasks`.** Added
  2026-09-29 with [`NXD-080`](DECISIONS.md). The golden-path suites invoke
  actions directly with hand-built values, and `/compose` builds its own
  payload, so nothing exercises the route that validates a template's
  `required` list against the submitted values — the first thing a real user
  hits. That is how seven templates shipped unscaffoldable behind four green
  gates. `templateContract.test.ts` now checks the schema's internal
  consistency statically, which closes this particular hole but not the class:
  a template can still be wrong in a way only the live route reveals.
- **Three modules shipped with no test at all**, measured 2026-09-29: the
  edition resolver (`platform-common/src/editions.ts`, `NXD-078`), the
  installation identity (`artifact-registry-backend/src/installation.ts`,
  `NXD-078`) and the evidence-package aggregator (`composer-backend`'s
  `/versions/:id/evidence-package`, `NXD-077`). None of their exports was
  called by any test file, and none has a frontend consumer. Being worked off
  in order of damage on failure:
  - ~~edition resolver~~ **Resolved 2026-09-29** ([`NXD-081`](DECISIONS.md)) —
    34 cases, mutation-checked, and edition scoping walked live across two
    installations. No defect found.
  - ~~installation identity~~ **Resolved 2026-09-29**
    ([`NXD-082`](DECISIONS.md)) — 18 cases, mutation-checked, and the
    unconfigured installation walked live. No defect found.
  - ~~evidence-package aggregator~~ **Resolved 2026-09-29**
    ([`NXD-083`](DECISIONS.md)) — 15 cases, mutation-checked, walked live on
    PostgreSQL. **This one had a defect:** the route threw for every product
    version on any driver that does not return a `Date` for a timestamp
    column, which is every driver except `pg`. Harmless in production,
    fatal in the test stack — and that is why nothing had caught it. Its
    gating decision is **not** outstanding: `PHASE_CLOSURE_PLAN.md` §9.5
    required the product-side signature question to be answered before rank 2
    shipped, and [`NXD-077`](DECISIONS.md) answers it. §9.5 still reads as
    though the decision were pending, which is a §9.5 correction, not a
    decision.
- **The composer repository is inconsistent about date coercion.** Added
  2026-09-29 with [`NXD-083`](DECISIONS.md). Three row mappers convert with
  `new Date(...)`; the rest return the driver's value under a type that
  declares `Date`. `rowToAuditEvent` was one of the latter and it cost a
  route. The remaining mappers are unproven either way — nothing calls a
  `Date` method on their output yet, which is not the same as their being
  right.
- ~~The GxP invariant suites never run in CI.~~ **Resolved in P0-S2.** 62
  tests across six files (`urs-composer-backend`: `gxp-invariants`,
  `runtime-postgres-proof`, `wd-seed-persistence`, `p1a-verification`,
  `repository`; `validation-expert-backend`:
  `validation-context-integration`) skipped unless PostgreSQL answered on
  `TEST_DB_HOST:TEST_DB_PORT` (default `127.0.0.1:5435`), and
  `.github/workflows/ci.yml` defined no `services:` block. CI now provisions
  PostgreSQL and fails rather than skipping. The first real execution found a
  missing `await` in `validation-context-integration.test.ts`: the closing
  assertion of the URS → Validation integration proof was resolving a Promise
  against `toHaveLength` and had never actually run.
- `plugins/validation-expert-backend` imports another workspace's private
  source (`@internal/plugin-urs-composer-backend/src/__testUtils__/...`),
  flagged by `guard:platform` as a cross-plugin boundary warning.
- ~~Legacy Marketplace data must stay until the Marketplace reads the registry
  (P2-S5b)~~. **Resolved in P2-S5c.** The array and `registryParity.test.ts`
  are deleted; `artifactManifestFiles.test.ts` no longer carries a named
  twelve-id list either, since the directory it reads is now the only copy —
  see [`NXD-026`](DECISIONS.md).
- `packages/data-product-sdk` has no TypeScript sources; it is a Python
  package inside a Yarn workspace, which is why a missing interpreter could
  turn into a hard test failure.
- ~~`packages/nexora-industrial-vocab` has no ESLint config.~~ **Resolved
  2026-09-22**; it now carries the same `.eslintrc.js` as every sibling
  package.
- Four deployment guard tests in `packages/backend/src/` pin invariants by
  matching literal strings in `docker-compose.yml`. Replacing that file in
  `f2d4ad5` broke all four at once, and two of the four turned out to be real
  regressions hidden behind brittle assertions. String-matching a compose file
  is a poor way to state a deployment guarantee; parsing the YAML and asserting
  on the structure would survive a rewrite. Added 2026-09-22.
- ~~Two product names are live at once: `build-image` tags
  `pharma-data-factory:mvp-1.0`, `docker-compose.yml` tags `nexora:latest`.
  `brandSeparation.test.ts` accepts both until one is chosen. Added
  2026-09-22.~~ **Stale in its specifics, closed 2026-09-29**
  ([`NXD-086`](DECISIONS.md)). `NXD-043` picked `data-product-platform` and the
  test stopped accepting both — but it only read `build-image` and
  `docker-compose.yml`, so `pharma-data-factory:mvp-1.0` survived in
  `build-production-image.sh`, its PowerShell twin and
  `deploy/production.local.env.example`. All three now agree, and the guard
  reads them. `docker-compose.validation.yml` keeps `platform-core:1.0-rc2`
  deliberately: it builds what it runs, and the tag is named in an executed IQ
  re-test.

  **This is the third note in this file found describing a resolved state**,
  after the GP-8 inventory row and the four "missing" NXD records. The pattern
  is now worth naming: none was written carelessly, all three were simply never
  re-read after the thing they described moved.

## Blocked Decisions

**DEPENDENCY_CHANGE_REQUIRED — `supertest` (test-only).** Evidence gathered
2026-09-16 as the dependency gate requires; **not installed**, awaiting a
decision. Not blocking any phase.

> **Justification withdrawn 2026-09-17.** The "Reason" below — that the real
> TCP socket is the likeliest cause of the intermittent failure — was wrong.
> The cause was the Fetch blocked-port list ([`NXD-017`](DECISIONS.md)), fixed
> with a four-line rebind and no dependency. The evidence below stays on
> record because it is still accurate about the package, but `supertest`
> should now be approved on its own merits (in-process routers are faster and
> need no port at all) or dropped — not adopted as a flake fix.

- Package: `supertest@^7.2.2`, `@types/supertest@^7.2.1` — `devDependencies`
  only, in the backend plugin workspaces that currently bind sockets
- Existing alternative checked: the current pattern is `app.listen(0)` plus a
  real `fetch` in twelve files; there is no in-process HTTP test helper in the
  repository
- Backstage capability checked: `@backstage/backend-test-utils` provides
  service mocks and test databases, not in-process Express request driving
- Reason: the real TCP socket is the likeliest cause of the intermittent
  failure under Known Risks. In-process requests remove the socket and the
  port entirely
- Engine compatibility: `supertest` requires Node `>=14.18.0`; this repository
  is `22 || 24` — compatible
- Expected `yarn.lock` impact: `supertest`, `superagent@^10.3.0` and its tree
  (`component-emitter`, `cookiejar`, `debug`, `fast-safe-stringify`,
  `form-data`, `formidable`, `methods`, `mime`, `qs`) plus the two `@types`
  packages. Neither `supertest` nor `superagent` is in the lockfile today.
  `formidable` and `component-emitter` would be genuinely new; `methods`,
  `qs`, `mime`, `debug`, `fast-safe-stringify` and `cookie-signature` already
  have entries, so those would at most add a resolution
- Compatibility evidence: **no `@backstage/*`, React or Material UI package
  appears anywhere in that tree**, so the resolutions the guardrails protect
  are untouched. `supertest` works against any `http.Server`, so it needs no
  particular Express version; the repository is uniformly `express@^4.22.0`
- Residual risk: `formidable` (multipart parsing) is new transitive surface in
  a devDependency. It is not reachable from any production bundle

Until approved, the sockets stay. That is no longer a cost: the flake is
fixed at its actual cause rather than papered over with a retry.

**Resolved (2026-09-16) — pre-existing duplicate rows.** Decision: the
migration fails loudly and remediation is manual. Implemented in P1-S3, see
[`NXD-009`](DECISIONS.md).

## Last Commit

"fix(nxd-086): the name NXD-043 declared gone, and the guard that only read two
files", 2026-09-29, on `ms/composer-ai-spec-and-ci-quality-gate` — Welle 3
item 3.3. `pharma-data-factory:mvp-1.0` survived in the three production-path
files the old guard never read. See [`NXD-086`](DECISIONS.md).

**No hash here, deliberately.** A commit cannot record its own id, so writing
one means either a stale value or a second commit whose only job is to name the
first — which is then itself unnamed. This entry was wrong for three days for
exactly that reason: it said `beeab2a` while HEAD was `164039f`. `git log -1`
is authoritative; this section carries the subject and the date.

As of 2026-09-29 the branch is **159 commits ahead of `main` and 20 ahead of
its own remote** — this container has no `gh` CLI and no git credential
helper, so the governance consolidation series and everything MVP1-B has
landed since are local only. The working tree is clean.

For historical reference, Phase 0 landed as three commits: the transformation
memory, "fix(test): restore a green baseline and stop the jest resolver
collision" (P0-S1), "ci(test): run the GxP and persistence suites instead of
skipping them" (P0-S2) and the hard-coded domain inventory (P0-S3).
