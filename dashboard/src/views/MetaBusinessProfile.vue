<template>
  <div class="max-w-6xl mx-auto pb-12 p-6 md:p-8 font-sans text-slate-800">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">ملف الأعمال على واتساب</h1>
      <p class="text-slate-500 font-medium">تحكم في معلومات نشاطك التجاري التي تظهر لعملائك على واتساب.</p>
    </div>

    <!-- Channel Selector -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div class="flex-1">
        <label class="block text-sm font-bold text-slate-700 mb-1">اختر القناة</label>
        <select v-model="selectedChannel" @change="loadProfile" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500">
          <option value="">— اختر قناة Meta Cloud —</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">
            {{ ch.displayPhoneNumber || ch.phoneNumber }} {{ ch.name ? '(' + ch.name + ')' : '' }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="!selectedChannel" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <div class="text-6xl mb-4">📱</div>
      <h3 class="text-xl font-bold text-slate-700 mb-2">اختر قناة أولاً</h3>
      <p class="text-slate-400">اختر قناة Meta Cloud من القائمة أعلاه لعرض وتعديل ملف أعمالها.</p>
    </div>

    <div v-else-if="loading" class="text-center py-20">
      <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-slate-400">جاري تحميل البيانات من Meta...</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Left: Instructions -->
      <div class="bg-gradient-to-b from-emerald-600 to-emerald-800 text-white rounded-2xl p-6 shadow-lg self-start">
        <h2 class="text-lg font-extrabold mb-4 border-b border-emerald-500 pb-3">📋 إرشادات مهمة</h2>
        <ul class="space-y-3 text-sm">
          <li class="flex gap-2">
            <span class="text-emerald-300 font-bold mt-0.5">✓</span>
            <span>صورة البروفايل يجب أن تكون <strong>مربعة JPG أو PNG</strong> بحجم أقصى 5MB.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-emerald-300 font-bold mt-0.5">✓</span>
            <span>نص "عن النشاط" يظهر مباشرة تحت اسمك في واتساب — اجعله موجزاً ومميزاً.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-emerald-300 font-bold mt-0.5">✓</span>
            <span>يمكنك إضافة موقعين إلكترونيين كحد أقصى في حقل المواقع.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-emerald-300 font-bold mt-0.5">✓</span>
            <span>التغييرات تظهر للعملاء فور الحفظ دون الحاجة لموافقة Meta.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-emerald-300 font-bold mt-0.5">✓</span>
            <span>اختر القطاع الصحيح من القائمة — يساعد في ظهور نشاطك في نتائج البحث.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-yellow-300 font-bold mt-0.5">⚠</span>
            <span>تحديث الصورة قد يستغرق بضع دقائق حتى يظهر للعملاء.</span>
          </li>
        </ul>
      </div>

      <!-- Right: Profile Form -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Alerts -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-semibold text-sm">⚠️ {{ error }}</div>
        <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl font-semibold text-sm">✅ {{ success }}</div>

        <!-- Profile Photo -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 class="text-base font-bold text-slate-800 mb-4">📸 صورة البروفايل</h3>
          <div class="flex items-center gap-5">
            <div class="relative">
              <img v-if="profile.profile_picture_url" :src="profile.profile_picture_url" class="w-20 h-20 rounded-full object-cover border-4 border-emerald-100 shadow" />
              <div v-else class="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow">
                {{ (profile.about || '?')[0] }}
              </div>
              <div v-if="uploadingPhoto" class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-1">رفع صورة جديدة</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="handlePhotoUpload" class="w-full text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold hover:file:bg-emerald-100" />
              <p class="text-xs text-slate-400 mt-1">JPG، PNG أو WEBP — الحجم الأقصى 5MB</p>
            </div>
          </div>
        </div>

        <!-- Profile Details Form -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 class="text-base font-bold text-slate-800 mb-2">📝 معلومات النشاط التجاري</h3>

          <!-- About -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">عن النشاط <span class="text-slate-400 font-normal text-xs">(يظهر تحت الاسم — 139 حرف أقصى)</span></label>
            <input v-model="form.about" type="text" maxlength="139" placeholder="مثال: نوفر أفضل خدمات التوصيل السريع..." class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
            <p class="text-xs text-slate-400 mt-1 text-left">{{ form.about?.length || 0 }}/139</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">وصف النشاط <span class="text-slate-400 font-normal text-xs">(512 حرف أقصى)</span></label>
            <textarea v-model="form.description" rows="3" maxlength="512" placeholder="وصف تفصيلي عن خدماتك ومنتجاتك..." class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500 resize-none"></textarea>
            <p class="text-xs text-slate-400 mt-1 text-left">{{ form.description?.length || 0 }}/512</p>
          </div>

          <!-- Email & Address in grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input v-model="form.email" type="email" placeholder="info@yourcompany.com" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">العنوان</label>
              <input v-model="form.address" type="text" placeholder="الرياض، المملكة العربية السعودية" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Website -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">الموقع الإلكتروني <span class="text-slate-400 font-normal text-xs">(يمكنك إضافة موقعين)</span></label>
            <div class="space-y-2">
              <input v-model="form.website1" type="url" placeholder="https://www.yoursite.com" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
              <input v-model="form.website2" type="url" placeholder="رابط ثانٍ (اختياري)" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Vertical / Industry -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">قطاع النشاط</label>
            <select v-model="form.vertical" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-emerald-500">
              <option value="">— اختر القطاع —</option>
              <option value="AUTOMOTIVE">السيارات</option>
              <option value="BEAUTY">التجميل والجمال</option>
              <option value="APPAREL">الملابس والأزياء</option>
              <option value="EDU">التعليم</option>
              <option value="ENTERTAIN">الترفيه</option>
              <option value="EVENT_PLAN">تنظيم الفعاليات</option>
              <option value="FINANCE">المال والتمويل</option>
              <option value="GROCERY">البقالة والمواد الغذائية</option>
              <option value="GOVT">الحكومة والقطاع العام</option>
              <option value="HOTEL">الفنادق والضيافة</option>
              <option value="HEALTH">الصحة والطب</option>
              <option value="NONPROFIT">المنظمات غير الربحية</option>
              <option value="PROF_SERVICES">الخدمات المهنية</option>
              <option value="RETAIL">تجارة التجزئة</option>
              <option value="TRAVEL">السياحة والسفر</option>
              <option value="RESTAURANT">المطاعم والأغذية</option>
              <option value="NOT_A_BIZ">أخرى</option>
            </select>
          </div>

          <!-- Save Button -->
          <div class="pt-2 flex justify-end">
            <button @click="saveProfile" :disabled="saving" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow transition-colors disabled:opacity-50 border-none cursor-pointer flex items-center gap-2">
              <div v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              💾 حفظ التغييرات
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const channels = ref([])
const selectedChannel = ref('')
const loading = ref(false)
const saving = ref(false)
const uploadingPhoto = ref(false)
const error = ref('')
const success = ref('')

const profile = ref({})
const form = ref({
  about: '', description: '', email: '', address: '',
  website1: '', website2: '', vertical: ''
})

const fetchChannels = async () => {
  try {
    const res = await axios.get('/api/v1/meta/channels')
    channels.value = res.data.data || []
    if (channels.value.length === 1) {
      selectedChannel.value = channels.value[0].id
      loadProfile()
    }
  } catch (e) { console.error(e) }
}

const loadProfile = async () => {
  if (!selectedChannel.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`/api/v1/meta/channel/${selectedChannel.value}/profile`)
    const p = res.data.data || {}
    profile.value = p
    form.value = {
      about: p.about || '',
      description: p.description || '',
      email: p.email || '',
      address: p.address || '',
      website1: (p.websites || [])[0] || '',
      website2: (p.websites || [])[1] || '',
      vertical: p.vertical || ''
    }
  } catch (e) {
    error.value = 'تعذّر تحميل البيانات من Meta. تحقق من صحة الـ Access Token.'
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const websites = [form.value.website1, form.value.website2].filter(Boolean)
    await axios.put(`/api/v1/meta/channel/${selectedChannel.value}/profile`, {
      about: form.value.about || undefined,
      description: form.value.description || undefined,
      email: form.value.email || undefined,
      address: form.value.address || undefined,
      websites: websites.length ? websites : undefined,
      vertical: form.value.vertical || undefined
    })
    success.value = 'تم حفظ التغييرات بنجاح! ستظهر للعملاء خلال بضع دقائق.'
    setTimeout(() => { success.value = '' }, 5000)
  } catch (e) {
    error.value = e.response?.data?.message || e.message || 'فشل في الحفظ'
  } finally {
    saving.value = false
  }
}

const handlePhotoUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingPhoto.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('photo', file)
    await axios.post(`/api/v1/meta/channel/${selectedChannel.value}/profile/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    success.value = 'تم رفع الصورة بنجاح! قد تستغرق بضع دقائق حتى تظهر.'
    setTimeout(() => { success.value = '' }, 5000)
    // Reload profile to get new URL
    setTimeout(loadProfile, 3000)
  } catch (e) {
    error.value = e.response?.data?.message || 'فشل في رفع الصورة'
  } finally {
    uploadingPhoto.value = false
  }
}

onMounted(fetchChannels)
</script>
