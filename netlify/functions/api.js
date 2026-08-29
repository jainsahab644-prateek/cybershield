'use strict';

process.env.NETLIFY = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'c3219aa70926d1afaf371471e87c39eadf4ae2ab7f66c39be3a1d317d8e05b74';
process.env.IDENTIFIER_HASH_SECRET = process.env.IDENTIFIER_HASH_SECRET || 'a9028bf8134710185e49129038ba981d39d784a9e102837190e01238479b1837';
process.env.DEMO_MODE = 'true';
process.env.DEV_OTP = '123456';
process.env.DATABASE_PATH = '/tmp/cybershield.db';
process.env.EVIDENCE_STORAGE_PATH = '/tmp/evidence';

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Ensure request path matches Express routes (/api/v1/...)
  if (event.path) {
    if (event.path.startsWith('/.netlify/functions/api')) {
      const subPath = event.path.replace(/^\/\.netlify\/functions\/api/, '');
      event.path = subPath.startsWith('/api') ? subPath : '/api' + subPath;
    } else if (!event.path.startsWith('/api')) {
      event.path = '/api' + event.path;
    }
  }

  return handler(event, context);
};
