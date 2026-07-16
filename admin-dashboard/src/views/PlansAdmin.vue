<template>
  <div class="plans-admin">
    <div class="header-section">
      <h2>Subscription Plans</h2>
      <p>Manage the features, pricing, and limits of the 5 main tiers.</p>
    </div>

    <div v-if="loading" class="loading-state">Loading plans...</div>

    <div class="plans-grid" v-else>
      <div v-for="plan in plans" :key="plan.id" class="plan-card">
        <div class="plan-header">
          <span class="plan-code">{{ plan.planCode }}</span>
          <h3>{{ plan.name }}</h3>
        </div>

        <form @submit.prevent="updatePlan(plan)" class="plan-form">
          <div class="form-group">
            <label>Public Name</label>
            <input type="text" v-model="plan.name" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Price ($)</label>
              <input type="number" v-model="plan.price" required min="0" step="1" />
            </div>
            <div class="form-group">
              <label>Message Limit</label>
              <input type="number" v-model="plan.limit" required min="0" />
            </div>
          </div>

          <div class="form-group">
            <label>Features (JSON Array)</label>
            <textarea v-model="plan.featuresText" rows="4" placeholder='["Feature 1", "Feature 2"]' required></textarea>
            <small>Must be a valid JSON array of strings.</small>
          </div>

          <div class="actions">
            <button type="submit" class="btn-primary" :disabled="plan.saving">
              {{ plan.saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const plans = ref([])
const loading = ref(true)

const fetchPlans = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    // We can use the public endpoint or create an admin one, but since they are the same table, we use the public or admin one.
    // Wait, the routes we created: /api/plans/ (GET is public) and /api/plans/:id (PUT is admin)
    const res = await axios.get('/api/plans', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    plans.value = res.data.data.map(p => ({
      ...p,
      featuresText: typeof p.features === 'string' ? p.features : JSON.stringify(p.features, null, 2),
      saving: false
    }))
  } catch (err) {
    console.error('Failed to load plans:', err)
  } finally {
    loading.value = false
  }
}

const updatePlan = async (plan) => {
  try {
    plan.saving = true
    // Validate JSON
    let parsedFeatures
    try {
      parsedFeatures = JSON.parse(plan.featuresText)
      if (!Array.isArray(parsedFeatures)) throw new Error('Not an array')
    } catch (e) {
      alert('Features must be a valid JSON array like: ["Feature 1", "Feature 2"]')
      plan.saving = false
      return
    }

    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/plans/${plan.id}`, {
      name: plan.name,
      price: plan.price,
      limit: plan.limit,
      features: plan.featuresText
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    alert(`Plan ${plan.planCode} updated successfully!`)
  } catch (err) {
    console.error('Failed to update plan:', err)
    alert('Failed to update plan')
  } finally {
    plan.saving = false
  }
}

onMounted(() => {
  fetchPlans()
})
</script>

<style scoped>
.plans-admin { padding: 2rem; }
.header-section { margin-bottom: 2rem; }
.header-section h2 { margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.8rem; }
.header-section p { margin: 0; color: #64748b; }

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.plan-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.plan-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.plan-code {
  font-size: 0.75rem;
  font-weight: 700;
  background: #e0f2fe;
  color: #0284c7;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  text-transform: uppercase;
}

.plan-header h3 {
  margin: 0.75rem 0 0 0;
  color: #0f172a;
  font-size: 1.25rem;
}

.plan-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.form-group input, .form-group textarea {
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.actions {
  margin-top: 1rem;
  text-align: right;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
