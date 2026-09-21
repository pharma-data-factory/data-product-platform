# Pilot exit execution protocol

Owner: Platform Team  
Date: 2026-09-14  
Audience: INTERNAL ENGINEERING / PLATFORM ADMIN  
Status: **NOT EXECUTED**

A single interactive session that produces every piece of evidence the
[Pilot exit gate](pilot-exit-gate.md) still records as missing. Run it once,
end to end, with a stopwatch. Running it in fragments produces timings that
cannot be compared against the targets.

This protocol does **not** change any gate status. It tells you what to
capture; the decision stays with whoever re-opens the gate.

## What one run closes

| Marker | Closed by |
| --- | --- |
| `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` | Steps 3–6 |
| `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED` | Segments A–D |
| `OEE_GITHUB_LIVE_PROOF_NOT_RUN` | Step 9 |
| GitHub Actions result **UNKNOWN** | Precondition 2 plus step 7 |

Plant TLS / non-local MQTT is **not** part of this protocol. TLS is not
implemented in any MQTT client in this repository; it needs its own change
under change control.

## Preconditions

Do not start the stopwatch until all of these are true.

1. A controlled GitHub **test** organization. Not a production customer org.
2. The publishing GitHub App is installed on that org with
   Administration write, Contents write, Workflows write, Metadata read and
   — this is the one that was missing at the last attempt —
   **Actions: Read-only**. Without it the CI Quality Gate reads UNKNOWN even
   though Actions execute.
3. A `.env` with the variables `app-config.github.yaml` requires:
   `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   `GITHUB_PRIVATE_KEY`, optionally `GITHUB_WEBHOOK_SECRET`.
4. `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` for the user OAuth
   app. This is a **different** app from the publishing App — `Ov23…` for
   login, `Iv23…` for publishing.
5. The signing-in user is a Catalog User and a member of
   `data-product-developers`.
6. A browser with no existing Nexora session. Clear cookies; segment A is
   meaningless if you are already signed in.

Start with:

```
yarn start:github
```

Never run `yarn start:github` inside the production container — see the
warning in `app-config.github.yaml`.

## Timing segments

Four segments, taken from the gate. Record wall-clock start and stop for
each; do not reconstruct them afterwards.

| Segment | Clock starts | Clock stops |
| --- | --- | --- |
| **A** | First click on **Sign In** | Authenticated Developer Home is fully rendered |
| **B** | First click in Marketplace on the chosen Golden Path | Generated repository is visible on GitHub |
| **C** | Repository present locally | Generated Data Product answers `/health` with UP |
| **D** | Same click that started A | Same event that stopped C |

D is **not** A + B + C. It is one continuous authenticated session and is
the number the 20-minute target refers to.

| Target | Value |
| --- | --- |
| Authenticated environment | < 10 minutes (segment A) |
| First generated Data Product | < 20 minutes (segment D) |

## Run sequence

1. Start the Control Plane per the preconditions. Confirm the Sign In page
   offers GitHub and **no** "Continue as Guest".
2. **Start the stopwatch (A and D).**
3. Sign in through GitHub OAuth in the browser.
4. **Stop A** when Developer Home is rendered. Record it.
5. **Start B.** Go to Marketplace → MQTT Temperature (or OEE, see step 9) →
   Create into the test org. Use the Scaffolder UI. Do **not** fall back to
   the GitHub App API — that fallback is what made the previous attempt
   non-interactive and is precisely what this run must avoid.
6. **Stop B** when the repository exists on GitHub. Record the repository URL.
7. Open the generated Data Product in the Catalog and read the **CI Quality
   Gate** card. Record the run URL and the conclusion of all seven stages:

   | Stage | Conclusion |
   | --- | --- |
   | Lint | |
   | Unit Tests | |
   | Contract Tests | |
   | Data Quality | |
   | Compatibility | |
   | Docker Build | |
   | Security Scan | |

   If the card shows **DEGRADED / UNVERIFIED**, read the message underneath
   it. It names the cause — a missing Actions permission, no workflow, no run
   yet, or GitHub unreachable. A message naming *Actions: Read-only* means
   precondition 2 was not actually satisfied; fix it and repeat from step 1.
8. Clone the repository, build and start it. **Stop C and D** when `/health`
   reports UP. Record both.
9. **OEE live proof.** Repeat steps 5–8 for the OEE Data Product following
   [Controlled OEE GitHub integration test](developer/oee-github-integration-test.md),
   creating `pilot-oee-line-01`. Segments need not be re-timed; the evidence
   required here is the repository, the Actions conclusion and the Catalog
   registration.
10. Confirm Catalog registration for each generated product: `spec.type`
    is `data-product`, the contract API is present and uniquely named,
    `providesApi` relations resolve in Catalog Graph, TechDocs is reachable.
11. Mark every entity created by this run **PILOT / TEST**.

## Results

Fill this in during the run, not from memory.

| Item | Result |
| --- | --- |
| Date / operator | |
| Control Plane commit SHA | |
| Test organization | |
| Segment A | |
| Segment B | |
| Segment C | |
| Segment D | |
| MQTT repository URL | |
| MQTT Actions run URL + conclusion | |
| OEE repository URL | |
| OEE Actions run URL + conclusion | |
| Catalog registration verified | |
| TechDocs reachable | |
| Deviations | |

Record deviations plainly. A run with an honest deviation is evidence; a run
with a tidied-up record is not.

## After the run

Only after a successful run, and only by a human:

- Update [Pilot exit gate](pilot-exit-gate.md) with the measured segments and
  the Actions conclusions.
- Update [Developer journey evidence](developer/mvp-journey-evidence.md),
  replacing the preserved `NOT_RUN` / `NOT_MEASURED` facts with what was
  observed.
- Remove `pilot/oee/GITHUB_LIVE_PROOF_NOT_RUN` only when the OEE live proof
  actually passed.

If the run fails or is abandoned, change nothing. The existing markers are
correct until a run replaces them.

## Non-claims

- Product validation status stays **NOT_VALIDATED**. This protocol is not
  IQ, OQ, PQ or any part of CSV.
- Passing CI is a **technical** quality gate. It is not GxP validation and
  not a 21 CFR Part 11 or EU Annex 11 claim.
- Entities created here are **PILOT / TEST** fixtures, not certified
  products, and carry no commercial availability.
- A successful run closes Pilot Exit conditions only. It does not affect the
  CSV baseline freeze, which has its own criteria.
