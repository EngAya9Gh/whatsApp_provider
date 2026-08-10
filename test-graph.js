const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://graph.facebook.com/v21.0/1054343476970194/analytics', {
      headers: { Authorization: `Bearer EAAMN2fTfF28BO1uLhXfF1nC7X2U6x6D20xZAZAIfhK3aY2ZBmGjC1kM5kIuR0LIDr52oF9q5w6Rk8Vz9ZCOYFw8E0xS3uK0nZAwFq4e7xZCOYFw8E0xS3uK0nZAwFq4e7xZCOYFw8E0xS3uK0nZAwFq4e7` }, // Dummy token
      params: { start: 1718000000, end: 1718100000, granularity: 'DAY', metric_types: JSON.stringify(['SENT']) }
    });
    console.log(res.data);
  } catch (err) {
    console.log(err.response?.data);
  }
}
test();
