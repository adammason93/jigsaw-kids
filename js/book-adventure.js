/* Story-world journey. Plans how an adventure develops before the prose is written.
   It does not invent a plot, a place list, or a fixed number of locations. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookAdventure = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LONG = { storybook: 1, adventure: 1 };

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function norm(value) {
    return text(value).toLowerCase();
  }

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function unique(list) {
    return (list || []).filter(function (item, index) {
      return item && list.indexOf(item) === index;
    });
  }

  function storyKind(ask) {
    var tone = String((ask && ask.tone) || "");
    var idea = String((ask && ask.idea) || "").toLowerCase();
    if (tone === "bedtime") return "bedtime";
    if (tone === "mystery") return "mystery";
    if (tone === "funny") return "funny";
    if (tone === "educational" || /\b(teach|lesson|curriculum)\b/.test(idea) || /\blearn\b/.test(idea)) return "educational";
    if (tone === "everyday") return "everyday";
    if (tone === "adventure") return "adventure";
    if (tone === "magical" && /\b(discover|explore|secret|hidden|journey|pathway)\b/.test(idea)) return "adventure";
    if (/\b(at home|birthday|school day|rainy afternoon)\b/.test(idea)) return "everyday";
    return "open";
  }

  function longBook(ask) {
    var source = ask || {};
    if (LONG[source.length] || LONG[source.targetLength]) return true;
    var count = Number(source.pageCount || 0);
    return count >= 9;
  }

  function needsJourney(ask) {
    if (!longBook(ask)) return false;
    var kind = storyKind(ask);
    return kind === "adventure" || kind === "mystery" || kind === "educational";
  }

  function writerGuide(ask) {
    var kind = storyKind(ask);
    var shared = [
      "Before the beats, plan the journey as major sections, not as one section per page.",
      "Each section names the place, why the characters are there, what they are trying to do, the discovery or obstacle, how that changes what they do next, and how it connects to the following section.",
      "A new place needs a narrative reason. Do not move the characters only to change the background.",
      "One place can hold the whole book when the events, stakes, and discoveries keep changing.",
      "Do not spend most of the book inspecting variations of one object in lookalike surroundings, unless that single search is the idea itself.",
      "Invent the places this idea needs. A forest, cave, garden, cellar, mountain, library, ocean, temple, station, or island is not a default, and none of them is required.",
      "setting is the kind of place, in a few original words. Reuse the same setting when two rooms are the same kind of place. A new setting is a different environment, not another corner of the same room.",
      "The selected children keep the same faces, hair, and clothes in every place. They may run, climb, look, and react. A new place does not give them a new outfit.",
      "The illustration planner may draw only places the beats visit. Do not mention a place the beats never enter."
    ];
    var focused = {
      adventure: "This is an adventure. Reward curiosity with a new situation: a discovery, a meeting, a surprise, a friendship, a mystery, or a journey. A repair can be the story when the idea is a repair. Do not default to a broken magical object and a long sequence of putting it back. If the premise promises a hidden world or a journey, do not spend most of the book on one task in one place. One place can still hold the book when what happens there becomes a different kind of situation. Keep each event easy to hear aloud. Do not explain how a mechanism works across many pages.",
      mystery: "This is a mystery. It may stay inside one building. Each section adds a different clue, a wrong idea, or a discovery that changes what they look for next. The last section answers the question opened at the start. Do not add extra lands only to vary the pictures.",
      bedtime: "This is a bedtime story. Keep the journey gentle and the places comforting. A familiar room may stay. Change the light, the feeling, or a small discovery. Do not add a chase, a danger, or a spectacular new world.",
      educational: "This is an educational story. Each place should show a real part of what the story is teaching. A new place is earned by a new piece of understanding, not by decoration. Do not add fantasy scenery the subject does not need.",
      everyday: "This is an everyday story. Use places a child would recognise. Progress comes from a decision, a small problem, or a change between people. Do not turn it into a quest through invented lands.",
      funny: "This is a funny story. The progression is the mistake or the mismatch and what it causes. Change place only when the joke needs a new situation.",
      open: "Choose the journey this idea needs. Do not turn every story into a chase, and do not keep every story in one room out of habit."
    };
    var repair = "If a check says journey-missing, add the journey. If it says journey-gap, name the discovery and the change it causes. If it says journey-unlinked, connect the section to the next one. If it says narrow-world, the goal is stuck on one investigation in one kind of place. If it says narrow-adventure, the children are repeating one task, often operating the same object. Give them a different kind of situation, or let a promised journey open up. Do not add empty places. If it says clue-stuck, each mystery section needs a different clue. If it says setting-missing, say what kind of place each location is.";
    return shared.concat([focused[kind] || focused.open, repair]).join(" ");
  }

  function normalise(raw, locations) {
    var known = {};
    (locations || []).forEach(function (place) {
      if (place && place.locationId) known[place.locationId] = true;
    });
    return (raw || []).map(function (section, index) {
      var locationId = slug(section && section.locationId);
      var leads = norm(section && section.leadsTo);
      var leadsTo = leads === "same" ? "same" : slug(section && section.leadsTo);
      return {
        section: text(section && section.section) || ("part-" + (index + 1)),
        locationId: locationId,
        purpose: text(section && section.purpose),
        objective: text(section && section.objective),
        discoveryOrObstacle: text(section && section.discoveryOrObstacle),
        change: text(section && section.change),
        leadsTo: leadsTo,
        knownPlace: !locationId || !!known[locationId]
      };
    }).filter(function (section) {
      return section.locationId || section.purpose || section.objective;
    });
  }

  function placeById(bible, locationId) {
    return ((bible && bible.locations) || []).filter(function (place) {
      return place.locationId === locationId;
    })[0] || null;
  }

  function settingOf(place) {
    if (!place) return "";
    return norm(place.setting || place.visualIdentity || place.locationId);
  }

  var HANDLING = /\b(lift|lifts|lifted|place|places|placed|fit|fits|fitted|scoop|scoops|scooped|press|presses|pressed|socket|mend|mends|mended|repair|repairs|repaired|crack|cracks|cracked|float|floats|floated|lower|lowers|lowered|wobble|wobbles|wobbled|silt)\b/i;
  var GLUE = {
    about: 1, after: 1, again: 1, along: 1, around: 1, before: 1, being: 1, could: 1,
    first: 1, from: 1, have: 1, into: 1, just: 1, leo: 1, maya: 1, over: 1, place: 1,
    said: 1, still: 1, that: 1, their: 1, there: 1, they: 1, this: 1, through: 1,
    under: 1, water: 1, were: 1, when: 1, where: 1, which: 1, while: 1, with: 1,
    would: 1, steps: 1
  };

  function promisesWiderWorld(idea) {
    var line = String(idea || "").toLowerCase();
    if (/\b(hidden world|explore|exploration|journey|pathway|secret beyond)\b/.test(line)) return true;
    return /\bdiscover\b/.test(line) && /\b(world|pathway|journey|land|realm)\b/.test(line);
  }

  function ideaAsksForRepair(idea) {
    return /\b(fix|repair|mend|mended|broken|missing|restore)\b/.test(String(idea || "").toLowerCase());
  }

  function placeShare(beats) {
    var counts = {};
    var seen = 0;
    (beats || []).forEach(function (beat) {
      if (!beat || !beat.locationId) return;
      seen += 1;
      counts[beat.locationId] = (counts[beat.locationId] || 0) + 1;
    });
    var top = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > top) top = counts[id];
    });
    return seen ? top / seen : 0;
  }

  function contentNouns(action) {
    return unique(norm(action).split(/[^a-z]+/).filter(function (word) {
      return word.length > 4 && !GLUE[word] && !HANDLING.test(word);
    }));
  }

  function taskFocus(beats) {
    var list = beats || [];
    var handling = list.filter(function (beat) {
      return HANDLING.test(String((beat && beat.action) || ""));
    });
    var nouns = {};
    handling.forEach(function (beat) {
      contentNouns(beat.action).forEach(function (word) {
        nouns[word] = (nouns[word] || 0) + 1;
      });
    });
    var top = 0;
    Object.keys(nouns).forEach(function (word) {
      if (nouns[word] > top) top = nouns[word];
    });
    return {
      handlingShare: list.length ? handling.length / list.length : 0,
      nounShare: list.length ? top / list.length : 0
    };
  }

  function dominantEntity(bible) {
    var beats = (bible && bible.beats) || [];
    var counts = {};
    beats.forEach(function (beat) {
      var ids = beat.entitiesRequired || [];
      if (!ids.length && beat.stateAfter && beat.stateAfter.entities) {
        ids = beat.stateAfter.entities.map(function (entity) { return entity.entityId; });
      }
      unique(ids).forEach(function (id) {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    var top = "";
    var count = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > count) {
        top = id;
        count = counts[id];
      }
    });
    return { id: top, share: beats.length ? count / beats.length : 0 };
  }

  function assess(bible, ask) {
    var source = bible || {};
    var request = Object.assign({
      tone: source.tone,
      idea: source.userIdea,
      length: source.targetLength,
      pageCount: source.pageCount
    }, ask || {});
    var kind = storyKind(request);
    var sections = source.journey || [];
    var block = [];
    var review = [];
    if (needsJourney(request) && sections.length < 2) block.push("journey-missing");
    sections.forEach(function (section, index) {
      var label = section.section || String(index + 1);
      if (!section.purpose || !section.objective || !section.discoveryOrObstacle || !section.change) {
        block.push("journey-gap:" + label);
      }
      if (index < sections.length - 1 && !section.leadsTo) block.push("journey-unlinked:" + label);
      if (section.locationId && !placeById(source, section.locationId)) block.push("journey-unknown-place:" + section.locationId);
      if (section.leadsTo && section.leadsTo !== "same" && !placeById(source, section.leadsTo)) {
        block.push("journey-unknown-place:" + section.leadsTo);
      }
    });
    var beatPlaces = {};
    (source.beats || []).forEach(function (beat) {
      if (beat && beat.locationId) beatPlaces[beat.locationId] = true;
    });
    if (sections.length) {
      var named = {};
      sections.forEach(function (section) {
        if (section.locationId) named[section.locationId] = true;
      });
      Object.keys(named).forEach(function (id) {
        if (!beatPlaces[id]) block.push("journey-unused-place:" + id);
      });
      Object.keys(beatPlaces).forEach(function (id) {
        if (!named[id]) block.push("journey-unknown-place:" + id);
      });
    }
    var settings = unique(sections.map(function (section) {
      return settingOf(placeById(source, section.locationId));
    }));
    if (needsJourney(request)) {
      (source.locations || []).forEach(function (place) {
        if (place && place.locationId && beatPlaces[place.locationId] && !text(place.setting)) {
          block.push("setting-missing:" + place.locationId);
        }
      });
    }
    if (kind === "bedtime") {
      var blob = sections.map(function (section) {
        return [section.purpose, section.discoveryOrObstacle, section.change].join(" ");
      }).join(" ");
      if (/\b(chase|battle|danger|monster)\b/i.test(blob)) review.push("bedtime-spectacle");
    }
    if (kind === "mystery" && sections.length >= 2) {
      var clues = unique(sections.map(function (section) { return norm(section.discoveryOrObstacle); }));
      if (clues.length < 2) block.push("clue-stuck");
    }
    var focus = taskFocus(source.beats);
    var stay = placeShare(source.beats);
    if (kind === "adventure" && sections.length >= 2) {
      var objectives = unique(sections.map(function (section) { return norm(section.objective); }));
      var changes = unique(sections.map(function (section) { return norm(section.change); }));
      var dominant = dominantEntity(source);
      if (settings.length <= 1 && objectives.length <= 1 && changes.length <= 1 && dominant.share >= 0.6) {
        block.push("narrow-world");
      }
      var sameTask = focus.handlingShare >= 0.6 && focus.nounShare >= 0.45;
      var promisedStay = promisesWiderWorld(request.idea) && stay >= 0.6 && focus.handlingShare >= 0.5;
      if (!ideaAsksForRepair(request.idea) && (sameTask || promisedStay)) block.push("narrow-adventure");
    }
    return {
      kind: kind,
      needsJourney: needsJourney(request),
      blockProblems: unique(block),
      reviewProblems: unique(review),
      distinctSettings: settings,
      sectionCount: sections.length,
      placeShare: stay,
      handlingShare: focus.handlingShare
    };
  }

  return {
    storyKind: storyKind,
    needsJourney: needsJourney,
    writerGuide: writerGuide,
    normalise: normalise,
    assess: assess
  };
});
