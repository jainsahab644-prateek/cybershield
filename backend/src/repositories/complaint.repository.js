'use strict';

const { getDatabase } = require('../config/database');
const { insertAudit } = require('./audit.repository');
const { insertNotification, insertStatusHistory } = require('./notification.repository');

const insertComplaintSql = `
  INSERT INTO complaints (
    complaint_id, category, subcategory, incident_title, incident_description,
    incident_date, incident_time, incident_location, platform, financial_loss,
    suspect_name, suspect_phone, suspect_email, suspect_username, suspect_website,
    complainant_name, complainant_email, complainant_phone, status, priority,
    created_at, updated_at, user_id
  ) VALUES (
    @complaintId, @category, @subcategory, @incidentTitle, @incidentDescription,
    @incidentDate, @incidentTime, @incidentLocation, @platform, @financialLoss,
    @suspectName, @suspectPhone, @suspectEmail, @suspectUsername, @suspectWebsite,
    @complainantName, @complainantEmail, @complainantPhone, @status, @priority,
    @createdAt, @updatedAt, @userId
  )
`;

function complaintParameters(complaint) {
  return {
    complaintId: complaint.complaintId,
    category: complaint.category,
    subcategory: complaint.subcategory ?? null,
    incidentTitle: complaint.incident_title,
    incidentDescription: complaint.incident_description,
    incidentDate: complaint.incident_date,
    incidentTime: complaint.incident_time ?? null,
    incidentLocation: complaint.incident_location ?? null,
    platform: complaint.platform ?? null,
    financialLoss: complaint.financial_loss,
    suspectName: complaint.suspect_name ?? null,
    suspectPhone: complaint.suspect_phone ?? null,
    suspectEmail: complaint.suspect_email ?? null,
    suspectUsername: complaint.suspect_username ?? null,
    suspectWebsite: complaint.suspect_website ?? null,
    complainantName: complaint.complainant_name,
    complainantEmail: complaint.complainant_email,
    complainantPhone: complaint.complainant_phone,
    status: complaint.status,
    priority: complaint.priority,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    userId: complaint.userId ?? null
  };
}

function complaintIdExists(complaintId) {
  const row = getDatabase()
    .prepare('SELECT 1 FROM complaints WHERE complaint_id = ?')
    .get(complaintId);
  return Boolean(row);
}

function createComplaint(complaint, buildCommunication) {
  const database = getDatabase();
  const transaction = database.transaction(() => {
    const result = database.prepare(insertComplaintSql).run(complaintParameters(complaint));
    const created = database.prepare('SELECT * FROM complaints WHERE id = ?').get(result.lastInsertRowid);
    const communication = buildCommunication(created);
    const history = insertStatusHistory(database, communication.history);
    let notificationId = null;
    if (communication.notification) {
      const notification = insertNotification(database, {
        ...communication.notification,
        eventKey: `history:${history.publicId}`
      });
      notificationId = notification.publicId;
      if (notification.created) {
        insertAudit(database, {
          actorUserId: complaint.userId,
          actorRole: 'user',
          action: 'notification_created',
          entityType: 'complaint',
          entityPublicId: complaint.complaintId,
          metadata: { notificationId, type: communication.notification.type },
          ipAddress: null,
          createdAt: complaint.createdAt
        });
      }
    }
    return { complaint: created, notificationId };
  });
  return transaction();
}

function findFullByComplaintId(complaintId) {
  return getDatabase()
    .prepare('SELECT * FROM complaints WHERE complaint_id = ?')
    .get(complaintId) || null;
}

function findPublicStatusByComplaintId(complaintId) {
  return getDatabase().prepare(`
    SELECT complaint_id, category, incident_title, status, created_at, updated_at
    FROM complaints
    WHERE complaint_id = ?
  `).get(complaintId) || null;
}

function listForUser(userId, { page, limit, status, category }) {
  const where = ['user_id = @userId'];
  const parameters = { userId, limit, offset: (page - 1) * limit };
  if (status) {
    where.push('status = @status');
    parameters.status = status;
  }
  if (category) {
    where.push('category = @category');
    parameters.category = category;
  }
  const whereSql = where.join(' AND ');
  const database = getDatabase();
  const complaints = database.prepare(`
    SELECT complaint_id, category, incident_title, status, created_at, updated_at
    FROM complaints WHERE ${whereSql}
    ORDER BY created_at DESC LIMIT @limit OFFSET @offset
  `).all(parameters);
  const total = database.prepare(`
    SELECT COUNT(*) AS count FROM complaints WHERE ${whereSql}
  `).get(parameters).count;
  const summary = database.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
      SUM(CASE WHEN status IN ('under_review', 'information_required', 'in_progress') THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved
    FROM complaints WHERE user_id = ?
  `).get(userId);
  return { complaints, total, summary };
}

function findOwnedByComplaintId(userId, complaintId) {
  return getDatabase().prepare(`
    SELECT * FROM complaints WHERE user_id = ? AND complaint_id = ?
  `).get(userId, complaintId) || null;
}

module.exports = {
  complaintIdExists,
  createComplaint,
  findFullByComplaintId,
  findOwnedByComplaintId,
  findPublicStatusByComplaintId,
  listForUser
};
