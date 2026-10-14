/* Maps a story-journey request onto Book V2.
   The browser does not call a model. The local Book V2 server does the planning.
   This file does not read an API key or open the paid proof scripts. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Adapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var FAMILY_AGE = {
    "4-6": "4-6",
    "7-9": "7-9",
    "10-12": "10-12"
  };
  var V2_AGE = { "3-4": 1, "5-6": 1, "7-8": 1, "9-10": 1, "11-12": 1 };
  var LENGTHS = { short: "quick", medium: "storybook", long: "adventure" };
  var TONES = {
    Adventure: "adventure",
    Magic: "magical",
    Mystery: "mystery",
    "Surprise me": "surprise"
  };
  var PLACES = {
    library: "Wondii World",
    bedroom: "the child's home",
    woods: "the woods",
    undersea: "under the sea",
    castle: "the castle"
  };

  /* Verified pairs only. An unlisted id is refused, never given someone else's identity. */
  var BIBLE_PAIR = {
    "wondii-maya": "maya",
    "wondii-leo": "leo"
  };

  function brain() {
    if (root && root.WondiiBookBrain) return root.WondiiBookBrain;
    return require("./book-brain.js");
  }

  function crewApi() {
    if (root && root.WondiiCrew) return root.WondiiCrew;
    return require("./wondii-crew.js");
  }

  function characterApi() {
    if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
    return require("./character-bible.js");
  }

  function enabled(env) {
    var host = String(env && env.host || "");
    if (host !== "localhost" && host !== "127.0.0.1") return false;
    var flag = env && env.bookV2;
    return flag === true || flag === 1 || flag === "1" || flag === "true";
  }

  function mapAge(input) {
    var given = String(input && (input.familyAgeBand || input.ageBand) || "");
    if (FAMILY_AGE[given]) return { familyAgeBand: given, ageBand: FAMILY_AGE[given] };
    if (V2_AGE[given]) return { familyAgeBand: "", ageBand: given };
    return null;
  }

  function referenceMatches(id, reference) {
    var path = String(reference || "");
    if (!path) return false;
    if (path.indexOf("maya-v1") >= 0) return id === "wondii-maya" || id === "maya";
    var file = path.split("/").pop() || "";
    var stem = file.replace(/\.[a-z0-9]+$/i, "");
    if (path.indexOf("/characters/crew/") >= 0) return stem === id;
    return true;
  }

  function referencesFor(members, saved) {
    var byId = {};
    (saved || []).forEach(function (row) {
      if (!row) return;
      var id = String(row.characterId || row.id || "");
      if (id) byId[id] = row;
    });
    var refs = [];
    (members || []).forEach(function (member) {
      if (!member || !member.id) return;
      var id = String(member.id);
      var row = byId[id];
      if (!row) return;
      if (row.ownerType !== "family" && row.ownerType !== "school") return;
      if (!row.ownerId || !row.reference) return;
      if (!referenceMatches(id, row.reference)) return;
      refs.push({
        characterId: id,
        reference: String(row.reference),
        ownerType: row.ownerType,
        ownerId: String(row.ownerId)
      });
    });
    return refs;
  }

  function savedRowFor(id, saved) {
    var found = null;
    (saved || []).forEach(function (row) {
      if (!row) return;
      var rowId = String(row.characterId || row.id || "");
      if (rowId === id) found = row;
    });
    return found;
  }

  function mapMember(member, saved) {
    var journeyId = String(member && member.id || "");
    var givenName = String(member && member.name || "");
    var bibleId = BIBLE_PAIR[journeyId] || "";
    var bible = bibleId ? characterApi().getCharacter(bibleId) : null;
    var crew = journeyId ? crewApi().get(journeyId) : null;
    var portrait = crew && crew.portrait ? crew.portrait : "";
    var approved = bible ? characterApi().resolveReference(bibleId) : null;
    var approvedFile = approved && approved.status === "approved" ? String(approved.file || "") : "";
    var problems = [];
    if (!journeyId) problems.push("cast-missing");
    if (bibleId && (!bible || crew && crew.bibleId && crew.bibleId !== bibleId)) problems.push("unmapped-cast:" + journeyId);
    if (bible && givenName && givenName.toLowerCase() !== String(bible.name).toLowerCase()) problems.push("identity-mismatch:" + journeyId);
    if (!bibleId) {
      var kind = journeyId.indexOf("wondii-") === 0 ? "unsupported" : "saved";
      var row = savedRowFor(journeyId, saved);
      var ownReference = "";
      if (kind === "saved" && row && row.ownerId && (row.ownerType === "family" || row.ownerType === "school") && referenceMatches(journeyId, row.reference)) {
        ownReference = String(row.reference);
      }
      if (journeyId) problems.push("unmapped-cast:" + journeyId);
      return {
        ok: false,
        kind: kind,
        journeyId: journeyId,
        bibleId: "",
        name: givenName,
        portrait: ownReference,
        reference: ownReference,
        lockedSheet: false,
        sheet: "none",
        problems: problems
      };
    }
    return {
      ok: problems.length === 0,
      kind: "supported",
      journeyId: journeyId,
      bibleId: bibleId,
      name: bible.name,
      portrait: portrait,
      reference: approvedFile || portrait,
      approvedReference: approvedFile,
      referenceVersionId: approved && approved.status === "approved" ? approved.versionId || "" : "",
      lockedSheet: !!approvedFile,
      sheet: approvedFile ? (approved.versionId || "approved") : (portrait ? "portrait-only" : "none"),
      problems: problems
    };
  }

  function ideaFor(input) {
    var written = String(input && input.idea || "").trim();
    if (written) return written;
    var place = PLACES[input && input.place];
    if (!place) return "";
    return "A story set in " + place + ".";
  }

  function prepare(input) {
    var source = input || {};
    if (!enabled(source)) {
      return {
        active: false,
        route: "clever-service",
        ok: true,
        generated: false,
        imageCalls: 0,
        problems: []
      };
    }
    return planRequest(source);
  }

  function planRequest(input) {
    var source = input || {};
    var age = mapAge(source);
    if (!age) {
      return {
        active: true,
        route: "book-v2",
        ok: false,
        generated: false,
        imageCalls: 0,
        problems: ["age-missing"],
        message: "Choose an age band before this book can be planned."
      };
    }
    var profile = brain().readerProfile({ ageBand: age.ageBand });
    var members = Array.isArray(source.members) ? source.members : [];
    var identities = members.map(function (member) {
      return mapMember(member, source.savedReferences);
    });
    var mapProblems = [];
    identities.forEach(function (identity) {
      (identity.problems || []).forEach(function (problem) {
        if (mapProblems.indexOf(problem) < 0) mapProblems.push(problem);
      });
    });
    if (!identities.length) mapProblems.push("cast-size");
    if (mapProblems.length) {
      return {
        active: true,
        route: "book-v2",
        ok: false,
        generated: false,
        imageCalls: 0,
        problems: mapProblems,
        identities: identities,
        request: { castIds: [], idea: ideaFor(source) },
        cast: identities,
        familyAgeBand: age.familyAgeBand,
        ageBand: age.ageBand,
        constraintYear: profile && profile.constraintYear || "",
        place: source.place || "",
        illustrationStyle: brain().VISUAL_STYLE,
        message: "The story plan could not start. Nothing was saved."
      };
    }
    var ask = {
      castIds: identities.map(function (identity) { return identity.bibleId; }),
      idea: ideaFor(source),
      ageBand: age.ageBand,
      length: LENGTHS[source.length] || "",
      tone: TONES[source.theme] || null,
      context: "family",
      characterReferences: referencesFor(members, source.savedReferences)
    };
    var accepted = brain().acceptCreation(ask);
    var style = brain().VISUAL_STYLE;
    if (!accepted.ok) {
      return {
        active: true,
        route: "book-v2",
        ok: false,
        generated: false,
        imageCalls: 0,
        problems: accepted.problems,
        identities: identities,
        request: accepted.request,
        cast: identities,
        familyAgeBand: age.familyAgeBand,
        ageBand: age.ageBand,
        constraintYear: profile && profile.constraintYear || "",
        place: source.place || "",
        illustrationStyle: style,
        message: "The story plan could not start. Nothing was saved."
      };
    }
    return {
      active: true,
      route: "book-v2",
      ok: true,
      generated: false,
      imageCalls: 0,
      problems: [],
      identities: identities,
      request: accepted.request,
      cast: identities,
      familyAgeBand: age.familyAgeBand,
      ageBand: age.ageBand,
      constraintYear: profile && profile.constraintYear || "",
      place: source.place || "",
      illustrationStyle: style,
      message: "Book V2 is ready to plan. The story model has not been called."
    };
  }

  function readerPlan(book) {
    if (!book || !book.id) {
      return { ok: false, reason: "missing", message: "This link does not name a book." };
    }
    var sourcePages = book.pages || [];
    if (!sourcePages.length) {
      return { ok: false, reason: "empty", message: "This book has no pages yet." };
    }
    var pages = sourcePages.map(function (page, index) {
      var inline = page && page.imageDataUrl ? String(page.imageDataUrl) : "";
      var fallback = page && page.imageUrlFallback ? String(page.imageUrlFallback) : "";
      var src = inline || fallback;
      return {
        number: index + 1,
        text: page && page.text ? String(page.text) : "",
        imageSrc: src,
        missingArt: !src
      };
    });
    var coverSrc = book.sceneDataUrl ? String(book.sceneDataUrl) : "";
    if (!coverSrc && book.sceneUrlFallback) coverSrc = String(book.sceneUrlFallback);
    if (!coverSrc && pages[0] && pages[0].imageSrc) coverSrc = pages[0].imageSrc;
    return {
      ok: true,
      plan: {
        id: String(book.id),
        title: String(book.title || "Untitled story"),
        author: String(book.author || ""),
        coverSrc: coverSrc,
        readerArtLayout: book.readerArtLayout === "facing" ? "facing" : "duplex",
        storyTextMode: book.storyTextMode === "rhyme" ? "rhyme" : "prose",
        pages: pages
      }
    };
  }

  function shelfFromProof(proof) {
    if (!proof || proof.status !== "REVIEWABLE" || !proof.bible || !proof.pages || !proof.pages.length) {
      return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
    }
    if (proof.textProblems && proof.textProblems.length) {
      return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
    }
    var pages = [];
    proof.pages.forEach(function (page) {
      pages.push({
        text: page && page.prose ? String(page.prose) : "",
        imageDataUrl: null,
        imageUrlFallback: page && page.imageUrl ? String(page.imageUrl) : null,
        pageId: page && page.pageId ? String(page.pageId) : ""
      });
      pages.push({ text: "", imageDataUrl: null, imageUrlFallback: null });
    });
    var shelf = {
      id: String(proof.id || ""),
      title: String(proof.bible.title || ""),
      author: "",
      readerArtLayout: "duplex",
      storyTextMode: "prose",
      storyLength: "medium",
      v2: true,
      castIds: (proof.bible.castIds || []).slice(),
      pages: pages,
      sceneDataUrl: null,
      sceneUrlFallback: null
    };
    if (!shelf.id || !shelf.pages.length || !shelf.title) {
      return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
    }
    var planned = readerPlan(shelf);
    if (!planned.ok) return planned;
    return {
      ok: true,
      shelf: shelf,
      plan: planned.plan,
      illustrationStyle: proof.bible.visualStyle || brain().VISUAL_STYLE,
      imageCalls: 0
    };
  }

  return {
    FAMILY_AGE: FAMILY_AGE,
    enabled: enabled,
    BIBLE_PAIR: BIBLE_PAIR,
    mapAge: mapAge,
    mapMember: mapMember,
    prepare: prepare,
    planRequest: planRequest,
    readerPlan: readerPlan,
    shelfFromProof: shelfFromProof
  };
});
