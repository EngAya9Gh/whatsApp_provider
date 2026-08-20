<template>
  <FeatureLock feature="API_ACCESS" requiredPlan="STARTER">
    <div class="max-w-6xl mx-auto pb-16 p-6 md:p-8 font-sans text-slate-800">

      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">API Keys</h2>
          <p class="text-slate-500 font-medium text-lg">Manage your API keys for programmatic access to all platform features.</p>
        </div>
        <button @click="generateKey" :disabled="loading" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer border-none disabled:opacity-50 flex items-center gap-2">
          <svg v-if="!loading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
          <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {{ loading ? 'Generating...' : 'Generate New Key' }}
        </button>
      </div>

      <!-- Newly Generated Key -->
      <div v-if="newlyGeneratedKey" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl mb-8 shadow-sm">
        <div class="flex items-center gap-2 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-600"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          <strong class="font-bold text-lg">Important:</strong> <span class="font-medium">Copy your new API key now. You won't be able to see it again!</span>
        </div>
        <div class="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <code class="text-xl px-6 py-3 bg-white border border-emerald-300 text-emerald-700 rounded-lg shadow-inner font-mono font-bold w-full sm:w-auto break-all">{{ newlyGeneratedKey }}</code>
          <button @click="copyKey(newlyGeneratedKey)" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-colors border-none cursor-pointer w-full sm:w-auto">Copy Key</button>
        </div>
      </div>

      <!-- Keys Table -->
      <div v-if="keys.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm mb-12">
        <div class="text-6xl mb-4">🔑</div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">No API Keys found</h3>
        <p class="text-slate-500 font-medium">Generate one to start using the API.</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-12" v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-slate-600 border-collapse">
            <thead class="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-4 font-bold rounded-tl-xl">Name / Description</th>
                <th scope="col" class="px-6 py-4 font-bold">API Key (Masked)</th>
                <th scope="col" class="px-6 py-4 font-bold">Created At</th>
                <th scope="col" class="px-6 py-4 font-bold rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in keys" :key="key.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-slate-800">{{ key.label || 'Default Key' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <code class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono text-sm border border-slate-200">sk_{{ key.keyPrefix }}************************</code>
                    <button @click="copyKey(`sk_${key.keyPrefix}************************`)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors border-none cursor-pointer" title="Copy">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 font-medium">{{ new Date(key.createdAt).toLocaleDateString() }}</td>
                <td class="px-6 py-4">
                  <button @click="revokeKey(key.id)" class="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md font-bold text-xs transition-colors border border-red-100 cursor-pointer">Revoke</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Available Channels -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-12">
        <h2 class="text-2xl font-extrabold text-slate-900 mb-2">Available Channels</h2>
        <p class="text-slate-500 font-medium mb-6">Use these Channel IDs (<code class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-sm border border-slate-200">channel_id</code>) in your API requests to route messages through specific numbers (Meta or Web QR). If omitted, the default Web QR connection is used.</p>

        <div v-if="channels.length === 0" class="bg-slate-50 border border-slate-200 text-slate-500 font-medium p-6 rounded-xl text-center">
          No Meta Channels found. (Default Web QR will be used).
        </div>
        <div class="overflow-x-auto" v-else>
          <table class="w-full text-sm text-left text-slate-600 border-collapse border border-slate-200 rounded-xl overflow-hidden">
            <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" class="px-6 py-4 font-bold">Phone Number</th>
                <th scope="col" class="px-6 py-4 font-bold">Provider</th>
                <th scope="col" class="px-6 py-4 font-bold">Channel ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in channels" :key="ch.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td class="px-6 py-4 font-bold text-slate-800">+{{ ch.phoneNumber }}</td>
                <td class="px-6 py-4">
                  <span :class="ch.providerType === 'META_CLOUD' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
                    {{ ch.providerType }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <code class="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono text-sm border border-slate-200">{{ ch.id }}</code>
                    <button @click="copyKey(ch.id)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 w-8 h-8 rounded-md flex items-center justify-center transition-colors border-none cursor-pointer" title="Copy">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- API DOCUMENTATION                           -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">

        <!-- Auth Info Banner -->
        <h2 class="text-2xl font-extrabold text-slate-900 mb-2">API Documentation</h2>
        <p class="text-slate-500 font-medium mb-6">Full API reference for integrating WhatsApp features into your projects (CRM, ERP, custom apps, etc.).</p>

        <div class="bg-slate-900 text-slate-200 rounded-xl p-5 mb-10 flex flex-col sm:flex-row gap-4 items-start">
          <div class="shrink-0 bg-orange-500 text-white rounded-lg p-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
          </div>
          <div>
            <p class="font-bold text-white mb-1">Authentication</p>
            <p class="text-slate-400 text-sm mb-2">All API requests must include your API key in the <code class="text-orange-400">Authorization</code> header:</p>
            <code class="text-emerald-400 font-mono text-sm">Authorization: Bearer sk_your_api_key_here</code>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="flex flex-wrap gap-2 mb-8">
          <button v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id"
            :class="activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            class="px-4 py-2 rounded-lg font-bold text-sm transition-colors border-none cursor-pointer">
            {{ cat.icon }} {{ cat.label }}
          </button>
        </div>

        <!-- ─── MESSAGING ─── -->
        <div v-if="activeCategory === 'messaging'" class="flex flex-col gap-6">

          <ApiEndpoint number="1" method="POST" title="Send Text Message" :url="`${baseUrl}/api/v1/message/send`">
            <template #description>Send a plain text message to any WhatsApp number.</template>
            <template #body>{
  "phone": "966500000000",
  "message": "Hello! Your order #1234 has been confirmed.",
  "channel_id": "optional-channel-id"
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_abc123"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="2" method="POST" title="Send Media via URL (Image / PDF / Video)" :url="`${baseUrl}/api/v1/message/send-media`">
            <template #description>Send a media file (image, PDF invoice, video) using a public URL. Perfect for sending invoices from your CRM.</template>
            <template #body>{
  "phone": "966500000000",
  "type": "pdf",
  "url": "https://yourapp.com/invoices/INV-2025-001.pdf",
  "caption": "Invoice #2025-001 — Amount: 1,500 SAR",
  "channel_id": "optional-channel-id"
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_xyz456"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="3" method="POST" title="Upload & Send Media (Binary File)" :url="`${baseUrl}/api/v1/message/upload-media`" note="Content-Type: multipart/form-data">
            <template #description>Upload a file directly and send it as a WhatsApp message. Useful when you have the file in memory (e.g., a dynamically generated PDF invoice).</template>
            <template #body>Form Data:
  phone      → "966500000000"
  type       → "pdf"  (or "image", "video", "audio")
  caption    → "Your invoice is attached"
  channel_id → "optional-channel-id"
  file       → [Binary File]</template>
            <template #response>{
  "success": true,
  "messageId": "msg_pdf789"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="4" method="POST" title="Send Buttons Message" :url="`${baseUrl}/api/v1/message/send-buttons`">
            <template #description>Send an interactive message with up to 3 quick-reply buttons (ideal for order confirmations, appointment bookings, etc.).</template>
            <template #body>{
  "phone": "966500000000",
  "text": "Please confirm your order #5678:",
  "buttons": [
    { "id": "confirm", "text": "✅ Confirm" },
    { "id": "cancel",  "text": "❌ Cancel"  }
  ],
  "channel_id": "optional-channel-id"
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_btn001"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="5" method="POST" title="Send List Message" :url="`${baseUrl}/api/v1/message/send-list`">
            <template #description>Send a message with a list menu (up to 10 items). Ideal for product catalogs, service selection, etc.</template>
            <template #body>{
  "phone": "966500000000",
  "title": "Our Services",
  "body": "Please select the service you need:",
  "buttonText": "View Services",
  "sections": [
    {
      "title": "Support",
      "rows": [
        { "id": "tech",     "title": "Technical Support",   "description": "Help with tech issues" },
        { "id": "billing",  "title": "Billing",             "description": "Invoice & payments" }
      ]
    }
  ],
  "channel_id": "optional-channel-id"
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_list002"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="6" method="POST" title="Send Location" :url="`${baseUrl}/api/v1/message/send-location`">
            <template #description>Share a location pin. Useful for sending your store address, delivery drop-off point, etc.</template>
            <template #body>{
  "phone": "966500000000",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "name": "Our Main Office",
  "address": "King Fahd Road, Riyadh",
  "channel_id": "optional-channel-id"
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_loc003"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="7" method="POST" title="Send Template Message" :url="`${baseUrl}/api/v1/templates/send`">
            <template #description>Send a pre-built message template. Templates are managed in your dashboard and can contain variables.</template>
            <template #body>{
  "phone": "966500000000",
  "templateId": "your-template-id",
  "channel_id": "optional-channel-id",
  "variables": {
    "name": "Ahmed",
    "order_id": "ORD-7890",
    "amount": "2,500 SAR"
  }
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_tpl004"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="8" method="POST" title="Send Meta Template (Cloud API)" :url="`${baseUrl}/api/v1/message/send-meta-template`">
            <template #description>Send an approved Meta Cloud API template with full component control (header, body, buttons).</template>
            <template #body>{
  "phone": "966500000000",
  "templateName": "order_confirmation",
  "languageCode": "ar",
  "channel_id": "your-meta-channel-id",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Ahmed" },
        { "type": "text", "text": "ORD-7890" }
      ]
    }
  ]
}</template>
            <template #response>{
  "success": true,
  "messageId": "msg_meta005"
}</template>
          </ApiEndpoint>

        </div>

        <!-- ─── OTP ─── -->
        <div v-if="activeCategory === 'otp'" class="flex flex-col gap-6">

          <ApiEndpoint number="1" method="POST" title="Send OTP" :url="`${baseUrl}/api/v1/otp/send`">
            <template #description>Automatically generate and send a 6-digit OTP to a phone number via WhatsApp. The OTP is valid for 10 minutes. Rate limited to prevent abuse.</template>
            <template #body>{
  "phone": "966500000000"
}</template>
            <template #response>{
  "success": true,
  "message": "OTP sent successfully"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="2" method="POST" title="Verify OTP" :url="`${baseUrl}/api/v1/otp/verify`">
            <template #description>Verify the OTP entered by the user. Returns success if the code is valid and not expired.</template>
            <template #body>{
  "phone": "966500000000",
  "otp": "481726"
}</template>
            <template #response>{
  "success": true,
  "message": "OTP verified successfully"
}</template>
          </ApiEndpoint>

        </div>

        <!-- ─── CHAT / INBOX ─── -->
        <div v-if="activeCategory === 'chat'" class="flex flex-col gap-6">

          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
            <span class="text-blue-600 text-xl">💡</span>
            <div class="text-sm text-blue-800">
              <strong>CRM Integration:</strong> Use these endpoints to embed your own live chat widget directly inside your CRM. You can fetch all customer conversations, read message history, and reply — all using your API Key.
            </div>
          </div>

          <ApiEndpoint number="1" method="GET" title="List All Chat Threads" :url="`${baseUrl}/api/v1/chat/threads`">
            <template #description>Returns a list of all active customer conversations (threads) for your account. Each thread represents a unique customer contact.</template>
            <template #body>No request body needed. Send as GET request.

