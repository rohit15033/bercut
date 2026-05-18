#!/usr/bin/env bash
# Run pending DB migrations on every deploy. Safe to re-run — all migration files are idempotent.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export PGPASSWORD="$DB_PASSWORD"
PSQL="psql -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -q"

# Create tracking table if this is the first run
$PSQL -c "CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

applied=0
skipped=0

for f in "$SCRIPT_DIR"/migrate_*.sql; do
  name=$(basename "$f")
  already=$($PSQL -t -c "SELECT COUNT(*) FROM schema_migrations WHERE filename = '$name';" | tr -d ' \n')
  if [ "$already" -eq 0 ]; then
    echo "  [migrate] Applying $name ..."
    $PSQL -f "$f"
    $PSQL -c "INSERT INTO schema_migrations (filename) VALUES ('$name');"
    applied=$((applied + 1))
  else
    skipped=$((skipped + 1))
  fi
done

echo "[migrate] Done — applied=$applied skipped=$skipped"
