'use strict';

const { STATUS_TRANSITIONS } = require('../../src/services/admin.service');
const { ARTICLE_STATUS_TRANSITIONS, canTransition, isAnnouncementActive, notificationAllowed } = require('../../src/utils/workflowRules');

describe('workflow rules', () => {
  it('permits only defined complaint transitions', () => {
    expect(canTransition(STATUS_TRANSITIONS, 'submitted', 'under_review')).toBe(true);
    expect(canTransition(STATUS_TRANSITIONS, 'closed', 'in_progress')).toBe(false);
  });
  it('enforces article publication lifecycle', () => {
    expect(canTransition(ARTICLE_STATUS_TRANSITIONS, 'draft', 'published')).toBe(true);
    expect(canTransition(ARTICLE_STATUS_TRANSITIONS, 'draft', 'archived')).toBe(false);
  });
  it('uses start-inclusive and end-exclusive announcement visibility', () => {
    const now = new Date('2026-08-25T12:00:00Z');
    expect(isAnnouncementActive({ status:'published', startsAt:'2026-08-25T11:00:00Z', endsAt:'2026-08-25T13:00:00Z' }, now)).toBe(true);
    expect(isAnnouncementActive({ status:'draft', startsAt:'2026-08-25T11:00:00Z' }, now)).toBe(false);
    expect(isAnnouncementActive({ status:'published', startsAt:'2026-08-25T13:00:00Z' }, now)).toBe(false);
  });
  it('respects notification preference categories', () => {
    const preferences={status_updates_enabled:1,information_required_enabled:0,resolution_enabled:1};
    expect(notificationAllowed(preferences,'status_changed')).toBe(true);
    expect(notificationAllowed(preferences,'information_required')).toBe(false);
  });
});
