# CI/CD

GitHub Actions runs the Data Product quality gate on every pull request and
push to `main` (`ci.yml`): lint, unit, contract, quality, compatibility,
OpenAPI route coverage, Docker build, pip-audit.

## Releasing a version

1. Set `metadata.version` in `nexora.yaml` to the new version, e.g. `1.1.0`.
2. Merge, then tag that commit `v1.1.0` and push the tag.

`release.yml` then:

- runs the same quality gate;
- refuses the release if the tag is not `v` + `metadata.version`, or if
  `spec.runtime.image.repository` is not this repository's GHCR path;
- pushes `ghcr.io/<owner>/<name>:1.1.0` (and `:sha-<commit>`) with an SBOM and
  build provenance;
- creates the GitHub Release `v1.1.0` with `nexora-release.json`: version,
  full commit SHA, image digest.

Nexora reads `nexora-release.json` from the release. The repository needs no
Nexora secret.

A GitHub Release is a build, not a Nexora release. The product version is
released in Nexora by its release gate; the tag produces the image Nexora
records against the version's approved baseline.

To check a tag locally: `python scripts/nexora_release.py check v1.1.0 <owner>/<repo>`.

## OpenAPI

`contracts/openapi.yaml` is written by hand. `tests/test_openapi_coverage.py`
fails when the app serves a route the file does not document, or the file
documents a route the app no longer serves.
