(() => {
  'use strict';

  const ui = window.CyberShieldAdminUi;
  const statusKeys = [
    ['submitted', 'submitted'],
    ['under_review', 'underReview'],
    ['information_required', 'informationRequired'],
    ['in_progress', 'inProgress'],
    ['resolved', 'resolved'],
    ['closed', 'closed']
  ];

  function renderRecent(complaints) {
    const body = document.querySelector('#recent-complaints');
    const empty = document.querySelector('#recent-empty');
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
        ui.cell('Priority', ui.badge('priority', complaint.priority)),
        ui.cell('Status', ui.badge('status', complaint.status)),
        ui.cell('Submitted', ui.formatDate(complaint.createdAt)),
        ui.cell('Action', action)
      );
      body.append(row);
    });
  }

  function renderDistribution(statuses) {
    const list = document.querySelector('#status-distribution');
    const maximum = Math.max(1, ...statusKeys.map(([, key]) => statuses[key]));
    list.replaceChildren();
    statusKeys.forEach(([status, key]) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const track = document.createElement('span');
      const fill = document.createElement('span');
      const count = document.createElement('strong');
      label.textContent = ui.label(status);
      track.className = 'distribution-bar';
      fill.style.width = `${(statuses[key] / maximum) * 100}%`;
      track.append(fill);
      count.textContent = statuses[key];
      item.append(label, track, count);
      list.append(item);
    });
  }

  async function initialize() {
    await window.CyberShieldAdminAuth.requireAdmin();
    const live = document.querySelector('#dashboard-live');
    try {
      const [response, suspiciousResponse] = await Promise.all([
        window.CyberShieldAdminApi.getStats(),
        window.CyberShieldAdminApi.getSuspiciousStats()
      ]);
      const stats = response.data;
      const values = {
        total: stats.totalComplaints,
        submitted: stats.statuses.submitted,
        review: stats.statuses.underReview,
        info: stats.statuses.informationRequired,
        progress: stats.statuses.inProgress,
        resolved: stats.statuses.resolved,
        closed: stats.statuses.closed,
        high: stats.priorities.high,
        critical: stats.priorities.critical,
        evidence: stats.totalEvidence
      };
      Object.entries(values).forEach(([key, value]) => {
        document.querySelector(`#stat-${key}`).textContent = value;
      });
      renderRecent(stats.recentComplaints);
      renderDistribution(stats.statuses);
      const suspicious = suspiciousResponse.data.suspiciousReports;
      document.querySelector('#suspicious-total').textContent = suspicious.total;
      document.querySelector('#suspicious-pending').textContent = suspicious.pending;
      document.querySelector('#suspicious-published').textContent = suspicious.published;
      ui.setLive(live, `Dashboard loaded with ${stats.totalComplaints} complaints.`);
    } catch (error) {
      ui.setLive(live, error.message, 'error');
    }
  }

  initialize().catch(() => {});
})();
