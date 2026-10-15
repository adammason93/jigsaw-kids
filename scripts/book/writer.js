"use strict";

/* Turns a teacher's cast, idea, year, and length into a text book.
   The model may invent the events and the sentences.
   This file does not invent the schema, the cast, or the pictures. */

var Book = require("../../js/book-brain.js");
var Cast = require("../../js/character-bible.js");
var Personality = require("../../js/character-personality.js");

var SHAPE = {
  quick: "Aim for 6 to 8 spreads. Keep it complete: a hook, a discovery, an attempt, a change, a climax, and a resolution. Concise, not unfinished.",
  storybook: "Aim for 10 to 12 spreads, and stay between 9 and 13. This is a full picture book. Use the room for a reaction, a relationship, a setback, and a quiet beat where the story needs them. Do not spend two spreads on one event.",
  adventure: "Aim for 14 to 18 spreads. Add real exploration, another attempt, and a setback that changes the story. Do not stretch a shorter book with filler."
};

var STORY_CRAFT = "Give the story a sense of wonder and discovery. The problem should matter, with stakes these children can feel. Let their personalities show as different choices, risks, and ways of speaking. A feeling belongs in an action or a line of dialogue. A later turn may surprise the reader when it follows from something already planted. The ending should leave a change or an image worth remembering. Do not reuse one plot shape for every idea, and do not insert a fixed number of feeling beats.";

var PROSE_CRAFT = "Let wonder, worry, or relief come through what a character does or says. Keep the children distinct in their choices and dialogue. Do not flatten the page into a list of steps. When a surprise was planted earlier, let the sentence land it. The last page should feel finished and worth remembering. Do not add a feeling the event did not earn.";

function unique(list) {
  var seen = {};
  return (list || []).filter(function (item) {
    if (seen[item]) return false;
    seen[item] = 1;
    return true;
  });
}

function unwrap(draft) {
  if (!draft || draft.__error) return {};
  if (Array.isArray(draft.beats)) return draft;
  if (draft.book && Array.isArray(draft.book.beats)) return draft.book;
  if (draft.story && Array.isArray(draft.story.beats)) return draft.story;
  return draft;
}

function pagesOf(payload) {
  if (!payload || payload.__error) return [];
  var pages = Array.isArray(payload) ? payload : (payload.pages || (payload.book && payload.book.pages) || []);
  return pages.map(function (page) {
    var sentences = page.sentences || [];
    if (!sentences.length && page.prose) sentences = String(page.prose).split(/(?<=[.!?])\s+/);
    return { pageId: page.pageId, sentences: sentences };
  });
}

function mergeSpoken(base, patch) {
  var map = {};
  pagesOf(base).forEach(function (page) { map[page.pageId] = page; });
  pagesOf(patch).forEach(function (page) {
    if (page.pageId && page.sentences && page.sentences.length) map[page.pageId] = page;
  });
  return Object.keys(map).map(function (id) { return map[id]; });
}

function registryRow(ask, id) {
  return ((ask && ask.identityRegistry) || []).filter(function (row) {
    return row && (row.characterId === id || row.journeyId === id || row.bibleId === id);
  })[0] || null;
}

function storedTraits(ask, id) {
  var row = registryRow(ask, id);
  var character = Cast.getCharacter((row && row.bibleId) || id) || Cast.getCharacter(id);
  if (character && character.personality && character.personality.length) return character.personality.slice();
  return Personality.traitsOf(row && row.personality);
}

function castBrief(ask) {
  return (ask.castIds || []).map(function (id) {
    var row = registryRow(ask, id);
    var character = Cast.getCharacter((row && row.bibleId) || id) || Cast.getCharacter(id);
    if (character) {
      var visual = row && row.referenceApproved !== true
        ? "Visual reference is this character's own portrait. Do not invent a different face, hair, or outfit."
        : "They stay this person: " + character.ageAppearance + "; " + character.hair + "; " + character.defaultClothing + ".";
      return [
        (row && row.journeyId ? row.journeyId : character.characterId) + " (" + character.name + ")",
        "Show these through what they do, and never name the words: " + character.personality.join(", ") + ".",
        visual
      ].join(" ");
    }
    if (row) {
      var traits = storedTraits(ask, row.characterId || id);
      var note = Personality.descriptionOf(row.personality);
      return [
        row.characterId + " (" + row.name + ")",
        "Locked selected character. Match the saved portrait. Do not invent a new face, hair, or outfit.",
        "Appearance: " + (row.appearance || ""),
        "Clothing: " + (row.clothing || ""),
        traits.length
          ? "Show these through an action, a choice, or a line of dialogue, and never name the words: " + traits.join(", ") + ". " + traits.map(Personality.hint).filter(Boolean).join(". ") + "."
          : "No personality traits are stored. Do not invent one.",
        (row.personalityNote || note) ? "A private note, meaning only, never copied as a sentence: " + (row.personalityNote || note) : ""
      ].filter(Boolean).join(" ");
    }
    return id + ": unknown";
  }).join("\n");
}

