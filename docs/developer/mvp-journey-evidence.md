# Developer journey evidence (MVP 1.0)

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

These facts are **not** Technical MVP blockers. They belong to the
[Pilot exit gate](../pilot-exit-gate.md). Do not turn them into PASS.

## Preserved facts

| Fact | Status |
| --- | --- |
| `OEE_GITHUB_LIVE_PROOF_NOT_RUN` | True. Marker: `pilot/oee/GITHUB_LIVE_PROOF_NOT_RUN`. Procedure: [OEE GitHub integration test](oee-github-integration-test.md). |
| `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` | True. Production Sign In requires GitHub OAuth. Browser OAuth → Marketplace → Scaffolder Create was not completed in the exit gate. MQTT Temperature was published with the GitHub App API as a documented fallback. |
| `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED` | True for the authenticated session. Targets (&lt;10 minutes authenticated environment, &lt;20 minutes first generated product) were **not** measured as one interactive journey. |

## What was measured

MQTT Temperature generated image boot after the repository was already
on disk: about **66 seconds** to `/health` UP (image build plus startup).
That is not the Marketplace Create journey.

## What is proven automatically in-repo

Template layout, contracts, tests, CI workflow files, Dockerfiles,
Catalog YAML, TechDocs, composition validation, Wave 1 unit tests,
OEE domain tests, and the local OEE generate/compose harness.

## What is mocked or local-only

- Guest identity (development)
- Anonymous Mosquitto (`PILOT-LOCAL`)
- Local entitlement grants
- Sample Catalog entities (`catalog/samples/`, not production)

Do not infer timings. Do not claim a live OEE GitHub Actions pass.
