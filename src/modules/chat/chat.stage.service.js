const mongoose = require('mongoose');
const CustomerStage = require('../../models/mongo/CustomerStage');
const ChatSettings = require('../../models/mongo/ChatSettings');
const ChatThread = require('../../models/mongo/ChatThread');
const socketService = require('../../services/socket.service');
const logger = require('../../utils/logger');

const GROUPS = ['MAIN', 'LOST'];

const formatStage = (stage) => ({
  id: stage._id.toString(),
  name: stage.name,
  color: stage.color,
  group: stage.group,
  sortOrder: stage.sortOrder
});

class ChatStageService {
  async getSettings(tenantId) {
    const settings = await ChatSettings.findOne({ tenantId }).lean();
    const stages = settings?.stages || {};
    return {
      enabled: !!stages.enabled,
      channelIds: stages.channelIds || [],
      autoAssignEntry: stages.autoAssignEntry !== false
    };
  }

  async getConfig(tenantId) {
    const [settings, stages] = await Promise.all([
      this.getSettings(tenantId),
      CustomerStage.find({ tenantId }).sort({ sortOrder: 1 }).lean()
    ]);
    return { ...settings, stages: stages.map(formatStage) };
  }

  /**
   * Saves the whole stages configuration at once (settings + ordered stage list).
   * Stages missing from the payload are deleted and removed from conversations.
   */
  async saveConfig(tenantId, { enabled, channelIds, autoAssignEntry, stages }) {
    if (!Array.isArray(stages)) throw { status: 400, message: 'stages must be an array' };

    const cleanStages = stages.map(s => ({
      id: s.id && mongoose.isValidObjectId(s.id) ? String(s.id) : null,
      name: String(s.name || '').trim(),
      color: s.color || '#64748b',
      group: GROUPS.includes(s.group) ? s.group : 'MAIN'
    }));

    if (cleanStages.some(s => !s.name)) throw { status: 400, message: 'Every stage needs a name' };
    if (enabled && !cleanStages.some(s => s.group === 'MAIN')) {
      throw { status: 400, message: 'The main path needs at least one stage' };
    }

    const existing = await CustomerStage.find({ tenantId }).select('_id').lean();
    const existingIds = new Set(existing.map(s => s._id.toString()));
    const keptIds = new Set(cleanStages.filter(s => s.id && existingIds.has(s.id)).map(s => s.id));
    const removedIds = [...existingIds].filter(id => !keptIds.has(id));

    if (removedIds.length > 0) {
      await CustomerStage.deleteMany({ tenantId, _id: { $in: removedIds } });
      await ChatThread.updateMany({ tenantId, stageId: { $in: removedIds } }, { $set: { stageId: null } });
    }

    // sortOrder follows the payload order inside each group
    const counters = { MAIN: 0, LOST: 0 };
    for (const stage of cleanStages) {
      const data = { name: stage.name, color: stage.color, group: stage.group, sortOrder: counters[stage.group]++ };
      if (stage.id && keptIds.has(stage.id)) {
        await CustomerStage.updateOne({ _id: stage.id, tenantId }, { $set: data });
      } else {
        await CustomerStage.create({ tenantId, ...data });
      }
    }

    await ChatSettings.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          'stages.enabled': !!enabled,
          'stages.channelIds': Array.isArray(channelIds) ? channelIds.map(String) : [],
          'stages.autoAssignEntry': autoAssignEntry !== false
        }
      },
      { upsert: true }
    );

    socketService.emitToTenant(tenantId, 'stages_updated', {});
    return this.getConfig(tenantId);
  }

  isActiveForChannel(settings, channelId) {
    if (!settings.enabled) return false;
    return settings.channelIds.length === 0 || settings.channelIds.includes(channelId);
  }

  async setThreadStage(tenantId, threadId, stageId, changedBy) {
    if (!mongoose.isValidObjectId(threadId)) throw { status: 404, message: 'Thread not found' };

    if (stageId) {
      const stage = mongoose.isValidObjectId(stageId)
        ? await CustomerStage.findOne({ _id: stageId, tenantId }).lean()
        : null;
      if (!stage) throw { status: 404, message: 'Stage not found' };
    }

    const thread = await ChatThread.findOneAndUpdate(
      { _id: threadId, tenantId },
      {
        $set: { stageId: stageId || null },
        $push: { stageHistory: { stageId: stageId || null, changedBy, changedAt: new Date() } }
      },
      { returnDocument: 'after' }
    );
    if (!thread) throw { status: 404, message: 'Thread not found' };

    socketService.emitToTenant(tenantId, 'thread_updated', { id: threadId, stageId: thread.stageId });
    return thread.stageId;
  }

  /**
   * Puts a conversation that never had a stage into the entry stage (first MAIN stage),
   * when stages are enabled for its channel. Never throws — message ingestion must not fail.
   */
  async applyEntryStage(tenantId, thread) {
    try {
      if (thread.stageId || (thread.stageHistory && thread.stageHistory.length > 0)) return thread;

      const settings = await this.getSettings(tenantId);
      if (!settings.autoAssignEntry || !this.isActiveForChannel(settings, thread.channelId)) return thread;

      const entry = await CustomerStage.findOne({ tenantId, group: 'MAIN' }).sort({ sortOrder: 1 }).lean();
      if (!entry) return thread;

      const entryId = entry._id.toString();
      const updated = await ChatThread.findOneAndUpdate(
        { _id: thread._id, stageId: null },
        {
          $set: { stageId: entryId },
          $push: { stageHistory: { stageId: entryId, changedBy: 'SYSTEM', changedAt: new Date() } }
        },
        { returnDocument: 'after' }
      );
      return updated || thread;
    } catch (err) {
      logger.error('[ChatStage] Failed to apply entry stage: ' + err.message);
      return thread;
    }
  }
}

module.exports = new ChatStageService();
