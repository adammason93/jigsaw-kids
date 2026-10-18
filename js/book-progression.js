/* Story progression. Measures whether the story state changes.
   A new camera angle is not a new beat. One place can still hold a whole book. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookProgression = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PHASES = ["SETUP", "DISCOVERY", "COMMITMENT", "ATTEMPT", "ESCALATION", "SETBACK", "REVELATION", "CLIMAX", "RESOLUTION", "AFTERMATH"];
  var DIMENSIONS = ["LOCATION", "GOAL", "OBSTACLE", "ACTION", "CONSEQUENCE", "DISCOVERY", "EMOTION", "WORLD_STATE", "ENTITY_STATE", "RELATIONSHIP", "STAKES", "INFORMATION"];
  var TURN_INTENTS = ["CONTINUE", "ANTICIPATE", "SURPRISE", "REVEAL", "PAUSE", "RESOLVE"];
  var LAYOUTS = ["SINGLE_PAGE_SCENE", "PAGE_PAIR", "DOUBLE_PAGE_SPREAD", "QUIET_PAGE", "REVEAL_TURN"];
  var STATIC_RUN = 4;
  var QUIET_ROLES = { reaction: 1, breath: 1, wonder: 1, humour: 1, anticipation: 1 };

  var PHASE_FOR = {
    hook: "SETUP", world: "SETUP",
    discovery: "DISCOVERY", setup: "DISCOVERY",
    goal: "COMMITMENT", relationship: "COMMITMENT",
    attempt: "ATTEMPT", exploration: "ATTEMPT",
    complication: "ESCALATION", approach: "ESCALATION", consequence: "ESCALATION",
    setback: "SETBACK",
    reveal: "REVELATION", turn: "REVELATION", payoff: "REVELATION",
    climax: "CLIMAX",
    resolution: "RESOLUTION"
  };

  var ACTION_CLASS = {
    hook: "setup", world: "setup",
    discovery: "discover", setup: "discover",
    goal: "connect", relationship: "connect",
    reaction: "dwell", breath: "dwell", wonder: "dwell", humour: "dwell", anticipation: "dwell", exploration: "dwell",
    attempt: "try",
    complication: "pressure", setback: "pressure",
    consequence: "result", reveal: "result", payoff: "result", turn: "result",
    approach: "move",
    climax: "peak",
    resolution: "close"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value || "");
  }

  function sorted(list) {
    return (list || []).map(String).slice().sort();
  }

  function entitiesOf(row) {
    if (row.stateAfter && row.stateAfter.entities) return row.stateAfter.entities;
    if (row.entities) return row.entities;
    return [];
  }

  function castOf(row) {
    return sorted(row.charactersPresent || []);
  }

  function sceneryIds(bible, locationId) {
    var marks = {};
    ((bible && bible.entities) || []).forEach(function (entity) {
      if (!entity || !(entity.landmark === true || entity.kind === "landmark")) return;
      if (!entity.locationId || entity.locationId === locationId) marks[entity.entityId] = 1;
    });
    var place = placeOf(bible, locationId);
    ((place && (place.persistentObjects || place.landmarkIds)) || []).forEach(function (id) { marks[id] = 1; });
    return marks;
  }

  function structuralEntities(bible, row) {
    var marks = sceneryIds(bible, row.locationId);
    return entitiesOf(row).filter(function (entity) {
      return entity && entity.entityId && !marks[entity.entityId];
    }).map(function (entity) {
      return {
        id: entity.entityId,
        owner: entity.ownerCharacterId || "",
        at: entity.locationId || row.locationId || ""
      };
    }).sort(function (left, right) { return left.id < right.id ? -1 : left.id > right.id ? 1 : 0; });
  }

  function entitySignature(rows) {
    return rows.map(function (entity) { return entity.id + "@" + entity.owner + "@" + entity.at; }).join(",");
  }

  function worldSignature(row) {
    return [row.worldState, row.environmentalState, row.weather, row.timeOfDay].map(text).filter(Boolean).join("/");
  }

  function zoneOf(row) {
    return text(row.locationZone || row.subLocationId || row.areaId);
  }

  function situationKey(row, entities) {
    return [
      text(row.locationId),
      zoneOf(row),
      entitySignature(entities),
      worldSignature(row),
      text(row.goalNow),
      text(row.obstacleNow)
    ].join("|");
  }

  function actionClass(role) {
    return ACTION_CLASS[role] || "dwell";
  }

  function phaseOf(role, previousPhase, index, climaxAt) {
    if (QUIET_ROLES[role]) {
      if (climaxAt >= 0 && index > climaxAt) return "AFTERMATH";
      return previousPhase || "SETUP";
    }
    if (role === "resolution") return "RESOLUTION";
    if (climaxAt >= 0 && index > climaxAt) return "AFTERMATH";
    return PHASE_FOR[role] || previousPhase || "SETUP";
  }

  function placeOf(bible, locationId) {
    return ((bible && bible.locations) || []).filter(function (place) {
      return place.locationId === locationId;
    })[0] || null;
  }

  function linked(bible, fromId, toId) {
    if (!fromId || !toId || fromId === toId) return true;
    var from = placeOf(bible, fromId);
    var to = placeOf(bible, toId);
    if (!from && !to) return true;
    var fromLinks = from && Array.isArray(from.connectedTo);
    var toLinks = to && Array.isArray(to.connectedTo);
    if (!fromLinks && !toLinks) return true;
    if (fromLinks && from.connectedTo.indexOf(toId) >= 0) return true;
    if (toLinks && to.connectedTo.indexOf(fromId) >= 0) return true;
    return false;
  }

  function normalise(input) {
    var bible = (input && input.bible) || {};
    var pages = (input && input.pages) || bible.pages || [];
    var beats = (input && input.beats) || bible.beats || [];
    var source = pages.length ? pages : beats;
    return {
      bible: bible,
      rows: source.map(function (item, index) {
        var beat = {};
        if (pages.length) {
          beat = beats.filter(function (candidate) {
            return candidate.beatId && candidate.beatId === item.beatId;
          })[0] || {};
        }
        var row = {};
        Object.keys(beat).forEach(function (key) { row[key] = beat[key]; });
        Object.keys(item).forEach(function (key) { row[key] = item[key]; });
        row.beatId = item.beatId || beat.beatId || ("b" + (index + 1));
        row.spreadId = item.pageId || item.spreadId || beat.spreadId || ("p" + (index + 1));
        row.erasesLocation = !!(beat.locationId && item.locationId && beat.locationId !== item.locationId);
        row.role = item.role || beat.role || "";
        row.locationId = item.locationId || beat.locationId || "";
        row.action = item.action || item.storyEvent || beat.action || "";
        row.emotion = item.emotion || beat.emotion || "";
        if (!row.stateAfter && beat.stateAfter) row.stateAfter = beat.stateAfter;
        return row;
      })
    };
  }

  function progressionDelta(previous, current) {
    var keyChanged = previous.situationKey !== current.situationKey;
    var location = previous.locationId !== current.locationId || previous.locationZone !== current.locationZone;
    var goal = text(previous.goalNow) !== text(current.goalNow) && !!(previous.goalNow || current.goalNow);
    var obstacle = text(previous.obstacleNow) !== text(current.obstacleNow) && !!(previous.obstacleNow || current.obstacleNow);
    var entity = previous.entitySignature !== current.entitySignature;
    var world = previous.worldSignature !== current.worldSignature;
    var discovery = current.present.some(function (id) { return previous.present.indexOf(id) < 0; });
    var emotion = text(previous.emotionalState) !== text(current.emotionalState) && !!(previous.emotionalState || current.emotionalState);
    var relationship = previous.cast.join("|") !== current.cast.join("|") || (text(previous.relationshipNow) !== text(current.relationshipNow) && !!(previous.relationshipNow || current.relationshipNow));
    var stakes = text(previous.stakesNow) !== text(current.stakesNow) && !!(previous.stakesNow || current.stakesNow);
    var action = previous.actionClass !== current.actionClass && keyChanged;
    var consequence = entity || world || (text(previous.consequenceNow) !== text(current.consequenceNow) && !!(previous.consequenceNow || current.consequenceNow));
    var information = discovery || world || !!current.explicitInformation;
    var delta = {
      LOCATION: location,
      GOAL: goal,
      OBSTACLE: obstacle,
      ACTION: action,
      CONSEQUENCE: consequence || (entity && current.actionClass === "result"),
      DISCOVERY: discovery,
      EMOTION: emotion,
      WORLD_STATE: world,
      ENTITY_STATE: entity,
      RELATIONSHIP: relationship,
      STAKES: stakes,
      INFORMATION: information
    };
    return delta;
  }

  function changedList(delta) {
    return DIMENSIONS.filter(function (key) { return delta && delta[key]; });
  }

  function reasonFor(changed, row, index) {
    if (!index) return "opening";
    if (!changed.length) return "same situation";
    if (changed.length === 1 && changed[0] === "EMOTION") {
      return QUIET_ROLES[row.role] ? "quiet beat" : "same situation";
    }
    return changed.filter(function (key) { return key !== "EMOTION"; }).join(", ").toLowerCase() || "quiet beat";
  }

  function intentFor(row, index, last, tone) {
    var asked = text(row.pageTurnIntent).toUpperCase();
    if (TURN_INTENTS.indexOf(asked) >= 0) return asked;
    if (index === last || row.role === "resolution") return "RESOLVE";
    if (QUIET_ROLES[row.role] || row.role === "breath") return "PAUSE";
    if (row.pageTurnHook && (row.role === "reveal" || row.role === "discovery" || row.role === "payoff" || row.role === "climax")) {
      return tone === "bedtime" ? "REVEAL" : (row.role === "climax" ? "SURPRISE" : "REVEAL");
    }
    if (row.pageTurnHook && (row.role === "setback" || row.role === "anticipation" || row.role === "approach" || row.role === "attempt")) return "ANTICIPATE";
    return "CONTINUE";
  }

  function layoutFor(row, intent) {
    var asked = text(row.layoutIntent).toUpperCase();
    if (LAYOUTS.indexOf(asked) >= 0 && asked !== "DOUBLE_PAGE_SPREAD") return asked;
    if (row.role === "climax") return "DOUBLE_PAGE_SPREAD";
    if (intent === "REVEAL" || intent === "SURPRISE") return "REVEAL_TURN";
    if (QUIET_ROLES[row.role]) return "QUIET_PAGE";
    if (row.role === "resolution" || row.role === "hook") return "SINGLE_PAGE_SCENE";
    return "PAGE_PAIR";
  }

  function buildRows(pack) {
    var bible = pack.bible || {};
    var climaxAt = -1;
    pack.rows.forEach(function (row, index) {
      if (row.role === "climax" || (bible.climaxBeatId && row.beatId === bible.climaxBeatId)) climaxAt = index;
    });
    var previousPhase = "";
    return pack.rows.map(function (row, index) {
      var entities = structuralEntities(bible, row);
      var present = entities.map(function (entity) { return entity.id; });
      var phase = phaseOf(row.role, previousPhase, index, climaxAt);
      previousPhase = phase;
      return {
        index: index,
        beatId: row.beatId,
        spreadId: row.spreadId,
        role: row.role,
        quiet: !!QUIET_ROLES[row.role],
        narrativePhase: phase,
        locationId: text(row.locationId),
        locationZone: zoneOf(row),
        goalNow: text(row.goalNow || (index === 0 ? bible.goal : "")),
        obstacleNow: text(row.obstacleNow),
        emotionalState: text(row.emotion),
        worldSignature: worldSignature(row),
        worldState: text(row.worldState),
        environmentalState: text(row.environmentalState),
        weather: text(row.weather),
        timeOfDay: text(row.timeOfDay),
        relationshipNow: text(row.relationshipNow),
        stakesNow: text(row.stakesNow),
        consequenceNow: text(row.consequenceNow),
        explicitInformation: text(row.newInformation || row.discoveryNow),
        actionClass: actionClass(row.role),
        actionNow: actionClass(row.role),
        cast: castOf(row),
        entities: entities,
        present: present,
        entitySignature: entitySignature(entities),
        situationKey: situationKey(row, entities),
        shotType: text(row.shotType),
        pageTurnHook: text(row.pageTurnHook),
        pageTurnIntent: text(row.pageTurnIntent),
        layoutIntent: text(row.layoutIntent),
        entryFrom: text(row.entryFrom),
        exitToward: text(row.exitToward),
        destinationHint: text(row.destinationHint),
        prose: text(row.prose),
        raw: row
      };
    });
  }

  function carryGoals(rows, bible) {
    var goal = text(bible.goal);
    var obstacle = text(bible.centralProblem);
    rows.forEach(function (row) {
      if (row.goalNow) goal = row.goalNow;
      else row.goalNow = goal;
      if (row.obstacleNow) obstacle = row.obstacleNow;
      else row.obstacleNow = obstacle;
      row.situationKey = [
        row.locationId,
        row.locationZone,
        row.entitySignature,
        row.worldSignature,
        row.goalNow,
        row.obstacleNow
      ].join("|");
    });
  }

  function novelty(changed, row) {
    var story = (changed || []).filter(function (key) {
      return key !== "EMOTION";
    });
    if (!row.index) return "opening";
    if (!story.length) return "framing-only";
    return story.join(", ").toLowerCase();
  }

  function scaleOf(shot) {
    if (shot === "establishing" || shot === "high" || shot === "overhead" || shot === "reveal") return "wide";
    if (shot === "close" || shot === "vignette") return "close";
    return "medium";
  }

  function energyOf(phase, quiet) {
    if (quiet || phase === "SETUP" || phase === "RESOLUTION" || phase === "AFTERMATH") return "quiet";
    if (phase === "CLIMAX") return "peak";
    if (phase === "ESCALATION" || phase === "SETBACK") return "rising";
    return "steady";
  }

  function review(input) {
    var pack = normalise(input || {});
    var bible = pack.bible || {};
    var rows = buildRows(pack);
    carryGoals(rows, bible);
    var tone = (input && input.tone) || bible.tone || "";
    var length = (input && input.length) || bible.targetLength || "";
    var deltas = [];
    var map = rows.map(function (row, index) {
      var previous = index ? rows[index - 1] : null;
      var entered = previous ? row.present.filter(function (id) { return previous.present.indexOf(id) < 0; }) : row.present.slice();
      var delta = previous ? progressionDelta(previous, row) : null;
      var changed = changedList(delta);
      if (delta) deltas.push({ from: previous.spreadId, to: row.spreadId, progressionDelta: delta, changed: changed });
      var turn = intentFor(row, index, rows.length - 1, tone);
      var layout = layoutFor(row, turn);
      var why = reasonFor(changed, row, index);
      return {
        beatId: row.beatId,
        spreadId: row.spreadId,
        narrativePhase: row.narrativePhase,
        quiet: row.quiet,
        locationId: row.locationId,
        locationZone: row.locationZone,
        goalNow: row.goalNow,
        obstacleNow: row.obstacleNow,
        discoveryNow: entered.join(","),
        actionNow: row.actionNow,
        consequenceNow: row.consequenceNow || ((delta && (delta.CONSEQUENCE || delta.ENTITY_STATE || delta.WORLD_STATE)) ? "state-changed" : ""),
        emotionalState: row.emotionalState,
        worldStateBefore: previous ? previous.worldSignature : "",
        worldStateAfter: row.worldSignature,
        newInformation: !index ? ["opening"] : (changed.length ? changed.slice() : ["none"]),
        visualDifferenceFromPrevious: novelty(changed, row),
        progressionReason: why,
        entryFrom: row.entryFrom || (previous && previous.locationId !== row.locationId ? previous.locationId : ""),
        exitToward: row.exitToward,
        destinationHint: row.destinationHint,
        pageTurnIntent: turn,
        layoutIntent: layout,
        earned: !index || changed.some(function (key) { return key !== "EMOTION"; }) || (row.quiet && why === "quiet beat")
      };
    });

    var revealCount = 0;
    map.forEach(function (row, index) {
      if (row.pageTurnIntent === "REVEAL" || row.pageTurnIntent === "SURPRISE") revealCount += 1;
      if (index < rows.length - 1 && rows[index + 1].locationId && rows[index + 1].locationId !== row.locationId && !row.exitToward) {
        row.exitToward = rows[index + 1].locationId;
      }
    });
    var reviewProblems = [];
    if (rows.length > 3 && revealCount > Math.ceil(rows.length / 3)) {
      var kept = false;
      map.forEach(function (row) {
        if (row.pageTurnIntent !== "REVEAL" && row.pageTurnIntent !== "SURPRISE") return;
        if (!kept && row.narrativePhase === "CLIMAX") {
          kept = true;
          return;
        }
        if (!kept && !map.some(function (item) { return item.narrativePhase === "CLIMAX"; })) {
          kept = true;
          return;
        }
        row.pageTurnIntent = "CONTINUE";
        if (row.layoutIntent === "REVEAL_TURN") row.layoutIntent = row.quiet ? "QUIET_PAGE" : "PAGE_PAIR";
      });
      reviewProblems.push("reveal-overused");
    }

    var runs = [];
    var current = [];
    function closeRun() {
      if (current.length >= STATIC_RUN) {
        var first = rows[current[0]];
        var internal = [];
        current.slice(1).forEach(function (index) { internal.push(deltas[index - 1]); });
        var seen = {};
        internal.forEach(function (delta) {
          delta.changed.forEach(function (key) { seen[key] = 1; });
        });
        var changed = DIMENSIONS.filter(function (key) { return seen[key]; });
        var unchanged = DIMENSIONS.filter(function (key) { return !seen[key]; });
        runs.push({
          code: "STATIC_RUN",
          spreadIds: current.map(function (index) { return rows[index].spreadId; }),
          beatIds: current.map(function (index) { return rows[index].beatId; }),
          repeatedLocation: first.locationId,
          repeatedZone: first.locationZone,
          repeatedGoal: first.goalNow,
          repeatedObstacle: first.obstacleNow,
          repeatedInteraction: first.entitySignature || first.actionClass,
          changedDimensions: changed,
          unchangedDimensions: unchanged
        });
        current.forEach(function (index) { map[index].earned = false; });
      }
      current = [];
    }
    rows.forEach(function (row, index) {
      if (!current.length) {
        current = [index];
        return;
      }
      if (row.situationKey === rows[current[0]].situationKey) current.push(index);
      else {
        closeRun();
        current = [index];
      }
    });
    closeRun();

    var blockProblems = [];
    runs.forEach(function (run) {
      blockProblems.push("static-run:" + run.spreadIds[0]);
    });

    rows.forEach(function (row, index) {
      if (!index) return;
      var previous = rows[index - 1];
      if (row.entryFrom && row.entryFrom !== previous.locationId) blockProblems.push("movement-contradiction:" + row.spreadId);
      if (previous.exitToward && row.locationId && row.locationId !== previous.locationId && row.locationId !== previous.exitToward) {
        blockProblems.push("movement-contradiction:" + row.spreadId);
      }
      if (row.locationId !== previous.locationId && !linked(bible, previous.locationId, row.locationId)) {
        reviewProblems.push("world-link:" + row.spreadId);
      }
      if (row.role === "attempt" && previous.role === "attempt" && row.situationKey === previous.situationKey) {
        reviewProblems.push("missing-consequence:" + row.spreadId);
      }
      if (row.raw && row.raw.erasesLocation) blockProblems.push("plan-erases:" + row.spreadId);
    });

    var introduced = {};
    rows.forEach(function (row) {
      row.present.forEach(function (id) { if (!introduced[id]) introduced[id] = row.entitySignature; });
    });
    var paid = false;
    var unused = [];
    Object.keys(introduced).forEach(function (id) {
      var changed = rows.some(function (row, index) {
        if (!index) return false;
        var before = rows[index - 1].entities.filter(function (entity) { return entity.id === id; })[0];
        var after = row.entities.filter(function (entity) { return entity.id === id; })[0];
        if (before && !after) return true;
        if (before && after && (before.owner !== after.owner || before.at !== after.at)) return true;
        return false;
      });
      if (changed) paid = true;
      else unused.push(id);
    });
    var worldMoved = rows.some(function (row, index) {
      return index > 0 && row.worldSignature !== rows[0].worldSignature && row.worldSignature !== rows[index - 1].worldSignature;
    });
    if (worldMoved) paid = true;
    if (Object.keys(introduced).length && !paid) blockProblems.push("payoff-missing");
    if (!worldMoved) unused.forEach(function (id) { reviewProblems.push("setup-open:" + id); });

    var opening = rows[0];
    var climax = rows.filter(function (row) { return row.narrativePhase === "CLIMAX" || row.role === "climax"; })[0];
    var resolution = rows.filter(function (row) { return row.role === "resolution" || row.narrativePhase === "RESOLUTION"; })[0];
    if (opening && climax && climax.situationKey === opening.situationKey && !paid) blockProblems.push("climax-disconnected");
    if (opening && resolution && resolution.situationKey === opening.situationKey && !paid) blockProblems.push("ending-unearned");

    if ((length === "storybook" || length === "adventure") && climax && rows.length > 4) {
      var middleMoves = 0;
      rows.forEach(function (row, index) {
        if (index < 2 || row.index >= climax.index) return;
        if (row.situationKey !== rows[index - 1].situationKey) middleMoves += 1;
      });
      if (!middleMoves && !runs.length) reviewProblems.push("middle-thin");
    }

    map.forEach(function (row, index) {
      var beat = rows[index];
      var place = placeOf(bible, beat.locationId);
      var anchors = ((place && (place.persistentObjects || place.landmarkIds)) || []).slice();
      if (index && rows[index - 1].locationId && rows[index - 1].locationId !== beat.locationId) anchors.push(rows[index - 1].locationId);
      row.visual = {
        spreadId: beat.spreadId,
        locationId: beat.locationId,
        locationZone: beat.locationZone,
        timeOfDay: beat.timeOfDay,
        weather: beat.weather,
        environmentalState: beat.environmentalState || beat.worldState,
        importantBackgroundElements: anchors,
        foregroundElements: beat.cast.concat(beat.present),
        scale: scaleOf(beat.shotType),
        dominantStoryEntity: beat.present[0] || "",
        visualEnergy: energyOf(beat.narrativePhase, beat.quiet),
        visualNoveltyReason: map[index].visualDifferenceFromPrevious,
        continuityAnchors: anchors
      };
    });

    var visualMap = map.map(function (row) { return row.visual; });
    map.forEach(function (row) { delete row.visual; });

    function unique(list) {
      return list.filter(function (item, index) { return list.indexOf(item) === index; });
    }
    blockProblems = unique(blockProblems);
    reviewProblems = unique(reviewProblems);
    var verdict = blockProblems.length ? "BLOCK" : (reviewProblems.length ? "REVIEW" : "PASS");
    return {
      verdict: verdict,
      storyProgressionMap: map,
      progressionDeltas: deltas,
      staticRuns: runs,
      visualProgressionMap: visualMap,
      blockProblems: blockProblems,
      reviewProblems: reviewProblems,
      setupPayoff: { paid: paid, unused: unused }
    };
  }

  function proseProblems(bible, pages) {
    var result = review({ bible: bible, pages: pages || [] });
    var problems = [];
    (pages || []).forEach(function (page) {
      var row = result.storyProgressionMap.filter(function (item) {
        return item.spreadId === page.pageId || item.beatId === page.beatId;
      })[0];
      var delta = result.progressionDeltas.filter(function (item) { return item.to === (page.pageId || page.spreadId); })[0];
      if (!row || !delta) return;
      var prose = text(page.prose).toLowerCase();
      if (!prose) return;
      if (delta.progressionDelta.LOCATION) {
        var place = placeOf(bible, row.locationId);
        var name = place && place.name ? place.name.toLowerCase() : "";
        if (name && prose.indexOf(name) < 0) problems.push("prose-erases-progression:" + (page.pageId || row.spreadId));
      }
      if (delta.progressionDelta.DISCOVERY && row.discoveryNow) {
        row.discoveryNow.split(",").forEach(function (id) {
          var entity = ((bible && bible.entities) || []).filter(function (item) { return item.entityId === id; })[0];
          var name = entity && entity.name ? entity.name.toLowerCase() : "";
          if (name && prose.indexOf(name) < 0) problems.push("prose-erases-progression:" + (page.pageId || row.spreadId));
        });
      }
    });
    return problems.filter(function (item, index) { return problems.indexOf(item) === index; });
  }

  function progressionDeltaPublic(previousBeat, currentBeat) {
    var result = review({ beats: [previousBeat || {}, currentBeat || {}] });
    return result.progressionDeltas[0] ? result.progressionDeltas[0].progressionDelta : null;
  }

  return {
    PHASES: PHASES,
    DIMENSIONS: DIMENSIONS,
    TURN_INTENTS: TURN_INTENTS,
    LAYOUTS: LAYOUTS,
    STATIC_RUN: STATIC_RUN,
    review: review,
    progressionDelta: progressionDeltaPublic,
    proseProblems: proseProblems
  };
});
