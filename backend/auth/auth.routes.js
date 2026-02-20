const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('./auth.controller'); 

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', auth, controller.getMe);

module.exports = router;