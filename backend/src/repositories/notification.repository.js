'use strict';

const { getDatabase } = require('../config/database');
const {
  generateDeliveryId,
  generateHistoryId,
  generateMessageId,
  generateNotificationId
} = require('../utils/communicationIds');

const MAX_ID_ATTEMPTS = 10;

function insertWithRandomId(statement, parameterFactory, idFactory) {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    try {
      const publicId = idFactory();
      const result = statement.run(parameterFactory(publicId));
      return { internalId: Number(result.lastInsertRowid), publicId };
    } catch (error) {
      if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
    }
  }
  throw new Error('Unable to allocate a unique communication identifier.');
}

function insertStatusHistory(database, event) {
  const statement = database.prepare(`
    INSERT INTO complaint_status_history (
      public_history_id, complaint_id, from_status, to_status,
      user_visible_message, changed_by_user_id, created_at
    ) VALUES (
      @publicId, @complaintId, @fromStatus, @toStatus,
      @message, @changedByUserId, @createdAt
    )
  `);
  return insertWithRandomId(statement, (publicId) => ({
    publicId,
    complaintId: event.complaintId,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus,
    message: event.message,
    changedByUserId: event.changedByUserId ?? null,
    createdAt: event.createdAt
  }), generateHistoryId);
}

function insertNotification(database, notification) {
  const existing = database.prepare(`
    SELECT id, public_notification_id FROM notifications WHERE event_key = ?
  `).get(notification.eventKey);
  if (existing) {
    return {
      internalId: existing.id,
      publicId: existing.public_notification_id,
      created: false
    };
  }

  const statement = database.prepare(`
    INSERT INTO notifications (
      public_notification_id, user_id, complaint_id, suspicious_report_id, type, title,
      message, action_url, event_key, is_read, created_at
    ) VALUES (
      @publicId, @userId, @complaintId, @suspiciousReportId, @type, @title,
      @message, @actionUrl, @eventKey, 0, @createdAt
    )
  `);
  return {
    ...insertWithRandomId(statement, (publicId) => ({
      publicId,
      userId: notification.userId,
      complaintId: notification.complaintId ?? null,
      suspiciousReportId: notification.suspiciousReportId ?? null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl ?? null,
      eventKey: notification.eventKey,
      createdAt: notification.createdAt
    }), generateNotificationId),
    created: true
  };
}

function insertUserMessage(database, message) {
  const statement = database.prepare(`
    INSERT INTO complaint_user_messages (
      public_message_id, complaint_id, sender_admin_user_id, message, created_at
    ) VALUES (@publicId, @complaintId, @adminUserId, @message, @createdAt)
  `);
  return insertWithRandomId(statement, (publicId) => ({
    publicId,
    complaintId: message.complaintId,
    adminUserId: message.adminUserId,
    message: message.message,
    createdAt: message.createdAt
  }), generateMessageId);
}

function listForUser(userId, filters) {
  const where = ['n.user_id = @userId'];
  const parameters = {
    userId,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit
  };
  if (filters.read !== undefined) {
    where.push('n.is_read = @isRead');
    parameters.isRead = filters.read ? 1 : 0;
  }
  if (filters.type) {
    where.push('n.type = @type');
    parameters.type = filters.type;
  }
  const whereSql = where.join(' AND ');
  const database = getDatabase();
  return {
    notifications: database.prepare(`
      SELECT n.public_notification_id, n.type, n.title, n.message,
             n.action_url, n.is_read, n.created_at, n.read_at,
             c.complaint_id, s.public_report_id AS suspicious_report_public_id
      FROM notifications n
      LEFT JOIN complaints c ON c.id = n.complaint_id
      LEFT JOIN suspicious_reports s ON s.id = n.suspicious_report_id
      WHERE ${whereSql}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT @limit OFFSET @offset
    `).all(parameters),
    total: database.prepare(`
      SELECT COUNT(*) AS count FROM notifications n WHERE ${whereSql}
    `).get(parameters).count
  };
}

