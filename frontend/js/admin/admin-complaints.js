(() => {
  'use strict';

  const ui = window.CyberShieldAdminUi;

  function renderRows(complaints) {
    const body = document.querySelector('#admin-complaint-rows');
    const empty = document.querySelector('#complaints-empty');
    body.replaceChildren();
    empty.hidden = complaints.length > 0;
    complaints.forEach((complaint) => {
      const row = document.createElement('tr');
      const reference = document.createElement('code');
      const action = document.createElement('a');
      reference.textContent = complaint.complaintId;
      action.className = 'button button--secondary';
      action.href = `complaint-details.html?id=${encodeURIComponent(complaint.complaintId)}`;
      action.textContent = 'Review';
      row.append(
        ui.cell('Reference ID', reference),
        ui.cell('Incident', complaint.incidentTitle),
        ui.cell('Category', ui.label(complaint.category)),
        ui.cell('Complainant', complaint.complainantName),
        ui.cell('Priority', ui.badge('priority', complaint.priority)),
        ui.cell('Status', ui.badge('status', complaint.status)),
        ui.cell('Submitted', ui.formatDate(complaint.createdAt)),
        ui.cell('Evidence', String(complaint.evidenceCount)),
        ui.cell('Action', action)
      );
      body.append(row);
    });
  }

  async function initialize() {
    await window.CyberShieldAdminAuth.requireAdmin();
    const form = document.querySelector('#admin-filters');
    const live = document.querySelector('#complaints-live');
    const previous = document.querySelector('#admin-previous');
    const next = document.querySelector('#admin-next');
    let page = 1;

    async function load() {
      previous.disabled = true;
      next.disabled = true;
      ui.setLive(live, 'Loading filtered complaints…');
      try {
        const response = await window.CyberShieldAdminApi.listComplaints({
          page,
          limit: 20,
          search: form.elements.search.value.trim(),
          status: form.elements.status.value,
          category: form.elements.category.value,
          priority: form.elements.priority.value,
          sort: form.elements.sort.value
        });
        const { complaints, pagination } = response.data;
        renderRows(complaints);
        document.querySelector('#admin-page-status').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
        previous.disabled = pagination.page <= 1;
        next.disabled = pagination.page >= pagination.totalPages;
        ui.setLive(live, pagination.total
          ? `${pagination.total} complaint${pagination.total === 1 ? '' : 's'} found.`
          : 'No complaints match the selected filters.');
      } catch (error) {
        ui.setLive(live, error.message, 'error');
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      page = 1;
      load();
    });
    document.querySelector('#clear-filters').addEventListener('click', () => {
      form.reset();
      page = 1;
      load();
    });
    previous.addEventListener('click', () => { page -= 1; load(); });
    next.addEventListener('click', () => { page += 1; load(); });
    await load();
  }

  initialize().catch(() => {});
})();
