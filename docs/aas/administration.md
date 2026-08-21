# Asset & Sensor Administration

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: PLATFORM_USER  
Version: 1.0.0

Authenticated UI: `/assets` (Assets & Sensors).

Normal administration uses forms. Raw JSON is not required.

- Asset Explorer — site / area / line are **configurable context**, not a
  hardcoded AAS metamodel
- Asset Detail — identity, context, submodels, properties, connectivity,
  relationships, Data Product usage, revision
- Sensor / Property Detail — semantic meaning, unit, limits, protocol,
  topic/endpoint, contract
- Add Sensor / Property — metadata only; no GitHub repository is created

Writes require `aas.manage` (Data Product Owner and Platform Admin).
Reads require `aas.read` (Viewer and above). Button hiding is not
authorization; the backend enforces permissions.
