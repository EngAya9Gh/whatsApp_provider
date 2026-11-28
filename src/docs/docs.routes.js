// The public API reference: /api/openapi.json (the OpenAPI document, for Postman, Insomnia, code generators)
// and /api/docs (an interactive page built on Swagger UI, where a developer can read every endpoint and try
// it with their key). Public: the document describes the API and holds no secret.
const express = require('express');
const { buildSpec } = require('./openapi');

const router = express.Router();

/** The server URL shown in the document: APP_URL, or the host the page was opened on */
const serverUrl = (req) => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

router.get('/openapi.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(buildSpec(serverUrl(req)));
});

const SWAGGER_UI = 'https://unpkg.com/swagger-ui-dist@5.17.14';
const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wakeel API</title>
  <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
    .swagger-ui .info .title small { display: inline-block; vertical-align: middle; }
    .swagger-ui .info { margin: 24px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 0,
      persistAuthorization: true,
      tryItOutEnabled: false,
      displayRequestDuration: true
    });
  </script>
</body>
</html>`;

router.get('/docs', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('html').send(PAGE);
});

module.exports = router;
