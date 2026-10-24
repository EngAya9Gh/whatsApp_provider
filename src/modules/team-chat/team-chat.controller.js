const teamChatService = require('./team-chat.service');
const accessService = require('../workforce/access.service');
const { memberKey } = require('../../middleware/auth.middleware');

const me = (req) => memberKey(req);

class TeamChatController {
  async members(req, res, next) {
    try {
      res.json({ success: true, data: { me: me(req), members: await teamChatService.members(req.tenant.id) } });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      res.json({ success: true, data: await teamChatService.listConversations(req.tenant.id, me(req)) });
    } catch (error) {
      next(error);
    }
  }

  async unread(req, res, next) {
    try {
      res.json({ success: true, data: { total: await teamChatService.unreadTotal(req.tenant.id, me(req)) } });
    } catch (error) {
      next(error);
    }
  }

  async openDirect(req, res, next) {
    try {
      res.json({ success: true, data: await teamChatService.openDirect(req.tenant.id, me(req), req.body?.memberKey) });
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      res.status(201).json({ success: true, data: await teamChatService.createGroup(req.tenant.id, me(req), req.body || {}) });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      res.json({ success: true, data: await teamChatService.updateGroup(req.tenant.id, me(req), req.params.id, req.body || {}) });
    } catch (error) {
      next(error);
    }
  }

  async leave(req, res, next) {
    try {
      await teamChatService.leaveGroup(req.tenant.id, me(req), req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async messages(req, res, next) {
    try {
      res.json({ success: true, data: await teamChatService.getMessages(req.tenant.id, me(req), req.params.id, { before: req.query.before }) });
    } catch (error) {
      next(error);
    }
  }

  async send(req, res, next) {
    try {
      // Sharing a customer conversation: the sender must be able to open it themselves
      const canShareThread = async (threadId) => {
        if (req.isSubUser && !req.userPerms?.can_view_live_chat) return false;
        return accessService.canAccessThread(req, threadId);
      };
      const message = await teamChatService.sendMessage(req.tenant.id, me(req), req.params.id, req.body || {}, canShareThread);

      // A shared customer conversation keeps a trace of it in its own timeline (team note)
      if (message.threadRef) {
        const chatService = require('../chat/chat.service');
        const title = await teamChatService.conversationTitle(req.tenant.id, me(req), req.params.id);
        await chatService.sendMessage(req.tenant.id, message.threadRef.threadId, {
          content: `🔗 شارك هذه المحادثة مع ${title}${message.text ? `:\n«${message.text}»` : ''}`,
          type: 'text',
          isInternal: true,
          senderId: req.subUser ? req.subUser.id : null
        }).catch(() => { /* the share itself succeeded */ });
      }
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }

  async read(req, res, next) {
    try {
      res.json({ success: true, data: await teamChatService.markRead(req.tenant.id, me(req), req.params.id) });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeamChatController();
