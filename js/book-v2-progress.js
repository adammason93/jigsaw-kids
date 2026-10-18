/* Read-only labels for a Book V2 job. This file does not start generation,
   claim a lease, or change a checkpoint. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Progress = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LEASE_MS = 240000;

  function row(label, tone, word) {
    return { label: label, tone: tone, word: word };
  }

  function namesOf(options) {
    var list = options && Array.isArray(options.names) ? options.names : [];
    return list.map(function (name) { return String(name || "").trim(); }).filter(Boolean);
  }

  function nameLine(names) {
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + " and " + names[1];
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }

  function picturePhase(job) {
    var stage = String(job && job.stage || "");
    var accepted = Number(job && job.acceptedPictures || 0);
    return stage === "art" || stage === "pictures" || stage === "check" || stage === "save" || accepted > 0;
  }

  function illustrationStep(job, mode) {
    var accepted = Number(job && job.acceptedPictures || 0);
    var total = Number(job && job.illustrationUnits || 0);
    var pending = String(job && job.pendingKind || "");
    var stage = String(job && job.stage || "");
    var reason = String(job && job.reason || "");
    var current = accepted + 1;
    if (total && current > total) current = total;
    var checkPending = pending === "check" || pending === "repair-check" || pending === "clarify";
    var action = "ready-draw";
    if (reason === "budget" || reason === "call-cap") action = "blocked";
    else if (reason === "picture") action = "failed";
    else if (mode === "stopped" && String(job && job.status || "") === "running") action = "stopped";
    else if (total > 0 && accepted >= total && !pending) action = "save";
    else if (mode === "working" && stage === "check") action = "checking";
    else if (mode === "working") action = "drawing";
    else if (checkPending) action = "ready-check";
    else if (pending === "accepting") action = "accepted";
    return {
      accepted: accepted,
      total: total,
      current: Math.max(1, current),
      action: action
    };
  }

  function illustrationPlace(step) {
    return step.total
      ? "Illustration " + step.current + " of " + step.total
      : "Illustration " + step.current;
  }

  function illustrationPhrase(step) {
    var place = illustrationPlace(step);
    if (step.action === "drawing") return place + " — drawing";
    if (step.action === "checking") return place + " — checking character consistency";
    if (step.action === "ready-check") return place + " — ready for character check";
    if (step.action === "failed") return place + " — did not pass its check";
    if (step.action === "accepted" || step.action === "save") return place + " — accepted";
    if (step.action === "blocked") return "";
    if (step.action === "stopped") return place + " — this step stopped";
    return place + " — ready to draw";
  }

  function previousPhrase(step) {
    if (!step.accepted || !step.total) return "";
    if (step.action === "save" || step.action === "accepted") return "";
    return "Illustration " + step.accepted + " of " + step.total + " — accepted";
  }

  function continueButton(step) {
    if (step.action === "ready-check") return "Continue — check illustration " + step.current;
    if (step.action === "save") return "Continue — save the book";
    if (step.action === "failed" || step.action === "blocked") return "Continue unavailable";
    if (step.action === "ready-draw") return "Continue — draw illustration " + step.current;
    return "Continue this story";
  }

  function stepWord(step) {
    if (step.action === "drawing") return { tone: "working", word: "Drawing" };
    if (step.action === "checking") return { tone: "working", word: "Checking" };
    if (step.action === "ready-check") return { tone: "ready", word: "Ready to check" };
    if (step.action === "failed" || step.action === "blocked" || step.action === "stopped") return { tone: "stopped", word: "Stopped" };
    if (step.action === "accepted" || step.action === "save") return { tone: "done", word: "Accepted" };
    return { tone: "ready", word: "Ready to draw" };
  }

  function pictureRows(job, mode) {
    var step = illustrationStep(job, mode);
    var countWord = step.total
      ? step.accepted + " of " + step.total + " accepted"
      : (step.accepted ? step.accepted + " accepted" : "Not started");
    var countTone = step.total && step.accepted >= step.total
      ? "done"
      : (mode === "working" ? "working" : "ready");
    var current = stepWord(step);
    var saveTone = step.action === "save" ? "ready" : "waiting";
    var saveWord = step.action === "save" ? "Ready to continue" : "Waiting";
    return [
      row("Story plan", "done", "Done"),
      row("Story outline", "done", "Done"),
      row("Page writing", "done", "Done"),
      row("Illustrations", countTone, countWord),
      row("This step", current.tone, current.word),
      row("Save the book", saveTone, saveWord),
      row("Open the book", "waiting", "Waiting")
    ];
  }

  function pictureDetail(job, names, mode) {
    var step = illustrationStep(job, mode);
    var who = nameLine(names);
    var kept = who ? who + " are saved in this story. " : "The saved characters stay in this story. ";
    var units = Number(job && job.illustrationUnits || 0);
    var leaves = Number(job && job.physicalPages || 0);
    var shape = units > 0 && leaves > units
      ? "This story has " + units + " pictures and " + leaves + " book pages. "
      : "";
    var count = units
      ? step.accepted + " of " + units + " illustrations accepted. "
      : (step.accepted
        ? step.accepted + " accepted picture" + (step.accepted === 1 ? " is" : "s are") + " kept. "
        : "");
    var previous = previousPhrase(step);
    var phrase = illustrationPhrase(step);
    var where = (previous ? previous + ". " : "") + (phrase ? phrase + ". " : "");
    var budget = "Continuing may use more of this book's budget.";
    if (step.action === "failed" || step.action === "blocked") {
      return kept + shape + count + where + String(job && job.message || "This step cannot continue.");
    }
    if (mode === "stopped") {
      var note = String(job && job.message || "");
      return "This step stopped updating. " + kept + shape + count + where + (note ? note + " " : "") + budget;
    }
    return kept + shape + count + where + "The book is not finished. " + budget;
  }

  function illustrate(result, job, mode) {
    if (!picturePhase(job)) return result;
    var step = illustrationStep(job, mode);
    var blocked = step.action === "failed" || step.action === "blocked";
    result.acceptedCount = step.accepted;
    result.unitCount = step.total;
    result.acceptedLine = step.total ? step.accepted + " of " + step.total + " illustrations accepted" : "";
    result.previousLine = previousPhrase(step);
    result.illustration = illustrationPhrase(step);
    result.progress = step.total ? step.accepted / step.total : 0;
    if (result.state === "ready" || (result.state === "stopped" && result.canContinue && !blocked)) {
      result.button = continueButton(step);
    }
    if (blocked) {
      result.canContinue = false;
      result.buttonEnabled = false;
      result.button = "Continue unavailable";
    }
    return result;
  }

  function tail() {
    return [
      row("Art direction", "waiting", "Waiting"),
      row("Pictures", "waiting", "Waiting"),
      row("Picture check", "waiting", "Waiting"),
      row("Save the book", "waiting", "Waiting"),
      row("Open the book", "waiting", "Waiting")
    ];
  }

  function serverRows(job, active) {
    var stages = job && Array.isArray(job.stages) ? job.stages : [];
    if (!stages.length) return [row("Story plan", "waiting", "Waiting")].concat(tail());
    return stages.map(function (stage) {
      var name = String(stage && stage.state || "waiting");
      if (name === "done" || name === "saved") return row(stage.label || "Step", "done", "Done");
      if (name === "running" && active) return row(stage.label || "Step", "working", "Working");
      if (name === "blocked") return row(stage.label || "Step", "stopped", "Stopped");
      return row(stage.label || "Step", "waiting", "Waiting");
    });
  }

  function readyRows(writerStage) {
    if (writerStage === "prose" || writerStage === "prose-repair") {
      return [
        row("Story plan", "done", "Done"),
        row("Story outline", "done", "Done"),
        row("Page writing", "ready", "Ready to continue")
      ].concat(tail());
    }
    if (writerStage === "bible" || writerStage === "bible-repair" || writerStage === "page-plan-repair") {
      return [
        row("Story plan", "done", "Done"),
        row("Story outline", "ready", "Ready to continue")
      ].concat(tail());
    }
    return [
      row("Story plan", "done", "Done"),
      row("Story writing", "ready", "Ready to continue")
    ].concat(tail());
  }

  function readyDetail(writerStage) {
    if (writerStage === "prose") {
      return "The story outline is saved. Page writing is the next step. The pages have not been written yet. Continuing may use more of this book's budget.";
    }
    if (writerStage === "prose-repair") {
      return "The saved pages need another writing check. This is not a finished book. Continuing may use more of this book's budget.";
    }
    if (writerStage === "bible" || writerStage === "bible-repair" || writerStage === "page-plan-repair") {
      return "The story plan is saved. The outline is not finished yet. Continuing may use more of this book's budget.";
    }
    return "This step is saved. The book is not finished. Continuing may use more of this book's budget.";
  }

  function publish(job) {
    var copy = Object.assign({}, job || {});
    var checkpoint = copy.checkpoint && typeof copy.checkpoint === "object" ? copy.checkpoint : {};
    var writer = checkpoint.writer && typeof checkpoint.writer === "object" ? checkpoint.writer : {};
    var writerStage = typeof writer.stage === "string" ? writer.stage : "";
    var pictures = checkpoint.pictures && typeof checkpoint.pictures === "object" ? checkpoint.pictures : {};
    var accepted = 0;
    Object.keys(pictures).forEach(function (id) {
      if (pictures[id] && pictures[id].accepted === true) accepted += 1;
    });
    var story = checkpoint.story && typeof checkpoint.story === "object" ? checkpoint.story : {};
    var pageCount = Array.isArray(story.pages) ? story.pages.length : 0;
    var composition = story.composition && typeof story.composition === "object" ? story.composition : null;
    var illustrationUnits = composition && Array.isArray(composition.units) ? composition.units.length : 0;
    var physicalPages = composition && Array.isArray(composition.leaves) ? composition.leaves.length : 0;
    delete copy.checkpoint;
    if (writerStage && !copy.writerStage) copy.writerStage = writerStage;
    var pendingKind = "";
    var pendingPicture = "";
    Object.keys(pictures).forEach(function (id) {
      var pending = pictures[id] && pictures[id].pending ? String(pictures[id].pending) : "";
      if (pending && pictures[id].accepted !== true) {
        pendingPicture = id;
        pendingKind = pending;
      }
    });
    if (accepted && !copy.acceptedPictures) copy.acceptedPictures = accepted;
    if (pendingKind && !copy.pendingKind) copy.pendingKind = pendingKind;
    if (pendingPicture && !copy.pendingPicture) copy.pendingPicture = pendingPicture;
    if (pageCount && !copy.storyPageCount) copy.storyPageCount = pageCount;
    if (illustrationUnits && !copy.illustrationUnits) copy.illustrationUnits = illustrationUnits;
    if (physicalPages && !copy.physicalPages) copy.physicalPages = physicalPages;
    return copy;
  }

  function view(job, now, options) {
    var current = Number(now) || Date.now();
    var status = String(job && job.status || "");
    var reason = String(job && job.reason || "");
    var writerStage = String(job && job.writerStage || "");
    var names = namesOf(options);
    if (status === "checking") {
      return {
        state: "checking",
        active: false,
        canContinue: false,
        button: "Checking",
        buttonEnabled: false,
        detail: "Checking the latest progress…",
        rows: []
      };
    }
    if (status === "unavailable") {
      return {
        state: "unavailable",
        active: false,
        canContinue: false,
        button: "Back to my bookshelf",
        buttonEnabled: true,
        detail: String(job && job.message || "Unable to check progress right now."),
        rows: []
      };
    }
    if (status === "complete") {
      return {
        state: "complete",
        active: false,
        canContinue: false,
        button: "Open the book",
        buttonEnabled: false,
        detail: "This book is ready to open.",
        rows: serverRows(job, false)
      };
    }
    if (status === "running") {
      var started = Number(job && job.startedAt || 0);
      var age = current - started;
      var live = started > 0 && age >= 0 && age < LEASE_MS;
      if (live) {
        return illustrate({
          state: "working",
          active: true,
          canContinue: false,
          button: "Working",
          buttonEnabled: false,
          detail: picturePhase(job) ? pictureDetail(job, names, "working") : "The story is being made.",
          rows: picturePhase(job) ? pictureRows(job, "working") : serverRows(job, true)
        }, job, "working");
      }
      return illustrate({
        state: "stopped",
        active: false,
        canContinue: !!(job && job.recoverable),
        button: job && job.recoverable ? "Continue this story" : "Back to my bookshelf",
        buttonEnabled: true,
        detail: picturePhase(job)
          ? pictureDetail(job, names, "stopped")
          : "This step stopped updating. Saved work is still kept. Continuing may use more of this book's budget.",
        rows: picturePhase(job) ? pictureRows(job, "stopped") : serverRows(job, false)
      }, job, "stopped");
    }
    if (status === "interrupted" && reason === "continue") {
      var pictured = picturePhase(job);
      return illustrate({
        state: "ready",
        active: false,
        canContinue: !!(job && job.recoverable),
        button: "Continue this story",
        buttonEnabled: true,
        detail: pictured ? pictureDetail(job, names, "ready") : readyDetail(writerStage),
        rows: pictured ? pictureRows(job, "ready") : readyRows(writerStage)
      }, job, "ready");
    }
    if (status === "interrupted") {
      var kept = String(job && job.message || "This step stopped. Saved work is still kept.");
      var unsafe = reason === "budget" || reason === "call-cap" || reason === "picture";
      return illustrate({
        state: "stopped",
        active: false,
        canContinue: !!(job && job.recoverable) && !unsafe,
        button: unsafe ? "Continue unavailable" : (job && job.recoverable ? "Continue this story" : "Back to my bookshelf"),
        buttonEnabled: !!(job && job.recoverable) && !unsafe,
        detail: picturePhase(job) ? pictureDetail(job, names, "stopped") : kept,
        rows: picturePhase(job) ? pictureRows(job, "stopped") : serverRows(job, false)
      }, job, "stopped");
    }
    return {
      state: "saved",
      active: false,
      canContinue: false,
      button: "Back to my bookshelf",
      buttonEnabled: true,
      detail: "The illustrated book has not been made yet.",
      rows: serverRows(job, false)
    };
  }

  /* A progress read that succeeded with no job is not a network failure.
     The server message is the reason the page should show. */
  function reportedMessage(response, fallback) {
    var body = response && response.body && typeof response.body === "object" ? response.body : {};
    var message = String(body.message || "").trim();
    if (message) return message;
    return fallback || "Unable to check progress right now.";
  }

  function marker(job) {
    var row = job || {};
    return [row.status, row.reason, row.startedAt, row.attempts, row.message].join("\u0000");
  }

  /* A Continue response can arrive before the checkpoint is claimed.
     The old expired job is not a new result. */
  function changed(before, after) {
    if (!after || !after.status) return false;
    return marker(before) !== marker(after);
  }

  function workshop(job) {
    var status = String(job && job.status || "");
    var reason = String(job && job.reason || "");
    var stage = String(job && job.stage || "");
    var writerStage = String(job && job.writerStage || "");
    var pending = String(job && job.pendingKind || "");
    var accepted = Number(job && job.acceptedPictures) || 0;
    var total = Number(job && job.illustrationUnits) || 0;
    var failed = reason === "picture" || reason === "story" || reason === "artwork";
    var paused = reason === "budget" || reason === "call-cap" || reason === "picture-uncertain" ||
      reason === "picture-lost" || reason === "uncertain" || reason === "model-timeout" || reason === "picture-timeout";
    var outcome = "working";
    if (status === "complete" || reason === "saved") outcome = "completed";
    else if (failed) outcome = "failed";
    else if (paused) outcome = "paused";
    else if (status === "running" || reason === "continue") outcome = "working";
    else outcome = "paused";
    var scene = "writing";
    if (outcome === "completed") scene = "completed";
    else if (outcome === "failed") scene = "failed";
    else if (outcome === "paused") scene = "paused";
    else if (stage === "save") scene = "saving";
    else if (total > 0 && accepted >= total) scene = "assembling";
    else if (pending === "check" || pending === "repair-check" || pending === "clarify") scene = "checking";
    else if (stage === "pictures" || pending) scene = "drawing";
    else if (stage === "art" || writerStage.indexOf("page") >= 0) scene = "planning";
    return {
      scene: scene,
      status: outcome,
      writing: scene === "writing",
      planning: scene === "planning",
      drawing: scene === "drawing",
      checking: scene === "checking",
      acceptedIllustrations: accepted,
      illustrationTotal: total,
      assembling: scene === "assembling",
      saving: scene === "saving",
      completed: outcome === "completed",
      paused: outcome === "paused",
      failed: outcome === "failed",
      startsPaidWork: false
    };
  }

  return { LEASE_MS: LEASE_MS, publish: publish, view: view, workshop: workshop, changed: changed, reportedMessage: reportedMessage };
});
