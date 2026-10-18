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
    try {
      const result = await ticketsService.autoCloseInactiveTickets();
      if (result && result.closed > 0) {
        logger.info(`[TicketScheduler] ✅ Auto-closed ${result.closed} inactive tickets.`);
      }
    } catch (err) {
      logger.error(`[TicketScheduler] ❌ Error running auto-close: ${err.message}`);
    } finally {
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