Optional query params:
  ?page=1
  ?limit=20</template>
            <template #response>{
  "success": true,
  "data": [
    {
      "id": "thread_abc",
      "customerPhone": "966500000000",
      "customerName": "Ahmed Ali",
      "lastMessage": "When will my order arrive?",
      "lastMessageAt": "2025-08-20T10:00:00Z",
      "unreadCount": 2
    }
  ]
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="2" method="GET" title="Get Messages in a Thread" :url="`${baseUrl}/api/v1/chat/threads/{threadId}/messages`">
            <template #description>Fetch the full message history for a specific conversation thread. Use the <code class="bg-slate-700 px-1 py-0.5 rounded text-orange-300">id</code> from the threads list.</template>
            <template #body>No request body needed. Replace {threadId} in the URL.

Example: GET /api/v1/chat/threads/thread_abc/messages</template>
            <template #response>{
  "success": true,
  "data": [
    {
      "id": "msg_1",
      "content": "When will my order arrive?",
      "direction": "INCOMING",
      "createdAt": "2025-08-20T10:00:00Z"
    },
    {
      "id": "msg_2",
      "content": "Your order will arrive tomorrow!",
      "direction": "OUTGOING",
      "createdAt": "2025-08-20T10:05:00Z"
    }
  ]
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="3" method="POST" title="Reply to a Customer in a Thread" :url="`${baseUrl}/api/v1/chat/threads/{threadId}/messages`">
            <template #description>Send a reply to the customer directly from your CRM. The message will appear as a WhatsApp message from your number.</template>
            <template #body>{
  "content": "Hello! Your order #1234 will arrive tomorrow between 2-5 PM.",
  "type": "text"
}</template>
            <template #response>{
  "success": true,
  "data": {
    "id": "msg_new_001",
    "content": "Hello! Your order #1234 will arrive tomorrow between 2-5 PM.",
    "direction": "OUTGOING",
    "createdAt": "2025-08-20T11:00:00Z"
  }
}</template>
          </ApiEndpoint>

        </div>

        <!-- ─── CONTACTS ─── -->
        <div v-if="activeCategory === 'contacts'" class="flex flex-col gap-6">

          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
            <span class="text-blue-600 text-xl">💡</span>
            <div class="text-sm text-blue-800">
              <strong>Sync with your CRM:</strong> Use these endpoints to keep your contact list in sync with your external system. You can create, update, and delete contacts programmatically.
            </div>
          </div>

          <ApiEndpoint number="1" method="GET" title="List All Contacts" :url="`${baseUrl}/api/contacts`">
            <template #description>Returns all saved contacts for your account.</template>
            <template #body>No request body needed. Send as GET request.</template>
            <template #response>{
  "success": true,
  "data": [
    {
      "id": "contact_123",
      "name": "Ahmed Ali",
      "phone": "966500000000",
      "groupId": "group_abc",
      "tags": ["VIP", "repeat-customer"]
    }
  ]
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="2" method="POST" title="Create a Contact" :url="`${baseUrl}/api/contacts`">
            <template #description>Add a new contact to your WhatsApp contact list from your CRM.</template>
            <template #body>{
  "name": "Sara Mohammed",
  "phone": "966501111111",
  "groupId": "optional-group-id",
  "tags": ["new-customer"]
}</template>
            <template #response>{
  "success": true,
  "data": {
    "id": "contact_new_456",
    "name": "Sara Mohammed",
    "phone": "966501111111"
  }
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="3" method="PUT" title="Update a Contact" :url="`${baseUrl}/api/contacts/{id}`">
            <template #description>Update an existing contact's details. Replace <code class="bg-slate-700 px-1 py-0.5 rounded text-orange-300">{id}</code> with the contact's ID.</template>
            <template #body>{
  "name": "Sara Ahmed",
  "tags": ["VIP", "new-customer"]
}</template>
            <template #response>{
  "success": true,
  "data": {
    "id": "contact_new_456",
    "name": "Sara Ahmed"
  }
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="4" method="DELETE" title="Delete a Contact" :url="`${baseUrl}/api/contacts/{id}`">
            <template #description>Permanently remove a contact from your list.</template>
            <template #body>No request body needed. Replace {id} in the URL.</template>
            <template #response>{
  "success": true,
  "message": "Contact deleted successfully"
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="5" method="GET" title="List Contact Groups" :url="`${baseUrl}/api/contacts/groups`">
            <template #description>Get all contact groups (lists) to organize your contacts for targeted campaigns.</template>
            <template #body>No request body needed.</template>
            <template #response>{
  "success": true,
  "data": [
    { "id": "group_abc", "name": "VIP Customers", "contactCount": 150 }
  ]
}</template>
          </ApiEndpoint>

          <ApiEndpoint number="6" method="POST" title="Create a Contact Group" :url="`${baseUrl}/api/contacts/groups`">
            <template #description>Create a new contact group to segment your audience.</template>
            <template #body>{
  "name": "Q3 2025 Leads"
}</template>
            <template #response>{
  "success": true,
  "data": {
    "id": "group_new_xyz",
    "name": "Q3 2025 Leads"
  }
}</template>
          </ApiEndpoint>

        </div>

        <!-- ─── WEBHOOKS ─── -->
        <div v-if="activeCategory === 'webhooks'" class="flex flex-col gap-6">

          <div class="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3 items-start">
            <span class="text-amber-600 text-2xl">🔔</span>
            <div class="text-sm text-amber-900">
              <p class="font-bold mb-1">What are Webhooks?</p>
              <p>Instead of polling our API constantly, you can configure a Webhook URL and we will automatically <strong>push</strong> real-time notifications to your server whenever a customer sends a message or the status of a message changes.</p>
              <p class="mt-2">Configure your Webhook URL in <strong>Settings → Developer Tools</strong>.</p>
            </div>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h4 class="font-bold text-slate-800">📩 Incoming Message Event Payload</h4>
              <p class="text-sm text-slate-500 mt-1">Sent when a customer sends you a WhatsApp message.</p>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>{
  "event": "message.incoming",
  "tenantId": "tenant_abc",
  "data": {
    "messageId": "wamid.xxx",
    "from": "966500000000",
    "customerName": "Ahmed Ali",
    "type": "text",
    "content": "I need help with my order",
    "timestamp": "2025-08-20T10:30:00Z"
  }
}</code></pre>
            </div>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h4 class="font-bold text-slate-800">📊 Message Status Event Payload</h4>
              <p class="text-sm text-slate-500 mt-1">Sent when a message status changes (sent → delivered → read).</p>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>{
  "event": "message.status",
  "tenantId": "tenant_abc",
  "data": {
    "messageId": "wamid.yyy",
    "to": "966500000000",
    "status": "READ",
    "timestamp": "2025-08-20T10:35:00Z"
  }
}</code></pre>
            </div>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h4 class="font-bold text-slate-800">🛡️ Verifying Webhook Authenticity</h4>
              <p class="text-sm text-slate-500 mt-1">We send a custom header so you can verify requests are coming from us.</p>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>// We send this header on every webhook request:
