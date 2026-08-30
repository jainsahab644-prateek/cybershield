/**
 * Theme Manager – Enforces light mode across CyberShield.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'cybershield-theme';

  function enforceLightMode() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, 'light');
    } catch (e) {
      /* ignore storage errors */
    }
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // Force light mode immediately on script load
  enforceLightMode();

  document.addEventListener('DOMContentLoaded', function () {
    enforceLightMode();
    // Hide any remaining dark mode toggles if present
    document.querySelectorAll('.dark-mode-toggle').forEach(function (btn) {
      btn.style.display = 'none';
    });
  });

  // Safe global fallback object
  window.CyberShieldTheme = {
    toggle: function () { enforceLightMode(); },
    apply: function () { enforceLightMode(); }
  };
}());

