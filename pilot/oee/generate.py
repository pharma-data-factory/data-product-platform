"""Render the official OEE Golden Path into a generated pilot product.

This is the local equivalent of Marketplace Create → fetch:template.
It does not publish to GitHub.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_CONTENT = ROOT / "templates" / "oee-data-product" / "content"
TEMPLATE_YAML = ROOT / "templates" / "oee-data-product" / "template.yaml"
DEFAULT_OUT = Path(__file__).resolve().parent / "generated" / "pilot-oee-line-01"

SKIP_DIRS = {".git", ".pytest_cache", ".ruff_cache", "__pycache__", ".pytest-data", "data"}
SKIP_NAMES = {".generated-from-golden-path.json"}
COPY_WITHOUT_TEMPLATING = {".github/workflows/data-product-quality.yml"}
PLACEHOLDER = re.compile(r"\$\{\{\s*([^}]+)\s*\}\}")

PILOT_VALUES = {
    "name": "pilot-oee-line-01",
    "title": "pilot-oee-line-01",
    "description": (
        "PILOT / TEST OEE Data Product for line 01. Not official template "
        "certification. Not GxP validated."
    ),
    "owner": "group:default/platform-team",
    "domain": "manufacturing",
    "equipmentId": "filler-01",
    "defaultWindow": "CUSTOM",
    "machineStateTopic": "pharma/oee/filler-01/state",
    "counterTopic": "pharma/oee/filler-01/count",
    "mqttTopic": "pharma/oee/filler-01/+",
    "contextUrlRef": "SOURCE_API_URL",
    "site": "pilot",
    "area": "packaging",
    "line": "line-01",
    "system": "data-platform",
    "lifecycle": "experimental",
    "version": "1.0.0",
    "templateName": "oee-data-product",
    "templateVersion": "1.0.0",
    "destination": {
        "host": "github.com",
        "owner": "pharma-data-factory",
        "repo": "pilot-oee-line-01",
    },
}

WAVE1 = {
    "health": "1.0.0",
    "observability": "1.0.0",
    "mqtt-consumer": "1.0.0",
    "rest-source": "1.0.0",
    "timeseries": "1.0.0",
    "rest-api": "1.0.0",
}


def lookup(expression: str) -> str:
    trimmed = expression.strip()
    if not trimmed.startswith("values."):
        return ""
    current: object = PILOT_VALUES
    for key in trimmed.removeprefix("values.").split("."):
        if not isinstance(current, dict):
            return ""
        current = current.get(key)
        if current is None:
            return ""
    return str(current)


def render(source: str) -> str:
    return PLACEHOLDER.sub(lambda match: lookup(match.group(1)), source)


def copy_tree(source: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for path in source.rglob("*"):
        relative = path.relative_to(source).as_posix()
        if any(part in SKIP_DIRS for part in path.relative_to(source).parts):
            continue
        if path.name in SKIP_NAMES:
            continue
        target = dest / path.relative_to(source)
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        if relative in COPY_WITHOUT_TEMPLATING:
            shutil.copy2(path, target)
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            shutil.copy2(path, target)
            continue
        target.write_text(render(text), encoding="utf-8", newline="\n")


def write_manifest(dest: Path) -> dict[str, object]:
    composition = (dest / "composition.yaml").read_text(encoding="utf-8")
    catalog = (dest / "catalog-info.yaml").read_text(encoding="utf-8")
    manifest = {
        "product": PILOT_VALUES["name"],
        "template": PILOT_VALUES["templateName"],
        "templateVersion": PILOT_VALUES["templateVersion"],
        "dataProductStandardVersion": "1.0.0",
        "dataProductSdkVersion": "1.0.0",
        "contractVersions": {
            "oee-result": "1.0.0",
            "production-context": "1.0.0",
            "machine-state-event": "1.0.0",
            "production-count-event": "1.0.0",
            "quality-count-event": "1.0.0",
        },
        "wave1ComponentVersions": WAVE1,
        "composition": "Mode A — MES REST + machine MQTT → OEE → Time-Series → REST API",
        "uns": False,
        "aas": False,
        "catalogClass": "PILOT / TEST",
        "sourceTemplate": str(TEMPLATE_CONTENT.relative_to(ROOT).as_posix()),
    }
    (dest / ".generated-from-golden-path.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    if "oee-data-product-direct" not in composition and "health" not in composition:
        raise SystemExit("generated composition is missing Wave 1 components")
    if "dataprod.platform/templateVersion: 1.0.0" not in catalog:
        raise SystemExit("generated catalog-info is missing template version")
    return manifest


def generate(dest: Path) -> dict[str, object]:
    if not TEMPLATE_CONTENT.is_dir():
        raise SystemExit(f"missing Golden Path content: {TEMPLATE_CONTENT}")
    if not TEMPLATE_YAML.is_file():
        raise SystemExit(f"missing Golden Path template: {TEMPLATE_YAML}")
    copy_tree(TEMPLATE_CONTENT, dest)
    return write_manifest(dest)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the OEE pilot Data Product")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="Destination directory for the generated product",
    )
    args = parser.parse_args()
    dest = args.out.resolve()
    manifest = generate(dest)
    print(f"generated {dest}")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
