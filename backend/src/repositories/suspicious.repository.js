'use strict';

const { getDatabase } = require('../config/database');
const { generateSuspiciousNoteId, generateSuspiciousReportId } = require('../utils/suspiciousIds');

const MAX_ATTEMPTS = 10;

function createReport(report) {
  const database = getDatabase();
  const statement = database.prepare(`INSERT INTO suspicious_reports (
    public_report_id, user_id, identifier_type, identifier_value, normalized_identifier,
    identifier_hash, category, description, status, created_at, updated_at
  ) VALUES (@reportId, @userId, @identifierType, @identifierValue, @normalizedIdentifier,
    @identifierHash, @category, @description, 'submitted', @createdAt, @createdAt)`);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const reportId = generateSuspiciousReportId();
      const result = statement.run({ ...report, reportId });
      return findByInternalId(Number(result.lastInsertRowid));
    } catch (error) { if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error; }
  }
  throw new Error('Unable to allocate a unique suspicious report identifier.');
}

function findByInternalId(id) { return getDatabase().prepare('SELECT * FROM suspicious_reports WHERE id = ?').get(id) || null; }
function findByPublicId(reportId) { return getDatabase().prepare('SELECT * FROM suspicious_reports WHERE public_report_id = ?').get(reportId) || null; }
function findOwned(userId, reportId) { return getDatabase().prepare('SELECT * FROM suspicious_reports WHERE user_id = ? AND public_report_id = ?').get(userId, reportId) || null; }

function listOwned(userId, filters) {
  const where = ['user_id = @userId']; const params = { userId, limit: filters.limit, offset: (filters.page - 1) * filters.limit };
  if (filters.status) { where.push('status = @status'); params.status = filters.status; }
  const whereSql = where.join(' AND ');
  const database = getDatabase();
  return {
    rows: database.prepare(`SELECT * FROM suspicious_reports WHERE ${whereSql} ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`).all(params),
    total: database.prepare(`SELECT COUNT(*) count FROM suspicious_reports WHERE ${whereSql}`).get(params).count
  };
}

function listAdmin(filters) {
  const where = ['1 = 1']; const params = { limit: filters.limit, offset: (filters.page - 1) * filters.limit };
  for (const [key, column] of [['status','status'], ['identifierType','identifier_type'], ['category','category']]) {
    if (filters[key]) { where.push(`${column} = @${key}`); params[key] = filters[key]; }
  }
  if (filters.search) { where.push('(public_report_id LIKE @search OR identifier_value LIKE @search)'); params.search = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`; }
  const order = filters.sort === 'oldest' ? 'created_at ASC, id ASC' : filters.sort === 'updated' ? 'updated_at DESC, id DESC' : 'created_at DESC, id DESC';
  const whereSql = where.join(' AND '); const database = getDatabase();
  return {
    rows: database.prepare(`SELECT r.*, u.user_id reporter_public_user_id,
      (SELECT COUNT(*) FROM suspicious_reports g WHERE g.identifier_type=r.identifier_type AND g.identifier_hash=r.identifier_hash) group_count
      FROM suspicious_reports r LEFT JOIN users u ON u.id=r.user_id WHERE ${whereSql} ORDER BY ${order} LIMIT @limit OFFSET @offset`).all(params),
    total: database.prepare(`SELECT COUNT(*) count FROM suspicious_reports WHERE ${whereSql}`).get(params).count
  };
}

function approvedLookup(type, hash) {
  return getDatabase().prepare(`SELECT COUNT(*) report_count, GROUP_CONCAT(DISTINCT category) categories,
    MIN(updated_at) first_reviewed, MAX(updated_at) latest_reviewed
    FROM suspicious_reports WHERE identifier_type=? AND identifier_hash=? AND status='published_demo_flag'`).get(type, hash);
}

function groupSummary(report) {
  return getDatabase().prepare(`SELECT COUNT(*) report_count,
    SUM(CASE WHEN status='published_demo_flag' THEN 1 ELSE 0 END) published_count,
    MIN(created_at) first_reported, MAX(created_at) latest_reported
    FROM suspicious_reports WHERE identifier_type=? AND identifier_hash=?`).get(report.identifier_type, report.identifier_hash);
}

function updateStatus(id, status, updatedAt) {
  getDatabase().prepare('UPDATE suspicious_reports SET status=?, updated_at=? WHERE id=?').run(status, updatedAt, id);
  return findByInternalId(id);
}

function addNote(reportId, adminId, note, createdAt) {
  const statement = getDatabase().prepare(`INSERT INTO suspicious_report_notes
    (public_note_id, suspicious_report_id, admin_user_id, note, created_at) VALUES (?, ?, ?, ?, ?)`);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try { const id=generateSuspiciousNoteId(); statement.run(id, reportId, adminId, note, createdAt); return id; }
    catch (error) { if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error; }
  }
  throw new Error('Unable to allocate a note identifier.');
}

function notesFor(reportId) { return getDatabase().prepare(`SELECT n.public_note_id,n.note,n.created_at,u.full_name admin_name
  FROM suspicious_report_notes n JOIN users u ON u.id=n.admin_user_id WHERE n.suspicious_report_id=? ORDER BY n.created_at DESC`).all(reportId); }
function evidenceFor(reportId) { return getDatabase().prepare('SELECT * FROM suspicious_report_evidence WHERE suspicious_report_id=? ORDER BY created_at DESC').all(reportId); }
function auditFor(publicId) { return getDatabase().prepare(`SELECT a.public_audit_id,a.action,a.metadata_json,a.created_at,u.full_name actor_name
  FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.entity_type='suspicious_report' AND a.entity_public_id=? ORDER BY a.created_at ASC,a.id ASC`).all(publicId); }
function stats() { return getDatabase().prepare(`SELECT COUNT(*) total,
  SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) pending,
  SUM(CASE WHEN status='published_demo_flag' THEN 1 ELSE 0 END) published FROM suspicious_reports`).get(); }

module.exports = { addNote, approvedLookup, auditFor, createReport, evidenceFor, findByPublicId, findOwned, groupSummary, listAdmin, listOwned, notesFor, stats, updateStatus };
