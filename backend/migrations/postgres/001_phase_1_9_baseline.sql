CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
  email TEXT UNIQUE, phone TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE TABLE complaints (
  id BIGSERIAL PRIMARY KEY, complaint_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('financial_fraud','safety_related','other_cybercrime')),
  subcategory TEXT, incident_title TEXT NOT NULL, incident_description TEXT NOT NULL,
  incident_date DATE NOT NULL, incident_time TEXT, incident_location TEXT, platform TEXT,
  financial_loss NUMERIC NOT NULL DEFAULT 0 CHECK (financial_loss >= 0), suspect_name TEXT,
  suspect_phone TEXT, suspect_email TEXT, suspect_username TEXT, suspect_website TEXT,
  complainant_name TEXT NOT NULL, complainant_email TEXT NOT NULL, complainant_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','information_required','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE otp_requests (
  id BIGSERIAL PRIMARY KEY, identifier TEXT NOT NULL, method TEXT NOT NULL CHECK (method IN ('email','phone')),
  otp_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE complaint_evidence (
  id BIGSERIAL PRIMARY KEY, public_evidence_id TEXT NOT NULL UNIQUE,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
  stored_filename TEXT NOT NULL UNIQUE, original_filename TEXT NOT NULL,
  file_extension TEXT NOT NULL CHECK (file_extension IN ('jpg','jpeg','png','pdf')),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','application/pdf')),
  file_size BIGINT NOT NULL CHECK (file_size > 0), file_hash TEXT NOT NULL,
  upload_status TEXT NOT NULL CHECK (upload_status IN ('pending','accepted','rejected')), created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE complaint_notes (
  id BIGSERIAL PRIMARY KEY, public_note_id TEXT NOT NULL UNIQUE,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
  admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note TEXT NOT NULL CHECK (char_length(note) BETWEEN 2 AND 3000), created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY, public_audit_id TEXT NOT NULL UNIQUE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('user','admin','anonymous')),
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_public_id TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, ip_address TEXT, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE complaint_status_history (
  id BIGSERIAL PRIMARY KEY, public_history_id TEXT NOT NULL UNIQUE,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
  from_status TEXT, to_status TEXT NOT NULL, user_visible_message TEXT NOT NULL,
  changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY, public_notification_id TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  complaint_id BIGINT REFERENCES complaints(id) ON DELETE RESTRICT,
  type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, action_url TEXT,
  event_key TEXT NOT NULL UNIQUE, is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TIMESTAMPTZ NOT NULL, read_at TIMESTAMPTZ
);
CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY, public_delivery_id TEXT NOT NULL UNIQUE,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email')),
  provider TEXT NOT NULL CHECK (provider IN ('development','resend')),
  recipient TEXT, status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0, last_error_code TEXT, created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, UNIQUE(notification_id, channel)
);
CREATE TABLE notification_preferences (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  email_enabled INTEGER NOT NULL DEFAULT 0, status_updates_enabled INTEGER NOT NULL DEFAULT 1,
  information_required_enabled INTEGER NOT NULL DEFAULT 1, resolution_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE complaint_user_messages (
  id BIGSERIAL PRIMARY KEY, public_message_id TEXT NOT NULL UNIQUE,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE RESTRICT,
  sender_admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 1000), created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE suspicious_reports (
  id BIGSERIAL PRIMARY KEY, public_report_id TEXT NOT NULL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL, normalized_identifier TEXT NOT NULL, identifier_hash TEXT NOT NULL,
  category TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE notifications ADD COLUMN suspicious_report_id BIGINT REFERENCES suspicious_reports(id) ON DELETE RESTRICT;
CREATE TABLE suspicious_report_evidence (
  id BIGSERIAL PRIMARY KEY, public_evidence_id TEXT NOT NULL UNIQUE,
  suspicious_report_id BIGINT NOT NULL REFERENCES suspicious_reports(id) ON DELETE RESTRICT,
  stored_filename TEXT NOT NULL UNIQUE, original_filename TEXT NOT NULL, file_extension TEXT NOT NULL,
  mime_type TEXT NOT NULL, file_size BIGINT NOT NULL CHECK (file_size > 0), file_hash TEXT NOT NULL,
  upload_status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE suspicious_report_notes (
  id BIGSERIAL PRIMARY KEY, public_note_id TEXT NOT NULL UNIQUE,
  suspicious_report_id BIGINT NOT NULL REFERENCES suspicious_reports(id) ON DELETE RESTRICT,
  admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note TEXT NOT NULL CHECK (char_length(note) BETWEEN 2 AND 3000), created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE content_categories (
  id BIGSERIAL PRIMARY KEY, public_category_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE learning_articles (
  id BIGSERIAL PRIMARY KEY, public_article_id TEXT NOT NULL UNIQUE,
  category_id BIGINT NOT NULL REFERENCES content_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT NOT NULL, content TEXT NOT NULL,
  cover_image TEXT, status TEXT NOT NULL DEFAULT 'draft', is_featured INTEGER NOT NULL DEFAULT 0,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE content_tags (
  id BIGSERIAL PRIMARY KEY, public_tag_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE article_tags (
  article_id BIGINT NOT NULL REFERENCES learning_articles(id) ON DELETE RESTRICT,
  tag_id BIGINT NOT NULL REFERENCES content_tags(id) ON DELETE RESTRICT, PRIMARY KEY(article_id, tag_id)
);
CREATE TABLE faqs (
  id BIGSERIAL PRIMARY KEY, public_faq_id TEXT NOT NULL UNIQUE, category TEXT NOT NULL,
  question TEXT NOT NULL, answer TEXT NOT NULL, display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE announcements (
  id BIGSERIAL PRIMARY KEY, public_announcement_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  message TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE TABLE external_resources (
  id BIGSERIAL PRIMARY KEY, public_resource_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  description TEXT NOT NULL, url TEXT NOT NULL, resource_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE user_sessions (sid VARCHAR NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMPTZ NOT NULL);

CREATE INDEX idx_complaints_user_created ON complaints(user_id, created_at DESC);
CREATE INDEX idx_complaints_admin_list ON complaints(status, priority, updated_at DESC);
CREATE INDEX idx_evidence_complaint_created ON complaint_evidence(complaint_id, created_at DESC);
CREATE INDEX idx_audit_entity_created ON audit_logs(entity_public_id, created_at DESC);
CREATE INDEX idx_history_complaint_created ON complaint_status_history(complaint_id, created_at ASC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_suspicious_reports_hash ON suspicious_reports(identifier_type, identifier_hash);
CREATE INDEX idx_suspicious_reports_user_created ON suspicious_reports(user_id, created_at DESC);
CREATE INDEX idx_learning_articles_public ON learning_articles(status, category_id, published_at DESC);
CREATE INDEX idx_announcements_visibility ON announcements(status, starts_at, ends_at);
CREATE INDEX idx_faqs_status_order ON faqs(status, display_order);
CREATE INDEX idx_user_sessions_expire ON user_sessions(expire);
