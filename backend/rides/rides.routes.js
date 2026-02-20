const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);

router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);
router.get('/my', auth, controller.getMyRides);

module.exports = router;
