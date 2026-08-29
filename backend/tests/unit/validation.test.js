'use strict';

const { complaintSchema } = require('../../src/validators/complaint.validator');
const { normalizeIdentifier } = require('../../src/services/auth.service');
const { normalizeIdentifier: normalizeSuspicious } = require('../../src/utils/identifierNormalizer');

const valid = {
  category: 'financial_fraud', incident_title: 'Fictional incident title',
  incident_description: 'A fictional description long enough for validation testing.',
  incident_date: '2026-08-24', financial_loss: 0, complainant_name: 'Demo User',
  complainant_email: 'demo@example.test', complainant_phone: '+919999999999'
};

describe('input validation and normalization', () => {
  it('accepts a valid fictional complaint', () => expect(complaintSchema.safeParse(valid).success).toBe(true));
  it.each([
    [{ ...valid, complainant_email: 'not-email' }, false],
    [{ ...valid, complainant_phone: '123' }, false],
    [{ ...valid, financial_loss: -1 }, false],
    [{ ...valid, category: 'invalid' }, false],
    [{ ...valid, suspect_website: 'javascript:alert(1)' }, false]
  ])('enforces complaint boundaries', (input, expected) => expect(complaintSchema.safeParse(input).success).toBe(expected));
  it('normalizes email identifiers deterministically', () => {
    expect(normalizeIdentifier('email', ' Demo@Example.Test ')).toBe('demo@example.test');
  });
  it('normalizes suspicious identifiers without fetching them', () => {
    expect(normalizeSuspicious('email', ' Demo@Example.Test ')).toBe('Demo@example.test');
  });
});
