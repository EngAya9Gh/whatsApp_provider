<template>
  <div v-if="!hasFeature" class="feature-lock-overlay">
    <div class="lock-content">
      <div class="lock-icon">🔒</div>
      <h3>Premium Feature</h3>
      <p>This feature requires the <strong>{{ requiredPlan }}</strong> plan.</p>
      <button class="upgrade-btn" @click="upgradePlan">Upgrade Plan</button>
    </div>
  </div>
  <div v-else class="feature-content">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  feature: {
    type: String,
    required: true
  },
  requiredPlan: {
    type: String,
    default: 'PRO'
  }
})

const hasFeature = computed(() => {
  try {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}')
    if (!tenant.allowedFeatures) return true; // fallback
    return tenant.allowedFeatures.includes(props.feature)
  } catch (e) {
    return false
  }
})

const upgradePlan = () => {
  window.open('https://wakeel.cc', '_blank')
}
</script>

<style scoped>
.feature-content {
  position: relative;
}

.feature-lock-overlay {
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(4px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  margin: 1rem 0;
  min-height: 300px;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.lock-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.lock-content h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 700;
}

.lock-content p {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
}

.upgrade-btn {
  background: #ff6600;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.2);
}

.upgrade-btn:hover {
  background: #e65c00;
  transform: translateY(-1px);
}
</style>
