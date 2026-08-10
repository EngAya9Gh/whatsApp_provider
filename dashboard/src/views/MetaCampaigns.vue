<template>
  <div class="mc-root">

    <!-- ── Hero Header ── -->
    <div class="hero-header">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </div>
          <div>
            <div class="hero-title-row">
              <h1 class="hero-title">{{ isAr ? 'حملات ميتا' : 'Meta Campaigns' }}</h1>
              <div class="hero-stats-inline" v-if="campaigns.length > 0">
                <span class="hstat-chip">{{ campaigns.length }} {{ isAr ? 'حملة' : 'total' }}</span>
                <span class="hstat-chip running-chip" v-if="statusCount('RUNNING') > 0">{{ statusCount('RUNNING') }} {{ isAr ? 'جارية' : 'running' }}</span>
                <span class="hstat-chip sched-chip" v-if="statusCount('SCHEDULED') > 0">{{ statusCount('SCHEDULED') }} {{ isAr ? 'مجدولة' : 'scheduled' }}</span>
                <span class="hstat-chip cost-chip">${{ totalCostAll }}</span>
              </div>
            </div>
            <p class="hero-sub">{{ isAr ? 'إرسال رسائل واتساب رسمية عبر Meta Cloud API' : 'Send via official Meta/WhatsApp API with 100% delivery reliability' }}</p>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button @click="syncStats" class="btn-create" style="background: linear-gradient(135deg, #10B981, #059669);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.84-10.2L2.5 8"/><path d="M2.5 8V2h6"/></svg>
            {{ isAr ? 'تحديث الإحصائيات' : 'Sync Stats' }}
          </button>
          <button @click="openModal" class="btn-create">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ isAr ? 'حملة جديدة' : 'New Campaign' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Alerts ── -->
    <transition name="slide-fade">
      <div v-if="alertMsg" :class="['mc-alert', alertType]">
        <svg v-if="alertType === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        {{ alertMsg }}
      </div>
    </transition>

    <!-- ── Filter Toolbar ── -->
    <div class="filter-toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" class="search-input" :placeholder="isAr ? 'ابحث عن حملة...' : 'Search Meta campaigns...'" />
      </div>
      <div class="status-pills">
        <button v-for="s in statusFilters" :key="s.value"
          @click="statusFilter = s.value"
          :class="['status-pill', s.value.toLowerCase(), statusFilter === s.value ? 'active' : '']">
          <span class="pill-dot"></span>
          {{ s.label }}
          <span class="pill-badge">{{ statusCount(s.value) }}</span>
        </button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loading && campaigns.length === 0" class="state-center">
      <div class="spin-ring"></div>
      <span>{{ isAr ? 'جارٍ تحميل الحملات...' : 'Loading Meta campaigns...' }}</span>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="filteredCampaigns.length === 0" class="state-empty">
      <div class="empty-art">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      </div>
      <h3>{{ isAr ? 'لا توجد حملات بعد' : 'No Meta Campaigns Yet' }}</h3>
      <p>{{ isAr ? 'أطلق أول حملة واتساب رسمية' : 'Start your first official WhatsApp Business campaign' }}</p>
      <button @click="openModal" class="btn-create" style="margin-top:1.25rem">{{ isAr ? 'إطلاق أول حملة' : 'Launch First Campaign' }}</button>
    </div>

    <!-- ── Cards Grid ── -->
    <div v-else class="cards-grid">
      <div v-for="campaign in filteredCampaigns" :key="campaign.id" class="camp-card">
        <div :class="['card-accent', 'accent-' + (campaign.status||'pending').toLowerCase()]"></div>
        <div class="card-head">
          <div :class="['card-icon-wrap', 'icon-' + (campaign.status||'pending').toLowerCase()]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
          </div>
          <div class="card-title-block">
            <h3 class="card-name">{{ campaign.name }}</h3>
            <div class="card-meta-row">
              <div class="card-date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ new Date(campaign.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </div>
              <span class="cat-badge" v-if="campaign.metaCategory">{{ campaign.metaCategory }}</span>
              <div v-if="campaign.status === 'SCHEDULED' && campaign.startDate" class="sched-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ formatScheduledDate(campaign.startDate) }}
              </div>
            </div>
          </div>
          <span :class="['status-badge', 'badge-' + (campaign.status||'pending').toLowerCase()]">
            <span class="badge-pulse" v-if="campaign.status === 'RUNNING'"></span>
            <span class="badge-pulse sched-pulse" v-if="campaign.status === 'SCHEDULED'"></span>
            {{ statusLabel(campaign.status) }}
          </span>
        </div>

        <div class="cost-row">
          <div class="cost-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            {{ isAr ? 'التكلفة:' : 'Cost:' }} <strong>${{ (campaign.totalCost || 0).toFixed(4) }}</strong>
          </div>
        </div>

        <div v-if="activeStats[campaign.id]" class="card-stats">
          <div class="stats-row">
            <div class="stat-box total"><span class="stat-n">{{ activeStats[campaign.id].total }}</span><span class="stat-l">{{ isAr ? 'الكل' : 'Total' }}</span></div>
            <div class="stat-box sent"><span class="stat-n">{{ activeStats[campaign.id].sent }}</span><span class="stat-l">{{ isAr ? 'أُرسل' : 'Sent' }}</span></div>
            <div class="stat-box read"><span class="stat-n">{{ activeStats[campaign.id].read || 0 }}</span><span class="stat-l">{{ isAr ? 'قُرئ' : 'Read' }}</span></div>
            <div class="stat-box failed"><span class="stat-n">{{ activeStats[campaign.id].failed }}</span><span class="stat-l">{{ isAr ? 'فشل' : 'Failed' }}</span></div>
          </div>
          <div class="prog-wrap">
            <div class="prog-labels">
              <span class="prog-title">{{ isAr ? 'معدل القراءة' : 'Read Rate' }}</span>
              <span class="prog-pct read">{{ Math.round(((activeStats[campaign.id].read || 0) / (activeStats[campaign.id].sent || 1)) * 100) }}%</span>
            </div>
            <div class="prog-track">
              <div class="prog-bar-sent" :style="'width: ' + (activeStats[campaign.id].sent / (activeStats[campaign.id].total || 1) * 100) + '%'"></div>
              <div class="prog-bar-read" :style="'width: ' + ((activeStats[campaign.id].read||0) / (activeStats[campaign.id].total || 1) * 100) + '%'"></div>
            </div>
            <div class="prog-legend"><span class="legend-sent">{{ isAr ? 'أُرسل' : 'Sent' }}</span><span class="legend-read">{{ isAr ? 'قُرئ' : 'Read' }}</span></div>
          </div>
        </div>

        <div v-else :class="['card-pending-banner', campaign.status === 'SCHEDULED' ? 'sched-banner' : '']">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span v-if="campaign.status === 'SCHEDULED'">{{ isAr ? 'مجدولة:' : 'Scheduled for:' }} {{ campaign.startDate ? formatScheduledDate(campaign.startDate) : '—' }}</span>
          <span v-else>{{ isAr ? 'في انتظار الإطلاق' : 'Awaiting launch' }}</span>
        </div>

        <div class="card-actions">
          <div class="actions-left">
            <button v-if="campaign.status !== 'PENDING' && campaign.status !== 'SCHEDULED'" @click="loadStats(campaign.id)" class="act-btn refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            <button v-if="campaign.status === 'PENDING'" @click="launchCampaign(campaign.id)" :disabled="launchingId === campaign.id" class="act-btn-launch">
              <svg v-if="launchingId === campaign.id" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {{ launchingId === campaign.id ? (isAr ? 'جارٍ...' : 'Starting...') : (isAr ? 'إطلاق الحملة' : 'Launch Now') }}
            </button>
          </div>
          <div class="actions-right">
            <router-link :to="'/campaigns/' + campaign.id" class="btn-view">
              {{ isAr ? 'التفاصيل' : 'View Details' }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Pagination ── -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="page === 1" @click="page--; fetchCampaigns()" class="page-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="page-numbers"><span class="page-num active">{{ page }}</span><span class="page-sep">/</span><span class="page-num">{{ totalPages }}</span></div>
      <button :disabled="page === totalPages" @click="page++; fetchCampaigns()" class="page-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- ══ Create Modal ══ -->
    <transition name="modal-fade">
      <div v-if="showCreateModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-layout">
            <!-- Left: Guide panel -->
            <div class="modal-guide">
              <div class="guide-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.907-1.425A9.962 9.962 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                {{ isAr ? 'دليل الحملة' : 'Meta Campaign Guide' }}
              </div>
              <div class="guide-items">
                <div class="guide-item"><div class="guide-num">1</div><div><strong>{{ isAr ? 'ملف الأرقام' : 'Phone Numbers File' }}</strong><p>{{ isAr ? 'العمود A: الصيغة الدولية بدون +' : 'Column A: International format (no +)' }}</p></div></div>
                <div class="guide-item"><div class="guide-num">2</div><div><strong>{{ isAr ? 'المتغيرات' : 'Dynamic Variables' }}</strong><p v-if="isAr"><span v-pre>{{1}}</span> → العمود B، <span v-pre>{{2}}</span> → العمود C</p><p v-else><span v-pre>{{1}}</span> → Column B, <span v-pre>{{2}}</span> → Column C</p></div></div>
                <div class="guide-item"><div class="guide-num">3</div><div><strong>{{ isAr ? 'القوالب المعتمدة' : 'Approved Templates Only' }}</strong><p>{{ isAr ? 'يُرسل ميتا القوالب المعتمدة فقط' : 'Only APPROVED templates are delivered' }}</p></div></div>
                <div class="guide-separator"></div>
                <div class="guide-launch-info">
                  <div class="gli-item gli-immediate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <div><strong>{{ isAr ? 'إطلاق فوري' : 'Immediate' }}</strong><p>{{ isAr ? 'ترسل الرسائل فوراً' : 'Messages sent right away' }}</p></div>
                  </div>
                  <div class="gli-item gli-schedule">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <div><strong>{{ isAr ? 'جدولة' : 'Schedule' }}</strong><p>{{ isAr ? 'حدد وقتاً مستقبلياً' : 'Pick a future date & time' }}</p></div>
                  </div>
                  <div class="gli-item gli-draft">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    <div><strong>{{ isAr ? 'مسودة' : 'Draft' }}</strong><p>{{ isAr ? 'أطلق يدوياً لاحقاً' : 'Launch manually later' }}</p></div>
                  </div>
                </div>
                <div class="guide-item warn"><div class="guide-num warn">!</div><div><strong>{{ isAr ? 'الحدود اليومية' : 'Daily Limits' }}</strong><p>{{ isAr ? 'احترم حدود ميتا اليومية' : "Respect Meta's daily sending limits" }}</p></div></div>
              </div>
            </div>

            <!-- Right: Form -->
            <div class="modal-form-panel">
              <div class="modal-form-header">
                <div><h2>{{ isAr ? 'حملة ميتا جديدة' : 'New Meta Campaign' }}</h2><p>{{ isAr ? 'أكمل البيانات لإنشاء حملة' : 'Fill in details to launch a campaign' }}</p></div>
                <button @click="closeModal" class="modal-close-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>

              <div class="modal-form-body">
                <div v-if="!activeMetaChannelId" class="channel-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div><strong>{{ isAr ? 'لم يتم تحديد قناة ميتا' : 'No Meta Channel Selected' }}</strong><p>{{ isAr ? 'يرجى تحديد قناة من الشريط الجانبي.' : 'Please select a Meta channel from the sidebar.' }}</p></div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ isAr ? 'اسم الحملة' : 'Campaign Name' }}</label>
                  <input type="text" v-model="form.name" class="form-input" :placeholder="isAr ? 'مثال: عرض الصيف 2025' : 'e.g. Summer Promo 2025'" />
                </div>

                <div class="form-group">
                  <label class="form-label">{{ isAr ? 'قالب ميتا المعتمد' : 'Approved Meta Template' }}</label>
                  <select v-model="form.templateName" class="form-input">
                    <option value="" disabled>{{ isAr ? '— اختر قالباً —' : '— Select a template —' }}</option>
                    <option v-for="tpl in metaTemplates" :key="tpl.id" :value="tpl.name">{{ tpl.name }} ({{ tpl.category }})</option>
                  </select>
                  <div v-if="metaTemplates.length === 0" class="form-hint warn">{{ isAr ? 'لا توجد قوالب معتمدة.' : 'No approved templates found.' }}</div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ isAr ? 'ملف أرقام الهاتف (Excel / CSV)' : 'Phone Numbers File (Excel / CSV)' }}</label>
                  <div class="file-drop" @click="$refs.fileInput.click()" :class="form.file ? 'has-file' : ''">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span v-if="form.file" class="file-name">{{ form.file.name }}</span>
                    <span v-else>{{ isAr ? 'اضغط لرفع ملف' : 'Click to upload Excel or CSV' }}</span>
                    <small>{{ isAr ? 'A = الهاتف، B/C = المتغيرات' : 'Column A = Phone, B/C = Variables' }}</small>
                  </div>
                  <input ref="fileInput" type="file" @change="handleFileUpload" accept=".csv,.xlsx,.xls" style="display:none" />
                </div>

                <!-- ══ LAUNCH MODE ══ -->
                <div class="form-group">
                  <label class="form-label">{{ isAr ? 'نوع الإطلاق' : 'Launch Type' }}</label>
                  <div class="launch-mode-grid">
                    <button type="button" v-for="mode in launchModes" :key="mode.value"
                      :class="['launch-mode-btn', form.launchMode === mode.value ? 'active' : '', 'lm-' + mode.value]"
                      @click="form.launchMode = mode.value">
                      <div class="lm-icon">
                        <svg v-if="mode.value === 'immediate'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <svg v-if="mode.value === 'schedule'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <svg v-if="mode.value === 'draft'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                      </div>
                      <div class="lm-text">
                        <span class="lm-title">{{ mode.label }}</span>
                        <span class="lm-sub">{{ mode.desc }}</span>
                      </div>
                      <div class="lm-check" v-if="form.launchMode === mode.value">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Schedule DateTime -->
                <transition name="slide-down">
                  <div class="form-group" v-if="form.launchMode === 'schedule'">
                    <label class="form-label">{{ isAr ? 'تاريخ ووقت الإرسال' : 'Scheduled Date & Time' }}</label>
                    <div class="datetime-wrap">
                      <input type="datetime-local" v-model="form.scheduledAt" class="form-input datetime-input" :min="minDateTime" />
                      <div v-if="form.scheduledAt" class="datetime-preview">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        {{ isAr ? 'سيتم الإرسال في:' : 'Will send at:' }} <strong>{{ formatScheduledDate(form.scheduledAt) }}</strong>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>

              <div class="modal-form-actions">
                <button @click="closeModal" class="btn-cancel">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
                <button @click="createCampaign" :disabled="isSubmitting" :class="['btn-submit', 'btn-' + form.launchMode]">
                  <svg v-if="isSubmitting" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                  <svg v-else-if="form.launchMode === 'immediate'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <svg v-else-if="form.launchMode === 'schedule'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  {{ submitBtnLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useMetaChannel } from '../composables/useMetaChannel'

const { activeMetaChannelId } = useMetaChannel()
const campaigns = ref([])
const metaTemplates = ref([])
const loading = ref(false)
const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const launchingId = ref(null)
const page = ref(1)
const totalPages = ref(1)
const alertMsg = ref('')
const alertType = ref('success')
const activeStats = ref({})
let pollInterval = null

const searchQuery = ref('')
const statusFilter = ref('ALL')

const statusFilters = [
  { label: 'All / الكل', value: 'ALL' },
  { label: 'Running / جارية', value: 'RUNNING' },
  { label: 'Scheduled / مجدولة', value: 'SCHEDULED' },
  { label: 'Draft / مسودة', value: 'PENDING' },
  { label: 'Completed / مكتملة', value: 'COMPLETED' },
]

const launchModes = computed(() => [
  { value: 'immediate', label: isAr.value ? 'إطلاق فوري' : 'Launch Now', desc: isAr.value ? 'ترسل الرسائل فوراً' : 'Messages sent immediately' },
  { value: 'schedule', label: isAr.value ? 'جدولة الإرسال' : 'Schedule', desc: isAr.value ? 'حدد وقتاً مستقبلياً' : 'Pick a future date & time' },
  { value: 'draft', label: isAr.value ? 'حفظ كمسودة' : 'Save as Draft', desc: isAr.value ? 'أطلق يدوياً لاحقاً' : 'Launch manually later' }
])

const submitBtnLabel = computed(() => {
  if (isSubmitting.value) return isAr.value ? 'جارٍ الحفظ...' : 'Saving...'
  if (form.value.launchMode === 'immediate') return isAr.value ? 'إطلاق الحملة 🚀' : 'Launch Campaign 🚀'
  if (form.value.launchMode === 'schedule') return isAr.value ? 'جدولة الحملة' : 'Schedule Campaign'
  return isAr.value ? 'حفظ كمسودة' : 'Save as Draft'
})

const minDateTime = computed(() => {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  return d.toISOString().slice(0, 16)
})

const statusCount = (val) => {
  if (val === 'ALL') return campaigns.value.length
  return campaigns.value.filter(c => c.status === val).length
}

const totalCostAll = computed(() =>
  campaigns.value.reduce((sum, c) => sum + (c.totalCost || 0), 0).toFixed(4)
)

const filteredCampaigns = computed(() => {
  let list = campaigns.value
  if (statusFilter.value !== 'ALL') list = list.filter(c => c.status === statusFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q))
  }
  return list
})

