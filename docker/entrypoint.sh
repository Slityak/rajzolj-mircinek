#!/bin/sh
# Keeps the node_modules volume in sync with package-lock.json, then runs the given command.
set -e
if [ ! -f node_modules/.lock-hash ] || ! sha1sum -c --status node_modules/.lock-hash 2>/dev/null; then
  echo "package-lock.json changed, running npm ci…"
  npm ci
  sha1sum package-lock.json > node_modules/.lock-hash
fi
exec "$@"
