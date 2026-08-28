from pathlib import Path

import yaml

from app.main import SCENARIOS, _seeded, load_factory


def test_factory_loads_15_equipment():
    path = Path(__file__).resolve().parents[3] / "factories" / "model-pharma.yaml"
    factory = load_factory(path)
    assert factory["company"]["id"] == "model-pharma"
    assert len(factory["_equipment"]) == 15
    assert len(SCENARIOS) == 10


def test_seeded_is_deterministic():
    assert _seeded(42, 3) == _seeded(42, 3)
    assert _seeded(42, 3) != _seeded(42, 4)


def test_yaml_has_three_lines():
    path = Path(__file__).resolve().parents[3] / "factories" / "model-pharma.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    lines = []
    for site in raw["sites"]:
        for area in site["areas"]:
            lines.extend(area["lines"])
    assert len(lines) == 3
