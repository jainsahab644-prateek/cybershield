(() => {
  'use strict';

  const labels = {
    financial_fraud: 'Financial Fraud',
    safety_related: 'Safety Related',
    other_cybercrime: 'Other Cybercrime',
    submitted: 'Submitted',
    under_review: 'Under Review',
    information_required: 'Information Required',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  function formatDate(value) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
  }

  function cell(label, content) {
    const element = document.createElement('td');
    element.dataset.label = label;
    if (content instanceof Node) element.append(content);
    else element.textContent = content;
    return element;
  }

  function renderRows(complaints) {
    const body = document.querySelector('#complaint-rows');
    const empty = document.querySelector('#dashboard-empty');
    body.replaceChildren();
    empty.hidden = complaints.length > 0;
    complaints.forEach((complaint) => {
      const row = document.createElement('tr');
      const link = document.createElement('a');
      const status = document.createElement('span');
      link.href = `complaint-details.html?id=${encodeURIComponent(complaint.complaintId)}`;
      link.textContent = complaint.complaintId;
      status.className = 'status-badge';
      status.dataset.status = complaint.status;
      status.textContent = labels[complaint.status] || complaint.status;
      row.append(
        cell('Reference', link),
        cell('Incident', complaint.incidentTitle),
        cell('Category', labels[complaint.category] || complaint.category),
        cell('Status', status),
        cell('Submitted', formatDate(complaint.createdAt))
      );
      body.append(row);
    });
  }

  function renderSummary(summary) {
    document.querySelector('#summary-total').textContent = summary.total;
    document.querySelector('#summary-submitted').textContent = summary.submitted;
    document.querySelector('#summary-progress').textContent = summary.inProgress;
    document.querySelector('#summary-resolved').textContent = summary.resolved;
  }

  function renderPagination(pagination) {
    document.querySelector('#page-status').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    document.querySelector('#previous-page').disabled = pagination.page <= 1;
    document.querySelector('#next-page').disabled = pagination.page >= pagination.totalPages;
  }

  async function loadRecentNotifications() {
    const list = document.querySelector('#recent-notifications');
    const live = document.querySelector('#recent-notifications-live');
    try {
      const response = await window.CyberShieldAuthApi.listNotifications({ page: 1, limit: 5 });
      list.replaceChildren();
      response.data.notifications.forEach((notification) => {
        const item = document.createElement('li');
        const title = document.createElement('strong');
        const message = document.createElement('p');
        const timestamp = document.createElement('small');
        item.dataset.read = String(notification.isRead);
        title.textContent = notification.title;
        message.textContent = notification.message;
        timestamp.textContent = formatDate(notification.createdAt);
        item.append(title, message, timestamp);
        list.append(item);
      });
      live.textContent = response.data.notifications.length
        ? ''
        : "You don't have any notifications yet.";
    } catch (error) { live.textContent = error.message; }
  }

  async function initialize() {
    const user = await window.CyberShieldAuthGuard.requireUser();
    document.querySelector('#dashboard-name').textContent = user.fullName;
    const form = document.querySelector('#dashboard-filters');
    const liveStatus = document.querySelector('#dashboard-status');
    let page = 1;

    async function loadComplaints() {
      liveStatus.textContent = 'Loading your complaints…';
      try {
        const response = await window.CyberShieldAuthApi.listComplaints({
          page,
          limit: 10,
          status: form.elements.status.value,
          category: form.elements.category.value
        });
        renderRows(response.data.complaints);
        renderSummary(response.data.summary);
        renderPagination(response.data.pagination);
        liveStatus.textContent = response.data.pagination.total
          ? `${response.data.pagination.total} report${response.data.pagination.total === 1 ? '' : 's'} found.`
          : 'No reports match these filters.';
      } catch (error) {
        liveStatus.textContent = error.message;
      }
    }

    form.addEventListener('change', () => { page = 1; loadComplaints(); });
    document.querySelector('#previous-page').addEventListener('click', () => { page -= 1; loadComplaints(); });
    document.querySelector('#next-page').addEventListener('click', () => { page += 1; loadComplaints(); });
    await Promise.all([loadComplaints(), loadRecentNotifications()]);
  }

  initialize().catch(() => {});
})();
