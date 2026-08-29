(() => {
  'use strict';

  const complaintTypes = {
    financial_fraud: {
      label: 'Money or payment problem',
      icon: '₹',
      subcategories: [
        ['payment_link_scam', 'Suspicious payment request or link'],
        ['upi_fraud', 'UPI or payment app problem'],
        ['online_banking_fraud', 'Bank transfer or card problem'],
        ['investment_scam', 'Investment, loan, or job offer'],
        ['shopping_fraud', 'Online shopping problem'],
        ['other_financial_fraud', 'Something else']
      ]
    },
    safety_related: {
      label: 'Threats, harassment, or identity misuse',
      icon: '♥',
      subcategories: [
        ['threatening_messages', 'Threats or online harassment'],
        ['impersonation', 'Someone is pretending to be me'],
        ['fake_profile', 'Fake profile or identity misuse'],
        ['privacy_violation', 'Private information was shared'],
        ['other_safety_concern', 'Something else']
      ]
    },
    other_cybercrime: {
      label: 'Account, link, or other online problem',
      icon: '⌁',
      subcategories: [
        ['phishing', 'Suspicious link or message'],
        ['account_compromise', 'Account access or security problem'],
        ['fake_website', 'Suspicious or fake website'],
        ['malware_incident', 'Device or harmful software problem'],
        ['identity_impersonation', 'Someone is pretending to be me'],
        ['other_cybercrime', 'Something else']
      ]
    }
  };

  const allSteps = [
    { key: 'type', shortLabel: 'What happened', title: 'What happened?' },
    { key: 'incident', shortLabel: 'When & where', title: 'When and where?' },
    { key: 'source', shortLabel: 'Who or what', title: 'Who or what contacted you?' },
    { key: 'financial', shortLabel: 'Money', title: 'Did you lose any money?' },
    { key: 'complainant', shortLabel: 'Your details', title: 'Your details' },
    { key: 'evidence', shortLabel: 'Information', title: 'Add supporting information' },
    { key: 'review', shortLabel: 'Review', title: 'Review your complaint' }
  ];

  const fieldsByStep = {
    type: ['subcategory'],
    incident: [
      'incident_title', 'incident_description', 'incident_date', 'incident_time',
      'incident_location', 'platform'
    ],
    source: [
      'suspect_name', 'suspect_phone', 'suspect_email', 'suspect_username',
      'suspect_website'
    ],
    financial: ['lost_money', 'financial_loss'],
    complainant: ['complainant_name', 'complainant_email', 'complainant_phone'],
    evidence: [],
    review: ['confirm_no_credentials', 'confirm_demo']
  };

  const fieldStep = Object.entries(fieldsByStep).reduce((mapping, [step, fields]) => {
    fields.forEach((field) => { mapping[field] = step; });
    return mapping;
  }, {});

  const supportedPayloadFields = [
    'subcategory', 'incident_title', 'incident_description', 'incident_date',
    'incident_time', 'incident_location', 'platform', 'suspect_name',
    'suspect_phone', 'suspect_email', 'suspect_username', 'suspect_website',
    'complainant_name', 'complainant_email', 'complainant_phone'
  ];

  async function loadFormFragment(root) {
    const response = await fetch('../components/complaint-form.html');
    if (!response.ok) throw new Error('Unable to load the complaint form component.');
    const markup = await response.text();
    const template = document.createElement('template');
    // The fragment is application-owned static markup. User values are never inserted here.
    template.innerHTML = markup;
    root.replaceChildren(template.content.cloneNode(true));
  }

  function appendOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function initializeForm(root, category) {
    const typeConfig = complaintTypes[category];
    const form = root.querySelector('#complaint-form');
    const activeSteps = allSteps.filter((step) => category === 'financial_fraud' || step.key !== 'financial');
    const storedDraft = window.CyberShieldStorage.loadDraft(category);
    let assistantPrefill = null;
    try {
      assistantPrefill = JSON.parse(sessionStorage.getItem('cybershield_assistant_prefill'));
      sessionStorage.removeItem('cybershield_assistant_prefill');
    } catch (error) {
      assistantPrefill = null;
    }
    const state = {
      category,
      ...(assistantPrefill?.category === category ? {
        subcategory: assistantPrefill.subcategory,
        incident_description: assistantPrefill.incidentDescription,
        incident_title: assistantPrefill.incidentDescription ? 'Cyber incident report' : undefined
      } : {}),
      ...(storedDraft?.values || {})
    };
    let currentStepIndex = Math.min(storedDraft?.currentStep || 0, activeSteps.length - 1);
    let isSubmitting = false;
    const evidenceSelection = window.CyberShieldEvidence.create(root);

    const subcategorySelect = form.elements.subcategory;
    typeConfig.subcategories.forEach(([value, label]) => appendOption(subcategorySelect, value, label));
    root.querySelector('#category-label').textContent = typeConfig.label;
    root.querySelector('#category-icon').textContent = typeConfig.icon;
    form.elements.incident_date.max = window.CyberShieldValidation.todayLocal();

    function readValue(fieldName) {
      if (fieldName === 'confirm_no_credentials' || fieldName === 'confirm_demo') {
        return Boolean(form.elements[fieldName]?.checked);
      }
      if (fieldName === 'lost_money') return state.lost_money || '';
      return state[fieldName] ?? '';
    }

    function populateFromDraft() {
      Array.from(form.elements).forEach((control) => {
        if (!control.name || control.name.startsWith('confirm_')) return;
        if (control.type === 'radio') {
          control.checked = state[control.name] === control.value;
        } else if (state[control.name] !== undefined) {
          control.value = state[control.name];
        }
      });
    }

    function saveDraft() {
      const draftValues = { ...state };
      delete draftValues.confirm_no_credentials;
      delete draftValues.confirm_demo;
      window.CyberShieldStorage.saveDraft(category, draftValues, currentStepIndex);
    }

    async function prefillAuthenticatedContact() {
      if (!window.CyberShieldAuthApi) return;
      try {
        const response = await window.CyberShieldAuthApi.getCurrentUser();
        const user = response.data.user;
        if (!state.complainant_name) state.complainant_name = user.fullName || '';
        if (!state.complainant_email) state.complainant_email = user.email || '';
        if (!state.complainant_phone) state.complainant_phone = user.phone || '';
        populateFromDraft();
        saveDraft();
      } catch (error) {
        // Anonymous reporting remains available when no authenticated session exists.
      }
    }

    function clearFieldError(fieldName) {
      const errorElement = root.querySelector(`[data-error-for="${fieldName}"]`);
      if (errorElement) errorElement.textContent = '';
      const controls = form.elements[fieldName];
      if (!controls) return;
      const list = typeof controls.length === 'number' && !controls.tagName
        ? Array.from(controls)
        : [controls];
      list.forEach((control) => control.removeAttribute('aria-invalid'));
    }

    function showFieldError(fieldName, message) {
      const errorElement = root.querySelector(`[data-error-for="${fieldName}"]`);
      if (errorElement) errorElement.textContent = message;
      const controls = form.elements[fieldName];
      if (!controls) return null;
      const list = typeof controls.length === 'number' && !controls.tagName
        ? Array.from(controls)
        : [controls];
      list.forEach((control) => control.setAttribute('aria-invalid', 'true'));
      return list[0];
    }

    function updateCharacterCount(fieldName, maximum) {
      const counter = root.querySelector(`[data-counter-for="${fieldName}"]`);
      if (counter) counter.textContent = `${String(state[fieldName] || '').length} / ${maximum}`;
    }

    function updateFinancialVisibility() {
      const lossGroup = root.querySelector('[data-financial-loss-group]');
      if (!lossGroup) return;
      const showLoss = state.lost_money === 'yes';
      lossGroup.hidden = !showLoss;
      if (!showLoss) {
        state.financial_loss = '';
        form.elements.financial_loss.value = '';
        clearFieldError('financial_loss');
      }
    }

    function updateConditionalVisibility() {
      const phishing = ['phishing','email_scam','payment_link_scam'].includes(state.subcategory);
      const account = ['account_compromise','account_misuse'].includes(state.subcategory);
      root.querySelector('[data-conditional="phishing"]').hidden = !phishing;
      root.querySelector('[data-conditional="account"]').hidden = !account;
    }

    function validateStep(stepKey, { focusFirst = true } = {}) {
      let firstInvalid = null;
      fieldsByStep[stepKey].forEach((fieldName) => {
        clearFieldError(fieldName);
        const message = window.CyberShieldValidation.validateField(
          fieldName,
          readValue(fieldName),
          state
        );
        if (message) {
          const invalidControl = showFieldError(fieldName, message);
          firstInvalid ||= invalidControl;
        }
      });
      if (firstInvalid && focusFirst) firstInvalid.focus();
      return !firstInvalid;
    }

    function createReviewRow(term, value) {
      const wrapper = document.createElement('div');
      const label = document.createElement('dt');
      const description = document.createElement('dd');
      label.textContent = term;
      description.textContent = value || 'Not provided';
      wrapper.append(label, description);
      return wrapper;
    }

    function subcategoryLabel() {
      return typeConfig.subcategories.find(([value]) => value === state.subcategory)?.[1] || '';
    }

    function addReviewGroup(container, title, stepKey, rows) {
      const section = document.createElement('section');
      section.className = 'review-card';
      const header = document.createElement('div');
      const heading = document.createElement('h3');
      const edit = document.createElement('button');
      const list = document.createElement('dl');
      heading.textContent = title;
      edit.type = 'button';
      edit.className = 'review-edit';
      edit.textContent = `Edit ${title}`;
      edit.addEventListener('click', () => {
        currentStepIndex = activeSteps.findIndex((step) => step.key === stepKey);
        renderStep();
      });
      header.append(heading, edit);
      rows.forEach(([term, value]) => list.append(createReviewRow(term, value)));
      section.append(header, list);
      container.append(section);
    }

    function renderReview() {
      const summary = root.querySelector('#review-summary');
      summary.replaceChildren();
      addReviewGroup(summary, 'What happened', 'incident', [
        ['Category', typeConfig.label],
        ['Type', subcategoryLabel()],
        ['Title', state.incident_title],
        ['Description', state.incident_description]
      ]);
      addReviewGroup(summary, 'When and where', 'incident', [
        ['Date', state.incident_date],
        ['Time', state.incident_time],
        ['Location', state.incident_location],
        ['Platform', state.platform]
      ]);
      if (['phishing','email_scam','payment_link_scam'].includes(state.subcategory)) addReviewGroup(summary, 'Suspicious message', 'incident', [['Received through',state.message_channel],['Link still available',state.suspicious_link_saved]]);
      if (['account_compromise','account_misuse'].includes(state.subcategory)) addReviewGroup(summary, 'Affected account', 'incident', [['Service or account',state.affected_service],['Can still access',state.account_access]]);
      addReviewGroup(summary, 'Who or what was involved', 'source', [
        ['Name', state.suspect_name],
        ['Username', state.suspect_username],
        ['Phone', state.suspect_phone],
        ['Email', state.suspect_email],
        ['Website', state.suspect_website]
      ]);
      if (category === 'financial_fraud') {
        addReviewGroup(summary, 'Money involved', 'financial', [
          ['Money lost', state.lost_money === 'yes' ? 'Yes' : 'No'],
          ['Approximate loss', state.lost_money === 'yes' ? `₹${state.financial_loss || '0'}` : '₹0'],
          ['Payment method',state.payment_method],
          ['Transaction / reference ID',state.transaction_reference]
        ]);
      }
      addReviewGroup(summary, 'Your details', 'complainant', [
        ['Name', state.complainant_name],
        ['Email', state.complainant_email],
        ['Phone', state.complainant_phone]
      ]);
      addReviewGroup(summary, 'Evidence', 'evidence', [
        ['Selected files', evidenceSelection.files().length || 'None'],
        ['Files', evidenceSelection.summary() || 'No evidence selected']
      ]);
    }

    function renderProgress() {
      const indicator = root.querySelector('#step-indicator');
      indicator.replaceChildren();
      indicator.style.setProperty('--step-count', activeSteps.length);
      activeSteps.forEach((step, index) => {
        const item = document.createElement('li');
        const number = document.createElement('span');
        const label = document.createElement('strong');
        number.textContent = index < currentStepIndex ? '✓' : String(index + 1);
        label.textContent = step.shortLabel;
        if (index < currentStepIndex) item.classList.add('is-complete');
        if (index === currentStepIndex) {
          item.classList.add('is-current');
          item.setAttribute('aria-current', 'step');
        }
        item.append(number, label);
        indicator.append(item);
      });
      const current = activeSteps[currentStepIndex];
      const keyByStep={type:'whatHappened',incident:'whenWhere',source:'whoContacted',financial:'moneyLost',complainant:'yourDetails',evidence:'addEvidence',review:'reviewComplaint'};
      const translatedTitle=window.CyberShieldI18n?.t(keyByStep[current.key])||current.title;
      root.querySelector('#step-summary').textContent=window.CyberShieldI18n?.t('stepOf',{current:currentStepIndex+1,total:activeSteps.length,title:translatedTitle})||`Step ${currentStepIndex + 1} of ${activeSteps.length}: ${translatedTitle}`;
    }

    function renderStep({ focusHeading = true } = {}) {
      const currentStep = activeSteps[currentStepIndex];
      root.querySelectorAll('.form-step').forEach((step) => {
        step.hidden = step.dataset.step !== currentStep.key;
      });
      if (currentStep.key === 'review') renderReview();
      renderProgress();
      root.querySelector('#previous-step').hidden = currentStepIndex === 0;
      root.querySelector('#next-step').hidden = currentStep.key === 'review';
      root.querySelector('#submit-complaint').hidden = currentStep.key !== 'review';
      saveDraft();

      if (focusHeading) {
        const legend = root.querySelector(`.form-step[data-step="${currentStep.key}"] > legend`);
        legend?.setAttribute('tabindex', '-1');
        legend?.focus();
      }
    }

    function buildPayload() {
      const payload = { category };
      supportedPayloadFields.forEach((field) => {
        const value = typeof state[field] === 'string' ? state[field].trim() : state[field];
        if (value !== '' && value !== undefined) payload[field] = value;
      });
      payload.financial_loss = category === 'financial_fraud' && state.lost_money === 'yes'
        ? Number(state.financial_loss)
        : 0;
      return payload;
    }

    function showFormStatus(message, type = 'error') {
      const status = root.querySelector('#form-status');
      status.textContent = message;
      status.className = `form-status form-status--${type}`;
      status.hidden = false;
    }

    function clearFormStatus() {
      const status = root.querySelector('#form-status');
      status.hidden = true;
      status.textContent = '';
    }

    function applyBackendErrors(errors) {
      if (!Array.isArray(errors) || errors.length === 0) return;
      const firstMapped = errors.find((error) => fieldStep[error.field]);
      if (firstMapped) {
        currentStepIndex = activeSteps.findIndex((step) => step.key === fieldStep[firstMapped.field]);
        renderStep({ focusHeading: false });
      }
      let firstControl = null;
      errors.forEach((error) => {
        if (fieldStep[error.field]) firstControl ||= showFieldError(error.field, error.message);
      });
      firstControl?.focus();
    }

    form.addEventListener('input', (event) => {
      const control = event.target;
      if (!control.name || control.name.startsWith('confirm_')) return;
      if (control.type === 'radio') {
        if (control.checked) state[control.name] = control.value;
      } else {
        state[control.name] = control.value;
      }
      clearFieldError(control.name);
      updateCharacterCount('incident_title', 150);
      updateCharacterCount('incident_description', 5000);
      if (control.name === 'lost_money') updateFinancialVisibility();
      if (control.name === 'subcategory') updateConditionalVisibility();
      saveDraft();
    });

    form.addEventListener('change', (event) => {
      if (event.target.name) clearFieldError(event.target.name);
    });

    root.querySelector('#next-step').addEventListener('click', () => {
      clearFormStatus();
      const currentStep = activeSteps[currentStepIndex];
      if (!validateStep(currentStep.key)) return;
      currentStepIndex += 1;
      renderStep();
    });

    root.querySelector('#previous-step').addEventListener('click', () => {
      clearFormStatus();
      currentStepIndex = Math.max(0, currentStepIndex - 1);
      renderStep();
    });

    root.querySelector('#save-draft').addEventListener('click',()=>{saveDraft();root.querySelector('#draft-status').textContent=window.CyberShieldI18n?.t('saved')||'Draft saved in this browser.';});

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      clearFormStatus();

      const firstInvalidStep = activeSteps.find((step) => !validateStep(step.key, { focusFirst: false }));
      if (firstInvalidStep) {
        currentStepIndex = activeSteps.findIndex((step) => step.key === firstInvalidStep.key);
        renderStep({ focusHeading: false });
        validateStep(firstInvalidStep.key);
        showFormStatus('Review the highlighted fields before submitting.');
        return;
      }

      isSubmitting = true;
      const submitButton = root.querySelector('#submit-complaint');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting your complaint…';
      showFormStatus('Submitting your complaint…', 'loading');

      try {
        const response = await window.CyberShieldApi.createComplaint(buildPayload());
        const success = { ...response.data, evidenceCount: 0 };
        const evidenceFiles = evidenceSelection.files();
        if (evidenceFiles.length > 0) {
          showFormStatus('Complaint created. Uploading evidence…', 'loading');
          try {
            const upload = await window.CyberShieldAuthApi.uploadEvidence(
              response.data.complaintId,
              evidenceFiles
            );
            success.evidenceCount = upload.data.evidence.length;
          } catch (uploadError) {
            success.evidenceUploadFailed = true;
          }
        }
        window.CyberShieldStorage.clearDraft();
        window.CyberShieldStorage.saveSuccess(success);
        evidenceSelection.clear();
        window.location.assign('complaint-success.html');
      } catch (error) {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Complaint →';
        if (error.isNetworkError) {
          showFormStatus('CyberShield is temporarily unavailable. Please try again.');
          return;
        }
        if (error.status === 400 && error.payload?.errors) {
          applyBackendErrors(error.payload.errors);
          showFormStatus('Some information needs your attention. Review the highlighted fields.');
          return;
        }
        showFormStatus(error.message || 'The complaint could not be submitted. Please try again.');
      }
    });

    populateFromDraft();
    updateCharacterCount('incident_title', 150);
    updateCharacterCount('incident_description', 5000);
    updateFinancialVisibility();
    updateConditionalVisibility();
    renderStep({ focusHeading: false });
    prefillAuthenticatedContact();
  }

  async function initialize() {
    const root = document.querySelector('#complaint-form-root');
    if (!root) return;
    const category = root.dataset.category;
    if (!complaintTypes[category]) {
      root.textContent = 'The selected complaint category is not available.';
      return;
    }

    try {
      await loadFormFragment(root);
      initializeForm(root, category);
    } catch (error) {
      root.textContent = 'The complaint form could not be loaded. Refresh the page and try again.';
    }
  }

  initialize();
})();