function spokenName(id, bible) {
  var row = registryRow(bible, id);
  if (row && row.name) return row.name;
  var story = ((bible && bible.storyCast) || []).filter(function (item) { return item.characterId === id; })[0];
  if (story && story.name) return story.name;
  var character = Cast.getCharacter(id);
  return character ? character.name : id;
}

function lengthLine(ask, profile) {
  var ending = "The first role is hook. The last role is resolution. One beat is climax, and it comes before the resolution.";
  if (ask.pageCount > 0) {
    return "This book is exactly " + ask.pageCount + " pages. One beat is one page. Return exactly " + ask.pageCount + " beats. Do not return fewer, do not return more, and do not add an empty page to reach the count. " + ending;
  }
  return "Use between " + (profile ? profile.minSpreads : "?") + " and " + (profile ? profile.maxSpreads : "?") + " beats. " + ending;
}

function shapeLine(ask) {
  if (ask.pageCount > 0) {
    var room = ask.length === "storybook"
      ? " This is a full picture book. Use a reaction, a relationship, a setback, or a quiet beat only where this story needs them. Do not spend two pages on one event."
      : "";
    return "Write exactly " + ask.pageCount + " pages. Do not aim for a nearby count." + room;
  }
  return SHAPE[ask.length] || "";
}

