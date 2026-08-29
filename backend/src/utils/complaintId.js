'use strict';

const { randomInt } = require('node:crypto');

// Omits 0/O, 1/I/L, and other easily confused characters.
const SAFE_CHARACTERS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateComplaintId(now = new Date()) {
  const randomPart = Array.from(
    { length: 6 },
    () => SAFE_CHARACTERS[randomInt(0, SAFE_CHARACTERS.length)]
  ).join('');

  return `CSR-${now.getUTCFullYear()}-${randomPart}`;
}

function isComplaintId(value) {
  return /^CSR-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(value);
}

module.exports = { generateComplaintId, isComplaintId };

