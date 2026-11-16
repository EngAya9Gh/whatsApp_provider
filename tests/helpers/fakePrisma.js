/**
 * In-memory stand-in for the Prisma client, enough for the ticket / chat / flow code paths:
 * findMany/findFirst/findUnique/count/create/update/updateMany/deleteMany/groupBy with simple where
 * filters (equals, in, gte, lt, not, contains, OR, AND) and the include fields those services use.
 * `db` is the data: { tableName: [rows] }.
 */
function createFakePrisma(db) {
  let seq = 0;
  const OPS = ['in', 'gte', 'lt', 'not', 'contains'];

  const matches = (row, where = {}) => Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return cond.some(c => matches(row, c));
    if (key === 'AND') return cond.every(c => matches(row, c));
    if (cond === undefined) return true;
    if (cond === null) return row[key] === null || row[key] === undefined;
    if (cond instanceof Date || typeof cond !== 'object') return row[key] === cond;
    if (Object.keys(cond).some(op => OPS.includes(op))) {
      return Object.entries(cond).every(([op, x]) => ({
        in: () => x.includes(row[key]),
        gte: () => row[key] >= x,
        lt: () => row[key] < x,
        not: () => (x === null ? row[key] !== null && row[key] !== undefined : row[key] !== x),
        contains: () => String(row[key] || '').includes(x)
      }[op]()));
    }
    return true;
  });

  const withInclude = (row, include) => {
    const out = { ...row };
    if (include?.channel) out.channel = db.whatsAppChannel.find(c => c.id === row.channelId) || null;
    if (include?.assignee) out.assignee = db.subUser.find(u => u.id === row.assignedToId) || null;
    if (include?.category) out.category = (db.ticketCategory || []).find(c => c.id === row.categoryId) || null;
    if (include?.tenant) out.tenant = db.tenant.find(t => t.id === row.tenantId) || null;
    return out;
  };
  const pick = (row, select, include) => (select ? Object.fromEntries(Object.keys(select).map(k => [k, row[k]])) : withInclude(row, include));
  const sortBy = (rows, orderBy) => {
    if (!orderBy) return rows;
    const [[key, dir]] = Object.entries(Array.isArray(orderBy) ? orderBy[0] : orderBy);
    return [...rows].sort((a, b) => {
      const x = a[key] ?? 0;
      const y = b[key] ?? 0;
      const d = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return dir === 'desc' ? -d : d;
    });
  };

  const table = (name) => ({
    findMany: async ({ where, select, orderBy, include, skip = 0, take } = {}) =>
      sortBy(db[name].filter(r => matches(r, where)), orderBy).slice(skip, take ? skip + take : undefined).map(r => pick(r, select, include)),
    findFirst: async ({ where, select, orderBy, include } = {}) => {
      const row = sortBy(db[name].filter(r => matches(r, where)), orderBy)[0];
      return row ? pick(row, select, include) : null;
    },
    findUnique: async ({ where, select, include }) => {
      const row = db[name].find(r => r.id === where.id);
      return row ? pick(row, select, include) : null;
    },
    count: async ({ where } = {}) => db[name].filter(r => matches(r, where)).length,
    create: async ({ data }) => {
      // A short wait lets concurrent creates overlap the way they do on a real database
      await new Promise(resolve => setTimeout(resolve, 5));
      if (name === 'ticket' && db.ticket.some(t => t.tenantId === data.tenantId && t.ticketNumber === data.ticketNumber)) {
        throw Object.assign(new Error('Unique constraint failed on tenant_id, ticket_number'), { code: 'P2002' });
      }
      const row = {
        id: `${name}-${++seq}`, createdAt: new Date(Date.now() + seq), updatedAt: new Date(),
        assignedToId: null, resolvedAt: null, rating: null, categoryId: null, status: 'OPEN', ...data
      };
      db[name].push(row);
      return { ...row };
    },
    update: async ({ where, data }) => {
      const row = db[name].find(r => r.id === where.id && (!where.tenantId || r.tenantId === where.tenantId));
      if (!row) throw Object.assign(new Error('Record to update not found'), { code: 'P2025' });
      Object.assign(row, data, { updatedAt: new Date() });
      return { ...row };
    },
    updateMany: async ({ where, data }) => {
      const rows = db[name].filter(r => matches(r, where));
      rows.forEach(r => Object.assign(r, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }) => {
      const before = db[name].length;
      db[name] = db[name].filter(r => !matches(r, where));
      return { count: before - db[name].length };
    },
    groupBy: async ({ by, where }) => {
      const groups = {};
      for (const r of db[name].filter(row => matches(row, where))) groups[r[by[0]]] = (groups[r[by[0]]] || 0) + 1;
      return Object.entries(groups).map(([key, n]) => ({ [by[0]]: key, _count: { _all: n } }));
    }
  });

  return class PrismaClient {
    constructor() {
      for (const name of Object.keys(db)) this[name] = table(name);
    }
  };
}

module.exports = { createFakePrisma };
