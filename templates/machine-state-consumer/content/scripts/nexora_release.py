"""Checks a release tag against nexora.yaml and writes the release record (NXD-132).

Called by .github/workflows/release.yml:

    python scripts/nexora_release.py check <tag> <owner/repo>
        Prints version=, repository= and short_sha= lines for $GITHUB_OUTPUT, or
        exits non-zero naming every mismatch.

    python scripts/nexora_release.py record --tag T --commit SHA --digest D --run-url U
        Prints nexora-release.json: what was built, from which commit, as which
        image. Nexora reads it from the GitHub Release; this repository holds no
        Nexora credential (pull, as for test evidence, NXD-123).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "nexora.yaml"

# The same grammars the Nexora baseline provenance accepts (NXD-052): a full
# commit SHA, never an abbreviation, and an OCI sha256 digest.
COMMIT_SHA = re.compile(r"^[0-9a-f]{40}$")
DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")


class ReleaseError(Exception):
    """Every reason a release may not proceed, in one message."""


def load_manifest(path: Path = MANIFEST) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def check(manifest: dict, tag: str, github_repository: str) -> dict[str, str]:
    """The version and image repository to release, or every reason not to."""
    version = str(manifest["metadata"]["version"])
    repository = manifest["spec"]["runtime"]["image"]["repository"]
    problems = []
    if tag != f"v{version}":
        problems.append(
            f'tag "{tag}" does not match nexora.yaml metadata.version "{version}": '
            f"tag v{version}, or change the version first"
        )
    # GHCR names are lowercase; a GitHub organisation need not be.
    expected = f"ghcr.io/{github_repository.lower()}"
    if repository != expected:
        problems.append(
            f'nexora.yaml spec.runtime.image.repository is "{repository}", but this '
            f'repository publishes to "{expected}"'
        )
    if problems:
        raise ReleaseError("; ".join(problems))
    return {"version": version, "repository": repository}


def record(
    manifest: dict,
    *,
    tag: str,
    commit: str,
    digest: str,
    run_url: str,
    built_at: datetime | None = None,
) -> dict:
    """The release record Nexora reads. Refuses values Nexora would refuse."""
    problems = []
    if not COMMIT_SHA.match(commit):
        problems.append(f'commit "{commit}" is not a full 40-character SHA')
    if not DIGEST.match(digest):
        problems.append(f'digest "{digest}" is not sha256:<64 hex>')
    if problems:
        raise ReleaseError("; ".join(problems))
    metadata = manifest["metadata"]
    repository = manifest["spec"]["runtime"]["image"]["repository"]
    moment = (built_at or datetime.now(UTC)).astimezone(UTC)
    return {
        "apiVersion": "nexora.dev/v1alpha1",
        "kind": "ReleaseRecord",
        "artifact": f"{metadata['namespace']}/{metadata['name']}@{metadata['version']}",
        "version": str(metadata["version"]),
        "tag": tag,
        "commitSha": commit,
        "image": {
            "repository": repository,
            "digest": digest,
            "reference": f"{repository}@{digest}",
        },
        "workflowRun": run_url,
        "builtAt": moment.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="nexora_release")
    commands = parser.add_subparsers(dest="command", required=True)
    check_cmd = commands.add_parser("check")
    check_cmd.add_argument("tag")
    check_cmd.add_argument("github_repository")
    record_cmd = commands.add_parser("record")
    record_cmd.add_argument("--tag", required=True)
    record_cmd.add_argument("--commit", required=True)
    record_cmd.add_argument("--digest", required=True)
    record_cmd.add_argument("--run-url", required=True)
    args = parser.parse_args(argv)

    manifest = load_manifest()
    try:
        if args.command == "check":
            result = check(manifest, args.tag, args.github_repository)
            sha = os.environ.get("GITHUB_SHA", "")
            print(f"version={result['version']}")
            print(f"repository={result['repository']}")
            print(f"short_sha={sha[:7]}")
        else:
            out = record(
                manifest,
                tag=args.tag,
                commit=args.commit,
                digest=args.digest,
                run_url=args.run_url,
            )
            print(json.dumps(out, indent=2))
    except ReleaseError as error:
        print(f"release refused: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
