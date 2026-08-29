'use strict';

const { assistantResultSchema, descriptionSchema } = require('../../src/validators/assistant.validator');
const { classifyMock, redactSecrets } = require('../../src/services/ai/complaintAssistant.service');

describe('complaint assistant', () => {
  const scenarios = [
    ['I received a message saying my electricity would be disconnected unless I paid through a link.', 'financial_fraud', 'payment_link_scam'],
    ['Someone created an Instagram profile using my name and photos and is pretending to be me.', 'safety_related', 'impersonation'],
    ['I entered my password on a website and now I cannot access my account.', 'other_cybercrime', 'account_compromise'],
    ['I ordered a product online but the seller disappeared after receiving payment.', 'financial_fraud', 'shopping_fraud'],
    ['I received repeated threatening messages on a social platform.', 'safety_related', 'threatening_messages']
  ];

  it.each(scenarios)('classifies fictional scenario %#', (description, category, subcategory) => {
    const output = classifyMock(description);
    expect(output.suggestedCategory).toBe(category);
    expect(output.suggestedSubcategory).toBe(subcategory);
    expect(assistantResultSchema.safeParse(output).success).toBe(true);
  });

  it('states uncertainty for unclear text', () => {
    const output = classifyMock('Something unusual happened online but I do not know what it was.');
    expect(output.confidence).toBe('low');
    expect(output.alternatives.length).toBeGreaterThan(0);
  });

  it('enforces bounded descriptions', () => {
    expect(descriptionSchema.safeParse({ description: 'too short' }).success).toBe(false);
    expect(descriptionSchema.safeParse({ description: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('redacts likely secrets before an external provider call', () => {
    const redacted = redactSecrets('My OTP is 123456 and password: hunter2 and card 4111 1111 1111 1111.');
    expect(redacted).not.toContain('123456');
    expect(redacted).not.toContain('hunter2');
    expect(redacted).not.toContain('4111');
  });
});
