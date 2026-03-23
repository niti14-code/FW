const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const { isAdmin } = require('./admin.middleware');
const controller = require('./admin.controller');

// All routes require auth + admin role
router.use(auth, isAdmin);

router.get('/stats',                    controller.getStats);
router.get('/users',                    controller.getUsers);
router.put('/users/:id/suspend',        controller.suspendUser);
router.get('/rides',                    controller.getAllRides);
router.delete('/rides/:id',             controller.deleteRide);
router.get('/kyc',                      controller.getPendingKYC);
router.put('/kyc/:userId',              controller.reviewKYC);
router.get('/incidents',                controller.getAllIncidents);
router.put('/incidents/:id/status',     controller.updateIncidentStatus);

module.exports = router;

/*const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isAdmin, isSuperAdmin } = require('./admin.middleware');
const controller = require('./admin.controller');
const adminController = require('./admin.controller');

// PUBLIC: Admin registration (protected by secret key)
router.post('/register', controller.registerAdmin);

// All routes below require authentication + admin role
router.use(auth, isAdmin);

// Dashboard
router.get('/dashboard', controller.getDashboardStats);

// Users
router.get('/users', controller.getAllUsers);
router.get('/users/:id', controller.getUserById);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', isSuperAdmin, controller.deleteUser);

// Verifications
router.get('/verifications/pending', controller.getPendingVerifications);
router.post('/verifications/verify', controller.verifyDocument);

// Rides
router.get('/rides', controller.getAllRides);
router.get('/rides/:id', controller.getRideDetails);
router.put('/rides/:id/cancel', controller.cancelRide);

// Bookings
router.get('/bookings', controller.getAllBookings);

// Reports
router.get('/reports/revenue', controller.getRevenueReport);
router.get('/reports/popular-routes', controller.getPopularRoutes);

// KYC routes
router.get('/kyc/pending', controller.getPendingKyc);
router.post('/kyc/approve/:id', controller.approveKyc);
router.post('/kyc/reject/:id', controller.rejectKyc);
//router.post('/submit', auth, kycController.submitKyc);
//router.get('/status', auth, kycController.getKycStatus);

// Settings routes (add before module.exports)
router.get('/settings', controller.getAllSettings);
router.post('/settings', controller.setSetting);
router.get('/settings/:key', controller.getSetting);

router.get('/kyc/pending', auth, isAdmin, adminController.getPendingKyc);

router.post('/kyc/approve/:id', auth, isAdmin, adminController.approveKyc);  
router.post('/kyc/reject/:id',  auth, isAdmin, adminController.rejectKyc);


module.exports = router;
*/