X-Webhook-Key: [the key you configured in Developer Tools settings]

// In your server, verify it:
if (req.headers['x-webhook-key'] !== YOUR_CONFIGURED_KEY) {
  return res.status(401).send('Unauthorized');
}
</code></pre>
            </div>
          </div>

        </div>

        <!-- ─── CRM GUIDE ─── -->
        <div v-if="activeCategory === 'crm'" class="flex flex-col gap-6">

          <div class="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
            <h3 class="font-bold text-xl text-orange-900 mb-2">🚀 CRM Integration Quickstart</h3>
            <p class="text-orange-800 text-sm">Follow this guide to embed a complete WhatsApp inbox inside your own CRM application in minutes.</p>
          </div>

          <!-- Step 1 -->
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <span class="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">1</span>
              <h4 class="font-bold text-slate-800 m-0">Authenticate — Add your API Key to every request</h4>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>// JavaScript / Fetch Example
const API_KEY = 'sk_your_api_key_here';
const BASE_URL = '{{ baseUrl }}';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};</code></pre>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <span class="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">2</span>
              <h4 class="font-bold text-slate-800 m-0">Fetch your inbox — Load all customer conversations</h4>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>// GET all chat threads (conversations)
const response = await fetch(`${BASE_URL}/api/v1/chat/threads`, { headers });
const { data: threads } = await response.json();

