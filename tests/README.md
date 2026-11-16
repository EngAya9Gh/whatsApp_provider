# Backend tests

`npm test` runs every `tests/*.test.js` with Node's built-in test runner. GitHub Actions runs them on
every push and pull request, and a failing test stops the deploy (`.github/workflows/deploy.yml`).

Tests that need a database are skipped unless you point them at one. Use throwaway services, never the
real ones: the tests create and delete data.

| Variable | Used by | Example |
|---|---|---|
| `TEST_MONGO_URL` | tickets | `mongodb://127.0.0.1:27017` (each test file uses its own `wakeel_test_*` database) |
| `TEST_MYSQL_URL` | migrations | `mysql://root@127.0.0.1:3306` (needs CREATE DATABASE; creates and drops `wakeel_test_*`) |
| `TEST_REDIS_HOST`, `TEST_REDIS_PORT` | campaigns, live events, locks | `127.0.0.1`, `6379` (Redis database 15, or `TEST_REDIS_DB`) |

With Docker:

```bash
docker run -d --rm --name t-mysql -p 3307:3306 -e MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:8.0
docker run -d --rm --name t-mongo -p 27018:27017 mongo:7.0
docker run -d --rm --name t-redis -p 6380:6379 redis:7
TEST_MYSQL_URL=mysql://root@127.0.0.1:3307 TEST_MONGO_URL=mongodb://127.0.0.1:27018 \
TEST_REDIS_HOST=127.0.0.1 TEST_REDIS_PORT=6380 npm test
```

Prisma (MySQL), Meta, the CRM webhook and Gemini are replaced by in-memory fakes
(`tests/helpers/`), so nothing is sent anywhere.
