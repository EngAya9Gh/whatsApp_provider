<template>
  <div class="editor" :dir="isAr ? 'rtl' : 'ltr'">
    <!-- Top bar -->
    <header class="topbar">
      <router-link to="/flows" class="back" :title="isAr ? 'رجوع' : 'Back'">
        <i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
      </router-link>
      <div class="min-w-0">
        <div class="font-bold text-slate-800">{{ isAr ? 'سير الواتساب' : 'WhatsApp flow' }}</div>
        <div class="text-xs text-slate-500 truncate" dir="ltr">{{ channelLabel }}</div>
      </div>
      <span class="save-state" :class="saveState">
        <template v-if="saveState === 'saving'"><i class="fas fa-spinner fa-spin"></i> {{ isAr ? 'جاري الحفظ…' : 'Saving…' }}</template>
        <template v-else-if="saveState === 'saved'"><i class="fas fa-check"></i> {{ isAr ? 'حُفظت المسودة' : 'Draft saved' }}</template>
        <template v-else-if="saveState === 'error'"><i class="fas fa-triangle-exclamation"></i> {{ isAr ? 'تعذّر الحفظ' : 'Could not save' }}</template>
      </span>
      <label class="active-toggle" :class="{ disabled: !publishedVersion }" :title="!publishedVersion ? (isAr ? 'انشر السير أولاً' : 'Publish first') : ''">
        <span class="text-sm font-semibold" :class="isActive ? 'text-emerald-600' : 'text-slate-500'">
          {{ isActive ? (isAr ? 'السير مفعّل' : 'Flow is on') : (isAr ? 'السير متوقف' : 'Flow is off') }}
        </span>
        <button type="button" dir="ltr" :disabled="!publishedVersion || togglingActive" @click="toggleActive" class="switch" :class="{ on: isActive }">
          <span class="knob"></span>
        </button>
      </label>
    </header>

    <!-- Draft banner -->
    <div v-if="!loading && (hasDraftChanges || !publishedVersion)" class="draft-banner">
      <i class="fas fa-pen-to-square"></i>
      <span class="flex-1">
        {{ !publishedVersion
          ? (isAr ? 'لم يُنشر هذا السير بعد — العملاء لا يرونه حتى تنشره.' : 'Not published yet — customers do not see it until you publish.')
          : (isAr ? 'هذا السير لديه تغييرات غير منشورة — العملاء يرون النسخة المنشورة.' : 'Unpublished changes — customers see the published version.') }}
      </span>
      <button v-if="publishedVersion && hasDraftChanges" type="button" class="ghost-btn" @click="discard">{{ isAr ? 'تجاهل التغييرات' : 'Discard changes' }}</button>
      <button type="button" class="publish-btn" :disabled="publishing" @click="publish">
        <i class="fas" :class="publishing ? 'fa-spinner fa-spin' : 'fa-rocket'"></i>
        {{ isAr ? 'نشر التغييرات' : 'Publish' }}
      </button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center text-slate-500">{{ loadError }}</div>

    <div v-else class="workspace">
      <div class="canvas" dir="ltr">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :default-edge-options="defaultEdgeOptions"
          :is-valid-connection="isValidConnection"
          :delete-key-code="['Backspace', 'Delete']"
          :min-zoom="0.3"
          :max-zoom="1.5"
          fit-view-on-init
          @connect="onConnect"
          @node-click="({ node }) => (selectedId = node.id)"
          @pane-click="selectedId = null"
          @nodes-change="onNodesChange"
        >
          <Background :gap="18" pattern-color="#e2e8f0" />
          <Controls position="bottom-left" />
        </VueFlow>
      </div>

      <aside class="panel">
        <NodeSettings
          v-if="selectedNode"
          :key="selectedNode.id"
          :node="selectedNode"
          :is-ar="isAr"
          :tags="tags"
          :stages="stages"
          :agents="agents"
          :team-name="teamName"
          :errors="errorsByNode[selectedNode.id] || []"
          @close="selectedId = null"
          @delete="deleteNode(selectedNode.id)"
          @option-removed="(optId) => removeEdgesFrom(selectedNode.id, `opt-${optId}`)"
        />
        <div v-else class="palette">
          <h3 class="font-bold text-slate-800">{{ isAr ? 'الخطوات' : 'Steps' }}</h3>
          <p class="text-xs text-slate-500 mt-1 mb-4">
            {{ isAr ? 'انقر خطوة لإضافتها أسفل الخطوة المحددة. اسحب من النقاط الصغيرة لتوصيل الخطوات.' : 'Click a step to add it below the selected one. Drag from the small dots to connect steps.' }}
          </p>
          <div class="space-y-2">
            <button v-for="(meta, type) in addableTypes" :key="type" type="button" class="palette-item" @click="addNode(type)">
              <span class="palette-icon" :style="{ background: meta.color }"><i :class="meta.icon"></i></span>
              <span class="flex-1 text-start">
                <span class="block font-semibold text-slate-800 text-sm">{{ isAr ? meta.ar : meta.en }}</span>
                <span class="block text-xs text-slate-500">{{ isAr ? meta.descAr : meta.descEn }}</span>
              </span>
              <i class="fas fa-plus text-slate-300"></i>
            </button>
          </div>

          <div v-if="problemList.length" class="problems">
            <div class="font-bold text-sm mb-2"><i class="fas fa-circle-exclamation"></i> {{ isAr ? 'أصلح قبل النشر' : 'Fix before publishing' }}</div>
            <button v-for="(p, i) in problemList" :key="i" type="button" class="problem" @click="p.nodeId && (selectedId = p.nodeId)">
              {{ p.message }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, markRaw, provide, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import FlowNode from '../components/flows/FlowNode.vue'
import NodeSettings from '../components/flows/NodeSettings.vue'
import { FLOW_NODE_TYPES, outputHandles } from '../data/flowNodes'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const route = useRoute()
const channelId = route.params.channelId

const loading = ref(true)
const loadError = ref('')
const channel = ref(null)
const nodes = ref([])
const edges = ref([])
const selectedId = ref(null)
const isActive = ref(false)
const publishedVersion = ref(0)
const hasDraftChanges = ref(false)
const publishing = ref(false)
const togglingActive = ref(false)
const saveState = ref('')
const problems = ref([])

const tags = ref([])
const stages = ref([])
const agents = ref([])
const teamName = ref('')

const nodeTypes = Object.fromEntries(Object.keys(FLOW_NODE_TYPES).map(t => [t, markRaw(FlowNode)]))
const addableTypes = Object.fromEntries(Object.entries(FLOW_NODE_TYPES).filter(([, m]) => m.addable !== false))
const defaultEdgeOptions = { type: 'smoothstep', markerEnd: MarkerType.ArrowClosed, style: { strokeWidth: 2, stroke: '#94a3b8' } }

const channelLabel = computed(() => (channel.value ? (channel.value.name ? `${channel.value.name} · ` : '') + (channel.value.displayPhoneNumber || channel.value.phoneNumber || '') : ''))
const selectedNode = computed(() => nodes.value.find(n => n.id === selectedId.value) || null)

// Backend validation messages → Arabic
const PROBLEM_AR = {
  'The flow needs exactly one start step': 'يجب أن يحتوي السير على خطوة بداية واحدة',
  'Silence period must be between 1 and 720 hours': 'مدة الصمت يجب أن تكون بين 1 و720 ساعة',
  'Connect the start step to the first step': 'وصّل خطوة البداية بأول خطوة',
  'The message is empty': 'الرسالة فارغة',
  'The message is longer than 4096 characters': 'الرسالة أطول من 4096 حرفاً',
  'The question text is empty': 'نص السؤال فارغ',
  'The question is longer than 1024 characters': 'السؤال أطول من 1024 حرفاً',
  'A question needs 1 to 10 options': 'السؤال يحتاج من 1 إلى 10 خيارات',
  'Every option needs a title': 'كل خيار يحتاج عنواناً',
  'Option titles must be different': 'عناوين الخيارات يجب أن تكون مختلفة',
  'The list button text must be at most 20 characters': 'نص زر القائمة يجب ألا يتجاوز 20 حرفاً',
  'Choose what to check': 'اختر ما تريد فحصه',
  'Choose a tag': 'اختر وسماً',
  'Choose a stage': 'اختر مرحلة',
  'Write the words to look for': 'اكتب الكلمات التي تبحث عنها',
  'Choose a team member': 'اختر موظفاً',
  'Unknown step type': 'نوع خطوة غير معروف',
  'A connection leaves from an option that no longer exists': 'يوجد اتصال من خيار لم يعد موجوداً',
  'Publish the flow before turning it on': 'انشر السير قبل تفعيله'
}
const translate = (message) => {
  if (!isAr.value) return message
  const limit = message.match(/^Option titles must be at most (\d+) characters$/)
  if (limit) return `عناوين الخيارات يجب ألا تتجاوز ${limit[1]} حرفاً`
  return PROBLEM_AR[message] || message
}
const problemList = computed(() => problems.value.map(p => ({ nodeId: p.nodeId, message: translate(p.message) })))
const errorsByNode = computed(() => {
  const map = {}
  for (const p of problemList.value) if (p.nodeId) (map[p.nodeId] = map[p.nodeId] || []).push(p.message)
  return map
})

provide('flowCtx', {
  isAr,
  errorsByNode,
  tagMap: computed(() => Object.fromEntries(tags.value.map(t => [t.id, t]))),
  stageMap: computed(() => Object.fromEntries(stages.value.map(s => [s.id, s]))),
  agentMap: computed(() => Object.fromEntries(agents.value.map(a => [a.id, a])))
})

// ─── Graph editing ────────────────────────────────────────────
const isValidConnection = (c) => {
  if (c.source === c.target) return false
  const target = nodes.value.find(n => n.id === c.target)
  return !!target && target.type !== 'trigger'
}

const removeEdgesFrom = (nodeId, handle) => {
  edges.value = edges.value.filter(e => !(e.source === nodeId && (e.sourceHandle || 'out') === handle))
}

// One connection per output: a new one replaces the old
const onConnect = (c) => {
  if (!isValidConnection(c)) return
  const handle = c.sourceHandle || 'out'
  removeEdgesFrom(c.source, handle)
  edges.value = [...edges.value, { id: `e-${c.source}-${handle}-${c.target}`, source: c.source, target: c.target, sourceHandle: handle, targetHandle: 'in' }]
}

const addNode = (type) => {
  const base = selectedNode.value || [...nodes.value].sort((a, b) => b.position.y - a.position.y)[0]
  const id = `${type}-${Date.now().toString(36)}`
  const position = base
    ? { x: base.position.x, y: base.position.y + (base.dimensions?.height || 120) + 70 }
    : { x: 250, y: 100 }
  nodes.value = [...nodes.value, { id, type, position, data: FLOW_NODE_TYPES[type].defaults() }]
  // Continue the path from the selected step when its single output is free
  if (base && outputHandles(base).includes('out') && !edges.value.some(e => e.source === base.id && (e.sourceHandle || 'out') === 'out')) {
    edges.value = [...edges.value, { id: `e-${base.id}-out-${id}`, source: base.id, target: id, sourceHandle: 'out', targetHandle: 'in' }]
  }
  selectedId.value = id
}

const deleteNode = (id) => {
  const node = nodes.value.find(n => n.id === id)
  if (!node || node.type === 'trigger') return
  nodes.value = nodes.value.filter(n => n.id !== id)
  edges.value = edges.value.filter(e => e.source !== id && e.target !== id)
  selectedId.value = null
}

const onNodesChange = (changes) => {
  if (changes.some(c => c.type === 'remove' && c.id === selectedId.value)) selectedId.value = null
}

// ─── Draft autosave ───────────────────────────────────────────
const clean = () => ({
  nodes: nodes.value.map(n => ({ id: n.id, type: n.type, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data })),
  edges: edges.value.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out' }))
})
const snapshot = computed(() => JSON.stringify(clean()))
let lastSaved = ''
let saveTimer = null
let applying = false

const saveDraft = async () => {
  clearTimeout(saveTimer)
  const current = snapshot.value
  if (current === lastSaved) return
  saveState.value = 'saving'
  try {
    await axios.put(`/api/v1/flows/${channelId}/draft`, JSON.parse(current))
    lastSaved = current
    hasDraftChanges.value = true
    saveState.value = 'saved'
  } catch (err) {
    saveState.value = 'error'
    console.error('Flow draft save failed', err)
  }
}

watch(snapshot, (value) => {
  if (loading.value || applying || value === lastSaved) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDraft, 1000)
})

