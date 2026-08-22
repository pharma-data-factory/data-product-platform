# OEE Model

```text
Availability = runtimeSeconds / plannedProductionSeconds
Performance  = idealCycleTimeSeconds × totalCount / runtimeSeconds
Quality      = goodCount / totalCount
OEE          = Availability × Performance × Quality
```

Published ratios use 4 decimal places, ROUND_HALF_UP. Performance is not capped
at 1.0. Missing inputs never default to 0 or 1. `calculationStatus` uses
`COMPLETE` when A, P, and Q can be multiplied, and explicit `MISSING_*` /
`INSUFFICIENT_OBSERVATION` statuses when they cannot. `oee: null` means the
calculation was not completed.

Unobserved time is excluded from the calculation basis. It is not treated as
`STOPPED`. Optional `reasonCode` on machine state is diagnostic only.

Loss classification, microstops, and reason codes are additive 1.1 surfaces.
They do not change these 1.0 formulas. See [Loss Management](losses.md) and
[Product](product.md).
