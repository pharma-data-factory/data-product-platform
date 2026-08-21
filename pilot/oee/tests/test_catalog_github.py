from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def test_github_live_proof_is_explicitly_not_run() -> None:
    marker = Path(__file__).resolve().parents[1] / "GITHUB_LIVE_PROOF_NOT_RUN"
    assert marker.is_file()
    text = marker.read_text(encoding="utf-8")
    assert "GITHUB_LIVE_PROOF_NOT_RUN" in text
    procedure = ROOT / "docs" / "developer" / "github-integration-test.md"
    oee_procedure = ROOT / "docs" / "developer" / "oee-github-integration-test.md"
    assert procedure.is_file()
    assert oee_procedure.is_file()
    assert "Do not require AWS Marketplace" in procedure.read_text(encoding="utf-8")
    assert "GITHUB_LIVE_PROOF_NOT_RUN" in oee_procedure.read_text(encoding="utf-8")


def test_catalog_sample_is_marked_pilot_test() -> None:
    samples = (ROOT / "catalog" / "samples" / "entities.yaml").read_text(encoding="utf-8")
    assert "name: pilot-oee-line-01" in samples
    assert "PILOT / TEST" in samples
    production = (ROOT / "catalog" / "entities.yaml").read_text(encoding="utf-8")
    assert "pilot-oee-line-01" not in production
    app_config = (ROOT / "app-config.yaml").read_text(encoding="utf-8")
    production_config = (ROOT / "app-config.production.yaml").read_text(encoding="utf-8")
    docker_config = (ROOT / "app-config.docker.yaml").read_text(encoding="utf-8")
    assert "catalog/samples/entities.yaml" in app_config
    assert "catalog/samples" not in production_config
    assert "catalog/samples" not in docker_config
