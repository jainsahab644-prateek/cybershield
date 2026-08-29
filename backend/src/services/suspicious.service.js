'use strict';

const repository = require('../repositories/suspicious.repository');
const auditRepository = require('../repositories/audit.repository');
const notificationRepository = require('../repositories/notification.repository');
const { hashIdentifier, normalizeIdentifier } = require('../utils/identifierNormalizer');
const HttpError = require('../utils/httpError');

const TRANSITIONS = Object.freeze({
  submitted: ['under_review'], under_review: ['published_demo_flag', 'rejected', 'closed'],
  published_demo_flag: ['closed'], confirmed_duplicate: [], rejected: [], closed: []
});
const CREDENTIAL_PATTERN = /\b(?:upi\s*pin|cvv|card\s*(?:number|pin)|bank(?:ing)?\s*password|password|one[- ]?time\s*(?:password|code)|otp)\b/i;

function audit(event) { return auditRepository.createAudit({ ...event, createdAt: event.createdAt || new Date().toISOString() }); }
function mask(value) { const text=String(value); if (text.length<=4) return '••••'; return `${text.slice(0,2)}${'•'.repeat(Math.min(8,text.length-4))}${text.slice(-2)}`; }
function publicRow(row, full=false) { return {
  reportId: row.public_report_id, identifierType: row.identifier_type,
  identifier: full ? row.identifier_value : mask(row.identifier_value), category: row.category,
  description: full ? row.description : undefined, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at
}; }
function pagination(total, filters) { return { page: filters.page, limit: filters.limit, total, totalPages: Math.max(1,Math.ceil(total/filters.limit)) }; }

function createReport(input, authUser, context) {
  if (input.description && CREDENTIAL_PATTERN.test(input.description)) throw new HttpError(400, 'Remove passwords, OTPs, PINs, or card credentials before submitting.');
  const normalized=normalizeIdentifier(input.identifierType,input.identifierValue); const now=new Date().toISOString();
  const row=repository.createReport({ userId:authUser?.internalId||null, identifierType:input.identifierType,
    identifierValue:input.identifierValue.trim(), normalizedIdentifier:normalized, identifierHash:hashIdentifier(input.identifierType,normalized),
    category:input.category, description:input.description||null, createdAt:now });
  audit({actorUserId:authUser?.internalId,actorRole:authUser?.user?.role||'anonymous',action:'suspicious_report_created',entityType:'suspicious_report',entityPublicId:row.public_report_id,metadata:{identifierType:row.identifier_type,category:row.category},ipAddress:context.ip});
  if (authUser) notificationRepository.insertNotification(require('../config/database').getDatabase(), {
    userId:authUser.internalId,suspiciousReportId:row.id,type:'complaint_submitted',title:'Suspicious report submitted',
    message:`Your user-submitted suspicious activity report ${row.public_report_id} was received for demo review.`,
    actionUrl:`/pages/suspicious-report-details.html?id=${encodeURIComponent(row.public_report_id)}`,eventKey:`suspicious-created:${row.public_report_id}`,createdAt:now
  });
  return {reportId:row.public_report_id,status:row.status,createdAt:row.created_at};
}

function lookup(input, context) {
  const normalized=normalizeIdentifier(input.identifierType,input.identifierValue); const hash=hashIdentifier(input.identifierType,normalized);
  audit({actorUserId:context.user?.internalId,actorRole:context.user?.user?.role||'anonymous',action:'suspicious_identifier_lookup',entityType:'suspicious_report',entityPublicId:'EXACT-LOOKUP',metadata:{identifierType:input.identifierType,identifierHash:hash},ipAddress:context.ip});
  const result=repository.approvedLookup(input.identifierType,hash);
  if (!result.report_count) return {match:false,message:'No reviewed demo reports matched this exact identifier. This does not mean the identifier is safe or trusted.'};
  return {match:true,message:'This exact identifier appears in approved CyberShield demo lookup results. Reports are user-submitted and do not prove wrongdoing.',reportCount:result.report_count,categories:result.categories.split(','),firstReviewed:result.first_reviewed,latestReviewed:result.latest_reviewed};
}

