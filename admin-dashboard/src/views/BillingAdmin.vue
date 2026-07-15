<template>
  <div class="billing-admin-page">
    <div class="page-header">
      <div>
        <h1>Billing & Revenue</h1>
        <p class="subtitle">Platform-wide billing statistics</p>
      </div>
    </div>

    <div class="panel">
      <div class="empty-state">
        <span class="icon">🚧</span>
        <h3>Under Construction</h3>
        <p>The comprehensive billing and invoice management system is currently being developed.</p>
        <p>Check the Overview page for high-level statistics in the meantime.</p>
        
        <router-link to="/" class="btn-primary">Back to Overview</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 2rem; }
h1 { font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 0.25rem; }
.subtitle { color: #64748B; font-size: 0.95rem; }

.panel { background: white; border-radius: 16px; padding: 4rem 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }

.empty-state { display: flex; flex-direction: column; align-items: center; max-width: 400px; margin: 0 auto; }
.icon { font-size: 4rem; margin-bottom: 1.5rem; }
h3 { font-size: 1.25rem; color: #0F172A; margin-bottom: 1rem; }
p { color: #64748B; margin-bottom: 0.5rem; line-height: 1.6; }

.btn-primary {
  display: inline-block; padding: 0.75rem 2rem; background: #FF6600; color: white;
  border-radius: 10px; font-weight: 700; margin-top: 2rem; transition: all 0.2s;
}
.btn-primary:hover { background: #cc5200; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255,102,0,0.2); }
</style>
