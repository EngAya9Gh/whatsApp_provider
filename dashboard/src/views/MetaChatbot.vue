<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
          🤖 Meta Auto Responder
        </h1>
        <p class="text-slate-500 font-medium text-base m-0">
          Automated replies for your Meta Cloud channels — supports text, images, QR codes, videos, documents and templates.
        </p>
      </div>
      <button
        @click="showModal = true; editingRule = null; resetForm()"
        :disabled="!selectedChannel"
        class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold shadow transition-colors cursor-pointer border-none flex items-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create Rule
      </button>
    </div>

    <!-- Channel Selector -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div class="flex-1">
        <label class="block text-sm font-bold text-slate-700 mb-1">Meta Channel</label>
        <select v-model="selectedChannel" @change="fetchRules" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
          <option value="">— Select a Meta Channel —</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">
            +{{ ch.phoneNumber || ch.displayPhoneNumber }} {{ ch.name ? '(' + ch.name + ')' : '' }}
          </option>
        </select>
      </div>
      <div v-if="selectedChannel" class="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-semibold self-end sm:self-center whitespace-nowrap">
        ✅ {{ rules.length }} rule{{ rules.length !== 1 ? 's' : '' }} configured
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="error" class="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl font-bold mb-5 flex items-center gap-2">
      ⚠️ {{ error }}
    </div>
    <div v-if="success" class="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl font-bold mb-5 flex items-center gap-2">
      ✅ {{ success }}
    </div>

    <!-- Empty State -->
    <div v-if="!selectedChannel" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <div class="text-6xl mb-4">📱</div>
      <h3 class="text-xl font-bold text-slate-700 mb-2">Select a Meta Channel</h3>
      <p class="text-slate-400">Choose a channel above to manage its auto-reply rules.</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="text-center py-20">
      <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400 font-medium">Loading rules...</p>
    </div>

    <!-- Rules Table -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div v-if="rules.length === 0" class="text-center py-20">
        <div class="text-5xl mb-4">🤖</div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">No rules yet</h3>
        <p class="text-slate-400">Click "Create Rule" to add your first Meta auto-reply.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-5 py-4 font-bold">Keyword</th>
              <th class="px-5 py-4 font-bold">Match</th>
              <th class="px-5 py-4 font-bold">Response Type</th>
              <th class="px-5 py-4 font-bold">Preview</th>
              <th class="px-5 py-4 font-bold">Validity</th>
              <th class="px-5 py-4 font-bold">Status</th>
              <th class="px-5 py-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id" class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <td class="px-5 py-4 font-bold text-slate-900">{{ rule.keyword }}</td>
              <td class="px-5 py-4">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold border" :class="{
                  'bg-blue-50 text-blue-700 border-blue-200': rule.matchType === 'EXACT',
                  'bg-purple-50 text-purple-700 border-purple-200': rule.matchType === 'CONTAINS',
                  'bg-orange-50 text-orange-700 border-orange-200': rule.matchType === 'STARTS_WITH'
                }">{{ rule.matchType }}</span>
              </td>
              <td class="px-5 py-4">
                <span class="flex items-center gap-1 font-semibold text-slate-700">
                  {{ responseTypeIcon(rule.responseType) }} {{ rule.responseType }}
                </span>
              </td>
              <td class="px-5 py-4 text-slate-500 max-w-[200px] truncate">
                <span v-if="rule.responseType === 'META_TEMPLATE'">📋 {{ rule.metaTemplateName }}</span>
                <span v-else-if="rule.mediaUrl">🔗 {{ rule.mediaUrl.slice(0, 40) }}...</span>
                <span v-else>{{ (rule.message || '').slice(0, 50) }}</span>
              </td>
              <td class="px-5 py-4 text-xs text-slate-400">
                <span v-if="rule.startDate || rule.endDate">
                  {{ rule.startDate ? new Date(rule.startDate).toLocaleDateString() : '∞' }} — {{ rule.endDate ? new Date(rule.endDate).toLocaleDateString() : '∞' }}
                </span>
                <span v-else class="text-slate-300">Always active</span>
              </td>
              <td class="px-5 py-4">
                <button @click="toggleActive(rule)" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none cursor-pointer" :class="rule.isActive ? 'bg-emerald-500' : 'bg-slate-300'">
                  <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="rule.isActive ? 'translate-x-6' : 'translate-x-1'"></span>
                </button>
              </td>
              <td class="px-5 py-4 flex gap-2">
                <button @click="editRule(rule)" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border-none px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors">Edit</button>
                <button @click="deleteRule(rule.id)" class="bg-red-50 hover:bg-red-100 text-red-700 border-none px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
          <h2 class="text-lg font-extrabold text-slate-900 m-0">{{ editingRule ? 'تعديل القاعدة' : 'إنشاء رد تلقائي جديد' }}</h2>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer text-2xl font-bold leading-none">&times;</button>
        </div>

        <div class="flex flex-col md:flex-row min-h-[450px]">
          
          <!-- Left: Instructions Panel -->
          <div class="md:w-72 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white p-6 md:rounded-bl-2xl flex-shrink-0">
            <h4 class="font-extrabold text-base mb-4 border-b border-emerald-500 pb-3">📋 إرشادات الرد التلقائي</h4>
            <ul class="space-y-3 text-xs leading-relaxed">
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>الكلمة المفتاحية:</strong> الكلمة التي ستُفعل الرد (مثل: السعر، تفاصيل، موقعكم).</span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>نوع المطابقة:</strong>
                  <br>- <em>تطابق تام (Exact):</em> يجب أن يكتب العميل الكلمة فقط.
                  <br>- <em>يحتوي على (Contains):</em> الكلمة موجودة ضمن الجملة.
                  <br>- <em>يبدأ بـ (Starts With):</em> الجملة تبدأ بهذه الكلمة.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>نوع الرد:</strong> نص عادي، أو وسائط (صورة، ملف، فيديو) برابط مباشر، أو قالب (Template) معتمد من Meta.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-emerald-300 font-bold">✓</span>
                <span><strong>تفعيل خارج النافذة:</strong> إذا كان العميل يتواصل لأول مرة، <strong>يجب</strong> استخدام قالب (Template) للرد، الرد النصي العادي لن يصل.</span>
              </li>
            </ul>
          </div>

          <!-- Right: Form -->
          <div class="flex-1 overflow-y-auto flex flex-col max-h-[70vh]">
            <div class="p-6 flex-1 space-y-5">
          <!-- Keyword -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Trigger Keyword *</label>
            <input v-model="form.keyword" type="text" placeholder="e.g. hello, مرحبا, price" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
          </div>

          <!-- Match Type -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">Match Type</label>
            <div class="grid grid-cols-3 gap-2">
              <label v-for="type in matchTypes" :key="type.value" class="cursor-pointer border rounded-xl p-3 text-center transition-all" :class="form.matchType === type.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'">
                <input type="radio" v-model="form.matchType" :value="type.value" class="hidden" />
                <div class="text-lg mb-0.5">{{ type.icon }}</div>
                <div class="text-xs font-bold">{{ type.label }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ type.hint }}</div>
              </label>
            </div>
          </div>

          <!-- Response Type -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">Response Type</label>
            <div class="grid grid-cols-3 gap-2">
              <label v-for="rtype in responseTypes" :key="rtype.value" class="cursor-pointer border rounded-xl p-3 text-center transition-all" :class="form.responseType === rtype.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'">
                <input type="radio" v-model="form.responseType" :value="rtype.value" class="hidden" />
                <div class="text-lg mb-0.5">{{ rtype.icon }}</div>
                <div class="text-xs font-bold">{{ rtype.label }}</div>
              </label>
            </div>
          </div>

          <!-- TEXT message -->
          <div v-if="form.responseType === 'TEXT'">
            <label class="block text-sm font-bold text-slate-700 mb-1">Reply Message *</label>
            <textarea v-model="form.message" rows="4" placeholder="Type your auto reply..." class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500 resize-none"></textarea>
          </div>

          <!-- IMAGE / VIDEO / DOCUMENT / QR_CODE -->
          <div v-if="['IMAGE', 'VIDEO', 'DOCUMENT', 'QR_CODE'].includes(form.responseType)">
            <label class="block text-sm font-bold text-slate-700 mb-1">
              {{ form.responseType === 'QR_CODE' ? 'QR Code Image URL *' : form.responseType + ' URL *' }}
            </label>
            <input v-model="form.mediaUrl" type="url" :placeholder="form.responseType === 'QR_CODE' ? 'https://yourserver.com/qr-code.png' : 'https://yourserver.com/file.jpg'" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
            <p class="text-xs text-slate-400 mt-1">Provide a public URL accessible by Meta servers.</p>
            <label class="block text-sm font-bold text-slate-700 mb-1 mt-3">Caption (Optional)</label>
            <input v-model="form.message" type="text" placeholder="Caption text..." class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
          </div>

          <!-- META_TEMPLATE -->
          <div v-if="form.responseType === 'META_TEMPLATE'">
            <label class="block text-sm font-bold text-slate-700 mb-1">Select Approved Template *</label>
            <div v-if="metaTemplates.length === 0" class="text-sm text-slate-400 italic mb-2">Loading templates from Meta...</div>
            <select v-model="form.metaTemplateKey" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500 mb-3">
              <option value="">— Choose a template —</option>
              <option v-for="tpl in metaTemplates" :key="tpl.name + tpl.language" :value="tpl.name + '||' + tpl.language">
                {{ tpl.name }} ({{ tpl.language }}) — {{ tpl.status }}
              </option>
            </select>
            <p class="text-xs text-slate-400">Only APPROVED templates will be sent successfully.</p>
          </div>

          <!-- Date Range -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Start Date (Optional)</label>
              <input v-model="form.startDate" type="datetime-local" class="w-full p-2 border border-slate-300 rounded-xl text-xs outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">End Date (Optional)</label>
              <input v-model="form.endDate" type="datetime-local" class="w-full p-2 border border-slate-300 rounded-xl text-xs outline-none" />
            </div>
          </div>

          <!-- Active Toggle -->
          <div class="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div>
              <p class="text-sm font-bold text-slate-700 m-0">Activate Rule</p>
              <p class="text-xs text-slate-400 m-0">Rule will start matching messages immediately.</p>
            </div>
            <button @click="form.isActive = !form.isActive" class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors border-none cursor-pointer" :class="form.isActive ? 'bg-emerald-500' : 'bg-slate-300'">
              <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform" :class="form.isActive ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>

          <!-- Error -->
          <div v-if="modalError" class="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm font-bold">⚠️ {{ modalError }}</div>
            </div> <!-- end form padding -->
            <!-- Footer Actions -->
            <div class="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 sticky bottom-0 md:rounded-br-2xl">
              <button @click="showModal = false" class="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-transparent border-none cursor-pointer">إلغاء</button>
              <button @click="saveRule" :disabled="saving" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow transition-colors disabled:opacity-50 border-none cursor-pointer flex items-center gap-2">
                <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ editingRule ? 'حفظ التعديلات' : 'إنشاء القاعدة' }}
              </button>
            </div>
          </div> <!-- end right panel -->
        </div> <!-- end two-col flex -->
      </div> <!-- end modal card -->
    </div> <!-- end modal overlay -->
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const channels = ref([])
const selectedChannel = ref('')
const rules = ref([])
const metaTemplates = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingRule = ref(null)
const saving = ref(false)
const error = ref('')
const success = ref('')
const modalError = ref('')

