# ${{ values.title }}

OEE Data Product. Calculates Availability × Performance × Quality per equipment
from MES production context (REST) and machine events (MQTT).

This runtime does **not** require Backstage. CERTIFIED on the Golden Path is
technical platform status only. It is not GxP validation.

Pilot limitations: single instance, SQLite, no HA, no UNS/AAS dependency, no Kafka, no AI.

## Run locally

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
pip install -e vendor/health vendor/observability vendor/timeseries
pip install -e vendor/rest-api --no-deps
pip install -e vendor/rest-source --no-deps
pip install -e vendor/mqtt-consumer --no-deps
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

Simulate scenario A:

```bash
python examples/simulate.py --scenario A
```

Inspect `GET /api/v1/oee/filler-01?window=custom&from=2026-08-21T08:00:00Z&to=2026-08-21T09:00:00Z`,
`GET /api/v1/quality`, and `GET /api/v1/platform-metadata`.