// Render threads in your CRM sidebar
threads.forEach(thread => {
  console.log(thread.customerName, thread.lastMessage);
});</code></pre>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <span class="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">3</span>
              <h4 class="font-bold text-slate-800 m-0">Send an invoice — Attach a PDF or use a URL</h4>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>// Send an invoice PDF to a customer's WhatsApp
await fetch(`${BASE_URL}/api/v1/message/send-media`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    phone: '966500000000',
    type: 'pdf',
    url: 'https://yourcrm.com/invoices/INV-001.pdf',
    caption: '🧾 Invoice #INV-001\nAmount: 1,500 SAR\nDue: Aug 30, 2025'
  })
});</code></pre>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <span class="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">4</span>
              <h4 class="font-bold text-slate-800 m-0">React to messages — Use Webhooks for real-time updates</h4>
            </div>
            <div class="p-6 bg-slate-900 text-slate-300 overflow-x-auto">
              <pre class="font-mono text-sm m-0"><code>// Your CRM backend server (Node.js example)
app.post('/webhook/whatsapp', (req, res) => {
  const { event, data } = req.body;

  if (event === 'message.incoming') {
    const { from, content, customerName } = data;
    // Create or update a ticket in your CRM
    CRM.createTicket({ phone: from, name: customerName, message: content });
  }

  res.sendStatus(200);
});</code></pre>
            </div>
          </div>

        </div>

      </div>
    </div>
  </FeatureLock>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import FeatureLock from '../components/FeatureLock.vue'

