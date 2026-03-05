#!/bin/bash
# ABG Alumni Connect - Supabase Migration Runner
#
# Usage:
#   bash supabase/run-migration.sh
#   DB_PASSWORD=<password> bash supabase/run-migration.sh
#
# Get your DB password from:
#   https://supabase.com/dashboard/project/ketrmymhnrtkiygjbtye/settings/database
#   Under "Connection string" → "URI" → extract password
#
# OR run the SQL manually at:
#   https://supabase.com/dashboard/project/ketrmymhnrtkiygjbtye/sql/new
#   Paste contents of supabase/full-migration.sql

set -e

# Ensure psql is available
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
if ! command -v psql &> /dev/null; then
  echo "psql not found. Installing..."
  brew install libpq
  brew link libpq --force
fi

PROJECT_REF="ketrmymhnrtkiygjbtye"
DB_HOST="db.$PROJECT_REF.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

# Get password from env or prompt
if [ -z "$DB_PASSWORD" ]; then
  echo "Enter your Supabase database password"
  echo "(Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database)"
  read -s -p "DB Password: " DB_PASSWORD
  echo ""
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATION_DIR="$SCRIPT_DIR/migrations"
DB_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"

echo ""
echo "=== ABG Alumni Connect - Supabase Migration ==="
echo "Project: $PROJECT_REF"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

echo "Testing connection..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "SELECT current_database(), current_user;" 2>&1
echo ""

echo "Running migration 001: Create tables..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -f "$MIGRATION_DIR/001_create_tables.sql"
echo "✓ Migration 001 done"
echo ""

echo "Running migration 002: RLS policies..."
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -f "$MIGRATION_DIR/002_rls_policies.sql"
echo "✓ Migration 002 done"
echo ""

echo "=== Verifying tables ==="
PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "=== Migration complete! Tables are ready. ==="
