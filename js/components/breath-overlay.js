(function () {
  'use strict';

  const Breezy = (window.Breezy = window.Breezy || {});

  /**
   * Plays the one-time edge glow. Does nothing when reduced motion is requested.
   */
  function play() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const overlay = document.createElement('div');
    overlay.className = 'breath-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  Breezy.breathOverlay = { play };
})();
