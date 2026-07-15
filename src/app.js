const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const apiKeyRoutes = require('./modules/apiKey/apiKey.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const otpRoutes = require('./modules/otp/otp.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const logsRoutes = require('./modules/logs/logs.routes');
const adminRoutes = require('./modules/admin/admin.routes');

app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

module.exports = app;
