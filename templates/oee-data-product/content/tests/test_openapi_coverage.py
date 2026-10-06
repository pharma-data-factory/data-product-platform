"""contracts/openapi.yaml documents every route the app serves, and nothing else (NXD-132).

Route coverage, not equality: the file is written by hand and says more than
the app declares (typed results, error codes). What must not happen again is a
route nobody documented, or a documented route that no longer exists.
"""

import re
from pathlib import Path

import yaml

from app.main import app

ROOT = Path(__file__).resolve().parents[1]
METHODS = {"get", "post", "put", "patch", "delete"}


def _operations(paths: dict) -> set[tuple[str, str]]:
    # Path parameter names may differ ({equipmentId} vs {equipment_id}); the
    # route is the same.
    return {
        (method.upper(), re.sub(r"\{[^}]+\}", "{}", path))
        for path, operations in paths.items()
        for method in operations
        if method in METHODS
    }


def _served() -> set[tuple[str, str]]:
    return _operations(app.openapi()["paths"])


def _documented() -> set[tuple[str, str]]:
    document = yaml.safe_load((ROOT / "contracts" / "openapi.yaml").read_text())
    return _operations(document["paths"])


def test_every_served_route_is_documented():
    missing = sorted(_served() - _documented())
    assert missing == [], f"add to contracts/openapi.yaml: {missing}"


def test_every_documented_route_is_served():
    stale = sorted(_documented() - _served())
    assert stale == [], f"remove from contracts/openapi.yaml: {stale}"