// ── Component: Reusable API Endpoint Card ──────────────────────────────
// Defined inline here for simplicity, can be extracted to a separate file
import { defineComponent, h } from 'vue'

const ApiEndpoint = defineComponent({
  name: 'ApiEndpoint',
  props: {
    number: String,
    method: String,
    title: String,
    url: String,
    note: String
  },
  setup(props, { slots }) {
    const methodColors = {
      GET:    'bg-emerald-100 text-emerald-800 border-emerald-200',
      POST:   'bg-blue-100 text-blue-800 border-blue-200',
      PUT:    'bg-amber-100 text-amber-800 border-amber-200',
      DELETE: 'bg-red-100 text-red-800 border-red-200',
      PATCH:  'bg-purple-100 text-purple-800 border-purple-200',
    }
    return () => h('div', { class: 'border border-slate-200 rounded-xl overflow-hidden' }, [
      h('div', { class: 'bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3' }, [
        h('div', {}, [
          h('h4', { class: 'font-bold text-slate-800 m-0 flex items-center gap-2' }, [
            h('span', { class: 'bg-orange-100 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold' }, props.number),
            props.title
          ]),
          slots.description ? h('p', { class: 'text-xs text-slate-500 mt-1.5 mb-0 ml-8' }, slots.description()) : null,
          props.note ? h('p', { class: 'text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 ml-8 font-medium inline-block' }, `⚠️ ${props.note}`) : null,
        ]),
        h('code', { class: `${methodColors[props.method] || 'bg-slate-100'} px-3 py-1 rounded-md font-mono text-sm font-bold border shrink-0` }, `${props.method} ${props.url}`)
      ]),
      h('div', { class: 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700' }, [
        h('div', { class: 'bg-slate-900 p-5' }, [
          h('p', { class: 'text-xs text-slate-500 font-bold uppercase mb-3 tracking-wider' }, 'Request Body'),
          h('pre', { class: 'font-mono text-sm m-0 text-slate-300 overflow-x-auto whitespace-pre-wrap' }, [
            h('code', {}, slots.body ? slots.body() : '')
          ])
        ]),
        h('div', { class: 'bg-slate-950 p-5' }, [
          h('p', { class: 'text-xs text-emerald-500 font-bold uppercase mb-3 tracking-wider' }, 'Response'),
          h('pre', { class: 'font-mono text-sm m-0 text-emerald-300 overflow-x-auto whitespace-pre-wrap' }, [
            h('code', {}, slots.response ? slots.response() : '')
          ])
        ])
      ])
    ])
  }
})

