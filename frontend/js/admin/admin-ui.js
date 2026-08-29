(() => {
  'use strict';

  const labels = Object.freeze({
    financial_fraud: 'Financial Fraud',
    safety_related: 'Safety Related',
    other_cybercrime: 'Other Cybercrime',
    submitted: 'Submitted',
    under_review: 'Under Review',
    information_required: 'Information Required',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    confirmed_duplicate: 'Confirmed Duplicate',
    published_demo_flag: 'Published Review Flag',
    rejected: 'Rejected',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  });

  function label(value) {
    return labels[value] || value || 'Not provided';
  }

  function formatDate(value, includeTime = false) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' } : {})
    }).format(date);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function badge(kind, value) {
    const element = document.createElement('span');
    element.className = kind === 'status' ? 'status-badge' : 'priority-badge';
    element.dataset[kind] = value;
    element.textContent = label(value);
    return element;
  }

  function cell(cellLabel, content) {
    const element = document.createElement('td');
    element.dataset.label = cellLabel;
    if (content instanceof Node) element.append(content);
    else element.textContent = content ?? '';
    return element;
  }

  function setLive(element, message, type = '') {
    element.textContent = message;
    if (type) element.dataset.type = type;
    else delete element.dataset.type;
  }

  window.CyberShieldAdminUi = { badge, cell, formatDate, formatSize, label, setLive };
})();
