<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Meta Templates</h2>
        <p class="text-slate-500 font-medium text-lg">Manage official WhatsApp message templates directly with Meta.</p>
      </div>
      <button v-if="selectedChannel" @click="showCreateModal = true" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer">
        + Create Template
      </button>
    </div>

    <!-- Meta Channel Selector -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex items-center gap-4">
      <div class="font-bold text-slate-700">Select Meta Channel:</div>
      <select v-model="selectedChannel" @change="fetchTemplates" class="flex-1 max-w-md p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
        <option value="" disabled>-- Select a channel --</option>
        <option v-for="channel in metaChannels" :key="channel.id" :value="channel.id">
          {{ channel.displayPhoneNumber }} ({{ channel.name || 'Meta Cloud' }})
        </option>
      </select>
    </div>

    <div v-if="!selectedChannel" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
      <div class="text-4xl mb-4">📱</div>
      <h3 class="text-xl font-bold text-slate-700">No Channel Selected</h3>
      <p class="text-slate-500 mt-2">Please select a Meta Cloud channel from the dropdown above to view its templates.</p>
    </div>

    <div v-else>
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
        <p class="mt-4 text-slate-500 font-medium">Loading templates from Meta...</p>
      </div>

      <div v-else-if="templates.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div class="text-4xl mb-4">📝</div>
        <h3 class="text-xl font-bold text-slate-700">No Templates Found</h3>
        <p class="text-slate-500 mt-2">You don't have any templates approved by Meta yet.</p>
        <button @click="showCreateModal = true" class="mt-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-6 py-2.5 rounded-lg font-bold transition-colors border-none cursor-pointer">
          Create Your First Template
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="template in templates" :key="template.id" class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
          <div class="p-5 border-b border-slate-100 flex justify-between items-start">
            <div>
              <h3 class="font-bold text-slate-900 text-lg mb-1">{{ template.name }}</h3>
              <div class="flex items-center gap-2 text-xs">
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{{ template.language }}</span>
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-semibold">{{ template.category }}</span>
              </div>
            </div>
            <span :class="getStatusClass(template.status)" class="px-2.5 py-1 rounded-full text-xs font-bold border">
              {{ template.status }}
            </span>
          </div>
          
          <div class="p-5 flex-1 bg-slate-50/50">
            <!-- Render Body Text Preview -->
            <p class="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
              {{ getTemplateBody(template) }}
            </p>
            <div v-if="template.rejected_reason" class="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
              <strong class="block mb-1">Rejection Reason:</strong>
              {{ template.rejected_reason }}
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex gap-2">
            <button @click="deleteTemplate(template.name)" class="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors border-none cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal Stub -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 class="text-xl font-bold text-slate-900 m-0">Create Meta Template</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none text-2xl cursor-pointer leading-none">&times;</button>
        </div>
        
        <div class="p-6">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Template Name</label>
              <input v-model="form.name" type="text" placeholder="e.g. order_confirmation" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono lowercase" />
              <p class="text-xs text-slate-500 mt-1">Lowercase and underscores only.</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Language</label>
              <select v-model="form.language" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
                <option value="en_US">English (US)</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Category</label>
            <div class="grid grid-cols-3 gap-3">
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'MARKETING' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="MARKETING" class="hidden" />
                <span class="text-xl mb-1">📢</span>
                <span class="font-bold text-sm">Marketing</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">Promotions, Offers</span>
              </label>
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'UTILITY' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="UTILITY" class="hidden" />
                <span class="text-xl mb-1">🔔</span>
                <span class="font-bold text-sm">Utility</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">Updates, Alerts</span>
              </label>
              <label class="border rounded-lg p-3 cursor-pointer flex flex-col items-center text-center transition-all" :class="form.category === 'AUTHENTICATION' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300'">
                <input type="radio" v-model="form.category" value="AUTHENTICATION" class="hidden" />
                <span class="text-xl mb-1">🔐</span>
                <span class="font-bold text-sm">Auth</span>
                <span class="text-[10px] opacity-70 mt-1 text-slate-500">OTP Codes</span>
              </label>
            </div>
          </div>

          <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Header (Optional)</label>
            <select v-model="form.headerType" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-emerald-500/20 outline-none">
              <option value="">None</option>
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>

            <div v-if="form.headerType === 'TEXT'">
              <label class="block text-xs font-bold text-slate-500 mb-1">Header Text</label>
              <input v-model="form.headerText" type="text" placeholder="e.g. Welcome {{1}}" class="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2 outline-none" maxlength="60" />
              <div v-if="form.headerText.includes('{{1}}')">
                <label class="block text-xs font-bold text-slate-500 mb-1">Example for {{1}}</label>
                <input v-model="form.headerExample" type="text" placeholder="e.g. John" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
            </div>

            <div v-else-if="form.headerType && form.headerType !== 'TEXT'">
              <label class="block text-xs font-bold text-slate-500 mb-1">Media Link Example (Required by Meta)</label>
              <input v-model="form.headerExample" type="url" placeholder="https://example.com/sample.png" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              <p class="text-[10px] text-slate-500 mt-1">Provide a sample public URL for the media so Meta can review it.</p>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Message Body</label>
            <textarea v-model="form.body" rows="4" placeholder="Hello {{1}}, your order {{2}} is confirmed." class="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none font-sans"></textarea>
            <p class="text-xs text-slate-500 mt-1">Use {{1}}, {{2}} for variables. You must provide examples if using variables.</p>
          </div>

          <div v-if="form.body.includes('{{1}}')" class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Variable Examples</label>
            <div class="flex gap-2 mb-2" v-for="n in countVariables(form.body)" :key="n">
              <span class="bg-slate-200 px-3 py-2 rounded-lg text-sm font-mono text-slate-600 font-bold" v-text="'{{' + n + '}}'"></span>
              <input v-model="form.bodyVariables[n-1]" type="text" placeholder="Sample value (e.g. John)" class="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">Footer (Optional)</label>
            <input v-model="form.footer" type="text" placeholder="e.g. Thanks for using our service" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
          </div>

          <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <label class="block text-sm font-semibold text-slate-700 m-0">Interactive Buttons (Optional)</label>
              <button @click="addButton" type="button" class="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer">+ Add Button</button>
            </div>
            
            <div v-for="(btn, idx) in form.buttons" :key="idx" class="bg-white p-4 border border-slate-200 rounded-lg mb-3 flex flex-col gap-3 relative shadow-sm">
              <button @click="removeButton(idx)" class="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer text-lg leading-none font-bold">&times;</button>
              
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Button Type</label>
                <select v-model="btn.type" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none">
                  <option value="QUICK_REPLY">Quick Reply (Text Only)</option>
                  <option value="URL">Visit Website (URL)</option>
                  <option value="PHONE_NUMBER">Call Phone Number</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">Button Text</label>
                <input v-model="btn.text" type="text" placeholder="e.g. Yes / Go to Site" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" maxlength="25" />
                <span class="text-[10px] text-slate-400 mt-1 block">Max 25 characters.</span>
              </div>

              <div v-if="btn.type === 'URL'">
                <label class="block text-xs font-bold text-slate-500 mb-1">Website URL</label>
                <input v-model="btn.url" type="url" placeholder="https://example.com" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>

              <div v-if="btn.type === 'PHONE_NUMBER'">
                <label class="block text-xs font-bold text-slate-500 mb-1">Phone Number (with Country Code)</label>
                <input v-model="btn.phoneNumber" type="text" placeholder="+123456789" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none" />
              </div>
            </div>
            <p v-if="!form.buttons.length" class="text-xs text-slate-500 text-center italic m-0 py-2">No buttons added. You can add up to 3 buttons.</p>
          </div>

        </div>
        <div class="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button @click="showCreateModal = false" class="px-6 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-transparent border-none cursor-pointer">Cancel</button>
          <button @click="createTemplate" :disabled="creating" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 border-none cursor-pointer flex items-center gap-2">
            <div v-if="creating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submit to Meta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const metaChannels = ref([])