// Loading a flow must not look like an edit (no autosave, no "unpublished changes")
const applyFlow = async (flow) => {
  applying = true
  nodes.value = flow.draft.nodes.map(n => ({ ...n, deletable: n.type !== 'trigger' }))
  edges.value = flow.draft.edges.map(e => ({ ...e, targetHandle: 'in' }))
  isActive.value = flow.isActive
  publishedVersion.value = flow.publishedVersion
  hasDraftChanges.value = flow.hasDraftChanges
  await nextTick()
  lastSaved = snapshot.value
  applying = false
}

// ─── Publish / discard / on-off ───────────────────────────────
const publish = async () => {
  publishing.value = true
  try {
    await saveDraft()
    const res = await axios.post(`/api/v1/flows/${channelId}/publish`)
    problems.value = []
    publishedVersion.value = res.data.data.publishedVersion
    hasDraftChanges.value = false
    if (!isActive.value) {
      const answer = await Swal.fire({
        icon: 'success',
        title: isAr.value ? 'تم النشر' : 'Published',
        text: isAr.value ? 'السير متوقف حالياً. هل تريد تفعيله الآن ليبدأ بالرد على العملاء؟' : 'The flow is off. Turn it on now so it starts answering customers?',
        showCancelButton: true,
        confirmButtonColor: '#FF6600',
        confirmButtonText: isAr.value ? 'تفعيل الآن' : 'Turn on',
        cancelButtonText: isAr.value ? 'لاحقاً' : 'Later'
      })
      if (answer.isConfirmed) await setActive(true)
    } else {
      Swal.fire({ icon: 'success', title: isAr.value ? 'تم نشر التغييرات' : 'Changes published', timer: 1500, showConfirmButton: false })
    }
  } catch (err) {
    const data = err.response?.data?.error
    if (data?.errors) {
      problems.value = data.errors
      selectedId.value = null
      Swal.fire({ icon: 'warning', title: isAr.value ? 'يوجد ما يجب إصلاحه' : 'Some steps need fixing', text: isAr.value ? 'الخطوات المعلّمة بالأحمر تحتاج تعديلاً.' : 'Steps marked in red need changes.', confirmButtonColor: '#FF6600' })
    } else {
      Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر النشر' : 'Could not publish', text: data?.message || err.message, confirmButtonColor: '#FF6600' })
    }
  } finally {
    publishing.value = false
  }
}

