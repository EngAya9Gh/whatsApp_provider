#!/usr/bin/env bash
# Nightly backup of what the server holds: MySQL (mysqldump), the WhatsApp QR session credentials
# (sessions/ — losing them means every QR number must be scanned again), the uploaded files (uploads/),
# and MongoDB when mongodump is installed (Atlas paid tiers keep their own backups; the free tier has none).
#
# Keeps BACKUP_KEEP_DAYS (7) daily folders under BACKUP_DIR (../backups next to the project), and copies
# each day's folder to BACKUP_COPY_TO when set: an rclone remote path ("r2:wakeel-backups") or an
# "s3://bucket/path" for the aws CLI. A backup that only lives on the same disk is not a backup.
#
# Run it by hand first, then from cron (the log line of each run is in logs/backup.log):
#   crontab -e  →  15 3 * * *  cd /path/to/whatsApp_provider && scripts/backup/backup.sh >> logs/backup.log 2>&1
#
# Restore: README.md next to this file. Try a restore once on another machine: a backup that was never
# restored is a hope, not a backup.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Settings from .env (values already in the environment win, e.g. DATABASE_URL=... scripts/backup/backup.sh)
eval "$(node -e "require('dotenv').config({ quiet: true }); for (const k of ['DATABASE_URL', 'MONGO_URI']) if (process.env[k]) console.log(k + '=' + JSON.stringify(process.env[k]))")"
: "${DATABASE_URL:?DATABASE_URL is not set}"

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/../backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
MYSQLDUMP="${MYSQLDUMP:-mysqldump}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"
mkdir -p "$DEST" logs

# mysql://user:pass@host:port/db?params → the parts mysqldump needs (the password goes through MYSQL_PWD, not the command line)
eval "$(node -e "
  const u = new URL(process.env.DATABASE_URL);
  const out = { DB_HOST: u.hostname, DB_PORT: u.port || '3306', DB_USER: decodeURIComponent(u.username), DB_PASS: decodeURIComponent(u.password), DB_NAME: u.pathname.replace(/^\//, '') };
  for (const [k, v] of Object.entries(out)) console.log(k + '=' + JSON.stringify(v));
")"

echo "[$STAMP] MySQL $DB_NAME@$DB_HOST → $DEST/mysql.sql.gz"
MYSQL_PWD="$DB_PASS" "$MYSQLDUMP" --single-transaction --quick --routines --triggers --no-tablespaces \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip > "$DEST/mysql.sql.gz"

# QR credentials and uploads: skip the *_trash_* folders of logged-out numbers
if [ -d sessions ] || [ -d uploads ]; then
  echo "[$STAMP] sessions/ + uploads/ → $DEST/files.tgz"
  tar --exclude='sessions/*_trash_*' -czf "$DEST/files.tgz" $( [ -d sessions ] && echo sessions ) $( [ -d uploads ] && echo uploads )
fi

if [ -n "${MONGO_URI:-}" ] && command -v mongodump >/dev/null 2>&1; then
  echo "[$STAMP] MongoDB → $DEST/mongo.archive.gz"
  mongodump --uri="$MONGO_URI" --archive="$DEST/mongo.archive.gz" --gzip --quiet
else
  echo "[$STAMP] MongoDB skipped (no mongodump on this machine or no MONGO_URI): rely on Atlas backups or install mongodb-database-tools"
fi

echo "[$STAMP] Done: $(du -sh "$DEST" | cut -f1) in $DEST"

# Off-site copy
if [ -n "${BACKUP_COPY_TO:-}" ]; then
  case "$BACKUP_COPY_TO" in
    s3://*) aws s3 cp --recursive --only-show-errors "$DEST" "$BACKUP_COPY_TO/$STAMP" ;;
    *)      rclone copy --quiet "$DEST" "$BACKUP_COPY_TO/$STAMP" ;;
  esac
  echo "[$STAMP] Copied to $BACKUP_COPY_TO/$STAMP"
fi

# Rotation of the local folders
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime "+$KEEP_DAYS" -exec rm -rf {} +
