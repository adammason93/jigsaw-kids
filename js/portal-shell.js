/* Which portal shell a signed-in account should see.
   Loading never falls through to the family home, even if time has passed. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiPortalShell = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SCHOOL_NAV = ["home", "classes", "create", "library", "characters", "results"];

  function shellFor(input) {
    var state = input || {};
    if (state.auth === "signed-out") return "personal";
    if (state.auth !== "signed-in") return "loading";
    if (state.status !== "ready") return "loading";
    if (state.organisation) return "school";
    return "personal";
  }

  function routeFromHash(hash) {
    var head = String(hash || "").replace(/^#/, "").split("/")[0];
    if (SCHOOL_NAV.indexOf(head) >= 0) return head;
    if (!head) return "home";
    return "";
  }

  function homeCast(entries) {
    var list = [];
    (entries || []).forEach(function (entry) {
      if (!entry || (entry.source !== "canonical" && entry.source !== "saved")) return;
      if (list.length >= 8) return;
      list.push(entry);
    });
    return list;
  }

  return {
    SCHOOL_NAV: SCHOOL_NAV,
    shellFor: shellFor,
    routeFromHash: routeFromHash,
    homeCast: homeCast
  };
});
