-- A published guide must have a visible topic or it cannot appear on the public Learning Corner.
UPDATE content_categories
SET is_active=1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE is_active=0 AND id IN (
  SELECT DISTINCT category_id FROM learning_articles WHERE status='published'
);
