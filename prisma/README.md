# Database schema

`schema.prisma` is the source of truth.

## How production is updated today

The GitHub deploy (`.github/workflows/deploy.yml`) runs, in this order:

1. `node prisma/scripts/fix-ticket-numbers.js`: renumbers repeated ticket numbers and adds their unique
   index. `db push` refuses to add a unique index by itself, and its `--accept-data-loss` flag would also
   let it drop columns or tables, so never add that flag to the deploy.
2. `npx prisma db push`: brings the database in line with `schema.prisma`.

If a future change needs data fixed first (a new unique index, a column that becomes required), add a
script like the one above and run it before `db push` in the workflow.

## The migrations folder

`prisma/migrations` builds a complete database from nothing (new server, staging, the tests):
`npx prisma migrate deploy`. The test `tests/migrations.test.js` fails if a migration is missing, so add
one whenever you change `schema.prisma`:

```bash
npx prisma migrate dev --name what_changed   # against a local or throwaway database
```

## Moving production to migrations (optional, later)

Production has never run `migrate deploy`, so it would try to recreate existing tables. Once, on the
server, after a deploy:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# must print "-- This is an empty migration." (production matches the schema); then mark every migration as applied:
for m in $(ls prisma/migrations | grep -v migration_lock); do npx prisma migrate resolve --applied "$m"; done
```

Then replace `npx prisma db push` with `npx prisma migrate deploy` in the workflow.
