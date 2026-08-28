# Material Flow UI

## Purpose

Visualize material / batch progression and handling units using existing Model Company APIs — no second genealogy engine.

## Data

| API | Use |
| --- | --- |
| `GET /batches` | Batch cards / flow nodes |
| `GET /genealogy` | Upstream/downstream edges |
| `GET /warehouse` | Finished Goods HUs |

## Components

- `MaterialFlowView` — ordered batch chain + HUs  
- `BatchNode` / `HandlingUnitNode`  
- `GenealogyChain` — selection-driven lineage  

## Animation

Subtle pulse on `IN_PROCESS` batches when simulation is RUNNING. Honors `prefers-reduced-motion`. Animation is never required to understand state.

## Empty states

`NO BATCH DATA`, `SELECT A BATCH`, `SIMULATION STOPPED` — no fabricated metrics.
