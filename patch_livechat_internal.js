const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isInternal ref
content = content.replace(
  'const activeTicket = ref(null)',
  'const activeTicket = ref(null)\nconst isInternal = ref(false)'
);

// 2. Add checkbox in chat-form
content = content.replace(
  '<button type="button" class="btn-attach" @click="$refs.fileInput.click()" title="إرفاق ملف">\n              <i class="fas fa-paperclip"></i>\n            </button>',
  `<button type="button" class="btn-attach" @click="$refs.fileInput.click()" title="إرفاق ملف">
              <i class="fas fa-paperclip"></i>
            </button>
            <button type="button" class="btn-attach" @click="isInternal = !isInternal" :class="{'text-[#FF6600]': isInternal}" :title="isInternal ? 'إلغاء الملاحظة الداخلية' : 'ملاحظة داخلية'">
              <i class="fas fa-lock"></i>
            </button>`
);

// 3. Add isInternal to sendMessage payload
content = content.replace(
  'const payload = {\n      content: newMessage.value',
  'const payload = {\n      content: newMessage.value,\n      isInternal: isInternal.value'
);

// 4. Reset isInternal after sending
content = content.replace(
  'newMessage.value = \'\'\n    attachment.value = null\n    showQuickReplies.value = false',
  "newMessage.value = ''\n    attachment.value = null\n    showQuickReplies.value = false\n    isInternal.value = false"
);

// 5. CSS for internal message bubble
content = content.replace(
  '<div \n            v-for="msg in messages" \n            :key="msg._id" \n            class="message-wrapper"\n            :class="{\'message-out\': msg.direction === \'OUTBOUND\', \'message-in\': msg.direction === \'INBOUND\'}">',
  `<div 
            v-for="msg in messages" 
            :key="msg._id" 
            class="message-wrapper"
            :class="{'message-out': msg.direction === 'OUTBOUND', 'message-in': msg.direction === 'INBOUND', 'message-internal': msg.isInternal || msg.type === 'INTERNAL_NOTE'}">`
);

content = content.replace(
  '<div class="message-bubble">',
  '<div class="message-bubble" :class="{\'bg-[#fff3cd] border border-[#ffeeba]\': msg.isInternal || msg.type === \'INTERNAL_NOTE\'}">'
);

fs.writeFileSync(path, content, 'utf8');
