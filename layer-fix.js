// Guard transient foreground layers so mobile scroll cannot leak to the page behind them.
(function () {
  let scrollY = 0;
  let locked = false;
  let wrapping = false;

  const layerSelector = '.modal-overlay.active, .action-sheet.active';

  function injectStyles() {
    if (document.getElementById('layer-fix-styles')) return;
    const style = document.createElement('style');
    style.id = 'layer-fix-styles';
    style.textContent = `
      .modal-overlay,
      .action-sheet {
        overscroll-behavior: contain;
        touch-action: none;
      }

      .modal-content {
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
    `;
    document.head.appendChild(style);
  }

  function lockPage() {
    if (locked) return;
    scrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    locked = true;
  }

  function unlockPage() {
    if (!locked) return;
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    locked = false;
    window.scrollTo(0, scrollY);
  }

  function syncLayerState() {
    if (document.querySelector(layerSelector)) lockPage();
    else unlockPage();
  }

  function clearLayers() {
    document.getElementById('modal-overlay')?.classList.remove('active');
    document.getElementById('action-sheet')?.classList.remove('active');
    syncLayerState();
  }

  function wrapNavigation() {
    if (wrapping || typeof window.navigate !== 'function') return;
    wrapping = true;
    const originalNavigate = window.navigate;
    window.navigate = function guardedNavigate(...args) {
      clearLayers();
      return originalNavigate.apply(this, args);
    };
  }

  function observeLayer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(syncLayerState).observe(el, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    observeLayer('modal-overlay');
    observeLayer('action-sheet');
    wrapNavigation();
    syncLayerState();
  });
})();
