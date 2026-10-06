/* Story-led, source-grounded lesson generation (research mode only, Oct 2026).
   Opt-in: LESSON_RESEARCH containing "story". With it unset nothing here is loaded.
   Pipeline (reusable for any topic and year group):
   1. Plan 3-4 connected learning ideas for the topic and year (England National Curriculum
      where sensible), with an evidence thread: how we know, and that ideas change.
   2. Research: per-idea web searches on the allowlist + saved candidates; pages are fetched by
      source-research.js; search snippets and Wikipedia text are never evidence.
   3. Knowledge: claims with verbatim quotes, checked in code (lesson-brain quoteInPassage) and by
      the existing automated entailment check (sourceEntailmentBrief / applySourceEntailment).
   4. Story: one adventure whose scenes do the teaching (problem -> discovery -> explanation,
      example, comparison -> use), with 2 choose activities and an end quiz.
   5. Support check (the only hard block): every pupil-facing sentence is classified; a factual
      sentence must be supported by the passages of the claims it cites. One repair call, then a
      code fallback (the checked claim text, or removal). Anything still unsupported blocks.
   6. Quality pass (never blocks): story, vocabulary, questions, activities, teaching depth,
      periods, timing. One cheap repair for flagged questions; the rest are warnings.
   7. Adventure: the seven Wondii stage types plus explicit story scenes for the player.
   Nothing here is human verification. factuallyVerified is always false. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiStoryLesson = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function brainApi(ports) {
    if (ports && ports.brain) return ports.brain;
    if (root && root.WondiiLessonBrain) return root.WondiiLessonBrain;
    if (typeof require === "function") return require("./lesson-brain.js");
    return null;
  }
  function researchApi(ports) {
    if (ports && ports.research) return ports.research;
    if (root && root.WondiiSourceResearch) return root.WondiiSourceResearch;
    if (typeof require === "function") return require("./source-research.js");
    return null;
  }

  var STAGES = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];
  var BEAT_ROLES = { story: "narrate", problem: "notice", discovery: "name", explain: "explain", example: "example", compare: "compare", use: "apply" };
  var TEACH_ROLES = { discovery: 1, explain: 1, example: 1, compare: 1 };
  var SCENE_PART_BEATS = 4;
  var LABEL = "provisional; quote-verified + automated entailment and support checks; not human-verified; not classroom-ready";

  function clean(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (max && text.length > max) {
      var cut = text.slice(0, max);
      var at = cut.lastIndexOf(" ");
      text = (at > max * 0.6 ? cut.slice(0, at) : cut).trim();
    }
    return text;
  }
  function list(value) { return Array.isArray(value) ? value : []; }
  function yearNumber(year) { return Number(String(year || "").replace(/\D/g, "")) || 0; }
  function ageOf(year) { var n = yearNumber(year); return n ? (n + 4) + " to " + (n + 5) : "primary"; }
  function uniq(arr) { var out = []; arr.forEach(function (x) { if (x && out.indexOf(x) === -1) out.push(x); }); return out; }
  function ids(value) { return list(value).map(function (x) { return clean(x, 20); }).filter(Boolean); }

  // ---------- 1. Learning ideas ----------
  function ideaPlanBrief(request) {
    return {
      system: [
        "You plan the knowledge for one primary lesson in England. Return one JSON object and nothing else. This is a plan, not lesson content: do not state facts.",
        "Pick 3 or 4 connected learning ideas a strong teacher would teach on this topic for this year group (age " + ageOf(request.yearGroup) + "), aligned where sensible with the England National Curriculum programme of study for that year; name the area in curriculumLink.",
        "Make the ideas substantial and evidence-based: include HOW WE KNOW (the evidence scientists or historians use and what can be worked out from it), and make at least two ideas about drawing conclusions from evidence, where a clue leads to a conclusion (for example a body part or trace that tells us about food, behaviour or movement). Include, where it fits, that ideas can change when new evidence is found.",
        "The ideas must connect: each later idea builds on an earlier one; say how in linksTo.",
        "question is what pupils can answer by the end. searchQueries are 2 short web searches that would find child-appropriate explanatory pages from museums, universities or educational publishers. keywords are 4 to 8 words likely to appear in a passage that explains the idea.",
        "JSON shape: { \"ideas\": [ { \"id\": \"i1\", \"title\": \"\", \"question\": \"\", \"curriculumLink\": \"\", \"linksTo\": \"\", \"searchQueries\": [\"\", \"\"], \"keywords\": [] } ] }."
      ].join(" "),
      user: JSON.stringify({ request: clean(request.lessonText, 400), topic: clean(request.topic, 120), yearGroup: clean(request.yearGroup, 20), subject: clean(request.subject, 40) })
    };
  }

  function parseIdeaPlan(raw) {
    var rows = list(raw && raw.ideas).slice(0, 4);
    var ideas = rows.map(function (row, index) {
      return {
        id: "i" + (index + 1),
        title: clean(row && row.title, 100),
        question: clean(row && row.question, 200),
        curriculumLink: clean(row && row.curriculumLink, 200),
        linksTo: clean(row && row.linksTo, 200),
        searchQueries: list(row && row.searchQueries).map(function (q) { return clean(q, 100); }).filter(Boolean).slice(0, 2),
        keywords: list(row && row.keywords).map(function (q) { return clean(q, 30).toLowerCase(); }).filter(Boolean).slice(0, 8)
      };
    }).filter(function (idea) { return idea.title && idea.question; });
    return { ok: ideas.length >= 3, ideas: ideas, issues: ideas.length >= 3 ? [] : ["IDEA_PLAN: fewer than 3 ideas"] };
  }

  // ---------- 2. Research ----------
  function keyOf(url) { return String(url || "").replace(/#.*$/, "").replace(/\/$/, "").replace(/^https?:\/\/(www\.)?/, "").toLowerCase(); }

  // ports: { fetch, searchProvider (optional, paid), discoveryProvider, savedCandidates [], allowlist, maxSources }
  function researchIdeas(ideas, request, ports) {
    var R = researchApi(ports);
    var record = {
      version: 2, mode: "story-research", startedAt: new Date().toISOString(),
      request: { lessonText: clean(request.lessonText, 400), topic: clean(request.topic, 120), yearGroup: clean(request.yearGroup, 20) },
      ideas: ideas.map(function (i) { return { id: i.id, title: i.title, question: i.question, searchQueries: i.searchQueries }; }),
      providers: [], discovered: [], sources: [], refused: [], passages: [], discoverySources: [], ideaPassageIds: {},
      evidencePolicy: "Search results and snippets only locate pages. Evidence is text fetched from the page itself, and only from evidence-tier sources (museums, universities, scientific organisations, government bodies, established educational publishers). Wikipedia and Simple English Wikipedia are discovery only."
    };
    var jobs = [];
    if (ports.searchProvider) {
      ideas.forEach(function (idea) {
        var queries = idea.searchQueries.length ? idea.searchQueries : [request.topic + " " + idea.title];
        jobs.push(Promise.resolve(ports.searchProvider.search(queries, ports, { topic: request.topic, yearGroup: request.yearGroup, learningGoal: idea.question })).then(function (result) {
          record.providers.push({ id: ports.searchProvider.id, idea: idea.id, paid: !!ports.searchProvider.paid, calls: result.calls || 0, searchCalls: result.searchCalls || 0, found: (result.candidates || []).length, error: result.error || "" });
          return (result.candidates || []).map(function (c) { return Object.assign({}, c, { idea: idea.id }); });
        }).catch(function (error) { record.providers.push({ id: ports.searchProvider.id, idea: idea.id, error: String(error && error.message || error) }); return []; }));
      });
    }
    if (ports.discoveryProvider) {
      jobs.push(Promise.resolve(ports.discoveryProvider.search(ideas.map(function (i) { return request.topic + " " + i.title; }).slice(0, 2), ports, request)).then(function (result) {
        record.providers.push({ id: ports.discoveryProvider.id, paid: false, found: (result.candidates || []).length });
        return result.candidates || [];
      }).catch(function () { return []; }));
    }
    return Promise.all(jobs).then(function (lists) {
      var fresh = [];
      lists.forEach(function (l) { fresh = fresh.concat(l); });
      var saved = list(ports.savedCandidates).map(function (c) { return Object.assign({ provider: "saved-search-replay" }, c); });
      var seen = {};
      var evidence = [];
      var discovery = [];
      var byIdea = {};
      fresh.forEach(function (c) { var k = c.idea || "_"; (byIdea[k] = byIdea[k] || []).push(c); });
      var keys = Object.keys(byIdea);
      var ordered = [];
      for (var i = 0; i < 40; i++) keys.forEach(function (k) { if (byIdea[k][i]) ordered.push(byIdea[k][i]); });
      ordered.concat(saved).forEach(function (c) {
        var k = keyOf(c.url);
        if (!k || seen[k]) return;
        seen[k] = 1;
        record.discovered.push({ url: c.url, title: c.title || "", provider: c.provider || "", idea: c.idea || "", snippetIgnored: true });
        var allowed = R.isAllowedUrl(c.url, ports.allowlist);
        if (!allowed.ok) { record.refused.push({ url: c.url, reason: allowed.reason }); return; }
        if (/(?:\.pdf(?:$|[?#])|\/download\/)/i.test(c.url)) { record.refused.push({ url: c.url, reason: "document download" }); return; }
        if (allowed.tier === "evidence") evidence.push(c); else discovery.push(c);
      });
      var maxSources = ports.maxSources || 22;
      var picked = evidence.slice(0, maxSources);
      evidence.slice(maxSources).forEach(function (c) { record.refused.push({ url: c.url, reason: "source cap reached" }); });
      var n = 0;
      return Promise.all(picked.map(function (c) { n += 1; return R.fetchSource(c, "S" + n, ports); })).then(function (results) {
        var disc = discovery.slice(0, ports.maxDiscovery || 2);
        return Promise.all(disc.map(function (c, index) { return R.fetchSource(c, "D" + (index + 1), ports); })).then(function (dres) {
          var follow = [];
          dres.forEach(function (d) {
            record.discoverySources.push({ url: d.url, title: d.title || "", tier: "discovery", ok: !!d.ok, citedEvidenceLinks: (d.citedEvidenceLinks || []).length, note: "Discovery only: this page's text is never evidence; its cited authoritative pages are followed." });
            (d.citedEvidenceLinks || []).forEach(function (href) { var k = keyOf(href); if (!seen[k]) { seen[k] = 1; follow.push({ url: href, provider: "wikipedia-reference", via: d.url }); } });
          });
          var topicWords = String(request.topic || "").toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 3; }).map(function (w) { return w.replace(/s$/, ""); });
          follow = follow.filter(function (f) { return topicWords.some(function (w) { return f.url.toLowerCase().indexOf(w) !== -1; }); }).slice(0, ports.maxFollowed || 3);
          return Promise.all(follow.map(function (c) { n += 1; record.discovered.push({ url: c.url, provider: c.provider, via: c.via, snippetIgnored: true }); return R.fetchSource(c, "S" + n, ports); })).then(function (more) { return results.concat(more); });
        });
      });
    }).then(function (results) {
      results.forEach(function (r) {
        if (!r.ok) { record.refused.push({ url: r.url, reason: r.reason }); return; }
        if (r.tier && r.tier !== "evidence") { record.refused.push({ url: r.url, reason: "not an evidence-tier source (discovery only)" }); return; }
        var sid = r.passages[0].sourceId;
        var domain = "";
        try { domain = new URL(r.url).hostname.replace(/^www\./, ""); } catch (e) { domain = ""; }
        record.sources.push({ sourceId: sid, url: r.url, title: r.title, domain: domain, rule: r.rule, tier: r.tier || "evidence", kind: r.kind || "", fetchMethod: r.fetchMethod, retrievedAt: r.retrievedAt, passageCount: r.passages.length });
        r.passages.forEach(function (p) { record.passages.push(p); });
      });
      ideas.forEach(function (idea) {
        var req = { topic: request.topic, learningGoal: idea.question + " " + idea.title, requiredEvidence: idea.keywords.join(" "), focusConcepts: idea.keywords };
        record.ideaPassageIds[idea.id] = R.rankPassages(record.passages, req, { maxPassages: 7, maxPerSource: 3, maxChars: 7000 }).map(function (row) { return row.id; });
      });
      record.finishedAt = new Date().toISOString();
      return record;
    });
  }

  // ---------- 3. Knowledge ----------
  function passageMap(record) {
    var map = {};
    list(record && record.passages).forEach(function (p) { if (p && p.id) map[p.id] = p; });
    return map;
  }

  function knowledgeBrief(request, ideas, record) {
    var map = passageMap(record);
    var used = {};
    var sources = [];
    ideas.forEach(function (idea) {
      list(record.ideaPassageIds[idea.id]).forEach(function (id) {
        var p = map[id];
        if (!p) return;
        if (used[id]) { used[id].forIdeas.push(idea.id); return; }
        used[id] = { id: id, title: clean(p.title, 140), url: clean(p.url, 300), forIdeas: [idea.id], text: clean(p.text, 1500) };
        sources.push(used[id]);
      });
    });
    return {
      system: [
        "You extract subject knowledge for one primary lesson from retrieved source passages. Return one JSON object and nothing else.",
        "sources are passages fetched from trusted pages. They are the only factual source. Do not use your own knowledge to add any fact, name, number, date, cause, or feature.",
        "For each idea write 2 or 3 claims (between 8 and 12 claims in total). Each claim is one sentence in simple words for age " + ageOf(request.yearGroup) + " that a teacher could check against its quote.",
        "Aim for substantial, connected, evidence-based knowledge: for each idea include, when the passages support it, the core explanation (often how we know: a piece of evidence and what it tells us), a concrete example (a named animal, object, or case), and a comparison or contrast (this one versus that one, then versus now). role is explanation, example, or comparison. Prefer claims where a clue leads to a conclusion. Where the passages give a size or measurement (length of a tooth, bone, footprint or animal), include it in a claim exactly as the source gives it (same number and unit, same hedge) so the story can compare it with a child; never convert or round.",
        "Each claim carries sourceRef (an array with one passage id from sources) and quote: one contiguous extract of 6 to 40 words copied character for character from that passage, which states everything the claim says. No ellipsis, no joined extracts, no changed words. Code checks every quote; a claim whose quote is not found is dropped.",
        "The claim must not add anything its quote does not say: no extra number, name, place, colour, size, cause, purpose, or generalisation. Keep hedges such as may, probably, or scientists think. If the claim links two things (because, so, allowed, helped, let, used for, shows, tells us), the quote itself must state that link. A claim about one named animal must not be widened to all animals.",
        "Leave out frightening or graphic detail. If the passages cannot support an idea, return it with no claims.",
        "vocabulary: up to 6 key words for the lesson, each with a short child-friendly gloss supported by its quote, sourceRef and quote as for claims.",
        "JSON shape: { \"ideas\": [ { \"id\": \"i1\", \"claims\": [ { \"text\": \"\", \"role\": \"explanation\", \"sourceRef\": [\"S1-P01\"], \"quote\": \"\" } ] } ], \"vocabulary\": [ { \"term\": \"\", \"gloss\": \"\", \"sourceRef\": [\"S1-P01\"], \"quote\": \"\" } ] }."
      ].join(" "),
      user: JSON.stringify({ request: clean(request.lessonText, 400), topic: clean(request.topic, 120), yearGroup: clean(request.yearGroup, 20), ideas: ideas.map(function (i) { return { id: i.id, title: i.title, question: i.question, curriculumLink: i.curriculumLink }; }), sources: sources })
    };
  }

  // Code quote check (lesson-brain quoteInPassage, evidence tier only), then the existing entailment pack.
  function admitClaims(raw, ideas, record, request, ports) {
    var B = brainApi(ports);
    var map = passageMap(record);
    var claims = [];
    var dropped = [];
    var byIdea = {};
    list(raw && raw.ideas).forEach(function (row) { if (row && row.id) byIdea[String(row.id)] = row; });
    ideas.forEach(function (idea) {
      list(byIdea[idea.id] && byIdea[idea.id].claims).slice(0, 4).forEach(function (c, index) {
        var text = clean(c && c.text, 300);
        var quote = clean(c && c.quote, 400);
        var refs = ids(c && c.sourceRef);
        var id = idea.id + "c" + (index + 1);
        var hit = "";
        var reason = refs.length ? "QUOTE_NOT_FOUND" : "UNRESOLVED_SOURCE";
        refs.forEach(function (r) {
          if (hit || !map[r]) return;
          if (!B.passageIsEvidence(map[r])) { reason = "SOURCE_NOT_EVIDENCE"; return; }
          var check = B.quoteInPassage(quote, map[r].text);
          if (check.ok) hit = r; else reason = check.reason;
        });
        // A verbatim quote cited against the wrong passage id is found in the passage that holds it.
        if (!hit && quote) Object.keys(map).some(function (pid) { if (B.passageIsEvidence(map[pid]) && B.quoteInPassage(quote, map[pid].text).ok) { hit = pid; return true; } return false; });
        if (!text || !hit) { dropped.push({ id: id, ideaId: idea.id, text: text, quote: quote, refs: refs, reason: !text ? "NO_TEXT" : reason }); return; }
        var passage = map[hit];
        claims.push({
          claimId: id, ideaId: idea.id, text: text, role: clean(c.role, 20).toLowerCase() || "explanation",
          provenance: "retrieved", quoteVerified: true, sourceQuote: quote, sourceRef: [hit],
          url: passage.url, title: passage.title, passageText: passage.text,
          wordsNotInSource: B.wordsNotInSource(text, quote, passage.text, request.topic), factuallyVerified: false
        });
      });
    });
    var vocabulary = [];
    list(raw && raw.vocabulary).slice(0, 6).forEach(function (v) {
      var refs = ids(v && v.sourceRef);
      var ok = refs.some(function (r) { return map[r] && B.passageIsEvidence(map[r]) && B.quoteInPassage(v.quote, map[r].text).ok; });
      if (ok && clean(v.term, 40)) vocabulary.push({ term: clean(v.term, 40), gloss: clean(v.gloss, 200), sourceRef: refs.slice(0, 1), quote: clean(v.quote, 300) });
    });
    return { pack: { sourceMode: "retrieved", claims: claims }, dropped: dropped, vocabulary: vocabulary };
  }

  function entailmentBrief(pack, record, ports) {
    return brainApi(ports).sourceEntailmentBrief(pack, { researchEvidence: record });
  }

  function applyEntailment(pack, raw, ports) {
    var B = brainApi(ports);
    B.applySourceEntailment(pack, B.parseSourceEntailment(raw));
    return pack;
  }

  function knowledgeOf(pack, ideas) {
    var supported = list(pack && pack.claims).filter(function (c) { return c.entailment === "supported" && !c.sourceHold; });
    var out = ideas.map(function (idea) {
      return Object.assign({}, idea, { claims: supported.filter(function (c) { return c.ideaId === idea.id; }).map(function (c) { return { id: c.claimId, text: c.text, role: c.role, quote: c.sourceQuote, sourceRef: c.sourceRef, url: c.url, title: c.title }; }) });
    }).filter(function (idea) { return idea.claims.length; });
    var byId = {};
    supported.forEach(function (c) { byId[c.claimId] = c; });
    return { ideas: out, claims: byId, held: list(pack && pack.claims).filter(function (c) { return !(c.entailment === "supported" && !c.sourceHold); }).map(function (c) { return { id: c.claimId, text: c.text, verdict: c.entailment, note: c.entailmentNote, quote: c.sourceQuote, url: c.url }; }) };
  }

  // ---------- 4. Story ----------
  function storyBrief(request, knowledge, opts) {
    opts = opts || {};
    var minutes = Number(request.requestedMinutes) || 30;
    return {
      system: [
        "You are an award-winning children's author and an expert primary teacher. Write one story-led lesson as one JSON object and nothing else.",
        "THE STORY must be great in its own right: 2 or 3 named, child-friendly main characters with distinct personalities; a clear goal stated in the opening scene; stakes (what goes wrong if they fail); rising tension with at least one setback; a climax; and a satisfying payoff that only works because of what the characters learned. Warm, funny and exciting for age " + ageOf(request.yearGroup) + ", never frightening. Short sentences and lively dialogue.",
        "THE STORY DOES THE TEACHING. Write one idea scene for each idea in knowledge, in the given order (each builds on the last). In every idea scene: the characters hit a real problem in the plot that they cannot solve yet (role problem); they discover the knowledge that solves it from someone or something in the story world, such as a museum expert, a book or a label (role discovery); the knowledge is explained properly: what it is and how we know (role explain), a concrete example (role example) and a comparison or contrast (role compare); then they use it to solve the problem and move the plot on (role use). The knowledge must be what unlocks the plot, not decoration. A 'how do we know' thread works well: the characters solve a mystery by reading clues in the evidence.",
        "FACTS. knowledge lists the only facts you may state. Any sentence that says something about the real world (science, history, animals, how we know, dates, sizes, places, how things work) is a fact sentence: it carries claimIds naming the claims it relies on and says no more than those claims say. Simpler words are fine; never add a number, name, colour, size, place, cause or purpose, and keep hedges such as may, probably or scientists think. A pure story sentence (what characters do, feel, or say about the plot) has claimIds [] and must not slip in a real-world fact. Never use your own knowledge for a fact. Teach every claim at least once.",
        "MEASURE IT AGAINST THE CHARACTERS. Make the learning personal: wherever a size, scale or feature is taught, the story moment compares it with one of the child characters (a tooth held next to a child's hand, a child standing inside a footprint, a leg bone lying beside a child to show it is longer than them). Any number in that moment must come from a cited claim, word for word in meaning; if no claim gives a measurement, compare only in words the claims support (for example longer than a hand only when a cited claim says how long it is or that it is very large), and never invent a figure. Put that scale moment in a beat with role compare or example and cite the claim. The children are present-day characters and stand only beside fossils, footprints, bones, casts and models.", "PEOPLE AND THE PAST. The adventure is clearly fiction. Never put present-day people beside living animals or people from the deep past, and do not use time travel. If the topic is about the deep past, the characters stay in the present day and meet the past through evidence (fossils, skeletons, footprints, museum displays, models, books). Animals from different periods never appear alive together.",
        "ACTIVITIES. Exactly 2 idea scenes (choose the 2 that fit best) contain an activity: a decision point in the plot that the class makes for the characters (for example 'Which clue tells us this animal ate plants?'). The activity uses a NEW example the class has not been told about (a new object, fossil, trace or situation described only by its features), so pupils apply what they learned instead of recalling a sentence. newCase describes the new example in one or two sentences, without saying the answer. instruction is the question the class answers. 3 choices with exactly one correct. Every choice has feedback explaining why it is right or wrong using the taught knowledge (feedback is a fact sentence with claimIds). successText is one story sentence about what the characters do next. Put the beats that come after the decision as role use.",
        "QUIZ. 6 questions after the last idea scene, covering every idea (at least one per idea). Short prompts. Each has 3 choices with exactly one defensible correct answer; wrong choices are plausible to a child but clearly false according to the knowledge (never something that is also true). The question must not contain its answer. explain says why the answer is right using the claims (a fact sentence with claimIds).",
        "Also write a climax scene (kind climax, 3 to 5 beats) where the characters combine what they learned, a resolution (2 or 3 beats: the payoff) and a recap with one line per idea (fact sentences with claimIds) that shows how the ideas connect.",
        "Sizes: opening 3 to 5 beats; each idea scene 6 to 9 beats including at least one beat of each role problem, discovery, explain, example, compare and use. Each beat is one or two short sentences. The whole lesson should take about " + minutes + " minutes in class.",
        "PICTURES. Every scene has image: one sentence describing the story picture (place, characters, action, key objects), and pastLife: a list of any living things from the deep past shown alive in it (it must be empty whenever people are in the picture). Every idea scene has teachingImage: what a teaching picture must show so pupils can SEE the evidence or feature taught in that scene (for example a side-by-side of two kinds of fossil tooth, a fossil footprint, a feather impression in rock, or one named animal's body part): subject (one named thing from the claims), feature, view (close-up, comparison, or scale), comparedWith (for a comparison, also from the claims; for scale, the name of the child character who stands or holds a hand beside it), claimIds. Use view scale whenever the scene teaches a size: the picture then shows that child beside the fossil or evidence so pupils can judge its size against a child.",
        "Words: everyday words for the year group; a key science word is fine when the story explains it.",
        "JSON shape: { \"title\": \"\", \"characters\": [ { \"name\": \"\", \"role\": \"\", \"personality\": \"\", \"look\": \"short visual description\" } ], \"setting\": \"\", \"goal\": \"\", \"stakes\": \"\", \"scenes\": [ { \"id\": \"opening\", \"kind\": \"opening\", \"title\": \"\", \"image\": { \"description\": \"\", \"pastLife\": [] }, \"beats\": [ { \"role\": \"story\", \"speaker\": \"Narrator or a character name\", \"text\": \"\", \"claimIds\": [] } ] }, { \"id\": \"s1\", \"kind\": \"idea\", \"ideaId\": \"i1\", \"title\": \"\", \"image\": { \"description\": \"\", \"pastLife\": [] }, \"teachingImage\": { \"subject\": \"\", \"feature\": \"\", \"view\": \"comparison\", \"comparedWith\": \"\", \"claimIds\": [] }, \"beats\": [ { \"role\": \"problem\", \"speaker\": \"\", \"text\": \"\", \"claimIds\": [] } ], \"activity\": null } ], \"quiz\": [ { \"prompt\": \"\", \"choices\": [\"\", \"\", \"\"], \"correct\": \"\", \"explain\": \"\", \"ideaId\": \"i1\", \"claimIds\": [] } ], \"resolution\": [ { \"role\": \"story\", \"speaker\": \"\", \"text\": \"\", \"claimIds\": [] } ], \"recap\": [ { \"text\": \"\", \"claimIds\": [] } ] }. An activity is { \"instruction\": \"\", \"newCase\": \"\", \"choices\": [ { \"text\": \"\", \"correct\": true, \"feedback\": \"\", \"claimIds\": [] } ], \"successText\": \"\", \"claimIds\": [] }."
      ].join(" "),
      user: JSON.stringify({
        request: clean(request.lessonText, 400), topic: clean(request.topic, 120), yearGroup: clean(request.yearGroup, 20), minutes: minutes,
        knowledge: knowledge.ideas.map(function (idea) { return { id: idea.id, title: idea.title, question: idea.question, linksTo: idea.linksTo, claims: idea.claims.map(function (c) { return { id: c.id, text: c.text, role: c.role }; }) }; }),
        vocabulary: (opts.vocabulary || []).map(function (v) { return { term: v.term, gloss: v.gloss }; })
      })
    };
  }

  function normBeat(b) {
    var role = clean(b && b.role, 20).toLowerCase();
    if (!BEAT_ROLES[role]) role = "story";
    return { role: role, speaker: clean(b && b.speaker, 40), text: clean(b && b.text, 400), claimIds: ids(b && b.claimIds) };
  }

  function parseStory(raw) {
    var issues = [];
    var story = {
      title: clean(raw && raw.title, 120), setting: clean(raw && raw.setting, 300), goal: clean(raw && raw.goal, 300), stakes: clean(raw && raw.stakes, 300),
      characters: list(raw && raw.characters).slice(0, 4).map(function (c) { return { name: clean(c && c.name, 30), role: clean(c && c.role, 80), personality: clean(c && c.personality, 160), look: clean(c && c.look, 200) }; }).filter(function (c) { return c.name; }),
      scenes: [], quiz: [], resolution: [], recap: []
    };
    var ideaCount = 0;
    list(raw && raw.scenes).slice(0, 8).forEach(function (s, index) {
      var kind = clean(s && s.kind, 20).toLowerCase();
      if (["opening", "idea", "climax"].indexOf(kind) === -1) kind = index === 0 ? "opening" : "idea";
      if (kind === "idea") ideaCount += 1;
      var t = s && s.teachingImage;
      var scene = {
        id: kind === "opening" ? "opening" : kind === "climax" ? "climax" : "s" + ideaCount,
        kind: kind, ideaId: clean(s && s.ideaId, 10), title: clean(s && s.title, 80),
        image: { description: clean(s && s.image && s.image.description, 400), pastLife: list(s && s.image && s.image.pastLife).map(function (x) { return clean(x, 40); }).filter(Boolean).slice(0, 4) },
        teachingImage: t && typeof t === "object" ? { subject: clean(t.subject, 80), feature: clean(t.feature, 200), view: /scale/i.test(String(t.view || "")) ? "scale" : /compar/i.test(String(t.view || "")) ? "comparison" : "close-up", comparedWith: clean(t.comparedWith, 80), claimIds: ids(t.claimIds) } : null,
        beats: list(s && s.beats).slice(0, 12).map(normBeat).filter(function (b) { return b.text; }),
        activity: null
      };
      var a = s && s.activity;
      if (a && typeof a === "object" && list(a.choices).length >= 2) {
        scene.activity = {
          instruction: clean(a.instruction, 200), newCase: clean(a.newCase, 400), successText: clean(a.successText, 300), claimIds: ids(a.claimIds),
          choices: list(a.choices).slice(0, 3).map(function (c) { return { text: clean(c && c.text, 140), correct: !!(c && c.correct === true), feedback: clean(c && c.feedback, 400), claimIds: ids(c && c.claimIds) }; })
        };
      }
      if (scene.beats.length) story.scenes.push(scene);
    });
    list(raw && raw.quiz).slice(0, 8).forEach(function (q) {
      var choices = list(q && q.choices).map(function (c) { return clean(c, 140); }).filter(Boolean).slice(0, 3);
      var correct = clean(q && q.correct, 140);
      if (choices.length < 2 || choices.indexOf(correct) === -1) { issues.push("QUIZ_SHAPE: dropped a question whose correct answer is not one of its choices (" + clean(q && q.prompt, 80) + ")"); return; }
      story.quiz.push({ prompt: clean(q.prompt, 200), choices: choices, correct: correct, explain: clean(q.explain, 300), ideaId: clean(q.ideaId, 10), claimIds: ids(q.claimIds) });
    });
    story.resolution = list(raw && raw.resolution).slice(0, 4).map(normBeat).filter(function (b) { return b.text; });
    story.recap = list(raw && raw.recap).slice(0, 5).map(function (r) { return { text: clean(r && r.text, 300), claimIds: ids(r && r.claimIds) }; }).filter(function (r) { return r.text; });
    return { story: story, issues: issues };
  }

  // Every pupil-facing sentence, with an id the repair and fallback can address.
  function pupilItems(story) {
    var items = [];
    function add(id, kind, text, claimIds, extra) { if (clean(text)) items.push(Object.assign({ id: id, kind: kind, text: clean(text, 700), claimIds: (claimIds || []).slice() }, extra || {})); }
    story.scenes.forEach(function (scene) {
      scene.beats.forEach(function (b, i) { add(scene.id + ".b" + i, b.role, b.text, b.claimIds, { scene: scene.id }); });
      var a = scene.activity;
      if (a) {
        add(scene.id + ".act.instruction", "activity-instruction", a.instruction, a.claimIds, { scene: scene.id });
        add(scene.id + ".act.newCase", "activity-new-case", a.newCase, [], { scene: scene.id });
        a.choices.forEach(function (c, i) { add(scene.id + ".act.c" + i + ".feedback", "activity-feedback", "(" + (c.correct ? "correct" : "wrong") + " choice: " + c.text + ") " + c.feedback, c.claimIds, { scene: scene.id }); });
        add(scene.id + ".act.successText", "activity-success", a.successText, [], { scene: scene.id });
      }
    });
    story.quiz.forEach(function (q, i) {
      add("quiz.q" + i + ".answer", "quiz-answer", "Question: " + q.prompt + " Answer: " + q.correct, q.claimIds);
      add("quiz.q" + i + ".explain", "quiz-explain", q.explain, q.claimIds);
    });
    story.resolution.forEach(function (b, i) { add("resolution.b" + i, b.role, b.text, b.claimIds); });
    story.recap.forEach(function (r, i) { add("recap.r" + i, "recap", r.text, r.claimIds); });
    return items;
  }

  // ---------- 5. Support check (the only hard block) ----------
  function supportBrief(items, knowledge, story, request) {
    return {
      system: [
        "You check every pupil-facing sentence of a story-led primary lesson against its sources. Return one JSON object and nothing else.",
        "For each item decide factual: true when the sentence says anything about the real world (science, history, animals, how we know, dates, sizes, places, how things work), even inside dialogue or story; false when it is only story (what invented characters do, feel or say about the plot, or an invented example in an activity that is described but not claimed to be real).",
        "For a factual item, read cited (the claims it names, each with its verbatim quote and the source passage). verdict is supported only when the quotes, read in their passages, state everything the sentence says about the real world; simpler words for children are fine when the meaning is the same; story framing around the fact (who says it, where, feelings) is fine. verdict is partial when part is supported and part is added; unsupported when it adds a real-world fact, number, name, colour, size, cause, purpose or generalisation the quotes do not state, drops a hedge the source keeps, widens a fact about one animal to all, contradicts them, or cites nothing. For a quiz-answer item, judge whether the answer to the question is supported. For an activity-feedback item, judge the real-world reasons it gives; the invented example itself is story.",
        "A comparison with a story character's body (longer than Mia's hand, taller than Sam, big enough to stand in) is factual: it is supported only when a cited quote gives the size (or says it is very large or small) and the comparison follows plainly from it for an ordinary child of the year group; any number must match the quote. For a story-only item verdict is story.",
        "wordsNotInSource lists words of the sentence that appear in no cited quote or passage. Place each one in wording (simpler wording for words in the quotes), story (story or character words that state no real-world fact), or addedFacts (it states something real the quotes do not say). problem: one short sentence saying what is unsupported; empty when supported or story.",
        "Do not use your own knowledge to fill a gap and do not judge truth in the world; judge only support by the cited quotes.",
        "JSON shape: { \"results\": [ { \"id\": \"\", \"factual\": true, \"verdict\": \"supported\" or \"partial\" or \"unsupported\" or \"story\", \"problem\": \"\", \"wording\": [], \"story\": [], \"addedFacts\": [] } ] }."
      ].join(" "),
      user: JSON.stringify({ topic: clean(request.topic, 120), characters: story.characters.map(function (c) { return c.name; }), items: items.map(function (item) {
        var cited = item.claimIds.map(function (id) { var c = knowledge.claims[id]; return c ? { claimId: id, claim: c.text, quote: c.sourceQuote, passage: clean(c.passageText, 900) } : { claimId: id, missing: true }; });
        return { id: item.id, kind: item.kind, text: item.text, cited: cited, wordsNotInSource: item.wordsNotInSource || [] };
      }) })
    };
  }

  function annotateWords(items, knowledge, story, request, ports) {
    var B = brainApi(ports);
    var names = story.characters.map(function (c) { return c.name; }).join(" ");
    items.forEach(function (item) {
      var quotes = item.claimIds.map(function (id) { return knowledge.claims[id] ? knowledge.claims[id].sourceQuote : ""; }).join(" ");
      var passages = item.claimIds.map(function (id) { return knowledge.claims[id] ? knowledge.claims[id].passageText : ""; }).join(" ");
      item.wordsNotInSource = item.claimIds.length ? B.wordsNotInSource(item.text, quotes, passages, request.topic + " " + names) : [];
    });
    return items;
  }

  // Code rules over the model verdicts. They only ever turn a pass into a fail.
  function judgeSupport(items, raw, knowledge, story) {
    var rows = {};
    list(raw && raw.results).forEach(function (r) { if (r && r.id) rows[String(r.id)] = r; });
    var nameWords = story.characters.map(function (c) { return c.name.toLowerCase(); });
    return items.map(function (item) {
      var r = rows[item.id];
      var out = { id: item.id, kind: item.kind, text: item.text, claimIds: item.claimIds, factual: null, verdict: "unchecked", problem: "", ok: false };
      if (!r) { out.problem = "no verdict returned"; return out; }
      var unknown = item.claimIds.filter(function (id) { return !knowledge.claims[id]; });
      out.factual = r.factual === true;
      out.verdict = clean(r.verdict, 20).toLowerCase();
      out.problem = clean(r.problem, 240);
      if (unknown.length) { out.verdict = "unsupported"; out.problem = "cites unknown or held claims: " + unknown.join(", "); return out; }
      if (out.verdict === "story") {
        if (out.factual) { out.verdict = "unsupported"; out.problem = out.problem || "a real-world fact was classed as story"; return out; }
        out.ok = true; return out;
      }
      if (!item.claimIds.length) { out.verdict = "unsupported"; out.problem = out.problem || "UNCITED_FACT: a real-world fact with no claim"; return out; }
      if (out.verdict !== "supported") return out;
      var placed = {};
      list(r.wording).concat(list(r.story)).forEach(function (w) { placed[clean(w, 40).toLowerCase()] = 1; });
      var added = list(r.addedFacts).map(function (w) { return clean(w, 40).toLowerCase(); }).filter(Boolean);
      var unexplained = (item.wordsNotInSource || []).filter(function (w) { return (!placed[w] || added.indexOf(w) !== -1) && nameWords.indexOf(w) === -1; });
      if (added.length || unexplained.length) { out.verdict = "partial"; out.problem = "ADDED_DETAIL: " + uniq(added.concat(unexplained)).join(", "); return out; }
      out.ok = true;
      return out;
    });
  }

  function repairBrief(story, failures, knowledge, request) {
    return {
      system: [
        "You fix sentences in a story-led primary lesson that an automated check found unsupported by their sources. Return one JSON object and nothing else.",
        "For each item, rewrite text so it keeps its job in the story but either (a) says only what the cited claims say, citing them in claimIds (simpler words are fine; add no number, name, colour, size, cause, purpose or generalisation; keep hedges), or (b) becomes pure story with no real-world fact and claimIds []. Use only claims from knowledge. Keep the speaker's voice. For an activity-feedback item return only the feedback sentence (not the choice). For a quiz-answer item put the corrected answer in answer (keep the question).",
        "JSON shape: { \"fixes\": [ { \"id\": \"\", \"text\": \"\", \"claimIds\": [], \"answer\": \"\" } ] }."
      ].join(" "),
      user: JSON.stringify({ yearGroup: clean(request.yearGroup, 20), characters: story.characters.map(function (c) { return c.name; }), knowledge: Object.keys(knowledge.claims).map(function (id) { return { id: id, text: knowledge.claims[id].text }; }), items: failures.map(function (f) { return { id: f.id, kind: f.kind, text: f.text, claimIds: f.claimIds, problem: f.problem }; }) })
    };
  }

  function sceneById(story, id) { return story.scenes.filter(function (s) { return s.id === id; })[0]; }

  function locate(story, id) {
    var m, sc;
    if ((m = id.match(/^(opening|climax|s\d+)\.b(\d+)$/))) { sc = sceneById(story, m[1]); return sc && sc.beats[Number(m[2])] ? { obj: sc.beats[Number(m[2])], field: "text" } : null; }
    if ((m = id.match(/^(s\d+)\.act\.(instruction|newCase|successText)$/))) { sc = sceneById(story, m[1]); return sc && sc.activity ? { obj: sc.activity, field: m[2], activityOf: sc } : null; }
    if ((m = id.match(/^(s\d+)\.act\.c(\d+)\.feedback$/))) { sc = sceneById(story, m[1]); return sc && sc.activity && sc.activity.choices[Number(m[2])] ? { obj: sc.activity.choices[Number(m[2])], field: "feedback", activityOf: sc } : null; }
    if ((m = id.match(/^quiz\.q(\d+)\.(answer|explain)$/))) return story.quiz[Number(m[1])] ? { obj: story.quiz[Number(m[1])], field: m[2] === "answer" ? "correct" : "explain", quizIndex: Number(m[1]) } : null;
    if ((m = id.match(/^resolution\.b(\d+)$/))) return story.resolution[Number(m[1])] ? { obj: story.resolution[Number(m[1])], field: "text" } : null;
    if ((m = id.match(/^recap\.r(\d+)$/))) return story.recap[Number(m[1])] ? { obj: story.recap[Number(m[1])], field: "text" } : null;
    return null;
  }

  function applyRepair(story, raw, failures) {
    var applied = [];
    var wanted = {};
    failures.forEach(function (f) { wanted[f.id] = f; });
    list(raw && raw.fixes).forEach(function (fix) {
      var id = clean(fix && fix.id, 60);
      if (!wanted[id]) return;
      var at = locate(story, id);
      if (!at || !at.obj) return;
      var cited = ids(fix.claimIds);
      if (at.quizIndex != null) {
        var q = at.obj;
        if (at.field === "correct") {
          var answer = clean(fix.answer || fix.text, 140).replace(/^answer:\s*/i, "");
          if (!answer || answer === q.correct) return;
          q.choices[q.choices.indexOf(q.correct)] = answer; q.correct = answer;
          if (cited.length) q.claimIds = cited;
        } else {
          var ex = clean(fix.text, 300);
          if (!ex || ex === q.explain) return;
          q.explain = ex; if (cited.length) q.claimIds = uniq(q.claimIds.concat(cited));
        }
        applied.push(id); return;
      }
      var text = clean(fix.text, 400).replace(/^\((?:correct|wrong) choice:[^)]*\)\s*/i, "");
      if (!text || text === at.obj[at.field]) return;
      at.obj[at.field] = text;
      if (at.field === "text" || at.field === "feedback" || at.field === "instruction") at.obj.claimIds = cited;
      applied.push(id);
    });
    return applied;
  }

  // Code fallback after the one repair: a teaching or recap sentence becomes its first cited claim's
  // checked text; anything else that still fails is removed. Every change is recorded.
  function fallback(story, failures, knowledge) {
    var log = [];
    var dropQuiz = [];
    var dropActivity = [];
    failures.forEach(function (f) {
      var at = locate(story, f.id);
      if (!at || !at.obj) return;
      var first = (f.claimIds || []).filter(function (id) { return knowledge.claims[id]; })[0];
      if (at.quizIndex != null) { if (dropQuiz.indexOf(at.quizIndex) === -1) dropQuiz.push(at.quizIndex); log.push({ id: f.id, action: "removed question", was: f.text, problem: f.problem }); return; }
      if (at.field === "feedback" && first) { log.push({ id: f.id, action: "replaced with checked claim text", was: at.obj.feedback, now: knowledge.claims[first].text, problem: f.problem }); at.obj.feedback = knowledge.claims[first].text; at.obj.claimIds = [first]; return; }
      if (at.activityOf) {
        if (at.field === "successText" || at.field === "newCase") { log.push({ id: f.id, action: "removed sentence", was: f.text, problem: f.problem }); at.obj[at.field] = ""; return; }
        dropActivity.push(at.activityOf.id); log.push({ id: f.id, action: "removed activity", was: f.text, problem: f.problem }); return;
      }
      if (first) {
        log.push({ id: f.id, action: "replaced with checked claim text", was: at.obj.text, now: knowledge.claims[first].text, problem: f.problem });
        at.obj.text = knowledge.claims[first].text; at.obj.claimIds = [first]; at.obj.speaker = "";
        return;
      }
      at.obj.__remove = true; log.push({ id: f.id, action: "removed sentence", was: f.text, problem: f.problem });
    });
    story.scenes.forEach(function (s) { s.beats = s.beats.filter(function (b) { return !b.__remove; }); if (dropActivity.indexOf(s.id) !== -1) s.activity = null; });
    story.resolution = story.resolution.filter(function (b) { return !b.__remove; });
    story.recap = story.recap.filter(function (b) { return !b.__remove; });
    story.quiz = story.quiz.filter(function (q, i) { return dropQuiz.indexOf(i) === -1; });
    return log;
  }

  // ---------- 6. Quality pass (warnings only) ----------
  function storyView(story) {
    return {
      title: story.title, goal: story.goal, stakes: story.stakes, characters: story.characters,
      scenes: story.scenes.map(function (s) { return { id: s.id, kind: s.kind, ideaId: s.ideaId, title: s.title, beats: s.beats.map(function (b) { return b.role + " | " + (b.speaker || "Narrator") + ": " + b.text; }), activity: s.activity, image: s.image, teachingImage: s.teachingImage }; }),
      quiz: story.quiz, resolution: story.resolution.map(function (b) { return b.text; }), recap: story.recap.map(function (r) { return r.text; })
    };
  }

  function qualityBrief(story, knowledge, request) {
    return {
      system: [
        "You review a story-led primary lesson for a year group. Return one JSON object and nothing else. Your findings are warnings for a teacher; be specific and brief.",
        "story: does it have named characters, a clear goal, tension or a setback, and a payoff; is each idea learned through a moment in the adventure (problem, discovery, use) rather than facts read over a backdrop? Rate 1 to 5 and note weaknesses.",
        "vocabulary: words a child of age " + ageOf(request.yearGroup) + " is unlikely to know that the lesson does not explain (at most 8).",
        "questions: for each quiz question (index from 0): oneDefensibleAnswer, wrongChoicesFalse (every wrong choice is clearly false according to knowledge; a wrong choice that is also true or partly true makes this false), plausibleDistractors, assessesTaught, notCircular; add a note when any is false.",
        "activities: for each activity (by scene id): newExample (the case is new, not a sentence already taught), usesTaughtKnowledge, feedbackExplainsWhy, oneCorrect; add a note when any is false.",
        "depth: for each idea: hasExplanation, hasExample, hasComparison, howWeKnow (the lesson says what evidence tells us this).",
        "periods: any place where animals from different periods appear alive together or present-day people appear beside living animals from the deep past (pictures or text).",
        "JSON shape: { \"story\": { \"rating\": 0, \"notes\": [] }, \"vocabulary\": [ { \"word\": \"\", \"where\": \"\" } ], \"questions\": [ { \"index\": 0, \"oneDefensibleAnswer\": true, \"wrongChoicesFalse\": true, \"plausibleDistractors\": true, \"assessesTaught\": true, \"notCircular\": true, \"note\": \"\" } ], \"activities\": [ { \"scene\": \"\", \"newExample\": true, \"usesTaughtKnowledge\": true, \"feedbackExplainsWhy\": true, \"oneCorrect\": true, \"note\": \"\" } ], \"depth\": [ { \"ideaId\": \"\", \"hasExplanation\": true, \"hasExample\": true, \"hasComparison\": true, \"howWeKnow\": true, \"note\": \"\" } ], \"periods\": [ { \"where\": \"\", \"note\": \"\" } ] }."
      ].join(" "),
      user: JSON.stringify({ yearGroup: clean(request.yearGroup, 20), knowledge: knowledge.ideas.map(function (i) { return { id: i.id, title: i.title, claims: i.claims.map(function (c) { return c.id + ": " + c.text; }) }; }), lesson: storyView(story) })
    };
  }

  function qualityWarnings(raw) {
    var w = [];
    if (!raw || typeof raw !== "object") return [{ check: "quality", text: "the quality review returned no result" }];
    var st = raw.story || {};
    if (Number(st.rating)) w.push({ check: "story", rating: Number(st.rating), text: "story rated " + st.rating + "/5 by the automated review" });
    list(st.notes).slice(0, 4).forEach(function (n) { w.push({ check: "story", text: clean(n, 240) }); });
    list(raw.vocabulary).slice(0, 8).forEach(function (v) { w.push({ check: "vocabulary", text: clean(v.word, 40) + (v.where ? " (" + clean(v.where, 60) + ")" : "") }); });
    list(raw.questions).forEach(function (q) {
      var bad = ["oneDefensibleAnswer", "wrongChoicesFalse", "plausibleDistractors", "assessesTaught", "notCircular"].filter(function (k) { return q[k] === false; });
      if (bad.length) w.push({ check: "question", index: Number(q.index), fields: bad, text: "Q" + (Number(q.index) + 1) + ": " + bad.join(", ") + " false" + (q.note ? " (" + clean(q.note, 200) + ")" : "") });
    });
    list(raw.activities).forEach(function (a) {
      var bad = ["newExample", "usesTaughtKnowledge", "feedbackExplainsWhy", "oneCorrect"].filter(function (k) { return a[k] === false; });
      if (bad.length) w.push({ check: "activity", scene: clean(a.scene, 10), text: "activity in " + clean(a.scene, 10) + ": " + bad.join(", ") + " false" + (a.note ? " (" + clean(a.note, 200) + ")" : "") });
    });
    list(raw.depth).forEach(function (d) {
      var bad = ["hasExplanation", "hasExample", "hasComparison", "howWeKnow"].filter(function (k) { return d[k] === false; });
      if (bad.length) w.push({ check: "depth", text: "idea " + clean(d.ideaId, 10) + ": no " + bad.join(", ") + (d.note ? " (" + clean(d.note, 200) + ")" : "") });
    });
    list(raw.periods).forEach(function (p) { if (clean(p.note)) w.push({ check: "periods", text: clean(p.where, 60) + ": " + clean(p.note, 200) }); });
    return w;
  }

  function questionRepairBrief(story, knowledge, flagged, request) {
    return {
      system: [
        "You rewrite flagged quiz questions in a primary lesson. Return one JSON object and nothing else.",
        "Each rewritten question has a short prompt that does not contain its answer, 3 choices with exactly one defensible correct answer, wrong choices that are plausible to a child of age " + ageOf(request.yearGroup) + " but clearly false according to knowledge (never also true or partly true), an explain sentence that says why using only the cited claims, and claimIds. Use only knowledge; add no fact.",
        "JSON shape: { \"questions\": [ { \"index\": 0, \"prompt\": \"\", \"choices\": [\"\", \"\", \"\"], \"correct\": \"\", \"explain\": \"\", \"claimIds\": [] } ] }."
      ].join(" "),
      user: JSON.stringify({ knowledge: Object.keys(knowledge.claims).map(function (id) { return { id: id, text: knowledge.claims[id].text }; }), flagged: flagged.map(function (f) { return { index: f.index, problem: f.text, question: story.quiz[f.index] }; }) })
    };
  }

  function estimateMinutes(story) {
    var beats = 0;
    story.scenes.forEach(function (s) { beats += s.beats.length; });
    beats += story.resolution.length + story.recap.length;
    var acts = story.scenes.filter(function (s) { return s.activity; }).length;
    return Math.round(beats * 20 / 60 + acts * 2 + story.quiz.length * 0.75);
  }

  // Cheap code checks (warnings only).
  function codeWarnings(story, knowledge, request) {
    var w = [];
    var ideaScenes = story.scenes.filter(function (s) { return s.kind === "idea"; });
    var acts = ideaScenes.filter(function (s) { return s.activity; });
    if (knowledge.ideas.length < 3) w.push({ check: "knowledge", text: "only " + knowledge.ideas.length + " ideas have supported claims (3 to 4 wanted)" });
    var claimCount = Object.keys(knowledge.claims).length;
    if (claimCount < 6) w.push({ check: "knowledge", text: "only " + claimCount + " supported claims (6 to 10 wanted)" });
    if (acts.length < 2) w.push({ check: "activities", text: acts.length + " choose activities (2 wanted)" });
    acts.forEach(function (s) { var n = s.activity.choices.filter(function (c) { return c.correct; }).length; if (n !== 1) w.push({ check: "activities", text: s.id + " activity has " + n + " correct choices" }); });
    if (story.quiz.length < 5 || story.quiz.length > 8) w.push({ check: "quiz", text: story.quiz.length + " quiz questions (5 to 8 wanted)" });
    knowledge.ideas.forEach(function (idea) { if (!story.quiz.some(function (q) { return q.ideaId === idea.id || q.claimIds.some(function (id) { return id.indexOf(idea.id + "c") === 0; }); })) w.push({ check: "quiz", text: "no quiz question on idea " + idea.id + " (" + idea.title + ")" }); });
    ideaScenes.forEach(function (s) {
      var roles = s.beats.map(function (b) { return b.role; });
      var missing = ["problem", "explain", "example", "compare", "use"].filter(function (r) { return roles.indexOf(r) === -1; });
      if (missing.length) w.push({ check: "structure", text: s.id + " (" + s.title + ") has no " + missing.join(", ") + " beat" });
    });
    var taught = {};
    pupilItems(story).forEach(function (i) { i.claimIds.forEach(function (id) { taught[id] = 1; }); });
    Object.keys(knowledge.claims).forEach(function (id) { if (!taught[id]) w.push({ check: "coverage", text: "claim " + id + " is never taught: " + knowledge.claims[id].text }); });
    // Scale against the characters: a sourced measurement should get a child-beside-it moment and picture.
    var MEASURE = /\b\d+(?:[.,]\d+)?\s*(?:cm|centimetres?|mm|millimetres?|m|metres?|meters?|feet|foot|ft|inches|in|kg|kilograms?|tonnes?|tons?)\b/i;
    var measured = Object.keys(knowledge.claims).filter(function (id) { return MEASURE.test(knowledge.claims[id].text); });
    if (measured.length && !ideaScenes.some(function (s) { return s.teachingImage && s.teachingImage.view === "scale"; })) w.push({ check: "scale", text: "sizes are taught (" + measured.join(", ") + ") but no teaching picture shows a child beside the evidence for scale" });
    pupilItems(story).forEach(function (i) {
      var nums = String(i.text).match(/\b\d+(?:[.,]\d+)?\b/g) || [];
      if (!nums.length || /^quiz/.test(i.id)) return;
      var cited = i.claimIds.map(function (id) { return knowledge.claims[id] ? knowledge.claims[id].text + " " + knowledge.claims[id].sourceQuote : ""; }).join(" ");
      var stray = nums.filter(function (n) { return cited.indexOf(n) === -1; });
      if (stray.length) w.push({ check: "scale", text: i.id + " uses a number not in its cited claims (" + stray.join(", ") + "): " + clean(i.text, 160) });
    });
    var est = estimateMinutes(story);
    var want = Number(request.requestedMinutes) || 30;
    if (Math.abs(est - want) > Math.max(5, want * 0.25)) w.push({ check: "timing", text: "estimated " + est + " minutes against " + want + " requested" });
    return w;
  }

  // ---------- 7. Pictures (plan only; generation is the caller's job) ----------
  var STORY_STYLE = "Rich, painterly children's picture-book illustration with depth, natural light and expressive characters; a proper storybook scene, not clip art and not a flat cartoon. It is clearly an imagined story scene.";
  var TEACH_STYLE = "Clear, accurate natural-history-museum style illustration for a primary science lesson, realistic textures, plain soft background, the evidence or feature large and easy to see.";
  var COMPOSITION = "Composition: a text panel will cover the lower left of the picture (the left 58%, from halfway down to near the bottom). Keep every important subject in the top half or the right 42% of the picture, and keep the lower-left area plain background.";

  function imagePlan(story) {
    var assets = [];
    var limitations = [];
    var cast = story.characters.map(function (c) { return c.name + " (" + (c.look || c.role) + ")"; }).join("; ");
    var scenes = story.scenes.slice();
    if (story.resolution.length) scenes.push({ id: "resolution", kind: "resolution", title: "Payoff", image: { description: story.resolution.map(function (b) { return b.text; }).join(" "), pastLife: [] } });
    scenes.forEach(function (s) {
      var past = (s.image && s.image.pastLife) || [];
      var rule;
      if (past.length) {
        rule = "No people anywhere in the picture. The only living animal shown is " + past[0] + ", one kind of animal only.";
        if (past.length > 1) limitations.push({ id: "scene-" + s.id, limitation: "The story listed " + past.join(", ") + " alive together; the picture keeps one kind (" + past[0] + ") so periods are never mixed." });
      } else {
        rule = "The people are present-day characters. No living prehistoric animals anywhere: anything from the deep past appears only as fossils, skeletons, footprints, models or museum displays.";
      }
      var prompt = [STORY_STYLE, "Scene: " + clean(s.image && s.image.description, 400), past.length ? "" : "Characters: " + cast + ".", story.setting ? "Setting: " + clean(story.setting, 200) + "." : "", rule, "No text, letters, numbers or labels anywhere in the image. Child-friendly, not frightening.", COMPOSITION].filter(Boolean).join(" ");
      assets.push({ id: "scene-" + s.id, type: "scene", sceneId: s.id, framing: "story", frameLabel: "Story picture: an imagined adventure scene", prompt: prompt, brief: { educationalFocus: s.title }, pastLife: past.slice(0, 1) });
    });
    story.scenes.forEach(function (s) {
      var t = s.teachingImage;
      if (!t || !t.subject) return;
      var child = t.view === "scale" ? story.characters.filter(function (c) { return t.comparedWith && c.name.toLowerCase() === String(t.comparedWith).toLowerCase(); })[0] || story.characters[0] : null;
      var view = child
        ? "A size comparison: " + t.subject + " (a fossil, cast or model, not a living animal) shown at true scale beside " + child.name + ", a present-day child (" + clean(child.look || child.role, 120) + "), standing or holding a hand next to it so its size can be judged against the child. What to notice: " + t.feature + "."
        : t.view === "comparison" && t.comparedWith
        ? "A side-by-side comparison in two clearly separate panels across the top half of the picture: on the left, " + t.subject + "; on the right, " + t.comparedWith + ". The difference to notice: " + t.feature + "."
        : "A close-up of " + t.subject + " that makes this easy to see: " + t.feature + ".";
      var people = child ? "The only person is that one child, beside the fossil or evidence; no living prehistoric animals." : "No people.";
      var prompt = [TEACH_STYLE, view, "Show only what is described, one kind of animal or object per panel. " + people + " No text, letters, numbers, rulers with numbers, arrows or labels.", COMPOSITION].join(" ");
      if (t.view === "scale" && !child) limitations.push({ id: "teach-" + s.id, limitation: "Scale picture asked for but the story has no characters; drawn without a child." });
      assets.push({ id: "teach-" + s.id, type: "teaching", sceneId: s.id, framing: "teaching", view: t.view, subject: t.subject, compared: t.comparedWith, feature: t.feature, claimIds: t.claimIds, scaleCharacter: child ? child.name : "", frameLabel: "Teaching picture: " + (child ? "size against " + child.name : t.view === "comparison" ? "comparison" : "close-up") + " of the evidence (not part of the story)", prompt: prompt });
    });
    return { assets: assets, limitations: limitations };
  }

  // ---------- 8. Adventure for the Wondii player ----------
  function lineFor(b) {
    var who = clean(b.speaker, 40);
    if (!who || /^narrator$/i.test(who)) return b.text;
    return who + ": " + b.text;
  }
  function ideaIdsOf(claimIds) { return uniq((claimIds || []).map(function (id) { return String(id).replace(/c\d+$/, ""); })); }

  // The seven stage types stay; teaching beats live inside story scenes. storyScenes tells the
  // player (creator-core sceneSlides) which beats form each scene, in story order, and where each
  // choose step sits. Long scenes are split into parts the text panel can hold.
  function buildAdventure(story, knowledge, request, opts) {
    opts = opts || {};
    var assets = opts.assets || [];
    var has = {};
    assets.forEach(function (a) { if (a.status === "ready") has[a.id] = a; });
    var stages = {};
    STAGES.forEach(function (id) { stages[id] = []; });
    var scenesOut = [];
    var firstIdea = story.scenes.filter(function (s) { return s.kind === "idea"; })[0];
    function beatFor(stageId, role, text, claimIds, extra) {
      var beat = Object.assign({ id: stageId + ":" + stages[stageId].length, stageId: stageId, move: BEAT_ROLES[role] || "narrate", role: role, knowledgeRefs: claimIds.slice(), claimIds: claimIds.slice(), unitIds: ideaIdsOf(claimIds), pupil: { cue: "", text: text } }, extra || {});
      stages[stageId].push(beat);
      return beat;
    }
    story.scenes.forEach(function (s) {
      var sceneImage = has["scene-" + s.id] ? "scene-" + s.id : "";
      var teachImage = has["teach-" + s.id] ? "teach-" + s.id : "";
      var ordered = [];
      var steps = [];
      var inProblem = true;
      var placed = false;
      function placeActivity() {
        if (!s.activity || placed) return;
        placed = true;
        var a = s.activity;
        var cited = uniq(a.claimIds.concat.apply(a.claimIds.slice(), a.choices.map(function (c) { return c.claimIds; })));
        var beat = beatFor("apply", "use", a.newCase || a.instruction, cited, { visualAssetId: sceneImage || teachImage });
        ordered.push(beat);
        steps.push({ beatId: beat.id, type: "choose", target: "choices", instruction: a.instruction, successCondition: "correct-choice", choices: a.choices.map(function (c) { return { text: c.text, correct: c.correct === true, feedback: c.feedback }; }), newCase: null, successText: a.successText, claimIds: cited, ideaId: s.ideaId });
        if (a.successText) ordered.push(beatFor("teach", "use", a.successText, [], { visualAssetId: sceneImage || teachImage }));
      }
      s.beats.forEach(function (b) {
        var stageId = s.kind === "opening" ? "hook" : (s === firstIdea && inProblem && (b.role === "problem" || b.role === "story")) ? "investigate" : "teach";
        if (b.role !== "problem" && b.role !== "story") inProblem = false;
        if (b.role === "use") placeActivity();
        var visual = TEACH_ROLES[b.role] && teachImage ? teachImage : (sceneImage || teachImage);
        ordered.push(beatFor(stageId, b.role, lineFor(b), b.claimIds, { visualAssetId: visual }));
      });
      placeActivity();
      var parts = [];
      // Even parts of at most SCENE_PART_BEATS lines so the text panel never overflows (5 lines -> 3 + 2).
      var size = Math.ceil(ordered.length / Math.max(1, Math.ceil(ordered.length / SCENE_PART_BEATS)));
      for (var i = 0; i < ordered.length; i += size) parts.push(ordered.slice(i, i + size));
      parts.forEach(function (part, index) {
        var beatIds = part.map(function (b) { return b.id; });
        var own = steps.filter(function (st) { return beatIds.indexOf(st.beatId) !== -1; }).map(function (st) {
          var copy = JSON.parse(JSON.stringify(st));
          copy.beatIndex = beatIds.indexOf(st.beatId);
          delete copy.beatId;
          return copy;
        });
        scenesOut.push({
          id: "story-" + s.id + "-" + (index + 1), label: s.title + (parts.length > 1 ? " (" + (index + 1) + " of " + parts.length + ")" : ""),
          purpose: "explore", stageIds: uniq(part.map(function (b) { return b.stageId; })), beatIds: beatIds,
          knowledgeRefs: uniq([].concat.apply([], part.map(function (b) { return b.claimIds; }))), usesRefs: [],
          visual: { baseShot: part[0].stageId, assetId: sceneImage || teachImage }, interactions: own, storySceneId: s.id
        });
      });
    });
    var resolutionImage = has["scene-resolution"] ? "scene-resolution" : "";
    story.resolution.forEach(function (b) { beatFor("resolution", b.role, lineFor(b), b.claimIds, { visualAssetId: resolutionImage }); });
    story.recap.forEach(function (r) { beatFor("recap", "story", r.text, r.claimIds, {}); });
    var questions = story.quiz.map(function (q, i) {
      return { id: "check:" + i, prompt: q.prompt, choices: q.choices.slice(), correct: q.correct, explain: q.explain, kind: "multiple", knowledgeRefs: q.claimIds.slice(), claimIds: q.claimIds.slice(), unitIds: q.ideaId ? [q.ideaId] : [] };
    });
    var climaxImage = has["scene-climax"] ? "scene-climax" : (assets.filter(function (a) { return a.type === "scene" && a.status === "ready"; }).slice(-1)[0] || {}).id || "";
    scenesOut.push({ id: "story-quiz", label: "The final challenge", purpose: "challenge", stageIds: ["check"], beatIds: questions.map(function (q) { return q.id; }), knowledgeRefs: uniq([].concat.apply([], questions.map(function (q) { return q.claimIds; }))), usesRefs: [], visual: { baseShot: "check", assetId: climaxImage }, storySceneId: "quiz" });
    scenesOut.push({ id: "story-finish", label: "Mystery solved", purpose: "finish", stageIds: ["resolution", "recap"], beatIds: stages.resolution.concat(stages.recap).map(function (b) { return b.id; }), knowledgeRefs: [], usesRefs: [], visual: { baseShot: "resolution", assetId: resolutionImage || climaxImage }, storySceneId: "finish" });
    var quizMinutes = Math.max(3, Math.round(story.quiz.length * 0.75));
    var est = estimateMinutes(story);
    var minutes = { hook: 2, investigate: 1, teach: Math.max(4, est - 2 - 1 - 4 - quizMinutes - 2), apply: 4, check: quizMinutes, resolution: 1, recap: 1 };
    var titles = { hook: "Opening", investigate: "The first clue", teach: "The investigation", apply: "Class decisions", check: "The final challenge", resolution: "Mystery solved", recap: "What we found out" };
    function act(stageId, extra) {
      var beats = stages[stageId];
      return Object.assign({ id: "story-" + stageId, mechanic: "story", purpose: titles[stageId], title: titles[stageId], minutes: minutes[stageId], why: titles[stageId], config: { lines: beats.map(function (b) { return b.pupil.text; }) }, slotId: stageId, beats: beats, participantSelection: { mode: "whole-class" }, scene: { beat: stageId, kind: stageId === "teach" ? "teach" : "story", visualAssetId: (beats[0] && beats[0].visualAssetId) || "" } }, extra || {});
    }
    var firstQ = questions[0] || {};
    var activities = [
      act("hook"), act("investigate"), act("teach"),
      act("apply", { learningInteraction: { type: "choose" }, successCondition: "correct-choice" }),
      { id: "story-check", mechanic: "quiz", purpose: titles.check, title: titles.check, minutes: minutes.check, why: "Check what was taught", slotId: "check", config: { kind: "multiple", prompt: firstQ.prompt || "", choices: firstQ.choices || [], correct: firstQ.correct || "", explain: firstQ.explain || "", points: 1, participation: "whole_class", askSelected: false, questions: questions }, beats: questions.map(function (q) { return { id: q.id, stageId: "check", move: "retrieve", knowledgeRefs: q.claimIds, claimIds: q.claimIds, unitIds: q.unitIds, pupil: { cue: "", text: "" } }; }), participantSelection: { mode: "whole-class" }, scene: { beat: "check", kind: "challenge", visualAssetId: climaxImage } },
      act("resolution"), act("recap", { mechanic: "mystery" })
    ];
    return {
      subject: request.subject || "Science", topic: request.topic, yearGroup: request.yearGroup, title: story.title,
      objectives: knowledge.ideas.map(function (i) { return i.question; }),
      vocabulary: (opts.vocabulary || []).map(function (v) { return v.term; }),
      lessonPlan: { learningObjective: knowledge.ideas.map(function (i) { return i.question; }).join(" "), durationMinutes: Number(request.requestedMinutes) || 30, yearGroup: request.yearGroup, ideas: knowledge.ideas.map(function (i) { return { id: i.id, title: i.title, question: i.question, curriculumLink: i.curriculumLink, linksTo: i.linksTo }; }) },
      storyPlan: { title: story.title, mission: story.goal, stakes: story.stakes, setting: story.setting, characters: story.characters.map(function (c, i) { return { id: "c" + (i + 1), label: c.name, role: c.role, look: c.look }; }) },
      activities: activities, storyScenes: scenesOut,
      targetMinutes: Number(request.requestedMinutes) || 30,
      estimateMinutes: activities.reduce(function (sum, a) { return sum + (a.minutes || 0); }, 0),
      visualAssets: assets.filter(function (a) { return a.status === "ready"; }).map(function (a) { return { id: a.id, type: a.type, status: "ready", fallback: false, publicUrl: a.publicUrl, frameLabel: a.frameLabel, model: a.model, dimensions: a.dimensions }; }),
      meta: { mode: "story-research", label: LABEL, fallbackUsed: false }
    };
  }

  // ---------- Orchestration ----------
  // ports: { callModel(brief, { purpose, model, effort, maxTokens, timeoutMs }) -> parsed JSON, fetch,
  //          searchProvider, discoveryProvider, savedCandidates, allowlist, log(stage, data),
  //          models: { plan, knowledge, entail, story, check, quality }, ideas (reuse), record (reuse) }
  function generateStoryLesson(request, ports) {
    ports = ports || {};
    var models = Object.assign({ plan: "gpt-6-luna", knowledge: "gpt-6-luna", entail: "gpt-6-luna", story: "gpt-6-luna", check: "gpt-6-luna", quality: "gpt-6-luna" }, ports.models || {});
    var log = ports.log || function () {};
    var trace = { request: request, models: models, calls: [], raw: {} };
    var state = { warnings: [], repairs: [], fallbacks: [] };
    function call(purpose, brief, extra) {
      var started = Date.now();
      var model = models[purpose.split(":")[0]] || models.check;
      return Promise.resolve(ports.callModel(brief, Object.assign({ purpose: purpose, model: model }, extra || {}))).then(function (out) {
        trace.calls.push({ purpose: purpose, model: model, ms: Date.now() - started });
        (trace.raw[purpose] = trace.raw[purpose] || []).push(out);
        return out;
      });
    }
    function done(ok, stage, extra) { return Object.assign({ ok: ok, stage: stage, trace: trace, warnings: state.warnings, repairs: state.repairs, fallbacks: state.fallbacks }, extra || {}); }
    return (ports.ideas ? Promise.resolve({ ideas: ports.ideas }) : call("plan", ideaPlanBrief(request))).then(function (rawPlan) {
      var plan = parseIdeaPlan(rawPlan);
      trace.ideas = plan.ideas;
      log("STORY_IDEAS", { ideas: plan.ideas.map(function (i) { return i.id + ": " + i.title; }) });
      if (!plan.ok) return done(false, "IDEA_PLAN_FAILED", { issues: plan.issues });
      return Promise.resolve(ports.record || researchIdeas(plan.ideas, request, ports)).then(function (record) {
        log("STORY_RESEARCH", { sources: record.sources.length, passages: record.passages.length, providers: record.providers });
        if (!record.passages.length) return done(false, "NEEDS_SOURCE", { issues: ["research found no evidence-tier passage"], record: record });
        return call("knowledge", knowledgeBrief(request, plan.ideas, record), { maxTokens: 20000, timeoutMs: 180000 }).then(function (rawK) {
          var admitted = admitClaims(rawK, plan.ideas, record, request, ports);
          trace.dropped = admitted.dropped;
          if (!admitted.pack.claims.length) return done(false, "NEEDS_SOURCE", { issues: ["no claim quote was found verbatim in its passage"], record: record });
          return call("entail", entailmentBrief(admitted.pack, record, ports), { maxTokens: 16000, timeoutMs: 180000 }).then(function (rawE) {
            applyEntailment(admitted.pack, rawE, ports);
            var knowledge = knowledgeOf(admitted.pack, plan.ideas);
            trace.held = knowledge.held;
            log("STORY_KNOWLEDGE", { supported: Object.keys(knowledge.claims).length, held: knowledge.held.length, dropped: admitted.dropped.length, ideas: knowledge.ideas.length });
            if (!Object.keys(knowledge.claims).length) return done(false, "NEEDS_SOURCE", { issues: ["no claim passed the entailment check"], record: record, pack: admitted.pack });
            return call("story", storyBrief(request, knowledge, { vocabulary: admitted.vocabulary }), { effort: ports.storyEffort || "medium", maxTokens: 32000, timeoutMs: 300000 }).then(function (rawS) {
              var parsed = parseStory(rawS);
              var story = parsed.story;
              trace.firstStory = JSON.parse(JSON.stringify(story));
              parsed.issues.forEach(function (t) { state.warnings.push({ check: "shape", text: t }); });
              if (!story.scenes.length) return done(false, "STORY_EMPTY", { issues: ["the story call returned no scenes"], knowledge: knowledge, record: record });
              return supportPass(story, knowledge, request, call, ports, state, log).then(function (support) {
                if (!support.ok) return done(false, "FACT_SUPPORT_BLOCKED", { issues: support.failing.map(function (f) { return f.id + ": " + f.problem; }), story: story, support: support, knowledge: knowledge, record: record, pack: admitted.pack });
                return qualityPass(story, knowledge, request, call, ports, state, log).then(function (quality) {
                  codeWarnings(story, knowledge, request).forEach(function (w) { state.warnings.push(w); });
                  return done(true, "COMPLETE", { story: story, knowledge: knowledge, vocabulary: admitted.vocabulary, record: record, pack: admitted.pack, support: support, quality: quality, imagePlan: imagePlan(story) });
                });
              });
            });
          });
        });
      });
    });
  }

  function supportPass(story, knowledge, request, call, ports, state, log) {
    function check(items, label) {
      annotateWords(items, knowledge, story, request, ports);
      if (!items.length) return Promise.resolve([]);
      return call("check:" + label, supportBrief(items, knowledge, story, request), { maxTokens: 30000, timeoutMs: 240000 }).then(function (raw) { return judgeSupport(items, raw, knowledge, story); });
    }
    var first;
    return check(pupilItems(story), "support").then(function (rows) {
      first = rows;
      var failing = rows.filter(function (r) { return !r.ok; });
      log("STORY_SUPPORT", { items: rows.length, failing: failing.length });
      if (!failing.length) return { ok: true, rows: rows, first: rows, failing: [] };
      return call("story:repair", repairBrief(story, failing, knowledge, request), { effort: "low", maxTokens: 16000, timeoutMs: 180000 }).then(function (raw) {
        var applied = applyRepair(story, raw, failing);
        state.repairs.push({ kind: "support", asked: failing.map(function (f) { return f.id; }), applied: applied });
        var again = pupilItems(story).filter(function (i) { return applied.indexOf(i.id) !== -1; });
        return check(again, "support-repair").then(function (rows2) {
          var still = failing.filter(function (f) { return applied.indexOf(f.id) === -1; }).concat(rows2.filter(function (r) { return !r.ok; }));
          var fb = fallback(story, still, knowledge);
          fb.forEach(function (x) { state.fallbacks.push(x); state.warnings.push({ check: "support-fallback", text: x.id + ": " + x.action + (x.problem ? " (" + clean(x.problem, 160) + ")" : "") }); });
          // Final pass over everything now in the lesson. Anything still unsupported blocks.
          return check(pupilItems(story), "support-final").then(function (finalRows) {
            var bad = finalRows.filter(function (r) { return !r.ok; });
            log("STORY_SUPPORT_FINAL", { items: finalRows.length, failing: bad.length, repaired: applied.length, fallbacks: fb.length });
            return { ok: !bad.length, rows: finalRows, first: first, afterRepair: rows2, failing: bad };
          });
        });
      });
    });
  }

  function qualityPass(story, knowledge, request, call, ports, state, log) {
    return call("quality", qualityBrief(story, knowledge, request), { maxTokens: 16000, timeoutMs: 180000 }).then(function (raw) {
      var warnings = qualityWarnings(raw);
      var flagged = warnings.filter(function (w) { return w.check === "question" && w.fields && (w.fields.indexOf("oneDefensibleAnswer") !== -1 || w.fields.indexOf("wrongChoicesFalse") !== -1 || w.fields.indexOf("notCircular") !== -1) && story.quiz[w.index]; });
      if (!flagged.length || ports.noQuestionRepair) { warnings.forEach(function (w) { state.warnings.push(w); }); log("STORY_QUALITY", { warnings: warnings.length }); return { raw: raw, warnings: warnings }; }
      return call("quality:questions", questionRepairBrief(story, knowledge, flagged, request), { maxTokens: 12000, timeoutMs: 180000 }).then(function (rawQ) {
        var candidates = [];
        list(rawQ && rawQ.questions).forEach(function (p) {
          var idx = Number(p && p.index);
          var choices = list(p && p.choices).map(function (c) { return clean(c, 140); }).filter(Boolean).slice(0, 3);
          var correct = clean(p && p.correct, 140);
          if (!story.quiz[idx] || choices.length < 2 || choices.indexOf(correct) === -1) return;
          candidates.push({ index: idx, q: { prompt: clean(p.prompt, 200), choices: choices, correct: correct, explain: clean(p.explain, 300), ideaId: story.quiz[idx].ideaId, claimIds: ids(p.claimIds) } });
        });
        // A rewritten question must still pass the support check (the hard rule); otherwise the original stays.
        var probe = { title: story.title, characters: story.characters, scenes: [], quiz: candidates.map(function (c) { return c.q; }), resolution: [], recap: [] };
        var items = pupilItems(probe);
        annotateWords(items, knowledge, story, request, ports);
        var p = items.length ? call("check:support-questions", supportBrief(items, knowledge, story, request), { maxTokens: 12000, timeoutMs: 180000 }).then(function (r) { return judgeSupport(items, r, knowledge, story); }) : Promise.resolve([]);
        return p.then(function (rows) {
          var kept = [];
          candidates.forEach(function (c, i) {
            var mine = rows.filter(function (r) { return r.id === "quiz.q" + i + ".answer" || r.id === "quiz.q" + i + ".explain"; });
            if (mine.length && mine.every(function (r) { return r.ok; })) { story.quiz[c.index] = c.q; kept.push(c.index); }
          });
          state.repairs.push({ kind: "questions", asked: flagged.map(function (f) { return f.index; }), replaced: kept });
          warnings.forEach(function (w) {
            if (w.check === "question" && kept.indexOf(w.index) !== -1) { w.text += " [rewritten once; the rewrite passed the support check and was not re-reviewed]"; w.rewritten = true; }
            state.warnings.push(w);
          });
          log("STORY_QUALITY", { warnings: warnings.length, questionsRewritten: kept.length });
          return { raw: raw, warnings: warnings, rewritten: kept };
        });
      });
    });
  }

  return {
    STAGES: STAGES, LABEL: LABEL, COMPOSITION: COMPOSITION,
    ideaPlanBrief: ideaPlanBrief, parseIdeaPlan: parseIdeaPlan,
    researchIdeas: researchIdeas, knowledgeBrief: knowledgeBrief, admitClaims: admitClaims,
    entailmentBrief: entailmentBrief, applyEntailment: applyEntailment, knowledgeOf: knowledgeOf,
    storyBrief: storyBrief, parseStory: parseStory, pupilItems: pupilItems,
    supportBrief: supportBrief, annotateWords: annotateWords, judgeSupport: judgeSupport,
    repairBrief: repairBrief, applyRepair: applyRepair, fallback: fallback, locate: locate,
    qualityBrief: qualityBrief, qualityWarnings: qualityWarnings, questionRepairBrief: questionRepairBrief,
    codeWarnings: codeWarnings, estimateMinutes: estimateMinutes,
    imagePlan: imagePlan, buildAdventure: buildAdventure, storyView: storyView,
    generateStoryLesson: generateStoryLesson
  };
});
