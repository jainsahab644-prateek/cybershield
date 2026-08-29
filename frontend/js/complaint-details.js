(() => {
  'use strict';

  const labels = {
    financial_fraud: 'Financial Fraud',
    safety_related: 'Safety Related Cybercrime',
    other_cybercrime: 'Other Cybercrime',
    submitted: 'Submitted',
    under_review: 'Under Review',
    information_required: 'Information Required',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  function valueOrNotProvided(value) {
    return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
  }

  function addDefinition(list, term, value) {
    const wrapper = document.createElement('div');
    const title = document.createElement('dt');
    const description = document.createElement('dd');
    title.textContent = term;
    description.textContent = valueOrNotProvided(value);
    wrapper.append(title, description);
    list.append(wrapper);
  }

  function renderSection(id, entries) {
    const list = document.querySelector(id);
    entries.forEach(([term, value]) => addDefinition(list, term, value));
  }

  function renderEvidenceItems(complaintId, evidence) {
    const list = document.querySelector('#detail-evidence-list');
    list.replaceChildren();
    evidence.forEach((item) => {
      const row = document.createElement('li');
      const icon = document.createElement('span');
      const details = document.createElement('div');
      const name = document.createElement('strong');
      const meta = document.createElement('small');
      const link = document.createElement('a');
      icon.className = 'evidence-file__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = item.type === 'application/pdf' ? 'PDF' : 'IMG';
      name.textContent = item.filename;
      meta.textContent = `${item.type} • ${window.CyberShieldEvidence.formatSize(item.size)} • ${new Date(item.uploadedAt).toLocaleDateString('en-IN')}`;
      link.className = 'button button--secondary';
      link.href = window.CyberShieldAuthApi.evidenceUrl(complaintId, item.evidenceId);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = item.type === 'application/pdf' ? 'Download' : 'View';
      details.append(name, meta);
      row.append(icon, details, link);
      list.append(row);
    });
  }

  async function loadCommunication(complaintId) {
    const response = await window.CyberShieldAuthApi.getComplaintHistory(complaintId);
    const historyList = document.querySelector('#complaint-status-history');
    historyList.replaceChildren();
    response.data.history.forEach((event) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const message = document.createElement('p');
      const time = document.createElement('time');
      title.textContent = labels[event.status] || event.status;
      message.textContent = event.message;
      time.dateTime = event.createdAt;
      time.textContent = new Date(event.createdAt).toLocaleString('en-IN');
      item.append(title, message, time);
      historyList.append(item);
    });

    const section = document.querySelector('#complaint-messages-section');
    const messageList = document.querySelector('#complaint-user-messages');
    messageList.replaceChildren();
    section.hidden = response.data.messages.length === 0;
    response.data.messages.forEach((userMessage) => {
      const item = document.createElement('li');
      const label = document.createElement('strong');
      const message = document.createElement('p');
      const time = document.createElement('time');
      label.textContent = 'CyberShield Admin Message';
      message.textContent = userMessage.message;
      time.dateTime = userMessage.createdAt;
      time.textContent = new Date(userMessage.createdAt).toLocaleString('en-IN');
      item.append(label, message, time);
      messageList.append(item);
    });
  }

  async function initializeEvidence(complaint) {
    const status = document.querySelector('#detail-evidence-status');
    const form = document.querySelector('#add-evidence-form');
    const uploadButton = document.querySelector('#upload-evidence-button');
    const selection = window.CyberShieldEvidence.create(
      document.querySelector('#detail-evidence-picker')
    );
    const immutable = ['resolved', 'closed'].includes(complaint.status);

    async function loadEvidence() {
      const response = await window.CyberShieldAuthApi.listEvidence(complaint.complaintId);
      const evidence = response.data.evidence;
      renderEvidenceItems(complaint.complaintId, evidence);
      selection.setExistingCount(evidence.length);
      status.textContent = evidence.length
        ? `${evidence.length} evidence file${evidence.length === 1 ? '' : 's'} attached.`
        : 'No evidence is attached to this report.';
    }

    if (immutable) {
      selection.setDisabled(true, 'Evidence cannot be added to this report in its current status.');
      uploadButton.disabled = true;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const files = selection.files();
      if (files.length === 0) {
        status.textContent = 'Select at least one evidence file.';
        return;
      }
      uploadButton.disabled = true;
      status.textContent = 'Uploading evidence...';
      try {
        await window.CyberShieldAuthApi.uploadEvidence(complaint.complaintId, files);
        selection.clear();
        await loadEvidence();
      } catch (error) {
        status.textContent = error.message || 'Evidence could not be uploaded.';
      } finally {
        if (!immutable) uploadButton.disabled = false;
      }
    });

    try {
      await loadEvidence();
    } catch (error) {
      status.textContent = error.message || 'Evidence could not be loaded.';
    }
  }

  async function initialize() {
    await window.CyberShieldAuthGuard.requireUser();
    const complaintId = new URLSearchParams(window.location.search).get('id');
    const status = document.querySelector('#detail-status');
    if (!complaintId) {
      status.textContent = 'No report reference was provided.';
      return;
    }
    try {
      const response = await window.CyberShieldAuthApi.getComplaint(complaintId);
      const complaint = response.data.complaint;
      document.querySelector('#detail-content').hidden = false;
      document.querySelector('#detail-reference').textContent = complaint.complaintId;
      document.querySelector('#detail-title').textContent = complaint.incidentTitle;
      const badge = document.querySelector('#detail-badge');
      badge.dataset.status = complaint.status;
      badge.textContent = labels[complaint.status] || complaint.status;
      renderSection('#incident-details', [
        ['Category', labels[complaint.category] || complaint.category],
        ['Type', complaint.subcategory],
        ['Description', complaint.incidentDescription],
        ['Incident date', complaint.incidentDate],
        ['Incident time', complaint.incidentTime],
        ['Location', complaint.incidentLocation],
        ['Platform', complaint.platform],
        ['Financial loss', complaint.category === 'financial_fraud' ? `₹${Number(complaint.financialLoss).toLocaleString('en-IN')}` : 'Not applicable']
      ]);
      renderSection('#source-details', [
        ['Name', complaint.suspectName],
        ['Phone', complaint.suspectPhone],
        ['Email', complaint.suspectEmail],
        ['Username', complaint.suspectUsername],
        ['Website', complaint.suspectWebsite]
      ]);
      renderSection('#complainant-details', [
        ['Name', complaint.complainantName],
        ['Email', complaint.complainantEmail],
        ['Phone', complaint.complainantPhone]
      ]);
      renderSection('#record-details', [
        ['Submitted', new Date(complaint.createdAt).toLocaleString('en-IN')],
        ['Last updated', new Date(complaint.updatedAt).toLocaleString('en-IN')]
      ]);
      await Promise.all([initializeEvidence(complaint), loadCommunication(complaint.complaintId)]);
      status.textContent = '';
    } catch (error) {
      status.textContent = error.status === 404
        ? 'This report could not be found for your account.'
        : error.message;
    }
  }

  initialize().catch(() => {});
})();
