<template>
  <div class="relative" ref="root">
    <button
      type="button"
      @click="open = !open"
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-[#FF6600] hover:text-[#FF6600] bg-white transition-colors cursor-pointer"
      :title="isAr ? 'إضافة وسم' : 'Add tag'"
    >
      <i class="fas fa-tag"></i>
      <span>{{ isAr ? 'وسم' : 'Tag' }}</span>
      <i class="fas fa-plus text-[10px]"></i>
    </button>

    <div v-if="open" class="absolute start-0 top-full z-40 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
      <div v-if="tags.length === 0" class="px-3 py-3 text-xs text-slate-400 text-center">
        {{ isAr ? 'لا توجد وسوم بعد' : 'No tags yet' }}
      </div>
      <div v-else class="max-h-64 overflow-y-auto">
        <label
          v-for="tag in tags"
          :key="tag.id"
          class="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <input type="checkbox" :checked="modelValue.includes(tag.id)" @change="toggle(tag.id)" class="accent-[#FF6600]" />
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: tag.color }"></span>
          <span class="flex-1">{{ tag.name }}</span>
        </label>
      </div>
      <template v-if="canManage">
        <div class="border-t border-slate-100 my-1"></div>
        <router-link to="/inbox-settings" class="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#FF6600] hover:bg-orange-50 no-underline">
          <i class="fas fa-gear"></i>{{ isAr ? 'إدارة الوسوم' : 'Manage tags' }}
        </router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  tags: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  isAr: { type: Boolean, default: true },
  canManage: { type: Boolean, default: false }
})
const emit = defineEmits(['change'])

const open = ref(false)
const root = ref(null)

const toggle = (tagId) => {
  const next = props.modelValue.includes(tagId)
    ? props.modelValue.filter(id => id !== tagId)
    : [...props.modelValue, tagId]
  emit('change', next)
}

const onClickOutside = (e) => {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>
