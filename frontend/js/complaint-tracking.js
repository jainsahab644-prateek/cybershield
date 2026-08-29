(() => {
  'use strict';

  const statusLabels = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    information_required: 'Information Required',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };
  const categoryLabels = {
    financial_fraud: 'Financial Fraud',
    safety_related: 'Safety Related Cybercrime',
    other_cybercrime: 'Other Cybercrime'
  };
  const timelineStatuses = ['submitted', 'under_review', 'in_progress', 'resolved', 'closed'];

  const form = document.querySelector('#tracking-form');
  const input = document.querySelector('#complaint-reference');
  const button = document.querySelector('#track-button');
  const error = document.querySelector('#tracking-error');
  const liveStatus = document.querySelector('#tracking-live-status');
  const result = document.querySelector('#tracking-result');
  let isLoading = false;

  function normalizeReference(value) {
    return value.trim().toUpperCase();
  }

  function isValidReference(value) {
    return /^CSR-\d{4}-[A-Z0-9]{6}$/.test(value);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function createDetail(term, value) {
    const wrapper = document.createElement('div');
    const label = document.createElement('dt');
    const description = document.createElement('dd');
    label.textContent = term;
    description.textContent = value;
    wrapper.append(label, description);
    return wrapper;
  }

  function renderTimeline(container, currentStatus) {
    container.replaceChildren();
    const currentStage = currentStatus === 'information_required' ? 'under_review' : currentStatus;
    const currentIndex = timelineStatuses.indexOf(currentStage);
    timelineStatuses.forEach((statusName, index) => {
      const item = document.createElement('li');
      const marker = document.createElement('span');
      const label = document.createElement('strong');
      marker.textContent = index < currentIndex ? '✓' : statusName === currentStage ? '●' : '○';
      label.textContent = statusLabels[statusName];
      if (statusName === currentStage) {
        item.className = 'is-current';
        item.setAttribute('aria-current', 'step');
      }
      if (index < currentIndex) item.classList.add('is-complete');
      item.append(marker, label);
      container.append(item);
    });
  }

  function renderResult(data) {
    const details = document.querySelector('#tracking-details');
    const badge = document.querySelector('#tracking-status-badge');
    const timeline = document.querySelector('#status-timeline');
    const informationRequired = document.querySelector('#information-required-note');

    details.replaceChildren(
      createDetail('Reference ID', data.complaintId),
      createDetail('Category', categoryLabels[data.category] || data.category),
      createDetail('Incident', data.incidentTitle),
      createDetail('Status', statusLabels[data.status] || data.status),
      createDetail('Submitted', formatDate(data.createdAt)),
      createDetail('Last updated', formatDate(data.updatedAt))
    );
    badge.textContent = statusLabels[data.status] || data.status;
    badge.dataset.status = data.status;
    renderTimeline(timeline, data.status);
    informationRequired.hidden = data.status !== 'information_required';
    result.hidden = false;
    result.focus();
  }

  function showError(message) {
    error.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    result.hidden = true;
    liveStatus.textContent = message;
  }

  function clearError() {
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    liveStatus.textContent = '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isLoading) return;
    clearError();
    const reference = normalizeReference(input.value);
    input.value = reference;

    if (!isValidReference(reference)) {
      showError('Enter a reference ID in the format CSR-YYYY-XXXXXX.');
      input.focus();
      return;
    }

    isLoading = true;
    button.disabled = true;
    button.textContent = 'Checking your report…';
    liveStatus.textContent = 'Checking your complaint status…';

    try {
      const response = await window.CyberShieldApi.trackComplaint(reference);
      renderResult(response.data);
      liveStatus.textContent = 'Complaint status loaded.';
    } catch (apiError) {
      if (apiError.isNetworkError) {
        showError('CyberShield is temporarily unavailable. Please try again.');
      } else if (apiError.status === 404) {
        showError('Complaint not found. Check the reference ID and try again.');
      } else {
        showError(apiError.message || 'The complaint status could not be loaded.');
      }
    } finally {
      isLoading = false;
      button.disabled = false;
      button.textContent = 'Track Complaint';
    }
  });

  input.addEventListener('input', clearError);

  const initialReference = new URLSearchParams(window.location.search).get('id');
  if (initialReference) {
    input.value = normalizeReference(initialReference);
    form.requestSubmit();
  }
})();
