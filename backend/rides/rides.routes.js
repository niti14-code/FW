const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);

router.get('/user/rides', auth, controller.getMyRides);
router.get('/my-rides', auth, controller.getMyRides);

router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);

module.exports = router;