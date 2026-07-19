const fs = require('fs');
const filePath = 'src/modules/campaign/campaign.service.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldGetTargets = `  async getTargets(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: true }
    });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };
    return campaign.targets;
  }`;

const newGetTargets = `  async getTargets(tenantId, campaignId, { page = 1, limit = 50, status, search }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    const where = { campaignId };
    if (status && status !== 'ALL') where.status = status;
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
  }`;

content = content.replace(oldGetTargets, newGetTargets);
fs.writeFileSync(filePath, content);
console.log('Patched getTargets');
