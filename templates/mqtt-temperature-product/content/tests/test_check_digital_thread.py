"""Unit tests for fail-closed digital thread CI guard."""

from __future__ import annotations

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_digital_thread.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("check_digital_thread", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


dt = _load_module()


def test_fail_without_manifest(tmp_path: Path):
    assert dt.main(["check_digital_thread.py", str(tmp_path)]) == 1


def _manifest_text(*, manifest_hash: str | None = None) -> str:
    body = "\n".join(
        [
            "productId: p1",
            "productVersionId: v1",
            "productBaselineId: b1",
            "requirementSetId: set-1",
            "ursBaselineId: urs-1",
            "ursVersion: '1.0'",
            "ursContentHash: " + ("a" * 64),
            "components: []",
            "contracts: []",
            "policies: []",
            "qualityGates: []",
        ]
    )
    digest = manifest_hash or dt.compute_manifest_hash(
        dt.parse_manifest_document(body)
    )
    return f"{body}\nmanifestContentHash: {digest}\n"


def test_pass_when_pins_match(tmp_path: Path):
    (tmp_path / "docs" / "urs").mkdir(parents=True)
    (tmp_path / "product-manifest.yaml").write_text(
        _manifest_text(),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.json").write_text(
        '{"ursBaselineId":"urs-1","ursContentHash":"%s"}' % ("a" * 64),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.md").write_text("# ok\n", encoding="utf-8")
    (tmp_path / "docs" / "urs" / "traceability-matrix.yaml").write_text(
        "matrix: []\n", encoding="utf-8"
    )
    (tmp_path / "AGENTS.md").write_text("# agents\n", encoding="utf-8")
    assert dt.main(["check_digital_thread.py", str(tmp_path)]) == 0


def test_fail_on_hash_mismatch(tmp_path: Path):
    (tmp_path / "docs" / "urs").mkdir(parents=True)
    (tmp_path / "product-manifest.yaml").write_text(
        _manifest_text(),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.json").write_text(
        '{"ursBaselineId":"urs-1","ursContentHash":"%s"}' % ("b" * 64),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.md").write_text("# ok\n", encoding="utf-8")
    (tmp_path / "docs" / "urs" / "traceability-matrix.yaml").write_text(
        "matrix: []\n", encoding="utf-8"
    )
    (tmp_path / "AGENTS.md").write_text("# agents\n", encoding="utf-8")
    assert dt.main(["check_digital_thread.py", str(tmp_path)]) == 1


def test_fail_on_manifest_hash_mismatch(tmp_path: Path):
    (tmp_path / "docs" / "urs").mkdir(parents=True)
    (tmp_path / "product-manifest.yaml").write_text(
        _manifest_text(manifest_hash="c" * 64),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.json").write_text(
        '{"ursBaselineId":"urs-1","ursContentHash":"%s"}' % ("a" * 64),
        encoding="utf-8",
    )
    (tmp_path / "docs" / "urs" / "URS-baseline.md").write_text(
        "# ok\n", encoding="utf-8"
    )
    (tmp_path / "docs" / "urs" / "traceability-matrix.yaml").write_text(
        "matrix: []\n", encoding="utf-8"
    )
    (tmp_path / "AGENTS.md").write_text("# agents\n", encoding="utf-8")
    assert dt.main(["check_digital_thread.py", str(tmp_path)]) == 1
