const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      logger.warn('[MongoDB] MONGO_URI is not defined in .env. Live Chat features will not work.');
      return;
    }
    
    await mongoose.connect(mongoUri); // mongoose 6+ doesn't need useNewUrlParser/useUnifiedTopology
    
    logger.info('[MongoDB] Connected successfully');
  } catch (error) {
    logger.error('[MongoDB] Connection failed:', error.message);
  }
};

module.exports = connectMongo;
