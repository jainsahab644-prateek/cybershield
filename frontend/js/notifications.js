(() => {
  'use strict';

  const state = { page: 1, limit: 20, filter: 'all' };

  function formatTime(value) {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium', timeStyle: 'short'
    }).format(new Date(value));
  }

  function safeActionUrl(value) {
    return typeof value === 'string' && value.startsWith('/pages/complaint-details.html?id=')
      ? value
      : null;
  }

  function render(notifications) {
    const list = document.querySelector('#notification-list');
    const empty = document.querySelector('#notification-empty');
    list.replaceChildren();
    empty.hidden = notifications.length > 0;
    notifications.forEach((notification) => {
      const item = document.createElement('li');
      const content = document.createElement('div');
      const heading = document.createElement('div');
      const title = document.createElement('h2');
      const unread = document.createElement('strong');
      const message = document.createElement('p');
      const time = document.createElement('time');
      const actions = document.createElement('div');
      item.className = 'notification-item';
      item.dataset.read = String(notification.isRead);
      title.textContent = notification.title;
      unread.className = 'notification-unread';
      unread.textContent = notification.isRead ? 'Read' : 'Unread';
      heading.className = 'notification-item__heading';
      heading.append(title, unread);
      message.textContent = notification.message;
      time.dateTime = notification.createdAt;
      time.title = formatTime(notification.createdAt);
      time.textContent = formatTime(notification.createdAt);
      content.append(heading, message, time);
      actions.className = 'notification-item__actions';
      if (!notification.isRead) {
        const mark = document.createElement('button');
        mark.className = 'button button--secondary';
        mark.type = 'button';
        mark.textContent = 'Mark as read';
        mark.addEventListener('click', async () => {
          mark.disabled = true;
          try {
            await window.CyberShieldAuthApi.markNotificationRead(notification.notificationId);
            document.querySelector('#notification-live').textContent = 'Notification marked as read.';
            window.dispatchEvent(new CustomEvent('cybershield:notifications-changed'));
            await load();
          } catch (error) {
            document.querySelector('#notification-live').textContent = error.message;
            mark.disabled = false;
          }
        });
        actions.append(mark);
      }
      const actionUrl = safeActionUrl(notification.actionUrl);
      if (actionUrl) {
        const link = document.createElement('a');
        link.className = 'button button--primary';
        link.href = actionUrl;
        link.textContent = 'View Report';
        actions.append(link);
      }
      item.append(content, actions);
      list.append(item);
    });
  }

  function renderPagination(pagination) {
    document.querySelector('#notification-page').textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    document.querySelector('#notification-previous').disabled = pagination.page <= 1;
    document.querySelector('#notification-next').disabled = pagination.page >= pagination.totalPages;
  }

  async function load() {
    const live = document.querySelector('#notification-live');
    live.textContent = 'Loading notifications…';
    try {
      const response = await window.CyberShieldAuthApi.listNotifications({
        page: state.page,
        limit: state.limit,
        ...(state.filter === 'unread' ? { read: false } : {})
      });
      render(response.data.notifications);
      renderPagination(response.data.pagination);
      live.textContent = response.data.pagination.total
        ? `${response.data.pagination.total} notification${response.data.pagination.total === 1 ? '' : 's'} shown.`
        : state.filter === 'unread' ? 'You have no unread notifications.' : '';
    } catch (error) { live.textContent = error.message; }
  }

  async function initialize() {
    await window.CyberShieldAuthGuard.requireUser();
    document.querySelectorAll('[data-notification-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.notificationFilter;
        state.page = 1;
        document.querySelectorAll('[data-notification-filter]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        load();
      });
    });
    document.querySelector('#mark-all-read').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await window.CyberShieldAuthApi.markAllNotificationsRead();
        document.querySelector('#notification-live').textContent = 'All notifications marked as read.';
        window.dispatchEvent(new CustomEvent('cybershield:notifications-changed'));
        await load();
      } catch (error) {
        document.querySelector('#notification-live').textContent = error.message;
      } finally { button.disabled = false; }
    });
    document.querySelector('#notification-previous').addEventListener('click', () => { state.page -= 1; load(); });
    document.querySelector('#notification-next').addEventListener('click', () => { state.page += 1; load(); });
    await load();
  }

  initialize().catch(() => {});
})();
