# Backups

`backup.sh` takes one backup of everything the server holds; run it nightly from cron (the header of the
script has the line). What it saves and where each part is restored:

| Part | File | Why it matters |
|---|---|---|
| MySQL (accounts, billing, campaigns, settings) | `mysql.sql.gz` | everything the platform charges and promises |
| `sessions/` | `files.tgz` | the WhatsApp QR credentials: without them every QR number must be scanned again |
| `uploads/` | `files.tgz` | media of chats, campaigns, templates, chatbot replies |
| MongoDB (conversations) | `mongo.archive.gz` | only when `mongodump` is installed; Atlas paid tiers also keep their own backups, the free tier does not |

Settings (environment variables, all optional): `BACKUP_DIR` (default `../backups`), `BACKUP_KEEP_DAYS`
(7), `BACKUP_COPY_TO` (an rclone remote path like `r2:wakeel-backups`, or `s3://bucket/path` for the aws
CLI) for the off-site copy, `MYSQLDUMP` when mysqldump is not on the PATH.

## Restore

On a fresh server after `npm ci` and a `.env`:

```bash
# MySQL: into an empty database named in DATABASE_URL
gunzip -c mysql.sql.gz | mysql -h HOST -u USER -p DBNAME

# QR credentials and uploads: into the project folder
tar -xzf files.tgz -C /path/to/whatsApp_provider

# MongoDB (if mongo.archive.gz exists)
mongorestore --uri="$MONGO_URI" --archive=mongo.archive.gz --gzip --drop

pm2 startOrRestart ecosystem.config.js --update-env
```

Then open the admin System health page: Redis, MySQL, MongoDB connected, workers on every queue, and the
QR numbers reconnecting by themselves within a minute.

Do this once on a test machine now, not on the day something breaks.
