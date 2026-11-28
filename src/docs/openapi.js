// The public API reference (OpenAPI 3.1), served as JSON at /api/openapi.json and as an interactive page at
// /api/docs (docs.routes.js). tests/openapi.test.js checks that every path here answers in the real app, so a
// route that is renamed or removed fails the build until this file follows.
//
// Scope: what a customer's own system (CRM, ERP, shop) calls with an API key from the API Keys page. The
// dashboard-only screens (billing, team, settings) are not listed.

const PHONE = {
  type: 'string',
  description: 'Recipient in international format without + or spaces (country code first). On QR numbers a WhatsApp group id (…@g.us) also works.',
  example: '966500000000'
};
const CHANNEL_ID = {
  type: 'string',
  description: 'Which of your numbers sends it (id from GET /api/v1/channels). Omit it to send from your QR-connected number. Meta Cloud numbers need it.',
  example: '2d0b5d6e-7f3c-4a2b-9c1e-8f4a6b7c8d9e'
};
const OBJECT_ID = { type: 'string', example: '66a1f2c3d4e5f67890123456' };
const UUID = { type: 'string', format: 'uuid', example: '2d0b5d6e-7f3c-4a2b-9c1e-8f4a6b7c8d9e' };
const DATE = { type: 'string', format: 'date-time', example: '2026-11-28T09:30:00.000Z' };

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema, example) => ({ required: true, content: { 'application/json': { schema, ...(example !== undefined && { example }) } } });
const formBody = (schema) => ({ required: true, content: { 'multipart/form-data': { schema } } });
const jsonResponse = (description, schema, example) => ({ description, content: { 'application/json': { schema, ...(example !== undefined && { example }) } } });
const okResponse = (message) => jsonResponse('Done', ref('Ok'), { success: true, message });
const errorRef = (name) => ({ $ref: `#/components/responses/${name}` });
const dataOf = (schema, extra = {}) => ({ type: 'object', properties: { success: { type: 'boolean', const: true }, data: schema, ...extra } });
const page = (description = 'Page number') => ({ name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description });
const limit = (def, max) => ({ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, default: def, ...(max && { maximum: max }) }, description: 'Items per page' });
const threadIdParam = { name: 'threadId', in: 'path', required: true, schema: OBJECT_ID, description: 'Conversation id (`id` of an item of GET /api/v1/chat/threads)' };
const idParam = (description) => ({ name: 'id', in: 'path', required: true, schema: UUID, description });

/** The usual failures of a request, in addition to the ones listed on the operation */
const COMMON_ERRORS = { 400: errorRef('BadRequest'), 401: errorRef('Unauthorized'), 403: errorRef('Forbidden') };
const SEND_ERRORS = { ...COMMON_ERRORS, 402: errorRef('QuotaExceeded'), 429: errorRef('RateLimited') };

const operation = (tag, summary, description, responses, rest = {}) => ({
  tags: [tag],
  summary,
  description,
  responses: { ...COMMON_ERRORS, ...responses },
  ...rest
});
const sendOperation = (summary, description, requestBody, responses = { 200: okResponse('Message sent successfully') }, rest = {}) => ({
  tags: ['Messages'],
  summary,
  description,
  requestBody,
  responses: { ...SEND_ERRORS, ...responses },
  ...rest
});

const INTRO = `
Wakeel's API lets your own system (CRM, ERP, online shop, custom app) send WhatsApp messages, run OTP
verification, read and answer the conversations of your inbox, keep contacts in sync and follow tickets.

واجهة وكيل تتيح لنظامك (CRM أو ERP أو متجر أو تطبيق) إرسال رسائل واتساب، والتحقق برمز OTP، وقراءة محادثات
صندوق الوارد والرد عليها، ومزامنة جهات الاتصال، ومتابعة التذاكر.

## Authentication
Create a key on the dashboard page **API Keys**. Send it with every request:

\`\`\`
Authorization: Bearer sk_your_api_key
\`\`\`

A key acts as the account owner: it reaches every number and every conversation of the account. Keep it on
your server, never in a browser or mobile app. A dashboard login token (JWT) is accepted on the same
endpoints, with that person's permissions.

## Numbers (channels)
An account can have several numbers: QR-connected numbers (the WhatsApp app scanned a code) and Meta Cloud
API numbers. \`GET /api/v1/channels\` lists them. Sending endpoints take an optional \`channelId\`; without it,
the message goes out from the QR-connected number. Meta Cloud numbers must be named with \`channelId\`.

## Responses and errors
Success answers are JSON with \`"success": true\`. Failures carry an HTTP status and one of two bodies:
\`{"error": {"message": "...", "code": "..."}}\` (the \`code\` is present for some cases, e.g.
\`REPLY_WINDOW_CLOSED\`, \`CHANNEL_NOT_ALLOWED\`), or \`{"error": "..."}\` for field validation.

| Status | Meaning |
|---|---|
| 400 | A field is missing or invalid, or the action is not possible now |
| 401 | Missing or invalid key |
| 402 | The plan's monthly message limit is reached |
| 403 | The account is disabled, the feature is not in the plan, or the number is not yours |
| 404 | Not found |
| 429 | Rate limit: 30 messages per minute to one recipient; 3 OTPs per 15 minutes to one phone. Headers X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset and Retry-After say when to retry |

## Webhooks (Wakeel calling you)
On the dashboard page **Developer Tools** set a Webhook URL to receive customer messages and delivery
statuses, and a CRM base URL + token for contact and ticket sync. The payloads are described at the end of
this document under **Webhooks**.
`;

