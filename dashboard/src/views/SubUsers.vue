<template>
  <div class="su-root" :class="{ 'rtl': isAr }">

    <!-- ══ Hero Header ══ -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 class="hero-title">{{ isAr ? 'إدارة مستخدمي الشركة' : 'Team Members' }}</h1>
            <p class="hero-sub">{{ isAr ? 'أضف موظفين وخصص لكل منهم رقم واتساب وصلاحيات محددة' : 'Add team members and assign each a WhatsApp number with specific permissions' }}</p>
          </div>
        </div>
        <button @click="openCreate" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ isAr ? 'إضافة مستخدم' : 'Add Member' }}
        </button>
      </div>
    </div>

    <!-- ══ Stats Bar ══ -->
    <div class="page-content">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">{{ users.length }}</div>
          <div class="stat-label">{{ isAr ? 'إجمالي المستخدمين' : 'Total Members' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-num green">{{ activeCount }}</div>
          <div class="stat-label">{{ isAr ? 'مفعّلون' : 'Active' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-num orange">{{ users.filter(u => u.role === 'ADMIN').length }}</div>
          <div class="stat-label">{{ isAr ? 'مسؤولون' : 'Admins' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-num blue">{{ users.filter(u => u.channelId).length }}</div>
          <div class="stat-label">{{ isAr ? 'لديهم رقم مخصص' : 'With Channel' }}</div>
        </div>
      </div>

      <!-- ══ Users Table ══ -->
      <div class="table-card">
        <div v-if="loading" class="loading-state">
          <div class="spinner-lg"></div>
          <span>{{ isAr ? 'جاري التحميل...' : 'Loading...' }}</span>
        </div>

        <div v-else-if="users.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>{{ isAr ? 'لا يوجد مستخدمون بعد' : 'No team members yet' }}</h3>
          <p>{{ isAr ? 'أضف مستخدمًا جديدًا وخصص له رقم واتساب وصلاحيات' : 'Add your first team member and assign them a WhatsApp number' }}</p>
          <button @click="openCreate" class="btn-primary">
            {{ isAr ? 'إضافة أول مستخدم' : 'Add First Member' }}
          </button>
        </div>

        <table v-else class="users-table">
          <thead>
            <tr>
              <th>{{ isAr ? 'المستخدم' : 'User' }}</th>
              <th>{{ isAr ? 'الدور' : 'Role' }}</th>
              <th>{{ isAr ? 'رقم الواتساب المخصص' : 'Assigned Number' }}</th>
              <th>{{ isAr ? 'آخر دخول' : 'Last Login' }}</th>
              <th>{{ isAr ? 'الحالة' : 'Status' }}</th>
              <th>{{ isAr ? 'إجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" :class="{ 'row-inactive': !user.isActive }">
              <td>
                <div class="user-cell">
                  <div class="user-avatar" :class="'role-' + user.role.toLowerCase()">{{ user.name[0].toUpperCase() }}</div>
                  <div>
                    <div class="user-name">{{ user.name }}</div>
                    <div class="user-email">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td><span class="role-badge" :class="'badge-' + user.role.toLowerCase()">{{ roleLabel(user.role) }}</span></td>
              <td>
                <div v-if="user.channel" class="channel-cell">
                  <span class="channel-tag" :class="'provider-' + user.channel.providerType.toLowerCase()">
                    {{ user.channel.providerType === 'META_CLOUD' ? '☁️' : '📱' }}
                    {{ user.channel.displayPhoneNumber || user.channel.phoneNumber || user.channel.name || '-' }}
                  </span>
                </div>
                <span v-else class="no-channel">{{ isAr ? 'غير مخصص' : 'Not assigned' }}</span>
              </td>
              <td class="muted">{{ user.lastLoginAt ? formatDate(user.lastLoginAt) : (isAr ? 'لم يسجل بعد' : 'Never') }}</td>
              <td>
                <button @click="toggleActive(user)" class="status-toggle" :class="user.isActive ? 'active' : 'inactive'">
                  <span class="dot"></span>
                  {{ user.isActive ? (isAr ? 'مفعّل' : 'Active') : (isAr ? 'معطّل' : 'Inactive') }}
                </button>
              </td>
              <td>
                <div class="action-btns">
                  <button @click="openEdit(user)" class="btn-icon" :title="isAr ? 'تعديل' : 'Edit'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button @click="openResetPwd(user)" class="btn-icon orange" :title="isAr ? 'كلمة المرور' : 'Reset Password'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </button>
                  <button @click="confirmDelete(user)" class="btn-icon red" :title="isAr ? 'حذف' : 'Delete'">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ Modal: Create / Edit ══ -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ editingUser ? (isAr ? 'تعديل المستخدم' : 'Edit Member') : (isAr ? 'إضافة مستخدم جديد' : 'Add New Member') }}</h2>
            <button @click="closeModal" class="modal-close">✕</button>
          </div>

          <div class="modal-body">
            <!-- Basic Info -->
            <div class="section-title">{{ isAr ? 'البيانات الأساسية' : 'Basic Info' }}</div>
            <div class="form-row">
              <div class="form-group">
                <label>{{ isAr ? 'الاسم' : 'Full Name' }} *</label>
                <input v-model="form.name" type="text" class="input-std" :placeholder="isAr ? 'مثال: أحمد محمد' : 'e.g. John Doe'" />
              </div>
              <div class="form-group">
                <label>{{ isAr ? 'البريد الإلكتروني' : 'Email' }} *</label>
                <input v-model="form.email" type="email" class="input-std" :placeholder="isAr ? 'user@company.com' : 'user@company.com'" :disabled="!!editingUser" />
              </div>
            </div>
            <div class="form-row" v-if="!editingUser">
              <div class="form-group">
                <label>{{ isAr ? 'كلمة المرور' : 'Password' }} *</label>
                <input v-model="form.password" type="password" class="input-std" :placeholder="isAr ? 'على الأقل 6 أحرف' : 'At least 6 characters'" />
              </div>
            </div>

            <!-- Role & Channel -->
            <div class="section-title mt">{{ isAr ? 'الدور والرقم المخصص' : 'Role & Assigned Number' }}</div>
            <div class="form-row">
              <div class="form-group">
                <label>{{ isAr ? 'الدور' : 'Role' }}</label>
                <select v-model="form.role" class="input-std" @change="applyRoleDefaults">
                  <option value="ADMIN">{{ isAr ? 'مسؤول (Admin)' : 'Admin' }}</option>
                  <option value="MANAGER">{{ isAr ? 'مدير (Manager)' : 'Manager' }}</option>
                  <option value="AGENT">{{ isAr ? 'وكيل (Agent)' : 'Agent' }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ isAr ? 'رقم الواتساب المخصص' : 'Assigned WhatsApp Number' }}</label>
                <select v-model="form.channelId" class="input-std">
                  <option value="">{{ isAr ? 'بدون تخصيص' : 'No assignment' }}</option>
                  <option v-for="ch in channels" :key="ch.id" :value="ch.id">
                    {{ ch.providerType === 'META_CLOUD' ? '☁️' : '📱' }}
                    {{ ch.displayPhoneNumber || ch.phoneNumber || ch.name || ch.id.slice(0,8) }}
                    — {{ ch.status }}
                  </option>
                </select>
                <div class="field-hint">{{ isAr ? 'سيُستخدم هذا الرقم تلقائياً عند إرسال الرسائل' : 'This number will be used automatically when sending messages' }}</div>
              </div>
            </div>

            <!-- Permissions Matrix -->
            <div class="section-title mt">
              {{ isAr ? 'الصلاحيات' : 'Permissions' }}
              <span class="section-hint">{{ isAr ? 'تُعيد هذه الصلاحيات تعريف الدور الافتراضي' : 'These override the default role permissions' }}</span>
            </div>
            <div class="permissions-grid">
              <div v-for="(val, key) in form.permissions" :key="key" class="perm-item">
                <div class="perm-info">
                  <span class="perm-label">{{ permLabel(key) }}</span>
                  <span class="perm-desc">{{ permDesc(key) }}</span>
                </div>
                <button @click="form.permissions[key] = !val" class="toggle-btn" :class="{ 'on': val }">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="closeModal" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button @click="saveUser" class="btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-sm"></span>
              {{ saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Reset Password -->
      <div v-if="showPwdModal" class="modal-overlay" @click.self="showPwdModal = false">
        <div class="modal-box small">
          <div class="modal-header">
            <h2>{{ isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password' }}</h2>
            <button @click="showPwdModal = false" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <p class="muted mb">{{ isAr ? `تعيين كلمة مرور جديدة لـ ${pwdUser?.name}` : `Set a new password for ${pwdUser?.name}` }}</p>
            <div class="form-group">
              <label>{{ isAr ? 'كلمة المرور الجديدة' : 'New Password' }}</label>
              <input v-model="newPassword" type="password" class="input-std" :placeholder="isAr ? 'على الأقل 6 أحرف' : 'At least 6 characters'" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showPwdModal = false" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button @click="doResetPwd" class="btn-primary" :disabled="savingPwd">
              <span v-if="savingPwd" class="spinner-sm"></span>
              {{ isAr ? 'تحديث كلمة المرور' : 'Update Password' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-box small">
          <div class="modal-header">
            <h2>{{ isAr ? 'تأكيد الحذف' : 'Confirm Delete' }}</h2>
            <button @click="deleteTarget = null" class="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="delete-warning">
              <div class="warn-icon">⚠️</div>
              <p>{{ isAr ? `هل أنت متأكد من حذف المستخدم "${deleteTarget.name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="deleteTarget = null" class="btn-ghost">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button @click="doDelete" class="btn-danger" :disabled="deleting">
              <span v-if="deleting" class="spinner-sm"></span>
              {{ isAr ? 'حذف نهائياً' : 'Delete Permanently' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">{{ toast.message }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const users = ref([])
const channels = ref([])
const loading = ref(true)
const saving = ref(false)
const savingPwd = ref(false)
const deleting = ref(false)

const showModal = ref(false)
const showPwdModal = ref(false)
const editingUser = ref(null)
const deleteTarget = ref(null)
const pwdUser = ref(null)
const newPassword = ref('')

const toast = reactive({ show: false, message: '', type: 'success' })

// Default permissions (will be overridden per role)
const DEFAULT_PERMS = {
  can_send_message:        true,
  can_view_campaigns:      true,
  can_create_campaigns:    false,
  can_view_templates:      true,
  can_create_templates:    false,
  can_view_chatbot:        false,
  can_manage_chatbot:      false,
  can_view_logs:           false,
  can_view_live_chat:      true,
  can_view_analytics:      false,
  can_manage_settings:     false,
  can_view_api_keys:       false,
  can_view_billing:        false,
  can_manage_sub_users:    false,
}

const ROLE_PERMS = {
  ADMIN: {
    can_send_message: true, can_view_campaigns: true, can_create_campaigns: true,
    can_view_templates: true, can_create_templates: true, can_view_chatbot: true,
    can_manage_chatbot: true, can_view_logs: true, can_view_live_chat: true,
    can_view_analytics: true, can_manage_settings: false, can_view_api_keys: false,
    can_view_billing: false, can_manage_sub_users: false,
  },
  MANAGER: {
    can_send_message: true, can_view_campaigns: true, can_create_campaigns: true,
    can_view_templates: true, can_create_templates: true, can_view_chatbot: true,
    can_manage_chatbot: false, can_view_logs: true, can_view_live_chat: true,
    can_view_analytics: true, can_manage_settings: false, can_view_api_keys: false,
    can_view_billing: false, can_manage_sub_users: false,
  },
  AGENT: {
    can_send_message: true, can_view_campaigns: false, can_create_campaigns: false,
    can_view_templates: true, can_create_templates: false, can_view_chatbot: false,
    can_manage_chatbot: false, can_view_logs: false, can_view_live_chat: true,
    can_view_analytics: false, can_manage_settings: false, can_view_api_keys: false,
    can_view_billing: false, can_manage_sub_users: false,
  }
}

const form = reactive({
  name: '', email: '', password: '', role: 'AGENT', channelId: '',
  permissions: { ...DEFAULT_PERMS }
})

const activeCount = computed(() => users.value.filter(u => u.isActive).length)

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

async function fetchUsers() {
  try {
    const res = await axios.get('/api/sub-users', { headers: authHeader() })
    users.value = res.data.data
  } catch (e) {
    showToast(isAr.value ? 'خطأ في تحميل المستخدمين' : 'Failed to load users', 'error')
  }
}

async function fetchChannels() {
  try {
    const res = await axios.get('/api/whatsapp/channels', { headers: authHeader() })
    channels.value = res.data.channels || res.data.data || res.data || []
  } catch { channels.value = [] }
}

function openCreate() {
  editingUser.value = null
  Object.assign(form, { name: '', email: '', password: '', role: 'AGENT', channelId: '', permissions: { ...ROLE_PERMS.AGENT } })
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    channelId: user.channelId || '',
    permissions: { ...ROLE_PERMS[user.role], ...(user.permissions || {}) }
  })
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

function applyRoleDefaults() {
  const roleP = ROLE_PERMS[form.role] || ROLE_PERMS.AGENT
  Object.assign(form.permissions, roleP)
}

async function saveUser() {
  if (!form.name || !form.email) return showToast(isAr.value ? 'الاسم والبريد مطلوبان' : 'Name and email are required', 'error')
  if (!editingUser.value && !form.password) return showToast(isAr.value ? 'كلمة المرور مطلوبة' : 'Password is required', 'error')

  saving.value = true
  try {
    const payload = {
      name: form.name, email: form.email, role: form.role,
      channelId: form.channelId || null,
      permissions: form.permissions
    }
    if (!editingUser.value) payload.password = form.password

    if (editingUser.value) {
      await axios.put(`/api/sub-users/${editingUser.value.id}`, payload, { headers: authHeader() })
      showToast(isAr.value ? 'تم تحديث المستخدم' : 'User updated successfully')
    } else {
      await axios.post('/api/sub-users', payload, { headers: authHeader() })
      showToast(isAr.value ? 'تم إنشاء المستخدم' : 'User created successfully')
    }
    closeModal()
    await fetchUsers()
  } catch (e) {
    const msg = e.response?.data?.error || (isAr.value ? 'حدث خطأ' : 'An error occurred')
    showToast(msg, 'error')
  } finally {
    saving.value = false
  }
}

function openResetPwd(user) {
  pwdUser.value = user
  newPassword.value = ''
  showPwdModal.value = true
}

async function doResetPwd() {
  if (!newPassword.value || newPassword.value.length < 6) return showToast(isAr.value ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'error')
  savingPwd.value = true
  try {
    await axios.post(`/api/sub-users/${pwdUser.value.id}/reset-password`, { newPassword: newPassword.value }, { headers: authHeader() })
    showToast(isAr.value ? 'تم تحديث كلمة المرور' : 'Password updated successfully')
    showPwdModal.value = false
  } catch (e) {
    showToast(e.response?.data?.error || (isAr.value ? 'حدث خطأ' : 'Error'), 'error')
  } finally {
    savingPwd.value = false
  }
}

async function toggleActive(user) {
  try {
    await axios.put(`/api/sub-users/${user.id}`, { isActive: !user.isActive }, { headers: authHeader() })
    user.isActive = !user.isActive
    showToast(user.isActive ? (isAr.value ? 'تم تفعيل المستخدم' : 'User activated') : (isAr.value ? 'تم تعطيل المستخدم' : 'User deactivated'))
  } catch (e) {
    showToast(isAr.value ? 'حدث خطأ' : 'Error', 'error')
  }
}

function confirmDelete(user) { deleteTarget.value = user }

async function doDelete() {
  deleting.value = true
  try {
    await axios.delete(`/api/sub-users/${deleteTarget.value.id}`, { headers: authHeader() })
    showToast(isAr.value ? 'تم حذف المستخدم' : 'User deleted')
    deleteTarget.value = null
    await fetchUsers()
  } catch (e) {
    showToast(isAr.value ? 'حدث خطأ أثناء الحذف' : 'Failed to delete', 'error')
  } finally {
    deleting.value = false
  }
}

function roleLabel(role) {
  const labels = { ADMIN: isAr.value ? 'مسؤول' : 'Admin', MANAGER: isAr.value ? 'مدير' : 'Manager', AGENT: isAr.value ? 'وكيل' : 'Agent' }
  return labels[role] || role
}

function permLabel(key) {
  const labels = {
    can_send_message: isAr.value ? 'إرسال الرسائل' : 'Send Messages',
    can_view_campaigns: isAr.value ? 'عرض الحملات' : 'View Campaigns',
    can_create_campaigns: isAr.value ? 'إنشاء الحملات' : 'Create Campaigns',
    can_view_templates: isAr.value ? 'عرض القوالب' : 'View Templates',
    can_create_templates: isAr.value ? 'إنشاء القوالب' : 'Create Templates',
    can_view_chatbot: isAr.value ? 'عرض الرد التلقائي' : 'View Chatbot',
    can_manage_chatbot: isAr.value ? 'إدارة الرد التلقائي' : 'Manage Chatbot',
    can_view_logs: isAr.value ? 'عرض السجلات' : 'View Logs',
    can_view_live_chat: isAr.value ? 'المحادثة المباشرة' : 'Live Chat',
    can_view_analytics: isAr.value ? 'الإحصائيات' : 'Analytics',
    can_manage_settings: isAr.value ? 'إدارة الإعدادات' : 'Manage Settings',
    can_view_api_keys: isAr.value ? 'مفاتيح API' : 'API Keys',
    can_view_billing: isAr.value ? 'الفواتير والدفع' : 'Billing',
    can_manage_sub_users: isAr.value ? 'إدارة المستخدمين' : 'Manage Sub-Users',
  }
  return labels[key] || key
}

function permDesc(key) {
  const desc = {
    can_send_message: isAr.value ? 'إرسال رسائل واتساب' : 'Send WhatsApp messages',
    can_view_campaigns: isAr.value ? 'الاطلاع على الحملات التسويقية' : 'View marketing campaigns',
    can_create_campaigns: isAr.value ? 'إنشاء وتشغيل الحملات' : 'Create & run campaigns',
    can_view_templates: isAr.value ? 'عرض قوالب الرسائل' : 'View message templates',
    can_create_templates: isAr.value ? 'إنشاء وتعديل القوالب' : 'Create & edit templates',
    can_view_chatbot: isAr.value ? 'عرض قواعد الرد التلقائي' : 'View auto-reply rules',
    can_manage_chatbot: isAr.value ? 'إضافة وتعديل الردود التلقائية' : 'Add & edit auto-reply rules',
    can_view_logs: isAr.value ? 'عرض سجلات الرسائل' : 'View message logs',
    can_view_live_chat: isAr.value ? 'الدردشة الحية مع العملاء' : 'Live chat with customers',
    can_view_analytics: isAr.value ? 'الاطلاع على الإحصائيات والتقارير' : 'View analytics & reports',
    can_manage_settings: isAr.value ? 'تعديل إعدادات الحساب' : 'Modify account settings',
    can_view_api_keys: isAr.value ? 'عرض وإنشاء مفاتيح API' : 'View & create API keys',
    can_view_billing: isAr.value ? 'عرض الفواتير وسجل الدفع' : 'View invoices & payment history',
    can_manage_sub_users: isAr.value ? 'إضافة وتعديل المستخدمين الفرعيين' : 'Add & manage sub-users',
  }
  return desc[key] || ''
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(isAr.value ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => toast.show = false, 3500)
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchChannels()])
  loading.value = false
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.su-root {
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  padding-bottom: 4rem;
}
.su-root.rtl { direction: rtl; font-family: 'Tajawal', system-ui, sans-serif; }

/* ═══ HERO ═══ */
.hero-header {
  background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
  padding: 3rem 2.5rem;
  position: relative; overflow: hidden;
}
.hero-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 50% 80% at 90% 50%, rgba(255,102,0,0.15) 0%, transparent 60%);
  pointer-events: none;
}
.hero-content { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; position: relative; z-index: 1; flex-wrap: wrap; }
.hero-left { display: flex; align-items: center; gap: 1.25rem; }
.hero-icon-wrap { width: 56px; height: 56px; background: linear-gradient(135deg, #FF6600, #E55A00); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 8px 24px rgba(255,102,0,0.3); }
.hero-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 0.3rem; letter-spacing: -0.03em; }
.hero-sub { font-size: 0.95rem; color: #94A3B8; margin: 0; font-weight: 500; }

/* ═══ PAGE ═══ */
.page-content { padding: 2.5rem; margin-top: -1.5rem; position: relative; z-index: 10; }

/* ═══ STATS ═══ */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
@media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
.stat-card { background: white; border-radius: 16px; padding: 1.25rem 1.5rem; border: 1px solid #E2E8F0; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.stat-num { font-size: 2rem; font-weight: 900; color: #0F172A; line-height: 1; margin-bottom: 0.3rem; }
.stat-num.green { color: #10B981; }
.stat-num.orange { color: #FF6600; }
.stat-num.blue { color: #3B82F6; }
.stat-label { font-size: 0.8rem; color: #64748B; font-weight: 600; }

/* ═══ TABLE CARD ═══ */
.table-card { background: white; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; }
.users-table { width: 100%; border-collapse: collapse; }
.users-table thead tr { background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.users-table th { padding: 1rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
.rtl .users-table th { text-align: right; }
.users-table td { padding: 1rem 1.25rem; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
.users-table tbody tr:last-child td { border-bottom: none; }
.users-table tbody tr:hover { background: #FAFBFF; }
.row-inactive td { opacity: 0.55; }

.user-cell { display: flex; align-items: center; gap: 0.875rem; }
.user-avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; color: white; flex-shrink: 0; }
.user-avatar.role-admin    { background: linear-gradient(135deg, #FF6600, #E55A00); }
.user-avatar.role-manager  { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.user-avatar.role-agent    { background: linear-gradient(135deg, #10B981, #059669); }
.user-name { font-weight: 700; color: #0F172A; font-size: 0.9rem; }
.user-email { font-size: 0.8rem; color: #94A3B8; margin-top: 0.15rem; }

.role-badge { padding: 0.3rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; }
.badge-admin   { background: rgba(255,102,0,0.1); color: #FF6600; }
.badge-manager { background: rgba(59,130,246,0.1); color: #3B82F6; }
.badge-agent   { background: rgba(16,185,129,0.1); color: #10B981; }

.channel-tag { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; background: #F1F5F9; color: #334155; }
.no-channel { font-size: 0.8rem; color: #CBD5E1; font-style: italic; }

.muted { color: #94A3B8; font-size: 0.82rem; }
.mb { margin-bottom: 1.25rem; }

.status-toggle {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.875rem; border: none; border-radius: 20px;
  font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.status-toggle.active   { background: rgba(16,185,129,0.1); color: #10B981; }
.status-toggle.inactive { background: rgba(148,163,184,0.1); color: #94A3B8; }
.status-toggle .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.action-btns { display: flex; gap: 0.5rem; }
.btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: 1px solid #E2E8F0; border-radius: 10px; background: white; cursor: pointer; color: #64748B; transition: all 0.2s; }
.btn-icon:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }
.btn-icon.orange:hover { background: rgba(255,102,0,0.08); color: #FF6600; border-color: rgba(255,102,0,0.2); }
.btn-icon.red:hover    { background: rgba(239,68,68,0.08); color: #EF4444; border-color: rgba(239,68,68,0.2); }

/* ═══ EMPTY / LOADING ═══ */
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; gap: 1rem; text-align: center; }
.spinner-lg { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #FF6600; border-radius: 50%; animation: spin 0.8s linear infinite; }
.empty-icon { font-size: 3.5rem; }
.empty-state h3 { font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0; }
.empty-state p  { font-size: 0.9rem; color: #64748B; margin: 0; max-width: 380px; }

/* ═══ MODAL ═══ */
.modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box { background: white; border-radius: 24px; width: 100%; max-width: 680px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
.modal-box.small { max-width: 440px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.75rem 2rem 1.25rem; border-bottom: 1px solid #F1F5F9; }
.modal-header h2 { font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 0; }
.modal-close { background: none; border: none; color: #94A3B8; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 6px; transition: all 0.2s; }
.modal-close:hover { background: #F1F5F9; color: #0F172A; }
.modal-body { flex: 1; overflow-y: auto; padding: 1.75rem 2rem; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 2rem 1.75rem; border-top: 1px solid #F1F5F9; }

.section-title { font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.section-title.mt { margin-top: 1.75rem; }
.section-hint { font-weight: 500; text-transform: none; letter-spacing: 0; color: #94A3B8; font-size: 0.8rem; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
@media (max-width: 540px) { .form-row { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.83rem; font-weight: 700; color: #334155; }
.field-hint { font-size: 0.75rem; color: #94A3B8; margin-top: 0.3rem; }

.input-std {
  width: 100%; padding: 0.8rem 1rem; border: 1.5px solid #CBD5E1;
  border-radius: 12px; font-size: 0.9rem; font-family: inherit;
  color: #0F172A; background: white; outline: none; transition: all 0.2s; box-sizing: border-box;
}
.input-std:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
.input-std:disabled { background: #F8FAFC; color: #94A3B8; }
select.input-std { cursor: pointer; }

/* ═══ PERMISSIONS ═══ */
.permissions-grid { display: flex; flex-direction: column; gap: 0; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; }
.perm-item { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.25rem; border-bottom: 1px solid #F1F5F9; transition: background 0.15s; }
.perm-item:last-child { border-bottom: none; }
.perm-item:hover { background: #FAFBFF; }
.perm-info { display: flex; flex-direction: column; gap: 0.15rem; }
.perm-label { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
.perm-desc  { font-size: 0.75rem; color: #94A3B8; }

.toggle-btn { position: relative; width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer; background: #CBD5E1; transition: background 0.2s; flex-shrink: 0; }
.toggle-btn.on { background: #FF6600; }
.toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
.toggle-btn.on .toggle-knob { left: 23px; }

/* ═══ DELETE WARNING ═══ */
.delete-warning { display: flex; align-items: flex-start; gap: 1rem; background: #FFF5F5; border: 1px solid #FCA5A5; border-radius: 12px; padding: 1.25rem; }
.warn-icon { font-size: 1.75rem; flex-shrink: 0; }
.delete-warning p { color: #7F1D1D; font-size: 0.9rem; line-height: 1.6; margin: 0; }

/* ═══ BUTTONS ═══ */
.btn-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, #FF6600, #E55A00); color: white;
  padding: 0.8rem 1.5rem; border: none; border-radius: 12px;
  font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(255,102,0,0.25); font-family: inherit; white-space: nowrap;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,102,0,0.3); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: transparent; color: #64748B; border: 1.5px solid #CBD5E1;
  padding: 0.8rem 1.5rem; border-radius: 12px; font-weight: 700;
  font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-ghost:hover { background: #F8FAFC; color: #0F172A; border-color: #94A3B8; }
.btn-danger {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: #EF4444; color: white; padding: 0.8rem 1.5rem;
  border: none; border-radius: 12px; font-weight: 800; font-size: 0.9rem;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ TOAST ═══ */
.toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  padding: 0.875rem 1.5rem; border-radius: 14px; font-weight: 700; font-size: 0.9rem;
  z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.15); white-space: nowrap;
}
.toast.success { background: #0F172A; color: white; }
.toast.error   { background: #EF4444; color: white; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to   { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
