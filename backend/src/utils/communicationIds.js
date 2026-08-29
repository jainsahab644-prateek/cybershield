'use strict';

const crypto = require('node:crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomReference(prefix) {
  let suffix = '';
  while (suffix.length < 8) suffix += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  return `${prefix}-${suffix}`;
}

const generateHistoryId = () => randomReference('HST');
const generateNotificationId = () => randomReference('NTF');
const generateDeliveryId = () => randomReference('DLV');
const generateMessageId = () => randomReference('MSG');

module.exports = {
  generateDeliveryId,
  generateHistoryId,
  generateMessageId,
  generateNotificationId
};
