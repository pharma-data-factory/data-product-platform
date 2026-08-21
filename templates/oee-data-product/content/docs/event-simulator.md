# Event Simulator

Developer fixture only. Not a plant simulator.

```bash
python examples/simulate.py --scenario A
python examples/simulate.py --scenario B
python examples/simulate.py --scenario C
python examples/simulate.py --scenario D
python examples/simulate.py --scenario E
```

Then `GET /api/v1/oee/${{ values.equipmentId }}` with a custom window
`2026-08-21T08:00:00Z` … `2026-08-21T09:00:00Z`.
