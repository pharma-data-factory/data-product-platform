# OEE Golden Path — Definition of Done

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0  
Status: CERTIFIED (technical platform status only, not GxP)

This checklist applies to the OEE Golden Path 1.0 implementation in
`templates/oee-data-product`.

- [x] Domain formulas tested (A, P, Q, OEE guards)
- [x] Deterministic reference scenarios A–E plus edge scenarios pass
- [x] Four input contracts + `oee-result` versioned 1.0.0
- [x] Quality rules implemented (MANDATORY / WARNING / INFORMATIONAL)
- [x] `calculationStatus` published; `oee: 0` ≠ cannot calculate
- [x] Composition `oee-data-product-direct.yaml` validates
- [x] No duplicated Wave 1 plumbing (MQTT, REST, SQLite, health)
- [x] Runtime independent from Backstage
- [x] SQLite pilot proof via TimeSeriesStore
- [x] Docker build
- [x] CI quality gate (lint, unit, contract, quality, compatibility, Docker, pip-audit)
- [x] Catalog topology (`dependsOn`, consumes/provides APIs)
- [x] TechDocs per Golden Path documentation standard
- [x] REST API as designed
- [x] Compatibility tests against existing policy
- [x] Generated template dry-run
- [x] Local reference event simulation
- [x] No GxP / AVAILABLE / AWS Marketplace claims
- [x] MQTT Temperature and REST Equipment unchanged

CERTIFIED means Nexora technical conformance only. It does
not mean GxP validated, regulatory approved, or production validated.
