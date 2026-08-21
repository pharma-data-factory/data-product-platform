from __future__ import annotations

import socket
import time
from collections.abc import Callable
from typing import Any

from pathlib import Path

from fastapi.testclient import TestClient

from scenarios import WINDOW_FROM, WINDOW_TO

MES_HOST = "127.0.0.1"
MES_PORT = 18091
MQTT_HOST = "127.0.0.1"
MQTT_PORT = 41884
MQTT_CONTAINER = "oee-pilot-mosquitto-pytest"
DB_PATH = Path(__file__).resolve().parents[1] / "data" / "pilot-pytest.db"

OEE_PARAMS = {
    "window": "custom",
    "from": WINDOW_FROM,
    "to": WINDOW_TO,
}


def wait_port(host: str, port: int, timeout: float = 20) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.2)
    raise TimeoutError(f"{host}:{port} did not open")


def wait_until(predicate: Callable[[], Any], timeout: float = 15, interval: float = 0.2) -> Any:
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = predicate()
        if last:
            return last
        time.sleep(interval)
    return last


def get_oee(client: TestClient) -> Any:
    return client.get("/api/v1/oee/filler-01", params=OEE_PARAMS)


def health_check(client: TestClient, name: str) -> dict[str, Any]:
    body = client.get("/health/ready").json()
    return next(item for item in body["checks"] if item["name"] == name)


def rss_bytes() -> int | None:
    try:
        if sys_platform_windows():
            import ctypes
            from ctypes import wintypes

            class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
                _fields_ = [
                    ("cb", wintypes.DWORD),
                    ("PageFaultCount", wintypes.DWORD),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t),
                ]

            counters = PROCESS_MEMORY_COUNTERS()
            counters.cb = ctypes.sizeof(counters)
            ctypes.windll.psapi.GetProcessMemoryInfo(
                ctypes.windll.kernel32.GetCurrentProcess(),
                ctypes.byref(counters),
                counters.cb,
            )
            return int(counters.WorkingSetSize)
        import resource

        usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return int(usage * 1024 if usage < 10_000_000 else usage)
    except Exception:
        return None


def sys_platform_windows() -> bool:
    import sys

    return sys.platform == "win32"
