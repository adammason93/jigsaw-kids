/* Book brain. Stories only — no lesson packs, claims, quizzes, or teaching beats.
   Pictures are planned here and not requested. Image spend stays off. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookBrain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function characterApi() {
    if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
    return require("./character-bible.js");
  }

  function crewApi() {
    if (root && root.WondiiCrew) return root.WondiiCrew;
    return require("./wondii-crew.js");
  }

  function castApi() {
    return require("./book-cast.js");
  }

  var PUBLIC_KEYS = ["castIds", "idea", "yearGroup", "ageBand", "length", "tone", "context"];
  var TONES = ["adventure", "funny", "magical", "mystery", "bedtime", "surprise"];
  var SHOTS = ["establishing", "medium", "close", "action", "overhead", "low", "high", "reveal", "reaction", "vignette"];
  var VISUAL_STYLE = "wondii-picture-book";
  var IMAGES_ENABLED = false;

  var YEAR_GROUPS = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

  var YEAR_LIMITS = {
    Reception: { maxSentenceWords: 8, maxSentences: 2, maxDialogueTurns: 0, maxPageWords: 20 },
    "Year 1": { maxSentenceWords: 10, maxSentences: 2, maxDialogueTurns: 1, maxPageWords: 28 },
    "Year 2": { maxSentenceWords: 12, maxSentences: 3, maxDialogueTurns: 1, maxPageWords: 40 },
    "Year 3": { maxSentenceWords: 16, maxSentences: 3, maxDialogueTurns: 2, maxPageWords: 52 },
    "Year 4": { maxSentenceWords: 18, maxSentences: 4, maxDialogueTurns: 2, maxPageWords: 64 },
    "Year 5": { maxSentenceWords: 22, maxSentences: 4, maxDialogueTurns: 3, maxPageWords: 72 },
    "Year 6": { maxSentenceWords: 26, maxSentences: 5, maxDialogueTurns: 3, maxPageWords: 96 }
  };

  var LENGTHS = {
    quick: {
      id: "quick",
      title: "Quick story",
      line: "A little story for when time is short",
      scope: "About 6–8 spreads",
      minSpreads: 6,
      maxSpreads: 8,
      minPlotMoves: 4,
      roles: ["hook", "discovery", "attempt", "turn", "climax", "resolution"]
    },
    storybook: {
      id: "storybook",
      title: "Storybook",
      line: "A full illustrated story",
      scope: "About 10–12 spreads",
      recommended: true,
      minSpreads: 9,
      maxSpreads: 13,
      minPlotMoves: 6,
      roles: ["hook", "discovery", "attempt", "complication", "reveal", "setback", "climax", "resolution"]
    },
    adventure: {
      id: "adventure",
      title: "Big adventure",
      line: "A longer journey with more twists and discoveries",
      scope: "About 14–18 spreads",
      minSpreads: 14,
      maxSpreads: 18,
      minPlotMoves: 9,
      roles: ["hook", "discovery", "exploration", "attempt", "complication", "setback", "reveal", "approach", "climax", "resolution"]
    }
  };

  /* School years and family age bands are two ways in. These pairs share
     writing constraints. Nearby years that overlap in age stay separate:
     5–6 follows Year 1, not Year 2. Year 4 stays its own year. */
  var AGE_BANDS = {
    "3-4": { stage: "reception", constraintYear: "Reception", ageRange: "3–4", narrativeComplexity: "a few concrete moments a child can see" },
    "5-6": { stage: "year1", constraintYear: "Year 1", ageRange: "5–6", narrativeComplexity: "a simple cause the reader can follow" },
    "7-8": { stage: "year3", constraintYear: "Year 3", ageRange: "7–8", narrativeComplexity: "a problem with a consequence the reader can connect" },
    "9-10": { stage: "year5", constraintYear: "Year 5", ageRange: "9–10", narrativeComplexity: "a question that can last across the book" },
    "11-12": { stage: "year6", constraintYear: "Year 6", ageRange: "11–12", narrativeComplexity: "mixed feelings and a little inference" },
    /* Family bands keep the older child's level. 7–9 is not written as 7–8, and 10–12 is not written as 9–10. */
    "4-6": { stage: "year1", constraintYear: "Year 1", ageRange: "4–6", narrativeComplexity: "a simple cause the reader can follow" },
    "7-9": { stage: "year5", constraintYear: "Year 5", ageRange: "7–9", narrativeComplexity: "a question that can last across the book" },
    "10-12": { stage: "year6", constraintYear: "Year 6", ageRange: "10–12", narrativeComplexity: "mixed feelings and a little inference" }
  };

  var YEAR_STAGE = {
    Reception: { stage: "reception", constraintYear: "Reception", ageRange: "4–5", narrativeComplexity: "a few concrete moments a child can see" },
    "Year 1": { stage: "year1", constraintYear: "Year 1", ageRange: "5–6", narrativeComplexity: "a simple cause the reader can follow" },
    "Year 2": { stage: "year2", constraintYear: "Year 2", ageRange: "6–7", narrativeComplexity: "a simple cause, with one feeling shown in what someone does" },
    "Year 3": { stage: "year3", constraintYear: "Year 3", ageRange: "7–8", narrativeComplexity: "a problem with a consequence the reader can connect" },
    "Year 4": { stage: "year4", constraintYear: "Year 4", ageRange: "8–9", narrativeComplexity: "a worry or a joke can sit under the action" },
    "Year 5": { stage: "year5", constraintYear: "Year 5", ageRange: "9–10", narrativeComplexity: "a question that can last across the book" },
    "Year 6": { stage: "year6", constraintYear: "Year 6", ageRange: "10–11", narrativeComplexity: "mixed feelings and a little inference" }
  };

  var ALLOWED_ROLES = {
    hook: 1, world: 1, discovery: 1, reaction: 1, goal: 1, exploration: 1, attempt: 1,
    consequence: 1, complication: 1, relationship: 1, setback: 1, reveal: 1, setup: 1,
    payoff: 1, approach: 1, climax: 1, resolution: 1, breath: 1, turn: 1, wonder: 1,
    humour: 1, anticipation: 1
  };

  var QUIET_ROLES = { reaction: 1, breath: 1, wonder: 1, humour: 1, anticipation: 1 };

  var STAGE_LABELS = {
    dreaming: "Dreaming up your adventure…",
    planning: "Planning the journey…",
    writing: "Writing your story…",
    visualPlanning: "Bringing the world to life…",
    illustrating: "Illustrating your book…",
    assembling: "Putting the pages together…",
    ready: "Your book is ready."
  };

  var STOP = {
    a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, they: 1, them: 1, their: 1,
    she: 1, he: 1, it: 1, to: 1, of: 1, under: 1, underneath: 1, in: 1, on: 1,
    at: 1, with: 1, for: 1, from: 1, by: 1, as: 1, is: 1, was: 1, were: 1,
    be: 1, this: 1, that: 1, then: 1, when: 1, who: 1, what: 1, her: 1, his: 1
  };

  var FILLER = [
    "little did they know",
    "suddenly",
    "with a twinkle",
    "adventure awaits",
    "couldn't believe their eyes",
    "could not believe their eyes",
    "the adventure had only just begun"
  ];

  var YEAR_WRITING = {
    Reception: "A few very short sentences a child can hear in one breath. Concrete words. No dialogue. Say what happened. Do not ask the reader to guess a hidden meaning.",
    "Year 1": "Short sentences and familiar words. At most one spoken line. One clear feeling, shown by what the character does.",
    "Year 2": "Mostly short sentences, with one slightly longer line allowed. A little dialogue. The reader can follow a simple cause.",
    "Year 3": "Mixed sentence lengths. Dialogue can carry a decision. The reader can connect two events without being told the moral.",
    "Year 4": "Varied rhythm. Feelings can be implied. Humour or worry can sit under the action. Still a picture book, not a chapter novel.",
    "Year 5": "The reader can hold a question across pages. Dialogue can disagree. The ending should answer the question the opening raised.",
    "Year 6": "Varied syntax and a little inference. Emotions can be mixed. It must still sound like a children's book, not a story for teenagers."
  };

  var TONE_WRITING = {
    adventure: "The problem gets harder because of what the characters do. There is movement and a real cost before the ending.",
    funny: "The humour is in a mistake or a mismatch. Do not announce that something is funny.",
    magical: "One impossible thing is treated as real, and its rule stays the same from the first time it appears.",
    mystery: "A question is planted in the hook. The climax answers that same question. Do not swap in a different puzzle at the end.",
    bedtime: "Quiet pace. The trouble is gentle. No chase and no last-minute danger. The last page should settle the feeling.",
    surprise: "Choose the shape the idea needs. Do not default to a chase."
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function words(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean);
  }

  function wordCount(text) {
    return words(text).length;
  }

  function contentWords(text) {
    return words(String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ")).filter(function (word) {
      return word.length > 3 && !STOP[word];
    });
  }

  function ideaAppears(word, text) {
    var lower = String(text || "").toLowerCase();
    if (lower.indexOf(word) >= 0) return true;
    var bare = word.replace(/'s$/, "");
    return bare !== word && bare.length > 3 && lower.indexOf(bare) >= 0;
  }

  function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function publicRequest(input) {
    var source = input || {};
    var tone = source.tone ? String(source.tone) : null;
    if (tone && TONES.indexOf(tone) < 0) tone = null;
    var ageBand = source.ageBand ? String(source.ageBand) : "";
    if (ageBand && !AGE_BANDS[ageBand]) ageBand = "";
    var yearGroup = String(source.yearGroup || "");
    if (yearGroup && !YEAR_LIMITS[yearGroup]) yearGroup = "";
    var context = source.context === "school" || source.context === "family" ? source.context : (yearGroup ? "school" : (ageBand ? "family" : null));
    return {
      castIds: Array.isArray(source.castIds) ? source.castIds.map(String) : [],
      idea: String(source.idea || "").trim(),
      yearGroup: yearGroup,
      ageBand: ageBand,
      length: String(source.length || ""),
      tone: tone,
      context: context
    };
  }

  function textLimits(yearGroup) {
    return YEAR_LIMITS[yearGroup] || null;
  }

  function readerProfile(input) {
    var ask = input && input.castIds ? input : publicRequest(input || {});
    if (input && input.yearGroup && !input.castIds && YEAR_STAGE[input.yearGroup]) ask = publicRequest({ yearGroup: input.yearGroup, ageBand: input.ageBand, length: input.length, context: input.context });
    var year = YEAR_STAGE[ask.yearGroup] || null;
    var band = !ask.yearGroup ? AGE_BANDS[ask.ageBand] : null;
    var chosen = year || band;
    if (!chosen) return null;
    var limits = textLimits(chosen.constraintYear);
    return {
      source: year ? "year" : "age",
      stage: chosen.stage,
      yearGroup: ask.yearGroup || "",
      ageBand: ask.ageBand || "",
      constraintYear: chosen.constraintYear,
      approximateAgeRange: chosen.ageRange,
      narrativeComplexity: chosen.narrativeComplexity,
      limits: limits
    };
  }

  function limitsFor(book) {
    var profile = readerProfile({
      yearGroup: book && (book.yearGroup || book.constraintYear),
      ageBand: book && book.ageBand
    });
    return profile ? profile.limits : textLimits(book && book.yearGroup);
  }

  function lengthProfile(lengthId) {
    return LENGTHS[lengthId] ? clone(LENGTHS[lengthId]) : null;
  }

  function actionOverlap(left, right) {
    var a = contentWords(left);
    var b = contentWords(right);
    if (!a.length || !b.length) return 0;
    var shared = a.filter(function (word) { return b.indexOf(word) >= 0; }).length;
    return shared / Math.max(a.length, b.length);
  }

  function lengthShape(beats, profile) {
    var problems = [];
    var list = beats || [];
    if (!profile || list.length < profile.minSpreads || list.length > profile.maxSpreads) problems.push("length-shape");
    if (!list.length || list[0].role !== "hook" || list[list.length - 1].role !== "resolution") problems.push("length-shape");
    if (!list.some(function (beat) { return beat.role === "climax"; })) problems.push("length-shape");
    list.forEach(function (beat) {
      if (!ALLOWED_ROLES[beat.role]) problems.push("length-shape");
    });
    var plot = 0;
    list.forEach(function (beat, index) {
      var copy = index > 0 && actionOverlap(list[index - 1].action, beat.action) >= 0.72;
      if (copy) {
        problems.push("beat-split:" + (beat.beatId || index));
        return;
      }
      if (QUIET_ROLES[beat.role] || QUIET_ROLES[beat.experience]) return;
      plot += 1;
    });
    if (profile && plot < profile.minPlotMoves) problems.push("depth-thin");
    require("./book-journey.js").depthProblems(list).forEach(function (problem) {
      if (problems.indexOf(problem) < 0) problems.push(problem);
    });
    return problems;
  }

  function generationView(job) {
    var stage = job && job.stage ? job.stage : "dreaming";
    var pageLabel = null;
    if (stage === "illustrating" && job.pageCount && job.illustrating && job.illustrating.index) {
      pageLabel = "Illustrating page " + job.illustrating.index + " of " + job.pageCount;
    }
    return {
      stage: stage,
      label: pageLabel || STAGE_LABELS[stage] || STAGE_LABELS.dreaming,
      percent: null,
      determinate: false,
      pageLabel: pageLabel
    };
  }

  function savedReferences(input) {
    var rows = Array.isArray(input && input.characterReferences) ? input.characterReferences : [];
    var out = {};
    rows.forEach(function (row) {
      if (!row || !row.characterId || !row.reference || !row.ownerId) return;
      if (row.ownerType !== "school" && row.ownerType !== "family") return;
      out[String(row.characterId)] = {
        characterId: String(row.characterId),
        characterType: "workspace",
        origin: "saved",
        reference: String(row.reference),
        ownerType: row.ownerType,
        ownerId: String(row.ownerId)
      };
    });
    return out;
  }

  /* A system character is referenced. It is not copied into a workspace. */
  function systemMember(id) {
    var crew = crewApi();
    var row = crew && crew.get(id);
    if (!row) return null;
    var member = crew.bookCast(row);
    if (!member.bibleId) return member;
    var bible = characterApi();
    var approved = bible.resolveReference(member.bibleId);
    if (approved && approved.status === "approved" && approved.file) {
      member.reference = approved.file;
      member.referenceStatus = approved.status;
      member.referenceVersionId = approved.versionId || "";
    }
    return member;
  }

  function referenceMap(input) {
    var refs = savedReferences(input);
    var request = publicRequest(input);
    request.castIds.forEach(function (id) {
      if (refs[id]) return;
      var system = systemMember(id);
      if (system) refs[id] = system;
    });
    return refs;
  }

  function acceptCreation(input) {
    var request = publicRequest(input);
    var refs = referenceMap(input);
    var lock = characterApi().lockCast(request.castIds);
    var problems = lock.problems.filter(function (problem) {
      var id = problem.indexOf("unknown-cast:") === 0 ? problem.slice("unknown-cast:".length) : "";
      return !(id && refs[id]);
    });
    var cast = lock.cast.slice();
    request.castIds.forEach(function (id) {
      if (refs[id] && !cast.some(function (row) { return row.characterId === id; })) cast.push(refs[id]);
    });
    if (request.castIds.length < 1 || request.castIds.length > 4) problems.push("cast-size");
    if (!request.idea) problems.push("idea-missing");
    if (!readerProfile(request)) problems.push("year");
    if (!lengthProfile(request.length)) problems.push("length");
    request.characterReferences = request.castIds.map(function (id) { return refs[id]; }).filter(Boolean);
    return {
      ok: problems.length === 0,
      request: request,
      cast: cast,
      problems: problems,
      imageCalls: 0,
      stage: problems.length ? "failed" : "planning",
      writer: "off"
    };
  }

  function entityIds(list) {
    return (list || []).map(function (entity) { return entity.entityId; });
  }

  function validateBible(bible, request) {
    var problems = [];
    var book = bible || {};
    var ask = request || {
      castIds: book.castIds,
      idea: book.userIdea,
      yearGroup: book.yearGroup,
      length: book.targetLength,
      tone: book.tone
    };
    var profile = lengthProfile(ask.length || book.targetLength);
    var beats = book.beats || [];
    var locations = book.locations || [];
    var entities = book.entities || [];
    var cast = characterApi().lockCast(book.castIds || []);

    if (!book.userIdea && !ask.idea) problems.push("idea-missing");
    var idea = ask.idea || book.userIdea || "";
    var ideaWords = contentWords(idea);
    var storyText = [book.premise, book.hook].concat(beats.map(function (beat) {
      return beat.action || "";
    })).join(" ");
    var found = ideaWords.filter(function (word) {
      return ideaAppears(word, storyText);
    });
    if (ideaWords.length && found.length < Math.min(2, ideaWords.length)) problems.push("idea-not-central");

    if (!book.goal) problems.push("goal-missing");
    if (!book.centralProblem) problems.push("problem-missing");
    if (!cast.ok) problems = problems.concat(cast.problems);
    (book.castIds || []).forEach(function (id) {
      var seen = false;
      var missingReason = false;
      beats.forEach(function (beat) {
        var present = (beat.charactersPresent || []).indexOf(id) >= 0;
        if (present) seen = true;
        else if (!(beat.absent && beat.absent[id])) missingReason = true;
      });
      if (!seen || missingReason) problems.push("cast-missing:" + id);
      var character = characterApi().getCharacter(id);
      var expressed = beats.some(function (beat) {
        return (beat.expresses || []).some(function (note) {
          return note.characterId === id && character && character.personality.indexOf(note.trait) >= 0;
        });
      });
      if (character && character.personality.length && !expressed) problems.push("personality-unused:" + id);
    });

    if (!profile) problems.push("length-shape");
    else problems = problems.concat(lengthShape(beats, profile));
    require("./book-progression.js").review({ bible: book }).blockProblems.forEach(function (problem) {
      if (problems.indexOf(problem) < 0) problems.push(problem);
    });

    var climax = beats.filter(function (beat) { return beat.beatId === book.climaxBeatId; })[0];
    var resolution = beats.filter(function (beat) { return beat.beatId === book.resolutionBeatId; })[0];
    var climaxAt = beats.indexOf(climax);
    var resolutionAt = beats.indexOf(resolution);
    if (!climax) problems.push("climax-missing");
    if (!resolution) problems.push("resolution-missing");
    if (climax && resolution && !(climaxAt > 0 && resolutionAt > climaxAt)) problems.push("ending-not-planned");
    if (ideaWords.length && climax && contentWords(climax.action).filter(function (word) {
      return ideaWords.indexOf(word) >= 0;
    }).length < 1) problems.push("idea-not-structural");
    if (ideaWords.length && resolution && contentWords(resolution.action).filter(function (word) {
      return ideaWords.indexOf(word) >= 0;
    }).length < 1) problems.push("idea-not-structural");
    if (climax && (!climax.because || beats.slice(0, climaxAt).every(function (beat) {
      return climax.because.indexOf(beat.beatId) < 0;
    }))) problems.push("climax-unearned");
    if (resolution && !resolution.resolvesProblem) problems.push("resolution-missing");

    beats.forEach(function (beat, index) {
      if (index > 0 && beat.because !== beats[index - 1].beatId) problems.push("not-causal:" + beat.beatId);
      if (index > 0 && beat.problemFamily && beat.problemFamily === beats[index - 1].problemFamily) {
        problems.push("story-repetition:" + beat.beatId);
      }
      var beforeIds = entityIds(beat.stateBefore && beat.stateBefore.entities);
      var afterIds = entityIds(beat.stateAfter && beat.stateAfter.entities);
      afterIds.forEach(function (id) {
        var record = entities.filter(function (entity) { return entity.entityId === id; })[0];
        if (!record) problems.push("object-unintroduced:" + id);
        else if (beforeIds.indexOf(id) < 0 && record.introducedAt !== beat.beatId) problems.push("object-unintroduced:" + id);
        else if (record.introducedAt) {
          var intro = beats.filter(function (item) { return item.beatId === record.introducedAt; })[0];
          if (intro && beats.indexOf(intro) > index) problems.push("object-unintroduced:" + id);
        }
      });
      (beat.stateBefore && beat.stateBefore.characters || []).forEach(function (before) {
        var after = (beat.stateAfter && beat.stateAfter.characters || []).filter(function (item) {
          return item.characterId === before.characterId;
        })[0];
        if (!after || before.locationId === after.locationId) return;
        var place = locations.filter(function (item) { return item.locationId === before.locationId; })[0];
        if (!place || place.connectedTo.indexOf(after.locationId) < 0) problems.push("teleport:" + before.characterId);
      });
    });

    if (!readerProfile({ yearGroup: book.yearGroup || ask.yearGroup, ageBand: book.ageBand || ask.ageBand })) problems.push("year");
    return { ok: problems.length === 0, problems: problems };
  }

  function continuityProblems(pages) {
    var problems = [];
    (pages || []).forEach(function (page, index) {
      if (!index) return;
      if (!sameJson(page.stateBefore, pages[index - 1].stateAfter)) {
        problems.push("state-handoff:" + page.pageId);
      }
    });
    return problems;
  }

  function compositionProblems(pages) {
    var problems = [];
    (pages || []).forEach(function (page, index) {
      if (SHOTS.indexOf(page.shotType) < 0) problems.push("shot:" + page.pageId);
      if (index && page.shotType === pages[index - 1].shotType) problems.push("composition-repeat:" + page.pageId);
    });
    return problems;
  }

  function planPages(bible) {
    var review = validateBible(bible);
    if (!review.ok) return { ok: false, problems: review.problems, pages: null };
    var beats = bible.beats;
    var pages = beats.map(function (beat, index) {
      var previous = index ? beats[index - 1] : null;
      return {
        pageId: "p" + (index + 1),
        beatId: beat.beatId,
        locationId: beat.locationId,
        charactersPresent: beat.charactersPresent.slice(),
        stateBefore: clone(beat.stateBefore),
        action: beat.action,
        stateAfter: clone(beat.stateAfter),
        emotion: beat.emotion,
        entitiesRequired: (beat.entitiesRequired || []).slice(),
        visualFocus: beat.visualFocus,
        shotType: beat.shotType,
        compositionIntent: beat.compositionIntent,
        textPurpose: beat.textPurpose,
        pageTurnHook: beat.pageTurnHook || "",
        needsFromPrevious: previous ? clone(previous.stateAfter) : null,
        mustHoldForNext: clone(beat.stateAfter),
        textSafeRegion: beat.textSafeRegion,
        sentences: clone(beat.sentences || [])
      };
    });
    var progress = require("./book-progression.js").review({ bible: bible, pages: pages });
    var bySpread = {};
    progress.storyProgressionMap.forEach(function (row) { bySpread[row.spreadId] = row; });
    var byVisual = {};
    progress.visualProgressionMap.forEach(function (row) { byVisual[row.spreadId] = row; });
    pages.forEach(function (page) {
      var row = bySpread[page.pageId];
      var visual = byVisual[page.pageId];
      if (!row) return;
      page.narrativePhase = row.narrativePhase;
      page.locationZone = row.locationZone;
      page.pageTurnIntent = row.pageTurnIntent;
      page.layoutIntent = row.layoutIntent;
      page.progressionReason = row.progressionReason;
      page.worldState = row.worldStateAfter;
      if (visual) page.visualNoveltyReason = visual.visualNoveltyReason;
    });
    var problems = continuityProblems(pages).concat(compositionProblems(pages));
    var hooks = pages.filter(function (page) { return page.pageTurnHook; }).length;
    if (pages.length > 2 && hooks === pages.length) problems.push("page-turn-every-page");
    if (problems.length) return { ok: false, problems: problems, pages: null };
    return { ok: true, problems: [], pages: pages };
  }

  function sealPlan(bible, pages) {
    var problems = [];
    if (!bible || !bible.resolutionBeatId || !(pages || []).some(function (page) {
      return page.beatId === bible.resolutionBeatId;
    })) problems.push("ending-not-planned");
    if (!bible || !bible.climaxBeatId || !(pages || []).some(function (page) {
      return page.beatId === bible.climaxBeatId;
    })) problems.push("climax-missing");
    return { ok: problems.length === 0, sealed: problems.length === 0, problems: problems };
  }

  function allowedWords(page, bible) {
    var bag = {};
    function take(text) {
      words(String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ")).forEach(function (word) {
        bag[word] = 1;
      });
    }
    take(bible.userIdea);
    take(page.action);
    take(page.emotion);
    take(page.textPurpose);
    (bible.locations || []).forEach(function (place) {
      if (place.locationId === page.locationId) take(place.name);
    });
    (page.charactersPresent || []).forEach(function (id) {
      var character = characterApi().getCharacter(id);
      if (character) take(character.name);
    });
    (page.entitiesRequired || []).forEach(function (id) {
      (bible.entities || []).forEach(function (entity) {
        if (entity.entityId === id) take(entity.name);
      });
    });
    Object.keys(STOP).forEach(function (word) { bag[word] = 1; });
    return bag;
  }

  function commitProse(bible, pages, sealed) {
    if (!sealed) {
      return { ok: false, problems: ["ending-not-planned"], pages: pages || [] };
    }
    var limits = limitsFor(bible);
    var problems = [];
    var next = (pages || []).map(function (page) {
      var copy = clone(page);
      var prose = [];
      (page.sentences || []).forEach(function (sentence) {
        var text = String(sentence.text || "").trim();
        if (!text) return;
        (sentence.entities || []).forEach(function (id) {
          var known = (bible.entities || []).some(function (entity) { return entity.entityId === id; });
          var onPage = (page.entitiesRequired || []).indexOf(id) >= 0;
          if (!known || !onPage) problems.push("unplanned-object:" + id);
        });
        (sentence.locations || []).forEach(function (id) {
          if (id !== page.locationId) problems.push("unplanned-location:" + id);
        });
        var allow = allowedWords(page, bible);
        words(text.toLowerCase().replace(/[^a-z0-9' ]/g, " ")).forEach(function (word) {
          if (!allow[word]) problems.push("unplanned-object:" + word);
        });
        (bible.entities || []).forEach(function (entity) {
          if ((page.entitiesRequired || []).indexOf(entity.entityId) >= 0) return;
          if (text.toLowerCase().indexOf(String(entity.name).toLowerCase()) >= 0) {
            problems.push("unplanned-object:" + entity.entityId);
          }
        });
        (bible.locations || []).forEach(function (place) {
          if (place.locationId === page.locationId) return;
          if (place.name && text.toLowerCase().indexOf(place.name.toLowerCase()) >= 0) {
            problems.push("unplanned-location:" + place.locationId);
          }
        });
        prose.push(text);
      });
      problems = problems.concat(loadProblems(limits, prose.join(" "), page.pageId));
      copy.prose = prose.join(" ");
      return copy;
    });
    return { ok: problems.length === 0, problems: problems, pages: next };
  }

  function sentencesOf(prose) {
    return String(prose || "").split(/[.!?]+/).map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function loadProblems(limits, prose, pageId) {
    if (!limits) return [];
    var sentences = sentencesOf(prose);
    var problems = [];
    var total = 0;
    sentences.forEach(function (sentence) {
      var count = wordCount(sentence);
      total += count;
      if (count > limits.maxSentenceWords) problems.push("age-sentence:" + pageId);
    });
    var clauses = (String(prose || "").match(/\b(because|although|though|which|while|whereas|whenever|unless)\b/gi) || []).length;
    var average = sentences.length ? total / sentences.length : 0;
    var heavy = (total + clauses * 4) > limits.maxPageWords;
    if (!heavy && sentences.length > limits.maxSentences && average > limits.maxSentenceWords * 0.75) heavy = true;
    if (heavy) problems.push("reading-load:" + pageId);
    return problems;
  }

  var ECHO_SKIP = {
    you: 1, your: 1, yours: 1, our: 1, when: 1, where: 1, some: 1, day: 1, days: 1,
    once: 1, just: 1, then: 1, there: 1, here: 1, very: 1, into: 1, over: 1, upon: 1,
    through: 1, about: 1, after: 1, before: 1, again: 1, still: 1, even: 1, only: 1,
    really: 1, also: 1
  };

  function echoTokens(text) {
    return words(String(text || "").toLowerCase().replace(/'s\b/g, "").replace(/[^a-z0-9 ]/g, " ")).filter(function (word) {
      return word.length > 3 && !STOP[word] && !ECHO_SKIP[word];
    });
  }

  function trigrams(tokens) {
    var out = [];
    var index;
    for (index = 0; index + 2 < tokens.length; index += 1) out.push(tokens[index] + " " + tokens[index + 1] + " " + tokens[index + 2]);
    return out;
  }

  function sharedTrigrams(leftText, rightText, names) {
    var seen = {};
    var hits = [];
    trigrams(echoTokens(leftText)).forEach(function (item) { seen[item] = 1; });
    trigrams(echoTokens(rightText)).forEach(function (item) {
      if (!seen[item] || hits.indexOf(item) >= 0) return;
      var parts = item.split(" ");
      if (names && parts.every(function (part) { return names[part]; })) return;
      hits.push(item);
    });
    return hits;
  }

  function promptEcho(idea, prose, yearGroup) {
    if (yearGroup === "Reception") return false;
    var ideaTri = trigrams(echoTokens(idea));
    if (ideaTri.length < 2) return false;
    var pageTri = {};
    trigrams(echoTokens(prose)).forEach(function (item) { pageTri[item] = 1; });
    var hit = 0;
    ideaTri.forEach(function (item) { if (pageTri[item]) hit += 1; });
    return hit >= 2;
  }

  function verbLemma(word) {
    var token = String(word || "").toLowerCase();
    if (/^(find|finds|found)$/.test(token)) return "find";
    if (/^(climb|climbs|climbed)$/.test(token)) return "climb";
    if (/^(look|looks|looked)$/.test(token)) return "look";
    return "";
  }

  function patternProblems(pages, yearGroup) {
    if (yearGroup === "Reception") return [];
    var perPage = (pages || []).map(function (page) {
      var found = {};
      sentencesOf(page.prose).forEach(function (sentence) {
        var parts = words(sentence);
        var lemma = parts.length > 1 ? verbLemma(parts[1]) : "";
        if (lemma) found[lemma] = 1;
      });
      return found;
    });
    var problems = [];
    var seen = {};
    perPage.forEach(function (found, index) {
      Object.keys(found).forEach(function (verb) {
        var next;
        for (next = index + 1; next < perPage.length && next <= index + 2; next += 1) {
          if (!perPage[next][verb]) continue;
          var key = verb + ":" + pages[next].pageId;
          if (seen[key]) continue;
          seen[key] = 1;
          problems.push("pattern-repeat:" + pages[next].pageId);
        }
      });
    });
    return problems;
  }

  function reviewText(bible, pages) {
    var problems = [];
    var limits = limitsFor(bible);
    var openings = [];
    var names = (bible.castIds || []).map(function (id) {
      var character = characterApi().getCharacter(id);
      return character ? character.name : "";
    });
    (pages || []).forEach(function (page) {
      var prose = String(page.prose || "");
      var lower = prose.toLowerCase();
      if (!prose) problems.push("empty-prose:" + page.pageId);
      FILLER.forEach(function (phrase) {
        if (lower.indexOf(phrase) >= 0) problems.push("filler:" + page.pageId);
      });
      if (page.compositionIntent && lower.indexOf(String(page.compositionIntent).toLowerCase()) >= 0) {
        problems.push("prose-is-direction:" + page.pageId);
      }
      var sentences = sentencesOf(prose);
      var quotes = (prose.match(/"/g) || []).length / 2;
      if (limits && quotes > limits.maxDialogueTurns) problems.push("age-dialogue:" + page.pageId);
      problems = problems.concat(loadProblems(limits, prose, page.pageId));
      if (promptEcho(bible.userIdea, prose, bible.yearGroup)) problems.push("prompt-echo:" + page.pageId);
      if (/\bwhen you\b|\bsome days you\b|\byou should\b|\bremember to\b/i.test(prose)) problems.push("reader-address:" + page.pageId);
      sentences.forEach(function (sentence) {
        var first = words(sentence)[0] || "";
        if (names.indexOf(first) >= 0) openings.push(first);
        else openings.push("");
      });
    });
    problems = problems.concat(patternProblems(pages, bible.yearGroup));
    var run = 1;
    for (var i = 1; i < openings.length; i++) {
      if (openings[i] && openings[i] === openings[i - 1]) run += 1;
      else run = 1;
      if (run >= 3) problems.push("name-openings");
    }
    var ideaWords = contentWords(bible.userIdea);
    var joined = (pages || []).map(function (page) { return page.prose || ""; }).join(" ");
    var ideaHits = ideaWords.filter(function (word) { return ideaAppears(word, joined); });
    if (ideaWords.length && ideaHits.length < Math.min(2, ideaWords.length)) problems.push("idea-not-central");
    var climaxPage = (pages || []).filter(function (item) { return item.beatId === bible.climaxBeatId; })[0];
    var resolutionPage = (pages || []).filter(function (item) { return item.beatId === bible.resolutionBeatId; })[0];
    var nameSet = {};
    names.forEach(function (name) { if (name) nameSet[name.toLowerCase()] = 1; });
    if (bible.yearGroup !== "Reception" && climaxPage && resolutionPage && sharedTrigrams(climaxPage.prose, resolutionPage.prose, nameSet).length >= 2) {
      problems.push("ending-repeated:" + resolutionPage.pageId);
    }
    [climaxPage, resolutionPage].forEach(function (page) {
      if (!page) return;
      var prose = String(page.prose || "");
      if (/\b(wasn'?t|isn'?t|weren'?t|no longer)\b[^.]{0,48}\b(lonely|scared|afraid|happy|proud|sad)\b|\bnot\s+(?:so\s+|very\s+)?(lonely|scared|afraid|happy|proud|sad)\b|\b(was|were|felt|seemed)\s+(lonely|scared|afraid|happy|proud|glad)\b|\beveryone (was|were|felt) (happy|glad|proud)\b|\bthey (were|was) (all )?(happy|glad|proud)\b/i.test(prose)) {
        problems.push("emotion-told:" + page.pageId);
      }
    });
    if (/\b(was|were|felt|seemed)\s+(curious|brave|careful|kind|inventive|bold|observant|gentle)\b/i.test(joined)) {
      problems.push("trait-told");
    }
    (bible.castIds || []).forEach(function (id) {
      var character = characterApi().getCharacter(id);
      if (character && joined.indexOf(character.name) < 0) problems.push("cast-missing:" + id);
    });
    if (!(pages || []).some(function (page) { return page.beatId === bible.climaxBeatId; })) problems.push("climax-missing");
    if (!(pages || []).some(function (page) { return page.beatId === bible.resolutionBeatId && page.prose; })) {
      problems.push("resolution-missing");
    }
    problems = problems.concat(continuityProblems(pages));
    problems = problems.concat(require("./book-visual.js").unplannedVisualProblems(bible, pages));
    return { ok: problems.length === 0, problems: problems };
  }

  function coverPlan(bible, pages) {
    return require("./book-visual.js").planCover(bible, pages || (bible && bible.pages) || []);
  }

  function visualBrief(page, bible, journeySpread) {
    var brief = {
      visualStyle: bible.visualStyle || VISUAL_STYLE,
      castIds: (page.charactersPresent || []).slice(),
      locationId: page.locationId,
      stateBefore: clone(page.stateBefore),
      action: page.action,
      stateAfter: clone(page.stateAfter),
      entitiesRequired: (page.entitiesRequired || []).slice(),
      shotType: page.shotType,
      compositionIntent: page.compositionIntent,
      textSafeRegion: page.textSafeRegion,
      needsFromPrevious: page.needsFromPrevious,
      mustHoldForNext: page.mustHoldForNext
    };
    if (journeySpread) {
      brief.pageRole = journeySpread.pageRole;
      brief.visualImportance = journeySpread.visualImportance;
      brief.gutterSafe = journeySpread.gutterSafe;
      brief.visualPhase = journeySpread.phase;
      brief.plannedTextRegion = journeySpread.plannedTextRegion;
    }
    ["narrativePhase", "locationZone", "pageTurnIntent", "layoutIntent", "progressionReason", "visualNoveltyReason", "worldState"].forEach(function (key) {
      if (page[key]) brief[key] = page[key];
    });
    return brief;
  }

  function requestImages(result, provider) {
    var textOk = result && result.textReview && result.textReview.ok && result.storyReview && result.storyReview.ok;
    if (!textOk) return { ok: false, reason: "text_review", imageCalls: 0 };
    if (!IMAGES_ENABLED) return { ok: false, reason: "images_disabled", imageCalls: 0 };
    if (provider && provider.draw) provider.draw(result);
    return { ok: true, reason: "", imageCalls: 1 };
  }

  function repairRequest(book, pageId) {
    var pages = book.pages || [];
    var index = -1;
    pages.forEach(function (page, i) {
      if (page.pageId === pageId) index = i;
    });
    var page = index >= 0 ? pages[index] : null;
    return {
      pageId: pageId,
      pageIds: page ? [pageId] : [],
      castIds: (book.castIds || []).slice(),
      visualStyle: VISUAL_STYLE,
      styleScope: "book",
      locationId: page ? page.locationId : "",
      stateBefore: page ? clone(page.stateBefore) : null,
      stateAfter: page ? clone(page.stateAfter) : null,
      needsFromPrevious: page ? page.needsFromPrevious : null,
      mustHoldForNext: page ? page.mustHoldForNext : null,
      previousPageId: index > 0 ? pages[index - 1].pageId : null,
      nextPageId: index >= 0 && pages[index + 1] ? pages[index + 1].pageId : null
    };
  }

  function namesIn(text, bible) {
    return (bible.entities || []).filter(function (entity) {
      return String(text || "").toLowerCase().indexOf(entity.name.toLowerCase()) >= 0;
    }).map(function (entity) { return entity.entityId; }).sort();
  }

function applyTextEdit(book, pageId, text) {
  var source = book.bible || book;
  var page = (book.pages || []).filter(function (item) { return item.pageId === pageId; })[0];
  if (!page) return { ok: false, problems: ["missing-page"], imageCalls: 0 };
  var limits = textLimits(source.yearGroup || book.yearGroup);
  var sentences = String(text || "").split(/[.!?]+/).map(function (part) { return part.trim(); }).filter(Boolean);
  if (limits && sentences.some(function (sentence) { return wordCount(sentence) > limits.maxSentenceWords; })) {
    return { ok: false, problems: ["age-sentence"], imageCalls: 0, imageStale: false };
  }
  var before = namesIn(page.prose, source);
  var after = namesIn(text, source);
    return {
      ok: true,
      problems: [],
      pageId: pageId,
      text: String(text || "").trim(),
      imageStale: before.join() !== after.join(),
      imageCalls: 0
    };
  }

  function readerStoryFromShelfItem(item) {
    var layout = item && item.readerArtLayout === "facing" ? "facing" : "duplex";
    var mode = item && (item.storyTextMode === "prose" || item.storyTextMode === "rhyme")
      ? item.storyTextMode
      : (layout === "facing" ? "prose" : "rhyme");
    var length = item && (item.storyLength === "short" || item.storyLength === "medium" || item.storyLength === "long")
      ? item.storyLength
      : "medium";
    return {
      title: item.title,
      author: item.author || "",
      featuring: item.featuring || "",
      bookColor: item.bookColor || null,
      readerFont: item.readerFont || null,
      readerArtLayout: layout,
      storyTextMode: mode,
      storyLength: length,
      sceneImageUrl: item.sceneUrlFallback || item.sceneDataUrl || null,
      v2: !!item.v2,
      bookId: item.id || "",
      pages: (item.pages || []).map(function (page) {
        var next = {
          text: page.text,
          imageUrl: page.imageUrlFallback || page.imageDataUrl || null
        };
        if (page.textSafeZones) next.textSafeZones = page.textSafeZones;
        if (page.impactWords) next.impactWords = page.impactWords;
        if (page.textBlocks) next.textBlocks = page.textBlocks;
        if (page.pageId) next.pageId = page.pageId;
        if (page.textSafeRegion) next.textSafeRegion = page.textSafeRegion;
        return next;
      })
    };
  }

  function readerStoryFromPages(book, pages) {
    var readerPages = [];
    pages.forEach(function (page) {
      readerPages.push({
        text: page.prose,
        imageUrl: null,
        pageId: page.pageId,
        textSafeRegion: page.textSafeRegion,
        textSafeZones: [{ side: "left", position: page.textSafeRegion, priority: 1 }]
      });
      readerPages.push({ text: "", imageUrl: null });
    });
    var names = (book.castIds || []).map(function (id) {
      var character = characterApi().getCharacter(id);
      return character ? character.name : id;
    });
    return {
      title: book.title,
      author: "",
      featuring: names.join(" + "),
      bookColor: "blue",
      readerFont: "lora",
      readerArtLayout: "duplex",
      storyTextMode: "prose",
      storyLength: "medium",
      sceneImageUrl: null,
      v2: true,
      yearGroup: book.yearGroup,
      tone: book.tone,
      pages: readerPages
    };
  }

  function shelfItemFromReader(story, book) {
    return {
      id: "v2-" + String(book.title || "book").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: story.title,
      author: "",
      featuring: story.featuring,
      bookColor: story.bookColor,
      readerFont: story.readerFont,
      readerArtLayout: "duplex",
      storyTextMode: "prose",
      storyLength: "medium",
      bookLength: book.targetLength,
      yearGroup: book.yearGroup,
      tone: book.tone,
      castIds: (book.castIds || []).slice(),
      v2: true,
      savedAt: book.savedAt || "",
      pages: story.pages.map(function (page) {
        var stored = { text: page.text, imageDataUrl: null, imageUrlFallback: page.imageUrl || null };
        if (page.pageId) stored.pageId = page.pageId;
        if (page.textSafeRegion) stored.textSafeRegion = page.textSafeRegion;
        if (page.textSafeZones) stored.textSafeZones = page.textSafeZones;
        return stored;
      }),
      sceneDataUrl: null,
      sceneUrlFallback: null
    };
  }

  var MAX_REPAIRS = 2;
  var TOLD_TRAIT = /\b(was|were|felt|seemed)\s+(curious|brave|careful|kind|inventive|bold|observant|gentle)\b/i;

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function compileStory(draft, request) {
    var ask = publicRequest(request || {});
    var problems = [];
    var profile = lengthProfile(ask.length);
    var source = draft || {};
    var incoming = source.beats || [];
    if (!profile) problems.push("length");
    if (!ask.idea) problems.push("idea-missing");
    if (ask.castIds.length < 1 || ask.castIds.length > 4) problems.push("cast-size");
    var lock = characterApi().lockCast(ask.castIds);
    if (!lock.ok) problems = problems.concat(lock.problems);
    problems = problems.concat(lengthShape(incoming, profile));
    if (problems.length) return { ok: false, problems: problems, bible: null };

    var locations = (source.locations || []).map(function (place) {
      return {
        locationId: slug(place.locationId || place.name),
        name: String(place.name || place.locationId || ""),
        connectedTo: (place.connectedTo || []).map(slug),
        visualIdentity: String(place.visualIdentity || ""),
        zones: (place.zones || []).map(function (zone) { return String(zone || ""); }).filter(Boolean),
        persistentObjects: (place.persistentObjects || []).map(slug)
      };
    }).filter(function (place) { return place.locationId; });
    locations.forEach(function (place) {
      place.connectedTo.forEach(function (other) {
        var there = locations.filter(function (item) { return item.locationId === other; })[0];
        if (there && there.connectedTo.indexOf(place.locationId) < 0) there.connectedTo.push(place.locationId);
      });
    });

    var entityRecords = (source.entities || []).map(function (entity) {
      return {
        entityId: slug(entity.entityId || entity.name),
        name: String(entity.name || entity.entityId || ""),
        identity: String(entity.identity || entity.name || ""),
        landmark: entity.landmark === true,
        ownerCharacterId: null,
        locationId: "",
        state: "",
        introducedAt: ""
      };
    }).filter(function (entity) { return entity.entityId; });

    var previousShot = "";
    var living = [];
    var storyCast = (source.storyCast || []).filter(function (row) { return row && row.characterId; }).map(function (row) {
      var locked = castApi().lockIdentity(Object.assign({}, row, { origin: "story" }));
      locked.referenceAssetIds = (row.referenceAssetIds || []).slice();
      locked.visualImportance = row.visualImportance || "";
      return locked;
    });
    var storyIds = storyCast.map(function (row) { return row.characterId; });
    var storyMemory = {};
    var characters = ask.castIds.map(function (id) {
      return charState(id, slug(incoming[0].locationId), "steady", "friend", []);
    });
    var beats = incoming.map(function (raw, index) {
      var beatId = "b" + (index + 1);
      var present = (raw.charactersPresent || []).map(String);
      present.forEach(function (id) {
        if (ask.castIds.indexOf(id) < 0 && storyIds.indexOf(id) < 0) problems.push("unplanned-character:" + id);
      });
      ask.castIds.forEach(function (id) {
        if (present.indexOf(id) < 0 && !(raw.absent && raw.absent[id])) problems.push("cast-missing:" + id);
      });
      (raw.expresses || []).forEach(function (note) {
        if (storyIds.indexOf(note.characterId) >= 0) return;
        var character = characterApi().getCharacter(note.characterId);
        if (!character || character.personality.indexOf(note.trait) < 0) problems.push("personality-unused:" + note.characterId);
        if (!note.shows || TOLD_TRAIT.test(note.shows) || String(note.shows).toLowerCase() === String(note.trait).toLowerCase()) {
          problems.push("trait-told:" + beatId);
        }
      });
      var before = { characters: clone(characters), entities: clone(living) };
      storyIds.forEach(function (id) {
        if (present.indexOf(id) < 0 && !storyMemory[id]) return;
        if (storyMemory[id]) before.characters.push(clone(storyMemory[id]));
      });
      var locationId = slug(raw.locationId);
      present.forEach(function (id) {
        if (storyIds.indexOf(id) < 0) return;
        var prior = storyMemory[id] || { characterId: id, locationId: "", clothing: "", carriedEntities: [], emotion: "", storyRole: "story", mud: "", damage: "", wetness: "", disguise: "", transformation: "", expression: "", pose: "", removedAccessories: [] };
        var patch = ((raw.characterState || []).filter(function (row) { return row.characterId === id; })[0]) || {};
        var applied = castApi().applyState(storyCast.filter(function (row) { return row.characterId === id; })[0], Object.assign({}, prior, patch, { locationId: locationId }));
        if (!applied.ok) {
          problems.push("identity-changed:" + id);
          return;
        }
        storyMemory[id] = Object.assign({ characterId: id, storyRole: "story" }, applied.state);
      });
      characters = characters.map(function (row) {
        var here = present.indexOf(row.characterId) >= 0;
        return charState(row.characterId, here ? locationId : row.locationId, here ? (raw.emotion || row.emotion) : row.emotion, row.storyRole, row.carriedEntities);
      });
      (raw.entityState || []).forEach(function (change) {
        var id = slug(change.entityId);
        var record = entityRecords.filter(function (entity) { return entity.entityId === id; })[0];
        if (!record) {
          problems.push("object-unintroduced:" + id);
          return;
        }
        var found = living.filter(function (entity) { return entity.entityId === id; })[0];
        if (!found) {
          if (!change.introduce) {
            problems.push("object-unintroduced:" + id);
            return;
          }
          record.introducedAt = beatId;
          living.push(ent(id, change.ownerCharacterId || null, slug(change.locationId || locationId), String(change.state || "here")));
        } else {
          if (Object.prototype.hasOwnProperty.call(change, "ownerCharacterId")) found.ownerCharacterId = change.ownerCharacterId || null;
          if (change.locationId) found.locationId = slug(change.locationId);
          if (change.state) found.state = String(change.state);
        }
      });
      living.forEach(function (entity) {
        var owner = characters.filter(function (row) { return row.characterId === entity.ownerCharacterId; })[0];
        if (owner) entity.locationId = owner.locationId;
        var record = entityRecords.filter(function (item) { return item.entityId === entity.entityId; })[0];
        if (!record) return;
        record.ownerCharacterId = entity.ownerCharacterId;
        record.locationId = entity.locationId;
        record.state = entity.state;
      });
      characters = characters.map(function (row) {
        var carried = living.filter(function (entity) { return entity.ownerCharacterId === row.characterId; }).map(function (entity) { return entity.entityId; });
        return charState(row.characterId, row.locationId, row.emotion, row.storyRole, carried);
      });
      var shot = SHOTS.indexOf(raw.shotType) >= 0 ? raw.shotType : "medium";
      if (shot === previousShot) shot = SHOTS[(SHOTS.indexOf(shot) + 1) % SHOTS.length];
      previousShot = shot;
      var after = { characters: clone(characters), entities: clone(living) };
      storyIds.forEach(function (id) {
        if (storyMemory[id]) after.characters.push(clone(storyMemory[id]));
      });
      return {
        beatId: beatId,
        role: raw.role,
        locationId: locationId,
        charactersPresent: present,
        absent: raw.absent || {},
        expresses: (raw.expresses || []).map(function (note) {
          return { characterId: note.characterId, trait: note.trait, shows: note.shows };
        }),
        problemFamily: raw.problemFamily || "",
        because: index ? "b" + index : "",
        resolvesProblem: raw.role === "resolution",
        action: String(raw.action || ""),
        emotion: String(raw.emotion || ""),
        entitiesRequired: living.map(function (entity) { return entity.entityId; }),
        visualFocus: String(raw.visualFocus || raw.action || ""),
        shotType: shot,
        compositionIntent: String(raw.compositionIntent || raw.visualFocus || "A new view of this place."),
        textPurpose: String(raw.textPurpose || raw.role || ""),
        pageTurnHook: "",
        textSafeRegion: raw.textSafeRegion || (index % 2 ? "upper-right" : "upper-left"),
        stateBefore: before,
        stateAfter: after,
        heldHook: String(raw.pageTurnHook || ""),
        locationZone: String(raw.locationZone || raw.subLocationId || raw.areaId || ""),
        worldState: String(raw.worldState || ""),
        environmentalState: String(raw.environmentalState || ""),
        weather: String(raw.weather || ""),
        timeOfDay: String(raw.timeOfDay || ""),
        goalNow: String(raw.goalNow || ""),
        obstacleNow: String(raw.obstacleNow || ""),
        discoveryNow: String(raw.discoveryNow || ""),
        consequenceNow: String(raw.consequenceNow || ""),
        relationshipNow: String(raw.relationshipNow || ""),
        stakesNow: String(raw.stakesNow || ""),
        pageTurnIntent: String(raw.pageTurnIntent || ""),
        entryFrom: String(raw.entryFrom || ""),
        exitToward: String(raw.exitToward || ""),
        destinationHint: String(raw.destinationHint || "")
      };
    });
    var hookBudget = Math.max(1, Math.floor(beats.length / 3));
    beats.forEach(function (beat, index) {
      if (!beat.heldHook || index === beats.length - 1) return;
      if (hookBudget <= 0) return;
      beat.pageTurnHook = beat.heldHook;
      hookBudget -= 1;
    });
    beats.forEach(function (beat) { delete beat.heldHook; });
    var climax = beats.filter(function (beat) { return beat.role === "climax"; })[0];
    var resolution = beats.filter(function (beat) { return beat.role === "resolution"; })[0];
    var reader = readerProfile(ask);
    var bible = {
      title: String(source.title || "A Wondii story"),
      yearGroup: ask.yearGroup || "",
      ageBand: ask.ageBand || "",
      readerAge: reader ? reader.approximateAgeRange : ask.yearGroup,
      readerStage: reader ? reader.stage : "",
      narrativeComplexity: reader ? reader.narrativeComplexity : "",
      tone: ask.tone,
      targetLength: ask.length,
      userIdea: ask.idea,
      castIds: ask.castIds.slice(),
      storyCast: storyCast,
      visualStyle: VISUAL_STYLE,
      premise: String(source.premise || ""),
      hook: String(source.hook || ""),
      goal: String(source.goal || ""),
      centralProblem: String(source.centralProblem || ""),
      stakes: String(source.stakes || ""),
      climaxBeatId: climax ? climax.beatId : "",
      resolutionBeatId: resolution ? resolution.beatId : "",
      emotionalArc: source.emotionalArc || beats.map(function (beat) { return beat.emotion; }),
      motif: String(source.motif || ""),
      locations: locations,
      entities: entityRecords,
      beats: beats
    };
    var review = validateBible(bible, ask);
    return { ok: review.ok && problems.length === 0, problems: problems.concat(review.problems), bible: bible };
  }

  function attachSpokenProse(bible, pages, spoken) {
    var byId = {};
    (spoken || []).forEach(function (page) { byId[page.pageId] = page.sentences || []; });
    var next = (pages || []).map(function (page) {
      var copy = clone(page);
      var sentences = (byId[page.pageId] || []).map(function (line) { return String(line || "").trim(); }).filter(Boolean);
      copy.sentences = sentences.map(function (line) {
        return { text: line, entities: [], locations: [] };
      });
      copy.prose = sentences.join(" ");
      return copy;
    });
    var problems = [];
    var limits = limitsFor(bible);
    next.forEach(function (page) {
      if (!page.prose) problems.push("empty-prose:" + page.pageId);
      var quotes = (String(page.prose || "").match(/"/g) || []).length / 2;
      if (limits && quotes > limits.maxDialogueTurns) problems.push("age-dialogue:" + page.pageId);
      (bible.entities || []).forEach(function (entity) {
        if ((page.entitiesRequired || []).indexOf(entity.entityId) >= 0) return;
        if (entity.name && String(page.prose || "").toLowerCase().indexOf(entity.name.toLowerCase()) >= 0) {
          problems.push("unplanned-object:" + entity.entityId);
        }
      });
      (bible.locations || []).forEach(function (place) {
        if (place.locationId === page.locationId) return;
        if (place.name && String(page.prose || "").toLowerCase().indexOf(place.name.toLowerCase()) >= 0) {
          problems.push("unplanned-location:" + place.locationId);
        }
      });
    });
    var review = reviewText(bible, next);
    return { ok: problems.length === 0 && review.ok, problems: problems.concat(review.problems), pages: next };
  }

  function charState(id, locationId, emotion, role, carried) {
    var character = characterApi().getCharacter(id);
    var state = characterApi().storyState(character, {
      locationId: locationId,
      emotion: emotion,
      storyRole: role,
      carriedEntities: carried || []
    });
    return state.state;
  }

  function ent(id, owner, locationId, state) {
    return { entityId: id, ownerCharacterId: owner, locationId: locationId, state: state };
  }

  function fixtureBible() {
    var hall = ["maya", "leo"].map(function (id) {
      return charState(id, "hall", id === "maya" ? "curious" : "steady", "friend", []);
    });
    var hallKey = hall.map(function (row) {
      return row.characterId === "maya"
        ? charState("maya", "hall", "hopeful", "finder", [])
        : charState("leo", "hall", "careful", "friend", []);
    });
    var cellar = ["maya", "leo"].map(function (id) {
      return charState(id, "cellar", id === "maya" ? "brave" : "glad", "friend", id === "maya" ? ["golden-key"] : []);
    });
    var garden = ["maya", "leo"].map(function (id) {
      return charState(id, "garden", "glad", "friend", id === "maya" ? ["golden-key"] : []);
    });
    var door = ent("secret-door", null, "hall", "closed");
    var doorStuck = ent("secret-door", null, "hall", "stuck");
    var doorOpen = ent("secret-door", null, "hall", "open");
    var keyFloor = ent("golden-key", null, "hall", "on-floor");
    var keyCarried = ent("golden-key", "maya", "cellar", "carried");
    var keyGarden = ent("golden-key", "maya", "garden", "carried");

    function snap(characters, entities) {
      return { characters: clone(characters), entities: clone(entities) };
    }

    var b1before = snap(hall, []);
    var b1after = snap(hall, []);
    var b2after = snap(hall, [door]);
    var b3after = snap(hall.map(function (row) {
      return charState(row.characterId, "hall", row.characterId === "leo" ? "careful" : "curious", "friend", []);
    }), [doorStuck]);
    var b4after = snap(hallKey, [doorStuck, keyFloor]);
    var b5after = snap(cellar, [doorOpen, keyCarried]);
    var b6after = snap(garden, [doorOpen, keyGarden]);

    return {
      title: "The Door Under the School",
      yearGroup: "Year 2",
      readerAge: "Year 2",
      tone: "magical",
      targetLength: "quick",
      userIdea: "They discover a secret door underneath their school.",
      castIds: ["maya", "leo"],
      visualStyle: VISUAL_STYLE,
      premise: "Maya and Leo discover a secret door underneath their school.",
      hook: "A loose board ticks in the school hall.",
      goal: "Find out what is under the school.",
      centralProblem: "The secret door will not open.",
      stakes: "The way under the school may close again.",
      climaxBeatId: "b5",
      resolutionBeatId: "b6",
      emotionalArc: ["curious", "surprised", "worried", "hopeful", "brave", "glad"],
      motif: "a small door in the school floor",
      locations: [
        { locationId: "hall", name: "school hall", connectedTo: ["cellar"], visualIdentity: "long school hall, wooden floor, high windows" },
        { locationId: "cellar", name: "school cellar", connectedTo: ["hall", "garden"], visualIdentity: "stone cellar under the hall" },
        { locationId: "garden", name: "quiet garden", connectedTo: ["cellar"], visualIdentity: "soft garden under the school" }
      ],
      entities: [
        { entityId: "secret-door", name: "secret door", identity: "a small door set in the floor", ownerCharacterId: null, locationId: "hall", state: "open", introducedAt: "b2" },
        { entityId: "golden-key", name: "golden key", identity: "a small golden key", ownerCharacterId: "maya", locationId: "garden", state: "carried", introducedAt: "b4" }
      ],
      beats: [
        beat("b1", "hook", "hall", [], "curious", "establishing", "The hall is wide and the children are small.", "upper-left", "Set the school.", "", b1before, b1after, "", ["Maya stopped in the school hall.", "Leo waited beside her."], null),
        beat("b2", "discovery", "hall", ["secret-door"], "surprised", "medium", "The floorboard is the focus.", "lower-left", "Show the find.", "The board began to lift.", b1after, b2after, "b1", ["A secret door sat in the school floor."], "discovery"),
        beat("b3", "attempt", "hall", ["secret-door"], "worried", "close", "Hands on the closed door.", "upper-right", "The try fails.", "", b2after, b3after, "b2", ["Leo shook his head.", "The secret door stayed shut."], "stuck"),
        beat("b4", "complication", "hall", ["secret-door", "golden-key"], "hopeful", "action", "The key is newly on the floor.", "lower-right", "A new clue.", "", b3after, b4after, "b3", ["A golden key lay by the secret door."], "search"),
        beat("b5", "climax", "cellar", ["secret-door", "golden-key"], "brave", "low", "The open door leads down.", "upper-left", "The turn.", "", b4after, b5after, "b4", ["Maya used the golden key.", "The secret door opened."], "choice"),
        beat("b6", "resolution", "garden", ["secret-door", "golden-key"], "glad", "reveal", "The garden is the new place.", "upper-right", "A quiet end.", "", b5after, b6after, "b5", ["They stood in a quiet garden.", "The secret door led under the school."], "")
      ]
    };

    function beat(id, role, locationId, entitiesRequired, emotion, shot, composition, region, purpose, hook, before, after, because, lines, family) {
      return {
        beatId: id,
        role: role,
        locationId: locationId,
        charactersPresent: ["maya", "leo"],
        expresses: expresses(id),
        problemFamily: family,
        because: because,
        resolvesProblem: id === "b6",
        action: lines.join(" "),
        emotion: emotion,
        entitiesRequired: entitiesRequired,
        visualFocus: purpose,
        shotType: shot,
        compositionIntent: composition,
        textPurpose: purpose,
        pageTurnHook: hook,
        textSafeRegion: region,
        stateBefore: before,
        stateAfter: after,
        sentences: lines.map(function (line) {
          return {
            text: line,
            entities: entitiesRequired.filter(function (entityId) {
              var record = entityId === "secret-door" ? "secret door" : "golden key";
              return line.toLowerCase().indexOf(record) >= 0;
            }),
            locations: []
          };
        })
      };
    }

    function expresses(id) {
      if (id === "b1") return [{ characterId: "maya", trait: "curious" }];
      if (id === "b3") return [{ characterId: "leo", trait: "careful" }];
      if (id === "b5") return [{ characterId: "maya", trait: "brave" }];
      if (id === "b6") return [{ characterId: "leo", trait: "kind" }];
      return [];
    }
  }

  function runFixture(id) {
    if (id !== "secret-door") return { ok: false, problems: ["unknown-fixture"], imageCalls: 0, pages: null };
    var bible = fixtureBible();
    var stages = ["dreaming", "planning"];
    var storyReview = validateBible(bible);
    if (!storyReview.ok) {
      return { ok: false, problems: storyReview.problems, storyReview: storyReview, pages: null, imageCalls: 0, stages: stages };
    }
    var planned = planPages(bible);
    stages.push("writing");
    if (!planned.ok) {
      return { ok: false, problems: planned.problems, storyReview: storyReview, pages: null, imageCalls: 0, stages: stages };
    }
    var sealed = sealPlan(bible, planned.pages);
    var prose = commitProse(bible, planned.pages, sealed.sealed);
    if (!sealed.ok || !prose.ok) {
      return {
        ok: false,
        problems: sealed.problems.concat(prose.problems),
        storyReview: storyReview,
        pages: prose.pages,
        imageCalls: 0,
        stages: stages
      };
    }
    var textReview = reviewText(bible, prose.pages);
    stages.push("visualPlanning");
    var journey = require("./book-journey.js").analyse({ bible: bible, pages: prose.pages });
    var journeyById = {};
    journey.spreads.forEach(function (spread) { journeyById[spread.spreadId] = spread; });
    var visual = prose.pages.map(function (page) { return visualBrief(page, bible, journeyById[page.pageId]); });
    var cover = coverPlan(bible, prose.pages);
    var images = requestImages({ textReview: textReview, storyReview: storyReview }, { draw: function () { throw new Error("image provider called"); } });
    if (!textReview.ok) {
      return { ok: false, problems: textReview.problems, textReview: textReview, storyReview: storyReview, pages: prose.pages, imageCalls: 0, stages: stages };
    }
    stages.push("assembling", "ready");
    var readerStory = readerStoryFromPages(bible, prose.pages);
    var finished = {
      ok: true,
      problems: [],
      bible: bible,
      castIds: bible.castIds.slice(),
      storyReview: storyReview,
      textReview: textReview,
      pages: prose.pages,
      cover: cover,
      visual: visual,
      visualJourney: {
        visualArc: journey.visualArc,
        repetition: journey.repetition,
        problems: journey.problems
      },
      readerStory: readerStory,
      shelfItem: shelfItemFromReader(readerStory, bible),
      imageCalls: images.imageCalls,
      imageReason: images.reason,
      stages: stages,
      yearGroup: bible.yearGroup,
      title: bible.title
    };
    finished.shelfItem.savedAt = "";
    return finished;
  }

  return {
    PUBLIC_KEYS: PUBLIC_KEYS,
    YEAR_GROUPS: YEAR_GROUPS,
    YEAR_WRITING: YEAR_WRITING,
    TONE_WRITING: TONE_WRITING,
    MAX_REPAIRS: MAX_REPAIRS,
    TONES: TONES,
    SHOTS: SHOTS,
    VISUAL_STYLE: VISUAL_STYLE,
    IMAGES_ENABLED: IMAGES_ENABLED,
    STAGE_LABELS: STAGE_LABELS,
    publicRequest: publicRequest,
    textLimits: textLimits,
    lengthProfile: lengthProfile,
    lengthShape: lengthShape,
    readerProfile: readerProfile,
    limitsFor: limitsFor,
    AGE_BANDS: AGE_BANDS,
    generationView: generationView,
    acceptCreation: acceptCreation,
    validateBible: validateBible,
    continuityProblems: continuityProblems,
    compositionProblems: compositionProblems,
    planPages: planPages,
    planJourney: function (bible, pages) {
      return require("./book-journey.js").analyse({ bible: bible, pages: pages || [] });
    },
    planProgression: function (bible, pages) {
      return require("./book-progression.js").review({ bible: bible, pages: pages || [] });
    },
    sealPlan: sealPlan,
    commitProse: commitProse,
    reviewText: reviewText,
    coverPlan: coverPlan,
    visualBrief: visualBrief,
    requestImages: requestImages,
    repairRequest: repairRequest,
    applyTextEdit: applyTextEdit,
    readerStoryFromShelfItem: readerStoryFromShelfItem,
    fixtureBible: fixtureBible,
    runFixture: runFixture,
    compileStory: compileStory,
    attachSpokenProse: attachSpokenProse,
    contentWords: contentWords
  };
});
