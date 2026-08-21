# Input Contracts

Version 1.0.0:

- `production-context` — MES via REST Source
- `machine-state-event` — reused (`RUNNING`, `STOPPED`, `IDLE`, `MAINTENANCE`)
- `production-count-event` — cumulative `totalCount`
- `quality-count-event` — cumulative `goodCount` / `rejectCount`

Schemas live in `contracts/`.
