'use strict';

const { env } = require('../../config/env');
const contentRepository = require('../../repositories/content.repository');
const { chatModelResultSchema } = require('../../validators/chat.validator');
const { categoryLabels } = require('./incidentTaxonomy');
const { classifyMock, redactSecrets } = require('./complaintAssistant.service');

const ACTIONS = Object.freeze({
  report_incident: { type: 'navigate', label: 'Start Demo Report', target: '/pages/report-crime.html' },
  track_complaint: { type: 'navigate', label: 'Track Demo Complaint', target: '/pages/track-complaint.html' },
  financial_report: { type: 'navigate', label: 'Start Financial Fraud Report', target: '/pages/financial-fraud.html' },
  safety_report: { type: 'navigate', label: 'Start Safety-Related Report', target: '/pages/safety-related.html' },
  other_report: { type: 'navigate', label: 'Start Other Cybercrime Report', target: '/pages/other-cybercrime.html' },
  learning_corner: { type: 'navigate', label: 'Open Learning Corner', target: '/pages/learning.html' },
  phishing_guide: { type: 'navigate', label: 'Read Phishing Guide', target: '/pages/article.html?slug=how-to-recognize-a-phishing-message' }
});

const STOP_WORDS = new Set(['about', 'after', 'could', 'from', 'have', 'help', 'should', 'someone', 'their', 'there', 'these', 'this', 'what', 'when', 'where', 'which', 'with', 'would']);

function actionsFor(actionIds) {
  return [...new Set(actionIds)].map((id) => ACTIONS[id]).filter(Boolean).map((action) => ({ ...action }));
}

function redactChatSensitive(value) {
  return redactSecrets(value)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email removed]')
    .replace(/(?:\+?\d[\s-]?){10,15}/g, '[phone number removed]');
}

function usefulTerms(message) {
  return [...new Set(message.toLowerCase().match(/[a-z]{4,}/g) || [])]
    .filter((word) => !STOP_WORDS.has(word)).slice(0, 4);
}

function publishedLearningContext(message) {
  return contentRepository.searchPublishedForChat(usefulTerms(message)).map((article) => ({
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    excerpt: article.content
  }));
}

function formatCategory(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mockResponse(message) {
  const text = message.toLowerCase();
  if (/private (?:home )?address|home address|dox|personal address|find .* address/.test(text)) {
    return { message: 'I can’t help find or reveal someone’s private address or personal information. I can help you document concerning online activity without invading anyone’s privacy.', actionIds: ['report_incident'] };
  }
  if (/\bhack\b|hack into|break into|steal (?:their )?password|take over .*account/.test(text)) {
    return { message: 'I can’t provide instructions for accessing or damaging another account. Preserve messages and account details, secure your own accounts, and use the demo reporting journey to document what happened.', actionIds: ['report_incident', 'learning_corner'] };
  }
  if (/track|reference id|complaint status/.test(text)) {
    return { message: 'Open Track Demo Complaint and enter the CyberShield reference ID created after a demo submission. Tracking shows a synthetic status only; no authority is contacted.', actionIds: ['track_complaint'] };
  }
  if (/evidence|upload|screenshot|prepare/.test(text)) {
    return { message: 'Useful evidence may include screenshots, message text, usernames, profile or website links, dates, order or transaction references, and the platform involved. Upload only fictional JPG, PNG, or PDF files in this prototype. Never include passwords, OTPs, PINs, CVVs, or recovery codes.', actionIds: ['report_incident'] };
  }
  if (/what is phishing|phishing mean/.test(text)) {
    return { message: 'Phishing is a deceptive message or website that tries to make you reveal information, open a harmful link, or approve a payment. Pause, verify through a trusted channel, and do not enter credentials from an unexpected link.', actionIds: ['phishing_guide', 'learning_corner'] };
  }
  if (/prototype|how .*work|official|government|police/.test(text)) {
    return { message: 'CyberShield is an educational hackathon prototype, not a government or police service. It guides a fictional report, creates a demo reference ID, and shows mock tracking. Nothing is submitted to an authority.', actionIds: ['report_incident', 'track_complaint'] };
  }
  if (/safety help|stay safe|cyber safety/.test(text)) {
    return { message: 'Pause before acting, verify unexpected requests through a channel you already trust, protect credentials, and record useful details safely. For immediate danger, contact the appropriate local emergency service.', actionIds: ['learning_corner'] };
  }

  const classification = classifyMock(message);
  const information = classification.usefulInformation.slice(0, 4).map((item) => `• ${item}`).join('\n');
  const action = classification.suggestedCategory === 'financial_fraud' ? 'financial_report'
    : classification.suggestedCategory === 'safety_related' ? 'safety_report' : 'other_report';
  return {
    message: `This may fit ${categoryLabels[classification.suggestedCategory]} — ${formatCategory(classification.suggestedSubcategory)}.\n\nYou may want to prepare:\n${information}\n\nThis is guidance only, and you can choose a different category.`,
    actionIds: [action, 'report_incident']
  };
}

function modelSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      actionIds: { type: 'array', items: { type: 'string', enum: Object.keys(ACTIONS) }, maxItems: 3 }
    },
    required: ['message', 'actionIds']
  };
}

async function openAIResponse(input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENAI_TIMEOUT_MS);
  const conversation = input.conversation.map((item) => ({ role: item.role, content: redactChatSensitive(item.content) }));
  const safeMessage = redactChatSensitive(input.message);
  const learning = publishedLearningContext(safeMessage);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        store: false,
        max_output_tokens: 650,
        instructions: 'You are CyberShield Assistant for an educational cyber-safety and fictional reporting prototype. Use simple language, short answers, and steps when helpful. Never determine guilt, accuse someone, make legal conclusions, claim official authority, request secrets, reveal private information, provide hacking instructions, or claim a real submission occurred. Say incidents may fit a category. Actions must use only the supplied action identifiers. The user controls all navigation and reporting choices.',
        input: [
          ...conversation,
          { role: 'user', content: JSON.stringify({ question: safeMessage, safePageContext: input.page || null, publishedLearningContent: learning }) }
        ],
        text: { format: { type: 'json_schema', name: 'cybershield_citizen_help', strict: true, schema: modelSchema() }, verbosity: 'low' }
      })
    });
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}.`);
    const payload = await response.json();
    const raw = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text;
    if (!raw) throw new Error('OpenAI response did not include structured output.');
    return chatModelResultSchema.parse(JSON.parse(raw));
  } finally {
    clearTimeout(timeout);
  }
}

async function respond(input, provider = env.AI_PROVIDER) {
  if (provider === 'disabled') {
    const error = new Error('Chat assistant is disabled.');
    error.code = 'AI_UNAVAILABLE';
    throw error;
  }
  const result = provider === 'openai' ? await openAIResponse(input) : mockResponse(input.message);
  const validated = chatModelResultSchema.parse(result);
  return { message: validated.message, actions: actionsFor(validated.actionIds), provider, isMock: provider === 'mock' };
}

module.exports = { ACTIONS, actionsFor, mockResponse, publishedLearningContext, redactChatSensitive, respond };
