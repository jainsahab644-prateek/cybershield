(() => {
  'use strict';

  const STORAGE_KEY = 'cybershield_chat_messages';
  const ALLOWED_TARGETS = new Set([
    '/pages/report-crime.html', '/pages/track-complaint.html', '/pages/financial-fraud.html',
    '/pages/safety-related.html', '/pages/other-cybercrime.html', '/pages/learning.html',
    '/pages/article.html?slug=how-to-recognize-a-phishing-message'
  ]);
  const quickActions = [
    ['chatReport', 'I need help starting a cyber incident report.'],
    ['chatCategory', 'How can I decide which complaint category to choose?'],
    ['chatEvidence', 'What evidence should I prepare?'],
    ['chatTrack', 'How can I track my complaint?'],
    ['chatSafety', 'Please give me basic cyber safety help.']
  ];
  const state = { initialized: false, messages: [], launcher: null, panel: null, backdrop: null, previousFocus: null };
  const tx=(key,fallback)=>window.CyberShieldI18n?.t(key)||fallback;

  function readMessages() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed.filter((item) => ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-10) : [];
    } catch (error) {
      return [];
    }
  }

  function saveMessages() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages.slice(-10))); } catch (error) { /* Memory remains available for this page. */ }
  }

  function pageContext() {
    const name = window.location.pathname.split('/').pop()?.replace('.html', '') || 'home';
    const known = new Set(['report-crime', 'financial-fraud', 'safety-related', 'other-cybercrime', 'track-complaint', 'learning', 'article', 'faq']);
    return known.has(name) ? name : 'citizen-portal';
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderActions(actions, container) {
    const safe = actions.filter((action) => action?.type === 'navigate' && ALLOWED_TARGETS.has(action.target) && typeof action.label === 'string');
    if (!safe.length) return;
    const row = element('div', 'chat-actions');
    safe.forEach((action) => {
      const link = element('a', 'chat-action', action.label);
      link.href = action.target;
      row.append(link);
    });
    container.append(row);
  }

  function appendMessage(role, content, actions = [], persist = true) {
    const messages = state.panel.querySelector('.chat-messages');
    const bubble = element('div', `chat-message chat-message--${role}`, content);
    messages.append(bubble);
    if (role === 'assistant') renderActions(actions, messages);
    if (persist) {
      state.messages.push({ role, content });
      saveMessages();
      state.panel.querySelector('.chat-panel__reset').disabled = state.messages.length === 0;
    }
    state.panel.querySelector('.chat-panel__body').scrollTop = state.panel.querySelector('.chat-panel__body').scrollHeight;
    return bubble;
  }

  function clearConversation() {
    state.messages = [];
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (error) { /* The visible conversation is still cleared. */ }
    state.panel.querySelector('.chat-messages').replaceChildren();
    const reset = state.panel.querySelector('.chat-panel__reset');
    reset.disabled = true;
    state.panel.querySelector('[name="message"]').focus();
  }

  function fallbackActions() {
    return [
      { type: 'navigate', label: 'Report an Incident', target: '/pages/report-crime.html' },
      { type: 'navigate', label: 'Track Complaint', target: '/pages/track-complaint.html' }
    ];
  }

  async function sendMessage(message) {
    const value = message.trim();
    if (value.length < 2 || value.length > 1000) return;
    const history = state.messages.slice(-6);
    appendMessage('user', value);
    const form = state.panel.querySelector('.chat-composer');
    const input = form.elements.message;
    const submit = form.querySelector('button');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.disabled = true;
    submit.disabled = true;
    const loading = appendMessage('loading', 'CyberShield Assistant is preparing guidance…', [], false);
    try {
      if (!window.CyberShieldApi) throw new Error('The shared API client is unavailable.');
      const payload = await window.CyberShieldApi.request('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: value, conversation: history, page: pageContext() })
      });
      loading.remove();
      appendMessage('assistant', payload.data.message, payload.data.actions || []);
    } catch (error) {
      loading.remove();
      appendMessage('assistant', 'The AI assistant is temporarily unavailable. You can still use the reporting and tracking features.', fallbackActions());
    } finally {
      input.disabled = false;
      submit.disabled = false;
      input.focus();
    }
  }

  function buildPanel() {
    const panel = element('section', 'chat-panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'chat-title');
    const header = element('header', 'chat-panel__header');
    const identity = element('div', 'chat-panel__identity');
    const mark = element('span', '', 'CS');
    mark.setAttribute('aria-hidden', 'true');
    const names = element('div');
    const title = element('strong', '', tx('chatbot','CyberShield Assistant'));
    title.id = 'chat-title';
    names.append(title, element('small', '', tx('citizenGuidance','Citizen guidance')));
    identity.append(mark, names);
    const controls = element('div', 'chat-panel__controls');
    const reset = element('button', 'chat-panel__reset', tx('newChat','New chat'));
    reset.type = 'button';
    reset.disabled = state.messages.length === 0;
    reset.setAttribute('aria-label', 'Clear conversation and start a new chat');
    const close = element('button', 'chat-panel__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close CyberShield Assistant');
    controls.append(reset, close);
    header.append(identity, controls);

    const body = element('div', 'chat-panel__body');
    const welcome = element('section', 'chat-welcome');
    const greeting = element('p');
    const greetingStrong = element('strong', '', tx('chatWelcome','Hi. I can help you report an incident, choose a category, prepare evidence, track a complaint, or find cyber safety guidance.'));
    greeting.append(greetingStrong);
    const quick = element('div', 'chat-quick');
    quick.setAttribute('aria-label', 'Suggested questions');
    quickActions.forEach(([key, prompt]) => {
      const button = element('button', '', tx(key,key));
      button.type = 'button';
      button.addEventListener('click', () => sendMessage(prompt));
      quick.append(button);
    });
    const notice = element('p', 'chat-safety', `${tx('aiCaution','Suggestions may be incorrect. You can always choose a different category.')} ${tx('neverEnter','Never enter passwords, OTPs, PINs, CVVs, or recovery codes.')}`);
    welcome.append(greeting, quick, notice);
    const messages = element('div', 'chat-messages');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions');
    body.append(welcome, messages);

    const form = element('form', 'chat-composer');
    const label = element('label', '', tx('ask','Ask a cyber-safety or reporting question'));
    label.htmlFor = 'chat-message';
    const row = element('div', 'chat-composer__row');
    const input = document.createElement('textarea');
    input.id = 'chat-message';
    input.name = 'message';
    input.rows = 2;
    input.minLength = 2;
    input.maxLength = 1000;
    input.required = true;
    input.placeholder = 'Type only the details you want to share…';
    const submit = element('button', '', tx('send','Send'));
    submit.type = 'submit';
    row.append(input, submit);
    const meta = element('div', 'chat-composer__meta');
    meta.append(element('span', '', 'Do not enter sensitive credentials.'), element('span', 'chat-count', '0 / 1000'));
    form.append(label, row, meta);
    form.addEventListener('submit', (event) => { event.preventDefault(); if (form.checkValidity()) sendMessage(input.value); else form.reportValidity(); });
    input.addEventListener('input', () => { meta.querySelector('.chat-count').textContent = `${input.value.length} / 1000`; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
    });
    close.addEventListener('click', closePanel);
    reset.addEventListener('click', clearConversation);
    panel.append(header, body, form);
    const backdrop = element('div', 'chat-backdrop');
    backdrop.hidden = true;
    backdrop.addEventListener('click', closePanel);
    state.backdrop = backdrop;
    document.body.append(backdrop, panel);
    return panel;
  }

  function openPanel() {
    state.previousFocus = document.activeElement;
    state.panel.hidden = false;
    state.backdrop.hidden = false;
    state.launcher.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-panel-open');
    state.panel.querySelector('.chat-panel__close').focus();
  }

  function closePanel() {
    state.panel.hidden = true;
    state.backdrop.hidden = true;
    state.launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-panel-open');
    (state.previousFocus || state.launcher).focus();
  }

  function initialize(launcher) {
    if (state.initialized) { launcher.disabled = false; return; }
    state.initialized = true;
    state.launcher = launcher;
    state.messages = readMessages();
    state.panel = buildPanel();
    state.messages.forEach((item) => appendMessage(item.role, item.content, [], false));
    launcher.disabled = false;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !state.panel.hidden) closePanel();
      if (event.key !== 'Tab' || state.panel.hidden) return;
      const focusable = [...state.panel.querySelectorAll(
        'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled])'
      )].filter((item) => !item.hidden && item.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  window.CyberShieldChat = { close: closePanel, initialize, open: openPanel };
})();
