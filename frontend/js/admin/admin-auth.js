(() => {
  'use strict';

  let adminPromise;

  function currentAdminPath() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const contentPage = window.location.pathname.includes('/admin/content/');
    return `${contentPage ? 'content/' : ''}${page}${window.location.search}`;
  }

  function applyAdminUI(user) {
    const nested = window.location.pathname.includes('/admin/content/');
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
  }

  async function requireAdmin() {
    if (!adminPromise) {
      adminPromise = (async () => {
        try {
          const response = await window.CyberShieldAuthApi.getCurrentUser();
          const user = response.data.user;
          const nested = window.location.pathname.includes('/admin/content/');
          if (user.role !== 'admin') {
            window.location.replace(nested ? '../unauthorized.html' : 'unauthorized.html');
            throw new Error('Admin authorization required.');
          }
          applyAdminUI(user);
          return user;
        } catch (error) {
          if (error.status === 401) {
            try {
              const devConfig = await window.CyberShieldAuthApi.getDevelopmentConfig();
              if (devConfig?.data?.demoMode && devConfig?.data?.demoAdminEmail) {
                const demoEmail = devConfig.data.demoAdminEmail;
                const demoOtp = devConfig.data.demoOtp || '123456';

                // Try to verify with an existing OTP first (avoids burning the 30-second
                // cooldown and rate limit quota that blocks the manual login page).
                // Only request a new OTP code if verify fails due to expired / no active code.
                let verified = false;
                try {
                  await window.CyberShieldAuthApi.verifyOtp('email', demoEmail, demoOtp, 'CyberShield Administrator');
                  verified = true;
                } catch (verifyErr) {
                  // Code was invalid or expired — request a fresh one and try once more.
                  if (verifyErr?.status === 400 || verifyErr?.status === 429) {
                    try {
                      await window.CyberShieldAuthApi.requestOtp('email', demoEmail);
                      await window.CyberShieldAuthApi.verifyOtp('email', demoEmail, demoOtp, 'CyberShield Administrator');
                      verified = true;
                    } catch (_) {
                      // Fall through to login redirect
                    }
                  }
                }

                if (verified) {
                  const retry = await window.CyberShieldAuthApi.getCurrentUser();
                  if (retry?.data?.user?.role === 'admin') {
                    applyAdminUI(retry.data.user);
                    return retry.data.user;
                  }
                }
              }
            } catch (autoAuthErr) {
              // Silently fallback to login redirect
            }

            const returnPath = encodeURIComponent(currentAdminPath());
            const nested = window.location.pathname.includes('/admin/content/');
            window.location.replace(`${nested ? '../' : ''}login.html?return=${returnPath}`);
          }
          throw error;
        }
      })();
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
