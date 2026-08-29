'use strict';

const evidenceService = require('../services/evidence.service');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const sendEvidenceFile = require('../utils/sendEvidenceFile');

async function uploadEvidence(request, response, next) {
  try {
    const evidence = await evidenceService.uploadEvidence(
      request.evidenceComplaint,
      request.files || []
    );
    return sendSuccess(response, {
      statusCode: 201,
      message: 'Evidence uploaded successfully.',
      data: { evidence }
    });
  } catch (error) {
    if (error.statusCode) console.info(`[evidence] validation rejected status=${error.statusCode}`);
    return next(error);
  }
}

function listEvidence(request, response, next) {
  try {
    const evidence = evidenceService.listEvidence(request.evidenceComplaint);
    return sendSuccess(response, { data: { evidence } });
  } catch (error) {
    return next(error);
  }
}

function getEvidence(request, response, next) {
  try {
    const result = evidenceService.getEvidenceFile(
      request.evidenceComplaint,
      request.params.evidenceId
    );
    if (!result) {
      return sendError(response, { statusCode: 404, message: 'Evidence not found.' });
    }

    return sendEvidenceFile(response, next, result);
  } catch (error) {
    return next(error);
  }
}

function getConfig(request, response) {
  return sendSuccess(response, { data: evidenceService.getPublicConfig() });
}

module.exports = { getConfig, getEvidence, listEvidence, uploadEvidence };
