(() => {
  'use strict';

  const api = window.CyberShieldApi;

  function queryString(filters) {
    const parameters = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) parameters.set(key, value);
    });
    const query = parameters.toString();
    return query ? `?${query}` : '';
  }

  function getStats() {
    return api.request('/admin/dashboard/stats');
  }
  function getSuspiciousStats() { return api.request('/admin/dashboard/suspicious-stats'); }
  function getContentStats() { return api.request('/admin/content/stats'); }
  function listArticles(filters) { return api.request(`/admin/articles${queryString(filters)}`); }
  function getArticle(id) { return api.request(`/admin/articles/${encodeURIComponent(id)}`); }
  function createArticle(value) { return api.request('/admin/articles',{method:'POST',body:JSON.stringify(value)}); }
  function updateArticle(id,value) { return api.request(`/admin/articles/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(value)}); }
  function setArticleStatus(id,status,publishConfirmation=false) { return api.request(`/admin/articles/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status,publishConfirmation})}); }
  function listContentCategories() { return api.request('/admin/content/categories'); }
  function createContentCategory(value) { return api.request('/admin/content/categories',{method:'POST',body:JSON.stringify(value)}); }
  function updateContentCategory(id,value) { return api.request(`/admin/content/categories/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(value)}); }
  function listFaqs(filters={}) { return api.request(`/admin/faqs${queryString(filters)}`); }
  function createFaq(value) { return api.request('/admin/faqs',{method:'POST',body:JSON.stringify(value)}); }
  function updateFaq(id,value) { return api.request(`/admin/faqs/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(value)}); }
  function setFaqStatus(id,status) { return api.request(`/admin/faqs/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})}); }
  function listAnnouncements(filters={}) { return api.request(`/admin/announcements${queryString(filters)}`); }
  function createAnnouncement(value) { return api.request('/admin/announcements',{method:'POST',body:JSON.stringify(value)}); }
  function updateAnnouncement(id,value) { return api.request(`/admin/announcements/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(value)}); }
  function setAnnouncementStatus(id,status) { return api.request(`/admin/announcements/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})}); }
  function listInitiatives(filters={}) { return api.request(`/admin/initiatives${queryString(filters)}`); }
  function getInitiative(id) { return api.request(`/admin/initiatives/${encodeURIComponent(id)}`); }
  function createInitiative(value) { return api.request('/admin/initiatives',{method:'POST',body:JSON.stringify(value)}); }
  function updateInitiative(id,value) { return api.request(`/admin/initiatives/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(value)}); }
  function listSuspiciousReports(filters) { return api.request(`/admin/suspicious-reports${queryString(filters)}`); }
  function getSuspiciousReport(id) { return api.request(`/admin/suspicious-reports/${encodeURIComponent(id)}`); }
  function updateSuspiciousStatus(id, status, publishConfirmation = false) { return api.request(`/admin/suspicious-reports/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, publishConfirmation }) }); }
  function addSuspiciousNote(id, note) { return api.request(`/admin/suspicious-reports/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ note }) }); }
  function suspiciousEvidenceUrl(id, evidenceId) { return `${api.API_BASE_URL}/admin/suspicious-reports/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}`; }

  function listComplaints(filters) {
    return api.request(`/admin/complaints${queryString(filters)}`);
  }

  function getComplaint(complaintId) {
    return api.request(`/admin/complaints/${encodeURIComponent(complaintId)}`);
  }

  function updateStatus(complaintId, status, expectedUpdatedAt) {
    return api.request(`/admin/complaints/${encodeURIComponent(complaintId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, expectedUpdatedAt })
    });
  }

  function updatePriority(complaintId, priority, expectedUpdatedAt) {
    return api.request(`/admin/complaints/${encodeURIComponent(complaintId)}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority, expectedUpdatedAt })
    });
  }

  function addNote(complaintId, note) {
    return api.request(`/admin/complaints/${encodeURIComponent(complaintId)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  function sendUserMessage(complaintId, message) {
    return api.request(`/admin/complaints/${encodeURIComponent(complaintId)}/user-message`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  function evidenceUrl(complaintId, evidenceId) {
    return `${api.API_BASE_URL}/admin/complaints/${encodeURIComponent(complaintId)}/evidence/${encodeURIComponent(evidenceId)}`;
  }

  window.CyberShieldAdminApi = {
    addNote,
    evidenceUrl,
    getComplaint,
    getStats,
    getContentStats,
    listArticles,getArticle,createArticle,updateArticle,setArticleStatus,
    listContentCategories,createContentCategory,updateContentCategory,
    listFaqs,createFaq,updateFaq,setFaqStatus,
    listAnnouncements,createAnnouncement,updateAnnouncement,setAnnouncementStatus,
    listInitiatives,getInitiative,createInitiative,updateInitiative,
    getSuspiciousStats,
    listSuspiciousReports,
    getSuspiciousReport,
    updateSuspiciousStatus,
    addSuspiciousNote,
    suspiciousEvidenceUrl,
    listComplaints,
    sendUserMessage,
    updatePriority,
    updateStatus
  };
})();
