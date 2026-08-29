'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { evidenceConfig } = require('../config/evidence');
const evidenceRepository = require('../repositories/evidence.repository');
const HttpError = require('../utils/httpError');
const { generateEvidenceId, isEvidenceId } = require('../utils/evidenceId');
const { getStorageProvider } = require('../storage/storageProvider');
const logger = require('../config/logger');

const WRITABLE_STATUSES = new Set([
  'submitted', 'under_review', 'information_required', 'in_progress'
]);
const SUSPICIOUS_INNER_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'ps1', 'sh', 'js', 'html', 'htm', 'svg', 'php', 'jar', 'apk',
  'zip', 'rar', '7z', 'docm', 'xlsm'
]);
const MAX_FILENAME_LENGTH = 150;
const MAX_ID_ATTEMPTS = 10;

function extensionOf(filename) {
  return path.extname(filename).slice(1).toLowerCase();
}

function sanitizeOriginalFilename(filename) {
  const basename = path.basename(String(filename).replaceAll('\\', '/'))
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._() -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const safe = basename || 'evidence-file';
  if (safe.length <= MAX_FILENAME_LENGTH) return safe;
  const extension = path.extname(safe);
  return `${safe.slice(0, MAX_FILENAME_LENGTH - extension.length)}${extension}`;
}

function hasSuspiciousDoubleExtension(filename) {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 2 && parts.slice(1, -1).some((part) => SUSPICIOUS_INNER_EXTENSIONS.has(part));
}

function publicEvidence(record) {
  return {
    evidenceId: record.public_evidence_id || record.evidenceId,
    filename: record.original_filename || record.originalFilename,
    type: record.mime_type || record.mimeType,
    size: record.file_size || record.fileSize,
    uploadedAt: record.created_at || record.createdAt
  };
}

async function validateFile(file) {
  const config = evidenceConfig();
  const originalFilename = sanitizeOriginalFilename(file.originalname);
  const fileExtension = extensionOf(originalFilename);
  const expectedMime = config.allowed[fileExtension];

  if (!expectedMime || hasSuspiciousDoubleExtension(originalFilename)) {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }
  if (file.size > config.maxFileSize) {
    throw new HttpError(413, 'Evidence file exceeds the maximum allowed size.');
  }
  if (file.size < 1 || file.mimetype !== expectedMime) {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }

  let detected;
  try {
    const { fileTypeFromBuffer } = await import('file-type');
    detected = await fileTypeFromBuffer(file.buffer);
  } catch {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }
  if (!detected || detected.mime !== expectedMime) {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }
  if (expectedMime === 'image/jpeg' && detected.ext !== 'jpg') {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }
  if (expectedMime !== 'image/jpeg' && detected.ext !== fileExtension) {
    throw new HttpError(400, 'Unsupported evidence file type.');
  }

  return {
    originalFilename,
    fileExtension,
    mimeType: expectedMime,
    fileSize: file.size,
    fileHash: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    buffer: file.buffer
  };
}

function allocateEvidenceId() {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const evidenceId = generateEvidenceId();
    if (!evidenceRepository.evidenceIdExists(evidenceId)) return evidenceId;
  }
  throw new Error('Unable to allocate a unique evidence identifier.');
}

function assertWritableComplaint(complaint) {
  if (!WRITABLE_STATUSES.has(complaint.status)) {
    throw new HttpError(409, 'Evidence cannot be added to this complaint in its current status.');
  }
}

function assertAvailableCapacity(complaintId, incomingCount) {
  const config = evidenceConfig();
  const existing = evidenceRepository.countForComplaint(complaintId);
  if (incomingCount < 1) throw new HttpError(400, 'Select at least one evidence file.');
  if (incomingCount > config.maxFiles || existing + incomingCount > config.maxFiles) {
    throw new HttpError(400, 'Maximum evidence limit reached.');
  }
}

async function uploadEvidence(complaint, files) {
  assertWritableComplaint(complaint);
  assertAvailableCapacity(complaint.id, files.length);
  const config = evidenceConfig();
  const validated = [];
  for (const file of files) validated.push(await validateFile(file));

  const createdAt = new Date().toISOString();
  const records = validated.map((file) => ({
    ...file,
    evidenceId: allocateEvidenceId(),
    complaintId: complaint.id,
    storedFilename: `${crypto.randomUUID()}.${file.fileExtension}`,
    uploadStatus: 'accepted',
    createdAt
  }));
  const savedFiles = [];
  const storage = getStorageProvider();
  try {
    for (const record of records) {
      await storage.saveFile(record.storedFilename, record.buffer);
      savedFiles.push(record.storedFilename);
      delete record.buffer;
    }
    evidenceRepository.insertMany(records, config.maxFiles);
  } catch (error) {
    await Promise.all(savedFiles.map((filename) => storage.deleteTemporaryFile(filename)));
    if (error.code === 'EVIDENCE_LIMIT_REACHED') {
      throw new HttpError(400, 'Maximum evidence limit reached.');
    }
    if (error.code === 'EVIDENCE_STATUS_CONFLICT') {
      throw new HttpError(409, 'Evidence cannot be added to this complaint in its current status.');
    }
    throw error;
  }

  logger.info({ complaintId: complaint.complaint_id, fileCount: records.length }, 'Evidence uploaded');
  return records.map(publicEvidence);
}

function listEvidence(complaint) {
  return evidenceRepository.listForComplaint(complaint.id).map(publicEvidence);
}

function getEvidenceFile(complaint, evidenceId) {
  if (!isEvidenceId(evidenceId)) return null;
  const evidence = evidenceRepository.findForComplaint(complaint.id, evidenceId.toUpperCase());
  if (!evidence) return null;
  const storage = getStorageProvider();
  if (!storage.fileExists(evidence.stored_filename)) return null;
  const filePath = storage.pathFor(evidence.stored_filename);
  return { evidence, filePath };
}

function getPublicConfig() {
  const config = evidenceConfig();
  return {
    maxFileSize: config.maxFileSize,
    maxFiles: config.maxFiles,
    allowedExtensions: Object.keys(config.allowed)
  };
}

module.exports = {
  assertAvailableCapacity,
  assertWritableComplaint,
  getEvidenceFile,
  getPublicConfig,
  listEvidence,
  publicEvidence,
  validateFile,
  uploadEvidence
};
