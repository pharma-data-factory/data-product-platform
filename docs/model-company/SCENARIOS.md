# Scenarios (UNS publishers)

All scenarios publish through Platform UNS Standard 1.0 topics.

| ID | Name | Primary UNS effect |
| --- | --- | --- |
| SCN-001 | Normal Production | RUNNING state + counts |
| SCN-002 | Perfect Production | Ideal RUNNING, zero rejects |
| SCN-003 | Microstop Storm | MICROSTOP + `events/microstop` |
| SCN-004 | Equipment Breakdown | BREAKDOWN + `events/breakdown` |
| SCN-005 | Material Starvation | MATERIAL_STARVED |
| SCN-006 | Quality Reject Spike | counts reject surge |
| SCN-007 | Temperature Excursion | temperature beyond limits, UNCERTAIN |
| SCN-008 | Warehouse Delay | HU DELAYED |
| SCN-009 | Changeover | STOPPED → CHANGEOVER → SETUP → RUNNING |
| SCN-010 | Network Interruption | skipped publishes, DEGRADED / STALE |

Deterministic: same seed + scenario + factory version → same logical outcomes.
