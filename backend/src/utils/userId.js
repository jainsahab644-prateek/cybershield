'use strict';

const crypto = require('node:crypto');

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateUserId() {
  const bytes = crypto.randomBytes(10);
  let token = '';
  for (let index = 0; index < 10; index += 1) {
    token += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return `USR-${token}`;
}

module.exports = { generateUserId };
