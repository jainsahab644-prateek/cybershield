'use strict';

const request = require('supertest');
const app = require('../../src/app');
const { initializeDatabase, closeDatabase } = require('../../src/config/database');

beforeAll(() => initializeDatabase());
afterAll(() => closeDatabase());

const complaint = {
  category:'other_cybercrime', incident_title:'Ownership boundary test',
  incident_description:'A fictional report used to verify private ownership boundaries.',
  incident_date:'2026-08-24', financial_loss:0, complainant_name:'Owner A',
  complainant_email:'owner-a@example.test', complainant_phone:'+919999999991'
};

async function signIn(agent, email, name) {
  await agent.post('/api/v1/auth/request-otp').send({ method:'email', identifier:email }).expect(200);
  const verified = await agent.post('/api/v1/auth/verify-otp')
    .send({ method:'email', identifier:email, otp:'123456', fullName:name }).expect(200);
  return verified;
}

describe('authentication, sessions, authorization, and IDOR', () => {
  it('persists a secure server session, rejects role escalation, and invalidates logout', async () => {
    const agent=request.agent(app);
    await agent.post('/api/v1/auth/verify-otp').send({
      method:'email',identifier:'role@example.test',otp:'123456',fullName:'Role User',role:'admin'
    }).expect(400);
    const verified=await signIn(agent,'session@example.test','Session User');
    expect(verified.headers['set-cookie'].join(';')).toContain('HttpOnly');
    await agent.get('/api/v1/auth/me').expect(200);
    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('returns 404 when User B requests User A complaint and 403 for admin APIs', async () => {
    const userA=request.agent(app),userB=request.agent(app);
    await signIn(userA,'owner-a@example.test','Owner A');
    await signIn(userB,'owner-b@example.test','Owner B');
    const created=await userA.post('/api/v1/complaints').send(complaint).expect(201);
    await userB.get(`/api/v1/users/me/complaints/${created.body.data.complaintId}`).expect(404);
    await userB.get('/api/v1/admin/dashboard/stats').expect(403);
  });

  it('grants the configured fictional administrator access only in demo mode', async () => {
    const admin = request.agent(app);
    const verified = await signIn(admin, 'admin@cybershield.demo', 'Demo Administrator');
    expect(verified.body.data.user.role).toBe('admin');
    await admin.get('/api/v1/admin/dashboard/stats').expect(200);
  });

  it('rejects invalid and reused OTPs', async () => {
    const agent=request.agent(app),email='otp-cases@example.test';
    await agent.post('/api/v1/auth/request-otp').send({method:'email',identifier:email}).expect(200);
    await agent.post('/api/v1/auth/verify-otp').send({method:'email',identifier:email,otp:'000000',fullName:'OTP User'}).expect(400);
    await agent.post('/api/v1/auth/verify-otp').send({method:'email',identifier:email,otp:'123456',fullName:'OTP User'}).expect(200);
    await agent.post('/api/v1/auth/verify-otp').send({method:'email',identifier:email,otp:'123456',fullName:'OTP User'}).expect(400);
  });
});
