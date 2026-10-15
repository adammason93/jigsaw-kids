"use strict";

/* Plans a Book V2 request. It does not call a model and does not draw pictures.
   Paid writing stays in generate.js and is not invoked from here. */

var Adapter = require("../../js/book-v2-adapter.js");
var Budget = require("../../js/book-v2-budget.js");
var Hosted = require("./hosted-job.js");

function names(body, planned) {
  var fromMembers = (body && body.members || []).map(function (member) {
    return member && member.name ? String(member.name) : "";
  }).filter(Boolean);
  if (fromMembers.length) return fromMembers;
  return (planned.cast || []).map(function (row) { return row.characterId; });
}

function identityOf(planned) {
  if (planned.identities && planned.identities.length) return planned.identities;
  return (planned.cast || []).map(function (row) {
    var id = String(row.characterId || "");
    var reference = String(row.reference || "");
    var locked = (id === "wondii-maya" || id === "maya") && reference.indexOf("maya-v1") >= 0;
    return {
      characterId: id,
      reference: reference,
      lockedSheet: locked,
      sheet: locked ? "maya-v1" : "portrait-only"
    };
  });
}

function previewShelf(body, planned) {
  var who = names(body, planned);
  var idea = planned.request && planned.request.idea ? String(planned.request.idea) : "";
  return {
    id: "book-v2-local-preview",
    recordKind: "plan",
    title: "Story idea — not a finished book",
    author: "",
    v2: true,
    simulated: true,
    generated: false,
    pages: [],
    request: {
      idea: idea,
      names: who,
      familyAgeBand: planned.familyAgeBand || "",
      ageBand: planned.ageBand || ""
    }
  };
}

function handleBookV2(body, ports) {
  if (body && body.watch === true) {
    var read = ports && ports.jobs && ports.jobs.read
      ? ports.jobs.read(body.accountId, body.creationKey)
      : null;
    return Promise.resolve(read).then(function (job) {
      var copy = Object.assign({}, job || {});
      delete copy.checkpoint;
      return {
        status: 200,
        body: {
          ok: true,
          watch: true,
          generated: false,
          job: copy,
          message: copy.message || "The story progress was read. No new writing was started."
        }
      };
    });
  }
  var planned = Adapter.planRequest(body || {});
  if (!planned.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        generated: false,
        simulated: false,
        illustrations: "not-run",
        pictureConsistency: "not-solved",
        problems: planned.problems || [],
        identities: planned.identities || [],
        message: planned.message || "The story plan could not start. Nothing was saved."
      }
    };
  }
  var plannedResponse = {
    status: 200,
    body: {
      ok: true,
      generated: false,
      simulated: true,
      reason: "paid-generation-not-approved",
      illustrationStyle: planned.illustrationStyle || "wondii-picture-book",
      illustrations: "not-run",
      pictureConsistency: "not-solved",
      identity: identityOf(planned),
      writing: {
        familyAgeBand: planned.familyAgeBand || "",
        ageBand: planned.ageBand || "",
        constraintYear: planned.constraintYear || ""
      },
      castIds: (planned.identities || []).map(function (row) { return row.journeyId; }),
      bibleIds: (planned.identities || []).map(function (row) { return row.bibleId; }),
      identities: planned.identities || [],
      message: "Book V2 accepted the plan. The story model was not called, and no pictures were drawn.",
      generation: Budget.authorise({
        approved: true,
        accountId: "ignored",
        accountKind: body && body.accountKind,
        childPermitted: true,
        allowanceReserved: true,
        budgetUsd: body && body.budgetUsd,
        calls: { text: 100, image: 100, vision: 100 }
      }),
      job: Hosted.resume(body && body.job, {
        creationKey: body && body.creationKey,
        accountId: body && body.accountId,
        accountKind: body && body.accountKind,
        alreadyGenerated: false
      }).job,
      preview: previewShelf(body, planned)
    }
  };
  if (!ports || ports.approved !== true) return plannedResponse;
  return Hosted.run(null, body, ports).then(function (run) {
    var job = run.job || plannedResponse.body.job;
    var finished = run.book && run.book.generated === true && run.book.recordKind === "book";
    return {
      status: 200,
      body: Object.assign({}, plannedResponse.body, {
        ok: true,
        saved: !!finished,
        generated: !!finished,
        simulated: !finished,
        illustrations: finished ? "stored" : "not-run",
        pictureConsistency: finished ? "checked" : "not-solved",
        book: finished ? run.book : null,
        reader: finished ? run.reader : "",
        job: job,
        generation: run.generation || plannedResponse.body.generation,
        message: job && job.message || plannedResponse.body.message
      })
    };
  });
}

module.exports = { handleBookV2: handleBookV2 };
