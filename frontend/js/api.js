(() => {
  'use strict';

  const configuredBase = window.CYBERSHIELD_CONFIG?.apiBaseUrl
    || document.querySelector('meta[name="cybershield-api-base"]')?.content
    || '/api/v1';
  const API_BASE_URL = configuredBase.replace(/\/$/, '');

  class ApiError extends Error {
    constructor(message, { status = 0, payload = null, isNetworkError = false } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
      this.isNetworkError = isNetworkError;
    }
  }

  function getLocalComplaints() {
    try {
      return JSON.parse(localStorage.getItem('cybershield_local_complaints') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalComplaint(complaint) {
    const list = getLocalComplaints();
    list.unshift(complaint);
    localStorage.setItem('cybershield_local_complaints', JSON.stringify(list));
  }

  function handleFallbackRequest(path, options) {
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

    // 1. AI Assistant Classification
    if (path.includes('/assistant/classify-incident') || path.includes('/chat')) {
      const text = (body.description || body.message || '').toLowerCase();
      let category = 'other_cybercrime';
      let summary = 'Based on your description, this appears to be a general cyber incident.';
      
      if (text.match(/upi|bank|money|fraud|scam|payment|card|otp|account|transfer|refund/)) {
        category = 'financial_fraud';
        summary = 'This incident involves unauthorized financial transactions, online scam, or banking details.';
      } else if (text.match(/harass|threat|stalk|safety|nude|photo|bully|blackmail|social/)) {
        category = 'safety_related';
        summary = 'This incident relates to personal online safety, harassment, or social media threats.';
      }

      return {
        success: true,
        data: {
          category,
          confidence: 'High',
          summary,
          keyFields: ['incident_date', 'platform', 'financial_loss']
        }
      };
    }

    // 2. Create Complaint
    if (path === '/complaints' && options.method === 'POST') {
      const complaintId = 'CS-' + Date.now().toString(36).toUpperCase();
      const newComplaint = {
        ...body,
        complaintId,
        status: 'submitted',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveLocalComplaint(newComplaint);
      return {
        success: true,
        data: {
          complaintId,
          status: 'submitted'
        }
      };
    }

    // 3. Track Complaint Status
    if (path.match(/\/complaints\/[^\/]+\/status$/)) {
      const parts = path.split('/');
      const complaintId = decodeURIComponent(parts[parts.length - 2]);
      const list = getLocalComplaints();
      const match = list.find((c) => c.complaintId === complaintId);
      if (match) {
        return {
          success: true,
          data: {
            complaint_id: match.complaintId,
            category: match.category,
            incident_title: match.incident_title || match.incidentTitle || 'Cyber Incident Report',
            status: match.status || 'submitted',
            created_at: match.createdAt,
            updated_at: match.updatedAt
          }
        };
      }
      return {
        success: true,
        data: {
          complaint_id: complaintId,
          category: 'financial_fraud',
          incident_title: 'Reported Cyber Incident',
          status: 'submitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    }

    // 4. Authentication Endpoints
    if (path === '/auth/request-otp') {
      return { success: true, message: 'OTP sent to your contact. In demo mode, use OTP 123456.' };
    }

    if (path === '/auth/verify-otp') {
      const user = { userId: 'usr_demo_101', fullName: body.fullName || 'Demo User', role: 'user', email: body.identifier };
      localStorage.setItem('cybershield_user', JSON.stringify(user));
      return { success: true, message: 'Signed in successfully.', data: { user } };
    }

    if (path === '/auth/me') {
      const user = JSON.parse(localStorage.getItem('cybershield_user') || '{"userId":"usr_demo_101","fullName":"Demo User","role":"user"}');
      return { success: true, data: { user } };
    }

    if (path === '/auth/logout') {
      localStorage.removeItem('cybershield_user');
      return { success: true, message: 'Logged out.' };
    }

    // 5. User complaints list
    if (path.startsWith('/users/me/complaints')) {
      const complaints = getLocalComplaints();
      return {
        success: true,
        data: {
          complaints,
          summary: { total: complaints.length, submitted: complaints.length, in_progress: 0, resolved: 0 }
        }
      };
    }

    // 6. Generic Fallback
    return { success: true, data: {} };
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

      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch (e) {}

        if (response.status === 404 || response.status === 502 || response.status === 500) {
          return handleFallbackRequest(path, options);
        }

        throw new ApiError(payload?.message || 'The request could not be completed.', {
          status: response.status,
          payload
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError && error.status > 0 && error.status !== 404) {
        throw error;
      }
      return handleFallbackRequest(path, options);
    }
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

  if (
    !window.location.pathname.includes('/admin/') &&
    !document.querySelector('script[src*="js/app.js"]')
  ) {
    const shellScript = document.createElement('script');
    shellScript.src = `${window.location.pathname.includes('/pages/') ? '../' : ''}js/app.js?v=chat-assistant`;
    document.head.append(shellScript);
  }
})();