const matchTypes = [
  { value: 'EXACT', label: 'Exact', icon: '🎯', hint: 'Full match' },
  { value: 'CONTAINS', label: 'Contains', icon: '🔍', hint: 'Includes word' },
  { value: 'STARTS_WITH', label: 'Starts With', icon: '✏️', hint: 'Begins with' }
]

const responseTypes = [
  { value: 'TEXT', label: 'Text', icon: '💬' },
  { value: 'IMAGE', label: 'Image', icon: '🖼️' },
  { value: 'VIDEO', label: 'Video', icon: '🎥' },
  { value: 'DOCUMENT', label: 'Document', icon: '📄' },
  { value: 'QR_CODE', label: 'QR Code', icon: '📷' },
  { value: 'META_TEMPLATE', label: 'Template', icon: '📋' }
]

const form = ref({
  keyword: '', matchType: 'EXACT', responseType: 'TEXT',
  message: '', mediaUrl: '', metaTemplateKey: '',
  startDate: '', endDate: '', isActive: true
})

const resetForm = () => {
  form.value = { keyword: '', matchType: 'EXACT', responseType: 'TEXT', message: '', mediaUrl: '', metaTemplateKey: '', startDate: '', endDate: '', isActive: true }
  modalError.value = ''
}

const responseTypeIcon = (type) => {
  const found = responseTypes.find(r => r.value === type)
  return found ? found.icon : '💬'
}

