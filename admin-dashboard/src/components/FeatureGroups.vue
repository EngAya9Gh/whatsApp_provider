<template>
  <div class="fg">
    <section v-for="g in FEATURE_GROUPS" :key="g.key" class="fg-card" :class="{ 'fg-off': state(g) === 'none' }">
      <header class="fg-head">
        <label class="fg-master">
          <input
            type="checkbox"
            :checked="state(g) === 'all'"
            :indeterminate="state(g) === 'some'"
            @change="toggleGroup(g)"
          />
          <span class="fg-title">{{ g.title }}</span>
          <span class="fg-badge">{{ g.badge }}</span>
        </label>
        <span class="fg-count" :class="'is-' + state(g)">{{ count(g) }}/{{ g.features.length }}</span>
      </header>
      <p class="fg-desc">{{ g.description }}</p>

      <ul class="fg-list">
        <li v-for="f in g.features" :key="f.key">
          <label class="fg-item">
            <input type="checkbox" :checked="has(f.key)" @change="toggle(f.key, $event.target.checked)" />
            <span class="fg-text">
              <span class="fg-label">{{ f.label }}</span>
              <span class="fg-hint">{{ f.hint }}</span>
            </span>
            <span v-if="differsFromPlan(f.key)" class="fg-custom" title="Different from the plan">Custom</span>
          </label>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FEATURE_GROUPS, ALL_FEATURE_KEYS } from '../utils/featureCatalog'

// modelValue: the features that are ON (an array of keys). Keys this component does not know are kept as they are.
// planDefault: when given (tenant screen), features that differ from the plan are marked "Custom".
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  planDefault: { type: Array, default: null }
})
const emit = defineEmits(['update:modelValue'])

const on = computed(() => new Set(Array.isArray(props.modelValue) ? props.modelValue : []))
const has = (key) => on.value.has(key)
const count = (g) => g.features.filter(f => has(f.key)).length
const state = (g) => {
  const n = count(g)
  return n === 0 ? 'none' : n === g.features.length ? 'all' : 'some'
}
const differsFromPlan = (key) => !!props.planDefault && props.planDefault.includes(key) !== has(key)

const publish = (next) => {
  const known = new Set(ALL_FEATURE_KEYS)
  const kept = (Array.isArray(props.modelValue) ? props.modelValue : []).filter(k => !known.has(k))
  emit('update:modelValue', [...kept, ...ALL_FEATURE_KEYS.filter(k => next.has(k))])
}

const toggle = (key, checked) => {
  const next = new Set(on.value)
  if (checked) next.add(key); else next.delete(key)
  publish(next)
}

// Ticking a section turns on everything in it, unticking turns everything off; a partly-ticked section is completed first.
const toggleGroup = (g) => {
  const next = new Set(on.value)
  const turnOn = state(g) !== 'all'
  g.features.forEach(f => (turnOn ? next.add(f.key) : next.delete(f.key)))
  publish(next)
}
</script>

<style scoped>
.fg { display: grid; grid-template-columns: 1fr; gap: 12px; }
.fg-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; transition: opacity .15s, border-color .15s; }
.fg-card.fg-off { background: #f8fafc; }
.fg-card.fg-off .fg-desc { opacity: .7; }
.fg-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.fg-master { display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 800; color: #0f172a; font-size: 15px; }
.fg-master input, .fg-item input { width: 18px; height: 18px; accent-color: #f97316; cursor: pointer; flex: none; }
.fg-badge { font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 999px; padding: 1px 8px; }
.fg-count { font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; background: #f1f5f9; color: #64748b; }
.fg-count.is-all { background: #dcfce7; color: #166534; }
.fg-count.is-some { background: #ffedd5; color: #9a3412; }
.fg-desc { margin: 4px 0 10px 28px; font-size: 12.5px; color: #64748b; }
.fg-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: 2px; border-top: 1px solid #f1f5f9; padding-top: 6px; }
.fg-item { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; cursor: pointer; }
.fg-item:hover { background: #f8fafc; }
.fg-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.fg-label { font-size: 13.5px; font-weight: 600; color: #1e293b; }
.fg-hint { font-size: 11.5px; color: #94a3b8; }
.fg-custom { font-size: 10.5px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; color: #c2410c; background: #ffedd5; border-radius: 6px; padding: 2px 7px; flex: none; }
@media (min-width: 720px) { .fg-list { grid-template-columns: 1fr 1fr; column-gap: 12px; } }
</style>
