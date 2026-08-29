(() => {
  'use strict';
  const categoryLabels = { financial_fraud: 'Financial Fraud', safety_related: 'Safety Related Cybercrime', other_cybercrime: 'Other Cybercrime' };
  const categoryPages = { financial_fraud: 'financial-fraud.html', safety_related: 'safety-related.html', other_cybercrime: 'other-cybercrime.html' };
  const form = document.querySelector('#assistant-form');
  const description = document.querySelector('#incident-description');
  const error = document.querySelector('#assistant-error');
  const status = document.querySelector('#assistant-status');
  const result = document.querySelector('#assistant-result');
  const submit = document.querySelector('#assistant-submit');
  let suggestion = null;
  const scenarios = {
    electricity: 'Someone sent me a payment link and said my electricity would be disconnected if I did not pay immediately.'
  };

  function saveAndContinue(category, subcategory, incidentDescription = '') {
    try {
      sessionStorage.setItem('cybershield_assistant_prefill', JSON.stringify({ category, subcategory, incidentDescription }));
    } catch (storageError) {
      // The form remains usable if browser storage is disabled.
    }
    window.location.assign(categoryPages[category]);
  }

  function setError(message) {
    error.textContent = message;
    description.setAttribute('aria-invalid', 'true');
    description.focus();
  }

  function renderSuggestion(data) {
    suggestion = data;
    document.querySelector('#assistant-category').textContent = categoryLabels[data.suggestedCategory];
    document.querySelector('#assistant-summary').textContent = data.summary;
    document.querySelector('#assistant-warning').textContent = data.safetyWarning;
    const list = document.querySelector('#assistant-useful-info');
    list.replaceChildren(...data.usefulInformation.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    document.querySelector('#assistant-uncertain').hidden = data.confidence !== 'low';
    result.hidden = false;
    result.focus();
  }

  description.addEventListener('input', () => {
    document.querySelector('#assistant-count').textContent = `${description.value.length} / 2000`;
    error.textContent = '';
    description.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = description.value.trim();
    if (value.length < 20) return setError('Please describe what happened using at least 20 characters.');
    if (value.length > 2000) return setError('Please keep the description under 2,000 characters.');
    submit.disabled = true;
    submit.textContent = 'Understanding your report…';
    status.textContent = 'Understanding your report. This may take a moment.';
    result.hidden = true;
    try {
      const response = await window.CyberShieldApi.classifyIncident(value);
      renderSuggestion(response.data);
      status.textContent = 'Suggestion ready. You can accept it or choose a different category.';
    } catch (apiError) {
      status.textContent = 'The assistant is temporarily unavailable. You can still choose a category manually below.';
      document.querySelector('#manual-choices').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } finally {
      submit.disabled = false;
      submit.textContent = 'Help Me Choose →';
    }
  });

  document.querySelector('#assistant-continue').addEventListener('click', () => {
    if (suggestion) saveAndContinue(suggestion.suggestedCategory, suggestion.suggestedSubcategory, description.value.trim());
  });
  document.querySelector('#assistant-change').addEventListener('click', () => document.querySelector('#manual-choices').scrollIntoView());
  document.querySelector('#use-example').addEventListener('click', () => {
    description.value = 'I received a message saying my electricity connection would be disconnected unless I paid immediately through a link.';
    description.dispatchEvent(new Event('input'));
    description.focus();
  });
  document.querySelectorAll('[data-category][data-subcategory]').forEach((button) => button.addEventListener('click', () => {
    saveAndContinue(button.dataset.category, button.dataset.subcategory, description.value.trim());
  }));

  const requestedScenario = new URLSearchParams(window.location.search).get('scenario');
  const requestedChoice = new URLSearchParams(window.location.search).get('choice');
  const choiceMap = {money:['financial_fraud','other_financial_fraud'],phishing:['other_cybercrime','phishing'],account:['other_cybercrime','account_compromise'],impersonation:['safety_related','impersonation'],harassment:['safety_related','threatening_messages'],shopping:['financial_fraud','shopping_fraud'],unsure:['other_cybercrime','other_cybercrime']};
  if(choiceMap[requestedChoice])saveAndContinue(...choiceMap[requestedChoice]);
  if (scenarios[requestedScenario]) {
    description.value = scenarios[requestedScenario];
    description.dispatchEvent(new Event('input'));
    description.focus();
  }
})();
