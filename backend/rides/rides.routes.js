const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);
router.get('/my', auth, controller.getMyRides);  // ← ADD THIS for /ride/my
router.get('/user/rides', auth, controller.getMyRides);  // Keep for compatibility
router.get('/my-rides', auth, controller.getMyRides);    // Keep for compatibility

// IMPORTANT: /:id must be LAST
router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);

module.exports = router;