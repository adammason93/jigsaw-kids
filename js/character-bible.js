/* Canonical Wondii cast for books now, and for lessons later.
   Identity lives here. A story may change clothing, place, emotion, and
   what a character is carrying. It may not change the bible.
   This file does not know about lessons, sources, or teaching. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiCharacterBible = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var IDENTITY_FIELDS = [
    "ageAppearance",
    "face",
    "skinTone",
    "hair",
    "body",
    "footwear",
    "relativeHeight",
    "accessories",
    "visualIdentifiers"
  ];

  var STATE_FIELDS = [
    "locationId",
    "clothing",
    "carriedEntities",
    "emotion",
    "storyRole"
  ];

  function entry(row) {
    return {
      characterId: row.characterId,
      name: row.name,
      referenceAssetIds: [],
      missingReferences: ["portrait"],
      ageAppearance: row.ageAppearance,
      face: row.face,
      skinTone: row.skinTone,
      hair: row.hair,
      body: row.body,
      defaultClothing: row.defaultClothing,
      footwear: row.footwear,
      relativeHeight: row.relativeHeight,
      accessories: row.accessories,
      personality: row.personality,
      visualIdentifiers: row.visualIdentifiers
    };
  }

  /* Text identity only. Approved portraits live in the version registry,
     not inside this frozen identity, so a later sheet cannot silently
     replace the one an existing book was drawn from. */
  var CATALOGUE = {
    maya: entry({
      characterId: "maya",
      name: "Maya",
      ageAppearance: "about seven, school age",
      face: "round face, warm brown eyes, soft eyebrows",
      skinTone: "medium brown",
      hair: "long dark curls",
      body: "school-age child, not a toddler and not a teen",
      defaultClothing: "yellow cardigan, white shirt, blue skirt, white socks",
      footwear: "navy shoes",
      relativeHeight: "average for about seven, a little shorter than Leo",
      accessories: ["green hair clip"],
      personality: ["curious", "brave"],
      visualIdentifiers: ["long dark curls", "yellow cardigan", "green hair clip", "white socks"]
    }),
    leo: entry({
      characterId: "leo",
      name: "Leo",
      ageAppearance: "about seven, school age",
      face: "freckles, grey-green eyes",
      skinTone: "light",
      hair: "short sandy hair",
      body: "school-age child, not a toddler and not a teen",
      defaultClothing: "green jumper, dark trousers",
      footwear: "red sneakers",
      relativeHeight: "a little taller than Maya",
      accessories: ["red sneakers"],
      personality: ["careful", "kind"],
      visualIdentifiers: ["short sandy hair", "green jumper", "red sneakers"]
    }),
    ravi: entry({
      characterId: "ravi",
      name: "Ravi",
      ageAppearance: "about eight, school age",
      face: "round glasses, dark eyes",
      skinTone: "brown",
      hair: "short black hair",
      body: "school-age child, not a toddler and not a teen",
      defaultClothing: "orange hoodie, grey trousers",
      footwear: "dark trainers",
      relativeHeight: "about the same height as Leo",
      accessories: ["round glasses"],
      personality: ["inventive", "bold"],
      visualIdentifiers: ["round glasses", "orange hoodie", "short black hair"]
    }),
    mina: entry({
      characterId: "mina",
      name: "Mina",
      ageAppearance: "about seven, school age",
      face: "bright eyes, small smile",
      skinTone: "light brown",
      hair: "black hair in two buns",
      body: "school-age child, not a toddler and not a teen",
      defaultClothing: "purple dress, white socks",
      footwear: "white shoes",
      relativeHeight: "about the same height as Maya",
      accessories: ["silver star pin"],
      personality: ["observant", "gentle"],
      visualIdentifiers: ["two buns", "purple dress", "silver star pin"]
    })
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object") return value;
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  var REFERENCE_REGISTRY = {
    maya: {
      characterId: "maya",
      currentVersionId: "maya-v1",
      versions: [
        {
          versionId: "maya-v1",
          assetId: "maya-v1",
          file: "games/images/characters/maya-v1.jpg",
          status: "approved",
          styleId: "wondii-picture-book",
          provenance: {
            sourceFile: "docs/agent/book-v2/visual-proof/e/images/maya-sheet.jpg",
            model: "gpt-image-2.5-sunburst",
            approvedOn: "2026-10-07",
            note: "Human art direction. First canonical Maya sheet."
          }
        }
      ]
    }
  };

  Object.keys(CATALOGUE).forEach(function (id) {
    deepFreeze(CATALOGUE[id]);
  });
  deepFreeze(REFERENCE_REGISTRY);

  function getCharacter(id) {
    if (!CATALOGUE[id]) return null;
    return deepFreeze(clone(CATALOGUE[id]));
  }

  function listCharacters() {
    return Object.keys(CATALOGUE).map(getCharacter);
  }

  function referenceRegistry() {
    return clone(REFERENCE_REGISTRY);
  }

  function resolveReference(id, versionId, registry) {
    var book = (registry || REFERENCE_REGISTRY)[id];
    if (!book) return null;
    var wanted = versionId || book.currentVersionId;
    var version = (book.versions || []).filter(function (item) { return item.versionId === wanted; })[0];
    return version ? clone(version) : null;
  }

  function publishReference(id, version, registry) {
    if (!getCharacter(id) || !version || !version.versionId || !version.assetId) return null;
    var next = registry ? clone(registry) : referenceRegistry();
    var book = next[id] || { characterId: id, currentVersionId: "", versions: [] };
    var versions = (book.versions || []).filter(function (item) { return item.versionId !== version.versionId; });
    versions.push({
      versionId: String(version.versionId),
      assetId: String(version.assetId),
      file: String(version.file || ""),
      status: "approved",
      styleId: version.styleId || "wondii-picture-book",
      provenance: clone(version.provenance || {})
    });
    next[id] = {
      characterId: id,
      currentVersionId: String(version.versionId),
      versions: versions
    };
    return next;
  }

  function bindReferences(ids, registry) {
    var source = registry || REFERENCE_REGISTRY;
    var pin = {};
    (ids || []).forEach(function (id) {
      var book = source[id];
      if (book && book.currentVersionId) pin[id] = book.currentVersionId;
    });
    return pin;
  }

  function referenceReport(id, pin) {
    var character = getCharacter(id);
    if (!character) return null;
    var versionId = pin && pin.status !== "candidate" && pin.versionId ? pin.versionId : "";
    var version = resolveReference(id, versionId);
    if (!version || version.status !== "approved") {
      return {
        characterId: character.characterId,
        name: character.name,
        referenceAssetIds: [],
        missingReferences: character.missingReferences.slice(),
        locked: false,
        versionId: ""
      };
    }
    return {
      characterId: character.characterId,
      name: character.name,
      referenceAssetIds: [version.assetId],
      missingReferences: [],
      locked: true,
      versionId: version.versionId,
      file: version.file
    };
  }

  /* A generated sheet stays a candidate until a person approves it.
     Passing it into a story does not write it into the frozen catalogue. */
  function proposeReference(characterId, asset) {
    var character = getCharacter(characterId);
    if (!character || !asset || !asset.assetId) return { ok: false, locked: false, problems: ["reference"] };
    return {
      ok: true,
      locked: false,
      status: "candidate",
      characterId: characterId,
      assetIds: [String(asset.assetId)],
      note: "Pending human review. Not canonical."
    };
  }

  function storyReferences(characterId, proposal) {
    if (proposal && proposal.characterId === characterId && proposal.assetIds) {
      return {
        assetIds: proposal.assetIds.slice(),
        approved: proposal.status === "approved",
        status: proposal.status || "candidate",
        versionId: proposal.versionId || ""
      };
    }
    var current = resolveReference(characterId);
    if (current && current.status === "approved") {
      return {
        assetIds: [current.assetId],
        approved: true,
        status: "approved",
        versionId: current.versionId,
        file: current.file
      };
    }
    return { assetIds: [], approved: false, status: "missing", versionId: "" };
  }

  function lockCast(ids) {
    var problems = [];
    var cast = [];
    (ids || []).forEach(function (id) {
      var character = getCharacter(id);
      if (!character) {
        problems.push("unknown-cast:" + id);
        return;
      }
      cast.push(character);
    });
    return { ok: problems.length === 0 && cast.length > 0, cast: cast, problems: problems };
  }

  /* Pupil and family characters can use this shape later. They are not accepted yet. */
  function externalCharacterSlot(record) {
    return {
      ok: false,
      accepted: false,
      reason: "future",
      characterId: record && record.characterId ? String(record.characterId) : ""
    };
  }

  function storyState(character, patch) {
    var rejected = [];
    var source = patch || {};
    IDENTITY_FIELDS.forEach(function (field) {
      if (Object.prototype.hasOwnProperty.call(source, field)) rejected.push(field);
    });
    if (!character || !character.characterId) rejected.push("character");
    if (rejected.length) return { ok: false, problems: rejected, state: null };
    var clothing = source.clothing || character.defaultClothing;
    return {
      ok: true,
      problems: [],
      state: {
        characterId: character.characterId,
        locationId: source.locationId || "",
        clothing: clothing,
        carriedEntities: (source.carriedEntities || []).slice(),
        emotion: source.emotion || "",
        storyRole: source.storyRole || ""
      }
    };
  }

  return {
    IDENTITY_FIELDS: IDENTITY_FIELDS,
    STATE_FIELDS: STATE_FIELDS,
    getCharacter: getCharacter,
    listCharacters: listCharacters,
    referenceReport: referenceReport,
    referenceRegistry: referenceRegistry,
    resolveReference: resolveReference,
    publishReference: publishReference,
    bindReferences: bindReferences,
    proposeReference: proposeReference,
    storyReferences: storyReferences,
    lockCast: lockCast,
    storyState: storyState,
    externalCharacterSlot: externalCharacterSlot
  };
});
