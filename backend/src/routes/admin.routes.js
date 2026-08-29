'use strict';

const express = require('express');
const adminController = require('../controllers/admin.controller');
const suspiciousController = require('../controllers/suspicious.controller');
const suspiciousEvidenceController = require('../controllers/suspiciousEvidence.controller');
const { requireAuth } = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');
const { adminMutationLimiter } = require('../middleware/rateLimiter');
const {
  validateAdminFilters,
  validateComplaintParam,
  validateEvidenceParams,
  validateNote,
  validatePriorityUpdate,
  validateStatusUpdate,
  validateUserMessage
} = require('../validators/admin.validator');
const { validateAdminSuspiciousFilters, validateSuspiciousNote, validateSuspiciousStatus } = require('../validators/suspicious.validator');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get('/dashboard/stats', adminController.getStats);
router.get('/dashboard/suspicious-stats', suspiciousController.stats);
router.get('/suspicious-reports', validateAdminSuspiciousFilters, suspiciousController.listAdmin);
router.get('/suspicious-reports/:reportId', suspiciousController.getAdmin);
router.get('/suspicious-reports/:reportId/evidence/:evidenceId', suspiciousEvidenceController.getAdmin);
router.patch('/suspicious-reports/:reportId/status', adminMutationLimiter, validateSuspiciousStatus, suspiciousController.updateStatus);
router.post('/suspicious-reports/:reportId/notes', adminMutationLimiter, validateSuspiciousNote, suspiciousController.addNote);
router.get('/complaints', validateAdminFilters, adminController.listComplaints);
router.get(
  '/complaints/:complaintId/evidence/:evidenceId',
  validateEvidenceParams,
  adminController.getEvidence
);
router.get('/complaints/:complaintId', validateComplaintParam, adminController.getComplaint);
router.patch(
  '/complaints/:complaintId/status',
  adminMutationLimiter,
  validateComplaintParam,
  validateStatusUpdate,
  adminController.updateStatus
);
router.patch(
  '/complaints/:complaintId/priority',
  adminMutationLimiter,
  validateComplaintParam,
  validatePriorityUpdate,
  adminController.updatePriority
);
router.post(
  '/complaints/:complaintId/notes',
  adminMutationLimiter,
  validateComplaintParam,
  validateNote,
  adminController.addNote
);
router.post(
  '/complaints/:complaintId/user-message',
  adminMutationLimiter,
  validateComplaintParam,
  validateUserMessage,
  adminController.sendUserMessage
);

module.exports = router;
