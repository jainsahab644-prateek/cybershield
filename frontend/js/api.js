(() => {
  'use strict';

  // Determine the correct API base:
  // 1. If a meta tag or global config is set, use that.
  // 2. Otherwise, when on Netlify (not localhost), use the deployed Render backend.
  // 3. In local development, use the same-origin /api/v1.
  const configuredBase = window.CYBERSHIELD_CONFIG?.apiBaseUrl
    || document.querySelector('meta[name="cybershield-api-base"]')?.content;

  let API_BASE_URL;
  if (configuredBase) {
    API_BASE_URL = configuredBase.replace(/\/$/, '');
  } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production on Netlify — point to Render backend
    API_BASE_URL = 'https://cybershield-backend.onrender.com/api/v1';
  } else {
    // Local development — backend is on same machine
    API_BASE_URL = '/api/v1';
  }

  class ApiError extends Error {
    constructor(message, { status = 0, payload = null, isNetworkError = false } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
      this.isNetworkError = isNetworkError;
    }
  }

  async function request(path, options = {}) {
    let response;
    try {
      const isFormData = options.body instanceof FormData;
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers
        }
      });
    } catch (error) {
      throw new ApiError(
        'CyberShield is temporarily unavailable. Please try again.',
        { isNetworkError: true }
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiError('CyberShield returned an unreadable response.', {
        status: response.status
      });
    }

    if (!response.ok) {
      throw new ApiError(payload.message || 'The request could not be completed.', {
        status: response.status,
        payload
      });
    }

    return payload;
  }

  async function createComplaint(complaint) {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint)
    });
  }

  async function trackComplaint(complaintId) {
    return request(`/complaints/${encodeURIComponent(complaintId)}/status`);
  }

  async function classifyIncident(description) {
    return request('/assistant/classify-incident', {
      method: 'POST',
      body: JSON.stringify({ description })
    });
  }

  window.CyberShieldApi = {
    API_BASE_URL,
    ApiError,
    classifyIncident,
    createComplaint,
    request,
    trackComplaint
  };

  // Some compact citizen pages predate the shared shell. Load it there so
  // accessibility helpers and the lazy assistant launcher remain consistent.
  if (
    !window.location.pathname.includes('/admin/') &&
    !document.querySelector('script[src*="js/app.js"]')
  ) {
    const shellScript = document.createElement('script');
    shellScript.src = `${window.location.pathname.includes('/pages/') ? '../' : ''}js/app.js?v=chat-assistant`;
    document.head.append(shellScript);
  }
})();