function bibleBrief(ask) {
  var profile = Book.lengthProfile(ask.length);
  var reader = Book.readerProfile(ask);
  var limits = reader ? reader.limits : null;
  var words = Book.contentWords(ask.idea).join(", ");
  var sampleTrait = "kind";
  return {
    system: [
      "You plan a Wondii children's picture book. Return one JSON object and nothing else.",
      "You invent the events. You do not invent the output shape, the cast, the year, the length, or the tone.",
      "Do not write the finished page prose. The action field is the event, in one or two plain sentences.",
      "The teacher's idea is the premise. The story must be about it. Do not paste that sentence into the premise, the hook, or any action.",
      "If that premise were removed, the hook, the problem, the middle, the climax, and the resolution should stop making sense.",
      "Build a causal chain. Each beat happens because of the one before it. Do not write an 'and then' list.",
      STORY_CRAFT,
      "The story state must change across the book. A new shot of the same moment is not a new beat.",
      "The place may stay the same when the world state, the obstacle, the goal, or a consequence changes. Do not change place only to make the pictures different.",
      "Do not repeat the same interaction in the same state for several beats. An attempt is followed by its consequence, not by another interchangeable attempt.",
      "A quiet beat is allowed when it has a job: a reaction, a pause, or anticipation. It still has to belong to the chain.",
      "A recurring creature who is not one of the selected children belongs in storyCast, with one locked look, and then in charactersPresent. Do not invent an extra person. If the story needs no recurring creature, storyCast is an empty array.",
      "The climax settles the central problem by using something that happened earlier. It is not a new obstacle.",
      "The resolution shows what changed: a behaviour, a final image, or a callback. It must not explain the climax again, name the feeling, or say that everyone was happy.",
      "Selected children must change what happens. A child with traits listed below needs one expresses note, and the trait must be one of those listed words. Show it once, through what they do or decide. A curious child might investigate something unusual. A kind child might help someone. A playful child might make a game out of an obstacle. Do not repeat the trait, and do not give every page a personality sentence. A child with no traits listed still takes part in the action. Do not invent a trait word for them, and do not add an expresses note for them.",
      "expresses.shows is a behaviour, such as kneeling to listen. It must not be the personality word, and it must not say 'was curious' or 'felt brave'.",
      "Do not add a person who is not in the cast. A creature, object, place, or force is an entity.",
      "If an object matters later, introduce it with introduce:true on the beat it first appears. Leave it out of later entityState arrays unless its owner or state changes.",
      "A character can change place only along connectedTo. If they carry an object, set that object's ownerCharacterId.",
      "Give a pageTurnHook only where a turn helps. Leave it empty on most beats, and always on the resolution. Do not repeat the same kind of turn.",
      "problemFamily is a short slug. It must change every beat. The hook and the resolution may use an empty string.",
      "shotType must be one of the allowed shots and must not match the previous beat.",
      "Do not use: suddenly, little did they know, couldn't believe their eyes, the adventure had only just begun.",
      "Do not copy any sample story. Invent this idea only."
    ].join(" "),
    user: [
      "Cast, and the only people allowed:",
      castBrief(ask),
      "",
      "SOURCE PREMISE — SEMANTIC CONSTRAINT ONLY. NEVER COPY AS PROSE:",
      ask.idea,
      "Plan check only, not reader wording. These words must remain somewhere in the premise, and at least one must sit in the climax action and in the resolution action: " + words,
      "Reader: " + (ask.yearGroup || ask.ageBand) + (reader && reader.constraintYear && reader.constraintYear !== ask.yearGroup ? " (" + reader.constraintYear + ")" : "") + ". " + (reader ? reader.narrativeComplexity : ""),
      "How this reader should feel: " + ((reader && reader.writing) || Book.YEAR_WRITING[(reader && reader.constraintYear) || ask.yearGroup] || ""),
      "Later reading load, so keep each event sayable inside it: about " + limits.maxSentences + " sentences on a page, under " + limits.maxPageWords + " words, no sentence longer than " + limits.maxSentenceWords + " words, at most " + limits.maxDialogueTurns + " spoken turns. One extra short sentence is acceptable. A page of long sentences is not.",
      "Length: " + ask.length + ". " + (ask.pageCount > 0 ? "Exactly " + ask.pageCount + " pages." : (profile ? profile.line + " " + profile.scope + "." : "")),
      lengthLine(ask, profile),
      "Allowed roles: hook, world, discovery, reaction, goal, exploration, attempt, consequence, complication, relationship, setback, reveal, setup, payoff, approach, climax, resolution, breath, turn, wonder, humour, anticipation.",
      "Each beat must add something: new information, a decision, a consequence, a relationship, a setup, a payoff, or an earned quiet moment (wonder, reaction, humour, anticipation). A quiet beat is allowed. A repeated event is not.",
      "Do not split one moment across two beats. Do not add a walk that changes nothing.",
      "Reader level decides the language. Length decides how much story there is. A young reader can have a long simple story. An older reader can have a short subtle one.",
      shapeLine(ask),
      "Tone: " + (ask.tone || "surprise"),
      Book.TONE_WRITING[ask.tone || "surprise"] || "",
      "A bedtime book is quiet. A funny book is a mismatch in what someone does. A mystery answers the question it opened. A magical book keeps one impossible rule. An adventure rewards curiosity. A cost is welcome when the story needs one. Do not tell every adventure as a repair, and do not tell every tone as a chase.",
      require("../../js/book-adventure.js").writerGuide(ask),
      "",
      "Return this JSON shape. The ids below are field examples, not a plot and not extra characters:",
      "{",
      '  "title": "",',
      '  "premise": "",',
      '  "hook": "",',
      '  "goal": "",',
      '  "centralProblem": "",',
      '  "stakes": "",',
      '  "motif": "",',
      '  "emotionalArc": [],',
      '  "storyCast": [],',
      '  "locations": [{ "locationId": "place-a", "name": "first place", "connectedTo": ["place-b"], "zones": [], "setting": "", "visualIdentity": "" }],',
      '  "journey": [{ "section": "opening", "locationId": "place-a", "purpose": "", "objective": "", "discoveryOrObstacle": "", "change": "", "leadsTo": "place-b" }],',
      '  "entities": [{ "entityId": "story-thing", "name": "story thing", "identity": "" }],',
      '  "beats": [{',
      '    "role": "hook",',
      '    "locationId": "place-a",',
      '    "locationZone": "",',
      '    "worldState": "",',
      '    "goalNow": "",',
      '    "obstacleNow": "",',
      '    "consequenceNow": "",',
      '    "pageTurnIntent": "",',
      '    "entryFrom": "",',
      '    "exitToward": "",',
      '    "charactersPresent": ["example-child"],',
      '    "absent": {},',
      '    "expresses": [{ "characterId": "example-child", "trait": "' + sampleTrait + '", "shows": "A behaviour, never the trait word." }],',
      '    "problemFamily": "",',
      '    "action": "",',
      '    "emotion": "",',
      '    "shotType": "establishing",',
      '    "compositionIntent": "",',
      '    "visualFocus": "",',
      '    "textPurpose": "",',
      '    "pageTurnHook": "",',
      '    "entityState": [{ "entityId": "story-thing", "introduce": true, "ownerCharacterId": null, "locationId": "place-a", "state": "here" }]',
      "  }]",
      "}",
      "Do not reuse story-thing, place-a, example-child, or the sample behaviour. example-child is not in this cast. Invent this idea only.",
      "locationId and entityId are lowercase slugs. A location name should be the phrase spoken on pages set there, and should not be a short word that other pages will need.",
      "Allowed shotType values: " + Book.SHOTS.join(", ") + ".",
      "charactersPresent may contain only: " + ask.castIds.join(", ") + ".",
      "If a selected child is off a beat, charactersPresent omits them and absent explains why, for example { \"leo\": \"waiting upstairs\" }.",
      "traits allowed: " + ask.castIds.map(function (id) {
        var traits = storedTraits(ask, id);
        return id + " " + (traits.length ? traits.join("/") : "(none stored)");
      }).join("; ") + "."
    ].join("\n")
  };
}

