"use strict";

/* Hosted Book V2 job. The stages are the existing writer, art direction,
   pictures, checks, shelf save, and reader. This file does not call a model.
   Paid writing stays behind the budget gate until that gate is approved. */

var Budget = require("../../js/book-v2-budget.js");

var STAGES = [
  { id: "plan", label: "Story plan", source: "scripts/book/handle-request.js" },
  { id: "story", label: "Story writing", source: "scripts/book/writer.js" },
  { id: "art", label: "Art direction", source: "js/book-art-direction.js" },
  { id: "pictures", label: "Pictures", source: "scripts/book/readiness.js" },
  { id: "check", label: "Picture check", source: "js/book-v2-identity.js" },
  { id: "save", label: "Save the book", source: "js/book-v2-shelf.js" },
  { id: "read", label: "Open the book", source: "games/book-prototype/book-data.js" }
];

function stages(active) {
  var passed = false;
  return STAGES.map(function (stage) {
    var state = "waiting";
    if (!passed && stage.id === active) {
      state = active === "plan" ? "saved" : "running";
      passed = true;
    } else if (!passed) state = "done";
    return { id: stage.id, label: stage.label, source: stage.source, state: state };
  });
}

function gateFor(input) {
  var source = input || {};
  return Budget.authorise({
    approved: true,
    accountId: source.accountId || "",
    accountKind: source.accountKind,
    childPermitted: source.childPermitted === true,
    allowanceReserved: source.allowanceReserved === true,
    alreadyGenerated: source.alreadyGenerated === true,
    budgetUsd: Budget.BUDGET_USD,
    calls: Budget.quote().calls
  });
}

function blank(input, gate) {
  var source = input || {};
  var key = String(source.creationKey || "");
  return {
    creationKey: key,
    accountId: String(source.accountId || ""),
    stage: "plan",
    status: "saved",
    paid: false,
    started: false,
    recoverable: true,
    attempts: 0,
    budgetUsd: Budget.BUDGET_USD,
    calls: { text: 0, image: 0, vision: 0 },
    stages: stages("plan"),
    reason: gate.reason,
    message: "The story idea is saved. The illustrated book has not been made yet."
  };
}

function openJob(input) {
  var gate = gateFor(input);
  return {
    ok: true,
    ran: false,
    recovered: false,
    duplicate: false,
    job: blank(input, gate),
    generation: gate
  };
}

/* Same account and story key resume the saved job. A second paid run is not started. */
function resume(existing, input) {
  var source = input || {};
  var prior = existing || {};
  if (prior.accountId && source.accountId && prior.accountId !== source.accountId) {
    return { ok: false, ran: false, reason: "wrong-account", job: null, generation: gateFor(source) };
  }
  if (prior.paid === true || prior.status === "complete" || source.alreadyGenerated === true) {
    var blocked = gateFor(Object.assign({}, source, { alreadyGenerated: true }));
    return {
      ok: true,
      ran: false,
      recovered: true,
      duplicate: true,
      job: Object.assign({}, prior, { paid: false, started: false, calls: prior.calls || { text: 0, image: 0, vision: 0 } }),
      generation: blocked
    };
  }
  var next = openJob(source);
  next.recovered = !!prior.creationKey;
  next.job.attempts = (Number(prior.attempts) || 0) + (prior.creationKey ? 1 : 0);
  return next;
}

/* The existing writer is called only after the budget gate allows it.
   The website passes approval through authorise(), which cannot allow it. */
function run(existing, input, ports) {
  if (ports && typeof ports.callModel === "function") {
    return require("./produce.js").run(existing, input, ports);
  }
  var source = input || {};
  var approved = !!(ports && ports.approved === true);
  var gate = approved ? Budget.decide({
    approved: true,
    accountId: source.accountId || "",
    accountKind: source.accountKind,
    childPermitted: source.childPermitted === true,
    allowanceReserved: source.allowanceReserved === true,
    alreadyGenerated: source.alreadyGenerated === true || (existing && existing.paid === true),
    budgetUsd: Budget.BUDGET_USD,
    calls: Budget.quote().calls
  }) : gateFor(source);
  if (!gate.authorised) {
    var held = resume(existing, source);
    held.ran = false;
    held.generation = gate;
    return Promise.resolve(held);
  }
  if (!ports || typeof ports.runWriter !== "function") {
    return Promise.resolve({
      ok: false,
      ran: false,
      reason: "writer-not-connected",
      job: blank(source, gate),
      generation: gate
    });
  }
  return Promise.resolve(ports.runWriter(source)).then(function (book) {
    return {
      ok: true,
      ran: true,
      book: book,
      job: Object.assign(blank(source, gate), {
        stage: "check",
        status: "review",
        paid: true,
        started: true,
        stages: stages("check")
      }),
      generation: gate
    };
  });
}

module.exports = {
  stages: stages,
  openJob: openJob,
  resume: resume,
  run: run
};
