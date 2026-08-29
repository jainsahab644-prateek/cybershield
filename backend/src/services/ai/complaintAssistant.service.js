'use strict';

const { env } = require('../../config/env');
const { assistantResultSchema } = require('../../validators/assistant.validator');
const { categories } = require('./incidentTaxonomy');

const NEVER_SHARE = 'Never share OTPs, UPI PINs, card PINs, passwords, CVVs, recovery codes, private keys or seed phrases.';
const COMMON_INFO = ['Approximate date and time', 'Platform, website or app involved', 'Screenshot or message text, if available'];

function result(category, subcategory, confidence, summary, usefulInformation, alternatives = []) {
  return assistantResultSchema.parse({
    suggestedCategory: category,
    suggestedSubcategory: subcategory,
    confidence,
    summary,
    usefulInformation,
    safetyWarning: NEVER_SHARE,
    alternatives
  });
}

function classifyMock(description) {
  const text = description.toLowerCase();
  if (/threat|harass|bully|stalk/.test(text)) {
    return result('safety_related', /threat/.test(text) ? 'threatening_messages' : 'online_harassment', 'high',
      'This sounds like harmful or threatening online contact where personal safety and preserving messages are important.',
      ['Username or account that contacted you', ...COMMON_INFO], ['other_cybercrime']);
  }
  if (/pretend|impersonat|fake (profile|account)|using my (name|photo)/.test(text)) {
    return result('safety_related', 'impersonation', 'high',
      'This sounds like someone may be using another person’s identity or profile details online.',
      ['Profile name and username', 'Link to the fictional profile', ...COMMON_INFO], ['other_cybercrime']);
  }
  if (/cannot access|can't access|hacked|compromis|password.*website/.test(text)) {
    return result('other_cybercrime', 'account_compromise', 'high',
      'This sounds like an online account may have been accessed or changed without permission.',
      ['Account or platform affected', 'Last time you could access it', 'Security alerts received', ...COMMON_INFO]);
  }
  if (/shop|seller|ordered|product|marketplace/.test(text)) {
    return result('financial_fraud', 'shopping_fraud', 'high',
      'This sounds like a payment connected to an online purchase where the seller or goods may not be available.',
      ['Order reference', 'Seller profile or website', 'Approximate amount and payment method', ...COMMON_INFO]);
  }
  if (/payment|paid|money|upi|bank|wallet|investment|electricity|qr|transaction/.test(text)) {
    const subcategory = /link|electricity|phish/.test(text) ? 'payment_link_scam' : 'other_financial_fraud';
    return result('financial_fraud', subcategory, 'high',
      'This sounds like a suspicious payment request or possible financial loss.',
      ['Contact or account that sent the request', 'Approximate amount and payment method', 'Payment link or transaction reference', ...COMMON_INFO]);
  }
  if (/link|message|email|sms|website/.test(text)) {
    return result('other_cybercrime', 'phishing', 'medium',
      'This may involve a deceptive message, link or website intended to collect information.',
      ['Sender address or phone number', 'Link or website address', ...COMMON_INFO], ['financial_fraud']);
  }
  return result('other_cybercrime', 'other_cybercrime', 'low',
    'There is not enough detail to identify one clear reporting path. You can review likely options and choose the closest fit.',
    COMMON_INFO, ['safety_related', 'financial_fraud']);
}

function redactSecrets(description) {
  let value = description;
  const patterns = [
    /(otp|pin|cvv|password|recovery code|seed phrase)\s*(?:is|:|=)?\s*\S+/gi,
    /\b(?:\d[ -]?){12,19}\b/g
  ];
  patterns.forEach((pattern) => { value = value.replace(pattern, '[sensitive value removed]'); });
  return value;
}

function outputJsonSchema() {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      suggestedCategory: { type: 'string', enum: Object.keys(categories) },
      suggestedSubcategory: { type: 'string', enum: [...new Set(Object.values(categories).flat())] },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      summary: { type: 'string' },
      usefulInformation: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
      safetyWarning: { type: 'string' },
      alternatives: { type: 'array', items: { type: 'string', enum: Object.keys(categories) }, maxItems: 2 }
    },
    required: ['suggestedCategory', 'suggestedSubcategory', 'confidence', 'summary', 'usefulInformation', 'safetyWarning', 'alternatives']
  };
}

async function classifyOpenAI(description) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        store: false,
        max_output_tokens: 700,
        instructions: `You are a category assistant for a fictional cyber-incident reporting prototype. Classify only into the supplied category and subcategory enums. Use plain English. Do not make legal conclusions, determine guilt, accuse anyone, identify a criminal, or ask for secrets. Never request OTPs, PINs, passwords, CVVs, recovery codes, private keys or seed phrases. Express uncertainty with low confidence and useful alternatives. Return only the required structured data.`,
        input: redactSecrets(description),
        text: { format: { type: 'json_schema', name: 'cybershield_incident_classification', strict: true, schema: outputJsonSchema() }, verbosity: 'low' }
      })
    });
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}.`);
    const payload = await response.json();
    const raw = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
    if (!raw) throw new Error('OpenAI response did not include structured output.');
    const parsed = assistantResultSchema.parse(JSON.parse(raw));
    return assistantResultSchema.parse({ ...parsed, safetyWarning: NEVER_SHARE });
  } finally {
    clearTimeout(timeout);
  }
}

async function classifyIncident(description) {
  if (env.AI_PROVIDER === 'disabled') {
    const error = new Error('Complaint assistant is disabled.');
    error.code = 'AI_UNAVAILABLE';
    throw error;
  }
  const classification = env.AI_PROVIDER === 'openai'
    ? await classifyOpenAI(description)
    : classifyMock(description);
  return { ...classification, provider: env.AI_PROVIDER, isMock: env.AI_PROVIDER === 'mock' };
}

module.exports = { classifyIncident, classifyMock, redactSecrets };
