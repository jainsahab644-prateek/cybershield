'use strict';

const notificationRepository = require('../repositories/notification.repository');
const auditRepository = require('../repositories/audit.repository');
const { configuredProviderName, getEmailProvider } = require('./email/emailProvider');
const HttpError = require('../utils/httpError');

const STATUS_LABELS = Object.freeze({
  submitted: 'Submitted',
  under_review: 'Under Review',
  information_required: 'Information Required',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
});

const STATUS_MESSAGES = Object.freeze({
  submitted: 'Your demo complaint has been submitted.',
  under_review: 'Your demo complaint is under review.',
  information_required: 'Additional information is requested for your demo complaint.',
  in_progress: 'Your demo complaint is currently being reviewed.',
  resolved: 'Your demo complaint has been marked as resolved in CyberShield.',
  closed: 'Your demo complaint has been closed in CyberShield.'
});

function notificationForStatus(complaintId, status) {
  const label = STATUS_LABELS[status];
  if (status === 'information_required') {
    return {
      type: 'information_required',
      title: 'Additional information requested',
      message: `Additional information is requested for your demo complaint ${complaintId}.`
    };
  }
  if (status === 'resolved') {
    return {
      type: 'complaint_resolved',
      title: 'Demo complaint resolved',
      message: `Your demo complaint ${complaintId} has been marked as Resolved in CyberShield.`
    };
  }
  if (status === 'closed') {
    return {
      type: 'complaint_closed',
      title: 'Demo complaint closed',
      message: `Your demo complaint ${complaintId} has been closed in CyberShield.`
    };
  }
  return {
    type: status === 'submitted' ? 'complaint_submitted' : 'status_changed',
    title: status === 'submitted' ? 'Demo complaint submitted' : 'Complaint status updated',
    message: `Your demo complaint ${complaintId} is now ${label}.`
  };
}

function buildStatusCommunication(complaint, fromStatus, toStatus, changedByUserId, createdAt) {
  return {
    history: {
      complaintId: complaint.id,
      fromStatus,
      toStatus,
      message: STATUS_MESSAGES[toStatus],
      changedByUserId,
      createdAt
    },
    notification: complaint.user_id ? {
      userId: complaint.user_id,
      complaintId: complaint.id,
      ...notificationForStatus(complaint.complaint_id, toStatus),
      actionUrl: `/pages/complaint-details.html?id=${encodeURIComponent(complaint.complaint_id)}`,
      createdAt
    } : null
  };
}

function toPublic(row) {
  return {
    notificationId: row.public_notification_id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    actionUrl: row.action_url,
    complaintId: row.complaint_id || null,
    suspiciousReportId: row.suspicious_report_public_id || null,
    createdAt: row.created_at,
    readAt: row.read_at || null
  };
}

function listNotifications(userId, filters) {
  const result = notificationRepository.listForUser(userId, filters);
  return {
    notifications: result.notifications.map(toPublic),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / filters.limit))
    }
  };
}

function unreadCount(userId) {
  return { count: notificationRepository.countUnread(userId) };
}

function markRead(userId, notificationId) {
  const marked = notificationRepository.markRead(userId, notificationId, new Date().toISOString());
  if (!marked) throw new HttpError(404, 'Notification not found.');
  return { notificationId: marked, isRead: true };
}

function markAllRead(userId) {
  const updated = notificationRepository.markAllRead(userId, new Date().toISOString());
  return { updated };
}

function publicPreferences(row) {
  return {
    emailEnabled: Boolean(row.email_enabled),
    statusUpdatesEnabled: Boolean(row.status_updates_enabled),
    informationRequiredEnabled: Boolean(row.information_required_enabled),
    resolutionEnabled: Boolean(row.resolution_enabled),
    emailAvailable: Boolean(row.email),
    emailProvider: configuredProviderName(),
    developmentMode: configuredProviderName() === 'development'
  };
}

function getPreferences(userId) {
  return publicPreferences(notificationRepository.getPreferences(userId));
}

function updatePreferences(userId, preferences) {
  const current = notificationRepository.getPreferences(userId);
  if (preferences.emailEnabled && !current.email) {
    throw new HttpError(400, 'A verified email address is required for email notifications.');
  }
  const row = notificationRepository.updatePreferences(userId, {
    emailEnabled: preferences.emailEnabled ? 1 : 0,
    statusUpdatesEnabled: preferences.statusUpdatesEnabled ? 1 : 0,
    informationRequiredEnabled: preferences.informationRequiredEnabled ? 1 : 0,
    resolutionEnabled: preferences.resolutionEnabled ? 1 : 0
  }, new Date().toISOString());
  return publicPreferences(row);
}

