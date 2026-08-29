(() => {
  'use strict';

  const DRAFT_KEY = 'cybershield_complaint_draft';
  const SUCCESS_KEY = 'cybershield_complaint_success';

  function read(key) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadDraft(category) {
    const draft = read(DRAFT_KEY);
    return draft?.category === category ? draft : null;
  }

  function saveDraft(category, values, currentStep) {
    return write(DRAFT_KEY, {
      category,
      values,
      currentStep,
      savedAt: new Date().toISOString()
    });
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // Storage can be disabled; successful submission must still continue.
    }
  }

  function saveSuccess(data) {
    return write(SUCCESS_KEY, data);
  }

  function loadSuccess() {
    return read(SUCCESS_KEY);
  }

  window.CyberShieldStorage = {
    clearDraft,
    loadDraft,
    loadSuccess,
    saveDraft,
    saveSuccess
  };
})();

