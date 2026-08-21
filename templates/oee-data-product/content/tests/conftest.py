import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_TEST_DB = Path(__file__).resolve().parent / ".pytest-data" / "oee.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["TIMESERIES_SQLITE_PATH"] = str(_TEST_DB)
os.environ["MQTT_HOST"] = ""
os.environ["SOURCE_API_URL"] = ""
os.environ["EQUIPMENT_ID"] = "filler-01"
os.environ["DEFAULT_WINDOW"] = "custom"
os.environ["SERVICE_NAME"] = "oee-test"
os.environ["SERVICE_VERSION"] = "1.0.0"
os.environ["TEMPLATE_NAME"] = "${{ values.templateName }}"
os.environ["TEMPLATE_VERSION"] = "${{ values.templateVersion }}"

from app.main import app, events, ingest


@pytest.fixture()
def client() -> TestClient:
    events.initialize()
    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    events.storage_error = None
    ingest.rejected.clear()
    ingest.duplicate_count = 0
    ingest.rest_error = None
    with TestClient(app) as test_client:
        yield test_client
