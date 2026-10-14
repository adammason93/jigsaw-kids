/* Visual layer of the book brain. One picture-book identity.
   Tone changes light and mood. It does not change the illustrator.
   This file does not call an image provider. */
"use strict";

var Cast = require("./character-bible.js");
var BookCast = require("./book-cast.js");
var Journey = require("./book-journey.js");

var STYLE_ID = "wondii-picture-book";
var MAX_VISUAL_REPAIRS = 1;

var LAYOUTS = ["full-calm", "image-left", "text-left", "caption-bleed", "large-reveal", "facing-text"];

var TONE_MOOD = {
  adventure: "clear daylight, moving air, a little more contrast",
  funny: "warm light, playful colour, no slapstick distortion",
  magical: "a soft impossible glow that stays consistent once it appears",
  mystery: "cooler light, deeper shadow, the same painted world",
  bedtime: "evening light, quiet contrast, warm points of light",
  surprise: "the light the story's time of day needs"
};

var COLOURS = {
  purple: 1, yellow: 1, red: 1, blue: 1, green: 1, orange: 1, pink: 1,
  gold: 1, golden: 1, silver: 1, black: 1, white: 1, brown: 1, grey: 1,
  gray: 1, navy: 1
};

function clone(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function tokens(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
}

function coloursIn(text) {
  var found = [];
  tokens(text).forEach(function (word) {
    var bare = word.replace(/'s$/, "");
    if (COLOURS[bare] && found.indexOf(bare) < 0) found.push(bare);
  });
  return found;
}

function sentencesOf(prose) {
  return String(prose || "").split(/(?<=[.!?])\s+/).map(function (part) {
    return part.trim();
  }).filter(Boolean);
}

var NAME_GLUE = {
  the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, to: 1, her: 1, his: 1, its: 1,
  their: 1, with: 1, on: 1, in: 1, at: 1, by: 1, for: 1, from: 1
};
var COPULA = { was: 1, were: 1, looked: 1, seemed: 1, turned: 1, became: 1, grew: 1 };

function bareWord(word) {
  return String(word || "").replace(/'s$/, "");
}

function nameTokens(entity) {
  return tokens(entity && entity.name).map(bareWord).filter(function (word) {
    return word && !NAME_GLUE[word];
  });
}

function mentions(entity, sentence) {
  var names = nameTokens(entity);
  if (!names.length) return false;
  var bag = tokens(sentence).map(bareWord);
  return bag.indexOf(names[names.length - 1]) >= 0;
}

function nameSlice(names, words) {
  var start = 0;
  var wanted = words.join(" ");
  while (start <= names.length - words.length) {
    if (names.slice(start, start + words.length).join(" ") === wanted) return true;
    start += 1;
  }
  return false;
}

function isNameToken(word, entities) {
  return (entities || []).some(function (entity) {
    return nameTokens(entity).indexOf(word) >= 0;
  });
}

function phraseAfter(bag, colourIndex, entities) {
  var words = [];
  var skippedVerb = false;
  var index;
  for (index = colourIndex + 1; index < bag.length && index <= colourIndex + 6; index += 1) {
    var word = bareWord(bag[index]);
    if (!word || NAME_GLUE[word] || COLOURS[word] || COPULA[word]) continue;
    if (!words.length && !isNameToken(word, entities)) {
      if (skippedVerb) break;
      skippedVerb = true;
      continue;
    }
    if (words.length && !nameSliceOwns(words.concat([word]), entities)) break;
    words.push(word);
  }
  return words;
}

function nameSliceOwns(words, entities) {
  return (entities || []).some(function (entity) {
    return nameSlice(nameTokens(entity), words);
  });
}

function phraseBefore(bag, colourIndex) {
  var index;
  for (index = colourIndex - 1; index >= 0 && index >= colourIndex - 5; index -= 1) {
    var word = bareWord(bag[index]);
    if (!word || NAME_GLUE[word] || COLOURS[word] || COPULA[word]) continue;
    return [word];
  }
  return [];
}

function hasForwardNoun(bag, colourIndex) {
  var index;
  for (index = colourIndex + 1; index < bag.length && index <= colourIndex + 4; index += 1) {
    var word = bareWord(bag[index]);
    if (!word || NAME_GLUE[word] || COLOURS[word] || COPULA[word]) continue;
    return true;
  }
  return false;
}

function colourPhrase(sentence, colour, entities) {
  var bag = tokens(sentence);
  var places = [];
  bag.forEach(function (word, index) {
    if (bareWord(word) === colour) places.push(index);
  });
  return places.map(function (index) {
    var after = phraseAfter(bag, index, entities);
    if (after.length) return after;
    if (hasForwardNoun(bag, index)) return [];
    return phraseBefore(bag, index);
  }).filter(function (phrase) { return phrase.length; });
}

function colourModifiers(entity) {
  return nameTokens(entity).slice(0, -1).filter(function (word) { return !COLOURS[word]; });
}

function colourNear(sentence, entity, colour, entities) {
  var names = nameTokens(entity);
  if (!names.length) return false;
  var head = names[names.length - 1];
  return colourPhrase(sentence, colour, entities).some(function (phrase) {
    if (phrase[phrase.length - 1] !== head) return false;
    var candidates = (entities || []).filter(function (item) {
      var itemNames = nameTokens(item);
      return itemNames.length && itemNames[itemNames.length - 1] === head;
    });
    if (!candidates.length) candidates = [entity];
    var complete = candidates.filter(function (item) {
      return colourModifiers(item).every(function (word) { return phrase.indexOf(word) >= 0; });
    });
    var winner = (complete.length ? complete : candidates).reduce(function (best, item) {
      return nameTokens(item).length > nameTokens(best).length ? item : best;
    });
    return winner.entityId === entity.entityId;
  });
}

function registryEntry(bible, id) {
  return ((bible && bible.identityRegistry) || []).filter(function (row) {
    return row && (row.characterId === id || row.journeyId === id);
  })[0] || null;
}

function describedCharacter(bible, id) {
  var row = registryEntry(bible, id);
  var bibleId = row && row.bibleId ? row.bibleId : id;
  var character = Cast.getCharacter(id) || Cast.getCharacter(bibleId);
  if (!character && !row) return null;
  var portraitOnly = !!(row && row.referenceApproved !== true);
  var refs = character ? Cast.storyReferences(character.characterId) : { assetIds: [], status: "missing", versionId: "", file: "" };
  var file = row ? (row.approvedReference || row.portrait || "") : (refs.file || "");
  return {
    characterId: id,
    name: (row && row.name) || (character && character.name) || id,
    face: portraitOnly ? "as shown in this character's own portrait" : (character && character.face) || "",
    skinTone: portraitOnly ? "as shown in this character's own portrait" : (character && character.skinTone) || "",
    hair: portraitOnly ? "as shown in this character's own portrait" : (character && character.hair) || "",
    ageAppearance: (character && character.ageAppearance) || "",
    body: (character && character.body) || "",
    defaultClothing: portraitOnly ? "as shown in this character's own portrait" : (character && character.defaultClothing) || "",
    footwear: portraitOnly ? "as shown in this character's own portrait" : (character && character.footwear) || "",
    accessories: portraitOnly ? [] : ((character && character.accessories) || []).slice(),
    relativeHeight: (character && character.relativeHeight) || "",
    visualIdentifiers: portraitOnly ? ["match the portrait exactly"] : ((character && character.visualIdentifiers) || []).slice(),
    referenceAssetIds: portraitOnly ? [] : (refs.assetIds || []).slice(),
    referenceVersionId: portraitOnly ? (row.referenceVersion || "") : (refs.versionId || ""),
    referenceFile: file,
    referenceStatus: portraitOnly ? "portrait" : (refs.status || "missing")
  };
}

function characterOwns(bible, page, sentence, colour) {
  var present = page.charactersPresent || bible.castIds || [];
  return present.some(function (id) {
    var character = describedCharacter(bible, id);
    if (!character || tokens(sentence).indexOf(character.name.toLowerCase()) < 0) return false;
    var look = [character.defaultClothing, character.footwear].concat(character.accessories || []).concat(character.visualIdentifiers || []).join(" ");
    return coloursIn(look).indexOf(colour) >= 0;
  });
}

function allowedColours(entity, page) {
  var text = [entity.name, entity.identity, entity.state].join(" ");
  [page.stateBefore, page.stateAfter].forEach(function (snap) {
    ((snap && snap.entities) || []).forEach(function (row) {
      if (row.entityId === entity.entityId) text += " " + (row.state || "");
    });
  });
  return coloursIn(text);
}

function unplannedVisualProblems(bible, pages) {
  var problems = [];
  var entities = (bible && bible.entities) || [];
  var known = {};
  entities.forEach(function (entity) {
    known[entity.entityId] = allowedColours(entity, { stateBefore: null, stateAfter: null });
  });
  (pages || []).forEach(function (page) {
    var previous = [];
    sentencesOf(page.prose).forEach(function (sentence) {
      var named = entities.filter(function (entity) { return mentions(entity, sentence); });
      var colours = coloursIn(sentence).filter(function (colour) {
        return !characterOwns(bible, page, sentence, colour);
      });
      var bound = named;
      var fromPrevious = false;
      if (!bound.length && colours.length && previous.length === 1 && !characterOwns(bible, page, sentence, colours[0])) {
        var namesSomeone = (page.charactersPresent || bible.castIds || []).some(function (id) {
          var character = describedCharacter(bible, id);
          return character && tokens(sentence).indexOf(character.name.toLowerCase()) >= 0;
        });
        if (!namesSomeone) {
          bound = previous;
          fromPrevious = true;
        }
      }
      bound.forEach(function (entity) {
        var allow = known[entity.entityId].concat(allowedColours(entity, page));
        var intro = entity.introducedAt && page.beatId === entity.introducedAt;
        colours.forEach(function (colour) {
          if (!fromPrevious && !colourNear(sentence, entity, colour, entities)) return;
          if (allow.indexOf(colour) >= 0) return;
          if (intro) {
            known[entity.entityId].push(colour);
            return;
          }
          problems.push("unplanned-visual:" + entity.entityId + ":" + page.pageId);
        });
      });
      if (named.length) previous = named;
    });
  });
  return problems.filter(function (problem, index) { return problems.indexOf(problem) === index; });
}

function layoutFor(page) {
  var shot = page && page.shotType;
  var region = String(page && page.textSafeRegion || "");
  if (shot === "establishing" || shot === "reveal" || shot === "high") return "large-reveal";
  if (shot === "close" || shot === "vignette") return "caption-bleed";
  if (region.indexOf("left") >= 0) return "text-left";
  if (region.indexOf("right") >= 0) return "image-left";
  return "full-calm";
}

var ILLUSTRATOR = {
  rendering: "soft painted picture-book",
  characterRendering: "the same painted construction for every person and creature",
  shapeLanguage: "clear rounded shapes",
  edge: "soft painted edges",
  texture: "light painted texture",
  material: "painted surfaces",
  detail: "readable picture-book detail",
  depth: "gentle painted depth",
  facialRendering: "expressive painted faces with one construction",
  proportions: "storybook proportions",
  environmentRendering: "painted places, whatever the place contains",
  lightingPhilosophy: "painted light that follows the scene",
  colourTreatment: "harmonised painted colour",
  finish: "one picture-book finish"
};

var STYLE_KEYS = [
  "rendering", "characterRendering", "shapeLanguage", "edge", "texture", "material",
  "detail", "depth", "facialRendering", "proportions", "environmentRendering",
  "lightingPhilosophy", "colourTreatment", "finish"
];

var ATMOSPHERE_KEYS = ["palette", "brightness", "timeOfDay", "weather", "atmosphere", "warmth", "tension", "glow", "mood"];

var DRIFT_VALUES = {
  rendering: { "3d": 1, cgi: 1, vector: 1, flat: 1, glossy: 1, photoreal: 1, "animation-still": 1 },
  characterRendering: { "3d": 1, chibi: 1, photoreal: 1, vector: 1 },
  proportions: { chibi: 1, realistic: 1 },
  edge: { ink: 1, vector: 1, hard: 1 },
  texture: { flat: 1, plastic: 1 },
  finish: { glossy: 1, "animation-still": 1, vector: 1 },
  environmentRendering: { "3d": 1, vector: 1, photoreal: 1 }
};

var DRIFT_WORD = /\b(3d|cgi|chibi|super-deformed|vector|clipart|photoreal|hyperreal|cel-shaded|cel shaded|glossy animation|animation still)\b/i;

function styleFor(tone) {
  return {
    styleId: STYLE_ID,
    mood: TONE_MOOD[tone] || TONE_MOOD.surprise,
    sameIllustrator: true
  };
}

function styleContract(bible) {
  return {
    styleId: STYLE_ID,
    status: "approved",
    scope: "book",
    illustrator: clone(ILLUSTRATOR),
    atmosphere: {
      tone: (bible && bible.tone) || "",
      mood: TONE_MOOD[(bible && bible.tone)] || TONE_MOOD.surprise
    }
  };
}

function spreadStyle(bible, spread, place) {
  var book = styleContract(bible);
  return {
    styleId: book.styleId,
    scope: "book",
    illustrator: book.illustrator,
    atmosphere: {
      mood: book.atmosphere.mood,
      palette: (spread && spread.palette) || "",
      brightness: (spread && spread.brightness) || "",
      timeOfDay: (spread && spread.timeOfDay) || "",
      weather: (spread && spread.weather) || "",
      atmosphere: (spread && spread.atmosphere) || (place && place.visualIdentity) || "",
      warmth: (spread && spread.warmth) || "",
      tension: (spread && spread.tension) || "",
      glow: (spread && spread.glow) || ""
    }
  };
}

function styleClause(contract) {
  var look = (contract && contract.illustrator) || ILLUSTRATOR;
  return [
    "Illustrator identity " + STYLE_ID + ", locked for the whole book.",
    "Rendering: " + look.rendering + ".",
    "Character rendering: " + look.characterRendering + ".",
    "Shapes: " + look.shapeLanguage + ".",
    "Edges: " + look.edge + ".",
    "Texture: " + look.texture + ".",
    "Materials: " + look.material + ".",
    "Detail: " + look.detail + ".",
    "Depth: " + look.depth + ".",
    "Faces: " + look.facialRendering + ".",
    "Proportions: " + look.proportions + ".",
    "Places: " + look.environmentRendering + ".",
    "Light: " + look.lightingPhilosophy + ".",
    "Colour: " + look.colourTreatment + ".",
    "Finish: " + look.finish + ".",
    "The place, weather, time of day, brightness, and palette may change. Do not change this illustrator."
  ].join(" ");
}

function styleOverrides(text) {
  return String(text || "").split(/(?<=[.!?])\s+/).map(function (sentence) {
    return sentence.trim();
  }).filter(function (sentence) {
    if (!sentence || !DRIFT_WORD.test(sentence)) return false;
    return !/\b(not|never|don't|do not|without)\b/i.test(sentence);
  });
}

function withoutStyleOverrides(text) {
  var dropped = styleOverrides(text);
  if (!dropped.length) return String(text || "");
  return String(text || "").split(/(?<=[.!?])\s+/).filter(function (sentence) {
    return dropped.indexOf(sentence.trim()) < 0;
  }).join(" ");
}

function sameIllustrator(left, right) {
  var a = (left && left.illustrator) || {};
  var b = (right && right.illustrator) || {};
  return STYLE_KEYS.every(function (key) { return a[key] === b[key]; });
}

function atmosphereDelta(left, right) {
  return ATMOSPHERE_KEYS.filter(function (key) {
    return left && right && left[key] && right[key] && left[key] !== right[key];
  });
}

function readingDrift(reading) {
  var problems = [];
  var report = reading || {};
  Object.keys(DRIFT_VALUES).forEach(function (key) {
    var value = String(report[key] || "").toLowerCase();
    if (value && DRIFT_VALUES[key][value]) problems.push("style-drift:" + key + ":" + value);
  });
  return problems;
}

function styleCoherence(readings) {
  var problems = [];
  var list = readings || [];
  var refs = list.filter(function (reading) { return reading && reading.reference; });
  list.forEach(function (reading) {
    if (!reading) return;
    readingDrift(reading).forEach(function (problem) {
      problems.push((reading.spreadId || "spread") + ":" + problem);
    });
    refs.forEach(function (ref) {
      if (!ref || ref.spreadId === reading.spreadId) return;
      Object.keys(DRIFT_VALUES).forEach(function (key) {
        if (!reading[key] || !ref[key] || reading[key] === ref[key]) return;
        if (DRIFT_VALUES[key][String(reading[key]).toLowerCase()]) {
          problems.push("style-drift:" + (reading.spreadId || "spread") + ":" + key);
        }
      });
    });
  });
  return { ok: problems.length === 0, problems: problems.filter(function (problem, index) { return problems.indexOf(problem) === index; }) };
}

function castLook(bible, proposals) {
  var proposalsById = proposals || {};
  return (bible.castIds || []).map(function (id) {
    var look = describedCharacter(bible, id);
    if (!look) return null;
    var proposal = proposalsById[id] || proposalsById[look.characterId];
    if (proposal && proposal.assetIds && look.referenceStatus !== "portrait") {
      look.referenceAssetIds = proposal.assetIds.slice();
      look.referenceVersionId = proposal.versionId || look.referenceVersionId;
      look.referenceStatus = proposal.status || look.referenceStatus;
    }
    return look;
  }).filter(Boolean);
}

function piecesOf(text) {
  return String(text || "").split(",").map(function (part) { return part.trim(); }).filter(Boolean);
}

function wornOutfit(stateClothing, defaultClothing) {
  var worn = piecesOf(stateClothing);
  var base = piecesOf(defaultClothing);
  if (!worn.length) return base.join(", ");
  var wornLower = worn.map(function (part) { return part.toLowerCase(); });
  var baseLower = base.map(function (part) { return part.toLowerCase(); });
  var subset = wornLower.every(function (part) { return baseLower.indexOf(part) >= 0; });
  if (!subset) return worn.join(", ");
  var extra = base.filter(function (part) { return wornLower.indexOf(part.toLowerCase()) < 0; });
  return worn.concat(extra).join(", ");
}

function faceAsked(entity, spec) {
  if (spec && spec.faceRequired === true) return true;
  return /\b(face|eyes|mouth|smile)\b/i.test(String(entity && entity.identity || ""));
}

function defineStoryEntity(entity, spec) {
  var given = spec || {};
  var asked = faceAsked(entity, given);
  var features = (given.distinctiveFeatures || []).slice().filter(function (item) {
    return asked || !/\b(face|eyes|mouth|smile)\b/i.test(String(item));
  });
  var needsReference = given.needsReference === true;
  return {
    entityId: entity.entityId,
    scope: "book",
    visualIdentity: given.visualIdentity || entity.identity || "",
    shape: given.shape || "",
    relativeScale: given.relativeScale || "",
    materials: given.materials || "",
    colourLight: given.colourLight || "",
    distinctiveFeatures: features,
    referenceAssetIds: needsReference ? (given.referenceAssetIds || []).slice() : [],
    mutableState: given.mutableState || entity.state || "",
    face: asked ? "required" : "none"
  };
}

function entityRow(entity) {
  return {
    entityId: entity.entityId,
    name: entity.name,
    visualIdentity: entity.identity || "",
    ownerCharacterId: entity.ownerCharacterId || null,
    locationId: entity.locationId || "",
    state: entity.state || "",
    introducedOnSpread: entity.introducedAt || ""
  };
}

function visualBookBible(bible, proposals) {
  var book = bible || {};
  var beats = book.beats || [];
  return {
    style: styleContract(book),
    cast: castLook(book, proposals),
    locations: (book.locations || []).map(function (place) {
      return {
        locationId: place.locationId,
        name: place.name,
        visualIdentity: place.visualIdentity || "",
        connectedTo: (place.connectedTo || []).slice(),
        persistentObjects: (book.entities || []).filter(function (entity) {
          return entity.locationId === place.locationId;
        }).map(function (entity) { return entity.entityId; })
      };
    }),
    entities: (book.entities || []).map(entityRow),
    bookCast: BookCast.compileBookCast(book, book.pages || []),
    journeyArc: Journey.analyse({ bible: book, pages: book.pages || [] }).visualArc,
    visualArc: beats.map(function (beat) {
      return {
        beatId: beat.beatId,
        role: beat.role,
        locationId: beat.locationId,
        emotion: beat.emotion,
        event: beat.action
      };
    }),
    compositionLanguage: {
      shots: beats.map(function (beat) { return beat.shotType; }),
      layouts: beats.map(function (beat) { return layoutFor(beat); })
    }
  };
}

function entitySnap(page, which) {
  var snap = page && page[which];
  return clone((snap && snap.entities) || []);
}

var ALIAS_SKIP = {
  the: 1, and: 1, with: 1, whose: 1, when: 1, from: 1, that: 1, this: 1, into: 1,
  over: 1, under: 1, again: 1, their: 1, them: 1, have: 1, does: 1, they: 1,
  were: 1, been: 1, which: 1, while: 1, after: 1, before: 1, about: 1, there: 1
};

var SMALL_WORDS = { small: 1, tiny: 1, little: 1, miniature: 1, speck: 1 };

function unique(list) {
  return list.filter(function (item, index) { return list.indexOf(item) === index; });
}

function aliasesFor(entity) {
  var parts = String(entity && entity.entityId || "").split(/[-_]/);
  return unique(parts.concat(tokens(entity && entity.name), tokens(entity && entity.identity)).map(function (word) {
    return word.replace(/'s$/, "");
  }).filter(function (word) {
    return word.length > 3 && !ALIAS_SKIP[word];
  }));
}

function scaleFor(entity, spread) {
  var blob = tokens([entity && entity.name, entity && entity.identity, entity && entity.state, spread && spread.visualFocus].join(" "));
  return bagHas(blob, SMALL_WORDS) ? "small" : "ordinary";
}

function bagHas(words, table) {
  return words.some(function (word) { return table[word]; });
}

function entitySpec(entity, spread, location) {
  var aliases = aliasesFor(entity);
  var placeWords = tokens(location && location.visualIdentity);
  return {
    entityId: entity.entityId,
    aliases: aliases,
    scale: scaleFor(entity, spread),
    landmark: aliases.some(function (alias) { return placeWords.indexOf(alias) >= 0; })
  };
}

function judgeSightings(specs, report) {
  var evidence = [report && report.observations, report && report.notes].concat((report && report.entities || []).map(function (row) {
    return row.seen || "";
  })).join(" ").toLowerCase();
  return (specs || []).map(function (spec) {
    var stated = ((report && report.entities) || []).filter(function (row) {
      return row.entityId === spec.entityId;
    })[0] || {};
    var saidMissing = stated.status === "missing" || ((report && report.missingEntities) || []).indexOf(spec.entityId) >= 0;
    var aliasHit = spec.aliases.some(function (alias) { return evidence.indexOf(alias) >= 0; });
    if (aliasHit || stated.status === "confirmed") {
      return { entityId: spec.entityId, status: "confirmed", redraw: false };
    }
    if (saidMissing && spec.scale === "small") {
      return { entityId: spec.entityId, status: "uncertain", redraw: false };
    }
    if (saidMissing && spec.landmark && report && report.locationMatch === true) {
      return { entityId: spec.entityId, status: "uncertain", redraw: false };
    }
    if (saidMissing) return { entityId: spec.entityId, status: "missing", redraw: true };
    if (spec.scale === "small") return { entityId: spec.entityId, status: "uncertain", redraw: false };
    return { entityId: spec.entityId, status: "uncertain", redraw: false };
  });
}

function clausesOf(text) {
  return String(text || "").split(/(?<=[.!?])\s+|,\s+(?:and\s+)?|\s+\bthen\b\s+/i).map(function (part) {
    return part.replace(/^(?:and|then)\s+/i, "").replace(/[.!?]+$/, "").trim();
  }).filter(Boolean);
}

function subjectOf(clause) {
  var words = String(clause || "").split(/\s+/);
  if (/^(the|a|an)$/i.test(words[0]) && words[1]) return words[0] + " " + words[1];
  return words[0] || "";
}

function illustrationMoment(spread) {
  var event = String(spread && spread.storyEvent || "");
  var steps = clausesOf(event);
  var montage = !!(spread && (spread.montage === true || spread.compositionMode === "montage"));
  var instances = {};
  (spread && spread.charactersPresent || []).forEach(function (id) {
    instances[id] = montage ? "sequence" : 1;
  });
  if (montage || steps.length < 2) {
    return {
      fullEvent: event,
      steps: steps,
      instant: event,
      montage: montage,
      characterInstances: instances
    };
  }
  var consequence = steps[steps.length - 1];
  var later = /\b(then|later|afterwards|after that)\b/i.test(consequence);
  var pose = later ? consequence : steps[steps.length - 2];
  var response = later ? "" : consequence;
  if (subjectOf(pose).toLowerCase() === subjectOf(steps[0]).toLowerCase() && pose !== steps[0]) {
    /* The chosen clause already names its subject. */
  } else if (pose !== steps[0] && subjectOf(pose) && steps[0].toLowerCase().indexOf(subjectOf(pose).toLowerCase()) !== 0) {
    pose = subjectOf(steps[0]) + " " + pose.charAt(0).toLowerCase() + pose.slice(1);
  }
  var instant = response ? pose + " while " + response.charAt(0).toLowerCase() + response.slice(1) : pose;
  return {
    fullEvent: event,
    steps: steps,
    instant: instant,
    montage: false,
    characterInstances: instances
  };
}

function momentProblems(spread) {
  var problems = [];
  var event = String(spread.storyEvent || spread.fullEvent || "");
  var instant = String(spread.illustrationMoment || spread.instant || "");
  if (!instant) problems.push("moment-missing");
  var afterText = ((spread.stateAfter && spread.stateAfter.entities) || []).map(function (entity) {
    return entity.state || "";
  }).join(" ");
  var beforeText = ((spread.openingState && spread.openingState.entities) || (spread.stateBefore && spread.stateBefore.entities) || []).map(function (entity) {
    return entity.state || "";
  }).join(" ");
  var eventWords = tokens(event);
  var beforeWords = tokens(beforeText);
  tokens(instant).forEach(function (word) {
    if (word.length <= 3 || word === "while") return;
    if (eventWords.indexOf(word) >= 0 || beforeWords.indexOf(word) >= 0) return;
    if (tokens(afterText).indexOf(word) >= 0) problems.push("moment-after-only");
  });
  if (!spread.montage) {
    Object.keys(spread.characterInstances || {}).forEach(function (id) {
      if (spread.characterInstances[id] !== 1) problems.push("moment-instances:" + id);
    });
  }
  return unique(problems);
}

function pageVisualContract(bible, pages, index) {
  var page = pages[index];
  var beat = (bible.beats || []).filter(function (item) { return item.beatId === page.beatId; })[0] || {};
  var previous = index > 0 ? pages[index - 1] : null;
  var next = pages[index + 1] || null;
  var compiledCast = BookCast.compileBookCast(bible, pages);
  var lockedIdentities = {};
  (page.charactersPresent || []).forEach(function (id) {
    var member = compiledCast.byId[id];
    if (member && member.identity) lockedIdentities[id] = member.identity;
  });
  var moment = illustrationMoment({
    storyEvent: page.action || beat.action || "",
    charactersPresent: page.charactersPresent || [],
    montage: page.montage === true || beat.montage === true,
    compositionMode: page.compositionMode || beat.compositionMode || ""
  });
  var journeySpread = Journey.analyse({ bible: bible, pages: pages }).spreads[index] || {};
  var pageRole = page.pageRole || journeySpread.pageRole || "";
  var plannedTextRegion = page.plannedTextRegion || journeySpread.plannedTextRegion || page.textSafeRegion || "";
  var contract = {
    spreadId: page.pageId,
    beatId: page.beatId,
    role: beat.role || "",
    locationId: page.locationId,
    charactersPresent: (page.charactersPresent || []).slice(),
    characterStateBefore: clone((page.stateBefore && page.stateBefore.characters) || []),
    entityStateBefore: entitySnap(page, "stateBefore"),
    storyEvent: page.action || beat.action || "",
    sequentialActions: moment.steps,
    illustrationMoment: moment.instant,
    montage: moment.montage,
    characterInstances: moment.characterInstances,
    lockedIdentities: lockedIdentities,
    stateAfter: clone(page.stateAfter || null),
    entitiesRequired: (page.entitiesRequired || []).slice(),
    visualFocus: page.visualFocus || "",
    shotType: page.shotType,
    cameraAngle: page.shotType,
    compositionIntent: page.compositionIntent || "",
    emotion: page.emotion || "",
    lighting: (styleFor(bible.tone).mood),
    style: spreadStyle(bible, page, (bible.locations || []).filter(function (item) { return item.locationId === page.locationId; })[0]),
    textSafeRegion: page.textSafeRegion || "",
    pageRole: pageRole,
    visualImportance: page.visualImportance || journeySpread.visualImportance || "",
    plannedTextRegion: plannedTextRegion,
    gutterSafe: journeySpread.gutterSafe !== false && Journey.gutterSafe(pageRole, plannedTextRegion),
    layout: layoutFor(page),
    openingState: clone(page.stateBefore || null),
    continuityFromPrevious: previous ? previous.pageId : null,
    requirementsForNext: next ? { spreadId: next.pageId, mustMatch: clone(page.stateAfter || null) } : null,
    cameraBrief: journeySpread.cameraBrief || "",
    continuityLine: journeySpread.continuityLine || "",
    placeTransition: journeySpread.placeTransition || "",
    worldTone: journeySpread.worldTone || "",
    varietyNote: journeySpread.varietyNote || "",
    placeStay: journeySpread.placeStay || 1,
    placeCue: placeCue(page.prose, page.action || beat.action || ""),
    prose: ""
  };
  var scene = sceneInventory(bible, contract);
  contract.mustShow = scene.showIds;
  contract.sceneLeave = scene.leave.join("; ");
  return contract;
}

function planVisuals(bible, proposals) {
  var pages = (bible.pages || bible._pages || null);
  return {
    visualBible: visualBookBible(bible, proposals),
    spreads: (pages || []).map(function (page, index) {
      return pageVisualContract(bible, pages, index);
    })
  };
}

function contractsFor(bible, pages, proposals) {
  var book = Object.assign({}, bible, { pages: pages });
  return {
    visualBible: visualBookBible(book, proposals),
    spreads: pages.map(function (page, index) {
      return pageVisualContract(book, pages, index);
    })
  };
}

function proofSpreads(pages, beats) {
  var roleOf = {};
  (beats || []).forEach(function (beat) { roleOf[beat.beatId] = beat.role; });
  function withRole(page) { return Object.assign({}, page, { role: roleOf[page.beatId] || page.role || "" }); }
  var list = (pages || []).map(withRole);
  var early = list.filter(function (page) { return page.role === "discovery"; })[0] || list[1] || list[0];
  var late = list.filter(function (page) { return page.role === "climax"; })[0] || list[list.length - 2] || list[list.length - 1];
  var mid = list.filter(function (page) { return page.role === "exploration"; })[0] || list[Math.floor(list.length / 2)] || early;
  return [early, mid, late].filter(Boolean).filter(function (page, index, all) {
    return all.findIndex(function (item) { return item.pageId === page.pageId; }) === index;
  });
}

function regenContract(spread) {
  return {
    mayChange: ["pose", "framing", "compositionInterpretation", "expression"],
    mustKeep: {
      charactersPresent: (spread.charactersPresent || []).slice(),
      locationId: spread.locationId,
      entitiesRequired: (spread.entitiesRequired || []).slice(),
      openingState: clone(spread.openingState),
      stateAfter: clone(spread.stateAfter),
      storyEvent: spread.storyEvent,
      identities: clone(spread.lockedIdentities || null),
      styleId: STYLE_ID,
      illustrator: clone(ILLUSTRATOR)
    }
  };
}

function sheetPrompt(character) {
  return [
    "A contemporary children's picture-book character sheet of one child, painted with a soft brush, clear shapes, and a clean finish.",
    "Not a 3D render, not plastic gloss, not flat clipart, not a vector icon set.",
    "White paper background. No letters, no numbers, no captions, no labels, no watermark.",
    "Show the same child several times: front view standing, three-quarter view, side view, a happy face, a worried face, one walking pose, a full body, and a face close-up.",
    "The child is " + character.ageAppearance + ".",
    "Face: " + character.face + ".",
    "Skin: " + character.skinTone + ".",
    "Hair: " + character.hair + ".",
    "Body: " + character.body + ". Height: " + character.relativeHeight + ".",
    "Clothes: " + character.defaultClothing + ". Shoes: " + character.footwear + ".",
    "Always visible: " + (character.visualIdentifiers || []).join(", ") + ".",
    "Accessories: " + (character.accessories || []).join(", ") + ".",
    "Keep one face, one hair shape, and one outfit across every view."
  ].join(" ");
}

function placeCue(prose, action) {
  var sentences = String(prose || "").split(/(?<=[.!?])\s+/);
  var sentence = sentences.filter(function (line) {
    return /\b(dark|unlit|dim|moonlit|rain|snow|sunset|sunrise)\b/i.test(line);
  })[0] || "";
  if (!sentence) return "";
  var word = (sentence.match(/\b(dark|unlit|dim|moonlit|rain|snow|sunset|sunrise)\b/i) || [])[0];
  if (word && String(action || "").toLowerCase().indexOf(word.toLowerCase()) >= 0) return "";
  return sentence.replace(/\s+/g, " ").trim();
}

function headNoun(name) {
  var words = tokens(name).filter(function (word) {
    return word.length > 2 && !ALIAS_SKIP[word];
  });
  return words.length ? words[words.length - 1] : "";
}

function mentionsHead(entity, text) {
  var head = headNoun(entity && (entity.name || entity.entityId));
  if (!head || head.length < 3) return false;
  return tokens(text).indexOf(head) >= 0;
}

function sharesContentWord(entity, text) {
  var nameWords = tokens(entity && (entity.name || entity.entityId)).filter(function (word) {
    return word.length > 4 && !ALIAS_SKIP[word];
  });
  var blob = tokens(text);
  return nameWords.some(function (word) { return blob.indexOf(word) >= 0; });
}

function placeName(bible, locationId) {
  var place = ((bible && bible.locations) || []).filter(function (item) {
    return item.locationId === locationId;
  })[0];
  return (place && place.name) || locationId || "another place";
}

function sceneInventory(bible, spread) {
  var here = spread.locationId || "";
  var place = ((bible && bible.locations) || []).filter(function (item) {
    return item.locationId === here;
  })[0];
  var momentText = [
    spread.storyEvent, spread.illustrationMoment, spread.visualFocus,
    spread.compositionIntent, spread.placeCue, place && place.visualIdentity
  ].filter(Boolean).join(" ");
  var rows = (spread.entityStateBefore || []).slice();
  var seen = {};
  rows.forEach(function (row) { if (row && row.entityId) seen[row.entityId] = true; });
  ((spread.stateAfter && spread.stateAfter.entities) || []).forEach(function (row) {
    if (!row || !row.entityId || seen[row.entityId]) return;
    var known = ((bible && bible.entities) || []).filter(function (item) {
      return item.entityId === row.entityId;
    })[0] || row;
    if (!mentionsHead(known, momentText) && !(row.locationId === here && mentionsHead(known, place && place.visualIdentity))) return;
    rows.push(row);
    seen[row.entityId] = true;
  });
  var show = [];
  var leave = [];
  var span = [];
  var showIds = [];
  rows.forEach(function (row) {
    var known = ((bible && bible.entities) || []).filter(function (item) {
      return item.entityId === row.entityId;
    })[0] || {};
    var name = known.name || row.entityId;
    var stated = row.locationId || "";
    var carried = /\b(pocket|carrying|carried|wearing|tucked)\b/i.test(row.state || "");
    var inMoment = mentionsHead(known.entityId ? known : { name: name, entityId: row.entityId }, momentText);
    var elsewhere = !!(stated && stated !== here && !inMoment && !carried);
    if (elsewhere && sharesContentWord(known.entityId ? known : { name: name }, momentText)) {
      span.push("The rest of " + name + " stays in " + placeName(bible, stated) + ". Show only the part this moment names.");
      return;
    }
    if (elsewhere) {
      leave.push(name + ", still in " + placeName(bible, stated));
      return;
    }
    if (carried && !inMoment) {
      show.push(name + " stays " + String(row.state || "with its owner").replace(/\.$/, "") + ". It is not the subject.");
      return;
    }
    var line = name;
    var identity = known.identity ? String(known.identity).split(". ")[0] : "";
    if (identity) line += ": " + identity.replace(/\.$/, "");
    if (row.state) line += ". Right now: " + String(row.state).replace(/\.$/, "");
    show.push(line);
    showIds.push(row.entityId);
  });
  return { show: show, leave: leave, span: span, showIds: showIds };
}

function spreadPrompt(bible, spread, cast) {
  var place = (bible.locations || []).filter(function (item) { return item.locationId === spread.locationId; })[0];
  var people = (spread.charactersPresent || []).map(function (id) {
    var row = (cast || []).filter(function (item) { return item.characterId === id; })[0];
    var state = (spread.characterStateBefore || []).filter(function (item) { return item.characterId === id; })[0] || {};
    if (!row) return id;
    if (row.identity) return BookCast.appearanceLine(row, state);
    var outfit = wornOutfit(state.clothing, row.defaultClothing);
    return row.name + ", " + row.hair + ", " + row.skinTone + ", wearing " + outfit + " and " + row.footwear;
  }).join("; ");
  var scene = sceneInventory(bible, spread);
  var composition = spread.compositionIntent || "";
  var focus = spread.visualFocus || spread.storyEvent;
  if (!spread.montage) {
    if (/\bsequence\b/i.test(composition)) composition = "One pose, with room in the text-safe area.";
    if (/\b(sequence|repeated|montage)\b/i.test(focus)) focus = spread.illustrationMoment || focus;
  }
  composition = withoutStyleOverrides(composition);
  focus = withoutStyleOverrides(focus);
  var look = spreadStyle(bible, spread, place);
  var persistent = (spread.storyEntities || []).filter(function (row) {
    return row.shape || (row.distinctiveFeatures && row.distinctiveFeatures.length) || (row.referenceAssetIds && row.referenceAssetIds.length);
  }).map(function (row) {
    return row.entityId + " keeps this look: " + row.visualIdentity
      + " Shape: " + (row.shape || "as described") + "."
      + " Scale: " + (row.relativeScale || "as described") + "."
      + " Material: " + (row.materials || "as described") + "."
      + " Light: " + (row.colourLight || "as described") + "."
      + " Features: " + ((row.distinctiveFeatures || []).join(", ") || "none") + "."
      + (row.face === "none" ? " It stays a simple object, not a living character." : " Expression follows the book.")
      + " What may change is only: " + (row.mutableState || "position and pose") + ".";
  }).join(" ");
  return [
    styleClause(look),
    "One illustration for a children's picture book, in the same painted style as the character reference.",
    "Match each shown character to their own reference. Keep every face, hair, skin, age, and outfit. Do not redesign them, merge them, or give one character another's clothes. The same child must stay recognisable on every page. Pose, expression, and viewing angle may change. Face, hair, and clothing may not. The reference locks identity only. Do not copy its pose, background, or framing.",
    "No letters, no words, no numbers, no captions, no speech balloons, no watermark.",
    "Leave the " + (spread.textSafeRegion || "upper") + " area quieter, with open sky, wall, or ground, so type can sit there later. Do not draw a box.",
    "Draw only this instant: " + (spread.illustrationMoment || spread.storyEvent),
    "Place: " + (place ? place.name + ". " + (place.visualIdentity || "") : spread.locationId) + ".",
    spread.placeCue ? "Story condition: " + spread.placeCue : "",
    spread.continuityLine ? "Continuity: " + spread.continuityLine : "",
    spread.placeTransition || "",
    spread.worldTone || "",
    spread.locationZone ? "Zone: " + spread.locationZone + "." : "",
    spread.visualNoveltyReason && spread.visualNoveltyReason !== "opening" && spread.visualNoveltyReason !== "framing-only" ? "This scene is different because: " + spread.visualNoveltyReason + ". Keep this place and this change." : "",
    "Camera: " + (spread.cameraBrief || ("Shot: " + spread.shotType + ".")) + (composition ? " " + composition : "") + " The character references are not the camera.",
    scene.show.length ? "In this picture: " + scene.show.join("; ") + "." : "",
    scene.span.length ? scene.span.join(" ") : "",
    scene.leave.length ? "Do not draw these. They stay where they already are: " + scene.leave.join("; ") + "." : "",
    "Who: " + people + ".",
    persistent ? "Persistent story entities, the same look at any size or place: " + persistent : "",
    persistent ? "Keep each persistent object the same simple shape in this picture." : "",
    spread.montage ? "This spread is an explicit montage." : "Show each character in one pose only.",
    "Emotion to show, not a caption: " + (spread.emotion || "quiet") + ".",
    "Focus: " + focus,
    "Light: " + (spread.placeCue && /\bdark|unlit|dim\b/i.test(spread.placeCue)
      ? "The route in this picture stays dark. Do not light it from another room."
      : spread.lighting) + ".",
    "Do not show a later result that has not happened yet.",
    "Draw each object listed for this picture once. Do not add an object that was left in another place.",
    pageRoleLine(spread)
  ].filter(Boolean).join(" ");
}

function pageRoleLine(spread) {
  var role = spread && spread.pageRole;
  var region = (spread && (spread.plannedTextRegion || spread.textSafeRegion)) || "outer";
  if (role === "left-page") {
    return "Physical page: left page of an open book. Keep faces and the main action away from the right-hand gutter. Leave the " + region + " area quiet for type.";
  }
  if (role === "right-page") {
    return "Physical page: right page of an open book. Keep faces and the main action away from the left-hand gutter. Leave the " + region + " area quiet for type.";
  }
  if (role === "double-page-spread") {
    return "Physical page: one picture across both open pages. Keep faces and the main action out of the centre gutter. Leave the " + region + " area quiet for type.";
  }
  return "";
}

function repairPrompt(bible, spread, cast) {
  return [
    spreadPrompt(bible, spread, cast),
    "Revise this one picture. Draw only this instant: " + (spread.illustrationMoment || spread.storyEvent) + ".",
    "Each character once. Keep recorded clothing and story state.",
    "Keep illustrator " + STYLE_ID + ". Do not switch rendering, line, texture, proportions, or finish."
  ].join(" ");
}

function mustShow(bible, spread) {
  var ids = [];
  (bible.entities || []).forEach(function (entity) {
    var words = tokens(entity.name).filter(function (word) { return word.length > 3; });
    var blob = tokens(spread.storyEvent + " " + (spread.visualFocus || "")).join(" ");
    var named = words.some(function (word) { return blob.indexOf(word) >= 0; });
    var atPlace = entity.locationId === spread.locationId && (spread.entitiesRequired || []).indexOf(entity.entityId) >= 0;
    if (named || ((spread.role === "discovery" || spread.shotType === "establishing") && atPlace)) ids.push(entity.entityId);
  });
  return ids.filter(function (id, index) { return ids.indexOf(id) === index; });
}

function countPages(pages, id, key) {
  return (pages || []).filter(function (page) {
    return page && page[key] === id;
  }).length;
}

function isSettingLandmark(entity, locations) {
  var names = tokens(entity && entity.name).filter(function (word) { return word.length > 3; });
  var blob = (locations || []).map(function (place) {
    return (place.name || "") + " " + (place.visualIdentity || "");
  }).join(" ").toLowerCase();
  return names.some(function (word) { return blob.indexOf(word) >= 0; });
}

function locationById(book, id) {
  return ((book && book.locations) || []).filter(function (place) { return place.locationId === id; })[0] || null;
}

function pickCoverHeroes(book, cast) {
  var members = (cast && cast.members) || [];
  var byId = {};
  members.forEach(function (member) { byId[member.characterId] = member; });
  var selected = (book.castIds || []).filter(function (id) { return byId[id] || !members.length; });
  if (!selected.length) selected = members.map(function (member) { return member.characterId; });
  var heroes = selected.slice();
  if (heroes.length > 3) {
    heroes = heroes.slice().sort(function (a, b) {
      var left = byId[a] && byId[a].spreadsPresent ? byId[a].spreadsPresent.length : 0;
      var right = byId[b] && byId[b].spreadsPresent ? byId[b].spreadsPresent.length : 0;
      return right - left;
    }).slice(0, 2);
  }
  var story = members.filter(function (member) {
    return member.origin === "story" && heroes.indexOf(member.characterId) < 0 && member.recurring;
  }).sort(function (a, b) {
    return (b.spreadsPresent || []).length - (a.spreadsPresent || []).length;
  });
  if (story[0] && heroes.length < 3 && ((story[0].spreadsPresent || []).length >= 2 || story[0].visualImportance === "important")) {
    heroes.push(story[0].characterId);
  }
  return heroes;
}

function pickFeaturedEntities(book) {
  var text = [book && book.hook, book && book.premise, book && book.motif, book && book.centralProblem].join(". ");
  var named = ((book && book.entities) || []).filter(function (entity) {
    return !isSettingLandmark(entity, book.locations) && mentions(entity, text);
  });
  named.sort(function (a, b) {
    var pages = book.pages || [];
    return countPages(pages, b.entityId, "entitiesRequired") - countPages(pages, a.entityId, "entitiesRequired");
  });
  return named.slice(0, 2).map(function (entity) { return entity.entityId; });
}

function pickCoverLocation(book, pages) {
  var locations = (book && book.locations) || [];
  if (!locations.length) return null;
  var counts = {};
  (pages || []).forEach(function (page) {
    if (!page || !page.locationId || page.beatId === book.resolutionBeatId) return;
    var weight = page.beatId === book.climaxBeatId ? 0.25 : 1;
    counts[page.locationId] = (counts[page.locationId] || 0) + weight;
  });
  return locations.slice().sort(function (a, b) {
    return (counts[b.locationId] || 0) - (counts[a.locationId] || 0);
  })[0];
}

function coverMomentText(heroNames, entityNames, place) {
  var who = heroNames.filter(Boolean).join(" and ") || "the main character";
  var withWhat = entityNames.length ? " with " + entityNames.join(" and ") : "";
  var where = place && place.name ? " in " + place.name : "";
  return "A cover pose: " + who + withWhat + where + ", one still instant that invites the story, before the ending.";
}

function planCover(bible, pages, options) {
  var book = bible || {};
  var list = pages || book.pages || [];
  var opts = options || {};
  var cast = BookCast.compileBookCast(book, list);
  var style = styleContract(book);
  var heroes = pickCoverHeroes(book, cast);
  var featured = pickFeaturedEntities(Object.assign({}, book, { pages: list }));
  var place = pickCoverLocation(book, list) || (book.locations || [])[0] || null;
  var heroMembers = heroes.map(function (id) {
    return (cast.byId && cast.byId[id]) || { characterId: id, name: id, referenceAssetIds: [] };
  });
  var entityNames = featured.map(function (id) {
    var entity = (book.entities || []).filter(function (item) { return item.entityId === id; })[0];
    return entity ? entity.name : id;
  });
  var references = [];
  var referenceAssets = [];
  heroMembers.forEach(function (member) {
    var version = Cast.resolveReference(member.characterId);
    var assetIds = (member.referenceAssetIds || []).slice();
    if (version && version.assetId && assetIds.indexOf(version.assetId) < 0) assetIds.unshift(version.assetId);
    assetIds.forEach(function (assetId) {
      if (references.indexOf(assetId) < 0) references.push(assetId);
      referenceAssets.push({
        characterId: member.characterId,
        assetId: assetId,
        file: version && version.assetId === assetId ? version.file : ""
      });
    });
  });
  var storyEntities = featured.map(function (id) {
    var entity = (book.entities || []).filter(function (item) { return item.entityId === id; })[0];
    var spec = (opts.storyEntities || []).filter(function (item) { return item.entityId === id; })[0] || {};
    return entity ? defineStoryEntity(entity, spec) : null;
  }).filter(Boolean);
  var beyond = null;
  featured.forEach(function (id) {
    var entity = (book.entities || []).filter(function (item) { return item.entityId === id; })[0];
    if (entity && place && entity.locationId && entity.locationId !== place.locationId) beyond = locationById(book, entity.locationId);
  });
  if (!beyond && place && place.connectedTo && place.connectedTo[0]) beyond = locationById(book, place.connectedTo[0]);
  var environment = place ? (place.name + ". " + (place.visualIdentity || "")) : "";
  if (beyond) environment += " Open toward " + beyond.name + " as depth behind the figures. " + (beyond.visualIdentity || "");
  var supporting = (cast.members || []).map(function (member) { return member.characterId; }).filter(function (id) {
    return heroes.indexOf(id) < 0;
  });
  return {
    pageId: "cover",
    coverId: "cover",
    bookId: opts.bookId || book.bookId || book.title || "",
    title: book.title || "",
    subtitle: book.subtitle || "",
    protagonists: heroes,
    heroCharacterIds: heroes.slice(),
    supportingCharacterIds: supporting,
    featuredEntityIds: featured,
    settingId: place ? place.locationId : "",
    locationId: place ? place.locationId : "",
    motif: book.motif || "",
    tone: book.tone || null,
    visualHook: book.hook || book.premise || "",
    emotionalPromise: (book.emotionalArc && book.emotionalArc[0]) || book.tone || "",
    coverMoment: coverMomentText(heroMembers.map(function (member) { return member.name; }), entityNames, place),
    composition: "Picture-book front cover. One clear silhouette and one focal group in the lower two-thirds. The upper area stays open for type. This is not an interior page.",
    shot: "cover",
    angle: "a gentle low angle, with open air above the figures",
    characterPlacement: "lower two-thirds, one pose each, clear of the title area",
    entityPlacement: featured.length ? "with the hero, small enough to read at once, not hidden by type" : "",
    environment: environment.trim(),
    lighting: styleFor(book.tone).mood,
    atmosphere: styleFor(book.tone).mood,
    titleSafeRegion: "upper",
    authorSafeRegion: "lower",
    logoSafeRegion: "lower-corner",
    spoilerConstraints: "Do not depict the resolution or the story already finished.",
    illustratorId: STYLE_ID,
    styleId: style.styleId,
    style: style,
    referenceAssetIds: references,
    referenceAssets: referenceAssets,
    storyEntities: storyEntities,
    sourceSpreadId: null,
    aliasesInterior: false
  };
}

function withoutOtherCharacters(text, cover) {
  var heroes = (cover && (cover.heroCharacterIds || cover.protagonists)) || [];
  var names = Cast.listCharacters().filter(function (character) {
    return heroes.indexOf(character.characterId) < 0 && character.name;
  }).map(function (character) { return character.name; });
  if (!names.length) return String(text || "");
  var pattern = new RegExp("\\b(" + names.join("|") + ")\\b", "i");
  return String(text || "").split(/(?<=[.!?])\s+/).filter(function (sentence) {
    return !pattern.test(sentence);
  }).join(" ");
}

function withoutExactTitle(text, title) {
  var raw = String(text || "");
  var name = String(title || "").trim();
  if (name.length > 3) raw = raw.split(name).join("");
  return raw;
}

function entityCoverLine(row) {
  var features = (row.distinctiveFeatures || []).filter(function (item) {
    return !/\b(face|eyes|mouth|smile|palm|finger)\b/i.test(String(item));
  });
  return [
    row.entityId + " keeps this look: " + (row.visualIdentity || ""),
    "Shape: " + (row.shape || "as described") + ".",
    "Light: " + (row.colourLight || "as described") + ".",
    "Features: " + (features.join(", ") || "the same simple form") + ".",
    row.face === "none" ? "It stays a simple object, not a living character." : "",
    "Draw it once, at the scale already established for this book."
  ].filter(Boolean).join(" ");
}

function coverPrompt(bible, cover, castMembers) {
  var plan = cover || {};
  var book = bible || {};
  var members = castMembers || [];
  var people = (plan.heroCharacterIds || plan.protagonists || []).map(function (id) {
    var member = members.filter(function (item) { return item.characterId === id; })[0];
    if (!member) return id;
    return BookCast.appearanceLine(member, {});
  }).join(" ");
  var things = (plan.storyEntities || []).map(entityCoverLine).join(" ");
  var text = [
    styleClause(plan.style || styleContract(book)),
    "One front cover for a children's picture book. Same illustrator as the interior. More iconic and more carefully framed than a story page. Do not switch rendering.",
    "Match each reference exactly. Do not redesign a character. Do not invent a cover version of anyone.",
    "No letters, no words, no numbers, no captions, no speech balloons, no signs, no logo, no watermark. Do not draw a title.",
    "Leave the " + (plan.titleSafeRegion || "upper") + " area as open sky, soft atmosphere, or calm distance, so type can sit there later. Do not draw a box. Keep the characters and important objects out of that area.",
    "Place: " + (plan.environment || plan.locationId || "") + ".",
    "Who, once each: " + (people || "the planned heroes") + ".",
    things ? "Featured story objects, same identity as the interior: " + things : "",
    "Draw only this cover instant: " + (plan.coverMoment || ""),
    "Composition: " + (plan.composition || ""),
    "Placement: " + (plan.characterPlacement || "") + ". " + (plan.entityPlacement || ""),
    "Shot: " + (plan.shot || "cover") + ". Angle: " + (plan.angle || "") + ".",
    "Light: " + (plan.lighting || "") + ".",
    plan.spoilerConstraints || "",
    "One pose only. No montage. No second copy of a character.",
    plan.anchorCount ? "Any extra picture is paint, colour, and finish reference from this same book. Do not copy its pose, framing, or scene." : ""
  ].filter(Boolean).join(" ");
  return withoutOtherCharacters(withoutExactTitle(text, plan.title), plan);
}

function coverRepairPrompt(bible, cover, castMembers) {
  return [
    coverPrompt(bible, cover, castMembers),
    "Revise this one cover. Keep the same cover instant.",
    "Each planned character once. Keep the locked identity and the reference assets " + ((cover && cover.referenceAssetIds) || []).join(", ") + ".",
    "Keep illustrator " + STYLE_ID + ". Do not switch rendering, line, texture, proportions, or finish."
  ].join(" ");
}

var COVER_TITLE_FAMILIES = ["single-line", "short-stack", "phrase-stack", "wide-two-line", "tall-three-line", "long-title"];
var COVER_CONNECTORS = { a: 1, an: 1, the: 1, for: 1, of: 1, to: 1, and: 1, in: 1, on: 1, with: 1, from: 1 };
var COVER_TITLE_FONT = "\"Fredoka\", \"Nunito\", sans-serif";

function titleTokens(title) {
  return String(title || "").trim().split(/\s+/).filter(Boolean).map(function (text) {
    var bare = text.toLowerCase().replace(/[^a-z']/g, "");
    return { text: text, connector: !!COVER_CONNECTORS[bare] };
  });
}

function titleUnits(tokens) {
  var units = [];
  var pending = [];
  tokens.forEach(function (token) {
    if (token.connector) pending.push(token);
    else {
      units.push(pending.concat([token]));
      pending = [];
    }
  });
  if (pending.length) {
    if (units.length) units[units.length - 1] = units[units.length - 1].concat(pending);
    else units.push(pending);
  }
  return units;
}

function phraseStack(tokens) {
  var content = [];
  tokens.forEach(function (token, index) {
    if (!token.connector) content.push(index);
  });
  if (content.length !== 2 || tokens.length > 8) return null;
  var middle = tokens.slice(content[0] + 1, content[1]);
  if (!middle.length || !middle.every(function (token) { return token.connector; })) return null;
  return [tokens.slice(0, content[0] + 1), middle, tokens.slice(content[1])];
}

function packUnits(units, lineCount) {
  var count = Math.max(1, Math.min(lineCount, units.length || 1));
  if (!units.length) return [];
  if (count >= units.length) return units.map(function (unit) { return unit.slice(); });
  var total = 0;
  units.forEach(function (unit) { total += unit.length; });
  var lines = [];
  var current = [];
  var filled = 0;
  var placed = 0;
  units.forEach(function (unit, index) {
    var remaining = units.length - index;
    var open = count - lines.length;
    if (current.length && lines.length < count - 1 && remaining <= open) {
      lines.push(current);
      current = [];
      filled = 0;
    } else if (current.length && lines.length < count - 1) {
      var room = count - lines.length;
      var target = Math.max(1, Math.round((total - placed) / room));
      if (filled >= target) {
        lines.push(current);
        current = [];
        filled = 0;
      }
    }
    current = current.concat(unit);
    filled += unit.length;
    placed += unit.length;
  });
  if (current.length) lines.push(current);
  while (lines.length > count) {
    var best = 0;
    var bestScore = Infinity;
    lines.forEach(function (line, index) {
      if (!lines[index + 1]) return;
      var score = line.length + lines[index + 1].length;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });
    lines.splice(best, 2, lines[best].concat(lines[best + 1]));
  }
  return lines;
}

function lineCountFor(family, units) {
  if (family === "single-line") return 1;
  if (family === "short-stack" || family === "wide-two-line") return 2;
  if (family === "phrase-stack" || family === "tall-three-line") return 3;
  return Math.min(4, Math.max(2, units.length));
}

function chooseTitleFamily(tokens, units, phrase) {
  if (phrase) return "phrase-stack";
  if (units.length <= 1 && tokens.length <= 4) return "single-line";
  if (units.length <= 2 && tokens.length <= 5) return "short-stack";
  if (tokens.length >= 10 || units.length >= 6) return "long-title";
  if (units.length >= 3 && tokens.length >= 7) return "tall-three-line";
  if (units.length >= 2) return "wide-two-line";
  return "single-line";
}

function titleContrast(cover) {
  var blob = [cover && cover.lighting, cover && cover.atmosphere, cover && cover.environment, cover && cover.tone].join(" ").toLowerCase();
  if (/night|evening|dusk|dark/.test(blob)) return "light";
  return "dark";
}

function titleBounds(cover) {
  var region = String((cover && cover.titleSafeRegion) || "upper");
  if (region.indexOf("lower") >= 0) return { region: region, top: "", bottom: "7%", maxHeight: "30%" };
  return { region: region || "upper", top: "8%", bottom: "", maxHeight: "30%" };
}

function coverTitleLayout(title, cover, options) {
  var tokens = titleTokens(title);
  var units = titleUnits(tokens);
  var phrase = phraseStack(tokens);
  var asked = options && COVER_TITLE_FAMILIES.indexOf(options.family) >= 0 ? options.family : "";
  var family = asked || chooseTitleFamily(tokens, units, phrase);
  var grouped = family === "phrase-stack" && phrase ? phrase : packUnits(units, lineCountFor(family, units));
  if (!grouped.length && tokens.length) grouped = [tokens];
  var rows = grouped.map(function (line) {
    return line.map(function (token) {
      return { text: token.text, role: token.connector ? "connector" : "primary" };
    });
  });
  var lines = rows.map(function (row) {
    return row.map(function (word) { return word.text; }).join(" ");
  });
  var treatment = options && options.treatment === "hierarchy" ? "hierarchy" : (options && options.treatment === "offset" ? "offset" : "restrained");
  return {
    title: tokens.map(function (token) { return token.text; }).join(" "),
    family: family,
    treatment: treatment,
    lines: lines,
    rows: rows,
    region: (cover && cover.titleSafeRegion) || "upper",
    bounds: titleBounds(cover),
    contrast: titleContrast(cover),
    fontFamily: COVER_TITLE_FONT,
    fontScale: family === "long-title" ? 0.74 : (lines.length >= 3 ? 0.84 : (lines.length === 2 ? 0.92 : 1)),
    minReadRem: 0.78,
    imprint: { text: "A Wondii Story", mark: "games/images/brand/wondi-wordmark.svg" },
    artwork: null,
    artworkUnchanged: true
  };
}

function escapeHtml(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function coverTitleMarkup(layout) {
  var rows = layout && layout.rows;
  if (!rows || !rows.length) {
    return (layout && layout.lines || []).map(function (line) {
      return "<span class=\"cover-line\">" + escapeHtml(line) + "</span>";
    }).join("");
  }
  return rows.map(function (row) {
    var words = row.map(function (word) {
      var role = word.role === "connector" ? "connector" : "primary";
      return "<span class=\"cover-word is-" + role + "\">" + escapeHtml(word.text) + "</span>";
    }).join(" ");
    return "<span class=\"cover-line\">" + words + "</span>";
  }).join("");
}

function coverFrameMarkup(layout, imagePath, imprintPath, thumb) {
  var box = (layout && layout.bounds) || { top: "8%", maxHeight: "30%" };
  var top = box.top ? "top:" + box.top + ";" : "";
  var bottom = box.bottom ? "bottom:" + box.bottom + ";" : "";
  var mark = imprintPath || (layout && layout.imprint && layout.imprint.mark) || "";
  var imprint = layout && layout.imprint ? layout.imprint.text : "";
  return [
    "<article class=\"cover" + (thumb ? " is-thumb" : "") + "\" data-family=\"" + escapeHtml(layout && layout.family || "") + "\" data-treatment=\"" + escapeHtml(layout && layout.treatment || "restrained") + "\" data-contrast=\"" + escapeHtml(layout && layout.contrast || "light") + "\" data-title-region=\"" + escapeHtml(layout && layout.region || "upper") + "\" style=\"--title-top:" + (box.top || "auto") + ";--title-bottom:" + (box.bottom || "auto") + ";--title-max:" + (box.maxHeight || "30%") + ";\">",
    "<img class=\"cover-art\" src=\"" + escapeHtml(imagePath || "") + "\" alt=\"\"/>",
    "<h1 class=\"cover-title\" style=\"" + top + bottom + "\">" + coverTitleMarkup(layout) + "</h1>",
    imprint ? "<p class=\"cover-imprint\">" + (mark ? "<img src=\"" + escapeHtml(mark) + "\" alt=\"\"/>" : "") + "<span>" + escapeHtml(imprint) + "</span></p>" : "",
    "</article>"
  ].join("");
}

function coverPreviewStyle() {
  return [
    "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;font-family:Nunito,system-ui,sans-serif;color:#24304a;}",
    ".cover{container-type:inline-size;position:relative;width:min(440px,92vw);aspect-ratio:1024/1536;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(20,27,77,.16);background:#1c2438;}",
    ".cover-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}",
    ".cover-title{position:absolute;left:13%;right:13%;z-index:1;max-height:var(--title-max,30%);margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:\"Fredoka\",\"Nunito\",sans-serif;font-weight:600;font-size:clamp(0.78rem,8.1cqi,2.65rem);line-height:.9;letter-spacing:.01em;}",
    ".cover-line{display:block;}",
    ".cover-word{display:inline-block;}",
    ".cover-word.is-connector{font-weight:500;font-size:.78em;letter-spacing:.045em;}",
    ".cover-word.is-primary{font-weight:600;}",
    ".cover[data-treatment=\"hierarchy\"] .cover-word.is-connector{font-size:.62em;font-weight:500;}",
    ".cover[data-treatment=\"hierarchy\"] .cover-word.is-primary{font-size:1.16em;}",
    ".cover[data-treatment=\"hierarchy\"] .cover-title{gap:.02em;}",
    ".cover[data-treatment=\"offset\"] .cover-line:nth-child(odd){transform:translateX(-.22em);}",
    ".cover[data-treatment=\"offset\"] .cover-line:nth-child(even){transform:translateX(.38em);}",
    ".cover[data-contrast=\"light\"] .cover-title{color:#fff8ee;text-shadow:0 1px 0 rgba(20,18,40,.16),0 8px 16px rgba(16,18,40,.28);}",
    ".cover[data-contrast=\"dark\"] .cover-title{color:#24304a;text-shadow:0 1px 0 rgba(255,252,246,.55);}",
    ".cover[data-family=\"phrase-stack\"] .cover-line:nth-child(2){margin:.02em 0 .06em;}",
    ".cover-imprint{position:absolute;left:0;right:0;bottom:3.2%;z-index:1;margin:0;display:flex;align-items:center;justify-content:center;gap:.4rem;pointer-events:none;}",
    ".cover-imprint img{height:clamp(10px,2.6cqi,16px);width:auto;}",
    ".cover-imprint span{font-family:\"Fredoka\",\"Nunito\",sans-serif;font-size:clamp(.48rem,2.15cqi,.68rem);font-weight:600;letter-spacing:.16em;text-transform:uppercase;}",
    ".cover[data-contrast=\"light\"] .cover-imprint span{color:#fff6ea;text-shadow:0 1px 2px rgba(20,18,40,.4);}",
    ".cover[data-contrast=\"dark\"] .cover-imprint span{color:#24304a;}",
    ".cover.is-thumb{width:132px;border-radius:8px;box-shadow:0 8px 16px rgba(20,27,77,.12);}",
    "@media (max-width:640px){.cover{width:min(340px,88vw);}}"
  ].join("");
}

function coverPreviewDocument(cover, layout, imagePath, imprintPath) {
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en-GB\"><head><meta charset=\"utf-8\"/>",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>",
    "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"/>",
    "<link href=\"https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@600&display=swap\" rel=\"stylesheet\"/>",
    "<title>Cover preview</title>",
    "<style>", coverPreviewStyle(), "</style></head><body>",
    coverFrameMarkup(layout, imagePath, imprintPath, false),
    "</body></html>"
  ].join("");
}

function coverReviewDocument(entries) {
  var frames = (entries || []).map(function (entry) {
    var full = coverFrameMarkup(entry.layout, entry.imagePath, entry.imprintPath, false);
    var thumb = coverFrameMarkup(entry.layout, entry.imagePath, entry.imprintPath, true);
    return "<section class=\"review-card\"><h2>" + escapeHtml(entry.label) + "</h2><p>" + escapeHtml(entry.note || "") + "</p>" + full + "<div class=\"review-thumb\"><p>Thumbnail</p>" + thumb + "</div></section>";
  }).join("");
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en-GB\"><head><meta charset=\"utf-8\"/>",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>",
    "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"/>",
    "<link href=\"https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@600&display=swap\" rel=\"stylesheet\"/>",
    "<title>Cover title review</title>",
    "<style>",
    coverPreviewStyle(),
    "body{display:block;padding:28px 20px 48px;}",
    "h1{font-family:\"Fredoka\",\"Nunito\",sans-serif;font-weight:600;font-size:1.6rem;margin:0 0 .3rem;}",
    ".review-lead{margin:0 0 1.4rem;max-width:40rem;}",
    ".review-row{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start;}",
    ".review-card{display:flex;flex-direction:column;gap:.4rem;width:min(440px,100%);}",
    ".review-card h2{font-family:\"Fredoka\",\"Nunito\",sans-serif;font-size:1.3rem;margin:0;}",
    ".review-card p{margin:0 0 .4rem;}",
    ".review-thumb{margin-top:.8rem;}",
    ".review-thumb p{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;}",
    "</style></head><body>",
    "<h1>Cover title direction</h1>",
    "<p class=\"review-lead\">The same approved painting. Three title layouts. Nothing here is chosen yet.</p>",
    "<div class=\"review-row\">" + frames + "</div>",
    "</body></html>"
  ].join("");
}

function acceptCover(vision, cover) {
  var plan = cover || {};
  var instances = {};
  (plan.heroCharacterIds || plan.protagonists || []).forEach(function (id) { instances[id] = 1; });
  var spread = {
    charactersPresent: plan.heroCharacterIds || plan.protagonists || [],
    characterInstances: instances,
    montage: false,
    entitySpecs: (plan.storyEntities || plan.featuredEntityIds || []).map(function (row) {
      var id = row.entityId || row;
      var entity = { entityId: id, name: id, identity: row.visualIdentity || "" };
      return entitySpec(entity, { visualFocus: plan.coverMoment || "" }, null);
    }),
    illustrationMoment: plan.coverMoment || "",
    storyEvent: plan.coverMoment || ""
  };
  var verdict = acceptIllustration(vision, spread);
  var problems = verdict.problems.slice();
  var report = vision || {};
  if (report.entityHasFace === true) problems.push("entity-face");
  if (report.spoilerShown === true) problems.push("spoiler");
  return { ok: problems.length === 0, problems: problems };
}

function coverQualityNotes(report) {
  var notes = [];
  if (report && report.qualityNotes) notes = notes.concat(report.qualityNotes);
  if (report && report.readsAsInteriorSpread === true) notes.push("Looks close to an interior spread.");
  return { notes: notes, regenerate: false };
}

function acceptIllustration(vision, spread) {
  var report = vision || {};
  var problems = [];
  if (spread.bookCast) {
    problems = problems.concat(BookCast.reviewSpread(spread.bookCast, spread, report).problems);
  } else {
    (spread.charactersPresent || []).forEach(function (id) {
      var row = (report.characters || []).filter(function (item) { return item.characterId === id; })[0];
      if (!row || row.identityMatch !== true) problems.push("identity:" + id);
      if (row && row.outfitMatch === false) problems.push("outfit:" + id);
      var expected = spread.characterInstances && spread.characterInstances[id];
      if (row && typeof row.count === "number" && expected === 1 && row.count !== 1) problems.push("count:" + id);
    });
  }
  if (report.style) readingDrift(report.style).forEach(function (problem) { problems.push(problem); });
  if (report.momentMatch === false) problems.push("moment");
  if (report.montageShown === true && !spread.montage) problems.push("montage");
  var requiredIds = (spread.mustShow && spread.mustShow.length) ? spread.mustShow : (spread.entitiesRequired || []);
  var specs = spread.entitySpecs || requiredIds.map(function (id) {
    return { entityId: id, aliases: aliasesFor({ entityId: id, name: id, identity: "" }), scale: "ordinary", landmark: false };
  });
  judgeSightings(specs, report).forEach(function (row) {
    if (row.redraw) problems.push("entity:" + row.entityId);
  });
  if (report.locationMatch === false) problems.push("location");
  if (report.prematureResult === true) problems.push("premature");
  if (report.textDetected === true) problems.push("text-in-image");
  if (report.anatomyOk === false) problems.push("anatomy");
  if (report.textSafeUsable === false) problems.push("text-safe");
  if (report.duplicateCharacter === true && !spread.montage && !spread.bookCast) problems.push("duplicate");
  return { ok: problems.length === 0, problems: problems };
}

function characterConsistencyCheckpoint(pages, options) {
  var settings = options || {};
  var problems = [];
  (pages || []).forEach(function (page, index) {
    var number = page && page.page ? page.page : index + 1;
    if (!page || !page.characters) {
      problems.push("unchecked:p" + number);
      return;
    }
    page.characters.forEach(function (character) {
      var id = character && character.characterId || "unknown";
      if (!character || character.identityMatch !== true) problems.push("identity:" + id + ":p" + number);
      if (character && character.outfitMatch === false) problems.push("outfit:" + id + ":p" + number);
    });
  });
  var human = settings.humanApproved === true && problems.length === 0;
  return {
    approved: human,
    needsHumanReview: !human,
    problems: problems,
    referenceIsNotProof: true,
    note: "Supplying a character reference, or matching it on one page, does not prove that character stays the same across the book."
  };
}

module.exports = {
  STYLE_ID: STYLE_ID,
  LAYOUTS: LAYOUTS,
  MAX_VISUAL_REPAIRS: MAX_VISUAL_REPAIRS,
  styleFor: styleFor,
  styleContract: styleContract,
  spreadStyle: spreadStyle,
  styleClause: styleClause,
  styleOverrides: styleOverrides,
  styleCoherence: styleCoherence,
  sameIllustrator: sameIllustrator,
  atmosphereDelta: atmosphereDelta,
  repairPrompt: repairPrompt,
  layoutFor: layoutFor,
  unplannedVisualProblems: unplannedVisualProblems,
  visualBookBible: visualBookBible,
  pageVisualContract: pageVisualContract,
  contractsFor: contractsFor,
  planVisuals: planVisuals,
  proofSpreads: proofSpreads,
  regenContract: regenContract,
  mustShow: mustShow,
  aliasesFor: aliasesFor,
  entitySpec: entitySpec,
  judgeSightings: judgeSightings,
  illustrationMoment: illustrationMoment,
  momentProblems: momentProblems,
  wornOutfit: wornOutfit,
  defineStoryEntity: defineStoryEntity,
  bookCast: BookCast,
  sheetPrompt: sheetPrompt,
  spreadPrompt: spreadPrompt,
  acceptIllustration: acceptIllustration,
  characterConsistencyCheckpoint: characterConsistencyCheckpoint,
  planCover: planCover,
  coverPrompt: coverPrompt,
  coverRepairPrompt: coverRepairPrompt,
  COVER_TITLE_FAMILIES: COVER_TITLE_FAMILIES,
  coverTitleLayout: coverTitleLayout,
  coverPreviewStyle: coverPreviewStyle,
  coverFrameMarkup: coverFrameMarkup,
  coverPreviewDocument: coverPreviewDocument,
  coverReviewDocument: coverReviewDocument,
  acceptCover: acceptCover,
  coverQualityNotes: coverQualityNotes
};
