# Database Migration Design: Local to Cloud PostgreSQL

**Date:** 2026-04-22  
**Objective:** Migrate local PostgreSQL database schema and data to cloud instance while preserving cloud database structure.

## Problem Statement

The application currently uses a local PostgreSQL database (`postgresql://apple@localhost:5432/edtech_lms`) but needs to migrate to a cloud instance (`postgresql://postgres:1qazZAQ!@192.168.33.55:5432/eduvin`). The cloud database already exists with an outdated schema from several commits back. We need to update the schema to match the current local version and load the latest data without destroying the cloud database.

## Approach

**Strategy:** Schema-first migration with data refresh
- Preserve cloud database structure (no drop/recreate)
- Sync schema from local to cloud (includes new tables and column changes)
- Clear all table data on cloud using TRUNCATE
- Load fresh data from local database

## Migration Process

### Phase 1: Schema Extraction
Export only the schema from the local database, excluding data:
```bash
pg_dump --schema-only edtech_lms > schema.sql
```

**Output:** Clean SQL file with table definitions, indexes, constraints, sequences, and views—no row data.

### Phase 2: Data Extraction
Export only the data from local database:
```bash
pg_dump --data-only edtech_lms > data.sql
```

**Output:** INSERT statements for all rows in all tables.

### Phase 3: Cloud Database Preparation
Connect to cloud database and clear existing data:
```sql
TRUNCATE ALL CASCADE;
```

**Purpose:** Removes all rows while preserving table structure and relationships.

### Phase 4: Apply Schema
Import schema dump into cloud database:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin < schema.sql
```

**Expected outcome:** 
- New tables from local schema are created
- Existing tables are altered to match local schema (new columns, constraints)
- Indexes and sequences synced

### Phase 5: Load Data
Import data dump into cloud database:
```bash
psql -h 192.168.33.55 -U postgres -d eduvin < data.sql
```

**Expected outcome:** Cloud tables populated with current local data.

### Phase 6: Verification
- Test cloud connection with updated `DATABASE_URL`
- Run basic queries to validate data integrity
- Check record counts match local database
- Verify constraints and indexes are present

## Technical Considerations

### Foreign Key Constraints
- `TRUNCATE ... CASCADE` handles cascading deletes properly
- Schema migration preserves all FK relationships
- Data reload respects FK constraints in correct order (handled by pg_dump)

### Sequences and Auto-Increment IDs
- Schema export includes sequence definitions
- Data import respects identity values, preventing ID conflicts
- No need for manual sequence reset

### Database Ownership
- Local database owned by `apple` user
- Cloud database will be owned by `postgres` user
- This is normal for cloud databases and doesn't affect functionality
- `--no-owner` flag used in dumps to avoid permission errors

### Downtime
- **Local DB:** ~1 minute during schema/data dump (reading, not destructive)
- **Cloud DB:** ~1 minute during TRUNCATE and restore (minimal impact)

## Rollback Plan

If migration fails:
1. Stop application (prevents writes to cloud DB)
2. Keep schema.sql and data.sql files as records
3. Re-run truncate and restore if needed
4. Application can be rolled back to local database by reverting `DATABASE_URL` env var

## Files Generated

- `schema.sql` — Cloud schema (temp file, safe to delete after migration)
- `data.sql` — Cloud data (temp file, safe to delete after migration)
- Cloud database backup (recommended after successful migration)

## Success Criteria

- ✅ Cloud database structure matches local database
- ✅ All tables present in cloud database
- ✅ All records from local database present in cloud database
- ✅ Foreign keys, indexes, and constraints intact
- ✅ Application connects successfully to cloud database
- ✅ Application tests pass against cloud database
