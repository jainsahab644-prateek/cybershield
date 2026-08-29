'use strict';

const express = require('express');
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { validateComplaintFilters } = require('../validators/userComplaint.validator');
const {
  validateComplaintHistoryParam,
  validateNotificationFilters,
  validateNotificationParam,
  validateNotificationPreferences
} = require('../validators/notification.validator');

const router = express.Router();

router.use(requireAuth);
router.get('/me/notifications', validateNotificationFilters, userController.listNotifications);
router.get('/me/notifications/unread-count', userController.getUnreadCount);
router.patch('/me/notifications/read-all', userController.markAllNotificationsRead);
router.patch(
  '/me/notifications/:notificationId/read',
  validateNotificationParam,
  userController.markNotificationRead
);
router.get('/me/notification-preferences', userController.getNotificationPreferences);
router.patch(
  '/me/notification-preferences',
  validateNotificationPreferences,
  userController.updateNotificationPreferences
);
router.get('/me/complaints', validateComplaintFilters, userController.listComplaints);
router.get(
  '/me/complaints/:complaintId/history',
  validateComplaintHistoryParam,
  userController.getComplaintHistory
);
router.get('/me/complaints/:complaintId', userController.getComplaint);

module.exports = router;
