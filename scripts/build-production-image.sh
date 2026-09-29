#!/usr/bin/env bash
# Build the hosted Control Plane image (packages/backend/Dockerfile).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Matches the repository component of the GHCR path this publishes to,
# ghcr.io/<org>/data-product-platform — and the tag `yarn build-image`
# produces. It used to be `pharma-data-factory:mvp-1.0`, which NXD-043 removed
# from the two files its test happened to read and left standing here, so the
# name it declared gone outlived it by six days. NXD-086.
TAG="${1:-data-product-platform:mvp-1.0}"

echo "==> Repo: $ROOT"
echo "==> Image tag: $TAG"

command -v docker >/dev/null || {
  echo "docker not found."
  echo "In the devcontainer this comes from the docker-in-docker feature in"
  echo ".devcontainer/devcontainer.json — rebuild the container if you just added it."
  exit 1
}

yarn install --immutable
yarn tsc
yarn build:backend

test -f packages/backend/dist/bundle.tar.gz
test -f packages/backend/dist/skeleton.tar.gz

docker build -f packages/backend/Dockerfile -t "$TAG" .

echo "OK: built $TAG"
echo "Next: yarn prod:env    # writes deploy/production.local.env, any platform"
echo "      yarn docker:prod:up"
