from __future__ import annotations

import os
import subprocess
import sys
import threading
from pathlib import Path

import pytest
import uvicorn
from fastapi.testclient import TestClient

PILOT_DIR = Path(__file__).resolve().parents[1]
GENERATED = PILOT_DIR / "generated" / "pilot-oee-line-01"

sys.path.insert(0, str(PILOT_DIR / "publisher"))
sys.path.insert(0, str(PILOT_DIR / "test-mes"))
sys.path.insert(0, str(PILOT_DIR / "tests"))
sys.path.insert(0, str(PILOT_DIR))

from generate import generate  # noqa: E402
from helpers import MQTT_CONTAINER, MQTT_HOST, MQTT_PORT, MES_HOST, MES_PORT, DB_PATH, wait_port  # noqa: E402
from test_mes import app as mes_app  # noqa: E402
from test_mes import state as mes_state  # noqa: E402

generate(GENERATED)

for relative in (
    "",
    "vendor/health/src",
    "vendor/observability/src",
    "vendor/rest-api/src",
    "vendor/rest-source/src",
    "vendor/mqtt-consumer/src",
    "vendor/timeseries/src",
):
    sys.path.insert(0, str(GENERATED / relative if relative else GENERATED))

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
if DB_PATH.exists():
    DB_PATH.unlink()

os.environ["TIMESERIES_SQLITE_PATH"] = str(DB_PATH)
os.environ["EQUIPMENT_ID"] = "filler-01"
os.environ["DEFAULT_WINDOW"] = "custom"
os.environ["SERVICE_NAME"] = "pilot-oee-line-01"
os.environ["SERVICE_VERSION"] = "1.0.0"
os.environ["TEMPLATE_NAME"] = "oee-data-product"
os.environ["TEMPLATE_VERSION"] = "1.0.0"
os.environ["MQTT_TOPIC"] = "pharma/oee/filler-01/+"
os.environ["MQTT_CLIENT_ID"] = "pilot-oee-line-01-pytest"
os.environ["SOURCE_API_URL"] = f"http://{MES_HOST}:{MES_PORT}/api/v1/production-context/filler-01"
os.environ["SOURCE_API_TIMEOUT"] = "1"
os.environ["SOURCE_API_RETRIES"] = "1"
os.environ["SOURCE_API_TOKEN"] = "pilot-rest-token-do-not-log"
os.environ["MQTT_PASSWORD"] = "pilot-mqtt-password-do-not-log"

_mqtt_available = False


def _docker_available() -> bool:
    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def _start_mosquitto() -> bool:
    if not _docker_available():
        return False
    conf = (PILOT_DIR / "mosquitto" / "mosquitto.conf").resolve()
    subprocess.run(["docker", "rm", "-f", MQTT_CONTAINER], capture_output=True, check=False)
    result = subprocess.run(
        [
            "docker",
            "run",
            "-d",
            "--name",
            MQTT_CONTAINER,
            "-p",
            f"{MQTT_PORT}:1883",
            "-v",
            f"{conf}:/mosquitto/config/mosquitto.conf:ro",
            "eclipse-mosquitto:2",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        return False
    try:
        wait_port(MQTT_HOST, MQTT_PORT, timeout=30)
    except TimeoutError:
        return False
    return True


def _start_mes() -> None:
    config = uvicorn.Config(mes_app, host=MES_HOST, port=MES_PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    wait_port(MES_HOST, MES_PORT, timeout=15)


_start_mes()
_mqtt_available = _start_mosquitto()
os.environ["MQTT_HOST"] = MQTT_HOST if _mqtt_available else ""
os.environ["MQTT_PORT"] = str(MQTT_PORT)

from app.main import app, events, ingest, mqtt, obs  # noqa: E402


@pytest.fixture(scope="session")
def generated_root() -> Path:
    return GENERATED


@pytest.fixture(scope="session")
def mqtt_available() -> bool:
    return _mqtt_available


@pytest.fixture(scope="session")
def mes_url() -> str:
    return f"http://{MES_HOST}:{MES_PORT}"


@pytest.fixture()
def oee_client() -> TestClient:
    mes_state["mode"] = "NORMAL"
    events.initialize()
    from datetime import UTC, datetime

    events.store.delete_before(datetime(9999, 1, 1, tzinfo=UTC))
    events.forget_event_ids()
    events.storage_error = None
    ingest.rejected.clear()
    ingest.duplicate_count = 0
    ingest.rest_error = None
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def mqtt_client(oee_client: TestClient, mqtt_available: bool) -> TestClient:
    if not mqtt_available:
        pytest.skip("real MQTT broker not available")
    return oee_client


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    subprocess.run(["docker", "rm", "-f", MQTT_CONTAINER], capture_output=True, check=False)
    if DB_PATH.exists():
        try:
            DB_PATH.unlink()
        except OSError:
            pass
