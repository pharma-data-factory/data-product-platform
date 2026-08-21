# Pilot readiness

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING / PLATFORM ADMIN  
Version: MVP 1.1

Internal status for a controlled pilot. Status values are explicit. They
are not calculated percentages.

Authoritative gates: [Pilot hardening gate](pilot-hardening-gate.md) and
[Pilot exit gate](pilot-exit-gate.md).

**PILOT_READY_WITH_CONDITIONS.** Technical MVP is **COMPLETE**. Production
boot / live Create: **PILOT_EXIT_FAIL**. OEE Golden Path is technically
CERTIFIED / RELEASED; commercial availability is FUTURE. The local OEE
integration proof is in [pilot-integration.md](oee/pilot-integration.md).
It is not GxP and not a live GitHub publish (`OEE_GITHUB_LIVE_PROOF_NOT_RUN`).

CERTIFIED means technical conformance to the Pharma Data Factory standard.

| Area | Status | Condition |
| --- | --- | --- |
| Authentication | READY WITH CONDITION | Local Guest allowed. Docker / staging / production require GitHub OAuth and Catalog User |
| RBAC | READY | Viewer / Developer / Owner / Admin unchanged |
| Catalog | READY WITH CONDITION | Production Catalog does not load `catalog/samples/`. Machine Metrics is REFERENCE |
| Golden Paths | READY | Official paths: MQTT Temperature, REST Equipment, OEE (technical CERTIFIED; OEE commercial FUTURE) |
| CI | READY WITH CONDITION | Quality gate plus Python dependency CVE scan. Not GxP |
| Platform Components | READY | Wave 1 CERTIFIED 1.0.0 frozen. See [Wave 1 baseline](platform-components/wave-1-baseline.md) |
| Docker | READY WITH CONDITION | Production image is `packages/backend/Dockerfile`. Local Compose image is not the production image |
| Legal | READY FOR LEGAL REVIEW | Counsel gates remain OPEN. Not commercially distributable |
| AAS | NOT REQUIRED FOR OEE PILOT | DEVELOPMENT. UI labelled PROTOTYPE |
| UNS | NOT REQUIRED FOR OEE PILOT | DEVELOPMENT. Canonical source `uns/` |
| Security Gate | READY WITH CONDITION | `pip-audit` on Golden Path CI. No container scan. Not GxP |
| Marketplace | READY WITH CONDITION | Curated presentation over Catalog + release metadata |
| Public claims | READY | No GxP / SaaS / AWS Marketplace availability claims |
| Developer journey | READY WITH CONDITION | Path exists. `INTERACTIVE_OAUTH_CREATE_NOT_EXECUTED`. `DEVELOPER_JOURNEY_TIMING_NOT_MEASURED`. Generated MQTT runtime boot MEASURED ≈ 66 s |
| Operations | READY WITH CONDITION | [Pilot runbook](operations/pilot-runbook.md) |

Do not declare PILOT READY from this page alone. Technical freeze:
[MVP 1.0 baseline](mvp-1.0-baseline.md). The engineering hardening
checklist is [Pilot hardening gate](pilot-hardening-gate.md). The
production-image and live Create proof is [Pilot exit gate](pilot-exit-gate.md).
