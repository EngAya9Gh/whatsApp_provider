const axios = require('axios');

async function run() {
  try {
    const jwt = require('jsonwebtoken');
    const config = require('./src/config/env');
    const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, config.jwt.secret);
    
    const plans = await axios.get('http://localhost:3003/api/plans');
    const freePlan = plans.data.data.find(p => p.planCode === 'FREE');
    
    const res = await axios.put(`http://localhost:3003/api/plans/${freePlan.id}`, {
      name: freePlan.name,
      price: freePlan.price,
      limit: freePlan.limit,
      features: freePlan.features,
      featureFlags: ['TEMPLATES', 'API_ACCESS']
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update response data:', res.data.data.featureFlags);
    
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
