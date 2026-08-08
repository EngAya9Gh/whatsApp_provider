<template>
  <div class="meta-tpl-root">
    
    <!-- ══ Hero Header ══ -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <circle cx="10" cy="13" r="2"/><line x1="10" y1="17" x2="14" y2="17"/>
            </svg>
          </div>
          <div>
            <div class="hero-title-row">
              <h1 class="hero-title">{{ isAr ? 'قوالب ميتا' : 'Meta Templates' }}</h1>
              <div class="hero-stats-inline" v-if="templates.length > 0">
                <span class="hstat-chip">{{ templates.length }} {{ isAr ? 'قالب' : 'total' }}</span>
                <span class="hstat-chip approved">{{ templates.filter(t => t.status === 'APPROVED').length }} {{ isAr ? 'معتمد' : 'approved' }}</span>
                <span class="hstat-chip pending" v-if="templates.filter(t => t.status === 'PENDING' || t.status === 'IN_APPEAL').length > 0">{{ templates.filter(t => t.status === 'PENDING' || t.status === 'IN_APPEAL').length }} {{ isAr ? 'قيد المراجعة' : 'pending' }}</span>
              </div>
            </div>
            <p class="hero-sub">{{ isAr ? 'إدارة قوالب رسائل الواتساب الرسمية مع ميتا' : 'Manage official WhatsApp message templates with Meta' }}</p>
          </div>
        </div>
        
        <div class="hero-actions" v-if="activeMetaChannelId">
          <button @click="fetchTemplates" :disabled="loading" class="btn-refresh" :title="isAr ? 'تحديث من ميتا' : 'Sync from Meta'">
            <svg :class="loading ? 'spin-icon' : ''" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {{ isAr ? 'تحديث' : 'Sync' }}
          </button>
          <button @click="showLibraryModal = true" class="btn-secondary">
            📚 {{ isAr ? 'مكتبة القوالب' : 'Template Library' }}
          </button>
          <button @click="showCreateModal = true" class="btn-create">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ isAr ? 'إنشاء قالب' : 'Create Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Alerts / Main Content ══ -->
    <div class="page-content">
      <transition name="slide-fade">
        <div v-if="error" class="tpl-alert error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>
      </transition>
      <transition name="slide-fade">
        <div v-if="successMsg" class="tpl-alert success">
          {{ successMsg }}
        </div>
      </transition>

      <!-- No Channel -->
      <div v-if="!activeMetaChannelId" class="state-empty">
        <div class="empty-art">📱</div>
        <h3>No Channel Selected</h3>
        <p>Please select a Meta Cloud channel from the left sidebar to view its templates.</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="state-center">
        <div class="spin-ring"></div>
        <span>Loading templates from Meta...</span>
      </div>

      <!-- Empty Templates -->
      <div v-else-if="templates.length === 0" class="state-empty">
        <div class="empty-art">📝</div>
        <h3>No Templates Found</h3>
        <p>You don't have any templates approved by Meta yet.</p>
        <button @click="showCreateModal = true" class="btn-create" style="margin-top:1.5rem">
          Create Your First Template
        </button>
      </div>

      <!-- Templates Grid -->
      <div v-else class="cards-grid">
        <div v-for="template in templates" :key="template.id" class="tpl-card">
          <div :class="['card-accent', getStatusAccent(template.status)]"></div>
          
          <div class="card-head">
            <div class="tpl-title-block">
              <h3 class="tpl-name">{{ template.name }}</h3>
              <div class="tpl-badges">
                <span class="badge">{{ template.language }}</span>
                <span class="badge">{{ template.category }}</span>
              </div>
            </div>
            <span :class="['status-pill', getStatusPill(template.status)]">{{ template.status }}</span>
          </div>

          <!-- Preview Body -->
          <div class="wa-preview-wrap">
            <div class="wa-phone-bar">
              <span class="wa-dot"></span><span class="wa-dot"></span><span class="wa-dot"></span>
              <span class="wa-bar-label">Body Text Preview</span>
            </div>
            <div class="wa-preview-body">
              <div class="wa-bubble">
                <p class="wa-text">{{ getTemplateBody(template) }}</p>
                <div class="wa-time">Meta Template</div>
              </div>
            </div>
          </div>

          <div v-if="template.rejected_reason" class="reject-box">
            <strong>Rejection Reason:</strong> {{ template.rejected_reason }}
          </div>

          <div class="card-footer">
            <div class="card-footer-left">
              <span v-if="template.status === 'PENDING' || template.status === 'IN_APPEAL'" class="pending-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ isAr ? 'قيد مراجعة ميتا...' : 'Under Meta review...' }}
              </span>
            </div>
            <button @click="deleteTemplate(template.name)" class="btn-delete" :title="isAr ? 'حذف من ميتا' : 'Delete from Meta'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              {{ isAr ? 'حذف' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Library Modal ══ -->
    <transition name="fade">
      <div v-if="showLibraryModal" class="modal-overlay">
        <div class="modal-lg">
          <div class="modal-header bg-grad">
            <h3>📚 مكتبة القوالب (Template Library)</h3>
            <button @click="showLibraryModal = false" class="btn-close">&times;</button>
          </div>
          
          <div class="modal-body-split">
            <!-- Sidebar filter -->
            <div class="lib-sidebar">
              <h4>الفئات</h4>
              <button @click="libraryFilter = 'ALL'" :class="['lib-filter-btn', libraryFilter === 'ALL' ? 'active' : '']">الكل (All)</button>
              <button @click="libraryFilter = 'UTILITY'" :class="['lib-filter-btn', libraryFilter === 'UTILITY' ? 'active' : '']">🔔 Utility</button>
              <button @click="libraryFilter = 'MARKETING'" :class="['lib-filter-btn', libraryFilter === 'MARKETING' ? 'active' : '']">📢 Marketing</button>
              <button @click="libraryFilter = 'AUTHENTICATION'" :class="['lib-filter-btn', libraryFilter === 'AUTHENTICATION' ? 'active' : '']">🔐 Auth</button>
            </div>
            
            <!-- Library Grid -->
            <div class="lib-grid-wrap">
              <div class="lib-grid">
                <div v-for="tpl in filteredLibrary" :key="tpl.id" class="lib-card" @click="selectLibraryTemplate(tpl)">
                  
                  <!-- Visual Header based on category -->
                  <div class="lib-card-hero" :class="'cat-' + tpl.formState.category.toLowerCase()">
                    <span class="lib-badge">{{ tpl.formState.category }}</span>
                    <div class="lib-icon">{{ tpl.formState.category === 'MARKETING' ? '📢' : tpl.formState.category === 'AUTHENTICATION' ? '🔐' : '🔔' }}</div>
                  </div>
                  
                  <div class="lib-card-body">
                    <h4 class="lib-title">{{ tpl.title }}</h4>
                    <p class="lib-desc">{{ tpl.description }}</p>
                    
                    <!-- WhatsApp Preview Mini -->
                    <div class="lib-wa-preview">
                      <div class="lib-wa-top-bar"></div>
                      <div v-if="tpl.formState.headerType === 'IMAGE'" class="lib-wa-img-mock">🖼️ Image Header</div>
                      <p class="lib-wa-txt">{{ tpl.formState.bodyText }}</p>
                      
                      <div class="lib-wa-btns" v-if="tpl.formState.buttons && tpl.formState.buttons.length">
                        <div v-for="(btn, i) in tpl.formState.buttons" :key="i" class="lib-wa-btn-mock">{{ btn.text }}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="lib-card-footer">
                    <span>استخدام هذا القالب &rarr;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══ Create Modal ══ -->
    <transition name="fade">
      <div v-if="showCreateModal" class="modal-overlay">
        <div class="modal-lg">
          <div class="modal-header">
            <h3>✨ إنشاء قالب رسالة Meta</h3>
            <button @click="showCreateModal = false" class="btn-close">&times;</button>
          </div>

          <div class="modal-body-split">
            <!-- Left: Instructions -->
            <div class="create-sidebar">
              <h4>📋 إرشادات إنشاء القالب</h4>
              <ul>
                <li><span class="chk">✓</span> <strong>اسم القالب:</strong> أحرف صغيرة وشرطات. مثال: <code>order_confirm</code></li>
                <li><span class="chk">✓</span> <strong>الفئة:</strong> اختر التسويق، التنبيهات، أو المصادقة.</li>
                <li><span class="chk">✓</span> <strong>الرأس:</strong> اختياري (نص، صورة، فيديو).</li>
                <li><span class="chk">✓</span> <strong>المتغيرات:</strong> استخدم <code>{{1}}</code> للنصوص الديناميكية.</li>
                <li><span class="chk">✓</span> <strong>الأزرار:</strong> رد سريع، رابط، أو اتصال.</li>
                <li class="warn"><span class="wrn">⚠</span> القالب يُرسل لـ Meta وقد يستغرق 24 ساعة للاعتماد.</li>
              </ul>
            </div>

            <!-- Right: Form -->
            <div class="create-form-wrap">
              <!-- Name & Language -->
              <div class="form-row grid-2">
                <div class="form-group">
                  <label>Template Name</label>
                  <input v-model="form.name" type="text" placeholder="e.g. order_confirmation" class="input-mono" />
                </div>
                <div class="form-group">
                  <label>Language</label>
                  <select v-model="form.language" class="input-std">
                    <option value="en_US">English (US)</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>

              <!-- Category -->
              <div class="form-group">
                <label>Category</label>
                <div class="cat-select-grid">
                  <label :class="['cat-box', form.category === 'MARKETING' ? 'active' : '']">
                    <input type="radio" v-model="form.category" value="MARKETING" class="hidden" />
                    <span class="cat-icon">📢</span><span class="cat-name">Marketing</span>
                  </label>
                  <label :class="['cat-box', form.category === 'UTILITY' ? 'active' : '']">
                    <input type="radio" v-model="form.category" value="UTILITY" class="hidden" />
                    <span class="cat-icon">🔔</span><span class="cat-name">Utility</span>
                  </label>
                  <label :class="['cat-box', form.category === 'AUTHENTICATION' ? 'active' : '']">
                    <input type="radio" v-model="form.category" value="AUTHENTICATION" class="hidden" />
                    <span class="cat-icon">🔐</span><span class="cat-name">Auth</span>
                  </label>
                </div>
              </div>

              <!-- Header -->
              <div class="form-section">
                <label>Header (Optional)</label>
                <select v-model="form.headerType" class="input-std mb-3">
                  <option value="">None</option>
                  <option value="TEXT">Text</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>

                <div v-if="form.headerType === 'TEXT'" class="sub-form">
                  <label class="sub-label">Header Text</label>
                  <input v-model="form.headerText" type="text" placeholder="e.g. Welcome {{1}}" class="input-std mb-2" maxlength="60" />
                  <div v-if="form.headerText.includes('{{1}}')">
                    <label class="sub-label">Example for {{1}}</label>
                    <input v-model="form.headerExample" type="text" placeholder="e.g. John" class="input-std" />
                  </div>
                </div>

                <div v-else-if="form.headerType && form.headerType !== 'TEXT'" class="sub-form">
                  <div class="tabs-sm mb-3">
                    <button type="button" @click="headerInputMode = 'upload'" :class="['tab-sm', headerInputMode === 'upload' ? 'active' : '']">📤 Upload File</button>
                    <button type="button" @click="headerInputMode = 'url'" :class="['tab-sm', headerInputMode === 'url' ? 'active' : '']">🔗 Public URL</button>
                  </div>

                  <div v-if="headerInputMode === 'upload'">
                    <label class="sub-label">Upload File to Meta Servers</label>
                    <input type="file" @change="handleHeaderFileChange" :accept="form.headerType === 'IMAGE' ? 'image/*' : form.headerType === 'VIDEO' ? 'video/mp4,video/3gpp' : 'application/pdf'" class="input-std" />
                    <div v-if="uploadingHeader" class="status-msg loading">Uploading to Meta...</div>
                    <div v-if="form.headerMediaId" class="status-msg success">✅ Uploaded! ID: {{ form.headerMediaId }}</div>
                  </div>
                  <div v-else>
                    <label class="sub-label">Public Media URL</label>
                    <input v-model="form.headerExample" type="url" placeholder="https://example.com/sample.png" class="input-std" />
                  </div>
                </div>
              </div>

              <!-- Body -->
              <div class="form-group">
                <label>Message Body</label>
                <textarea v-model="form.body" rows="4" placeholder="Hello {{1}}, your order {{2}} is confirmed." class="input-std resize-none"></textarea>
                <p class="form-hint">Use {{1}}, {{2}} for variables.</p>
              </div>

              <!-- Variables Example -->
              <div v-if="form.body.includes('{{1}}')" class="form-section">
                <label>Variable Examples (Required)</label>
                <div class="flex gap-2 mb-2" v-for="n in countVariables(form.body)" :key="n">
                  <span class="var-badge" v-text="'{{' + n + '}}'"></span>
                  <input v-model="form.bodyVariables[n-1]" type="text" placeholder="Sample value" class="input-std flex-1" />
                </div>
              </div>

              <!-- Footer -->
              <div class="form-group">
                <label>Footer (Optional)</label>
                <input v-model="form.footer" type="text" placeholder="e.g. Thanks for using our service" class="input-std" />
              </div>

              <!-- Buttons -->
              <div class="form-section">
                <div class="flex justify-between items-center mb-3">
                  <label class="m-0">Interactive Buttons (Optional)</label>
                  <button @click="addButton" type="button" class="btn-sm">+ Add Button</button>
                </div>
                
                <div v-for="(btn, idx) in form.buttons" :key="idx" class="btn-builder-card">
                  <button @click="removeButton(idx)" class="btn-remove-sm">&times;</button>
                  <div class="form-group-sm">
                    <label class="sub-label">Button Type</label>
                    <select v-model="btn.type" class="input-std sm">
                      <option value="QUICK_REPLY">Quick Reply</option>
                      <option value="URL">Visit Website (URL)</option>
                      <option value="PHONE_NUMBER">Call Phone Number</option>
                    </select>
                  </div>
                  <div class="form-group-sm">
                    <label class="sub-label">Button Text</label>
                    <input v-model="btn.text" type="text" placeholder="e.g. Yes" class="input-std sm" maxlength="25" />
                  </div>
                  <div class="form-group-sm" v-if="btn.type === 'URL'">
                    <label class="sub-label">Website URL</label>
                    <input v-model="btn.url" type="url" placeholder="https://example.com" class="input-std sm" />
                  </div>
                  <div class="form-group-sm" v-if="btn.type === 'PHONE_NUMBER'">
                    <label class="sub-label">Phone Number (+ Code)</label>
                    <input v-model="btn.phoneNumber" type="text" placeholder="+123456789" class="input-std sm" />
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Modal Footer -->
          <div class="modal-footer">
            <button @click="showCreateModal = false" class="btn-ghost">إلغاء</button>
            <button @click="submitTemplate" :disabled="creating" class="btn-create">
              <span v-if="creating" class="spinner-sm"></span>
              إرسال إلى Meta للمراجعة
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'
import { metaTemplateLibrary } from '../data/metaTemplateLibrary'

