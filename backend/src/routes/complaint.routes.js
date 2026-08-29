'use strict';

const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const { complaintCreationLimiter } = require('../middleware/rateLimiter');
const { attachAuthUser } = require('../middleware/requireAuth');
const { validateComplaint } = require('../validators/complaint.validator');

const router = express.Router();

router.post(
  '/',
  complaintCreationLimiter,
  attachAuthUser,
  validateComplaint,
  complaintController.createComplaint
);
router.get('/:complaintId/status', complaintController.getComplaintStatus);

module.exports = router;
