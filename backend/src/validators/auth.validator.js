'use strict';

const { z } = require('zod');
const { formatValidationErrors } = require('./complaint.validator');
const { sendError } = require('../utils/apiResponse');

const identifierSchema = z.object({
  method: z.enum(['email', 'phone']),
  identifier: z.string().trim().min(3).max(254)
}).strict().superRefine((value, context) => {
  const valid = value.method === 'email'
    ? z.string().email().safeParse(value.identifier).success
    : /^\+?\d{10,15}$/.test(value.identifier);
  if (!valid) {
    context.addIssue({
      code: 'custom',
      path: ['identifier'],
      message: value.method === 'email'
        ? 'Enter a valid email address.'
        : 'Enter a phone number with 10 to 15 digits.'
    });
  }
});

const verifySchema = identifierSchema.extend({
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.'),
  fullName: z.string().trim().min(2).max(100)
}).strict();

function validate(schema, property) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return sendError(response, {
        statusCode: 400,
        message: 'Validation failed.',
        errors: formatValidationErrors(result.error)
      });
    }
    request[property] = result.data;
    return next();
  };
}

const validateOtpRequest = validate(identifierSchema, 'validatedAuth');
const validateOtpVerification = validate(verifySchema, 'validatedAuth');

module.exports = { validateOtpRequest, validateOtpVerification };
