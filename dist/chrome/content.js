/* Chrome extension isolated content script. Site-opt-in only. */
(() => {
  'use strict';
  if (!globalThis.TLSCore) return;
  if (globalThis.__TLSPageController) {
    globalThis.__TLSPageController.start();
    return;
  }
  const ctrl = globalThis.TLSCore.createLocalizer(document);
  globalThis.__TLSPageController = ctrl;
  ctrl.start();
})();