const fetchChannels = async () => {
  try {
    const res = await axios.get('/api/v1/meta/channels')
    channels.value = res.data.data || []
    if (channels.value.length === 1) {
      selectedChannel.value = channels.value[0].id
      fetchRules()
    }
  } catch (e) { console.error(e) }
}

const fetchRules = async () => {
  if (!selectedChannel.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`/api/v1/meta/channel/${selectedChannel.value}/autoresponders`)
    rules.value = res.data.data || []
  } catch (e) {
    error.value = 'Failed to load rules. Please try again.'
  } finally {
    loading.value = false
  }
}

const fetchMetaTemplates = async () => {
  if (!selectedChannel.value) return
  try {
    const res = await axios.get(`/api/v1/meta/channel/${selectedChannel.value}/meta-templates`)
    const raw = res.data.data?.data || []
    metaTemplates.value = raw.filter(t => t.status === 'APPROVED')
  } catch (e) { console.error('Failed to load templates', e) }
}

watch(() => form.value.responseType, (newVal) => {
  if (newVal === 'META_TEMPLATE' && selectedChannel.value) fetchMetaTemplates()
})

const editRule = (rule) => {
  editingRule.value = rule
  form.value = {
    keyword: rule.keyword,
    matchType: rule.matchType,
    responseType: rule.responseType,
    message: rule.message || '',
    mediaUrl: rule.mediaUrl || '',
    metaTemplateKey: rule.metaTemplateName ? rule.metaTemplateName + '||' + (rule.metaTemplateLang || 'ar') : '',
    startDate: rule.startDate ? new Date(rule.startDate).toISOString().slice(0, 16) : '',
    endDate: rule.endDate ? new Date(rule.endDate).toISOString().slice(0, 16) : '',
    isActive: rule.isActive
  }
  modalError.value = ''
  showModal.value = true
  if (rule.responseType === 'META_TEMPLATE') fetchMetaTemplates()
}

