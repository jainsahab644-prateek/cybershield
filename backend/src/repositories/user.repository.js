'use strict';

const { getDatabase } = require('../config/database');

function findById(id) {
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function findByIdentifier(method, identifier) {
  const column = method === 'email' ? 'email' : 'phone';
  return getDatabase().prepare(`SELECT * FROM users WHERE ${column} = ?`).get(identifier) || null;
}

function createUser({ userId, fullName, method, identifier, createdAt }) {
  const email = method === 'email' ? identifier : null;
  const phone = method === 'phone' ? identifier : null;
  const database = getDatabase();
  const result = database.prepare(`
    INSERT INTO users (user_id, full_name, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, fullName, email, phone, createdAt, createdAt);
  return findById(result.lastInsertRowid);
}

function promoteToAdmin(method, identifier, updatedAt) {
  const column = method === 'email' ? 'email' : 'phone';
  const result = getDatabase().prepare(`
    UPDATE users SET role = 'admin', updated_at = ? WHERE ${column} = ?
  `).run(updatedAt, identifier);
  return result.changes === 1 ? findByIdentifier(method, identifier) : null;
}

module.exports = { createUser, findById, findByIdentifier, promoteToAdmin };
