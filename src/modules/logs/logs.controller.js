const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class LogsController {
  async getLogs(req, res, next) {
    try {
      const tenantId = req.tenant.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.messageLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.messageLog.count({ where: { tenantId } })
      ]);

      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get Logs error:', error);
      next(error);
    }
  }
}

module.exports = new LogsController();
