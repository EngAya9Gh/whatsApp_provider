/**
 * Gives repeated ticket numbers new ones, then adds the unique index on (tenant_id, ticket_number).
 * Run it before `prisma db push` on every deploy: it changes nothing once that is done.
 *
 * Why the index is added here: `db push` refuses to add any unique index without --accept-data-loss
 * (even with no repeats), and that flag would also let it drop columns or tables. With the index already
 * in place, `db push` has nothing to warn about.
 *
 * Why repeats exist: tickets used to be numbered "count of tickets + 1", so tickets created at the same
 * moment, or after other tickets were deleted, got a number already in use.
 * Rule: in each group of repeats the oldest ticket keeps its number; the others get the next numbers
 * after the tenant's highest one, in creation order.
 *
 *   node prisma/scripts/fix-ticket-numbers.js            fix
 *   node prisma/scripts/fix-ticket-numbers.js --dry-run  only list what would change
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const format = (n) => `#TK-${String(n).padStart(4, '0')}`;
const INDEX = 'tickets_tenant_id_ticket_number_key';

async function ensureUniqueIndex() {
  const [{ n }] = await prisma.$queryRaw`
    SELECT COUNT(*) AS n FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'tickets' AND index_name = ${INDEX}`;
  if (Number(n)) return console.log('[fix-ticket-numbers] Unique index already in place');
  if (dryRun) return console.log('[fix-ticket-numbers] Would add the unique index (dry run)');
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX \`${INDEX}\` ON \`tickets\`(\`tenant_id\`, \`ticket_number\`)`);
  console.log('[fix-ticket-numbers] Added the unique index on (tenant_id, ticket_number)');
}

async function main() {
  const [{ n: hasTable }] = await prisma.$queryRaw`
    SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'tickets'`;
  if (!Number(hasTable)) return console.log('[fix-ticket-numbers] No tickets table yet, nothing to do');

  const groups = await prisma.$queryRaw`
    SELECT tenant_id AS tenantId, ticket_number AS ticketNumber
    FROM tickets GROUP BY tenant_id, ticket_number HAVING COUNT(*) > 1`;
  if (groups.length === 0) {
    console.log('[fix-ticket-numbers] No repeated ticket numbers');
    return ensureUniqueIndex();
  }

  const byTenant = new Map();
  for (const g of groups) byTenant.set(g.tenantId, [...(byTenant.get(g.tenantId) || []), g.ticketNumber]);

  let changed = 0;
  for (const [tenantId, numbers] of byTenant) {
    const [{ maxNo }] = await prisma.$queryRaw`
      SELECT MAX(CAST(SUBSTRING(ticket_number, 5) AS UNSIGNED)) AS maxNo
      FROM tickets WHERE tenant_id = ${tenantId} AND ticket_number REGEXP '^#TK-[0-9]{1,9}$'`;
    let next = Number(maxNo || 0);

    // Every ticket to renumber in this tenant, oldest first
    const extra = [];
    for (const number of numbers) {
      const rows = await prisma.$queryRaw`
        SELECT id, created_at AS createdAt FROM tickets
        WHERE tenant_id = ${tenantId} AND ticket_number = ${number}
        ORDER BY created_at ASC, id ASC`;
      extra.push(...rows.slice(1).map(r => ({ ...r, number })));
    }
    extra.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a.id).localeCompare(String(b.id)));

    for (const ticket of extra) {
      next += 1;
      console.log(`[fix-ticket-numbers] tenant ${tenantId}: ticket ${ticket.id} ${ticket.number} → ${format(next)}${dryRun ? ' (dry run)' : ''}`);
      if (!dryRun) await prisma.$executeRaw`UPDATE tickets SET ticket_number = ${format(next)} WHERE id = ${ticket.id}`;
      changed += 1;
    }
  }
  console.log(`[fix-ticket-numbers] ${dryRun ? 'Would renumber' : 'Renumbered'} ${changed} ticket(s)`);
  return ensureUniqueIndex();
}

main()
  .catch((err) => {
    console.error('[fix-ticket-numbers] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
