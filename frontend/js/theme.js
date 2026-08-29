/**
 * Dark Mode Manager – persists preference to localStorage,
 * respects system preference as default, and wires up toggle buttons.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'cybershield-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function storeTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update all toggle buttons on the page
    document.querySelectorAll('.dark-mode-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === DARK ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', theme === DARK ? 'true' : 'false');
    });
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || LIGHT;
    const next = current === DARK ? LIGHT : DARK;
    storeTheme(next);
    applyTheme(next);
  }

  // Apply on load immediately to avoid flash
  const stored = getStoredTheme();
  const initial = stored || getSystemPreference();
  applyTheme(initial);

  // Wire up buttons after DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.dark-mode-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });

    // Listen for system preference changes (only if no stored preference)
    if (!stored && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getStoredTheme()) {
          applyTheme(e.matches ? DARK : LIGHT);
        }
      });
    }
  });

  // Expose globally so other scripts can call it
  window.CyberShieldTheme = { toggle: toggle, apply: applyTheme };
}());
