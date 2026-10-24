const mongoose = require('mongoose');
const ChatTag = require('../../models/mongo/ChatTag');
const ChatThread = require('../../models/mongo/ChatThread');
const socketService = require('../../services/socket.service');

const formatTag = (tag) => ({
  id: tag._id.toString(),
  name: tag.name,
  color: tag.color,
  isPinned: tag.isPinned,
  sortOrder: tag.sortOrder
});

class ChatTagService {
  async getTags(tenantId) {
    const tags = await ChatTag.find({ tenantId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return tags.map(formatTag);
  }

  async createTag(tenantId, { name, color, isPinned }) {
    if (!name || !name.trim()) throw { status: 400, message: 'Tag name is required' };

    const exists = await ChatTag.findOne({ tenantId, name: name.trim() });
    if (exists) throw { status: 409, message: 'A tag with this name already exists' };

    const count = await ChatTag.countDocuments({ tenantId });
    const tag = await ChatTag.create({
      tenantId,
      name: name.trim(),
      color: color || '#64748b',
      isPinned: !!isPinned,
      sortOrder: count
    });
    return formatTag(tag);
  }

  async updateTag(tenantId, id, { name, color, isPinned }) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Tag not found' };
    const update = {};
    if (name !== undefined) {
      if (!name.trim()) throw { status: 400, message: 'Tag name is required' };
      const duplicate = await ChatTag.findOne({ tenantId, name: name.trim(), _id: { $ne: id } });
      if (duplicate) throw { status: 409, message: 'A tag with this name already exists' };
      update.name = name.trim();
    }
    if (color !== undefined) update.color = color;
    if (isPinned !== undefined) update.isPinned = !!isPinned;

    const tag = await ChatTag.findOneAndUpdate({ _id: id, tenantId }, { $set: update }, { returnDocument: 'after' });
    if (!tag) throw { status: 404, message: 'Tag not found' };
    return formatTag(tag);
  }

  async deleteTag(tenantId, id) {
    if (!mongoose.isValidObjectId(id)) throw { status: 404, message: 'Tag not found' };
    const tag = await ChatTag.findOneAndDelete({ _id: id, tenantId });
    if (!tag) throw { status: 404, message: 'Tag not found' };
    // Detach the deleted tag from every conversation
    await ChatThread.updateMany({ tenantId, tagIds: id }, { $pull: { tagIds: id } });
  }

  async setThreadTags(tenantId, threadId, tagIds) {
    if (!Array.isArray(tagIds)) throw { status: 400, message: 'tagIds must be an array' };
    if (!mongoose.isValidObjectId(threadId)) throw { status: 404, message: 'Thread not found' };

    // Keep only tags that belong to this tenant
    const candidateIds = tagIds.filter(id => mongoose.isValidObjectId(id));
    const validTags = await ChatTag.find({ tenantId, _id: { $in: candidateIds } }).select('_id').lean();
    const validIds = validTags.map(t => t._id.toString());

    const thread = await ChatThread.findOneAndUpdate(
      { _id: threadId, tenantId },
      { $set: { tagIds: validIds } },
      { returnDocument: 'after' }
    );
    if (!thread) throw { status: 404, message: 'Thread not found' };

    socketService.emitToTenant(tenantId, 'thread_updated', { id: threadId, tagIds: validIds });
    return validIds;
  }
}

module.exports = new ChatTagService();