function personalityOnly(problems) {
  return unique(problems).length > 0 && unique(problems).every(function (problem) {
    return /^(?:personality-unused|personality-mismatch|trait-told):/.test(String(problem));
  });
}

function repairBibleBrief(ask, draft, problems) {
  var base = bibleBrief(ask);
  if (personalityOnly(problems)) {
    base.system += " The previous plan failed only on personality notes. Return the same JSON. Change only the expresses notes named by the failed checks. Keep every action, place, beat, page count, and entity.";
  } else {
    base.system += " The previous plan failed. Return a full replacement in the same shape. Keep the teacher's idea and the same cast. Change what the failed checks require.";
  }
  base.user += "\n\nFailed checks:\n" + unique(problems).join("\n") + "\n\nPrevious JSON:\n" + JSON.stringify(unwrap(draft));
  return base;
}

var VOICE = {
  curious: "notices first",
  brave: "moves when someone else pauses",
  careful: "hesitates, then checks",
  kind: "reassures without taking over",
  inventive: "tries an experiment, and can get it wrong",
  bold: "steps in",
  observant: "sees the small thing the others miss",
  gentle: "steadies someone"
};

function voiceLines(ids) {
  return ids.map(function (id) {
    var character = Cast.getCharacter(id);
    if (!character) return "";
    var habits = character.personality.map(function (trait) { return VOICE[trait] || trait; }).join("; ");
    return character.name + " (" + habits + "). Let this change who notices, who acts, who hesitates, and how they speak. No catchphrase.";
  }).filter(Boolean).join("\n");
}

function roleNote(role) {
  if (role === "climax") return "Show the turn that settles the problem. Do not announce a moral.";
  if (role === "resolution") return "Show what changed: behaviour, a final image, or a callback. Do not explain the solution again. Do not name the feeling if the action already shows it.";
  return "Write this moment. Do not summarise the whole story.";
}

