<template>
  <div class="menu-backdrop" @mousedown.self="$emit('close')" @contextmenu.prevent="$emit('close')">
    <div ref="menuEl" class="menu" :dir="isAr ? 'rtl' : 'ltr'" :style="menuStyle" role="menu">
      <div class="menu-title">{{ title || (isAr ? 'أضف خطوة' : 'Add a step') }}</div>
      <button
        v-for="(meta, type) in types"
        :key="type"
        type="button"
        class="menu-item"
        role="menuitem"
        @click="$emit('pick', type)"
      >
        <span class="menu-icon" :style="{ background: meta.color }"><i :class="meta.icon"></i></span>
        <span class="min-w-0 flex-1 text-start">
          <span class="block font-semibold text-slate-800 text-[13px]">{{ isAr ? meta.ar : meta.en }}</span>
          <span class="block text-[11px] text-slate-500 leading-snug">{{ isAr ? meta.descAr : meta.descEn }}</span>
        </span>
      </button>
      <button v-if="showTemplates" type="button" class="menu-item tpl" @click="$emit('templates')">
        <span class="menu-icon" style="background: #FF6600"><i class="fas fa-shapes"></i></span>
        <span class="min-w-0 flex-1 text-start">
          <span class="block font-semibold text-slate-800 text-[13px]">{{ isAr ? 'نموذج جاهز كامل…' : 'A whole ready-made flow…' }}</span>
          <span class="block text-[11px] text-slate-500 leading-snug">{{ isAr ? 'يستبدل خطوات المسودة، ويمكنك التراجع' : 'Replaces the draft steps; you can undo' }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
// Small picker of step types, opened from a "+" on the canvas or the toolbar
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { FLOW_NODE_TYPES } from '../../data/flowNodes'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  isAr: { type: Boolean, default: true },
  title: { type: String, default: '' },
  showTemplates: { type: Boolean, default: false }
})
const emit = defineEmits(['pick', 'close', 'templates'])

const types = Object.fromEntries(Object.entries(FLOW_NODE_TYPES).filter(([, m]) => m.addable !== false))
const menuEl = ref(null)
const size = ref({ w: 290, h: 470 })

// Keep the menu inside the window
const menuStyle = computed(() => {
  const pad = 10
  const left = Math.min(Math.max(pad, props.x), window.innerWidth - size.value.w - pad)
  const top = Math.min(Math.max(pad, props.y), window.innerHeight - size.value.h - pad)
  return { left: `${left}px`, top: `${top}px` }
})

const onKey = (e) => { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (menuEl.value) size.value = { w: menuEl.value.offsetWidth, h: menuEl.value.offsetHeight }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.menu-backdrop { position: fixed; inset: 0; z-index: 70; }
.menu { position: fixed; width: 290px; max-height: calc(100vh - 20px); overflow-y: auto; background: white; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 14px 36px rgba(15, 23, 42, 0.18); padding: 8px; }
.menu-title { font-size: 11px; font-weight: 800; color: #94a3b8; padding: 4px 8px 6px; }
.menu-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 7px 8px; border: none; background: transparent; border-radius: 10px; cursor: pointer; }
.menu-item:hover, .menu-item:focus-visible { background: #fff7ed; outline: none; }
.menu-item.tpl { border-top: 1px solid #f1f5f9; border-radius: 0 0 10px 10px; margin-top: 4px; padding-top: 10px; }
.menu-icon { width: 30px; height: 30px; border-radius: 9px; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
</style>
