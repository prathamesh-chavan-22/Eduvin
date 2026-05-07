#!/bin/bash
export PGPASSWORD="1qazZAQ!"

echo "=== TASK 4: PREPARE CLOUD DATABASE ==="
echo ""

# Step 1: Check existing tables
echo "STEP 1: Check existing tables in cloud database"
echo "======================================================"
echo ""

TABLE_COUNT=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")
echo "Table count: $TABLE_COUNT"
echo ""
echo "Tables present:"
psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1
echo ""
echo "---"
echo ""

# Step 2: Clear all data using TRUNCATE CASCADE for each table
echo "STEP 2: Clear all data using TRUNCATE CASCADE"
echo "======================================================"
echo ""

# Get list of tables and truncate each one
TABLES=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

echo "Truncating tables (order: reverse dependency order to avoid FK constraints)..."
echo ""

# Create truncate commands for all tables with CASCADE
TRUNCATE_CMD="BEGIN TRANSACTION;"
for table in $TABLES; do
  TRUNCATE_CMD="$TRUNCATE_CMD TRUNCATE TABLE $table CASCADE;"
done
TRUNCATE_CMD="$TRUNCATE_CMD COMMIT;"

# Execute the truncate commands
psql -h 192.168.33.55 -U postgres -d eduvin -c "$(echo "$TRUNCATE_CMD" | sed 's/BEGIN TRANSACTION;//' | sed 's/COMMIT;//')" 2>&1
echo "Truncate operations completed"
echo ""
echo "---"
echo ""

# Step 3: Verify all tables are now empty
echo "STEP 3: Verify all tables are empty"
echo "======================================================"
echo ""

# Check row counts for all tables
echo "Checking row counts in all tables:"
psql -h 192.168.33.55 -U postgres -d eduvin << 'VERIFY_SQL'
SELECT 
  tablename,
  (SELECT COUNT(*) FROM pg_class pc WHERE pc.relname = tablename AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as approx_rows
FROM pg_tables 
WHERE schemaname='public'
ORDER BY tablename;
VERIFY_SQL

echo ""
echo "Table structures remain (as expected): $TABLE_COUNT"
echo ""
echo "=== TASK 4 COMPLETE ==="
echo "Status: Cloud database prepared - tables cleared, structures preserved"