function proseBrief(bible, pages, onlyIds) {
  var reader = Book.readerProfile({ yearGroup: bible.yearGroup, ageBand: bible.ageBand });
  var limits = Book.limitsFor(bible);
  var stage = reader ? reader.constraintYear : bible.yearGroup;
  var wanted = pages.filter(function (page) {
    return !onlyIds || onlyIds.indexOf(page.pageId) >= 0;
  });
  var young = stage === "Reception" || stage === "Year 1";
  var progress = require("../../js/book-progression.js").review({ bible: bible, pages: pages });
  function stepFor(page) {
    var row = progress.storyProgressionMap.filter(function (item) {
      return item.spreadId === page.pageId || item.beatId === page.beatId;
    })[0];
    if (!row) return "";
    var changed = (row.newInformation || []).filter(function (item) { return item !== "opening" && item !== "none" && item !== "EMOTION"; });
    return "progression: " + row.narrativePhase + ". Why this page exists: " + row.progressionReason + "." + (changed.length ? " What changed: " + changed.join(", ") + "." : "") + (row.locationZone ? " Zone: " + row.locationZone + "." : "");
  }
  return {
    system: [
      "You write the read-aloud words for a children's picture book whose events are already fixed.",
      "Return one JSON object: { \"pages\": [ { \"pageId\": \"p1\", \"sentences\": [\"...\"] } ] }.",
      "Do not change the events, the cast, the places, or the ending.",
      "Follow the planned journey. When this page is in a new place, the sentences say that place. Do not describe a place this page is not in.",
      "If a page's progression moves the place, changes the world, or reveals something, the sentences must say that change. Do not flatten a new beat back into the previous moment.",
      "The source premise is meaning only. Do not quote it. Do not closely paraphrase it as narration. Do not address the reader by restating it. Do not use it as a concluding moral or summary.",
      "The story's own nouns still belong on the page. A story about a shadow may say shadow. Do not copy the premise sentence around those nouns.",
      "Write from the current page's event. The story has already established the premise.",
      "Show action, image, and behaviour before any explanation of a feeling.",
      PROSE_CRAFT,
      "Once the climax shows how the problem is settled, the resolution must not explain that solution again.",
      "The resolution answers what changed, how the characters behave now, and what final image closes the book.",
      "Write for the ear. Vary the sentence length.",
      young ? "For this young reader, short concrete lines are the right prose. A repeated short line is welcome when it is the book's rhythm." : "Do not lean on the same opening. Nearby pages should not all start with they find, they climb, or they look.",
      "Dialogue must sound like that child, inside the spoken-turn limit, with straight double quotes. Do not put the explanation in someone's mouth twice.",
      "Do not narrate the picture's every detail. Leave room for the illustration.",
      "Do not name a personality trait. Do not write 'was curious', 'felt brave', 'wasn't scared', or 'wasn't lonely'.",
      "Do not start three sentences in a row with the same name.",
      "Do not use: suddenly, little did they know, couldn't believe their eyes, could not believe their eyes, the adventure had only just begun, with a twinkle, adventure awaits.",
      "Do not write like a worksheet or a plot summary.",
      "Name only objects that are already in that page's entities. Name only the place that page is in."
    ].join(" "),
    user: [
      "Title: " + bible.title,
      "SOURCE PREMISE — SEMANTIC CONSTRAINT ONLY. NEVER COPY AS PROSE:",
      bible.userIdea || "",
      "Reader: " + (bible.ageBand || bible.yearGroup) + (reader && reader.constraintYear && reader.constraintYear !== bible.yearGroup ? " (" + reader.constraintYear + ")" : "") + ". " + ((reader && reader.writing) || Book.YEAR_WRITING[stage] || ""),
      "Tone: " + (bible.tone || "surprise") + ". " + (Book.TONE_WRITING[bible.tone || "surprise"] || ""),
      "Reading load: aim for about " + limits.maxSentences + " sentences. One extra short sentence is fine. Keep the page under " + limits.maxPageWords + " words. No sentence longer than " + limits.maxSentenceWords + " words. At most " + limits.maxDialogueTurns + " quoted turns.",
      bible.pageCount > 0 ? "This book has exactly " + bible.pageCount + " pages. Return one pages entry for every page listed here, and no extra pages. Do not drop a page, and do not invent a page to fill the count." : "",
      "Voices:",
      voiceLines(bible.castIds || []),
      "Write only these pages:",
      wanted.map(function (page, index) {
        var place = (bible.locations || []).filter(function (item) { return item.locationId === page.locationId; })[0];
        var names = (page.charactersPresent || []).map(function (id) {
          return spokenName(id, bible);
        }).join(", ");
        var entities = (page.stateAfter && page.stateAfter.entities || []).map(function (entity) {
          return entity.entityId + " owner=" + (entity.ownerCharacterId || "nobody") + " state=" + entity.state;
        }).join("; ");
        var neighbour = "";
        if (onlyIds) {
          var at = pages.indexOf(page);
          var prev = at > 0 ? pages[at - 1] : null;
          var next = at >= 0 && at < pages.length - 1 ? pages[at + 1] : null;
          neighbour = "\nPrevious page: " + (prev && prev.prose ? prev.prose : "(none)") + "\nNext page: " + (next && next.prose ? next.prose : "(none)");
        }
        var role = pageRole(bible, page);
        var step = stepFor(page);
        return [
          page.pageId + " role=" + role,
          roleNote(role),
          step,
          "place: " + (place ? place.name : page.locationId),
          "present: " + names,
          "event: " + page.action,
          "entities: " + (entities || "none"),
          page.pageTurnHook ? "The page may end toward: " + page.pageTurnHook : "No page-turn hook.",
          neighbour
        ].join("\n");
      }).join("\n\n")
    ].join("\n")
  };
}

