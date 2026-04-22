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
