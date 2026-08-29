'use strict';

const express = require('express');
const evidenceController = require('../controllers/evidence.controller');
const {
  loadOwnedEvidenceComplaint,
  requireWritableEvidenceComplaint
} = require('../middleware/evidenceAccess');
const { createEvidenceUpload } = require('../middleware/evidenceUpload');
const { requireAuth } = require('../middleware/requireAuth');
const { evidenceUploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/evidence/config', evidenceController.getConfig);

const evidencePath = '/users/me/complaints/:complaintId/evidence';
router.get(
  evidencePath,
  requireAuth,
  loadOwnedEvidenceComplaint,
  evidenceController.listEvidence
);
router.get(
  `${evidencePath}/:evidenceId`,
  requireAuth,
  loadOwnedEvidenceComplaint,
  evidenceController.getEvidence
);
router.post(
  evidencePath,
  requireAuth,
  loadOwnedEvidenceComplaint,
  requireWritableEvidenceComplaint,
  evidenceUploadLimiter,
  createEvidenceUpload(),
  evidenceController.uploadEvidence
);

module.exports = router;
