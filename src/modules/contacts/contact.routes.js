const express = require('express');
const router = express.Router();
const contactController = require('./contact.controller');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Multer config for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp'), // Use tmp or another scratch directory
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'text/csv' || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});
//
// All routes require auth and 'can_manage_contacts' permission
router.use(authMiddleware);
const canRead = requireAnyPermission('can_manage_contacts', 'can_create_campaigns', 'can_send_message');
const canManage = requirePermission('can_manage_contacts');

// Groups
router.get('/groups', canRead, contactController.getGroups);
router.post('/groups', canManage, contactController.createGroup);
router.put('/groups/:id', canManage, contactController.updateGroup);
router.delete('/groups/:id', canManage, contactController.deleteGroup);

// Contacts
router.get('/', canRead, contactController.getContacts);
router.post('/', canManage, contactController.createContact);
router.put('/:id', canManage, contactController.updateContact);
router.delete('/:id', canManage, contactController.deleteContact);

// Import CSV
router.post('/import', canManage, upload.single('file'), contactController.importCsv);

module.exports = router;
