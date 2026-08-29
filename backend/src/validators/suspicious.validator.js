'use strict';

const { z } = require('zod');
const { sendError } = require('../utils/apiResponse');
const { formatValidationErrors } = require('./complaint.validator');

const types = ['phone', 'email', 'website', 'social_handle', 'messaging_handle', 'payment_identifier', 'other'];
const categories = ['financial_scam', 'phishing', 'impersonation', 'fake_website', 'online_shopping', 'investment_scam', 'job_scam', 'account_impersonation', 'harassment', 'malicious_link', 'other'];
const statuses = ['submitted', 'under_review', 'confirmed_duplicate', 'published_demo_flag', 'rejected', 'closed'];
const confirmation = z.literal(true, { error: 'Required confirmation was not accepted.' });

const reportSchema = z.object({
  identifierType: z.enum(types),
  identifierValue: z.string().trim().min(2).max(2048),
  category: z.enum(categories),
  description: z.string().trim().min(10).max(3000).optional(),
  directKnowledgeConfirmed: confirmation,
  noProofConfirmed: confirmation
}).strict();
const lookupSchema = z.object({ identifierType: z.enum(types), identifierValue: z.string().trim().min(2).max(2048) }).strict();
const statusSchema = z.object({
  status: z.enum(statuses),
  publishConfirmation: z.boolean().optional()
}).strict();
const noteSchema = z.object({ note: z.string().trim().min(2).max(3000) }).strict();
const filtersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(statuses).optional(), identifierType: z.enum(types).optional(), category: z.enum(categories).optional(),
  search: z.string().trim().max(100).optional(), sort: z.enum(['newest', 'oldest', 'updated']).default('newest')
}).strict();

function validate(schema, source, target) {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) return sendError(response, { statusCode: 400, message: 'Validation failed.', errors: formatValidationErrors(result.error) });
    request[target] = result.data;
    return next();
  };
}

module.exports = {
  validateAdminSuspiciousFilters: validate(filtersSchema, 'query', 'validatedSuspiciousFilters'),
  validateSuspiciousLookup: validate(lookupSchema, 'body', 'validatedSuspiciousLookup'),
  validateSuspiciousNote: validate(noteSchema, 'body', 'validatedSuspiciousNote'),
  validateSuspiciousReport: validate(reportSchema, 'body', 'validatedSuspiciousReport'),
  validateSuspiciousStatus: validate(statusSchema, 'body', 'validatedSuspiciousStatus'),
  validateUserSuspiciousFilters: validate(filtersSchema.pick({ page: true, limit: true, status: true }), 'query', 'validatedSuspiciousFilters')
};
