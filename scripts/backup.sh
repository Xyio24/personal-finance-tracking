#!/bin/sh
# Runs inside the `backup` container (see docker-compose.yml).
# Writes a compressed pg_dump to /backups once a day and deletes dumps older than
# BACKUP_KEEP_DAYS. Connection settings come from the PG* environment variables.
set -eu
set -o pipefail

KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
# Dumps contain personal financial data: readable by the owner only.
umask 077

while true; do
  file="/backups/finance-$(date +%Y-%m-%d_%H%M).sql.gz"
  if pg_dump --no-owner --clean --if-exists | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "Backup written: $file"
  else
    rm -f "$file.tmp"
    echo "Backup FAILED" >&2
  fi
  find /backups -name 'finance-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
  sleep 86400
done
