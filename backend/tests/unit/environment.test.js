'use strict';

const { loadEnvironment } = require('../../src/config/env');

const base = {
  NODE_ENV:'development', DB_CLIENT:'sqlite', DATABASE_PATH:':memory:', PORT:'5000',
  CLIENT_ORIGIN:'http://localhost:5000', SESSION_SECRET:'local-session-secret-at-least-32-characters',
  IDENTIFIER_HASH_SECRET:'local-identifier-secret-at-least-32-characters', DEV_OTP:'123456'
};

describe('central environment validation', () => {
  it('accepts a safe development SQLite configuration', () => {
    const configuration = loadEnvironment(base);
    expect(configuration.DB_CLIENT).toBe('sqlite');
    expect(configuration.DEMO_MODE).toBe(true);
    expect(configuration.AI_PROVIDER).toBe('mock');
  });
  it('requires a server-side API key for the OpenAI provider', () => {
    expect(() => loadEnvironment({ ...base, AI_PROVIDER:'openai' })).toThrow(/OPENAI_API_KEY/);
  });
  it('requires DATABASE_URL for PostgreSQL', () => {
    expect(() => loadEnvironment({ ...base, DB_CLIENT:'postgres' })).toThrow(/DATABASE_URL/);
  });
  it('rejects fixed development authentication in production', () => {
    expect(() => loadEnvironment({
      ...base, NODE_ENV:'production', DEMO_MODE:'false', DB_CLIENT:'postgres', DATABASE_URL:'postgresql://user:pass@db/test',
      DISABLE_AUTHENTICATION:'true', EMAIL_PROVIDER:'disabled'
    })).toThrow(/DEV_OTP/);
  });
  it('rejects example production secrets', () => {
    const production={...base,NODE_ENV:'production',DEMO_MODE:'false',DB_CLIENT:'postgres',DATABASE_URL:'postgresql://u:p@db/test',
      DEV_OTP:undefined,DISABLE_AUTHENTICATION:'true',EMAIL_PROVIDER:'disabled',SESSION_SECRET:'replace-with-example-secret-123456789'};
    expect(() => loadEnvironment(production)).toThrow(/SESSION_SECRET/);
  });
  it('accepts the explicit single-instance hackathon demo profile', () => {
    const demo = loadEnvironment({
      ...base, NODE_ENV:'production', DEMO_MODE:'true', DB_CLIENT:'sqlite',
      EMAIL_PROVIDER:'development', DISABLE_AUTHENTICATION:'false',
      SESSION_SECRET:'hackathon-session-value-1234567890-safe',
      IDENTIFIER_HASH_SECRET:'hackathon-identifier-value-123456789-safe'
    });
    expect(demo.DB_CLIENT).toBe('sqlite');
    expect(demo.DEMO_MODE).toBe(true);
  });
});
