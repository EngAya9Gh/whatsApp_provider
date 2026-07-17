const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const { campaignQueue } = require('../../workers/campaign.worker');

const fs = require('fs');

class CampaignService {
  async parseFile(file) {
    const phones = new Set();
    const filePath = file.path;
    const fs = require('fs');
    console.log('[DEBUG] Parsing file:', filePath);
    console.log('[DEBUG] File exists?', fs.existsSync(filePath));
    console.log('[DEBUG] CWD:', process.cwd());
    
    if (file.mimetype === 'text/csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => {
            const phone = Object.values(data).find(val => /^[0-9]{10,15}$/.test(val?.toString().replace(/[^0-9]/g, '')));
            if (phone) phones.add(phone.replace(/[^0-9]/g, ''));
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      data.forEach(row => {
        row.forEach(cell => {
          const val = cell?.toString().replace(/[^0-9]/g, '');
          if (val && val.length >= 10 && val.length <= 15) {
            phones.add(val);
          }
        });
      });
    }
    
    fs.unlink(filePath, () => {});

    return Array.from(phones);
  }

  async createCampaign({ tenantId, name, message, templateId, file, image, buttons, interactiveType }) {
    // 1. Parse phones from file
    const phones = await this.parseFile(file);
    if (phones.length === 0) {
      throw { status: 400, message: 'No valid phone numbers found in the uploaded file' };
    }

    // 2. Create Campaign (PENDING state)
    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name,
        message: message || null,
        templateId: templateId || null,
        mediaPath: image ? image.path : null,
        mediaMime: image ? image.mimetype : null,
        buttons: buttons ? JSON.stringify(buttons) : null,
        interactiveType: interactiveType || 'TEXT',
        status: 'PENDING'
      }
    });

    // 3. Create Campaign Targets
    const targetData = phones.map(phone => ({
      campaignId: campaign.id,
      phone,
      status: 'PENDING'
    }));
    
    await prisma.campaignTarget.createMany({ data: targetData });

    return {
      success: true,
      campaignId: campaign.id,
      totalNumbers: phones.length,
      message: 'Campaign created successfully and is ready to start.'
    };
  }

  async updateCampaign({ tenantId, id, name, message, templateId, image, buttons, interactiveType }) {
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
      interactiveType: interactiveType || 'TEXT'
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

    // Add Jobs to BullMQ
    const jobs = campaign.targets.map((target, index) => {
      // Add a randomized delay between 5s and 15s for each message to avoid WhatsApp rate limiting
      const randomDelay = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
      return {
        name: 'send-campaign-message',
        data: {
          tenantId,
          phone: target.phone,
          message: campaign.message,
          templateId: campaign.templateId,
          mediaPath: campaign.mediaPath,
          mediaMime: campaign.mediaMime,
          buttons: campaign.buttons,
          interactiveType: campaign.interactiveType || 'TEXT',
          targetId: target.id
        },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
          delay: index * randomDelay
        }
      };
    });
    
    if (jobs.length > 0) {
      await campaignQueue.addBulk(jobs);
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING' }
    });

    return {
      success: true,
      message: 'Campaign started successfully. Messages are being sent gradually.'
    };
  }

  async getCampaigns(tenantId) {
    return await prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { targets: true }
        }
      }
    });
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
      stats: { total, sent, failed, pending }
    };
  }

  async getTargets(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: true }
    });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };
    return campaign.targets;
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
  async getInteractions(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    const interactions = await prisma.buttonInteraction.findMany({
      where: { campaignId, tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Get all targets to find who did NOT interact
    const targets = await prisma.campaignTarget.findMany({
      where: { campaignId, status: 'SENT' }
    });

    const interactedPhones = new Set(interactions.map(i => i.phone));
    const notInteracted = targets.filter(t => !interactedPhones.has(t.phone)).map(t => t.phone);

    // Button stats
    const buttonStats = {};
    for (const interaction of interactions) {
      const key = interaction.buttonText;
      buttonStats[key] = (buttonStats[key] || 0) + 1;
    }

    return {
      interactions,
      notInteracted,
      stats: {
        total: targets.length,
        interacted: interactedPhones.size,
        notInteracted: notInteracted.length,
        buttonBreakdown: buttonStats
      }
    };
  }
}

module.exports = new CampaignService();
