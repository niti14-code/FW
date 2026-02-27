const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./bookings.controller');

router.post('/request', auth, controller.requestBooking);
router.put('/respond', auth, controller.respondBooking);
router.get('/my', auth, controller.getMyBookings);
router.get('/requests', auth, controller.getRideRequests);
router.get('/ride/:rideId', auth, controller.getBookingsForRide);

module.exports = router;