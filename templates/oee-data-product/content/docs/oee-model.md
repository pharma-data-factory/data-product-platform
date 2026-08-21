# OEE Model

```text
Availability = runtimeSeconds / plannedProductionSeconds
Performance  = idealCycleTimeSeconds × totalCount / runtimeSeconds
Quality      = goodCount / totalCount
OEE          = Availability × Performance × Quality
```

Published ratios use 4 decimal places, ROUND_HALF_UP. Performance is not capped
at 1.0. `calculationStatus` distinguishes VALID `oee: 0` from INCOMPLETE `oee: null`.
