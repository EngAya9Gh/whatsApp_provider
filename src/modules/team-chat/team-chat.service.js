const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const TeamConversation = require('../../models/mongo/TeamConversation');
const TeamMessage = require('../../models/mongo/TeamMessage');
const ChatThread = require('../../models/mongo/ChatThread');
const socketService = require('../../services/socket.service');

const MAX_TEXT = 4000;
const MAX_GROUP_MEMBERS = 100;
const PAGE_SIZE = 50;
const EPOCH = new Date(0);

const directKeyOf = (a, b) => [a, b].sort().join('|');

class TeamChatService {
  /** Everyone who can chat: the owner and the active sub-users */
  async members(tenantId) {
    const [tenant, subUsers] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      prisma.subUser.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } })
    ]);
    return [
      { key: 'owner', name: tenant?.name || 'Owner', role: 'OWNER' },
      ...subUsers.map(u => ({ key: u.id, name: u.name, role: u.role }))
    ];
  }

  async _memberMap(tenantId) {
    return Object.fromEntries((await this.members(tenantId)).map(m => [m.key, m]));
  }

  async _conversationFor(tenantId, me, conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) throw { status: 404, message: 'Conversation not found' };
    const conversation = await TeamConversation.findOne({ _id: conversationId, tenantId, members: me }).lean();
    if (!conversation) throw { status: 404, message: 'Conversation not found' };
    return conversation;
  }

  async _unread(conversation, me) {
    const since = conversation.reads?.[me] ? new Date(conversation.reads[me]) : EPOCH;
    return TeamMessage.countDocuments({ conversationId: conversation._id, createdAt: { $gt: since }, senderKey: { $ne: me } });
  }

  _format(conversation, me, memberMap, unread = 0) {
    const others = conversation.members.filter(k => k !== me);
    const title = conversation.type === 'DIRECT'
      ? (memberMap[others[0]]?.name || '—')
      : conversation.name;
    return {
      id: conversation._id.toString(),
      type: conversation.type,
      title,
      name: conversation.name,
      members: conversation.members.map(k => memberMap[k] || { key: k, name: '—', role: 'REMOVED' }),
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      createdBy: conversation.createdBy,
      unread
    };
  }

  async listConversations(tenantId, me) {
    const [conversations, memberMap] = await Promise.all([
      TeamConversation.find({ tenantId, members: me }).sort({ lastMessageAt: -1 }).limit(200).lean(),
      this._memberMap(tenantId)
    ]);
    const unread = await Promise.all(conversations.map(c => this._unread(c, me)));
    return conversations.map((c, i) => this._format(c, me, memberMap, unread[i]));
  }

  async unreadTotal(tenantId, me) {
    const conversations = await TeamConversation.find({ tenantId, members: me }).select('_id reads').lean();
    const counts = await Promise.all(conversations.map(c => this._unread(c, me)));
    return counts.reduce((a, b) => a + b, 0);
  }

  async openDirect(tenantId, me, otherKey) {
    if (!otherKey || otherKey === me) throw { status: 400, message: 'Choose another team member' };
    const memberMap = await this._memberMap(tenantId);
    if (!memberMap[otherKey]) throw { status: 404, message: 'Team member not found' };

    const directKey = directKeyOf(me, otherKey);
    let conversation;
    try {
      conversation = await TeamConversation.findOneAndUpdate(
        { tenantId, directKey },
        { $setOnInsert: { tenantId, type: 'DIRECT', directKey, members: [me, otherKey], createdBy: me, lastMessageAt: new Date(), reads: {} } },
        { upsert: true, returnDocument: 'after' }
      ).lean();
    } catch (err) {
      // Two people opened the same conversation at the same moment
      if (err.code !== 11000) throw err;
      conversation = await TeamConversation.findOne({ tenantId, directKey }).lean();
    }
    return this._format(conversation, me, memberMap, await this._unread(conversation, me));
  }

  async _validMembers(tenantId, memberKeys, me) {
    if (!Array.isArray(memberKeys)) throw { status: 400, message: 'memberKeys must be an array' };
    const memberMap = await this._memberMap(tenantId);
    const keys = [...new Set([me, ...memberKeys.map(String)])].filter(k => memberMap[k]);
    if (keys.length < 2) throw { status: 400, message: 'A group needs at least one other member' };
    if (keys.length > MAX_GROUP_MEMBERS) throw { status: 400, message: `At most ${MAX_GROUP_MEMBERS} members` };
    return { keys, memberMap };
  }

  async createGroup(tenantId, me, { name, memberKeys }) {
    const title = String(name || '').trim().slice(0, 60);
    if (!title) throw { status: 400, message: 'Group name is required' };
    const { keys, memberMap } = await this._validMembers(tenantId, memberKeys, me);
    const conversation = await TeamConversation.create({
      tenantId, type: 'GROUP', name: title, members: keys, createdBy: me, lastMessageAt: new Date(), reads: { [me]: new Date() }
    });
    const formatted = this._format(conversation.toObject(), me, memberMap);
    for (const key of keys) socketService.emitToMember(tenantId, key, 'team_conversation', { id: formatted.id });
    return formatted;
  }

  /** Rename a group or change its members (any member may; the current user always stays) */
  async updateGroup(tenantId, me, conversationId, { name, memberKeys }) {
    const conversation = await this._conversationFor(tenantId, me, conversationId);
    if (conversation.type !== 'GROUP') throw { status: 400, message: 'Only groups can be edited' };
    const update = {};
    if (name !== undefined) {
      const title = String(name || '').trim().slice(0, 60);
      if (!title) throw { status: 400, message: 'Group name is required' };
      update.name = title;
    }
    let memberMap = null;
    if (memberKeys !== undefined) {
      const valid = await this._validMembers(tenantId, memberKeys, me);
      update.members = valid.keys;
      memberMap = valid.memberMap;
    }
    const updated = await TeamConversation.findOneAndUpdate({ _id: conversation._id }, { $set: update }, { returnDocument: 'after' }).lean();
    memberMap = memberMap || await this._memberMap(tenantId);
    for (const key of new Set([...conversation.members, ...updated.members])) {
      socketService.emitToMember(tenantId, key, 'team_conversation', { id: conversationId });
    }
    return this._format(updated, me, memberMap, await this._unread(updated, me));
  }

  async leaveGroup(tenantId, me, conversationId) {
    const conversation = await this._conversationFor(tenantId, me, conversationId);
    if (conversation.type !== 'GROUP') throw { status: 400, message: 'You cannot leave a direct conversation' };
    const remaining = conversation.members.filter(k => k !== me);
    if (remaining.length === 0) {
      await Promise.all([TeamConversation.deleteOne({ _id: conversation._id }), TeamMessage.deleteMany({ conversationId: conversation._id })]);
    } else {
      await TeamConversation.updateOne({ _id: conversation._id }, { $set: { members: remaining } });
    }
    for (const key of conversation.members) socketService.emitToMember(tenantId, key, 'team_conversation', { id: conversationId });
  }

  async getMessages(tenantId, me, conversationId, { before } = {}) {
    const conversation = await this._conversationFor(tenantId, me, conversationId);
    // Paged by message id (always increasing), so messages sent in the same millisecond keep their order
    const query = { conversationId: conversation._id };
    if (before && mongoose.isValidObjectId(before)) query._id = { $lt: new mongoose.Types.ObjectId(before) };
    const messages = await TeamMessage.find(query).sort({ _id: -1 }).limit(PAGE_SIZE + 1).lean();
    const hasMore = messages.length > PAGE_SIZE;
    return {
      messages: messages.slice(0, PAGE_SIZE).reverse().map(m => this._formatMessage(m)),
      hasMore
    };
  }

  _formatMessage(m) {
    return {
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderKey: m.senderKey,
      text: m.text,
      threadRef: m.threadRef,
      createdAt: m.createdAt
    };
  }

  /**
   * Sends a message. threadId shares a customer conversation; canShareThread(threadId) must
   * confirm the sender may see it (live chat permission + visibility scope).
   */
  async sendMessage(tenantId, me, conversationId, { text, threadId }, canShareThread) {
    const conversation = await this._conversationFor(tenantId, me, conversationId);
    const body = String(text || '').trim().slice(0, MAX_TEXT);

    let threadRef = null;
    if (threadId) {
      if (!mongoose.isValidObjectId(threadId) || !(await canShareThread(threadId))) {
        throw { status: 403, message: 'You cannot share this conversation' };
      }
      const thread = await ChatThread.findOne({ _id: threadId, tenantId }).select('contactName contactPhone').lean();
      if (!thread) throw { status: 404, message: 'Conversation not found' };
      threadRef = { threadId: String(threadId), contactName: thread.contactName || null, contactPhone: thread.contactPhone };
    }
    if (!body && !threadRef) throw { status: 400, message: 'The message is empty' };

    const now = new Date();
    const message = await TeamMessage.create({ tenantId, conversationId: conversation._id, senderKey: me, text: body, threadRef });
    const preview = body || (threadRef ? `🔗 ${threadRef.contactName || threadRef.contactPhone}` : '');
    await TeamConversation.updateOne(
      { _id: conversation._id },
      { $set: { lastMessageAt: now, lastMessage: { text: preview.slice(0, 140), senderKey: me }, [`reads.${me}`]: now } }
    );

    const formatted = this._formatMessage(message.toObject());
    for (const key of conversation.members) socketService.emitToMember(tenantId, key, 'team_message', formatted);
    return formatted;
  }

  /** Title of a conversation as `me` sees it (the other person, or the group name) */
  async conversationTitle(tenantId, me, conversationId) {
    const [conversation, memberMap] = await Promise.all([this._conversationFor(tenantId, me, conversationId), this._memberMap(tenantId)]);
    return this._format(conversation, me, memberMap).title;
  }

  /** People mentioned in a customer conversation's team note get it in their direct chat with the writer */
  async notifyMentions(tenantId, fromKey, memberKeys, { threadId, text }) {
    const memberMap = await this._memberMap(tenantId);
    for (const key of new Set(memberKeys)) {
      if (key === fromKey || !memberMap[key]) continue;
      const direct = await this.openDirect(tenantId, fromKey, key);
      // The writer is inside the customer conversation, so sharing it is allowed
      await this.sendMessage(tenantId, fromKey, direct.id, { text: `📌 ${text || ''}`.trim(), threadId }, async () => true);
    }
  }

  async markRead(tenantId, me, conversationId) {
    const conversation = await this._conversationFor(tenantId, me, conversationId);
    await TeamConversation.updateOne({ _id: conversation._id }, { $set: { [`reads.${me}`]: new Date() } });
    const total = await this.unreadTotal(tenantId, me);
    socketService.emitToMember(tenantId, me, 'team_unread', { total });
    return { total };
  }
}

module.exports = new TeamChatService();
