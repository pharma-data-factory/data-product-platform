#!/usr/bin/env bash
# One command to get Nexora running in Docker.
#
#   ./start.sh              build what is missing, start, wait for health
#   ./start.sh --rebuild    force a fresh backend bundle and image
#   ./start.sh --fast       skip the bundle build (reuse the existing one)
#   ./start.sh --logs       follow the container log after it is healthy
#   ./start.sh --down       stop the stack, keep the data
#   ./start.sh --destroy    stop the stack and delete the volumes
#
# For a remote workspace (Ona, Gitpod, Codespaces) this is the WRONG script:
# the browser is outside the container and localhost:7007 is not reachable.
# Use scripts/ona-dev.sh — see START.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SERVICE=nexora
PORT=7007
URL="http://localhost:${PORT}"
BUNDLE="packages/backend/dist/bundle.tar.gz"
SKELETON="packages/backend/dist/skeleton.tar.gz"
HEALTH_TIMEOUT=300   # first start runs migrations and the catalog; be patient

REBUILD=0
FAST=0
FOLLOW=0

say()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Subcommands that exit early ───────────────────────────────────────────────

case "${1:-}" in
  --down)
    say "Stopping the stack (data kept)"
    exec docker compose down
    ;;
  --destroy)
    # Deleting the volumes drops the database AND the Create-authorization
    # audit records (CC-001), so it asks first rather than assuming.
    read -r -p "Delete the database and audit volumes? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || die "Cancelled."
    exec docker compose down -v
    ;;
  --help|-h)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
esac

for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    --fast)    FAST=1 ;;
    --logs)    FOLLOW=1 ;;
    *) die "Unknown option: $arg (try --help)" ;;
  esac
done

# ── Database password drift ───────────────────────────────────────────────────
#
# PostgreSQL applies POSTGRES_PASSWORD only when it initialises an empty data
# directory. A volume created by an earlier run keeps whatever password it was
# given then, so changing POSTGRES_PASSWORD (or the compose default changing
# under you) leaves the backend unable to authenticate while the database
# itself looks perfectly healthy.
#
# It is worth detecting because it is almost invisible: `docker compose exec db
# psql -U nexora` SUCCEEDS, because pg_hba.conf trusts local and 127.0.0.1
# connections without checking the password. Only a TCP connection from another
# container — exactly what the backend does — hits the scram-sha-256 rule and
# fails. So the obvious way to test the credentials reports that they are fine.
#
# The fix keeps the data: ALTER USER, never `down -v`.
check_database_password() {
  local user="${POSTGRES_USER:-nexora}"
  local pass="${POSTGRES_PASSWORD:-nexora_dev_pass}"

  for _ in $(seq 1 20); do
    docker compose exec -T db pg_isready -U "$user" >/dev/null 2>&1 && break
    sleep 1
  done

  # -h db forces the TCP path the backend uses. -h 127.0.0.1 would be trusted
  # and would pass even when the password is wrong.
  if docker compose exec -T db env PGPASSWORD="$pass" \
       psql -h db -U "$user" -d "$user" -c 'select 1' >/dev/null 2>&1; then
    return 0
  fi

  warn "The database rejects the configured password."
  cat >&2 <<EOF

  The '${user}' role in the existing volume was created with a different
  password. PostgreSQL only reads POSTGRES_PASSWORD when it first initialises
  the data directory, so the value in your environment is being ignored.

  Fix it without losing data:

    docker compose exec -T db psql -U ${user} -d ${user} \\
      -c "ALTER USER ${user} WITH PASSWORD '${pass}';"
    docker compose restart ${SERVICE}

  Only if the data is genuinely disposable:  ./start.sh --destroy

EOF
  die "Stopping here rather than waiting 300s for a startup that cannot succeed."
}

# ── Preflight ─────────────────────────────────────────────────────────────────

command -v docker >/dev/null 2>&1 || die "docker not found."
docker info >/dev/null 2>&1 || die "The Docker daemon is not reachable. Start Docker and retry."
command -v node >/dev/null 2>&1 || die "node not found. This repository needs Node 22 or 24."
command -v yarn >/dev/null 2>&1 || die "yarn not found. Run 'corepack enable'."

# Port 7007 in use by something that is not our container is the trap that
# costs the most time: the stack starts, the health check passes against the
# *other* process, and nothing behaves as expected. Catch it here.
if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${PORT}\b"; then
  if ! docker compose ps --status running 2>/dev/null | grep -q "$SERVICE"; then
    die "Port ${PORT} is already in use by another process — a 'yarn start' or
       scripts/ona-dev.sh session is the usual cause. Stop it first:
         pkill -f 'backstage-cli'"
  fi
fi

# ── Dependencies ──────────────────────────────────────────────────────────────

if [ ! -d node_modules ]; then
  say "Installing dependencies (first run — this takes a few minutes)"
  yarn install --immutable
fi

# ── Backend bundle ────────────────────────────────────────────────────────────
#
# packages/backend/Dockerfile COPIES these two tarballs into the image; it does
# not build them. Without this step 'docker compose up --build' fails on a
# missing file, which is the single most common way this goes wrong.

if [ "$REBUILD" = 1 ] || { [ "$FAST" != 1 ] && [ ! -f "$BUNDLE" ]; }; then
  say "Building the backend bundle"
  yarn build:backend
elif [ ! -f "$BUNDLE" ] || [ ! -f "$SKELETON" ]; then
  die "--fast was given but $BUNDLE is missing. Run without --fast."
else
  say "Reusing the existing backend bundle ($(date -r "$BUNDLE" '+%Y-%m-%d %H:%M'))"
fi

# ── Start ─────────────────────────────────────────────────────────────────────

say "Starting PostgreSQL and the Control Plane"
if [ "$REBUILD" = 1 ]; then
  docker compose build --no-cache "$SERVICE"
fi
docker compose up -d --build "$SERVICE"

check_database_password

# ── Wait for health ───────────────────────────────────────────────────────────

say "Waiting for the backend (first start runs migrations, up to ${HEALTH_TIMEOUT}s)"
deadline=$(( SECONDS + HEALTH_TIMEOUT ))
while true; do
  if curl -sf -o /dev/null "${URL}/.backstage/health/v1/readiness"; then
    break
  fi
  if ! docker compose ps --status running 2>/dev/null | grep -q "$SERVICE"; then
    echo
    docker compose logs --tail 40 "$SERVICE"
    die "The container stopped. The last 40 log lines are above."
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo
    docker compose logs --tail 40 "$SERVICE"
    die "Still not healthy after ${HEALTH_TIMEOUT}s. The last 40 log lines are above."
  fi
  printf '.'
  sleep 3
done

echo
say "Ready — ${URL}"
echo "    Sign in with 'Continue as Guest'."
echo
echo "    docker compose logs -f ${SERVICE}   follow the log"
echo "    ./start.sh --down                   stop, keep the data"
echo "    ./start.sh --destroy                stop and delete the volumes"

if [ "$FOLLOW" = 1 ]; then
  echo
  exec docker compose logs -f "$SERVICE"
fi
