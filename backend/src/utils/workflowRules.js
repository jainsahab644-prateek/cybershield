'use strict';

const ARTICLE_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['published']),
  published: Object.freeze(['archived', 'draft']),
  archived: Object.freeze(['draft'])
});

function canTransition(map, current, next) {
  return Boolean(map[current]?.includes(next));
}

function isAnnouncementActive(announcement, now = new Date()) {
  if (announcement.status !== 'published') return false;
  const current = now.valueOf();
  const starts = new Date(announcement.starts_at ?? announcement.startsAt).valueOf();
  const endValue = announcement.ends_at ?? announcement.endsAt;
  const ends = endValue ? new Date(endValue).valueOf() : Number.POSITIVE_INFINITY;
  return Number.isFinite(starts) && starts <= current && current < ends;
}

function notificationAllowed(preferences, type) {
  if (!preferences) return false;
  if (type === 'information_required') return Boolean(preferences.information_required_enabled);
  if (['complaint_resolved', 'complaint_closed'].includes(type)) return Boolean(preferences.resolution_enabled);
  return Boolean(preferences.status_updates_enabled);
}

module.exports = { ARTICLE_STATUS_TRANSITIONS, canTransition, isAnnouncementActive, notificationAllowed };
