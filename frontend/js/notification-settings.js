(() => {
  'use strict';

  function populate(form, preferences) {
    for (const name of [
      'emailEnabled', 'statusUpdatesEnabled',
      'informationRequiredEnabled', 'resolutionEnabled'
    ]) form.elements[name].checked = preferences[name];
    form.elements.emailEnabled.disabled = !preferences.emailAvailable;
    document.querySelector('#email-availability').textContent = preferences.emailAvailable
      ? 'Email delivery depends on the configured provider.'
      : 'A verified email address is required for email notifications.';
    document.querySelector('#email-development-notice').hidden = !preferences.developmentMode;
  }

  async function initialize() {
    await window.CyberShieldAuthGuard.requireUser();
    const form = document.querySelector('#notification-settings-form');
    const live = document.querySelector('#settings-live');
    const button = document.querySelector('#settings-save');
    try {
      const response = await window.CyberShieldAuthApi.getNotificationPreferences();
      populate(form, response.data.preferences);
    } catch (error) { live.textContent = error.message; }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      button.disabled = true;
      live.textContent = 'Saving preferences…';
      try {
        const payload = Object.fromEntries([
          'emailEnabled', 'statusUpdatesEnabled',
          'informationRequiredEnabled', 'resolutionEnabled'
        ].map((name) => [name, form.elements[name].checked]));
        const response = await window.CyberShieldAuthApi.updateNotificationPreferences(payload);
        populate(form, response.data.preferences);
        live.textContent = 'Notification preferences saved.';
      } catch (error) { live.textContent = error.message; }
      finally { button.disabled = false; }
    });
  }

  initialize().catch(() => {});
})();