function pageRole(bible, page) {
  var beat = (bible.beats || []).filter(function (item) { return item.beatId === page.beatId; })[0];
  return beat ? beat.role : "";
}

function repairProseBrief(bible, pages, spoken, problems) {
  var ids = [];
  unique(problems).forEach(function (problem) {
    var parts = String(problem).split(":");
    if (parts.length > 1 && /^p\d+$/.test(parts[parts.length - 1])) ids.push(parts[parts.length - 1]);
  });
  if (/idea-not-structural|resolution-missing|climax-missing/.test((problems || []).join(" "))) {
    pages.forEach(function (page) {
      if (page.beatId === bible.climaxBeatId || page.beatId === bible.resolutionBeatId) ids.push(page.pageId);
    });
  }
  ids = unique(ids);
  if (!ids.length) ids = pages.map(function (page) { return page.pageId; });
  var current = pages.map(function (page) {
    var found = pagesOf(spoken).filter(function (item) { return item.pageId === page.pageId; })[0];
    return Object.assign({}, page, { prose: found ? (found.sentences || []).join(" ") : page.prose || "" });
  });
  var brief = proseBrief(bible, current, ids);
  brief.system += " Repair only the listed pages. Rewrite them from the Book Bible, the current beat, the page plan, stateBefore, stateAfter, the previous page, the current page, and the next page. The original idea is labeled SOURCE PREMISE, SEMANTIC CONSTRAINT ONLY, NEVER COPY AS PROSE. Do not paste it back in to satisfy a check.";
  brief.user += "\n\nFailed checks:\n" + unique(problems).join("\n");
  return brief;
}

function compileOrFail(draft, ask) {
  if (!draft || draft.__error) return { ok: false, problems: ["model-error"], bible: null };
  return Book.compileStory(unwrap(draft), ask);
}

function failingStage(problems) {
  var joined = (problems || []).join(" ");
  if (/prompt-echo|ending-repeated|emotion-told|reader-address|idea-not-structural|resolution-missing|climax-missing|ending/.test(joined)) return "ending";
  return "prose";
}

