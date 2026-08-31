# Model Company Frontend Architecture

**Validation boundary:** `NOT_VALIDATED` · UI is `SYNTHETIC` / `NON-GXP` demonstration only.

## Goal

Present a **Factory Operations View** inside the existing Backstage app — not a second shell, not SCADA/HMI.

## Design system

Reuses the Nexora / Nexora tokens:

| Token | Value | Source |
| --- | --- | --- |
| Navy | `#0A1929` | `packages/app` theme + MC `NX` |
| Teal | `#00C2D9` | same |
| Surface | `#F4F6F8` | same |
| Display font | Space Grotesk | MC chrome |
| Mono | JetBrains Mono | status / IDs |

No second design system. Material-UI buttons/chips with platform colors.

## Configuration-driven UI

```text
Factory-as-Code YAML
        ↓
Model Company backend (loadFactoryModel)
        ↓
GET /api/model-company/factory|equipment|orders|batches|…
        ↓
useFactoryOperations + factoryModel helpers
        ↓
FactoryFlow / LineFlow / MaterialFlowView / …
```

React components **must not** hardcode Autoinjector IDs (`DP-L01`, `PKG-L01`, …). Topology comes from `sites[].areas[].lines[].equipment[]`.

## Primary navigation

| Route | Page |
| --- | --- |
| `/model-company` | Overview + value stream |
| `/model-company/factory` | Factory view |
| `/model-company/lines` | Line list / `?line=` operations |
| `/model-company/material-flow` | Material + genealogy |
| `/model-company/batches` | Batch cards |
| `/model-company/scenarios` | Scenario control |

Secondary tools: Equipment, UNS, Data Products, Events, Architecture.

## Public read-only demo

`/model-company` is reachable without signing in, so a prospect following
the landing-page CTA sees the value stream instead of a login wall. It is a
read-only surface:

| Aspect | Public visitor | Signed-in user |
| --- | --- | --- |
| Overview + value stream | Yes | Yes |
| Simulation Start / Stop / Reset | No | Subject to RBAC |
| Scenario control | No | Subject to RBAC |
| Sub-routes (`/factory`, `/lines`, …) | Sign-in prompt | Yes |

The public page reads a single aggregated endpoint,
`GET /api/model-company/public/demo`, which is the only Model Company route
besides `/health` registered as `allow: 'unauthenticated'`. It returns the
same synthetic factory snapshot the authenticated read routes serve, minus
`connectivity.detail` — that block carries internal runtime and health-probe
URLs and must not leave the Control Plane.

Every mutating route (`/simulation/*`, `/scenarios/run`) still requires user
credentials plus a permission decision. Hiding controls in the frontend is
presentation only; the router is the enforcement point.

## Live updates

Polling via `useFactoryOperations` (~4–6s). No new WebSocket dependency.

## Data Products

Model Company shows **operational context** only. Analytics (OEE, etc.) open via `DataProductLink` into `/data-products/:name?...`. OEE is never calculated in the frontend.

## Genericity

`src/__fixtures__/factories.ts` provides a minimal 1-area / 1-line / 2-equipment factory. The same `FactoryFlow` / `LineFlow` components render it and Autoinjector-shaped fixtures without code changes.
