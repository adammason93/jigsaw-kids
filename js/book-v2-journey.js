/* The path from a saved story plan to a finished book.
   Plan, writing, art direction, pictures, checks, save, then the 3D reader.
   Those stages already exist. This file does not call a model or draw a picture.
   Paid writing stays behind the budget gate until it is approved. */
(function (root, factory) {
  var api = factory(typeof require === "function" ? require("./book-v2-budget.js") : root.WondiiBookV2Budget);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Journey = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Budget) {
  "use strict";

  var STAGES = [
    { id: "plan", label: "Story plan", source: "scripts/book/handle-request.js" },
    { id: "story", label: "Story writing", source: "scripts/book/generate.js" },
    { id: "art", label: "Art direction", source: "js/book-art-direction.js" },
    { id: "pictures", label: "Pictures", source: "scripts/book/generate.js" },
    { id: "check", label: "Picture check", source: "js/book-v2-identity.js" },
    { id: "save", label: "Save the book", source: "js/book-v2-shelf.js" },
    { id: "read", label: "Open the book", source: "games/book-prototype/book-data.js" }
  ];

  function stages() {
    return STAGES.map(function (stage, index) {
      return {
        id: stage.id,
        label: stage.label,
        source: stage.source,
        state: index === 0 ? "saved" : "waiting"
      };
    });
  }

  /* A saved plan can be resumed later. Nothing is written or drawn here. */
  function resume(plan) {
    var source = plan || {};
    var gate = Budget.authorise({
      approved: true,
      accountId: source.ownerId || source.ownerUserId || "",
      accountKind: source.childId ? "child" : "adult",
      alreadyGenerated: source.generated === true || source.recordKind === "book"
    });
    return {
      ok: false,
      started: false,
      paid: false,
      stage: "plan",
      stages: stages(),
      reason: gate.reason,
      message: "The story idea is saved. The illustrated book has not been made yet."
    };
  }

  return {
    stages: stages,
    resume: resume
  };
});
