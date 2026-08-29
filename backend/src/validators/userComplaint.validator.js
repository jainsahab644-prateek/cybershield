'use strict';

const { z } = require('zod');
const { formatValidationErrors } = require('./complaint.validator');
const { sendError } = require('../utils/apiResponse');

const filtersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed']).optional(),
  category: z.enum(['financial_fraud', 'safety_related', 'other_cybercrime']).optional()
}).strict();

function validateComplaintFilters(request, response, next) {
  const result = filtersSchema.safeParse(request.query);
  if (!result.success) {
    return sendError(response, {
      statusCode: 400,
      message: 'Validation failed.',
      errors: formatValidationErrors(result.error)
    });
  }
  request.validatedFilters = result.data;
  return next();
}

module.exports = { validateComplaintFilters };
