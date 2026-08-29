'use strict';

const crypto = require('node:crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomReference(prefix) {
  let suffix = '';
  while (suffix.length < 8) {
    suffix += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

function generateNoteId() {
  return randomReference('NOTE');
}

function generateAuditId() {
  return randomReference('AUD');
}

module.exports = { generateAuditId, generateNoteId };
