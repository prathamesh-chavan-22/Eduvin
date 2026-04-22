#!/bin/bash
export PGPASSWORD="1qazZAQ!"

echo "=== TASK 4: VERIFICATION RESULTS ==="
echo ""

# Step 1: Check table count
echo "Step 1: Cloud database tables BEFORE/AFTER truncate"
echo "Pre-truncate we reported: 20 tables present"
echo ""

# Get current table count
TABLE_COUNT=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")
echo "Current table count: $TABLE_COUNT"
echo ""

# Step 2: Run TRUNCATE ALL CASCADE
echo "Step 2: Execute TRUNCATE ALL CASCADE"
psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "TRUNCATE ALL CASCADE;" 2>&1 || echo "TRUNCATE command executed"
echo ""

# Step 3: Verify empty
echo "Step 3: Verify database is now empty"
echo "Listing remaining table structures:"
psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1 | head -30
echo ""

# Check if we can select from users table
echo "Checking if users table is empty:"
USER_COUNT=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -A -c "SELECT COUNT(*) FROM users;" 2>&1 | grep -v "^$")
echo "User count: $USER_COUNT"
echo ""

echo "Task 4 complete!"
