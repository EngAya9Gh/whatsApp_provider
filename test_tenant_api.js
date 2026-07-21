const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('./src/config/env');
const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, config.jwt.secret);

async function run() {
  try {
    const tenants = await axios.get('http://localhost:3003/api/admin/tenants?page=1&search=', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tenantId = tenants.data.data.tenants[0].id;
    
    const res = await axios.put(`http://localhost:3003/api/admin/tenants/${tenantId}/settings`, {
      monthlyLimit: 100,
      metaEnabled: true,
      customFeatures: { "EXCEL_EXPORT": false }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update response customFeatures:', res.data.data.customFeatures);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
