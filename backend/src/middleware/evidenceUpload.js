'use strict';

const multer = require('multer');
const { evidenceConfig } = require('../config/evidence');

function createEvidenceUpload() {
  const config = evidenceConfig();
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxFiles,
      fields: 0,
      parts: config.maxFiles
    }
  }).array('evidence', config.maxFiles);
}

module.exports = { createEvidenceUpload };
