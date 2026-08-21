from __future__ import annotations

import sys
from pathlib import Path

PLATFORM_COMPONENTS = Path(__file__).resolve().parent

SRC_DIRS = [
    PLATFORM_COMPONENTS / "operations" / "health" / "src",
    PLATFORM_COMPONENTS / "operations" / "observability" / "src",
    PLATFORM_COMPONENTS / "integration" / "rest-api" / "src",
    PLATFORM_COMPONENTS / "integration" / "rest-source" / "src",
    PLATFORM_COMPONENTS / "integration" / "mqtt-consumer" / "src",
    PLATFORM_COMPONENTS / "data" / "timeseries" / "src",
]


def add_component_src() -> None:
    for directory in SRC_DIRS:
        path = str(directory)
        if path not in sys.path:
            sys.path.insert(0, path)


add_component_src()
