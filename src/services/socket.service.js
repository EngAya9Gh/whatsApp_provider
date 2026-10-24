const logger = require('../utils/logger');

// Live chat events → the conversation they concern
const CHAT_EVENT_THREAD = {
  new_chat_message: (d) => d.threadId,
  thread_updated: (d) => d.id || d.threadId || d._id,
  ticket_updated: (d) => d.threadId
};

class SocketService {
  constructor() {
    this.io = null;
  }

  init(ioInstance) {
    this.io = ioInstance;
    logger.info('SocketService initialized with IO instance');
  }

  /** Authenticates every connection with the login token, then joins the rooms that identity may see */
  setupConnections(io, resolveToken) {
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        socket.data.identity = await resolveToken(token);
        next();
      } catch (error) {
        next(new Error(error.status ? error.message : 'Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      const identity = socket.data.identity;
      const tenantId = identity.tenant.id;
      for (const room of this.roomsFor(identity)) socket.join(room);
      logger.info(`Dashboard client ${socket.id} connected (tenant ${tenantId}${identity.isSubUser ? `, user ${identity.subUser.id}` : ''})`);

      // Older dashboards still announce their tenant: rooms are already joined, other tenants are refused
      socket.on('join-tenant', (requestedTenantId) => {
        if (requestedTenantId !== tenantId) logger.warn(`Socket ${socket.id} asked for another tenant's room — ignored`);
      });
    });
  }

  /**
   * Rooms a dashboard connection joins:
   *  tenant_X           — everything (owner, API keys, sub-users who see all conversations)
   *  tenant_X:scoped    — sub-users limited to team / assigned conversations: content-free pings only
   *  tenant_X:settings  — connection secrets (WhatsApp QR): owner, API keys, can_manage_settings
   *  member_X_<key>     — personal events (internal team chat)
   */
  roomsFor(identity) {
    const tenantId = identity.tenant.id;
    const scope = identity.isSubUser ? identity.userPerms?.chat_scope || 'ALL' : 'ALL';
    const rooms = [scope === 'ALL' ? `tenant_${tenantId}` : `tenant_${tenantId}:scoped`];
    if (!identity.isSubUser || identity.userPerms?.can_manage_settings) rooms.push(`tenant_${tenantId}:settings`);
    if (!identity.isApiKey) rooms.push(this.memberRoom(tenantId, identity.isSubUser ? identity.subUser.id : 'owner'));
    return rooms;
  }

  memberRoom(tenantId, memberKey) {
    return `member_${tenantId}_${memberKey}`;
  }

  emitToTenant(tenantId, event, data) {
    if (!this.io) {
      logger.warn('SocketService is not initialized. Cannot emit event.');
      return;
    }
    const room = `tenant_${tenantId}`;
    this.io.to(room).emit(event, data);

    // Restricted agents only learn that a conversation changed, then reload it through the API
    // (which applies their visibility scope) — message content never reaches them this way
    const threadId = CHAT_EVENT_THREAD[event]?.(data || {});
    if (threadId) this.io.to(`${room}:scoped`).emit('chat_activity', { threadId: String(threadId), event });
    logger.info(`Emitted '${event}' to room '${room}'`);
  }

  emitToMember(tenantId, memberKey, event, data) {
    if (!this.io) return;
    this.io.to(this.memberRoom(tenantId, memberKey)).emit(event, data);
  }
}

module.exports = new SocketService();
