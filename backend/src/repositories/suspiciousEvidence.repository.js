'use strict';
const {getDatabase}=require('../config/database');
function count(reportId){return getDatabase().prepare('SELECT COUNT(*) count FROM suspicious_report_evidence WHERE suspicious_report_id=?').get(reportId).count;}
function exists(id){return Boolean(getDatabase().prepare('SELECT 1 FROM suspicious_report_evidence WHERE public_evidence_id=?').get(id));}
function insertMany(records,max){const database=getDatabase();const transaction=database.transaction((items)=>{const reportId=items[0].reportId;if(count(reportId)+items.length>max){const e=new Error('limit');e.code='EVIDENCE_LIMIT_REACHED';throw e;}const insert=database.prepare(`INSERT INTO suspicious_report_evidence(public_evidence_id,suspicious_report_id,stored_filename,original_filename,file_extension,mime_type,file_size,file_hash,upload_status,created_at) VALUES(@evidenceId,@reportId,@storedFilename,@originalFilename,@fileExtension,@mimeType,@fileSize,@fileHash,@uploadStatus,@createdAt)`);items.forEach(i=>insert.run(i));});transaction(records);}
function find(reportId,id){return getDatabase().prepare('SELECT * FROM suspicious_report_evidence WHERE suspicious_report_id=? AND public_evidence_id=?').get(reportId,id)||null;}
module.exports={count,exists,find,insertMany};
