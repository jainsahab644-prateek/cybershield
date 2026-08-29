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

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
  }

  async function copyReference(reference, statusElement) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference);
      } else if (!fallbackCopy(reference)) {
        throw new Error('Copy unavailable');
      }
      statusElement.textContent = 'Reference ID copied.';
    } catch (error) {
      statusElement.textContent = 'Copy was unavailable. Select and copy the reference ID manually.';
    }
  }

  const success = window.CyberShieldStorage.loadSuccess();
  const content = document.querySelector('#success-content');
  const unavailable = document.querySelector('#success-unavailable');

  if (!success?.complaintId) {
    content.hidden = true;
    unavailable.hidden = false;
    return;
  }

  const reference = document.querySelector('#success-reference');
  const status = document.querySelector('#success-status');
  const createdAt = document.querySelector('#success-created-at');
  const copyStatus = document.querySelector('#copy-status');
  const trackLink = document.querySelector('#success-track-link');

  reference.textContent = success.complaintId;
  status.textContent = statusLabels[success.status] || success.status;
  status.dataset.status = success.status;
  createdAt.textContent = formatDateTime(success.createdAt);
  trackLink.href = `track-complaint.html?id=${encodeURIComponent(success.complaintId)}`;
  const evidenceResult = document.querySelector('#success-evidence-result');
  if (success.evidenceUploadFailed) {
    evidenceResult.hidden = false;
    evidenceResult.classList.add('evidence-result--warning');
    evidenceResult.textContent = 'Your complaint was created, but the evidence upload did not finish. Signed-in users can try again from My Reports.';
  } else if (success.evidenceCount > 0) {
    evidenceResult.hidden = false;
    evidenceResult.textContent = `Evidence attached: ${success.evidenceCount} file${success.evidenceCount === 1 ? '' : 's'}.`;
  }
  document.querySelector('#copy-reference').addEventListener('click', () => {
    copyReference(success.complaintId, copyStatus);
  });

  window.CyberShieldAuthApi?.getCurrentUser()
    .then(() => {
      document.querySelector('#success-dashboard-link').hidden = false;
    })
    .catch(() => {});
})();
