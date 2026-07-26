<template>
  <div class="global-meta-selector" v-if="metaChannels.length > 0">
    <div class="selector-header">
      <span class="selector-title">Active Meta Channel</span>
    </div>
    
    <div class="selector-container">
      <select v-model="activeMetaChannelId" class="channel-dropdown">
        <option v-for="channel in metaChannels" :key="channel.id" :value="channel.id">
          {{ channel.displayPhoneNumber || channel.phoneNumber }} ({{ channel.name || 'Cloud' }})
        </option>
      </select>
      
      <div v-if="activeChannel" class="channel-status" :class="(activeChannel.status || 'disconnected').toLowerCase()">
        <span class="status-dot"></span>
        {{ activeChannel.status || 'Disconnected' }}
      </div>
    </div>
  </div>
  <div class="global-meta-selector empty-state" v-else-if="loading === false">
    <div class="selector-title">No Meta Channels</div>
    <router-link to="/connect" class="add-channel-link">Connect a Channel</router-link>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMetaChannel } from '../composables/useMetaChannel'

const { metaChannels, activeMetaChannelId, fetchMetaChannels } = useMetaChannel()
const loading = ref(true)

const activeChannel = computed(() => {
  return metaChannels.value.find(c => c.id === activeMetaChannelId.value) || null
})

onMounted(async () => {
  await fetchMetaChannels()
  loading.value = false
})
</script>

<style scoped>
.global-meta-selector {
  margin: 0.5rem 0.75rem 1rem 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.selector-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: #10B981; /* Emerald */
}

.selector-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.channel-dropdown {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 8px;
  padding: 0.5rem;
  font-size: 0.8rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none; /* Hide default arrow */
  background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');
  background-repeat: no-repeat;
  background-position-x: 100%;
  background-position-y: 50%;
}

.channel-dropdown option {
  background: #1E293B;
  color: white;
}

.channel-status {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  width: fit-content;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  background: #94A3B8;
}

.channel-status.connected { color: #10B981; }
.channel-status.connected .status-dot { background: #10B981; box-shadow: 0 0 4px #10B981; }

.channel-status.disconnected { color: #EF4444; }
.channel-status.disconnected .status-dot { background: #EF4444; }

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.add-channel-link {
  font-size: 0.75rem;
  color: #38BDF8;
  text-decoration: none;
  font-weight: 600;
}
.add-channel-link:hover {
  text-decoration: underline;
}
</style>
