(() => {
  'use strict';

  const allowedReturn = /^(?:index|complaints|complaint-details|suspicious-reports|suspicious-report-details|content\/(?:index|articles|article-editor|faqs|announcements))\.html(?:\?[a-z0-9%=&_.-]*)?$/i;
  const requestedReturn = new URLSearchParams(window.location.search).get('return');
  const returnPath = requestedReturn && allowedReturn.test(requestedReturn) ? requestedReturn : 'index.html';
  const requestForm = document.querySelector('#admin-request-form');
  const verifyForm = document.querySelector('#admin-verify-form');
  const email = document.querySelector('#admin-email');
  const message = document.querySelector('#admin-auth-message');
  const resend = document.querySelector('#admin-resend');
  const resendStatus = document.querySelector('#admin-resend-status');
  let resendAt = 0;
  let timer;

  function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `form-message form-message--${type}`;
    message.hidden = false;
    if (type === 'error') message.focus();
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = '';
  }

  function updateCountdown() {
    const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    resend.disabled = seconds > 0;
    resendStatus.textContent = seconds > 0 ? `Available in ${seconds} seconds` : 'A new code can be prepared.';
    if (!seconds && timer) window.clearInterval(timer);
  }

  function startCountdown(seconds) {
    resendAt = Date.now() + (seconds * 1000);
    if (timer) window.clearInterval(timer);
    updateCountdown();
    timer = window.setInterval(updateCountdown, 1000);
  }

  async function prepareCode() {
    const response = await window.CyberShieldAuthApi.requestOtp('email', email.value);
    startCountdown(response.data.resendAfterSeconds);
    requestForm.hidden = true;
    verifyForm.hidden = false;
    document.querySelector('#admin-otp').focus();
  }

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();
    const button = requestForm.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Preparing verification code…';
    try {
      await prepareCode();
      showMessage('Verification code ready.', 'success');
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
      button.textContent = 'Continue to verification';
    }
  });

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();
    if (!verifyForm.checkValidity()) {
      verifyForm.reportValidity();
      return;
    }
    const button = verifyForm.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Verifying administrator…';
    try {
      const response = await window.CyberShieldAuthApi.verifyOtp('email', email.value, verifyForm.elements.otp.value.trim(), verifyForm.elements.fullName.value.trim());
      if (response.data.user.role !== 'admin') throw new Error('Administrator authorization was not granted.');
      window.location.replace(returnPath);
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
      button.textContent = 'Verify and open admin panel';
    }
  });

  resend.addEventListener('click', async () => {
    clearMessage();
    resend.disabled = true;
    try {
      await prepareCode();
      showMessage('Verification code ready.', 'success');
    } catch (error) {
      showMessage(error.message);
      updateCountdown();
    }
  });

  window.CyberShieldAuthApi.getDevelopmentConfig().then((response) => {
    if (!response.data.demoMode || !response.data.demoAdminEmail) {
      requestForm.querySelector('[type="submit"]').disabled = true;
      showMessage('The administration demo is not enabled in this environment.');
      return;
    }
    email.placeholder = response.data.demoAdminEmail || 'admin@cybershield.demo';
    document.querySelector('[data-admin-otp]').textContent = response.data.demoOtp || 'configured code';
  }).catch((error) => showMessage(error.message));
})();