function listOwned(userId,filters){const result=repository.listOwned(userId,filters);return {reports:result.rows.map((r)=>publicRow(r)),pagination:pagination(result.total,filters)};}
function getOwned(userId,id){const row=repository.findOwned(userId,id);if(!row)throw new HttpError(404,'Suspicious report not found.');return {...publicRow(row,true),evidence:repository.evidenceFor(row.id).map(e=>({evidenceId:e.public_evidence_id,filename:e.original_filename,type:e.mime_type,size:e.file_size,uploadedAt:e.created_at}))};}
function listAdmin(filters){const result=repository.listAdmin(filters);return {reports:result.rows.map(r=>({...publicRow(r,true),reporterType:r.user_id?'authenticated':'anonymous',reporterUserId:r.reporter_public_user_id||null,groupCount:r.group_count})),pagination:pagination(result.total,filters)};}
function getAdmin(id,admin,ip){const row=repository.findByPublicId(id);if(!row)throw new HttpError(404,'Suspicious report not found.');audit({actorUserId:admin.internalId,actorRole:'admin',action:'suspicious_report_viewed',entityType:'suspicious_report',entityPublicId:id,metadata:{},ipAddress:ip});return {...publicRow(row,true),reporterType:row.user_id?'authenticated':'anonymous',group:repository.groupSummary(row),evidence:repository.evidenceFor(row.id).map(e=>({evidenceId:e.public_evidence_id,filename:e.original_filename,type:e.mime_type,size:e.file_size,uploadedAt:e.created_at})),notes:repository.notesFor(row.id).map(n=>({noteId:n.public_note_id,note:n.note,adminName:n.admin_name,createdAt:n.created_at})),audit:repository.auditFor(id).map(a=>({...a,metadata:JSON.parse(a.metadata_json)}))};}
function updateStatus(id,input,admin,ip){const row=repository.findByPublicId(id);if(!row)throw new HttpError(404,'Suspicious report not found.');if(!TRANSITIONS[row.status].includes(input.status))throw new HttpError(409,'That status transition is not allowed.');if(input.status==='published_demo_flag'&&input.publishConfirmation!==true)throw new HttpError(400,'Confirm that publishing only includes this report in demo lookup results and does not verify wrongdoing.');const updated=repository.updateStatus(row.id,input.status,new Date().toISOString());audit({actorUserId:admin.internalId,actorRole:'admin',action:'suspicious_report_status_changed',entityType:'suspicious_report',entityPublicId:id,metadata:{fromStatus:row.status,toStatus:input.status},ipAddress:ip});if(row.user_id&&input.status!=='under_review')notificationRepository.insertNotification(require('../config/database').getDatabase(),{userId:row.user_id,suspiciousReportId:row.id,type:'status_changed',title:'Suspicious report status updated',message:input.status==='published_demo_flag'?'The report has been approved for inclusion in CyberShield’s demo lookup results.':`Your suspicious activity report ${id} status is now ${input.status.replaceAll('_',' ')}.`,actionUrl:`/pages/suspicious-report-details.html?id=${encodeURIComponent(id)}`,eventKey:`suspicious-status:${id}:${input.status}`,createdAt:updated.updated_at});return publicRow(updated,true);}
function addNote(id,input,admin,ip){const row=repository.findByPublicId(id);if(!row)throw new HttpError(404,'Suspicious report not found.');const noteId=repository.addNote(row.id,admin.internalId,input.note,new Date().toISOString());audit({actorUserId:admin.internalId,actorRole:'admin',action:'suspicious_report_note_added',entityType:'suspicious_report',entityPublicId:id,metadata:{noteId},ipAddress:ip});return {noteId};}
function stats(){const s=repository.stats();return{total:s.total||0,pending:s.pending||0,published:s.published||0};}

module.exports={addNote,createReport,getAdmin,getOwned,listAdmin,listOwned,lookup,stats,updateStatus};
