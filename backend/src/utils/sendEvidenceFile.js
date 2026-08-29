'use strict';

const path = require('node:path');

function sendEvidenceFile(response, next, result) {
  const { evidence, filePath } = result;
  const inline = evidence.mime_type.startsWith('image/');
  const disposition = inline ? 'inline' : 'attachment';
  const safeFilename = path.basename(evidence.original_filename).replace(/["\\\r\n]/g, '_');
  response.set({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `${disposition}; filename="${safeFilename}"`,
    'Content-Type': evidence.mime_type,
    'X-Content-Type-Options': 'nosniff'
  });
  return response.sendFile(filePath, (error) => {
    if (error && !response.headersSent) return next(error);
    return undefined;
  });
}

module.exports = sendEvidenceFile;
