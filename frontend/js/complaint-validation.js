(() => {
  'use strict';

  const PHONE_PATTERN = /^\+?\d{10,15}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function todayLocal() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function validateField(name, rawValue, state = {}) {
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

    switch (name) {
      case 'subcategory':
        return value ? '' : 'Select the option that best describes the incident.';
      case 'incident_title':
        if (!value) return 'Add a short title for what happened.';
        if (value.length < 5) return 'Use at least 5 characters for the title.';
        if (value.length > 150) return 'Keep the title under 150 characters.';
        return '';
      case 'incident_description':
        if (!value) return 'Please tell us what happened.';
        if (value.length < 20) return 'Please add a little more detail—at least 20 characters.';
        if (value.length > 5000) return 'Keep your description under 5,000 characters.';
        return '';
      case 'incident_date':
        if (!value) return 'Select the incident date.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00`).valueOf())) {
          return 'Enter a valid incident date.';
        }
        if (value > todayLocal()) return 'Incident date cannot be in the future.';
        return '';
      case 'financial_loss': {
        if (state.lost_money !== 'yes') return '';
        if (value === '') return 'Enter the approximate financial loss.';
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) return 'Financial loss must be 0 or more.';
        return '';
      }
      case 'lost_money':
        return value === 'yes' || value === 'no' ? '' : 'Select whether money was lost.';
      case 'complainant_name':
        if (!value) return 'Enter your display name.';
        if (value.length < 2 || value.length > 100) return 'Name must contain 2 to 100 characters.';
        return '';
      case 'complainant_email':
        if (!value) return 'Enter an email address.';
        return EMAIL_PATTERN.test(value) ? '' : 'Please enter a valid email address.';
      case 'complainant_phone':
        if (!value) return 'Enter a phone number.';
        return PHONE_PATTERN.test(value)
          ? ''
          : 'Phone number must contain 10 to 15 digits and may start with +.';
      case 'suspect_phone':
        return !value || PHONE_PATTERN.test(value)
          ? ''
          : 'Phone number must contain 10 to 15 digits and may start with +.';
      case 'suspect_email':
        return !value || EMAIL_PATTERN.test(value) ? '' : 'Please enter a valid email address.';
      case 'suspect_website':
        return !value || isHttpUrl(value) ? '' : 'Enter a complete URL beginning with http:// or https://.';
      case 'confirm_no_credentials':
        return value ? '' : 'Confirm that no credentials or authentication codes were entered.';
      case 'confirm_demo':
        return value ? '' : 'Confirm that you understand CyberShield is not a government or law-enforcement service.';
      default:
        return '';
    }
  }

  window.CyberShieldValidation = {
    todayLocal,
    validateField
  };
})();
