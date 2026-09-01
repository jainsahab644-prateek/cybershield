'use strict';

const complaintService = require('../services/complaint.service');
const { sendError, sendSuccess } = require('../utils/apiResponse');

async function createComplaint(request, response, next) {
  try {
    const complaint = await complaintService.createComplaint(
      request.validatedComplaint,
      request.authUser?.internalId || null
    );
    return sendSuccess(response, {
      statusCode: 201,
      message: 'Report submitted successfully.',
      data: complaint
    });
  } catch (error) {
    return next(error);
  }
}

function getComplaintStatus(request, response, next) {
  try {
    const complaint = complaintService.getComplaintStatus(request.params.complaintId);
    if (!complaint) {
      return sendError(response, {
        statusCode: 404,
        message: 'Complaint not found.'
      });
    }
    return sendSuccess(response, { data: complaint });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createComplaint, getComplaintStatus };
