var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// scripts/book/picture-step.js
var require_picture_step = __commonJS({
  "scripts/book/picture-step.js"(exports, module) {
    function durableImage(shot) {
      var kept = String(shot && (shot.dataUrl || shot.path) || "");
      return kept.indexOf("data:image/") === 0 || kept.indexOf("/storybook/pictures/") >= 0;
    }
    function lastEntry(entries, pageId, kind) {
      var found = null;
      (entries || []).forEach(function(entry) {
        if (!entry || String(entry.pageId || "") !== pageId || entry.kind !== kind) return;
        found = entry;
      });
      return found;
    }
    function attemptSaved(shot) {
      return !!(shot && shot.attempts || []).some(function(item) {
        var kept = String(item && (item.dataUrl || item.path) || "");
        return kept.indexOf("data:image/") === 0 || kept.indexOf("/storybook/") >= 0;
      });
    }
    function repairReady(shot, maxRepairs) {
      var attempts = shot && shot.attempts || [];
      var repairs = attempts.filter(function(item) {
        return item && item.kind === "repair";
      }).length;
      var failed = attempts.some(function(item) {
        if (!item || item.kind === "repair" || !item.problems || !item.problems.length) return false;
        return item.problems.some(function(problem) {
          return String(problem || "").indexOf("check-incomplete:") !== 0;
        });
      });
      return failed && repairs < maxRepairs;
    }
    function nextPictureStep(pages, pictures, spend, holds, options) {
      var entries = spend && spend.entries || [];
      var keptHolds = holds || {};
      var maxRepairs = options && Number(options.maxRepairs) >= 0 ? Number(options.maxRepairs) : 1;
      var list = Array.isArray(pages) ? pages : [];
      for (var index = 0; index < list.length; index += 1) {
        var page = list[index] || {};
        var pageId = String(page.pageId || "p" + (index + 1));
        var shot = pictures && pictures[pageId] || null;
        if (shot && shot.accepted === true) continue;
        if (shot && shot.unresolved === true) return { action: "blocked", pageId, index };
        var hold = String(keptHolds[pageId] || "");
        var imageEntry = lastEntry(entries, pageId, "image");
        var visionEntry = lastEntry(entries, pageId, "vision");
        var saved = !!(shot && durableImage(shot));
        var pending = shot && shot.pending ? String(shot.pending) : "";
        if (saved && pending === "accepting" && shot.report) {
          return { action: "accept", pageId, index, image: shot.dataUrl || shot.path, report: shot.report };
        }
        if (saved && (pending === "check" || pending === "repair-check" || pending === "clarify")) {
          var openVision = visionEntry && (visionEntry.status === "uncertain" || visionEntry.status === "reserved");
          if (openVision && hold !== "reported") {
            return { action: "hold", pageId, index, reason: "picture-uncertain" };
          }
          return {
            action: "check",
            pageId,
            index,
            kind: pending === "repair-check" ? "repair" : pending === "clarify" ? "clarify" : "new",
            image: shot.dataUrl || shot.path
          };
        }
        if (!saved) {
          var openImage = imageEntry && (imageEntry.status === "uncertain" || imageEntry.status === "reserved" || imageEntry.status === "settled");
          if (openImage && !attemptSaved(shot)) {
            if (hold === "reported") {
              return { action: "draw", pageId, index, kind: imageEntry.purpose === "repair" ? "repair" : "new" };
            }
            return {
              action: "hold",
              pageId,
              index,
              reason: imageEntry.status === "settled" ? "picture-lost" : "picture-uncertain"
            };
          }
          if (repairReady(shot, maxRepairs)) return { action: "draw", pageId, index, kind: "repair" };
          return { action: "draw", pageId, index, kind: "new" };
        }
        if (repairReady(shot, maxRepairs)) return { action: "draw", pageId, index, kind: "repair" };
        return { action: "blocked", pageId, index };
      }
      return { action: "finish" };
    }
    function pictureUnitMessage(kind, pageNumber) {
      var page = "Page " + pageNumber;
      if (kind === "drawn") return page + " is saved. Its check has not started. Continuing may use more of this book's budget.";
      if (kind === "accepted") return page + " is saved. The next picture has not been started. Continuing may use more of this book's budget.";
      if (kind === "repair") return page + " did not pass its check. The picture is saved. The next step can try once more. Continuing may use more of this book's budget.";
      if (kind === "clarify") return page + " is saved. Its check needs one more look. Continuing may use more of this book's budget.";
      if (kind === "picture-lost") return "A picture for " + page.toLowerCase() + " was charged, but it was not saved. Continue again only if you want to pay for a new picture. Saved pages stay as they are.";
      if (kind === "picture-uncertain") return "A picture call for " + page.toLowerCase() + " may already have been charged, and its picture was not saved. Continue again only if you want to pay for another picture. Saved pages stay as they are.";
      return "This picture step is saved. Continuing may use more of this book's budget.";
    }
    module.exports = {
      nextPictureStep,
      pictureUnitMessage,
      durableImage
    };
  }
});

