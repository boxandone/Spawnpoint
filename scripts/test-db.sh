#!/usr/bin/env bash
# Runs the pgTAP suite in supabase/tests.
#
# 1. If the Supabase CLI is installed and the local stack is running, this is
#    just `supabase test db` (the same thing CI runs).
# 2. Otherwise it starts a throwaway Postgres with pgTAP, applies a small
#    Supabase shim, the migrations, and seed.sql, then runs pg_prove.
#    Needs: Postgres 15+ server binaries, the pgtap extension, and pg_prove.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v supabase >/dev/null 2>&1 && supabase status >/dev/null 2>&1; then
  echo "Using the running Supabase stack."
  exec supabase test db
fi

echo "Supabase stack not running; using a throwaway local Postgres."

PGBIN="${PGBIN:-}"
if [[ -z "$PGBIN" ]]; then
  if command -v pg_config >/dev/null 2>&1; then PGBIN="$(pg_config --bindir)"; fi
  if [[ -z "$PGBIN" || ! -x "$PGBIN/initdb" ]]; then
    PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  fi
fi
for bin in initdb pg_ctl psql; do
  [[ -x "$PGBIN/$bin" ]] || { echo "Missing $bin (set PGBIN)."; exit 1; }
done
command -v pg_prove >/dev/null 2>&1 || { echo "Missing pg_prove (install pgtap's pg_prove)."; exit 1; }

WORK="$(mktemp -d)"
PORT="${SP_TEST_PG_PORT:-54329}"
AS=()
if [[ "$(id -u)" == "0" ]]; then
  # initdb refuses to run as root; use the postgres system user.
  chown -R postgres "$WORK"
  AS=(runuser -u postgres --)
fi

cleanup() {
  "${AS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${AS[@]}" "$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"${AS[@]}" "$PGBIN/pg_ctl" -D "$WORK/data" -l "$WORK/log" -w \
  -o "-p $PORT -k $WORK -c listen_addresses=''" start >/dev/null

PSQL=("$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f scripts/db/supabase_shim.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f supabase/seed.sql

pg_prove -h "$WORK" -p "$PORT" -U postgres -d postgres --ext .sql supabase/tests/*.test.sql
