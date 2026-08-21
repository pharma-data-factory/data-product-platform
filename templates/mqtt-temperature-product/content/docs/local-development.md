# Local Development

Requires Python 3.12+.

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

MQTT is optional. Leave `MQTT_HOST` empty and use
`POST /api/v1/temperatures`.

## Tests

```bash
ruff check app tests
pytest tests/test_health.py tests/test_model.py tests/test_temperatures.py
pytest tests/test_contract.py
pytest tests/test_quality.py
pytest tests/test_compatibility.py
```
