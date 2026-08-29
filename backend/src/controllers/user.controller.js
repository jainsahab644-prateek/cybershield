'use strict';

const complaintService = require('../services/complaint.service');
const notificationService = require('../services/notification.service');
const { sendError, sendSuccess } = require('../utils/apiResponse');

function listComplaints(request, response, next) {
  try {
    const result = complaintService.listUserComplaints(
      request.authUser.internalId,
      request.validatedFilters
    );
    return sendSuccess(response, { data: result });
  } catch (error) {
    return next(error);
  }
}

function getComplaint(request, response, next) {
  try {
    const complaint = complaintService.getUserComplaint(
      request.authUser.internalId,
      request.params.complaintId
    );
    if (!complaint) {
      return sendError(response, { statusCode: 404, message: 'Complaint not found.' });
    }
    return sendSuccess(response, { data: { complaint } });
  } catch (error) {
    return next(error);
  }
}

function listNotifications(request, response, next) {
  try {
    return sendSuccess(response, {
      data: notificationService.listNotifications(
        request.authUser.internalId,
        request.validatedNotificationFilters
      )
    });
  } catch (error) { return next(error); }
}

function getUnreadCount(request, response, next) {
  try {
    return sendSuccess(response, {
      data: notificationService.unreadCount(request.authUser.internalId)
    });
  } catch (error) { return next(error); }
}

function markNotificationRead(request, response, next) {
  try {
    return sendSuccess(response, {
      message: 'Notification marked as read.',
      data: notificationService.markRead(
        request.authUser.internalId,
        request.validatedNotificationParams.notificationId
      )
    });
  } catch (error) { return next(error); }
}

function markAllNotificationsRead(request, response, next) {
  try {
    return sendSuccess(response, {
      message: 'All notifications marked as read.',
      data: notificationService.markAllRead(request.authUser.internalId)
    });
  } catch (error) { return next(error); }
}

function getNotificationPreferences(request, response, next) {
  try {
    return sendSuccess(response, {
      data: { preferences: notificationService.getPreferences(request.authUser.internalId) }
    });
  } catch (error) { return next(error); }
}

function updateNotificationPreferences(request, response, next) {
  try {
    return sendSuccess(response, {
      message: 'Notification preferences updated.',
      data: {
        preferences: notificationService.updatePreferences(
          request.authUser.internalId,
          request.validatedNotificationPreferences
        )
      }
    });
  } catch (error) { return next(error); }
}

function getComplaintHistory(request, response, next) {
  try {
    return sendSuccess(response, {
      data: notificationService.getComplaintHistory(
        request.authUser.internalId,
        request.validatedNotificationParams.complaintId
      )
    });
  } catch (error) { return next(error); }
}

module.exports = {
  getComplaint,
  getComplaintHistory,
  getNotificationPreferences,
  getUnreadCount,
  listComplaints,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences
};
