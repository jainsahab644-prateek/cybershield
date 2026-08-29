'use strict';

const crypto = require('node:crypto');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomId(prefix) {
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (let index = 0; index < 8; index += 1) suffix += ALPHABET[bytes[index] % ALPHABET.length];
  return `${prefix}-${suffix}`;
}

const generateSuspiciousReportId = () => randomId('SPR');
const generateSuspiciousEvidenceId = () => randomId('SEV');
const generateSuspiciousNoteId = () => randomId('SRN');
const isSuspiciousReportId = (value) => /^SPR-[A-HJ-NP-Z2-9]{8}$/i.test(String(value));
const isSuspiciousEvidenceId = (value) => /^SEV-[A-HJ-NP-Z2-9]{8}$/i.test(String(value));

module.exports = {
  generateSuspiciousEvidenceId,
  generateSuspiciousNoteId,
  generateSuspiciousReportId,
  isSuspiciousEvidenceId,
  isSuspiciousReportId
};
