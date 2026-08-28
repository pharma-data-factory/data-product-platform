# Autoinjector Model Company — Architecture

**Product validation:** `NOT_VALIDATED` (unchanged)  
**Classification:** SYNTHETIC · NON-GxP · Customer Zero

## Principle

Simulators replace ERP/MES/equipment only. OEE and other customer Data Products are **not** reimplemented.

```text
Equipment / Order / Batch / Warehouse Simulators
        ↓
Platform UNS Standard 1.0
        ↓
Customer Golden Paths / Data Products (when compatible)
        ↓
Generic Data Product Consumption Framework UI
```

## Factory-as-Code

`model-company/factories/autoinjector-pharma.yaml` (default in `app-config.yaml`)

Legacy plant retained: `model-company/factories/model-pharma.yaml`

## Scenario pack

`model-company/scenarios/autoinjector/SCN-AI-001.yaml` … `SCN-AI-010.yaml`

## Control Plane

`plugins/model-company-backend` — campaign engine (`autoinjectorCampaign.ts`) publishes UNS messages; no OEE math.
