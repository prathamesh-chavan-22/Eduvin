# Database Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate local PostgreSQL database schema and data to cloud instance while preserving cloud database structure.

**Architecture:** Export schema and data separately from local DB, clear cloud DB tables, apply schema changes, load fresh data. Each phase is testable independently with clear rollback points.

**Tech Stack:** PostgreSQL (local and cloud), pg_dump, psql, bash

---

## Files

**Created/Modified:**
- `database-migration/` (temp directory for migration artifacts)
  - `schema.sql` — Schema-only dump from local DB
  - `data.sql` — Data-only dump from local DB
  - `verification.sql` — Queries to verify migration success
  - `migration.log` — Log of migration process

---

## Tasks

### Task 1: Pre-flight Checks

**Files:**
- Check: Local DB connectivity
- Check: Cloud DB connectivity

- [ ] **Step 1: Verify local PostgreSQL is running and accessible**

Run:
```bash
psql -U apple -d edtech_lms -c "SELECT version();"
```

Expected output: PostgreSQL version string (e.g., "PostgreSQL 18.3 (Homebrew)...")

- [ ] **Step 2: Verify you can connect to cloud PostgreSQL database**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT version();"
```

Expected output: PostgreSQL version string from cloud instance

If either test fails, stop here and troubleshoot connectivity.

- [ ] **Step 3: Create migration working directory**

Run:
```bash
mkdir -p /Users/apple/Dev/Web-App-Stack/database-migration
cd /Users/apple/Dev/Web-App-Stack/database-migration
```

---

### Task 2: Export Schema from Local Database

**Files:**
- Create: `database-migration/schema.sql`

- [ ] **Step 1: Dump schema-only from local database**

Run:
```bash
pg_dump -U apple -d edtech_lms --schema-only --no-owner --no-acl > /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql
```

Expected: Command completes silently, file created.

- [ ] **Step 2: Verify schema dump is not empty**

Run:
```bash
wc -l /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql
```

Expected: Output shows line count > 100 (should have hundreds of lines)

- [ ] **Step 3: Verify schema file contains CREATE TABLE statements**

Run:
```bash
grep -c "CREATE TABLE" /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql
```

Expected: Output is a number >= 10 (should contain many tables)

---

### Task 3: Export Data from Local Database

**Files:**
- Create: `database-migration/data.sql`

- [ ] **Step 1: Dump data-only from local database**

Run:
```bash
pg_dump -U apple -d edtech_lms --data-only --no-owner --no-acl > /Users/apple/Dev/Web-App-Stack/database-migration/data.sql
```

Expected: Command completes silently, file created.

- [ ] **Step 2: Verify data dump is not empty**

Run:
```bash
wc -l /Users/apple/Dev/Web-App-Stack/database-migration/data.sql
```

Expected: Output shows line count > 10 (should have INSERT statements)

- [ ] **Step 3: Check that data file contains INSERT statements**

Run:
```bash
grep -c "INSERT INTO" /Users/apple/Dev/Web-App-Stack/database-migration/data.sql
```

Expected: Output is a number > 0 (confirms there is data to migrate)

---

### Task 4: Prepare Cloud Database

**Files:**
- None (database operations only)

- [ ] **Step 1: Connect to cloud database and check existing tables**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin -c "\dt" | head -20
```

Expected: Lists existing tables (may be empty or have old schema)

- [ ] **Step 2: Clear all data from cloud database using TRUNCATE CASCADE**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin << 'EOF'
TRUNCATE ALL CASCADE;
EOF
```

Expected: Message like "TRUNCATE TABLE" or similar confirmation

- [ ] **Step 3: Verify all tables are now empty**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public';" | wc -l
```

Expected: Output shows few lines (tables exist, but are empty)

---

### Task 5: Apply Schema to Cloud Database

**Files:**
- Use: `database-migration/schema.sql`

