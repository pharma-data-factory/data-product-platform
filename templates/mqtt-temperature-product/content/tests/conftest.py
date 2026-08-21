import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_TEST_DB = Path(__file__).resolve().parent / ".pytest-data" / "temperatures.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
os.environ["SQLITE_PATH"] = str(_TEST_DB)
os.environ["MQTT_HOST"] = ""
os.environ["TEMPERATURE_MIN"] = "-50"
os.environ["TEMPERATURE_MAX"] = "150"

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
