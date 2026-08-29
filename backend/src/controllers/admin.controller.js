'use strict';

const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/apiResponse');
const sendEvidenceFile = require('../utils/sendEvidenceFile');

function requestIp(request) {
  const value = String(request.ip || '').slice(0, 64);
  return value || null;
}

function getStats(request, response, next) {
  try {
    return sendSuccess(response, { data: adminService.dashboardStats() });
  } catch (error) {
    return next(error);
  }
}

function listComplaints(request, response, next) {
  try {
    return sendSuccess(response, {
      data: adminService.listComplaints(request.validatedAdminFilters)
    });
  } catch (error) {
    return next(error);
  }
}

function getComplaint(request, response, next) {
  try {
    return sendSuccess(response, {
      data: adminService.getComplaint(
        request.validatedAdminParams.complaintId,
        request.authUser,
        requestIp(request)
      )
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(request, response, next) {
  try {
    const complaint = await adminService.updateComplaint(
      request.validatedAdminParams.complaintId,
      'status',
      request.validatedAdminMutation,
      request.authUser,
      requestIp(request)
    );
    return sendSuccess(response, {
      message: 'Complaint status updated.',
      data: { complaint }
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePriority(request, response, next) {
  try {
    const complaint = await adminService.updateComplaint(
      request.validatedAdminParams.complaintId,
      'priority',
      request.validatedAdminMutation,
      request.authUser,
      requestIp(request)
    );
    return sendSuccess(response, {
      message: 'Complaint priority updated.',
      data: { complaint }
    });
  } catch (error) {
    return next(error);
  }
}

function addNote(request, response, next) {
  try {
    const note = adminService.addNote(
      request.validatedAdminParams.complaintId,
      request.validatedAdminNote.note,
      request.authUser,
      requestIp(request)
    );
    return sendSuccess(response, {
      statusCode: 201,
      message: 'Internal note added.',
      data: { note }
    });
  } catch (error) {
    return next(error);
  }
}

function getEvidence(request, response, next) {
  try {
    const result = adminService.getEvidenceFile(
      request.validatedAdminParams.complaintId,
      request.validatedAdminParams.evidenceId,
      request.authUser,
      requestIp(request)
    );
    return sendEvidenceFile(response, next, result);
  } catch (error) {
    return next(error);
  }
}

async function sendUserMessage(request, response, next) {
  try {
    const message = await adminService.sendUserMessage(
      request.validatedAdminParams.complaintId,
      request.validatedAdminUserMessage.message,
      request.authUser,
      requestIp(request)
    );
    return sendSuccess(response, {
      statusCode: 201,
      message: 'User-visible message sent.',
      data: { message }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addNote,
  getComplaint,
  getEvidence,
  getStats,
  listComplaints,
  sendUserMessage,
  updatePriority,
  updateStatus
};
