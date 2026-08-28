# Factory Visualization

Owner: Platform Team  
Audience: INTERNAL ENGINEERING  
Status: `VISUAL_VALUE_STREAM_READY` (UI) · Model Company validation remains `NOT_VALIDATED`

## Purpose

The Model Company Overview (`/model-company`) renders a **pharma manufacturing value stream**:

- where material comes from
- which machines process it
- which batches are active
- where packaging / device components enter
- where problems exist
- where finished goods go

This is a **live factory model** driven by Factory-as-Code + runtime APIs — not a static factory illustration.

Classifications remain:

- `SYNTHETIC`
- `NON-GXP`
- `NOT_VALIDATED`

## Core principle

```text
STATIC
Machine SVG / Equipment Icon  (equipmentIconRegistry)

+

DYNAMIC
Factory topology, position/order, equipment state,
material flow/supply, batch, order, HU, quantities,
warehouse, quality status, scenario, alerts, Data Product status
```

The reference image is a **visual design reference only**. Do not use a full factory illustration as a background. The only static visual assets allowed are reusable machine/equipment SVG icons.

## Architecture

```text
             Factory-as-Code
                    │
                    ▼
             Factory Topology
                    │
                    │
Model Runtime ──────┼────── Genealogy
                    │
                    ▼
           FactoryValueStream (view model)
                    │
                    ▼
          Dynamic Value Stream
                    │
              ┌─────┴─────┐
              ▼           ▼
         Machine SVG    Status/Data
```

Runtime path:

```text
Model Company API (/factory, /equipment, /orders, /batches, /warehouse)
        ↓
normalizeFactory() + runtimeById  (polling)
        ↓
buildFactoryValueStream()
        ↓
ValueStreamCanvas + OverviewOpsPanel
```

Normalized frontend graph types live in `visualGraph.ts` / `factoryValueStream.ts`:

- `FactoryValueStream` — stages, equipment, materials, flows, batches, HUs, alerts, KPIs
- `FactoryVisualNode` — equipment | material | batch | hu | warehouse
- `FactoryVisualEdge` — `product` | `material` | `information`
- `ValueStreamLane` — one Factory area as a swimlane

## Static vs Dynamic Verification

| Element                | Source            | Static/Dynamic |
| ---------------------- | ----------------- | -------------- |
| Machine illustration   | SVG icon registry | STATIC         |
| Machine identity       | Factory-as-Code   | DYNAMIC        |
| Machine position/order | Factory topology  | DYNAMIC        |
| Machine status         | Runtime           | DYNAMIC        |
| Material               | Runtime/config    | DYNAMIC        |
| Material path          | relationships     | DYNAMIC        |
| Batch                  | Runtime           | DYNAMIC        |
| HU                     | Runtime           | DYNAMIC        |
| Quantity               | Runtime           | DYNAMIC        |
| Alert                  | Runtime           | DYNAMIC        |
| OEE                    | OEE Data Product  | DYNAMIC        |

Any hardcoded operational value in React components is a defect. Fixture values in unit tests are mock runtime inputs only.

## Node types

| Kind | Source | Visual |
| --- | --- | --- |
| equipment | `FactoryEquipment` + runtime | `EquipmentCard` + type icon |
| material (supply) | inferred from `equipment.type` when present | dashed `MaterialSupplyChip` |
| batch / hu | orders, batches, warehouse APIs | KPI strip + journey panel |

## Flow types

| Flow | Visual treatment | Meaning |
| --- | --- | --- |
| product | solid arrow `→` | Main product path inside a lane |
| material | dashed / secondary arrow `⇢` | Device parts, labels, cartons, leaflets |
| information | (reserved) | Future UNS / order signals |

Interruptions (`BREAKDOWN`, `MATERIAL_STARVED`, `QUALITY_HOLD`, `BLOCKED`) dim/strike the product arrow and emphasize the equipment card.

## Icon mapping

Icons are selected **only** from `equipment.type` via:

```text
equipment.type → resolveEquipmentIconKind → equipmentIconRegistry → SVG
```

Never branch on `equipment.id`.

Examples:

| type contains | icon |
| --- | --- |
| compound / holding-tank | compounding |
| fill | filling |
| feed | feeder |
| assembl / spring | assembly |
| test / inspect | test (FunctionalTester) |
| label | labeler |
| carton / leaflet | cartoner |
| checkweigh / weigher | checkweigher |
| serial | serialization |
| case-pack | case-packer |
| pallet | palletizer |
| warehouse / receiv | warehouse |

## Material-flow mapping

Supply chips appear when matching equipment **types** exist in the lane (generic engine — same code for Autoinjector, blister, or minimal fixtures):

- Drug Product Materials → compounder / filler / holding
- Device Parts / Springs / Caps / Primary Containers → feeder / assembler
- Labels → labeler
- Cartons / Leaflets → cartoner / leaflet equipment

Statuses `STAGED` vs `MATERIAL_STARVED` come from runtime on the consuming equipment. Inventory quantities are never fabricated.

## Runtime status

`StatusBadge` shows textual state (icon + label). Color is never the only signal.

Problem highlighting:

- `MICROSTOP` → warning treatment + optional pulse (disabled under `prefers-reduced-motion`)
- `MATERIAL_STARVED` / `BREAKDOWN` / `QUALITY_HOLD` → interrupted flow + danger border

Scenario changes (e.g. SCN-AI-007) must arrive via backend/runtime state. The frontend must not locally force MICROSTOP.

## Scenario + batch journey

Right-side `OverviewOpsPanel`:

- current scenario id / running flag (from overview API)
- active batch journey from `/batches` (role-ordered)
- active alerts from equipment runtime only
- Data Product links (OEE shown only when a factory data product golden path mentions OEE; otherwise `OEE DATA NOT CONNECTED`)

## Genericity

The same renderer works for:

- `autoinjector-pharma.yaml`
- `minimalFactoryFixture`

because lanes are `FactoryArea[]` order and cards are `equipment.type`-driven. No Autoinjector-specific React branches.

## Accessibility

- keyboard-focusable equipment / supply buttons with aria-labels including status
- textual status via `StatusBadge`
- lane / canvas aria-labels
- `prefers-reduced-motion` disables pulse / flow animation

## Extension model

1. Add equipment types in Factory-as-Code YAML
2. Optionally extend `resolveEquipmentIconKind` regex map
3. Optionally extend `inferMaterialSupplies` type hints
4. Do **not** add React branches on specific equipment IDs

## Related components

| File | Role |
| --- | --- |
| `factoryValueStream.ts` | Normalized view model |
| `equipmentIconRegistry.ts` | STATIC type → SVG map |
| `ValueStreamCanvas.tsx` | Swimlane renderer |
| `EquipmentCard.tsx` | Machine + supply chips + arrows |
| `OverviewOpsPanel.tsx` | Scenario / journey / alerts / DP |
| `visualGraph.ts` | Graph builder |
| `equipmentIcons.tsx` | Lightweight SVG set |
| `FactoryFlow.tsx` | Legacy area-level stream (still used on Factory view) |
| `staticVsDynamic.test.tsx` | Static vs Dynamic acceptance tests |
