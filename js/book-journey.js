/* Whole-book visual journey. Looks at structured story state, not prose wording.
   Identity stays continuous. The world is allowed to move. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookJourney = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var IMPORTANCE = ["quiet", "normal", "strong", "hero"];
  var PAGE_ROLES = {
    LEFT_PAGE: "left-page",
    RIGHT_PAGE: "right-page",
    DOUBLE_PAGE_SPREAD: "double-page-spread"
  };
  var PAGE_KINDS = {
    COVER: "cover",
    SINGLE_PAGE: "single-page",
    PAGE_PAIR: "page-pair",
    DOUBLE_PAGE_SPREAD: "double-page-spread"
  };
  var DELTA_KEYS = [
    "locationChanged", "subLocationChanged", "scaleChanged", "worldStateChanged",
    "objectStateChanged", "characterStateChanged", "castChanged", "lightingChanged",
    "timeChanged", "emotionalStateChanged", "actionChanged", "compositionChanged", "revealChanged"
  ];
  var REPEAT_RUN = 4;
  var IN_PLACE = { establish: 1, discover: 1, dwell: 1, trouble: 1 };
  var GENTLE_TONES = { bedtime: 1 };

  var ACTION_FAMILY = {
    hook: "establish", world: "establish",
    discovery: "discover",
    reaction: "dwell", goal: "dwell", exploration: "dwell", attempt: "dwell",
    relationship: "dwell", breath: "dwell", wonder: "dwell", humour: "dwell", anticipation: "dwell",
    complication: "trouble", setback: "trouble", consequence: "trouble",
    reveal: "turn", setup: "turn", payoff: "turn", turn: "turn",
    approach: "move",
    climax: "peak",
    resolution: "settle"
  };

  var IMPORTANCE_FOR = {
    establish: "quiet", discover: "normal", dwell: "normal", trouble: "strong",
    turn: "strong", move: "strong", peak: "hero", settle: "quiet"
  };

  var ROLE_IMPORTANCE = {
    hook: "quiet", world: "quiet", breath: "quiet", reaction: "quiet", wonder: "quiet",
    humour: "quiet", anticipation: "quiet", resolution: "quiet",
    discovery: "normal", attempt: "normal", exploration: "normal", goal: "normal",
    relationship: "normal", setup: "normal",
    complication: "strong", setback: "strong", reveal: "strong", consequence: "strong",
    approach: "strong", turn: "strong", payoff: "strong",
    climax: "hero"
  };

  var SCALE = {
    establishing: "wide", high: "wide", overhead: "wide", reveal: "wide",
    medium: "medium", action: "medium", reaction: "medium", low: "medium",
    close: "close", vignette: "close"
  };

  var REGISTER_WORDS = {
    high: ["release", "joy", "cheer", "thrill", "panic", "brave", "proud", "excited", "wild"],
    uneasy: ["worry", "worried", "afraid", "scared", "nervous", "stuck", "angry", "fear"],
    calm: ["quiet", "calm", "tender", "gentle", "still", "soft", "steady", "trust", "waiting", "wait", "hesitation", "concern", "interest", "recognition", "bedtime", "glad", "hopeful", "curious", "surprised", "kind"]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function tokens(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  }

  function sorted(list) {
    return (list || []).map(String).slice().sort();
  }

  function sameList(left, right) {
    return sorted(left).join("|") === sorted(right).join("|");
  }

  function familyOf(role) {
    return ACTION_FAMILY[role] || "dwell";
  }

  function registerOf(emotion) {
    var text = String(emotion || "").toLowerCase();
    if (!text) return "unspecified";
    var found = "";
    Object.keys(REGISTER_WORDS).forEach(function (id) {
      if (found) return;
      if (REGISTER_WORDS[id].some(function (word) { return text.indexOf(word) >= 0; })) found = id;
    });
    return found || text;
  }

  function scaleOf(shot) {
    return SCALE[shot] || "medium";
  }

  function entityList(snap) {
    return (snap && snap.entities) || [];
  }

  function placeIdentity(place) {
    return tokens(place && place.visualIdentity).concat(tokens(place && place.name));
  }

  function namedIn(entity, identity) {
    var names = tokens(entity && entity.name).concat(String(entity && entity.entityId || "").split(/[-_]/));
    return names.some(function (word) { return word.length > 3 && identity.indexOf(word) >= 0; });
  }

  function landmarkIds(bible, locationId) {
    var places = (bible && bible.locations) || [];
    var here = places.filter(function (item) { return item.locationId === locationId; })[0];
    var hereWords = placeIdentity(here);
    return ((bible && bible.entities) || []).filter(function (entity) {
      if (namedIn(entity, hereWords)) return true;
      if (entity.landmark === true && (!entity.locationId || entity.locationId === locationId)) return true;
      if (!entity.locationId || entity.locationId === locationId) return false;
      var home = places.filter(function (item) { return item.locationId === entity.locationId; })[0];
      return entity.landmark === true || namedIn(entity, placeIdentity(home));
    }).map(function (entity) { return entity.entityId; });
  }

  function storyObjectIds(bible, locationId, entities) {
    var marks = landmarkIds(bible, locationId);
    return sorted((entities || []).map(function (entity) {
      return entity.entityId;
    }).filter(function (id) { return marks.indexOf(id) < 0; }));
  }

  function objectStateMap(bible, locationId, entities) {
    var marks = landmarkIds(bible, locationId);
    var map = {};
    (entities || []).forEach(function (entity) {
      if (!entity || !entity.entityId || marks.indexOf(entity.entityId) >= 0) return;
      map[entity.entityId] = String(entity.state || "");
    });
    return map;
  }

  function characterStateMap(characters) {
    var map = {};
    (characters || []).forEach(function (row) {
      if (!row || !row.characterId) return;
      map[row.characterId] = {
        locationId: row.locationId || "",
        emotion: row.emotion || "",
        clothing: row.clothing || "",
        carried: sorted(row.carriedEntities || []).join(",")
      };
    });
    return map;
  }

  function beatFor(bible, page) {
    var beats = (bible && bible.beats) || [];
    if (page && page.role && page.beatId) return page;
    return beats.filter(function (beat) {
      return page && beat.beatId === page.beatId;
    })[0] || page || {};
  }

  function snapshot(bible, page, index) {
    var beat = beatFor(bible, page);
    var after = page.stateAfter || beat.stateAfter || {};
    var before = page.stateBefore || beat.stateBefore || {};
    var locationId = page.locationId || beat.locationId || "";
    var beforeObjects = storyObjectIds(bible, locationId, entityList(before));
    var afterObjects = storyObjectIds(bible, locationId, entityList(after));
    var revealed = afterObjects.filter(function (id) { return beforeObjects.indexOf(id) < 0; });
    var role = beat.role || page.role || "";
    var family = familyOf(role);
    return {
      index: index,
      spreadId: page.pageId || page.spreadId || beat.beatId || ("s" + (index + 1)),
      beatId: beat.beatId || page.beatId || "",
      role: role,
      actionFamily: family,
      inPlace: !!IN_PLACE[family],
      locationId: locationId,
      subLocationId: page.subLocationId || page.areaId || beat.subLocationId || beat.areaId || "",
      cast: sorted(page.charactersPresent || beat.charactersPresent || []),
      storyObjects: afterObjects,
      revealed: revealed,
      emotion: page.emotion || beat.emotion || "",
      register: registerOf(page.emotion || beat.emotion || ""),
      shotType: page.shotType || beat.shotType || "",
      scale: scaleOf(page.shotType || beat.shotType || ""),
      layout: page.textSafeRegion || beat.textSafeRegion || "",
      lighting: page.lighting || beat.lighting || "",
      timeOfDay: page.timeOfDay || beat.timeOfDay || "",
      worldState: page.worldState || beat.worldState || "",
      objectState: objectStateMap(bible, locationId, entityList(after)),
      characterState: characterStateMap(after.characters || []),
      requestedImportance: page.visualImportance || beat.visualImportance || ""
    };
  }

  function json(value) {
    return JSON.stringify(value || {});
  }

  function visualDelta(previous, next) {
    var delta = {
      locationChanged: previous.locationId !== next.locationId,
      subLocationChanged: previous.subLocationId !== next.subLocationId,
      scaleChanged: previous.scale !== next.scale,
      worldStateChanged: previous.worldState !== next.worldState,
      objectStateChanged: json(previous.objectState) !== json(next.objectState),
      characterStateChanged: json(previous.characterState) !== json(next.characterState),
      castChanged: previous.cast.join("|") !== next.cast.join("|"),
      lightingChanged: previous.lighting !== next.lighting,
      timeChanged: previous.timeOfDay !== next.timeOfDay,
      emotionalStateChanged: previous.emotion !== next.emotion,
      actionChanged: previous.actionFamily !== next.actionFamily,
      compositionChanged: previous.layout !== next.layout,
      revealChanged: next.revealed.length > 0
    };
    return delta;
  }

  function framingOnly(delta) {
    var meaningful = DELTA_KEYS.some(function (key) {
      if (key === "scaleChanged" || key === "compositionChanged") return false;
      return !!delta[key];
    });
    return !meaningful && (delta.scaleChanged || delta.compositionChanged);
  }

  function storyProgressed(delta) {
    return DELTA_KEYS.some(function (key) {
      if (key === "scaleChanged" || key === "compositionChanged") return false;
      return !!delta[key];
    });
  }

  function changedKeys(delta) {
    return DELTA_KEYS.filter(function (key) { return !!delta[key]; });
  }

  function sceneKey(snap) {
    return [
      snap.locationId,
      snap.subLocationId,
      snap.cast.join(","),
      snap.storyObjects.join(","),
      snap.inPlace ? "in-place" : snap.actionFamily,
      snap.register
    ].join("|");
  }

  function consequenceVisible(delta) {
    return !!(delta.locationChanged || delta.subLocationChanged || delta.worldStateChanged || delta.objectStateChanged || delta.revealChanged || delta.castChanged);
  }

  function recognisable(previous, next, delta) {
    if (!previous) return true;
    if (delta.locationChanged || delta.subLocationChanged || delta.castChanged || delta.revealChanged || delta.worldStateChanged) return true;
    if (!next.inPlace) return true;
    return false;
  }

  function newStoryInformation(previous, next, delta) {
    if (!previous) return ["opening"];
    var notes = [];
    if (delta.revealChanged) notes.push("new-object:" + next.revealed.join(","));
    if (delta.actionChanged) notes.push("action:" + next.actionFamily);
    if (delta.castChanged) notes.push("cast");
    if (delta.locationChanged) notes.push("place");
    if (delta.subLocationChanged) notes.push("sub-place");
    if (delta.emotionalStateChanged) notes.push("feeling:" + next.register);
    if (delta.worldStateChanged) notes.push("world");
    if (!notes.length && delta.objectStateChanged) notes.push("object-state");
    if (!notes.length && delta.characterStateChanged) notes.push("character-state");
    if (!notes.length) notes.push("none");
    return notes;
  }

  function newVisualInformation(delta) {
    var notes = [];
    if (delta.locationChanged || delta.subLocationChanged) notes.push("place");
    if (delta.lightingChanged) notes.push("light");
    if (delta.timeChanged) notes.push("time");
    if (delta.worldStateChanged) notes.push("world");
    if (delta.objectStateChanged) notes.push("object");
    if (delta.scaleChanged) notes.push("scale");
    if (delta.compositionChanged) notes.push("framing");
    if (!notes.length) notes.push("none");
    if (notes.length && notes.every(function (note) { return note === "scale" || note === "framing"; })) return ["framing-only"];
    return notes;
  }

  function importanceFor(snap, climaxId) {
    var asked = IMPORTANCE.indexOf(snap.requestedImportance) >= 0 ? snap.requestedImportance : "";
    if (asked) return asked;
    if (snap.beatId && snap.beatId === climaxId) return "hero";
    if (ROLE_IMPORTANCE[snap.role]) return ROLE_IMPORTANCE[snap.role];
    return IMPORTANCE_FOR[snap.actionFamily] || "normal";
  }

  function settleHeroes(snaps, climaxId) {
    var problems = [];
    var importance = snaps.map(function (snap) { return importanceFor(snap, climaxId); });
    var heroes = [];
    importance.forEach(function (level, index) {
      if (level === "hero") heroes.push(index);
    });
    if (heroes.length > 1) {
      var keep = heroes.filter(function (index) {
        return snaps[index].beatId === climaxId || snaps[index].role === "climax";
      })[0];
      if (keep === undefined) keep = heroes[heroes.length - 1];
      heroes.forEach(function (index) {
        if (index !== keep) importance[index] = "strong";
      });
      problems.push("hero-repeat");
    }
    return { importance: importance, problems: problems };
  }

  function recommendTextRegion(pageRole, requested) {
    var region = String(requested || "");
    if (pageRole === PAGE_ROLES.LEFT_PAGE) {
      if (region.indexOf("left") >= 0 && region.indexOf("center") < 0) return region;
      return region.indexOf("lower") >= 0 ? "lower-left" : "upper-left";
    }
    if (pageRole === PAGE_ROLES.RIGHT_PAGE) {
      if (region.indexOf("right") >= 0 && region.indexOf("center") < 0) return region;
      return region.indexOf("lower") >= 0 ? "lower-right" : "upper-right";
    }
    if (pageRole === PAGE_ROLES.DOUBLE_PAGE_SPREAD) {
      if ((region.indexOf("left") >= 0 || region.indexOf("right") >= 0) && region.indexOf("center") < 0) return region;
      return "upper-left";
    }
    return region || "upper-left";
  }

  function gutterSafe(pageRole, region) {
    var side = String(region || "");
    if (side.indexOf("center") >= 0) return false;
    if (pageRole === PAGE_ROLES.LEFT_PAGE) return side.indexOf("left") >= 0;
    if (pageRole === PAGE_ROLES.RIGHT_PAGE) return side.indexOf("right") >= 0;
    if (pageRole === PAGE_ROLES.DOUBLE_PAGE_SPREAD) return side.indexOf("left") >= 0 || side.indexOf("right") >= 0;
    return true;
  }

  function assignRoles(snaps, importance) {
    var plan = snaps.map(function () { return { role: "", kind: "" }; });
    var pending = -1;
    snaps.forEach(function (snap, index) {
      if (importance[index] === "hero") {
        if (pending >= 0) {
          plan[pending].role = PAGE_ROLES.RIGHT_PAGE;
          plan[pending].kind = PAGE_KINDS.SINGLE_PAGE;
          pending = -1;
        }
        plan[index].role = PAGE_ROLES.DOUBLE_PAGE_SPREAD;
        plan[index].kind = PAGE_KINDS.DOUBLE_PAGE_SPREAD;
        return;
      }
      if (pending < 0) {
        plan[index].role = PAGE_ROLES.LEFT_PAGE;
        plan[index].kind = PAGE_KINDS.PAGE_PAIR;
        pending = index;
        return;
      }
      plan[index].role = PAGE_ROLES.RIGHT_PAGE;
      plan[index].kind = PAGE_KINDS.PAGE_PAIR;
      pending = -1;
    });
    if (pending >= 0) {
      plan[pending].role = PAGE_ROLES.RIGHT_PAGE;
      plan[pending].kind = PAGE_KINDS.SINGLE_PAGE;
    }
    return plan;
  }

  function phaseId(family, gentle, role) {
    if (family === "establish") return "opening";
    if (family === "discover") return "discovery";
    if (family === "dwell") return "development";
    if (family === "settle") return "resolution";
    if (family === "peak" || role === "climax") return "climax";
    return gentle ? "turn" : "escalation";
  }

  var PHASE_INTENT = {
    opening: "Ordinary world, establishing.",
    discovery: "Something in the world changes.",
    development: "Action, feeling, or object state develops.",
    escalation: "The difference, movement, or consequence grows.",
    turn: "A clearer change, kept at the story's own volume.",
    climax: "The strongest visual event.",
    resolution: "A new calm, or a world that has changed."
  };

  function buildArc(snaps, tone) {
    var gentle = !!GENTLE_TONES[tone];
    var order = gentle
      ? ["opening", "discovery", "development", "turn", "climax", "resolution"]
      : ["opening", "discovery", "development", "escalation", "climax", "resolution"];
    var groups = {};
    snaps.forEach(function (snap) {
      var id = phaseId(snap.actionFamily, gentle, snap.role);
      if (!groups[id]) groups[id] = [];
      groups[id].push(snap.spreadId);
    });
    return {
      intensity: gentle ? "gentle" : "full",
      tone: tone || "",
      phases: order.filter(function (id) { return groups[id] && groups[id].length; }).map(function (id) {
        return {
          id: id,
          intent: id === "climax" && gentle ? "The strongest gentle change." : PHASE_INTENT[id],
          spreadIds: groups[id]
        };
      })
    };
  }

  function placeOf(bible, locationId) {
    return ((bible && bible.locations) || []).filter(function (place) {
      return place.locationId === locationId;
    })[0] || null;
  }

  function sharedLandmarks(bible, fromId, toId) {
    var fromMarks = landmarkIds(bible, fromId);
    var toMarks = landmarkIds(bible, toId);
    var shared = fromMarks.filter(function (id) { return toMarks.indexOf(id) >= 0; });
    var destination = placeOf(bible, toId);
    var identity = tokens(destination && destination.visualIdentity);
    fromMarks.forEach(function (id) {
      if (shared.indexOf(id) >= 0) return;
      var entity = ((bible && bible.entities) || []).filter(function (item) { return item.entityId === id; })[0];
      var names = tokens(entity && entity.name).concat(String(id).split(/[-_]/));
      if (names.some(function (word) { return word.length > 3 && identity.indexOf(word) >= 0; })) shared.push(id);
    });
    return shared;
  }

  function worldIdentity(bible, previous, next) {
    if (!previous || previous.locationId === next.locationId) {
      return { samePlace: true, identityHeld: true, linked: true, sharedLandmarks: landmarkIds(bible, next.locationId) };
    }
    var from = placeOf(bible, previous.locationId);
    var to = placeOf(bible, next.locationId);
    var linked = !!(from && to && (from.connectedTo || []).indexOf(next.locationId) >= 0);
    return {
      samePlace: false,
      identityHeld: linked,
      linked: linked,
      sharedLandmarks: sharedLandmarks(bible, previous.locationId, next.locationId)
    };
  }

  function repetitionRuns(snaps) {
    var runs = [];
    var current = [];
    function close() {
      if (current.length >= REPEAT_RUN) {
        var first = snaps[current[0]];
        var last = snaps[current[current.length - 1]];
        runs.push({
          spreadIds: current.map(function (index) { return snaps[index].spreadId; }),
          from: first.spreadId,
          to: last.spreadId,
          length: current.length,
          locationId: first.locationId,
          subLocationId: first.subLocationId,
          cast: first.cast.slice(),
          storyObjects: first.storyObjects.slice(),
          action: "in-place",
          emotionalRegister: first.register,
          reasons: [
            "same-location",
            "same-cast",
            "same-story-objects",
            "in-place-action",
            "same-emotional-register"
          ]
        });
      }
      current = [];
    }
    snaps.forEach(function (snap, index) {
      if (!current.length) {
        current = [index];
        return;
      }
      var previous = snaps[current[current.length - 1]];
      if (snap.inPlace && previous.inPlace && sceneKey(snap) === sceneKey(previous)) current.push(index);
      else {
        close();
        current = [index];
      }
    });
    close();
    return runs;
  }

  function listSpreads(input) {
    var bible = (input && input.bible) || input || {};
    var pages = (input && input.pages) || bible.pages || [];
    if (pages.length) {
      return pages.map(function (page, index) {
        return snapshot(bible, page, index);
      });
    }
    return (bible.beats || input.beats || []).map(function (beat, index) {
      return snapshot(bible, beat, index);
    });
  }

  function analyse(input) {
    var bible = (input && input.bible) || {};
    var tone = (input && input.tone) || bible.tone || "";
    var snaps = listSpreads(input && input.bible ? input : { bible: bible, pages: input && input.pages, beats: input && input.beats });
    if (input && input.beats && !(input.pages && input.pages.length) && !input.bible) {
      snaps = input.beats.map(function (beat, index) { return snapshot({}, beat, index); });
    }
    var climaxId = bible.climaxBeatId || "";
    if (!climaxId) {
      var climax = snaps.filter(function (snap) { return snap.role === "climax"; })[0];
      climaxId = climax ? climax.beatId : "";
    }
    var heroes = settleHeroes(snaps, climaxId);
    var roles = assignRoles(snaps, heroes.importance);
    var problems = heroes.problems.slice();
    var deltas = [];
    var diagnostics = snaps.map(function (snap, index) {
      var previous = index ? snaps[index - 1] : null;
      if (previous) {
        snap.revealed = snap.storyObjects.filter(function (id) {
          return previous.storyObjects.indexOf(id) < 0;
        });
      }
      var delta = previous ? visualDelta(previous, snap) : null;
      var progressed = delta ? storyProgressed(delta) : true;
      var cameraOnly = delta ? framingOnly(delta) : false;
      if (delta && !progressed) problems.push("spread-unearned:" + snap.spreadId);
      if (delta) deltas.push({ from: previous.spreadId, to: snap.spreadId, visualDelta: delta, storyProgressed: progressed, cameraOnly: cameraOnly, worldIdentity: worldIdentity(bible, previous, snap) });
      if (delta && previous.locationId !== snap.locationId && !worldIdentity(bible, previous, snap).identityHeld) {
        problems.push("world-break:" + snap.spreadId);
      }
      var region = recommendTextRegion(roles[index].role, snap.layout);
      return {
        spreadId: snap.spreadId,
        beatId: snap.beatId,
        role: snap.role,
        actionFamily: snap.actionFamily,
        phase: phaseId(snap.actionFamily, !!GENTLE_TONES[tone], snap.role),
        locationId: snap.locationId,
        subLocationId: snap.subLocationId,
        cast: snap.cast,
        storyObjects: snap.storyObjects,
        emotionalRegister: snap.register,
        visualImportance: heroes.importance[index],
        pageRole: roles[index].role,
        pageKind: roles[index].kind,
        plannedTextRegion: region,
        gutterSafe: gutterSafe(roles[index].role, region),
        changedSincePrevious: delta ? changedKeys(delta) : [],
        newStoryInformation: newStoryInformation(previous, snap, delta || {}),
        newVisualInformation: delta ? newVisualInformation(delta) : ["opening"],
        consequenceVisible: delta ? consequenceVisible(delta) : false,
        recognisableWithoutText: recognisable(previous, snap, delta || {}),
        storyProgressed: progressed,
        cameraOnly: cameraOnly
      };
    });
    var repetition = repetitionRuns(snaps);
    repetition.forEach(function (run) {
      problems.push("visual-repetition:" + run.from);
    });
    var arc = buildArc(snaps, tone);
    var progressed = diagnostics.some(function (row, index) { return index > 0 && row.storyProgressed; });
    if (snaps.length > 1 && !progressed) problems.push("no-visual-progression");
    return {
      visualArc: arc,
      spreads: diagnostics,
      deltas: deltas,
      repetition: repetition,
      problems: problems.filter(function (problem, index) { return problems.indexOf(problem) === index; }),
      summary: {
        intensity: arc.intensity,
        repetitionRuns: repetition.length,
        heroCount: heroes.importance.filter(function (level) { return level === "hero"; }).length
      }
    };
  }

  function depthProblems(beats) {
    var review = analyse({ beats: beats || [] });
    return review.problems.filter(function (problem) {
      return problem.indexOf("visual-repetition:") === 0 || problem.indexOf("spread-unearned:") === 0;
    });
  }

  return {
    IMPORTANCE: IMPORTANCE,
    PAGE_ROLES: PAGE_ROLES,
    PAGE_KINDS: PAGE_KINDS,
    DELTA_KEYS: DELTA_KEYS,
    REPEAT_RUN: REPEAT_RUN,
    analyse: analyse,
    visualDelta: visualDelta,
    storyProgressed: storyProgressed,
    depthProblems: depthProblems,
    recommendTextRegion: recommendTextRegion,
    gutterSafe: gutterSafe,
    registerOf: registerOf,
    familyOf: familyOf
  };
});
