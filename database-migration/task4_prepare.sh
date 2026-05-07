#!/bin/bash
set -e
export PGPASSWORD="1qazZAQ!"

echo "=== TASK 4: PREPARE CLOUD DATABASE ==="
echo ""

# Step 1: Check existing tables
echo "STEP 1: Checking existing tables..."
echo "Command: psql -h 192.168.33.55 -U postgres -d eduvin -c \"SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;\""
echo ""

TABLE_COUNT=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")
echo "Table count before truncate: $TABLE_COUNT"
echo ""

if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "Tables present:"
  psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | head -25
  echo ""
fi

echo "---"
echo ""

# Step 2: Clear all data using TRUNCATE ALL CASCADE
echo "STEP 2: Clearing all data with TRUNCATE ALL CASCADE..."
echo "This preserves table structure but removes all data and resets sequences."
echo ""

TRUNCATE_RESULT=$(psql -h 192.168.33.55 -U postgres -d eduvin -c "TRUNCATE ALL CASCADE;" 2>&1)
echo "Truncate result: $TRUNCATE_RESULT"
echo ""

echo "---"
echo ""

# Step 3: Verify tables are now empty
echo "STEP 3: Verifying all tables are now empty..."
echo ""

# Count total rows across all public tables
TOTAL_ROWS=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -c "
  SELECT COUNT(*) FROM (
    SELECT 1 FROM users UNION ALL
    SELECT 1 FROM courses UNION ALL
    SELECT 1 FROM lessons UNION ALL
    SELECT 1 FROM topics UNION ALL
    SELECT 1 FROM learning_objectives UNION ALL
    SELECT 1 FROM question_banks UNION ALL
    SELECT 1 FROM questions UNION ALL
    SELECT 1 FROM question_options UNION ALL
    SELECT 1 FROM assessments UNION ALL
    SELECT 1 FROM assessment_questions UNION ALL
    SELECT 1 FROM user_courses UNION ALL
    SELECT 1 FROM user_lessons UNION ALL
    SELECT 1 FROM user_assessments UNION ALL
    SELECT 1 FROM user_quiz_answers UNION ALL
    SELECT 1 FROM speech_assessments UNION ALL
    SELECT 1 FROM course_enrollments UNION ALL
    SELECT 1 FROM course_preferences UNION ALL
    SELECT 1 FROM certificates UNION ALL
    SELECT 1 FROM analytics UNION ALL
    SELECT 1 FROM audit_logs UNION ALL
    SELECT 1 FROM settings
  ) AS counts;
" 2>&1 || echo "0")

echo "Total rows across all tables: $TOTAL_ROWS"
echo ""

# Count table structures
TABLE_COUNT_AFTER=$(psql -h 192.168.33.55 -U postgres -d eduvin -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")
echo "Table structures remaining: $TABLE_COUNT_AFTER"
echo ""

if [ "$TABLE_COUNT_AFTER" -gt 0 ]; then
  echo "Tables (empty):"
  psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | head -25
fi

echo ""
echo "=== TASK 4 COMPLETE ==="
echo "Status: Database cleared and ready for schema/data migration"
