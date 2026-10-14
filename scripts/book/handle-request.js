"use strict";

/* Plans a Book V2 request. It does not call a model and does not draw pictures.
   Paid writing stays in generate.js and is not invoked from here. */

var Adapter = require("../../js/book-v2-adapter.js");

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
  var place = planned.request && planned.request.idea ? planned.request.idea : "";
  var writing = (planned.familyAgeBand || planned.ageBand || "unspecified") +
    (planned.constraintYear ? ", written at " + planned.constraintYear : "");
  var first = "Book V2 accepted this plan. The story model was not called, and no pictures were drawn.\n\n" +
    who.join(", ") + ". " + writing + ". " + place;
  var second = "Picture consistency is not solved. Maya's approved sheet is maya-v1. Other selected characters still need their own approved reference sheets.";
  return {
    id: "book-v2-local-preview",
    title: "Local preview — not a finished book",
    author: "",
    readerArtLayout: "duplex",
    storyTextMode: "prose",
    storyLength: "medium",
    v2: true,
    simulated: true,
    pages: [
      { text: first, imageDataUrl: null, imageUrlFallback: null },
      { text: "", imageDataUrl: null, imageUrlFallback: null },
      { text: second, imageDataUrl: null, imageUrlFallback: null },
      { text: "", imageDataUrl: null, imageUrlFallback: null }
    ],
    sceneDataUrl: null,
    sceneUrlFallback: null
  };
}

function handleBookV2(body) {
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
  return {
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
      preview: previewShelf(body, planned)
    }
  };
}

module.exports = { handleBookV2: handleBookV2 };
