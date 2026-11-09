<template>
  <div class="tpl-overlay" @click.self="$emit('close')">
    <div class="tpl-modal" :dir="isAr ? 'rtl' : 'ltr'" role="dialog" aria-modal="true">
      <header class="tpl-head">
        <div class="min-w-0">
          <h2 class="font-bold text-slate-800 text-lg">{{ isAr ? 'نماذج جاهزة' : 'Ready-made flows' }}</h2>
          <p class="text-sm text-slate-500 mt-0.5">
            {{ isAr
              ? 'اختر النموذج الأقرب لما تريد، ثم عدّل النصوص. لا يصل شيء للعملاء حتى تنشر.'
              : 'Pick the one closest to what you want, then edit the texts. Nothing reaches customers until you publish.' }}
          </p>
        </div>
        <button type="button" class="close" @click="$emit('close')" :title="isAr ? 'إغلاق' : 'Close'"><i class="fas fa-xmark"></i></button>
      </header>

      <div class="tpl-body">
        <nav class="tpl-list">
          <button
            v-for="tpl in FLOW_TEMPLATES"
            :key="tpl.key"
            type="button"
            class="tpl-card"
            :class="{ active: tpl.key === activeKey }"
            :style="{ '--accent': tpl.color }"
            @click="activeKey = tpl.key"
          >
            <span class="tpl-icon"><i :class="tpl.icon"></i></span>
            <span class="min-w-0 flex-1 text-start">
              <span class="block font-semibold text-sm text-slate-800">{{ isAr ? tpl.nameAr : tpl.nameEn }}</span>
              <span v-if="tpl.key === 'menu'" class="tag tag-green">{{ isAr ? 'ابدأ به' : 'Start here' }}</span>
              <span v-if="tpl.needsAi" class="tag tag-indigo"><i class="fas fa-robot"></i> {{ isAr ? 'موظف ذكي' : 'AI agent' }}</span>
              <span v-if="tpl.usesStage" class="tag tag-pink"><i class="fas fa-tag"></i> {{ isAr ? 'وسوم ومراحل' : 'Tags & stages' }}</span>
            </span>
          </button>
        </nav>

        <section class="tpl-detail">
          <h3 class="font-bold text-slate-800 text-base flex items-center gap-2">
            <i :class="active.icon" :style="{ color: active.color }"></i>{{ isAr ? active.nameAr : active.nameEn }}
          </h3>
          <p class="text-sm text-slate-600 mt-1 leading-relaxed">{{ isAr ? active.pickAr : active.pickEn }}</p>

          <div v-if="active.needsAi && aiReady === false" class="note warn">
            <i class="fas fa-triangle-exclamation"></i>
            <span>
              {{ isAr ? 'يحتاج مفتاح Gemini ومعلومات نشاطك قبل النشر.' : 'Needs a Gemini key and your business info before publishing.' }}
              <router-link to="/ai-agent" class="font-bold underline">{{ isAr ? 'صفحة الموظف الذكي' : 'AI agent page' }}</router-link>
            </span>
          </div>
          <div v-if="active.usesStage && !stagesEnabled" class="note info">
            <i class="fas fa-circle-info"></i>
            <span>{{ isAr ? 'مراحل العميل غير مفعّلة عندك، فسنضيف الوسوم فقط بدون خطوة المرحلة.' : 'Customer stages are off for you, so we add the tags only, without the stage step.' }}</span>
          </div>

          <div class="tpl-grid">
            <div>
              <div class="sec-title"><i class="fas fa-diagram-project"></i> {{ isAr ? 'كيف يمشي السير' : 'How the flow goes' }}</div>
              <ol class="flow-outline">
                <li v-for="(line, i) in outline" :key="i" :class="{ nested: line.depth > 0 }" :style="{ marginInlineStart: `${Math.max(0, line.depth - 1) * 16}px` }">
                  <div v-if="line.branch" class="branch">↳ {{ line.branch }}</div>
                  <div class="step" :class="{ repeat: line.repeat }">
                    <span class="step-icon" :style="{ background: typeMeta(line.type).color }"><i :class="typeMeta(line.type).icon"></i></span>
                    <span class="min-w-0">
                      <span class="step-type">{{ isAr ? typeMeta(line.type).ar : typeMeta(line.type).en }}</span>
                      <span class="step-text">{{ line.text }}<span v-if="line.repeat" class="repeat-note">{{ isAr ? '(نفس الخطوة أعلاه)' : '(same step as above)' }}</span></span>
                    </span>
                  </div>
                </li>
              </ol>
            </div>

            <div>
              <div class="sec-title"><i class="fab fa-whatsapp"></i> {{ isAr ? 'ماذا يرى العميل' : 'What the customer sees' }}</div>
              <div class="phone">
                <template v-for="(m, i) in active.demo" :key="i">
                  <div v-if="m.from === 'system'" class="sys">{{ isAr ? m.ar : m.en }}</div>
                  <div v-else class="msg" :class="m.from">
                    <div class="bubble">
                      <span v-if="m.ai" class="ai-label"><i class="fas fa-robot"></i> {{ isAr ? 'رد الموظف الذكي' : 'AI agent reply' }}</span>
                      <i v-if="m.tap" class="fas fa-hand-pointer tap"></i>{{ isAr ? m.ar : m.en }}
                    </div>
                    <div v-for="b in m.buttons || []" :key="b[0]" class="wa-btn">{{ isAr ? b[0] : b[1] }}</div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="sec-title mt-4"><i class="fas fa-pen"></i> {{ isAr ? 'بعد اختياره' : 'After you pick it' }}</div>
          <ul class="after">
            <li v-for="tip in (isAr ? active.afterAr : active.afterEn)" :key="tip">{{ tip }}</li>
            <li>{{ isAr ? 'اضغط «نشر التغييرات» ثم فعّل السير.' : 'Press "Publish", then turn the flow on.' }}</li>
          </ul>
        </section>
      </div>

      <footer class="tpl-foot">
        <button type="button" class="ghost" @click="$emit('close')">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
        <button type="button" class="use" :disabled="busy" @click="$emit('use', active)">
          <i class="fas" :class="busy ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ isAr ? 'استخدم هذا النموذج' : 'Use this flow' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { FLOW_NODE_TYPES } from '../../data/flowNodes'
