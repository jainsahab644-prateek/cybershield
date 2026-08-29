'use strict';

const { getDatabase } = require('../config/database');
const { insertAudit } = require('./audit.repository');
const {
  insertNotification,
  insertStatusHistory,
  insertUserMessage
} = require('./notification.repository');

const SORT_SQL = Object.freeze({
  newest: 'c.created_at DESC, c.id DESC',
  oldest: 'c.created_at ASC, c.id ASC',
  recently_updated: 'c.updated_at DESC, c.id DESC',
  priority: `CASE c.priority
    WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    c.created_at DESC`
});

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildFilters(filters) {
  const where = [];
  const parameters = {
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit
  };
  if (filters.search) {
    where.push(`(
      c.complaint_id LIKE @search ESCAPE '\\'
      OR c.incident_title LIKE @search ESCAPE '\\'
      OR c.complainant_name LIKE @search ESCAPE '\\'
    )`);
    parameters.search = `%${escapeLike(filters.search)}%`;
  }
  for (const field of ['status', 'category', 'priority']) {
    if (filters[field]) {
      where.push(`c.${field} = @${field}`);
      parameters[field] = filters[field];
    }
  }
  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    parameters
  };
}

function list(filters) {
  const database = getDatabase();
  const { whereSql, parameters } = buildFilters(filters);
  const orderBy = SORT_SQL[filters.sort];
  const complaints = database.prepare(`
    SELECT c.complaint_id, c.incident_title, c.category, c.status, c.priority,
           c.complainant_name, c.created_at, c.updated_at,
           COUNT(e.id) AS evidence_count
    FROM complaints c
    LEFT JOIN complaint_evidence e
      ON e.complaint_id = c.id AND e.upload_status = 'accepted'
    ${whereSql}
    GROUP BY c.id
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `).all(parameters);
  const total = database.prepare(`
    SELECT COUNT(*) AS count FROM complaints c ${whereSql}
  `).get(parameters).count;
  return { complaints, total };
}

function getDashboardStats() {
  const database = getDatabase();
  const summary = database.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
      SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS under_review,
      SUM(CASE WHEN status = 'information_required' THEN 1 ELSE 0 END) AS information_required,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
      SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low,
      SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) AS critical
    FROM complaints
  `).get();
  const totalEvidence = database.prepare(`
    SELECT COUNT(*) AS count FROM complaint_evidence WHERE upload_status = 'accepted'
  `).get().count;
  const recent = database.prepare(`
    SELECT c.complaint_id, c.incident_title, c.category, c.status, c.priority,
           c.complainant_name, c.created_at, c.updated_at,
           COUNT(e.id) AS evidence_count
    FROM complaints c
    LEFT JOIN complaint_evidence e
      ON e.complaint_id = c.id AND e.upload_status = 'accepted'
    GROUP BY c.id
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 5
  `).all();
  return { summary, totalEvidence, recent };
}

function findByComplaintId(complaintId) {
  return getDatabase().prepare(`
    SELECT c.*, u.user_id AS public_user_id
    FROM complaints c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.complaint_id = ?
  `).get(complaintId) || null;
}

function updateWithAudit({
  complaintId,
  field,
  value,
  expectedUpdatedAt,
  admin,
  ipAddress,
  validate,
  buildCommunication
}) {
  const database = getDatabase();
  const select = database.prepare('SELECT * FROM complaints WHERE complaint_id = ?');
  const update = database.prepare(`
    UPDATE complaints SET ${field} = ?, updated_at = ? WHERE id = ?
  `);
  const transaction = database.transaction(() => {
    const current = select.get(complaintId);
    if (!current) return null;
    if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
      const error = new Error('Complaint changed since it was loaded.');
      error.code = 'ADMIN_STALE_UPDATE';
      throw error;
    }
    validate(current[field], value);
    const updatedAt = new Date().toISOString();
    update.run(value, updatedAt, current.id);
    insertAudit(database, {
      actorUserId: admin.internalId,
      actorRole: 'admin',
      action: field === 'status' ? 'complaint_status_changed' : 'complaint_priority_changed',
      entityType: 'complaint',
      entityPublicId: complaintId,
      metadata: { from: current[field], to: value },
      ipAddress,
      createdAt: updatedAt
    });
    let notificationId = null;
    if (field === 'status') {
      const communication = buildCommunication(current, value, updatedAt);
      const history = insertStatusHistory(database, communication.history);
      if (communication.notification) {
        const notification = insertNotification(database, {
          ...communication.notification,
          eventKey: `history:${history.publicId}`
        });
        notificationId = notification.publicId;
        if (notification.created) {
          insertAudit(database, {
            actorUserId: admin.internalId,
            actorRole: 'admin',
            action: 'notification_created',
            entityType: 'complaint',
            entityPublicId: complaintId,
            metadata: { notificationId, type: communication.notification.type },
            ipAddress,
            createdAt: updatedAt
          });
        }
      }
    }
    return { complaint: select.get(complaintId), notificationId };
  });
  return transaction();
}

function addUserMessageWithCommunication({ complaintId, message, admin, ipAddress }) {
  const database = getDatabase();
  const select = database.prepare('SELECT * FROM complaints WHERE complaint_id = ?');
  const transaction = database.transaction(() => {
    const complaint = select.get(complaintId);
    if (!complaint) return null;
    if (!complaint.user_id) {
      const error = new Error('Anonymous complaints cannot receive account messages.');
      error.code = 'ANONYMOUS_COMPLAINT';
      throw error;
    }
    const createdAt = new Date().toISOString();
    const userMessage = insertUserMessage(database, {
      complaintId: complaint.id,
      adminUserId: admin.internalId,
      message,
      createdAt
    });
    const notification = insertNotification(database, {
      userId: complaint.user_id,
      complaintId: complaint.id,
      type: 'user_message',
      title: 'CyberShield Admin Message',
      message: `A message is available for your demo complaint ${complaint.complaint_id}.`,
      actionUrl: `/pages/complaint-details.html?id=${encodeURIComponent(complaint.complaint_id)}`,
      eventKey: `user-message:${userMessage.publicId}`,
      createdAt
    });
    insertAudit(database, {
      actorUserId: admin.internalId,
      actorRole: 'admin',
      action: 'user_message_sent',
      entityType: 'complaint',
      entityPublicId: complaint.complaint_id,
      metadata: { messageId: userMessage.publicId },
      ipAddress,
      createdAt
    });
    if (notification.created) {
      insertAudit(database, {
        actorUserId: admin.internalId,
        actorRole: 'admin',
        action: 'notification_created',
        entityType: 'complaint',
        entityPublicId: complaint.complaint_id,
        metadata: { notificationId: notification.publicId, type: 'user_message' },
        ipAddress,
        createdAt
      });
    }
    return {
      messageId: userMessage.publicId,
      notificationId: notification.publicId,
      createdAt
    };
  });
  return transaction();
}

module.exports = {
  addUserMessageWithCommunication,
  findByComplaintId,
  getDashboardStats,
  list,
  updateWithAudit
};
