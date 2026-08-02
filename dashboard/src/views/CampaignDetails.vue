<template>
  <div class="cd-page">

    <!-- ══ TOP BAR ══ -->
    <div class="top-bar">
      <button @click="$router.push('/campaigns')" class="btn-back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Campaigns
      </button>
      <div class="top-bar-center" v-if="campaign">
        <span class="topbar-name">{{ campaign.name }}</span>
        <span class="topbar-sep">·</span>
        <span class="topbar-id">ID: {{ campaignId.slice(0,8).toUpperCase() }}</span>
      </div>
      <div class="top-bar-right" v-if="campaign">
        <!-- Auto-refresh toggle -->
        <button @click="toggleAutoRefresh" :class="['auto-refresh-btn', autoRefresh ? 'active' : '']" :title="autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'">
          <svg class="refresh-ico" :class="autoRefresh ? 'spinning' : ''" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {{ autoRefresh ? 'Live' : 'Refresh' }}
        </button>
        <span :class="['status-badge-top', `sbt-${campaign.status.toLowerCase()}`]">
          <span class="sbt-dot" :class="campaign.status === 'RUNNING' ? 'pulsing' : ''"></span>
          {{ campaign.status }}
        </span>
      </div>
    </div>

    <!-- ══ MAIN LAYOUT (Sidebar + Content) ══ -->
    <div class="main-layout">

      <!-- ─── LEFT SIDEBAR ─── -->
      <aside class="cd-sidebar">

        <!-- Campaign Info Card -->
        <div class="sidebar-card campaign-card" v-if="campaign">
          <div :class="['camp-status-ico', `ico-${campaign.status.toLowerCase()}`]">
            <svg v-if="campaign.status === 'RUNNING'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg v-else-if="campaign.status === 'COMPLETED'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else-if="campaign.status === 'FAILED'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 class="camp-name">{{ campaign.name }}</h2>
          <p class="camp-msg">{{ campaign.message || 'Template / Meta Campaign' }}</p>
          <div class="camp-dates" v-if="campaign.startDate || campaign.endDate">
            <div v-if="campaign.startDate" class="camp-date-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{{ new Date(campaign.startDate).toLocaleString() }}</span>
            </div>
            <div v-if="campaign.endDate" class="camp-date-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6"/></svg>
              <span>{{ new Date(campaign.endDate).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Skeleton -->
        <div class="sidebar-card skeleton-card" v-else>
          <div class="skel skel-circle"></div>
          <div class="skel skel-title"></div>
          <div class="skel skel-sub"></div>
        </div>

        <!-- Stats Cards (vertical stack) -->
        <template v-if="campaignStats">
          <!-- Progress -->
          <div class="sidebar-card prog-card">
            <div class="prog-header">
              <span class="prog-label">Delivery Rate</span>
              <span class="prog-pct">{{ Math.round((campaignStats.sent / (campaignStats.total || 1)) * 100) }}%</span>
            </div>
            <div class="prog-track">
              <div class="prog-fill" :style="`width:${(campaignStats.sent/(campaignStats.total||1)*100)}%`"></div>
            </div>
            <div class="prog-sub">{{ campaignStats.sent }} sent of {{ campaignStats.total }} total</div>
          </div>

          <!-- 4 KPI Boxes -->
          <div class="kpi-grid">
            <div class="kpi-box kpi-total">
              <span class="kpi-n">{{ campaignStats.total }}</span>
              <span class="kpi-l">Total</span>
            </div>
            <div class="kpi-box kpi-sent">
              <span class="kpi-n">{{ campaignStats.sent }}</span>
              <span class="kpi-l">Sent</span>
            </div>
            <div class="kpi-box kpi-pending">
              <span class="kpi-n">{{ campaignStats.pending }}</span>
              <span class="kpi-l">Pending</span>
            </div>
            <div class="kpi-box kpi-failed">
              <span class="kpi-n">{{ campaignStats.failed }}</span>
              <span class="kpi-l">Failed</span>
            </div>
          </div>
        </template>

        <!-- ★ Success Rate Ring -->
        <div class="sidebar-card rate-card" v-if="campaignStats && campaignStats.total > 0">
          <div class="rate-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Success Rate
          </div>
          <div class="rate-ring-wrap">
            <svg class="rate-ring" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#F1F5F9" stroke-width="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke="#FF6600" stroke-width="8"
                stroke-dasharray="201"
                :stroke-dashoffset="201 - (201 * successRate / 100)"
                stroke-linecap="round"
                transform="rotate(-90 40 40)"
                style="transition: stroke-dashoffset 1s ease"/>
            </svg>
            <div class="rate-ring-label">
              <span class="rate-pct">{{ successRate }}%</span>
              <span class="rate-lbl">sent</span>
            </div>
          </div>
          <div class="rate-row">
            <span class="rate-fail">{{ campaignStats.failed }} failed</span>
            <span class="rate-pass">{{ campaignStats.sent }} sent</span>
          </div>
        </div>

        <!-- ★ ETA Card (running only) -->
        <div class="sidebar-card eta-card" v-if="campaign && campaign.status === 'RUNNING' && campaignStats && campaignStats.pending > 0">
          <div class="eta-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Estimated Completion
          </div>
          <div class="eta-value">{{ estimatedTime }}</div>
          <div class="eta-sub">{{ campaignStats.pending }} messages remaining<br>at ~1 msg / 5 sec</div>
        </div>

        <!-- ★ Quick Actions -->
        <div class="sidebar-card actions-card" v-if="campaign">
          <div class="actions-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Quick Actions
          </div>
          <div class="actions-list">
            <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('targets')" class="qa-btn qa-export">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Targets (CSV)
            </button>
            <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('interactions')" class="qa-btn qa-export">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Interactions
            </button>
            <button @click="retryFailed" :disabled="retrying || !hasFailedTargets" class="qa-btn qa-retry" :class="(!hasFailedTargets) ? 'disabled' : ''">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>
              {{ retrying ? 'Retrying...' : 'Retry All Failed' }}
            </button>
            <button @click="refreshAll" class="qa-btn qa-refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh All Data
            </button>
          </div>
        </div>

        <!-- Error Breakdown -->
        <div class="sidebar-card err-card" v-if="campaignStats && campaignStats.errorBreakdown && Object.keys(campaignStats.errorBreakdown).length > 0">
          <div class="err-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Error Breakdown
          </div>
          <div class="err-list">
            <div v-for="(count, errStr) in campaignStats.errorBreakdown" :key="errStr" class="err-row">
              <span class="err-label" :title="errStr">{{ errStr.length > 22 ? errStr.slice(0, 22) + '…' : errStr }}</span>
              <span class="err-count">{{ count }}</span>
            </div>
          </div>
        </div>

      </aside>

      <!-- ─── RIGHT CONTENT ─── -->
      <div class="cd-content">

        <!-- Tabs -->
        <div class="tabs-wrapper">
          <div class="tabs-inner">
            <button :class="['tab-btn', activeTab === 'targets' ? 'active' : '']" @click="switchTab('targets')">
              <div class="tab-icon-wrap" :class="activeTab === 'targets' ? 'active' : ''">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="tab-text">
                <span class="tab-title">Targets &amp; Numbers</span>
                <span class="tab-count-badge" v-if="campaignStats">{{ campaignStats.total }}</span>
              </div>
            </button>

            <button :class="['tab-btn', activeTab === 'interactions' ? 'active' : '']" @click="switchTab('interactions')">
              <div class="tab-icon-wrap" :class="activeTab === 'interactions' ? 'active' : ''">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="tab-text">
                <span class="tab-title">Interactions &amp; Replies</span>
                <span class="tab-count-badge replied" v-if="interactionStats">{{ interactionStats.interacted }}</span>
              </div>
            </button>
          </div>
          <div class="tab-indicator-track">
            <div class="tab-indicator" :style="activeTab === 'targets' ? 'left:0;width:50%' : 'left:50%;width:50%'"></div>
          </div>
        </div>

        <!-- ══ TARGETS TAB ══ -->
        <div v-show="activeTab === 'targets'" class="tab-pane">

          <!-- Toolbar -->
          <div class="tbl-toolbar">
            <div class="tbl-filters-row">
              <button v-for="s in ['ALL','PENDING','SENT','FAILED']" :key="s"
                :class="['fchip', s.toLowerCase(), targetStatus === s ? 'active' : '']"
                @click="targetStatus = s; targetPage = 1; fetchTargets()">
                {{ s === 'ALL' ? 'All' : s }}
              </button>
            </div>
            <div class="tbl-actions-row">
              <div class="search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="targetSearch" @keyup.enter="fetchTargets" placeholder="Search phone..." />
              </div>
              <button v-if="targets.some(t => t.status === 'FAILED')" @click="retryFailed" class="btn-retry" :disabled="retrying">
                <svg v-if="!retrying" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>
                <svg v-else class="spin-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                {{ retrying ? 'Retrying…' : 'Retry Failed' }}
              </button>
              <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('targets')" class="btn-export">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
              <button v-else @click="alertUpgrade('Excel Export requires PRO plan')" class="btn-export locked">🔒 Export</button>
            </div>
          </div>

          <!-- Table -->
          <div class="tbl-wrap">
            <table class="data-tbl">
              <thead>
                <tr>
                  <th class="th-num">#</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Error / Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(target, idx) in targets" :key="target.id">
                  <td class="td-num">{{ (targetPage - 1) * 20 + idx + 1 }}</td>
                  <td class="td-phone">{{ target.phone }}</td>
                  <td>
                    <span :class="['chip', target.status.toLowerCase()]">{{ target.status }}</span>
                  </td>
                  <td class="td-err">{{ target.error || '—' }}</td>
                </tr>
                <tr v-if="targets.length === 0">
                  <td colspan="4" class="td-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p>No records match your filter</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="targetTotalPages > 1" class="pager">
            <button :disabled="targetPage === 1" @click="targetPage--; fetchTargets()" class="pager-btn">← Prev</button>
            <span class="pager-info">{{ targetPage }} / {{ targetTotalPages }}</span>
            <button :disabled="targetPage === targetTotalPages" @click="targetPage++; fetchTargets()" class="pager-btn">Next →</button>
          </div>
        </div>

        <!-- ══ INTERACTIONS TAB ══ -->
        <div v-show="activeTab === 'interactions'" class="tab-pane">

          <!-- Interaction KPI mini row -->
          <div class="interaction-kpis" v-if="interactionStats">
            <div class="ikpi interacted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span class="ikpi-n">{{ interactionStats.interacted }}</span>
              <span class="ikpi-l">Interacted</span>
            </div>
            <div class="ikpi no-resp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              <span class="ikpi-n">{{ interactionStats.notInteracted }}</span>
              <span class="ikpi-l">No Response</span>
            </div>
            <div class="ikpi btn-c" v-for="(count, btnText) in interactionStats.buttonBreakdown" :key="btnText">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span class="ikpi-n">{{ count }}</span>
              <span class="ikpi-l">{{ btnText }}</span>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="tbl-toolbar" style="margin-top:1rem">
            <div class="tbl-filters-row">
              <button :class="['fchip', 'all', interactionStatus === 'ALL' ? 'active' : '']" @click="interactionStatus='ALL'; interactionPage=1; fetchInteractions()">All</button>
              <button v-if="interactionStats?.notInteracted > 0" :class="['fchip', 'failed', interactionStatus === 'NO_RESPONSE' ? 'active' : '']" @click="interactionStatus='NO_RESPONSE'; interactionPage=1; fetchInteractions()">No Response</button>
              <button v-for="(count, btnText) in (interactionStats?.buttonBreakdown || {})" :key="btnText"
                :class="['fchip', 'sent', interactionStatus === btnText ? 'active' : '']"
                @click="interactionStatus=btnText; interactionPage=1; fetchInteractions()">{{ btnText }}</button>
            </div>
            <div class="tbl-actions-row">
              <div class="search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input v-model="interactionSearch" @keyup.enter="fetchInteractions" placeholder="Search phone..." />
              </div>
              <button v-if="$hasFeature('EXCEL_EXPORT')" @click="exportData('interactions')" class="btn-export">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
              <button v-else @click="alertUpgrade('Excel Export requires PRO plan')" class="btn-export locked">🔒 Export</button>
            </div>
          </div>

          <!-- Table -->
          <div class="tbl-wrap">
            <table class="data-tbl">
              <thead>
                <tr>
                  <th class="th-num">#</th>
                  <th>Phone Number</th>
                  <th>Response / Button</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in interactions" :key="item.id">
                  <td class="td-num">{{ (interactionPage - 1) * 20 + idx + 1 }}</td>
                  <td class="td-phone">{{ item.phone }}</td>
                  <td><span class="chip sent">{{ item.buttonText }}</span></td>
                  <td class="td-time">{{ new Date(item.createdAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="interactions.length === 0">
                  <td colspan="4" class="td-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>No interactions recorded yet</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="interactionTotalPages > 1" class="pager">
            <button :disabled="interactionPage === 1" @click="interactionPage--; fetchInteractions()" class="pager-btn">← Prev</button>
            <span class="pager-info">{{ interactionPage }} / {{ interactionTotalPages }}</span>
            <button :disabled="interactionPage === interactionTotalPages" @click="interactionPage++; fetchInteractions()" class="pager-btn">Next →</button>
          </div>
        </div>

      </div><!-- end cd-content -->
    </div><!-- end main-layout -->

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const campaignId = route.params.id

const loading = ref(true)
const campaign = ref(null)
const activeTab = ref('targets')
const retrying = ref(false)
const campaignStats = ref(null)

const targets = ref([])
const targetPage = ref(1)
const targetTotalPages = ref(1)
const targetSearch = ref('')
const targetStatus = ref('ALL')

const interactions = ref([])
const interactionPage = ref(1)
const interactionTotalPages = ref(1)
const interactionStatus = ref('ALL')
const interactionSearch = ref('')
const interactionStats = ref(null)

const alertUpgrade = (msg) => alert(msg)

// ── Computed helpers ──
const successRate = computed(() => {
  if (!campaignStats.value || !campaignStats.value.total) return 0
  return Math.round((campaignStats.value.sent / campaignStats.value.total) * 100)
})

const estimatedTime = computed(() => {
  if (!campaignStats.value || !campaignStats.value.pending) return '—'
  const seconds = campaignStats.value.pending * 5
  if (seconds < 60) return `~${seconds}s`
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} min`
  return `~${(seconds / 3600).toFixed(1)} hr`
})

const hasFailedTargets = computed(() => {
  return targets.value.some(t => t.status === 'FAILED')
})

// ── Auto-refresh ──
const autoRefresh = ref(false)
let autoRefreshInterval = null

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    autoRefreshInterval = setInterval(() => {
      fetchCampaignStats()
      fetchTargets()
    }, 8000)
  } else {
    clearInterval(autoRefreshInterval)
  }
}

const refreshAll = async () => {
  await fetchCampaignDetails()
  await fetchTargets()
  fetchCampaignStats()
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'targets') fetchTargets()
  else fetchInteractions()
}

onMounted(async () => {
  await fetchCampaignDetails()
  await fetchTargets()
  fetchCampaignStats()
})

const fetchCampaignStats = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/stats`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    campaignStats.value = res.data.data.stats
  } catch (err) {}
}

const fetchCampaignDetails = async () => {
  try {
    const res = await axios.get('/api/v1/campaigns', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    campaign.value = res.data.data.find(c => c.id === campaignId)
  } catch (err) {} finally { loading.value = false }
}

const fetchTargets = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/targets`, {
      params: { page: targetPage.value, limit: 20, status: targetStatus.value, search: targetSearch.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    targets.value = res.data.data.targets || res.data.data
    if (res.data.data.totalPages) targetTotalPages.value = res.data.data.totalPages
  } catch (err) {}
}

const fetchInteractions = async () => {
  try {
    const res = await axios.get(`/api/v1/campaigns/${campaignId}/interactions`, {
      params: { page: interactionPage.value, limit: 20, search: interactionSearch.value, status: interactionStatus.value },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    interactions.value = res.data.data.interactions || []
    if (res.data.data.totalPages) interactionTotalPages.value = res.data.data.totalPages
    if (res.data.data.stats) interactionStats.value = res.data.data.stats
  } catch (err) {}
}

let searchTimeout
watch(targetSearch, () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { targetPage.value = 1; fetchTargets() }, 500) })
watch(interactionSearch, () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { interactionPage.value = 1; fetchInteractions() }, 500) })

const retryFailed = async () => {
  retrying.value = true
  try {
    const res = await axios.post(`/api/v1/campaigns/${campaignId}/retry`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    alert(res.data.message || 'Retrying failed numbers...')
    setTimeout(fetchTargets, 1000)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to retry campaign.')
  } finally { retrying.value = false }
}

const exportData = (type) => {
  let url = `/api/v1/campaigns/${campaignId}/export?type=${type}`
  if (type === 'targets' && targetStatus.value !== 'ALL') url += `&status=${targetStatus.value}`
  if (type === 'interactions' && interactionStatus.value !== 'ALL') url += `&status=${interactionStatus.value}`
  axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, responseType: 'blob' }).then(res => {
    const href = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = href
    a.setAttribute('download', `campaign_${campaignId}_${type}.csv`)
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(href)
  }).catch(() => alert('Export failed'))
}

onUnmounted(() => {
  clearInterval(autoRefreshInterval)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ── TOP BAR ENHANCEMENTS ── */
.top-bar { justify-content: space-between; }
.topbar-name { font-size: 0.9rem; font-weight: 800; color: #0F172A; }
.topbar-sep { color: #CBD5E1; margin: 0 6px; }
.topbar-id { font-size: 0.8rem; font-weight: 600; color: #94A3B8; font-family: monospace; }
.top-bar-center { display: flex; align-items: center; flex: 1; justify-content: center; }
.top-bar-right { display: flex; align-items: center; gap: 0.75rem; }

.auto-refresh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.45rem 1rem;
  border: 1.5px solid #E2E8F0; background: white;
  border-radius: 9px; color: #64748B;
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.auto-refresh-btn.active { background: #ECFDF5; border-color: #34D399; color: #059669; }
.auto-refresh-btn:hover { border-color: #CBD5E1; }
.refresh-ico.spinning { animation: spin 1.5s linear infinite; }

/* ── SUCCESS RATE RING ── */
.rate-card {}
.rate-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.75rem; font-weight: 800;
  color: #64748B; text-transform: uppercase;
  letter-spacing: 0.06em; margin-bottom: 1rem;
}
.rate-ring-wrap {
  position: relative;
  width: 90px; height: 90px;
  margin: 0 auto 0.875rem;
}
.rate-ring { width: 100%; height: 100%; }
.rate-ring-label {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1px;
}
.rate-pct { font-size: 1.3rem; font-weight: 900; color: #FF6600; line-height: 1; }
.rate-lbl { font-size: 0.65rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; }
.rate-row {
  display: flex; justify-content: space-between;
  font-size: 0.75rem; font-weight: 700;
  border-top: 1px solid #F1F5F9; padding-top: 0.75rem;
}
.rate-fail { color: #DC2626; }
.rate-pass { color: #059669; }

/* ── ETA CARD ── */
.eta-card {
  background: linear-gradient(135deg, #0F172A, #1E293B);
  border-color: #334155;
}
.eta-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.7rem; font-weight: 800;
  color: #94A3B8; text-transform: uppercase;
  letter-spacing: 0.06em; margin-bottom: 0.75rem;
}
.eta-value {
  font-size: 2rem; font-weight: 900;
  color: #FF6600; line-height: 1;
  margin-bottom: 0.5rem;
}
.eta-sub { font-size: 0.75rem; color: #64748B; line-height: 1.5; }

/* ── QUICK ACTIONS ── */
.actions-card {}
.actions-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.75rem; font-weight: 800;
  color: #64748B; text-transform: uppercase;
  letter-spacing: 0.06em; margin-bottom: 0.875rem;
}
.actions-list { display: flex; flex-direction: column; gap: 6px; }
.qa-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: white; color: #334155;
  font-size: 0.8rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit; text-align: left;
  width: 100%;
}
.qa-btn:hover:not(:disabled):not(.disabled) { transform: translateX(3px); }
.qa-btn.qa-export { border-color: #D1FAE5; color: #059669; }
.qa-btn.qa-export:hover { background: #ECFDF5; }
.qa-btn.qa-retry { border-color: #FDE68A; color: #B45309; }
.qa-btn.qa-retry:hover:not(:disabled) { background: #FFFBEB; }
.qa-btn.qa-refresh { border-color: #BFDBFE; color: #2563EB; }
.qa-btn.qa-refresh:hover { background: #EFF6FF; }
.qa-btn:disabled, .qa-btn.disabled { opacity: 0.5; cursor: not-allowed; }

* { box-sizing: border-box; }

.cd-page {
  min-height: 100vh;
  background: #F0F2F7;
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  max-width: 1600px;
}

/* ── TOP BAR ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  background: #ffffff;
  border-bottom: 1px solid #E8EDF5;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  color: #64748B;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-back:hover { background: white; color: #0F172A; transform: translateX(-3px); border-color: #CBD5E1; }

.status-badge-top {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0.45rem 1.1rem;
  border-radius: 30px;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sbt-pending  { background: #FEF3C7; color: #B45309; }
.sbt-running  { background: #DBEAFE; color: #1D4ED8; }
.sbt-completed{ background: #DCFCE7; color: #15803D; }
.sbt-failed   { background: #FEE2E2; color: #B91C1C; }
.sbt-sent     { background: #DCFCE7; color: #15803D; }
.sbt-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.sbt-dot.pulsing { animation: pulse-dot 1.4s infinite; }
@keyframes pulse-dot { 0%,100%{ transform:scale(1); opacity:1; } 50%{ transform:scale(1.8); opacity:0.4; } }

/* ── MAIN LAYOUT ── */
.main-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0;
  flex: 1;
  align-items: start;
}
@media(max-width: 960px) { .main-layout { grid-template-columns: 1fr; } }

/* ── SIDEBAR ── */
.cd-sidebar {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 64px; /* height of top-bar */
  height: calc(100vh - 64px);
  overflow-y: auto;
  border-right: 1px solid #E8EDF5;
  background: #FAFBFD;
}
.cd-sidebar::-webkit-scrollbar { width: 4px; }
.cd-sidebar::-webkit-scrollbar-track { background: transparent; }
.cd-sidebar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

.sidebar-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8EDF5;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

/* Campaign Card */
.campaign-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; }
.camp-status-ico {
  width: 56px; height: 56px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ico-pending  { background: #FEF3C7; color: #D97706; }
.ico-running  { background: #DBEAFE; color: #2563EB; }
.ico-completed{ background: #DCFCE7; color: #16A34A; }
.ico-failed   { background: #FEE2E2; color: #DC2626; }
.ico-sent     { background: #DCFCE7; color: #16A34A; }
.camp-name { font-size: 1rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.3; }
.camp-msg { font-size: 0.8rem; color: #64748B; margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.camp-dates { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; border-top: 1px solid #F1F5F9; padding-top: 0.75rem; }
.camp-date-row { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #64748B; }
.camp-date-row span { font-weight: 600; }

/* Progress Card */
.prog-card {}
.prog-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem; }
.prog-label { font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
.prog-pct { font-size: 1.6rem; font-weight: 900; color: #FF6600; line-height: 1; }
.prog-track { height: 10px; background: #F1F5F9; border-radius: 99px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); }
.prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF6600, #FF9933);
  border-radius: 99px;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; overflow: hidden;
}
.prog-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent); transform:translateX(-100%); animation:shimmer 2.5s infinite; }
@keyframes shimmer { 100%{ transform:translateX(200%); } }
.prog-sub { font-size: 0.75rem; color: #94A3B8; font-weight: 600; margin-top: 0.5rem; }

/* KPI 2x2 grid */
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.kpi-box {
  border-radius: 12px;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  transition: transform 0.2s;
}
.kpi-box:hover { transform: translateY(-2px); }
.kpi-n { font-size: 1.6rem; font-weight: 900; line-height: 1; }
.kpi-l { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.kpi-total  { background: #F8FAFC; border: 1px solid #E2E8F0; } .kpi-total  .kpi-n { color: #0F172A; } .kpi-total  .kpi-l { color: #94A3B8; }
.kpi-sent   { background: #ECFDF5; border: 1px solid #D1FAE5; } .kpi-sent   .kpi-n { color: #059669; } .kpi-sent   .kpi-l { color: #34D399; }
.kpi-pending{ background: #FFFBEB; border: 1px solid #FEF3C7; } .kpi-pending.kpi-n { color: #D97706; } .kpi-pending .kpi-n { color: #D97706; } .kpi-pending .kpi-l { color: #FBBF24; }
.kpi-failed { background: #FEF2F2; border: 1px solid #FEE2E2; } .kpi-failed .kpi-n { color: #DC2626; } .kpi-failed .kpi-l { color: #F87171; }

/* Error Breakdown */
.err-card-title { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 800; color: #DC2626; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.err-list { display: flex; flex-direction: column; gap: 6px; }
.err-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.err-label { font-size: 0.78rem; color: #475569; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.err-count { background: #FEE2E2; color: #DC2626; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; }

/* Skeleton */
.skeleton-card { display: flex; flex-direction: column; gap: 10px; }
.skel { background: #F1F5F9; border-radius: 8px; animation: skel-pulse 1.5s infinite; }
.skel-circle { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto; }
.skel-title { height: 20px; width: 70%; margin: 0 auto; }
.skel-sub { height: 14px; width: 90%; margin: 0 auto; }
@keyframes skel-pulse { 0%,100%{ opacity:0.5; } 50%{ opacity:1; } }

/* ── CONTENT AREA ── */
.cd-content {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 64px);
}

/* ── TABS ── */
.tabs-wrapper {
  background: white;
  border-bottom: 1px solid #E8EDF5;
  position: sticky;
  top: 64px;
  z-index: 40;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.tabs-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  position: relative;
  border-right: 1px solid #F1F5F9;
}
.tab-btn:last-child { border-right: none; }
.tab-btn:hover { background: #F8FAFC; }
.tab-btn.active { background: #FFF7F3; }
.tab-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 11px;
  background: #F1F5F9;
  color: #64748B;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.tab-icon-wrap.active { background: linear-gradient(135deg, #FF6600, #FF9933); color: white; box-shadow: 0 4px 12px rgba(255,102,0,0.35); }
.tab-text { display: flex; flex-direction: column; gap: 3px; text-align: left; }
.tab-title { font-size: 0.9rem; font-weight: 700; color: #64748B; transition: color 0.2s; }
.tab-btn.active .tab-title { color: #0F172A; }
.tab-count-badge {
  display: inline-flex;
  align-items: center;
  background: #E2E8F0;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 20px;
  width: fit-content;
}
.tab-count-badge.replied { background: #DCFCE7; color: #15803D; }
.tab-btn.active .tab-count-badge { background: rgba(255,102,0,0.12); color: #FF6600; }
.tab-indicator-track { height: 3px; background: #F1F5F9; position: relative; }
.tab-indicator {
  position: absolute;
  height: 3px;
  background: linear-gradient(90deg, #FF6600, #FF9933);
  border-radius: 99px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(255,102,0,0.4);
}

/* ── TAB PANE ── */
.tab-pane { padding: 1.5rem 1.75rem; flex: 1; }

/* Interaction KPI mini row */
.interaction-kpis { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0; }
.ikpi {
  display: flex; align-items: center; gap: 8px;
  background: white;
  border: 1px solid #E8EDF5;
  border-radius: 12px;
  padding: 0.7rem 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  transition: transform 0.2s;
}
.ikpi:hover { transform: translateY(-2px); }
.ikpi-n { font-size: 1.2rem; font-weight: 900; line-height: 1; }
.ikpi-l { font-size: 0.7rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }
.ikpi.interacted { border-color: #D1FAE5; } .ikpi.interacted svg { color: #059669; } .ikpi.interacted .ikpi-n { color: #059669; }
.ikpi.no-resp   { border-color: #FEE2E2; } .ikpi.no-resp svg { color: #DC2626; }    .ikpi.no-resp .ikpi-n   { color: #DC2626; }
.ikpi.btn-c     { border-color: #DBEAFE; } .ikpi.btn-c svg { color: #2563EB; }     .ikpi.btn-c .ikpi-n     { color: #2563EB; }

/* Toolbar */
.tbl-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.tbl-filters-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tbl-actions-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.fchip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid #E2E8F0;
  background: white;
  color: #64748B;
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.fchip:hover { border-color: #CBD5E1; color: #334155; }
.fchip.active { color: white; border-color: transparent; }
.fchip.all.active    { background: #0F172A; }
.fchip.pending.active{ background: #D97706; }
.fchip.sent.active   { background: #059669; }
.fchip.failed.active { background: #DC2626; }

.search-box {
  display: flex; align-items: center; gap: 7px;
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  padding: 0.45rem 0.875rem;
  transition: all 0.2s;
}
.search-box:focus-within { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.08); }
.search-box svg { color: #94A3B8; flex-shrink: 0; }
.search-box input { border: none; outline: none; font-size: 0.82rem; color: #334155; background: transparent; width: 170px; font-family: inherit; }

.btn-retry {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0.5rem 1rem;
  background: #FEF3C7; color: #B45309;
  border: 1.5px solid #FDE68A;
  border-radius: 9px;
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.btn-retry:hover:not(:disabled) { background: #FEF08A; }
.btn-retry:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-export {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #10B981, #059669);
  color: white; border: none;
  border-radius: 9px;
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 3px 10px rgba(16,185,129,0.2);
  font-family: inherit;
}
.btn-export:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(16,185,129,0.3); }
.btn-export.locked { background: #CBD5E1; cursor: not-allowed; box-shadow: none; }

/* Table */
.tbl-wrap {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8EDF5;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}
.data-tbl { width: 100%; border-collapse: collapse; }
.data-tbl thead tr { background: #FAFBFD; }
.data-tbl th {
  padding: 1rem 1.25rem;
  text-align: left;
  font-size: 0.75rem; font-weight: 800;
  color: #64748B;
  text-transform: uppercase; letter-spacing: 0.07em;
  border-bottom: 2px solid #F1F5F9;
}
.th-num { width: 48px; }
.data-tbl td { padding: 0.9rem 1.25rem; border-bottom: 1px solid #F8FAFC; font-size: 0.875rem; color: #334155; vertical-align: middle; }
.data-tbl tr:hover td { background: #FAFBFD; }
.data-tbl tr:last-child td { border-bottom: none; }
.td-num { font-size: 0.78rem; color: #CBD5E1; font-weight: 600; }
.td-phone { font-family: 'Courier New', monospace; font-weight: 700; color: #0F172A; letter-spacing: 0.02em; }
.td-err { color: #EF4444; font-size: 0.8rem; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-time { color: #94A3B8; font-size: 0.8rem; white-space: nowrap; }

.chip {
  display: inline-flex; align-items: center;
  padding: 0.28rem 0.75rem;
  border-radius: 7px;
  font-size: 0.72rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.chip.pending   { background: #FEF3C7; color: #B45309; }
.chip.sent, .chip.completed { background: #DCFCE7; color: #15803D; }
.chip.failed    { background: #FEE2E2; color: #B91C1C; }

.td-empty { text-align: center; padding: 3.5rem !important; }
.td-empty { display: table-cell; }
.td-empty > * { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #94A3B8; }
.td-empty p { margin: 0; font-size: 0.9rem; font-weight: 600; }

/* Pager */
.pager { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.25rem; }
.pager-btn {
  padding: 0.5rem 1.1rem;
  border: 1.5px solid #E2E8F0; background: white;
  border-radius: 9px;
  color: #334155; font-weight: 700; font-size: 0.82rem;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.pager-btn:hover:not(:disabled) { border-color: #FF6600; color: #FF6600; }
.pager-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pager-info { font-size: 0.875rem; color: #64748B; font-weight: 700; }

.spin-svg { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