// js/book-v2-cost.js
var require_book_v2_cost = __commonJS({
  "js/book-v2-cost.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookV2Cost = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var TEXT = { input: 2, output: 10, cachedInput: 0.1 };
      var VISION = { input: 0.15, output: 0.6 };
      var IMAGE = { textInput: 5, imageInput: 8, imageOutput: 30 };
      var IMAGE_INPUT_OBSERVED = 1536;
      var IMAGE_OUTPUT_OBSERVED = 343;
      var IMAGE_TEXT_OBSERVED = 800;
      var IMAGE_INPUT_BOUND = 2048;
      var IMAGE_OUTPUT_BOUND = 512;
      var IMAGE_TEXT_BOUND = 1200;
      var VISION_IMAGE_TOKENS = 2833;
      var VISION_TEXT_BOUND = 800;
      var VISION_OUTPUT_BOUND = 700;
      var VISION_EXPECTED_USD = 62e-5;
      var STORY_EXPECTED_USD = 0.06585;
      var MAX_BUDGET_USD = 8;
      var STORY_UPPER = [
        { input: 2475, output: 8e3, times: 1 },
        { input: 6475, output: 8e3, times: 2 },
        { input: 2334, output: 6e3, times: 1 },
        { input: 5e3, output: 6e3, times: 2 }
      ];
      function money(usd) {
        var value = Number(usd);
        if (!isFinite(value) || value < 0) return 0;
        return Math.round(value * 1e6) / 1e6;
      }
      function charsOf(brief) {
        if (!brief) return 0;
        if (typeof brief === "string") return brief.length;
        return String(brief.system || "").length + String(brief.user || "").length;
      }
      function tokensFromChars(chars) {
        return Math.ceil(Math.max(0, Number(chars) || 0) / 3);
      }
      function textBound(brief, maxOutputTokens) {
        var input = tokensFromChars(charsOf(brief));
        var output = Number(maxOutputTokens) || 8e3;
        return money((input * TEXT.input + output * TEXT.output) / 1e6);
      }
      function imageAmount(textTokens, referenceCount, outputTokens, inputPerRef) {
        var refs = Math.max(0, Number(referenceCount) || 0);
        return money((textTokens * IMAGE.textInput + refs * inputPerRef * IMAGE.imageInput + outputTokens * IMAGE.imageOutput) / 1e6);
      }
      function imageBound(prompt, referenceCount) {
        var text = Math.max(IMAGE_TEXT_BOUND, tokensFromChars(String(prompt || "").length));
        return imageAmount(text, referenceCount, IMAGE_OUTPUT_BOUND, IMAGE_INPUT_BOUND);
      }
      function imageExpected(referenceCount) {
        return imageAmount(IMAGE_TEXT_OBSERVED, referenceCount, IMAGE_OUTPUT_OBSERVED, IMAGE_INPUT_OBSERVED);
      }
      function visionBound() {
        return money(((VISION_IMAGE_TOKENS + VISION_TEXT_BOUND) * VISION.input + VISION_OUTPUT_BOUND * VISION.output) / 1e6);
      }
      function storyUpper() {
        return money(STORY_UPPER.reduce(function(sum, call) {
          return sum + (call.input * TEXT.input + call.output * TEXT.output) / 1e6 * call.times;
        }, 0));
      }
      function settleText(usage, fallbackUsd) {
        var fallback = money(fallbackUsd);
        if (!usage) return fallback;
        var prompt = Number(usage.prompt_tokens) || 0;
        var output = Number(usage.completion_tokens) || 0;
        if (prompt + output <= 0) return fallback;
        var details = usage.prompt_tokens_details || {};
        var cached = Math.min(prompt, Number(details.cached_tokens) || 0);
        return money(((prompt - cached) * TEXT.input + cached * TEXT.cachedInput + output * TEXT.output) / 1e6);
      }
      function settleImage(usage, fallbackUsd) {
        var fallback = money(fallbackUsd);
        if (!usage) return fallback;
        var details = usage.input_tokens_details || {};
        var textIn = details.text_tokens != null ? Number(details.text_tokens) || 0 : Number(usage.input_tokens) || 0;
        var imageIn = Number(details.image_tokens) || 0;
        var output = Number(usage.output_tokens) || 0;
        if (textIn + imageIn + output <= 0) return fallback;
        return money((textIn * IMAGE.textInput + imageIn * IMAGE.imageInput + output * IMAGE.imageOutput) / 1e6);
      }
      function settleVision(usage, fallbackUsd) {
        return settleText(usage, fallbackUsd);
      }
      function settle(kind, usage, fallbackUsd) {
        if (kind === "image") return settleImage(usage, fallbackUsd);
        if (kind === "vision") return settleVision(usage, fallbackUsd);
        return settleText(usage, fallbackUsd);
      }
      function usageSummary(usage) {
        var source = usage || {};
        var details = source.input_tokens_details || source.prompt_tokens_details || {};
        return {
          promptTokens: Number(source.prompt_tokens) || 0,
          completionTokens: Number(source.completion_tokens) || 0,
          inputTokens: Number(source.input_tokens) || 0,
          outputTokens: Number(source.output_tokens) || 0,
          textTokens: Number(details.text_tokens) || 0,
          imageTokens: Number(details.image_tokens) || 0,
          cachedTokens: Number(details.cached_tokens) || 0
        };
      }
      function quoteBook(characters, pages) {
        var cast = Math.max(0, Number(characters) || 0);
        var count = Number(pages) || 12;
        var picture = imageExpected(cast);
        var pictureBound = imageBound("", cast);
        var check = VISION_EXPECTED_USD;
        var checkBound = visionBound();
        var expected = money(STORY_EXPECTED_USD + picture * count + check * count);
        var upper = money(storyUpper() + pictureBound * (count + 1) + checkBound * (count + 1));
        return {
          characters: cast,
          pages: count,
          expectedUsd: expected,
          upperUsd: upper,
          repairUsd: money(picture + check),
          repairUpperUsd: money(pictureBound + checkBound),
          storyExpectedUsd: STORY_EXPECTED_USD,
          storyUpperUsd: storyUpper(),
          pictureExpectedUsd: picture,
          pictureUpperUsd: pictureBound,
          providerInvoiceCap: false
        };
      }
      return {
        TEXT,
        VISION,
        IMAGE,
        IMAGE_INPUT_OBSERVED,
        IMAGE_OUTPUT_OBSERVED,
        IMAGE_INPUT_BOUND,
        IMAGE_OUTPUT_BOUND,
        MAX_BUDGET_USD,
        STORY_EXPECTED_USD,
        money,
        textBound,
        imageBound,
        imageExpected,
        visionBound,
        storyUpper,
        settle,
        usageSummary,
        quoteBook
      };
    });
  }
});

