const adminService = require('./src/modules/admin/admin.service');

(async () => {
  try {
    const stats = await adminService.getStats();
    console.log(stats);
  } catch (error) {
    console.error('Error in getStats:', error);
  }
})();
