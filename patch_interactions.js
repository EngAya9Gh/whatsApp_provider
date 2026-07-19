const fs = require('fs');
const filePath = 'src/modules/campaign/campaign.service.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldGetInteractions = `  async getInteractions(tenantId, campaignId) {
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
  }`;

const newGetInteractions = `  async getInteractions(tenantId, campaignId, { page = 1, limit = 50, search }) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    const where = { campaignId, tenantId };
    if (search) where.phone = { contains: search };

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
      if (status && status !== 'ALL') where.status = status;
      const targets = await prisma.campaignTarget.findMany({ where, orderBy: { id: 'asc' } });
      csv = 'Phone,Status,Error,SentAt\n';
      targets.forEach(t => {
        csv += \`"\${t.phone}","\${t.status}","\${t.error || ''}","\${t.createdAt}"\n\`;
      });
    } else if (type === 'interactions') {
      const interactions = await prisma.buttonInteraction.findMany({ where: { campaignId, tenantId }, orderBy: { createdAt: 'desc' } });
      csv = 'Phone,InteractionType,Button/Text,Time\n';
      interactions.forEach(i => {
        csv += \`"\${i.phone}","\${i.interactionType}","\${i.buttonText}","\${i.createdAt}"\n\`;
      });
    }
    return csv;
  }`;

content = content.replace(oldGetInteractions, newGetInteractions);
fs.writeFileSync(filePath, content);
console.log('Patched getInteractions');