- [ ] **Step 1: Restore schema to cloud database**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin < /Users/apple/Dev/Web-App-Stack/database-migration/schema.sql > /Users/apple/Dev/Web-App-Stack/database-migration/migration.log 2>&1
```

Expected: Command completes (may take 10-30 seconds)

- [ ] **Step 2: Check migration log for errors**

Run:
```bash
tail -50 /Users/apple/Dev/Web-App-Stack/database-migration/migration.log
```

Expected: Last lines show successful completion (no ERROR keywords; psql exits cleanly)

If you see ERROR messages, review them and stop to troubleshoot.

- [ ] **Step 3: Verify schema was applied by checking table count**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';"
```

Expected: Output shows a number >= 10 (matches local database table count)

---

### Task 6: Load Data to Cloud Database

**Files:**
- Use: `database-migration/data.sql`

- [ ] **Step 1: Restore data to cloud database**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin < /Users/apple/Dev/Web-App-Stack/database-migration/data.sql >> /Users/apple/Dev/Web-App-Stack/database-migration/migration.log 2>&1
```

Expected: Command completes (may take 30 seconds to 1+ minute depending on data volume)

- [ ] **Step 2: Check for errors in migration log**

Run:
```bash
grep -i "error" /Users/apple/Dev/Web-App-Stack/database-migration/migration.log | head -10
```

Expected: No lines returned (no errors in log), or only non-critical messages

- [ ] **Step 3: Verify data was loaded by checking a specific table**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT COUNT(*) as user_count FROM users LIMIT 5;"
```

Expected: Shows a count (number of users in cloud DB, should be > 0)

---

### Task 7: Verify Migration Integrity

**Files:**
- Create: `database-migration/verification.sql`
- Use: `database-migration/schema.sql`

- [ ] **Step 1: Create verification query file**

Create file `/Users/apple/Dev/Web-App-Stack/database-migration/verification.sql` with:

```sql
-- Verification queries for database migration
\echo '=== TABLE COUNT COMPARISON ==='
SELECT 'Cloud tables' as source, COUNT(*) as count FROM pg_tables WHERE schemaname='public';

\echo '=== SAMPLE DATA COUNTS ==='
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'modules', COUNT(*) FROM modules
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments;

\echo '=== VERIFY INDEXES EXIST ==='
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname='public';

\echo '=== VERIFY CONSTRAINTS ==='
SELECT COUNT(*) as constraint_count FROM information_schema.table_constraints WHERE table_schema='public';

\echo '=== MIGRATION COMPLETE ==='
```

- [ ] **Step 2: Run verification queries against cloud database**

Run:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin < /Users/apple/Dev/Web-App-Stack/database-migration/verification.sql
```

Expected: All SELECT queries execute successfully and show counts > 0

- [ ] **Step 3: Compare local and cloud table counts**

Run:
```bash
echo "=== LOCAL TABLE COUNT ===" && psql -U apple -d edtech_lms -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" && echo "=== CLOUD TABLE COUNT ===" && psql -h 192.168.33.55 -U postgres -d eduvin -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';"
```

Expected: Both counts are identical (same number of tables)

- [ ] **Step 4: Sample verify a record exists in cloud from local**

Run:
```bash
echo "=== SAMPLE: First user in local DB ===" && psql -U apple -d edtech_lms -t -c "SELECT id, email FROM users LIMIT 1;" && echo "=== SAMPLE: First user in cloud DB ===" && psql -h 192.168.33.55 -U postgres -d eduvin -t -c "SELECT id, email FROM users LIMIT 1;"
```

Expected: Both queries return the same user (same ID and email)

---

### Task 8: Test Application Connection to Cloud Database

**Files:**
- Modify: `/Users/apple/Dev/Web-App-Stack/server_py/.env`
- Test: Application can connect and query

- [ ] **Step 1: Verify current .env is pointing to local database**

Run:
```bash
grep DATABASE_URL /Users/apple/Dev/Web-App-Stack/server_py/.env
```

Expected: Shows `DATABASE_URL=postgresql://apple@localhost:5432/edtech_lms`

- [ ] **Step 2: Create backup of current .env**

