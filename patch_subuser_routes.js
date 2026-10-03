const fs = require('fs');
let path = 'src/modules/subuser/subuser.routes.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "router.get('/defaults', subUserController.getDefaults);",
  "router.get('/defaults', subUserController.getDefaults);\nrouter.get('/team', subUserController.getTeam);"
);

fs.writeFileSync(path, content, 'utf8');

path = 'src/modules/subuser/subuser.controller.js';
content = fs.readFileSync(path, 'utf8');

const getTeamLogic = `
  async getTeam(req, res, next) {
    try {
      const prisma = require('../../config/prisma');
      const team = await prisma.subUser.findMany({
        where: { tenantId: req.tenant.id },
        select: { id: true, name: true, email: true }
      });
      // Add owner as a team member option too
      team.push({ id: req.tenant.id, name: 'Owner (' + req.tenant.name + ')' });
      res.json({ success: true, data: team });
    } catch (err) {
      next(err);
    }
  }
`;

content = content.replace(
  'module.exports = new SubUserController();',
  getTeamLogic + '\nmodule.exports = new SubUserController();'
);

fs.writeFileSync(path, content, 'utf8');
