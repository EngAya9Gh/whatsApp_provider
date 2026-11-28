<!--
  Wakeel's status with Meta: Tech Provider on the WhatsApp Business Platform (App Review approved
  2026-11-26). Same wording as wakeel.cc. variant "chip": a pill (hero, footer, login);
  "card": Meta's mark above the text, for the floating card beside the product (Landing hero); on phones a
  compact card with a light sweeping across it.
-->
<template>
  <div v-if="variant === 'card'" class="tp-card">
    <MetaVerifiedMark :height="34" />
    <span>
      <b>{{ text.title }}</b>
      <small>{{ text.sub }}</small>
    </span>
  </div>
  <div v-else class="tp-badge">
    <MetaVerifiedMark :height="18" />
    <span class="tp-text"><strong>{{ text.title }}</strong><span class="tp-sub">{{ text.sub }}</span></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MetaVerifiedMark from './MetaVerifiedMark.vue'

defineProps({ variant: { type: String, default: 'chip' } })
const { locale } = useI18n()
const text = computed(() => (locale.value === 'ar'
  ? { title: 'مزوّد تقني معتمد من Meta', sub: 'منصة واتساب للأعمال' }
  : { title: 'Approved Meta Tech Provider', sub: 'WhatsApp Business Platform' }))
</script>

<style scoped>
.tp-badge { display: inline-flex; align-items: center; gap: 12px; padding: 7px 18px 7px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.16); color: #E2E8F0; font-size: 0.85rem; font-weight: 600; line-height: 1.4; }
.tp-badge strong { color: #FFF; font-weight: 800; }
.tp-sub { opacity: 0.75; }
.tp-sub::before { content: '\00a0·\00a0'; }

.tp-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 22px 14px; border-radius: 18px; text-align: center; white-space: nowrap; background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(8, 102, 255, 0.18); box-shadow: 0 24px 48px -16px rgba(8, 102, 255, 0.45); }
.tp-card b { display: block; color: #0B1F3A; font-size: 0.9rem; font-weight: 800; }
.tp-card small { display: block; color: #64748B; font-size: 0.75rem; font-weight: 600; }

@keyframes tp-shine { 0%, 55% { transform: translateX(-130%); } 85%, 100% { transform: translateX(130%); } }

@media (max-width: 600px) {
  .tp-card { flex-direction: row; gap: 10px; padding-block: 9px; padding-inline: 12px 16px; border-radius: 16px; text-align: start; overflow: hidden; box-shadow: 0 14px 34px -10px rgba(8, 102, 255, 0.6), 0 0 0 4px rgba(8, 102, 255, 0.1); }
  .tp-card > :first-child { zoom: 0.74; }
  .tp-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.8) 50%, transparent 65%); transform: translateX(-130%); animation: tp-shine 4.5s ease-in-out 1s infinite; pointer-events: none; }
  .tp-card b { font-size: 0.8rem; }
  .tp-card small { font-size: 0.68rem; }
}
/* Narrow phones: the chip's second line goes under the title instead of wrapping mid-phrase */
@media (max-width: 480px) {
  .tp-text { display: flex; flex-direction: column; text-align: start; }
  .tp-sub::before { content: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tp-card::after { animation: none; }
}
</style>
