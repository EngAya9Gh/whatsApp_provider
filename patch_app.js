const fs = require('fs');
const path = 'dashboard/src/App.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '        <router-link v-if="!isSubUser || subUserPerms?.can_view_live_chat" to="/tickets" class="nav-item" active-class="active">\n          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5v2"/><path d="M15 11v2"/><path d="M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>\n          <span class="nav-text">{{ isAr ? \'التذاكر\' : \'Tickets\' }}</span>\n        </router-link>',
  `        <router-link v-if="!isSubUser || subUserPerms?.can_view_live_chat" to="/tickets" class="nav-item" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5v2"/><path d="M15 11v2"/><path d="M15 17v2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>
          <span class="nav-text">{{ isAr ? 'التذاكر' : 'Tickets' }}</span>
        </router-link>

        <router-link v-if="!isSubUser || subUserPerms?.can_manage_settings" to="/ticket-categories" class="nav-item" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          <span class="nav-text">{{ isAr ? 'تصنيفات التذاكر' : 'Ticket Categories' }}</span>
        </router-link>`
);

fs.writeFileSync(path, content, 'utf8');
