'use strict';

const dotenv = require('dotenv');
const Database = require('better-sqlite3');

dotenv.config({ quiet: true });

const { resolveDatabasePath } = require('../src/config/database');
const { promoteAdmin } = require('./promote-admin');

const API = 'http://localhost:5000/api/v1';
const ORIGIN = 'http://localhost:5000';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlVQAAAAASUVORK5CYII=',
  'base64'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function session() {
  return { cookie: '' };
}

async function request(client, route, options = {}) {
  const headers = new Headers(options.headers || {});
  if (client?.cookie) headers.set('Cookie', client.cookie);
  if (!['GET', 'HEAD'].includes(options.method || 'GET')) headers.set('Origin', ORIGIN);
  const response = await fetch(`${API}${route}`, { ...options, headers });
  const cookie = response.headers.get('set-cookie');
  if (client && cookie) client.cookie = cookie.split(';', 1)[0];
  return response;
}

async function json(client, route, options = {}, expected = 200) {
  const response = await request(client, route, options);
  const payload = await response.json();
  assert(
    response.status === expected,
    `${options.method || 'GET'} ${route}: expected ${expected}, got ${response.status} (${payload.message})`
  );
  return { response, payload };
}

function jsonBody(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function signIn(email, name, roleManipulation = false) {
  const client = session();
  await json(client, '/auth/request-otp', jsonBody('POST', { method: 'email', identifier: email }));
  const verification = { method: 'email', identifier: email, otp: '123456', fullName: name };
  if (roleManipulation) {
    await json(client, '/auth/verify-otp', jsonBody('POST', { ...verification, role: 'admin' }), 400);
  }
  await json(client, '/auth/verify-otp', jsonBody('POST', verification));
  return client;
}

async function main() {
  const stamp = Date.now();
  const emails = {
    adminA: `phase6-admin-a-${stamp}@example.test`,
    adminB: `phase6-admin-b-${stamp}@example.test`,
    userA: `phase6-user-a-${stamp}@example.test`,
    userB: `phase6-user-b-${stamp}@example.test`
  };
  const adminA = await signIn(emails.adminA, 'Phase Six Admin A');
  const adminB = await signIn(emails.adminB, 'Phase Six Admin B');
  const userA = await signIn(emails.userA, 'Phase Six Normal User A', true);
  const userB = await signIn(emails.userB, 'Phase Six Normal User B');

  const unauthorized = await json(null, '/admin/dashboard/stats', {}, 401);
  assert(unauthorized.payload.message === 'Authentication required.', 'Unauthenticated admin response changed.');
  await json(userA, '/admin/dashboard/stats', {}, 403);
  await json(userA, '/admin/complaints', {}, 403);

  promoteAdmin(emails.adminA);
  promoteAdmin(emails.adminB);
  const me = await json(adminA, '/auth/me');
  assert(me.payload.data.user.role === 'admin', 'Promoted role not returned by /auth/me.');
  assert(!('id' in me.payload.data.user), '/auth/me exposed an internal ID.');

  const title = `<script>alert('test')</script> ${stamp}`;
  const created = await json(adminA, '/complaints', jsonBody('POST', {
    category: 'other_cybercrime',
    subcategory: 'phishing',
    incident_title: title,
    incident_description: 'A harmless fictional incident created to validate the Phase 6 administration workflow.',
    incident_date: '2026-08-24',
    platform: 'Demo Messaging',
    financial_loss: 0,
    suspect_name: 'Unverified Demo Source',
    suspect_email: 'source@example.test',
    complainant_name: 'Phase Six Admin A',
    complainant_email: emails.adminA,
    complainant_phone: '+919800006001'
  }), 201);
  const complaintId = created.payload.data.complaintId;

  const form = new FormData();
  form.append('evidence', new File([png], 'phase6-demo.png', { type: 'image/png' }));
  await json(adminA, `/users/me/complaints/${complaintId}/evidence`, { method: 'POST', body: form }, 201);

  const stats = await json(adminA, '/admin/dashboard/stats');
  assert(stats.payload.data.totalComplaints > 0, 'Dashboard total was not database-backed.');
  assert(stats.payload.data.totalEvidence > 0, 'Dashboard evidence total was not database-backed.');
  assert(stats.payload.data.recentComplaints.length <= 5, 'Recent complaint limit exceeded five.');

  const searches = [
    `/admin/complaints?search=${encodeURIComponent(complaintId)}`,
    '/admin/complaints?status=submitted',
    '/admin/complaints?category=other_cybercrime',
    '/admin/complaints?priority=medium',
    '/admin/complaints?sort=priority&page=1&limit=1'
  ];
  for (const route of searches) await json(adminA, route);
  const byId = await json(adminA, searches[0]);
  assert(byId.payload.data.complaints.some((item) => item.complaintId === complaintId), 'Admin search missed complaint ID.');
  const injection = await json(adminA, `/admin/complaints?search=${encodeURIComponent("' OR '1'='1")}`);
  assert(injection.payload.data.pagination.total === 0, 'SQL injection-like search expanded the result set.');
  await json(adminA, '/admin/complaints?limit=101', {}, 400);
  await json(adminA, '/admin/complaints?sort=not_a_sort', {}, 400);
  await json(adminA, '/admin/complaints?status=not_a_status', {}, 400);

  const detail = await json(adminA, `/admin/complaints/${complaintId}`);
  assert(detail.payload.data.complaint.incidentTitle === title, 'Stored-XSS test title was altered.');
  assert(detail.payload.data.evidence.length === 1, 'Admin detail evidence metadata missing.');
  assert(!JSON.stringify(detail.payload).includes('stored_filename'), 'Storage filename exposed to admin API.');

  await json(userA, `/admin/complaints/${complaintId}`, {}, 403);
  await json(userA, `/admin/complaints/${complaintId}/status`, jsonBody('PATCH', { status: 'under_review' }), 403);
  await json(userB, `/users/me/complaints/${complaintId}`, {}, 404);

  const evidenceId = detail.payload.data.evidence[0].evidenceId;
  const evidenceResponse = await request(adminA, `/admin/complaints/${complaintId}/evidence/${evidenceId}`);
  assert(evidenceResponse.status === 200, 'Admin evidence could not be viewed.');
  assert(evidenceResponse.headers.get('x-content-type-options') === 'nosniff', 'Evidence nosniff header missing.');
  assert(evidenceResponse.headers.get('cache-control')?.includes('no-store'), 'Evidence no-store header missing.');
  assert(Buffer.compare(Buffer.from(await evidenceResponse.arrayBuffer()), png) === 0, 'Evidence bytes changed.');
  await json(userA, `/admin/complaints/${complaintId}/evidence/${evidenceId}`, {}, 403);

  const xssNote = `<script>alert('test')</script> Reviewed fictional evidence.`;
  const noteA = await json(adminA, `/admin/complaints/${complaintId}/notes`, jsonBody('POST', { note: xssNote }), 201);
  assert(noteA.payload.data.note.note === xssNote, 'Stored-XSS test note was altered.');
  await json(adminA, `/admin/complaints/${complaintId}/notes`, jsonBody('POST', { note: ' ' }), 400);
  await json(adminA, `/admin/complaints/${complaintId}/notes`, jsonBody('POST', { note: 'x'.repeat(3001) }), 400);
  await json(adminB, `/admin/complaints/${complaintId}/notes`, jsonBody('POST', { note: 'Second administrator review attribution.' }), 201);

  let refreshed = await json(adminA, `/admin/complaints/${complaintId}`);
  const firstUpdatedAt = refreshed.payload.data.complaint.updatedAt;
  await json(adminA, `/admin/complaints/${complaintId}/priority`, jsonBody('PATCH', {
    priority: 'high', expectedUpdatedAt: firstUpdatedAt
  }));
  await json(adminA, `/admin/complaints/${complaintId}/priority`, jsonBody('PATCH', {
    priority: 'critical', expectedUpdatedAt: firstUpdatedAt
  }), 409);

  refreshed = await json(adminA, `/admin/complaints/${complaintId}`);
  await json(adminA, `/admin/complaints/${complaintId}/status`, jsonBody('PATCH', {
    status: 'under_review', expectedUpdatedAt: refreshed.payload.data.complaint.updatedAt
  }));
  await json(adminA, `/admin/complaints/${complaintId}/status`, jsonBody('PATCH', { status: 'closed' }), 409);

  const tracking = await json(null, `/complaints/${complaintId}/status`);
  assert(tracking.payload.data.status === 'under_review', 'Public tracking did not reflect admin status.');
  const publicText = JSON.stringify(tracking.payload);
  assert(!publicText.includes(xssNote) && !publicText.includes('Phase Six Admin'), 'Public tracking leaked admin data.');
  const ownerDetail = await json(adminA, `/users/me/complaints/${complaintId}`);
  assert(!JSON.stringify(ownerDetail.payload).includes(xssNote), 'User detail leaked an internal note.');

  for (const status of ['in_progress', 'resolved', 'closed']) {
    refreshed = await json(adminA, `/admin/complaints/${complaintId}`);
    await json(adminA, `/admin/complaints/${complaintId}/status`, jsonBody('PATCH', {
      status, expectedUpdatedAt: refreshed.payload.data.complaint.updatedAt
    }));
  }
  await json(adminA, `/admin/complaints/${complaintId}/status`, jsonBody('PATCH', { status: 'in_progress' }), 409);
  const closedUpload = new FormData();
  closedUpload.append('evidence', new File([png], 'closed.png', { type: 'image/png' }));
  await json(adminA, `/users/me/complaints/${complaintId}/evidence`, { method: 'POST', body: closedUpload }, 409);

  const finalDetail = await json(adminA, `/admin/complaints/${complaintId}`);
  assert(finalDetail.payload.data.notes.length === 2, 'Append-only notes missing.');
  assert(finalDetail.payload.data.notes.some((note) => note.admin.name === 'Phase Six Admin B'), 'Second admin attribution missing.');
  const actions = finalDetail.payload.data.activity.map((event) => event.action);
  for (const action of ['complaint_status_changed', 'complaint_priority_changed', 'admin_note_added']) {
    assert(actions.includes(action), `Activity missing ${action}.`);
  }

  const database = new Database(resolveDatabasePath());
  const actor = database.prepare('SELECT id, user_id FROM users WHERE email = ?').get(emails.adminA);
  const auditActions = database.prepare(`
    SELECT action, actor_user_id, metadata_json FROM audit_logs
    WHERE entity_public_id = ? ORDER BY id
  `).all(complaintId);
  assert(auditActions.some((row) => row.action === 'admin_evidence_viewed'), 'Evidence view audit missing.');
  assert(auditActions.filter((row) => row.action !== 'admin_complaint_viewed').every((row) => row.actor_user_id), 'Audit actor attribution missing.');
  assert(auditActions.every((row) => !row.metadata_json.includes(xssNote)), 'Audit metadata contains full note content.');

  database.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(actor.id);
  await json(adminA, '/admin/dashboard/stats', {}, 403);
  promoteAdmin(emails.adminA);
  await json(adminA, '/admin/dashboard/stats');
  database.close();

  await json(adminA, '/auth/logout', { method: 'POST' });
  await json(adminA, '/admin/dashboard/stats', {}, 401);

  console.log(JSON.stringify({
    complaintId,
    evidenceId,
    adminRoleReturned: true,
    roleManipulationRejected: true,
    normalUserAdminRoutesDenied: true,
    staleUpdateRejected: true,
    sqlInjectionSearchSafe: true,
    storedXssReturnedAsTextData: true,
    twoAdminAttributionVerified: true,
    auditActions: [...new Set(auditActions.map((row) => row.action))],
    finalStatus: finalDetail.payload.data.complaint.status,
    closedEvidenceUploadRejected: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
