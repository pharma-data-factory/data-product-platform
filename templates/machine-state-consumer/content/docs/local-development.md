# Local Development

```bash
pip install -e ".[dev]"
pytest
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Leave `MQTT_HOST` empty for broker-free tests.