async function generateBookChunked(request, ports) {
  var source = request || {};
  var ask = Book.publicRequest(source);
  var briefAsk = Object.assign({}, ask, { identityRegistry: source.identityRegistry || [] });
  var state = Object.assign({ stage: "bible", tries: 0, repairs: [] }, ports.writerState || {});
  var repairs = Array.isArray(state.repairs) ? state.repairs.slice() : [];
  var modelName = ports.model || "gpt-6.1-sol";
  var bibleTokens = ask.length === "adventure" ? 10000 : ask.length === "storybook" ? 8000 : 6000;
  var proseTokens = ask.length === "adventure" ? 8000 : ask.length === "storybook" ? 6000 : 4000;
  if (!Book.lengthProfile(ask.length) || !Book.readerProfile(ask) || !ask.idea || ask.castIds.length < 1) {
    return result("NOT_REVIEWABLE", { ok: false, problems: ["request"], bible: null }, null, null, null);
  }

  async function model(brief, purpose, tokens) {
    try {
      return await ports.callModel(brief, {
        purpose: purpose,
        maxTokens: tokens,
        model: modelName,
        effort: ports.effort || "low"
      });
    } catch (error) {
      if (error && error.code === "model-timeout") throw error;
      return { __error: String(error && error.message || error) };
    }
  }
  function cont(stage, extra) {
    return { status: "CONTINUE", writer: Object.assign({ stage: stage, repairs: repairs }, extra || {}) };
  }
  function reviewable(bible, attached) {
    return {
      status: "REVIEWABLE",
      bible: bible,
      pages: attached.pages,
      textProblems: unique(attached.problems),
      storyProblems: [],
      writer: null
    };
  }

  if (state.stage === "bible") {
    var draft = await model(bibleBrief(briefAsk), "book-bible", bibleTokens);
    var compiled = compileOrFail(draft, source);
    if (!compiled.ok) return cont("bible-repair", { draft: draft, problems: unique(compiled.problems), tries: 0 });
    var planned = Book.planPages(compiled.bible);
    if (!planned.ok) return cont("page-plan-repair", { draft: draft, problems: unique(planned.problems), tries: 0 });
    return cont("prose", { bible: compiled.bible, pages: planned.pages });
  }

  function acceptSaved(draft) {
    var compiled = compileOrFail(draft, source);
    if (!compiled.ok) return null;
    var planned = Book.planPages(compiled.bible);
    if (!planned.ok) return null;
    return { bible: compiled.bible, pages: planned.pages };
  }

  if (state.stage === "bible-repair" || state.stage === "page-plan-repair") {
    var kept = acceptSaved(state.draft);
    if (kept) return cont("prose", { bible: kept.bible, pages: kept.pages, reusedDraft: true, priorProblems: unique(state.problems) });
    var tries = Number(state.tries) || 0;
    if (tries >= Book.MAX_REPAIRS) return result("NOT_REVIEWABLE", { ok: false, problems: state.problems || ["story"], bible: null }, null, null, null);
    repairs.push({ stage: state.stage === "page-plan-repair" ? "page-plan" : "bible", problems: unique(state.problems) });
    draft = await model(repairBibleBrief(briefAsk, state.draft, state.problems || []), state.stage === "page-plan-repair" ? "page-plan-repair" : "book-bible-repair", bibleTokens);
    compiled = compileOrFail(draft, source);
    if (!compiled.ok) return cont(state.stage, { draft: draft, problems: unique(compiled.problems), tries: tries + 1 });
    planned = Book.planPages(compiled.bible);
    if (!planned.ok) return cont("page-plan-repair", { draft: draft, problems: unique(planned.problems), tries: 0 });
    return cont("prose", { bible: compiled.bible, pages: planned.pages });
  }

  if (state.stage === "prose") {
    var spoken = await model(proseBrief(state.bible, state.pages, null), "book-prose", proseTokens);
    var attached = Book.attachSpokenProse(state.bible, state.pages, pagesOf(spoken));
    if (!attached.ok) return cont("prose-repair", { bible: state.bible, pages: state.pages, spoken: spoken, problems: unique(attached.problems), tries: 0 });
    return reviewable(state.bible, attached);
  }

  if (state.stage === "prose-repair") {
    tries = Number(state.tries) || 0;
    if (tries >= Book.MAX_REPAIRS) return result("NOT_REVIEWABLE", { ok: false, problems: state.problems || ["prose"], bible: state.bible }, null, null, null);
    repairs.push({ stage: failingStage(state.problems), problems: unique(state.problems) });
    var patch = await model(repairProseBrief(state.bible, state.pages, state.spoken, state.problems || []), "book-prose-repair", proseTokens);
    spoken = mergeSpoken(state.spoken, patch);
    attached = Book.attachSpokenProse(state.bible, state.pages, spoken);
    if (!attached.ok) return cont("prose-repair", { bible: state.bible, pages: state.pages, spoken: spoken, problems: unique(attached.problems), tries: tries + 1 });
    return reviewable(state.bible, attached);
  }

  return result("NOT_REVIEWABLE", { ok: false, problems: ["story"], bible: null }, null, null, null);

  function result(status, story, plan, text, images) {
    return {
      status: status,
      bible: story && story.bible,
      pages: text && text.pages ? text.pages : (plan && plan.pages) || null,
      textProblems: unique(text && text.problems),
      storyProblems: unique(story && story.problems)
    };
  }
}

