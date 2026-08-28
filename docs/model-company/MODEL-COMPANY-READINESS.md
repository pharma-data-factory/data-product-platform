# Model Company — Readiness Assessment

**Assessment date:** 2026-08-23  
**Scope:** Embed Nexora Model Pharma as Customer Zero inside the existing Backstage Control Plane  
**Product validation status (unchanged):** `NOT_VALIDATED`

---

## Classification

**`READY_WITH_CONDITIONS`**

---

## Platform strengths (ready to reuse)

| Area | Evidence | Reuse path |
| --- | --- | --- |
| Backstage 1.53 frontend | New frontend system (`createApp` + blueprints) | FE plugin via `PageBlueprint` |
| Backend plugins | `validation-expert-backend`, `nexora-backend` patterns | Same `createBackendPlugin` + Express router |
| Permissions | `platform-common` + `PlatformPermissionPolicy` | Add `modelCompany.*` permissions |
| Catalog | File locations + SAMPLE/industrial fixtures | Dedicated `model-company` tagged entities |
| Golden Paths | MQTT Temperature, REST Equipment, OEE | Configure topics / SOURCE_API_URL |
| Landing | `PublicLanding.tsx` section composition | Insert Model Company section |
| Runtime isolation | Pilot OEE + Mosquitto compose | Separate `model-company/runtime` compose |
| Persistence convention | File/SQLite plugin stores | Isolated `.runtime/model-company/` |

---

## Conditions (non-blocking for v0.1)

1. **Golden Path topic defaults ≠ Model Company topic namespace**  
   Customer must set `mqttTopic` / OEE topics to `model-company/...` (or remap). Documented as Customer Zero finding — do not hardcode GP shortcuts.

2. **No automatic scaffold→deploy of Golden Path products into Model Company compose**  
   Platform does not yet auto-provision customer Data Products against a simulation. Model Company documents integration; live DP containers remain optional / pilot-style wiring.

3. **MQTT broker is not part of Control Plane compose**  
   Model Company runtime brings its own Mosquitto (same pattern as `pilot/oee`).

4. **Full E2E (scenario → MQTT → running OEE DP → availability loss) requires Docker runtime**  
   Contract/schema compatibility is tested in-repo; live DP loop marked `CUSTOMER_COMPONENT_GAP` until compose + configured GP instances are running.

5. **Working tree already contains WIP plugins** (Validation Expert, Plugin Directory)  
   Model Company follows the same plugin wiring pattern; does not depend on those features.

---

## Blockers

**None for Model Company v0.1 MVP.**

No second Backstage instance is required. No fork of Backstage internals is required.

---

## Explicit non-goals for readiness

- Do not change Platform Core validation baseline or `NOT_VALIDATED`
- Do not claim GxP / qualified evidence from synthetic scenarios
- Do not duplicate OEE / Temperature / Equipment Data Product logic inside Model Company

---

## Go / no-go

| Decision | Result |
| --- | --- |
| Proceed with implementation | **YES** |
| Classification | **`READY_WITH_CONDITIONS`** |
| Stop for blockers | **NO** |
