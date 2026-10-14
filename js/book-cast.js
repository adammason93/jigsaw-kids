/* Book cast. Selected Wondii characters and characters created by one book.
   Identity is data. A picture may pose a character. It may not reinvent them.
   This file does not call an image provider. */
"use strict";

var Cast = require("./character-bible.js");

var LOCKED_KEYS = [
  "species", "type", "face", "head", "ageAppearance", "body", "relativeSize",
  "skinTone", "covering", "hair", "colouring", "markings", "eyes", "ears",
  "horns", "tail", "distinctiveFeatures", "defaultClothing", "footwear",
  "accessories", "visualIdentifiers"
];

var CARRIED_STATE = ["mud", "damage", "wetness", "disguise", "transformation", "clothing", "removedAccessories"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.slice() : [String(value)];
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isHuman(record) {
  var type = String(record && (record.type || record.species) || "");
  return type === "human" || record.origin === "canonical";
}

function lockIdentity(record) {
  var source = record || {};
  var human = isHuman(source);
  var type = human ? "human" : String(source.type || source.species || "creature");
  var locked = {
    characterId: String(source.characterId || ""),
    name: String(source.name || source.characterId || ""),
    origin: source.origin === "canonical" ? "canonical" : "story",
    type: type,
    species: String(source.species || type),
    face: source.face || "",
    head: source.head || "",
    body: source.body || "",
    relativeSize: source.relativeSize || source.relativeHeight || "",
    covering: source.covering || "",
    colouring: source.colouring || "",
    markings: source.markings || "",
    eyes: source.eyes || "",
    ears: source.ears || "",
    horns: source.horns || "",
    tail: source.tail || "",
    distinctiveFeatures: asList(source.distinctiveFeatures),
    accessories: asList(source.accessories),
    visualIdentifiers: asList(source.visualIdentifiers)
  };
  if (human) {
    locked.ageAppearance = source.ageAppearance || "";
    locked.skinTone = source.skinTone || source.colouring || "";
    locked.hair = source.hair || "";
    locked.defaultClothing = source.defaultClothing || "";
    locked.footwear = source.footwear || "";
    if (!locked.colouring) locked.colouring = locked.skinTone;
  }
  return locked;
}

function canonicalIdentity(character) {
  return lockIdentity({
    characterId: character.characterId,
    name: character.name,
    origin: "canonical",
    type: "human",
    species: "human",
    face: character.face,
    ageAppearance: character.ageAppearance,
    body: character.body,
    relativeSize: character.relativeHeight,
    skinTone: character.skinTone,
    hair: character.hair,
    colouring: character.skinTone,
    defaultClothing: character.defaultClothing,
    footwear: character.footwear,
    accessories: character.accessories,
    visualIdentifiers: character.visualIdentifiers,
    distinctiveFeatures: character.visualIdentifiers
  });
}

function applyState(identity, patch) {
  var source = patch || {};
  var rejected = [];
  Object.keys(source).forEach(function (key) {
    if (LOCKED_KEYS.indexOf(key) >= 0) rejected.push(key);
  });
  if (!identity || !identity.characterId) rejected.push("character");
  if (rejected.length) return { ok: false, problems: rejected, state: null };
  return {
    ok: true,
    problems: [],
    state: {
      characterId: identity.characterId,
      expression: source.expression || "",
      pose: source.pose || "",
      locationId: source.locationId || "",
      carriedEntities: asList(source.carriedEntities),
      clothing: source.clothing || "",
      wetness: source.wetness || "",
      mud: source.mud || "",
      damage: source.damage || "",
      disguise: source.disguise || "",
      transformation: source.transformation || "",
      emotion: source.emotion || "",
      removedAccessories: asList(source.removedAccessories)
    }
  };
}

function referencePlan(member) {
  var spreads = (member.spreadsPresent || []).length;
  var importance = member.visualImportance || "";
  var assets = member.referenceAssetIds || [];
  if (member.origin === "canonical") {
    return { strength: "canonical-sheet", required: spreads > 0, expensive: false, ready: assets.length > 0 };
  }
  var recurring = spreads >= 2 || importance === "important" || importance === "recurring";
  if (!recurring) return { strength: "none", required: false, expensive: false, ready: true };
  var strength = spreads >= 3 || importance === "important" ? "sheet" : "compact";
  return { strength: strength, required: true, expensive: strength === "sheet", ready: assets.length > 0 };
}

function compileBookCast(bible, pages) {
  var book = bible || {};
  var list = pages || book.pages || [];
  var declared = {};
  (book.storyCast || []).forEach(function (row) {
    if (row && row.characterId) declared[row.characterId] = row;
  });
  var seen = {};
  list.forEach(function (page, index) {
    var spreadId = page.pageId || page.spreadId || ("p" + (index + 1));
    (page.charactersPresent || []).forEach(function (id) {
      if (!seen[id]) seen[id] = [];
      if (seen[id].indexOf(spreadId) < 0) seen[id].push(spreadId);
    });
  });
  (book.castIds || []).forEach(function (id) {
    if (!seen[id]) seen[id] = [];
  });
  var problems = [];
  var members = Object.keys(seen).map(function (id) {
    var canonical = Cast.getCharacter(id);
    var declaredRow = declared[id];
    var identity = null;
    if (canonical) identity = canonicalIdentity(canonical);
    else if (declaredRow) identity = lockIdentity(Object.assign({}, declaredRow, { origin: "story" }));
    else problems.push("identity-missing:" + id);
    var importance = (declaredRow && declaredRow.visualImportance) || ((seen[id].length >= 2) ? "recurring" : "background");
    var member = {
      characterId: id,
      name: identity ? identity.name : id,
      origin: canonical ? "canonical" : "story",
      relationship: canonical ? "selected" : "story-created",
      identity: identity,
      spreadsPresent: seen[id].slice(),
      firstAppearance: seen[id][0] || "",
      finalAppearance: seen[id][seen[id].length - 1] || "",
      recurring: seen[id].length >= 2,
      visualImportance: importance,
      referenceAssetIds: canonical ? (Cast.storyReferences(id).assetIds || []).slice() : asList(declaredRow && declaredRow.referenceAssetIds),
      referenceVersionId: canonical ? (Cast.storyReferences(id).versionId || "") : ""
    };
    member.reference = referencePlan(member);
    if (member.recurring && !identity) problems.push("unlocked:" + id);
    if (member.reference.required && !member.reference.ready) problems.push("reference-before-first-spread:" + id);
    return member;
  });
  var byId = {};
  members.forEach(function (member) { byId[member.characterId] = member; });
  return {
    ok: problems.length === 0,
    ready: problems.length === 0,
    problems: problems,
    members: members,
    byId: byId
  };
}

function carryProblems(pages, cast) {
  var problems = [];
  var last = {};
  (pages || []).forEach(function (page) {
    (page.charactersPresent || []).forEach(function (id) {
      var before = ((page.stateBefore && page.stateBefore.characters) || []).filter(function (row) {
        return row.characterId === id;
      })[0] || {};
      var after = ((page.stateAfter && page.stateAfter.characters) || []).filter(function (row) {
        return row.characterId === id;
      })[0] || {};
      var member = cast && cast.byId && cast.byId[id];
      if (last[id]) {
        CARRIED_STATE.forEach(function (key) {
          if (!last[id][key] || (Array.isArray(last[id][key]) && !last[id][key].length)) return;
          if (!same(before[key], last[id][key])) problems.push("state-dropped:" + id + ":" + key);
        });
      }
      if (member && member.identity) {
        LOCKED_KEYS.forEach(function (key) {
          if (!member.identity[key] || (Array.isArray(member.identity[key]) && !member.identity[key].length)) return;
          if (before[key] && !same(before[key], member.identity[key])) problems.push("identity-drift:" + id + ":" + key);
          if (after[key] && !same(after[key], member.identity[key])) problems.push("identity-drift:" + id + ":" + key);
        });
      }
      var next = Object.assign({}, last[id] || {});
      CARRIED_STATE.forEach(function (key) {
        if (after[key] !== undefined && after[key] !== "") next[key] = after[key];
      });
      last[id] = next;
    });
  });
  return problems.filter(function (problem, index, all) { return all.indexOf(problem) === index; });
}

function requiredAccessories(identity, state) {
  var removed = asList(state && state.removedAccessories);
  return asList(identity && identity.accessories).filter(function (item) { return removed.indexOf(item) < 0; });
}

function reviewSpread(cast, spread, vision) {
  var problems = [];
  var present = (spread && spread.charactersPresent) || [];
  var rows = (vision && vision.characters) || [];
  var montage = !!(spread && spread.montage);
  present.forEach(function (id) {
    var row = rows.filter(function (item) { return item.characterId === id; })[0];
    var member = cast && cast.byId && cast.byId[id];
    if (!row) {
      problems.push("character-missing:" + id);
      return;
    }
    if (row.identityMatch === false) problems.push("identity:" + id);
    if (!montage && typeof row.count === "number" && row.count !== 1) problems.push("duplicate:" + id);
    if (!member || !member.identity) return;
    if (row.species && row.species !== member.identity.species) problems.push("species:" + id);
    if (row.markings && member.identity.markings && row.markings !== member.identity.markings) problems.push("markings:" + id);
    if (row.colouring && member.identity.colouring && row.colouring !== member.identity.colouring) problems.push("colouring:" + id);
    if (row.relativeSizeOk === false) problems.push("relative-size:" + id);
    var stateRows = spread.characterStateBefore || (spread.openingState && spread.openingState.characters) || [];
    var state = stateRows.filter(function (item) { return item.characterId === id; })[0] || {};
    requiredAccessories(member.identity, state).forEach(function (item) {
      if ((row.missingAccessories || []).indexOf(item) >= 0) problems.push("accessory:" + id + ":" + item);
    });
  });
  rows.forEach(function (row) {
    if (row.characterId && present.indexOf(row.characterId) < 0) problems.push("character-extra:" + row.characterId);
  });
  if (vision && vision.duplicateCharacter === true && !montage) problems.push("duplicate");
  return { ok: problems.length === 0, problems: problems };
}

function redesignProblems(cast, proposed) {
  var source = proposed || {};
  var member = cast && cast.byId && cast.byId[source.characterId];
  if (!member || !member.identity) return ["unknown-character:" + (source.characterId || "")];
  var problems = [];
  LOCKED_KEYS.forEach(function (key) {
    if (source[key] === undefined) return;
    if (!member.identity[key] || (Array.isArray(member.identity[key]) && !member.identity[key].length)) return;
    if (!same(source[key], member.identity[key])) problems.push("redesign:" + source.characterId + ":" + key);
  });
  return problems;
}

function appearanceLine(member, state) {
  var identity = member.identity || {};
  var now = state || {};
  var bits = [identity.name || member.characterId];
  if (identity.origin === "canonical") bits.push("selected Wondii character");
  else bits.push("this book's character");
  bits.push(identity.species || identity.type || "");
  if (identity.relativeSize) bits.push("relative size " + identity.relativeSize);
  if (identity.type === "human") {
    bits.push(identity.face, identity.skinTone, identity.hair, identity.ageAppearance);
    var outfit = now.clothing || identity.defaultClothing;
    if (outfit) bits.push("wearing " + outfit);
    if (identity.footwear) bits.push(identity.footwear);
  } else {
    if (identity.covering) bits.push(identity.covering);
    if (identity.colouring) bits.push(identity.colouring);
    if (identity.markings) bits.push("markings " + identity.markings);
    if (identity.face) bits.push(identity.face);
    if (identity.eyes) bits.push("eyes " + identity.eyes);
    if (identity.ears) bits.push("ears " + identity.ears);
    if (identity.horns) bits.push("horns " + identity.horns);
    if (identity.tail) bits.push("tail " + identity.tail);
  }
  if (identity.distinctiveFeatures && identity.distinctiveFeatures.length) bits.push(identity.distinctiveFeatures.join(", "));
  var accessories = requiredAccessories(identity, now);
  if (accessories.length) bits.push("accessories " + accessories.join(", "));
  CARRIED_STATE.forEach(function (key) {
    if (!now[key] || key === "removedAccessories" || key === "clothing") return;
    bits.push(key + " " + now[key]);
  });
  if (member.referenceAssetIds && member.referenceAssetIds.length) bits.push("reference " + member.referenceAssetIds.join(", "));
  bits.push("Use this identity. Do not redesign it.");
  return bits.filter(Boolean).join(". ");
}

function spreadCastBrief(cast, spread) {
  var lines = (spread.charactersPresent || []).map(function (id) {
    var member = cast.byId[id];
    if (!member) return id;
    var state = ((spread.characterStateBefore || [])).filter(function (row) { return row.characterId === id; })[0] || {};
    return appearanceLine(member, state);
  });
  var once = spread && spread.montage ? "This spread is an explicit montage." : "Draw each of these characters once. Do not merge them, duplicate them, or swap their looks.";
  return lines.join(" | ") + " " + once;
}

function referenceSheetPrompt(member) {
  if (!member || !member.reference || !member.reference.required || member.reference.ready) return "";
  var identity = member.identity || {};
  if (identity.type === "human") {
    return [
      "Picture-book character sheet of one person. Several views of the same person. No letters.",
      identity.name + ", " + (identity.ageAppearance || "") + ", " + (identity.face || "") + ".",
      identity.hair + ". " + identity.skinTone + ". " + (identity.defaultClothing || "") + ". " + (identity.footwear || "") + "."
    ].join(" ");
  }
  return [
    "Picture-book reference of one " + (identity.species || "creature") + ". Several views of the same individual. No letters.",
    appearanceLine(member, {})
  ].join(" ");
}

module.exports = {
  LOCKED_KEYS: LOCKED_KEYS,
  lockIdentity: lockIdentity,
  canonicalIdentity: canonicalIdentity,
  applyState: applyState,
  compileBookCast: compileBookCast,
  carryProblems: carryProblems,
  reviewSpread: reviewSpread,
  redesignProblems: redesignProblems,
  appearanceLine: appearanceLine,
  spreadCastBrief: spreadCastBrief,
  referenceSheetPrompt: referenceSheetPrompt,
  requiredAccessories: requiredAccessories
};
