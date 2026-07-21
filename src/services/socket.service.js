const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
  }

  init(ioInstance) {
    this.io = ioInstance;
    logger.info('SocketService initialized with IO instance');
  }

  emitToTenant(tenantId, event, data) {
    if (!this.io) {
      logger.warn('SocketService is not initialized. Cannot emit event.');
      return;
    }
    const room = `tenant_${tenantId}`;
    this.io.to(room).emit(event, data);
    logger.info(`Emitted '${event}' to room '${room}'`);
  }
}

module.exports = new SocketService();