const form = ref({ name: '', templateName: '', file: null, launchMode: 'immediate', scheduledAt: '' })

const statusLabel = (status) => {
  const map = { PENDING: isAr.value ? 'مسودة' : 'Draft', RUNNING: isAr.value ? 'جارية' : 'Running', SCHEDULED: isAr.value ? 'مجدولة' : 'Scheduled', COMPLETED: isAr.value ? 'مكتملة' : 'Completed', FAILED: isAr.value ? 'فشلت' : 'Failed' }
  return map[status] || status || 'PENDING'
}

const formatScheduledDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString(isAr.value ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dateStr }
}

const showAlert = (msg, type = 'success') => {
  alertMsg.value = msg; alertType.value = type
  setTimeout(() => { alertMsg.value = '' }, 6000)
}

const fetchCampaigns = async () => {
  loading.value = true
  const token = localStorage.getItem('token')
  try {
    let url = '/api/v1/campaigns?page=' + page.value + '&campaignType=META'
    if (activeMetaChannelId.value) url += '&channelId=' + activeMetaChannelId.value
    const res = await axios.get(url, { headers: { Authorization: 'Bearer ' + token } })
    campaigns.value = res.data.data
    if (res.data.meta) totalPages.value = res.data.meta.totalPages || 1
    campaigns.value.forEach(c => { if (c.status === 'RUNNING') loadStats(c.id) })
  } catch (err) { console.error(err) } finally { loading.value = false }
}

