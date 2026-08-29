'use strict';

const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ quiet: true });

const booleanString = z.preprocess((value) => value === true || value === 'true', z.boolean());
const positiveInteger = (fallback) => z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DB_CLIENT: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_PATH: z.string().min(1).default('./data/cybershield.db'),
  DATABASE_URL: z.string().optional(),
  DB_POOL_MIN: z.coerce.number().int().min(0).max(20).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DB_QUERY_TIMEOUT_MS: positiveInteger(10000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5500'),
  CLIENT_ORIGINS: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE: positiveInteger(86400000),
  DEV_OTP: z.string().regex(/^\d{6}$/).optional(),
  EMAIL_PROVIDER: z.enum(['disabled', 'development', 'resend']).default('development'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  EMAIL_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
  EMAIL_TIMEOUT_MS: positiveInteger(5000),
  EVIDENCE_STORAGE_PROVIDER: z.literal('local').default('local'),
  EVIDENCE_STORAGE_PATH: z.string().min(1).default('./private_uploads/evidence'),
  MAX_EVIDENCE_FILE_SIZE: positiveInteger(5242880),
  MAX_EVIDENCE_FILES_PER_COMPLAINT: z.coerce.number().int().min(1).max(20).default(5),
  IDENTIFIER_HASH_SECRET: z.string().min(32).default('development-only-identifier-secret-change-me'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  SERVER_REQUEST_TIMEOUT_MS: positiveInteger(30000),
  SERVER_HEADERS_TIMEOUT_MS: positiveInteger(35000),
  RATE_LIMIT_GENERAL: positiveInteger(200),
  RATE_LIMIT_OTP_REQUEST: positiveInteger(10),
  RATE_LIMIT_OTP_VERIFY: positiveInteger(25),
  RATE_LIMIT_COMPLAINT: positiveInteger(20),
  RATE_LIMIT_EVIDENCE: positiveInteger(30),
  RATE_LIMIT_ADMIN: positiveInteger(60),
  RATE_LIMIT_SUSPICIOUS_REPORT: positiveInteger(12),
  RATE_LIMIT_SUSPICIOUS_LOOKUP: positiveInteger(20),
  RATE_LIMIT_AI_ASSISTANT: positiveInteger(15),
  RATE_LIMIT_CHAT: positiveInteger(20),
  RATE_LIMIT_WINDOW_MS: positiveInteger(900000),
  DEMO_MODE: booleanString.default(true),
  DEMO_ADMIN_EMAIL: z.string().email().default('admin@cybershield.demo'),
  AI_PROVIDER: z.enum(['mock', 'openai', 'disabled']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default('gpt-5.4-mini'),
  OPENAI_TIMEOUT_MS: positiveInteger(15000),
  DISABLE_AUTHENTICATION: booleanString.default(false)
}).superRefine((value, context) => {
  if (value.DB_CLIENT === 'postgres' && !value.DATABASE_URL) {
    context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'DATABASE_URL is required for PostgreSQL.' });
  }
  if (value.DB_POOL_MIN > value.DB_POOL_MAX) {
    context.addIssue({ code: 'custom', path: ['DB_POOL_MIN'], message: 'DB_POOL_MIN cannot exceed DB_POOL_MAX.' });
  }
  if (value.AI_PROVIDER === 'openai' && !value.OPENAI_API_KEY) {
    context.addIssue({ code: 'custom', path: ['OPENAI_API_KEY'], message: 'OPENAI_API_KEY is required when AI_PROVIDER=openai.' });
  }
  if (value.NODE_ENV === 'development' && !value.DEV_OTP) {
    context.addIssue({ code: 'custom', path: ['DEV_OTP'], message: 'DEV_OTP is required in development.' });
  }
  if (value.NODE_ENV === 'production') {
    if (value.DB_CLIENT !== 'postgres' && !value.DEMO_MODE) {
      context.addIssue({ code: 'custom', path: ['DB_CLIENT'], message: 'Non-demo production requires PostgreSQL.' });
    }
    if (value.DEV_OTP && !value.DEMO_MODE) context.addIssue({ code: 'custom', path: ['DEV_OTP'], message: 'DEV_OTP is allowed only in explicit demo mode.' });
    if (!value.DISABLE_AUTHENTICATION && !value.DEMO_MODE) {
      context.addIssue({ code: 'custom', path: ['DISABLE_AUTHENTICATION'], message: 'Authentication must remain disabled until a production OTP provider is implemented.' });
    }
    if (value.EMAIL_PROVIDER === 'development' && !value.DEMO_MODE) {
      context.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: 'The simulated development email provider is not allowed in production.' });
    }
    if (/replace|secret|example/i.test(value.SESSION_SECRET)) {
      context.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'A non-example SESSION_SECRET is required in production.' });
    }
    if (/replace|secret|example/i.test(value.IDENTIFIER_HASH_SECRET)) {
      context.addIssue({ code: 'custom', path: ['IDENTIFIER_HASH_SECRET'], message: 'A non-example IDENTIFIER_HASH_SECRET is required in production.' });
    }
  }
});

function loadEnvironment(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid CyberShield configuration: ${details}`);
  }
  const values = result.data;
  values.clientOrigins = [...new Set([
    values.CLIENT_ORIGIN,
    ...(values.CLIENT_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)
  ])];
  return Object.freeze(values);
}

const env = loadEnvironment();
module.exports = { env, loadEnvironment };
