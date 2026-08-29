(() => {
  'use strict';

  let adminPromise;

  function currentAdminPath() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const contentPage = window.location.pathname.includes('/admin/content/');
    return `${contentPage ? 'content/' : ''}${page}${window.location.search}`;
  }

  async function requireAdmin() {
    if (!adminPromise) {
      adminPromise = window.CyberShieldAuthApi.getCurrentUser()
        .then((response) => {
          const user = response.data.user;
          const nested = window.location.pathname.includes('/admin/content/');
          if (user.role !== 'admin') {
            window.location.replace(nested ? '../unauthorized.html' : 'unauthorized.html');
            throw new Error('Admin authorization required.');
          }
          document.querySelectorAll('[data-admin-name]').forEach((element) => {
            element.textContent = user.fullName;
          });
          document.querySelectorAll('.admin-nav').forEach((navigation) => {
            const hasContentLink = [...navigation.querySelectorAll('a')]
              .some((link) => link.textContent.trim() === 'Content');
            if (!hasContentLink) {
              const link = document.createElement('a');
              link.href = nested ? 'index.html' : 'content/index.html';
              link.textContent = 'Content';
              navigation.insertBefore(link, navigation.querySelector('a[href*="../index.html"]'));
            }
          });
          return user;
        })
        .catch((error) => {
          if (error.status === 401) {
            const returnPath = encodeURIComponent(currentAdminPath());
            const nested = window.location.pathname.includes('/admin/content/');
            window.location.replace(`${nested ? '../' : ''}login.html?return=${returnPath}`);
          }
          throw error;
        });
    }
    return adminPromise;
  }

  function initializeLogout() {
    document.querySelectorAll('[data-admin-logout]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await window.CyberShieldAuthApi.logout();
          const nested = window.location.pathname.includes('/admin/content/');
          window.location.replace(`${nested ? '../' : ''}login.html`);
        } catch (error) {
          button.disabled = false;
        }
      });
    });
  }

  initializeLogout();
  window.CyberShieldAdminAuth = { requireAdmin };
})();
