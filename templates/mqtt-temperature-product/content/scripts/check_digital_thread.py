#!/usr/bin/env python3
"""Fail-closed digital-thread CI guard for controlled Golden Path repos.

When product-manifest.yaml exists (controlled scaffold), require:
- docs/urs/URS-baseline.json and URS-baseline.md
- manifest.ursBaselineId == snapshot.ursBaselineId
- manifest.ursContentHash == snapshot.ursContentHash
- AGENTS.md present

Unpinned Marketplace scaffolds without product-manifest.yaml skip this check.

Technical integrity only — not GxP validation.
"""

from __future__ import annotations

import json
import hashlib
import re
import sys
from pathlib import Path


def parse_simple_yaml_map(text: str) -> dict[str, str]:
    """Parse flat key: value YAML (no nested structures required for pins)."""
    result: dict[str, str] = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        # only top-level keys (no leading spaces)
        if line.startswith(" ") or line.startswith("\t") or line.startswith("-"):
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            result[key] = value
    return result


def parse_scalar(value: str):
    value = value.strip()
    if not value:
        return ""
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value.strip('"').strip("'")


def parse_manifest_document(text: str) -> dict:
    """Parse the deterministic YAML subset emitted by Product Composer."""
    result: dict = {}
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line or line.startswith((" ", "\t", "-", "#")) or ":" not in line:
            index += 1
            continue
        key, _, raw = line.partition(":")
        if raw.strip():
            result[key.strip()] = parse_scalar(raw)
            index += 1
            continue
        items: list[dict] = []
        index += 1
        while index < len(lines):
            nested = lines[index]
            if nested == "-":
                item: dict = {}
                index += 1
                while index < len(lines) and lines[index].startswith("  "):
                    child_key, separator, child_value = lines[index].strip().partition(":")
                    if separator:
                        item[child_key.strip()] = parse_scalar(child_value)
                    index += 1
                items.append(item)
                continue
            if nested.startswith(("-", " ")):
                index += 1
                continue
            break
        result[key.strip()] = items
    return result


def compute_manifest_hash(manifest: dict) -> str:
    content = {
        key: value for key, value in manifest.items() if key != "manifestContentHash"
    }
    canonical = json.dumps(
        content, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main(argv: list[str]) -> int:
    root = Path(argv[1] if len(argv) > 1 else ".")
    manifest_path = root / "product-manifest.yaml"
    if not manifest_path.is_file():
        print(
            "Digital thread check FAILED: missing product-manifest.yaml",
            file=sys.stderr,
        )
        return 1

    manifest_text = manifest_path.read_text(encoding="utf-8").strip()
    # Templating leftovers / Marketplace empty scaffolds
    if (
        not manifest_text
        or "productId:" not in manifest_text
        or "${{" in manifest_text
    ):
        print(
            "Digital thread check: product-manifest.yaml has no controlled pins — skip"
        )
        return 0

    snapshot_json = root / "docs" / "urs" / "URS-baseline.json"
    snapshot_md = root / "docs" / "urs" / "URS-baseline.md"
    agents = root / "AGENTS.md"
    matrix = root / "docs" / "urs" / "traceability-matrix.yaml"

    errors: list[str] = []
    for path in (snapshot_json, snapshot_md, agents, matrix):
        if not path.is_file():
            errors.append(f"missing required file: {path.as_posix()}")

    if errors:
        print("Digital thread check FAILED:", file=sys.stderr)
        for message in errors:
            print(f"  - {message}", file=sys.stderr)
        return 1

    manifest = parse_manifest_document(manifest_text)
    try:
        snapshot = json.loads(snapshot_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(
            f"Digital thread check FAILED: invalid URS-baseline.json ({exc})",
            file=sys.stderr,
        )
        return 1

    if not isinstance(snapshot, dict) or not snapshot.get("ursBaselineId"):
        errors.append("URS snapshot has no ursBaselineId")

    def require_match(field: str) -> None:
        left = str(manifest.get(field, "")).strip()
        right = str(snapshot.get(field, "")).strip()
        if not left or not right:
            errors.append(f"missing {field} in manifest or snapshot")
        elif left != right:
            errors.append(f"{field} mismatch: manifest={left} snapshot={right}")

    require_match("ursBaselineId")
    require_match("ursContentHash")
    expected_manifest_hash = str(manifest.get("manifestContentHash", "")).strip()
    actual_manifest_hash = compute_manifest_hash(manifest)
    if not expected_manifest_hash:
        errors.append("missing manifestContentHash")
    elif expected_manifest_hash != actual_manifest_hash:
        errors.append(
            "manifestContentHash mismatch: "
            f"manifest={expected_manifest_hash} computed={actual_manifest_hash}"
        )

    ref = (argv[2] if len(argv) > 2 else "") or ""
    if re.match(r"^refs/tags/", ref) or (ref.startswith("v") and "/" not in ref):
        if not manifest.get("manifestContentHash"):
            errors.append("release/tag requires manifestContentHash")

    if errors:
        print("Digital thread check FAILED:", file=sys.stderr)
        for message in errors:
            print(f"  - {message}", file=sys.stderr)
        return 1

    print(
        "Digital thread check PASSED "
        f"(ursBaselineId={manifest.get('ursBaselineId')}, "
        f"hash={str(manifest.get('ursContentHash', ''))[:16]}...)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