// ── State ───────────────────────────────────────────────────────────────
const keys = ref([])
const channels = ref([])
const loading = ref(false)
const newlyGeneratedKey = ref(null)
const baseUrl = ref(window.location.origin)

const activeCategory = ref('messaging')
const categories = [
  { id: 'messaging',  icon: '💬', label: 'Messaging' },
  { id: 'otp',        icon: '🔐', label: 'OTP' },
  { id: 'chat',       icon: '📥', label: 'Chat / Inbox' },
  { id: 'contacts',   icon: '👥', label: 'Contacts' },
  { id: 'webhooks',   icon: '🔔', label: 'Webhooks' },
  { id: 'crm',        icon: '🚀', label: 'CRM Quickstart' },
]

// ── API Calls ────────────────────────────────────────────────────────────
const fetchKeys = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/keys', {
      headers: { Authorization: `Bearer ${token}` }
    })
    keys.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch keys', err)
  }
}

const fetchChannels = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/channels', {
      headers: { Authorization: `Bearer ${token}` }
    })
    channels.value = res.data.data
  } catch (err) {
    console.error('Failed to fetch channels', err)
  }
}

onMounted(() => {
  fetchKeys()
  fetchChannels()
})

const generateKey = async () => {
  loading.value = true
  newlyGeneratedKey.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await axios.post('/api/keys', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    newlyGeneratedKey.value = res.data.data.key
    fetchKeys()
  } catch (err) {
    console.error('Failed to generate key', err)
  } finally {
    loading.value = false
  }
}

const revokeKey = async (id) => {
  if (!confirm('Are you sure you want to revoke this key? Any apps using it will stop working.')) return
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/keys/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    newlyGeneratedKey.value = null
    fetchKeys()
  } catch (err) {
    console.error('Failed to revoke key', err)
  }
}

const copyKey = (text) => {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}
</script>
