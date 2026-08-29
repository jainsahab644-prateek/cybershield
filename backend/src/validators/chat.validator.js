'use strict';

const { z } = require('zod');
const { sendError } = require('../utils/apiResponse');

const conversationItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(800)
}).strict();

const chatRequestSchema = z.object({
  message: z.string().trim().min(2, 'Please enter a question.').max(1000, 'Please keep your question under 1,000 characters.'),
  conversation: z.array(conversationItemSchema).max(6, 'Only the six most recent messages can be included.').default([]),
  page: z.string().trim().regex(/^[a-z0-9-]{1,64}$/i, 'Page context is not valid.').optional()
}).strict();

const chatModelResultSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  actionIds: z.array(z.enum([
    'report_incident', 'track_complaint', 'financial_report', 'safety_report',
    'other_report', 'learning_corner', 'phishing_guide'
  ])).max(3).default([])
}).strict();

function validateChatRequest(request, response, next) {
  const result = chatRequestSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, {
      statusCode: 400,
      message: result.error.issues[0].message,
      errors: result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'message', message: issue.message }))
    });
  }
  request.validatedChatRequest = result.data;
  return next();
}

module.exports = { chatModelResultSchema, chatRequestSchema, validateChatRequest };
