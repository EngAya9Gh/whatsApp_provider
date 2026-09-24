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
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const subUserRoutes = require('./modules/subuser/subuser.routes');
const contactRoutes = require('./modules/contacts/contact.routes');

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
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sub-users', subUserRoutes);
app.use('/api/contacts', contactRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Secure System Logs Endpoint (Basic Auth)
app.get('/api/system/logs', (req, res) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  const USERNAME = process.env.LOGS_USER || 'admin';
  const PASSWORD = process.env.LOGS_PASS || 'wakeel_2026';

  if (login && password && login === USERNAME && password === PASSWORD) {
    const path = require('path');
    const os = require('os');
    const { exec } = require('child_process');
    
    // Allow selecting between 'out' (normal) and 'error' logs securely
    const logType = req.query.type === 'error' ? 'error' : 'out';
    const logPath = path.join(os.homedir(), '.pm2', 'logs', `whatsapp-api-${logType}.log`);
    
    exec(`tail -n 1500 "${logPath}"`, (err, stdout, stderr) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (err) return res.send(`Error reading log file: ${err.message}`);
      
      const header = `=== Showing ${logType.toUpperCase()} Logs (Last 1500 lines) ===\n(Use ?type=error or ?type=out in the URL to switch)\n\n`;
      res.send(header + (stdout || "Log is empty."));
    });
  } else {
    res.set('WWW-Authenticate', 'Basic realm="Wakeel System Logs"');
    res.status(401).send('Authentication required. Please enter username and password.');
  }
});

//

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  // Handle plain objects (e.g. from Meta API errors passed via throw)
  if (err && typeof err === 'object' && !(err instanceof Error)) {
    const status = err.status || err.code || 400;
    const message = err.message || (err.error && err.error.message) || JSON.stringify(err);
    logger.error(err, '[API Error]');
    return res.status(typeof status === 'number' ? status : 400).json({ error: { message } });
  }
  logger.error(err, 'Unhandled Error');
  res.status(err?.status || 500).json({
    error: {
      message: err?.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err?.stack })
    }
  });
});

module.exports = app;
