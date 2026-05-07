#!/bin/bash
export PGPASSWORD="1qazZAQ!"
echo "Testing cloud database connection..."
psql -h 192.168.33.55 -U postgres -d eduvin -c "SELECT version();" 2>&1
echo "Exit code: $?"
