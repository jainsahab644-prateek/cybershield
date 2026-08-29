'use strict';

const { getDatabase } = require('../config/database');
const { generateNoteId } = require('../utils/adminIds');
const { insertAudit } = require('./audit.repository');

const MAX_ID_ATTEMPTS = 10;

function addNoteWithAudit({ complaint, admin, note, createdAt, ipAddress }) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT INTO complaint_notes (
      public_note_id, complaint_id, admin_user_id, note, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  const transaction = database.transaction(() => {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      const noteId = generateNoteId();
      try {
        insert.run(noteId, complaint.id, admin.internalId, note, createdAt);
        insertAudit(database, {
          actorUserId: admin.internalId,
          actorRole: 'admin',
          action: 'admin_note_added',
          entityType: 'complaint',
          entityPublicId: complaint.complaint_id,
          metadata: { noteId },
          ipAddress,
          createdAt
        });
        return noteId;
      } catch (error) {
        if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
      }
    }
    throw new Error('Unable to allocate a unique note identifier.');
  });
  return transaction();
}

function listForComplaint(complaintId) {
  return getDatabase().prepare(`
    SELECT n.public_note_id, n.note, n.created_at,
           u.user_id AS admin_public_user_id, u.full_name AS admin_name
    FROM complaint_notes n
    JOIN users u ON u.id = n.admin_user_id
    WHERE n.complaint_id = ?
    ORDER BY n.created_at ASC, n.id ASC
  `).all(complaintId);
}

module.exports = { addNoteWithAudit, listForComplaint };
