# Load and speed measurements

Three scripts to measure the platform under load, to run against a **local or staging** server with a
test account. Never against production: the fake messages land in real conversations.

Results to read afterwards: the admin page **System health → Platform speed over the last 5 minutes**
(count, p50, p95, max per path). Targets: a customer's message on the agent's screen in under 2 s (p95),
the inbox list in under 300 ms.

## 1. Incoming messages (`inbound-load.js`)

Sends fake WhatsApp messages to the Meta webhook the way Meta does (signed with the app secret), at a
steady rate, from many different customers, and reports how fast the server acknowledged them. With an
admin token it waits for the queue to empty and prints the speed table.

```bash
BASE_URL=http://localhost:3000 \
PHONE_NUMBER_ID=<meta phone_number_id of a test number> \
APP_SECRET=<META_APP_SECRET of that server> \
RATE=50 SECONDS=60 CUSTOMERS=500 \
ADMIN_TOKEN=<token of an admin login> \
node scripts/bench/inbound-load.js
```

`RATE` = messages per second, `CUSTOMERS` = how many different phone numbers they come from (messages of
one customer are handled one at a time, so more customers = more parallel work).

## 2. A big inbox (`seed-inbox.js` + `inbox-explain.js`)

`seed-inbox.js` fills a conversations database with many conversations and messages for one account.
`inbox-explain.js` then asks MongoDB how it ran the two inbox queries (list newest first, one
conversation's messages): the index it used, how many documents it read to return 50, and the time.
With `--create-indexes` it first creates the indexes of `src/models/mongo`, so you can see before/after.

```bash
MONGO_URI=mongodb://127.0.0.1:27017/wakeel_bench TENANT_ID=bench CHANNEL_ID=bench-1 THREADS=100000 MESSAGES=5 \
node scripts/bench/seed-inbox.js

MONGO_URI=mongodb://127.0.0.1:27017/wakeel_bench TENANT_ID=bench node scripts/bench/inbox-explain.js
MONGO_URI=mongodb://127.0.0.1:27017/wakeel_bench TENANT_ID=bench node scripts/bench/inbox-explain.js --create-indexes
```
