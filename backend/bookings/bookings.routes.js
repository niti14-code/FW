const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./bookings.controller');

// POST /booking/request
router.post('/request', auth, controller.requestBooking);

// PUT /booking/respond  
router.put('/respond', auth, controller.respondBooking);

// GET /booking/my - This matches frontend expectation!
router.get('/my', auth, controller.getMyBookings);

// GET /booking/requests - for provider to see all requests
router.get('/requests', auth, controller.getRideRequests);

// GET /booking/ride/:rideId - This matches frontend expectation!
router.get('/ride/:rideId', auth, controller.getBookingsForRide);

module.exports = router;