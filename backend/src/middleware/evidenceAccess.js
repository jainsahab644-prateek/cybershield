'use strict';

const complaintService = require('../services/complaint.service');
const evidenceService = require('../services/evidence.service');
const { sendError } = require('../utils/apiResponse');

function loadOwnedEvidenceComplaint(request, response, next) {
  const complaint = complaintService.getOwnedComplaintInternal(
    request.authUser.internalId,
    request.params.complaintId
  );
  if (!complaint) {
    console.info(`[evidence] access denied complaint=${request.params.complaintId}`);
    return sendError(response, { statusCode: 404, message: 'Complaint not found.' });
  }
  request.evidenceComplaint = complaint;
  return next();
}

function requireWritableEvidenceComplaint(request, response, next) {
  try {
    evidenceService.assertWritableComplaint(request.evidenceComplaint);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { loadOwnedEvidenceComplaint, requireWritableEvidenceComplaint };
