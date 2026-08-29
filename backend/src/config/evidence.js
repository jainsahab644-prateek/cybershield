'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { env } = require('./env');

const backendDirectory = path.resolve(__dirname, '..', '..');
const ALLOWED_EVIDENCE = Object.freeze({
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf'
});

function positiveInteger(value, fallback, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    if (value !== undefined) throw new Error(`${name} must be a positive integer.`);
    return fallback;
  }
  return parsed;
}

function evidenceConfig() {
  const configuredPath = env.EVIDENCE_STORAGE_PATH;
  return {
    storagePath: path.isAbsolute(configuredPath)
      ? path.resolve(configuredPath)
      : path.resolve(backendDirectory, configuredPath),
    maxFileSize: positiveInteger(
      env.MAX_EVIDENCE_FILE_SIZE,
      5 * 1024 * 1024,
      'MAX_EVIDENCE_FILE_SIZE'
    ),
    maxFiles: positiveInteger(
      env.MAX_EVIDENCE_FILES_PER_COMPLAINT,
      5,
      'MAX_EVIDENCE_FILES_PER_COMPLAINT'
    ),
    allowed: ALLOWED_EVIDENCE
  };
}

function initializeEvidenceStorage() {
  const config = evidenceConfig();
  fs.mkdirSync(config.storagePath, { recursive: true });
  return config.storagePath;
}

module.exports = { ALLOWED_EVIDENCE, evidenceConfig, initializeEvidenceStorage };
