const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('./src/config/env');
const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, config.jwt.secret);

async function run() {
  const plans = await axios.get('http://localhost:3003/api/plans');
  const freePlan = plans.data.data.find(p => p.planCode === 'FREE');
  
  await axios.put(`http://localhost:3003/api/plans/${freePlan.id}`, {
    name: freePlan.name, price: freePlan.price, limit: freePlan.limit, features: freePlan.features,
    featureFlags: ['TEST_FEATURE_X']
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const p2 = await axios.get('http://localhost:3003/api/plans');
  console.log(p2.data.data.find(p => p.planCode === 'FREE').featureFlags);
}
run();