const loadStats = async (id) => {
  try {
    const res = await axios.get('/api/v1/campaigns/' + id + '/stats', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
    activeStats.value[id] = res.data.data.stats
    const campaign = campaigns.value.find(c => c.id === id)
    if (campaign && res.data.data.status) campaign.status = res.data.data.status
  } catch (err) {}
}

watch(activeMetaChannelId, () => { fetchCampaigns(); if (showCreateModal.value) fetchTemplates() })

const fetchTemplates = async () => {
  if (!activeMetaChannelId.value) return
  const token = localStorage.getItem('token')
  try {
    const res = await axios.get('/api/v1/meta/channel/' + activeMetaChannelId.value + '/meta-templates', { headers: { Authorization: 'Bearer ' + token } })
    metaTemplates.value = (res.data.data?.data || []).filter(t => t.status === 'APPROVED')
  } catch (err) { console.error(err) }
}

const handleFileUpload = (event) => { form.value.file = event.target.files[0] }

const openModal = () => {
  showCreateModal.value = true
  form.value = { name: '', templateName: '', file: null, launchMode: 'immediate', scheduledAt: '' }
  if (activeMetaChannelId.value) fetchTemplates()
}

const closeModal = () => {
  showCreateModal.value = false
  form.value = { name: '', templateName: '', file: null, launchMode: 'immediate', scheduledAt: '' }
}

const createCampaign = async () => {
  if (!form.value.name || !form.value.templateName || !form.value.file) {
    showAlert(isAr.value ? 'يرجى ملء جميع الحقول ورفع ملف.' : 'Please fill all fields and upload a file.', 'error'); return
  }
  if (!activeMetaChannelId.value) {
    showAlert(isAr.value ? 'يرجى تحديد قناة ميتا.' : 'Please select a Meta channel.', 'error'); return
  }
  if (form.value.launchMode === 'schedule') {
    if (!form.value.scheduledAt) { showAlert(isAr.value ? 'يرجى تحديد وقت الجدولة.' : 'Please select a scheduled time.', 'error'); return }
    if (new Date(form.value.scheduledAt) <= new Date()) { showAlert(isAr.value ? 'يجب أن يكون وقت الجدولة في المستقبل.' : 'Scheduled time must be in the future.', 'error'); return }
  }

  isSubmitting.value = true
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('name', form.value.name)
  formData.append('campaignType', 'META')
  formData.append('templateName', form.value.templateName)
  formData.append('channelId', activeMetaChannelId.value)
  const tpl = metaTemplates.value.find(t => t.name === form.value.templateName)
  if (tpl) {
    formData.append('metaCategory', tpl.category)
    // Send the template language so the worker uses correct language code
    const langCode = tpl.language || (tpl.components?.[0]?.language) || 'ar'
    formData.append('templateLanguage', langCode)
  }
  formData.append('file', form.value.file)
  if (form.value.launchMode === 'schedule' && form.value.scheduledAt) {
    formData.append('startDate', new Date(form.value.scheduledAt).toISOString())
  }

  try {
    const res = await axios.post('/api/v1/campaigns', formData, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' } })
    if (form.value.launchMode === 'draft') {
      showAlert(isAr.value ? 'تم حفظ الحملة كمسودة! يمكنك إطلاقها لاحقاً. 📝' : 'Campaign saved as Draft! Launch it manually later. 📝')
    } else {
      await axios.post('/api/v1/campaigns/' + res.data.campaignId + '/start', {}, { headers: { Authorization: 'Bearer ' + token } })
      if (form.value.launchMode === 'schedule') {
        showAlert(isAr.value ? 'تمت الجدولة بنجاح! ⏰ الإرسال في: ' + formatScheduledDate(form.value.scheduledAt) : 'Campaign scheduled! ⏰ Sending at: ' + formatScheduledDate(form.value.scheduledAt))
      } else {
        showAlert(isAr.value ? 'تم إطلاق الحملة بنجاح! 🚀' : 'Meta Campaign launched successfully! 🚀')
      }
    }
    closeModal(); fetchCampaigns()
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.response?.data?.error || (isAr.value ? 'فشل إنشاء الحملة.' : 'Failed to create campaign.');
    showAlert(errorMsg, 'error')
  } finally { isSubmitting.value = false }
}

const launchCampaign = async (campaignId) => {
  launchingId.value = campaignId
  try {
    await axios.post('/api/v1/campaigns/' + campaignId + '/start', {}, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
    showAlert(isAr.value ? 'تم إطلاق الحملة بنجاح! 🚀' : 'Campaign launched successfully! 🚀')
    fetchCampaigns()
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.response?.data?.error || (isAr.value ? 'فشل إطلاق الحملة.' : 'Failed to launch campaign.');
    showAlert(errorMsg, 'error')
  } finally { launchingId.value = null  }
}

const syncStats = async () => {
  const token = localStorage.getItem('token')
  const tenantStr = localStorage.getItem('tenant')
  if (!tenantStr) return
  try {
    const tenantObj = JSON.parse(tenantStr)
    const activeChannelId = localStorage.getItem(`active_meta_channel_${tenantObj.id}`)
    
    if (!activeChannelId) {
      alertMsg.value = isAr.value ? 'يرجى تحديد قناة واتساب أولاً.' : 'Please select an active channel first.'
      alertType.value = 'error'
      setTimeout(() => alertMsg.value = '', 4000)
      return
    }

    loading.value = true
    alertMsg.value = isAr.value ? 'جاري جلب الإحصائيات من Meta...' : 'Fetching statistics from Meta...'
    alertType.value = 'success'
    
    await axios.post(`/api/v1/meta/channel/${activeChannelId}/sync-stats`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Refresh campaigns list to show updated stats
    await fetchCampaigns()
    
    alertMsg.value = isAr.value ? 'تم تحديث جميع الإحصائيات بنجاح ✅' : 'All statistics synced successfully ✅'
    alertType.value = 'success'
    setTimeout(() => alertMsg.value = '', 4000)
  } catch (err) {
    console.error('Failed to sync stats', err)
    alertMsg.value = isAr.value ? 'حدث خطأ أثناء تحديث الإحصائيات.' : 'Failed to sync statistics.'
    alertType.value = 'error'
    setTimeout(() => alertMsg.value = '', 4000)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCampaigns()
  pollInterval = setInterval(() => { campaigns.value.filter(c => c.status === 'RUNNING').forEach(c => loadStats(c.id)) }, 10000)
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.mc-root { padding: 0 0 4rem; min-height: 100vh; background: #F0F2F7; font-family: 'Inter', sans-serif; max-width: 1440px; }

/* HERO */
.hero-header { background: linear-gradient(135deg, #0F172A 0%, #1a1f2e 50%, #0F172A 100%); padding: 1.75rem 2.5rem; position: relative; overflow: hidden; }
.hero-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 85% 50%, rgba(37,211,102,0.12) 0%, rgba(255,102,0,0.08) 50%, transparent 70%); pointer-events: none; }
.hero-content { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; position: relative; z-index: 1; flex-wrap: wrap; }
.hero-left { display: flex; align-items: center; gap: 1rem; }
.hero-icon-wrap { width: 44px; height: 44px; background: linear-gradient(135deg, #25D366, #128C7E); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 6px 18px rgba(37,211,102,0.35); }
.hero-title-row { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; margin-bottom: 0.2rem; }
.hero-title { font-size: 1.5rem; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.02em; }
.hero-sub { font-size: 0.82rem; color: #94A3B8; margin: 0; font-weight: 500; }
.hero-stats-inline { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hstat-chip { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.15); }
.hstat-chip.running-chip { background: rgba(37,99,235,0.2); color: #93C5FD; border-color: rgba(37,99,235,0.25); }
.hstat-chip.sched-chip  { background: rgba(124,58,237,0.2); color: #C4B5FD; border-color: rgba(124,58,237,0.25); }
.hstat-chip.cost-chip   { background: rgba(245,158,11,0.15); color: #FDE68A; border-color: rgba(245,158,11,0.2); }
.btn-create { display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 0.65rem 1.25rem; border: none; border-radius: 12px; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: all 0.25s; box-shadow: 0 4px 14px rgba(37,211,102,0.35); white-space: nowrap; font-family: inherit; }
.btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(37,211,102,0.45); }


/* ALERTS */
.mc-alert { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; align-items: center; gap: 10px; padding: 1rem 1.5rem; border-radius: 14px; font-weight: 600; font-size: 0.95rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); width: max-content; max-width: 90%; }
.mc-alert.error { background: #FEF2F2; color: #DC2626; border: 1px solid #FEE2E2; }
.mc-alert.success { background: #F0FDF4; color: #16A34A; border: 1px solid #DCFCE7; }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* FILTERS */
.filter-toolbar { display: flex; align-items: center; gap: 1rem; padding: 1.5rem 2.5rem; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 340px; }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
.search-input { width: 100%; padding: 0.7rem 1rem 0.7rem 2.5rem; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 0.875rem; color: #334155; background: white; outline: none; transition: all 0.2s; box-sizing: border-box; font-family: inherit; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.search-input:focus { border-color: #25D366; box-shadow: 0 0 0 3px rgba(37,211,102,0.1); }
.status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; color: #64748B; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit; }
.status-pill:hover { border-color: #CBD5E1; color: #334155; }
.status-pill.active { background: #0F172A; color: white; border-color: #0F172A; }
.status-pill.running.active { background: #1D4ED8; border-color: #1D4ED8; }
.status-pill.scheduled.active { background: #7C3AED; border-color: #7C3AED; }
.status-pill.completed.active { background: #059669; border-color: #059669; }
.pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #CBD5E1; }
.status-pill.active .pill-dot { background: rgba(255,255,255,0.6); }
.pill-badge { background: #F1F5F9; color: #64748B; padding: 1px 7px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; }
.status-pill.active .pill-badge { background: rgba(255,255,255,0.2); color: white; }

/* STATES */
.state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 6rem 2rem; color: #64748B; font-weight: 600; }
.spin-ring { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #25D366; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-empty { display: flex; flex-direction: column; align-items: center; padding: 5rem 2rem; text-align: center; color: #64748B; }
.empty-art { margin-bottom: 1.5rem; }
.state-empty h3 { font-size: 1.4rem; font-weight: 800; color: #1E293B; margin: 0 0 0.5rem; }
.state-empty p { font-size: 0.95rem; margin: 0; color: #94A3B8; }

/* CARDS */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem; padding: 0 2.5rem 2rem; }
@media(max-width:640px) { .cards-grid { grid-template-columns: 1fr; padding: 0 1rem 2rem; } }
.camp-card { background: #fff; border-radius: 20px; border: 1px solid #E8EDF5; box-shadow: 0 4px 16px rgba(0,0,0,0.04); display: flex; flex-direction: column; overflow: hidden; transition: all 0.28s cubic-bezier(0.4,0,0.2,1); position: relative; }
.camp-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #D1D9E8; }
.card-accent { height: 4px; width: 100%; }
.accent-pending   { background: linear-gradient(90deg, #94A3B8, #CBD5E1); }
.accent-running   { background: linear-gradient(90deg, #25D366, #128C7E); }
.accent-scheduled { background: linear-gradient(90deg, #7C3AED, #A78BFA); }
.accent-completed { background: linear-gradient(90deg, #10B981, #34D399); }
.accent-failed    { background: linear-gradient(90deg, #EF4444, #F87171); }
.card-head { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem 1.5rem 0; }
.card-icon-wrap { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-pending   { background: #F1F5F9; color: #94A3B8; }
.icon-running   { background: #DCFCE7; color: #128C7E; }
.icon-scheduled { background: #EDE9FE; color: #7C3AED; }
.icon-completed { background: #DCFCE7; color: #16A34A; }
.icon-failed    { background: #FEE2E2; color: #DC2626; }
.card-title-block { flex: 1; min-width: 0; }
.card-name { font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0 0 0.35rem; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.card-date { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #94A3B8; font-weight: 600; }
.cat-badge { background: #ECFDF5; color: #059669; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.sched-badge { display: flex; align-items: center; gap: 4px; background: #EDE9FE; color: #7C3AED; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 0.35rem 0.9rem; border-radius: 30px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; flex-shrink: 0; }
.badge-pending   { background: #F1F5F9; color: #64748B; }
.badge-running   { background: #DCFCE7; color: #128C7E; }
.badge-scheduled { background: #EDE9FE; color: #7C3AED; }
.badge-completed { background: #DCFCE7; color: #15803D; }
.badge-failed    { background: #FEE2E2; color: #B91C1C; }
.badge-pulse { width: 7px; height: 7px; border-radius: 50%; background: #25D366; animation: badge-pulse 1.4s infinite; }
.badge-pulse.sched-pulse { background: #7C3AED; }
@keyframes badge-pulse { 0%,100%{ transform:scale(1); opacity:1; } 50%{ transform:scale(1.6); opacity:0.4; } }
.cost-row { padding: 0.75rem 1.5rem; }
.cost-chip { display: inline-flex; align-items: center; gap: 6px; background: #FFFBEB; border: 1px solid #FEF3C7; color: #B45309; font-size: 0.8rem; font-weight: 600; padding: 0.3rem 0.875rem; border-radius: 8px; }
.cost-chip strong { color: #D97706; font-weight: 900; }
.card-stats { padding: 0 1.5rem 1rem; display: flex; flex-direction: column; gap: 1rem; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 0.875rem 0.5rem; border-radius: 14px; gap: 4px; transition: transform 0.2s; }
.stat-box:hover { transform: translateY(-2px); }
.stat-n { font-size: 1.35rem; font-weight: 900; line-height: 1; }
.stat-l { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.stat-box.total { background: #F8FAFC; border: 1px solid #E2E8F0; } .stat-box.total .stat-n { color: #0F172A; } .stat-box.total .stat-l { color: #94A3B8; }
.stat-box.sent  { background: #ECFDF5; border: 1px solid #D1FAE5; } .stat-box.sent  .stat-n { color: #059669; } .stat-box.sent  .stat-l { color: #6EE7B7; }
.stat-box.read  { background: #EFF6FF; border: 1px solid #BFDBFE; } .stat-box.read  .stat-n { color: #2563EB; } .stat-box.read  .stat-l { color: #93C5FD; }
.stat-box.failed{ background: #FEF2F2; border: 1px solid #FEE2E2; } .stat-box.failed.stat-n { color: #DC2626; } .stat-box.failed .stat-l { color: #FCA5A5; }
.stat-box.failed .stat-n { color: #DC2626; }
.prog-wrap {}
.prog-labels { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 7px; }
.prog-title { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
.prog-pct { font-size: 1.1rem; font-weight: 900; }
.prog-pct.read { color: #2563EB; }
.prog-track { height: 8px; background: #F1F5F9; border-radius: 99px; overflow: hidden; position: relative; box-shadow: inset 0 1px 3px rgba(0,0,0,0.06); }
.prog-bar-sent { position: absolute; inset-y: 0; left: 0; background: #25D366; border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.prog-bar-read { position: absolute; inset-y: 0; left: 0; background: #2563EB; border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.prog-legend { display: flex; gap: 1rem; margin-top: 6px; font-size: 0.7rem; font-weight: 700; }
.legend-sent { color: #25D366; } .legend-read { color: #2563EB; }
.card-pending-banner { display: flex; align-items: center; gap: 0.75rem; margin: 0 1.5rem; background: linear-gradient(to right, #F8FAFC, #F1F5F9); border: 1px dashed #CBD5E1; padding: 1rem 1.25rem; border-radius: 12px; color: #64748B; font-size: 0.875rem; font-weight: 600; }
.card-pending-banner.sched-banner { background: linear-gradient(to right, #F5F3FF, #EDE9FE); border-color: #A78BFA; color: #6D28D9; }
.act-btn-launch { display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 1.1rem; background: linear-gradient(135deg, #25D366, #128C7E); color: white; border: none; border-radius: 10px; font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 3px 10px rgba(37,211,102,0.3); font-family: inherit; }
.act-btn-launch:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(37,211,102,0.45); }
.act-btn-launch:disabled { opacity: 0.7; cursor: not-allowed; }
.card-actions { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem 1.5rem; border-top: 1px dashed #F1F5F9; margin-top: 0.75rem; }
.actions-left, .actions-right { display: flex; align-items: center; gap: 8px; }
.act-btn { width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.act-btn.refresh:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }
.btn-view { display: inline-flex; align-items: center; gap: 5px; padding: 0.6rem 1.1rem; background: white; color: #0F172A; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 0.85rem; font-weight: 800; text-decoration: none; transition: all 0.2s; }
.btn-view:hover { background: #F8FAFC; border-color: #CBD5E1; transform: translateY(-1px); }
.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; }
.page-btn { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: #25D366; color: #25D366; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-numbers { display: flex; align-items: center; gap: 6px; }
.page-num { font-size: 0.95rem; font-weight: 800; color: #0F172A; }
.page-sep { color: #CBD5E1; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 1rem; }
.modal-box { background: white; border-radius: 24px; width: 100%; max-width: 820px; max-height: 94vh; overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.2); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; transform: scale(0.95); }
.modal-layout { display: grid; grid-template-columns: 270px 1fr; height: 100%; }
.modal-guide { background: linear-gradient(160deg, #0F172A 0%, #1E293B 100%); padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; border-radius: 24px 0 0 24px; overflow-y: auto; }
.guide-header { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 800; color: white; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.guide-header svg { color: #FF6600; }
.guide-items { display: flex; flex-direction: column; gap: 1rem; }
.guide-item { display: flex; gap: 0.875rem; }
.guide-item strong { display: block; font-size: 0.85rem; font-weight: 800; color: #F1F5F9; margin-bottom: 2px; }
.guide-item p { font-size: 0.77rem; color: #94A3B8; margin: 0; line-height: 1.5; }
.guide-num { width: 26px; height: 26px; border-radius: 8px; background: rgba(255,102,0,0.15); color: #FF6600; font-size: 0.8rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.guide-item.warn .guide-num { background: rgba(251,191,36,0.15); color: #FBBF24; }
.guide-separator { height: 1px; background: rgba(255,255,255,0.07); margin: 0.25rem 0; }
.guide-launch-info { display: flex; flex-direction: column; gap: 0.5rem; }
.gli-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.65rem; border-radius: 10px; }
.gli-item strong { display: block; font-size: 0.8rem; font-weight: 800; color: #F1F5F9; margin-bottom: 2px; }
.gli-item p { font-size: 0.72rem; color: #64748B; margin: 0; }
.gli-item svg { flex-shrink: 0; margin-top: 1px; }
.gli-immediate { background: rgba(37,211,102,0.08); } .gli-immediate svg { color: #25D366; }
.gli-schedule  { background: rgba(124,58,237,0.1);  } .gli-schedule svg  { color: #A78BFA; }
.gli-draft     { background: rgba(248,150,30,0.08); } .gli-draft svg     { color: #F8961E; }
.modal-form-panel { display: flex; flex-direction: column; max-height: 94vh; overflow-y: auto; }
.modal-form-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.75rem 1.75rem 1.25rem; border-bottom: 1px solid #F1F5F9; position: sticky; top: 0; background: white; z-index: 1; }
.modal-form-header h2 { margin: 0 0 0.2rem; font-size: 1.15rem; font-weight: 800; color: #0F172A; }
.modal-form-header p { margin: 0; font-size: 0.85rem; color: #64748B; }
.modal-close-btn { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; flex-shrink: 0; }
.modal-close-btn:hover { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; }
.channel-warning { display: flex; align-items: flex-start; gap: 10px; background: #FFFBEB; border: 1px dashed #FCD34D; padding: 1rem; border-radius: 12px; color: #B45309; }
.channel-warning svg { color: #D97706; flex-shrink: 0; }
.channel-warning strong { display: block; margin-bottom: 2px; font-size: 0.9rem; }
.channel-warning p { margin: 0; font-size: 0.8rem; color: #92400E; }
.modal-form-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; flex: 1; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-label { font-size: 0.85rem; font-weight: 700; color: #334155; }
.form-input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #E2E8F0; border-radius: 12px; font-family: inherit; font-size: 0.875rem; color: #334155; outline: none; transition: all 0.2s; box-sizing: border-box; background: white; }
.form-input:focus { border-color: #25D366; box-shadow: 0 0 0 3px rgba(37,211,102,0.08); }
.form-hint { font-size: 0.78rem; color: #94A3B8; }
.form-hint.warn { color: #D97706; }
.file-drop { border: 2px dashed #E2E8F0; border-radius: 14px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #64748B; font-size: 0.875rem; font-weight: 600; }
.file-drop:hover { border-color: #25D366; background: #F0FDF4; color: #059669; }
.file-drop.has-file { border-color: #25D366; background: #F0FDF4; border-style: solid; }
.file-drop svg { color: #94A3B8; } .file-drop.has-file svg { color: #25D366; }
.file-name { color: #059669; font-weight: 700; }
.file-drop small { font-size: 0.75rem; color: #94A3B8; font-weight: 400; }

/* LAUNCH MODE */
.launch-mode-grid { display: flex; flex-direction: column; gap: 10px; }
.launch-mode-btn { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border: 2px solid #E2E8F0; border-radius: 14px; background: white; cursor: pointer; transition: all 0.2s; text-align: left; font-family: inherit; position: relative; }
.launch-mode-btn:hover { border-color: #CBD5E1; background: #F8FAFC; }
.launch-mode-btn.lm-immediate.active { border-color: #25D366; background: linear-gradient(to right, #F0FDF4, #FFFFFF); box-shadow: 0 0 0 3px rgba(37,211,102,0.1); }
.launch-mode-btn.lm-schedule.active  { border-color: #7C3AED; background: linear-gradient(to right, #F5F3FF, #FFFFFF); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.launch-mode-btn.lm-draft.active     { border-color: #F8961E; background: linear-gradient(to right, #FFF7ED, #FFFFFF); box-shadow: 0 0 0 3px rgba(248,150,30,0.1); }
.lm-icon { width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9; color: #94A3B8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
.launch-mode-btn.lm-immediate.active .lm-icon { background: #DCFCE7; color: #059669; }
.launch-mode-btn.lm-schedule.active  .lm-icon { background: #EDE9FE; color: #7C3AED; }
.launch-mode-btn.lm-draft.active     .lm-icon { background: #FEF3C7; color: #D97706; }
.lm-text { flex: 1; }
.lm-title { display: block; font-size: 0.9rem; font-weight: 800; color: #0F172A; margin-bottom: 2px; }
.lm-sub   { display: block; font-size: 0.78rem; color: #94A3B8; }
.lm-check { width: 22px; height: 22px; border-radius: 50%; background: #0F172A; color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.launch-mode-btn.lm-immediate.active .lm-check { background: #25D366; }
.launch-mode-btn.lm-schedule.active  .lm-check { background: #7C3AED; }
.launch-mode-btn.lm-draft.active     .lm-check { background: #F8961E; }

/* DATETIME */
.datetime-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.datetime-input { color: #334155; }
.datetime-preview { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #7C3AED; font-weight: 600; background: #F5F3FF; border: 1px solid #DDD6FE; padding: 0.5rem 0.875rem; border-radius: 10px; }
.datetime-preview svg { color: #7C3AED; flex-shrink: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); max-height: 0; padding: 0; }

/* FORM ACTIONS */
.modal-form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.75rem; border-top: 1px solid #F1F5F9; background: #FAFBFD; }
.btn-cancel { padding: 0.75rem 1.5rem; background: white; color: #64748B; border: 1.5px solid #E2E8F0; border-radius: 12px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-cancel:hover { background: #F8FAFC; border-color: #CBD5E1; }
.btn-submit { display: inline-flex; align-items: center; gap: 8px; padding: 0.75rem 1.75rem; color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 0.875rem; cursor: pointer; transition: all 0.25s; font-family: inherit; }
.btn-submit.btn-immediate { background: linear-gradient(135deg, #25D366, #128C7E); box-shadow: 0 4px 14px rgba(37,211,102,0.35); }
.btn-submit.btn-immediate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(37,211,102,0.45); }
.btn-submit.btn-schedule  { background: linear-gradient(135deg, #7C3AED, #5B21B6); box-shadow: 0 4px 14px rgba(124,58,237,0.35); }
.btn-submit.btn-schedule:hover:not(:disabled)  { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(124,58,237,0.45); }
.btn-submit.btn-draft     { background: linear-gradient(135deg, #F8961E, #D97706); box-shadow: 0 4px 14px rgba(248,150,30,0.35); }
.btn-submit.btn-draft:hover:not(:disabled)     { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(248,150,30,0.45); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none !important; }
.spin-icon { animation: spin 1s linear infinite; }
</style>
