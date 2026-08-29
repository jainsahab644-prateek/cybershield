'use strict';

const dotenv = require('dotenv');
const Database = require('better-sqlite3');

dotenv.config({ quiet: true });

const { resolveDatabasePath } = require('../src/config/database');
const { promoteAdmin } = require('./promote-admin');

const API = 'http://localhost:5000/api/v1';
const ORIGIN = 'http://localhost:5000';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function session() { return { cookie: '' }; }

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
  return payload;
}

function body(method, value) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  };
}

async function signIn(method, identifier, fullName) {
  const client = session();
  await json(client, '/auth/request-otp', body('POST', { method, identifier }));
  await json(client, '/auth/verify-otp', body('POST', {
    method, identifier, fullName, otp: '123456'
  }));
  return client;
}

function complaintPayload(stamp, ownerName, ownerEmail, suffix = '') {
  return {
    category: 'other_cybercrime',
    subcategory: 'phishing',
    incident_title: `Phase 7 fictional notification test ${stamp}${suffix}`,
    incident_description: 'A harmless fictional report used only to test CyberShield demo notifications.',
    incident_date: '2026-08-25',
    platform: 'Fictional Messaging App',
    financial_loss: 0,
    suspect_name: 'Unknown fictional source',
    suspect_email: 'fictional-source@example.test',
    complainant_name: ownerName,
    complainant_email: ownerEmail,
    complainant_phone: '+919800007007'
  };
}

