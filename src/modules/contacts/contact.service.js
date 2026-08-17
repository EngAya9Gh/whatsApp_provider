const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

class ContactService {
  // ─── Contact Groups ─────────────────────────────────────────────────────────

  async createGroup(tenantId, data) {
    return await prisma.contactGroup.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
      }
    });
  }

  async getGroups(tenantId) {
    return await prisma.contactGroup.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateGroup(tenantId, groupId, data) {
    const existing = await prisma.contactGroup.findFirst({ where: { id: groupId, tenantId } });
    if (!existing) throw { status: 404, message: 'Group not found' };

    return await prisma.contactGroup.update({
      where: { id: groupId },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        description: data.description !== undefined ? data.description : existing.description,
      }
    });
  }

  async deleteGroup(tenantId, groupId) {
    const existing = await prisma.contactGroup.findFirst({ where: { id: groupId, tenantId } });
    if (!existing) throw { status: 404, message: 'Group not found' };

    await prisma.contactGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  // ─── Contacts ───────────────────────────────────────────────────────────────

  async createContact(tenantId, data) {
    if (data.groupId) {
      const group = await prisma.contactGroup.findFirst({ where: { id: data.groupId, tenantId } });
      if (!group) throw { status: 400, message: 'Invalid Contact Group' };
    }

    return await prisma.contact.create({
      data: {
        tenantId,
        groupId: data.groupId || null,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        metadata: data.metadata || null,
      }
    });
  }

  async getContacts(tenantId, filters = {}) {
    const where = { tenantId };
    
    if (filters.groupId) {
      where.groupId = filters.groupId === 'unassigned' ? null : filters.groupId;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { phone: { contains: filters.search } }
      ];
    }

    return await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateContact(tenantId, contactId, data) {
    const existing = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!existing) throw { status: 404, message: 'Contact not found' };

    if (data.groupId && data.groupId !== existing.groupId) {
      const group = await prisma.contactGroup.findFirst({ where: { id: data.groupId, tenantId } });
      if (!group) throw { status: 400, message: 'Invalid Contact Group' };
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    return await prisma.contact.update({
      where: { id: contactId },
      data: updateData
    });
  }

  async deleteContact(tenantId, contactId) {
    const existing = await prisma.contact.findFirst({ where: { id: contactId, tenantId } });
    if (!existing) throw { status: 404, message: 'Contact not found' };

    await prisma.contact.delete({ where: { id: contactId } });
    return { success: true };
  }

  // ─── CSV Import ─────────────────────────────────────────────────────────────

  async importCsv(tenantId, groupId, filePath) {
    if (groupId) {
      const group = await prisma.contactGroup.findFirst({ where: { id: groupId, tenantId } });
      if (!group) throw { status: 400, message: 'Invalid Contact Group' };
    }

    const contacts = [];
    const ext = path.extname(filePath).toLowerCase();

    return new Promise((resolve, reject) => {
      const processRow = (row) => {
        const phone = row.phone || row.Phone || row.number || row.Number || row.whatsapp;
        const name = row.name || row.Name || 'Unknown';
        const email = row.email || row.Email || null;
        
        if (phone) {
          const metadata = {};
          for (const key in row) {
            if (!['phone', 'Phone', 'number', 'Number', 'whatsapp', 'name', 'Name', 'email', 'Email'].includes(key)) {
              metadata[key] = row[key];
            }
          }
          contacts.push({
            tenantId,
            groupId: groupId || null,
            name,
            phone: String(phone).replace(/[^0-9]/g, ''),
            email,
            metadata: Object.keys(metadata).length > 0 ? metadata : null
          });
        }
      };

      const finishProcessing = async () => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // delete temp file
          if (contacts.length > 0) {
            const result = await prisma.contact.createMany({
              data: contacts,
              skipDuplicates: true
            });
            resolve({ success: true, count: result.count });
          } else {
            resolve({ success: true, count: 0 });
          }
        } catch (error) {
          reject(error);
        }
      };

      if (ext === '.xlsx' || ext === '.xls') {
        try {
          const workbook = xlsx.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(sheet);
          
          data.forEach(processRow);
          finishProcessing();
        } catch (err) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        }
      } else {
        // CSV Parsing
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', processRow)
          .on('end', finishProcessing)
          .on('error', (error) => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            reject(error);
          });
      }
    });
  }
}

module.exports = new ContactService();
