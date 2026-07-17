const jwt = require('jsonwebtoken');
const config = require('./src/config/env');
console.log('Secret:', config.jwt.secret);
