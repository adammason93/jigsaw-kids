/**
 * Photo likeness for the story wizard and My Characters.
 * Off unless a grown-up sets SCORE_CONFIG.storybookAllowPhotos (true, 1, or "1")
 * or window.STORYBOOK_ALLOW_PHOTOS === true. The server secret
 * STORYBOOK_ALLOW_PHOTOS is the real gate; this flag only shows the upload UI.
 */
(function (global) {
  "use strict";

  function photosAllowed() {
    var cfg = global.SCORE_CONFIG || global.SCORE_SYNC || {};
    var v = cfg.storybookAllowPhotos;
    if (v === true || v === 1 || v === "1") return true;
    if (global.STORYBOOK_ALLOW_PHOTOS === true) return true;
    return false;
  }

  global.StorybookSafety = {
    photosAllowed: photosAllowed,
  };
})(typeof window !== "undefined" ? window : globalThis);
