const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://localhost:3003/api/plans');
    console.log(res.data.data.find(p => p.planCode === 'FREE').featureFlags);
  } catch (e) { console.error(e.message); }
}
run();
