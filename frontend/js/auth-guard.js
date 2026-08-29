(() => {
  'use strict';

  let userPromise;

  async function requireUser() {
    if (!userPromise) {
      userPromise = window.CyberShieldAuthApi.getCurrentUser()
        .then((response) => response.data.user)
        .catch((error) => {
          if (error.status === 401) {
            const returnPath = `${window.location.pathname.split('/').pop()}${window.location.search}`;
            window.location.replace(`login.html?return=${encodeURIComponent(returnPath)}`);
          }
          throw error;
        });
    }
    return userPromise;
  }

  window.CyberShieldAuthGuard = { requireUser };
})();