const { metaChannels, activeMetaChannelId, fetchMetaChannels } = useMetaChannel()

const showLibraryModal = ref(false)
const libraryFilter = ref('ALL')
const filteredLibrary = computed(() => {
  if (libraryFilter.value === 'ALL') return metaTemplateLibrary;
  return metaTemplateLibrary.filter(t => t.category === libraryFilter.value);
})

const selectLibraryTemplate = (tpl) => {
  form.value = {
    name: tpl.formState.name,
    language: tpl.formState.language,
    category: tpl.formState.category,
    headerType: tpl.formState.headerType || '',
    headerText: tpl.formState.headerText || '',
    headerExample: '',
    headerMediaId: '',
    body: tpl.formState.bodyText,
    bodyVariables: [...(tpl.formState.bodyExamples || [])],
    footer: tpl.formState.footerText || '',
    buttons: tpl.formState.buttons ? JSON.parse(JSON.stringify(tpl.formState.buttons)) : []
  }
  showLibraryModal.value = false
  showCreateModal.value = true
}

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const templates = ref([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const error = ref('')
const successMsg = ref('')

const form = ref({
  name: '',
  language: 'en_US',
  category: 'UTILITY',
  headerType: '',
  headerText: '',
  headerExample: '',
  headerMediaId: '',
  body: '',
  bodyVariables: [],
  footer: '',
  buttons: []
})

const headerInputMode = ref('upload') 
const uploadingHeader = ref(false)

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

const handleHeaderFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !activeMetaChannelId.value) return;
  uploadingHeader.value = true;
  form.value.headerMediaId = '';
  const token = localStorage.getItem('token');
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/upload-media`, fd, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    });
    form.value.headerMediaId = res.data.mediaId;
    form.value.headerExample = res.data.mediaId; 
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to upload file to Meta');
  } finally {
    uploadingHeader.value = false;
  }
}

const fetchTemplates = async () => {
  if (!activeMetaChannelId.value) {
    templates.value = [];
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    })
    const rawData = res.data.data?.data || res.data.data || []
    templates.value = Array.isArray(rawData) ? rawData : []
  } catch (err) {
    console.error('Failed to fetch templates', err)
    error.value = err.response?.data?.message || 'Failed to load templates from Meta.';
    templates.value = []
  } finally {
    loading.value = false
  }
}

watch(activeMetaChannelId, () => {
  fetchTemplates()
}, { immediate: true })

const countVariables = (text) => {
  const matches = text.match(/\{\{(\d+)\}\}/g)
  if (!matches) return 0
  const numbers = matches.map(m => parseInt(m.replace(/[^0-9]/g, '')))
  return Math.max(...numbers)
}

const submitTemplate = async () => {
  if (!activeMetaChannelId.value) return;
  if (!form.value.name || !form.value.body) return alert('Name and body are required')
  
  creating.value = true
  const token = localStorage.getItem('token')
  try {
    await axios.post(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates`, {
      name: form.value.name,
      language: form.value.language,
      category: form.value.category,
      headerType: form.value.headerType || undefined,
      headerText: form.value.headerType === 'TEXT' ? form.value.headerText : undefined,
      headerExample: form.value.headerType ? form.value.headerExample : undefined,
      headerMediaId: (form.value.headerType !== 'TEXT' && headerInputMode.value === 'upload') ? form.value.headerMediaId : undefined,
      body: form.value.body,
      bodyVariables: form.value.bodyVariables.filter(Boolean),
      footer: form.value.footer || undefined,
      buttons: form.value.buttons.length > 0 ? form.value.buttons : undefined
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    showCreateModal.value = false
    form.value = {
      name: '', language: 'en_US', category: 'UTILITY',
      headerType: '', headerText: '', headerExample: '', headerMediaId: '',
      body: '', bodyVariables: [], footer: '', buttons: []
    }
    fetchTemplates()
    successMsg.value = isAr.value
      ? '✅ تم إرسال القالب إلى ميتا بنجاح! سيظهر بحالة "قيد المراجعة" حتى تعتمده ميتا (قد يستغرق ذلك دقائق أو ساعات). اضغط زر تحديث لمزامنة الحالة.'
      : '✅ Template submitted to Meta! It will appear as "PENDING" until Meta reviews and approves it. This may take minutes to hours. Use the Sync button to refresh statuses.'
    setTimeout(() => { successMsg.value = '' }, 12000)
  } catch (err) {
    console.error(err)
    const msg = err.response?.data?.message
      || err.response?.data?.error
      || err.response?.data?.meta_error?.message
      || err.message
      || 'Failed to submit template to Meta'
    error.value = msg
    setTimeout(() => { error.value = '' }, 10000)
  } finally {
    creating.value = false
  }
}