const selectedChannel = ref('')
const templates = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const creating = ref(false)

const form = ref({
  name: '',
  language: 'en_US',
  category: 'UTILITY',
  headerType: '',
  headerText: '',
  headerExample: '',
  body: '',
  bodyVariables: [],
  footer: '',
  buttons: []
})

const addButton = () => {
  if (form.value.buttons.length >= 3) {
    alert('Maximum 3 buttons allowed per template.');
    return;
  }
  form.value.buttons.push({ type: 'QUICK_REPLY', text: '' });
}

const removeButton = (idx) => {
  form.value.buttons.splice(idx, 1);
}

const fetchMetaChannels = async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/channels', {
      headers: { Authorization: `Bearer ${token}` }
    })
    metaChannels.value = res.data.data || []
    if (metaChannels.value.length === 1) {
      selectedChannel.value = metaChannels.value[0].id
      fetchTemplates()
    }
  } catch (err) {
    console.error('Failed to fetch channels', err)
  }
}

const fetchTemplates = async () => {
  if (!selectedChannel.value) return;
  loading.value = true;
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/meta/channel/${selectedChannel.value}/meta-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    // Meta returns templates in an object { data: [...] }
    templates.value = res.data.data?.data || []
  } catch (err) {
    console.error('Failed to fetch templates', err)
    alert('Failed to load templates from Meta. Please check your token.')
  } finally {
    loading.value = false;
  }
}

