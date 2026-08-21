# Pilot hardening gate (before OEE)

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PLATFORM ADMIN  
Version: 1.0.0

Audit + hardening + tests + documentation. This gate did not implement
OEE. The later OEE Golden Path 1.0 is technically CERTIFIED; see
[capability matrix](capability-matrix.md).

## Executive verdict

The Control Plane, official Golden Paths, and Wave 1 CERTIFIED components
are sufficient for a **controlled technical pilot** if the conditions
below are accepted. They are not sufficient for commercial distribution,
GxP validation, or AWS Marketplace production.

| Decision | Value |
| --- | --- |
| Pilot | **PILOT_READY_WITH_CONDITIONS** |
| OEE | **OEE_GO** (Golden Path **design** only) |
| Storage | **SQLITE_ACCEPTABLE_FOR_OEE_PILOT** |
| UNS | **UNS_OPTIONAL_FOR_OEE_PILOT** |
| AAS | **AAS_OPTIONAL_FOR_OEE_PILOT** |
| Legal / OSS | **READY_FOR_LEGAL_REVIEW** (counsel gates **OPEN**) |

Next action: start OEE Golden Path **design** against Mode A
(`catalog/compositions/oee-data-product-direct.yaml`). Do not scaffold
the Golden Path until the remaining conditions are scheduled.

## Docker evidence (this gate)

| Image | Result |
| --- | --- |
| `machine-metrics-reference:pilot` | Built from `platform-components/` (Python 3.12-slim) |
| `mqtt-temperature-product:pilot` | Built after scaffolding placeholders (`values.name`) |
| `rest-equipment-product:pilot` | Built after scaffolding placeholders (`values.name`) |
| Control Plane production (`packages/backend/Dockerfile`) | Not rebuilt in this gate; `NODE_ENV=production` is in the Dockerfile |
| Root Compose image | Development only |

Raw template Dockerfiles cannot be built until Create substitutes `project.name`. That is expected.

## Conditions (must remain explicit)

1. Pilot Control Plane uses `packages/backend/Dockerfile` (`NODE_ENV=production`). Root Compose is local development.
2. Commercial profile stays `LocalEntitlementProvider` until AWS Marketplace is deliberately configured. AWS mode is fail-closed.
3. Replace localhost URLs and default Postgres password on any shared host.
4. Guest remains development-only. Unknown GitHub users must not become Viewer.
5. Machine Metrics is REFERENCE, not an operational Data Product.
6. Anonymous Mosquitto is local development only. External MQTT needs credentials and TLS.
7. Developer journey timings are **NOT_MEASURED**.
8. Template Edition is not commercially distributable while legal gates are OPEN.
9. GitHub App Actions Read-only missing → CI status `UNKNOWN` (environment blocker).
10. Observability is process-local logs/metrics/health. No central backend or alerting.

## P0 findings

None demonstrated in this gate after hardening.

## P1 findings

| ID | Finding | Treatment |
| --- | --- | --- |
| P1-1 | Root Docker Compose is a development image | Documented; use production Dockerfile for pilot |
| P1-2 | `app-config.production.yaml` keeps local entitlements and localhost URLs | Intentional technical-pilot profile; must not be used as AWS production |
| P1-3 | Machine Metrics loaded as a Data Product in production Catalog | Labeled `REFERENCE` |
| P1-4 | `.env.*` not fully gitignored | `.env.*` ignored except `.env.example` |
| P1-5 | Merged Guest provider could remain from `app-config.yaml` | Frontend hides Guest when `auth.environment=production`; overlays mark that key frontend-visible |
| P1-6 | Legal LICENSE/NOTICE/THIRD_PARTY_NOTICES absent | Counsel gates OPEN; not commercially distributable |
| P1-7 | No secret scan / container scan in platform CI | Golden Path CI has `pip-audit` only |
| P1-8 | Developer journey not timed | NOT_MEASURED |

## Architecture

Verified:

```text
CONTROL PLANE (Backstage)
  Catalog, Marketplace, Create, Developer Hub, TechDocs, Search,
  Identity, RBAC, Entitlements
        ↓
DATA PRODUCT FOUNDATION
  Standard, SDK, Contracts, Quality, Compatibility, CI/CD, Versioning
        ↓
PLATFORM COMPONENTS (building blocks, not Data Products)
        ↓
COMPOSITION (GoldenPathComposition YAML, not a Catalog kind)
        ↓
DOMAIN GOLDEN PATHS
  MQTT Temperature, REST Equipment, OEE (CERTIFIED / RELEASED)
        ↓
GENERATED DATA PRODUCTS (run independently of Backstage)
```

Catalog remains the technical source of truth.

## Readiness matrix

| Capability | Status | Evidence | Pilot blocker? | Owner/action |
| --- | --- | --- | --- | --- |
| Identity | READY_WITH_CONDITION | GitHub OAuth; Catalog User required in production | No, if OAuth configured | Platform Admin |
| RBAC | READY | Viewer / Developer / Owner / Admin; Permission Framework | No | Platform Team |
| Entitlements | READY_WITH_CONDITION | Local for technical pilot; AWS fail-closed | No unless AWS mode mis-set | Platform Team |
| Catalog | READY_WITH_CONDITION | Samples excluded; REFERENCE labeled | No | Platform Team |
| Marketplace | READY | Technical discovery; not AWS Marketplace | No | Platform Team |
| Developer Hub | READY | TechDocs + Search | No | Platform Team |
| Golden Paths | READY | MQTT Temperature, REST Equipment | No | Platform Team |
| Platform Components | READY | Wave 1 CERTIFIED 1.0.0 | No | Platform Team |
| Machine Metrics | READY_WITH_CONDITION | TESTED composition proof, REFERENCE | No | Platform Team |
| UNS | NOT_REQUIRED | DEVELOPMENT; optional for OEE | No | Platform Team |
| AAS | NOT_REQUIRED | DEVELOPMENT prototype; optional for OEE | No | Platform Team |
| Docker | READY_WITH_CONDITION | Production Dockerfile exists; Compose is dev | Accept condition | Platform Admin |
| Secrets | READY_WITH_CONDITION | `.env` ignored; no values printed | No | Platform Admin |
| MQTT security | READY_WITH_CONDITION | TLS/cred seam; anonymous broker is local-only | External MQTT needs creds/TLS | Platform + OT |
| Storage | READY_WITH_CONDITION | SQLite acceptable for OEE pilot | Multi-instance later | Platform Team |
| Observability | READY_WITH_CONDITION | Logs, health, in-process metrics, redaction | No central backend | Platform Admin |
| CI | READY_WITH_CONDITION | lint/unit/contract/quality/compat/Docker + pip-audit | Actions Read-only env | Platform Admin |
| Legal | READY_FOR_LEGAL_REVIEW | `LEGAL-READINESS-PHASE-0.md` gates OPEN | Commercial distribution yes | Counsel |
| OSS attribution | OPEN | No LICENSE/NOTICE yet | Commercial distribution yes | Counsel |
| Documentation | READY | Hub + this gate | No | Platform Team |
| Operations | READY_WITH_CONDITION | [Pilot runbook](operations/pilot-runbook.md) | No | Platform Admin |
| Developer journey | READY_WITH_CONDITION | Path exists; timing NOT_MEASURED | No | Platform Team |

## OEE

Approved to enter Golden Path **design**. Required building blocks are
the six Wave 1 CERTIFIED components. Mode A manifest validates.
Do not start implementation from this page.
