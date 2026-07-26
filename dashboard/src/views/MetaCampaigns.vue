<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Meta Campaigns</h2>
        <p class="text-slate-500 font-medium text-lg">Send bulk messages using official Meta templates with 100% delivery reliability.</p>
      </div>
      <button @click="openModal" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 border-none cursor-pointer">
        + New Meta Campaign
      </button>
    </div>

    <!-- Campaigns List -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
    </div>
    
    <div v-else-if="campaigns.length === 0" class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
      <div class="text-4xl mb-4">📢</div>
      <h3 class="text-xl font-bold text-slate-700">No Meta Campaigns Found</h3>
      <p class="text-slate-500 mt-2">Start your first official Meta campaign.</p>
    </div>

    <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign</th>
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Messages / Cost</th>
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="campaign in campaigns" :key="campaign.id" class="hover:bg-slate-50 transition-colors">
              <td class="p-4">
                <div class="font-bold text-slate-900 text-sm mb-1">{{ campaign.name }}</div>
              </td>
              <td class="p-4 text-sm text-slate-600">
                {{ new Date(campaign.createdAt).toLocaleDateString() }}
              </td>
              <td class="p-4 text-sm text-slate-600">
                {{ campaign.metaCategory || 'Unknown' }}
              </td>
              <td class="p-4">
                <div class="text-sm font-medium text-slate-700">{{ campaign.totalMessages || 0 }} Messages</div>
                <div class="text-xs font-bold text-orange-600 mt-1">${{ (campaign.totalCost || 0).toFixed(4) }}</div>
              </td>
              <td class="p-4">
                <span :class="getStatusClass(campaign.status)" class="px-2.5 py-1 rounded-full text-xs font-bold border">{{ campaign.status }}</span>
              </td>
              <td class="p-4 text-right">
                <router-link :to="`/campaigns/${campaign.id}`" class="inline-block bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-1.5 px-3 rounded-lg font-bold text-xs transition-colors no-underline">
                  View Details
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages >= 1" class="flex justify-center items-center gap-4 mt-8">
      <button :disabled="page === 1" @click="page--; fetchCampaigns()" class="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors font-bold text-slate-700 bg-white cursor-pointer">&larr; Prev</button>
      <span class="text-slate-600 font-medium">Page <strong class="text-slate-900">{{ page }}</strong> of <strong class="text-slate-900">{{ totalPages }}</strong></span>
      <button :disabled="page === totalPages || totalPages === 0" @click="page++; fetchCampaigns()" class="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors font-bold text-slate-700 bg-white cursor-pointer">Next &rarr;</button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div class="bg-white rounded-2xl w-full max-w-4xl shadow-2xl">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 class="text-xl font-bold text-slate-900 m-0">إنشاء حملة Meta جديدة</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600 bg-transparent border-none text-2xl cursor-pointer leading-none">&times;</button>
        </div>

        <div class="flex flex-col md:flex-row min-h-[400px]">
          <!-- Left: Instructions Panel -->
          <div class="md:w-72 bg-gradient-to-b from-orange-500 to-orange-700 text-white p-6 md:rounded-bl-2xl flex-shrink-0">
            <h4 class="font-extrabold text-base mb-4 border-b border-orange-400 pb-3">📋 إرشادات إرسال الحملة</h4>
            <ul class="space-y-3 text-xs leading-relaxed">
              <li class="flex gap-2">
                <span class="text-orange-200 font-bold">✓</span>
                <span><strong>ملف الأرقام (Excel/CSV):</strong> العمود الأول `A` يجب أن يحتوي على الأرقام بالصيغة الدولية (بدون + أو 00).</span>
              </li>
              <li class="flex gap-2">
                <span class="text-orange-200 font-bold">✓</span>
                <span><strong>المتغيرات الديناميكية:</strong> إذا كان القالب يحتوي على متغيرات `{{1}}`، ضع قيمتها في العمود الثاني `B`، والمتغير `{{2}}` في العمود `C` وهكذا.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-orange-200 font-bold">✓</span>
                <span><strong>القوالب المعتمدة:</strong> يجب اختيار قالب تمت الموافقة عليه (Approved) مسبقاً من Meta.</span>
              </li>
              <li class="flex gap-2">
                <span class="text-yellow-300 font-bold">⚠</span>
                <span><strong>حدود الإرسال:</strong> احرص على عدم تجاوز حد الإرسال اليومي الخاص بحسابك في Meta لتجنب الحظر.</span>
              </li>
            </ul>
          </div>

          <!-- Right: Form -->
          <div class="flex-1 overflow-y-auto flex flex-col">
            <div class="p-6 flex-1 space-y-5">
              
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">اسم الحملة</label>
                <input type="text" v-model="form.name" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="مثال: عروض الصيف 2024" />
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">اختر القالب المعتمد</label>
                <select v-model="form.templateName" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <option value="" disabled>-- اختر قالباً --</option>
                  <option v-for="tpl in metaTemplates" :key="tpl.id" :value="tpl.name">{{ tpl.name }} ({{ tpl.category }})</option>
                </select>
                <div v-if="metaTemplates.length === 0" class="text-xs text-orange-500 mt-1">لم يتم العثور على قوالب معتمدة. انتقل لصفحة قوالب Meta لإنشائها.</div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">رفع ملف الأرقام (Excel/CSV)</label>
                <input type="file" @change="handleFileUpload" accept=".csv, .xlsx, .xls" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>

            </div>

            <!-- Footer Actions -->
            <div class="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 sticky bottom-0 md:rounded-br-2xl">
              <button @click="closeModal" class="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-transparent border-none cursor-pointer">إلغاء</button>
              <button @click="createCampaign" :disabled="isSubmitting" class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold border-none cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-2">
                <div v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                بدء الإرسال
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'

