'use strict';

const complaintRepository = require('../repositories/complaint.repository');
const notificationService = require('./notification.service');
const { generateComplaintId, isComplaintId } = require('../utils/complaintId');

const MAX_ID_ATTEMPTS = 10;

function isUniqueConstraintError(error) {
  return error?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

async function createComplaint(input, userId = null) {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const complaintId = generateComplaintId();
    if (complaintRepository.complaintIdExists(complaintId)) continue;

    const timestamp = new Date().toISOString();
    const complaint = {
      ...input,
      complaintId,
      status: 'submitted',
      priority: 'medium',
      createdAt: timestamp,
      updatedAt: timestamp,
      userId
    };

    try {
      const result = complaintRepository.createComplaint(
        complaint,
        (created) => notificationService.buildStatusCommunication(
          created,
          null,
          'submitted',
          userId,
          timestamp
        )
      );
      if (result.notificationId) {
        await notificationService.processEmailDelivery(result.notificationId).catch((error) => {
          console.error('[email] Post-commit delivery processing failed:', error.message);
        });
      }
      const created = result.complaint;
      return {
        complaintId: created.complaint_id,
        status: created.status,
        createdAt: created.created_at
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  const error = new Error('Unable to allocate a unique complaint identifier.');
  error.code = 'COMPLAINT_ID_EXHAUSTED';
  throw error;
}

function toListItem(complaint) {
  return {
    complaintId: complaint.complaint_id,
    category: complaint.category,
    incidentTitle: complaint.incident_title,
    status: complaint.status,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at
  };
}

function listUserComplaints(userId, filters) {
  const result = complaintRepository.listForUser(userId, filters);
  return {
    complaints: result.complaints.map(toListItem),
    summary: {
      total: result.summary.total || 0,
      submitted: result.summary.submitted || 0,
      inProgress: result.summary.in_progress || 0,
      resolved: result.summary.resolved || 0
    },
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / filters.limit))
    }
  };
}

function getUserComplaint(userId, complaintId) {
  if (!isComplaintId(complaintId)) return null;
  const complaint = complaintRepository.findOwnedByComplaintId(userId, complaintId);
  if (!complaint) return null;
  return {
    ...toListItem(complaint),
    subcategory: complaint.subcategory,
    incidentDescription: complaint.incident_description,
    incidentDate: complaint.incident_date,
    incidentTime: complaint.incident_time,
    incidentLocation: complaint.incident_location,
    platform: complaint.platform,
    financialLoss: complaint.financial_loss,
    suspectName: complaint.suspect_name,
    suspectPhone: complaint.suspect_phone,
    suspectEmail: complaint.suspect_email,
    suspectUsername: complaint.suspect_username,
    suspectWebsite: complaint.suspect_website,
    complainantName: complaint.complainant_name,
    complainantEmail: complaint.complainant_email,
    complainantPhone: complaint.complainant_phone
  };
}

function getOwnedComplaintInternal(userId, complaintId) {
  if (!isComplaintId(complaintId)) return null;
  return complaintRepository.findOwnedByComplaintId(userId, complaintId);
}

function getComplaintStatus(complaintId) {
  if (!isComplaintId(complaintId)) return null;
  const complaint = complaintRepository.findPublicStatusByComplaintId(complaintId);
  if (!complaint) return null;

  return {
    complaintId: complaint.complaint_id,
    category: complaint.category,
    incidentTitle: complaint.incident_title,
    status: complaint.status,
    createdAt: complaint.created_at,
    updatedAt: complaint.updated_at
  };
}

// Intentionally not exposed by a public route. Reserved for later authenticated use.
function getFullComplaintInternal(complaintId) {
  if (!isComplaintId(complaintId)) return null;
  return complaintRepository.findFullByComplaintId(complaintId);
}

module.exports = {
  createComplaint,
  getComplaintStatus,
  getFullComplaintInternal,
  getOwnedComplaintInternal,
  getUserComplaint,
  listUserComplaints
};
