'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { otpRequestLimiter, otpVerificationLimiter } = require('../middleware/rateLimiter');
const { validateOtpRequest, validateOtpVerification } = require('../validators/auth.validator');

const router = express.Router();

router.get('/config', authController.getDevelopmentConfig);
router.post('/request-otp', otpRequestLimiter, validateOtpRequest, authController.requestOtp);
router.post('/verify-otp', otpVerificationLimiter, validateOtpVerification, authController.verifyOtp);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