async function main() {
  const stamp = Date.now();
  const emails = {
    userA: `phase7-user-a-${stamp}@example.test`,
    userB: `phase7-user-b-${stamp}@example.test`,
    admin: `phase7-admin-${stamp}@example.test`
  };
  const userA = await signIn('email', emails.userA, 'Phase Seven User A');
  const userB = await signIn('email', emails.userB, 'Phase Seven User B');
  const admin = await signIn('email', emails.admin, 'Phase Seven Admin');
  const phoneUser = await signIn(
    'phone',
    `+9197${String(stamp).slice(-8)}`,
    'Phase Seven Phone User'
  );
  promoteAdmin(emails.admin);
  await json(admin, '/admin/dashboard/stats');

  const created = await json(
    userA,
    '/complaints',
    body('POST', complaintPayload(stamp, 'Phase Seven User A', emails.userA)),
    201
  );
  const complaintId = created.data.complaintId;

  let history = await json(userA, `/users/me/complaints/${complaintId}/history`);
  assert(history.data.history.length === 1, 'New complaint did not receive one initial history event.');
  assert(history.data.history[0].status === 'submitted', 'Initial history status was not submitted.');
  assert(/^HST-[A-Z0-9]{8}$/.test(history.data.history[0].historyId), 'History exposed an invalid ID.');

  let notificationList = await json(userA, '/users/me/notifications?page=1&limit=20');
  assert(notificationList.data.notifications.length === 1, 'Initial notification missing.');
  const initialNotificationId = notificationList.data.notifications[0].notificationId;
  assert(/^NTF-[A-Z0-9]{8}$/.test(initialNotificationId), 'Notification exposed an invalid ID.');
  assert(notificationList.data.notifications[0].type === 'complaint_submitted', 'Initial type incorrect.');
  assert(!('id' in notificationList.data.notifications[0]), 'Internal notification ID exposed.');
  let unread = await json(userA, '/users/me/notifications/unread-count');
  assert(unread.data.count === 1, 'Initial unread count incorrect.');

  await json(userB, `/users/me/complaints/${complaintId}`, {}, 404);
  await json(userB, `/users/me/complaints/${complaintId}/history`, {}, 404);
  await json(userB, `/users/me/notifications/${initialNotificationId}/read`, { method: 'PATCH' }, 404);
  const userBList = await json(userB, '/users/me/notifications');
  assert(!JSON.stringify(userBList).includes(initialNotificationId), 'User B listed User A notification.');

  let preferences = await json(userA, '/users/me/notification-preferences');
  assert(preferences.data.preferences.emailEnabled === false, 'Email was not opt-in by default.');
  assert(preferences.data.preferences.developmentMode === true, 'Development email mode not exposed safely.');
  await json(userA, '/users/me/notification-preferences', body('PATCH', {
    emailEnabled: 'true',
    statusUpdatesEnabled: true,
    informationRequiredEnabled: true,
    resolutionEnabled: true
  }), 400);
  await json(phoneUser, '/users/me/notification-preferences', body('PATCH', {
    emailEnabled: true,
    statusUpdatesEnabled: true,
    informationRequiredEnabled: true,
    resolutionEnabled: true
  }), 400);

  const internalNote = `PHASE7-INTERNAL-NOTE-${stamp}`;
  await json(admin, `/admin/complaints/${complaintId}/notes`, body('POST', { note: internalNote }), 201);
  let adminDetail = await json(admin, `/admin/complaints/${complaintId}`);
  await json(admin, `/admin/complaints/${complaintId}/status`, body('PATCH', {
    status: 'under_review',
    expectedUpdatedAt: adminDetail.data.complaint.updatedAt
  }));
  await json(admin, `/admin/complaints/${complaintId}/status`, body('PATCH', {
    status: 'under_review'
  }), 409);

  notificationList = await json(userA, '/users/me/notifications?type=status_changed');
  assert(notificationList.data.pagination.total === 1, 'Status-change notification missing or duplicated.');
  history = await json(userA, `/users/me/complaints/${complaintId}/history`);
  assert(history.data.history.at(-1).status === 'under_review', 'Under-review history missing.');

  await json(userA, '/users/me/notification-preferences', body('PATCH', {
    emailEnabled: true,
    statusUpdatesEnabled: true,
    informationRequiredEnabled: true,
    resolutionEnabled: true
  }));

  adminDetail = await json(admin, `/admin/complaints/${complaintId}`);
  await json(admin, `/admin/complaints/${complaintId}/status`, body('PATCH', {
    status: 'information_required',
    expectedUpdatedAt: adminDetail.data.complaint.updatedAt
  }));
  notificationList = await json(userA, '/users/me/notifications?type=information_required');
  assert(notificationList.data.pagination.total === 1, 'Information-required notification missing.');
  assert(notificationList.data.notifications[0].title === 'Additional information requested', 'Information-required title unsafe.');

  const xssMessage = `<script>alert('test')</script> Please add harmless fictional screenshots you already possess.`;
  await json(admin, `/admin/complaints/${complaintId}/user-message`, body('POST', {
    message: xssMessage
  }), 201);
  await json(admin, `/admin/complaints/${complaintId}/user-message`, body('POST', {
    message: 'Please provide your OTP.'
  }), 400);
  history = await json(userA, `/users/me/complaints/${complaintId}/history`);
  assert(history.data.messages.at(-1).message === xssMessage, 'User-visible message was missing or altered.');
  notificationList = await json(userA, '/users/me/notifications?type=user_message');
  assert(notificationList.data.pagination.total === 1, 'User-message notification missing.');
  assert(!JSON.stringify(notificationList).includes('<script>'), 'Notification leaked full user-message content.');

  for (const nextStatus of ['in_progress', 'resolved', 'closed']) {
    adminDetail = await json(admin, `/admin/complaints/${complaintId}`);
    await json(admin, `/admin/complaints/${complaintId}/status`, body('PATCH', {
      status: nextStatus,
      expectedUpdatedAt: adminDetail.data.complaint.updatedAt
    }));
  }
  notificationList = await json(userA, '/users/me/notifications?type=complaint_resolved');
  assert(notificationList.data.pagination.total === 1, 'Resolution notification missing.');
  notificationList = await json(userA, '/users/me/notifications?type=complaint_closed');
  assert(notificationList.data.pagination.total === 1, 'Closed notification missing.');

  const publicTracking = await json(null, `/complaints/${complaintId}/status`);
  const ownerDetail = await json(userA, `/users/me/complaints/${complaintId}`);
  for (const payload of [publicTracking, ownerDetail, await json(userA, '/users/me/notifications')]) {
    assert(!JSON.stringify(payload).includes(internalNote), 'Internal note leaked outside administration.');
  }

  notificationList = await json(userA, '/users/me/notifications?read=false&limit=100');
  assert(notificationList.data.pagination.total >= 6, 'Unread filter did not return Phase 7 events.');
  const notificationToRead = notificationList.data.notifications[0].notificationId;
  await json(userA, `/users/me/notifications/${notificationToRead}/read`, { method: 'PATCH' });
  await json(userA, '/users/me/notifications/read-all', { method: 'PATCH' });
  unread = await json(userA, '/users/me/notifications/unread-count');
  assert(unread.data.count === 0, 'Mark-all-read did not clear unread count.');

  const anonymous = await json(
    null,
    '/complaints',
    body('POST', complaintPayload(stamp, 'Anonymous Phase Seven Demo', 'anonymous-phase7@example.test', '-anonymous')),
    201
  );
  await json(admin, `/admin/complaints/${anonymous.data.complaintId}/user-message`, body('POST', {
    message: 'This message must not be accepted.'
  }), 409);

  const database = new Database(resolveDatabasePath());
  const complaint = database.prepare('SELECT id, status FROM complaints WHERE complaint_id = ?').get(complaintId);
  const notificationRows = database.prepare(`
    SELECT n.id, n.public_notification_id, n.type, COUNT(d.id) AS delivery_count
    FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id = n.id
    WHERE n.complaint_id = ? GROUP BY n.id
  `).all(complaint.id);
  assert(notificationRows.every((row) => row.delivery_count === 1), 'Duplicate or missing logical email delivery record.');
  const deliveries = database.prepare(`
    SELECT status, attempt_count, last_error_code FROM notification_deliveries d
    JOIN notifications n ON n.id = d.notification_id WHERE n.complaint_id = ?
  `).all(complaint.id);
  assert(deliveries.some((row) => row.last_error_code === 'email_preference_disabled'), 'Disabled-email skip was not recorded.');
  assert(deliveries.some((row) => row.last_error_code === 'development_simulated'), 'Development simulated delivery was not recorded.');
  const auditText = JSON.stringify(database.prepare(`
    SELECT action, metadata_json FROM audit_logs
    WHERE entity_public_id = ? OR entity_public_id IN (
      SELECT public_notification_id FROM notifications WHERE complaint_id = ?
    )
  `).all(complaintId, complaint.id));
  for (const action of ['notification_created', 'user_message_sent', 'email_delivery_attempted']) {
    assert(auditText.includes(action), `Audit event missing: ${action}.`);
  }
  assert(!auditText.includes(xssMessage), 'Audit logs stored full user or email content.');
  database.close();

  const latestStatusNotification = notificationRows.find((row) => row.type === 'complaint_closed');
  const notificationService = require('../src/services/notification.service');
  await notificationService.processEmailDelivery(latestStatusNotification.public_notification_id);
  await notificationService.processEmailDelivery(latestStatusNotification.public_notification_id);
  const duplicateDatabase = new Database(resolveDatabasePath(), { readonly: true });
  const duplicateCheck = duplicateDatabase.prepare(`
    SELECT COUNT(*) AS count FROM notification_deliveries WHERE notification_id = ?
  `).get(latestStatusNotification.id).count;
  duplicateDatabase.close();
  assert(duplicateCheck === 1, 'Retry processing duplicated a successful/skipped delivery.');

  const failureCreated = await json(
    userA,
    '/complaints',
    body('POST', complaintPayload(stamp, 'Phase Seven User A', emails.userA, '-provider-failure')),
    201
  );
  const failureDatabase = new Database(resolveDatabasePath(), { readonly: true });
  const adminRow = failureDatabase.prepare('SELECT id, user_id, full_name FROM users WHERE email = ?').get(emails.admin);
  failureDatabase.close();
  const previousProvider = process.env.EMAIL_PROVIDER;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;
  process.env.EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = '';
  process.env.RESEND_FROM_EMAIL = '';
  const adminService = require('../src/services/admin.service');
  const failedDeliveryComplaint = await adminService.updateComplaint(
    failureCreated.data.complaintId,
    'status',
    { status: 'under_review' },
    { internalId: adminRow.id, user: { userId: adminRow.user_id, fullName: adminRow.full_name, role: 'admin' } },
    '127.0.0.1'
  );
  process.env.EMAIL_PROVIDER = previousProvider;
  process.env.RESEND_API_KEY = previousKey;
  process.env.RESEND_FROM_EMAIL = previousFrom;
  assert(failedDeliveryComplaint.status === 'under_review', 'Provider failure rolled back complaint status.');
  const failureCheck = new Database(resolveDatabasePath(), { readonly: true });
  const failureRow = failureCheck.prepare(`
    SELECT c.status, d.status AS delivery_status, d.last_error_code
    FROM complaints c
    JOIN notifications n ON n.complaint_id = c.id AND n.type = 'status_changed'
    JOIN notification_deliveries d ON d.notification_id = n.id
    WHERE c.complaint_id = ? ORDER BY n.id DESC LIMIT 1
  `).get(failureCreated.data.complaintId);
  assert(failureRow.status === 'under_review', 'Committed status changed after delivery failure.');
  assert(failureRow.delivery_status === 'failed', 'Provider failure was not recorded.');
  assert(failureRow.last_error_code === 'resend_configuration_missing', 'Provider failure code was unsafe or missing.');
  assert(failureCheck.pragma('integrity_check', { simple: true }) === 'ok', 'Database integrity check failed.');
  failureCheck.close();

  await json(userA, '/auth/logout', { method: 'POST' });
  await json(userA, '/users/me/notifications', {}, 401);

  console.log(JSON.stringify({
    complaintId,
    initialNotificationId,
    statusHistoryEvents: history.data.history.length,
    userMessages: history.data.messages.length,
    notificationTypes: [...new Set(notificationRows.map((row) => row.type))],
    notificationOwnershipEnforced: true,
    internalNoteLeakPrevented: true,
    developmentEmailSimulated: true,
    duplicateDeliveryPrevented: true,
    resendConfigurationFailureRecorded: true,
    providerFailureDidNotRollbackStatus: true,
    xssPayloadStoredAsText: true,
    databaseIntegrity: 'ok'
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
