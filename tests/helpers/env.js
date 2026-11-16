// Settings every test needs before any app module is loaded. No real database or network is used
// unless a test asks for one of the TEST_* services below.
//   TEST_MONGO_URL   e.g. mongodb://127.0.0.1:27017   (tickets, flows)
//   TEST_MYSQL_URL   e.g. mysql://root@127.0.0.1:3306 (migrations; needs CREATE DATABASE rights)
//   TEST_REDIS_HOST / TEST_REDIS_PORT                 (queues, live events)
process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-secret';
process.env.APP_URL = 'http://localhost';
process.env.FRONTEND_URL = 'http://localhost';
process.env.GEMINI_API_KEY = '';
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || '127.0.0.1';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '1';
process.env.REDIS_PASSWORD = '';
// Redis database 15, so the tests never touch the queues of a Redis that also runs the app (database 0)
process.env.REDIS_DB = process.env.TEST_REDIS_DB || '15';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';

const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/** Replaces a module with test doubles before the app requires it */
function inject(request, exportsObj) {
  const file = require.resolve(request, { paths: [ROOT] });
  require.cache[file] = { id: file, filename: file, loaded: true, exports: exportsObj };
}

const fromRoot = (p) => path.join(ROOT, p);

/** Mongo URL of a database only this test file uses */
const mongoUrl = (name) => (process.env.TEST_MONGO_URL ? `${process.env.TEST_MONGO_URL.replace(/\/+$/, '')}/wakeel_test_${name}` : null);

const skipUnless = (variable) => (process.env[variable] ? false : `${variable} is not set`);

module.exports = { ROOT, inject, fromRoot, mongoUrl, skipUnless };
