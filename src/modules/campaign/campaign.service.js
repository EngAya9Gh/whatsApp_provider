const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const { campaignQueue } = require('../../workers/campaign.worker');

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
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      logger.info(`Excel rows count: ${data.length}`);
      if (data.length > 0) logger.info(`First row: ${JSON.stringify(data[0])}`);
      
      // Check if first row is header
      let startIndex = 0;
      if (data.length > 0) {
        const firstCell = data[0][0]?.toString().replace(/[^0-9]/g, '');
        if (!firstCell || firstCell.length < 8) {
          startIndex = 1; // Skip header row
        }
      }

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        let phone = row[0]?.toString() || '';
        phone = phone.replace(/[^0-9]/g, '');

        if (phone && phone.length >= 8 && phone.length <= 18) {
          const variables = [];
          if (isMeta) {
            // Read exactly from Column B (index 1) onwards
            for (let j = 1; j < row.length; j++) {
              variables.push(row[j]?.toString() || '');
            }
            // Trim trailing empty variables
            while (variables.length > 0 && variables[variables.length - 1] === '') {
              variables.pop();
            }
          }
          records.push({ phone, variables });
        }
      }
    }
    
    logger.info(`Parsed ${records.length} valid records`);
    fs.unlink(filePath, () => {});

    return records;
  }

  async createCampaign({ tenantId, name, message, templateId, file, image, buttons, interactiveType, startDate, endDate, campaignType, channelId, metaCategory }) {
    const isMeta = campaignType === 'META';
    // 1. Parse phones and variables from file
    const records = await this.parseFile(file, isMeta);
    if (records.length === 0) {
      throw { status: 400, message: 'No valid phone numbers found in the uploaded file (ensure phone is in the first column)' };
    }

    // 2. Calculate Cost & Deduct Wallet
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } });
    
    let messagePrice = 0;
    
    if (isMeta) {
      // Get category price (marketing, utility, authentication, service)
      const category = (metaCategory || 'marketing').toLowerCase();
      let baseCost = settings?.data?.[`${category}BaseCost`] || 0.0501;
      let markupPercent = settings?.data?.[`${category}MarkupPercent`] || 20;
      messagePrice = baseCost + (baseCost * (markupPercent / 100));
    } else {
      messagePrice = settings?.data?.qrMessagePrice || 0.05;
    }
    
    const totalCostSar = records.length * messagePrice;
    
    // Convert to USD if tenant uses USD
    let totalCost = totalCostSar;
    const exchangeRate = settings?.data?.exchangeRateUsdToSar || 3.75;
    if (tenant.currency === 'USD') {
      totalCost = totalCostSar / exchangeRate;
    }

    if (settings?.data?.enableWalletDeduction !== false && tenant.deductBalance !== false) {
      if (tenant.walletBalance < totalCost) {
        throw { status: 400, message: `Insufficient wallet balance. Estimated cost: ${totalCost.toFixed(4)} ${tenant.currency || 'SAR'}, Available: ${tenant.walletBalance.toFixed(4)} ${tenant.currency || 'SAR'}` };
      }

      // Deduct from wallet
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          walletBalance: { decrement: totalCost }
        }
      });
    }

    // 3. Create Campaign (PENDING state)
    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        channelId: channelId || null,
        name,
        message: message || null,
        templateId: templateId || null,
        mediaPath: image ? image.path : null,
        mediaMime: image ? image.mimetype : null,
        buttons: buttons ? JSON.stringify(buttons) : null,
        interactiveType: interactiveType || 'TEXT',
        startDate: startDate || null,
        endDate: endDate || null,
        campaignType: campaignType || 'BAILEYS',
        metaCategory: metaCategory || null,
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

    return {
      success: true,
      campaignId: campaign.id,
      totalNumbers: records.length,
      totalCost,
      message: 'Campaign created successfully and is ready to start.'
    };
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
      jobs = campaign.targets.map((target, index) => ({
        name: 'send-meta-campaign-message',
        data: {
          campaignId: campaign.id,
          targetId: target.id,
          tenantId: campaign.tenantId,
          channelId: campaign.channelId,
          phone: target.phone,
          variables: target.variables ? JSON.parse(target.variables) : [],
          templateName: campaign.message,
          metaCategory: campaign.metaCategory
        },
        opts: { delay: baseDelay + (index * 1000) } // Stagger by 1 sec after base delay
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
            removeOnFail: false,
            delay: baseDelay + (index * randomDelay)
          }
        };
      });
      if (jobs.length > 0) await campaignQueue.addBulk(jobs);
    }

    // Calculate Pricing for META
    let totalCost = 0;
    const totalMessages = campaign.targets.length;

    if (campaign.campaignType === 'META' && campaign.metaCategory) {
      try {
        const { getSystemSettings } = require('../admin/admin.service').prototype;
        const adminService = new (require('../admin/admin.service'))();
        const settings = await adminService.getSystemSettings();
        
        let baseCost = 0;
        let markup = 0;
        const cat = campaign.metaCategory.toLowerCase();
        
        if (cat === 'utility') {
          baseCost = settings.utilityBaseCost || 0;
          markup = settings.utilityMarkupPercent || 0;
        } else if (cat === 'marketing') {
          baseCost = settings.marketingBaseCost || 0;
          markup = settings.marketingMarkupPercent || 0;
        } else if (cat === 'authentication') {
          baseCost = settings.authenticationBaseCost || 0;
          markup = settings.authenticationMarkupPercent || 0;
        }
        
        const costPerMessage = baseCost * (1 + (markup / 100));
        totalCost = costPerMessage * totalMessages;
      } catch (e) {
        console.error('[CampaignService] Failed to calculate total cost', e);
      }
    }

    // If scheduled for future, set SCHEDULED status. Otherwise RUNNING.
    const newStatus = isScheduled ? 'SCHEDULED' : 'RUNNING';

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { 
        status: newStatus,
        totalCost,
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

    // Update targets to PENDING
    await prisma.campaignTarget.updateMany({
      where: { campaignId: campaign.id, status: 'FAILED' },
      data: { status: 'PENDING', error: null }
    });

    // Add Jobs to BullMQ
    const jobs = campaign.targets.map(target => ({
      name: 'send-campaign-msg',
      data: {
        tenantId,
        phone: target.phone,
        message: campaign.message,
        templateId: campaign.templateId,
        mediaPath: campaign.mediaPath,
        mediaMime: campaign.mediaMime,
        targetId: target.id
      },
      opts: {
        removeOnComplete: true,
        removeOnFail: false
      }
    }));
    
    if (jobs.length > 0) {
      await campaignQueue.addBulk(jobs);
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