const saveRule = async () => {
  modalError.value = ''
  if (!form.value.keyword.trim()) { modalError.value = 'Keyword is required.'; return }
  if (form.value.responseType === 'TEXT' && !form.value.message.trim()) { modalError.value = 'Message is required for TEXT type.'; return }
  if (['IMAGE', 'VIDEO', 'DOCUMENT', 'QR_CODE'].includes(form.value.responseType) && !form.value.mediaUrl.trim()) { modalError.value = 'Media URL is required.'; return }
  if (form.value.responseType === 'META_TEMPLATE' && !form.value.metaTemplateKey) { modalError.value = 'Please select a template.'; return }

  const [metaTemplateName, metaTemplateLang] = form.value.metaTemplateKey ? form.value.metaTemplateKey.split('||') : [null, null]

  const payload = {
    keyword: form.value.keyword.trim(),
    matchType: form.value.matchType,
    responseType: form.value.responseType,
    message: form.value.message || null,
    mediaUrl: form.value.mediaUrl || null,
    metaTemplateName: metaTemplateName || null,
    metaTemplateLang: metaTemplateLang || 'ar',
    startDate: form.value.startDate || null,
    endDate: form.value.endDate || null,
    isActive: form.value.isActive
  }

  saving.value = true
  try {
    if (editingRule.value) {
      await axios.put(`/api/v1/meta/channel/${selectedChannel.value}/autoresponders/${editingRule.value.id}`, payload)
      success.value = 'Rule updated successfully!'
    } else {
      await axios.post(`/api/v1/meta/channel/${selectedChannel.value}/autoresponders`, payload)
      success.value = 'Rule created successfully!'
    }
    showModal.value = false
    fetchRules()
    setTimeout(() => { success.value = '' }, 4000)
  } catch (e) {
    modalError.value = e.response?.data?.message || 'Failed to save rule.'
  } finally {
    saving.value = false
  }
}

const deleteRule = async (id) => {
  if (!confirm('Delete this auto reply rule?')) return
  try {
    await axios.delete(`/api/v1/meta/channel/${selectedChannel.value}/autoresponders/${id}`)
    rules.value = rules.value.filter(r => r.id !== id)
    success.value = 'Rule deleted.'
    setTimeout(() => { success.value = '' }, 3000)
  } catch (e) {
    error.value = 'Failed to delete rule.'
  }
}

const toggleActive = async (rule) => {
  try {
    await axios.patch(`/api/v1/meta/channel/${selectedChannel.value}/autoresponders/${rule.id}/active`, { isActive: !rule.isActive })
    rule.isActive = !rule.isActive
  } catch (e) {
    error.value = 'Failed to toggle rule status.'
  }
}

onMounted(fetchChannels)
</script>
