import { ref, watch } from 'vue'
import axios from 'axios'

const metaChannels = ref([])
const activeMetaChannelId = ref(localStorage.getItem('activeMetaChannelId') || null)

// Keep localStorage in sync
watch(activeMetaChannelId, (newVal) => {
  if (newVal) {
    localStorage.setItem('activeMetaChannelId', newVal)
  } else {
    localStorage.removeItem('activeMetaChannelId')
  }
})

export function useMetaChannel() {
  const fetchMetaChannels = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/v1/meta/channels', {
        headers: { Authorization: `Bearer ${token}` }
      })
      metaChannels.value = res.data.data || []
      
      // Auto-select if there's only one channel, or if the current active is invalid
      if (metaChannels.value.length > 0) {
        const activeExists = metaChannels.value.find(c => c.id === activeMetaChannelId.value)
        if (!activeExists) {
          activeMetaChannelId.value = metaChannels.value[0].id
        }
      } else {
        activeMetaChannelId.value = null
      }
    } catch (err) {
      console.error('Failed to fetch Meta channels globally', err)
    }
  }

  return {
    metaChannels,
    activeMetaChannelId,
    fetchMetaChannels
  }
}