async function generateBook(request, ports) {
  if (ports && ports.oneCall === true) return generateBookChunked(request, ports);
  var source = request || {};
  var ask = Book.publicRequest(source);
  var briefAsk = Object.assign({}, ask, { identityRegistry: source.identityRegistry || [] });
  var repairs = [];
  var calls = 0;
  var imageDraws = 0;
  var modelName = ports.model || "gpt-6.1-sol";
  if (!Book.lengthProfile(ask.length) || !Book.readerProfile(ask) || !ask.idea || ask.castIds.length < 1) {
    return result("NOT_REVIEWABLE", { ok: false, problems: ["request"], bible: null }, null, null, null);
  }
  var band = Book.lengthProfile(ask.length);
  if (ask.pageCount && (ask.pageCount < band.minSpreads || ask.pageCount > band.maxSpreads)) {
    return result("NOT_REVIEWABLE", { ok: false, problems: ["page-count"], bible: null }, null, null, null);
  }

  async function model(brief, purpose, tokens) {
    calls += 1;
    try {
      return await ports.callModel(brief, {
        purpose: purpose,
        maxTokens: tokens,
        model: modelName,
        effort: ports.effort || "low"
      });
    } catch (error) {
      if (error && error.code === "model-timeout") throw error;
      return { __error: String(error && error.message || error) };
    }
  }

  var bibleTokens = ask.length === "adventure" ? 10000 : ask.length === "storybook" ? 8000 : 6000;
  var proseTokens = ask.length === "adventure" ? 8000 : ask.length === "storybook" ? 6000 : 4000;
  var draft = await model(bibleBrief(briefAsk), "book-bible", bibleTokens);
  var compiled = compileOrFail(draft, source);
  var tries = 0;
  while (!compiled.ok && tries < Book.MAX_REPAIRS) {
    tries += 1;
    repairs.push({ stage: "bible", problems: unique(compiled.problems) });
    draft = await model(repairBibleBrief(briefAsk, draft, compiled.problems), "book-bible-repair", bibleTokens);
    compiled = compileOrFail(draft, source);
  }
  if (!compiled.ok) return result("NOT_REVIEWABLE", compiled, null, null, null);

  var planned = Book.planPages(compiled.bible);
  tries = 0;
  while (!planned.ok && tries < Book.MAX_REPAIRS) {
    tries += 1;
    repairs.push({ stage: "page-plan", problems: unique(planned.problems) });
    draft = await model(repairBibleBrief(briefAsk, draft, planned.problems), "page-plan-repair", bibleTokens);
    compiled = compileOrFail(draft, source);
    planned = compiled.ok ? Book.planPages(compiled.bible) : { ok: false, problems: compiled.problems, pages: null };
  }
  if (!compiled.ok || !planned.ok) return result("NOT_REVIEWABLE", compiled, planned, null, null);

  var spoken = await model(proseBrief(compiled.bible, planned.pages, null), "book-prose", proseTokens);
  var attached = Book.attachSpokenProse(compiled.bible, planned.pages, pagesOf(spoken));
  tries = 0;
  while (!attached.ok && tries < Book.MAX_REPAIRS) {
    tries += 1;
    repairs.push({ stage: failingStage(attached.problems), problems: unique(attached.problems) });
    var patch = await model(repairProseBrief(compiled.bible, attached.pages, spoken, attached.problems), "book-prose-repair", proseTokens);
    spoken = mergeSpoken(spoken, patch);
    attached = Book.attachSpokenProse(compiled.bible, planned.pages, spoken);
  }

  var images = Book.requestImages(
    { textReview: attached, storyReview: { ok: compiled.ok } },
    { draw: function () { imageDraws += 1; } }
  );
  var status = attached.ok && planned.ok && images.imageCalls === 0 && imageDraws === 0 ? "REVIEWABLE" : "NOT_REVIEWABLE";
  return result(status, compiled, planned, attached, images);

  function result(status, story, plan, text, images) {
    return {
      status: status,
      request: ask,
      modelCalls: calls,
      repairCalls: repairs.length,
      repairs: repairs,
      stagesRepaired: unique(repairs.map(function (item) { return item.stage; })),
      bible: story && story.bible,
      storyProblems: unique(story && story.problems),
      planProblems: unique(plan && plan.problems),
      textProblems: unique(text && text.problems),
      pages: text && text.pages ? text.pages : (plan && plan.pages) || null,
      imageCalls: images ? images.imageCalls : 0,
      imageDraws: imageDraws,
      imageReason: images ? images.reason : "not-run",
      imageUsd: 0
    };
  }
}

module.exports = {
  generateBook: generateBook,
  bibleBrief: bibleBrief,
  proseBrief: proseBrief,
  repairBibleBrief: repairBibleBrief,
  repairProseBrief: repairProseBrief
};
