(function () {
  "use strict";
  var page = window.SCHOOL_PAGE;
  if (!page || !page.accentColor) return;
  document.documentElement.style.setProperty("--school-red", page.accentColor);
})();
