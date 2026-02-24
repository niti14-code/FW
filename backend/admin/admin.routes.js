const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isAdmin, isSuperAdmin } = require('./admin.middleware');
const controller = require('./admin.controller');

// All routes require authentication + admin role
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

module.exports = router;