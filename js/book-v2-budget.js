/* Decides whether a finished Book V2 book is allowed to start.
   The website planner calls authorise(), which cannot approve a paid run.
   This file does not call a model, draw a picture, or read a provider key. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Budget = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* Planner averages only. Paid calls use the listed token prices in
     book-v2-cost.js and stop before the next call's upper bound. */
  var TEXT_USD = 0.057495;
  var IMAGE_USD = 0.039657;
  var VISION_USD = 0.001472;
  var GBP_PER_USD = 0.754;
  var MAX_TEXT = 8;
  var MAX_IMAGE = 24;
  var MAX_VISION = 24;
  var BUDGET_USD = 1.2;

  function money(usd) {
    var dollars = Math.round(usd * 1000000) / 1000000;
    return {
      usd: dollars,
      gbp: Math.round(dollars * GBP_PER_USD * 1000) / 1000
    };
  }

  function price(calls) {
    var used = calls || {};
    var usd = (Number(used.text) || 0) * TEXT_USD +
      (Number(used.image) || 0) * IMAGE_USD +
      (Number(used.vision) || 0) * VISION_USD;
    return money(usd);
  }

  function expectedCalls() {
    return { text: 3, image: 13, vision: 13 };
  }

  function ceilingCalls() {
    return { text: MAX_TEXT, image: MAX_IMAGE, vision: MAX_VISION };
  }

  function quote() {
    var expected = price(expectedCalls());
    var ceiling = price(ceilingCalls());
    return {
      pages: 12,
      calls: expectedCalls(),
      maxCalls: ceilingCalls(),
      budgetUsd: BUDGET_USD,
      expectedUsd: expected.usd,
      expectedGbp: expected.gbp,
      ceilingUsd: ceiling.usd,
      ceilingGbp: ceiling.gbp,
      steps: [
        { id: "plan", state: "ready" },
        { id: "story", state: "waiting" },
        { id: "check", state: "waiting" },
        { id: "art", state: "waiting" },
        { id: "pictures", state: "waiting" },
        { id: "save", state: "waiting" },
        { id: "read", state: "waiting" }
      ]
    };
  }

  function block(reason, message, extra) {
    return Object.assign({
      ok: false,
      authorised: false,
      duplicate: reason === "already-generated",
      reason: reason,
      calls: { text: 0, image: 0, vision: 0 },
      quote: quote(),
      message: message
    }, extra || {});
  }

  function budgetFor(input) {
    var requested = Number(input && input.budgetUsd);
    if (!isFinite(requested) || requested <= 0) return BUDGET_USD;
    return Math.min(requested, BUDGET_USD);
  }

  /* The gates that apply once a paid run is separately approved.
     A caller cannot raise the call caps or the budget. */
  function decide(input) {
    var source = input || {};
    var plan = quote();
    if (source.approved !== true) {
      return block(
        "paid-generation-not-approved",
        "The story plan can be saved. Writing and pictures stay off until that is approved."
      );
    }
    if (!source.accountId) return block("unauthorised", "Sign in before this book can be written. Nothing was started.");
    if (source.accountKind === "child" && source.childPermitted !== true) {
      return block("child-not-permitted", "A child cannot start a paid story unless a parent has allowed it. Nothing was started.");
    }
    if (source.accountKind === "child" && source.allowanceReserved !== true) {
      return block("allowance", "This child has no story allowance left for today. Nothing was started.");
    }
    if (source.alreadyGenerated) {
      return block("already-generated", "This book is already on the shelf. It was not generated again.");
    }
    var calls = source.calls || expectedCalls();
    if ((Number(calls.text) || 0) > MAX_TEXT || (Number(calls.image) || 0) > MAX_IMAGE || (Number(calls.vision) || 0) > MAX_VISION) {
      return block("call-cap", "This book would take more story or picture calls than Wondii allows. Nothing was started.");
    }
    var cost = price(calls);
    if (cost.usd > budgetFor(source)) {
      return block("budget", "This book would cost more than its budget. Nothing was started.");
    }
    return {
      ok: true,
      authorised: true,
      duplicate: false,
      reason: "ready",
      calls: {
        text: Number(calls.text) || 0,
        image: Number(calls.image) || 0,
        vision: Number(calls.vision) || 0
      },
      quote: plan,
      cost: cost,
      message: "This book is within the story, picture, and budget limits."
    };
  }

  /* Website entry. Paid approval cannot be switched on by the request. */
  function authorise(input) {
    return decide(Object.assign({}, input || {}, { approved: false }));
  }

  return {
    TEXT_USD: TEXT_USD,
    IMAGE_USD: IMAGE_USD,
    VISION_USD: VISION_USD,
    GBP_PER_USD: GBP_PER_USD,
    MAX_TEXT: MAX_TEXT,
    MAX_IMAGE: MAX_IMAGE,
    MAX_VISION: MAX_VISION,
    BUDGET_USD: BUDGET_USD,
    quote: quote,
    price: price,
    decide: decide,
    authorise: authorise
  };
});