const discard = async () => {
  const answer = await Swal.fire({
    icon: 'warning',
    title: isAr.value ? 'تجاهل التغييرات؟' : 'Discard changes?',
    text: isAr.value ? 'سيعود السير إلى آخر نسخة منشورة.' : 'The flow goes back to the last published version.',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: isAr.value ? 'تجاهل' : 'Discard',
    cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
  })
  if (!answer.isConfirmed) return
  clearTimeout(saveTimer)
  const res = await axios.post(`/api/v1/flows/${channelId}/discard`)
  problems.value = []
  selectedId.value = null
  await applyFlow(res.data.data)
}

const setActive = async (value) => {
  togglingActive.value = true
  try {
    const res = await axios.put(`/api/v1/flows/${channelId}/active`, { isActive: value })
    isActive.value = res.data.data.isActive
  } catch (err) {
    Swal.fire({ icon: 'error', title: translate(err.response?.data?.error?.message || err.message), confirmButtonColor: '#FF6600' })
  } finally {
    togglingActive.value = false
  }
}
const toggleActive = () => setActive(!isActive.value)

// ─── Load ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [flowRes, tagsRes, stagesRes, teamRes, teamsRes] = await Promise.all([
      axios.get(`/api/v1/flows/${channelId}`),
      axios.get('/api/v1/chat/tags').catch(() => ({ data: { data: [] } })),
      axios.get('/api/v1/chat/stages').catch(() => ({ data: { data: { stages: [] } } })),
      axios.get('/api/sub-users/team').catch(() => ({ data: { data: [] } })),
      axios.get('/api/v1/workforce/teams').catch(() => ({ data: { data: [] } }))
    ])
    const flow = flowRes.data.data
    channel.value = flow.channel
    tags.value = tagsRes.data.data || []
    stages.value = stagesRes.data.data?.stages || []
    agents.value = (teamRes.data.data || []).filter(a => a.isActive !== false)
    teamName.value = (teamsRes.data.data || []).find(t => t.channelIds.includes(channelId))?.name || ''
    await applyFlow(flow)
  } catch (err) {
    loadError.value = err.response?.status === 403
      ? (isAr.value ? 'سير الواتساب غير متاح في اشتراكك أو صلاحياتك.' : 'WhatsApp flows are not available on your plan or permissions.')
      : (isAr.value ? 'تعذّر تحميل السير.' : 'Could not load the flow.')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  // Do not lose the last edits when leaving the page
  if (snapshot.value !== lastSaved) saveDraft()
})
</script>

