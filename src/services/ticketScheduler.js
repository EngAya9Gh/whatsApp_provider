const logger = require('../utils/logger');
const ticketsService = require('../modules/tickets/tickets.service');

class TicketScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.intervalMs = 30 * 60 * 1000; // Check every 30 minutes
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.intervalId) return;

    logger.info('[TicketScheduler] 🕒 Inactivity ticket auto-close scheduler started (interval: 30 minutes)');

    // Initial check after 30 seconds from server startup
    setTimeout(() => {
      this.runCheck();
    }, 30 * 1000);

    // Recurring periodic check
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.intervalMs);
  }

  /**
   * Execute auto-close check
   */
  async runCheck() {
    if (this.isRunning) {
      logger.warn('[TicketScheduler] Auto-close check already in progress, skipping run...');
      return;
    }

    this.isRunning = true;
    // With several server processes only one of them runs the check (Redis lock)
    const { redisClient } = require('../config/redis');
    const lockKey = 'lock:ticket-auto-close';
    const token = `${process.pid}-${Date.now()}`;
    try {
      if (redisClient.status === 'ready') {
        const locked = (await redisClient.set(lockKey, token, 'PX', this.intervalMs - 60 * 1000, 'NX')) === 'OK';
        if (!locked) {
          logger.info('[TicketScheduler] Another server process is running the auto-close check, skipping');
          return;
        }
      }
      const result = await ticketsService.autoCloseInactiveTickets();
      if (result && result.closed > 0) {
        logger.info(`[TicketScheduler] ✅ Auto-closed ${result.closed} inactive tickets.`);
      }
    } catch (err) {
      logger.error(`[TicketScheduler] ❌ Error running auto-close: ${err.message}`);
    } finally {
      // The lock is left to expire, so the check runs once per interval whichever process gets it
      this.isRunning = false;
    }
  }

  /**
   * Stop the scheduler on graceful server shutdown
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[TicketScheduler] Inactivity auto-close scheduler stopped.');
    }
  }
}

module.exports = new TicketScheduler();
