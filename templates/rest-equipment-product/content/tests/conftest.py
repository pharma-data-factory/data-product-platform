import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_TEST_DB = Path(__file__).resolve().parent / ".pytest-data" / "equipment.db"
_TEST_DB.parent.mkdir(parents=True, exist_ok=True)
os.environ["SQLITE_PATH"] = str(_TEST_DB)
os.environ["SOURCE_API_URL"] = ""
os.environ["SOURCE_API_TOKEN"] = ""

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