<style scoped>
.editor { display: flex; flex-direction: column; height: calc(100vh - 100px); background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.topbar { display: flex; align-items: center; gap: 14px; padding: 12px 18px; border-bottom: 1px solid #f1f5f9; }
.back { width: 34px; height: 34px; border-radius: 10px; background: #f8fafc; color: #64748b; display: flex; align-items: center; justify-content: center; }
.save-state { font-size: 12px; color: #94a3b8; display: inline-flex; align-items: center; gap: 6px; }
.save-state.saved { color: #006300; }
.save-state.error { color: #d03b3b; }
.active-toggle { margin-inline-start: auto; display: flex; align-items: center; gap: 10px; }
.active-toggle.disabled { opacity: 0.5; }
.switch { position: relative; width: 44px; height: 24px; border-radius: 12px; border: none; background: #cbd5e1; cursor: pointer; transition: background 0.2s; }
.switch.on { background: #10b981; }
.switch:disabled { cursor: not-allowed; }
.knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch.on .knob { left: 23px; }
.draft-banner { display: flex; align-items: center; gap: 12px; padding: 10px 18px; background: #fffbeb; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 13px; }
.ghost-btn { background: transparent; border: none; color: #92400e; font-weight: 700; font-size: 13px; cursor: pointer; }
.publish-btn { background: #FF6600; color: white; border: none; border-radius: 10px; padding: 8px 16px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.publish-btn:disabled { opacity: 0.6; }
.workspace { flex: 1; display: flex; min-height: 0; }
.canvas { flex: 1; min-width: 0; background: #fafbfc; }
.panel { width: 340px; border-inline-start: 1px solid #f1f5f9; background: white; overflow-y: auto; }
.palette { padding: 16px; }
.palette-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.palette-item:hover { border-color: #FF6600; box-shadow: 0 2px 8px rgba(255, 102, 0, 0.08); }
.palette-icon { width: 32px; height: 32px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.problems { margin-top: 18px; padding: 12px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.problem { display: block; width: 100%; text-align: start; background: none; border: none; color: #b91c1c; font-size: 12px; padding: 4px 0; cursor: pointer; text-decoration: underline; text-decoration-color: #fecaca; }
@media (max-width: 900px) {
  .workspace { flex-direction: column; }
  .panel { width: 100%; height: 45%; border-inline-start: none; border-top: 1px solid #f1f5f9; }
}
</style>
