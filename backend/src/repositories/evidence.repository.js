'use strict';

const { getDatabase } = require('../config/database');

const insertSql = `
  INSERT INTO complaint_evidence (
    public_evidence_id, complaint_id, stored_filename, original_filename,
    file_extension, mime_type, file_size, file_hash, upload_status, created_at
  ) VALUES (
    @evidenceId, @complaintId, @storedFilename, @originalFilename,
    @fileExtension, @mimeType, @fileSize, @fileHash, @uploadStatus, @createdAt
  )
`;

function evidenceIdExists(evidenceId) {
  return Boolean(getDatabase().prepare(
    'SELECT 1 FROM complaint_evidence WHERE public_evidence_id = ?'
  ).get(evidenceId));
}

function insertMany(records, maxFiles) {
  const database = getDatabase();
  const insert = database.prepare(insertSql);
  const count = database.prepare(`
    SELECT COUNT(*) AS count FROM complaint_evidence
    WHERE complaint_id = ? AND upload_status IN ('pending', 'accepted')
  `);
  const complaintStatus = database.prepare('SELECT status FROM complaints WHERE id = ?');
  const transaction = database.transaction((items) => {
    const complaintId = items[0].complaintId;
    const status = complaintStatus.get(complaintId)?.status;
    if (!['submitted', 'under_review', 'information_required', 'in_progress'].includes(status)) {
      const error = new Error('Evidence status conflict.');
      error.code = 'EVIDENCE_STATUS_CONFLICT';
      throw error;
    }
    if (count.get(complaintId).count + items.length > maxFiles) {
      const error = new Error('Evidence count limit reached.');
      error.code = 'EVIDENCE_LIMIT_REACHED';
      throw error;
    }
    items.forEach((item) => insert.run(item));
  });
  transaction(records);
}

function countForComplaint(complaintId) {
  return getDatabase().prepare(`
    SELECT COUNT(*) AS count FROM complaint_evidence
    WHERE complaint_id = ? AND upload_status IN ('pending', 'accepted')
  `).get(complaintId).count;
}

function listForComplaint(complaintId) {
  return getDatabase().prepare(`
    SELECT public_evidence_id, original_filename, file_extension, mime_type,
           file_size, upload_status, created_at
    FROM complaint_evidence
    WHERE complaint_id = ? AND upload_status = 'accepted'
    ORDER BY created_at ASC, id ASC
  `).all(complaintId);
}

function findForComplaint(complaintId, evidenceId) {
  return getDatabase().prepare(`
    SELECT * FROM complaint_evidence
    WHERE complaint_id = ? AND public_evidence_id = ? AND upload_status = 'accepted'
  `).get(complaintId, evidenceId) || null;
}

module.exports = {
  countForComplaint,
  evidenceIdExists,
  findForComplaint,
  insertMany,
  listForComplaint
};