const { activeMetaChannelId } = useMetaChannel()
const campaigns = ref([])
const metaTemplates = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const page = ref(1)
const totalPages = ref(1)

const form = ref({
  name: '',
  templateName: '',
  file: null
})

const fetchCampaigns = async () => {
  loading.value = true;
  const token = localStorage.getItem('token')
  try {
    // Optionally filter campaigns by activeMetaChannelId if backend supports it
    let url = `/api/v1/campaigns?page=${page.value}&campaignType=META`
    if (activeMetaChannelId.value) {
      url += `&channelId=${activeMetaChannelId.value}`
    }
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    campaigns.value = res.data.data
    if (res.data.meta) {
      totalPages.value = res.data.meta.totalPages || 1
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false;
  }
}

watch(activeMetaChannelId, () => {
  fetchCampaigns()
  if (showCreateModal.value) {
    fetchTemplates()
  }
})

const fetchTemplates = async () => {
  if (!activeMetaChannelId.value) return;
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    metaTemplates.value = (res.data.data?.data || []).filter(t => t.status === 'APPROVED')
  } catch (err) {
    console.error('Failed to fetch meta templates', err)
  }
}

const handleFileUpload = (event) => {
  form.value.file = event.target.files[0]
}

const getStatusClass = (status) => {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'RUNNING') return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

const openModal = () => {
  if (!activeMetaChannelId.value) {
    alert('Please select a Meta channel from the sidebar first.')
    return
  }
  showCreateModal.value = true
  fetchTemplates()
}

const closeModal = () => {
  showCreateModal.value = false
  form.value = { name: '', templateName: '', file: null }
}

const createCampaign = async () => {
  if (!form.value.name || !form.value.templateName || !form.value.file) {
    alert('Please fill all fields and upload an Excel/CSV file.')
    return
  }
  
  if (!activeMetaChannelId.value) {
    alert('Please select a Meta channel from the sidebar first.')
    return
  }
  
  isSubmitting.value = true
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('name', form.value.name)
  formData.append('campaignType', 'META')
  formData.append('templateName', form.value.templateName)
  formData.append('channelId', activeMetaChannelId.value) // Pass the selected channel
  
  const tpl = metaTemplates.value.find(t => t.name === form.value.templateName)
  if (tpl) {
    formData.append('metaCategory', tpl.category)
  }
  
  formData.append('file', form.value.file)

  try {
    const res = await axios.post('/api/v1/campaigns', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // Automatically start it
    await axios.post(`/api/v1/campaigns/${res.data.campaignId}/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    alert('Meta Campaign created and started successfully!')
    closeModal()
    fetchCampaigns()
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to create campaign')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchCampaigns()
})
</script>
