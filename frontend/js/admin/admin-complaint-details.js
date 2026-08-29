(() => {
  'use strict';

  const ui = window.CyberShieldAdminUi;
  const transitions = Object.freeze({
    submitted: ['under_review'],
    under_review: ['information_required', 'in_progress', 'resolved'],
    information_required: ['under_review', 'in_progress'],
    in_progress: ['information_required', 'resolved'],
    resolved: ['closed', 'in_progress'],
    closed: []
  });
  let complaintId;
  let currentComplaint;

  function value(value) {
    return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
  }

  function renderDefinitions(selector, entries) {
    const list = document.querySelector(selector);
    list.replaceChildren();
    entries.forEach(([term, detail, wide = false]) => {
      const wrapper = document.createElement('div');
      const title = document.createElement('dt');
      const description = document.createElement('dd');
      if (wide) wrapper.className = 'admin-definition--wide';
      title.textContent = term;
      description.textContent = value(detail);
      wrapper.append(title, description);
      list.append(wrapper);
    });
  }

  function renderEvidence(evidence) {
    const list = document.querySelector('#admin-evidence-list');
    const empty = document.querySelector('#admin-evidence-empty');
    list.replaceChildren();
    empty.hidden = evidence.length > 0;
    evidence.forEach((item) => {
      const row = document.createElement('li');
      const details = document.createElement('div');
      const name = document.createElement('strong');
      const metadata = document.createElement('small');
      const link = document.createElement('a');
      name.textContent = item.filename;
      metadata.textContent = `${item.type} • ${ui.formatSize(item.size)} • ${ui.formatDate(item.uploadedAt, true)}`;
      link.className = 'button button--secondary';
      link.href = window.CyberShieldAdminApi.evidenceUrl(complaintId, item.evidenceId);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = item.type === 'application/pdf' ? 'Download' : 'View';
      details.append(name, metadata);
      row.append(details, link);
      list.append(row);
    });
  }

  function renderNotes(notes) {
    const list = document.querySelector('#admin-notes-list');
    const empty = document.querySelector('#admin-notes-empty');
    list.replaceChildren();
    empty.hidden = notes.length > 0;
    notes.forEach((note) => {
      const item = document.createElement('li');
      const body = document.createElement('p');
      const meta = document.createElement('small');
      body.className = 'admin-note__body';
      body.textContent = note.note;
      meta.textContent = `${note.admin.name} (${note.admin.userId}) • ${ui.formatDate(note.createdAt, true)} • ${note.noteId}`;
      item.append(body, meta);
      list.append(item);
    });
  }

  function renderUserMessages(messages) {
    const list = document.querySelector('#admin-user-messages-list');
    const empty = document.querySelector('#admin-user-messages-empty');
    list.replaceChildren();
    empty.hidden = messages.length > 0;
    messages.forEach((userMessage) => {
      const item = document.createElement('li');
      const body = document.createElement('p');
      const meta = document.createElement('small');
      body.className = 'admin-note__body';
      body.textContent = userMessage.message;
      meta.textContent = `${ui.formatDate(userMessage.createdAt, true)} • ${userMessage.messageId}`;
      item.append(body, meta);
      list.append(item);
    });
  }

  function activityDescription(item) {
    if (item.action === 'complaint_submitted') return ['Complaint Submitted', 'Fictional complaint saved in CyberShield.'];
    if (item.action === 'complaint_status_changed') {
      return ['Status changed', `${ui.label(item.metadata.from)} → ${ui.label(item.metadata.to)}`];
    }
    if (item.action === 'complaint_priority_changed') {
      return ['Priority changed', `${ui.label(item.metadata.from)} → ${ui.label(item.metadata.to)}`];
    }
    if (item.action === 'user_message_sent') {
      return ['User-visible message sent', item.metadata.messageId || 'Message recorded.'];
    }
    return ['Internal note added', item.metadata.noteId || 'Append-only note recorded.'];
  }

  function renderActivity(activity) {
    const list = document.querySelector('#admin-activity-list');
    list.replaceChildren();
    activity.forEach((event) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const description = document.createElement('p');
      const metadata = document.createElement('small');
      const [heading, detail] = activityDescription(event);
      title.textContent = heading;
      description.textContent = detail;
      metadata.textContent = `${ui.formatDate(event.createdAt, true)}${event.actor ? ` • ${event.actor.name}` : ''}`;
      item.append(title, description, metadata);
      list.append(item);
    });
  }

  function configureManagement(complaint) {
    const statusSelect = document.querySelector('#status-select');
    const statusButton = document.querySelector('#status-button');
    statusSelect.replaceChildren();
    const initial = document.createElement('option');
    initial.value = '';
    initial.textContent = transitions[complaint.status].length ? 'Choose next status' : 'No further transitions available';
    statusSelect.append(initial);
    transitions[complaint.status].forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = ui.label(status);
      statusSelect.append(option);
    });
    statusSelect.disabled = transitions[complaint.status].length === 0;
    statusButton.disabled = statusSelect.disabled;
    document.querySelector('#current-status').textContent = ui.label(complaint.status);

    const prioritySelect = document.querySelector('#priority-select');
    Array.from(prioritySelect.options).forEach((option) => {
      option.disabled = option.value === complaint.priority;
    });
    prioritySelect.value = '';
    document.querySelector('#current-priority').textContent = ui.label(complaint.priority);
    document.querySelector('#user-message-form').hidden = !complaint.submittedByAccount;
    document.querySelector('#anonymous-message-notice').hidden = complaint.submittedByAccount;
  }

  function render(data) {
    const complaint = data.complaint;
    currentComplaint = complaint;
    document.querySelector('#admin-detail-content').hidden = false;
    document.querySelector('#admin-reference').textContent = complaint.complaintId;
    document.querySelector('#admin-incident-title').textContent = complaint.incidentTitle;
    document.querySelector('#admin-status-badge').replaceChildren(ui.badge('status', complaint.status));
    document.querySelector('#admin-priority-badge').replaceChildren(ui.badge('priority', complaint.priority));
    renderDefinitions('#overview-details', [
      ['Category', ui.label(complaint.category)],
      ['Type', complaint.subcategory],
      ['Submitted', ui.formatDate(complaint.createdAt, true)],
      ['Last updated', ui.formatDate(complaint.updatedAt, true)],
      ['Submitted by account', complaint.submittedByAccount ? 'Yes' : 'No'],
      ['Public user reference', complaint.publicUserId]
    ]);
    renderDefinitions('#incident-details', [
      ['Description', complaint.incidentDescription, true],
      ['Incident date', complaint.incidentDate],
      ['Incident time', complaint.incidentTime],
      ['Location', complaint.incidentLocation],
      ['Platform', complaint.platform]
    ]);
    renderDefinitions('#source-details', [
      ['Name / display name', complaint.suspectName],
      ['Username', complaint.suspectUsername],
      ['Phone', complaint.suspectPhone],
      ['Email', complaint.suspectEmail],
      ['Website / profile', complaint.suspectWebsite, true]
    ]);
    renderDefinitions('#financial-details', [
      ['Submitted financial loss', `₹${Number(complaint.financialLoss || 0).toLocaleString('en-IN')}`]
    ]);
    renderDefinitions('#complainant-details', [
      ['Name', complaint.complainantName],
      ['Email', complaint.complainantEmail],
      ['Phone', complaint.complainantPhone]
    ]);
    renderEvidence(data.evidence);
    renderNotes(data.notes);
    renderUserMessages(data.userMessages || []);
    renderActivity(data.activity);
    configureManagement(complaint);
  }

  async function loadComplaint(message = '') {
    const live = document.querySelector('#detail-live');
    ui.setLive(live, message || 'Loading protected complaint details…');
    try {
      const response = await window.CyberShieldAdminApi.getComplaint(complaintId);
      render(response.data);
      ui.setLive(live, message || 'Complaint details loaded.', message ? 'success' : '');
    } catch (error) {
      ui.setLive(live, error.status === 404 ? 'This complaint could not be found.' : error.message, 'error');
    }
  }

  function setBusy(form, busy, label) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = busy;
    button.textContent = busy ? 'Saving…' : label;
  }

  async function initialize() {
    await window.CyberShieldAdminAuth.requireAdmin();
    complaintId = new URLSearchParams(window.location.search).get('id');
    if (!complaintId) {
      ui.setLive(document.querySelector('#detail-live'), 'No complaint reference was provided.', 'error');
      return;
    }

    const statusForm = document.querySelector('#status-form');
    const priorityForm = document.querySelector('#priority-form');
    const noteForm = document.querySelector('#note-form');
    const userMessageForm = document.querySelector('#user-message-form');
    statusForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const next = statusForm.elements.status.value;
      if (!next) return;
      if (!window.confirm(`Change complaint status from ${ui.label(currentComplaint.status)} to ${ui.label(next)}?`)) return;
      setBusy(statusForm, true, 'Update Status');
      try {
        await window.CyberShieldAdminApi.updateStatus(complaintId, next, currentComplaint.updatedAt);
        await loadComplaint('Complaint status updated and recorded in activity history.');
      } catch (error) {
        ui.setLive(document.querySelector('#detail-live'), error.message, 'error');
      } finally { setBusy(statusForm, false, 'Update Status'); }
    });
    priorityForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const next = priorityForm.elements.priority.value;
      if (!next) return;
      if (!window.confirm(`Change internal priority from ${ui.label(currentComplaint.priority)} to ${ui.label(next)}?`)) return;
      setBusy(priorityForm, true, 'Update Priority');
      try {
        await window.CyberShieldAdminApi.updatePriority(complaintId, next, currentComplaint.updatedAt);
        await loadComplaint('Complaint priority updated and recorded in activity history.');
      } catch (error) {
        ui.setLive(document.querySelector('#detail-live'), error.message, 'error');
      } finally { setBusy(priorityForm, false, 'Update Priority'); }
    });
    noteForm.elements.note.addEventListener('input', () => {
      document.querySelector('#note-count').textContent = `${noteForm.elements.note.value.length} / 3000`;
    });
    noteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!noteForm.checkValidity()) { noteForm.reportValidity(); return; }
      setBusy(noteForm, true, 'Add Internal Note');
      try {
        await window.CyberShieldAdminApi.addNote(complaintId, noteForm.elements.note.value.trim());
        noteForm.reset();
        document.querySelector('#note-count').textContent = '0 / 3000';
        await loadComplaint('Internal note added and recorded in activity history.');
      } catch (error) {
        ui.setLive(document.querySelector('#detail-live'), error.message, 'error');
      } finally { setBusy(noteForm, false, 'Add Internal Note'); }
    });
    userMessageForm.elements.message.addEventListener('input', () => {
      document.querySelector('#user-message-count').textContent = `${userMessageForm.elements.message.value.length} / 1000`;
    });
    userMessageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!userMessageForm.checkValidity()) { userMessageForm.reportValidity(); return; }
      if (!window.confirm('Send this user-visible message to the complaint account owner?')) return;
      setBusy(userMessageForm, true, 'Send User Message');
      try {
        await window.CyberShieldAdminApi.sendUserMessage(
          complaintId,
          userMessageForm.elements.message.value.trim()
        );
        userMessageForm.reset();
        document.querySelector('#user-message-count').textContent = '0 / 1000';
        await loadComplaint('User-visible message sent. Delivery depends on the user notification settings.');
      } catch (error) {
        ui.setLive(document.querySelector('#detail-live'), error.message, 'error');
      } finally { setBusy(userMessageForm, false, 'Send User Message'); }
    });
    await loadComplaint();
  }

  initialize().catch(() => {});
})();
