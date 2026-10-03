const fs = require('fs');
const path = 'dashboard/src/views/LiveChat.vue';
let content = fs.readFileSync(path, 'utf8');

const fetchTeamLogic = `
const fetchTeamMembers = async () => {
  try {
    const res = await axios.get('/api/v1/subusers');
    teamMembers.value = res.data.data || [];
  } catch(e) {
    console.error('Error fetching team members:', e);
  }
}
`;

content = content.replace(
  'const isAr = computed(() => locale.value === \'ar\')',
  `const isAr = computed(() => locale.value === 'ar')\n${fetchTeamLogic}`
);

content = content.replace(
  '  fetchThreads()',
  '  fetchThreads()\n  fetchTeamMembers()'
);

fs.writeFileSync(path, content, 'utf8');
