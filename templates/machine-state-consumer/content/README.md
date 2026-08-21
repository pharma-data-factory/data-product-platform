# ${{ values.name }}

${{ values.description }}

Composition proof Data Product. It consumes `machine-state-event` from
Unified Namespace and exposes the latest machine state over REST.
It does not calculate OEE.

```bash
pip install -e ".[dev]"
pytest
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Broker-free ingest:

```bash
python examples/publish_sample.py
curl http://localhost:8080/api/v1/machines/filler-01
curl http://localhost:8080/api/v1/quality
curl http://localhost:8080/api/v1/platform-metadata
```

Runtime depends on MQTT connectivity to Unified Namespace when
`MQTT_HOST` is set. It does not require Backstage.