const createTemplate = async () => {
  if (!form.value.name || !form.value.body) {
    alert('Name and body are required');
    return;
  }

  // Ensure variables length matches count
  const requiredVarsCount = countVariables(form.value.body);
  const vars = form.value.bodyVariables.slice(0, requiredVarsCount);
  if (requiredVarsCount > 0 && vars.filter(v => v).length !== requiredVarsCount) {
    alert('Please provide example values for all variables.');
    return;
  }

  creating.value = true;
  const token = localStorage.getItem('token')
  try {
    await axios.post(`/api/v1/meta/channel/${selectedChannel.value}/meta-templates`, {
      name: form.value.name,
      language: form.value.language,
      category: form.value.category,
      headerType: form.value.headerType || undefined,
      headerText: form.value.headerType === 'TEXT' ? form.value.headerText : undefined,
      headerExample: form.value.headerExample || undefined,
      body: form.value.body,
      bodyVariables: requiredVarsCount > 0 ? vars : undefined,
      footer: form.value.footer,
      buttons: form.value.buttons.length > 0 ? form.value.buttons : undefined
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    showCreateModal.value = false;
    form.value = { name: '', language: 'en_US', category: 'UTILITY', headerType: '', headerText: '', headerExample: '', body: '', bodyVariables: [], footer: '', buttons: [] };
    fetchTemplates();
    alert('Template submitted successfully! It may take a few minutes for Meta to approve it.');
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Failed to create template');
  } finally {
    creating.value = false;
  }
}

const deleteTemplate = async (name) => {
  if (!confirm(`Are you sure you want to delete template "${name}" from Meta? This action cannot be undone.`)) return;
  
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/meta/channel/${selectedChannel.value}/meta-templates/${name}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchTemplates()
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Failed to delete template')
  }
}

const getTemplateBody = (template) => {
  const bodyComponent = template.components?.find(c => c.type === 'BODY');
  return bodyComponent ? bodyComponent.text : 'No body text';
}

const getStatusClass = (status) => {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

const countVariables = (text) => {
  const matches = text.match(/{{(\d+)}}/g);
  if (!matches) return 0;
  // find highest number
  let max = 0;
  matches.forEach(m => {
    const num = parseInt(m.replace(/[{}]/g, ''));
    if (num > max) max = num;
  });
  return max;
}

watch(() => form.value.body, (newBody) => {
  const count = countVariables(newBody);
  while (form.value.bodyVariables.length < count) {
    form.value.bodyVariables.push('');
  }
})

onMounted(() => {
  fetchMetaChannels()
})
</script>
