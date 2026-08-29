'use strict';

const { z } = require('zod');
const { sendError } = require('../utils/apiResponse');

const optionalText = (maximum) => z.string().trim().min(1).max(maximum).optional();
const email = z.string().trim().email('Invalid email address.').max(254);
const phone = z.string().trim().regex(
  /^\+?\d{10,15}$/,
  'Phone number must contain 10 to 15 digits and may start with +.'
);

const incidentDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Incident date must use YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Incident date must be a valid calendar date.')
  .refine((value) => {
    const maximum = new Date();
    maximum.setUTCDate(maximum.getUTCDate() + 1);
    maximum.setUTCHours(0, 0, 0, 0);
    return new Date(`${value}T00:00:00.000Z`) <= maximum;
  }, 'Incident date cannot be in the future.');

const complaintSchema = z.object({
  category: z.enum(['financial_fraud', 'safety_related', 'other_cybercrime']),
  subcategory: optionalText(100),
  incident_title: z.string().trim().min(5).max(150),
  incident_description: z.string().trim().min(20).max(5000),
  incident_date: incidentDate,
  incident_time: z.string().regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    'Incident time must use 24-hour HH:mm format.'
  ).optional(),
  incident_location: optionalText(200),
  platform: optionalText(100),
  financial_loss: z.number().finite().nonnegative().max(1_000_000_000_000).default(0),
  suspect_name: optionalText(100),
  suspect_phone: phone.optional(),
  suspect_email: email.optional(),
  suspect_username: optionalText(150),
  suspect_website: z.string().trim().url('Invalid website URL.').max(2048)
    .refine((value) => {
      try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
    }, 'Website URL must use HTTP or HTTPS.').optional(),
  complainant_name: z.string().trim().min(2).max(100),
  complainant_email: email,
  complainant_phone: phone
}).strict();

function withPeriod(message) {
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

function formatValidationErrors(zodError) {
  return zodError.issues.map((issue) => ({
    field: issue.path.join('.') || issue.keys?.join(', ') || 'request',
    message: withPeriod(issue.message)
  }));
}

function validateComplaint(request, response, next) {
  const result = complaintSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, {
      statusCode: 400,
      message: 'Validation failed.',
      errors: formatValidationErrors(result.error)
    });
  }

  request.validatedComplaint = result.data;
  return next();
}

module.exports = { complaintSchema, formatValidationErrors, validateComplaint };
