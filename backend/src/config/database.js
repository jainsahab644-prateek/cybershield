'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { env } = require('./env');

const backendDirectory = path.resolve(__dirname, '..', '..');
let database;

const migrations = [
  {
    version: 1,
    name: 'create_complaints',
    sql: `
      CREATE TABLE complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('financial_fraud', 'safety_related', 'other_cybercrime')),
        subcategory TEXT,
        incident_title TEXT NOT NULL,
        incident_description TEXT NOT NULL,
        incident_date TEXT NOT NULL,
        incident_time TEXT,
        incident_location TEXT,
        platform TEXT,
        financial_loss NUMERIC NOT NULL DEFAULT 0 CHECK (financial_loss >= 0),
        suspect_name TEXT,
        suspect_phone TEXT,
        suspect_email TEXT,
        suspect_username TEXT,
        suspect_website TEXT,
        complainant_name TEXT NOT NULL,
        complainant_email TEXT NOT NULL,
        complainant_phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE UNIQUE INDEX idx_complaints_complaint_id ON complaints (complaint_id);
      CREATE INDEX idx_complaints_status ON complaints (status);
      CREATE INDEX idx_complaints_category ON complaints (category);
      CREATE INDEX idx_complaints_created_at ON complaints (created_at);
    `
  },
  {
    version: 2,
    name: 'add_passwordless_users_and_complaint_ownership',
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (email IS NOT NULL OR phone IS NOT NULL)
      );

      CREATE UNIQUE INDEX idx_users_user_id ON users (user_id);
      CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;
      CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

      CREATE TABLE otp_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('email', 'phone')),
        otp_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        used_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_otp_identifier_created
        ON otp_requests (method, identifier, created_at DESC);
      CREATE INDEX idx_otp_expiry ON otp_requests (expires_at);

      ALTER TABLE complaints ADD COLUMN user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX idx_complaints_user_created
        ON complaints (user_id, created_at DESC);
    `
  },
  {
    version: 3,
    name: 'create_complaint_evidence',
    sql: `
      CREATE TABLE complaint_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_evidence_id TEXT NOT NULL,
        complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
        stored_filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_extension TEXT NOT NULL CHECK (file_extension IN ('jpg', 'jpeg', 'png', 'pdf')),
        mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
        file_size INTEGER NOT NULL CHECK (file_size > 0),
        file_hash TEXT NOT NULL,
        upload_status TEXT NOT NULL CHECK (upload_status IN ('pending', 'accepted', 'rejected')),
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX idx_evidence_public_id
        ON complaint_evidence (public_evidence_id);
      CREATE UNIQUE INDEX idx_evidence_stored_filename
        ON complaint_evidence (stored_filename);
      CREATE INDEX idx_evidence_complaint_created
        ON complaint_evidence (complaint_id, created_at DESC);
      CREATE INDEX idx_evidence_hash ON complaint_evidence (file_hash);
    `
  },
  {
    version: 4,
    name: 'add_admin_roles_notes_and_audit_logs',
    sql: `
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin'));

      CREATE TABLE complaint_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_note_id TEXT NOT NULL,
        complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
        admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        note TEXT NOT NULL CHECK (length(note) BETWEEN 2 AND 3000),
        created_at TEXT NOT NULL
      );

      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_audit_id TEXT NOT NULL,
        actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'admin', 'anonymous')),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_public_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        ip_address TEXT,
        created_at TEXT NOT NULL,
        CHECK (json_valid(metadata_json))
      );

      CREATE INDEX idx_complaints_priority ON complaints (priority);
      CREATE INDEX idx_complaints_updated_at ON complaints (updated_at DESC);
      CREATE UNIQUE INDEX idx_notes_public_id ON complaint_notes (public_note_id);
      CREATE INDEX idx_notes_complaint_created
        ON complaint_notes (complaint_id, created_at DESC);
      CREATE UNIQUE INDEX idx_audit_public_id ON audit_logs (public_audit_id);
      CREATE INDEX idx_audit_entity_created
        ON audit_logs (entity_public_id, created_at DESC);
      CREATE INDEX idx_audit_created_at ON audit_logs (created_at DESC);
      CREATE INDEX idx_audit_actor_user ON audit_logs (actor_user_id);
    `
  },
  {
    version: 5,
    name: 'add_notifications_status_history_and_user_messages',
    sql: `
      CREATE TABLE complaint_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_history_id TEXT NOT NULL,
        complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
        from_status TEXT CHECK (from_status IS NULL OR from_status IN (
          'submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed'
        )),
        to_status TEXT NOT NULL CHECK (to_status IN (
          'submitted', 'under_review', 'information_required', 'in_progress', 'resolved', 'closed'
        )),
        user_visible_message TEXT NOT NULL,
        changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_notification_id TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE RESTRICT,
        type TEXT NOT NULL CHECK (type IN (
          'complaint_submitted', 'status_changed', 'information_required',
          'complaint_resolved', 'complaint_closed', 'user_message'
        )),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        action_url TEXT,
        event_key TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
        created_at TEXT NOT NULL,
        read_at TEXT
      );

      CREATE TABLE notification_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_delivery_id TEXT NOT NULL,
        notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
        channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
        provider TEXT NOT NULL CHECK (provider IN ('development', 'resend')),
        recipient TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_error_code TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sent_at TEXT
      );

      CREATE TABLE notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        email_enabled INTEGER NOT NULL DEFAULT 0 CHECK (email_enabled IN (0, 1)),
        status_updates_enabled INTEGER NOT NULL DEFAULT 1 CHECK (status_updates_enabled IN (0, 1)),
        information_required_enabled INTEGER NOT NULL DEFAULT 1 CHECK (information_required_enabled IN (0, 1)),
        resolution_enabled INTEGER NOT NULL DEFAULT 1 CHECK (resolution_enabled IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE complaint_user_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_message_id TEXT NOT NULL,
        complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
        sender_admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        message TEXT NOT NULL CHECK (length(message) BETWEEN 2 AND 1000),
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX idx_history_public_id ON complaint_status_history (public_history_id);
      CREATE INDEX idx_history_complaint_created
        ON complaint_status_history (complaint_id, created_at ASC);
      CREATE UNIQUE INDEX idx_notifications_public_id ON notifications (public_notification_id);
      CREATE UNIQUE INDEX idx_notifications_event_key ON notifications (event_key);
      CREATE INDEX idx_notifications_user_created
        ON notifications (user_id, created_at DESC);
      CREATE INDEX idx_notifications_user_read
        ON notifications (user_id, is_read, created_at DESC);
      CREATE UNIQUE INDEX idx_deliveries_public_id ON notification_deliveries (public_delivery_id);
      CREATE UNIQUE INDEX idx_deliveries_notification_channel
        ON notification_deliveries (notification_id, channel);
      CREATE INDEX idx_deliveries_status ON notification_deliveries (status);
      CREATE UNIQUE INDEX idx_preferences_user ON notification_preferences (user_id);
      CREATE UNIQUE INDEX idx_user_messages_public_id ON complaint_user_messages (public_message_id);
      CREATE INDEX idx_user_messages_complaint_created
        ON complaint_user_messages (complaint_id, created_at ASC);

      INSERT INTO complaint_status_history (
        public_history_id, complaint_id, from_status, to_status,
        user_visible_message, changed_by_user_id, created_at
      )
      SELECT 'HST-' || upper(substr(hex(randomblob(4)), 1, 8)), id, NULL, status,
        'Current status when history tracking was enabled.', NULL, created_at
      FROM complaints;

      INSERT INTO notification_preferences (
        user_id, email_enabled, status_updates_enabled,
        information_required_enabled, resolution_enabled, created_at, updated_at
      )
      SELECT id, 0, 1, 1, 1,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      FROM users;
    `
  },
  {
    version: 6,
    name: 'add_suspicious_activity_reporting',
    sql: `
      CREATE TABLE suspicious_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_report_id TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        identifier_type TEXT NOT NULL CHECK (identifier_type IN (
          'phone', 'email', 'website', 'social_handle', 'messaging_handle',
          'payment_identifier', 'other'
        )),
        identifier_value TEXT NOT NULL,
        normalized_identifier TEXT NOT NULL,
        identifier_hash TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'financial_scam', 'phishing', 'impersonation', 'fake_website',
          'online_shopping', 'investment_scam', 'job_scam',
          'account_impersonation', 'harassment', 'malicious_link', 'other'
        )),
        description TEXT,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
          'submitted', 'under_review', 'confirmed_duplicate',
          'published_demo_flag', 'rejected', 'closed'
        )),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE suspicious_report_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_evidence_id TEXT NOT NULL,
        suspicious_report_id INTEGER NOT NULL REFERENCES suspicious_reports(id) ON DELETE RESTRICT,
        stored_filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_extension TEXT NOT NULL CHECK (file_extension IN ('jpg', 'jpeg', 'png', 'pdf')),
        mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
        file_size INTEGER NOT NULL CHECK (file_size > 0),
        file_hash TEXT NOT NULL,
        upload_status TEXT NOT NULL CHECK (upload_status IN ('pending', 'accepted', 'rejected')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE suspicious_report_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_note_id TEXT NOT NULL,
        suspicious_report_id INTEGER NOT NULL REFERENCES suspicious_reports(id) ON DELETE RESTRICT,
        admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        note TEXT NOT NULL CHECK (length(note) BETWEEN 2 AND 3000),
        created_at TEXT NOT NULL
      );

      ALTER TABLE notifications ADD COLUMN suspicious_report_id INTEGER
        REFERENCES suspicious_reports(id) ON DELETE RESTRICT;

      CREATE UNIQUE INDEX idx_suspicious_reports_public_id ON suspicious_reports(public_report_id);
      CREATE INDEX idx_suspicious_reports_hash ON suspicious_reports(identifier_type, identifier_hash);
      CREATE INDEX idx_suspicious_reports_status ON suspicious_reports(status);
      CREATE INDEX idx_suspicious_reports_user_created ON suspicious_reports(user_id, created_at DESC);
      CREATE INDEX idx_suspicious_reports_type ON suspicious_reports(identifier_type);
      CREATE INDEX idx_suspicious_reports_category ON suspicious_reports(category);
      CREATE UNIQUE INDEX idx_suspicious_evidence_public_id ON suspicious_report_evidence(public_evidence_id);
      CREATE UNIQUE INDEX idx_suspicious_evidence_stored ON suspicious_report_evidence(stored_filename);
      CREATE INDEX idx_suspicious_evidence_report ON suspicious_report_evidence(suspicious_report_id, created_at DESC);
      CREATE UNIQUE INDEX idx_suspicious_notes_public_id ON suspicious_report_notes(public_note_id);
      CREATE INDEX idx_suspicious_notes_report ON suspicious_report_notes(suspicious_report_id, created_at DESC);
      CREATE INDEX idx_notifications_suspicious_report ON notifications(suspicious_report_id);
    `
  },
  {
    version: 7,
    name: 'add_learning_content_management',
    sql: `
      CREATE TABLE content_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_category_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE learning_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_article_id TEXT NOT NULL UNIQUE,
        category_id INTEGER NOT NULL REFERENCES content_categories(id) ON DELETE RESTRICT,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 180),
        slug TEXT NOT NULL UNIQUE,
        summary TEXT NOT NULL CHECK (length(summary) BETWEEN 20 AND 500),
        content TEXT NOT NULL CHECK (length(content) BETWEEN 20 AND 30000),
        cover_image TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
        author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE content_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_tag_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE article_tags (
        article_id INTEGER NOT NULL REFERENCES learning_articles(id) ON DELETE RESTRICT,
        tag_id INTEGER NOT NULL REFERENCES content_tags(id) ON DELETE RESTRICT,
        PRIMARY KEY (article_id, tag_id)
      );

      CREATE TABLE faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_faq_id TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        question TEXT NOT NULL CHECK (length(question) BETWEEN 5 AND 300),
        answer TEXT NOT NULL CHECK (length(answer) BETWEEN 10 AND 3000),
        display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_announcement_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 180),
        message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 2000),
        type TEXT NOT NULL CHECK (type IN ('info','warning','awareness','maintenance')),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (ends_at IS NULL OR ends_at > starts_at)
      );

      CREATE TABLE external_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_resource_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        url TEXT NOT NULL,
        resource_type TEXT NOT NULL CHECK (resource_type IN ('website','guide','video','helpline_information')),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_learning_articles_status ON learning_articles(status);
      CREATE INDEX idx_learning_articles_category ON learning_articles(category_id);
      CREATE INDEX idx_learning_articles_published ON learning_articles(published_at DESC);
      CREATE INDEX idx_learning_articles_featured ON learning_articles(is_featured, status);
      CREATE INDEX idx_faqs_status_order ON faqs(status, display_order);
      CREATE INDEX idx_announcements_visibility ON announcements(status, starts_at, ends_at);

      INSERT INTO content_categories(public_category_id,name,slug,description,is_active,created_at,updated_at) VALUES
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Online Safety','online-safety','Everyday habits for safer use of websites, apps, and connected services.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Financial Fraud Awareness','financial-fraud-awareness','Defensive guidance for recognising suspicious payment and money requests.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Phishing Awareness','phishing-awareness','Ways to pause, verify, and respond safely to suspicious messages.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Social Media Safety','social-media-safety','Practical account and privacy guidance for social platforms.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Account Security','account-security','Safer sign-in, recovery, and account-protection habits.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Online Shopping Safety','online-shopping-safety','Warning signs and safer checks when buying online.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Mobile & Device Safety','mobile-device-safety','Updates, permissions, backups, and safer device use.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Privacy','privacy','Choices that reduce unnecessary exposure of personal information.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Cyberbullying Awareness','cyberbullying-awareness','Supportive, safety-first responses to harmful online behaviour.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('CAT-'||upper(substr(hex(randomblob(4)),1,8)),'Scam Awareness','scam-awareness','Common warning patterns and safer next steps.',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

      INSERT INTO content_tags(public_tag_id,name,slug,created_at) VALUES
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Phishing','phishing',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Payments','payments',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Email','email',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Passwords','passwords',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Social Media','social-media',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Shopping','shopping',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Mobile','mobile',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('TAG-'||upper(substr(hex(randomblob(4)),1,8)),'Privacy','privacy',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

      INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,status,is_featured,published_at,created_at,updated_at) VALUES
      ('ART-'||upper(substr(hex(randomblob(4)),1,8)),(SELECT id FROM content_categories WHERE slug='phishing-awareness'),'How to Recognize a Phishing Message','how-to-recognize-a-phishing-message','Learn practical warning signs that can help you assess unexpected emails and messages safely.','# How to Recognize a Phishing Message\n\nPhishing messages often try to create urgency or fear. A familiar logo alone does not prove a message is genuine.\n\n## Pause before acting\n\n- Check whether the request was expected.\n- Contact the organisation through an app or address you already trust.\n- Inspect the destination before opening a link.\n\n## Protect important information\n\nNever share passwords, OTPs, PINs, CVVs, or recovery codes through a message. If unsure, stop and verify independently.','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day')),
      ('ART-'||upper(substr(hex(randomblob(4)),1,8)),(SELECT id FROM content_categories WHERE slug='financial-fraud-awareness'),'Safer Steps for an Unexpected Payment Request','safer-steps-for-an-unexpected-payment-request','Use a calm verification routine before approving an unexpected transfer or payment request.','# Safer Steps for an Unexpected Payment Request\n\nUnexpected payment requests deserve a pause, even when they appear to come from someone familiar.\n\n## A safer routine\n\n1. Do not approve the request immediately.\n2. Contact the person using a number or channel you already know.\n3. Check the amount and recipient carefully.\n4. Never reveal a UPI PIN or OTP.\n\nIf money was already sent, contact the relevant financial provider through its verified channel as quickly as possible.','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day')),
      ('ART-'||upper(substr(hex(randomblob(4)),1,8)),(SELECT id FROM content_categories WHERE slug='social-media-safety'),'Protecting Your Social Media Accounts','protecting-your-social-media-accounts','Strengthen account access, recovery choices, and privacy settings with a few practical checks.','# Protecting Your Social Media Accounts\n\nAccount protection is easier when recovery options and sign-in settings are reviewed before a problem occurs.\n\n## Helpful checks\n\n- Use a unique password for each important account.\n- Enable multi-factor authentication where available.\n- Review active sessions and connected applications.\n- Limit public profile details that could be misused.\n\nTreat unexpected recovery messages as suspicious until verified through the official app.','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day')),
      ('ART-'||upper(substr(hex(randomblob(4)),1,8)),(SELECT id FROM content_categories WHERE slug='online-shopping-safety'),'Online Shopping Warning Signs','online-shopping-warning-signs','Recognize pressure tactics, unusual payment requests, and storefront details that deserve a closer look.','# Online Shopping Warning Signs\n\nA polished page does not guarantee that a seller or offer is reliable.\n\n## Before paying\n\n- Compare the offer with other established sellers.\n- Read return and contact information carefully.\n- Be cautious when payment is requested outside the platform.\n- Save the listing, receipt, and conversation.\n\nAvoid entering account details after following an unexpected message link.','published',0,strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day')),
      ('ART-'||upper(substr(hex(randomblob(4)),1,8)),(SELECT id FROM content_categories WHERE slug='account-security'),'What to Do After an Account Security Alert','what-to-do-after-an-account-security-alert','Respond to a security notification without following an unverified link or sharing credentials.','# What to Do After an Account Security Alert\n\nA genuine-looking alert can still be a deceptive message. Open the official app or type the known website address yourself.\n\n## Review safely\n\n1. Check recent sign-ins and account activity.\n2. End sessions you do not recognise.\n3. Change the password from the official account settings.\n4. Confirm recovery email and phone details.\n\nDo not give anyone an OTP, recovery code, or password while investigating an alert.','published',0,strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'));

      INSERT INTO article_tags(article_id,tag_id)
      SELECT a.id,t.id FROM learning_articles a JOIN content_tags t ON
        (a.slug='how-to-recognize-a-phishing-message' AND t.slug IN ('phishing','email')) OR
        (a.slug='safer-steps-for-an-unexpected-payment-request' AND t.slug='payments') OR
        (a.slug='protecting-your-social-media-accounts' AND t.slug IN ('social-media','passwords')) OR
        (a.slug='online-shopping-warning-signs' AND t.slug='shopping') OR
        (a.slug='what-to-do-after-an-account-security-alert' AND t.slug='passwords');

      INSERT INTO faqs(public_faq_id,category,question,answer,display_order,status,created_at,updated_at) VALUES
      ('FAQ-'||upper(substr(hex(randomblob(4)),1,8)),'Payments','What should I do if I receive a suspicious payment link?','Do not open it immediately. Verify the request through a channel you already trust, and never share a PIN, OTP, CVV, password, or recovery code.',10,'published',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('FAQ-'||upper(substr(hex(randomblob(4)),1,8)),'Phishing','How can I recognize a phishing email?','Look for unexpected urgency, unusual requests, mismatched destinations, and pressure to share information. Verify independently through the official app or a known address.',20,'published',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('FAQ-'||upper(substr(hex(randomblob(4)),1,8)),'Privacy','What information should I never share through a message?','Never share passwords, OTPs, PINs, CVVs, full card credentials, recovery codes, private keys, or government identity numbers through an unexpected message.',30,'published',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('FAQ-'||upper(substr(hex(randomblob(4)),1,8)),'Account Security','What should I do if an online account may have been compromised?','Use the official app or known website to change the password, end unfamiliar sessions, review recovery information, and enable multi-factor authentication where available.',40,'published',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('FAQ-'||upper(substr(hex(randomblob(4)),1,8)),'About CyberShield','Does CyberShield submit reports to police?','No. CyberShield is an educational demonstration project and is not connected to police or government systems.',50,'published',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

      INSERT INTO announcements(public_announcement_id,title,message,type,status,starts_at,ends_at,created_at,updated_at) VALUES
      ('ANN-'||upper(substr(hex(randomblob(4)),1,8)),'Cyber Safety Awareness Demo','Review unexpected links carefully before entering account information. This is a fictional CyberShield educational announcement.','awareness','published',strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'),NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      ('ANN-'||upper(substr(hex(randomblob(4)),1,8)),'Account Check Reminder','Use the official application or a known website address when reviewing an unexpected account alert.','info','published',strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 hour'),strftime('%Y-%m-%dT%H:%M:%fZ','now','+30 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

      INSERT INTO external_resources(public_resource_id,title,description,url,resource_type,status,display_order,created_at,updated_at) VALUES
      ('RES-'||upper(substr(hex(randomblob(4)),1,8)),'External resource link demonstration','A harmless example showing how CyberShield labels links that leave this demonstration application.','https://example.com/','website','published',10,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    `
  }
];

migrations.push({
  version: 8,
  name: 'phase10_query_indexes',
  sql: fs.readFileSync(path.join(backendDirectory, 'migrations', 'sqlite', '008_phase10_query_indexes.sql'), 'utf8')
});

migrations.push({
  version: 9,
  name: 'add_initiatives',
  sql: fs.readFileSync(path.join(backendDirectory, 'migrations', 'sqlite', '009_add_initiatives.sql'), 'utf8')
});

migrations.push({
  version: 10,
  name: 'learning_corner_refresh',
  sql: fs.readFileSync(path.join(backendDirectory, 'migrations', 'sqlite', '010_learning_corner_refresh.sql'), 'utf8')
});

migrations.push({
  version: 11,
  name: 'publish_learning_categories',
  sql: fs.readFileSync(path.join(backendDirectory, 'migrations', 'sqlite', '011_publish_learning_categories.sql'), 'utf8')
});

function resolveDatabasePath() {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/cybershield.db';
  }
  const configuredPath = process.env.DATABASE_PATH || './data/cybershield.db';
  if (configuredPath === ':memory:') return configuredPath;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(backendDirectory, configuredPath);
}

function runMigrations(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const hasMigration = connection.prepare(
    'SELECT 1 FROM schema_migrations WHERE version = ?'
  );
  const recordMigration = connection.prepare(
    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
  );

  const applyMigration = connection.transaction((migration) => {
    connection.exec(migration.sql);
    recordMigration.run(migration.version, migration.name);
  });

  migrations.forEach((migration) => {
    if (!hasMigration.get(migration.version)) applyMigration(migration);
  });
}

function initializeDatabase() {
  if (database) return database;
  if (env.DB_CLIENT !== 'sqlite') {
    throw new Error('SQLite repository access is disabled when DB_CLIENT is postgres.');
  }

  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  runMigrations(database);

  return database;
}

function getDatabase() {
  return database || initializeDatabase();
}

function closeDatabase() {
  if (!database) return;
  database.close();
  database = undefined;
}

module.exports = {
  closeDatabase,
  getDatabase,
  initializeDatabase,
  resolveDatabasePath
};
