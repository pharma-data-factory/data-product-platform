"""The release workflow's checks and record (NXD-132)."""

import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "nexora_release", ROOT / "scripts" / "nexora_release.py"
)
release = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(release)

SHA = "0123456789abcdef0123456789abcdef01234567"
DIGEST = "sha256:" + "a" * 64


@pytest.fixture
def manifest():
    return release.load_manifest()


def _github_repository(manifest):
    # ghcr.io/<owner>/<name> → <Owner>/<name>; case differs on GitHub, not on GHCR.
    owner, name = manifest["spec"]["runtime"]["image"]["repository"].split("/")[1:]
    return f"{owner.upper()}/{name}"


def test_the_shipped_manifest_releases_under_its_own_version(manifest):
    version = manifest["metadata"]["version"]
    result = release.check(manifest, f"v{version}", _github_repository(manifest))
    assert result["version"] == version
    assert result["repository"] == manifest["spec"]["runtime"]["image"]["repository"]


def test_a_tag_that_is_not_the_manifest_version_is_refused(manifest):
    with pytest.raises(release.ReleaseError, match="does not match nexora.yaml"):
        release.check(manifest, "v9.9.9", _github_repository(manifest))


def test_an_image_repository_this_repository_cannot_publish_to_is_refused(manifest):
    version = manifest["metadata"]["version"]
    with pytest.raises(release.ReleaseError, match="publishes to"):
        release.check(manifest, f"v{version}", "someone-else/elsewhere")


def test_both_problems_are_named_at_once(manifest):
    with pytest.raises(release.ReleaseError) as refused:
        release.check(manifest, "v9.9.9", "someone-else/elsewhere")
    assert "does not match" in str(refused.value)
    assert "publishes to" in str(refused.value)


def test_the_record_names_artifact_commit_and_image(manifest):
    out = release.record(
        manifest,
        tag="v1.0.0",
        commit=SHA,
        digest=DIGEST,
        run_url="https://github.com/o/r/actions/runs/1",
        built_at=datetime(2026, 10, 6, 12, 0, tzinfo=UTC),
    )
    metadata = manifest["metadata"]
    repository = manifest["spec"]["runtime"]["image"]["repository"]
    assert out["artifact"] == (f"{metadata['namespace']}/{metadata['name']}@{metadata['version']}")
    assert out["commitSha"] == SHA
    assert out["image"] == {
        "repository": repository,
        "digest": DIGEST,
        "reference": f"{repository}@{DIGEST}",
    }
    assert out["builtAt"] == "2026-10-06T12:00:00Z"
    json.dumps(out)


@pytest.mark.parametrize(
    ("commit", "digest", "complaint"),
    [
        (SHA[:7], DIGEST, "full 40-character SHA"),
        (SHA, "sha256:abc", "sha256:<64 hex>"),
        (SHA, "a" * 64, "sha256:<64 hex>"),
    ],
)
def test_values_nexora_would_refuse_are_refused_here(manifest, commit, digest, complaint):
    with pytest.raises(release.ReleaseError, match=complaint):
        release.record(manifest, tag="v1.0.0", commit=commit, digest=digest, run_url="u")