function countUnread(userId) {
  return getDatabase().prepare(`
    SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(userId).count;
}

function markRead(userId, notificationId, readAt) {
  const database = getDatabase();
  const owned = database.prepare(`
    SELECT id FROM notifications WHERE user_id = ? AND public_notification_id = ?
  `).get(userId, notificationId);
  if (!owned) return null;
  database.prepare(`
    UPDATE notifications
    SET is_read = 1, read_at = COALESCE(read_at, ?)
    WHERE id = ?
  `).run(readAt, owned.id);
  return notificationId;
}

function markAllRead(userId, readAt) {
  return getDatabase().prepare(`
    UPDATE notifications SET is_read = 1, read_at = ?
    WHERE user_id = ? AND is_read = 0
  `).run(readAt, userId).changes;
}

function ensurePreferences(userId, timestamp) {
  getDatabase().prepare(`
    INSERT OR IGNORE INTO notification_preferences (
      user_id, email_enabled, status_updates_enabled,
      information_required_enabled, resolution_enabled, created_at, updated_at
    ) VALUES (?, 0, 1, 1, 1, ?, ?)
  `).run(userId, timestamp, timestamp);
}

function getPreferences(userId) {
  const timestamp = new Date().toISOString();
  ensurePreferences(userId, timestamp);
  return getDatabase().prepare(`
    SELECT p.*, u.email
    FROM notification_preferences p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ?
  `).get(userId);
}

function updatePreferences(userId, preferences, updatedAt) {
  ensurePreferences(userId, updatedAt);
  getDatabase().prepare(`
    UPDATE notification_preferences SET
      email_enabled = @emailEnabled,
      status_updates_enabled = @statusUpdatesEnabled,
      information_required_enabled = @informationRequiredEnabled,
      resolution_enabled = @resolutionEnabled,
      updated_at = @updatedAt
    WHERE user_id = @userId
  `).run({ userId, updatedAt, ...preferences });
  return getPreferences(userId);
}

function listHistoryForOwner(userId, complaintId) {
  const database = getDatabase();
  const complaint = database.prepare(`
    SELECT id FROM complaints WHERE user_id = ? AND complaint_id = ?
  `).get(userId, complaintId);
  if (!complaint) return null;
  return {
    history: database.prepare(`
      SELECT public_history_id, to_status, user_visible_message, created_at
      FROM complaint_status_history
      WHERE complaint_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(complaint.id),
    messages: database.prepare(`
      SELECT public_message_id, message, created_at
      FROM complaint_user_messages
      WHERE complaint_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(complaint.id)
  };
}

function listMessagesForComplaint(complaintInternalId) {
  return getDatabase().prepare(`
    SELECT public_message_id, message, created_at
    FROM complaint_user_messages
    WHERE complaint_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(complaintInternalId);
}

function getNotificationForDelivery(notificationId) {
  return getDatabase().prepare(`
    SELECT n.id, n.public_notification_id, n.type, n.title, n.message,
           n.action_url, n.created_at, c.complaint_id,
           s.public_report_id AS suspicious_report_public_id, u.email,
           p.email_enabled, p.status_updates_enabled,
           p.information_required_enabled, p.resolution_enabled
    FROM notifications n
    JOIN users u ON u.id = n.user_id
    LEFT JOIN complaints c ON c.id = n.complaint_id
    LEFT JOIN suspicious_reports s ON s.id = n.suspicious_report_id
    LEFT JOIN notification_preferences p ON p.user_id = n.user_id
    WHERE n.public_notification_id = ?
  `).get(notificationId) || null;
}

function createDelivery(delivery) {
  const database = getDatabase();
  const existing = database.prepare(`
    SELECT * FROM notification_deliveries WHERE notification_id = ? AND channel = ?
  `).get(delivery.notificationInternalId, delivery.channel);
  if (existing) return existing;
  const statement = database.prepare(`
    INSERT INTO notification_deliveries (
      public_delivery_id, notification_id, channel, provider, recipient,
      status, attempt_count, last_error_code, created_at, updated_at, sent_at
    ) VALUES (
      @publicId, @notificationInternalId, @channel, @provider, @recipient,
      @status, 0, @errorCode, @createdAt, @createdAt, NULL
    )
  `);
  const created = insertWithRandomId(statement, (publicId) => ({
    publicId,
    notificationInternalId: delivery.notificationInternalId,
    channel: delivery.channel,
    provider: delivery.provider,
    recipient: delivery.recipient ?? null,
    status: delivery.status,
    errorCode: delivery.errorCode ?? null,
    createdAt: delivery.createdAt
  }), generateDeliveryId);
  return database.prepare('SELECT * FROM notification_deliveries WHERE id = ?').get(created.internalId);
}

function recordDeliveryAttempt(deliveryId, result, timestamp) {
  getDatabase().prepare(`
    UPDATE notification_deliveries SET
      status = @status,
      attempt_count = attempt_count + 1,
      last_error_code = @errorCode,
      updated_at = @timestamp,
      sent_at = CASE WHEN @status = 'sent' THEN @timestamp ELSE sent_at END
    WHERE id = @deliveryId
  `).run({
    deliveryId,
    status: result.status,
    errorCode: result.errorCode ?? null,
    timestamp
  });
}

module.exports = {
  countUnread,
  createDelivery,
  ensurePreferences,
  getNotificationForDelivery,
  getPreferences,
  insertNotification,
  insertStatusHistory,
  insertUserMessage,
  listForUser,
  listHistoryForOwner,
  listMessagesForComplaint,
  markAllRead,
  markRead,
  recordDeliveryAttempt,
  updatePreferences
};
