from __future__ import annotations

import json
from pathlib import Path

WAVE1 = {
    "health": "1.0.0",
    "observability": "1.0.0",
    "mqtt-consumer": "1.0.0",
    "rest-source": "1.0.0",
    "timeseries": "1.0.0",
    "rest-api": "1.0.0",
}


def test_generated_artifact_is_not_the_template_folder(generated_root: Path) -> None:
    assert generated_root.name == "pilot-oee-line-01"
    assert "templates" not in generated_root.parts[-3:]
    assert (generated_root / "app" / "main.py").is_file()
    assert (generated_root / "catalog-info.yaml").is_file()
    assert (generated_root / "composition.yaml").is_file()
    assert (generated_root / ".github" / "workflows" / "ci.yml").is_file()


def test_generated_metadata_versions(generated_root: Path) -> None:
    manifest = json.loads(
        (generated_root / ".generated-from-golden-path.json").read_text(encoding="utf-8"),
    )
    assert manifest["template"] == "oee-data-product"
    assert manifest["templateVersion"] == "1.0.0"
    assert manifest["dataProductStandardVersion"] == "1.0.0"
    assert manifest["dataProductSdkVersion"] == "1.0.0"
    assert manifest["contractVersions"] == {
        "oee-result": "1.0.0",
        "production-context": "1.0.0",
        "machine-state-event": "1.0.0",
        "production-count-event": "1.0.0",
        "quality-count-event": "1.0.0",
    }
    assert manifest["wave1ComponentVersions"] == WAVE1
    assert "Mode A" in manifest["composition"]
    assert manifest["uns"] is False
    assert manifest["aas"] is False

    catalog = (generated_root / "catalog-info.yaml").read_text(encoding="utf-8")
    assert "name: pilot-oee-line-01" in catalog
    assert "dataprod.platform/template: oee-data-product" in catalog
    assert "dataprod.platform/templateVersion: 1.0.0" in catalog
    assert "dataprod.platform/dataProductStandardVersion: 1.0.0" in catalog
    assert "dataprod.platform/dataProductSdkVersion: 1.0.0" in catalog
    assert "PILOT / TEST" in catalog
    config = (generated_root / "app" / "config.py").read_text(encoding="utf-8")
    assert 'service_name: str = "pilot-oee-line-01"' in config
    assert "${{ values" not in config
    vendor = generated_root / "vendor"
    files = [path for path in vendor.rglob("*") if path.is_file()]
    size = sum(path.stat().st_size for path in files)
    assert len(files) > 20
    assert size > 10_000
    (generated_root.parent.parent / "results").mkdir(parents=True, exist_ok=True)
