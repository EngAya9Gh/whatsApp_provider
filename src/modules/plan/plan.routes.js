const express = require('express');
const planController = require('./plan.controller');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const router = express.Router();

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
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/', planController.getAllPlans.bind(planController)); // Public API for landing page
router.put('/:id', adminAuth, planController.updatePlan.bind(planController)); // Admin only

module.exports = router;
