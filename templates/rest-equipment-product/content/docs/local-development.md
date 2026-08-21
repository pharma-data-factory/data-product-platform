# Local Development

Requires Python 3.12+.

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

An external REST source is optional. Leave `SOURCE_API_URL` empty and use
`POST /api/v1/equipment`.

## Tests

```bash
ruff check app tests
pytest tests/test_health.py tests/test_model.py tests/test_equipment.py tests/test_source.py
pytest tests/test_contract.py
pytest tests/test_quality.py
pytest tests/test_compatibility.py
```
