const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.post('/log', (req, res) => {
  console.log('BROWSER ERROR:', req.body);
  res.send('ok');
});
app.listen(8888, () => console.log('Logger listening on 8888'));
