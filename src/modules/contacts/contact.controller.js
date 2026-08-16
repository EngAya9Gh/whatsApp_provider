const contactService = require('./contact.service');
const logger = require('../../utils/logger');

class ContactController {
  // ─── Contact Groups ──────────────────────────────────────────

  async createGroup(req, res, next) {
    try {
      const data = await contactService.createGroup(req.tenant.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getGroups(req, res, next) {
    try {
      const data = await contactService.getGroups(req.tenant.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async updateGroup(req, res, next) {
    try {
      const data = await contactService.updateGroup(req.tenant.id, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async deleteGroup(req, res, next) {
    try {
      await contactService.deleteGroup(req.tenant.id, req.params.id);
      res.json({ success: true, message: 'Group deleted successfully' });
    } catch (err) { next(err); }
  }

  // ─── Contacts ────────────────────────────────────────────────

  async createContact(req, res, next) {
    try {
      if (!req.body.name || !req.body.phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }
      const data = await contactService.createContact(req.tenant.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getContacts(req, res, next) {
    try {
      const data = await contactService.getContacts(req.tenant.id, req.query);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async updateContact(req, res, next) {
    try {
      const data = await contactService.updateContact(req.tenant.id, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async deleteContact(req, res, next) {
    try {
      await contactService.deleteContact(req.tenant.id, req.params.id);
      res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (err) { next(err); }
  }

  // ─── CSV Import ──────────────────────────────────────────────

  async importCsv(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }
      const groupId = req.body.groupId || null;
      const result = await contactService.importCsv(req.tenant.id, groupId, req.file.path);
      res.json({ success: true, message: `Imported ${result.count} contacts successfully`, data: result });
    } catch (err) { 
      logger.error('CSV import error:', err);
      next(err); 
    }
  }
}

module.exports = new ContactController();
