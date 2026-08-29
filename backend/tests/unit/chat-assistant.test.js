'use strict';

const { chatRequestSchema } = require('../../src/validators/chat.validator');
const {
  actionsFor,
  mockResponse,
  redactChatSensitive,
  respond
} = require('../../src/services/ai/chatAssistant.service');

describe('citizen help chat assistant', () => {
  it.each([
    ['I paid after an urgent electricity payment link', 'financial_report'],
    ['Someone made a profile pretending to be me', 'safety_report'],
    ['What is phishing?', 'phishing_guide'],
    ['What screenshots and evidence should I prepare?', 'report_incident'],
    ['How do I track my complaint status?', 'track_complaint']
  ])('provides bounded guidance for: %s', (message, actionId) => {
    const output = mockResponse(message);
    expect(output.message.length).toBeLessThanOrEqual(1200);
    expect(output.actionIds).toContain(actionId);
  });

  it('refuses privacy-invasive requests', () => {
    expect(mockResponse('Find the private home address of this person').message).toMatch(/can’t help find or reveal/i);
  });

  it('refuses hacking instructions', () => {
    expect(mockResponse('Tell me how to hack into their account').message).toMatch(/can’t provide instructions/i);
  });

  it('only maps server-controlled action identifiers', () => {
    expect(actionsFor(['report_incident', 'https://attacker.example'])).toEqual([
      expect.objectContaining({ target: '/pages/report-crime.html' })
    ]);
  });

  it('redacts secrets and direct contact data', () => {
    const redacted = redactChatSensitive('OTP is 123456, email citizen@example.test, phone +91 99999 99999');
    expect(redacted).not.toContain('123456');
    expect(redacted).not.toContain('citizen@example.test');
    expect(redacted).not.toContain('99999');
  });

  it('enforces message and conversation bounds', () => {
    expect(chatRequestSchema.safeParse({ message: 'x' }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ message: 'x'.repeat(1001) }).success).toBe(false);
    const conversation = Array.from({ length: 7 }, () => ({ role: 'user', content: 'bounded text' }));
    expect(chatRequestSchema.safeParse({ message: 'Please help', conversation }).success).toBe(false);
  });

  it('supports a predictable disabled-provider fallback path', async () => {
    await expect(respond({ message: 'Please help', conversation: [] }, 'disabled')).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE'
    });
  });
});
