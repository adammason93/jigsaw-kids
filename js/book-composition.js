    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiComposition = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var SCHEMA = "wondii-composition/1";
      var PORTRAIT = "1024x1536";
      var LANDSCAPE = "1536x1024";
      var TWO = { facing: 1, spotlight: 1, spread: 1 };
      var ORDER = ["facing", "full-page", "integrated", "soft", "spotlight", "spread"];
      var BODY = { "4-6": 0.05, "7-9": 0.04, "10-12": 0.036 };
      var LEADING = { "4-6": 1.72, "7-9": 1.58, "10-12": 1.5 };
      var FLOOR = 0.03;
      var ORDINARY = {
        stood: 1,
        hold: 1,
        holds: 1,
        held: 1,
        look: 1,
        looks: 1,
        looked: 1,
        listen: 1,
        listens: 1,
        listened: 1,
        stay: 1,
        stays: 1,
        stayed: 1,
        was: 1,
        were: 1,
        went: 1,
        came: 1,
        sat: 1,
        walk: 1,
        walked: 1,
        kept: 1,
        follow: 1,
        followed: 1,
        felt: 1,
        watch: 1,
        watched: 1,
        spoke: 1,
        wait: 1,
        waited: 1,
        grew: 1,
        flew: 1,
        found: 1,
        keep: 1
      };
      var WHISPER = { whispered: 1, whisper: 1, murmurs: 1, murmured: 1, sighed: 1, hush: 1 };
      var SUBTLE = { creaked: 1, creak: 1, crashed: 1, crash: 1, splash: 1, splashed: 1 };
      var SURPRISE = { suddenly: 1, gasped: 1 };
      function textOf(beat) {
        return String(beat && (beat.text || beat.prose) || "");
      }
      function wordsOf(text) {
        return String(text || "").split(/\s+/).filter(Boolean);
      }
      function wordCount(text) {
        return wordsOf(text).length;
      }
      function bareWord(word) {
        return String(word).replace(/^[“"'‘(—–\-]+|[”"'’).!?;:,—–\-]+$/g, "").toLowerCase();
      }
      function ageOf(options, beat) {
        var asked = String(beat && beat.ageBand || options && options.ageBand || "");
        if (asked === "4-6" || asked === "5-6") return "4-6";
        if (asked === "7-9") return "7-9";
        if (asked === "10-12") return "10-12";
        var year = String(options && options.yearGroup || "");
        if (year === "Year 6" || year === "10-12") return "10-12";
        if (year === "Reception" || year === "Year 1") return "4-6";
        return "7-9";
      }
      function peopleOf(beat) {
        var list = beat && (beat.characters || beat.charactersPresent) || [];
        return Array.isArray(list) ? list.filter(Boolean) : [];
      }
      function namesOf(beat) {
        var names = [];
        peopleOf(beat).forEach(function(item) {
          names.push(typeof item === "string" ? item : String(item.name || item.id || ""));
        });
        var entities = beat && (beat.entities || beat.entitiesRequired) || [];
        (Array.isArray(entities) ? entities : []).forEach(function(item) {
          names.push(typeof item === "string" ? item : String(item.name || item.id || ""));
        });
        return names.map(function(name) {
          return String(name || "").trim();
        }).filter(Boolean);
      }
      function blobOf(beat, tone) {
        return [beat && beat.emotion, beat && beat.phase, beat && beat.shot, beat && beat.action, textOf(beat), tone].join(" ").toLowerCase();
      }
      function eligible(kind, beat) {
        var words = wordCount(textOf(beat));
        var people = peopleOf(beat).length;
        if (kind === "spread") return words <= 14;
        if (kind === "spotlight") return people === 1 && words <= 24;
        if (kind === "integrated") return words > 0 && words <= 16;
        if (kind === "full-page") return words === 0;
        if (kind === "soft") return words > 0 && words <= 28;
        if (kind === "facing") return true;
        return false;
      }
      function prefer(beat, age, tone) {
        var words = wordCount(textOf(beat));
        var people = peopleOf(beat).length;
        var blob = blobOf(beat, tone);
        var dialogue = (textOf(beat).match(/["“]/g) || []).length;
        var quiet = /whisper|sleep|hush|quiet|bedtime|resolution|still/.test(blob);
        var wide = beat.shot === "wide" || /wide|establishing|panorama|across|landscape/.test(blob);
        var close = people === 1 && (beat.shot === "close" || /close|portrait|spotlight/.test(blob));
        var sound = /\b[A-Z]{3,}!/.test(textOf(beat)) || /\b(creaked|whoosh|crash|splash)\b/.test(blob);
        if (words === 0) return "full-page";
        if (words > 28) return "facing";
        if (wide && words <= 14) return "spread";
        if (close && words <= 24) return "spotlight";
        if (/whisper|sleep|hush|bedtime/.test(blob) && words <= 28) return "soft";
        if (quiet && words > 0 && words <= 16) return "integrated";
        if (quiet && words <= 28) return "soft";
        if (sound && age === "4-6" && words <= 30) return "facing";
        if (dialogue >= 2 && words <= 42) return "facing";
        if (words > 16) return "soft";
        if (words > 0) return "integrated";
        return "facing";
      }
      function chooseKind(beat, previous, side, age, tone) {
        var first = prefer(beat, age, tone);
        var options = [first].concat(ORDER);
        var found = "";
        options.forEach(function(kind) {
          if (found) return;
          if (kind === previous) return;
          if (TWO[kind] && side === "right") return;
          if (!eligible(kind, beat)) return;
          found = kind;
        });
        if (found) return found;
        return side === "right" ? "soft" : "facing";
      }
      function imageFor(kind) {
        if (kind === "spread") {
          return {
            size: LANDSCAPE,
            width: 1536,
            height: 1024,
            quietRegion: "upper-left",
            fold: "The centre is the fold. Keep faces and hands out of the middle and out of the top and bottom eighth. Sky, water, or ground may cross the fold."
          };
        }
        var quiet = kind === "integrated" ? "lower" : kind === "spotlight" ? "below-chin" : kind === "soft" ? "edges" : "none";
        return {
          size: PORTRAIT,
          width: 1024,
          height: 1536,
          quietRegion: quiet,
          fold: ""
        };
      }
      function noteFor(kind, beat, image) {
        var names = namesOf(beat);
        var lines = [
          "One illustration for this story beat. Do not paint letters, numbers, or speech balloons.",
          "Show: " + (String(beat.action || "").trim() || textOf(beat)),
          names.length ? "Include: " + names.join(", ") + "." : ""
        ];
        if (kind === "spread") lines.push("Paint one continuous landscape, " + image.size + ", composed for an open book. " + image.fold);
        if (kind === "full-page") lines.push("Paint a portrait page, " + image.size + ", to the edges of a tall page. Do not leave a hard white frame.");
        if (kind === "facing") lines.push("Paint a full portrait page, " + image.size + ". The words sit on the opposite page, so do not leave a caption box.");
        if (kind === "integrated") lines.push("Paint a portrait page, " + image.size + ". Keep the lower third as open mist, water, sky, or ground. No faces or hands there.");
        if (kind === "spotlight") lines.push("Paint one character large, as a portrait, " + image.size + ". Leave the cream below the chin empty. Do not paint words there.");
        if (kind === "soft") lines.push("Paint a portrait, " + image.size + ", whose edges fade into warm cream. No hard rectangle.");
        return lines.filter(Boolean).join(" ");
      }
      function moodFor(kind, age, text) {
        if (kind === "soft" || kind === "integrated" || kind === "spotlight") return "quiet";
        if (age === "4-6" && (/\b[A-Z]{3,}!/.test(text) || /\b(creaked|whoosh)\b/i.test(text))) return "playful";
        return "story";
      }
      function plan(beats, options) {
        var list = Array.isArray(beats) ? beats : [];
        var opts = options || {};
        var tone = String(opts.tone || "");
        var side = "left";
        var previous = "";
        var leaves = [];
        var units = [];
        var plannedBeats = [];
        var unitCount = 0;
        list.forEach(function(beat, index) {
          var source = textOf(beat);
          var age = ageOf(opts, beat);
          var kind = chooseKind(beat, previous, side, age, tone);
          var image = imageFor(kind);
          var unitId = "u" + (unitCount + 1);
          unitCount += 1;
          var beatId = String(beat.id || beat.pageId || beat.beatId || "b" + (index + 1));
          var mood = moodFor(kind, age, source);
          var note = noteFor(kind, beat, image);
          var textLeaf = leaves.length;
          function leaf(role, text, leafSide) {
            return {
              beatId,
              role,
              side: leafSide,
              composition: kind,
              text,
              unitId,
              age,
              mood,
              imageSize: image.size,
              discoveries: (beat.discoveries || []).slice()
            };
          }
          if (kind === "facing" || kind === "spotlight") {
            leaves.push(leaf("text", source, "left"));
            leaves.push(leaf("bleed", "", "right"));
            textLeaf = leaves.length - 2;
          } else if (kind === "spread") {
            leaves.push(leaf("spread-left", source, "left"));
            leaves.push(leaf("spread-right", "", "right"));
            textLeaf = source ? leaves.length - 2 : -1;
          } else if (kind === "integrated" || kind === "full-page") {
            leaves.push(leaf(kind === "integrated" ? "integrated" : "bleed", source, side));
            textLeaf = leaves.length - 1;
          } else {
            leaves.push(leaf("soft", source, side));
            textLeaf = leaves.length - 1;
          }
          units.push({
            unitId,
            beatId,
            composition: kind,
            size: image.size,
            width: image.width,
            height: image.height,
            quietRegion: image.quietRegion,
            fold: image.fold,
            note,
            imageSrc: String(beat.imageSrc || ""),
            checkpointId: unitId
          });
          plannedBeats.push({
            beatId,
            number: index + 1,
            text: source,
            composition: kind,
            unitId,
            textLeaf,
            age,
            reason: kind + " from " + (beat.shot || beat.phase || "the beat")
          });
          previous = kind;
          side = TWO[kind] ? "left" : side === "left" ? "right" : "left";
        });
        var openings = [];
        for (var i = 0; i < leaves.length; i += 2) {
          openings.push({
            left: leaves[i],
            right: leaves[i + 1] || { role: "blank", text: "", composition: "", side: "right" },
            label: leaves[i] && leaves[i].composition || "Page"
          });
        }
        return {
          schema: SCHEMA,
          ageBand: ageOf(opts, null),
          tone,
          beats: plannedBeats,
          leaves,
          units,
          openings
        };
      }
      function checkpointPages(composition) {
        return (composition && composition.units || []).map(function(unit) {
          return { pageId: unit.checkpointId || unit.unitId, unitId: unit.unitId, beatId: unit.beatId };
        });
      }
      function assetFit(kind, imageW, imageH) {
        var w = Number(imageW) || 0;
        var h = Number(imageH) || 0;
        if (!(w > 0) || !(h > 0)) return "missing";
        var aspect = w / h;
        if (kind === "spread") return aspect >= 1.25 ? "planned" : "soft-fallback";
        if (kind === "soft") return "planned";
        return aspect <= 0.9 ? "planned" : "soft-fallback";
      }
      function briefCovers(beat, note) {
        var hay = String(note || "").toLowerCase();
        var missing = [];
        namesOf(beat).forEach(function(name) {
          if (hay.indexOf(String(name).toLowerCase()) < 0) missing.push(name);
        });
        var action = String(beat && beat.action || "").trim();
        if (action && hay.indexOf(action.toLowerCase()) < 0) missing.push(action);
        return { ok: missing.length === 0, missing };
      }
      function sentenceSpans(text) {
        var spans = [];
        var start = 0;
        var i = 0;
        while (i < text.length) {
          if (text.slice(i, i + 3) === "...") {
            i += 3;
            continue;
          }
          var ch = text.charAt(i);
          if ((ch === "." || ch === "!" || ch === "?") && (/^\s+\S/.test(text.slice(i + 1)) || i === text.length - 1)) {
            spans.push({ start, end: i + 1 });
            start = i + 1;
            while (text.charAt(start) === " " || text.charAt(start) === "\n") start += 1;
            i = start;
            continue;
          }
          i += 1;
        }
        if (start < text.length && text.slice(start).trim()) spans.push({ start, end: text.length });
        return spans;
      }
      function sentenceIndex(spans, at) {
        var found = spans.length ? spans.length - 1 : 0;
        spans.forEach(function(span, index) {
          if (at >= span.start && at < span.end) found = index;
        });
        return found;
      }
      function capFor(age, mood) {
        if (mood === "playful" && age === "4-6") return 2;
        return 1;
      }
      function allowed(kind, age, mood) {
        if (mood === "quiet") return kind === "whisper";
        if (age === "10-12") return kind === "sound";
        return true;
      }
      function chooseMarks(text, options) {
        var source = String(text || "");
        var opts = options || {};
        var age = opts.age || "4-6";
        var mood = opts.mood || "story";
        var cap = capFor(age, mood);
        var spans = sentenceSpans(source);
        var candidates = [];
        var wordRe = /\S+/g;
        var match;
        while (match = wordRe.exec(source)) {
          var token = match[0];
          var bare = bareWord(token);
          var letters = token.replace(/[^A-Za-z]/g, "");
          var kind = "";
          var priority = 9;
          if (letters.length >= 3 && letters === letters.toUpperCase()) {
            kind = "sound";
            priority = 1;
          } else if (WHISPER[bare]) {
            kind = "whisper";
            priority = 2;
          } else if (SUBTLE[bare]) {
            kind = "sound-subtle";
            priority = 3;
          } else if (SURPRISE[bare]) {
            kind = "surprise";
            priority = 5;
          }
          if (!kind || ORDINARY[bare] || !allowed(kind, age, mood)) continue;
          candidates.push({
            start: match.index,
            end: match.index + token.length,
            text: token,
            kind,
            priority,
            keys: [bare],
            sentence: sentenceIndex(spans, match.index)
          });
        }
        (opts.discoveries || []).forEach(function(phrase) {
          var clean = String(phrase || "").trim();
          if (clean.length < 3 || !allowed("discovery", age, mood)) return;
          var found = new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
          var hit;
          while (hit = found.exec(source)) {
            var keys = hit[0].split(/\s+/).map(bareWord).filter(Boolean);
            if (keys.length === 1 && ORDINARY[keys[0]]) continue;
            candidates.push({
              start: hit.index,
              end: hit.index + hit[0].length,
              text: hit[0],
              kind: "discovery",
              priority: 4,
              keys,
              sentence: sentenceIndex(spans, hit.index)
            });
          }
        });
        candidates.sort(function(a, b) {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.start - b.start;
        });
        var usedSentence = {};
        var usedKey = {};
        var marks = [];
        candidates.forEach(function(candidate) {
          if (marks.length >= cap || usedSentence[candidate.sentence]) return;
          if (candidate.keys.some(function(key) {
            return usedKey[key];
          })) return;
          if (source.slice(candidate.start, candidate.end) !== candidate.text) return;
          marks.push({ start: candidate.start, end: candidate.end, text: candidate.text, kind: candidate.kind });
          usedSentence[candidate.sentence] = 1;
          candidate.keys.forEach(function(key) {
            usedKey[key] = 1;
          });
        });
        marks.sort(function(a, b) {
          return a.start - b.start;
        });
        return marks;
      }
      function bodyScale(age) {
        return BODY[age] || BODY["7-9"];
      }
      function leading(age) {
        return LEADING[age] || LEADING["7-9"];
      }
      function textColumn(side, pageW) {
        var gutter = pageW * 0.12;
        var outer = pageW * 0.1;
        if (side === "right") return { x: gutter, w: pageW - gutter - outer, gutter };
        return { x: outer, w: pageW - gutter - outer, gutter };
      }
      function integratedBand(pageW, pageH) {
        return { x: pageW * 0.22, y: pageH * 0.74, w: pageW * 0.62, h: pageH * 0.18 };
      }
      function safeRead(pageW, pageH) {
        return {
          top: pageH * 0.1,
          bottom: pageH * 0.88,
          outer: pageW * 0.1,
          gutter: pageW * 0.12
        };
      }
      function textFrame(kind, pageW, pageH, words, age) {
        var safe = safeRead(pageW, pageH);
        var column = textColumn("left", pageW);
        var band = age || "4-6";
        var size = typeSize(band, pageW);
        var lead = leading(band);
        var floor = Math.round(pageW * FLOOR);
        var count = words > 0 ? words : 1;
        var lineH = Math.round(size * lead);
        var perLine = Math.max(1, Math.floor(column.w / Math.max(1, size * 0.48)));
        var lines = Math.max(1, Math.ceil(count / perLine));
        var height = lines * lineH;
        var top = kind === "spread" ? pageH * 0.1 : kind === "integrated" ? integratedBand(pageW, pageH).y : safe.top;
        var guard = 0;
        while (top + height > safe.bottom && size > floor && guard < 12) {
          size = Math.max(floor, Math.round(size * 0.9));
          lineH = Math.round(size * lead);
          perLine = Math.max(1, Math.floor(column.w / Math.max(1, size * 0.48)));
          lines = Math.max(1, Math.ceil(count / perLine));
          height = lines * lineH;
          guard += 1;
        }
        if (top + height > safe.bottom) top = Math.max(safe.top, safe.bottom - height);
        return {
          x: column.x,
          w: column.w,
          top,
          bottom: Math.min(safe.bottom, top + height),
          size,
          safeBottom: safe.bottom
        };
      }
      function spreadSlice(imageW, imageH, pageW, pageH, side) {
        var width = Number(imageW) || 0;
        var height = Number(imageH) || 0;
        var pageWidth = Number(pageW) || 0;
        var pageHeight = Number(pageH) || 0;
        if (!(width > 0) || !(height > 0) || !(pageWidth > 0) || !(pageHeight > 0)) return null;
        var openAspect = pageWidth * 2 / pageHeight;
        var imageAspect = width / height;
        var sx = 0;
        var sy = 0;
        var sw = width;
        var sh = height;
        if (imageAspect > openAspect) {
          sw = height * openAspect;
          sx = (width - sw) / 2;
        } else if (imageAspect < openAspect) {
          sh = width / openAspect;
          sy = (height - sh) / 2;
        }
        var half = sw / 2;
        return {
          sx: sx + (side === "right" ? half : 0),
          sy,
          sw: half,
          sh
        };
      }
      function picturePlacement(left, right) {
        var leftRole = left && left.role || "";
        var rightRole = right && right.role || "";
        var same = !!(left && right && left.unitId && left.unitId === right.unitId);
        var width = Number(left && (left.imageWidth || left.width)) || 0;
        var height = Number(left && (left.imageHeight || left.height)) || 0;
        var continuous = same && leftRole === "spread-left" && rightRole === "spread-right" && assetFit("spread", width, height) === "planned";
        if (continuous) return { left: "half", right: "half", copies: 1, continuous: true };
        function draws(role) {
          return !!(role && role !== "text" && role !== "blank");
        }
        if (same && (leftRole === "spread-left" || rightRole === "spread-right")) {
          return { left: "once", right: "text", copies: 1, continuous: false };
        }
        var rightDraws = draws(rightRole) && !(same && draws(leftRole));
        return {
          left: draws(leftRole) ? "once" : leftRole === "text" ? "text" : "blank",
          right: rightDraws ? "once" : rightRole === "text" ? "text" : "blank",
          copies: (draws(leftRole) ? 1 : 0) + (rightDraws ? 1 : 0),
          continuous: false
        };
      }
      function typeSize(age, pageW) {
        var size = Math.round(pageW * bodyScale(age));
        var floor = Math.round(pageW * FLOOR);
        return size < floor ? floor : size;
      }
      function storyText(page) {
        return String(page && (page.prose || page.text) || "");
      }
      function usable(composition, pages) {
        if (!composition || composition.schema !== SCHEMA) return false;
        var units = composition.units;
        var leaves = composition.leaves;
        var beats = composition.beats;
        if (!Array.isArray(units) || !units.length) return false;
        if (!Array.isArray(leaves) || !leaves.length) return false;
        if (!Array.isArray(beats) || !beats.length) return false;
        var ids = {};
        var broken = units.some(function(unit) {
          if (!unit || !unit.unitId || !unit.beatId) return true;
          if (unit.size !== PORTRAIT && unit.size !== LANDSCAPE) return true;
          if (ids[unit.unitId]) return true;
          ids[unit.unitId] = true;
          return false;
        });
        if (broken) return false;
        var leafBroken = leaves.some(function(leaf) {
          if (!leaf || leaf.role === "blank") return false;
          return !leaf.unitId || !ids[leaf.unitId];
        });
        if (leafBroken) return false;
        var story = Array.isArray(pages) ? pages : [];
        if (story.length && story.length !== beats.length) return false;
        if (story.length) {
          var mismatch = beats.some(function(beat, index) {
            return String(beat && beat.text || "") !== storyText(story[index]);
          });
          if (mismatch) return false;
        }
        return true;
      }
      function unitForPage(composition, pageId) {
        if (!composition || !Array.isArray(composition.beats)) return null;
        var beat = composition.beats.filter(function(item) {
          return item && item.beatId === pageId;
        })[0];
        if (!beat) return null;
        return (composition.units || []).filter(function(item) {
          return item && item.unitId === beat.unitId;
        })[0] || null;
      }
      return {
        SCHEMA,
        PORTRAIT,
        LANDSCAPE,
        plan,
        checkpointPages,
        assetFit,
        briefCovers,
        chooseMarks,
        bodyScale,
        leading,
        textColumn,
        integratedBand,
        safeRead,
        textFrame,
        picturePlacement,
        spreadSlice,
        typeSize,
        wordCount,
        wordsOf,
        usable,
        unitForPage
      };
    });
