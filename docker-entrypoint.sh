#!/bin/sh
set -eu

DATA_DIR="$(dirname "$DATABASE_PATH")"

if [ "$(id -u)" = "0" ]; then
  # Make sure a group/user with the requested IDs exist (fresh or restored volume).
  if ! getent group "$PGID" >/dev/null 2>&1; then
    addgroup --gid "$PGID" appuser || true
  fi
  if ! getent passwd "$PUID" >/dev/null 2>&1; then
    GROUP_NAME="$(getent group "$PGID" | cut -d: -f1)"
    adduser --uid "$PUID" --gid "$GROUP_NAME" --no-create-home appuser || true
  fi

  # Restore ownership of the data directory to PUID/PGID. This covers both a
  # fresh volume and one that was restored with foreign ownership; without it
  # the non-root process cannot write the database.
  mkdir -p "$DATA_DIR"
  chown -R "$PUID:$PGID" "$DATA_DIR" || true

  # Drop to PUID/PGID (setpriv ships with util-linux) and re-run this script.
  exec setpriv --reuid="$PUID" --regid="$PGID" --clear-groups "$0" "$@"
fi

exec bun .output/server/index.mjs
