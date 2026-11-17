<template>
  <div class="editor" :dir="isAr ? 'rtl' : 'ltr'">
    <!-- Top bar -->
    <header class="topbar">
      <router-link to="/flows" class="back" :title="isAr ? 'رجوع' : 'Back'">
        <i class="fas" :class="isAr ? 'fa-arrow-right' : 'fa-arrow-left'"></i>
      </router-link>
      <div class="min-w-0">
        <div class="font-bold text-slate-800">{{ isAr ? 'سير الواتساب' : 'Chat flow' }}</div>
        <div class="text-xs text-slate-500 truncate" dir="ltr">{{ channelLabel }}</div>
      </div>
      <span class="save-state" :class="saveState">
        <template v-if="saveState === 'saving'"><i class="fas fa-spinner fa-spin"></i> {{ isAr ? 'جاري الحفظ…' : 'Saving…' }}</template>
        <template v-else-if="saveState === 'saved'"><i class="fas fa-check"></i> {{ isAr ? 'حُفظت المسودة' : 'Draft saved' }}</template>
        <template v-else-if="saveState === 'error'"><i class="fas fa-triangle-exclamation"></i> {{ isAr ? 'تعذّر الحفظ' : 'Could not save' }}</template>
      </span>
      <button v-if="!loading && !loadError" type="button" class="templates-btn" @click="showTemplates = true">
        <i class="fas fa-shapes"></i><span>{{ isAr ? 'نماذج جاهزة' : 'Templates' }}</span>
      </button>
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
      <div ref="canvasEl" class="canvas" dir="ltr">
        <!-- Canvas toolbar -->
        <div class="toolbar" :dir="isAr ? 'rtl' : 'ltr'">
          <button type="button" class="tb-btn primary" @click="openToolbarMenu">
            <i class="fas fa-plus"></i><span>{{ isAr ? 'إضافة خطوة' : 'Add step' }}</span>
          </button>
          <button type="button" class="tb-btn test" :class="{ on: testing }" @click="toggleTesting">
            <i class="fas fa-play"></i><span>{{ isAr ? 'جرّب السير' : 'Test' }}</span>
          </button>
          <span class="tb-sep"></span>
          <button type="button" class="tb-btn icon" :disabled="!canUndo" :title="isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'" @click="undo">
            <i class="fas fa-rotate-left"></i><span>{{ isAr ? 'تراجع' : 'Undo' }}</span>
          </button>
          <button type="button" class="tb-btn icon" :title="isAr ? 'رتّب الخطوات تلقائياً تحت بعضها' : 'Lay the steps out neatly'" @click="tidy">
            <i class="fas fa-wand-magic-sparkles"></i><span>{{ isAr ? 'ترتيب' : 'Tidy up' }}</span>
          </button>
          <button type="button" class="tb-btn icon" :class="{ on: showTips }" :title="isAr ? 'طريقة الاستخدام' : 'How to use'" @click="showTips = !showTips">
            <i class="fas fa-circle-question"></i>
          </button>
        </div>

        <!-- How to use the canvas -->
        <div v-if="showTips" class="tips" :dir="isAr ? 'rtl' : 'ltr'">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-slate-800 text-sm"><i class="fas fa-hand-pointer text-[#FF6600]"></i> {{ isAr ? 'كيف تتحكم باللوحة' : 'How to use the canvas' }}</span>
            <button type="button" class="tips-close" @click="closeTips">{{ isAr ? 'فهمت' : 'Got it' }}</button>
          </div>
          <ul>
            <li><span class="tip-ico plus"><i class="fas fa-plus"></i></span>{{ isAr ? 'اضغط «+» بجانب أي مخرج لإضافة الخطوة التالية موصولة مباشرة.' : 'Click "+" next to any output to add the next step, already connected.' }}</li>
            <li><span class="tip-ico"><i class="fas fa-circle-dot"></i></span>{{ isAr ? 'للتوصيل اسحب من النقطة الصغيرة وأفلتها على أي خطوة. أفلتها في مكان فارغ لتضيف خطوة هناك.' : 'To connect, drag from a small dot and drop it on any step. Drop it on empty space to add a step there.' }}</li>
            <li><span class="tip-ico del"><i class="fas fa-xmark"></i></span>{{ isAr ? 'لحذف خط اضغط ✕ في منتصفه. لحذف خطوة مرّر الماوس عليها واضغط سلة المهملات، أو حددها واضغط Delete.' : 'To remove a line click the ✕ in its middle. To delete a step hover it and click the bin, or select it and press Delete.' }}</li>
            <li><span class="tip-ico"><i class="fas fa-rotate-left"></i></span>{{ isAr ? 'أخطأت؟ اضغط «تراجع» أو Ctrl+Z.' : 'Made a mistake? Click "Undo" or press Ctrl+Z.' }}</li>
            <li><span class="tip-ico test"><i class="fas fa-play"></i></span>{{ isAr ? '«جرّب السير» يشغّل المسودة فوراً كأنك عميل، بدون نشر وبدون انتظار ساعات.' : '"Test" runs the draft right away as if you were a customer: no publishing, no waiting hours.' }}</li>
          </ul>
        </div>

        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-edge-options="defaultEdgeOptions"
          :is-valid-connection="isValidConnection"
          :delete-key-code="['Backspace', 'Delete']"
          :min-zoom="0.3"
          :max-zoom="1.5"
          fit-view-on-init
          @pane-ready="(instance) => (flowInstance = instance)"
          @connect="onConnect"
          @connect-start="onConnectStart"
          @connect-end="onConnectEnd"
          @node-click="({ node }) => (selectedId = node.id)"
          @pane-click="selectedId = null"
          @nodes-change="onNodesChange"
          @edge-mouse-enter="({ edge }) => (hoveredEdge = edge.id)"
          @edge-mouse-leave="hoveredEdge = null"
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
          :back-label="testing ? (isAr ? 'رجوع للتجربة' : 'Back to the test') : (isAr ? 'الخطوات' : 'Steps')"
          @close="selectedId = null"
          @delete="deleteNode(selectedNode.id)"
          @test="startTesting"
          @option-removed="(optId) => removeEdgesFrom(selectedNode.id, `opt-${optId}`)"
        />
        <FlowTester
          v-if="testing"
          v-show="!selectedNode"
          :channel-id="channelId"
          :is-ar="isAr"
          :get-graph="clean"
          :tag-map="tagMap"
          :stage-map="stageMap"
          :agent-map="agentMap"
          :has-ai="nodes.some(n => n.type === 'ai_agent')"
          :live="isActive && publishedVersion > 0"
          :has-draft-changes="hasDraftChanges"
          :silence-hours="Number(nodes.find(n => n.type === 'trigger')?.data?.inactivityHours) || 24"
          @close="stopTesting"
          @live="onTestProgress"
          @problems="(list) => (problems = list)"
          @focus="focusNode"
        />
        <div v-if="!selectedNode && !testing" class="palette">
          <button type="button" class="templates-card" @click="showTemplates = true">
            <span class="palette-icon" style="background: #FF6600"><i class="fas fa-shapes"></i></span>
            <span class="flex-1 text-start">
              <span class="block font-bold text-slate-800 text-sm">{{ isAr ? 'لا تعرف من أين تبدأ؟' : 'Not sure where to start?' }}</span>
              <span class="block text-xs text-slate-500">{{ isAr ? 'اختر نموذجاً جاهزاً مشروحاً، ثم عدّل نصوصه.' : 'Pick an explained ready-made flow, then edit its texts.' }}</span>
            </span>
            <i class="fas text-[#FF6600]" :class="isAr ? 'fa-chevron-left' : 'fa-chevron-right'"></i>
          </button>

          <h3 class="font-bold text-slate-800">{{ isAr ? 'الخطوات' : 'Steps' }}</h3>
          <p class="text-xs text-slate-500 mt-1 mb-4">
            {{ isAr ? 'انقر خطوة لإضافتها في آخر السير، أو اضغط «+» بجانب أي مخرج على اللوحة لتضيفها بعده مباشرة.' : 'Click a step to add it at the end, or click "+" next to any output on the canvas to add it right after.' }}
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

    <StepMenu
      v-if="stepMenu"
      :x="stepMenu.x"
      :y="stepMenu.y"
      :is-ar="isAr"
      :title="stepMenu.title"
      :show-templates="!stepMenu.source"
      @pick="pickStep"
      @templates="stepMenu = null; showTemplates = true"
      @close="stepMenu = null"
    />

    <FlowTemplates
      v-if="showTemplates"
      :is-ar="isAr"
      :ai-ready="aiReady"
      :stages-enabled="stagesEnabled"
      :busy="applyingTemplate"
      @close="showTemplates = false"
      @use="useTemplate"
    />
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
import FlowTemplates from '../components/flows/FlowTemplates.vue'
import FlowEdge from '../components/flows/FlowEdge.vue'
import StepMenu from '../components/flows/StepMenu.vue'
import FlowTester from '../components/flows/FlowTester.vue'
import { FLOW_NODE_TYPES, outputHandles, newOptionId } from '../data/flowNodes'
import { findTag, pickInterestedStage } from '../data/flowTemplates'
import { layoutFlow, reachableFrom } from '../data/flowLayout'

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
const stagesEnabled = ref(false)
const aiReady = ref(null) // Gemini key + business info; null when unknown

const showTemplates = ref(false)
const applyingTemplate = ref(false)
let flowInstance = null
const canvasEl = ref(null)

const hoveredEdge = ref(null)
const stepMenu = ref(null) // { x, y, title, source: { nodeId, handle } | null, at: flow position | null }
const testing = ref(false)
const liveNodeId = ref(null) // step the test conversation waits on
const visitedIds = ref(new Set()) // steps the last test message went through
const testedEdges = ref(new Set())

const TIPS_KEY = 'wakeel.flowTips.v1'
const showTips = ref((() => { try { return !localStorage.getItem(TIPS_KEY) } catch { return true } })())
const closeTips = () => {
  showTips.value = false
  try { localStorage.setItem(TIPS_KEY, '1') } catch { /* private mode */ }
}

const nodeTypes = Object.fromEntries(Object.keys(FLOW_NODE_TYPES).map(t => [t, markRaw(FlowNode)]))
const edgeTypes = { flow: markRaw(FlowEdge) }
const addableTypes = Object.fromEntries(Object.entries(FLOW_NODE_TYPES).filter(([, m]) => m.addable !== false))
const defaultEdgeOptions = { type: 'flow', markerEnd: MarkerType.ArrowClosed, style: { strokeWidth: 2, stroke: '#94a3b8' } }

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
  'Publish the flow before turning it on': 'انشر السير قبل تفعيله',
  'Add a Gemini API key in Settings → AI': 'أضف مفتاح Gemini من الإعدادات ← الذكاء الاصطناعي',
  'Add business information on the AI agent page': 'أضف معلومات نشاطك في صفحة الموظف الذكي'
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

const tagMap = computed(() => Object.fromEntries(tags.value.map(t => [t.id, t])))
const stageMap = computed(() => Object.fromEntries(stages.value.map(s => [s.id, s])))
const agentMap = computed(() => Object.fromEntries(agents.value.map(a => [a.id, a])))
// Steps a customer can reach, and outputs that already have a line (no "+" on those)
const reachable = computed(() => reachableFrom(nodes.value, edges.value))
const connectedHandles = computed(() => new Set(edges.value.map(e => `${e.source}:${e.sourceHandle || 'out'}`)))

provide('flowCtx', {
  isAr,
  errorsByNode,
  tagMap,
  stageMap,
  agentMap,
  reachable,
  connectedHandles,
  liveNodeId,
  visitedIds,
  testedEdges,
  hoveredEdge,
  removeEdge: (id) => removeEdge(id),
  deleteNode: (id) => deleteNode(id),
  duplicateNode: (id) => duplicateNode(id),
  openStepMenu: (req) => openStepMenu(req)
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

const removeEdge = (id) => {
  edges.value = edges.value.filter(e => e.id !== id)
  hoveredEdge.value = null
}

// One connection per output: a new one replaces the old
let connectMade = false
const onConnect = (c) => {
  connectMade = true
  if (!isValidConnection(c)) return
  const handle = c.sourceHandle || 'out'
  removeEdgesFrom(c.source, handle)
  edges.value = [...edges.value, { id: `e-${c.source}-${handle}-${c.target}`, source: c.source, target: c.target, sourceHandle: handle, targetHandle: 'in' }]
}

// A line dropped on a step's body connects to it; dropped on empty space, it offers a new step there
let connectFrom = null
const onConnectStart = ({ nodeId, handleId, handleType }) => {
  connectMade = false
  connectFrom = handleType === 'source' && nodeId ? { nodeId, handle: handleId || 'out' } : null
}
const onConnectEnd = (event) => {
  const from = connectFrom
  connectFrom = null
  if (!from || connectMade || !event) return
  const point = event.changedTouches?.[0] || event
  if (typeof point.clientX !== 'number') return
  const under = document.elementFromPoint(point.clientX, point.clientY)
  const nodeEl = under?.closest?.('.vue-flow__node')
  if (nodeEl) {
    onConnect({ source: from.nodeId, sourceHandle: from.handle, target: nodeEl.getAttribute('data-id') })
    return
  }
  if (!under?.closest?.('.vue-flow__pane') || !flowInstance || !canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const at = flowInstance.project({ x: point.clientX - rect.left, y: point.clientY - rect.top })
  stepMenu.value = { x: point.clientX + 8, y: point.clientY - 16, source: from, at, title: isAr.value ? 'أضف خطوة هنا' : 'Add a step here' }
}

const newNodeId = (type) => `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Moves a new step down until it does not cover another one */
const freeSpot = (pos, ignoreId = null) => {
  const p = { ...pos }
  for (let i = 0; i < 40; i++) {
    const hit = nodes.value.some(n => n.id !== ignoreId && Math.abs(n.position.x - p.x) < 260 && Math.abs(n.position.y - p.y) < (n.dimensions?.height || 120) + 20)
    if (!hit) break
    p.y += 60
  }
  return p
}

/** Moves the canvas (same zoom) when a new step landed outside the visible part */
const revealNode = async (id) => {
  await nextTick()
  const node = nodes.value.find(n => n.id === id)
  if (!node || !flowInstance || !canvasEl.value) return
  const { width, height } = canvasEl.value.getBoundingClientRect()
  const topLeft = flowInstance.project({ x: 0, y: 70 }) // below the toolbar
  const bottomRight = flowInstance.project({ x: width, y: height })
  const w = node.dimensions?.width || 250
  const h = node.dimensions?.height || 140
  const inside = node.position.x >= topLeft.x && node.position.y >= topLeft.y && node.position.x + w <= bottomRight.x && node.position.y + h <= bottomRight.y
  if (!inside) flowInstance.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: flowInstance.getViewport().zoom, duration: 300 })
}

const addNode = (type) => {
  const base = selectedNode.value || [...nodes.value].sort((a, b) => b.position.y - a.position.y)[0]
  // Continue the path from that step when its single output is free
  if (base && outputHandles(base).includes('out') && !connectedHandles.value.has(`${base.id}:out`)) {
    addNodeFrom(base.id, 'out', type)
    return
  }
  const id = newNodeId(type)
  const position = freeSpot(base
    ? { x: base.position.x, y: base.position.y + (base.dimensions?.height || 120) + 70 }
    : { x: 250, y: 100 })
  nodes.value = [...nodes.value, { id, type, position, data: FLOW_NODE_TYPES[type].defaults() }]
  selectedId.value = id
  revealNode(id)
}

/** Adds a step connected to one output (the "+" of that output, or a line dropped on empty space) */
const addNodeFrom = (sourceId, handle, type, at = null) => {
  const source = nodes.value.find(n => n.id === sourceId)
  if (!source) return
  const id = newNodeId(type)
  let position
  if (at) {
    position = { x: Math.round(at.x - 125), y: Math.round(at.y) }
  } else {
    // Branches side by side under their step, in the order of the outputs
    const outs = outputHandles(source)
    const idx = Math.max(0, outs.indexOf(handle))
    const spread = outs.length > 1 ? (idx - (outs.length - 1) / 2) * 290 : 0
    position = freeSpot({ x: Math.round(source.position.x + spread), y: Math.round(source.position.y + (source.dimensions?.height || 140) + 80) })
  }
  nodes.value = [...nodes.value, { id, type, position, data: FLOW_NODE_TYPES[type].defaults() }]
  removeEdgesFrom(sourceId, handle)
  edges.value = [...edges.value, { id: `e-${sourceId}-${handle}-${id}`, source: sourceId, target: id, sourceHandle: handle, targetHandle: 'in' }]
  selectedId.value = id
  if (!at) revealNode(id)
}

const deleteNode = (id) => {
  const node = nodes.value.find(n => n.id === id)
  if (!node || node.type === 'trigger') return
  nodes.value = nodes.value.filter(n => n.id !== id)
  edges.value = edges.value.filter(e => e.source !== id && e.target !== id)
  if (selectedId.value === id) selectedId.value = null
}

const duplicateNode = (id) => {
  const node = nodes.value.find(n => n.id === id)
  if (!node || node.type === 'trigger') return
  const data = JSON.parse(JSON.stringify(node.data || {}))
  // Each option is an output of its own step, so the copy gets new ones
  if (Array.isArray(data.options)) data.options = data.options.map(o => ({ ...o, id: newOptionId() }))
  const copy = { id: newNodeId(node.type), type: node.type, position: freeSpot({ x: node.position.x + 40, y: node.position.y + 40 }), data }
  nodes.value = [...nodes.value, copy]
  selectedId.value = copy.id
  revealNode(copy.id)
}

// ─── Step picker ──────────────────────────────────────────────
const openStepMenu = ({ nodeId, handle, event }) => {
  const r = event.currentTarget?.getBoundingClientRect?.() || { right: event.clientX, left: event.clientX, top: event.clientY }
  stepMenu.value = {
    x: isAr.value ? r.left - 298 : r.right + 8,
    y: r.top - 20,
    source: { nodeId, handle },
    at: null,
    title: isAr.value ? 'ماذا يحدث بعدها؟' : 'What happens next?'
  }
}
const openToolbarMenu = (event) => {
  const r = event.currentTarget.getBoundingClientRect()
  stepMenu.value = { x: isAr.value ? r.right - 290 : r.left, y: r.bottom + 6, source: null, at: null, title: '' }
}
const pickStep = (type) => {
  const menu = stepMenu.value
  stepMenu.value = null
  if (!menu) return
  if (menu.source) addNodeFrom(menu.source.nodeId, menu.source.handle, type, menu.at)
  else addNode(type)
}

// ─── Tidy up ──────────────────────────────────────────────────
const plain = (g) => ({
  nodes: g.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data, deletable: n.type !== 'trigger' })),
  edges: g.edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: 'in' }))
})
const tidy = async () => {
  const positions = layoutFlow(nodes.value, edges.value)
  nodes.value = nodes.value.map(n => ({ id: n.id, type: n.type, position: positions[n.id] || n.position, data: n.data, deletable: n.type !== 'trigger' }))
  await nextTick()
  setTimeout(() => flowInstance?.fitView({ padding: 0.15, duration: 300 }), 60)
}

// ─── Undo ─────────────────────────────────────────────────────
// Every pause in editing (moving, typing, deleting…) leaves a point to go back to
const undoStack = []
const canUndo = ref(false)
let burstStart = null
let undoTimer = null
let restoring = false
const pushUndo = (snap) => {
  undoStack.push(snap)
  if (undoStack.length > 50) undoStack.shift()
  canUndo.value = true
}
const flushUndo = () => {
  clearTimeout(undoTimer)
  if (burstStart !== null && burstStart !== snapshot.value) pushUndo(burstStart)
  burstStart = null
}
const undo = async () => {
  flushUndo()
  const prev = undoStack.pop()
  canUndo.value = undoStack.length > 0
  if (!prev) return
  restoring = true
  const g = plain(JSON.parse(prev))
  nodes.value = g.nodes
  edges.value = g.edges
  if (selectedId.value && !g.nodes.some(n => n.id === selectedId.value)) selectedId.value = null
  await nextTick()
  restoring = false
}
const onKeydown = (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return
  const el = document.activeElement
  if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return // the field's own undo
  e.preventDefault()
  undo()
}

// ─── Test chat ────────────────────────────────────────────────
const startTesting = () => {
  testing.value = true
  selectedId.value = null
}
const stopTesting = () => {
  testing.value = false
  onTestProgress({ nodeId: null, steps: [] })
}
const toggleTesting = () => (testing.value && !selectedNode.value ? stopTesting() : startTesting())
const onTestProgress = ({ nodeId, steps }) => {
  liveNodeId.value = nodeId
  visitedIds.value = new Set(steps)
  const used = new Set()
  for (let i = 0; i + 1 < steps.length; i++) {
    const edge = edges.value.find(e => e.source === steps[i] && e.target === steps[i + 1])
    if (edge) used.add(edge.id)
  }
  testedEdges.value = used
}
const focusNode = (id) => {
  selectedId.value = id
  flowInstance?.fitView({ nodes: [id], maxZoom: 1, padding: 0.6, duration: 300 })
}

const onNodesChange = (changes) => {
  if (changes.some(c => c.type === 'remove' && c.id === selectedId.value)) selectedId.value = null
}

// ─── Ready-made flows ─────────────────────────────────────────
// Only the start step and the default welcome message, never published
const isPristine = computed(() => !publishedVersion.value && nodes.value.filter(n => n.type !== 'trigger').length <= 1)

/** Tags the template needs: reuse ones with the same name, create (and pin) the missing ones */
const resolveTags = async (tpl) => {
  const ids = {}
  for (const need of tpl.tags || []) {
    let tag = findTag(tags.value, need)
    if (!tag) {
      try {
        const res = await axios.post('/api/v1/chat/tags', { name: isAr.value ? need.ar : need.en, color: need.color, isPinned: true })
        tag = res.data.data
        tags.value = [...tags.value, tag]
      } catch (err) {
        console.error('Could not create template tag', err)
      }
    }
    ids[need.key] = tag?.id || ''
  }
  return ids
}

const useTemplate = async (tpl) => {
  if (!isPristine.value) {
    const answer = await Swal.fire({
      icon: 'question',
      title: isAr.value ? 'استبدال الخطوات الحالية؟' : 'Replace the current steps?',
      text: isAr.value
        ? 'ستحل خطوات النموذج محل خطوات المسودة. ما يراه العملاء الآن لا يتغير حتى تنشر.'
        : 'The template replaces the steps in your draft. What customers see now does not change until you publish.',
      showCancelButton: true,
      confirmButtonColor: '#FF6600',
      confirmButtonText: isAr.value ? 'استبدال' : 'Replace',
      cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
    })
    if (!answer.isConfirmed) return
  }
  applyingTemplate.value = true
  try {
    const tagIds = await resolveTags(tpl)
    const stageId = tpl.usesStage && stagesEnabled.value ? pickInterestedStage(stages.value)?.id || '' : ''
    const inactivityHours = nodes.value.find(n => n.type === 'trigger')?.data?.inactivityHours || 24
    const g = tpl.build({ isAr: isAr.value, inactivityHours, tagIds, stageId })
    nodes.value = g.nodes.map(n => ({ ...n, deletable: n.type !== 'trigger' }))
    edges.value = g.edges
    problems.value = []
    selectedId.value = null
    showTemplates.value = false
    await nextTick()
    setTimeout(() => flowInstance?.fitView({ padding: 0.15 }), 60)
    Swal.fire({
      icon: 'success',
      title: isAr.value ? 'تم تجهيز السير' : 'Flow ready',
      text: isAr.value
        ? 'اضغط أي خطوة لتعديلها. الرسائل المعلّمة بـ«مثال» اكتب فيها معلوماتك، ثم انشر.'
        : 'Click any step to edit it. Write your own details in messages marked "Example", then publish.',
      confirmButtonColor: '#FF6600'
    })
  } finally {
    applyingTemplate.value = false
  }
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

watch(snapshot, (value, old) => {
  if (loading.value || applying) return
  if (!restoring) {
    if (burstStart === null) burstStart = old
    clearTimeout(undoTimer)
    undoTimer = setTimeout(flushUndo, 600)
  }
  if (value === lastSaved) return
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
  // Template example texts (prices, opening times) should not reach customers by accident
  const samples = nodes.value.filter(n => n.type === 'message' && n.data?.sample)
  if (samples.length) {
    const answer = await Swal.fire({
      icon: 'warning',
      title: isAr.value ? 'رسائل ما زالت بنص المثال' : 'Some messages still have example text',
      text: isAr.value
        ? `${samples.length === 1 ? 'رسالة واحدة' : `${samples.length} رسائل`} من النموذج فيها معلومات مثال (مثل الأسعار أو الأوقات). عدّلها قبل أن يراها العملاء.`
        : `${samples.length} template message(s) still have example details (like prices or opening times). Edit them before customers see them.`,
      showCancelButton: true,
      confirmButtonColor: '#FF6600',
      confirmButtonText: isAr.value ? 'عدّلها الآن' : 'Edit now',
      cancelButtonText: isAr.value ? 'انشر كما هي' : 'Publish as is'
    })
    if (answer.isConfirmed) {
      selectedId.value = samples[0].id
      return
    }
    if (answer.dismiss !== Swal.DismissReason.cancel) return
  }
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
  undoStack.length = 0
  burstStart = null
  canUndo.value = false
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
  window.addEventListener('keydown', onKeydown)
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
    stagesEnabled.value = !!stagesRes.data.data?.enabled && stages.value.length > 0
    agents.value = (teamRes.data.data || []).filter(a => a.isActive !== false)
    teamName.value = (teamsRes.data.data || []).find(t => t.channelIds.includes(channelId))?.name || ''
    await applyFlow(flow)
    // First visit: offer the ready-made flows straight away
    if (isPristine.value && !flow.hasDraftChanges) showTemplates.value = true
    axios.get('/api/v1/ai/agent')
      .then(res => {
        const agent = res.data.data || {}
        aiReady.value = !!agent.aiConfigured && (agent.knowledge || []).some(k => String(k.content || '').trim())
      })
      .catch(() => { aiReady.value = null })
  } catch (err) {
    loadError.value = err.response?.status === 403
      ? (isAr.value ? 'سير الواتساب غير متاح في اشتراكك أو صلاحياتك.' : 'Chat flows are not available on your plan or permissions.')
      : (isAr.value ? 'تعذّر تحميل السير.' : 'Could not load the flow.')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(undoTimer)
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
.canvas { flex: 1; min-width: 0; background: #fafbfc; position: relative; }
.toolbar { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 4px; padding: 5px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); max-width: calc(100% - 24px); overflow-x: auto; }
.tb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 10px; border: none; background: transparent; color: #475569; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.tb-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-btn.primary { background: #FF6600; color: white; }
.tb-btn.primary:hover { background: #ea580c; color: white; }
.tb-btn.test { color: #4f46e5; }
.tb-btn.test.on, .tb-btn.test:hover { background: #eef2ff; color: #4338ca; }
.tb-btn.icon.on { background: #fff7ed; color: #c2410c; }
.tb-sep { width: 1px; height: 20px; background: #e2e8f0; margin: 0 2px; }
.tips { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); z-index: 9; width: min(460px, calc(100% - 24px)); background: white; border: 1px solid #fed7aa; border-radius: 14px; padding: 12px 14px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
.tips ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.tips li { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.6; color: #334155; }
.tip-ico { width: 20px; height: 20px; border-radius: 6px; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; margin-top: 1px; }
.tip-ico.plus { background: #ecfdf5; color: #059669; }
.tip-ico.del { background: #fee2e2; color: #dc2626; }
.tip-ico.test { background: #eef2ff; color: #4f46e5; }
.tips-close { border: none; background: #FF6600; color: white; font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 8px; cursor: pointer; }
.panel { width: 340px; border-inline-start: 1px solid #f1f5f9; background: white; overflow-y: auto; }
.palette { padding: 16px; }
.templates-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 10px; border: 1px solid #fed7aa; background: #fff7ed; color: #c2410c; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
.templates-btn:hover { background: #ffedd5; }
.templates-card { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; margin-bottom: 16px; border: 1.5px dashed #fdba74; border-radius: 12px; background: #fffaf5; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.templates-card:hover { border-color: #FF6600; background: #fff7ed; }
.palette-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.palette-item:hover { border-color: #FF6600; box-shadow: 0 2px 8px rgba(255, 102, 0, 0.08); }
.palette-icon { width: 32px; height: 32px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.problems { margin-top: 18px; padding: 12px; border-radius: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.problem { display: block; width: 100%; text-align: start; background: none; border: none; color: #b91c1c; font-size: 12px; padding: 4px 0; cursor: pointer; text-decoration: underline; text-decoration-color: #fecaca; }
@media (max-width: 640px) {
  .templates-btn span { display: none; }
  .tb-btn.icon span { display: none; }
}
@media (max-width: 900px) {
  .workspace { flex-direction: column; }
  .panel { width: 100%; height: 45%; border-inline-start: none; border-top: 1px solid #f1f5f9; }
}
</style>
