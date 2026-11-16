// The migrations build the full schema on an empty MySQL database, and the deploy step that fixes repeated
// ticket numbers lets `prisma db push` add the unique index. Needs TEST_MYSQL_URL (a user that may create
// databases, e.g. mysql://root@127.0.0.1:3306). Every database it creates starts with wakeel_test_.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { ROOT, fromRoot, skipUnless } = require('./helpers/env');

const skip = skipUnless('TEST_MYSQL_URL');
const base = (process.env.TEST_MYSQL_URL || '').replace(/\/+$/, '');
const suffix = Date.now().toString(36);
const dbUrl = (name) => `${base}/wakeel_test_${name}_${suffix}`;
const created = [];

const prisma = (args, url) => execFileSync(fromRoot('node_modules/.bin/prisma'), args, {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
});
const sql = (url, statements) => execFileSync(fromRoot('node_modules/.bin/prisma'), ['db', 'execute', '--stdin', '--url', url], {
  cwd: ROOT, input: statements, encoding: 'utf8', env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }
});

let admin;
before(async () => {
  if (skip) return;
  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  admin = new PrismaClient({ datasources: { db: { url: `${base}/mysql` } } });
});
after(async () => {
  if (skip) return;
  for (const name of created) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``).catch(() => {});
  await admin.$disconnect();
});
const createDb = async (name) => {
  const full = `wakeel_test_${name}_${suffix}`;
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${full}\``);
  created.push(full);
  return dbUrl(name);
};

test('a new database built from the migrations matches prisma/schema.prisma exactly', { skip, timeout: 120000 }, async () => {
  const url = await createDb('fresh');
  prisma(['migrate', 'deploy'], url);
  const diff = prisma(['migrate', 'diff', '--from-url', url, '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], url);
  assert.match(diff.trim(), /^-- This is an empty migration\.$/, `the migrations are missing:\n${diff}`);
});

test('deploy step: repeated ticket numbers are renumbered, the unique index is added, then db push passes', { skip, timeout: 120000 }, async () => {
  const url = await createDb('repeats');
  prisma(['migrate', 'deploy'], url);
  // Production before this fix: no unique index, and repeated numbers
  sql(url, `
    DROP INDEX tickets_tenant_id_ticket_number_key ON tickets;
    INSERT INTO tenants (id, name, email, password_hash, updated_at) VALUES ('T1','A','a@x','x',NOW(3)), ('T2','B','b@x','x',NOW(3));
    INSERT INTO whatsapp_channels (id, tenant_id, provider_type, updated_at) VALUES ('c1','T1','META_CLOUD',NOW(3)), ('c2','T2','META_CLOUD',NOW(3));
    INSERT INTO tickets (id, tenant_id, channel_id, thread_id, ticket_number, created_at, updated_at) VALUES
      ('a1','T1','c1','th','#TK-0001','2026-01-01 10:00:00',NOW(3)), ('a2','T1','c1','th','#TK-0001','2026-01-01 10:00:01',NOW(3)),
      ('a3','T1','c1','th','#TK-0002','2026-01-02 10:00:00',NOW(3)),
      ('b1','T1','c1','th','#TK-0003','2026-01-03 10:00:00',NOW(3)), ('b2','T1','c1','th','#TK-0003','2026-01-03 10:00:00',NOW(3)),
      ('t1','T2','c2','th','#TK-0001','2026-01-01 09:00:00',NOW(3)), ('t2','T2','c2','th','#TK-0001','2026-01-01 09:00:01',NOW(3)),
      ('t3','T2','c2','th','#TK-9999','2026-01-05 09:00:00',NOW(3));
  `);

  // What production did until now: db push refuses to add the index
  assert.throws(() => prisma(['db', 'push', '--skip-generate'], url), /accept-data-loss/);

  const run = () => execFileSync(process.execPath, [fromRoot('prisma/scripts/fix-ticket-numbers.js')], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, DATABASE_URL: url, DOTENV_CONFIG_QUIET: 'true' }
  });
  const first = run();
  assert.match(first, /Renumbered 3 ticket\(s\)/);
  assert.match(first, /Added the unique index/);
  assert.match(prisma(['db', 'push', '--skip-generate'], url), /in sync/);
  const second = run();
  assert.match(second, /No repeated ticket numbers/);
  assert.match(second, /already in place/);

  const { PrismaClient } = require(fromRoot('node_modules/@prisma/client'));
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await client.$queryRaw`SELECT id, ticket_number AS n FROM tickets ORDER BY tenant_id, created_at, id`;
    assert.deepStrictEqual(Object.fromEntries(rows.map(r => [r.id, r.n])), {
      a1: '#TK-0001', a2: '#TK-0004', a3: '#TK-0002', b1: '#TK-0003', b2: '#TK-0005',
      t1: '#TK-0001', t2: '#TK-10000', t3: '#TK-9999'
    }, 'the oldest keeps its number, the others continue after the highest one');
    await assert.rejects(
      client.ticket.create({ data: { tenantId: 'T1', channelId: 'c1', threadId: 'th', ticketNumber: '#TK-0001' } }),
      (err) => err.code === 'P2002'
    );
  } finally {
    await client.$disconnect();
  }
});
