'use strict';

const { generateComplaintId, isComplaintId } = require('../../src/utils/complaintId');
const { generateUserId } = require('../../src/utils/userId');
const { generateEvidenceId, isEvidenceId } = require('../../src/utils/evidenceId');
const { generateNotificationId } = require('../../src/utils/communicationIds');
const { generateSuspiciousReportId, isSuspiciousReportId } = require('../../src/utils/suspiciousIds');
const { baseSlug } = require('../../src/utils/contentSlug');

describe('public identifiers and slugs', () => {
  it('generates valid non-sequential complaint references', () => {
    const id = generateComplaintId(new Date('2026-08-25T00:00:00Z'));
    expect(id).toMatch(/^CSR-2026-/); expect(isComplaintId(id)).toBe(true);
  });
  it('generates valid user, evidence, notification, and suspicious references', () => {
    expect(generateUserId()).toMatch(/^USR-[A-Z2-9]{10}$/);
    expect(isEvidenceId(generateEvidenceId())).toBe(true);
    expect(generateNotificationId()).toMatch(/^NTF-[A-Z2-9]{8}$/);
    expect(isSuspiciousReportId(generateSuspiciousReportId())).toBe(true);
  });
  it('creates normalized bounded article slugs', () => {
    expect(baseSlug('  Safer Café & Payments  ')).toBe('safer-cafe-payments');
    expect(baseSlug('<script>alert(1)</script>')).not.toContain('<');
  });
});
