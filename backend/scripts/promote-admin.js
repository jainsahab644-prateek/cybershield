'use strict';

const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const { closeDatabase, initializeDatabase } = require('../src/config/database');
const userRepository = require('../src/repositories/user.repository');

function identifierDetails(rawIdentifier) {
  const identifier = String(rawIdentifier || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    return { method: 'email', identifier: identifier.toLowerCase() };
  }
  if (/^\+?\d{10,15}$/.test(identifier)) {
    return { method: 'phone', identifier };
  }
  throw new Error('Provide an existing fictional email address or phone number.');
}

function promoteAdmin(rawIdentifier) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Admin promotion is available only when NODE_ENV=development.');
  }
  initializeDatabase();
  const { method, identifier } = identifierDetails(rawIdentifier);
  const existing = userRepository.findByIdentifier(method, identifier);
  if (!existing) throw new Error('No existing CyberShield user matches that identifier.');
  return userRepository.promoteToAdmin(method, identifier, new Date().toISOString());
}

if (require.main === module) {
  try {
    const user = promoteAdmin(process.argv[2]);
    console.log(`Promoted ${user.user_id} to CyberShield demo administrator.`);
  } catch (error) {
    console.error(`Admin promotion failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
}

module.exports = { promoteAdmin };
