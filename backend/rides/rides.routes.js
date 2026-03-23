const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

// ✅ ONLY VALID FUNCTIONS
router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);
router.get('/my', auth, controller.getMyRides);

router.post('/:rideId/checklist', auth, controller.submitChecklist);
router.post('/:rideId/pickup', auth, controller.pickupPassenger);
router.post('/:rideId/drop', auth, controller.dropPassenger);

router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);

module.exports = router;