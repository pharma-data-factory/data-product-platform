# UNS Local Development

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

From `data-product-platform/uns`:

```bash
docker compose up --build
curl http://localhost:8080/health
pip install -e ".[dev]"
python examples/publish_examples.py
python examples/consume.py
pytest
```

The service also accepts `POST /api/v1/events` so tests do not require a
live broker. Set `UNS_MQTT_ENABLED=true` when Mosquitto is running.
