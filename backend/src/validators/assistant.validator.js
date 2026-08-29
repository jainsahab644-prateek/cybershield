'use strict';

const { z } = require('zod');
const { categories } = require('../services/ai/incidentTaxonomy');
const { sendError } = require('../utils/apiResponse');

const descriptionSchema = z.object({
  description: z.string().trim().min(20, 'Please describe what happened using at least 20 characters.')
    .max(2000, 'Please keep the description under 2,000 characters.')
}).strict();

const assistantResultSchema = z.object({
  suggestedCategory: z.enum(Object.keys(categories)),
  suggestedSubcategory: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  summary: z.string().trim().min(10).max(400),
  usefulInformation: z.array(z.string().trim().min(2).max(160)).min(2).max(6),
  safetyWarning: z.string().trim().min(10).max(300),
  alternatives: z.array(z.enum(Object.keys(categories))).max(2).default([])
}).strict().superRefine((value, context) => {
  if (!categories[value.suggestedCategory].includes(value.suggestedSubcategory)) {
    context.addIssue({ code: 'custom', path: ['suggestedSubcategory'], message: 'Subcategory does not belong to the suggested category.' });
  }
  if (value.alternatives.includes(value.suggestedCategory)) {
    context.addIssue({ code: 'custom', path: ['alternatives'], message: 'Alternatives must differ from the primary category.' });
  }
});

function validateAssistantRequest(request, response, next) {
  const result = descriptionSchema.safeParse(request.body);
  if (!result.success) {
    return sendError(response, {
      statusCode: 400,
      message: result.error.issues[0].message,
      errors: result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'description', message: issue.message }))
    });
  }
  request.validatedAssistantRequest = result.data;
  return next();
}

module.exports = { assistantResultSchema, descriptionSchema, validateAssistantRequest };