function buildSpec(serverUrl = 'http://localhost:3000') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Wakeel API',
      version: '1.0.0',
      description: INTRO.trim(),
      contact: { name: 'Wakeel support' }
    },
    servers: [{ url: serverUrl.replace(/\/+$/, ''), description: 'This server' }],
    security: [{ apiKey: [] }],
    tags: [
      { name: 'Messages', description: 'Send a message to any phone number from one of your numbers' },
      { name: 'Templates', description: 'Your saved message templates (text with {{variables}}, optional image or PDF) and sending them' },
      { name: 'OTP', description: 'One-time codes over WhatsApp: generate, send and verify' },
      { name: 'Inbox', description: 'Read the conversations of Live Chat and reply from your own system (needs the Live Chat feature)' },
      { name: 'Contacts', description: 'Contacts and contact groups (the audience of campaigns)' },
      { name: 'Channels', description: 'Your numbers and channels' },
      { name: 'Tickets', description: 'Support tickets opened on conversations' }
    ],
    paths: {
      // ── Messages ─────────────────────────────────────────────────────────────────────────────────
      '/api/v1/message/send': {
        post: sendOperation('Send a text message',
          'Sends a plain text message (up to 4000 characters). The message is counted in the plan\'s monthly quota and recorded in the Live Chat conversation of Meta Cloud numbers.',
          jsonBody({
            type: 'object', required: ['phone', 'message'],
            properties: { phone: PHONE, message: { type: 'string', minLength: 1, maxLength: 4000 }, channelId: CHANNEL_ID }
          }, { phone: '966500000000', message: 'Your order #1234 is on its way.', channelId: '2d0b5d6e-7f3c-4a2b-9c1e-8f4a6b7c8d9e' }))
      },
      '/api/v1/message/send-media': {
        post: sendOperation('Send an image or PDF by URL',
          'The file is fetched from a public URL and sent with an optional caption. QR-connected numbers only (Meta Cloud numbers: use upload-media on the dashboard, or a template with media).',
          jsonBody({
            type: 'object', required: ['phone', 'type', 'url'],
            properties: { phone: PHONE, type: { type: 'string', enum: ['image', 'pdf'] }, url: { type: 'string', format: 'uri' }, caption: { type: 'string', maxLength: 1024 }, channelId: CHANNEL_ID }
          }, { phone: '966500000000', type: 'pdf', url: 'https://yourshop.com/invoices/INV-001.pdf', caption: 'Invoice INV-001' }),
          { 200: okResponse('Media message sent successfully') })
      },
      '/api/v1/message/upload-media': {
        post: sendOperation('Upload and send a file',
          'Same as send-media, with the file in the request (multipart, up to 10 MB) instead of a URL.',
          formBody({
            type: 'object', required: ['file', 'phone', 'type'],
            properties: { file: { type: 'string', format: 'binary' }, phone: PHONE, type: { type: 'string', enum: ['image', 'pdf'] }, caption: { type: 'string', maxLength: 1024 }, channelId: CHANNEL_ID }
          }),
          { 200: okResponse('Media message sent successfully') })
      },
      '/api/v1/message/send-buttons': {
        post: sendOperation('Send a message with buttons',
          'Text with 1 to 3 buttons. `reply` buttons send their text back when tapped; `url` buttons open a link. Also accepts multipart/form-data with an `image` file and `buttons` as a JSON string.',
          jsonBody({
            type: 'object', required: ['phone', 'text', 'buttons'],
            properties: {
              phone: PHONE,
              text: { type: 'string', minLength: 1, maxLength: 4000 },
              buttons: {
                type: 'array', minItems: 1, maxItems: 3,
                items: { type: 'object', required: ['text'], properties: { id: { type: 'string' }, text: { type: 'string' }, type: { type: 'string', enum: ['reply', 'url'], default: 'reply' }, url: { type: 'string', format: 'uri' } } }
              },
              channelId: CHANNEL_ID
            }
          }, { phone: '966500000000', text: 'Was your issue solved?', buttons: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }, { text: 'Open ticket', type: 'url', url: 'https://yourshop.com/support' }] }),
          { 200: okResponse('Interactive message sent successfully') })
      },
      '/api/v1/message/send-list': {
        post: sendOperation('Send a list message',
          'A message with a button that opens a list of options grouped in sections. The chosen row\'s `rowId` comes back as the customer\'s reply.',
          jsonBody({
            type: 'object', required: ['phone', 'title', 'body', 'buttonText', 'sections'],
            properties: {
              phone: PHONE,
              title: { type: 'string', maxLength: 60 },
              body: { type: 'string', maxLength: 1024 },
              buttonText: { type: 'string', maxLength: 20 },
              sections: {
                type: 'array', minItems: 1,
                items: {
                  type: 'object', required: ['title', 'rows'],
                  properties: {
                    title: { type: 'string', maxLength: 24 },
                    rows: { type: 'array', minItems: 1, items: { type: 'object', required: ['rowId', 'title'], properties: { rowId: { type: 'string' }, title: { type: 'string', maxLength: 24 }, description: { type: 'string', maxLength: 72 } } } }
                  }
                }
              },
              channelId: CHANNEL_ID
            }
          }, { phone: '966500000000', title: 'Our menu', body: 'Choose a dish', buttonText: 'Show menu', sections: [{ title: 'Main', rows: [{ rowId: 'kabsa', title: 'Kabsa', description: 'With chicken' }, { rowId: 'mandi', title: 'Mandi' }] }] }),
          { 200: okResponse('List message sent successfully') })
      },
      '/api/v1/message/send-location': {
        post: sendOperation('Send a location',
          'A map pin with an optional name and address. QR-connected numbers only.',
          jsonBody({
            type: 'object', required: ['phone', 'latitude', 'longitude'],
            properties: { phone: PHONE, latitude: { type: 'number', minimum: -90, maximum: 90 }, longitude: { type: 'number', minimum: -180, maximum: 180 }, name: { type: 'string', maxLength: 100 }, address: { type: 'string', maxLength: 200 }, channelId: CHANNEL_ID }
          }, { phone: '966500000000', latitude: 24.7136, longitude: 46.6753, name: 'Our shop', address: 'King Fahd Road, Riyadh' }),
          { 200: okResponse('Location sent successfully') })
      },
      '/api/v1/message/send-meta-template': {
        post: sendOperation('Send an approved Meta template',
          'Meta Cloud numbers only: sends one of the templates approved in Meta Business Manager, by name and language. `components` follows the Meta Cloud API format for header, body and button parameters. Needed to start a conversation with a customer who has not written to you in the last 24 hours.',
          jsonBody({
            type: 'object', required: ['phone', 'templateName', 'languageCode', 'channelId'],
            properties: {
              phone: PHONE,
              templateName: { type: 'string', example: 'order_update' },
              languageCode: { type: 'string', example: 'ar' },
              components: { type: 'array', description: 'Meta Cloud API template components (parameters of header, body, buttons)', items: { type: 'object' } },
              channelId: CHANNEL_ID,
              previewText: { type: 'string', maxLength: 4000, description: 'The text as the customer sees it, shown in the Live Chat conversation' }
            }
          }, {
            phone: '966500000000', templateName: 'order_update', languageCode: 'ar', channelId: '2d0b5d6e-7f3c-4a2b-9c1e-8f4a6b7c8d9e',
            components: [{ type: 'body', parameters: [{ type: 'text', text: 'Sara' }, { type: 'text', text: '1234' }] }],
            previewText: 'مرحباً Sara، طلبك 1234 في الطريق'
          }),
          { 200: jsonResponse('Done', { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, metaMessageId: { type: 'string', description: 'Meta\'s message id (wamid), the key of delivery status webhooks' } } }, { success: true, message: 'Template sent successfully', metaMessageId: 'wamid.HBgMOTY2NTAwMDAwMDAwFQIAERgSNzY4QUFCQzAwMDAwMDAwMAA=' }) })
      },
      '/api/v1/message/send-flow': {
        post: sendOperation('Send a WhatsApp Flow',
          'Meta Cloud numbers only: a message with a button that opens one of your published WhatsApp Flows (forms inside WhatsApp).',
          jsonBody({
            type: 'object', required: ['phone', 'flowId', 'flowCta', 'flowBody', 'channelId'],
            properties: {
              phone: PHONE,
              flowId: { type: 'string', description: 'The flow id in Meta' },
              flowCta: { type: 'string', description: 'Button text', example: 'Book now' },
              flowBody: { type: 'string', description: 'Message text above the button' },
              flowFooter: { type: 'string' },
              flowScreen: { type: 'string', description: 'The first screen of the flow to open' },
              channelId: CHANNEL_ID
            }
          }),
          { 200: okResponse('Flow message sent successfully') })
      },

      // ── Templates ────────────────────────────────────────────────────────────────────────────────
      '/api/v1/templates/send': {
        post: {
          tags: ['Templates'], summary: 'Send a saved template',
          description: 'Sends one of your saved templates (GET /api/v1/templates), filling its `{{variables}}`. A template with media is sent as image or PDF with the text as caption. Goes out from your QR-connected number.',
          requestBody: jsonBody({
            type: 'object', required: ['phone', 'templateId'],
            properties: {
              phone: { ...PHONE, pattern: '^[0-9]{10,15}$' },
              templateId: UUID,
              variables: { type: 'object', additionalProperties: { type: 'string' }, description: 'Values for {{name}} placeholders', example: { name: 'Sara', order: '1234' } }
            }
          }),
          responses: { ...SEND_ERRORS, 200: okResponse('Message sent successfully'), 404: errorRef('NotFound') }
        }
      },
      '/api/v1/templates': {
        get: operation('Templates', 'List templates', 'Your saved templates, newest first. Needs the Templates feature.',
          { 200: jsonResponse('Templates', dataOf({ type: 'array', items: ref('Template') }, { meta: ref('PageMeta') })) },
          { parameters: [page(), limit(20)] }),
        post: operation('Templates', 'Create a template', 'A name, the text (with optional `{{variables}}`) and an optional image or PDF.',
          { 201: jsonResponse('Created', dataOf(ref('Template'))) },
          { requestBody: formBody({ type: 'object', required: ['name', 'content'], properties: { name: { type: 'string', maxLength: 100 }, content: { type: 'string', maxLength: 4000 }, media: { type: 'string', format: 'binary' } } }) })
      },
      '/api/v1/templates/{id}': {
        put: operation('Templates', 'Update a template', 'Name and text are required; a new file replaces the old one.',
          { 200: jsonResponse('Updated', dataOf(ref('Template'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Template id')], requestBody: formBody({ type: 'object', required: ['name', 'content'], properties: { name: { type: 'string' }, content: { type: 'string' }, media: { type: 'string', format: 'binary' } } }) }),
        delete: operation('Templates', 'Delete a template', '', { 200: okResponse('Template deleted'), 404: errorRef('NotFound') }, { parameters: [idParam('Template id')] })
      },

      // ── OTP ──────────────────────────────────────────────────────────────────────────────────────
      '/api/v1/otp/send': {
        post: {
          tags: ['OTP'], summary: 'Send a one-time code',
          description: 'Generates a 6-digit code, sends it over WhatsApp from your QR-connected number and keeps it for **5 minutes**. At most 3 codes per 15 minutes to one phone. The code itself is not returned: verify it with /api/v1/otp/verify.',
          requestBody: jsonBody({ type: 'object', required: ['phone'], properties: { phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$', description: 'E.164, with or without +', example: '966500000000' } } }),
          responses: { ...SEND_ERRORS, 200: okResponse('OTP sent successfully') }
        }
      },
      '/api/v1/otp/verify': {
        post: {
          tags: ['OTP'], summary: 'Verify a one-time code',
          description: 'Checks the code the customer typed. A correct code is accepted once and then discarded. 400 when it is wrong, expired or was never sent.',
          requestBody: jsonBody({ type: 'object', required: ['phone', 'code'], properties: { phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$', example: '966500000000' }, code: { type: 'string', minLength: 6, maxLength: 6, example: '481726' } } }),
          responses: { ...COMMON_ERRORS, 200: okResponse('OTP verified successfully'), 400: jsonResponse('Wrong, expired or unknown code', ref('Error'), { error: { message: 'Invalid OTP code' } }) }
        }
      },

      // ── Inbox ────────────────────────────────────────────────────────────────────────────────────
      '/api/v1/chat/threads': {
        get: operation('Inbox', 'List conversations',
          'Conversations of all your channels, most recent first, 50 per page. `search` matches the customer\'s name or phone. Needs the Live Chat feature.',
          { 200: jsonResponse('Conversations', dataOf({ type: 'object', properties: { threads: { type: 'array', items: ref('Thread') }, pagination: ref('Pagination') } })) },
          {
            parameters: [
              page(), limit(50),
              { name: 'search', in: 'query', schema: { type: 'string', maxLength: 60 }, description: 'Part of the name or phone' },
              { name: 'channelId', in: 'query', schema: { type: 'string' }, description: 'Only this number / channel' },
              { name: 'tagId', in: 'query', schema: { type: 'string' }, description: 'Only conversations with this tag' },
              { name: 'stageId', in: 'query', schema: { type: 'string' }, description: 'Only this pipeline stage (`none` = without a stage)' }
            ]
          })
      },
      '/api/v1/chat/threads/{threadId}': {
        get: operation('Inbox', 'One conversation', 'The conversation with its channel.',
          { 200: jsonResponse('Conversation', dataOf(ref('Thread'))), 404: errorRef('NotFound') }, { parameters: [threadIdParam] })
      },
      '/api/v1/chat/threads/{threadId}/messages': {
        get: operation('Inbox', 'Messages of a conversation',
          'Newest page first, each page returned in chronological order (oldest to newest). Reading a page marks the conversation as read.',
          { 200: jsonResponse('Messages', dataOf({ type: 'object', properties: { messages: { type: 'array', items: ref('Message') }, pagination: ref('Pagination') } })) },
          { parameters: [threadIdParam, page(), limit(50)] }),
        post: operation('Inbox', 'Reply in a conversation',
          'Sends a message to the customer of this conversation from the number it belongs to, and records it in Live Chat. For a file, upload it first with /api/v1/chat/upload (or use any public URL) and pass `hasMedia`, `mediaUrl`, `mediaMime` and the matching `type`. `isInternal: true` saves a team note that the customer never sees. Instagram, Messenger and TikTok conversations accept replies only within the platform\'s window after the customer\'s last message (`REPLY_WINDOW_CLOSED`).',
          {
            200: jsonResponse('The saved message', dataOf(ref('Message'))),
            400: jsonResponse('Reply window closed, or limit reached', ref('Error'), { error: { code: 'REPLY_WINDOW_CLOSED', message: 'This platform allows replies only within 24 hours of the customer\'s last message. The conversation continues when the customer writes again.' } })
          },
          {
            parameters: [threadIdParam],
            requestBody: jsonBody({
              type: 'object',
              properties: {
                content: { type: 'string', description: 'Text, or the caption of a file' },
                type: { type: 'string', enum: ['text', 'image', 'document', 'audio', 'video'], default: 'text' },
                hasMedia: { type: 'boolean', default: false },
                mediaUrl: { type: 'string', format: 'uri' },
                mediaMime: { type: 'string', example: 'application/pdf' },
                isInternal: { type: 'boolean', default: false, description: 'A team note, not sent to the customer' }
              }
            }, { content: 'Hello! Your order #1234 arrives tomorrow between 2 and 5 PM.', type: 'text' })
          })
      },
      '/api/v1/chat/threads/{threadId}/name': {
        put: operation('Inbox', 'Rename the customer', 'Sets the customer\'s display name in the conversation and in Contacts. The name from their WhatsApp profile no longer replaces it.',
          { 200: jsonResponse('Renamed', { type: 'object', properties: { success: { type: 'boolean' }, contactName: { type: 'string' } } }), 404: errorRef('NotFound') },
          { parameters: [threadIdParam], requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } }, { name: 'Sara Mohammed' }) })
      },
      '/api/v1/chat/threads/{threadId}/tags': {
        put: operation('Inbox', 'Set the tags of a conversation', 'Replaces the conversation\'s tags with these ids (tags are defined on the dashboard, GET /api/v1/chat/tags).',
          { 200: jsonResponse('Tags set', dataOf({ type: 'object', properties: { tagIds: { type: 'array', items: { type: 'string' } } } })) },
          { parameters: [threadIdParam], requestBody: jsonBody({ type: 'object', required: ['tagIds'], properties: { tagIds: { type: 'array', items: { type: 'string' } } } }, { tagIds: ['vip', 'returns'] }) })
      },
      '/api/v1/chat/threads/{threadId}/stage': {
        put: operation('Inbox', 'Move a conversation to a pipeline stage', 'Sets the stage (`null` removes it). Stages are defined on the dashboard, GET /api/v1/chat/stages.',
          { 200: jsonResponse('Stage set', dataOf({ type: 'object', properties: { stageId: { type: ['string', 'null'] } } })) },
          { parameters: [threadIdParam], requestBody: jsonBody({ type: 'object', properties: { stageId: { type: ['string', 'null'] } } }, { stageId: 'negotiation' }) })
      },
      '/api/v1/chat/tags': {
        get: operation('Inbox', 'Conversation tags', 'The tags defined for the account, to label conversations with.',
          { 200: jsonResponse('Tags', dataOf({ type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' } } } })) })
      },
      '/api/v1/chat/stages': {
        get: operation('Inbox', 'Pipeline stages', 'The pipeline configuration: the stages conversations move through.',
          { 200: jsonResponse('Stages', dataOf({ type: 'object', properties: { stages: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' } } } } } })) })
      },
      '/api/v1/chat/upload': {
        post: operation('Inbox', 'Upload a file for a reply', 'Stores a file and returns its URL, to pass as `mediaUrl` when replying.',
          { 200: jsonResponse('Uploaded', { type: 'object', properties: { success: { type: 'boolean' }, mediaUrl: { type: 'string', format: 'uri' }, mimetype: { type: 'string' }, originalName: { type: 'string' } } }, { success: true, mediaUrl: 'https://api.example.com/uploads/chat/chat-1764320000000.pdf', mimetype: 'application/pdf', originalName: 'invoice.pdf' }) },
          { requestBody: formBody({ type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } }) })
      },

      // ── Contacts ─────────────────────────────────────────────────────────────────────────────────
      '/api/contacts': {
        get: operation('Contacts', 'List contacts', 'All contacts of the account, newest first (no paging). `groupId=unassigned` lists contacts without a group.',
          { 200: jsonResponse('Contacts', dataOf({ type: 'array', items: ref('Contact') })) },
          { parameters: [{ name: 'search', in: 'query', schema: { type: 'string' }, description: 'Part of the name or phone' }, { name: 'groupId', in: 'query', schema: { type: 'string' }, description: 'A group id, or `unassigned`' }] }),
        post: operation('Contacts', 'Create a contact', 'Name and phone are required. `metadata` holds your own fields (customer id, city, …) and they can be used as campaign variables. The name also updates the customer\'s conversations.',
          { 201: jsonResponse('Created', dataOf(ref('Contact'))) },
          { requestBody: jsonBody({ type: 'object', required: ['name', 'phone'], properties: { name: { type: 'string' }, phone: PHONE, email: { type: 'string', format: 'email' }, groupId: UUID, metadata: { type: 'object', additionalProperties: true } } }, { name: 'Sara Mohammed', phone: '966501111111', email: 'sara@example.com', metadata: { customerId: 'C-1001', city: 'Riyadh' } }) })
      },
      '/api/contacts/{id}': {
        put: operation('Contacts', 'Update a contact', 'Only the fields you send change.',
          { 200: jsonResponse('Updated', dataOf(ref('Contact'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Contact id')], requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, phone: PHONE, email: { type: 'string', format: 'email' }, groupId: { type: ['string', 'null'] }, metadata: { type: 'object', additionalProperties: true } } }, { name: 'Sara Ahmed', groupId: null }) }),
        delete: operation('Contacts', 'Delete a contact', '', { 200: okResponse('Contact deleted successfully'), 404: errorRef('NotFound') }, { parameters: [idParam('Contact id')] })
      },
      '/api/contacts/groups': {
        get: operation('Contacts', 'List contact groups', 'Groups with the number of contacts in each.',
          { 200: jsonResponse('Groups', dataOf({ type: 'array', items: ref('ContactGroup') })) }),
        post: operation('Contacts', 'Create a contact group', '', { 201: jsonResponse('Created', dataOf(ref('ContactGroup'))) },
          { requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' } } }, { name: 'VIP customers' }) })
      },
      '/api/contacts/groups/{id}': {
        put: operation('Contacts', 'Update a contact group', '', { 200: jsonResponse('Updated', dataOf(ref('ContactGroup'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Group id')], requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } }) }),
        delete: operation('Contacts', 'Delete a contact group', 'Its contacts stay, without a group.', { 200: okResponse('Group deleted successfully'), 404: errorRef('NotFound') }, { parameters: [idParam('Group id')] })
      },
      '/api/contacts/import': {
        post: operation('Contacts', 'Import contacts from a file', 'A CSV or Excel file with columns name, phone (and optional email); every row becomes a contact, in the group if one is given.',
          { 200: jsonResponse('Imported', { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', properties: { count: { type: 'integer' } } } } }, { success: true, message: 'Imported 120 contacts successfully', data: { count: 120 } }) },
          { requestBody: formBody({ type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, groupId: UUID } }) })
      },

      // ── Channels ─────────────────────────────────────────────────────────────────────────────────
      '/api/v1/channels': {
        get: operation('Channels', 'List your numbers and channels', 'Every Live Chat channel of the account: QR-connected numbers (BAILEYS), Meta Cloud numbers (META_CLOUD), website widgets (WEBCHAT), Instagram, Messenger and TikTok accounts. Use the `id` as `channelId` elsewhere.',
          { 200: jsonResponse('Channels', dataOf({ type: 'array', items: ref('Channel') })) })
      },
      '/api/v1/meta/channels': {
        get: operation('Channels', 'List Meta Cloud numbers', 'Only the Meta Cloud API numbers, with their Meta ids (phone_number_id, WABA id).',
          { 200: jsonResponse('Meta channels', dataOf({ type: 'array', items: ref('MetaChannel') })) })
      },

      // ── Tickets ──────────────────────────────────────────────────────────────────────────────────
      '/api/v1/tickets': {
        get: operation('Tickets', 'List tickets', 'Tickets of the account, most recently updated first, with the customer\'s name and phone. Needs the Live Chat feature.',
          { 200: jsonResponse('Tickets', dataOf({ type: 'array', items: ref('Ticket') }, { meta: ref('Pagination') })) },
          {
            parameters: [
              { name: 'status', in: 'query', schema: { type: 'string' }, description: 'One or more of OPEN, PENDING, RESOLVED, CLOSED separated by commas, or ACTIVE (= OPEN and PENDING)', example: 'ACTIVE' },
              { name: 'channelId', in: 'query', schema: { type: 'string' } },
              { name: 'assignedToId', in: 'query', schema: { type: 'string' }, description: 'A team member id, or `none` for unassigned' },
              { name: 'categoryId', in: 'query', schema: { type: 'string' }, description: 'A category id, or `none`' },
              { name: 'threadId', in: 'query', schema: OBJECT_ID, description: 'Tickets of one conversation' },
              { name: 'search', in: 'query', schema: { type: 'string', maxLength: 60 }, description: 'Ticket number, subject, or the customer\'s name or phone' },
              page(), limit(50, 100)
            ]
          }),
        post: operation('Tickets', 'Open a ticket', 'Opens a ticket on a conversation by hand. 409 when the conversation already has an active ticket (its data is returned).',
          { 201: jsonResponse('Opened', dataOf(ref('Ticket'))), 404: errorRef('NotFound'), 409: jsonResponse('An active ticket exists', { type: 'object', properties: { error: ref('ErrorBody'), data: ref('Ticket') } }) },
          { requestBody: jsonBody({ type: 'object', required: ['channelId', 'threadId'], properties: { channelId: UUID, threadId: OBJECT_ID, subject: { type: 'string', maxLength: 200 }, categoryId: UUID, assignedToId: { type: ['string', 'null'], description: 'A team member id, null for nobody; omitted = the team\'s routing' }, crmClientId: { type: 'string', description: 'The customer\'s id in your CRM' } } }, { channelId: '2d0b5d6e-7f3c-4a2b-9c1e-8f4a6b7c8d9e', threadId: '66a1f2c3d4e5f67890123456', subject: 'Late delivery', crmClientId: 'C-1001' }) })
      },
      '/api/v1/tickets/{id}': {
        get: operation('Tickets', 'One ticket', '', { 200: jsonResponse('Ticket', dataOf(ref('Ticket'))), 404: errorRef('NotFound') }, { parameters: [idParam('Ticket id')] }),
        patch: operation('Tickets', 'Change category, priority or subject', '', { 200: jsonResponse('Updated', dataOf(ref('Ticket'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Ticket id')], requestBody: jsonBody({ type: 'object', properties: { categoryId: { type: ['string', 'null'] }, priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] }, subject: { type: 'string', maxLength: 200 } } }, { priority: 'HIGH' }) })
      },
      '/api/v1/tickets/{id}/close': {
        post: operation('Tickets', 'Close a ticket', 'Resolves the ticket. Unless `sendRating` is false, the customer gets the rating request configured in Ticket settings.',
          { 200: jsonResponse('Closed', dataOf(ref('Ticket'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Ticket id')], requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string', maxLength: 2000, description: 'How it was solved' }, categoryId: UUID, sendRating: { type: 'boolean', default: true } } } } } } })
      },
      '/api/v1/tickets/{id}/reopen': {
        post: operation('Tickets', 'Reopen a ticket', '', { 200: jsonResponse('Reopened', dataOf(ref('Ticket'))), 404: errorRef('NotFound') }, { parameters: [idParam('Ticket id')] })
      },
      '/api/v1/tickets/{id}/assign': {
        post: operation('Tickets', 'Assign a ticket', 'Gives the ticket to a team member (`assignedToId`), or to nobody (null).',
          { 200: jsonResponse('Assigned', dataOf(ref('Ticket'))), 404: errorRef('NotFound') },
          { parameters: [idParam('Ticket id')], requestBody: jsonBody({ type: 'object', properties: { assignedToId: { type: ['string', 'null'] } } }, { assignedToId: '7c9e6679-7425-40de-944b-e07fc1f90ae7' }) })
      }
    },

    // ── Webhooks: what Wakeel sends to your server ───────────────────────────────────────────────────
    webhooks: {
      incomingMessage: {
        post: {
          summary: 'A customer wrote to one of your Meta Cloud numbers',
          description: 'POSTed to your Webhook URL (Developer Tools) for each message a customer sends to a **Meta Cloud** number, unless incoming messages are turned off there. The body is the message exactly as Meta\'s Cloud API delivers it (one message per call); `metadata.phone_number_id` says which number received it, `contacts[0].profile.name` the customer\'s WhatsApp name, `messages[0].from` their phone. Messages to QR-connected numbers are not forwarded. Answer 200 within 5 seconds; a failed delivery is not retried.\n\nAuthentication: the header you configured in Developer Tools (name and value), otherwise `X-Webhook-Key: <your API token>` when a CRM token is set.',
          requestBody: jsonBody(ref('MetaEnvelope'), {
            object: 'whatsapp_business_account',
            entry: [{
              id: '102290129340398',
              changes: [{
                field: 'messages',
                value: {
                  metadata: { phone_number_id: '106540352242922' },
                  contacts: [{ profile: { name: 'Sara' }, wa_id: '966500000000' }],
                  messages: [{ from: '966500000000', id: 'wamid.HBgMOTY2NTAwMDAwMDAwFQIAEhggNzY4QUFCQzAwMDAwMDAwMAA=', timestamp: '1764320000', type: 'text', text: { body: 'When does my order arrive?' } }]
                }
              }]
            }]
          }),
          responses: { 200: { description: 'Received' } }
        }
      },
      messageStatus: {
        post: {
          summary: 'Delivery status of a message you sent from a Meta Cloud number',
          description: 'POSTed to your Webhook URL when Meta reports `sent`, `delivered`, `read` or `failed` for a message of a Meta Cloud number, unless statuses are turned off in Developer Tools. Same envelope as incoming messages, with `statuses` instead of `messages`; `statuses[0].id` is the `metaMessageId` returned when you sent it. A `failed` status carries Meta\'s `errors`.',
          requestBody: jsonBody(ref('MetaEnvelope'), {
            object: 'whatsapp_business_account',
            entry: [{
              id: '102290129340398',
              changes: [{
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: '106540352242922' },
                  statuses: [{ id: 'wamid.HBgMOTY2NTAwMDAwMDAwFQIAERgSNzY4QUFCQzAwMDAwMDAwMAA=', status: 'delivered', timestamp: '1764320060', recipient_id: '966500000000' }]
                }
              }]
            }]
          }),
          responses: { 200: { description: 'Received' } }
        }
      },
      clientSync: {
        post: {
          summary: 'A new customer: create or find them in your CRM',
          description: 'Sent when a message goes to, or comes from, a phone that is new to the account. If a **CRM Base URL** and token are set in Developer Tools, Wakeel instead POSTs `{ "phone", "name" }` to `<CRM Base URL>/api/v1/integrations/provider/sync-contact` with `Authorization: Bearer <token>` and expects `{ "client_id": "...", "is_new": true|false }` back; the `client_id` is then stored on the conversation and sent with its tickets. Otherwise this event goes to the Webhook URL and your reply may carry `client_id` too.',
          requestBody: jsonBody(ref('Event'), { event: 'client.sync', data: { phone: '966500000000', name: 'Sara' } }),
          responses: { 200: jsonResponse('Optional: the customer\'s id in your system', { type: 'object', properties: { client_id: { type: 'string' }, is_new: { type: 'boolean' } } }) }
        }
      },
      ticketSync: {
        post: {
          summary: 'A ticket was opened, resolved or closed',
          description: 'Sent to the Webhook URL when a ticket changes state, with the conversation and customer it belongs to. `status` is `open`, `resolved` or `closed`. If your reply contains a ticket id, Wakeel keeps it as the ticket\'s `crmTicketId`.',
          requestBody: jsonBody(ref('Event'), {
            event: 'ticket.sync',
            data: { phone: '966500000000', name: 'Sara', thread_id: '66a1f2c3d4e5f67890123456', ticket_id: '9b2f4c6e-1a3d-4e5f-8a7b-6c5d4e3f2a1b', ticket_number: 'T-1042', category_name: 'Delivery', status: 'resolved', subject: 'Late delivery', description: 'Order resent', summary: null, rating: null }
          }),
          responses: { 200: { description: 'Received' } }
        }
      },
      ticketRated: {
        post: {
          summary: 'The customer rated a closed ticket',
          description: 'Sent to the Webhook URL when the customer answers the rating request after a ticket is closed. `rating` is 1 to 5.',
          requestBody: jsonBody(ref('Event'), { event: 'ticket.rated', data: { ticket_id: '9b2f4c6e-1a3d-4e5f-8a7b-6c5d4e3f2a1b', thread_id: '66a1f2c3d4e5f67890123456', rating: 5 } }),
          responses: { 200: { description: 'Received' } }
        }
      }
    },

    components: {
      securitySchemes: {
        apiKey: { type: 'http', scheme: 'bearer', description: 'An API key from the API Keys page (`sk_…`), or a dashboard login token' }
      },
      responses: {
        BadRequest: jsonResponse('A field is missing or invalid, or the action is not possible', ref('Error'), { error: '"phone" is required' }),
        Unauthorized: jsonResponse('Missing or invalid API key', ref('Error'), { error: 'Unauthorized: Invalid API Key' }),
        Forbidden: jsonResponse('Account disabled, feature not in the plan, or a number that is not yours', ref('Error'), { error: { code: 'CHANNEL_NOT_ALLOWED', message: 'You do not have access to this number' } }),
        NotFound: jsonResponse('Not found', ref('Error'), { error: { message: 'Not found' } }),
        QuotaExceeded: jsonResponse('The plan\'s monthly message limit is reached', ref('Error'), { error: { message: 'Monthly message limit reached. Please upgrade your plan.' } }),
        RateLimited: {
          description: 'Too many requests to this recipient; retry after the seconds in Retry-After',
          headers: {
            'X-RateLimit-Limit': { schema: { type: 'integer' }, description: 'Requests allowed in the window' },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            'X-RateLimit-Reset': { schema: { type: 'string', format: 'date-time' } },
            'Retry-After': { schema: { type: 'integer' }, description: 'Seconds' }
          },
          content: { 'application/json': { schema: ref('Error'), example: { error: 'Too Many Requests', message: 'Too many messages to this phone number. Limit: 30 per minute.' } } }
        }
      },
      schemas: {
        Ok: { type: 'object', properties: { success: { type: 'boolean', const: true }, message: { type: 'string' } }, required: ['success'] },
        ErrorBody: { type: 'object', properties: { message: { type: 'string' }, code: { type: 'string', description: 'Present for some failures, e.g. REPLY_WINDOW_CLOSED, CHANNEL_NOT_ALLOWED, INSUFFICIENT_BALANCE' } }, required: ['message'] },
        Error: {
          type: 'object',
          description: 'Either `{ "error": { "message", "code"? } }` or, for field validation, `{ "error": "message" }`',
          properties: { error: { oneOf: [ref('ErrorBody'), { type: 'string' }] }, message: { type: 'string' } },
          required: ['error']
        },
        Pagination: { type: 'object', properties: { total: { type: 'integer' }, page: { type: 'integer' }, pages: { type: 'integer' } } },
        PageMeta: { type: 'object', properties: { total: { type: 'integer' }, page: { type: 'integer' }, totalPages: { type: 'integer' } } },
        Channel: {
          type: 'object',
          properties: {
            id: UUID,
            providerType: { type: 'string', enum: ['BAILEYS', 'META_CLOUD', 'WEBCHAT', 'MESSENGER', 'INSTAGRAM', 'TIKTOK'], description: 'BAILEYS = QR-connected number, META_CLOUD = Meta Cloud API number' },
            name: { type: ['string', 'null'], example: 'Support line' },
            phoneNumber: { type: ['string', 'null'], example: '966500000000' },
            displayPhoneNumber: { type: ['string', 'null'], example: '+966 50 000 0000' },
            status: { type: 'string', example: 'CONNECTED' },
            isCoexistence: { type: 'boolean', description: 'A Meta number that also keeps working in the WhatsApp Business app' },
            createdAt: DATE
          }
        },
        MetaChannel: {
          allOf: [ref('Channel'), { type: 'object', properties: { metaPhoneNumberId: { type: 'string', example: '106540352242922' }, metaWabaId: { type: 'string', example: '102290129340398' }, autoCreateTickets: { type: 'boolean' } } }]
        },
        Thread: {
          type: 'object',
          description: 'A conversation with one customer on one channel',
          properties: {
            id: OBJECT_ID,
            channelId: UUID,
            contactPhone: { type: 'string', example: '966500000000' },
            contactName: { type: ['string', 'null'], example: 'Sara' },
            lastMessageAt: DATE,
            lastInboundAt: { ...DATE, description: 'The customer\'s last message' },
            unreadCount: { type: 'integer' },
            tagIds: { type: 'array', items: { type: 'string' } },
            stageId: { type: ['string', 'null'] },
            crmClientId: { type: ['string', 'null'], description: 'The customer\'s id in your CRM, from client.sync' },
            channel: { type: 'object', properties: { id: UUID, phoneNumber: { type: ['string', 'null'] }, displayPhoneNumber: { type: ['string', 'null'] }, name: { type: ['string', 'null'] }, providerType: { type: 'string' } } }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: OBJECT_ID,
            threadId: OBJECT_ID,
            direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
            type: { type: 'string', example: 'TEXT', description: 'TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, TEMPLATE, INTERACTIVE, INTERNAL_NOTE, …' },
            content: { type: ['string', 'null'] },
            hasMedia: { type: 'boolean' },
            mediaUrl: { type: ['string', 'null'] },
            mediaMime: { type: ['string', 'null'] },
            status: { type: ['string', 'null'], description: 'SENT, DELIVERED, READ or FAILED for outbound messages' },
            metaMessageId: { type: ['string', 'null'], description: 'Meta\'s wamid' },
            ticketId: { type: ['string', 'null'] },
            isInternal: { type: 'boolean', description: 'A team note the customer did not receive' },
            isAutomated: { type: 'boolean', description: 'Sent by a bot, flow or campaign' },
            source: { type: ['string', 'null'], example: 'CAMPAIGN' },
            createdAt: DATE
          }
        },
        Contact: {
          type: 'object',
          properties: { id: UUID, name: { type: 'string' }, phone: { type: 'string' }, email: { type: ['string', 'null'] }, groupId: { type: ['string', 'null'] }, metadata: { type: ['object', 'null'], additionalProperties: true }, createdAt: DATE, updatedAt: DATE }
        },
        ContactGroup: {
          type: 'object',
          properties: { id: UUID, name: { type: 'string' }, description: { type: ['string', 'null'] }, createdAt: DATE, _count: { type: 'object', properties: { contacts: { type: 'integer' } } } }
        },
        Template: {
          type: 'object',
          properties: { id: UUID, name: { type: 'string' }, content: { type: 'string', example: 'Hello {{name}}, your order {{order}} is ready.' }, mediaPath: { type: ['string', 'null'] }, mediaMime: { type: ['string', 'null'] }, createdAt: DATE }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: UUID,
            ticketNumber: { type: 'string', example: 'T-1042' },
            status: { type: 'string', enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
            channelId: UUID,
            threadId: OBJECT_ID,
            assignedToId: { type: ['string', 'null'] },
            subject: { type: ['string', 'null'] },
            categoryId: { type: ['string', 'null'] },
            rating: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
            summary: { type: ['string', 'null'], description: 'AI summary of the conversation, when enabled' },
            crmTicketId: { type: ['string', 'null'] },
            crmClientId: { type: ['string', 'null'] },
            resolvedAt: { ...DATE, type: ['string', 'null'] },
            firstResponseAt: { ...DATE, type: ['string', 'null'] },
            createdAt: DATE,
            updatedAt: DATE,
            channel: { type: ['object', 'null'], properties: { id: UUID, phoneNumber: { type: ['string', 'null'] }, displayPhoneNumber: { type: ['string', 'null'] }, name: { type: ['string', 'null'] } } },
            assignee: { type: ['object', 'null'], properties: { id: UUID, name: { type: 'string' }, email: { type: 'string' } } },
            category: { type: ['object', 'null'], properties: { id: UUID, name: { type: 'string' } } },
            contact: { type: ['object', 'null'], description: 'In list responses: the customer of the conversation', properties: { name: { type: ['string', 'null'] }, phone: { type: 'string' } } }
          }
        },
        MetaEnvelope: {
          type: 'object',
          description: 'The WhatsApp Cloud API webhook format',
          properties: {
            object: { type: 'string', const: 'whatsapp_business_account' },
            entry: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'WhatsApp Business Account id' },
                  changes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string', const: 'messages' },
                        value: {
                          type: 'object',
                          properties: {
                            messaging_product: { type: 'string' },
                            metadata: { type: 'object', properties: { phone_number_id: { type: 'string' }, display_phone_number: { type: 'string' } } },
                            contacts: { type: 'array', items: { type: 'object', properties: { wa_id: { type: 'string' }, profile: { type: 'object', properties: { name: { type: 'string' } } } } } },
                            messages: { type: 'array', items: { type: 'object', description: 'A Cloud API message: from, id, timestamp, type (text, image, audio, video, document, location, interactive, button, reaction, …) and the field of that type' } },
                            statuses: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['sent', 'delivered', 'read', 'failed'] }, timestamp: { type: 'string' }, recipient_id: { type: 'string' }, errors: { type: 'array', items: { type: 'object', properties: { code: { type: 'integer' }, title: { type: 'string' }, message: { type: 'string' } } } } } } }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        Event: {
          type: 'object',
          properties: { event: { type: 'string', enum: ['client.sync', 'ticket.sync', 'ticket.rated'] }, data: { type: 'object', additionalProperties: true } },
          required: ['event', 'data']
        }
      }
    }
  };
}

module.exports = { buildSpec };
