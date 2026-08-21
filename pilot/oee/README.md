# OEE Pilot Integration Environment

PILOT / TEST fixture for a generated OEE Data Product. Not GxP. Not a
plant MES. Anonymous MQTT is local-only.

```powershell
python generate.py
docker compose up --build -d mosquitto test-mes oee
python publisher/publish.py --broker 127.0.0.1 --port 41883 --scenario PERFECT
# GET http://127.0.0.1:18080/api/v1/oee/filler-01?window=custom&from=2026-08-20T08:00:00Z&to=2026-08-20T09:00:00Z
pytest
```

See `docs/how-to/oee-pilot.md`.
