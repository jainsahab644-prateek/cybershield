(() => {
  'use strict';

  const accordionButtons = document.querySelectorAll('.accordion button');

  accordionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const panelId = button.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      const willOpen = button.getAttribute('aria-expanded') !== 'true';

      accordionButtons.forEach((otherButton) => {
        const otherPanelId = otherButton.getAttribute('aria-controls');
        const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
        otherButton.setAttribute('aria-expanded', 'false');
        if (otherPanel) otherPanel.hidden = true;
      });

      button.setAttribute('aria-expanded', String(willOpen));
      if (panel) panel.hidden = !willOpen;
    });
  });

})();
