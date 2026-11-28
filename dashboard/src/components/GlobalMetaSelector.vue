<!--
  The WhatsApp (Meta Cloud) number the Meta pages work on, at the top of the sidebar. The owner and ADMIN
  employees get every number and switch here; other employees get only their numbers (assigned number and
  team numbers, enforced by the server in channels/channel.access).
-->
<template>
  <div v-if="metaChannels.length" class="active-number" :class="{ multi: metaChannels.length > 1 }">
    <div class="an-head">
      <span class="an-label">{{ isAr ? 'رقم واتساب النشط' : 'Active WhatsApp number' }}</span>
      <span v-if="metaChannels.length > 1" class="an-count">{{ isAr ? `${metaChannels.length} أرقام` : `${metaChannels.length} numbers` }}</span>
    </div>

    <label class="an-box">
      <span class="an-icon">
        <i class="fab fa-whatsapp"></i>
        <span class="an-dot" :class="statusOf(activeChannel).tone"></span>
      </span>
      <span class="an-text">
        <b>{{ numberOf(activeChannel) }}</b>
        <small>{{ activeChannel?.name || 'Cloud API' }} · {{ statusOf(activeChannel).label }}</small>
      </span>
      <template v-if="metaChannels.length > 1">
        <i class="fas fa-chevron-down an-chevron"></i>
        <select v-model="activeMetaChannelId" class="an-select" :aria-label="isAr ? 'تبديل الرقم' : 'Switch number'">
          <option v-for="c in metaChannels" :key="c.id" :value="c.id">
            {{ numberOf(c) }} — {{ c.name || 'Cloud API' }}
          </option>
        </select>
      </template>
    </label>
  </div>

  <router-link v-else-if="loaded && canConnect" to="/connect-meta" class="active-number an-empty">
    <span class="an-icon muted"><i class="fab fa-whatsapp"></i></span>
    <span class="an-text">
      <b>{{ isAr ? 'لا يوجد رقم واتساب' : 'No WhatsApp number' }}</b>
      <small>{{ isAr ? 'اربط رقمك الآن' : 'Connect your number' }}</small>
    </span>
  </router-link>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMetaChannel } from '../composables/useMetaChannel'

defineProps({ canConnect: { type: Boolean, default: false } })

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const { metaChannels, activeMetaChannelId, fetchMetaChannels } = useMetaChannel()
const loaded = ref(false)

const activeChannel = computed(() => metaChannels.value.find(c => c.id === activeMetaChannelId.value) || metaChannels.value[0] || null)

const numberOf = (c) => c?.displayPhoneNumber || c?.phoneNumber || '—'

function statusOf(c) {
  const s = String(c?.status || '').toUpperCase()
  if (s === 'CONNECTED') return { tone: 'ok', label: isAr.value ? 'متصل' : 'Connected' }
  if (s === 'PENDING' || s === 'CONNECTING') return { tone: 'wait', label: isAr.value ? 'قيد الربط' : 'Connecting' }
  return { tone: 'bad', label: isAr.value ? 'غير متصل' : 'Disconnected' }
}

onMounted(async () => {
  await fetchMetaChannels()
  loaded.value = true
})
</script>

<style scoped>
.active-number { display: block; margin: 0.9rem 0.75rem 0.35rem; text-decoration: none; }
.an-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.45rem; padding-inline: 0.15rem; }
.an-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748B; }
.an-count { font-size: 0.66rem; font-weight: 700; color: #4ADE80; background: rgba(37, 211, 102, 0.12); padding: 0.1rem 0.45rem; border-radius: 999px; }

.an-box { position: relative; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.65rem; border-radius: 14px; background: linear-gradient(135deg, rgba(37, 211, 102, 0.14), rgba(37, 211, 102, 0.04)); border: 1px solid rgba(37, 211, 102, 0.28); transition: border-color 0.15s, background 0.15s; }
.multi .an-box { cursor: pointer; }
.multi .an-box:hover, .multi .an-box:focus-within { border-color: rgba(37, 211, 102, 0.6); background: linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(37, 211, 102, 0.06)); }

.an-icon { position: relative; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; background: #25D366; color: #fff; font-size: 1.1rem; box-shadow: 0 6px 16px -6px rgba(37, 211, 102, 0.7); }
.an-icon.muted { background: rgba(255, 255, 255, 0.08); color: #94A3B8; box-shadow: none; }
.an-dot { position: absolute; bottom: -2px; inset-inline-end: -2px; width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--brand-darker, #0B1120); background: #94A3B8; }
.an-dot.ok { background: #22C55E; }
.an-dot.wait { background: #F59E0B; }
.an-dot.bad { background: #EF4444; }

.an-text { flex: 1; min-width: 0; display: flex; flex-direction: column; text-align: start; }
/* The number reads left to right in both languages, so a long one is cut at its end, never its start */
.an-text b { color: #F8FAFC; font-size: 0.86rem; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; direction: ltr; text-align: left; }
:global(.rtl-mode) .an-text b { text-align: right; }
.an-text small { color: #94A3B8; font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-chevron { color: #94A3B8; font-size: 0.7rem; flex-shrink: 0; }
/* The native select covers the card: one tap opens the phone's / browser's own number list */
.an-select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 16px; }

.an-empty { display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0.75rem; border-radius: 14px; border: 1px dashed rgba(255, 255, 255, 0.18); transition: border-color 0.15s; }
.an-empty:hover { border-color: rgba(37, 211, 102, 0.6); }
.an-empty small { color: #4ADE80; }
</style>
