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
          <div class="form-row">
            <div class="form-group">
              <label>Name (AR)</label>
              <input type="text" v-model="plan.nameAr" required />
            </div>
            <div class="form-group">
              <label>Name (EN)</label>
              <input type="text" v-model="plan.nameEn" required />
            </div>
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

          <div class="form-row">
            <div class="form-group">
              <label>Sort Order</label>
              <input type="number" v-model="plan.sortOrder" required />
            </div>
            <div class="form-group" style="display:flex; flex-direction:column; gap:0.5rem; justify-content:center;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" v-model="plan.isActive" /> Show on Landing Page
              </label>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" v-model="plan.isPopular" /> Most Popular (Badge)
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Button Text (AR)</label>
              <input type="text" v-model="plan.buttonTextAr" />
            </div>
            <div class="form-group">
              <label>Button Text (EN)</label>
              <input type="text" v-model="plan.buttonTextEn" />
            </div>
          </div>

          <div class="form-group">
            <label>Features (AR - JSON Array)</label>
            <textarea v-model="plan.featuresArText" rows="3" required></textarea>
          </div>

          <div class="form-group">
            <label>Features (EN - JSON Array)</label>
            <textarea v-model="plan.featuresEnText" rows="3" required></textarea>
          </div>

          <div class="form-group">
            <label>System Features (Permissions)</label>
            <div class="features-checklist">
              <label v-for="feat in availableFeatures" :key="feat">
                <input type="checkbox" :value="feat" v-model="plan.featureFlags" /> {{ feat }}
              </label>
            </div>
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

const availableFeatures = ['TEMPLATES', 'API_ACCESS', 'AUTO_RESPONDER', 'BULK_CAMPAIGN', 'EXCEL_EXPORT', 'META_API']

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
      featuresArText: typeof p.featuresAr === 'string' ? p.featuresAr : JSON.stringify(p.featuresAr || [], null, 2),
      featuresEnText: typeof p.featuresEn === 'string' ? p.featuresEn : JSON.stringify(p.featuresEn || [], null, 2),
      featureFlags: Array.isArray(p.featureFlags) ? p.featureFlags : (typeof p.featureFlags === 'string' ? JSON.parse(p.featureFlags || '[]') : []),
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
    try {
      if (!Array.isArray(JSON.parse(plan.featuresArText))) throw new Error('Not an array')
      if (!Array.isArray(JSON.parse(plan.featuresEnText))) throw new Error('Not an array')
    } catch (e) {
      alert('Features must be valid JSON arrays.')
      plan.saving = false
      return
    }

    const token = localStorage.getItem('admin_token')
    await axios.put(`/api/plans/${plan.id}`, {
      name: plan.nameEn, // fallback
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      price: plan.price,
      limit: plan.limit,
      features: plan.featuresEnText, // fallback
      featuresAr: plan.featuresArText,
      featuresEn: plan.featuresEnText,
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      buttonTextAr: plan.buttonTextAr,
      buttonTextEn: plan.buttonTextEn,
      featureFlags: plan.featureFlags
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

.features-checklist {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}

.features-checklist label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #334155;
  font-size: 0.8rem;
}
</style>
