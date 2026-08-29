'use strict';

const { getDatabase } = require('../config/database');

function findLatest(method, identifier) {
  return getDatabase().prepare(`
    SELECT * FROM otp_requests
    WHERE method = ? AND identifier = ?
    ORDER BY id DESC LIMIT 1
  `).get(method, identifier) || null;
}

function invalidateActive(method, identifier, usedAt) {
  return getDatabase().prepare(`
    UPDATE otp_requests SET used_at = ?
    WHERE method = ? AND identifier = ? AND used_at IS NULL
  `).run(usedAt, method, identifier);
}

function createRequest(request) {
  const result = getDatabase().prepare(`
    INSERT INTO otp_requests (
      identifier, method, otp_hash, expires_at, attempt_count, used_at, created_at
    ) VALUES (@identifier, @method, @otpHash, @expiresAt, 0, NULL, @createdAt)
  `).run(request);
  return getDatabase().prepare('SELECT * FROM otp_requests WHERE id = ?').get(result.lastInsertRowid);
}

function recordFailedAttempt(id, lockAt, maximumAttempts) {
  return getDatabase().prepare(`
    UPDATE otp_requests
    SET attempt_count = attempt_count + 1,
        used_at = CASE WHEN attempt_count + 1 >= ? THEN ? ELSE used_at END
    WHERE id = ?
  `).run(maximumAttempts, lockAt, id);
}

function markUsed(id, usedAt) {
  return getDatabase().prepare(`
    UPDATE otp_requests SET used_at = ? WHERE id = ? AND used_at IS NULL
  `).run(usedAt, id);
}

module.exports = {
  createRequest,
  findLatest,
  invalidateActive,
  markUsed,
  recordFailedAttempt
};
