const express = require('express');
const adminController = require('./admin.controller');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const router = express.Router();

// Admin Auth Middleware (inline - separate from tenant middleware)
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Public: Admin Login
router.post('/auth/login', adminController.login.bind(adminController));

// Protected: Admin routes
router.get('/stats', adminAuth, adminController.getStats.bind(adminController));
router.get('/tenants', adminAuth, adminController.getTenants.bind(adminController));
router.get('/tenants/:id', adminAuth, adminController.getTenantById.bind(adminController));
router.put('/tenants/:id/plan', adminAuth, adminController.updatePlan.bind(adminController));
router.put('/tenants/:id/toggle', adminAuth, adminController.toggleTenant.bind(adminController));

module.exports = router;
