'use strict';

const request = require('supertest');
const app = require('../../src/app');
const { initializeDatabase, closeDatabase } = require('../../src/config/database');

beforeAll(() => initializeDatabase());
afterAll(() => closeDatabase());

const complaint = {
  category:'financial_fraud', subcategory:'payment_request', incident_title:'Fictional integration incident',
  incident_description:'A harmless fictional incident used only for an automated integration test.',
  incident_date:'2026-08-24', financial_loss:25, complainant_name:'Integration User',
  complainant_email:'integration@example.test', complainant_phone:'+919999999998'
};

describe('public API integration and security headers', () => {
  it('returns a validated mock incident suggestion without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/assistant/classify-incident')
      .send({ description: 'I received a suspicious payment link and was told to pay immediately.' })
      .expect(200);
    expect(response.body.data).toMatchObject({
      suggestedCategory: 'financial_fraud', suggestedSubcategory: 'payment_link_scam',
      provider: 'mock', isMock: true
    });
    expect(response.body.data).not.toHaveProperty('reasoning');
  });
  it('returns a citizen-friendly error for a short assistant description', async () => {
    const response = await request(app)
      .post('/api/v1/assistant/classify-incident')
      .send({ description: 'too short' })
      .expect(400);
    expect(response.body.message).toContain('at least 20 characters');
  });
  it('reports liveness, readiness, security headers, and a request ID', async () => {
    const live=await request(app).get('/api/v1/health/live').expect(200);
    expect(live.headers['x-request-id']).toMatch(/^req_/);
    expect(live.headers['content-security-policy']).toContain("default-src 'self'");
    expect(live.headers['x-content-type-options']).toBe('nosniff');
    await request(app).get('/api/v1/health/ready').expect(200);
  });
  it('creates and privacy-safely tracks a valid complaint', async () => {
    const created=await request(app).post('/api/v1/complaints').send(complaint).expect(201);
    const tracked=await request(app).get(`/api/v1/complaints/${created.body.data.complaintId}/status`).expect(200);
    expect(tracked.body.data).not.toHaveProperty('complainantEmail');
    expect(tracked.body.data).not.toHaveProperty('incidentDescription');
  });
  it('rejects invalid complaint inputs and tracking IDs', async () => {
    await request(app).post('/api/v1/complaints').send({ ...complaint, financial_loss:-1 }).expect(400);
    await request(app).get('/api/v1/complaints/not-an-id/status').expect(404);
  });
  it('rejects cross-origin mutations and unauthenticated protected access', async () => {
    await request(app).post('/api/v1/complaints').set('Origin','https://attacker.example').send(complaint).expect(403);
    await request(app).get('/api/v1/users/me/complaints').expect(401);
    await request(app).get('/api/v1/admin/dashboard/stats').expect(401);
  });
  it('treats SQL-injection-like public search as literal input', async () => {
    const response=await request(app).get('/api/v1/learning/articles').query({search:"' OR '1'='1"}).expect(200);
    expect(response.body.data.articles).toEqual([]);
  });
  it('returns safe citizen chat guidance with server-controlled actions', async () => {
    const response = await request(app).post('/api/v1/chat').send({
      message: 'Someone is pretending to be me online. What should I do?',
      conversation: []
    }).expect(200);
    expect(response.body.data.message).toMatch(/may fit/i);
    expect(response.body.data.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: '/pages/safety-related.html' })
    ]));
    expect(response.body.data).not.toHaveProperty('actionIds');
  });
  it('rejects oversized chat history and unknown fields', async () => {
    const conversation = Array.from({ length: 7 }, () => ({ role: 'user', content: 'test message' }));
    await request(app).post('/api/v1/chat').send({ message: 'Please help', conversation }).expect(400);
    await request(app).post('/api/v1/chat').send({ message: 'Please help', redirectUrl: 'https://attacker.example' }).expect(400);
  });
  it('rate limits repeated chat requests', async () => {
    let limited = false;
    for (let index = 0; index < 25; index += 1) {
      const response = await request(app).post('/api/v1/chat').send({ message: 'What is phishing?' });
      if (response.status === 429) {
        limited = true;
        expect(response.body.message).toMatch(/too many requests/i);
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