// supabase/functions/book-v2/orchestrate.js
var require_orchestrate = __commonJS({
  "supabase/functions/book-v2/orchestrate.js"(exports, module) {
    "use strict";
    var PictureStep = require_picture_step();
    var Cost = require_book_v2_cost();
    var LEASE_MS = 24e4;
    var DRAW_REFERENCES = 4;
    var PAUSE = {
      "picture-uncertain": true,
      "picture-lost": true,
      "budget": true,
      "call-cap": true,
      "uncertain": true,
      "model-timeout": true,
      "picture-timeout": true,
      "authorisation-withdrawn": true
    };
    var FAIL = {
      picture: true,
      story: true,
      artwork: true,
      plan: true,
      "writer-not-connected": true,
      "paid-generation-not-approved": true
    };
    function refuse(reason) {
      return { wake: false, reason, operationId: "", action: "" };
    }
    function money(value) {
      return Cost.money(value);
    }
    function entriesOf(job) {
      var spend = job && (job.spend || job.checkpoint && job.checkpoint.spend) || {};
      return Array.isArray(spend.entries) ? spend.entries : [];
    }
    function listedOf(job) {
      var spend = job && (job.spend || job.checkpoint && job.checkpoint.spend) || {};
      return money(spend.listedUsd || 0);
    }
    function openEntry(entries) {
      var found = null;
      entries.forEach(function(entry) {
        if (!entry) return;
        if (entry.status === "reserved" || entry.status === "uncertain") found = entry;
      });
      return found;
    }
    function countKind(entries, pageId, kind) {
      var count = 0;
      entries.forEach(function(entry) {
        if (!entry || entry.kind !== kind) return;
        if (pageId && String(entry.pageId || "") !== pageId) return;
        count += 1;
      });
      return count;
    }
    function lastKind(entries, pageId, kind) {
      var found = null;
      entries.forEach(function(entry) {
        if (!entry || entry.kind !== kind) return;
        if (String(entry.pageId || "") !== pageId) return;
        found = entry;
      });
      return found;
    }
    function pageList(checkpoint) {
      var story = checkpoint && checkpoint.story || {};
      var pages = Array.isArray(story.pages) ? story.pages : [];
      var units = story.composition && Array.isArray(story.composition.units) ? story.composition.units : [];
      if (!units.length) return pages;
      return units.map(function(unit) {
        var id = String(unit && (unit.beatId || unit.id) || "");
        var match = null;
        pages.forEach(function(page) {
          if (page && String(page.pageId || "") === id) match = page;
        });
        return match || { pageId: id };
      });
    }
    function storyReady(checkpoint) {
      var story = checkpoint && checkpoint.story;
      return !!(story && story.status === "REVIEWABLE" && Array.isArray(story.pages) && story.pages.length);
    }
    function textStepBound() {
      return money((6475 * Cost.TEXT.input + 8e3 * Cost.TEXT.output) / 1e6);
    }
    function boundFor(action, checkpoint) {
      if (action === "draw") {
        var cast = checkpoint && checkpoint.story && checkpoint.story.pages && checkpoint.story.pages[0] && checkpoint.story.pages[0].charactersPresent;
        var refs = Math.max(DRAW_REFERENCES, Array.isArray(cast) ? cast.length : 0);
        return Cost.imageBound("", refs);
      }
      if (action === "check") return Cost.visionBound();
      if (action === "write") return textStepBound();
      return 0;
    }
    function leaseActive(job, now) {
      if (!job || job.status !== "running") return false;
      var age = Number(now) - Number(job.startedAt || 0);
      return age >= 0 && age < LEASE_MS;
    }
    function remember(prior, source, ports) {
      var request = source || {};
      var accountId = String(request.accountId || "");
      var creationKey = String(request.creationKey || "");
      var cap = Number(ports && ports.budgetUsd);
      var existing = prior && prior.auto;
      if (existing && existing.revoked === true) {
        var reapproved = ports && ports.automatic === true && request.approveGeneration === true && request.automatic === true && request.accountKind === "adult" && String(existing.accountId || "") === accountId && String(existing.creationKey || "") === creationKey;
        if (!reapproved) return existing;
        existing = null;
      }
      if (existing && existing.authorised === true) {
        if (existing.accountKind !== "adult") return null;
        if (String(existing.accountId || "") !== accountId) return null;
        if (String(existing.creationKey || "") !== creationKey) return null;
        if (!(cap > 0) || cap > Cost.MAX_BUDGET_USD) return null;
        if (money(existing.budgetUsd) !== money(cap)) return null;
        return existing;
      }
      if (!ports || ports.automatic !== true) return null;
      if (request.approveGeneration !== true || request.automatic !== true) return null;
      if (request.accountKind !== "adult") return null;
      if (!accountId || !creationKey) return null;
      if (ports.accountId && String(ports.accountId) !== accountId) return null;
      if (!(cap > 0) || cap > Cost.MAX_BUDGET_USD) return null;
      return {
        authorised: true,
        accountId,
        creationKey,
        accountKind: "adult",
        budgetUsd: money(cap),
        authorisedAt: (/* @__PURE__ */ new Date()).toISOString(),
        completed: [],
        inflight: ""
      };
    }
    function nextAction(job) {
      var checkpoint = job.checkpoint || {};
      if (job.stage === "save") return { action: "save", pageId: "" };
      if (!storyReady(checkpoint)) {
        if (job.stage === "pictures" || job.stage === "read") return { action: "blocked", reason: "checkpoint" };
        return { action: "write", pageId: "" };
      }
      var decision = PictureStep.nextPictureStep(
        pageList(checkpoint),
        checkpoint.pictures || {},
        checkpoint.spend || job.spend || { entries: [] },
        checkpoint.pictureHolds || {},
        { maxRepairs: 1 }
      );
      if (decision.action === "finish") return { action: "save", pageId: "" };
      return decision;
    }
    function operationId(job, action) {
      var key = String(job.creationKey || "");
      var rows = entriesOf(job);
      if (action.action === "write") {
        var stage = String(job.writerStage || job.checkpoint && job.checkpoint.writer && job.checkpoint.writer.stage || "story");
        var text = job.calls && Number(job.calls.text) || 0;
        return key + ":text:" + stage + ":" + (text + 1);
      }
      if (action.action === "draw" || action.action === "check") {
        var kind = action.action === "draw" ? "image" : "vision";
        var seen = countKind(rows, action.pageId, kind);
        return key + ":" + kind + ":" + action.pageId + ":" + String(action.kind || "new") + ":" + (seen + 1);
      }
      if (action.action === "accept") return key + ":accept:" + action.pageId;
      if (action.action === "save") return key + ":save";
      return "";
    }
    function evaluate(job, now, context) {
      var source = job || {};
      var auto = source.auto || {};
      var gate = context || {};
      var paid = gate.paid || {};
      if (auto.authorised !== true || !auto.authorisedAt) return refuse("not-authorised");
      if (auto.revoked === true) return refuse("authorisation-withdrawn");
      if (auto.accountKind !== "adult") return refuse("not-adult");
      if (String(auto.accountId || "") !== String(source.accountId || "")) return refuse("wrong-account");
      if (String(auto.creationKey || "") !== String(source.creationKey || "")) return refuse("wrong-story");
      if (gate.automatic !== true) return refuse("automatic-generation-off");
      if (!paid.ok) return refuse(paid.reason || "paid-generation-not-approved");
      if (String(paid.accountId || "") !== String(source.accountId || "")) return refuse("wrong-account");
      if (String(paid.creationKey || "") !== String(source.creationKey || "")) return refuse("wrong-story");
      var cap = money(paid.budgetUsd);
      if (!(cap > 0) || cap > Cost.MAX_BUDGET_USD) return refuse("budget");
      if (money(auto.budgetUsd) !== cap || money(source.budgetUsd) !== cap) return refuse("budget");
      if (source.status === "complete" || source.reason === "saved" || source.stage === "read") return refuse("already-generated");
      if (PAUSE[source.reason] || FAIL[source.reason]) return refuse(source.reason);
      var rows = entriesOf(source);
      if (openEntry(rows)) return refuse("uncertain");
      if (leaseActive(source, now)) return refuse("already-running");
      if (auto.inflight) return refuse("claim-open");
      var action = nextAction(source);
      if (!action || action.action === "hold") return refuse(action && action.reason || "picture-uncertain");
      if (action.action === "blocked") return refuse(action.reason || "picture");
      if (action.action === "draw") {
        var priorImage = lastKind(rows, action.pageId, "image");
        var shot = source.checkpoint && source.checkpoint.pictures && source.checkpoint.pictures[action.pageId];
        var saved = PictureStep.durableImage(shot);
        if (priorImage && !saved) return refuse(priorImage.status === "settled" ? "picture-lost" : "picture-uncertain");
      }
      var id = operationId(source, action);
      if (!id) return refuse("checkpoint");
      var completed = Array.isArray(auto.completed) ? auto.completed : [];
      if (completed.indexOf(id) >= 0) return refuse("already-completed");
      var listed = listedOf(source);
      var bound = boundFor(action.action, source.checkpoint || {});
      if (!(bound >= 0) || money(listed + bound) > cap) return refuse("budget");
      return {
        wake: true,
        reason: "ready",
        action: action.action,
        pageId: action.pageId || "",
        operationId: id,
        boundUsd: bound
      };
    }
    module.exports = {
      LEASE_MS,
      remember,
      evaluate,
      operationId,
      nextAction,
      boundFor
    };
  }
});

