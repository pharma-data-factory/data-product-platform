import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_TEST_DB = Path(__file__).resolve().parent / ".pytest-data" / "machine-states.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
os.environ["SQLITE_PATH"] = str(_TEST_DB)
os.environ["MQTT_HOST"] = ""

from app.main import app, store


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        store.clear()
        yield test_client
        store.clear()
