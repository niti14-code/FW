const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./notifications.controller');

router.get('/', auth, controller.getMyNotifications);
router.get('/unread-count', auth, controller.getUnreadCount);
router.put('/:id/read', auth, controller.markAsRead);
router.put('/read-all', auth, controller.markAllAsRead);
router.delete('/:id', auth, controller.deleteNotification);

module.exports = router;