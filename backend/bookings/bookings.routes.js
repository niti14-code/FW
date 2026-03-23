const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./bookings.controller');

// POST /booking/request
router.post('/request', auth, controller.requestBooking);

// PUT /booking/respond  
router.put('/respond', auth, controller.respondBooking);

// GET /booking/my - For seeker to see their bookings
router.get('/my', auth, controller.getMyBookings);

// GET /booking/requests - For provider to see all requests
router.get('/requests', auth, controller.getRideRequests);

// GET /booking/ride/:rideId - For provider to see bookings for specific ride
router.get('/ride/:rideId', auth, controller.getBookingsForRide);

module.exports = router;