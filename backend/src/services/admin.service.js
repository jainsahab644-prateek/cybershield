'use strict';

const adminComplaintRepository = require('../repositories/adminComplaint.repository');
const auditRepository = require('../repositories/audit.repository');
const evidenceService = require('./evidence.service');
const noteRepository = require('../repositories/note.repository');
const notificationService = require('./notification.service');
const notificationRepository = require('../repositories/notification.repository');
const HttpError = require('../utils/httpError');

const STATUS_TRANSITIONS = Object.freeze({
  submitted: ['under_review'],
  under_review: ['information_required', 'in_progress', 'resolved'],
  information_required: ['under_review', 'in_progress'],
  in_progress: ['information_required', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: []
});

function toListItem(row) {
  return {
    complaintId: row.complaint_id,
    incidentTitle: row.incident_title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    complainantName: row.complainant_name,
    evidenceCount: row.evidence_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function listComplaints(filters) {
  const result = adminComplaintRepository.list(filters);
  return {
    complaints: result.complaints.map(toListItem),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / filters.limit))
    }
  };
}

function dashboardStats() {
  const { summary, totalEvidence, recent } = adminComplaintRepository.getDashboardStats();
  return {
    totalComplaints: summary.total || 0,
    statuses: {
      submitted: summary.submitted || 0,
      underReview: summary.under_review || 0,
      informationRequired: summary.information_required || 0,
      inProgress: summary.in_progress || 0,
      resolved: summary.resolved || 0,
      closed: summary.closed || 0
    },
    priorities: {
      low: summary.low || 0,
      medium: summary.medium || 0,
      high: summary.high || 0,
      critical: summary.critical || 0
    },
    totalEvidence,
    recentComplaints: recent.map(toListItem)
  };
}

function publicNote(row) {
  return {
    noteId: row.public_note_id,
    note: row.note,
    admin: {
      userId: row.admin_public_user_id,
      name: row.admin_name
    },
    createdAt: row.created_at
  };
}

function publicActivity(row) {
  let metadata = {};
  try { metadata = JSON.parse(row.metadata_json || '{}'); } catch { metadata = {}; }
  return {
    auditId: row.public_audit_id,
    action: row.action,
    actor: row.actor_public_user_id ? {
      userId: row.actor_public_user_id,
      name: row.actor_name
    } : null,
    metadata,
    createdAt: row.created_at
  };
}

function fullComplaint(row) {
  return {
    complaintId: row.complaint_id,
    category: row.category,
    subcategory: row.subcategory,
    incidentTitle: row.incident_title,
    incidentDescription: row.incident_description,
    incidentDate: row.incident_date,
    incidentTime: row.incident_time,
    incidentLocation: row.incident_location,
    platform: row.platform,
    financialLoss: row.financial_loss,
    suspectName: row.suspect_name,
    suspectPhone: row.suspect_phone,
    suspectEmail: row.suspect_email,
    suspectUsername: row.suspect_username,
    suspectWebsite: row.suspect_website,
    complainantName: row.complainant_name,
    complainantEmail: row.complainant_email,
    complainantPhone: row.complainant_phone,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedByAccount: Boolean(row.user_id),
    publicUserId: row.public_user_id || null
  };
}

function findComplaintOrThrow(complaintId) {
  const complaint = adminComplaintRepository.findByComplaintId(complaintId);
  if (!complaint) throw new HttpError(404, 'Complaint not found.');
  return complaint;
}

function auditActor(admin, action, complaintId, ipAddress, metadata = {}) {
  auditRepository.createAudit({
    actorUserId: admin.internalId,
    actorRole: 'admin',
    action,
    entityType: 'complaint',
    entityPublicId: complaintId,
    metadata,
    ipAddress,
    createdAt: new Date().toISOString()
  });
}

