(() => {
  'use strict';

  const FLOW_KEY = 'cybershield_auth_flow';

  function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `form-message form-message--${type}`;
    element.hidden = false;
    if (type === 'error') element.focus();
  }

  function clearMessage(element) {
    element.hidden = true;
    element.textContent = '';
  }

  function writeFlow(flow) {
    sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow));
  }

  function readFlow() {
    try {
      return JSON.parse(sessionStorage.getItem(FLOW_KEY));
    } catch (error) {
      return null;
    }
  }

  function safeReturnPath() {
    const requested = new URLSearchParams(window.location.search).get('return');
    const userPage = /^[a-z0-9-]+\.html(?:\?[a-z0-9%=&_.-]*)?$/i;
    return requested && userPage.test(requested)
      ? requested
      : 'dashboard.html';
  }

  function maskIdentifier(method, identifier) {
    if (method === 'email') {
      const [name, domain] = identifier.split('@');
      return `${name.slice(0, 2)}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
    }
    return `${'•'.repeat(Math.max(6, identifier.length - 4))}${identifier.slice(-4)}`;
  }

  async function initializeDevelopmentNotice() {
    const notices = document.querySelectorAll('[data-development-notice]');
    try {
      const response = await window.CyberShieldAuthApi.getDevelopmentConfig();
      if (response.data.developmentMode) {
        notices.forEach((notice) => { notice.hidden = false; });
      }
    } catch (error) {
      // Authentication remains usable if the informational configuration check fails.
    }
  }

  function initializeLogin() {
    const form = document.querySelector('#login-form');
    if (!form) return;
    const message = document.querySelector('#auth-message');
    const emailGroup = document.querySelector('#email-group');
    const phoneGroup = document.querySelector('#phone-group');
    const email = form.elements.email;
    const phone = form.elements.phone;
    const submit = form.querySelector('[type="submit"]');
    const returnPath = safeReturnPath();

    function updateMethod() {
      const method = form.elements.method.value;
      const useEmail = method === 'email';
      emailGroup.hidden = !useEmail;
      phoneGroup.hidden = useEmail;
      email.disabled = !useEmail;
      phone.disabled = useEmail;
      (useEmail ? email : phone).focus();
      clearMessage(message);
    }

    form.querySelectorAll('[name="method"]').forEach((radio) => {
      radio.addEventListener('change', updateMethod);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearMessage(message);
      const method = form.elements.method.value;
      const identifier = (method === 'email' ? email.value : phone.value).trim();
      if (!identifier || !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Preparing code…';
      try {
        const response = await window.CyberShieldAuthApi.requestOtp(method, identifier);
        writeFlow({
          method,
          identifier,
          developmentMode: response.data.developmentMode,
          resendAt: Date.now() + response.data.resendAfterSeconds * 1000,
          returnPath
        });
        window.location.assign('verify-otp.html');
      } catch (error) {
        showMessage(message, error.message);
        submit.disabled = false;
        submit.textContent = 'Continue to verification';
      }
    });

    initializeDevelopmentNotice();
  }

  function initializeVerification() {
    const form = document.querySelector('#verify-form');
    if (!form) return;
    const flow = readFlow();
    if (!flow?.method || !flow?.identifier) {
      window.location.replace('login.html');
      return;
    }

    const message = document.querySelector('#auth-message');
    const submit = form.querySelector('[type="submit"]');
    const resend = document.querySelector('#resend-code');
    const countdown = document.querySelector('#resend-countdown');
    document.querySelector('#verification-destination').textContent = maskIdentifier(
      flow.method,
      flow.identifier
    );
    if (flow.developmentMode) {
      document.querySelectorAll('[data-development-notice]').forEach((notice) => {
        notice.hidden = false;
      });
    }

    function updateCountdown() {
      const seconds = Math.max(0, Math.ceil((flow.resendAt - Date.now()) / 1000));
      resend.disabled = seconds > 0;
      countdown.textContent = seconds > 0 ? `Available in ${seconds} seconds` : 'You can request a new code.';
    }
    updateCountdown();
    const timer = window.setInterval(() => {
      updateCountdown();
      if (!resend.disabled) window.clearInterval(timer);
    }, 1000);

    resend.addEventListener('click', async () => {
      clearMessage(message);
      resend.disabled = true;
      try {
        const response = await window.CyberShieldAuthApi.requestOtp(flow.method, flow.identifier);
        flow.resendAt = Date.now() + response.data.resendAfterSeconds * 1000;
        writeFlow(flow);
        updateCountdown();
        showMessage(message, 'Verification code ready.', 'success');
      } catch (error) {
        showMessage(message, error.message);
        updateCountdown();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearMessage(message);
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Verifying…';
      try {
        await window.CyberShieldAuthApi.verifyOtp(
          flow.method,
          flow.identifier,
          form.elements.otp.value.trim(),
          form.elements.fullName.value.trim()
        );
        sessionStorage.removeItem(FLOW_KEY);
        window.location.replace(flow.returnPath || 'dashboard.html');
      } catch (error) {
        showMessage(message, error.message);
        submit.disabled = false;
        submit.textContent = 'Verify and sign in';
      }
    });
  }

  initializeLogin();
  initializeVerification();
})();
