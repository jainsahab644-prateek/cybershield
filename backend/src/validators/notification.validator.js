'use strict';

const { z } = require('zod');
const { formatValidationErrors } = require('./complaint.validator');
const { sendError } = require('../utils/apiResponse');

const notificationTypes = [
  'complaint_submitted', 'status_changed', 'information_required',
  'complaint_resolved', 'complaint_closed', 'user_message'
];

const filtersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  read: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  type: z.enum(notificationTypes).optional()
}).strict();

const notificationParamSchema = z.object({
  notificationId: z.string().trim().toUpperCase().regex(
    /^NTF-[A-Z0-9]{8}$/,
    'Invalid notification reference.'
  )
}).strict();

const complaintParamSchema = z.object({
  complaintId: z.string().trim().toUpperCase().regex(
    /^CSR-\d{4}-[A-Z0-9]{6}$/,
    'Invalid complaint reference.'
  )
}).strict();

const preferencesSchema = z.object({
  emailEnabled: z.boolean(),
  statusUpdatesEnabled: z.boolean(),
  informationRequiredEnabled: z.boolean(),
  resolutionEnabled: z.boolean()
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

module.exports = {
  validateComplaintHistoryParam: validate(complaintParamSchema, 'params', 'validatedNotificationParams'),
  validateNotificationFilters: validate(filtersSchema, 'query', 'validatedNotificationFilters'),
  validateNotificationParam: validate(notificationParamSchema, 'params', 'validatedNotificationParams'),
  validateNotificationPreferences: validate(preferencesSchema, 'body', 'validatedNotificationPreferences')
};
