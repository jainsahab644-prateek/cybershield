CREATE INDEX IF NOT EXISTS idx_complaints_status_priority_updated
  ON complaints(status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type_created
  ON audit_logs(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faqs_category_status_order
  ON faqs(category, status, display_order);
