/* Plans one genuine continuous illustration for a facing pair.
   The 3D reader paints pages as 1–2, 3–4, and so on. A spread is one
   1536×1024 painting shared by that pair. This file does not draw,
   spend, or change a saved book. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookSpread = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var IMAGE = { size: "1536x1024", width: 1536, height: 1024 };
  var PAGE = { width: 1200, height: 1800 };
  var MAX_CROP = 0.16;
  var DEFAULT_LIMIT = 1;

  function textOf(page) {
    return String(page && (page.text || page.prose) || "");
  }

  function intentOf(page) {
    return String(page && (page.layoutIntent || page.intent) || "").toUpperCase();
  }

  function idOf(item) {
    if (item && typeof item === "object") return String(item.id || item.characterId || item.name || "");
    return String(item || "");
  }

  function castOf(page) {
    var list = page && (page.charactersPresent || page.characters) || [];
    return (Array.isArray(list) ? list : []).map(idOf).filter(Boolean);
  }

  function pageId(page, index) {
    return String(page && (page.pageId || page.id) || "p" + (index + 1));
  }

  function imageOf(page) {
    if (!page) return "";
    return String(page.imageDataUrl || page.imageUrlFallback || page.image || "");
  }

  function artApi(options) {
    if (options && options.art && typeof options.art.compose === "function") return options.art;
    if (typeof require === "function") {
      try { return require("./book-art-direction.js"); } catch (error) { return null; }
    }
    return null;
  }

  function facingPairs(count) {
    var pairs = [];
    var total = Number(count) || 0;
    var index;
    for (index = 0; index + 1 < total; index += 2) {
      pairs.push({
        leftIndex: index,
        rightIndex: index + 1,
        pages: [index + 1, index + 2]
      });
    }
    return pairs;
  }

  function pairContaining(count, index) {
    var total = Number(count) || 0;
    if (index < 0 || index >= total) return null;
    if (index % 2 === 0) {
      if (index + 1 >= total) return null;
      return { leftIndex: index, rightIndex: index + 1, pages: [index + 1, index + 2] };
    }
    return { leftIndex: index - 1, rightIndex: index, pages: [index, index + 1] };
  }

  function displayMap() {
    var halfW = IMAGE.width / 2;
    var spreadW = PAGE.width;
    var uncroppedH = Math.round(spreadW / (halfW / IMAGE.height));
    var maxH = Math.round(PAGE.height * 0.62);
    var kept = IMAGE.height * (1 - MAX_CROP);
    var sy = (IMAGE.height - kept) * 0.4;
    return {
      image: { width: IMAGE.width, height: IMAGE.height, size: IMAGE.size, aspect: IMAGE.width / IMAGE.height },
      native2to1: false,
      displayedPage: { width: PAGE.width, height: PAGE.height },
      displayedSpread: { width: PAGE.width * 2, height: PAGE.height },
      foldX: halfW,
      half: { width: halfW, height: IMAGE.height },
      uncroppedPageHeight: uncroppedH,
      maxPictureHeight: maxH,
      maxCrop: MAX_CROP,
      keptBand: { top: Math.round(sy), height: Math.round(kept) },
      note: "The painting is 1536 by 1024, a 3:2 landscape, not a 2:1 picture. The reader splits it at x=768. Each half is drawn 1200 wide on a 1200 by 1800 page, so the full width would be about " + uncroppedH + " pixels tall and must be cropped to leave room for the words. Keep faces, hands, expressions, and story objects out of the centre fold and inside the middle band of the picture."
    };
  }

  function textWidth() {
    var outer = Math.round(PAGE.width * 0.055);
    var gutter = Math.round(PAGE.width * 0.08);
    return PAGE.width - outer - gutter;
  }

  /* The live reader starts directed type at 72px and steps down to 36px.
     Ordinary prose uses a 1.45 line height. A quoted line is taller. */
  function copyHeight(text, size) {
    var width = textWidth();
    var type = Number(size) || Math.round(PAGE.width * 0.06);
    var charW = type * 0.52;
    var space = type * 0.33;
    var paragraphs = String(text || "").split(/\n+/).map(function (part) {
      return part.trim();
    }).filter(Boolean);
    if (!paragraphs.length) paragraphs = [" "];
    var leading = type * 1.45;
    var height = 0;
    paragraphs.forEach(function (paragraph, index) {
      var words = paragraph.split(/\s+/).filter(Boolean);
      var lines = 1;
      var row = 0;
      var quoted = /^["“]/.test(paragraph);
      words.forEach(function (word) {
        var wordW = Math.max(charW, word.length * charW);
        var gap = row ? space : 0;
        if (row && row + gap + wordW > width) {
          lines += 1;
          row = wordW;
        } else row += gap + wordW;
      });
      var lineH = quoted ? leading * 1.38 : leading;
      if (index) height += Math.round(leading * 0.55);
      height += lines * lineH;
    });
    return Math.ceil(height);
  }

  function placedFit(text, art, side, size) {
    var spec = {
      layout: "spread",
      continuous: true,
      half: side,
      crop: { maxSide: MAX_CROP },
      textAlign: "left",
      edge: "bleed",
      readingOrder: ["illustration", "story", "folio"]
    };
    var needed = copyHeight(text, size);
    var placed = art.compose(spec, PAGE.width, PAGE.height, IMAGE.width, IMAGE.height, side, needed);
    var folio = Math.round(PAGE.height * 0.058);
    var cropOk = placed.image.crop <= MAX_CROP + 0.001;
    var roomOk = placed.text.h + 1 >= needed;
    var folioOk = placed.text.y + Math.min(needed, placed.text.h) <= PAGE.height - folio + 1;
    return {
      ok: cropOk && roomOk && folioOk && placed.text.h >= 80,
      needed: needed,
      crop: placed.image.crop,
      textH: placed.text.h,
      size: size
    };
  }

  /* The reader’s quiet band. These match the live composition measurements:
     a 1200×1800 page, the 7–9 type size, and the lower or upper quiet limit.
     A prompt asking for open space is not evidence that the space exists. */
  function quietCopyFits(text, where) {
    var pageW = PAGE.width;
    var pageH = PAGE.height;
    var floor = Math.round(pageW * 0.03);
    var size = Math.max(floor, Math.min(Math.round(pageW * 0.04), Math.round(pageW * 0.042)));
    var column = pageW - pageW * 0.12 - pageW * 0.1;
    var limit = where === "upper" ? pageH * 0.34 : Math.min(pageH * 0.18, pageH * 0.88 - pageH * 0.74);
    var words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    var height = 0;
    while (size >= floor) {
      var charW = size * 0.48;
      var lines = 1;
      var row = 0;
      words.forEach(function (word) {
        var wordW = Math.max(charW, word.length * charW);
        if (row && row + charW * 0.33 + wordW > column) {
          lines += 1;
          row = wordW;
        } else row += (row ? charW * 0.33 : 0) + wordW;
      });
      height = lines * size * 1.58;
      if (height <= limit + 1) return true;
      if (size === floor) break;
      size = Math.max(floor, size - 2);
    }
    return false;
  }

  /* Save a quiet area only when the vision check saw it and both sentences fit.
     Anything else stays on the paper band. */
  function confirmedQuiet(report, leftText, rightText, plannedRegion) {
    var region = plannedRegion === "upper" || plannedRegion === "lower" ? plannedRegion : "";
    if (!region) return "";
    if (!report || report.textSafeUsable !== true) return "";
    if (!quietCopyFits(leftText, region) || !quietCopyFits(rightText, region)) return "";
    return region;
  }

  function assignQuiet(composition, pages, pair, report, plannedRegion) {
    var book = composition;
    var region = confirmedQuiet(
      report,
      textOf(pages && pages[pair.leftIndex]),
      textOf(pages && pages[pair.rightIndex]),
      plannedRegion
    );
    if (!book || !book.beats || !pair) return region;
    var leftBeat = book.beats[pair.leftIndex];
    var rightBeat = book.beats[pair.rightIndex];
    var ids = {};
    if (leftBeat && leftBeat.beatId) ids[leftBeat.beatId] = true;
    if (rightBeat && rightBeat.beatId) ids[rightBeat.beatId] = true;
    (book.leaves || []).forEach(function (leaf) {
      if (!leaf || !ids[leaf.beatId]) return;
      if (region) leaf.quietRegion = region;
      else delete leaf.quietRegion;
    });
    (book.units || []).forEach(function (unit) {
      if (!unit || !ids[unit.beatId]) return;
      if (leftBeat && unit.unitId === leftBeat.unitId) unit.quietRegion = region;
    });
    return region;
  }

  /* Re-approve a quiet area from the stored vision report. Binding rebuilds
     the leaves, so an old quietRegion is never copied across a checkpoint.
     A report is used only after that half has been accepted, and only
     textSafeUsable === true can survive assignQuiet. */
  function acceptedReport(pictures, page) {
    if (!page || !pictures) return null;
    var id = page.pageId || page.id;
    var shot = id ? pictures[id] : null;
    if (!shot || shot.accepted !== true) return null;
    return shot.report || null;
  }

  function restoreQuiet(composition, pages, plan, pictures) {
    return (plan && plan.selected || []).map(function (pair) {
      var left = pages && pages[pair.leftIndex];
      var report = acceptedReport(pictures, left);
      if (!report) report = acceptedReport(pictures, pages && pages[pair.rightIndex]);
      return assignQuiet(composition, pages, pair, report, "lower");
    });
  }

  function textFit(text, art, side) {
    var size = Math.round(PAGE.width * 0.06);
    var floor = Math.round(PAGE.width * 0.03);
    var last = null;
    while (size >= floor) {
      last = placedFit(text, art, side, size);
      if (last.ok) return last;
      if (size === floor) break;
      size = Math.max(floor, size - 2);
    }
    return last;
  }

  var VERB = {
    lift: "lift", lifts: "lift", lifted: "lift", lifting: "lift",
    raise: "lift", raises: "lift", raised: "lift",
    pick: "lift", picks: "lift", picked: "lift",
    hold: "hold", holds: "hold", held: "hold", holding: "hold",
    carry: "hold", carries: "hold", carried: "hold",
    pause: "pause", pauses: "pause", paused: "pause",
    scatter: "scatter", scatters: "scatter", scattered: "scatter",
    pull: "pull", pulls: "pull", pulled: "pull",
    place: "place", places: "place", placed: "place",
    wave: "wave", waves: "wave", waved: "wave",
    find: "find", finds: "find", found: "find",
    search: "search", searches: "search", searched: "search",
    stretch: "stretch", stretches: "stretch", stretched: "stretch",
    point: "point", points: "point", pointed: "point",
    look: "look", looks: "look", looked: "look", looking: "look",
    stare: "look", stares: "look", stared: "look", staring: "look",
    spread: "spread", spreads: "spread", spreading: "spread",
    fly: "fly", flies: "fly", flew: "fly", flying: "fly",
    sleep: "sleep", sleeps: "sleep", slept: "sleep", sleeping: "sleep",
    fold: "fold", folds: "fold", folded: "fold",
    sit: "sit", sits: "sit", sat: "sit", sitting: "sit",
    smile: "smile", smiles: "smile", smiled: "smile",
    call: "call", calls: "call", called: "call",
    tap: "tap", taps: "tap", tapped: "tap",
    settle: "settle", settles: "settle", settled: "settle",
    follow: "move", follows: "move", followed: "move", following: "move",
    walk: "move", walks: "move", walked: "move",
    step: "move", steps: "move", stepped: "move",
    return: "move", returns: "move", returned: "move",
    lead: "move", leads: "move", led: "move",
    climb: "move", climbs: "move", climbed: "move",
    hurry: "move", hurried: "move",
    run: "move", runs: "move", ran: "move"
  };
  var SKIP_NOUN = {
    the: 1, and: 1, her: 1, his: 1, she: 1, they: 1, them: 1, their: 1, this: 1, that: 1,
    with: 1, from: 1, into: 1, over: 1, above: 1, beside: 1, under: 1, through: 1,
    clear: 1, tiny: 1, little: 1, blue: 1, yellow: 1, deeper: 1, broad: 1, pale: 1,
    water: 1, pool: 1, shelf: 1, sofia: 1, mummy: 1, isaac: 1, maya: 1, onto: 1, just: 1,
    while: 1, when: 1, where: 1, there: 1, then: 1, after: 1, before: 1, still: 1,
    here: 1, now: 1, again: 1, once: 1, both: 1, same: 1, other: 1, every: 1,
    very: 1, only: 1, down: 1, away: 1, back: 1, across: 1, toward: 1, towards: 1,
    around: 1, about: 1, stay: 1, stayed: 1, stays: 1, stand: 1, stood: 1, stands: 1,
    wait: 1, waited: 1, waits: 1, waiting: 1,
    was: 1, were: 1, are: 1, had: 1, has: 1, have: 1, its: 1, who: 1, what: 1, which: 1
  };
  var DESTINATION = /\b(to|towards|toward|into|onto|down|off|away)\b/;
  var SEQUENCE_WORD = /\b(then|later|afterwards|afterward|soon|by then|after that|after a while)\b/;
  var OPPOSITES = [
    ["asleep", "awake"],
    ["slept", "woke"],
    ["sleeping", "flying"],
    ["slept", "flew"],
    ["folded", "spread"],
    ["shut", "open"],
    ["closed", "open"],
    ["empty", "full"],
    ["lost", "found"],
    ["lost", "held"]
  ];

  function sentencesOf(text) {
    return String(text || "").split(/[.!?]+/).map(function (part) {
      return part.replace(/^["“\s]+|["”\s]+$/g, "").trim();
    }).filter(Boolean);
  }

  function stemNoun(word) {
    var value = String(word || "").toLowerCase().replace(/'s$/, "");
    if (value.length > 4 && value.charAt(value.length - 1) === "s") value = value.slice(0, -1);
    return value;
  }

  function eventsOf(text) {
    return sentencesOf(text).map(function (sentence) {
      var words = sentence.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
      var verbs = [];
      var nouns = [];
      var move = false;
      words.forEach(function (word) {
        var stem = stemNoun(word);
        if (VERB[word] || VERB[stem]) {
          var kind = VERB[word] || VERB[stem];
          verbs.push(kind);
          if (kind === "move") move = true;
          return;
        }
        if (SKIP_NOUN[stem] || stem.length < 3) return;
        nouns.push(stem);
      });
      return { sentence: sentence, verbs: verbs, nouns: nouns, move: move, action: verbs.length > 0 };
    }).filter(function (event) { return event.action; });
  }

  function uniqueList(list) {
    return list.filter(function (item, index) { return list.indexOf(item) === index; });
  }

  function wordsOf(text) {
    return String(text || "").toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
  }

  function contentNouns(words) {
    var nouns = [];
    words.forEach(function (word) {
      var stem = stemNoun(word);
      if (VERB[word] || VERB[stem] || SKIP_NOUN[stem] || stem.length < 3) return;
      nouns.push(stem);
    });
    return uniqueList(nouns);
  }

  function sceneOf(text) {
    var events = eventsOf(text);
    return {
      events: events,
      nouns: contentNouns(wordsOf(text)),
      words: wordsOf(text),
      relocates: events.some(function (event) {
        return event.move && DESTINATION.test(String(event.sentence || "").toLowerCase());
      }),
      laterAction: false,
      timed: SEQUENCE_WORD.test(String(text || "").toLowerCase())
    };
  }

  function withLaterAction(scene) {
    scene.laterAction = scene.relocates && scene.events.some(function (event) {
      return event.verbs.some(function (verb) { return verb !== "move"; });
    });
    return scene;
  }

  function hasPole(words, pole) {
    return words.some(function (word) { return word === pole || stemNoun(word) === pole; });
  }

  function pageQuote(page) {
    var value = String(textOf(page) || "").replace(/\s+/g, " ").trim();
    if (value.length > 180) value = value.slice(0, 177) + "...";
    return value;
  }

  /* Both pages are read in full. Different details and simultaneous actions
     may share one painting. A spread is declined only when one page happens
     after the other, or the two pages cannot both be true. */
  function coherence(left, right) {
    var leftText = textOf(left);
    var rightText = textOf(right);
    var leftScene = withLaterAction(sceneOf(leftText));
    var rightScene = withLaterAction(sceneOf(rightText));
    var shared = leftScene.nouns.filter(function (noun) { return rightScene.nouns.indexOf(noun) >= 0; });
    var clash = null;
    OPPOSITES.forEach(function (pair) {
      if (clash || !shared.length) return;
      var leftFirst = hasPole(leftScene.words, pair[0]);
      var leftSecond = hasPole(leftScene.words, pair[1]);
      var rightFirst = hasPole(rightScene.words, pair[0]);
      var rightSecond = hasPole(rightScene.words, pair[1]);
      if ((leftFirst && rightSecond) || (leftSecond && rightFirst)) clash = pair;
    });
    if (clash) {
      return {
        ok: false,
        kind: "contradictory",
        reason: "These facing pages contradict each other — “" + pageQuote(left) + "” and “" + pageQuote(right) + "” cannot both be true in one painting. The pages stay separate."
      };
    }
    var leavesTheScene = rightScene.timed || (rightScene.relocates && rightScene.laterAction);
    if (leftScene.events.length && rightScene.events.length && !shared.length && leavesTheScene) {
      return {
        ok: false,
        kind: "sequential",
        reason: "These facing pages are sequential — “" + pageQuote(left) + "” happens before “" + pageQuote(right) + "”. The characters move on to another event, so one painting would mix the order. The pages stay separate."
      };
    }
    return {
      ok: true,
      kind: shared.length ? "one-moment" : "simultaneous",
      reason: "Both pages can share one painting. They are one moment, or different details happening at the same time."
    };
  }

  function pairFits(left, right, art) {
    var size = Math.round(PAGE.width * 0.06);
    var floor = Math.round(PAGE.width * 0.03);
    var last = null;
    while (size >= floor) {
      var leftFit = placedFit(textOf(left), art, "left", size);
      var rightFit = placedFit(textOf(right), art, "right", size);
      last = { ok: leftFit.ok && rightFit.ok, size: size, left: leftFit, right: rightFit };
      if (last.ok) return last;
      if (size === floor) break;
      size = Math.max(floor, size - 2);
    }
    return last;
  }

  function judge(left, right, art) {
    var placeA = String(left.locationId || "");
    var placeB = String(right.locationId || "");
    if (!placeA || !placeB || placeA !== placeB) {
      return {
        ok: false,
        reason: "These facing pages are not the same place, so they stay separate pictures."
      };
    }
    var zoneA = String(left.locationZone || "");
    var zoneB = String(right.locationZone || "");
    if (zoneA && zoneB && zoneA !== zoneB) {
      return {
        ok: false,
        reason: "These facing pages show different parts of the place, so the action does not cross one spread."
      };
    }
    var peopleA = castOf(left);
    var peopleB = castOf(right);
    var shared = peopleA.filter(function (id) { return peopleB.indexOf(id) >= 0; });
    if (!peopleA.length || !peopleB.length || !shared.length) {
      return {
        ok: false,
        reason: "These facing pages do not share a character, so they cannot be one continuous scene."
      };
    }
    var scene = coherence(left, right);
    if (!scene.ok) return scene;
    if (!art) {
      return { ok: false, reason: "The page fit could not be checked, so no continuous spread was planned." };
    }
    var fitted = pairFits(left, right, art);
    if (!fitted || !fitted.ok) {
      return {
        ok: false,
        reason: "The words on this facing pair do not fit safely under one 1536×1024 painting, so the pages stay separate."
      };
    }
    return {
      ok: true,
      size: fitted.size,
      reason: "Both pages belong to one continuous moment. Different details may share the painting when they happen at the same time. One 1536×1024 painting can show it, with the centre fold kept clear and the words underneath."
    };
  }

  function isClimax(page) {
    return String(page && (page.narrativePhase || page.phase) || "").toUpperCase() === "CLIMAX";
  }

  function review(pages, options) {
    var list = Array.isArray(pages) ? pages : [];
    var opts = options || {};
    var limit = opts.limit == null ? DEFAULT_LIMIT : Number(opts.limit);
    if (!(limit >= 0)) limit = DEFAULT_LIMIT;
    var art = artApi(opts);
    var declined = [];
    var selected = [];
    var ready = [];
    var seen = {};
    list.forEach(function (page, index) {
      if (intentOf(page) !== "DOUBLE_PAGE_SPREAD") return;
      var pair = pairContaining(list.length, index);
      if (!pair) {
        declined.push({
          pages: [index + 1],
          status: "declined",
          reason: "Page " + (index + 1) + " asks for a double-page spread, but the reader has no facing page beside it."
        });
        return;
      }
      var key = pair.leftIndex + "-" + pair.rightIndex;
      if (seen[key]) return;
      seen[key] = true;
      var verdict = judge(list[pair.leftIndex], list[pair.rightIndex], art);
      var record = {
        leftIndex: pair.leftIndex,
        rightIndex: pair.rightIndex,
        pages: pair.pages.slice(),
        status: verdict.ok ? "planned" : "declined",
        climax: isClimax(list[pair.leftIndex]) || isClimax(list[pair.rightIndex]),
        reason: verdict.reason
      };
      if (!verdict.ok) {
        declined.push(record);
        return;
      }
      if (options && options.composition && !singleLeafOpening(options.composition, pair)) {
        record.status = "declined";
        record.reason = "Pages " + pair.pages[0] + " and " + pair.pages[1] + " are not a facing opening in this book's page order, so they keep separate pictures.";
        declined.push(record);
        return;
      }
      ready.push(record);
    });
    ready.sort(function (a, b) {
      if (a.climax !== b.climax) return a.climax ? -1 : 1;
      return a.leftIndex - b.leftIndex;
    });
    ready.forEach(function (record) {
      if (selected.length >= limit) {
        record.status = "declined";
        record.reason = "Pages " + selected[0].pages[0] + "–" + selected[0].pages[1] + " already use this book's continuous painting. Pages " + record.pages[0] + "–" + record.pages[1] + " stay separate.";
        declined.push(record);
        return;
      }
      selected.push(record);
    });
    return {
      limit: limit,
      image: { size: IMAGE.size, width: IMAGE.width, height: IMAGE.height },
      selected: selected,
      declined: declined
    };
  }

  function jobAt(plan, index) {
    var selected = plan && plan.selected || [];
    var found = null;
    selected.forEach(function (pair) {
      if (pair.leftIndex === index) found = { kind: "spread", pair: pair };
      if (pair.rightIndex === index) found = { kind: "shared-half", pair: pair };
    });
    return found;
  }

  function requestsFor(pages, plan) {
    var list = Array.isArray(pages) ? pages : [];
    var jobs = [];
    list.forEach(function (page, index) {
      var job = jobAt(plan, index);
      if (job && job.kind === "shared-half") return;
      if (job && job.kind === "spread") {
        var right = list[job.pair.rightIndex];
        jobs.push({
          kind: "spread",
          index: index,
          pair: job.pair,
          size: IMAGE.size,
          pageIds: [pageId(page, index), pageId(right, job.pair.rightIndex)],
          pages: job.pair.pages.slice(),
          prompt: prompt(job.pair, list)
        });
        return;
      }
      jobs.push({
        kind: "page",
        index: index,
        size: "1024x1536",
        pageIds: [pageId(page, index)],
        pages: [index + 1],
        prompt: ""
      });
    });
    return jobs;
  }

  function momentLine(left, right) {
    return "One coherent moment across both pages: " + sentence(textOf(left) || (left && left.action) || "") + " " + sentence(textOf(right) || (right && right.action) || "");
  }

  function sentence(text) {
    var value = String(text || "").trim();
    if (!value) return "";
    if (/[.!?]$/.test(value)) return value;
    return value + ".";
  }

  function prompt(pair, pages) {
    var list = pages || [];
    var left = list[pair.leftIndex] || {};
    var right = list[pair.rightIndex] || {};
    var map = displayMap();
    var people = castOf(left).concat(castOf(right)).filter(function (id, index, all) {
      return all.indexOf(id) === index;
    });
    return [
      "One illustration for two facing pages of a children's picture book. Do not paint a second, separate picture.",
      "Canvas: " + IMAGE.width + " by " + IMAGE.height + " (" + IMAGE.size + "). This is a 3:2 landscape. It is not a 2:1 painting.",
      map.note,
      "Both pages were read in full. They describe one moment, so paint that moment once across the whole picture.",
      "Different details of that moment may appear together when they happen at the same time.",
      "Do not split the pages into an earlier action and a later action. Do not duplicate a character.",
      "Left page, part of this same moment: " + sentence(textOf(left) || left.action || "the moment"),
      "Right page, part of this same moment: " + sentence(textOf(right) || right.action || "the moment"),
      people.length ? "Include: " + people.join(", ") + "." : "",
      "Keep every face, hand, expression, and important object out of the centre fold.",
      "Leave the lower part of each half open enough for the story words. Do not paint letters, numbers, or speech balloons."
    ].filter(Boolean).join(" ");
  }

  function pictureCall(pages, plan, index) {
    var list = pages || [];
    var job = jobAt(plan, index);
    if (job && job.kind === "shared-half") {
      return {
        draw: false,
        copy: true,
        size: IMAGE.size,
        pair: job.pair,
        pages: job.pair.pages.slice()
      };
    }
    if (job && job.kind === "spread") {
      var left = list[job.pair.leftIndex] || {};
      var right = list[job.pair.rightIndex] || {};
      var characters = castOf(left).concat(castOf(right)).filter(function (id, at, all) {
        return all.indexOf(id) === at;
      });
      return {
        draw: true,
        copy: false,
        size: IMAGE.size,
        pair: job.pair,
        pages: job.pair.pages.slice(),
        pageIds: [pageId(left, job.pair.leftIndex), pageId(right, job.pair.rightIndex)],
        characters: characters,
        prompt: prompt(job.pair, list),
        repairs: 1
      };
    }
    var page = list[index] || {};
    return {
      draw: true,
      copy: false,
      size: "1024x1536",
      pages: [index + 1],
      pageIds: [pageId(page, index)],
      characters: castOf(page),
      prompt: ""
    };
  }

  function shareImage(pages, pair, url) {
    var value = String(url || "");
    if (!value) return false;
    [pair.leftIndex, pair.rightIndex].forEach(function (index) {
      var page = pages[index];
      if (!page) return;
      page.imageDataUrl = value;
      page.imageUrlFallback = value;
      page.continuousImage = true;
    });
    return imageOf(pages[pair.leftIndex]) === value && imageOf(pages[pair.rightIndex]) === value;
  }

  function paintDirection(page, side, note) {
    if (!page) return;
    page.layout = "spread";
    page.continuous = true;
    page.doublePage = true;
    page.half = side;
    page.aspect = "3:2";
    page.fullBleed = true;
    page.edge = "bleed";
    page.crop = { maxSide: MAX_CROP };
    page.promptNote = note;
    page.reason = "spread from one shared " + IMAGE.size + " painting";
    page.spreadRequest = { status: "shared", size: IMAGE.size, pages: [] };
  }

  /* A story pair can share one painting only when those two pages are
     already the left and right of one opening, and each is a single leaf.
     Replacing those two leaves does not move any other page. A blank leaf
     is never inserted. */
  function leafIndexes(leaves, beatId) {
    var found = [];
    (leaves || []).forEach(function (leaf, index) {
      if (leaf && leaf.beatId === beatId) found.push(index);
    });
    return found;
  }

  function singleLeafOpening(composition, pair) {
    if (!composition) return true;
    var beats = composition.beats || [];
    var leftBeat = beats[pair.leftIndex];
    var rightBeat = beats[pair.rightIndex];
    if (!leftBeat || !rightBeat || !leftBeat.beatId || !rightBeat.beatId) return false;
    var left = leafIndexes(composition.leaves, leftBeat.beatId);
    var right = leafIndexes(composition.leaves, rightBeat.beatId);
    return left.length === 1 && right.length === 1 && left[0] % 2 === 0 && right[0] === left[0] + 1;
  }

  function bindComposition(composition, pages, plan) {
    var book = composition;
    if (!book || !book.beats || !book.leaves || !book.units) return { ok: false, reason: "no-composition" };
    var selected = plan && plan.selected || [];
    if (!selected.length) return { ok: true, bound: false };
    var bound = false;
    selected.forEach(function (pair) {
      var leftBeat = book.beats[pair.leftIndex];
      var rightBeat = book.beats[pair.rightIndex];
      if (!leftBeat || !rightBeat) return;
      if (!singleLeafOpening(book, pair)) return;
      var sharedId = "spread-" + pair.pages[0] + "-" + pair.pages[1];
      var oldIds = {};
      oldIds[leftBeat.unitId] = true;
      if (rightBeat.unitId) oldIds[rightBeat.unitId] = true;
      leftBeat.unitId = sharedId;
      rightBeat.unitId = sharedId;
      leftBeat.composition = "spread";
      rightBeat.composition = "spread";
      leftBeat.reason = pair.reason || leftBeat.reason;
      rightBeat.reason = pair.reason || rightBeat.reason;
      book.units = book.units.filter(function (unit) {
        if (!unit || !oldIds[unit.unitId]) return true;
        return book.beats.some(function (beat) { return beat && beat.unitId === unit.unitId; });
      });
      book.units.push({
        unitId: sharedId,
        beatId: leftBeat.beatId,
        composition: "spread",
        size: IMAGE.size,
        width: IMAGE.width,
        height: IMAGE.height,
        quietRegion: pair.quietRegion === "upper" || pair.quietRegion === "lower" ? pair.quietRegion : "",
        fold: "The centre of this 1536 by 1024 painting is the fold. Keep faces and hands out of it.",
        note: displayMap().note,
        imageSrc: "",
        checkpointId: sharedId
      });
      var before = {};
      book.beats.forEach(function (beat, index) {
        if (index < pair.leftIndex && beat) before[beat.beatId] = true;
      });
      var kept = [];
      book.leaves.forEach(function (leaf) {
        if (leaf && (leaf.beatId === leftBeat.beatId || leaf.beatId === rightBeat.beatId)) return;
        kept.push(leaf);
      });
      var at = 0;
      kept.forEach(function (leaf) {
        if (leaf && before[leaf.beatId]) at += 1;
      });
      var age = leftBeat.age || "7-9";
      var leftLeaf = {
        beatId: leftBeat.beatId,
        role: "spread-left",
        side: "left",
        composition: "spread",
        text: textOf(pages && pages[pair.leftIndex]) || leftBeat.text,
        unitId: sharedId,
        age: age,
        mood: "story",
        imageSize: IMAGE.size,
        discoveries: [],
        quietRegion: pair.quietRegion === "upper" || pair.quietRegion === "lower" ? pair.quietRegion : ""
      };
      var rightLeaf = {
        beatId: rightBeat.beatId,
        role: "spread-right",
        side: "right",
        composition: "spread",
        text: textOf(pages && pages[pair.rightIndex]) || rightBeat.text,
        unitId: sharedId,
        age: age,
        mood: "story",
        imageSize: IMAGE.size,
        discoveries: [],
        quietRegion: pair.quietRegion === "upper" || pair.quietRegion === "lower" ? pair.quietRegion : ""
      };
      kept.splice(at, 0, leftLeaf, rightLeaf);
      bound = true;
      book.leaves = kept;
      var openings = [];
      var index;
      for (index = 0; index < kept.length; index += 2) {
        openings.push({
          left: kept[index],
          right: kept[index + 1] || { role: "blank", text: "", composition: "", side: "right" },
          label: kept[index] && kept[index].composition || "Page"
        });
      }
      book.openings = openings;
      book.continuousSpread = {
        pages: pair.pages.slice(),
        unitId: sharedId,
        blankInserted: false
      };
    });
    return { ok: true, bound: bound, continuousSpread: book.continuousSpread || null };
  }

  function record(art, pages, plan) {
    var direction = art || { pages: [], spreads: [] };
    var list = pages || [];
    var decisions = plan || { selected: [], declined: [] };
    (decisions.declined || []).forEach(function (item) {
      (item.pages || []).forEach(function (number) {
        var page = direction.pages && direction.pages[number - 1];
        if (!page) return;
        page.continuous = false;
        page.spreadRequest = { status: "declined", reason: item.reason, pages: item.pages.slice() };
      });
      (direction.spreads || []).forEach(function (spread) {
        if (spread && spread.pages && spread.pages[0] === item.pages[0]) {
          spread.continuous = false;
          spread.spreadRequest = { status: "declined", reason: item.reason };
        }
      });
    });
    (decisions.selected || []).forEach(function (pair) {
      var leftPage = list[pair.leftIndex];
      var rightPage = list[pair.rightIndex];
      var leftImage = imageOf(leftPage);
      var rightImage = imageOf(rightPage);
      var shared = leftImage && leftImage === rightImage;
      var note = prompt(pair, list);
      if (!shared) {
        var reason = "A continuous spread was planned for pages " + pair.pages[0] + "–" + pair.pages[1] + ", but one shared illustration was not stored, so the pages stay separate.";
        [pair.leftIndex, pair.rightIndex].forEach(function (index) {
          var page = direction.pages && direction.pages[index];
          if (!page) return;
          page.continuous = false;
          if (page.layout === "spread") page.layout = "cinematic";
          page.spreadRequest = { status: "declined", reason: reason, pages: pair.pages.slice() };
        });
        return;
      }
      paintDirection(direction.pages[pair.leftIndex], "left", note);
      paintDirection(direction.pages[pair.rightIndex], "right", note);
      direction.pages[pair.leftIndex].image = leftImage;
      direction.pages[pair.rightIndex].image = rightImage;
      direction.pages[pair.leftIndex].imageSrc = leftImage;
      direction.pages[pair.rightIndex].imageSrc = rightImage;
      direction.pages[pair.leftIndex].spreadRequest.pages = pair.pages.slice();
      direction.pages[pair.rightIndex].spreadRequest.pages = pair.pages.slice();
      (direction.spreads || []).forEach(function (spread) {
        if (!spread || !spread.pages) return;
        if (spread.pages[0] === pair.pages[0] && spread.pages[1] === pair.pages[1]) {
          spread.continuous = true;
          spread.relationship = "continuous";
          spread.reason = "One painting crosses the fold.";
          spread.spreadRequest = { status: "shared", size: IMAGE.size, pages: pair.pages.slice() };
        }
      });
    });
    direction.spreadDecisions = {
      limit: decisions.limit,
      image: decisions.image || { size: IMAGE.size, width: IMAGE.width, height: IMAGE.height },
      selected: (decisions.selected || []).map(function (pair) {
        var same = imageOf(list[pair.leftIndex]) && imageOf(list[pair.leftIndex]) === imageOf(list[pair.rightIndex]);
        return {
          pages: pair.pages.slice(),
          status: same ? "shared" : "not-stored",
          reason: same ? pair.reason : "The shared illustration was not stored."
        };
      }),
      declined: (decisions.declined || []).map(function (item) {
        return { pages: item.pages.slice(), status: "declined", reason: item.reason };
      })
    };
    return direction;
  }

  return {
    IMAGE: IMAGE,
    PAGE: PAGE,
    DEFAULT_LIMIT: DEFAULT_LIMIT,
    facingPairs: facingPairs,
    pairContaining: pairContaining,
    displayMap: displayMap,
    review: review,
    jobAt: jobAt,
    requestsFor: requestsFor,
    pictureCall: pictureCall,
    prompt: prompt,
    momentLine: momentLine,
    coherence: coherence,
    shareImage: shareImage,
    bindComposition: bindComposition,
    confirmedQuiet: confirmedQuiet,
    assignQuiet: assignQuiet,
    restoreQuiet: restoreQuiet,
    record: record,
    textFit: textFit,
    copyHeight: copyHeight
  };
});
