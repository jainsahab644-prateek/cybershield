(() => {
  'use strict';

  const root = document.documentElement;
  const fontButtons = document.querySelectorAll('[data-font-action]');
  const currentYears = document.querySelectorAll('[data-current-year], #current-year');
  const fontScales = [0.9, 1, 1.1, 1.2];
  const disclosureText = 'CyberShield is an independent reimagining of the cybercrime reporting experience created for a public-service innovation challenge. It is not an official government service.';
  let fontScaleIndex = 1;

  function closeNavigation({ restoreFocus = false } = {}) {
    const menuButton = document.querySelector('.menu-button');
    const navigation = document.querySelector('.main-nav');
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    if (restoreFocus) menuButton.focus();
  }

  document.addEventListener('click', (event) => {
    const menuButton = event.target.closest('.menu-button');
    if (menuButton) {
      const navigation = document.querySelector('.main-nav');
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      navigation?.classList.toggle('is-open', willOpen);
      document.body.classList.toggle('nav-open', willOpen);
      return;
    }
    if (event.target.closest('.main-nav a')) closeNavigation();
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 801px)').matches) closeNavigation();
  });

  document.addEventListener('keydown', (event) => {
    const menuButton = document.querySelector('.menu-button');
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeNavigation({ restoreFocus: true });
    }
  });

  function updateFontScale() {
    root.style.setProperty('--root-font-size', `${fontScales[fontScaleIndex] * 100}%`);
  }

  fontButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.fontAction;
      if (action === 'increase') fontScaleIndex = Math.min(fontScales.length - 1, fontScaleIndex + 1);
      if (action === 'decrease') fontScaleIndex = Math.max(0, fontScaleIndex - 1);
      if (action === 'reset') fontScaleIndex = 1;
      updateFontScale();
    });
  });

  currentYears.forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  function ensureCitizenShell() {
    if (window.location.pathname.includes('/admin/')) return;
    const insidePages = window.location.pathname.includes('/pages/');
    let header = document.querySelector('.site-header');
    if (!header) {
      header = document.createElement('header');
      header.className = 'site-header';
      const brandRow = document.createElement('div');
      const brand = document.createElement('a');
      const mark = document.createElement('span');
      const markText = document.createElement('span');
      const name = document.createElement('span');
      brandRow.className = 'brand-row container';
      brand.className = 'brand';
      brand.href = insidePages ? '../index.html' : 'index.html';
      brand.setAttribute('aria-label', 'CyberShield home');
      mark.className = 'brand__mark';
      mark.setAttribute('aria-hidden', 'true');
      markText.textContent = 'CS';
      name.className = 'brand__name';
      name.append('Cyber', Object.assign(document.createElement('span'), { textContent: 'Shield' }));
      mark.append(markText);
      brand.append(mark, name);
      brandRow.append(brand);
      const navigation = document.createElement('nav');
      const navigationInner = document.createElement('div');
      navigation.className = 'main-nav';
      navigation.id = 'primary-navigation';
      navigation.setAttribute('aria-label', 'Main navigation');
      navigationInner.className = 'container main-nav__inner';
      const links = [
        ['Home', insidePages ? '../index.html' : 'index.html'],
        ['Report an incident', insidePages ? 'report-crime.html' : 'pages/report-crime.html'],
        ['Track Complaint', insidePages ? 'track-complaint.html' : 'pages/track-complaint.html'],
        ['Learning Corner', insidePages ? 'learning.html' : 'pages/learning.html']
      ];
      links.forEach(([label, href]) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        if (new URL(href, window.location.href).pathname === window.location.pathname) {
          link.className = 'is-active';
          link.setAttribute('aria-current', 'page');
        }
        navigationInner.append(link);
      });
      navigation.append(navigationInner);
      header.append(brandRow, navigation);
      document.querySelector('main')?.before(header);
    }

    const brandRow = header.querySelector('.brand-row');
    const navigation = header.querySelector('.main-nav');
    if (brandRow && navigation && !brandRow.querySelector('.menu-button')) {
      const button = document.createElement('button');
      const icon = document.createElement('span');
      const text = document.createElement('span');
      button.className = 'menu-button';
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      navigation.id ||= 'primary-navigation';
      button.setAttribute('aria-controls', navigation.id);
      icon.className = 'menu-button__icon';
      icon.setAttribute('aria-hidden', 'true');
      text.textContent = 'Menu';
      button.append(icon, text);
      brandRow.append(button);
    }

    let footer = document.querySelector('.site-footer');
    if (!footer) {
      footer = document.createElement('footer');
      const legal = document.createElement('div');
      const project = document.createElement('p');
      footer.className = 'site-footer site-footer--compact';
      legal.className = 'container footer__legal';
      project.textContent = `© ${new Date().getFullYear()} CyberShield.`;
      legal.append(project);
      footer.append(legal);
      document.body.append(footer);
    }
    if (!footer.querySelector('.footer__disclosure')) {
      const legal = footer.querySelector('.footer__legal') || footer;
      const disclosure = document.createElement('p');
      disclosure.className = 'footer__disclosure';
      disclosure.textContent = disclosureText;
      legal.append(disclosure);
    }
    footer.querySelectorAll('p:not(.footer__disclosure)').forEach((paragraph) => {
      if (/\b(demo|demonstration|prototype|educational project)\b/i.test(paragraph.textContent)) paragraph.remove();
    });
  }

  async function initializeAuthNavigation() {
    const authApi = window.CyberShieldAuthApi;
    if (!authApi) return;

    const nav = document.querySelector('.main-nav__inner');
    const insidePages = window.location.pathname.includes('/pages/');
    const hasAccountAction = nav?.querySelector(
      'a[href$="login.html"], a[href$="dashboard.html"], [data-auth-logout]'
    );
    if (nav && !hasAccountAction) {
      const guestLink = document.createElement('a');
      const dashboardLink = document.createElement('a');
      guestLink.href = insidePages ? 'login.html' : 'pages/login.html';
      guestLink.textContent = 'Sign in';
      guestLink.dataset.authVisible = 'guest';
      dashboardLink.href = insidePages ? 'dashboard.html' : 'pages/dashboard.html';
      dashboardLink.textContent = 'My Complaints';
      dashboardLink.dataset.authVisible = 'user';
      dashboardLink.hidden = true;
      nav.append(guestLink, dashboardLink);
    }

    const guestItems = document.querySelectorAll('[data-auth-visible="guest"]');
    const userItems = document.querySelectorAll('[data-auth-visible="user"]');
    const logoutButtons = document.querySelectorAll('[data-auth-logout]');

    async function refreshUnreadCount() {
      const link = document.querySelector('[data-notification-navigation]');
      if (!link) return;
      try {
        const response = await authApi.getUnreadCount();
        const count = response.data.count;
        const badge = link.querySelector('.notification-nav__badge');
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = count === 0;
        link.setAttribute('aria-label', `Notifications, ${count} unread`);
      } catch (error) {
        if (error.status !== 401) link.setAttribute('aria-label', 'Notifications');
      }
    }

    function organizeAccountNavigation() {
      if (!nav || nav.querySelector('.account-menu')) return;
      const items = [...nav.querySelectorAll(
        '[data-auth-visible="user"], [data-notification-navigation], [data-admin-navigation], [data-auth-logout]'
      )].filter((item) => !item.hidden);
      if (!items.length) return;
      const menu = document.createElement('div');
      const trigger = document.createElement('button');
      const panel = document.createElement('div');
      menu.className = 'account-menu';
      trigger.className = 'account-menu__trigger';
      trigger.type = 'button';
      trigger.textContent = 'My account';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', 'account-menu-panel');
      panel.className = 'account-menu__panel';
      panel.id = 'account-menu-panel';
      panel.hidden = true;
      panel.append(...items);
      menu.append(trigger, panel);
      nav.append(menu);
      function setOpen(open, restoreFocus = false) {
        trigger.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        if (restoreFocus) trigger.focus();
      }
      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(trigger.getAttribute('aria-expanded') !== 'true');
      });
      panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
      document.addEventListener('click', (event) => {
        if (!panel.hidden && !menu.contains(event.target)) setOpen(false);
      });
      menu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
      });
    }

    try {
      const response = await authApi.getCurrentUser();
      const user = response.data.user;
      guestItems.forEach((item) => { item.hidden = true; });
      userItems.forEach((item) => { item.hidden = false; });
      if (nav && !nav.querySelector('[data-notification-navigation]')) {
        const notificationLink = document.createElement('a');
        const label = document.createElement('span');
        const badge = document.createElement('span');
        notificationLink.href = insidePages ? 'notifications.html' : 'pages/notifications.html';
        notificationLink.dataset.notificationNavigation = '';
        notificationLink.className = 'notification-nav';
        notificationLink.setAttribute('aria-label', 'Notifications, 0 unread');
        label.textContent = 'Notifications';
        badge.className = 'notification-nav__badge';
        badge.hidden = true;
        badge.textContent = '0';
        notificationLink.append(label, badge);
        nav.append(notificationLink);
      }
      await refreshUnreadCount();
      window.addEventListener('cybershield:notifications-changed', refreshUnreadCount);
      window.CyberShieldNotifications = { refreshUnreadCount };
      organizeAccountNavigation();
    } catch (error) {
      if (error.status !== 401) return;
      guestItems.forEach((item) => { item.hidden = false; });
      userItems.forEach((item) => { item.hidden = true; });
    }

    logoutButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await authApi.logout();
          window.location.assign('login.html');
        } catch (error) {
          button.disabled = false;
        }
      });
    });
  }

  function initializeChatLauncher() {
    if (document.querySelector('[data-cybershield-chat-launcher]')) return;
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'chat-launcher';
    launcher.dataset.cybershieldChatLauncher = '';
    launcher.setAttribute('aria-label', 'Open CyberShield Assistant');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    const mark = document.createElement('span');
    const label = document.createElement('span');
    mark.className = 'chat-launcher__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '?';
    label.textContent = window.CyberShieldI18n?.t('askCyber') || 'Ask CyberShield';
    launcher.append(mark, label);
    document.body.append(launcher);

    let loader;
    launcher.addEventListener('click', () => {
      if (!loader) {
        loader = new Promise((resolve, reject) => {
          const stylesheet = document.createElement('link');
          const polishStylesheet = document.createElement('link');
          const script = document.createElement('script');
          stylesheet.rel = 'stylesheet';
          stylesheet.href = `${window.location.pathname.includes('/pages/') ? '../' : ''}css/chat.css?v=phase-chat`;
          polishStylesheet.rel = 'stylesheet';
          polishStylesheet.href = `${window.location.pathname.includes('/pages/') ? '../' : ''}css/chat-polish.css?v=ux-2`;
          script.src = `${window.location.pathname.includes('/pages/') ? '../' : ''}js/chat.js?v=phase-chat`;
          script.onload = resolve;
          script.onerror = reject;
          document.head.append(stylesheet, polishStylesheet, script);
        });
      }
      launcher.disabled = true;
      loader.then(() => {
        window.CyberShieldChat.initialize(launcher);
        window.CyberShieldChat.open();
      }).catch(() => {
        launcher.disabled = false;
        launcher.setAttribute('aria-label', 'CyberShield Assistant could not load');
      });
    });
  }

  function initializeFeedback() {
    document.querySelectorAll('[data-feedback]').forEach((panel) => {
      if (panel.dataset.feedbackReady) return;
      panel.dataset.feedbackReady = 'true';
      panel.querySelectorAll('[data-helpful]').forEach((button) => button.addEventListener('click', () => {
        try {
          const stored = JSON.parse(localStorage.getItem('cybershield_feedback') || '[]');
          stored.push({ helpful: button.dataset.helpful === 'true', page: window.location.pathname, timestamp: new Date().toISOString() });
          localStorage.setItem('cybershield_feedback', JSON.stringify(stored.slice(-20)));
        } catch (error) { /* Feedback remains acknowledged when storage is unavailable. */ }
        panel.querySelectorAll('[data-helpful]').forEach((item) => { item.disabled = true; });
        const status = panel.querySelector('[data-feedback-status]');
        if (status) status.textContent = window.CyberShieldI18n?.t('thanks') || 'Thank you for your feedback.';
      }));
    });
  }

  function initializePage() {
    ensureCitizenShell();
    window.CyberShieldI18n?.ensureSwitcher();
    initializeAuthNavigation();
    initializeChatLauncher();
    initializeFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage, { once: true });
  else initializePage();
})();