// scripts/book/auto-wake.js
var require_auto_wake = __commonJS({
  "scripts/book/auto-wake.js"(exports, module) {
    var Orchestrate = require_orchestrate();
    function clone(value) {
      return JSON.parse(JSON.stringify(value || {}));
    }
    function stamp(job, decision, now) {
      var next = clone(job);
      next.auto = Object.assign({}, next.auto || {}, {
        inflight: decision.operationId,
        inflightAt: new Date(now).toISOString(),
        claimOwner: decision.operationId + ":" + now + ":" + Math.random().toString(16).slice(2)
      });
      return next;
    }
    function uncertain(job, decision) {
      var next = clone(job);
      next.status = "interrupted";
      next.reason = "uncertain";
      next.recoverable = false;
      next.message = "This step did not finish. It was not started again.";
      next.auto = Object.assign({}, next.auto || {}, { inflight: decision.operationId });
      return next;
    }
    function settle(job, decision, outcome) {
      var next = clone(outcome && outcome.job || job);
      var completed = (next.auto && next.auto.completed || []).slice();
      if (completed.indexOf(decision.operationId) < 0) completed.push(decision.operationId);
      next.auto = Object.assign({}, next.auto || {}, { completed, inflight: "" });
      return next;
    }
    function release(job) {
      var next = clone(job);
      if (next.auto) next.auto = Object.assign({}, next.auto, { inflight: "" });
      return next;
    }
    /* Undo only the stamp this wake wrote. A different owner's job is left alone. */
    async function restoreStamp(store, ref, claimed, prior) {
      if (!store || typeof store.read !== "function") return;
      var current = await store.read(ref);
      var job = current && current.job;
      if (!job || !job.auto || !claimed || !claimed.auto) return;
      if (job.auto.claimOwner !== claimed.auto.claimOwner) return;
      var previous = prior && prior.auto || {};
      var restored = clone(job);
      restored.auto = Object.assign({}, job.auto, {
        inflight: previous.inflight || "",
        inflightAt: previous.inflightAt || "",
        claimOwner: previous.claimOwner || ""
      });
      await store.compareAndSet(ref, null, restored);
    }
    var STOP_MESSAGE = {
      budget: "This story has paused because it reached its spending limit. Nothing more was started.",
      "authorisation-withdrawn": "This story has stopped. Permission to continue was taken away."
    };
    function stopReasonFor(reason) {
      if (reason === "budget") return "budget";
      if (reason === "authorisation-withdrawn" || reason === "not-adult" || reason === "wrong-account" || reason === "wrong-story" || reason === "paid-generation-not-approved") {
        return "authorisation-withdrawn";
      }
      return "";
    }
    function recordStop(store, ref, snap, reason) {
      var job = snap && snap.job;
      var stop = stopReasonFor(reason);
      if (!stop || !job) return null;
      if (job.status === "complete" || job.reason === "saved" || job.stage === "read") return null;
      var auto = job.auto || {};
      if (auto.authorised !== true && auto.revoked !== true) return null;
      if (job.reason === stop && job.status === "interrupted") return null;
      var next = clone(job);
      next.status = "interrupted";
      next.reason = stop;
      next.recoverable = false;
      next.message = STOP_MESSAGE[stop];
      return Promise.resolve(store.compareAndSet(ref, snap.version, next)).then(function(wrote) {
        if (!wrote) return { ran: false, reason: "duplicate", calls: 0 };
        return { ran: false, reason: stop, calls: 0, job: next };
      });
    }
    async function freeze(gate, decision, claimed) {
      if (!gate || typeof gate.holdOperation !== "function") return null;
      try {
        return await gate.holdOperation(decision.operationId, claimed.auto && claimed.auto.claimOwner);
      } catch (error) {
        /* A failed hold still leaves the job stopped. */
        return null;
      }
    }
    async function pass(store, now, context) {
      var gate = context || {};
      var refs = store && store.list ? store.list() : [];
      var chosen = null;
      for (var index = 0; index < refs.length; index += 1) {
        var snap = await store.read(refs[index]);
        if (!snap || !snap.job) continue;
        var paid = typeof gate.permit === "function" ? gate.permit(snap.job) : null;
        var decision = Orchestrate.evaluate(snap.job, now, {
          automatic: gate.automatic === true,
          paid: paid || {}
        });
        if (!decision.wake) {
          var recorded = recordStop(store, refs[index], snap, decision.reason);
          if (recorded) return recorded;
          continue;
        }
        chosen = { ref: refs[index], snap, decision };
        break;
      }
      if (!chosen) return { ran: false, reason: "idle", calls: 0 };
      var claimed = stamp(chosen.snap.job, chosen.decision, now);
      if (!await store.compareAndSet(chosen.ref, chosen.snap.version, claimed)) {
        return { ran: false, reason: "duplicate", operationId: chosen.decision.operationId, calls: 0 };
      }
      /* Approval is checked before the database claim. A refusal here has not
         contacted the provider, so the stamp is removed and the job stays
         continuable. It is not an uncertain provider result. */
      if (typeof gate.prepare === "function") {
        var ready = null;
        try {
          ready = await gate.prepare(claimed, chosen.decision);
        } catch (error) {
          await restoreStamp(store, chosen.ref, claimed, chosen.snap.job);
          return { ran: false, reason: "not-prepared", operationId: chosen.decision.operationId, calls: 0 };
        }
        if (!ready || ready.ok !== true) {
          await restoreStamp(store, chosen.ref, claimed, chosen.snap.job);
          return { ran: false, reason: ready && ready.reason || "paid-generation-not-approved", operationId: chosen.decision.operationId, calls: 0 };
        }
      }
      if (typeof gate.claimOperation === "function") {
        var owned = null;
        try {
          owned = await gate.claimOperation(chosen.decision.operationId, claimed.auto.claimOwner);
        } catch (error) {
          var lost = uncertain(claimed, chosen.decision);
          await freeze(gate, chosen.decision, claimed);
          await store.compareAndSet(chosen.ref, null, lost);
          return { ran: false, reason: "uncertain", operationId: chosen.decision.operationId, calls: 0, job: lost };
        }
        if (!owned || owned.ok !== true) {
          await restoreStamp(store, chosen.ref, claimed, chosen.snap.job);
          return { ran: false, reason: owned && owned.reason || "duplicate", operationId: chosen.decision.operationId, calls: 0 };
        }
      }
      if (typeof gate.confirmOperation === "function") {
        var stillOwns = await gate.confirmOperation(chosen.decision.operationId, claimed.auto.claimOwner);
        if (!stillOwns || stillOwns.ok !== true) {
          var heldClaim = await freeze(gate, chosen.decision, claimed);
          if (heldClaim && heldClaim.ok === true) {
            var confirmedStop = uncertain(claimed, chosen.decision);
            await store.compareAndSet(chosen.ref, null, confirmedStop);
            return { ran: false, reason: "uncertain", operationId: chosen.decision.operationId, calls: 0, job: confirmedStop };
          }
          await restoreStamp(store, chosen.ref, claimed, chosen.snap.job);
          return { ran: false, reason: stillOwns && stillOwns.reason || "stale-claim", operationId: chosen.decision.operationId, calls: 0 };
        }
      }
      var outcome = null;
      try {
        outcome = await gate.step(claimed, chosen.decision);
      } catch (error) {
        var stopped = uncertain(claimed, chosen.decision);
        await freeze(gate, chosen.decision, claimed);
        await store.compareAndSet(chosen.ref, null, stopped);
        return { ran: false, reason: "uncertain", operationId: chosen.decision.operationId, calls: 0, job: stopped };
      }
      if (!outcome || outcome.settled !== true) {
        if (outcome && outcome.preserve === true) {
          await freeze(gate, chosen.decision, claimed);
          return { ran: false, reason: outcome.reason || "uncertain", operationId: chosen.decision.operationId, calls: 0 };
        }
        /* The provider was not contacted. Roll the stamp back and do not hold
           the claim: holding it would make a call that never started look uncertain. */
        if (outcome && (outcome.preProvider === true || outcome.skipped === true)) {
          await restoreStamp(store, chosen.ref, claimed, chosen.snap.job);
          return { ran: false, reason: outcome.reason || "paid-generation-not-approved", operationId: chosen.decision.operationId, calls: 0 };
        }
        var held = uncertain(claimed, chosen.decision);
        if (outcome && outcome.reason) held.reason = outcome.reason;
        if (outcome && outcome.job) {
          held = clone(outcome.job);
          held.auto = Object.assign({}, held.auto || {}, { inflight: chosen.decision.operationId });
        }
        await freeze(gate, chosen.decision, claimed);
        await store.compareAndSet(chosen.ref, null, held);
        return { ran: false, reason: held.reason || "uncertain", operationId: chosen.decision.operationId, calls: 0, job: held };
      }
      var saved = outcome.job ? clone(outcome.job) : claimed;
      var done = settle(saved, chosen.decision, { job: saved });
      await store.compareAndSet(chosen.ref, null, done);
      return { ran: true, reason: "ready", operationId: chosen.decision.operationId, calls: 1, job: done };
    }
    module.exports = { pass };
  }
});
export const orchestrate = require_orchestrate();
export default require_auto_wake();
