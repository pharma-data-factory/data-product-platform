#!/usr/bin/env python3
"""Fail-closed Product Manifest pin check for Golden Path CI.

If catalog-info.yaml carries a product-manifest-content-hash annotation
(set when scaffolding from Product Composer), companion URS and Product
Baseline pins must also be present and non-empty.

Unpinned Marketplace scaffolds (no hash) skip this check.

This is a technical integrity check — not GxP or regulatory validation.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

HASH_KEY = "dataprod.platform/product-manifest-content-hash"
REQUIRED_WHEN_HASHED = (
    "dataprod.platform/urs-baseline-id",
    "dataprod.platform/product-baseline-id",
)

# Matches annotation lines under metadata.annotations (generated catalog-info).
ANNOTATION_RE = re.compile(
    r"^[ \t]+(dataprod\.platform/[A-Za-z0-9._-]+):\s*(.+?)\s*$",
    re.MULTILINE,
)


def parse_annotations(text: str) -> dict[str, str]:
    return {key: value.strip() for key, value in ANNOTATION_RE.findall(text)}


def check_manifest_pins(annotations: dict[str, str]) -> list[str]:
    """Return human-readable error messages; empty list means OK."""
    content_hash = annotations.get(HASH_KEY, "").strip()
    if not content_hash:
        return []

    errors: list[str] = []
    for key in REQUIRED_WHEN_HASHED:
        value = annotations.get(key, "").strip()
        if not value:
            errors.append(f"missing required pin annotation: {key}")
    return errors


def main(argv: list[str]) -> int:
    path = Path(argv[1] if len(argv) > 1 else "catalog-info.yaml")
    if not path.is_file():
        print(f"Manifest pin check: catalog file not found: {path}", file=sys.stderr)
        return 1

    annotations = parse_annotations(path.read_text(encoding="utf-8"))
    content_hash = annotations.get(HASH_KEY, "").strip()
    if not content_hash:
        print("Manifest pin check: no product-manifest-content-hash — skip (unpinned)")
        return 0

    errors = check_manifest_pins(annotations)
    if errors:
        print("Manifest pin check FAILED (pinned scaffold incomplete):", file=sys.stderr)
        for message in errors:
            print(f"  - {message}", file=sys.stderr)
        print(
            "Pinned products require urs-baseline-id and product-baseline-id "
            "alongside product-manifest-content-hash.",
            file=sys.stderr,
        )
        return 1

    print(
        "Manifest pin check PASSED "
        f"(hash={content_hash[:16]}..., urs={annotations[REQUIRED_WHEN_HASHED[0]]}, "
        f"baseline={annotations[REQUIRED_WHEN_HASHED[1]]})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
