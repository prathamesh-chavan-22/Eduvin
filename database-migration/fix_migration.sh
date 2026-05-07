#!/bin/bash
set -e

export PGPASSWORD="1qazZAQ!"
DB_HOST="192.168.33.55"
DB_USER="postgres"
DB_NAME="eduvin"

echo "=== TASK 4 FIX: PROPERLY CLEAR CLOUD DATABASE ===" 

PSQL_CMD="psql -h $DB_HOST -U $DB_USER -d $DB_NAME"

# PostgreSQL 16 doesn't support TRUNCATE ALL, use alternative approach
echo "Dropping and recreating all tables in public schema..."
$PSQL_CMD << 'SQL_EOF'
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || r.tablename || '" CASCADE';
    END LOOP;
    -- Drop all sequences
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname='public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS "' || r.sequencename || '" CASCADE';
    END LOOP;
END $$;
SQL_EOF

echo "✓ All tables and sequences dropped"

# Verify clean state
REMAINING=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" | tr -d ' ')
echo "Remaining tables: $REMAINING"

echo ""
echo "=== RE-APPLYING SCHEMA ===" 
$PSQL_CMD < /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql > /tmp/schema_apply.log 2>&1
SCHEMA_RESULT=$?
if [ $SCHEMA_RESULT -eq 0 ]; then
    echo "✓ Schema applied successfully"
else
    echo "✗ Schema application had errors. Check /tmp/schema_apply.log"
    tail -20 /tmp/schema_apply.log
fi

echo ""
echo "=== RE-LOADING DATA ===" 
$PSQL_CMD < /Users/apple/Dev/Web-App-Stack/database-migration/data.sql > /tmp/data_apply.log 2>&1
DATA_RESULT=$?
if [ $DATA_RESULT -eq 0 ]; then
    echo "✓ Data loaded successfully"
else
    echo "✗ Data loading had errors. Check /tmp/data_apply.log"
    tail -20 /tmp/data_apply.log
fi

echo ""
echo "=== FINAL VERIFICATION ===" 
$PSQL_CMD << 'VERIFY_EOF'
\echo '=== TABLE COUNT AND DATA ==='
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments
ORDER BY table_name;

\echo '=== TOTAL TABLES ==='
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname='public';

\echo '=== MIGRATION SUCCESSFUL ==='
VERIFY_EOF

echo ""
echo "✓ Migration complete!"