const deleteTemplate = async (name) => {
  if (!confirm(`Are you sure you want to delete template "${name}" from Meta? This action cannot be undone.`)) return;
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`/api/v1/meta/channel/${activeMetaChannelId.value}/meta-templates/${name}`, {
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

const getStatusAccent = (status) => {
  if (status === 'APPROVED') return 'accent-green'
  if (status === 'PENDING' || status === 'IN_APPEAL') return 'accent-orange'
  if (status === 'REJECTED') return 'accent-red'
  return 'accent-slate'
}

const getStatusPill = (status) => {
  if (status === 'APPROVED') return 'pill-green'
  if (status === 'PENDING' || status === 'IN_APPEAL') return 'pill-orange'
  if (status === 'REJECTED') return 'pill-red'
  return 'pill-slate'
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.meta-tpl-root {
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  padding-bottom: 4rem;
}

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%);
  padding: 1.75rem 2.5rem;
  position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 80% at 90% 50%, rgba(16,185,129,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.hero-content {
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
  position: relative; z-index: 1; flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 1rem; }
.hero-icon-wrap {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #10B981, #059669);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 6px 18px rgba(16,185,129,0.3);
}
.hero-title-row { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; margin-bottom: 0.2rem; }
.hero-title { font-size: 1.5rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.02em; }
.hero-sub { font-size: 0.82rem; color: #64748B; margin: 0; font-weight: 500; }
.hero-actions { display: flex; gap: 0.75rem; align-items: center; }

/* Inline chip stats */
.hero-stats-inline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hstat-chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.72rem; font-weight: 700;
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.15);
}
.hstat-chip.approved { background: rgba(16,185,129,0.15); color: #34D399; border-color: rgba(16,185,129,0.2); }
.hstat-chip.pending  { background: rgba(245,158,11,0.15); color: #FBBF24; border-color: rgba(245,158,11,0.2); }

/* Refresh button */
.btn-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.18);
  padding: 0.65rem 1.1rem; border-radius: 12px;
  font-weight: 700; font-size: 0.82rem; cursor: pointer;
  transition: all 0.2s; backdrop-filter: blur(8px); font-family: inherit;
}
.btn-refresh:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-create {
  display: inline-flex; align-items: center; gap: 7px;
  background: linear-gradient(135deg, #10B981, #059669); color: white;
  padding: 0.65rem 1.25rem; border: none; border-radius: 12px;
  font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: all 0.25s;
  box-shadow: 0 4px 14px rgba(16,185,129,0.3); font-family: inherit;
}
.btn-create:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(16,185,129,0.4); }
.btn-create:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2);
  padding: 0.65rem 1.1rem; border-radius: 12px; font-weight: 700; font-size: 0.82rem;
  cursor: pointer; transition: all 0.25s; backdrop-filter: blur(8px); font-family: inherit;
}
.btn-secondary:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }

/* ═══ MAIN ═══ */
.page-content { padding: 2rem 2.5rem; }

.state-center, .state-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; }
.state-empty { background: white; border-radius: 24px; border: 2px dashed #E2E8F0; }
.empty-art { font-size: 4rem; margin-bottom: 1rem; opacity: 0.8; }
.state-empty h3 { font-size: 1.5rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; }
.state-empty p { color: #64748B; font-size: 0.95rem; margin: 0; font-weight: 500; }
.spin-ring { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #10B981; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ CARDS ═══ */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.tpl-card { background: white; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s; position: relative; }
.tpl-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
.card-accent { position: absolute; top: 0; left: 0; right: 0; height: 4px; }
.accent-green { background: #10B981; }
.accent-orange { background: #F59E0B; }
.accent-red { background: #EF4444; }
.accent-slate { background: #94A3B8; }

.card-head { padding: 1.5rem; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.tpl-title-block { flex: 1; min-width: 0; }
.tpl-name { font-size: 1.1rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tpl-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; font-weight: 700; color: #475569; background: #F1F5F9; padding: 3px 8px; border-radius: 6px; }

.status-pill { font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; }
.pill-green { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
.pill-orange { background: #FFFBEB; color: #D97706; border-color: #FDE68A; }
.pill-red { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
.pill-slate { background: #F8FAFC; color: #475569; border-color: #E2E8F0; }

/* ═══ WA PREVIEW ═══ */
.wa-preview-wrap { background: #F8FAFC; flex: 1; display: flex; flex-direction: column; border-bottom: 1px solid #F1F5F9; }
.wa-phone-bar { display: flex; align-items: center; gap: 5px; padding: 0.75rem 1rem; background: #E2E8F0; border-bottom: 1px solid #CBD5E1; }
.wa-dot { width: 8px; height: 8px; border-radius: 50%; background: #94A3B8; }
.wa-bar-label { margin-left: auto; font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase; }
.wa-preview-body { padding: 1.25rem; background: #efeae2; display: flex; flex-direction: column; flex: 1; }
.wa-bubble { background: white; padding: 0.75rem; border-radius: 10px 10px 10px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.1); position: relative; max-width: 90%; }
.wa-bubble::before { content: ''; position: absolute; left: -8px; top: 0; width: 0; height: 0; border-style: solid; border-width: 0 8px 10px 0; border-color: transparent white transparent transparent; }
.wa-text { font-size: 0.85rem; color: #111B21; line-height: 1.5; margin: 0; white-space: pre-wrap; font-family: -apple-system, sans-serif; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.wa-time { font-size: 0.65rem; color: #667781; text-align: right; margin-top: 5px; display: flex; justify-content: flex-end; align-items: center; gap: 3px; font-weight: 500; }

.reject-box { background: #FEF2F2; border-top: 1px solid #FECACA; border-bottom: 1px solid #FECACA; padding: 0.75rem 1.5rem; font-size: 0.75rem; color: #DC2626; line-height: 1.4; }
.reject-box strong { font-weight: 800; display: block; margin-bottom: 0.2rem; }
.card-footer { padding: 1rem 1.5rem; display: flex; justify-content: flex-end; }
.btn-delete { display: flex; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 700; color: #EF4444; background: #FEF2F2; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.btn-delete:hover { background: #FEE2E2; }

/* ═══ MODALS ═══ */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.modal-lg { background: white; border-radius: 24px; width: 100%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
.modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; }
.modal-header.bg-grad { background: linear-gradient(to right, #0F172A, #1E293B); border-bottom: none; }
.modal-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0; color: #0F172A; }
.modal-header.bg-grad h3 { color: white; }
.btn-close { background: transparent; border: none; font-size: 2rem; color: #64748B; cursor: pointer; line-height: 0.5; transition: color 0.2s; }
.btn-close:hover { color: #0F172A; }
.modal-header.bg-grad .btn-close { color: rgba(255,255,255,0.5); }
.modal-header.bg-grad .btn-close:hover { color: white; }
.modal-body-split { display: flex; flex: 1; overflow: hidden; }

/* Library Modal Specifics */
.lib-sidebar { width: 200px; background: #F8FAFC; border-right: 1px solid #E2E8F0; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
.lib-sidebar h4 { font-size: 0.8rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem; }
.lib-filter-btn { background: transparent; border: none; padding: 0.75rem 1rem; text-align: left; border-radius: 10px; font-size: 0.85rem; font-weight: 700; color: #64748B; cursor: pointer; transition: all 0.2s; }
.lib-filter-btn:hover { background: #F1F5F9; color: #0F172A; }
.lib-filter-btn.active { background: #10B981; color: white; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }

.lib-grid-wrap { flex: 1; padding: 2rem; overflow-y: auto; background: #F1F5F9; }
.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
.lib-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: all 0.3s; cursor: pointer; display: flex; flex-direction: column; }
.lib-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.08); border-color: #CBD5E1; }
.lib-card-hero { height: 100px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
.cat-marketing { background: linear-gradient(135deg, #6366F1, #8B5CF6); }
.cat-authentication { background: linear-gradient(135deg, #334155, #0F172A); }
.cat-utility { background: linear-gradient(135deg, #10B981, #059669); }
.lib-badge { background: rgba(255,255,255,0.2); color: white; backdrop-filter: blur(4px); font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.1); }
.lib-icon { width: 40px; height: 40px; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(255,255,255,0.1); }
.lib-card-body { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; background: white; border-radius: 20px 20px 0 0; margin-top: -15px; position: relative; }
.lib-title { font-size: 1.1rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem; line-height: 1.2; }
.lib-desc { font-size: 0.8rem; color: #64748B; line-height: 1.5; margin: 0 0 1rem; }
.lib-wa-preview { background: #efeae2; border-radius: 12px; padding: 1rem; flex: 1; display: flex; flex-direction: column; border: 1px solid #E2E8F0; }
.lib-wa-top-bar { height: 4px; background: #10B981; border-radius: 2px; margin-bottom: 0.75rem; }
.lib-wa-img-mock { background: #CBD5E1; color: white; font-size: 0.7rem; font-weight: 700; padding: 2rem 0; text-align: center; border-radius: 6px; margin-bottom: 0.75rem; }
.lib-wa-txt { font-size: 0.75rem; color: #111B21; mragin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.lib-wa-btns { margin-top: 0.75rem; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
.lib-wa-btn-mock { background: white; color: #00a884; font-size: 0.7rem; font-weight: 800; text-align: center; padding: 0.4rem; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.lib-card-footer { padding: 1rem 1.5rem; background: #FFFFFF; color: white; text-align: center; font-size: 0.85rem; font-weight: 700; transition: background 0.2s; }
.lib-card:hover .lib-card-footer { background: #10B981; }

/* Create Modal Specifics */
.create-sidebar { width: 280px; background: linear-gradient(180deg, #064e3b 0%, #022c22 100%); color: white; padding: 2rem; display: flex; flex-direction: column; flex-shrink: 0; }
.create-sidebar h4 { font-size: 1rem; font-weight: 800; margin: 0 0 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.create-sidebar ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; font-size: 0.8rem; line-height: 1.5; color: #D1D5DB; }
.create-sidebar li { display: flex; gap: 0.75rem; }
.create-sidebar .chk { color: #10B981; font-weight: 900; }
.create-sidebar .wrn { color: #F59E0B; font-weight: 900; }
.create-sidebar .warn { color: #FDE68A; }
.create-sidebar code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: white; font-family: monospace; font-size: 0.75rem; }

.create-form-wrap { flex: 1; padding: 2rem; overflow-y: auto; background: #F8FAFC; display: flex; flex-direction: column; gap: 1.5rem; }
.form-row { display: grid; gap: 1.5rem; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; font-weight: 700; color: #334155; }
.input-std, .input-mono { width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #CBD5E1; border-radius: 12px; font-size: 0.9rem; font-family: inherit; color: #0F172A; background: white; outline: none; transition: all 0.2s; box-sizing: border-box; }
.input-mono { font-family: monospace; font-size: 0.85rem; }
.input-std:focus, .input-mono:focus { border-color: #10B981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.input-std.sm { padding: 0.6rem 0.8rem; font-size: 0.85rem; border-radius: 8px; }

.cat-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.cat-box { background: white; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.cat-box.active { border-color: #10B981; background: #ECFDF5; box-shadow: 0 4px 12px rgba(16,185,129,0.1); }
.cat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
.cat-name { font-size: 0.8rem; font-weight: 700; color: #334155; }
.cat-box.active .cat-name { color: #059669; }

.form-section { background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.form-section > label { display: block; font-size: 0.9rem; font-weight: 800; color: #0F172A; margin-bottom: 1rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem; }
.sub-form { background: #F8FAFC; padding: 1rem; border-radius: 12px; border: 1px solid #F1F5F9; }
.sub-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748B; margin-bottom: 0.5rem; }

.tabs-sm { display: flex; gap: 0.5rem; }
.tab-sm { flex: 1; background: white; border: 1px solid #CBD5E1; padding: 0.6rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #64748B; cursor: pointer; transition: all 0.2s; }
.tab-sm.active { background: #10B981; border-color: #10B981; color: white; }

.form-hint { font-size: 0.75rem; color: #64748B; font-weight: 500; margin: 0; }
.var-badge { background: #E2E8F0; color: #334155; padding: 0 0.75rem; border-radius: 8px; font-family: monospace; font-weight: 800; display: flex; align-items: center; justify-content: center; }

.tpl-alert { display: flex; align-items: flex-start; gap: 10px; padding: 1rem 1.25rem; border-radius: 14px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1.5rem; line-height: 1.5; }
.tpl-alert.error   { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
.tpl-alert.success { background: #F0FDF4; color: #15803D; border: 1px solid #DCFCE7; }

.card-footer { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-top: 1px solid #F1F5F9; gap: 1rem; }
.card-footer-left { flex: 1; }
.pending-hint { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #D97706; font-weight: 600; }
.pending-hint svg { flex-shrink: 0; color: #D97706; }

.btn-sm { background: white; border: 1px solid #CBD5E1; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; color: #334155; cursor: pointer; transition: all 0.2s; }
.btn-sm:hover { background: #F8FAFC; border-color: #64748B; }
.btn-builder-card { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; position: relative; margin-bottom: 0.75rem; }
.btn-remove-sm { position: absolute; top: 0.5rem; right: 0.5rem; background: #FEF2F2; color: #EF4444; border: none; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 800; cursor: pointer; }
.form-group-sm { display: flex; flex-direction: column; gap: 0.3rem; }

.modal-footer { padding: 1.25rem 2rem; border-top: 1px solid #E2E8F0; background: white; display: flex; justify-content: flex-end; gap: 1rem; }
.btn-ghost { background: transparent; border: none; color: #64748B; font-weight: 700; font-size: 0.9rem; cursor: pointer; padding: 0.5rem 1rem; border-radius: 10px; }
.btn-ghost:hover { background: #F1F5F9; color: #0F172A; }
.spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
