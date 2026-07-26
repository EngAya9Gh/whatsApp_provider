<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">WhatsApp Flows</h2>
        <p class="text-slate-500 font-medium text-lg">Build and manage interactive Meta WhatsApp Flows.</p>
      </div>
      <button v-if="activeMetaChannelId" @click="showCreateModal = true" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer">
        + Create Flow
      </button>
    </div>

    <div v-if="!activeMetaChannelId" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
      <div class="text-4xl mb-4">📱</div>
      <h3 class="text-xl font-bold text-slate-700">No Channel Selected</h3>
      <p class="text-slate-500 mt-2">Please select a Meta Cloud channel from the left sidebar to view its Flows.</p>
    </div>

    <div v-else>
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-semibold text-sm mb-6">⚠️ {{ error }}</div>

      <div v-if="loading" class="flex justify-center p-12">
        <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="flows.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div class="text-4xl mb-4">📋</div>
        <h3 class="text-xl font-bold text-slate-700">No Flows Found</h3>
        <p class="text-slate-500 mt-2">Create your first interactive Flow to engage with your customers.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="flow in flows" :key="flow.id" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
          <div class="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
            <div>
              <h3 class="font-bold text-lg text-slate-900">{{ flow.name }}</h3>
              <p class="text-xs text-slate-500 font-mono mt-1">ID: {{ flow.id }}</p>
            </div>
            <span :class="getStatusClass(flow.status)" class="px-2 py-1 rounded text-xs font-bold border uppercase">{{ flow.status }}</span>
          </div>
          
          <div class="p-5 space-y-4">
            <div>
              <div class="text-xs text-slate-500 font-bold mb-1">Categories</div>
              <div class="flex gap-2 flex-wrap">
                <span v-for="cat in flow.categories" :key="cat" class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{{ cat }}</span>
              </div>
            </div>

            <!-- Flow JSON Upload -->
            <div v-if="flow.status !== 'PUBLISHED'">
              <label class="block text-xs font-bold text-slate-500 mb-1">Upload Flow JSON</label>
              <input type="file" accept=".json" @change="e => handleFlowJsonUpload(e, flow.id)" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
            </div>

            <div v-if="flow.validation_errors && flow.validation_errors.length" class="text-xs text-red-600 bg-red-50 p-2 rounded">
              <span class="font-bold block mb-1">Validation Errors:</span>
              <ul class="list-disc pl-4 m-0 space-y-1">
                <li v-for="err in flow.validation_errors" :key="err.error">{{ err.error }}</li>
              </ul>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex justify-between gap-3 bg-slate-50">
            <button @click="deleteFlow(flow.id)" class="text-red-500 hover:text-red-700 text-sm font-bold bg-transparent border-none cursor-pointer p-2">Delete</button>
            <button v-if="flow.status !== 'PUBLISHED'" @click="publishFlow(flow.id)" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border-none cursor-pointer">
              Publish Flow
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 class="text-xl font-bold text-slate-900 m-0">Create New Flow</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none text-2xl cursor-pointer leading-none">&times;</button>
        </div>

        <div class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Flow Name</label>
            <input v-model="form.name" type="text" placeholder="e.g. appointment_booking" class="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" />
            <span class="text-xs text-slate-500 mt-1 block">Use lowercase and underscores only.</span>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Category</label>
            <select v-model="form.category" class="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="SURVEY">Survey / Feedback</option>
              <option value="LEAD_GENERATION">Lead Generation</option>
              <option value="APPOINTMENT_BOOKING">Appointment Booking</option>
              <option value="CUSTOMER_SUPPORT">Customer Support</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div class="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button @click="showCreateModal = false" class="px-5 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-transparent border-none cursor-pointer">Cancel</button>
          <button @click="createFlow" :disabled="creating" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50 border-none cursor-pointer flex items-center gap-2">
            <div v-if="creating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Create Flow
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'

const { activeMetaChannelId, fetchMetaChannels } = useMetaChannel()
const flows = ref([])
const loading = ref(true)
const error = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

const form = ref({
  name: '',
  category: 'SURVEY'
})

const getStatusClass = (status) => {
  switch (status) {
    case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200';
    case 'DRAFT': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'DEPRECATED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

const fetchFlows = async () => {
  if (!activeMetaChannelId.value) return;
  loading.value = true;
  error.value = '';
  const token = localStorage.getItem('token');
  try {
    const res = await axios.get(`/api/v1/meta/channel/${activeMetaChannelId.value}/flows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Meta returns { data: [ flows ] }
    flows.value = res.data.data.data || res.data.data || [];
  } catch (err) {
    console.error(err);
    error.value = err.response?.data?.message || 'Failed to fetch flows';
  } finally {
    loading.value = false;
  }
}

watch(activeMetaChannelId, () => {
  fetchFlows()
}, { immediate: true })

const createFlow = async () => {
  if (!form.value.name) return alert('Flow name required');
  creating.value = true;
  const token = localStorage.getItem('token');
  try {
    await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/flows`, {
      name: form.value.name,
      categories: [form.value.category]
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    showCreateModal.value = false;
    form.value.name = '';
    fetchFlows();
    alert('Flow created successfully!');
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to create flow');
  } finally {
    creating.value = false;
  }
}

const handleFlowJsonUpload = async (e, flowId) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('file', file);
  
  try {
    await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/flows/${flowId}/assets`, fd, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('Flow JSON uploaded successfully! You can now publish the flow.');
    fetchFlows();
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || 'Failed to upload Flow JSON');
  }
}

const publishFlow = async (flowId) => {
  if (!confirm('Are you sure you want to publish this flow? Once published, you cannot edit the JSON.')) return;
  const token = localStorage.getItem('token');
  try {
    await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/flows/${flowId}/publish`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    alert('Flow published successfully!');
    fetchFlows();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to publish flow');
  }
}

const deleteFlow = async (flowId) => {
  if (!confirm('Are you sure you want to delete/deprecate this flow?')) return;
  const token = localStorage.getItem('token');
  try {
    await axios.delete(`/api/v1/meta/channel/${activeMetaChannelId.value}/flows/${flowId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchFlows();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete flow');
  }
}

onMounted(() => {
  fetchMetaChannels();
})
</script>
