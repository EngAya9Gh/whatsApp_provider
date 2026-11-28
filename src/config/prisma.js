// The one Prisma client of the process. Every module requires this instead of creating its own:
// each PrismaClient opens its own pool of MySQL connections (num_cpus * 2 + 1 by default), and 70+
// clients in one process could exceed MySQL's connection limit under load. Set the pool size for the
// server in DATABASE_URL, e.g. ?connection_limit=20.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
