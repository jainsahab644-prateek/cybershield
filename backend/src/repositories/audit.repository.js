'use strict';

const { getDatabase } = require('../config/database');
const { generateAuditId } = require('../utils/adminIds');

const MAX_ID_ATTEMPTS = 10;

function insertAudit(database, event) {
  const statement = database.prepare(`
    INSERT INTO audit_logs (
      public_audit_id, actor_user_id, actor_role, action, entity_type,
      entity_public_id, metadata_json, ip_address, created_at
    ) VALUES (
      @auditId, @actorUserId, @actorRole, @action, @entityType,
      @entityPublicId, @metadataJson, @ipAddress, @createdAt
    )
  `);

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    try {
      const auditId = generateAuditId();
      statement.run({
        auditId,
        actorUserId: event.actorUserId ?? null,
        actorRole: event.actorRole,
        action: event.action,
        entityType: event.entityType,
        entityPublicId: event.entityPublicId,
        metadataJson: JSON.stringify(event.metadata || {}),
        ipAddress: event.ipAddress || null,
        createdAt: event.createdAt
      });
      return auditId;
    } catch (error) {
      if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
    }
  }
  throw new Error('Unable to allocate a unique audit identifier.');
}

function createAudit(event) {
  return insertAudit(getDatabase(), event);
}

function listComplaintActivity(complaintId) {
  return getDatabase().prepare(`
    SELECT a.public_audit_id, a.action, a.metadata_json, a.created_at,
           u.user_id AS actor_public_user_id, u.full_name AS actor_name
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE a.entity_type = 'complaint'
      AND a.entity_public_id = ?
      AND a.action IN (
        'complaint_status_changed',
        'complaint_priority_changed',
        'admin_note_added',
        'user_message_sent'
      )
    ORDER BY a.created_at ASC, a.id ASC
  `).all(complaintId);
}

module.exports = { createAudit, insertAudit, listComplaintActivity };
