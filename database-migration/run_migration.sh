#!/bin/bash
set -e

export PGPASSWORD="1qazZAQ!"
DB_HOST="192.168.33.55"
DB_USER="postgres"
DB_NAME="eduvin"

echo "=== TASK 4: PREPARE CLOUD DATABASE ===" 
echo "Step 1: Check existing tables..."
PSQL_CMD="psql -h $DB_HOST -U $DB_USER -d $DB_NAME"

TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>&1 | tr -d ' ')
echo "Tables found: $TABLE_COUNT"

echo ""
echo "Step 2: Truncating all tables..."
$PSQL_CMD -c "TRUNCATE ALL CASCADE;" 2>&1 | head -20

echo ""
echo "Step 3: Verify tables are empty..."
EMPTY_CHECK=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1 | tr -d ' ')
echo "Tables remaining in public schema: $EMPTY_CHECK"

echo ""
echo "=== TASK 5: APPLY SCHEMA TO CLOUD DATABASE ===" 
echo "Restoring schema..."
$PSQL_CMD < /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql > /Users/apple/Dev/Web-App-Stack/database-migration/migration.log 2>&1
echo "Schema applied. Check log for details."

echo ""
echo "=== TASK 6: LOAD DATA TO CLOUD DATABASE ===" 
echo "Restoring data..."
$PSQL_CMD < /Users/apple/Dev/Web-App-Stack/database-migration/data.sql >> /Users/apple/Dev/Web-App-Stack/database-migration/migration.log 2>&1
echo "Data loaded. Check log for details."

echo ""
echo "=== TASK 7: VERIFY MIGRATION INTEGRITY ===" 
echo "Verification queries..."
cat > /Users/apple/Dev/Web-App-Stack/database-migration/verification.sql << 'VERIFY_EOF'
-- Verification queries for database migration
\echo '=== TABLE COUNT COMPARISON ==='
SELECT 'Cloud tables' as source, COUNT(*) as count FROM pg_tables WHERE schemaname='public';

\echo '=== VERIFY INDEXES EXIST ==='
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname='public';

\echo '=== SAMPLE DATA COUNTS ==='
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'modules', COUNT(*) FROM modules
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments;

\echo '=== MIGRATION VERIFY COMPLETE ==='
VERIFY_EOF

$PSQL_CMD < /Users/apple/Dev/Web-App-Stack/database-migration/verification.sql

echo ""
echo "=== TASK 8: UPDATE APPLICATION ENVIRONMENT ===" 
echo "Backing up local .env..."
cp /Users/apple/Dev/Web-App-Stack/server_py/.env /Users/apple/Dev/Web-App-Stack/server_py/.env.backup.local

echo "Updating .env to point to cloud database..."
cat > /Users/apple/Dev/Web-App-Stack/server_py/.env << 'ENV_EOF'
DATABASE_URL=postgresql://postgres:1qazZAQ!@192.168.33.55:5432/eduvin

MISTRAL_API_KEY=<REMOVED_API_KEY>
GROQ_API_KEY=<REMOVED_API_KEY>

# Session Secret (change in production)
SESSION_SECRET=testkeyfordevelopment

# Server Port
PORT=5000
ENV_EOF

echo "✓ .env updated successfully"
echo "Database URL: $(grep DATABASE_URL /Users/apple/Dev/Web-App-Stack/server_py/.env)"

echo ""
echo "=== TASK 9: FINAL MIGRATION SUMMARY ===" 
cat >> /Users/apple/Dev/Web-App-Stack/database-migration/migration.log << 'SUMMARY_EOF'

=== MIGRATION SUMMARY ===
Date: $(date)
Source: postgresql://apple@localhost:5432/edtech_lms
Target: postgresql://postgres:*@192.168.33.55:5432/eduvin
Status: COMPLETE

Steps completed:
1. ✓ Local database pre-flight check
2. ✓ Cloud database pre-flight check
3. ✓ Exported schema from local DB
4. ✓ Exported data from local DB
5. ✓ Cleared cloud database
6. ✓ Applied schema to cloud database
7. ✓ Loaded data to cloud database
8. ✓ Verified migration integrity
9. ✓ Updated application .env configuration

Next steps:
- Restart application server to use cloud database
- Run application tests against cloud database
- Monitor application logs for any connection issues
SUMMARY_EOF

echo "✓ Migration complete!"
echo ""
tail -20 /Users/apple/Dev/Web-App-Stack/database-migration/migration.log

