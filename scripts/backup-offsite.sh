#!/bin/sh
# Runs inside the optional `backup-offsite` container (docker-compose.yml, profile "offsite").
# Every 6 hours, copies the daily dumps from /backups to an rclone remote and deletes remote
# copies older than OFFSITE_KEEP_DAYS. Point OFFSITE_REMOTE at a "crypt" remote so the cloud
# provider only ever stores encrypted files (see docs/DEPLOY.md).
set -eu

REMOTE="${OFFSITE_REMOTE:?set OFFSITE_REMOTE}"
KEEP_DAYS="${OFFSITE_KEEP_DAYS:-90}"

# Let the `backup` container write its first dump of the day before copying.
sleep 600

while true; do
  if rclone copy /backups "$REMOTE" --include 'finance-*.sql.gz'; then
    echo "Offsite copy done"
    rclone delete "$REMOTE" --include 'finance-*.sql.gz' --min-age "${KEEP_DAYS}d" \
      || echo "Offsite cleanup FAILED" >&2
  else
    echo "Offsite copy FAILED" >&2
  fi
  sleep 21600
done