function getComplaint(complaintId, admin, ipAddress) {
  const complaint = findComplaintOrThrow(complaintId);
  auditActor(admin, 'admin_complaint_viewed', complaintId, ipAddress);
  const notes = noteRepository.listForComplaint(complaint.id).map(publicNote);
  const activity = auditRepository.listComplaintActivity(complaintId).map(publicActivity);
  const userMessages = notificationRepository.listMessagesForComplaint(complaint.id).map((row) => ({
    messageId: row.public_message_id,
    message: row.message,
    createdAt: row.created_at
  }));
  activity.unshift({
    auditId: null,
    action: 'complaint_submitted',
    actor: null,
    metadata: {},
    createdAt: complaint.created_at
  });
  return {
    complaint: {
      ...fullComplaint(complaint),
      evidenceCount: evidenceService.listEvidence(complaint).length
    },
    evidence: evidenceService.listEvidence(complaint),
    notes,
    userMessages,
    activity
  };
}

function transitionValidator(current, next) {
  if (!STATUS_TRANSITIONS[current]?.includes(next)) {
    throw new HttpError(409, 'This status transition is not allowed.');
  }
}

function priorityValidator(current, next) {
  if (current === next) throw new HttpError(409, 'This priority is already selected.');
}

async function updateComplaint(complaintId, field, mutation, admin, ipAddress) {
  try {
    const result = adminComplaintRepository.updateWithAudit({
      complaintId,
      field,
      value: mutation[field],
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      admin,
      ipAddress,
      validate: field === 'status' ? transitionValidator : priorityValidator,
      buildCommunication: field === 'status'
        ? (complaint, status, createdAt) => notificationService.buildStatusCommunication(
          complaint,
          complaint.status,
          status,
          admin.internalId,
          createdAt
        )
        : null
    });
    if (!result) throw new HttpError(404, 'Complaint not found.');
    if (result.notificationId) {
      await notificationService.processEmailDelivery(result.notificationId).catch((error) => {
        console.error('[email] Post-commit delivery processing failed:', error.message);
      });
    }
    return fullComplaint(adminComplaintRepository.findByComplaintId(result.complaint.complaint_id));
  } catch (error) {
    if (error.code === 'ADMIN_STALE_UPDATE') {
      throw new HttpError(409, 'The complaint was updated by another action. Refresh and try again.');
    }
    throw error;
  }
}

function addNote(complaintId, note, admin, ipAddress) {
  const complaint = findComplaintOrThrow(complaintId);
  const createdAt = new Date().toISOString();
  const noteId = noteRepository.addNoteWithAudit({
    complaint,
    admin,
    note,
    createdAt,
    ipAddress
  });
  return {
    noteId,
    note,
    admin: { userId: admin.user.userId, name: admin.user.fullName },
    createdAt
  };
}

async function sendUserMessage(complaintId, message, admin, ipAddress) {
  try {
    const result = adminComplaintRepository.addUserMessageWithCommunication({
      complaintId,
      message,
      admin,
      ipAddress
    });
    if (!result) throw new HttpError(404, 'Complaint not found.');
    await notificationService.processEmailDelivery(result.notificationId).catch((error) => {
      console.error('[email] Post-commit delivery processing failed:', error.message);
    });
    return {
      messageId: result.messageId,
      message,
      createdAt: result.createdAt
    };
  } catch (error) {
    if (error.code === 'ANONYMOUS_COMPLAINT') {
      throw new HttpError(409, 'This complaint was submitted anonymously, so account notifications are unavailable.');
    }
    throw error;
  }
}

function getEvidenceFile(complaintId, evidenceId, admin, ipAddress) {
  const complaint = findComplaintOrThrow(complaintId);
  const result = evidenceService.getEvidenceFile(complaint, evidenceId);
  if (!result) throw new HttpError(404, 'Evidence not found.');
  auditActor(admin, 'admin_evidence_viewed', complaintId, ipAddress, { evidenceId });
  return result;
}

module.exports = {
  STATUS_TRANSITIONS,
  addNote,
  dashboardStats,
  getComplaint,
  getEvidenceFile,
  listComplaints,
  sendUserMessage,
  updateComplaint
};
