<!--
  Wakeel's status with Meta: Tech Provider on the WhatsApp Business Platform (App Review approved
  2026-11-26). Text only, on purpose: Meta's logo needs Meta's written approval, and the "Meta Business
  Partner" badge is reserved for Meta Business Partners (the Tech Partner tier). Same wording as wakeel.cc.
-->
<template>
  <div class="tp-badge">
    <i class="fas fa-certificate" aria-hidden="true"></i>
    <span>{{ isAr ? 'مزوّد تقني معتمد لدى Meta · منصة واتساب للأعمال' : 'Meta Tech Provider · WhatsApp Business Platform' }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
</script>

<style scoped>
.tp-badge { display: inline-flex; align-items: center; gap: 8px; padding: 7px 16px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); color: #E2E8F0; font-size: 0.85rem; font-weight: 600; line-height: 1.4; }
.tp-badge i { color: #34D399; }
</style>
