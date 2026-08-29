(() => {
  'use strict';

  const api = window.CyberShieldApi;

  function requestOtp(method, identifier) {
    return api.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ method, identifier })
    });
  }

  function verifyOtp(method, identifier, otp, fullName) {
    return api.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        method,
        identifier,
        otp,
        ...(fullName ? { fullName } : {})
      })
    });
  }

  function getCurrentUser() {
    return api.request('/auth/me');
  }

  function getDevelopmentConfig() {
    return api.request('/auth/config');
  }

  function logout() {
    return api.request('/auth/logout', { method: 'POST' });
  }

  function listComplaints(filters = {}) {
    const parameters = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) parameters.set(key, value);
    });
    const query = parameters.toString();
    return api.request(`/users/me/complaints${query ? `?${query}` : ''}`);
  }

  function getComplaint(complaintId) {
    return api.request(`/users/me/complaints/${encodeURIComponent(complaintId)}`);
  }

  function listNotifications(filters = {}) {
    const parameters = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) parameters.set(key, value);
    });
    const query = parameters.toString();
    return api.request(`/users/me/notifications${query ? `?${query}` : ''}`);
  }

  function getUnreadCount() {
    return api.request('/users/me/notifications/unread-count');
  }

  function markNotificationRead(notificationId) {
    return api.request(`/users/me/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH'
    });
  }

  function markAllNotificationsRead() {
    return api.request('/users/me/notifications/read-all', { method: 'PATCH' });
  }

  function getNotificationPreferences() {
    return api.request('/users/me/notification-preferences');
  }

  function updateNotificationPreferences(preferences) {
    return api.request('/users/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences)
    });
  }

  function getComplaintHistory(complaintId) {
    return api.request(`/users/me/complaints/${encodeURIComponent(complaintId)}/history`);
  }

  function getEvidenceConfig() {
    return api.request('/evidence/config');
  }

  function uploadEvidence(complaintId, files) {
    const form = new FormData();
    files.forEach((file) => form.append('evidence', file, file.name));
    return api.request(`/users/me/complaints/${encodeURIComponent(complaintId)}/evidence`, {
      method: 'POST',
      body: form
    });
  }

  function listEvidence(complaintId) {
    return api.request(`/users/me/complaints/${encodeURIComponent(complaintId)}/evidence`);
  }

  function evidenceUrl(complaintId, evidenceId) {
    return `${api.API_BASE_URL}/users/me/complaints/${encodeURIComponent(complaintId)}/evidence/${encodeURIComponent(evidenceId)}`;
  }

  window.CyberShieldAuthApi = {
    getComplaint,
    getCurrentUser,
    getComplaintHistory,
    getDevelopmentConfig,
    getEvidenceConfig,
    getNotificationPreferences,
    getUnreadCount,
    evidenceUrl,
    listEvidence,
    listComplaints,
    listNotifications,
    logout,
    markAllNotificationsRead,
    markNotificationRead,
    requestOtp,
    uploadEvidence,
    updateNotificationPreferences,
    verifyOtp
  };
})();