function getComplaintHistory(userId, complaintId) {
  const result = notificationRepository.listHistoryForOwner(userId, complaintId);
  if (!result) throw new HttpError(404, 'Complaint not found.');
  return {
    history: result.history.map((row) => ({
      historyId: row.public_history_id,
      status: row.to_status,
      message: row.user_visible_message,
      createdAt: row.created_at
    })),
    messages: result.messages.map((row) => ({
      messageId: row.public_message_id,
      message: row.message,
      createdAt: row.created_at
    }))
  };
}

function validEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function preferenceAllowsEmail(notification) {
  if (!notification.email_enabled) return false;
  if (notification.type === 'information_required') return notification.information_required_enabled !== 0;
  if (['complaint_resolved', 'complaint_closed'].includes(notification.type)) {
    return notification.resolution_enabled !== 0;
  }
  if (['complaint_submitted', 'status_changed'].includes(notification.type)) {
    return notification.status_updates_enabled !== 0;
  }
  return true;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function emailContent(notification) {
  const reference = notification.complaint_id || notification.suspicious_report_public_id || 'Your CyberShield account';
  const statusLine = notification.type === 'user_message'
    ? 'A user-visible message is available in your private demo workspace.'
    : notification.message;
  const subject = notification.type === 'user_message'
    ? 'CyberShield demo complaint message available'
    : 'CyberShield demo complaint status updated';
  const disclaimer = 'CyberShield is a demonstration project and is not an official government or police portal.';
  const text = `${statusLine}\n\nReference:\n${reference}\n\n${disclaimer}`;
  const html = `<p>${escapeHtml(statusLine)}</p><p><strong>Reference:</strong><br>${escapeHtml(reference)}</p><p>${escapeHtml(disclaimer)}</p>`;
  return { subject, text, html };
}

function emailAudit(notification, action, status, errorCode) {
  auditRepository.createAudit({
    actorUserId: null,
    actorRole: 'anonymous',
    action,
    entityType: 'notification',
    entityPublicId: notification.public_notification_id,
    metadata: {
      notificationId: notification.public_notification_id,
      channel: 'email',
      status,
      ...(errorCode ? { errorCode } : {})
    },
    ipAddress: null,
    createdAt: new Date().toISOString()
  });
}

async function processEmailDelivery(notificationId) {
  const notification = notificationRepository.getNotificationForDelivery(notificationId);
  if (!notification) return;
  const provider = getEmailProvider();
  const now = new Date().toISOString();

  if (!validEmail(notification.email) || !preferenceAllowsEmail(notification)) {
    notificationRepository.createDelivery({
      notificationInternalId: notification.id,
      channel: 'email',
      provider: provider.name,
      recipient: validEmail(notification.email) ? notification.email : null,
      status: 'skipped',
      errorCode: validEmail(notification.email) ? 'email_preference_disabled' : 'verified_email_unavailable',
      createdAt: now
    });
    return;
  }

  const delivery = notificationRepository.createDelivery({
    notificationInternalId: notification.id,
    channel: 'email',
    provider: provider.name,
    recipient: notification.email,
    status: 'pending',
    createdAt: now
  });
  if (['sent', 'skipped'].includes(delivery.status)) return;

  const maximum = Math.min(3, Math.max(1, Number.parseInt(process.env.EMAIL_MAX_RETRIES, 10) || 3));
  let attempts = delivery.attempt_count;
  while (attempts < maximum) {
    const result = await provider.sendEmail({ to: notification.email, ...emailContent(notification) });
    attempts += 1;
    notificationRepository.recordDeliveryAttempt(delivery.id, result, new Date().toISOString());
    emailAudit(
      notification,
      result.status === 'failed' ? 'email_delivery_failed' : 'email_delivery_attempted',
      result.status,
      result.errorCode
    );
    if (result.status !== 'failed' || result.retryable === false) break;
  }
}

module.exports = {
  STATUS_LABELS,
  STATUS_MESSAGES,
  buildStatusCommunication,
  getComplaintHistory,
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  processEmailDelivery,
  unreadCount,
  updatePreferences
};
