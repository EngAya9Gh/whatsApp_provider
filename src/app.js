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

// Serve uploaded files statically
const path = require('path');
// Static Files
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const apiKeyRoutes = require('./modules/apiKey/apiKey.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const otpRoutes = require('./modules/otp/otp.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const logsRoutes = require('./modules/logs/logs.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const messageRoutes = require('./modules/message/message.routes');
const templateRoutes = require('./modules/template/template.routes');
const campaignRoutes = require('./modules/campaign/campaign.routes');
const invoiceRoutes = require('./modules/invoice/invoice.routes');
const planRoutes = require('./modules/plan/plan.routes');
const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
const metaRoutes = require('./modules/meta/meta.routes');
const chatRoutes = require('./modules/chat/chat.routes');

app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/meta', metaRoutes);
app.use('/api/v1/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// PM2 Logs endpoint (For easy debugging from browser)
app.get('/api/health/logs', (req, res) => {
  const path = require('path');
  const os = require('os');
  const { exec } = require('child_process');
  
  const logPath = path.join(os.homedir(), '.pm2', 'logs', 'whatsapp-api-out.log');
  
  exec(`tail -n 500 "${logPath}"`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).send(`Error reading log file at ${logPath}\n${err.message}`);
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(stdout || "Log is empty.");
  });
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
