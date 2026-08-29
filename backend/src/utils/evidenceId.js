'use strict';

const crypto = require('node:crypto');

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PATTERN = /^EVD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

function generateEvidenceId() {
  const bytes = crypto.randomBytes(8);
  let token = '';
  for (let index = 0; index < bytes.length; index += 1) {
    token += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return `EVD-${token}`;
}

function isEvidenceId(value) {
  return typeof value === 'string' && PATTERN.test(value.toUpperCase());
}

module.exports = { generateEvidenceId, isEvidenceId };