import { FLOW_TEMPLATES, outlineOf } from '../../data/flowTemplates'

const props = defineProps({
  isAr: { type: Boolean, default: true },
  aiReady: { default: null }, // true / false, or null while unknown
  stagesEnabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'use'])

const activeKey = ref(FLOW_TEMPLATES[0].key)
const active = computed(() => FLOW_TEMPLATES.find(t => t.key === activeKey.value))
const typeMeta = (type) => FLOW_NODE_TYPES[type] || FLOW_NODE_TYPES.message

// Preview with placeholder ids so tag and stage names show in the outline
const outline = computed(() => {
  const tpl = active.value
  const names = { 'tpl-stage': props.isAr ? 'عميل مهتم' : 'Interested' }
  const tagIds = {}
  for (const tag of tpl.tags || []) {
    tagIds[tag.key] = `tpl-${tag.key}`
    names[`tpl-${tag.key}`] = props.isAr ? tag.ar : tag.en
  }
  const g = tpl.build({ isAr: props.isAr, inactivityHours: 24, tagIds, stageId: tpl.usesStage && props.stagesEnabled ? 'tpl-stage' : '' })
  return outlineOf(g, props.isAr, names)
})

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.tpl-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
.tpl-modal { background: white; border-radius: 18px; width: 100%; max-width: 1040px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25); }
.tpl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
.close { width: 34px; height: 34px; border-radius: 10px; border: none; background: #f8fafc; color: #64748b; cursor: pointer; flex-shrink: 0; }
.tpl-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 270px minmax(0, 1fr); }
.tpl-list { padding: 14px; border-inline-end: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; background: #fafbfc; }
.tpl-card { display: flex; align-items: flex-start; gap: 10px; padding: 11px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
.tpl-card:hover { border-color: color-mix(in srgb, var(--accent) 50%, #e2e8f0); }
.tpl-card.active { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.tpl-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: color-mix(in srgb, var(--accent) 14%, white); color: var(--accent); font-size: 13px; }
.tag { display: inline-flex; align-items: center; gap: 4px; margin-top: 5px; margin-inline-end: 4px; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
.tag i { font-size: 9px; }
.tag-green { background: #ecfdf5; color: #047857; }
.tag-indigo { background: #eef2ff; color: #4338ca; }
.tag-pink { background: #fdf2f8; color: #be185d; }
.tpl-detail { padding: 18px 22px; overflow-y: auto; }
.note { display: flex; gap: 8px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 1.6; }
.note.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.note.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
.note i { margin-top: 3px; }
.tpl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; margin-top: 16px; }
.sec-title { font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.sec-title i { color: #94a3b8; }
.flow-outline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.flow-outline li.nested { border-inline-start: 2px solid #e2e8f0; padding-inline-start: 10px; }
.branch { font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 3px; }
.step { display: flex; gap: 8px; align-items: flex-start; padding: 7px 9px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; }
.step.repeat { border-style: dashed; opacity: 0.75; }
.step-icon { width: 24px; height: 24px; border-radius: 7px; color: white; display: flex; align-items: center; justify-content: center; font-size: 10.5px; flex-shrink: 0; }
.step-type { display: block; font-size: 11px; font-weight: 800; color: #0f172a; }
.repeat-note { margin-inline-start: 4px; color: #94a3b8; }
.step-text { display: block; font-size: 12px; color: #475569; line-height: 1.5; }
.phone { background: #efeae2; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.sys { align-self: center; background: #fff7d6; color: #6b5a14; font-size: 11px; padding: 3px 10px; border-radius: 8px; text-align: center; }
.msg { display: flex; flex-direction: column; gap: 3px; max-width: 88%; }
.msg.bot { align-self: flex-start; }
.msg.customer { align-self: flex-end; }
.bubble { padding: 7px 10px; border-radius: 10px; font-size: 12.5px; line-height: 1.55; color: #111827; white-space: pre-line; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); }
.msg.bot .bubble { background: white; }
.msg.customer .bubble { background: #d9fdd3; }
.ai-label { display: block; font-size: 10.5px; font-weight: 700; color: #4f46e5; margin-bottom: 2px; }
.tap { color: #059669; margin-inline-end: 5px; font-size: 11px; }
.wa-btn { background: white; border-radius: 10px; padding: 6px 10px; font-size: 12px; color: #0a7cff; font-weight: 600; text-align: center; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06); }
.after { margin: 0; padding-inline-start: 20px; font-size: 13px; color: #334155; line-height: 1.8; list-style: decimal; }
.tpl-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 22px; border-top: 1px solid #f1f5f9; }
.ghost { padding: 9px 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; }
.use { padding: 9px 18px; border-radius: 10px; border: none; background: #FF6600; color: white; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.use:disabled { opacity: 0.6; }
@media (max-width: 860px) {
  .tpl-overlay { padding: 8px; }
  .tpl-head { padding: 14px 16px; }
  .tpl-body { display: block; overflow-y: auto; }
  .tpl-list { flex-direction: row; overflow-x: auto; border-inline-end: none; border-bottom: 1px solid #f1f5f9; }
  .tpl-card { min-width: 210px; }
  .tpl-detail { overflow: visible; }
  .tpl-detail { padding: 16px; }
  .tpl-grid { grid-template-columns: minmax(0, 1fr); }
  .tpl-foot { padding: 12px 16px; }
}
</style>
