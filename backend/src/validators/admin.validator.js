'use strict';

const { z } = require('zod');
const { formatValidationErrors } = require('./complaint.validator');
const { sendError } = require('../utils/apiResponse');

const complaintId = z.string().trim().toUpperCase().regex(
  /^CSR-\d{4}-[A-Z0-9]{6}$/,
  'Invalid complaint reference.'
);
const expectedUpdatedAt = z.string().datetime({ offset: true }).optional();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional().transform((value) => value || undefined),
  status: z.enum([
    'submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed'
  ]).optional(),
  category: z.enum(['financial_fraud', 'safety_related', 'other_cybercrime']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  sort: z.enum(['newest', 'oldest', 'recently_updated', 'priority']).default('newest')
}).strict();

const statusSchema = z.object({
  status: z.enum([
    'submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed'
  ]),
  expectedUpdatedAt
}).strict();

const prioritySchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  expectedUpdatedAt
}).strict();

const noteSchema = z.object({
  note: z.string().trim().min(2).max(3000)
}).strict();

const forbiddenCredentialRequest = /\b(passwords?|otps?|upi\s*pins?|card\s*pins?|cvvs?|authentication\s*codes?|recovery\s*codes?|private\s*keys?|seed\s*phrases?)\b/i;
const userMessageSchema = z.object({
  message: z.string().trim().min(2).max(1000)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
      message: 'Message must contain plain readable text.'
    })
    .refine((value) => !forbiddenCredentialRequest.test(value), {
      message: 'User messages must not request passwords, PINs, OTPs, CVVs, recovery codes, or authentication credentials.'
    })
}).strict();

function validate(schema, source, target) {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return sendError(response, {
        statusCode: 400,
        message: 'Validation failed.',
        errors: formatValidationErrors(result.error)
      });
    }
    request[target] = result.data;
    return next();
  };
}

const validateAdminFilters = validate(listSchema, 'query', 'validatedAdminFilters');
const validateStatusUpdate = validate(statusSchema, 'body', 'validatedAdminMutation');
const validatePriorityUpdate = validate(prioritySchema, 'body', 'validatedAdminMutation');
const validateNote = validate(noteSchema, 'body', 'validatedAdminNote');
const validateUserMessage = validate(userMessageSchema, 'body', 'validatedAdminUserMessage');
const validateComplaintParam = validate(
  z.object({ complaintId }).strict(),
  'params',
  'validatedAdminParams'
);
const validateEvidenceParams = validate(
  z.object({
    complaintId,
    evidenceId: z.string().trim().toUpperCase().regex(/^EVD-[A-Z0-9]{8}$/, 'Invalid evidence reference.')
  }).strict(),
  'params',
  'validatedAdminParams'
);

module.exports = {
  validateAdminFilters,
  validateComplaintParam,
  validateEvidenceParams,
  validateNote,
  validatePriorityUpdate,
  validateStatusUpdate,
  validateUserMessage
};
