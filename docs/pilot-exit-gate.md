# Pilot exit gate — production boot and Golden Path publish

Owner: Platform Team  
Date: 2026-08-21  
Audience: INTERNAL ENGINEERING / PLATFORM ADMIN  
Status: **PILOT_EXIT_FAIL**

This gate is **not** the Technical MVP baseline.

Technical MVP is **COMPLETE**. See [MVP 1.0 baseline](mvp-1.0-baseline.md).
OEE Golden Path 1.0 is technically **CERTIFIED / RELEASED**. Commercial
availability remains **FUTURE**. Legal status remains
**READY FOR LEGAL REVIEW**. Counsel gates stay OPEN.

Do **not** read this page as current OEE product status. The historical
`OEE_NO_GO` label applied to an earlier production-boot gate before the
OEE Golden Path existed. It is retired as a product status.

| Decision | Value |
| --- | --- |
| Technical MVP | **TECHNICAL_MVP_COMPLETE** |
| Pilot exit | **PILOT_EXIT_FAIL** |
| OEE technical status | **CERTIFIED / RELEASED** |
| OEE commercial status | **FUTURE** |
| OEE GitHub live proof | **OEE_GITHUB_LIVE_PROOF_NOT_RUN** |
| Legal | **READY FOR LEGAL REVIEW** (not LEGAL APPROVED) |

Local plant-pilot integration proof:
[OEE Pilot Integration](oee/pilot-integration.md).
Developer journey facts:
[Developer journey evidence](developer/mvp-journey-evidence.md).

## What passed (historical production-boot record)

- Production image `pharma-data-factory:pilot-exit` built from
  `packages/backend/Dockerfile` (`NODE_ENV=production`).
- Image boots with `app-config.yaml` + `app-config.production.yaml`.
- Guest sign-in is rejected (`POST /api/auth/guest/refresh` → 403). Sign In
  HTML has GitHub and no “Continue as Guest”.
- Production Catalog does not load `catalog/samples/`. Sample and
  `github.com/example` entities are absent.
- MQTT Temperature, REST Equipment, and OEE templates are present.
  Templates are technically CERTIFIED / RELEASED 1.0.0.
- Wave 1 components ingest after Catalog `links.url` values are absolute
  URLs. Machine Metrics is **REFERENCE** / TESTED. UNS remains DEVELOPMENT.
- GitHub user OAuth (`AUTH_GITHUB_*`, `Ov23`) is separate from the
  publishing App (`GITHUB_APP_*`, `Iv23`). App is installed on
  `pharma-data-factory` with Administration write, Contents write,
  Workflows write, Metadata read.
- Private GitHub repository
  `https://github.com/pharma-data-factory/pilot-mqtt-temperature`
  was created and pushed. Marked **PILOT / TEST**. Not certified.
- Generated image `pilot-mqtt-temperature:pilot-exit` builds and serves
  `/health` (UP), `/api/v1/quality` (PASS), `/api/v1/platform-metadata`,
  and temperature write/readback.
- Generated runtime stayed up after the Control Plane container exited.
- Catalog registration of the fixture: `spec.type=data-product`, unique
  contract API `pilot-mqtt-temperature--temperature-event`, TechDocs ref
  `dir:.`, `providesApi` graph relations present.

## What failed or was not executed (Pilot Exit conditions)

| Item | Result | Why |
| --- | --- | --- |
| Interactive GitHub OAuth → approved Developer Home | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` | Browser OAuth cannot be completed in this gate |
| Backstage Create / Scaffolder task | `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED` | Production has no Guest; unauthenticated `POST /api/scaffolder/v2/tasks` → 401. MQTT publish used the GitHub App API as the documented fallback |
| OEE live GitHub publish | `OEE_GITHUB_LIVE_PROOF_NOT_RUN` | Controlled org procedure not executed |
| Authenticated journey timings | `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED` | Do not infer &lt;10 / &lt;20 minute targets |
| GitHub Actions result | **UNKNOWN** | App permission **Actions Read-only is missing** (`Resource not accessible by integration`). CI may still run; Quality Gate cannot be read |
| TechDocs HTML search index | 0 documents | TechDocs backend initialized; generated docs exist in the repo; Control Plane did not build static TechDocs for the fixture |

## Measured times

Do not treat these as the interactive Marketplace Create journey.

| Segment | Result |
| --- | --- |
| A. Sign In → authenticated Developer Home | NOT_MEASURED (OAuth not completed). Production Sign In page served after Control Plane listen |
| B. Marketplace UI → generated repository | NOT_MEASURED via UI. GitHub App create + push of rendered MQTT template: about 40 seconds |
| C. Repository on disk → local Data Product `/health` | **MEASURED** 64.8 s image build + 0.9 s to UP ≈ **66 seconds** |
| D. Sign In → working generated Data Product | NOT_MEASURED as a single authenticated session |
| Targets | &lt;10 minutes authenticated environment; &lt;20 minutes first generated Data Product |

Top friction:

1. Interactive GitHub OAuth is required in production (Guest forbidden).
2. GitHub App cannot read Actions, so CI Quality Gate stays UNKNOWN.
3. Production Catalog rejected relative `links.url` values until they were
   made absolute (`http://localhost:7007/...`, matching the technical-pilot
   `app.baseUrl`).

## Cleanup

| Artifact | Action |
| --- | --- |
| `pharma-data-factory/pilot-mqtt-temperature` | **Retain** as a PILOT / TEST integration fixture. Delete when the org no longer needs it. Not a certified product |
| Local containers `pdf-pilot-cp`, `pdf-pilot-mqtt`, `pdf-pilot-pg` | Ephemeral. Stop after inspection. Do not add the fixture Location to committed `app-config.production.yaml` |

## Next action (Pilot Exit only)

1. Grant the GitHub App **Actions: Read-only**.
2. Complete one interactive Create: GitHub OAuth as an approved Catalog
   Developer → Marketplace → MQTT Temperature or OEE → Scaffolder publish.
3. Read the workflow conclusion (Lint, Unit, Contract, Data Quality,
   Compatibility, Security Scan, Docker Build).
4. Execute [OEE GitHub integration test](developer/oee-github-integration-test.md).
5. Re-open this gate. Do not treat Pilot Exit FAIL as Technical MVP incomplete.
