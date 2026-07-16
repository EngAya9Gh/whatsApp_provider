require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function test() {
  const tenant = await prisma.tenant.findFirst();
  
  // create dummy jwt
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ tenantId: tenant.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

  // Create fake Excel file
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([['Phone'], ['966500000000']]);
  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const form = new FormData();
  form.append('name', 'Test Campaign Excel');
  form.append('message', 'Hello test excel');
  form.append('file', buffer, { filename: 'test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  try {
    const res = await axios.post('http://localhost:3003/api/v1/campaigns', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log(res.data);
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
}
test();
