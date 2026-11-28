const prisma = require('../../config/prisma');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const stream = require('stream');
const { campaignQueue } = require('../../workers/campaign.worker');
const walletService = require('../wallet/wallet.service');
const { unitPrice, settle } = require('./campaign.billing');
const { normalizeHeaderMedia } = require('../meta/meta.templateMedia');
const { templateSpec, REASON_TEXT } = require('../meta/meta.templateSpec');
const templateLookup = require('../meta/meta.templateLookup');
const audience = require('./campaign.audience');
const dispatcher = require('./campaign.dispatcher');
const logger = require('../../utils/logger');

const fs = require('fs');

const bad = (status, message, code) => ({ status, message, ...(code && { code }) });
const MAPPING_SOURCES = ['name', 'phone', 'field', 'text'];
const clip = (v, n) => (v === undefined || v === null ? undefined : String(v).slice(0, n));
const parseJson = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { throw bad(400, 'Invalid JSON in the request'); }
};

class CampaignService {
  /** The account's Meta number (the given one, or its first) */
  async metaChannelFor(tenantId, channelId) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { tenantId, providerType: 'META_CLOUD', ...(channelId && { id: channelId }) }
    });
    if (!channel) throw bad(400, 'No Meta WhatsApp number found for this account. Connect one first.', 'NO_META_CHANNEL');
    return channel;
  }

  /**
   * The template's columns: { spec, checked }. spec = null when Meta could not be asked (the file is then sent as
   * it is, like before). A template that is not approved in this language is refused.
   */
  async templateFor(channel, templateName, language) {
    const { reachable, template } = await templateLookup.lookup(channel, templateName, language || null);
    if (!reachable) {
      logger.warn(`[Campaign] Could not ask Meta for template "${templateName}"; the file is not checked against it`);
      return { spec: null, checked: false };
    }
    if (!template) {
      throw bad(400, `The template "${templateName}"${language ? ` (${language})` : ''} is not approved on this WhatsApp number.`, 'TEMPLATE_NOT_FOUND');
    }
    return { spec: templateSpec(template), checked: true };
  }

  /** Local numbers' country: the one asked for, else the country of the account's own number, else Saudi Arabia */
  countryFor(countryCode, channel) {
    if (countryCode === 'none') return null;
    if (countryCode) return audience.countryOf(countryCode);
    const own = String(channel?.displayPhoneNumber || channel?.phoneNumber || '').replace(/\D/g, '');
    const byLength = [...audience.COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    return byLength.find(c => own.startsWith(c.code)) || audience.countryOf('966');
  }

  /** [{ source, key?, text?, fallback? }] per variable, or null when not given / not valid */
  cleanMapping(mapping, spec) {
    const list = parseJson(mapping);
    if (!Array.isArray(list) || !spec || list.length !== spec.variables.length) return null;
    return list.map(m => ({
      source: MAPPING_SOURCES.includes(m?.source) ? m.source : 'text',
      ...(m?.key !== undefined && { key: clip(m.key, 100) }),
      ...(m?.text !== undefined && { text: clip(m.text, 1000) }),
      ...(m?.fallback !== undefined && { fallback: clip(m.fallback, 1000) })
    }));
  }

  /**
   * The recipients of a Meta campaign and the report on them: { records, report, fields?, mapping? }.
   * report.blocking = { code, message } when the campaign cannot be created from this audience.
   */
  async resolveAudience({ tenantId, file, contactGroupId, spec, country, mapping, fallbacks }) {
    let result;
    if (file) {
      let rows;
      try {
        rows = audience.readRows(file.path, file.originalname);
      } finally {
        fs.unlink(file.path, () => {});
      }
      const values = parseJson(fallbacks);
      result = audience.buildAudience(rows, { spec, country, fallbacks: Array.isArray(values) ? values.map(v => clip(v, 1000)) : [] });
    } else if (contactGroupId) {
      const where = { tenantId };
      if (contactGroupId === 'unassigned') where.groupId = null;
      else if (contactGroupId !== 'all') where.groupId = contactGroupId;
      const contacts = await prisma.contact.findMany({ where, select: { phone: true, name: true, metadata: true } });
      const fields = audience.contactFields(contacts);
      const map = spec ? (this.cleanMapping(mapping, spec) || audience.defaultMapping(spec, fields)) : null;
      result = audience.buildAudience(audience.contactRows(contacts, spec, map), {
        spec, country, header: false, fallbacks: map ? map.map(m => m.fallback) : []
      });
      result.fields = fields;
      result.mapping = map;
    } else {
      throw bad(400, 'Upload an Excel / CSV file or choose a contact group');
    }

    const { report } = result;
    const need = spec?.variables.length || 0;
    if (spec && !spec.supported) {
      report.blocking = { code: 'TEMPLATE_UNSUPPORTED', message: REASON_TEXT[spec.reason] };
    } else if (file && need > 0 && report.rows > 0 && report.columns.found < need) {
      report.blocking = {
        code: 'COLUMNS_MISSING',
        message: `The template needs ${need} value column${need === 1 ? '' : 's'} after the phone column (${audience.columnLetter(1)}${need > 1 ? `–${audience.columnLetter(need)}` : ''}), but the file has ${report.columns.found}.`
      };
    } else if (!result.records.length) {
      report.blocking = { code: 'NO_RECIPIENTS', message: 'No valid phone numbers found in the uploaded file or selected group' };
    } else {
      report.blocking = null;
    }
    return result;
  }

  /** What a Meta campaign would send, before creating it: the checked audience, its cost and how long it takes */
  async previewAudience(tenantId, { channelId, templateName, templateLanguage, metaCategory, contactGroupId, countryCode, mapping, fallbacks }, file) {
    try {
      if (!templateName) throw bad(400, 'Choose a template first');
      const channel = await this.metaChannelFor(tenantId, channelId);
      const { spec, checked } = await this.templateFor(channel, templateName, templateLanguage);
      const country = this.countryFor(countryCode, channel);
      const result = await this.resolveAudience({ tenantId, file, contactGroupId, spec, country, mapping, fallbacks });
      file = null;

      const [tenant, settings] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId } }),
        prisma.systemSetting.findUnique({ where: { id: 'GLOBAL' } })
      ]);
      const unit = unitPrice({ isMeta: true, category: spec?.category || metaCategory, settings: settings?.data || {}, tenant });
      const count = result.records.length;
      const charged = settings?.data?.enableWalletDeduction !== false && tenant.deductBalance !== false;
      const total = Math.round(count * unit * 10000) / 10000;
      const perSecond = dispatcher.rateFor(channel);

      return {
        template: spec && { name: spec.name, language: spec.language, category: spec.category, body: spec.body, variables: spec.variables, examples: spec.examples, headerMedia: spec.headerMedia },
        templateChecked: checked,
        country: country?.code || null,
        report: result.report,
        fields: result.fields,
        mapping: result.mapping,
        cost: { unit, total, currency: tenant.currency || 'SAR', charged, balance: Math.round((tenant.walletBalance || 0) * 100) / 100, enough: !charged || (tenant.walletBalance || 0) >= total },
        eta: { perSecond, seconds: Math.ceil(count / perSecond) }
      };
    } finally {
      if (file?.path) fs.unlink(file.path, () => {});
    }
  }

  /** The .xlsx a template's campaign file should look like: { buffer, filename } */
  async sampleFile(tenantId, { channelId, templateName, templateLanguage }) {
    if (!templateName) throw bad(400, 'Choose a template first');
    const channel = await this.metaChannelFor(tenantId, channelId);
    const { spec } = await this.templateFor(channel, templateName, templateLanguage);
    if (!spec) throw bad(503, 'Meta could not be reached to read the template. Try again in a minute.', 'META_UNREACHABLE');
    const safe = String(templateName).replace(/[^\w.-]+/g, '_').slice(0, 60) || 'template';
    return { buffer: audience.sampleWorkbook(spec), filename: `campaign-${safe}.xlsx` };
  }


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

  async createCampaign({ tenantId, name, message, templateId, templateLanguage, file, image, buttons, interactiveType, startDate, endDate, campaignType, channelId, metaCategory, contactGroupId, headerMedia, countryCode, mapping, fallbacks }) {
    const isMeta = campaignType === 'META';
    // Image / video / PDF of a media-header template, sent to every recipient (checked before anything is charged)
    const media = isMeta ? normalizeHeaderMedia(headerMedia) : null;
    let records = [];

    if (isMeta) {
      // The file / group is checked against the template before anything is charged
      let channel;
      let spec = null;
      try {
        channel = await this.metaChannelFor(tenantId, channelId);
        ({ spec } = await this.templateFor(channel, message, templateLanguage));
      } catch (err) {
        if (file?.path) fs.unlink(file.path, () => {});
        throw err;
      }
      if (spec?.headerMedia && !media) throw bad(400, 'This template starts with an image / video / PDF: upload it or give its link.', 'HEADER_MEDIA_REQUIRED');
      const result = await this.resolveAudience({ tenantId, file, contactGroupId, spec, country: this.countryFor(countryCode, channel), mapping, fallbacks });
      if (result.report.blocking) throw bad(400, result.report.blocking.message, result.report.blocking.code);
      records = result.records;
      channelId = channel.id;
      templateLanguage = templateLanguage || spec?.language || 'ar';
      metaCategory = spec?.category || metaCategory;
    } else if (file) {
      // 1. Parse phones from the file OR the contact group
      records = await this.parseFile(file, false);
    } else if (contactGroupId) {
      const whereClause = { tenantId };
      if (contactGroupId === 'unassigned') {
        whereClause.groupId = null;
      } else if (contactGroupId !== 'all') {
        whereClause.groupId = contactGroupId;
      }
      const contacts = await prisma.contact.findMany({ where: whereClause, select: { phone: true } });
      records = contacts.map(c => ({ phone: c.phone, variables: [] }));
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
      // 3. The campaign (PENDING = draft) and its recipients, all or nothing
      const campaign = await prisma.$transaction(async (tx) => {
        const created = await tx.campaign.create({
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

        for (let i = 0; i < records.length; i += 5000) {
          await tx.campaignTarget.createMany({
            data: records.slice(i, i + 5000).map(record => ({
              campaignId: created.id,
              phone: record.phone,
              variables: isMeta ? JSON.stringify(record.variables) : null,
              status: 'PENDING'
            }))
          });
        }
        return created;
      }, { maxWait: 10000, timeout: 120000 });

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
    const found = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!found) {
      throw { status: 404, message: 'Campaign not found' };
    }
    if (found.campaignType === 'META') return this.launchMetaCampaign(found);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { targets: { where: { status: 'PENDING' } } }
    });
    if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      throw { status: 400, message: 'Campaign is already running or completed' };
    }

    // Calculate base delay if campaign has a future startDate
    const now = Date.now();
    const scheduledAt = campaign.startDate ? new Date(campaign.startDate).getTime() : null;
    const baseDelay = scheduledAt && scheduledAt > now ? scheduledAt - now : 0;
    const isScheduled = baseDelay > 0;

    // QR campaigns: one delayed job per recipient, spaced out to avoid WhatsApp bans
    {
      const jobs = campaign.targets.map((target, index) => {
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
      for (let i = 0; i < jobs.length; i += 1000) await campaignQueue.addBulk(jobs.slice(i, i + 1000));
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


  /** META: launched now or at its start date; campaign.dispatcher.js sends it in waves from the worker */
  async launchMetaCampaign(campaign) {
    if (campaign.status !== 'PENDING') throw bad(400, 'Campaign is already launched');
    const channel = await this.metaChannelFor(campaign.tenantId, campaign.channelId);
    const now = new Date();
    const scheduled = campaign.startDate && new Date(campaign.startDate) > now;
    const status = scheduled ? 'SCHEDULED' : 'RUNNING';
    const r = await prisma.campaign.updateMany({ where: { id: campaign.id, status: 'PENDING' }, data: { status, launchedAt: now } });
    if (!r.count) throw bad(409, 'Campaign is already launched');
    const perSecond = dispatcher.rateFor(channel);
    return {
      success: true,
      status,
      scheduledAt: scheduled ? new Date(campaign.startDate).toISOString() : null,
      eta: { perSecond, seconds: Math.ceil((campaign.totalMessages || 0) / perSecond) },
      message: scheduled
        ? `Campaign scheduled. Messages will be sent from ${new Date(campaign.startDate).toISOString()}.`
        : `Campaign started: about ${perSecond} messages per second.`
    };
  }

  async ownCampaign(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, tenantId } });
    if (!campaign) throw bad(404, 'Campaign not found');
    return campaign;
  }

  async getCampaign(tenantId, campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
      include: { _count: { select: { targets: true } }, channel: { select: { id: true, name: true, displayPhoneNumber: true, isCoexistence: true } } }
    });
    if (!campaign) throw bad(404, 'Campaign not found');
    return { ...campaign, canPause: campaign.campaignType === 'META' && !!campaign.launchedAt };
  }

  /** META campaigns sent in waves: no new wave goes out; messages already in the queue go back to waiting */
  async pauseCampaign(tenantId, campaignId) {
    const campaign = await this.ownCampaign(tenantId, campaignId);
    if (campaign.campaignType !== 'META' || !campaign.launchedAt) throw bad(400, 'Only Meta campaigns can be paused');
    const r = await prisma.campaign.updateMany({ where: { id: campaignId, status: { in: ['RUNNING', 'SCHEDULED'] } }, data: { status: 'PAUSED' } });
    if (!r.count) throw bad(400, 'Only a running or scheduled campaign can be paused');
    return { success: true, status: 'PAUSED' };
  }

  async resumeCampaign(tenantId, campaignId) {
    const campaign = await this.ownCampaign(tenantId, campaignId);
    const status = campaign.startDate && new Date(campaign.startDate) > new Date() ? 'SCHEDULED' : 'RUNNING';
    const r = await prisma.campaign.updateMany({ where: { id: campaignId, status: 'PAUSED' }, data: { status } });
    if (!r.count) throw bad(400, 'Only a paused campaign can be resumed');
    return { success: true, status };
  }

  /** Stops a campaign for good (a draft too): what was not sent yet is cancelled and refunded */
  async stopCampaign(tenantId, campaignId) {
    const campaign = await this.ownCampaign(tenantId, campaignId);
    const r = await prisma.campaign.updateMany({
      where: { id: campaignId, status: { in: ['PENDING', 'SCHEDULED', 'RUNNING', 'PAUSED'] } },
      data: { status: 'CANCELLED', completedAt: new Date() }
    });
    if (!r.count) throw bad(400, `A ${String(campaign.status).toLowerCase()} campaign cannot be stopped`);
    const cancelled = await prisma.campaignTarget.updateMany({ where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } }, data: { status: 'CANCELLED' } });
    const billing = await settle(campaignId).catch(err => {
      logger.error(`[Campaign] Refund of stopped campaign ${campaignId} failed: ${err.message}`);
      return null;
    });
    return { success: true, status: 'CANCELLED', cancelled: cancelled.count, refunded: billing?.refunded || 0 };
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
      select: { id: true, status: true, campaignType: true, launchedAt: true, channelId: true, startDate: true }
    });

    if (!campaign) {
      throw { status: 404, message: 'Campaign not found' };
    }

    // Counted in the database (index on campaign + status), not by loading every recipient
    const [byStatus, errors] = await Promise.all([
      prisma.campaignTarget.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } }),
      prisma.campaignTarget.groupBy({ by: ['error'], where: { campaignId, status: 'FAILED' }, _count: { _all: true }, orderBy: { _count: { error: 'desc' } }, take: 50 })
    ]);
    const n = Object.fromEntries(byStatus.map(r => [r.status, r._count._all]));
    const total = byStatus.reduce((sum, r) => sum + r._count._all, 0);
    const sent = n.SENT || 0;
    const failed = n.FAILED || 0;
    const queued = n.QUEUED || 0;
    const pending = (n.PENDING || 0) + queued;
    const cancelled = n.CANCELLED || 0;

    const errorBreakdown = {};
    for (const e of errors) {
      const group = (e.error || 'Unknown Error').split(':')[0] || 'Unknown Error';
      errorBreakdown[group] = (errorBreakdown[group] || 0) + e._count._all;
    }

    // Delivered / read from Meta's status webhooks (Meta campaigns)
    let delivered = 0;
    let read = 0;
    if (campaign.campaignType === 'META') {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          const CampaignDelivery = require('../../models/mongo/CampaignDelivery');
          const rows = await CampaignDelivery.aggregate([{ $match: { campaignId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
          const d = Object.fromEntries(rows.map(r => [r._id, r.n]));
          read = d.read || 0;
          delivered = (d.delivered || 0) + read;
        }
      } catch (err) {
        logger.warn(`[Campaign] Delivery counts of ${campaignId} unavailable: ${err.message}`);
      }
    }

    // Older campaigns (sent without waves) are marked finished here
    if (pending === 0 && campaign.status === 'RUNNING' && !campaign.launchedAt) {
      await prisma.campaign.updateMany({ where: { id: campaign.id, status: 'RUNNING' }, data: { status: 'COMPLETED', completedAt: new Date() } });
      campaign.status = 'COMPLETED';
    }
    // Refund the failed messages now instead of waiting for the next sweep
    if (failed > 0) {
      await settle(campaign.id).catch(err => logger.warn(`[CampaignBilling] Settling campaign ${campaign.id} failed: ${err.message}`));
    }

    let eta = null;
    if (campaign.campaignType === 'META' && pending > 0 && ['RUNNING', 'SCHEDULED', 'PAUSED'].includes(campaign.status)) {
      const channel = campaign.channelId
        ? await prisma.whatsAppChannel.findUnique({ where: { id: campaign.channelId }, select: { isCoexistence: true } })
        : null;
      const perSecond = dispatcher.rateFor(channel);
      eta = { perSecond, seconds: Math.ceil(pending / perSecond) };
    }

    return {
      status: campaign.status,
      stats: { total, sent, failed, pending, queued, cancelled, delivered, read },
      errorBreakdown,
      eta
    };
  }

  async getTargets(tenantId, campaignId, { page = 1, limit = 50, status, search }) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) throw { status: 404, message: 'Campaign not found' };

    const where = { campaignId };
    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        where.status = { in: ['PENDING', 'QUEUED'] }; // waiting, or in the send queue
      } else if (['SENT', 'FAILED', 'CANCELLED'].includes(status)) {
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
    if (campaign.status === 'CANCELLED') throw { status: 400, message: 'This campaign was stopped' };
    if (campaign.targets.length === 0) throw { status: 400, message: 'No failed targets found' };

    // Failed messages were refunded: the retry is paid first (fails with INSUFFICIENT_BALANCE when the wallet is short)
    await settle(campaign.id, { includeFailed: true });

    // Update targets to PENDING
    await prisma.campaignTarget.updateMany({
      where: { campaignId: campaign.id, status: 'FAILED' },
      data: { status: 'PENDING', error: null, queuedAt: null }
    });

    // Meta: the dispatcher sends them in its next waves
    if (campaign.campaignType === 'META') {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'RUNNING', launchedAt: campaign.launchedAt || new Date(), completedAt: null }
      });
      return { success: true, message: 'Failed messages are being retried.' };
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
        orderBy: { id: 'asc' }
      });
      
      const interactions = targets.map(t => ({
        id: t.id,
        phone: t.phone,
        buttonText: 'No Response',
        createdAt: t.sentAt
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
        if (status === 'PENDING') {
          where.status = { in: ['PENDING', 'QUEUED'] };
        } else if (['SENT', 'FAILED', 'CANCELLED'].includes(status)) {
          where.status = status;
        } else {
          where.status = 'FAILED';
          where.error = { startsWith: status };
        }
      }
      const targets = await prisma.campaignTarget.findMany({ where, orderBy: { id: 'asc' } });
      csv = 'Phone,Status,Error,SentAt\n';
      targets.forEach(t => {
        csv += `"${t.phone}","${t.status}","${String(t.error || '').replace(/"/g, '""')}","${t.sentAt ? t.sentAt.toISOString() : ''}"\n`;
      });
    } else if (type === 'interactions') {
      if (status === 'NO_RESPONSE') {
        const whereTarget = { campaignId, tenantId, status: 'SENT', interactions: { none: {} } };
        const targets = await prisma.campaignTarget.findMany({ where: whereTarget, orderBy: { id: 'asc' } });
        csv = 'Phone,InteractionType,Button/Text,Time\n';
        targets.forEach(t => {
          csv += `"${t.phone}","NONE","No Response","${t.sentAt ? t.sentAt.toISOString() : ''}"\n`;
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
