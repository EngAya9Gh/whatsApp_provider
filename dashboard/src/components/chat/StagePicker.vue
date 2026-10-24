<template>
  <div class="relative" ref="root">
    <button
      type="button"
      @click="open = !open"
      :disabled="disabled"
      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
      :class="current ? '' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'"
      :style="current ? chipStyle(current.color) : {}"
      :title="isAr ? 'مرحلة العميل' : 'Customer stage'"
    >
      <i class="fas fa-route opacity-70"></i>
      <span v-if="current" class="w-2 h-2 rounded-full" :style="{ background: current.color }"></span>
      <span>{{ current ? current.name : (isAr ? 'بدون مرحلة' : 'No stage') }}</span>
      <i class="fas fa-chevron-down text-[10px] opacity-60"></i>
    </button>

    <div v-if="open" class="absolute start-0 top-full z-40 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
      <template v-for="group in groups" :key="group.key">
        <div v-if="group.stages.length" class="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          <i :class="group.icon"></i>{{ group.label }}
        </div>
        <button
          v-for="stage in group.stages"
          :key="stage.id"
          type="button"
          @click="select(stage.id)"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-start bg-transparent border-none cursor-pointer"
        >
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: stage.color }"></span>
          <span class="flex-1">{{ stage.name }}</span>
          <i v-if="stage.id === modelValue" class="fas fa-check text-[#FF6600] text-xs"></i>
        </button>
      </template>
      <template v-if="modelValue">
        <div class="border-t border-slate-100 my-1"></div>
        <button
          type="button"
          @click="select(null)"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-start bg-transparent border-none cursor-pointer"
        >
          <i class="fas fa-xmark w-2.5"></i>
          <span>{{ isAr ? 'إزالة من المسار' : 'Remove from path' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  stages: { type: Array, default: () => [] },
  modelValue: { type: String, default: null },
  isAr: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['change'])

const open = ref(false)
const root = ref(null)

const current = computed(() => props.stages.find(s => s.id === props.modelValue) || null)

const groups = computed(() => [
  { key: 'MAIN', icon: 'fas fa-route', label: props.isAr ? 'المسار الرئيسي' : 'Main path', stages: props.stages.filter(s => s.group === 'MAIN') },
  { key: 'LOST', icon: 'fas fa-code-branch', label: props.isAr ? 'مسار الخسارة' : 'Loss path', stages: props.stages.filter(s => s.group === 'LOST') }
])

const chipStyle = (color) => ({
  background: `${color}1a`,
  borderColor: `${color}40`,
  color: `color-mix(in srgb, ${color} 70%, #0f172a)`
})

const select = (stageId) => {
  open.value = false
  if (stageId !== props.modelValue) emit('change', stageId)
}

const onClickOutside = (e) => {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>
