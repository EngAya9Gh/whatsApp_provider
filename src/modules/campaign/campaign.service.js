const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const { campaignQueue } = require('../../workers/campaign.worker');
const walletService = require('../wallet/wallet.service');
const { unitPrice, settle } = require('./campaign.billing');
const { normalizeHeaderMedia } = require('../meta/meta.templateMedia');
const logger = require('../../utils/logger');

const fs = require('fs');

class CampaignService {
  async parseFile(file, isMeta = false) {
    const records = []; // Array of { phone, variables: [] }
    const filePath = file.path;
    const fs = require('fs');
    
    const logger = require('../../utils/logger');
    logger.info(`Parsing file: ${file.originalname}, mimetype: ${file.mimetype}`);

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.txt')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      logger.info(`CSV/TXT lines count: ${lines.length}`);
      lines.forEach(line => {
        if (!line.trim()) return;
        const delimiter = line.includes(';') ? ';' : ',';
        const parts = line.split(delimiter).map(v => v.trim());
        
        let phone = null;
        let phoneIndex = -1;
        // Find the first column that looks like a phone number
        for (let i = 0; i < parts.length; i++) {
          const clean = parts[i].replace(/[^0-9]/g, '');
          if (clean && clean.length >= 8 && clean.length <= 18) {
            phone = clean;
            phoneIndex = i;
            break;
          }
        }

        if (phone) {
          // variables are all other columns (or just the ones after phone, but better to just exclude the phone itself)
          const variables = isMeta ? parts.filter((_, idx) => idx !== phoneIndex) : [];
          records.push({ phone, variables });
        }
      });
    } else {
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Use raw: true to get actual numbers (avoids scientific notation like 9.66535E+11)
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
      logger.info(`Excel rows count: ${data.length}`);
      if (data.length > 0) logger.info(`First row: ${JSON.stringify(data[0])}`);
      
      // Check if first row is header
      let startIndex = 0;
      if (data.length > 0) {
        const firstCell = data[0][0];
        const firstCellStr = typeof firstCell === 'number'
          ? firstCell.toFixed(0)
          : (firstCell?.toString() || '');
        const firstCellDigits = firstCellStr.replace(/[^0-9]/g, '');
        if (!firstCellDigits || firstCellDigits.length < 8) {
          startIndex = 1; // Skip header row
        }
      }

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // ✅ Fix: if cell is a number (Excel stores phone as number), use toFixed(0)
        // to avoid scientific notation (e.g. 9.66535E+11 → 966535278722)
        const rawPhone = row[0];
        let phone = '';
        if (typeof rawPhone === 'number') {
          phone = rawPhone.toFixed(0); // e.g. 966535278722
        } else {
          phone = (rawPhone?.toString() || '');
        }
        phone = phone.replace(/[^0-9]/g, '');

        logger.info(`[parseFile] Row ${i}: raw="${rawPhone}", parsed phone="${phone}"`);

        if (phone && phone.length >= 8 && phone.length <= 15) {
          const variables = [];
          if (isMeta) {
            // Read exactly from Column B (index 1) onwards
            for (let j = 1; j < row.length; j++) {
              const cellVal = row[j];
              // Also handle numbers in variable columns
              const varStr = typeof cellVal === 'number' ? cellVal.toFixed(0) : (cellVal?.toString() || '');
              variables.push(varStr);
            }
            // Trim trailing empty variables
            while (variables.length > 0 && variables[variables.length - 1] === '') {
              variables.pop();
            }
          }
          records.push({ phone, variables });
        } else if (phone) {
          logger.warn(`[parseFile] Row ${i}: phone "${phone}" invalid length ${phone.length}, skipping`);
        }
      }
    }
    
    logger.info(`Parsed ${records.length} valid records`);
    fs.unlink(filePath, () => {});

    return records;
  }

  async createCampaign({ tenantId, name, message, templateId, templateLanguage, file, image, buttons, interactiveType, startDate, endDate, campaignType, channelId, metaCategory, contactGroupId, headerMedia }) {
    const isMeta = campaignType === 'META';
    // Image / video / PDF of a media-header template, sent to every recipient (checked before anything is charged)
    const media = isMeta ? normalizeHeaderMedia(headerMedia) : null;
    let records = [];

    // 1. Parse phones and variables from file OR Contact Group
    if (file) {
      records = await this.parseFile(file, isMeta);
    } else if (contactGroupId) {
      const whereClause = { tenantId };
      if (contactGroupId === 'unassigned') {
        whereClause.groupId = null;
      } else if (contactGroupId !== 'all') {
        whereClause.groupId = contactGroupId;
      }

      const contacts = await prisma.contact.findMany({ where: whereClause });
      records = contacts.map(c => {
        const variables = [];
        if (isMeta) {
          if (c.name && c.name !== 'Unknown') variables.push(c.name);
          if (c.metadata) {
            Object.keys(c.metadata).sort().forEach(k => {
              variables.push(String(c.metadata[k]));
            });
          }
        }
        return { phone: c.phone, variables };
      });
    }

    if (records.length === 0) {
      throw { status: 400, message: 'No valid phone numbers found in the uploaded file or selected group' };
    }

    // 2. Calculate Cost & Deduct Wallet
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
    
    // Price per message in the account's currency (see campaign.billing.js for who pays Meta)
    const messagePrice = unitPrice({ isMeta, category: metaCategory, settings: settings?.data || {}, tenant });
    const totalCost = Math.round(records.length * messagePrice * 10000) / 10000;

    // The charge and its ledger row are one atomic step; it fails when the balance does not cover it
    let charge = null;
    if (settings?.data?.enableWalletDeduction !== false && tenant.deductBalance !== false && totalCost > 0) {
      charge = await walletService.debit(tenantId, {
        amount: totalCost,
        type: 'CAMPAIGN_CHARGE',
        description: `${name || 'Campaign'} — ${records.length} recipients`,
        createdBy: 'SYSTEM'
      });
    }

    try {
      // 3. Create Campaign (PENDING state)
      const campaign = await prisma.campaign.create({
        data: {
          tenantId,
          channelId: channelId || null,
          name,
          message: message || null,
          templateId: templateLanguage ? `${templateLanguage}` : (templateId || null), // store templateLanguage in templateId for META
          mediaPath: image ? image.path : null,
          mediaMime: image ? image.mimetype : null,
          buttons: buttons ? JSON.stringify(buttons) : null,
          interactiveType: interactiveType || 'TEXT',
          startDate: startDate || null,
          endDate: endDate || null,
          campaignType: campaignType || 'BAILEYS',
          metaCategory: metaCategory || null,
          ...(media && { headerMedia: media }),
          totalCost: charge ? totalCost : 0,
          totalMessages: records.length,
          status: 'PENDING'
        }
      });

      // 3. Create Campaign Targets
      const targetData = records.map(record => ({
        campaignId: campaign.id,
        phone: record.phone,
        variables: isMeta ? JSON.stringify(record.variables) : null,
        status: 'PENDING'
      }));
    
      await prisma.campaignTarget.createMany({ data: targetData });

      if (charge) {
        await walletService.linkReference(charge.id, 'CAMPAIGN', campaign.id)
          .catch(err => logger.error(`[Wallet] Could not link charge ${charge.id} to campaign ${campaign.id}: ${err.message}`));
      }

      return {
        success: true,
        campaignId: campaign.id,
        totalNumbers: records.length,
        totalCost,
        message: 'Campaign created successfully and is ready to start.'
      };
    } catch (error) {
      // The campaign could not be created: give the money back instead of keeping it
      if (charge) {
        await walletService.refundCharge(charge, 'Campaign could not be created')
          .catch(err => logger.error(`[Wallet] Refund of charge ${charge.id} failed: ${err.message}`));
      }
      throw error;
    }
  }

  async updateCampaign({ tenantId, id, name, message, templateId, image, buttons, interactiveType, startDate, endDate }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId }
    });

    if (!campaign) {
      throw { status: 404, message: 'Campaign not found' };
    }

    if (campaign.status !== 'PENDING') {
      throw { status: 400, message: 'Can only edit campaigns that are in PENDING status' };
    }

    const data = {
      name,
      message: message || null,
      templateId: templateId || null,
      buttons: buttons ? JSON.stringify(buttons) : null,
      interactiveType: interactiveType || 'TEXT',
      startDate: startDate || null,
      endDate: endDate || null
    };

    if (image) {
      data.mediaPath = image.path;
      data.mediaMime = image.mimetype;
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data
    });

    return {
      success: true,
      data: updated,
      message: 'Campaign updated successfully.'
    };
  }

  async startCampaign(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: { where: { status: 'PENDING' } } }
    });

    if (!campaign) {
      throw { status: 404, message: 'Campaign not found' };
    }
    if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
      throw { status: 400, message: 'Campaign is already running or completed' };
    }

    // Calculate base delay if campaign has a future startDate
    const now = Date.now();
    const scheduledAt = campaign.startDate ? new Date(campaign.startDate).getTime() : null;
    const baseDelay = scheduledAt && scheduledAt > now ? scheduledAt - now : 0;
    const isScheduled = baseDelay > 0;

    // Add Jobs to BullMQ
    let jobs = [];
    if (campaign.campaignType === 'META') {
      const { metaCampaignQueue } = require('../../workers/meta.campaign.worker');
      jobs = campaign.targets.map((target) => ({
        name: 'send-meta-campaign-message',
        data: {
          campaignId: campaign.id,
          targetId: target.id,
          tenantId: campaign.tenantId,
          channelId: campaign.channelId,
          phone: target.phone,
          variables: target.variables ? JSON.parse(target.variables) : [],
          templateName: campaign.message,
          templateLanguage: campaign.templateId || 'ar', // templateId stores the language for META
          metaCategory: campaign.metaCategory,
          headerMedia: campaign.headerMedia || null
        },
        // Pace is set by the queue's rate limit (META_CAMPAIGN_RATE_PER_SECOND), not by spacing jobs out
        opts: baseDelay > 0 ? { delay: baseDelay } : {}
      }));
      if (jobs.length > 0) await metaCampaignQueue.addBulk(jobs);
    } else {
      jobs = campaign.targets.map((target, index) => {
        // Add a randomized delay between 5s and 15s for each message to avoid WhatsApp rate limiting
        const randomDelay = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
        return {
          name: 'send-campaign-message',
          data: {
            campaignId: campaign.id,
            targetId: target.id,
            tenantId: campaign.tenantId,
            phone: target.phone,
            message: campaign.message,
            templateId: campaign.templateId,
            mediaPath: campaign.mediaPath,
            mediaMime: campaign.mediaMime,
            buttons: campaign.buttons ? JSON.parse(campaign.buttons) : null,
            interactiveType: campaign.interactiveType || 'TEXT',
            channelId: campaign.channelId
          },
          opts: {
            removeOnComplete: true,
            removeOnFail: { age: 14 * 24 * 3600 },
            delay: baseDelay + (index * randomDelay)
          }
        };
      });
      if (jobs.length > 0) await campaignQueue.addBulk(jobs);
    }

    // The cost was charged when the campaign was created (campaign.billing.js keeps totalCost up to date)
    const totalMessages = campaign.targets.length;

    // If scheduled for future, set SCHEDULED status. Otherwise RUNNING.
    const newStatus = isScheduled ? 'SCHEDULED' : 'RUNNING';

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: newStatus,
        totalMessages
      }
    });

    return {
      success: true,
      status: newStatus,
      scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
      message: isScheduled
        ? `Campaign scheduled successfully. Messages will be sent at ${new Date(scheduledAt).toLocaleString()}.`
        : 'Campaign started successfully. Messages are being sent gradually.'
    };
  }


  async getCampaigns(tenantId, { page = 1, limit = 50, campaignType, channelId } = {}) {
    const where = { tenantId };
    if (campaignType) where.campaignType = campaignType;
    if (channelId) where.channelId = channelId;

    const total = await prisma.campaign.count({ where });
    const data = await prisma.campaign.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { targets: true }
        }
      }
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getCampaignStats(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: true }
    });

    if (!campaign) {
      throw { status: 404, message: 'Campaign not found' };
    }

    const total = campaign.targets.length;
    const sent = campaign.targets.filter(t => t.status === 'SENT').length;
    const failed = campaign.targets.filter(t => t.status === 'FAILED').length;
    const pending = campaign.targets.filter(t => t.status === 'PENDING').length;

    const errorBreakdown = {};
    campaign.targets.filter(t => t.status === 'FAILED' && t.error).forEach(t => {
      const errGroup = t.error.split(':')[0] || 'Unknown Error';
      errorBreakdown[errGroup] = (errorBreakdown[errGroup] || 0) + 1;
    });

    // Check if campaign is finished
    if (pending === 0 && campaign.status === 'RUNNING') {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED' }
      });
      campaign.status = 'COMPLETED';
    }
    // Refund the failed messages now instead of waiting for the next sweep
    if (failed > 0) {
      await settle(campaign.id).catch(err => logger.warn(`[CampaignBilling] Settling campaign ${campaign.id} failed: ${err.message}`));
    }

    return {
      status: campaign.status,
      stats: { total, sent, failed, pending },
      errorBreakdown
    };
  }

  async getTargets(tenantId, campaignId, { page = 1, limit = 50, status, search }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    const where = { campaignId };
    if (status && status !== 'ALL') {
      if (['PENDING', 'SENT', 'FAILED'].includes(status)) {
        where.status = status;
      } else {
        where.status = 'FAILED';
        where.error = { startsWith: status };
      }
    }
    if (search) where.phone = { contains: search };

    const total = await prisma.campaignTarget.count({ where });
    const targets = await prisma.campaignTarget.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'asc' }
    });

    return {
      targets,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async retryFailed(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: { where: { status: 'FAILED' } } }
    });

    if (!campaign) throw { status: 404, message: 'Campaign not found' };
    if (campaign.targets.length === 0) throw { status: 400, message: 'No failed targets found' };

    // Failed messages were refunded: the retry is paid first (fails with INSUFFICIENT_BALANCE when the wallet is short)
    await settle(campaign.id, { includeFailed: true });

    // Update targets to PENDING
    await prisma.campaignTarget.updateMany({
      where: { campaignId: campaign.id, status: 'FAILED' },
      data: { status: 'PENDING', error: null }
    });

    // Add Jobs to BullMQ - route to correct queue based on campaign type
    if (campaign.campaignType === 'META') {
      const { metaCampaignQueue } = require('../../workers/meta.campaign.worker');
      const jobs = campaign.targets.map(target => ({
        name: 'send-meta-campaign-message',
        data: {
          campaignId: campaign.id,
          targetId: target.id,
          tenantId: campaign.tenantId,
          channelId: campaign.channelId,
          phone: target.phone,
          variables: target.variables ? JSON.parse(target.variables) : [],
          templateName: campaign.message,
          templateLanguage: campaign.templateId || null, // templateId stores language for META
          metaCategory: campaign.metaCategory,
          headerMedia: campaign.headerMedia || null
        },
        opts: { removeOnComplete: true, removeOnFail: { age: 14 * 24 * 3600 } }
      }));
      if (jobs.length > 0) await metaCampaignQueue.addBulk(jobs);
    } else {
      const jobs = campaign.targets.map(target => ({
        name: 'send-campaign-message',
        data: {
          campaignId: campaign.id,
          targetId: target.id,
          tenantId,
          phone: target.phone,
          message: campaign.message,
          templateId: campaign.templateId,
          mediaPath: campaign.mediaPath,
          mediaMime: campaign.mediaMime,
          buttons: campaign.buttons ? JSON.parse(campaign.buttons) : null,
          interactiveType: campaign.interactiveType || 'TEXT',
          channelId: campaign.channelId
        },
        opts: { removeOnComplete: true, removeOnFail: { age: 14 * 24 * 3600 } }
      }));
      if (jobs.length > 0) await campaignQueue.addBulk(jobs);
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING' }
    });

    return { success: true, message: 'Failed messages are being retried.' };
  }
  async getInteractions(tenantId, campaignId, { page = 1, limit = 50, search, status }) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    if (status === 'NO_RESPONSE') {
      const whereTarget = { campaignId, tenantId, status: 'SENT', interactions: { none: {} } };
      if (search) whereTarget.phone = { contains: search };
      
      const totalInteractions = await prisma.campaignTarget.count({ where: whereTarget });
      const targets = await prisma.campaignTarget.findMany({
        where: whereTarget,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });
      
      const interactions = targets.map(t => ({
        id: t.id,
        phone: t.phone,
        buttonText: 'No Response',
        createdAt: t.createdAt
      }));

      // Calculate stats if needed
      let stats = null;
      if (page === 1 && !search) {
        const totalSent = await prisma.campaignTarget.count({ where: { campaignId, status: 'SENT' } });
        const uniqueInteracted = await prisma.buttonInteraction.groupBy({
          by: ['phone'], where: { campaignId, tenantId }, _count: true
        });
        const buttonBreakdownGroups = await prisma.buttonInteraction.groupBy({
          by: ['buttonText'], where: { campaignId, tenantId }, _count: { buttonText: true }
        });
        const buttonStats = {};
        buttonBreakdownGroups.forEach(g => { buttonStats[g.buttonText] = g._count.buttonText; });
        stats = { total: totalSent, interacted: uniqueInteracted.length, notInteracted: totalSent - uniqueInteracted.length, buttonBreakdown: buttonStats };
      }

      return { interactions, stats, total: totalInteractions, page, totalPages: Math.ceil(totalInteractions / limit) };
    }

    const where = { campaignId, tenantId };
    if (search) where.phone = { contains: search };
    if (status && status !== 'ALL') where.buttonText = status;

    const totalInteractions = await prisma.buttonInteraction.count({ where });
    const interactions = await prisma.buttonInteraction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Fast stats using aggregation (no need to fetch everything if just asking for stats)
    // Only calculate full stats if page is 1 to save DB load
    let stats = null;
    if (page === 1 && !search) {
      const totalSent = await prisma.campaignTarget.count({
        where: { campaignId, status: 'SENT' }
      });
      const uniqueInteracted = await prisma.buttonInteraction.groupBy({
        by: ['phone'],
        where: { campaignId, tenantId },
        _count: true
      });
      
      const buttonBreakdownGroups = await prisma.buttonInteraction.groupBy({
        by: ['buttonText'],
        where: { campaignId, tenantId },
        _count: { buttonText: true }
      });
      
      const buttonStats = {};
      buttonBreakdownGroups.forEach(g => {
        buttonStats[g.buttonText] = g._count.buttonText;
      });

      stats = {
        total: totalSent,
        interacted: uniqueInteracted.length,
        notInteracted: totalSent - uniqueInteracted.length,
        buttonBreakdown: buttonStats
      };
    }

    return {
      interactions,
      stats,
      total: totalInteractions,
      page,
      totalPages: Math.ceil(totalInteractions / limit)
    };
  }
  
  async exportCampaignData(tenantId, campaignId, type, status) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    let csv = '';
    if (type === 'targets') {
      const where = { campaignId };
      if (status && status !== 'ALL') {
        if (['PENDING', 'SENT', 'FAILED'].includes(status)) {
          where.status = status;
        } else {
          where.status = 'FAILED';
          where.error = { startsWith: status };
        }
      }
      const targets = await prisma.campaignTarget.findMany({ where, orderBy: { id: 'asc' } });
      csv = 'Phone,Status,Error,SentAt\n';
      targets.forEach(t => {
        csv += `"${t.phone}","${t.status}","${t.error || ''}","${t.createdAt}"
`;
      });
    } else if (type === 'interactions') {
      if (status === 'NO_RESPONSE') {
        const whereTarget = { campaignId, tenantId, status: 'SENT', interactions: { none: {} } };
        const targets = await prisma.campaignTarget.findMany({ where: whereTarget, orderBy: { createdAt: 'desc' } });
        csv = 'Phone,InteractionType,Button/Text,Time\n';
        targets.forEach(t => {
          csv += `"${t.phone}","NONE","No Response","${t.createdAt}"\n`;
        });
      } else {
        const where = { campaignId, tenantId };
        if (status && status !== 'ALL') where.buttonText = status;
        const interactions = await prisma.buttonInteraction.findMany({ where, orderBy: { createdAt: 'desc' } });
        csv = 'Phone,InteractionType,Button/Text,Time\n';
        interactions.forEach(i => {
          csv += `"${i.phone}","${i.interactionType}","${i.buttonText}","${i.createdAt}"\n`;
        });
      }
    }
    return csv;
  }
}

module.exports = new CampaignService();
