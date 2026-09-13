"""Unit tests for CI Manifest pin check (technical integrity, not GxP)."""

from __future__ import annotations

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_manifest_pins.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("check_manifest_pins", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pins = _load_module()


UNPINNED = """
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example
  annotations:
    dataprod.platform/kind: data-product
    dataprod.platform/domain: manufacturing
"""

PINNED_COMPLETE = """
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example
  annotations:
    dataprod.platform/product-manifest-content-hash: abcdef0123456789deadbeef
    dataprod.platform/urs-baseline-id: urs-bl-1
    dataprod.platform/product-baseline-id: pbl-1
"""

PINNED_MISSING_URS = """
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example
  annotations:
    dataprod.platform/product-manifest-content-hash: abcdef0123456789deadbeef
    dataprod.platform/product-baseline-id: pbl-1
"""


def test_unpinned_catalog_skips():
    annotations = pins.parse_annotations(UNPINNED)
    assert pins.check_manifest_pins(annotations) == []


def test_pinned_complete_passes():
    annotations = pins.parse_annotations(PINNED_COMPLETE)
    assert pins.check_manifest_pins(annotations) == []


def test_pinned_missing_urs_fails():
    annotations = pins.parse_annotations(PINNED_MISSING_URS)
    errors = pins.check_manifest_pins(annotations)
    assert any("urs-baseline-id" in e for e in errors)


def test_main_unpinned_exit_zero(tmp_path):
    catalog = tmp_path / "catalog-info.yaml"
    catalog.write_text(UNPINNED, encoding="utf-8")
    assert pins.main([str(SCRIPT), str(catalog)]) == 0


def test_main_incomplete_exit_one(tmp_path):
    catalog = tmp_path / "catalog-info.yaml"
    catalog.write_text(PINNED_MISSING_URS, encoding="utf-8")
    assert pins.main([str(SCRIPT), str(catalog)]) == 1


def test_main_complete_exit_zero(tmp_path):
    catalog = tmp_path / "catalog-info.yaml"
    catalog.write_text(PINNED_COMPLETE, encoding="utf-8")
    assert pins.main([str(SCRIPT), str(catalog)]) == 0