Run:
```bash
cp /Users/apple/Dev/Web-App-Stack/server_py/.env /Users/apple/Dev/Web-App-Stack/server_py/.env.backup.local
```

Expected: Backup file created

- [ ] **Step 3: Update .env to point to cloud database**

Run:
```bash
cat > /Users/apple/Dev/Web-App-Stack/server_py/.env << 'EOF'
DATABASE_URL=postgresql://postgres:1qazZAQ!@192.168.33.55:5432/eduvin

MISTRAL_API_KEY=<REMOVED_API_KEY>
GROQ_API_KEY=<REMOVED_API_KEY>

# Session Secret (change in production)
SESSION_SECRET=testkeyfordevelopment

# Server Port
PORT=5000
EOF
```

Expected: File updated with cloud database URL

- [ ] **Step 4: Verify .env was updated correctly**

Run:
```bash
grep DATABASE_URL /Users/apple/Dev/Web-App-Stack/server_py/.env
```

Expected: Shows `DATABASE_URL=postgresql://postgres:1qazZAQ!@192.168.33.55:5432/eduvin`

---

### Task 9: Final Migration Summary

**Files:**
- Review: `database-migration/migration.log`
- Cleanup (optional): migration artifacts

- [ ] **Step 1: Create migration summary in log**

Run:
```bash
cat >> /Users/apple/Dev/Web-App-Stack/database-migration/migration.log << 'EOF'

=== MIGRATION SUMMARY ===
Date: $(date)
Source: postgresql://apple@localhost:5432/edtech_lms
Target: postgresql://postgres:1qazZAQ!@192.168.33.55:5432/eduvin
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
- Keep migration artifacts for reference/rollback
EOF
```

Expected: Summary appended to migration.log

- [ ] **Step 2: Display final migration status**

Run:
```bash
tail -30 /Users/apple/Dev/Web-App-Stack/database-migration/migration.log
```

Expected: Shows migration summary with completion status

- [ ] **Step 3: Commit migration artifacts and .env update**

Run:
```bash
cd /Users/apple/Dev/Web-App-Stack && git add -A && git commit -m "chore: migrate database to cloud PostgreSQL

- Exported schema from local edtech_lms database
- Exported data from local database
- Applied schema to cloud eduvin database
- Loaded data to cloud instance
- Updated server .env to use cloud DATABASE_URL
- Migration artifacts stored in database-migration/ for reference

Local database backup: .env.backup.local
Cloud instance: postgresql://postgres:*@192.168.33.55:5432/eduvin

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: Commit succeeds with message

---

## Success Criteria

- ✅ Schema dump created from local DB (schema.sql exists and is valid)
- ✅ Data dump created from local DB (data.sql exists and is valid)
- ✅ Cloud database tables cleared (TRUNCATE ALL CASCADE succeeded)
- ✅ Schema applied to cloud database (no errors in migration.log)
- ✅ Data loaded to cloud database (no errors in migration.log)
- ✅ Table count matches between local and cloud
- ✅ Sample records verified to exist in cloud
- ✅ Application .env updated to point to cloud database
- ✅ Migration artifacts and logs preserved
- ✅ Changes committed to git

## Rollback Plan

If migration fails at any point before Task 8:

1. **Before Task 5 (schema apply):** Cloud DB is still intact with old schema. Keep local backups and retry from Task 4.
2. **Before Task 6 (data load):** Cloud DB has new schema but no data. Can reload data again from data.sql.
3. **After Task 8 (env updated):** Revert .env to .env.backup.local to rollback application to local database.

```bash
# Quick rollback to local database
cp /Users/apple/Dev/Web-App-Stack/server_py/.env.backup.local /Users/apple/Dev/Web-App-Stack/server_py/.env
# Restart application server
```

---

## Migration Artifacts

After successful migration, these files can be kept for reference or deleted:
- `database-migration/schema.sql` — Schema dump (can be regenerated)
- `database-migration/data.sql` — Data dump (data now in cloud)
- `database-migration/migration.log` — Log of migration process (keep for audit trail)
- `server_py/.env.backup.local` — Backup of local .env (keep for rollback)
