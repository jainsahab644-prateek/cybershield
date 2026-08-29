'use strict';

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.DATABASE_PATH = ':memory:';
process.env.CLIENT_ORIGIN = 'http://localhost:5000';
process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-32-characters';
process.env.IDENTIFIER_HASH_SECRET = 'test-identifier-secret-that-is-at-least-32-characters';
process.env.DEV_OTP = '123456';
process.env.EMAIL_PROVIDER = 'development';
process.env.EVIDENCE_STORAGE_PATH = './private_uploads/test-evidence';
