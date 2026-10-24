<template>
  <div class="p-6 max-w-5xl mx-auto" :dir="isAr ? 'rtl' : 'ltr'">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">{{ isAr ? 'الفرق والشيفتات' : 'Teams & Shifts' }}</h1>
      <p class="text-slate-500 mt-1">{{ isAr ? 'وزّع المحادثات تلقائياً على الموظفين الموجودين في الدوام، حسب الفريق المسؤول عن كل رقم.' : 'Route conversations automatically to on-shift agents of the team that owns each number.' }}</p>
    </div>

    <div class="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="activeTab = tab.key"
        class="px-4 py-2.5 -mb-px border-b-2 font-semibold text-sm transition-colors bg-transparent cursor-pointer whitespace-nowrap"
        :class="activeTab === tab.key ? 'border-[#FF6600] text-[#FF6600]' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        <i :class="tab.icon" class="me-2"></i>{{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12 text-slate-400">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <!-- ══ Teams ══ -->
    <section v-else-if="activeTab === 'teams'">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
        <p class="text-sm text-slate-500">{{ isAr ? 'كل رقم واتساب يتبع فريقاً واحداً، وتذاكره الجديدة تُسند لأحد أعضائه تلقائياً.' : 'Each WhatsApp number belongs to one team; its new tickets are assigned to a team member automatically.' }}</p>
        <button v-if="canManage" type="button" @click="openTeamModal()" class="bg-[#FF6600] hover:bg-[#E65C00] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-orange-500/20 transition-colors border-none cursor-pointer">
          <i class="fas fa-plus me-2"></i>{{ isAr ? 'إضافة فريق' : 'Add Team' }}
        </button>
      </div>

      <div v-if="teams.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-people-group text-2xl text-slate-400"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-2">{{ isAr ? 'لا توجد فرق بعد' : 'No teams yet' }}</h3>
        <p class="text-slate-500 max-w-md mx-auto text-sm">{{ isAr ? 'مثال: فريق المبيعات على رقم المبيعات، وفريق الدعم على رقم الدعم.' : 'Example: a Sales team on the sales number and a Support team on the support number.' }}</p>
      </div>

      <div v-else class="grid md:grid-cols-2 gap-4">
        <div v-for="team in teams" :key="team.id" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ background: team.color }"></span>
              <h3 class="font-bold text-slate-800">{{ team.name }}</h3>
            </div>
            <div v-if="canManage" class="flex gap-2">
              <button type="button" @click="openTeamModal(team)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center border-none cursor-pointer" :title="isAr ? 'تعديل' : 'Edit'">
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" @click="deleteTeam(team)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center border-none cursor-pointer" :title="isAr ? 'حذف' : 'Delete'">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="text-xs font-semibold text-slate-400 mb-2">{{ isAr ? 'الأعضاء' : 'Members' }}</div>
          <div class="flex flex-wrap gap-1.5 mb-4">
            <span v-if="team.memberIds.length === 0" class="text-sm text-slate-400">—</span>
            <span
              v-for="id in team.memberIds"
              :key="id"
              class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700"
              :class="{ 'opacity-50': !memberMap[id]?.isActive }"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="memberMap[id]?.onShiftNow ? 'bg-emerald-500' : 'bg-slate-300'"></span>
              {{ memberMap[id]?.name || '—' }}
            </span>
          </div>

          <div class="text-xs font-semibold text-slate-400 mb-2">{{ isAr ? 'الأرقام' : 'Numbers' }}</div>
          <div class="flex flex-wrap gap-1.5 mb-4">
            <span v-if="team.channelIds.length === 0" class="text-sm text-slate-400">{{ isAr ? 'لا يوجد رقم — لن تُسند له محادثات تلقائياً' : 'No number — nothing is routed to it' }}</span>
            <span v-for="id in team.channelIds" :key="id" class="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700" dir="ltr">
              {{ channelLabel(id) }}
            </span>
          </div>

          <div class="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
            <i class="fas fa-shuffle me-1 text-slate-400"></i>{{ routingSummary(team.routing) }}
          </div>
        </div>
      </div>
    </section>

    <!-- ══ Shifts ══ -->
    <section v-else-if="activeTab === 'shifts'">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm">
          <span class="font-bold text-slate-800">{{ isAr ? 'المنطقة الزمنية' : 'Timezone' }}</span>
          <span class="text-slate-500 ms-2">{{ isAr ? 'تُحسب أوقات الشيفتات عليها' : 'Shift times use this timezone' }}</span>
        </div>
        <select v-model="timezone" @change="saveTimezone" :disabled="!canManage" class="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-[#FF6600]" dir="ltr">
          <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
        </select>
      </div>

      <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
        <p class="text-sm text-slate-500">{{ isAr ? 'عرّف الشيفتات مرة واحدة (مثلاً 4 شيفتات)، ثم انقل الموظفين بينها من تبويب «جدول الموظفين».' : 'Define your shifts once (e.g. 4 shifts), then move people between them in the "Schedule" tab.' }}</p>
        <button v-if="canManage" type="button" @click="openShiftModal()" class="bg-[#FF6600] hover:bg-[#E65C00] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-orange-500/20 transition-colors border-none cursor-pointer">
          <i class="fas fa-plus me-2"></i>{{ isAr ? 'إضافة شيفت' : 'Add Shift' }}
        </button>
      </div>

      <div v-if="shifts.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-clock text-2xl text-slate-400"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-2">{{ isAr ? 'لا توجد شيفتات بعد' : 'No shifts yet' }}</h3>
        <p class="text-slate-500 max-w-md mx-auto text-sm">{{ isAr ? 'مثال: صباحي 8–4، مسائي 4–12، ليلي 12–8.' : 'Example: Morning 8–4, Evening 4–12, Night 12–8.' }}</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div v-for="shift in shifts" :key="shift.id" class="flex flex-wrap items-center gap-3 px-5 py-4">
          <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: shift.color }"></span>
          <div class="min-w-[140px]">
            <div class="font-bold text-slate-800">{{ shift.name }}</div>
            <div class="text-xs text-slate-500 mt-0.5" dir="ltr">
              {{ shift.startTime }} – {{ shift.endTime }}
              <span v-if="crossesMidnight(shift)" class="text-amber-600">({{ isAr ? 'لليوم التالي' : 'next day' }})</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(day, i) in dayLabels"
              :key="i"
              class="text-[11px] font-semibold w-9 text-center py-0.5 rounded-md"
              :class="shift.days.includes(i) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'"
            >{{ day }}</span>
          </div>
          <span class="text-xs text-slate-500 ms-auto">
            <i class="fas fa-user me-1"></i>{{ membersOnShift(shift.id) }} {{ isAr ? 'موظف' : 'people' }}
          </span>
          <div v-if="canManage" class="flex gap-2">
            <button type="button" @click="openShiftModal(shift)" class="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center border-none cursor-pointer" :title="isAr ? 'تعديل' : 'Edit'">
              <i class="fas fa-pen"></i>
            </button>
            <button type="button" @click="deleteShift(shift)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center border-none cursor-pointer" :title="isAr ? 'حذف' : 'Delete'">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ Working hours ══ -->
    <section v-else-if="activeTab === 'hours'">
      <p class="text-sm text-slate-500 mb-4">
        {{ isAr ? 'حدّد ساعات عمل كل رقم. إذا راسلك عميل خارجها يصله رد تلقائي (مرة كل 12 ساعة كحد أقصى).' : 'Set working hours per number. Customers writing outside them get an automatic reply (at most once every 12 hours).' }}
        <span class="text-slate-400">{{ isAr ? 'المنطقة الزمنية:' : 'Timezone:' }} <span dir="ltr">{{ timezone }}</span></span>
      </p>

      <div v-if="hoursList.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm text-slate-500 text-sm">
        {{ isAr ? 'لا توجد أرقام مربوطة.' : 'No connected numbers.' }}
      </div>

      <template v-else>
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="h in hoursList"
            :key="h.channelId"
            type="button"
            @click="selectHoursChannel(h.channelId)"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors"
            :class="hoursForm?.channelId === h.channelId ? 'border-[#FF6600] bg-orange-50 text-[#FF6600]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
          >
            <span class="w-2 h-2 rounded-full" :class="h.enabled ? 'bg-emerald-500' : 'bg-slate-300'"></span>
            <span dir="ltr">{{ channelLabel(h.channelId) }}</span>
          </button>
        </div>

        <div v-if="hoursForm" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 class="font-bold text-slate-800">{{ isAr ? 'الرد التلقائي خارج الدوام' : 'Away reply outside working hours' }}</h3>
              <p class="text-sm text-slate-500 mt-0.5">{{ isAr ? 'عند الإيقاف لا يُرسل أي رد تلقائي لهذا الرقم.' : 'When off, this number sends no automatic reply.' }}</p>
            </div>
            <button type="button" dir="ltr" :disabled="!canManage" @click="hoursForm.enabled = !hoursForm.enabled" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors border-none cursor-pointer" :class="hoursForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform" :class="hoursForm.enabled ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>

          <div class="space-y-2 mb-3">
            <div v-for="d in hoursForm.days" :key="d.day" class="flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 w-28 cursor-pointer text-sm font-semibold text-slate-700">
                <input type="checkbox" v-model="d.open" :disabled="!canManage" class="accent-[#FF6600]" />
                {{ dayNames[d.day] }}
              </label>
              <template v-if="d.open">
                <input v-model="d.from" type="time" :disabled="!canManage" class="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-[#FF6600]" dir="ltr" />
                <span class="text-slate-400 text-sm">{{ isAr ? 'إلى' : 'to' }}</span>
                <input v-model="d.to" type="time" :disabled="!canManage" class="px-3 py-1.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-[#FF6600]" dir="ltr" />
                <span v-if="d.to <= d.from" class="text-xs text-amber-600"><i class="fas fa-moon me-1"></i>{{ isAr ? 'لليوم التالي' : 'next day' }}</span>
              </template>
              <span v-else class="text-sm text-slate-400">{{ isAr ? 'مغلق' : 'Closed' }}</span>
            </div>
          </div>
          <button v-if="canManage" type="button" @click="copyFirstOpenDay" class="text-xs font-semibold text-[#FF6600] bg-transparent border-none cursor-pointer p-0 mb-5">
            <i class="fas fa-copy me-1"></i>{{ isAr ? 'نسخ ساعات أول يوم مفتوح لكل الأيام المفتوحة' : 'Copy the first open day to all open days' }}
          </button>

          <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'نص الرد التلقائي' : 'Away message' }}</label>
          <textarea v-model="hoursForm.awayMessage" :disabled="!canManage" rows="3" maxlength="1000" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none resize-y"></textarea>

          <div v-if="canManage" class="flex justify-end mt-4">
            <button type="button" @click="saveHours" :disabled="saving" class="bg-[#FF6600] hover:bg-[#E65C00] text-white px-8 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 disabled:opacity-50 border-none cursor-pointer">
              <i v-if="saving" class="fas fa-spinner fa-spin me-2"></i>{{ isAr ? 'حفظ ساعات العمل' : 'Save working hours' }}
            </button>
          </div>
        </div>
      </template>
    </section>

    <!-- ══ Schedule ══ -->
    <section v-else>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div class="text-2xl font-bold text-emerald-600">{{ onDutyCount }}</div>
          <div class="text-xs text-slate-500 mt-1">{{ isAr ? 'في الدوام الآن' : 'On duty now' }}</div>
        </div>
        <div v-for="shift in shifts.slice(0, 3)" :key="shift.id" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div class="text-2xl font-bold" :style="{ color: shift.color }">{{ membersOnShift(shift.id) }}</div>
          <div class="text-xs text-slate-500 mt-1 truncate">{{ shift.name }}</div>
        </div>
      </div>

      <div v-if="members.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm text-slate-500 text-sm">
        {{ isAr ? 'أضف موظفين أولاً من صفحة المستخدمين.' : 'Add team members first from the Users page.' }}
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs">
              <th class="p-3 font-semibold text-start">{{ isAr ? 'الموظف' : 'Member' }}</th>
              <th class="p-3 font-semibold text-start">{{ isAr ? 'الشيفت الحالي' : 'Current shift' }}</th>
              <th class="p-3 font-semibold text-start">{{ isAr ? 'الآن' : 'Now' }}</th>
              <th class="p-3 font-semibold text-start">{{ isAr ? 'تغييرات قادمة' : 'Upcoming changes' }}</th>
              <th v-if="canManage" class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.id" class="border-b border-slate-100 last:border-0" :class="{ 'opacity-60': !member.isActive }">
              <td class="p-3">
                <div class="font-semibold text-slate-800">{{ member.name }}</div>
                <div class="text-xs text-slate-400">{{ roleLabel(member.role) }}<span v-if="!member.isActive"> · {{ isAr ? 'موقوف' : 'Disabled' }}</span></div>
              </td>
              <td class="p-3">
                <span v-if="shiftMap[member.currentShiftId]" class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border" :style="chipStyle(shiftMap[member.currentShiftId].color)">
                  {{ shiftMap[member.currentShiftId].name }}
                  <span class="opacity-70 font-normal" dir="ltr">{{ shiftMap[member.currentShiftId].startTime }}–{{ shiftMap[member.currentShiftId].endTime }}</span>
                </span>
                <span v-else class="text-xs text-slate-400">{{ isAr ? 'بدون شيفت' : 'No shift' }}</span>
                <div v-if="member.currentSince" class="text-[11px] text-slate-400 mt-1">{{ isAr ? 'منذ' : 'since' }} <span dir="ltr">{{ member.currentSince }}</span></div>
              </td>
              <td class="p-3">
                <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="member.onShiftNow ? 'text-emerald-600' : 'text-slate-400'">
                  <span class="w-2 h-2 rounded-full" :class="member.onShiftNow ? 'bg-emerald-500' : 'bg-slate-300'"></span>
                  {{ member.onShiftNow ? (isAr ? 'في الدوام' : 'On duty') : (isAr ? 'خارج الدوام' : 'Off duty') }}
                </span>
              </td>
              <td class="p-3">
                <span v-if="member.upcoming.length === 0" class="text-xs text-slate-300">—</span>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="change in member.upcoming" :key="change.id" class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                    <span dir="ltr">{{ change.effectiveFrom }}</span>
                    <i class="fas text-[9px] opacity-60" :class="isAr ? 'fa-arrow-left' : 'fa-arrow-right'"></i>
                    <strong>{{ shiftMap[change.shiftId]?.name || (isAr ? 'بدون شيفت' : 'No shift') }}</strong>
                    <button v-if="canManage" type="button" @click="deleteAssignment(change)" class="bg-transparent border-none cursor-pointer text-amber-700 opacity-60 hover:opacity-100 p-0" :title="isAr ? 'إلغاء' : 'Cancel'">
                      <i class="fas fa-xmark"></i>
                    </button>
                  </span>
                </div>
              </td>
              <td v-if="canManage" class="p-3 text-end">
                <button type="button" @click="openAssignModal(member)" class="text-xs font-semibold text-[#FF6600] hover:text-[#E65C00] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border-none cursor-pointer whitespace-nowrap">
                  <i class="fas fa-right-left me-1"></i>{{ isAr ? 'نقل لشيفت' : 'Change shift' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ══ Team Modal ══ -->
    <div v-if="showTeamModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showTeamModal = false"></div>
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800">{{ teamForm.id ? (isAr ? 'تعديل الفريق' : 'Edit Team') : (isAr ? 'فريق جديد' : 'New Team') }}</h3>
          <button type="button" @click="showTeamModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <form @submit.prevent="saveTeam" class="p-6 overflow-y-auto space-y-5">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'اسم الفريق' : 'Team name' }} *</label>
              <input v-model="teamForm.name" required maxlength="40" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none" :placeholder="isAr ? 'مثال: المبيعات' : 'e.g. Sales'" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'اللون' : 'Color' }}</label>
              <div class="flex gap-1.5 flex-wrap max-w-[150px]">
                <button v-for="color in LABEL_COLORS" :key="color" type="button" @click="teamForm.color = color" class="w-6 h-6 rounded-full border-none cursor-pointer" :class="teamForm.color === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''" :style="{ background: color }"></button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الأعضاء' : 'Members' }}</label>
            <div class="grid sm:grid-cols-2 gap-2">
              <label v-for="member in members" :key="member.id" class="flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer text-sm transition-colors" :class="teamForm.memberIds.includes(member.id) ? 'border-[#FF6600] bg-orange-50/60' : 'border-slate-200'">
                <input type="checkbox" :value="member.id" v-model="teamForm.memberIds" class="accent-[#FF6600]" />
                <span class="flex-1 truncate">{{ member.name }}</span>
                <span v-if="!member.isActive" class="text-[10px] text-slate-400">{{ isAr ? 'موقوف' : 'Disabled' }}</span>
              </label>
            </div>
            <p v-if="members.length === 0" class="text-sm text-slate-400">{{ isAr ? 'لا يوجد موظفون بعد.' : 'No team members yet.' }}</p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الأرقام التي يستلمها الفريق' : 'Numbers this team handles' }}</label>
            <div class="grid sm:grid-cols-2 gap-2">
              <label
                v-for="ch in channels"
                :key="ch.id"
                class="flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors"
                :class="[
                  teamForm.channelIds.includes(ch.id) ? 'border-[#FF6600] bg-orange-50/60' : 'border-slate-200',
                  channelOwner(ch.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                ]"
                :title="channelOwner(ch.id) ? (isAr ? `يتبع فريق ${channelOwner(ch.id).name}` : `Belongs to ${channelOwner(ch.id).name}`) : ''"
              >
                <input type="checkbox" :value="ch.id" v-model="teamForm.channelIds" :disabled="!!channelOwner(ch.id)" class="accent-[#FF6600]" />
                <span class="flex-1 truncate" dir="ltr">{{ ch.displayPhoneNumber || ch.phoneNumber }}</span>
                <span v-if="channelOwner(ch.id)" class="text-[10px] text-slate-400">{{ channelOwner(ch.id).name }}</span>
              </label>
            </div>
            <p v-if="channels.length === 0" class="text-sm text-slate-400">{{ isAr ? 'لا توجد أرقام مربوطة.' : 'No connected numbers.' }}</p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'طريقة التوزيع' : 'Routing' }}</label>
            <div class="grid sm:grid-cols-3 gap-2">
              <button
                v-for="mode in routingModes"
                :key="mode.key"
                type="button"
                @click="teamForm.routing.mode = mode.key"
                class="text-start border rounded-xl p-3 cursor-pointer transition-colors bg-white"
                :class="teamForm.routing.mode === mode.key ? 'border-[#FF6600] bg-orange-50/60' : 'border-slate-200 hover:border-slate-300'"
              >
                <i :class="mode.icon" class="text-[#FF6600]"></i>
                <div class="font-bold text-sm text-slate-800 mt-1">{{ mode.label }}</div>
                <div class="text-[11px] text-slate-500 mt-0.5 leading-snug">{{ mode.desc }}</div>
              </button>
            </div>
          </div>

          <div v-if="teamForm.routing.mode !== 'MANUAL'" class="space-y-3">
            <label class="flex items-start gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" v-model="teamForm.routing.onlyOnShift" class="accent-[#FF6600] mt-1" />
              <span>
                <strong>{{ isAr ? 'للموظفين في الدوام فقط' : 'Only agents on shift' }}</strong>
                <span class="block text-xs text-slate-500">{{ isAr ? 'إن لم يكن أحد في الدوام تبقى التذكرة بدون إسناد.' : 'If nobody is on shift the ticket stays unassigned.' }}</span>
              </span>
            </label>
            <label class="flex items-start gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" v-model="teamForm.routing.stickyOwner" class="accent-[#FF6600] mt-1" />
              <span>
                <strong>{{ isAr ? 'العميل يرجع لموظفه السابق' : 'Returning customers go to their previous agent' }}</strong>
                <span class="block text-xs text-slate-500">{{ isAr ? 'إذا كان ذلك الموظف متاحاً الآن.' : 'When that agent is available.' }}</span>
              </span>
            </label>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" @click="showTeamModal = false" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 bg-white cursor-pointer">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button type="submit" :disabled="saving" class="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>{{ isAr ? 'حفظ' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══ Shift Modal ══ -->
    <div v-if="showShiftModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showShiftModal = false"></div>
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800">{{ shiftForm.id ? (isAr ? 'تعديل الشيفت' : 'Edit Shift') : (isAr ? 'شيفت جديد' : 'New Shift') }}</h3>
          <button type="button" @click="showShiftModal = false" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <form @submit.prevent="saveShift" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'الاسم' : 'Name' }} *</label>
            <input v-model="shiftForm.name" required maxlength="30" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] text-sm outline-none" :placeholder="isAr ? 'مثال: صباحي' : 'e.g. Morning'" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'من' : 'From' }}</label>
              <input v-model="shiftForm.startTime" type="time" required class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600]" dir="ltr" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'إلى' : 'To' }}</label>
              <input v-model="shiftForm.endTime" type="time" required class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600]" dir="ltr" />
            </div>
          </div>
          <p v-if="crossesMidnight(shiftForm)" class="text-xs text-amber-600 -mt-2">
            <i class="fas fa-moon me-1"></i>{{ isAr ? 'هذا الشيفت يمتد لما بعد منتصف الليل.' : 'This shift continues past midnight.' }}
          </p>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-semibold text-slate-700">{{ isAr ? 'أيام الشيفت' : 'Days' }}</label>
              <div class="flex gap-2 text-xs">
                <button type="button" @click="shiftForm.days = [0, 1, 2, 3, 4]" class="text-[#FF6600] bg-transparent border-none cursor-pointer">{{ isAr ? 'أحد–خميس' : 'Sun–Thu' }}</button>
                <button type="button" @click="shiftForm.days = [0, 1, 2, 3, 4, 5, 6]" class="text-[#FF6600] bg-transparent border-none cursor-pointer">{{ isAr ? 'كل الأيام' : 'Every day' }}</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="(day, i) in dayLabels"
                :key="i"
                type="button"
                @click="toggleDay(i)"
                class="text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                :class="shiftForm.days.includes(i) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'"
              >{{ day }}</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'اللون' : 'Color' }}</label>
            <div class="flex gap-2 flex-wrap">
              <button v-for="color in LABEL_COLORS" :key="color" type="button" @click="shiftForm.color = color" class="w-7 h-7 rounded-full border-none cursor-pointer" :class="shiftForm.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''" :style="{ background: color }"></button>
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="showShiftModal = false" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 bg-white cursor-pointer">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button type="submit" :disabled="saving" class="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>{{ isAr ? 'حفظ' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══ Assign Modal ══ -->
    <div v-if="assignTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="assignTarget = null"></div>
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-bold text-slate-800">{{ isAr ? `نقل ${assignTarget.name} لشيفت` : `Move ${assignTarget.name} to a shift` }}</h3>
          <button type="button" @click="assignTarget = null" class="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"><i class="fas fa-times"></i></button>
        </div>
        <form @submit.prevent="saveAssignment" class="p-6 space-y-4">
          <div class="space-y-2">
            <label
              v-for="option in shiftOptions"
              :key="option.id || 'none'"
              class="flex items-center gap-3 border rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-colors"
              :class="assignForm.shiftId === option.id ? 'border-[#FF6600] bg-orange-50/60' : 'border-slate-200 hover:border-slate-300'"
            >
              <input type="radio" :value="option.id" v-model="assignForm.shiftId" class="accent-[#FF6600]" />
              <span class="w-2.5 h-2.5 rounded-full" :style="{ background: option.color }"></span>
              <span class="flex-1 font-medium text-slate-700">{{ option.name }}</span>
              <span v-if="option.time" class="text-xs text-slate-400" dir="ltr">{{ option.time }}</span>
            </label>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">{{ isAr ? 'ابتداءً من' : 'Starting from' }}</label>
            <input v-model="assignForm.effectiveFrom" type="date" required class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-[#FF6600]" dir="ltr" />
            <p class="text-xs text-slate-500 mt-1.5">{{ isAr ? 'يمكنك جدولة التبديل مسبقاً، وسيتغير الشيفت تلقائياً في ذلك اليوم.' : 'You can schedule the change ahead; it switches automatically on that day.' }}</p>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="assignTarget = null" class="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 bg-white cursor-pointer">{{ isAr ? 'إلغاء' : 'Cancel' }}</button>
            <button type="submit" :disabled="saving" class="flex-1 bg-[#FF6600] hover:bg-[#E65C00] text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>{{ isAr ? 'حفظ' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Swal from 'sweetalert2'
import { LABEL_COLORS } from '../data/chatLabels'

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

const canManage = (() => {
  try {
    const t = JSON.parse(localStorage.getItem('tenant') || '{}')
    return !t.isSubUser || !!t.subUser?.permissions?.can_manage_sub_users
  } catch {
    return false
  }
})()

const activeTab = ref('teams')
const tabs = computed(() => [
  { key: 'teams', icon: 'fas fa-people-group', label: isAr.value ? 'الفرق' : 'Teams' },
  { key: 'shifts', icon: 'fas fa-clock', label: isAr.value ? 'الشيفتات' : 'Shifts' },
  { key: 'schedule', icon: 'fas fa-calendar-days', label: isAr.value ? 'جدول الموظفين' : 'Schedule' },
  { key: 'hours', icon: 'fas fa-store', label: isAr.value ? 'ساعات العمل' : 'Working hours' }
])

const loading = ref(true)
const saving = ref(false)
const teams = ref([])
const shifts = ref([])
const members = ref([])
const channels = ref([])
const timezone = ref('Asia/Riyadh')
const today = ref('')

const timezoneOptions = computed(() => {
  const list = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Muscat', 'Asia/Baghdad', 'Asia/Amman', 'Asia/Damascus', 'Asia/Beirut', 'Africa/Cairo', 'Europe/Istanbul', 'UTC']
  return list.includes(timezone.value) ? list : [timezone.value, ...list]
})

const dayNames = computed(() => (isAr.value
  ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']))

const dayLabels = computed(() => (isAr.value
  ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']))

const errorMessage = (err) => err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.error || err.message
const showError = (err) => Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر الحفظ' : 'Could not save', text: errorMessage(err), confirmButtonColor: '#FF6600' })
const confirmDelete = async (title, text) => (await Swal.fire({
  icon: 'warning', title, text, showCancelButton: true, confirmButtonColor: '#ef4444',
  confirmButtonText: isAr.value ? 'حذف' : 'Delete', cancelButtonText: isAr.value ? 'إلغاء' : 'Cancel'
})).isConfirmed

const chipStyle = (color) => ({
  background: `${color}1a`,
  borderColor: `${color}40`,
  color: `color-mix(in srgb, ${color} 70%, #0f172a)`
})

const memberMap = computed(() => Object.fromEntries(members.value.map(m => [m.id, m])))
const shiftMap = computed(() => Object.fromEntries(shifts.value.map(s => [s.id, s])))
const onDutyCount = computed(() => members.value.filter(m => m.onShiftNow && m.isActive).length)
const membersOnShift = (shiftId) => members.value.filter(m => m.currentShiftId === shiftId).length
const crossesMidnight = (shift) => !!shift.startTime && !!shift.endTime && shift.endTime < shift.startTime
const roleLabel = (role) => ({ ADMIN: isAr.value ? 'مسؤول' : 'Admin', MANAGER: isAr.value ? 'مدير' : 'Manager', AGENT: isAr.value ? 'موظف' : 'Agent' }[role] || role)

const channelLabel = (id) => {
  const ch = channels.value.find(c => c.id === id)
  return ch ? (ch.displayPhoneNumber || ch.phoneNumber || ch.name) : id.slice(0, 8)
}

const fetchAll = async () => {
  const [teamsRes, scheduleRes] = await Promise.all([
    axios.get('/api/v1/workforce/teams'),
    axios.get('/api/v1/workforce/shifts')
  ])
  teams.value = teamsRes.data.data || []
  const schedule = scheduleRes.data.data
  shifts.value = schedule.shifts || []
  members.value = schedule.members || []
  timezone.value = schedule.timezone
  today.value = schedule.today
}

const fetchChannels = async () => {
  try {
    const res = await axios.get('/api/v1/meta/channels')
    channels.value = res.data.data || []
  } catch (err) {
    console.error('Error fetching channels:', err)
  }
}

// ─── Teams ────────────────────────────────────────────────────
const showTeamModal = ref(false)
const teamForm = ref(null)

const routingModes = computed(() => [
  { key: 'ROUND_ROBIN', icon: 'fas fa-rotate', label: isAr.value ? 'بالتناوب' : 'Round robin', desc: isAr.value ? 'كل تذكرة لموظف، بالدور' : 'Take turns' },
  { key: 'LEAST_BUSY', icon: 'fas fa-scale-balanced', label: isAr.value ? 'الأقل انشغالاً' : 'Least busy', desc: isAr.value ? 'لمن عنده أقل تذاكر مفتوحة' : 'Fewest open tickets' },
  { key: 'MANUAL', icon: 'fas fa-hand-pointer', label: isAr.value ? 'يدوي' : 'Manual', desc: isAr.value ? 'المشرف يسند بنفسه' : 'A supervisor assigns' }
])

const routingSummary = (routing) => {
  const mode = routingModes.value.find(m => m.key === routing.mode)?.label || ''
  if (routing.mode === 'MANUAL') return isAr.value ? 'توزيع يدوي' : 'Manual assignment'
  const parts = [isAr.value ? `توزيع ${mode}` : mode]
  if (routing.onlyOnShift) parts.push(isAr.value ? 'للموظفين في الدوام فقط' : 'on-shift agents only')
  if (routing.stickyOwner) parts.push(isAr.value ? 'العميل يرجع لموظفه' : 'customers return to their agent')
  return parts.join(' · ')
}

// The team (other than the one being edited) that already owns a channel
const channelOwner = (channelId) => teams.value.find(t => t.id !== teamForm.value?.id && t.channelIds.includes(channelId)) || null

const openTeamModal = (team = null) => {
  teamForm.value = team
    ? { id: team.id, name: team.name, color: team.color, memberIds: [...team.memberIds], channelIds: [...team.channelIds], routing: { ...team.routing } }
    : { id: null, name: '', color: LABEL_COLORS[teams.value.length % LABEL_COLORS.length], memberIds: [], channelIds: [], routing: { mode: 'ROUND_ROBIN', onlyOnShift: true, stickyOwner: true } }
  showTeamModal.value = true
}

const saveTeam = async () => {
  saving.value = true
  try {
    const { id, ...payload } = teamForm.value
    // Keep members in the order they appear in the list — that is the round-robin order
    payload.memberIds = members.value.map(m => m.id).filter(mid => payload.memberIds.includes(mid))
    if (id) await axios.put(`/api/v1/workforce/teams/${id}`, payload)
    else await axios.post('/api/v1/workforce/teams', payload)
    showTeamModal.value = false
    await fetchAll()
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

const deleteTeam = async (team) => {
  const ok = await confirmDelete(
    isAr.value ? `حذف فريق «${team.name}»؟` : `Delete team "${team.name}"?`,
    isAr.value ? 'لن تُسند محادثات أرقامه تلقائياً بعد الحذف. الموظفون لا يُحذفون.' : 'Its numbers will no longer be routed automatically. Members are not deleted.'
  )
  if (!ok) return
  try {
    await axios.delete(`/api/v1/workforce/teams/${team.id}`)
    teams.value = teams.value.filter(t => t.id !== team.id)
  } catch (err) {
    showError(err)
  }
}

// ─── Shifts ───────────────────────────────────────────────────
const showShiftModal = ref(false)
const shiftForm = ref(null)

const openShiftModal = (shift = null) => {
  shiftForm.value = shift
    ? { id: shift.id, name: shift.name, color: shift.color, startTime: shift.startTime, endTime: shift.endTime, days: [...shift.days] }
    : { id: null, name: '', color: LABEL_COLORS[shifts.value.length % LABEL_COLORS.length], startTime: '08:00', endTime: '16:00', days: [0, 1, 2, 3, 4] }
  showShiftModal.value = true
}

const toggleDay = (day) => {
  const days = shiftForm.value.days
  shiftForm.value.days = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort((a, b) => a - b)
}

const saveShift = async () => {
  if (shiftForm.value.days.length === 0) {
    Swal.fire({ icon: 'info', title: isAr.value ? 'اختر يوماً واحداً على الأقل' : 'Pick at least one day', confirmButtonColor: '#FF6600' })
    return
  }
  saving.value = true
  try {
    const { id, ...payload } = shiftForm.value
    if (id) await axios.put(`/api/v1/workforce/shifts/${id}`, payload)
    else await axios.post('/api/v1/workforce/shifts', payload)
    showShiftModal.value = false
    await fetchAll()
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

const deleteShift = async (shift) => {
  const ok = await confirmDelete(
    isAr.value ? `حذف شيفت «${shift.name}»؟` : `Delete shift "${shift.name}"?`,
    isAr.value ? 'الموظفون على هذا الشيفت يصبحون بدون شيفت.' : 'People on this shift will have no shift.'
  )
  if (!ok) return
  try {
    await axios.delete(`/api/v1/workforce/shifts/${shift.id}`)
    await fetchAll()
  } catch (err) {
    showError(err)
  }
}

const saveTimezone = async () => {
  try {
    await axios.put('/api/v1/workforce/timezone', { timezone: timezone.value })
    await fetchAll()
  } catch (err) {
    showError(err)
  }
}

// ─── Schedule ─────────────────────────────────────────────────
const assignTarget = ref(null)
const assignForm = ref({ shiftId: null, effectiveFrom: '' })

const shiftOptions = computed(() => [
  ...shifts.value.map(s => ({ id: s.id, name: s.name, color: s.color, time: `${s.startTime}–${s.endTime}` })),
  { id: null, name: isAr.value ? 'بدون شيفت' : 'No shift', color: '#cbd5e1', time: '' }
])

const openAssignModal = (member) => {
  assignTarget.value = member
  assignForm.value = { shiftId: member.currentShiftId || shifts.value[0]?.id || null, effectiveFrom: today.value }
}

const saveAssignment = async () => {
  saving.value = true
  try {
    await axios.post('/api/v1/workforce/assignments', {
      subUserId: assignTarget.value.id,
      shiftId: assignForm.value.shiftId,
      effectiveFrom: assignForm.value.effectiveFrom
    })
    assignTarget.value = null
    await fetchAll()
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

const deleteAssignment = async (change) => {
  try {
    await axios.delete(`/api/v1/workforce/assignments/${change.id}`)
    await fetchAll()
  } catch (err) {
    showError(err)
  }
}

// ─── Working hours ────────────────────────────────────────────
const hoursList = ref([])
const hoursForm = ref(null)

const cloneHours = (h) => ({ ...h, days: h.days.map(d => ({ ...d })) })

const fetchHours = async () => {
  const res = await axios.get('/api/v1/workforce/hours')
  hoursList.value = res.data.data || []
  const keep = hoursForm.value && hoursList.value.find(h => h.channelId === hoursForm.value.channelId)
  hoursForm.value = keep ? cloneHours(keep) : (hoursList.value[0] ? cloneHours(hoursList.value[0]) : null)
}

const selectHoursChannel = (channelId) => {
  const h = hoursList.value.find(x => x.channelId === channelId)
  if (h) hoursForm.value = cloneHours(h)
}

const copyFirstOpenDay = () => {
  const first = hoursForm.value.days.find(d => d.open)
  if (!first) return
  hoursForm.value.days.forEach(d => { if (d.open) { d.from = first.from; d.to = first.to } })
}

const saveHours = async () => {
  saving.value = true
  try {
    const { channelId, ...payload } = hoursForm.value
    await axios.put(`/api/v1/workforce/hours/${channelId}`, payload)
    await fetchHours()
    Swal.fire({ icon: 'success', title: isAr.value ? 'تم الحفظ' : 'Saved', timer: 1300, showConfirmButton: false })
  } catch (err) {
    showError(err)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([fetchAll(), fetchChannels(), fetchHours()])
  } catch (err) {
    Swal.fire({ icon: 'error', title: isAr.value ? 'تعذّر تحميل البيانات' : 'Could not load data', text: errorMessage(err), confirmButtonColor: '#FF6600' })
  } finally {
    loading.value = false
  }
})
</script>
