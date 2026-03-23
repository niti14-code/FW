const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { isAdmin } = require('../admin/admin.middleware');
const controller  = require('./incidents.controller');

// USER ROUTES
router.post('/report',          auth,          controller.reportIncident);
router.get('/my',               auth,          controller.getMyIncidents);
router.post('/:id/evidence',    auth,          controller.addEvidence);
router.post('/:id/export',      auth,          controller.exportIncident);  // users can export their own

// ADMIN ROUTES
router.get('/all',              auth, isAdmin, controller.getAllIncidents);

module.exports = router;

/*const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');                
//const isAdmin = require('../admin/admin.middleware');   
const { isAdmin } = require('../admin/admin.middleware');    
const controller = require('./incidents.controller');

// USER ROUTES
router.post('/report', auth, controller.reportIncident);
router.post('/:id/evidence', auth, controller.addEvidence);
router.get('/my', auth, controller.getMyIncidents);

// ADMIN ROUTES
router.get('/all', auth, isAdmin, controller.getAllIncidents);
router.post('/:id/export', auth, isAdmin, controller.exportIncident);

module.exports = router;*/

