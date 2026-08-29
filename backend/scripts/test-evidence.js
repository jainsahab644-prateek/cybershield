'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const API = 'http://localhost:5000/api/v1';
const ORIGIN = 'http://localhost:5000';
const databasePath = path.resolve(__dirname, '..', 'data', 'cybershield.db');
const storagePath = path.resolve(__dirname, '..', 'private_uploads', 'evidence');

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlVQAAAAASUVORK5CYII=',
  'base64'
);
const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AYf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AYf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
  'base64'
);
const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'utf8'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createSession() {
  return { cookie: '' };
}

async function request(session, route, options = {}) {
  const headers = new Headers(options.headers || {});
  if (session?.cookie) headers.set('Cookie', session.cookie);
  if (!['GET', 'HEAD'].includes(options.method || 'GET')) headers.set('Origin', options.origin || ORIGIN);
  const response = await fetch(`${API}${route}`, { ...options, headers });
  const setCookie = response.headers.get('set-cookie');
  if (session && setCookie) session.cookie = setCookie.split(';', 1)[0];
  return response;
}

async function jsonRequest(session, route, method, body, expected = 200, origin) {
  const response = await request(session, route, {
    method,
    origin,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.status === expected, `${method} ${route}: expected ${expected}, got ${response.status} (${payload.message})`);
  return payload;
}

async function signIn(email, fullName) {
  const session = createSession();
  await jsonRequest(session, '/auth/request-otp', 'POST', { method: 'email', identifier: email });
  await jsonRequest(session, '/auth/verify-otp', 'POST', {
    method: 'email', identifier: email, otp: '123456', fullName
  });
  return session;
}

async function createComplaint(session, suffix) {
  const payload = await jsonRequest(session, '/complaints', 'POST', {
    category: 'other_cybercrime',
    subcategory: 'phishing',
    incident_title: `Phase Five evidence test ${suffix}`,
    incident_description: 'A fictional complaint created solely for safe local evidence validation tests.',
    incident_date: '2026-08-24',
    platform: 'Demo Messaging',
    financial_loss: 0,
    complainant_name: 'Phase Five Demo User',
    complainant_email: `phase5-${suffix}@example.test`,
    complainant_phone: '+919800001234'
  }, 201);
  return payload.data.complaintId;
}

function formWith(files) {
  const form = new FormData();
  files.forEach(({ bytes, name, type }) => form.append('evidence', new File([bytes], name, { type })));
  return form;
}

async function upload(session, complaintId, files, expected = 201, origin) {
  const response = await request(session, `/users/me/complaints/${complaintId}/evidence`, {
    method: 'POST',
    body: formWith(files),
    origin
  });
  const payload = await response.json();
  assert(response.status === expected, `upload ${complaintId}: expected ${expected}, got ${response.status} (${payload.message})`);
  return payload;
}

async function main() {
  const stamp = Date.now();
  const userA = await signIn(`phase5-a-${stamp}@example.test`, 'Phase Five User A');
  const userB = await signIn(`phase5-b-${stamp}@example.test`, 'Phase Five User B');
  const ownedComplaint = await createComplaint(userA, `owned-${stamp}`);
  const validFiles = [
    { bytes: jpeg, name: 'fictional-photo.jpg', type: 'image/jpeg' },
    { bytes: jpeg, name: 'fictional-photo.jpeg', type: 'image/jpeg' },
    { bytes: png, name: 'fictional-screen.png', type: 'image/png' },
    { bytes: pdf, name: 'fictional-document.pdf', type: 'application/pdf' }
  ];
  const accepted = await upload(userA, ownedComplaint, validFiles);
  assert(accepted.data.evidence.length === 4, 'Four allowed evidence files were not accepted.');
  await upload(userA, ownedComplaint, [
    { bytes: pdf, name: '../fictional-path.pdf', type: 'application/pdf' }
  ]);
  await upload(userA, ownedComplaint, [
    { bytes: png, name: 'sixth.png', type: 'image/png' }
  ], 400);

  const listResponse = await request(userA, `/users/me/complaints/${ownedComplaint}/evidence`);
  const listPayload = await listResponse.json();
  assert(listResponse.status === 200 && listPayload.data.evidence.length === 5, 'Evidence list did not return five owned files.');
  assert(listPayload.data.evidence.every((item) => !item.filename.includes('/') && !item.filename.includes('\\')), 'Path-like filename was not neutralized.');

  const firstEvidence = listPayload.data.evidence[0];
  const download = await request(userA, `/users/me/complaints/${ownedComplaint}/evidence/${firstEvidence.evidenceId}`);
  assert(download.status === 200, 'Owned evidence download failed.');
  assert(download.headers.get('x-content-type-options') === 'nosniff', 'nosniff header missing.');
  assert(download.headers.get('cache-control') === 'private, no-store', 'Restrictive cache header missing.');
  assert(Buffer.from(await download.arrayBuffer()).equals(jpeg), 'Downloaded evidence bytes changed.');

  for (const method of ['GET']) {
    const crossList = await request(userB, `/users/me/complaints/${ownedComplaint}/evidence`, { method });
    assert(crossList.status === 404, 'User B could list User A evidence.');
    const crossDownload = await request(userB, `/users/me/complaints/${ownedComplaint}/evidence/${firstEvidence.evidenceId}`, { method });
    assert(crossDownload.status === 404, 'User B could download User A evidence.');
  }
  await upload(userB, ownedComplaint, [{ bytes: png, name: 'cross-user.png', type: 'image/png' }], 404);
  await upload(userA, ownedComplaint, [{ bytes: png, name: 'wrong-origin.png', type: 'image/png' }], 403, 'https://attacker.example');

  const invalidComplaint = await createComplaint(userA, `invalid-${stamp}`);
  const invalidFiles = [
    ['note.txt', 'text/plain'], ['page.html', 'text/html'], ['script.js', 'text/javascript'],
    ['graphic.svg', 'image/svg+xml'], ['program.exe', 'application/octet-stream'],
    ['archive.zip', 'application/zip']
  ];
  for (const [name, type] of invalidFiles) {
    await upload(userA, invalidComplaint, [{ bytes: Buffer.from('harmless fictional test'), name, type }], 400);
  }
  await upload(userA, invalidComplaint, [
    { bytes: Buffer.from('harmless text renamed as an image'), name: 'fake.jpg', type: 'image/jpeg' }
  ], 400);
  await upload(userA, invalidComplaint, [
    { bytes: png, name: 'proof.js.png', type: 'image/png' }
  ], 400);
  await upload(userA, invalidComplaint, [
    { bytes: Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]), name: 'oversized.png', type: 'image/png' }
  ], 413);

  const closedComplaint = await createComplaint(userA, `closed-${stamp}`);
  const resolvedComplaint = await createComplaint(userA, `resolved-${stamp}`);
  const database = new Database(databasePath);
  database.prepare('UPDATE complaints SET status = ? WHERE complaint_id = ?').run('closed', closedComplaint);
  database.prepare('UPDATE complaints SET status = ? WHERE complaint_id = ?').run('resolved', resolvedComplaint);
  const evidenceRows = database.prepare(`
    SELECT e.*, c.complaint_id AS public_complaint_id
    FROM complaint_evidence e JOIN complaints c ON c.id = e.complaint_id
    WHERE c.complaint_id = ? ORDER BY e.id
  `).all(ownedComplaint);
  database.close();
  assert(evidenceRows.length === 5, 'SQLite evidence metadata count is incorrect.');
  assert(evidenceRows.every((row) => /^[0-9a-f]{64}$/.test(row.file_hash)), 'SHA-256 metadata is invalid.');
  assert(evidenceRows.every((row) => /^[0-9a-f-]{36}\.(?:jpg|jpeg|png|pdf)$/.test(row.stored_filename)), 'Stored filenames are not generated UUID names.');
  assert(evidenceRows.every((row) => row.upload_status === 'accepted'), 'Accepted evidence status missing.');
  assert(evidenceRows.every((row) => fs.existsSync(path.join(storagePath, row.stored_filename))), 'Private evidence file is missing.');
  await upload(userA, closedComplaint, [{ bytes: png, name: 'closed.png', type: 'image/png' }], 409);
  await upload(userA, resolvedComplaint, [{ bytes: png, name: 'resolved.png', type: 'image/png' }], 409);

  const anonymous = createSession();
  const anonymousList = await request(anonymous, `/users/me/complaints/${ownedComplaint}/evidence`);
  assert(anonymousList.status === 401, 'Anonymous evidence retrieval was not protected.');
  await jsonRequest(userA, '/auth/logout', 'POST', {});
  const afterLogout = await request(userA, `/users/me/complaints/${ownedComplaint}/evidence/${firstEvidence.evidenceId}`);
  assert(afterLogout.status === 401, 'Evidence remained available after logout.');

  console.log(JSON.stringify({
    complaintId: ownedComplaint,
    evidenceId: firstEvidence.evidenceId,
    allowedTypesAccepted: ['JPG', 'JPEG', 'PNG', 'PDF'],
    evidenceCount: evidenceRows.length,
    rejectedExtensions: invalidFiles.map(([name]) => path.extname(name)),
    renamedFakeJpgRejected: true,
    doubleExtensionRejected: true,
    oversizedRejected: true,
    sixthFileRejected: true,
    pathFilenameNeutralized: true,
    crossUserListDownloadUploadDenied: true,
    unexpectedOriginDenied: true,
    closedAndResolvedDenied: true,
    logoutDenied: true,
    privateStoragePath: storagePath
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
