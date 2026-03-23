const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const kycController = require('./kyc.controller');

router.post('/submit', auth, kycController.submitKyc);
router.get('/status', auth, kycController.getKycStatus);

module.exports = router;