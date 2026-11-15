<template>
  <div>
    <div v-if="categories.length" class="flex flex-wrap gap-2">
      <button
        type="button"
        class="chip"
        :class="{ on: modelValue === null }"
        @click="$emit('update:modelValue', null)"
      >
        <i class="fas fa-minus text-[10px]"></i>{{ isAr ? 'بدون تصنيف' : 'No category' }}
      </button>
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        class="chip"
        :class="{ on: modelValue === c.id }"
        :style="modelValue === c.id ? { background: colorOf(c), borderColor: colorOf(c), color: 'white' } : chipStyle(colorOf(c))"
        :title="c.description || ''"
        @click="$emit('update:modelValue', c.id)"
      >
        <i v-if="modelValue === c.id" class="fas fa-check text-[10px]"></i>
        <span v-else class="w-1.5 h-1.5 rounded-full" :style="{ background: colorOf(c) }"></span>
        {{ c.name }}
      </button>
    </div>
    <div v-else class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">
      {{ isAr ? 'لا توجد تصنيفات بعد.' : 'No categories yet.' }}
      <router-link v-if="canManage" to="/ticket-categories" class="text-[#FF6600] font-semibold">{{ isAr ? 'أضف تصنيفات' : 'Add categories' }}</router-link>
      <span v-else>{{ isAr ? 'يضيفها مدير الحساب من صفحة تصنيفات التذاكر.' : 'An admin can add them on the Ticket Categories page.' }}</span>
    </div>
    <router-link v-if="categories.length && canManage" to="/ticket-categories" class="inline-block mt-2 text-xs text-slate-400 hover:text-[#FF6600]">
      <i class="fas fa-gear me-1"></i>{{ isAr ? 'إدارة التصنيفات' : 'Manage categories' }}
    </router-link>
  </div>
</template>

<script setup>
import { categoryColor, chipStyle } from '../../utils/tickets'

defineProps({
  categories: { type: Array, default: () => [] },
  modelValue: { type: String, default: null },
  isAr: { type: Boolean, default: true },
  canManage: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])

const colorOf = (c) => categoryColor(c.name)
</script>

<style scoped>
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: white; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; transition: transform 0.1s, box-shadow 0.15s; }
.chip:hover { box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08); }
.chip.on:not([style]) { background: #334155; border-color: #334155; color: white; }
</style>
