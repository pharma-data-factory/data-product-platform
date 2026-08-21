# OEE Definition of Ready

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.1.0

This is a historical readiness gate. OEE Golden Path 1.0 is now
implemented in `templates/oee-data-product`. **Do not implement OEE**
domain logic in Platform Components. Do not change OEE formulas from
this page.

Domain and contracts:
[OEE Domain & Contract Design 1.0](../oee/index.md).
MVP boundary: [OEE MVP boundary](../oee/mvp-boundary.md).
Pilot gate: [Pilot hardening gate](../pilot-hardening-gate.md).
Baseline: [MVP 1.0](../mvp-1.0-baseline.md).

OEE Golden Path **design** may start only if every item is true:

- REST Source stable (CERTIFIED 1.0.0)
- MQTT Consumer stable (CERTIFIED 1.0.0)
- Time-Series Storage stable (CERTIFIED 1.0.0)
- REST API stable (CERTIFIED 1.0.0)
- Health stable (CERTIFIED 1.0.0)
- Observability stable (CERTIFIED 1.0.0)
- Machine Metrics composition proof passes
- Mode A composition `catalog/compositions/oee-data-product-direct.yaml` validates
- No blocking P0 security issue exists (hard-coded secrets, unbounded retry,
  or credentials in logs)
- Storage decision recorded: SQLITE_ACCEPTABLE_FOR_OEE_PILOT
- Ingestion decision recorded: Mode A (MQTT Consumer + REST Source)
- UNS decision recorded: UNS_OPTIONAL_FOR_OEE_PILOT
- AAS decision recorded: AAS_OPTIONAL_FOR_OEE_PILOT

Unified Namespace remains DEVELOPMENT and is **not** required.
AAS Foundation remains DEVELOPMENT and is **not** required.

## Result

READY_FOR_OEE

This result authorized Golden Path design. The Golden Path runtime now
lives in `templates/oee-data-product` (technically CERTIFIED / RELEASED;
commercial FUTURE). Kafka, RAG, AI, and Knowledge Graph remain out of
scope. CERTIFIED remains technical only, not GxP. Not AWS Marketplace.
