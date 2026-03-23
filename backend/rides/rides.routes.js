const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);
router.get('/no-match-suggest', auth, controller.noMatchSuggest);
router.get('/my', auth, controller.getMyRides);
router.get('/user/rides', auth, controller.getMyRides);
router.get('/my-rides', auth, controller.getMyRides);
router.get('/recurring/:rideId/instances', auth, controller.getRecurringInstances);

// One-time admin utility: backfill address strings for old rides
router.post('/admin/backfill-addresses', auth, controller.backfillAddresses);

// Trip status flow
router.post('/:rideId/start', auth, controller.startRide);
router.post('/:rideId/complete', auth, controller.completeRide);
router.post('/:rideId/cancel', auth, controller.cancelRide);
router.get('/:rideId/status', auth, controller.getRideStatus);

// New feature endpoints
router.post('/:rideId/checklist', auth, controller.submitChecklist);
router.post('/:rideId/pickup', auth, controller.pickupPassenger);
router.post('/:rideId/drop', auth, controller.dropPassenger);

// OTP verification system (like Rapido/Uber/Ola)
router.post('/:rideId/request-otp', auth, controller.requestOtpFromSeeker);
router.post('/:rideId/verify-otp-from-seeker', auth, controller.verifyOtpFromSeeker);
router.post('/:rideId/generate-otp', auth, controller.generateOtp);
router.post('/:rideId/verify-otp', auth, controller.verifyOtp);
router.get('/:rideId/otp-status', auth, controller.getOtpStatus);

// IMPORTANT: /:id must be LAST
router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);

module.exports = router;

/*const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./rides.controller');

router.post('/create', auth, controller.createRide);
router.get('/search', auth, controller.searchRides);
router.get('/no-match-suggest', auth, controller.noMatchSuggest);
router.get('/my', auth, controller.getMyRides);
router.get('/user/rides', auth, controller.getMyRides);
router.get('/my-rides', auth, controller.getMyRides);
router.get('/recurring/:rideId/instances', auth, controller.getRecurringInstances);

// Trip status flow
router.post('/:rideId/start', auth, controller.startRide);
router.post('/:rideId/complete', auth, controller.completeRide);
router.post('/:rideId/cancel', auth, controller.cancelRide);
router.get('/:rideId/status', auth, controller.getRideStatus);

// New feature endpoints
router.post('/:rideId/checklist', auth, controller.submitChecklist);
router.post('/:rideId/pickup', auth, controller.pickupPassenger);
router.post('/:rideId/drop', auth, controller.dropPassenger);

// OTP verification system (like Rapido/Uber/Ola)
router.post('/:rideId/request-otp', auth, controller.requestOtpFromSeeker);
router.post('/:rideId/verify-otp-from-seeker', auth, controller.verifyOtpFromSeeker);
router.post('/:rideId/generate-otp', auth, controller.generateOtp);
router.post('/:rideId/verify-otp', auth, controller.verifyOtp);
router.get('/:rideId/otp-status', auth, controller.getOtpStatus);

// IMPORTANT: /:id must be LAST
router.get('/:id', auth, controller.getRide);
router.put('/:id', auth, controller.updateRide);
router.delete('/:id', auth, controller.deleteRide);

module.exports = router;
*/