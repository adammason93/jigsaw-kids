var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// js/wondii-crew.js
var require_wondii_crew = __commonJS({
  "js/wondii-crew.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiCrew = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var POSES = ["idle", "hover", "happy", "thinking", "surprised", "pointing", "talking"];
      function character(row) {
        var assets = { idle: row.idle, hover: row.hover };
        POSES.forEach(function(pose) {
          if (!assets[pose]) assets[pose] = pose === "idle" || pose === "hover" ? row[pose] : "";
        });
        return {
          id: row.id,
          type: "system",
          name: row.name,
          trait: row.trait,
          description: row.description,
          personality: row.personality.slice(),
          gesture: row.gesture,
          bibleId: row.bibleId || "",
          placeholder: row.placeholder,
          portrait: "games/images/characters/crew/" + row.id + ".jpg",
          assets,
          manageable: false
        };
      }
      var CREW = [
        character({
          id: "wondii-maya",
          name: "Maya",
          trait: "Curious",
          description: "Loves asking 'why?'",
          personality: ["observant", "inquisitive", "enthusiastic about discovering things"],
          gesture: "wave",
          bibleId: "maya",
          idle: "games/images/characters/maya-v1.jpg",
          hover: "assets/characters/wondii/maya-wave.webp",
          placeholder: { skin: "#c68642", hair: "#3b2414", hairStyle: "curls", top: "#f6c445", bottom: "#3d5a80" }
        }),
        character({
          id: "wondii-leo",
          name: "Leo",
          trait: "Brave",
          description: "Ready to try something new.",
          personality: ["courageous", "positive", "willing to take the first step"],
          gesture: "pump",
          idle: "assets/characters/wondii/leo-idle.webp",
          hover: "assets/characters/wondii/leo-pump.webp",
          placeholder: { skin: "#f1c27d", hair: "#d4a574", hairStyle: "short", top: "#3f9d62", bottom: "#2c3338" }
        }),
        character({
          id: "wondii-amara",
          name: "Amara",
          trait: "Kind",
          description: "Always looking out for others.",
          personality: ["warm", "friendly", "thoughtful"],
          gesture: "wave-both",
          idle: "assets/characters/wondii/amara-idle.webp",
          hover: "assets/characters/wondii/amara-wave.webp",
          placeholder: { skin: "#8d5524", hair: "#1c1c1c", hairStyle: "long", top: "#e07a5f", bottom: "#6d4c41" }
        }),
        character({
          id: "wondii-finn",
          name: "Finn",
          trait: "Excited",
          description: "Brings energy to every adventure.",
          personality: ["energetic", "enthusiastic", "expressive"],
          gesture: "bounce",
          idle: "assets/characters/wondii/finn-idle.webp",
          hover: "assets/characters/wondii/finn-bounce.webp",
          placeholder: { skin: "#f1c27d", hair: "#a3542b", hairStyle: "curls", top: "#4c78c8", bottom: "#1d3557" }
        }),
        character({
          id: "wondii-zara",
          name: "Zara",
          trait: "Creative",
          description: "Full of colourful ideas.",
          personality: ["imaginative", "inventive", "playful"],
          gesture: "idea",
          idle: "assets/characters/wondii/zara-idle.webp",
          hover: "assets/characters/wondii/zara-idea.webp",
          placeholder: { skin: "#a56b3c", hair: "#2b2118", hairStyle: "braids", top: "#7d5caf", bottom: "#f4a261" }
        }),
        character({
          id: "wondii-theo",
          name: "Theo",
          trait: "Determined",
          description: "Keeps going when things get tricky.",
          personality: ["persistent", "focused", "encouraging"],
          gesture: "thumb",
          idle: "assets/characters/wondii/theo-idle.webp",
          hover: "assets/characters/wondii/theo-thumb.webp",
          placeholder: { skin: "#e0ac69", hair: "#1a1a1a", hairStyle: "short", top: "#141b4d", bottom: "#5c6b73" }
        }),
        character({
          id: "wondii-nia",
          name: "Nia",
          trait: "Calm",
          description: "Takes a moment and thinks things through.",
          personality: ["thoughtful", "patient", "reassuring"],
          gesture: "wave-soft",
          idle: "assets/characters/wondii/nia-idle.webp",
          hover: "assets/characters/wondii/nia-wave.webp",
          placeholder: { skin: "#f3d5b5", hair: "#2c2416", hairStyle: "straight", top: "#7d9a78", bottom: "#f6f1ea" }
        }),
        character({
          id: "wondii-arlo",
          name: "Arlo",
          trait: "Adventurous",
          description: "Always ready to explore.",
          personality: ["curious", "outdoorsy", "bold"],
          gesture: "scout",
          idle: "assets/characters/wondii/arlo-idle.webp",
          hover: "assets/characters/wondii/arlo-scout.webp",
          placeholder: { skin: "#c68642", hair: "#4a3728", hairStyle: "short", top: "#6b8f71", bottom: "#3d405b" }
        }),
        character({
          id: "wondii-sofia",
          name: "Sofia",
          trait: "Happy",
          description: "Brings a smile wherever she goes.",
          personality: ["cheerful", "positive", "friendly"],
          gesture: "bounce",
          idle: "assets/characters/wondii/sofia-idle.webp",
          hover: "assets/characters/wondii/sofia-bounce.webp",
          placeholder: { skin: "#f1c27d", hair: "#f6e7a8", hairStyle: "long", top: "#f4a6c1", bottom: "#ffffff" }
        }),
        character({
          id: "wondii-ravi",
          name: "Ravi",
          trait: "Confident",
          description: "Believes he can give it a go.",
          personality: ["self-assured", "encouraging", "positive"],
          gesture: "thumb",
          idle: "assets/characters/wondii/ravi-idle.webp",
          hover: "assets/characters/wondii/ravi-thumb.webp",
          placeholder: { skin: "#8d5524", hair: "#1c1c1c", hairStyle: "short", top: "#ef8b3a", bottom: "#4a4e69" }
        }),
        character({
          id: "wondii-elsie",
          name: "Elsie",
          trait: "Caring",
          description: "Notices how other people feel.",
          personality: ["empathetic", "gentle", "supportive"],
          gesture: "heart",
          idle: "assets/characters/wondii/elsie-idle.webp",
          hover: "assets/characters/wondii/elsie-heart.webp",
          placeholder: { skin: "#e0ac69", hair: "#6b3f2a", hairStyle: "bob", top: "#7eb8c9", bottom: "#f6f1ea" }
        }),
        character({
          id: "wondii-jasper",
          name: "Jasper",
          trait: "Funny",
          description: "Finds fun wherever he goes.",
          personality: ["playful", "cheeky", "good-natured"],
          gesture: "wave",
          idle: "assets/characters/wondii/jasper-idle.webp",
          hover: "assets/characters/wondii/jasper-wave.webp",
          placeholder: { skin: "#f3d5b5", hair: "#8d5a32", hairStyle: "messy", top: "#d4534b", bottom: "#2c3338" }
        })
      ];
      var BY_ID = {};
      CREW.forEach(function(row) {
        BY_ID[row.id] = row;
      });
      function list() {
        return CREW.map(function(row) {
          return row;
        });
      }
      function get(id) {
        return BY_ID[String(id || "")] || null;
      }
      function poseState(input) {
        var source = input || {};
        var active = !!(source.hover || source.focus || source.selected);
        return {
          pose: active ? "hover" : "idle",
          animate: !source.reducedMotion,
          crossfade: true
        };
      }
      function bookCast(character2) {
        var row = typeof character2 === "string" ? get(character2) : character2;
        if (!row || row.type !== "system") return null;
        return {
          characterType: "system",
          characterId: row.id,
          bibleId: row.bibleId || "",
          reference: row.bibleId === "maya" ? row.assets.idle : row.portrait,
          origin: "system"
        };
      }
      function workspaceCast(record) {
        if (!record || !record.id) return null;
        return {
          characterType: "workspace",
          characterId: String(record.id),
          ownerType: record.ownerType || "",
          ownerId: record.ownerId || "",
          reference: record.reference || "characters/" + record.id + ".png",
          origin: "saved"
        };
      }
      function displayArt(row) {
        var portrait = row && row.portrait;
        if (!portrait || portrait.indexOf("games/images/characters/crew/") !== 0) return "";
        return portrait;
      }
      function cardArt(row) {
        return displayArt(row);
      }
      function manifest() {
        return list().map(function(row) {
          return {
            id: row.id,
            name: row.name,
            idle: row.assets.idle,
            hover: row.assets.hover,
            width: 960,
            height: 1400,
            aspectRatio: "24 / 35",
            background: "transparent"
          };
        });
      }
      function canManage(row) {
        return !!(row && row.type !== "system" && row.id && row.manageable !== false);
      }
      return {
        POSES,
        list,
        get,
        poseState,
        displayArt,
        cardArt,
        bookCast,
        workspaceCast,
        canManage,
        manifest
      };
    });
  }
});

// js/character-bible.js
var require_character_bible = __commonJS({
  "js/character-bible.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiCharacterBible = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var IDENTITY_FIELDS = [
        "ageAppearance",
        "face",
        "skinTone",
        "hair",
        "body",
        "footwear",
        "relativeHeight",
        "accessories",
        "visualIdentifiers"
      ];
      var STATE_FIELDS = [
        "locationId",
        "clothing",
        "carriedEntities",
        "emotion",
        "storyRole"
      ];
      function entry(row) {
        return {
          characterId: row.characterId,
          name: row.name,
          referenceAssetIds: [],
          missingReferences: ["portrait"],
          ageAppearance: row.ageAppearance,
          face: row.face,
          skinTone: row.skinTone,
          hair: row.hair,
          body: row.body,
          defaultClothing: row.defaultClothing,
          footwear: row.footwear,
          relativeHeight: row.relativeHeight,
          accessories: row.accessories,
          personality: row.personality,
          visualIdentifiers: row.visualIdentifiers
        };
      }
      var CATALOGUE = {
        maya: entry({
          characterId: "maya",
          name: "Maya",
          ageAppearance: "about seven, school age",
          face: "round face, warm brown eyes, soft eyebrows",
          skinTone: "medium brown",
          hair: "long dark curls",
          body: "school-age child, not a toddler and not a teen",
          defaultClothing: "yellow cardigan, white shirt, blue skirt, white socks",
          footwear: "navy shoes",
          relativeHeight: "average for about seven, a little shorter than Leo",
          accessories: ["green hair clip"],
          personality: ["curious", "brave"],
          visualIdentifiers: ["long dark curls", "yellow cardigan", "green hair clip", "white socks"]
        }),
        leo: entry({
          characterId: "leo",
          name: "Leo",
          ageAppearance: "about seven, school age",
          face: "freckles, grey-green eyes",
          skinTone: "light",
          hair: "short sandy hair",
          body: "school-age child, not a toddler and not a teen",
          defaultClothing: "green jumper, dark trousers",
          footwear: "red sneakers",
          relativeHeight: "a little taller than Maya",
          accessories: ["red sneakers"],
          personality: ["careful", "kind"],
          visualIdentifiers: ["short sandy hair", "green jumper", "red sneakers"]
        }),
        ravi: entry({
          characterId: "ravi",
          name: "Ravi",
          ageAppearance: "about eight, school age",
          face: "round glasses, dark eyes",
          skinTone: "brown",
          hair: "short black hair",
          body: "school-age child, not a toddler and not a teen",
          defaultClothing: "orange hoodie, grey trousers",
          footwear: "dark trainers",
          relativeHeight: "about the same height as Leo",
          accessories: ["round glasses"],
          personality: ["inventive", "bold"],
          visualIdentifiers: ["round glasses", "orange hoodie", "short black hair"]
        }),
        mina: entry({
          characterId: "mina",
          name: "Mina",
          ageAppearance: "about seven, school age",
          face: "bright eyes, small smile",
          skinTone: "light brown",
          hair: "black hair in two buns",
          body: "school-age child, not a toddler and not a teen",
          defaultClothing: "purple dress, white socks",
          footwear: "white shoes",
          relativeHeight: "about the same height as Maya",
          accessories: ["silver star pin"],
          personality: ["observant", "gentle"],
          visualIdentifiers: ["two buns", "purple dress", "silver star pin"]
        })
      };
      function clone(value) {
        return JSON.parse(JSON.stringify(value));
      }
      function deepFreeze(value) {
        if (!value || typeof value !== "object") return value;
        Object.keys(value).forEach(function(key) {
          deepFreeze(value[key]);
        });
        return Object.freeze(value);
      }
      var REFERENCE_REGISTRY = {
        maya: {
          characterId: "maya",
          currentVersionId: "maya-v1",
          versions: [
            {
              versionId: "maya-v1",
              assetId: "maya-v1",
              file: "games/images/characters/maya-v1.jpg",
              status: "approved",
              styleId: "wondii-picture-book",
              provenance: {
                sourceFile: "docs/agent/book-v2/visual-proof/e/images/maya-sheet.jpg",
                model: "gpt-image-2.5-sunburst",
                approvedOn: "2026-10-07",
                note: "Human art direction. First canonical Maya sheet."
              }
            }
          ]
        }
      };
      Object.keys(CATALOGUE).forEach(function(id) {
        deepFreeze(CATALOGUE[id]);
      });
      deepFreeze(REFERENCE_REGISTRY);
      function getCharacter(id) {
        if (!CATALOGUE[id]) return null;
        return deepFreeze(clone(CATALOGUE[id]));
      }
      function listCharacters() {
        return Object.keys(CATALOGUE).map(getCharacter);
      }
      function referenceRegistry() {
        return clone(REFERENCE_REGISTRY);
      }
      function resolveReference(id, versionId, registry) {
        var book = (registry || REFERENCE_REGISTRY)[id];
        if (!book) return null;
        var wanted = versionId || book.currentVersionId;
        var version = (book.versions || []).filter(function(item) {
          return item.versionId === wanted;
        })[0];
        return version ? clone(version) : null;
      }
      function publishReference(id, version, registry) {
        if (!getCharacter(id) || !version || !version.versionId || !version.assetId) return null;
        var next = registry ? clone(registry) : referenceRegistry();
        var book = next[id] || { characterId: id, currentVersionId: "", versions: [] };
        var versions = (book.versions || []).filter(function(item) {
          return item.versionId !== version.versionId;
        });
        versions.push({
          versionId: String(version.versionId),
          assetId: String(version.assetId),
          file: String(version.file || ""),
          status: "approved",
          styleId: version.styleId || "wondii-picture-book",
          provenance: clone(version.provenance || {})
        });
        next[id] = {
          characterId: id,
          currentVersionId: String(version.versionId),
          versions
        };
        return next;
      }
      function bindReferences(ids, registry) {
        var source = registry || REFERENCE_REGISTRY;
        var pin = {};
        (ids || []).forEach(function(id) {
          var book = source[id];
          if (book && book.currentVersionId) pin[id] = book.currentVersionId;
        });
        return pin;
      }
      function referenceReport(id, pin) {
        var character = getCharacter(id);
        if (!character) return null;
        var versionId = pin && pin.status !== "candidate" && pin.versionId ? pin.versionId : "";
        var version = resolveReference(id, versionId);
        if (!version || version.status !== "approved") {
          return {
            characterId: character.characterId,
            name: character.name,
            referenceAssetIds: [],
            missingReferences: character.missingReferences.slice(),
            locked: false,
            versionId: ""
          };
        }
        return {
          characterId: character.characterId,
          name: character.name,
          referenceAssetIds: [version.assetId],
          missingReferences: [],
          locked: true,
          versionId: version.versionId,
          file: version.file
        };
      }
      function proposeReference(characterId, asset) {
        var character = getCharacter(characterId);
        if (!character || !asset || !asset.assetId) return { ok: false, locked: false, problems: ["reference"] };
        return {
          ok: true,
          locked: false,
          status: "candidate",
          characterId,
          assetIds: [String(asset.assetId)],
          note: "Pending human review. Not canonical."
        };
      }
      function storyReferences(characterId, proposal) {
        if (proposal && proposal.characterId === characterId && proposal.assetIds) {
          return {
            assetIds: proposal.assetIds.slice(),
            approved: proposal.status === "approved",
            status: proposal.status || "candidate",
            versionId: proposal.versionId || ""
          };
        }
        var current = resolveReference(characterId);
        if (current && current.status === "approved") {
          return {
            assetIds: [current.assetId],
            approved: true,
            status: "approved",
            versionId: current.versionId,
            file: current.file
          };
        }
        return { assetIds: [], approved: false, status: "missing", versionId: "" };
      }
      function lockCast(ids) {
        var problems = [];
        var cast = [];
        (ids || []).forEach(function(id) {
          var character = getCharacter(id);
          if (!character) {
            problems.push("unknown-cast:" + id);
            return;
          }
          cast.push(character);
        });
        return { ok: problems.length === 0 && cast.length > 0, cast, problems };
      }
      function externalCharacterSlot(record) {
        return {
          ok: false,
          accepted: false,
          reason: "future",
          characterId: record && record.characterId ? String(record.characterId) : ""
        };
      }
      function storyState(character, patch) {
        var rejected = [];
        var source = patch || {};
        IDENTITY_FIELDS.forEach(function(field) {
          if (Object.prototype.hasOwnProperty.call(source, field)) rejected.push(field);
        });
        if (!character || !character.characterId) rejected.push("character");
        if (rejected.length) return { ok: false, problems: rejected, state: null };
        var clothing = source.clothing || character.defaultClothing;
        return {
          ok: true,
          problems: [],
          state: {
            characterId: character.characterId,
            locationId: source.locationId || "",
            clothing,
            carriedEntities: (source.carriedEntities || []).slice(),
            emotion: source.emotion || "",
            storyRole: source.storyRole || ""
          }
        };
      }
      return {
        IDENTITY_FIELDS,
        STATE_FIELDS,
        getCharacter,
        listCharacters,
        referenceReport,
        referenceRegistry,
        resolveReference,
        publishReference,
        bindReferences,
        proposeReference,
        storyReferences,
        lockCast,
        storyState,
        externalCharacterSlot
      };
    });
  }
});

// js/book-art-direction.js
var require_book_art_direction = __commonJS({
  "js/book-art-direction.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiArtDirection = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var SCHEMA = "wondii-art-direction/2";
      var LAYOUTS = ["full-bleed", "cinematic", "half", "two-thirds", "beside", "quiet", "text-led", "action", "ending", "spread"];
      var IMAGE_USD = 0.039657;
      var VISION_USD = 1472e-6;
      var GBP_PER_USD = 0.754;
      var IMPACT = /\b(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!/g;
      var ACCENT = {
        "magical-adventure": "#143d4f",
        funny: "#8a3412",
        bedtime: "#3d4550",
        educational: "#1e3a5f",
        mystery: "#2c2140",
        story: "#2a241c"
      };
      function textOf(page) {
        return String(page && (page.text || page.prose) || "");
      }
      function phaseOf(page) {
        return String(page && (page.phase || page.narrativePhase) || "").toLowerCase();
      }
      function shotOf(page) {
        return String(page && (page.shot || page.shotType) || "").toLowerCase();
      }
      function intentOf(page) {
        return String(page && page.layoutIntent || "").toUpperCase();
      }
      function pagesOf(record) {
        return (record && record.pages || []).map(function(page, index) {
          return {
            number: index + 1,
            text: textOf(page),
            phase: phaseOf(page),
            shot: shotOf(page),
            intent: intentOf(page),
            image: String(page && (page.imageUrlFallback || page.image || "") || ""),
            continuousImage: !!(page && page.continuousImage),
            characters: page && page.charactersPresent || [],
            objects: page && page.entitiesRequired || [],
            emotion: String(page && page.emotion || "")
          };
        });
      }
      function count(blob, pattern) {
        return (String(blob).match(pattern) || []).length;
      }
      function identityFrom(record) {
        var pages = pagesOf(record);
        var blob = pages.map(function(page) {
          return page.text;
        }).join("\n");
        var lower = blob.toLowerCase();
        var phases = pages.map(function(page) {
          return page.phase;
        });
        var laughs = count(lower, /\b(laugh|laughed|giggle|giggled|silly)\b/g);
        var whispers = count(lower, /\bwhisper/g);
        var explains = count(lower, /\b(explained|because|learn|learned)\b/g);
        var clues = count(lower, /\b(clue|mystery|suspect)\b/g);
        var adventure = phases.some(function(phase) {
          return phase === "discovery" || phase === "setback" || phase === "climax" || phase === "escalation";
        });
        var tone = String(record && (record.tone || record.request && record.request.tone) || "").toLowerCase();
        var personality = "story";
        var because = "The pages do not yet show a stronger genre.";
        if (tone === "bedtime" || tone === "gentle") {
          personality = "bedtime";
          because = "The request asks for a gentle reading.";
        } else if (tone === "funny" || tone === "humour" || tone === "humor" || laughs >= 3 && !adventure) {
          personality = "funny";
          because = laughs >= 3 ? "The story laughs often enough to lead the design." : "The request asks for a funny story.";
        } else if (tone === "mystery" || clues >= 1 && !adventure) {
          personality = "mystery";
          because = "The story is built around a clue.";
        } else if (tone === "educational" || tone === "learning" || explains >= 2 && !adventure) {
          personality = "educational";
          because = "The story stops to explain.";
        } else if (adventure || tone === "adventure") {
          personality = "magical-adventure";
          because = "Discovery, trouble, and a climax ask for a cinematic pace, with a quieter ending where the story resolves.";
        } else if (whispers || phases.indexOf("resolution") >= 0) {
          personality = "bedtime";
          because = "The story spends its time on a quiet ending.";
        }
        var pacing = {
          "magical-adventure": "cinematic",
          funny: "playful",
          bedtime: "calm",
          educational: "clear",
          mystery: "atmospheric",
          story: "measured"
        }[personality];
        return {
          personality,
          tone: tone || personality,
          ageBand: String(record && (record.ageBand || record.request && record.request.ageBand) || ""),
          pacing,
          accent: ACCENT[personality] || ACCENT.story,
          reason: because
        };
      }
      function quotesIn(text) {
        var found = [];
        var re = /"[^"]+"/g;
        var match;
        while (match = re.exec(text)) found.push(match[0]);
        return found;
      }
      function sentencesOf(text) {
        return String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
      }
      function wordCount(sentence) {
        return String(sentence).trim().split(/\s+/).filter(Boolean).length;
      }
      function treatmentsFor(page, personality) {
        var text = page.text;
        var marks = [];
        var seen = {};
        function add(kind, phrase, reason) {
          var exact = String(phrase || "");
          if (!exact || text.indexOf(exact) < 0 || seen[exact]) return;
          if (kind === "impact" && !/^(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!$/i.test(exact)) return;
          seen[exact] = true;
          marks.push({ kind, text: exact, reason });
        }
        if (personality !== "educational") {
          (String(text).match(IMPACT) || []).forEach(function(word) {
            add("impact", word, "This sound is already in the approved sentence.");
          });
        }
        var whispered = /\bwhispered?\b/i.test(text);
        quotesIn(text).forEach(function(quote) {
          var inner = quote.slice(1, -1);
          if (whispered && personality !== "funny") {
            add("whisper", quote, "The narration says this is whispered.");
            return;
          }
          if (/!$/.test(inner) && personality !== "bedtime") {
            add("spoken", quote, "A short exclamation can sit apart from the narration.");
            return;
          }
          if ((page.phase === "discovery" || page.phase === "commitment") && personality !== "funny") {
            add("magic", quote, "This spoken line is a discovery, so the type stays elegant rather than loud.");
            return;
          }
          if (personality === "bedtime" || page.phase === "resolution") {
            add("whisper", quote, "The ending keeps speech soft.");
            return;
          }
          add("dialogue", quote, "Spoken words stay distinct from the narration.");
        });
        if (personality === "bedtime") return marks;
        sentencesOf(text).forEach(function(sentence, index, all) {
          var trimmed = sentence.trim();
          if (seen[trimmed] || trimmed.charAt(0) === '"') return;
          if (wordCount(trimmed) <= 2 && !/\b(laugh|laughed|said)\b/i.test(trimmed) && page.phase !== "resolution") {
            if (personality === "bedtime" || personality === "educational") {
              add("pause", trimmed, "A short sentence holds the beat before the story continues.");
            } else {
              add("motion", trimmed, "A sudden short sentence changes scale, without a box around it.");
            }
          } else if (index === all.length - 1 && /^Then\b/.test(trimmed) && (page.phase === "escalation" || page.phase === "setback")) {
            add("pause", trimmed, "The turn of the scene gets room before it.");
          }
        });
        if (page.phase === "resolution") {
          var last = sentencesOf(text).pop();
          if (last) add("quiet", last.trim(), "The last sentence stays quiet.");
        }
        return marks;
      }
      function layoutRole(page, index, total, personality) {
        var scenic = personality === "magical-adventure" || personality === "mystery";
        if (index === total - 1 || page.phase === "resolution") return "ending";
        if (page.intent === "QUIET_PAGE") return "quiet";
        if (page.shot === "close") return scenic ? "cinematic" : "beside";
        if (index === 0 || page.shot === "establishing") return "full-bleed";
        if (page.phase === "climax") return "action";
        if (page.phase === "setback") return "cinematic";
        if (page.shot === "reveal") return "half";
        if (page.shot === "overhead") return scenic ? "full-bleed" : "two-thirds";
        if (page.shot === "reaction") return "full-bleed";
        if (page.phase === "commitment" && page.shot === "low") return "text-led";
        if (page.phase === "escalation" && page.shot === "low") return "half";
        if (page.shot === "action" && page.phase === "attempt") return "action";
        if (page.shot === "action") return "half";
        if (page.shot === "vignette") return "ending";
        return "half";
      }
      function alternate(layout) {
        var next = {
          "full-bleed": "cinematic",
          cinematic: "half",
          half: "cinematic",
          "two-thirds": "cinematic",
          beside: "quiet",
          quiet: "text-led",
          "text-led": "half",
          action: "cinematic",
          ending: "quiet",
          spread: "cinematic"
        };
        return next[layout] || "half";
      }
      function promptNote(layout, half) {
        if (layout === "spread") {
          return "Paint one continuous scene across both open pages, at 2:1. Keep faces, hands, and important objects out of the centre fold. Leave a quiet area on each page for type. Do not split this into two unrelated pictures.";
        }
        var notes = {
          "full-bleed": "Compose a 2:3 portrait that can run to the outer edge. Keep faces away from the inner edge. Leave the lower part as open sky, water, or ground for type.",
          cinematic: "Compose a wide scene for the upper half of a portrait page. Keep the action out of the gutter and leave room below for a paragraph. A 3:2 painting fits this; a 2:3 painting can come closer to the page.",
          half: "Use about half the page for the scene, at 3:2. Leave the rest quiet for the words. Do not letter the picture.",
          "two-thirds": "Compose a 2:3 scene for about two thirds of a portrait page, with a short clear area for type.",
          beside: "Place the subject toward the outer side so words can sit beside the picture. Keep faces out of that text column. A 3:2 painting is enough.",
          quiet: "A smaller, calmer 3:2 scene with empty space around it.",
          "text-led": "A supporting 3:2 scene, smaller than the facing picture. Leave most of the page for the words, including one line that can be set larger. Do not letter the picture.",
          action: "Paint a 3:2 scene that supports one short sentence. Leave clear paper so that sentence can be set much larger than the narration. Do not fill the page.",
          ending: "A quiet 2:3 closing scene under the words, with room to set the last sentence on its own."
        };
        return (notes[layout] || notes.half) + (half ? " This page is the " + half + " half of one continuous painting." : "");
      }
      function pagePlan(page, layout, personality) {
        var spread = layout === "spread";
        var align = layout === "quiet" || layout === "ending" || layout === "text-led" || layout === "action" || page.placeBelow ? "center" : "left";
        return {
          number: page.number,
          layout,
          placement: layout === "ending" || page.placeBelow ? "below" : layout === "beside" ? "outer" : "top",
          aspect: layout === "spread" ? "2:1" : layout === "full-bleed" || layout === "two-thirds" || layout === "ending" ? "2:3" : "3:2",
          fullBleed: layout === "full-bleed" || spread,
          doublePage: spread,
          continuous: spread,
          half: page.half || "",
          textPlacement: layout === "beside" ? "beside" : layout === "ending" || page.placeBelow ? "above" : "below",
          textAlign: align,
          treatments: treatmentsFor(page, personality),
          safeText: { region: layout === "beside" ? "beside-illustration" : layout === "ending" || page.placeBelow ? "above-illustration" : "below-illustration", gutter: "clear" },
          focal: { anchorX: 0.5, anchorY: 0.4, characters: page.characters.slice() },
          objects: page.objects.slice(),
          gutter: { inset: 0.08, faces: "away-from-fold" },
          crop: { maxSide: layout === "full-bleed" || layout === "two-thirds" ? 0.16 : layout === "cinematic" ? 0.12 : 0.08 },
          background: "paper",
          edge: layout === "beside" || layout === "quiet" ? "feather" : layout === "full-bleed" || spread ? "bleed" : "inset",
          readingOrder: layout === "ending" || page.placeBelow ? ["story", "illustration", "folio"] : ["illustration", "story", "folio"],
          accessibility: { minSizeRatio: 0.03, contrast: "ink-on-paper", motion: "none" },
          accent: ACCENT[personality] || ACCENT.story,
          promptNote: promptNote(layout, page.half),
          reason: page.reason || ""
        };
      }
      function samePicture(left, right) {
        return !!(left && right && left.image && left.image === right.image);
      }
      function pictureQuote() {
        var usd = Math.round((IMAGE_USD + VISION_USD) * 1e6) / 1e6;
        return {
          estimateUsd: usd,
          estimateGbp: Math.round(usd * GBP_PER_USD * 1e4) / 1e4
        };
      }
      function artworkRequests(pages, roles) {
        var requests = [];
        function add(item) {
          requests.push(Object.assign({
            status: "needs-new",
            replaces: false,
            supplements: true,
            references: ["games/images/characters/maya-v1.jpg", "games/images/characters/crew/wondii-leo.jpg"],
            characters: ["maya-v1", "leo"]
          }, pictureQuote(), item));
        }
        for (var i = 0; i < pages.length; i += 2) {
          var left = pages[i];
          var right = pages[i + 1];
          if (!left || !right || samePicture(left, right)) continue;
          if (left.shot === "reaction" && right.phase === "escalation") {
            add({
              id: "spread-" + left.number + "-" + right.number,
              pages: [left.number, right.number],
              role: "spread",
              aspect: "2:1",
              required: true,
              reason: "These two saved pictures are different scenes. A cinematic spread has to be painted as one 2:1 image, with faces and words kept out of the centre fold. The existing pictures stay until that painting is approved."
            });
          }
          if (left.shot === "establishing" && right.shot === "reveal") {
            add({
              id: "opening-" + left.number + "-" + right.number,
              pages: [left.number, right.number],
              role: "integrated-spread",
              aspect: "2:1",
              required: false,
              reason: "The opening pictures are separate places. Water, mist, or leaves that continue from the first page onto the second have to be painted for the open spread. They cannot be drawn over these photographs."
            });
          }
        }
        pages.forEach(function(page, index) {
          if (page.shot === "overhead" && roles[index] === "full-bleed") {
            add({
              id: "portrait-" + page.number,
              pages: [page.number],
              role: "portrait-bleed",
              aspect: "2:3",
              required: false,
              reason: "The saved boat picture is a wide photograph. It cannot fill a portrait page or run past its rectangle without cropping past the safe limit. A 2:3 painting can carry the boat toward the outer edge and leave paper for the words."
            });
          }
          if (page.shot === "close") {
            add({
              id: "close-" + page.number,
              pages: [page.number],
              role: "portrait-close",
              aspect: "2:3",
              required: false,
              reason: "The saved close-up is a wide photograph, so it can only occupy the upper part of the page. A 2:3 painting with open water or foliage around the children would let the words sit in the scene."
            });
          }
        });
        return requests;
      }
      function directBook(record) {
        var source = record || {};
        var pages = pagesOf(source);
        var identity = identityFrom(source);
        var roles = pages.map(function(page, index) {
          return layoutRole(page, index, pages.length, identity.personality);
        });
        pages.forEach(function(page, index) {
          var partner = pages[index + 1];
          if (index % 2 || !samePicture(page, partner)) return;
          if (page.intent !== "DOUBLE_PAGE_SPREAD" && !page.continuousImage) return;
          roles[index] = "spread";
          roles[index + 1] = "spread";
          page.half = "left";
          partner.half = "right";
        });
        roles.forEach(function(role, index) {
          if (!index || role === "ending" || role === "spread" || role === "quiet" || role === "beside") return;
          if (role === roles[index - 1]) roles[index] = alternate(role);
        });
        pages.forEach(function(page, index) {
          var previous = roles[index - 1];
          page.placeBelow = roles[index] === "half" && index % 2 === 1 && page.phase === "escalation" && (previous === "full-bleed" || previous === "cinematic");
        });
        var limitations = [];
        var plans = [];
        pages.forEach(function(page, index) {
          var layout = roles[index];
          var partner = index % 2 === 0 ? pages[index + 1] : pages[index - 1];
          if (page.intent === "DOUBLE_PAGE_SPREAD" && !samePicture(page, partner)) {
            limitations.push("Page " + page.number + " asks for a double-page spread, but its picture is a separate scene, so it stays on its own page.");
            if (partner && partner.phase === "resolution") {
              limitations.push("Page " + page.number + " stays separate from the ending, so the last spread can slow down.");
            }
            if (layout === "spread") layout = "cinematic";
          }
          page.reason = layout + " from " + (page.shot || "the scene") + " / " + (page.phase || "the beat");
          plans.push(pagePlan(page, layout, identity.personality));
        });
        if (!pages.some(function(page) {
          return page.image && pages.some(function(other) {
            return other !== page && other.image === page.image;
          });
        })) {
          limitations.push("These pictures were painted as separate pages. A continuous double-page scene needs one wide painting made for the open book.");
        }
        limitations.push("These pictures include their own backgrounds. A character standing on the paper needs transparent artwork made for that page.");
        var spreads = [];
        for (var i = 0; i < plans.length; i += 2) {
          var left = plans[i];
          var right = plans[i + 1];
          var relationship = "paired";
          if (left && right && left.layout !== right.layout) relationship = "asymmetric";
          if (left && left.layout === "ending" || right && right.layout === "ending" || left && left.layout === "quiet") relationship = "quiet";
          if (left && right && left.continuous && right.continuous) relationship = "continuous";
          spreads.push({
            pages: [left ? left.number : 0, right ? right.number : 0],
            relationship,
            continuous: !!(left && right && left.continuous && right.continuous),
            reason: relationship === "continuous" ? "One painting crosses the fold." : "Each page keeps its own picture."
          });
        }
        var requests = artworkRequests(pages, roles);
        var requiredUsd = 0;
        var requiredGbp = 0;
        var allUsd = 0;
        var allGbp = 0;
        requests.forEach(function(item) {
          allUsd += item.estimateUsd;
          allGbp += item.estimateGbp;
          if (item.required) {
            requiredUsd += item.estimateUsd;
            requiredGbp += item.estimateGbp;
          }
        });
        return {
          schema: SCHEMA,
          bookId: String(source.id || ""),
          identity,
          spreads,
          pages: plans,
          artworkRequests: requests,
          artworkCost: {
            currencyNote: "One new picture plus one vision check, using the measured Rain That Rose average. A repair adds the same amount again. Nothing here is generated until it is approved.",
            requiredUsd: Math.round(requiredUsd * 1e6) / 1e6,
            requiredGbp: Math.round(requiredGbp * 1e4) / 1e4,
            withSupplementsUsd: Math.round(allUsd * 1e6) / 1e6,
            withSupplementsGbp: Math.round(allGbp * 1e4) / 1e4
          },
          limitations: limitations.filter(function(item, index, list) {
            return list.indexOf(item) === index;
          })
        };
      }
      function attachPlan(showcase, plan) {
        var copy = JSON.parse(JSON.stringify(showcase || {}));
        var request = plan && plan.request || {};
        if (request.ageBand) copy.ageBand = request.ageBand;
        if (request.tone) copy.tone = request.tone;
        (copy.pages || []).forEach(function(page, index) {
          var src = plan && plan.pages && plan.pages[index];
          if (!src || String(src.prose || "") !== String(page.text || "")) return;
          page.charactersPresent = src.charactersPresent || [];
          page.entitiesRequired = src.entitiesRequired || [];
          page.emotion = src.emotion || "";
        });
        return copy;
      }
      function margins(pageW, pageH, side) {
        var folio = Math.round(pageH * 0.058);
        var outer = Math.round(pageW * 0.055);
        var gutter = Math.round(pageW * 0.08);
        var top = Math.round(pageH * 0.045);
        var gap = Math.round(pageH * 0.028);
        return {
          folio,
          outer,
          gutter,
          top,
          gap,
          left: side === "right" ? gutter : outer,
          right: side === "left" ? gutter : outer
        };
      }
      function contain(imageW, imageH, x, y, w, h) {
        var scale = Math.min(w / imageW, h / imageH);
        var dw = imageW * scale;
        var dh = imageH * scale;
        return {
          x: Math.round(x + (w - dw) / 2),
          y: Math.round(y + (h - dh) / 2),
          w: Math.round(dw),
          h: Math.round(dh),
          sx: 0,
          sy: 0,
          sw: imageW,
          sh: imageH,
          crop: 0
        };
      }
      function cover(imageW, imageH, x, y, w, h, maxCrop, ax, ay) {
        var aspect = imageW / imageH;
        var dest = w / h;
        var crop = dest < aspect ? 1 - dest / aspect : 1 - aspect / dest;
        if (crop > maxCrop) {
          if (dest < aspect) h = w / (aspect * (1 - maxCrop));
          else w = h * (aspect * (1 - maxCrop));
          crop = maxCrop;
        }
        w = Math.max(1, Math.round(w));
        h = Math.max(1, Math.round(h));
        var scale = Math.max(w / imageW, h / imageH);
        var sw = w / scale;
        var sh = h / scale;
        var sx = (imageW - sw) * (ax == null ? 0.5 : ax);
        var sy = (imageH - sh) * (ay == null ? 0.4 : ay);
        if (sx < 0) sx = 0;
        if (sy < 0) sy = 0;
        if (sx > imageW - sw) sx = Math.max(0, imageW - sw);
        if (sy > imageH - sh) sy = Math.max(0, imageH - sh);
        return { x: Math.round(x), y: Math.round(y), w, h, sx, sy, sw, sh, crop };
      }
      function compose(direction, pageW, pageH, imageW, imageH, side, copyH) {
        var spec = direction || {};
        var layout = LAYOUTS.indexOf(spec.layout) >= 0 ? spec.layout : "half";
        var box = margins(pageW, pageH, side);
        var contentW = pageW - box.left - box.right;
        var aspect = imageW / imageH;
        var maxCrop = spec.crop && spec.crop.maxSide != null ? spec.crop.maxSide : 0.16;
        if (maxCrop > 0.16) maxCrop = 0.16;
        var image;
        var text;
        var align = spec.textAlign || "left";
        var feather = spec.edge === "feather";
        var cropLimited = false;
        if (layout === "spread" && spec.continuous) {
          var halfW = imageW / 2;
          var maxH = Math.round(pageH * 0.62);
          var spreadW = pageW;
          var spreadH = Math.round(spreadW / (halfW / imageH));
          var sy = 0;
          var sh = imageH;
          if (spreadH > maxH) {
            spreadH = maxH;
            sh = spreadH * (halfW / spreadW);
            if (sh < imageH * (1 - maxCrop)) sh = imageH * (1 - maxCrop);
            spreadH = Math.round(sh * (spreadW / halfW));
            sy = (imageH - sh) * 0.4;
          }
          image = {
            x: 0,
            y: 0,
            w: spreadW,
            h: spreadH,
            sx: spec.half === "right" ? halfW : 0,
            sy,
            sw: halfW,
            sh,
            crop: 1 - sh / imageH
          };
          var textLeft = side === "right" ? box.gutter : box.outer;
          var textRight = side === "left" ? box.gutter : box.outer;
          text = {
            x: textLeft,
            y: image.y + image.h + box.gap,
            w: pageW - textLeft - textRight,
            h: pageH - box.folio - (image.y + image.h + box.gap)
          };
        } else if (layout === "beside") {
          var textW = Math.round(contentW * 0.64);
          var slot = contentW - textW - box.gap;
          var band = Math.round(slot / aspect);
          var bodyH = pageH - box.folio - box.top;
          if (band > bodyH * 0.46) band = Math.round(bodyH * 0.46);
          var imgY = box.top;
          if (side === "left") {
            image = contain(imageW, imageH, box.left, imgY, slot, band);
            text = { x: box.left + slot + box.gap, y: box.top, w: textW, h: bodyH };
          } else {
            text = { x: box.left, y: box.top, w: textW, h: bodyH };
            image = contain(imageW, imageH, box.left + textW + box.gap, imgY, slot, band);
          }
          if (copyH > 0 && copyH < bodyH * 0.78) {
            var cluster = Math.max(image.h, copyH);
            var shift = Math.max(0, Math.round((bodyH - cluster) / 2));
            image.y += shift;
            text.y += shift;
            text.h = Math.max(copyH, image.h);
          }
        } else if (layout === "ending") {
          var used = copyH > 0 ? copyH : Math.round(pageH * 0.34);
          text = { x: box.left, y: box.top, w: contentW, h: used };
          var endW = Math.round(contentW * 0.86);
          var endH = Math.round(endW / aspect);
          var room = pageH - box.folio - (text.y + text.h + box.gap);
          if (endH > room) {
            endH = Math.max(1, room);
            endW = Math.round(endH * aspect);
          }
          image = contain(imageW, imageH, box.left + (contentW - endW) / 2, text.y + text.h + box.gap, endW, endH);
          align = "center";
        } else if (spec.placement === "below") {
          var usedBelow = copyH > 0 ? copyH : Math.round(pageH * 0.36);
          var floorImg = Math.round(pageH * 0.22);
          var maxText = pageH - box.folio - box.top - box.gap - floorImg;
          if (usedBelow > maxText) usedBelow = Math.max(1, maxText);
          text = { x: box.left, y: box.top, w: contentW, h: usedBelow };
          var belowW = Math.round(contentW * 0.9);
          var belowH = Math.round(belowW / aspect);
          var room = pageH - box.folio - (text.y + text.h + box.gap);
          if (belowH > room) {
            belowH = Math.max(1, room);
            belowW = Math.round(belowH * aspect);
            if (belowW > contentW) {
              belowW = contentW;
              belowH = Math.round(belowW / aspect);
            }
          }
          image = contain(imageW, imageH, box.left + Math.round((contentW - belowW) / 2), text.y + text.h + box.gap, belowW, belowH);
          align = "center";
        } else {
          var fraction = layout === "full-bleed" || layout === "two-thirds" ? 0.62 : layout === "cinematic" ? 0.52 : layout === "quiet" ? 0.34 : layout === "text-led" ? 0.3 : layout === "action" ? 0.38 : 0.42;
          var bleed = layout === "full-bleed";
          var imgX = bleed ? side === "right" ? box.gutter : 0 : box.left;
          var imgW = bleed ? pageW - box.gutter : layout === "quiet" ? Math.round(contentW * 0.72) : layout === "text-led" ? Math.round(contentW * 0.64) : layout === "action" ? Math.round(contentW * 0.8) : contentW;
          if (!bleed && (layout === "quiet" || layout === "text-led" || layout === "action")) imgX = box.left + Math.round((contentW - imgW) / 2);
          var want = Math.round(pageH * fraction);
          var natural = Math.round(imgW / aspect);
          if (layout === "full-bleed" || layout === "cinematic" || layout === "two-thirds") {
            image = cover(imageW, imageH, imgX, bleed ? 0 : box.top, imgW, Math.max(natural, want), maxCrop, 0.5, 0.4);
            if (image.crop >= maxCrop - 1e-3 && image.h + 1 < want) cropLimited = true;
          } else {
            image = contain(imageW, imageH, imgX, box.top + (layout === "quiet" ? Math.round(pageH * 0.04) : 0), imgW, natural);
          }
          if (copyH > 0 && image.y + image.h + box.gap + copyH > pageH - box.folio && image.h > pageH * 0.28) {
            var fitH = pageH - box.folio - image.y - box.gap - copyH;
            if (fitH < pageH * 0.28) fitH = Math.round(pageH * 0.28);
            var fitW = Math.round(fitH * (image.w / image.h));
            var fitX = bleed ? side === "right" ? pageW - box.gutter - fitW : 0 : imgX + (imgW - fitW) / 2;
            image = contain(imageW, imageH, fitX, image.y, fitW, fitH);
            cropLimited = true;
          }
          var copyX = Math.max(box.outer, box.left);
          var copyRight = Math.max(box.outer, box.right);
          text = {
            x: copyX,
            y: image.y + image.h + box.gap,
            w: pageW - copyX - copyRight,
            h: pageH - box.folio - (image.y + image.h + box.gap)
          };
          if (copyH > 0 && !bleed) {
            var block = image.h + box.gap + copyH;
            var room = pageH - box.folio - box.top;
            if (block < room * 0.82) {
              var shift = Math.round((room - block) / 2);
              image.y += shift;
              text.y += shift;
              text.h = copyH;
            }
          }
          if (layout === "quiet" || layout === "text-led" || layout === "action") align = "center";
        }
        if (text.h < 1) text.h = 1;
        if (text.y < image.y + image.h && layout !== "beside" && layout !== "ending" && spec.placement !== "below") {
          text.y = image.y + image.h + box.gap;
          text.h = Math.max(1, pageH - box.folio - text.y);
        }
        return {
          layout,
          image,
          text,
          align,
          feather,
          radius: feather ? Math.round(Math.min(image.w, image.h) * 0.06) : 0,
          folio: box.folio,
          gutter: box.gutter,
          cropLimited,
          fraction: image.h / pageH
        };
      }
      function overlaps(a, b) {
        return a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;
      }
      function estimateHeight(copy, width, size) {
        var chars = String(copy || "").trim().length || 1;
        var perLine = Math.max(8, Math.floor(width / (size * 0.5)));
        return Math.ceil(chars / perLine) * size * 1.55;
      }
      function checkBook(record, direction) {
        var issues = [];
        var art = direction || {};
        if (art.schema !== "wondii-art-direction/1" && art.schema !== "wondii-art-direction/2") issues.push("schema");
        var pages = pagesOf(record);
        (art.pages || []).forEach(function(planned, index) {
          var source = pages[index];
          if (!source) {
            issues.push("extra-page");
            return;
          }
          if (LAYOUTS.indexOf(planned.layout) < 0) issues.push("layout:" + planned.number);
          (planned.treatments || []).forEach(function(mark) {
            if (!mark.text || source.text.indexOf(mark.text) < 0) issues.push("span:" + planned.number);
            if (mark.kind === "impact" && !/^(SPLASH|BOOM|CRASH|WHOOSH|POP|CRACK)!$/i.test(mark.text)) issues.push("invented-sound:" + planned.number);
          });
          if (planned.continuous && source.image) {
            var partner = index % 2 === 0 ? pages[index + 1] : pages[index - 1];
            if (!partner || partner.image !== source.image) issues.push("split-unrelated:" + planned.number);
          }
          var side = index % 2 ? "right" : "left";
          var needed = estimateHeight(source.text, 1e3, 36);
          var placed = compose(planned, 1200, 1800, 1536, 1024, side, needed);
          if (overlaps(placed.image, placed.text)) issues.push("overlap:" + planned.number);
          if (placed.image.x < -1 || placed.image.y < -1 || placed.image.x + placed.image.w > 1201 || placed.image.y + placed.image.h > 1801) issues.push("crop-outside:" + planned.number);
          if (placed.image.crop > 0.1601) issues.push("crop:" + planned.number);
          var drawn = placed.image.w / placed.image.h;
          var sourceAspect = placed.image.sw / placed.image.sh;
          if (Math.abs(drawn - sourceAspect) > 0.04) issues.push("distort:" + planned.number);
          var gutter = placed.gutter;
          if (side === "left" && placed.text.x + placed.text.w > 1200 - gutter + 2) issues.push("gutter-text:" + planned.number);
          if (side === "right" && placed.text.x < gutter - 2) issues.push("gutter-text:" + planned.number);
          if (placed.text.h < 80) issues.push("text-room:" + planned.number);
          if (planned.accessibility && planned.accessibility.minSizeRatio < 0.03) issues.push("type-size:" + planned.number);
          var anchor = planned.continuous ? index % 2 ? 1536 * 0.75 : 1536 * 0.25 : 1536 / 2;
          if (placed.image.sx > anchor || placed.image.sx + placed.image.sw < anchor) issues.push("focal:" + planned.number);
          if (!planned.readingOrder || planned.readingOrder[planned.readingOrder.length - 1] !== "folio") issues.push("order:" + planned.number);
        });
        (art.pages || []).forEach(function(planned, index) {
          if (!index) return;
          if (planned.layout === art.pages[index - 1].layout && planned.layout !== "spread" && planned.layout !== "ending") {
            issues.push("repeat:" + planned.number);
          }
        });
        return { ok: issues.length === 0, issues };
      }
      return {
        SCHEMA,
        LAYOUTS,
        identityFrom,
        directBook,
        attachPlan,
        compose,
        checkBook,
        promptNote
      };
    });
  }
});

// js/book-v2-identity.js
var require_book_v2_identity = __commonJS({
  "js/book-v2-identity.js"(exports, module) {
    (function(root, factory) {
      var api = factory(root);
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookV2Identity = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function(root) {
      "use strict";
      var BIBLE_PAIR = { "wondii-maya": "maya", "wondii-leo": "leo" };
      var SCENE_REFERENCE_LIMIT = 4;
      var memory = {};
      function crewApi() {
        if (root && root.WondiiCrew) return root.WondiiCrew;
        return require_wondii_crew();
      }
      function characterApi() {
        if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
        return require_character_bible();
      }
      function savedRow(id, rows) {
        var found = null;
        (rows || []).forEach(function(row) {
          if (!row) return;
          if (String(row.characterId || row.id || "") === id) found = row;
        });
        return found;
      }
      function fileOwner(file) {
        var path = String(file || "");
        if (!path) return "";
        if (path.indexOf("maya-v1") >= 0) return "wondii-maya";
        var owner = "";
        crewApi().list().forEach(function(row) {
          if (owner) return;
          if (path.indexOf(row.portrait) >= 0 || path.indexOf("/" + row.id + ".") >= 0) owner = row.id;
        });
        return owner;
      }
      function appearanceSpec(entry, record) {
        var source = record || {};
        return {
          source: entry.referenceApproved ? "approved-sheet" : entry.source === "story-generated" ? "story" : "portrait",
          file: entry.approvedReference || entry.portrait || entry.reference || "",
          face: String(source.face || ""),
          hair: String(source.hair || ""),
          clothing: String(source.clothing || entry.clothing || ""),
          colours: Array.isArray(source.colours) ? source.colours.slice() : [],
          proportions: String(source.proportions || source.relativeHeight || ""),
          distinctive: (entry.distinctive || []).slice(),
          matchPortrait: entry.referenceApproved !== true && entry.source !== "story-generated",
          consistencyPromised: false
        };
      }
      function ownFile(id, file) {
        var path = String(file || "");
        if (!path) return "";
        var owner = fileOwner(path);
        if (owner && owner !== id) return "";
        return path;
      }
      function blank(kind, id, name) {
        return {
          characterId: id,
          journeyId: id,
          bibleId: BIBLE_PAIR[id] || "",
          name: name || "",
          source: kind,
          portrait: "",
          approvedReference: "",
          reference: "",
          referenceApproved: false,
          lockedSheet: false,
          sheet: "none",
          reliable: false,
          proposed: false,
          locked: false,
          personality: [],
          appearance: "",
          clothing: "",
          distinctive: [],
          role: "selected",
          pages: [],
          limitation: ""
        };
      }
      function lockCrew(member) {
        var id = String(member.id || "");
        var crew = crewApi().get(id);
        var entry = blank("wondii-crew", id, crew ? crew.name : member.name);
        var problems = [];
        if (!crew) {
          problems.push("unknown-character:" + id);
          return { entry, problems };
        }
        if (member.name && String(member.name).toLowerCase() !== crew.name.toLowerCase()) {
          problems.push("identity-mismatch:" + id);
        }
        var bibleId = BIBLE_PAIR[id] || "";
        var approved = bibleId ? characterApi().resolveReference(bibleId) : null;
        var approvedFile = approved && approved.status === "approved" ? String(approved.file || "") : "";
        if (approvedFile && fileOwner(approvedFile) !== id) approvedFile = "";
        entry.bibleId = bibleId;
        entry.name = crew.name;
        entry.portrait = crew.portrait;
        entry.approvedReference = approvedFile;
        entry.reference = approvedFile || crew.portrait;
        entry.referenceApproved = !!approvedFile;
        entry.lockedSheet = !!approvedFile;
        entry.sheet = approvedFile ? approved.versionId || "approved" : "portrait-only";
        entry.reliable = !!approvedFile;
        entry.proposed = !approvedFile;
        entry.locked = true;
        entry.personality = (crew.personality || []).slice();
        entry.appearance = approvedFile ? "Approved sheet " + approved.versionId + ". Portrait " + crew.portrait + "." : "Match the portrait exactly. No written clothing description is stored for this portrait.";
        entry.clothing = "as shown in " + (approvedFile || crew.portrait);
        entry.distinctive = [crew.trait || ""].filter(Boolean);
        entry.appearanceSpec = appearanceSpec(entry, {});
        entry.blocksGeneration = false;
        entry.limitation = approvedFile ? "" : "Portrait only. This portrait is the reference. Visual consistency is not guaranteed.";
        entry.referenceVersion = approvedFile ? approved.versionId || "approved" : "portrait:" + crew.portrait;
        return { entry, problems };
      }
      function lockRecord(member, kind, row) {
        var id = String(member.id || "");
        var entry = blank(kind, id, member.name || row && row.name || "");
        var problems = [];
        var reference = row && (row.reference || row.portrait) || "";
        var kept = ownFile(id, reference);
        if (!row || !row.ownerId || row.ownerType !== "family" && row.ownerType !== "school" && kind !== "shared") {
          if (kind === "shared" && row && (row.shareId || row.ownerId) && kept) {
            entry.ownerId = String(row.ownerId || row.shareId || "");
          } else if (!kept) {
            problems.push(reference ? "wrong-artwork:" + id : "missing-artwork:" + id);
            return { entry, problems };
          }
        }
        if (!kept) {
          problems.push(reference ? "wrong-artwork:" + id : "missing-artwork:" + id);
          return { entry, problems };
        }
        if (kind === "shared" && !(row.shareId || row.id)) {
          problems.push("missing-artwork:" + id);
          return { entry, problems };
        }
        entry.name = String(member.name || row.name || id);
        entry.portrait = kept;
        entry.reference = kept;
        entry.sheet = "portrait-only";
        entry.proposed = true;
        entry.locked = true;
        entry.personality = Array.isArray(row.personality) ? row.personality.slice() : [];
        entry.appearance = row.appearance ? String(row.appearance) : "Match the saved portrait exactly.";
        entry.clothing = row.clothing ? String(row.clothing) : "as shown in the saved portrait";
        entry.distinctive = Array.isArray(row.distinctive) ? row.distinctive.slice() : [];
        entry.ownerType = row.ownerType || "";
        entry.ownerId = String(row.ownerId || row.shareId || "");
        entry.shareId = String(row.shareId || "");
        entry.privateArt = true;
        entry.appearanceSpec = appearanceSpec(entry, row);
        entry.blocksGeneration = false;
        entry.limitation = "Portrait only. This saved portrait is the reference. Visual consistency is not guaranteed.";
        entry.referenceVersion = "portrait:" + kept;
        return { entry, problems };
      }
      function lockStory(character, selected) {
        var id = String(character && (character.characterId || character.id) || "");
        var name = String(character && character.name || "");
        var problems = [];
        var entry = blank("story-generated", id, name);
        entry.role = "story-generated";
        if (!id || !name) problems.push("story-incomplete");
        selected.forEach(function(row) {
          if (row.characterId === id || row.journeyId === id) problems.push("story-replaces-selected:" + id);
          if (name && row.name && name.toLowerCase() === row.name.toLowerCase()) problems.push("story-name-clash:" + id);
        });
        var art = String(character && (character.portrait || character.reference) || "");
        if (art) {
          var owner = fileOwner(art);
          if (owner) problems.push("story-uses-selected-art:" + id);
          selected.forEach(function(row) {
            if (art && (art === row.portrait || art === row.approvedReference || art === row.reference)) {
              problems.push("story-uses-selected-art:" + id);
            }
          });
        }
        var appearance = String(character && (character.appearance || character.clothing) || "");
        if (!appearance) problems.push("story-incomplete:" + id);
        if (problems.length) return { entry, problems };
        entry.portrait = art;
        entry.reference = art;
        entry.locked = true;
        entry.proposed = true;
        entry.personality = Array.isArray(character.personality) ? character.personality.slice() : [];
        entry.appearance = appearance;
        entry.clothing = String(character.clothing || appearance);
        entry.distinctive = Array.isArray(character.distinctive) ? character.distinctive.slice() : [];
        entry.limitation = "Story-made. This look stays fixed after the first appearance. It is not a selected character and it has not been visually reviewed.";
        entry.appearanceSpec = appearanceSpec(entry, character);
        entry.blocksGeneration = false;
        entry.referenceVersion = "story:" + id + ":" + appearance;
        return { entry, problems: [] };
      }
      function buildRegistry(input) {
        var source = input || {};
        var members = Array.isArray(source.members) ? source.members : [];
        var saved = source.savedReferences || [];
        var shared = source.sharedCharacters || [];
        var problems = [];
        var selected = [];
        members.forEach(function(member) {
          if (!member || !member.id) {
            problems.push("cast-missing");
            return;
          }
          var id = String(member.id);
          var kind = String(member.source || "");
          var crew = crewApi().get(id);
          var sharedRow = savedRow(id, shared);
          var savedRecord = savedRow(id, saved);
          var locked;
          if (kind === "wondii-crew" || !kind && crew) locked = lockCrew(member);
          else if (kind === "shared" || !kind && sharedRow) locked = lockRecord(member, "shared", sharedRow || savedRecord);
          else if (kind === "saved" || !kind && savedRecord) locked = lockRecord(member, "saved", savedRecord);
          else if (crew) locked = lockCrew(member);
          else {
            problems.push("unknown-character:" + id);
            return;
          }
          problems = problems.concat(locked.problems);
          selected.push(locked.entry);
        });
        var story = [];
        (source.storyCharacters || []).forEach(function(character) {
          var made = lockStory(character, selected);
          problems = problems.concat(made.problems);
          if (!made.problems.length) story.push(made.entry);
        });
        if (!selected.length) problems.push("cast-size");
        var registry = selected.concat(story);
        return {
          ok: problems.length === 0,
          problems: problems.filter(function(problem, index) {
            return problems.indexOf(problem) === index;
          }),
          registry,
          selected,
          illustration: illustrationPlan(registry, source.pages || [])
        };
      }
      function assignPages(registry, pages) {
        (registry || []).forEach(function(row) {
          row.pages = [];
        });
        (pages || []).forEach(function(page) {
          var pageId = String(page && (page.pageId || page.id) || "");
          (page && page.charactersPresent || []).forEach(function(id) {
            var row = (registry || []).filter(function(item) {
              return item.characterId === id || item.journeyId === id;
            })[0];
            if (row && pageId && row.pages.indexOf(pageId) < 0) row.pages.push(pageId);
          });
        });
      }
      function pageReferences(registry, present) {
        var files = [];
        var limitations = [];
        var seen = {};
        (present || []).forEach(function(id) {
          var row = (registry || []).filter(function(item) {
            return item.characterId === id || item.journeyId === id;
          })[0];
          if (!row) {
            limitations.push("missing:" + id);
            return;
          }
          var file = row.approvedReference || row.portrait || "";
          if (!file && row.source === "story-generated") {
            files.push({
              characterId: row.characterId,
              name: row.name,
              file: "",
              approved: false,
              reliable: false,
              appearance: row.appearance
            });
            return;
          }
          if (!file) {
            limitations.push("no-artwork:" + id);
            return;
          }
          var owner = fileOwner(file);
          if (owner && owner !== row.characterId && owner !== row.journeyId) {
            limitations.push("wrong-artwork:" + id);
            return;
          }
          if (seen[file] && seen[file] !== row.characterId) {
            limitations.push("shared-artwork:" + id);
            return;
          }
          seen[file] = row.characterId;
          files.push({
            characterId: row.characterId,
            name: row.name,
            file,
            approved: row.referenceApproved === true,
            reliable: row.reliable === true,
            usable: true,
            privateArt: row.privateArt === true,
            ownerId: row.ownerId || "",
            version: row.referenceVersion || file
          });
        });
        return {
          ok: files.length === (present || []).length && !limitations.some(function(item) {
            return item.indexOf("wrong-artwork:") === 0 || item.indexOf("shared-artwork:") === 0 || item.indexOf("missing:") === 0 || item.indexOf("no-artwork:") === 0;
          }),
          files,
          limitations,
          reliable: files.length > 0 && files.every(function(file) {
            return file.reliable;
          }) && limitations.length === 0
        };
      }
      function artApi() {
        if (root && root.WondiiArtDirection) return root.WondiiArtDirection;
        try {
          return require_book_art_direction();
        } catch (e) {
          return null;
        }
      }
      function artDirectionFor(pages) {
        var art = artApi();
        var hasText = (pages || []).some(function(page) {
          return page && (page.text || page.prose);
        });
        if (!art || !hasText) return null;
        try {
          return art.directBook({ pages });
        } catch (e) {
          return null;
        }
      }
      function illustrationPlan(registry, pages) {
        assignPages(registry, pages);
        var directed = artDirectionFor(pages);
        var spreads = (pages || []).map(function(page, index) {
          var present = page && page.charactersPresent || [];
          var refs = pageReferences(registry, present);
          return {
            pageId: String(page && (page.pageId || page.id) || ""),
            charactersPresent: present.slice(),
            references: refs.files,
            limitations: refs.limitations,
            reliable: refs.reliable,
            compositionNote: directed && directed.pages[index] ? directed.pages[index].promptNote : ""
          };
        });
        var selected = (registry || []).filter(function(row) {
          return row.source !== "story-generated";
        });
        var together = spreads.some(function(spread) {
          return spread.references.filter(function(file) {
            var row = selected.filter(function(item) {
              return item.characterId === file.characterId;
            })[0];
            return !!row;
          }).length >= 2;
        });
        var limitations = [];
        selected.forEach(function(row) {
          if (row.limitation) limitations.push(row.limitation);
        });
        return {
          spreads,
          multiCharacter: together,
          visuallyReviewed: false,
          solved: false,
          reliableReproduction: selected.length > 0 && selected.every(function(row) {
            return row.reliable === true;
          }) && limitations.length === 0,
          consistencyPromised: false,
          blocksGeneration: selected.some(function(row) {
            return row.blocksGeneration === true;
          }) || spreads.some(function(spread) {
            return spread.limitations.length > 0;
          }),
          reviewPath: "vision-check-and-one-repair",
          limitations,
          artDirection: directed
        };
      }
      function cacheKey(entry) {
        return String(entry.characterId || entry.journeyId || "") + "@" + String(entry.referenceVersion || entry.approvedReference || entry.portrait || entry.reference || "");
      }
      function authorise(entry, viewer) {
        if (!entry || entry.privateArt !== true) return { ok: true, privateArt: false };
        var owner = String(entry.ownerId || "");
        var share = String(entry.shareId || "");
        var who = viewer || {};
        var allowed = owner && (who.ownerId === owner || who.userId === owner) || share && who.shareId === share;
        if (!allowed) return { ok: false, privateArt: true, reason: "inaccessible" };
        return { ok: true, privateArt: true };
      }
      function prepareReference(entry, viewer, store) {
        var bag = store || memory;
        var key = cacheKey(entry);
        var existing = bag[key];
        if (existing) return Object.assign({ ok: true, reused: true }, existing);
        var access = authorise(entry, viewer);
        if (!access.ok) {
          return {
            ok: false,
            reused: false,
            characterId: entry.characterId,
            reason: "inaccessible",
            blocksGeneration: true
          };
        }
        var record = {
          key,
          characterId: entry.characterId,
          name: entry.name,
          version: entry.referenceVersion || "",
          file: entry.approvedReference || entry.portrait || entry.reference || "",
          approved: entry.referenceApproved === true,
          privateArt: access.privateArt,
          appearance: entry.appearanceSpec || appearanceSpec(entry, {}),
          blocksGeneration: !entry.approvedReference && !entry.portrait && !entry.reference && entry.source !== "story-generated",
          consistencyPromised: false
        };
        if (entry.source === "story-generated" && !entry.appearance) {
          return { ok: false, reused: false, characterId: entry.characterId, reason: "identity-before-scene", blocksGeneration: true };
        }
        bag[key] = record;
        return Object.assign({ ok: true, reused: false }, record);
      }
      function scenePasses(files, limit) {
        var size = limit || SCENE_REFERENCE_LIMIT;
        var list = files || [];
        var passes = [];
        var index;
        for (index = 0; index < list.length; index += size) passes.push(list.slice(index, index + size));
        var covered = {};
        passes.forEach(function(pass) {
          pass.forEach(function(file) {
            if (file && file.characterId) covered[file.characterId] = true;
          });
        });
        var omitted = list.filter(function(file) {
          return file && file.characterId && !covered[file.characterId];
        }).map(function(file) {
          return file.characterId;
        });
        return { passes, omitted, limit: size };
      }
      function prepareScene(registry, present, viewer, store) {
        var plan = pageReferences(registry, present);
        var prepared = [];
        var problems = plan.limitations.slice();
        plan.files.forEach(function(file) {
          var entry = (registry || []).filter(function(row) {
            return row.characterId === file.characterId;
          })[0] || file;
          var cached = prepareReference(entry, viewer, store);
          if (!cached.ok) {
            problems.push((cached.reason || "inaccessible") + ":" + file.characterId);
            return;
          }
          prepared.push(Object.assign({}, file, { reused: cached.reused, version: cached.version, file: cached.file || file.file }));
        });
        var passes = scenePasses(prepared);
        return {
          ok: plan.ok && problems.every(function(item) {
            return item.indexOf("inaccessible:") !== 0 && item.indexOf("identity-before-scene:") !== 0 && item.indexOf("no-artwork:") !== 0 && item.indexOf("missing:") !== 0 && item.indexOf("wrong-artwork:") !== 0;
          }),
          files: prepared,
          passes: passes.passes,
          omitted: passes.omitted,
          limitations: problems,
          blocksGeneration: !plan.ok || passes.omitted.length > 0 || problems.some(function(item) {
            return item.indexOf("inaccessible:") === 0 || item.indexOf("no-artwork:") === 0 || item.indexOf("missing:") === 0;
          }),
          consistencyPromised: false
        };
      }
      return {
        BIBLE_PAIR,
        SCENE_REFERENCE_LIMIT,
        buildRegistry,
        pageReferences,
        illustrationPlan,
        prepareReference,
        prepareScene,
        scenePasses,
        clearCache: function() {
          memory = {};
        }
      };
    });
  }
});

// js/book-cast.js
var require_book_cast = __commonJS({
  "js/book-cast.js"(exports, module) {
    "use strict";
    var Cast = require_character_bible();
    var LOCKED_KEYS = [
      "species",
      "type",
      "face",
      "head",
      "ageAppearance",
      "body",
      "relativeSize",
      "skinTone",
      "covering",
      "hair",
      "colouring",
      "markings",
      "eyes",
      "ears",
      "horns",
      "tail",
      "distinctiveFeatures",
      "defaultClothing",
      "footwear",
      "accessories",
      "visualIdentifiers"
    ];
    var CARRIED_STATE = ["mud", "damage", "wetness", "disguise", "transformation", "clothing", "removedAccessories"];
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
        type,
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
      Object.keys(source).forEach(function(key) {
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
      return { strength, required: true, expensive: strength === "sheet", ready: assets.length > 0 };
    }
    function registryRow(registry, id) {
      return (registry || []).filter(function(item) {
        return item && item.locked === true && item.source !== "story-generated" && (item.portrait || item.approvedReference) && (item.characterId === id || item.journeyId === id);
      })[0] || null;
    }
    function registryIdentity(id, row) {
      var spec = row.appearanceSpec || {};
      return {
        characterId: id,
        name: row.name || id,
        origin: "canonical",
        type: "human",
        species: "human",
        face: spec.face || "",
        hair: spec.hair || "",
        defaultClothing: row.clothing || "",
        distinctiveFeatures: row.distinctive || [],
        visualIdentifiers: row.distinctive || []
      };
    }
    function compileBookCast(bible, pages) {
      var book = bible || {};
      var list = pages || book.pages || [];
      var declared = {};
      (book.storyCast || []).forEach(function(row) {
        if (row && row.characterId) declared[row.characterId] = row;
      });
      var seen = {};
      list.forEach(function(page, index) {
        var spreadId = page.pageId || page.spreadId || "p" + (index + 1);
        (page.charactersPresent || []).forEach(function(id) {
          if (!seen[id]) seen[id] = [];
          if (seen[id].indexOf(spreadId) < 0) seen[id].push(spreadId);
        });
      });
      (book.castIds || []).forEach(function(id) {
        if (!seen[id]) seen[id] = [];
      });
      var problems = [];
      var members = Object.keys(seen).map(function(id) {
        var canonical = Cast.getCharacter(id);
        var fromRegistry = !canonical ? registryRow(book.identityRegistry, id) : null;
        var declaredRow = declared[id];
        var identity = null;
        if (canonical) identity = canonicalIdentity(canonical);
        else if (fromRegistry) identity = lockIdentity(registryIdentity(id, fromRegistry));
        else if (declaredRow) identity = lockIdentity(Object.assign({}, declaredRow, { origin: "story" }));
        else problems.push("identity-missing:" + id);
        var importance = declaredRow && declaredRow.visualImportance || (seen[id].length >= 2 ? "recurring" : "background");
        var member = {
          characterId: id,
          name: identity ? identity.name : id,
          origin: canonical || fromRegistry ? "canonical" : "story",
          relationship: canonical || fromRegistry ? "selected" : "story-created",
          identity,
          spreadsPresent: seen[id].slice(),
          firstAppearance: seen[id][0] || "",
          finalAppearance: seen[id][seen[id].length - 1] || "",
          recurring: seen[id].length >= 2,
          visualImportance: importance,
          referenceAssetIds: canonical ? (Cast.storyReferences(id).assetIds || []).slice() : fromRegistry && (fromRegistry.approvedReference || fromRegistry.portrait) ? [fromRegistry.approvedReference || fromRegistry.portrait] : asList(declaredRow && declaredRow.referenceAssetIds),
          referenceVersionId: canonical ? Cast.storyReferences(id).versionId || "" : ""
        };
        member.reference = referencePlan(member);
        if (member.recurring && !identity) problems.push("unlocked:" + id);
        if (member.reference.required && !member.reference.ready) problems.push("reference-before-first-spread:" + id);
        return member;
      });
      var byId = {};
      members.forEach(function(member) {
        byId[member.characterId] = member;
      });
      return {
        ok: problems.length === 0,
        ready: problems.length === 0,
        problems,
        members,
        byId
      };
    }
    function carryProblems(pages, cast) {
      var problems = [];
      var last = {};
      (pages || []).forEach(function(page) {
        (page.charactersPresent || []).forEach(function(id) {
          var before = (page.stateBefore && page.stateBefore.characters || []).filter(function(row) {
            return row.characterId === id;
          })[0] || {};
          var after = (page.stateAfter && page.stateAfter.characters || []).filter(function(row) {
            return row.characterId === id;
          })[0] || {};
          var member = cast && cast.byId && cast.byId[id];
          if (last[id]) {
            CARRIED_STATE.forEach(function(key) {
              if (!last[id][key] || Array.isArray(last[id][key]) && !last[id][key].length) return;
              if (!same(before[key], last[id][key])) problems.push("state-dropped:" + id + ":" + key);
            });
          }
          if (member && member.identity) {
            LOCKED_KEYS.forEach(function(key) {
              if (!member.identity[key] || Array.isArray(member.identity[key]) && !member.identity[key].length) return;
              if (before[key] && !same(before[key], member.identity[key])) problems.push("identity-drift:" + id + ":" + key);
              if (after[key] && !same(after[key], member.identity[key])) problems.push("identity-drift:" + id + ":" + key);
            });
          }
          var next = Object.assign({}, last[id] || {});
          CARRIED_STATE.forEach(function(key) {
            if (after[key] !== void 0 && after[key] !== "") next[key] = after[key];
          });
          last[id] = next;
        });
      });
      return problems.filter(function(problem, index, all) {
        return all.indexOf(problem) === index;
      });
    }
    function requiredAccessories(identity, state) {
      var removed = asList(state && state.removedAccessories);
      return asList(identity && identity.accessories).filter(function(item) {
        return removed.indexOf(item) < 0;
      });
    }
    function reviewSpread(cast, spread, vision) {
      var problems = [];
      var present = spread && spread.charactersPresent || [];
      var rows = vision && vision.characters || [];
      var montage = !!(spread && spread.montage);
      present.forEach(function(id) {
        var row = rows.filter(function(item) {
          return item.characterId === id;
        })[0];
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
        var stateRows = spread.characterStateBefore || spread.openingState && spread.openingState.characters || [];
        var state = stateRows.filter(function(item) {
          return item.characterId === id;
        })[0] || {};
        requiredAccessories(member.identity, state).forEach(function(item) {
          if ((row.missingAccessories || []).indexOf(item) >= 0) problems.push("accessory:" + id + ":" + item);
        });
      });
      rows.forEach(function(row) {
        if (row.characterId && present.indexOf(row.characterId) < 0) problems.push("character-extra:" + row.characterId);
      });
      if (vision && vision.duplicateCharacter === true && !montage) problems.push("duplicate");
      return { ok: problems.length === 0, problems };
    }
    function redesignProblems(cast, proposed) {
      var source = proposed || {};
      var member = cast && cast.byId && cast.byId[source.characterId];
      if (!member || !member.identity) return ["unknown-character:" + (source.characterId || "")];
      var problems = [];
      LOCKED_KEYS.forEach(function(key) {
        if (source[key] === void 0) return;
        if (!member.identity[key] || Array.isArray(member.identity[key]) && !member.identity[key].length) return;
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
      CARRIED_STATE.forEach(function(key) {
        if (!now[key] || key === "removedAccessories" || key === "clothing") return;
        bits.push(key + " " + now[key]);
      });
      if (member.referenceAssetIds && member.referenceAssetIds.length) bits.push("reference " + member.referenceAssetIds.join(", "));
      bits.push("Use this identity. Do not redesign it.");
      return bits.filter(Boolean).join(". ");
    }
    function spreadCastBrief(cast, spread) {
      var lines = (spread.charactersPresent || []).map(function(id) {
        var member = cast.byId[id];
        if (!member) return id;
        var state = (spread.characterStateBefore || []).filter(function(row) {
          return row.characterId === id;
        })[0] || {};
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
      LOCKED_KEYS,
      lockIdentity,
      canonicalIdentity,
      applyState,
      compileBookCast,
      carryProblems,
      reviewSpread,
      redesignProblems,
      appearanceLine,
      spreadCastBrief,
      referenceSheetPrompt,
      requiredAccessories
    };
  }
});

// js/book-journey.js
var require_book_journey = __commonJS({
  "js/book-journey.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookJourney = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
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
        "locationChanged",
        "subLocationChanged",
        "scaleChanged",
        "worldStateChanged",
        "objectStateChanged",
        "characterStateChanged",
        "castChanged",
        "lightingChanged",
        "timeChanged",
        "emotionalStateChanged",
        "actionChanged",
        "compositionChanged",
        "revealChanged"
      ];
      var REPEAT_RUN = 4;
      var IN_PLACE = { establish: 1, discover: 1, dwell: 1, trouble: 1 };
      var GENTLE_TONES = { bedtime: 1 };
      var ACTION_FAMILY = {
        hook: "establish",
        world: "establish",
        discovery: "discover",
        reaction: "dwell",
        goal: "dwell",
        exploration: "dwell",
        attempt: "dwell",
        relationship: "dwell",
        breath: "dwell",
        wonder: "dwell",
        humour: "dwell",
        anticipation: "dwell",
        complication: "trouble",
        setback: "trouble",
        consequence: "trouble",
        reveal: "turn",
        setup: "turn",
        payoff: "turn",
        turn: "turn",
        approach: "move",
        climax: "peak",
        resolution: "settle"
      };
      var IMPORTANCE_FOR = {
        establish: "quiet",
        discover: "normal",
        dwell: "normal",
        trouble: "strong",
        turn: "strong",
        move: "strong",
        peak: "hero",
        settle: "quiet"
      };
      var ROLE_IMPORTANCE = {
        hook: "quiet",
        world: "quiet",
        breath: "quiet",
        reaction: "quiet",
        wonder: "quiet",
        humour: "quiet",
        anticipation: "quiet",
        resolution: "quiet",
        discovery: "normal",
        attempt: "normal",
        exploration: "normal",
        goal: "normal",
        relationship: "normal",
        setup: "normal",
        complication: "strong",
        setback: "strong",
        reveal: "strong",
        consequence: "strong",
        approach: "strong",
        turn: "strong",
        payoff: "strong",
        climax: "hero"
      };
      var SCALE = {
        establishing: "wide",
        high: "wide",
        overhead: "wide",
        reveal: "wide",
        medium: "medium",
        action: "medium",
        reaction: "medium",
        low: "medium",
        close: "close",
        vignette: "close"
      };
      var CAMERA = {
        establishing: "Wide establishing view, so this place feels larger than the characters.",
        reveal: "A reveal: the new discovery is the clearest thing in the picture.",
        high: "A high view that shows how this place is arranged.",
        overhead: "Look down, so the arrangement on the ground is easy to read.",
        low: "A low viewpoint along the ground.",
        medium: "A medium view of the characters doing this moment.",
        action: "Show the movement, with a pose that changes from the previous picture.",
        reaction: "Stay near the faces, and keep the cause of the feeling visible.",
        close: "Move in close on the discovery. Do not repeat a wide view of the room.",
        vignette: "A quiet closing view, with the changed place or the way onward still visible."
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
        Object.keys(REGISTER_WORDS).forEach(function(id) {
          if (found) return;
          if (REGISTER_WORDS[id].some(function(word) {
            return text.indexOf(word) >= 0;
          })) found = id;
        });
        return found || text;
      }
      function scaleOf(shot) {
        return SCALE[shot] || "medium";
      }
      function entityList(snap) {
        return snap && snap.entities || [];
      }
      function placeIdentity(place) {
        return tokens(place && place.visualIdentity).concat(tokens(place && place.name));
      }
      function namedIn(entity, identity) {
        var names = tokens(entity && entity.name).concat(String(entity && entity.entityId || "").split(/[-_]/));
        return names.some(function(word) {
          return word.length > 3 && identity.indexOf(word) >= 0;
        });
      }
      function landmarkIds(bible, locationId) {
        var places = bible && bible.locations || [];
        var here = places.filter(function(item) {
          return item.locationId === locationId;
        })[0];
        var hereWords = placeIdentity(here);
        return (bible && bible.entities || []).filter(function(entity) {
          if (namedIn(entity, hereWords)) return true;
          if (entity.landmark === true && (!entity.locationId || entity.locationId === locationId)) return true;
          if (!entity.locationId || entity.locationId === locationId) return false;
          var home = places.filter(function(item) {
            return item.locationId === entity.locationId;
          })[0];
          return entity.landmark === true || namedIn(entity, placeIdentity(home));
        }).map(function(entity) {
          return entity.entityId;
        });
      }
      function storyObjectIds(bible, locationId, entities) {
        var marks = landmarkIds(bible, locationId);
        return sorted((entities || []).map(function(entity) {
          return entity.entityId;
        }).filter(function(id) {
          return marks.indexOf(id) < 0;
        }));
      }
      function objectStateMap(bible, locationId, entities) {
        var marks = landmarkIds(bible, locationId);
        var map = {};
        (entities || []).forEach(function(entity) {
          if (!entity || !entity.entityId || marks.indexOf(entity.entityId) >= 0) return;
          map[entity.entityId] = String(entity.state || "");
        });
        return map;
      }
      function characterStateMap(characters) {
        var map = {};
        (characters || []).forEach(function(row) {
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
        var beats = bible && bible.beats || [];
        if (page && page.role && page.beatId) return page;
        return beats.filter(function(beat) {
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
        var revealed = afterObjects.filter(function(id) {
          return beforeObjects.indexOf(id) < 0;
        });
        var role = beat.role || page.role || "";
        var family = familyOf(role);
        return {
          index,
          spreadId: page.pageId || page.spreadId || beat.beatId || "s" + (index + 1),
          beatId: beat.beatId || page.beatId || "",
          role,
          actionFamily: family,
          inPlace: !!IN_PLACE[family],
          locationId,
          subLocationId: page.subLocationId || page.areaId || beat.subLocationId || beat.areaId || "",
          cast: sorted(page.charactersPresent || beat.charactersPresent || []),
          storyObjects: afterObjects,
          revealed,
          emotion: page.emotion || beat.emotion || "",
          register: registerOf(page.emotion || beat.emotion || ""),
          shotType: page.shotType || beat.shotType || "",
          composition: page.compositionIntent || beat.compositionIntent || "",
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
        var meaningful = DELTA_KEYS.some(function(key) {
          if (key === "scaleChanged" || key === "compositionChanged") return false;
          return !!delta[key];
        });
        return !meaningful && (delta.scaleChanged || delta.compositionChanged);
      }
      function storyProgressed(delta) {
        return DELTA_KEYS.some(function(key) {
          if (key === "scaleChanged" || key === "compositionChanged") return false;
          return !!delta[key];
        });
      }
      function changedKeys(delta) {
        return DELTA_KEYS.filter(function(key) {
          return !!delta[key];
        });
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
        if (notes.length && notes.every(function(note) {
          return note === "scale" || note === "framing";
        })) return ["framing-only"];
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
        var importance = snaps.map(function(snap) {
          return importanceFor(snap, climaxId);
        });
        var heroes = [];
        importance.forEach(function(level, index) {
          if (level === "hero") heroes.push(index);
        });
        if (heroes.length > 1) {
          var keep = heroes.filter(function(index) {
            return snaps[index].beatId === climaxId || snaps[index].role === "climax";
          })[0];
          if (keep === void 0) keep = heroes[heroes.length - 1];
          heroes.forEach(function(index) {
            if (index !== keep) importance[index] = "strong";
          });
          problems.push("hero-repeat");
        }
        return { importance, problems };
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
        var plan = snaps.map(function() {
          return { role: "", kind: "" };
        });
        var pending = -1;
        snaps.forEach(function(snap, index) {
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
        var order = gentle ? ["opening", "discovery", "development", "turn", "climax", "resolution"] : ["opening", "discovery", "development", "escalation", "climax", "resolution"];
        var groups = {};
        snaps.forEach(function(snap) {
          var id = phaseId(snap.actionFamily, gentle, snap.role);
          if (!groups[id]) groups[id] = [];
          groups[id].push(snap.spreadId);
        });
        return {
          intensity: gentle ? "gentle" : "full",
          tone: tone || "",
          phases: order.filter(function(id) {
            return groups[id] && groups[id].length;
          }).map(function(id) {
            return {
              id,
              intent: id === "climax" && gentle ? "The strongest gentle change." : PHASE_INTENT[id],
              spreadIds: groups[id]
            };
          })
        };
      }
      function placeOf(bible, locationId) {
        return (bible && bible.locations || []).filter(function(place) {
          return place.locationId === locationId;
        })[0] || null;
      }
      function sharedLandmarks(bible, fromId, toId) {
        var fromMarks = landmarkIds(bible, fromId);
        var toMarks = landmarkIds(bible, toId);
        var shared = fromMarks.filter(function(id) {
          return toMarks.indexOf(id) >= 0;
        });
        var destination = placeOf(bible, toId);
        var identity = tokens(destination && destination.visualIdentity);
        fromMarks.forEach(function(id) {
          if (shared.indexOf(id) >= 0) return;
          var entity = (bible && bible.entities || []).filter(function(item) {
            return item.entityId === id;
          })[0];
          var names = tokens(entity && entity.name).concat(String(id).split(/[-_]/));
          if (names.some(function(word) {
            return word.length > 3 && identity.indexOf(word) >= 0;
          })) shared.push(id);
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
          linked,
          sharedLandmarks: sharedLandmarks(bible, previous.locationId, next.locationId)
        };
      }
      function cameraBrief(snap) {
        return CAMERA[snap.shotType] || "A medium view of the characters in this moment.";
      }
      function worldTone(tone) {
        var key = String(tone || "").toLowerCase();
        if (key === "bedtime") return "Keep the picture calm and gentle. Do not add spectacle.";
        if (key === "educational" || key === "factual" || key === "historical") {
          return "Keep the place accurate for this story. Do not add fantasy scenery.";
        }
        if (key === "magical" || key === "adventure" || key === "surprise") {
          return "Let this place feel alive through the story's own landmarks. Do not invent a new location.";
        }
        return "Follow this story's own places. Do not invent a new location.";
      }
      function continuityLine(bible, snaps, index) {
        var snap = snaps[index];
        var place = placeOf(bible, snap.locationId);
        var name = place && place.name || snap.locationId || "this place";
        var look = place && place.visualIdentity || "";
        var earlier = "";
        var i;
        for (i = 0; i < index; i += 1) {
          if (snaps[i].locationId && snaps[i].locationId === snap.locationId) earlier = snaps[i].spreadId;
        }
        if (earlier) {
          return "Same place as " + earlier + ": " + name + ". Keep its look: " + look + " Do not redesign it as a new room.";
        }
        return "First view of " + name + ". Establish this look and keep it later: " + look;
      }
      function placeTransition(snaps, index) {
        var snap = snaps[index];
        var previous = index ? snaps[index - 1] : null;
        if (!previous || !snap.locationId || previous.locationId === snap.locationId) return "";
        var seen = false;
        var i;
        for (i = 0; i < index; i += 1) {
          if (snaps[i].locationId === snap.locationId) seen = true;
        }
        if (seen) return "Returning to a place already shown. Keep its established look. Do not redesign it.";
        return "New story location. Draw this place only. Do not bring the previous place's scenery unless the story says it is still here.";
      }
      function placeStay(snaps, index) {
        var stay = 1;
        var id = snaps[index].locationId;
        var i = index;
        while (i > 0 && snaps[i - 1].locationId === id) {
          stay += 1;
          i -= 1;
        }
        return stay;
      }
      function varietyNote(previous, snap) {
        if (!previous || !snap.locationId || previous.locationId !== snap.locationId) return "";
        if (previous.shotType && previous.shotType === snap.shotType) return "same-viewpoint";
        return "";
      }
      function repetitionRuns(snaps) {
        var runs = [];
        var current = [];
        function close() {
          if (current.length >= REPEAT_RUN) {
            var first = snaps[current[0]];
            var last = snaps[current[current.length - 1]];
            runs.push({
              spreadIds: current.map(function(index) {
                return snaps[index].spreadId;
              }),
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
        snaps.forEach(function(snap, index) {
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
        var bible = input && input.bible || input || {};
        var pages = input && input.pages || bible.pages || [];
        if (pages.length) {
          return pages.map(function(page, index) {
            return snapshot(bible, page, index);
          });
        }
        return (bible.beats || input.beats || []).map(function(beat, index) {
          return snapshot(bible, beat, index);
        });
      }
      function analyse(input) {
        var bible = input && input.bible || {};
        var tone = input && input.tone || bible.tone || "";
        var snaps = listSpreads(input && input.bible ? input : { bible, pages: input && input.pages, beats: input && input.beats });
        if (input && input.beats && !(input.pages && input.pages.length) && !input.bible) {
          snaps = input.beats.map(function(beat, index) {
            return snapshot({}, beat, index);
          });
        }
        var climaxId = bible.climaxBeatId || "";
        if (!climaxId) {
          var climax = snaps.filter(function(snap) {
            return snap.role === "climax";
          })[0];
          climaxId = climax ? climax.beatId : "";
        }
        var heroes = settleHeroes(snaps, climaxId);
        var roles = assignRoles(snaps, heroes.importance);
        var problems = heroes.problems.slice();
        var deltas = [];
        var diagnostics = snaps.map(function(snap, index) {
          var previous = index ? snaps[index - 1] : null;
          if (previous) {
            snap.revealed = snap.storyObjects.filter(function(id) {
              return previous.storyObjects.indexOf(id) < 0;
            });
          }
          var delta = previous ? visualDelta(previous, snap) : null;
          var progressed2 = delta ? storyProgressed(delta) : true;
          var cameraOnly = delta ? framingOnly(delta) : false;
          if (delta && !progressed2) problems.push("spread-unearned:" + snap.spreadId);
          if (delta) deltas.push({ from: previous.spreadId, to: snap.spreadId, visualDelta: delta, storyProgressed: progressed2, cameraOnly, worldIdentity: worldIdentity(bible, previous, snap) });
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
            storyProgressed: progressed2,
            cameraOnly,
            cameraBrief: cameraBrief(snap),
            continuityLine: continuityLine(bible, snaps, index),
            placeTransition: placeTransition(snaps, index),
            worldTone: worldTone(tone),
            varietyNote: varietyNote(previous, snap),
            placeStay: placeStay(snaps, index)
          };
        });
        var repetition = repetitionRuns(snaps);
        repetition.forEach(function(run) {
          problems.push("visual-repetition:" + run.from);
        });
        var arc = buildArc(snaps, tone);
        var progressed = diagnostics.some(function(row, index) {
          return index > 0 && row.storyProgressed;
        });
        if (snaps.length > 1 && !progressed) problems.push("no-visual-progression");
        return {
          visualArc: arc,
          spreads: diagnostics,
          deltas,
          repetition,
          problems: problems.filter(function(problem, index) {
            return problems.indexOf(problem) === index;
          }),
          summary: {
            intensity: arc.intensity,
            repetitionRuns: repetition.length,
            heroCount: heroes.importance.filter(function(level) {
              return level === "hero";
            }).length
          }
        };
      }
      function depthProblems(beats) {
        var review = analyse({ beats: beats || [] });
        return review.problems.filter(function(problem) {
          return problem.indexOf("visual-repetition:") === 0 || problem.indexOf("spread-unearned:") === 0;
        });
      }
      return {
        IMPORTANCE,
        PAGE_ROLES,
        PAGE_KINDS,
        DELTA_KEYS,
        REPEAT_RUN,
        analyse,
        visualDelta,
        storyProgressed,
        depthProblems,
        recommendTextRegion,
        gutterSafe,
        registerOf,
        familyOf,
        cameraBrief,
        worldTone
      };
    });
  }
});

// js/book-progression.js
var require_book_progression = __commonJS({
  "js/book-progression.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookProgression = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var PHASES = ["SETUP", "DISCOVERY", "COMMITMENT", "ATTEMPT", "ESCALATION", "SETBACK", "REVELATION", "CLIMAX", "RESOLUTION", "AFTERMATH"];
      var DIMENSIONS = ["LOCATION", "GOAL", "OBSTACLE", "ACTION", "CONSEQUENCE", "DISCOVERY", "EMOTION", "WORLD_STATE", "ENTITY_STATE", "RELATIONSHIP", "STAKES", "INFORMATION"];
      var TURN_INTENTS = ["CONTINUE", "ANTICIPATE", "SURPRISE", "REVEAL", "PAUSE", "RESOLVE"];
      var LAYOUTS = ["SINGLE_PAGE_SCENE", "PAGE_PAIR", "DOUBLE_PAGE_SPREAD", "QUIET_PAGE", "REVEAL_TURN"];
      var STATIC_RUN = 4;
      var QUIET_ROLES = { reaction: 1, breath: 1, wonder: 1, humour: 1, anticipation: 1 };
      var PHASE_FOR = {
        hook: "SETUP",
        world: "SETUP",
        discovery: "DISCOVERY",
        setup: "DISCOVERY",
        goal: "COMMITMENT",
        relationship: "COMMITMENT",
        attempt: "ATTEMPT",
        exploration: "ATTEMPT",
        complication: "ESCALATION",
        approach: "ESCALATION",
        consequence: "ESCALATION",
        setback: "SETBACK",
        reveal: "REVELATION",
        turn: "REVELATION",
        payoff: "REVELATION",
        climax: "CLIMAX",
        resolution: "RESOLUTION"
      };
      var ACTION_CLASS = {
        hook: "setup",
        world: "setup",
        discovery: "discover",
        setup: "discover",
        goal: "connect",
        relationship: "connect",
        reaction: "dwell",
        breath: "dwell",
        wonder: "dwell",
        humour: "dwell",
        anticipation: "dwell",
        exploration: "dwell",
        attempt: "try",
        complication: "pressure",
        setback: "pressure",
        consequence: "result",
        reveal: "result",
        payoff: "result",
        turn: "result",
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
        (bible && bible.entities || []).forEach(function(entity) {
          if (!entity || !(entity.landmark === true || entity.kind === "landmark")) return;
          if (!entity.locationId || entity.locationId === locationId) marks[entity.entityId] = 1;
        });
        var place = placeOf(bible, locationId);
        (place && (place.persistentObjects || place.landmarkIds) || []).forEach(function(id) {
          marks[id] = 1;
        });
        return marks;
      }
      function structuralEntities(bible, row) {
        var marks = sceneryIds(bible, row.locationId);
        return entitiesOf(row).filter(function(entity) {
          return entity && entity.entityId && !marks[entity.entityId];
        }).map(function(entity) {
          return {
            id: entity.entityId,
            owner: entity.ownerCharacterId || "",
            at: entity.locationId || row.locationId || ""
          };
        }).sort(function(left, right) {
          return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
        });
      }
      function entitySignature(rows) {
        return rows.map(function(entity) {
          return entity.id + "@" + entity.owner + "@" + entity.at;
        }).join(",");
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
        return (bible && bible.locations || []).filter(function(place) {
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
        var bible = input && input.bible || {};
        var pages = input && input.pages || bible.pages || [];
        var beats = input && input.beats || bible.beats || [];
        var source = pages.length ? pages : beats;
        return {
          bible,
          rows: source.map(function(item, index) {
            var beat = {};
            if (pages.length) {
              beat = beats.filter(function(candidate) {
                return candidate.beatId && candidate.beatId === item.beatId;
              })[0] || {};
            }
            var row = {};
            Object.keys(beat).forEach(function(key) {
              row[key] = beat[key];
            });
            Object.keys(item).forEach(function(key) {
              row[key] = item[key];
            });
            row.beatId = item.beatId || beat.beatId || "b" + (index + 1);
            row.spreadId = item.pageId || item.spreadId || beat.spreadId || "p" + (index + 1);
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
        var discovery = current.present.some(function(id) {
          return previous.present.indexOf(id) < 0;
        });
        var emotion = text(previous.emotionalState) !== text(current.emotionalState) && !!(previous.emotionalState || current.emotionalState);
        var relationship = previous.cast.join("|") !== current.cast.join("|") || text(previous.relationshipNow) !== text(current.relationshipNow) && !!(previous.relationshipNow || current.relationshipNow);
        var stakes = text(previous.stakesNow) !== text(current.stakesNow) && !!(previous.stakesNow || current.stakesNow);
        var action = previous.actionClass !== current.actionClass && keyChanged;
        var consequence = entity || world || text(previous.consequenceNow) !== text(current.consequenceNow) && !!(previous.consequenceNow || current.consequenceNow);
        var information = discovery || world || !!current.explicitInformation;
        var delta = {
          LOCATION: location,
          GOAL: goal,
          OBSTACLE: obstacle,
          ACTION: action,
          CONSEQUENCE: consequence || entity && current.actionClass === "result",
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
        return DIMENSIONS.filter(function(key) {
          return delta && delta[key];
        });
      }
      function reasonFor(changed, row, index) {
        if (!index) return "opening";
        if (!changed.length) return "same situation";
        if (changed.length === 1 && changed[0] === "EMOTION") {
          return QUIET_ROLES[row.role] ? "quiet beat" : "same situation";
        }
        return changed.filter(function(key) {
          return key !== "EMOTION";
        }).join(", ").toLowerCase() || "quiet beat";
      }
      function intentFor(row, index, last, tone) {
        var asked = text(row.pageTurnIntent).toUpperCase();
        if (TURN_INTENTS.indexOf(asked) >= 0) return asked;
        if (index === last || row.role === "resolution") return "RESOLVE";
        if (QUIET_ROLES[row.role] || row.role === "breath") return "PAUSE";
        if (row.pageTurnHook && (row.role === "reveal" || row.role === "discovery" || row.role === "payoff" || row.role === "climax")) {
          return tone === "bedtime" ? "REVEAL" : row.role === "climax" ? "SURPRISE" : "REVEAL";
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
        pack.rows.forEach(function(row, index) {
          if (row.role === "climax" || bible.climaxBeatId && row.beatId === bible.climaxBeatId) climaxAt = index;
        });
        var previousPhase = "";
        return pack.rows.map(function(row, index) {
          var entities = structuralEntities(bible, row);
          var present = entities.map(function(entity) {
            return entity.id;
          });
          var phase = phaseOf(row.role, previousPhase, index, climaxAt);
          previousPhase = phase;
          return {
            index,
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
            entities,
            present,
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
        rows.forEach(function(row) {
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
        var story = (changed || []).filter(function(key) {
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
        var tone = input && input.tone || bible.tone || "";
        var length = input && input.length || bible.targetLength || "";
        var deltas = [];
        var map = rows.map(function(row, index) {
          var previous = index ? rows[index - 1] : null;
          var entered = previous ? row.present.filter(function(id) {
            return previous.present.indexOf(id) < 0;
          }) : row.present.slice();
          var delta = previous ? progressionDelta(previous, row) : null;
          var changed = changedList(delta);
          if (delta) deltas.push({ from: previous.spreadId, to: row.spreadId, progressionDelta: delta, changed });
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
            consequenceNow: row.consequenceNow || (delta && (delta.CONSEQUENCE || delta.ENTITY_STATE || delta.WORLD_STATE) ? "state-changed" : ""),
            emotionalState: row.emotionalState,
            worldStateBefore: previous ? previous.worldSignature : "",
            worldStateAfter: row.worldSignature,
            newInformation: !index ? ["opening"] : changed.length ? changed.slice() : ["none"],
            visualDifferenceFromPrevious: novelty(changed, row),
            progressionReason: why,
            entryFrom: row.entryFrom || (previous && previous.locationId !== row.locationId ? previous.locationId : ""),
            exitToward: row.exitToward,
            destinationHint: row.destinationHint,
            pageTurnIntent: turn,
            layoutIntent: layout,
            earned: !index || changed.some(function(key) {
              return key !== "EMOTION";
            }) || row.quiet && why === "quiet beat"
          };
        });
        var revealCount = 0;
        map.forEach(function(row, index) {
          if (row.pageTurnIntent === "REVEAL" || row.pageTurnIntent === "SURPRISE") revealCount += 1;
          if (index < rows.length - 1 && rows[index + 1].locationId && rows[index + 1].locationId !== row.locationId && !row.exitToward) {
            row.exitToward = rows[index + 1].locationId;
          }
        });
        var reviewProblems = [];
        if (rows.length > 3 && revealCount > Math.ceil(rows.length / 3)) {
          var kept = false;
          map.forEach(function(row) {
            if (row.pageTurnIntent !== "REVEAL" && row.pageTurnIntent !== "SURPRISE") return;
            if (!kept && row.narrativePhase === "CLIMAX") {
              kept = true;
              return;
            }
            if (!kept && !map.some(function(item) {
              return item.narrativePhase === "CLIMAX";
            })) {
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
            current.slice(1).forEach(function(index) {
              internal.push(deltas[index - 1]);
            });
            var seen = {};
            internal.forEach(function(delta) {
              delta.changed.forEach(function(key) {
                seen[key] = 1;
              });
            });
            var changed = DIMENSIONS.filter(function(key) {
              return seen[key];
            });
            var unchanged = DIMENSIONS.filter(function(key) {
              return !seen[key];
            });
            runs.push({
              code: "STATIC_RUN",
              spreadIds: current.map(function(index) {
                return rows[index].spreadId;
              }),
              beatIds: current.map(function(index) {
                return rows[index].beatId;
              }),
              repeatedLocation: first.locationId,
              repeatedZone: first.locationZone,
              repeatedGoal: first.goalNow,
              repeatedObstacle: first.obstacleNow,
              repeatedInteraction: first.entitySignature || first.actionClass,
              changedDimensions: changed,
              unchangedDimensions: unchanged
            });
            current.forEach(function(index) {
              map[index].earned = false;
            });
          }
          current = [];
        }
        rows.forEach(function(row, index) {
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
        runs.forEach(function(run) {
          blockProblems.push("static-run:" + run.spreadIds[0]);
        });
        rows.forEach(function(row, index) {
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
        rows.forEach(function(row) {
          row.present.forEach(function(id) {
            if (!introduced[id]) introduced[id] = row.entitySignature;
          });
        });
        var paid = false;
        var unused = [];
        Object.keys(introduced).forEach(function(id) {
          var changed = rows.some(function(row, index) {
            if (!index) return false;
            var before = rows[index - 1].entities.filter(function(entity) {
              return entity.id === id;
            })[0];
            var after = row.entities.filter(function(entity) {
              return entity.id === id;
            })[0];
            if (before && !after) return true;
            if (before && after && (before.owner !== after.owner || before.at !== after.at)) return true;
            return false;
          });
          if (changed) paid = true;
          else unused.push(id);
        });
        var worldMoved = rows.some(function(row, index) {
          return index > 0 && row.worldSignature !== rows[0].worldSignature && row.worldSignature !== rows[index - 1].worldSignature;
        });
        if (worldMoved) paid = true;
        if (Object.keys(introduced).length && !paid) blockProblems.push("payoff-missing");
        if (!worldMoved) unused.forEach(function(id) {
          reviewProblems.push("setup-open:" + id);
        });
        var opening = rows[0];
        var climax = rows.filter(function(row) {
          return row.narrativePhase === "CLIMAX" || row.role === "climax";
        })[0];
        var resolution = rows.filter(function(row) {
          return row.role === "resolution" || row.narrativePhase === "RESOLUTION";
        })[0];
        if (opening && climax && climax.situationKey === opening.situationKey && !paid) blockProblems.push("climax-disconnected");
        if (opening && resolution && resolution.situationKey === opening.situationKey && !paid) blockProblems.push("ending-unearned");
        if ((length === "storybook" || length === "adventure") && climax && rows.length > 4) {
          var middleMoves = 0;
          rows.forEach(function(row, index) {
            if (index < 2 || row.index >= climax.index) return;
            if (row.situationKey !== rows[index - 1].situationKey) middleMoves += 1;
          });
          if (!middleMoves && !runs.length) reviewProblems.push("middle-thin");
        }
        map.forEach(function(row, index) {
          var beat = rows[index];
          var place = placeOf(bible, beat.locationId);
          var anchors = (place && (place.persistentObjects || place.landmarkIds) || []).slice();
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
        var visualMap = map.map(function(row) {
          return row.visual;
        });
        map.forEach(function(row) {
          delete row.visual;
        });
        function unique(list) {
          return list.filter(function(item, index) {
            return list.indexOf(item) === index;
          });
        }
        blockProblems = unique(blockProblems);
        reviewProblems = unique(reviewProblems);
        var verdict = blockProblems.length ? "BLOCK" : reviewProblems.length ? "REVIEW" : "PASS";
        return {
          verdict,
          storyProgressionMap: map,
          progressionDeltas: deltas,
          staticRuns: runs,
          visualProgressionMap: visualMap,
          blockProblems,
          reviewProblems,
          setupPayoff: { paid, unused }
        };
      }
      function proseProblems(bible, pages) {
        var result = review({ bible, pages: pages || [] });
        var problems = [];
        (pages || []).forEach(function(page) {
          var row = result.storyProgressionMap.filter(function(item) {
            return item.spreadId === page.pageId || item.beatId === page.beatId;
          })[0];
          var delta = result.progressionDeltas.filter(function(item) {
            return item.to === (page.pageId || page.spreadId);
          })[0];
          if (!row || !delta) return;
          var prose = text(page.prose).toLowerCase();
          if (!prose) return;
          if (delta.progressionDelta.LOCATION) {
            var place = placeOf(bible, row.locationId);
            var name = place && place.name ? place.name.toLowerCase() : "";
            if (name && prose.indexOf(name) < 0) problems.push("prose-erases-progression:" + (page.pageId || row.spreadId));
          }
          if (delta.progressionDelta.DISCOVERY && row.discoveryNow) {
            row.discoveryNow.split(",").forEach(function(id) {
              var entity = (bible && bible.entities || []).filter(function(item) {
                return item.entityId === id;
              })[0];
              var name2 = entity && entity.name ? entity.name.toLowerCase() : "";
              if (name2 && prose.indexOf(name2) < 0) problems.push("prose-erases-progression:" + (page.pageId || row.spreadId));
            });
          }
        });
        return problems.filter(function(item, index) {
          return problems.indexOf(item) === index;
        });
      }
      function progressionDeltaPublic(previousBeat, currentBeat) {
        var result = review({ beats: [previousBeat || {}, currentBeat || {}] });
        return result.progressionDeltas[0] ? result.progressionDeltas[0].progressionDelta : null;
      }
      return {
        PHASES,
        DIMENSIONS,
        TURN_INTENTS,
        LAYOUTS,
        STATIC_RUN,
        review,
        progressionDelta: progressionDeltaPublic,
        proseProblems
      };
    });
  }
});

// js/book-visual.js
var require_book_visual = __commonJS({
  "js/book-visual.js"(exports, module) {
    "use strict";
    var Cast = require_character_bible();
    var BookCast = require_book_cast();
    var Journey = require_book_journey();
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
      purple: 1,
      yellow: 1,
      red: 1,
      blue: 1,
      green: 1,
      orange: 1,
      pink: 1,
      gold: 1,
      golden: 1,
      silver: 1,
      black: 1,
      white: 1,
      brown: 1,
      grey: 1,
      gray: 1,
      navy: 1
    };
    function clone(value) {
      if (value === void 0) return null;
      return JSON.parse(JSON.stringify(value));
    }
    function tokens(text) {
      return String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
    }
    function coloursIn(text) {
      var found = [];
      tokens(text).forEach(function(word) {
        var bare = word.replace(/'s$/, "");
        if (COLOURS[bare] && found.indexOf(bare) < 0) found.push(bare);
      });
      return found;
    }
    function sentencesOf(prose) {
      return String(prose || "").split(/(?<=[.!?])\s+/).map(function(part) {
        return part.trim();
      }).filter(Boolean);
    }
    var NAME_GLUE = {
      the: 1,
      a: 1,
      an: 1,
      and: 1,
      or: 1,
      of: 1,
      to: 1,
      her: 1,
      his: 1,
      its: 1,
      their: 1,
      with: 1,
      on: 1,
      in: 1,
      at: 1,
      by: 1,
      for: 1,
      from: 1
    };
    var COPULA = { was: 1, were: 1, looked: 1, seemed: 1, turned: 1, became: 1, grew: 1 };
    function bareWord(word) {
      return String(word || "").replace(/'s$/, "");
    }
    function nameTokens(entity) {
      return tokens(entity && entity.name).map(bareWord).filter(function(word) {
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
      return (entities || []).some(function(entity) {
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
      return (entities || []).some(function(entity) {
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
      bag.forEach(function(word, index) {
        if (bareWord(word) === colour) places.push(index);
      });
      return places.map(function(index) {
        var after = phraseAfter(bag, index, entities);
        if (after.length) return after;
        if (hasForwardNoun(bag, index)) return [];
        return phraseBefore(bag, index);
      }).filter(function(phrase) {
        return phrase.length;
      });
    }
    function colourModifiers(entity) {
      return nameTokens(entity).slice(0, -1).filter(function(word) {
        return !COLOURS[word];
      });
    }
    function colourNear(sentence, entity, colour, entities) {
      var names = nameTokens(entity);
      if (!names.length) return false;
      var head = names[names.length - 1];
      return colourPhrase(sentence, colour, entities).some(function(phrase) {
        if (phrase[phrase.length - 1] !== head) return false;
        var candidates = (entities || []).filter(function(item) {
          var itemNames = nameTokens(item);
          return itemNames.length && itemNames[itemNames.length - 1] === head;
        });
        if (!candidates.length) candidates = [entity];
        var complete = candidates.filter(function(item) {
          return colourModifiers(item).every(function(word) {
            return phrase.indexOf(word) >= 0;
          });
        });
        var winner = (complete.length ? complete : candidates).reduce(function(best, item) {
          return nameTokens(item).length > nameTokens(best).length ? item : best;
        });
        return winner.entityId === entity.entityId;
      });
    }
    function registryEntry(bible, id) {
      return (bible && bible.identityRegistry || []).filter(function(row) {
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
      var file = row ? row.approvedReference || row.portrait || "" : refs.file || "";
      return {
        characterId: id,
        name: row && row.name || character && character.name || id,
        face: portraitOnly ? "as shown in this character's own portrait" : character && character.face || "",
        skinTone: portraitOnly ? "as shown in this character's own portrait" : character && character.skinTone || "",
        hair: portraitOnly ? "as shown in this character's own portrait" : character && character.hair || "",
        ageAppearance: character && character.ageAppearance || "",
        body: character && character.body || "",
        defaultClothing: portraitOnly ? "as shown in this character's own portrait" : character && character.defaultClothing || "",
        footwear: portraitOnly ? "as shown in this character's own portrait" : character && character.footwear || "",
        accessories: portraitOnly ? [] : (character && character.accessories || []).slice(),
        relativeHeight: character && character.relativeHeight || "",
        visualIdentifiers: portraitOnly ? ["match the portrait exactly"] : (character && character.visualIdentifiers || []).slice(),
        referenceAssetIds: portraitOnly ? [] : (refs.assetIds || []).slice(),
        referenceVersionId: portraitOnly ? row.referenceVersion || "" : refs.versionId || "",
        referenceFile: file,
        referenceStatus: portraitOnly ? "portrait" : refs.status || "missing"
      };
    }
    function characterOwns(bible, page, sentence, colour) {
      var present = page.charactersPresent || bible.castIds || [];
      return present.some(function(id) {
        var character = describedCharacter(bible, id);
        if (!character || tokens(sentence).indexOf(character.name.toLowerCase()) < 0) return false;
        var look = [character.defaultClothing, character.footwear].concat(character.accessories || []).concat(character.visualIdentifiers || []).join(" ");
        return coloursIn(look).indexOf(colour) >= 0;
      });
    }
    function allowedColours(entity, page) {
      var text = [entity.name, entity.identity, entity.state].join(" ");
      [page.stateBefore, page.stateAfter].forEach(function(snap) {
        (snap && snap.entities || []).forEach(function(row) {
          if (row.entityId === entity.entityId) text += " " + (row.state || "");
        });
      });
      return coloursIn(text);
    }
    function unplannedVisualProblems(bible, pages) {
      var problems = [];
      var entities = bible && bible.entities || [];
      var known = {};
      entities.forEach(function(entity) {
        known[entity.entityId] = allowedColours(entity, { stateBefore: null, stateAfter: null });
      });
      (pages || []).forEach(function(page) {
        var previous = [];
        sentencesOf(page.prose).forEach(function(sentence) {
          var named = entities.filter(function(entity) {
            return mentions(entity, sentence);
          });
          var colours = coloursIn(sentence).filter(function(colour) {
            return !characterOwns(bible, page, sentence, colour);
          });
          var bound = named;
          var fromPrevious = false;
          if (!bound.length && colours.length && previous.length === 1 && !characterOwns(bible, page, sentence, colours[0])) {
            var namesSomeone = (page.charactersPresent || bible.castIds || []).some(function(id) {
              var character = describedCharacter(bible, id);
              return character && tokens(sentence).indexOf(character.name.toLowerCase()) >= 0;
            });
            if (!namesSomeone) {
              bound = previous;
              fromPrevious = true;
            }
          }
          bound.forEach(function(entity) {
            var allow = known[entity.entityId].concat(allowedColours(entity, page));
            var intro = entity.introducedAt && page.beatId === entity.introducedAt;
            colours.forEach(function(colour) {
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
      return problems.filter(function(problem, index) {
        return problems.indexOf(problem) === index;
      });
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
      "rendering",
      "characterRendering",
      "shapeLanguage",
      "edge",
      "texture",
      "material",
      "detail",
      "depth",
      "facialRendering",
      "proportions",
      "environmentRendering",
      "lightingPhilosophy",
      "colourTreatment",
      "finish"
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
          tone: bible && bible.tone || "",
          mood: TONE_MOOD[bible && bible.tone] || TONE_MOOD.surprise
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
          palette: spread && spread.palette || "",
          brightness: spread && spread.brightness || "",
          timeOfDay: spread && spread.timeOfDay || "",
          weather: spread && spread.weather || "",
          atmosphere: spread && spread.atmosphere || place && place.visualIdentity || "",
          warmth: spread && spread.warmth || "",
          tension: spread && spread.tension || "",
          glow: spread && spread.glow || ""
        }
      };
    }
    function styleClause(contract) {
      var look = contract && contract.illustrator || ILLUSTRATOR;
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
      return String(text || "").split(/(?<=[.!?])\s+/).map(function(sentence) {
        return sentence.trim();
      }).filter(function(sentence) {
        if (!sentence || !DRIFT_WORD.test(sentence)) return false;
        return !/\b(not|never|don't|do not|without)\b/i.test(sentence);
      });
    }
    function withoutStyleOverrides(text) {
      var dropped = styleOverrides(text);
      if (!dropped.length) return String(text || "");
      return String(text || "").split(/(?<=[.!?])\s+/).filter(function(sentence) {
        return dropped.indexOf(sentence.trim()) < 0;
      }).join(" ");
    }
    function sameIllustrator(left, right) {
      var a = left && left.illustrator || {};
      var b = right && right.illustrator || {};
      return STYLE_KEYS.every(function(key) {
        return a[key] === b[key];
      });
    }
    function atmosphereDelta(left, right) {
      return ATMOSPHERE_KEYS.filter(function(key) {
        return left && right && left[key] && right[key] && left[key] !== right[key];
      });
    }
    function readingDrift(reading) {
      var problems = [];
      var report = reading || {};
      Object.keys(DRIFT_VALUES).forEach(function(key) {
        var value = String(report[key] || "").toLowerCase();
        if (value && DRIFT_VALUES[key][value]) problems.push("style-drift:" + key + ":" + value);
      });
      return problems;
    }
    function styleCoherence(readings) {
      var problems = [];
      var list = readings || [];
      var refs = list.filter(function(reading) {
        return reading && reading.reference;
      });
      list.forEach(function(reading) {
        if (!reading) return;
        readingDrift(reading).forEach(function(problem) {
          problems.push((reading.spreadId || "spread") + ":" + problem);
        });
        refs.forEach(function(ref) {
          if (!ref || ref.spreadId === reading.spreadId) return;
          Object.keys(DRIFT_VALUES).forEach(function(key) {
            if (!reading[key] || !ref[key] || reading[key] === ref[key]) return;
            if (DRIFT_VALUES[key][String(reading[key]).toLowerCase()]) {
              problems.push("style-drift:" + (reading.spreadId || "spread") + ":" + key);
            }
          });
        });
      });
      return { ok: problems.length === 0, problems: problems.filter(function(problem, index) {
        return problems.indexOf(problem) === index;
      }) };
    }
    function castLook(bible, proposals) {
      var proposalsById = proposals || {};
      return (bible.castIds || []).map(function(id) {
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
      return String(text || "").split(",").map(function(part) {
        return part.trim();
      }).filter(Boolean);
    }
    function wornOutfit(stateClothing, defaultClothing) {
      var worn = piecesOf(stateClothing);
      var base = piecesOf(defaultClothing);
      if (!worn.length) return base.join(", ");
      var wornLower = worn.map(function(part) {
        return part.toLowerCase();
      });
      var baseLower = base.map(function(part) {
        return part.toLowerCase();
      });
      var subset = wornLower.every(function(part) {
        return baseLower.indexOf(part) >= 0;
      });
      if (!subset) return worn.join(", ");
      var extra = base.filter(function(part) {
        return wornLower.indexOf(part.toLowerCase()) < 0;
      });
      return worn.concat(extra).join(", ");
    }
    function faceAsked(entity, spec) {
      if (spec && spec.faceRequired === true) return true;
      return /\b(face|eyes|mouth|smile)\b/i.test(String(entity && entity.identity || ""));
    }
    function defineStoryEntity(entity, spec) {
      var given = spec || {};
      var asked = faceAsked(entity, given);
      var features = (given.distinctiveFeatures || []).slice().filter(function(item) {
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
        locations: (book.locations || []).map(function(place) {
          return {
            locationId: place.locationId,
            name: place.name,
            visualIdentity: place.visualIdentity || "",
            connectedTo: (place.connectedTo || []).slice(),
            persistentObjects: (book.entities || []).filter(function(entity) {
              return entity.locationId === place.locationId;
            }).map(function(entity) {
              return entity.entityId;
            })
          };
        }),
        entities: (book.entities || []).map(entityRow),
        bookCast: BookCast.compileBookCast(book, book.pages || []),
        journeyArc: Journey.analyse({ bible: book, pages: book.pages || [] }).visualArc,
        visualArc: beats.map(function(beat) {
          return {
            beatId: beat.beatId,
            role: beat.role,
            locationId: beat.locationId,
            emotion: beat.emotion,
            event: beat.action
          };
        }),
        compositionLanguage: {
          shots: beats.map(function(beat) {
            return beat.shotType;
          }),
          layouts: beats.map(function(beat) {
            return layoutFor(beat);
          })
        }
      };
    }
    function entitySnap(page, which) {
      var snap = page && page[which];
      return clone(snap && snap.entities || []);
    }
    var ALIAS_SKIP = {
      the: 1,
      and: 1,
      with: 1,
      whose: 1,
      when: 1,
      from: 1,
      that: 1,
      this: 1,
      into: 1,
      over: 1,
      under: 1,
      again: 1,
      their: 1,
      them: 1,
      have: 1,
      does: 1,
      they: 1,
      were: 1,
      been: 1,
      which: 1,
      while: 1,
      after: 1,
      before: 1,
      about: 1,
      there: 1
    };
    var SMALL_WORDS = { small: 1, tiny: 1, little: 1, miniature: 1, speck: 1 };
    function unique(list) {
      return list.filter(function(item, index) {
        return list.indexOf(item) === index;
      });
    }
    function aliasesFor(entity) {
      var parts = String(entity && entity.entityId || "").split(/[-_]/);
      return unique(parts.concat(tokens(entity && entity.name), tokens(entity && entity.identity)).map(function(word) {
        return word.replace(/'s$/, "");
      }).filter(function(word) {
        return word.length > 3 && !ALIAS_SKIP[word];
      }));
    }
    function scaleFor(entity, spread) {
      var blob = tokens([entity && entity.name, entity && entity.identity, entity && entity.state, spread && spread.visualFocus].join(" "));
      return bagHas(blob, SMALL_WORDS) ? "small" : "ordinary";
    }
    function bagHas(words, table) {
      return words.some(function(word) {
        return table[word];
      });
    }
    function entitySpec(entity, spread, location) {
      var aliases = aliasesFor(entity);
      var placeWords = tokens(location && location.visualIdentity);
      return {
        entityId: entity.entityId,
        aliases,
        scale: scaleFor(entity, spread),
        landmark: aliases.some(function(alias) {
          return placeWords.indexOf(alias) >= 0;
        })
      };
    }
    function judgeSightings(specs, report) {
      var evidence = [report && report.observations, report && report.notes].concat((report && report.entities || []).map(function(row) {
        return row.seen || "";
      })).join(" ").toLowerCase();
      return (specs || []).map(function(spec) {
        var stated = (report && report.entities || []).filter(function(row) {
          return row.entityId === spec.entityId;
        })[0] || {};
        var saidMissing = stated.status === "missing" || (report && report.missingEntities || []).indexOf(spec.entityId) >= 0;
        var aliasHit = spec.aliases.some(function(alias) {
          return evidence.indexOf(alias) >= 0;
        });
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
      return String(text || "").split(/(?<=[.!?])\s+|,\s+(?:and\s+)?|\s+\bthen\b\s+/i).map(function(part) {
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
      (spread && spread.charactersPresent || []).forEach(function(id) {
        instances[id] = montage ? "sequence" : 1;
      });
      if (montage || steps.length < 2) {
        return {
          fullEvent: event,
          steps,
          instant: event,
          montage,
          characterInstances: instances
        };
      }
      var consequence = steps[steps.length - 1];
      var later = /\b(then|later|afterwards|after that)\b/i.test(consequence);
      var pose = later ? consequence : steps[steps.length - 2];
      var response = later ? "" : consequence;
      if (subjectOf(pose).toLowerCase() === subjectOf(steps[0]).toLowerCase() && pose !== steps[0]) {
      } else if (pose !== steps[0] && subjectOf(pose) && steps[0].toLowerCase().indexOf(subjectOf(pose).toLowerCase()) !== 0) {
        pose = subjectOf(steps[0]) + " " + pose.charAt(0).toLowerCase() + pose.slice(1);
      }
      var instant = response ? pose + " while " + response.charAt(0).toLowerCase() + response.slice(1) : pose;
      return {
        fullEvent: event,
        steps,
        instant,
        montage: false,
        characterInstances: instances
      };
    }
    function momentProblems(spread) {
      var problems = [];
      var event = String(spread.storyEvent || spread.fullEvent || "");
      var instant = String(spread.illustrationMoment || spread.instant || "");
      if (!instant) problems.push("moment-missing");
      var afterText = (spread.stateAfter && spread.stateAfter.entities || []).map(function(entity) {
        return entity.state || "";
      }).join(" ");
      var beforeText = (spread.openingState && spread.openingState.entities || spread.stateBefore && spread.stateBefore.entities || []).map(function(entity) {
        return entity.state || "";
      }).join(" ");
      var eventWords = tokens(event);
      var beforeWords = tokens(beforeText);
      tokens(instant).forEach(function(word) {
        if (word.length <= 3 || word === "while") return;
        if (eventWords.indexOf(word) >= 0 || beforeWords.indexOf(word) >= 0) return;
        if (tokens(afterText).indexOf(word) >= 0) problems.push("moment-after-only");
      });
      if (!spread.montage) {
        Object.keys(spread.characterInstances || {}).forEach(function(id) {
          if (spread.characterInstances[id] !== 1) problems.push("moment-instances:" + id);
        });
      }
      return unique(problems);
    }
    function pageVisualContract(bible, pages, index) {
      var page = pages[index];
      var beat = (bible.beats || []).filter(function(item) {
        return item.beatId === page.beatId;
      })[0] || {};
      var previous = index > 0 ? pages[index - 1] : null;
      var next = pages[index + 1] || null;
      var compiledCast = BookCast.compileBookCast(bible, pages);
      var lockedIdentities = {};
      (page.charactersPresent || []).forEach(function(id) {
        var member = compiledCast.byId[id];
        if (member && member.identity) lockedIdentities[id] = member.identity;
      });
      var moment = illustrationMoment({
        storyEvent: page.action || beat.action || "",
        charactersPresent: page.charactersPresent || [],
        montage: page.montage === true || beat.montage === true,
        compositionMode: page.compositionMode || beat.compositionMode || ""
      });
      var journeySpread = Journey.analyse({ bible, pages }).spreads[index] || {};
      var pageRole = page.pageRole || journeySpread.pageRole || "";
      var plannedTextRegion = page.plannedTextRegion || journeySpread.plannedTextRegion || page.textSafeRegion || "";
      var contract = {
        spreadId: page.pageId,
        beatId: page.beatId,
        role: beat.role || "",
        locationId: page.locationId,
        charactersPresent: (page.charactersPresent || []).slice(),
        characterStateBefore: clone(page.stateBefore && page.stateBefore.characters || []),
        entityStateBefore: entitySnap(page, "stateBefore"),
        storyEvent: page.action || beat.action || "",
        sequentialActions: moment.steps,
        illustrationMoment: moment.instant,
        montage: moment.montage,
        characterInstances: moment.characterInstances,
        lockedIdentities,
        stateAfter: clone(page.stateAfter || null),
        entitiesRequired: (page.entitiesRequired || []).slice(),
        visualFocus: page.visualFocus || "",
        shotType: page.shotType,
        cameraAngle: page.shotType,
        compositionIntent: page.compositionIntent || "",
        emotion: page.emotion || "",
        lighting: styleFor(bible.tone).mood,
        style: spreadStyle(bible, page, (bible.locations || []).filter(function(item) {
          return item.locationId === page.locationId;
        })[0]),
        textSafeRegion: page.textSafeRegion || "",
        pageRole,
        visualImportance: page.visualImportance || journeySpread.visualImportance || "",
        plannedTextRegion,
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
      var pages = bible.pages || bible._pages || null;
      return {
        visualBible: visualBookBible(bible, proposals),
        spreads: (pages || []).map(function(page, index) {
          return pageVisualContract(bible, pages, index);
        })
      };
    }
    function contractsFor(bible, pages, proposals) {
      var book = Object.assign({}, bible, { pages });
      return {
        visualBible: visualBookBible(book, proposals),
        spreads: pages.map(function(page, index) {
          return pageVisualContract(book, pages, index);
        })
      };
    }
    function proofSpreads(pages, beats) {
      var roleOf = {};
      (beats || []).forEach(function(beat) {
        roleOf[beat.beatId] = beat.role;
      });
      function withRole(page) {
        return Object.assign({}, page, { role: roleOf[page.beatId] || page.role || "" });
      }
      var list = (pages || []).map(withRole);
      var early = list.filter(function(page) {
        return page.role === "discovery";
      })[0] || list[1] || list[0];
      var late = list.filter(function(page) {
        return page.role === "climax";
      })[0] || list[list.length - 2] || list[list.length - 1];
      var mid = list.filter(function(page) {
        return page.role === "exploration";
      })[0] || list[Math.floor(list.length / 2)] || early;
      return [early, mid, late].filter(Boolean).filter(function(page, index, all) {
        return all.findIndex(function(item) {
          return item.pageId === page.pageId;
        }) === index;
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
      var sentence = sentences.filter(function(line) {
        return /\b(dark|unlit|dim|moonlit|rain|snow|sunset|sunrise)\b/i.test(line);
      })[0] || "";
      if (!sentence) return "";
      var word = (sentence.match(/\b(dark|unlit|dim|moonlit|rain|snow|sunset|sunrise)\b/i) || [])[0];
      if (word && String(action || "").toLowerCase().indexOf(word.toLowerCase()) >= 0) return "";
      return sentence.replace(/\s+/g, " ").trim();
    }
    function headNoun(name) {
      var words = tokens(name).filter(function(word) {
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
      var nameWords = tokens(entity && (entity.name || entity.entityId)).filter(function(word) {
        return word.length > 4 && !ALIAS_SKIP[word];
      });
      var blob = tokens(text);
      return nameWords.some(function(word) {
        return blob.indexOf(word) >= 0;
      });
    }
    function placeName(bible, locationId) {
      var place = (bible && bible.locations || []).filter(function(item) {
        return item.locationId === locationId;
      })[0];
      return place && place.name || locationId || "another place";
    }
    function sceneInventory(bible, spread) {
      var here = spread.locationId || "";
      var place = (bible && bible.locations || []).filter(function(item) {
        return item.locationId === here;
      })[0];
      var momentText = [
        spread.storyEvent,
        spread.illustrationMoment,
        spread.visualFocus,
        spread.compositionIntent,
        spread.placeCue,
        place && place.visualIdentity
      ].filter(Boolean).join(" ");
      var rows = (spread.entityStateBefore || []).slice();
      var seen = {};
      rows.forEach(function(row) {
        if (row && row.entityId) seen[row.entityId] = true;
      });
      (spread.stateAfter && spread.stateAfter.entities || []).forEach(function(row) {
        if (!row || !row.entityId || seen[row.entityId]) return;
        var known = (bible && bible.entities || []).filter(function(item) {
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
      rows.forEach(function(row) {
        var known = (bible && bible.entities || []).filter(function(item) {
          return item.entityId === row.entityId;
        })[0] || {};
        var name = known.name || row.entityId;
        var stated = row.locationId || "";
        var carried = /\b(pocket|carrying|carried|wearing|tucked)\b/i.test(row.state || "");
        var inMoment = mentionsHead(known.entityId ? known : { name, entityId: row.entityId }, momentText);
        var elsewhere = !!(stated && stated !== here && !inMoment && !carried);
        if (elsewhere && sharesContentWord(known.entityId ? known : { name }, momentText)) {
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
      return { show, leave, span, showIds };
    }
    function spreadPrompt(bible, spread, cast) {
      var place = (bible.locations || []).filter(function(item) {
        return item.locationId === spread.locationId;
      })[0];
      var people = (spread.charactersPresent || []).map(function(id) {
        var row = (cast || []).filter(function(item) {
          return item.characterId === id;
        })[0];
        var state = (spread.characterStateBefore || []).filter(function(item) {
          return item.characterId === id;
        })[0] || {};
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
      var persistent = (spread.storyEntities || []).filter(function(row) {
        return row.shape || row.distinctiveFeatures && row.distinctiveFeatures.length || row.referenceAssetIds && row.referenceAssetIds.length;
      }).map(function(row) {
        return row.entityId + " keeps this look: " + row.visualIdentity + " Shape: " + (row.shape || "as described") + ". Scale: " + (row.relativeScale || "as described") + ". Material: " + (row.materials || "as described") + ". Light: " + (row.colourLight || "as described") + ". Features: " + ((row.distinctiveFeatures || []).join(", ") || "none") + "." + (row.face === "none" ? " It stays a simple object, not a living character." : " Expression follows the book.") + " What may change is only: " + (row.mutableState || "position and pose") + ".";
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
        "Camera: " + (spread.cameraBrief || "Shot: " + spread.shotType + ".") + (composition ? " " + composition : "") + " The character references are not the camera.",
        scene.show.length ? "In this picture: " + scene.show.join("; ") + "." : "",
        scene.span.length ? scene.span.join(" ") : "",
        scene.leave.length ? "Do not draw these. They stay where they already are: " + scene.leave.join("; ") + "." : "",
        "Who: " + people + ".",
        persistent ? "Persistent story entities, the same look at any size or place: " + persistent : "",
        persistent ? "Keep each persistent object the same simple shape in this picture." : "",
        spread.montage ? "This spread is an explicit montage." : "Show each character in one pose only.",
        "Emotion to show, not a caption: " + (spread.emotion || "quiet") + ".",
        "Focus: " + focus,
        "Light: " + (spread.placeCue && /\bdark|unlit|dim\b/i.test(spread.placeCue) ? "The route in this picture stays dark. Do not light it from another room." : spread.lighting) + ".",
        "Do not show a later result that has not happened yet.",
        "Draw each object listed for this picture once. Do not add an object that was left in another place.",
        pageRoleLine(spread),
        spread.compositionNote ? "Layout for this picture: " + spread.compositionNote : ""
      ].filter(Boolean).join(" ");
    }
    function pageRoleLine(spread) {
      var role = spread && spread.pageRole;
      var region = spread && (spread.plannedTextRegion || spread.textSafeRegion) || "outer";
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
      (bible.entities || []).forEach(function(entity) {
        var words = tokens(entity.name).filter(function(word) {
          return word.length > 3;
        });
        var blob = tokens(spread.storyEvent + " " + (spread.visualFocus || "")).join(" ");
        var named = words.some(function(word) {
          return blob.indexOf(word) >= 0;
        });
        var atPlace = entity.locationId === spread.locationId && (spread.entitiesRequired || []).indexOf(entity.entityId) >= 0;
        if (named || (spread.role === "discovery" || spread.shotType === "establishing") && atPlace) ids.push(entity.entityId);
      });
      return ids.filter(function(id, index) {
        return ids.indexOf(id) === index;
      });
    }
    function countPages(pages, id, key) {
      return (pages || []).filter(function(page) {
        return page && page[key] === id;
      }).length;
    }
    function isSettingLandmark(entity, locations) {
      var names = tokens(entity && entity.name).filter(function(word) {
        return word.length > 3;
      });
      var blob = (locations || []).map(function(place) {
        return (place.name || "") + " " + (place.visualIdentity || "");
      }).join(" ").toLowerCase();
      return names.some(function(word) {
        return blob.indexOf(word) >= 0;
      });
    }
    function locationById(book, id) {
      return (book && book.locations || []).filter(function(place) {
        return place.locationId === id;
      })[0] || null;
    }
    function pickCoverHeroes(book, cast) {
      var members = cast && cast.members || [];
      var byId = {};
      members.forEach(function(member) {
        byId[member.characterId] = member;
      });
      var selected = (book.castIds || []).filter(function(id) {
        return byId[id] || !members.length;
      });
      if (!selected.length) selected = members.map(function(member) {
        return member.characterId;
      });
      var heroes = selected.slice();
      if (heroes.length > 3) {
        heroes = heroes.slice().sort(function(a, b) {
          var left = byId[a] && byId[a].spreadsPresent ? byId[a].spreadsPresent.length : 0;
          var right = byId[b] && byId[b].spreadsPresent ? byId[b].spreadsPresent.length : 0;
          return right - left;
        }).slice(0, 2);
      }
      var story = members.filter(function(member) {
        return member.origin === "story" && heroes.indexOf(member.characterId) < 0 && member.recurring;
      }).sort(function(a, b) {
        return (b.spreadsPresent || []).length - (a.spreadsPresent || []).length;
      });
      if (story[0] && heroes.length < 3 && ((story[0].spreadsPresent || []).length >= 2 || story[0].visualImportance === "important")) {
        heroes.push(story[0].characterId);
      }
      return heroes;
    }
    function pickFeaturedEntities(book) {
      var text = [book && book.hook, book && book.premise, book && book.motif, book && book.centralProblem].join(". ");
      var named = (book && book.entities || []).filter(function(entity) {
        return !isSettingLandmark(entity, book.locations) && mentions(entity, text);
      });
      named.sort(function(a, b) {
        var pages = book.pages || [];
        return countPages(pages, b.entityId, "entitiesRequired") - countPages(pages, a.entityId, "entitiesRequired");
      });
      return named.slice(0, 2).map(function(entity) {
        return entity.entityId;
      });
    }
    function pickCoverLocation(book, pages) {
      var locations = book && book.locations || [];
      if (!locations.length) return null;
      var counts = {};
      (pages || []).forEach(function(page) {
        if (!page || !page.locationId || page.beatId === book.resolutionBeatId) return;
        var weight = page.beatId === book.climaxBeatId ? 0.25 : 1;
        counts[page.locationId] = (counts[page.locationId] || 0) + weight;
      });
      return locations.slice().sort(function(a, b) {
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
      var heroMembers = heroes.map(function(id) {
        return cast.byId && cast.byId[id] || { characterId: id, name: id, referenceAssetIds: [] };
      });
      var entityNames = featured.map(function(id) {
        var entity = (book.entities || []).filter(function(item) {
          return item.entityId === id;
        })[0];
        return entity ? entity.name : id;
      });
      var references = [];
      var referenceAssets = [];
      heroMembers.forEach(function(member) {
        var version = Cast.resolveReference(member.characterId);
        var assetIds = (member.referenceAssetIds || []).slice();
        if (version && version.assetId && assetIds.indexOf(version.assetId) < 0) assetIds.unshift(version.assetId);
        assetIds.forEach(function(assetId) {
          if (references.indexOf(assetId) < 0) references.push(assetId);
          referenceAssets.push({
            characterId: member.characterId,
            assetId,
            file: version && version.assetId === assetId ? version.file : ""
          });
        });
      });
      var storyEntities = featured.map(function(id) {
        var entity = (book.entities || []).filter(function(item) {
          return item.entityId === id;
        })[0];
        var spec = (opts.storyEntities || []).filter(function(item) {
          return item.entityId === id;
        })[0] || {};
        return entity ? defineStoryEntity(entity, spec) : null;
      }).filter(Boolean);
      var beyond = null;
      featured.forEach(function(id) {
        var entity = (book.entities || []).filter(function(item) {
          return item.entityId === id;
        })[0];
        if (entity && place && entity.locationId && entity.locationId !== place.locationId) beyond = locationById(book, entity.locationId);
      });
      if (!beyond && place && place.connectedTo && place.connectedTo[0]) beyond = locationById(book, place.connectedTo[0]);
      var environment = place ? place.name + ". " + (place.visualIdentity || "") : "";
      if (beyond) environment += " Open toward " + beyond.name + " as depth behind the figures. " + (beyond.visualIdentity || "");
      var supporting = (cast.members || []).map(function(member) {
        return member.characterId;
      }).filter(function(id) {
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
        emotionalPromise: book.emotionalArc && book.emotionalArc[0] || book.tone || "",
        coverMoment: coverMomentText(heroMembers.map(function(member) {
          return member.name;
        }), entityNames, place),
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
        style,
        referenceAssetIds: references,
        referenceAssets,
        storyEntities,
        sourceSpreadId: null,
        aliasesInterior: false
      };
    }
    function withoutOtherCharacters(text, cover) {
      var heroes = cover && (cover.heroCharacterIds || cover.protagonists) || [];
      var names = Cast.listCharacters().filter(function(character) {
        return heroes.indexOf(character.characterId) < 0 && character.name;
      }).map(function(character) {
        return character.name;
      });
      if (!names.length) return String(text || "");
      var pattern = new RegExp("\\b(" + names.join("|") + ")\\b", "i");
      return String(text || "").split(/(?<=[.!?])\s+/).filter(function(sentence) {
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
      var features = (row.distinctiveFeatures || []).filter(function(item) {
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
      var people = (plan.heroCharacterIds || plan.protagonists || []).map(function(id) {
        var member = members.filter(function(item) {
          return item.characterId === id;
        })[0];
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
        "Each planned character once. Keep the locked identity and the reference assets " + (cover && cover.referenceAssetIds || []).join(", ") + ".",
        "Keep illustrator " + STYLE_ID + ". Do not switch rendering, line, texture, proportions, or finish."
      ].join(" ");
    }
    var COVER_TITLE_FAMILIES = ["single-line", "short-stack", "phrase-stack", "wide-two-line", "tall-three-line", "long-title"];
    var COVER_CONNECTORS = { a: 1, an: 1, the: 1, for: 1, of: 1, to: 1, and: 1, in: 1, on: 1, with: 1, from: 1 };
    var COVER_TITLE_FONT = '"Fredoka", "Nunito", sans-serif';
    function titleTokens(title) {
      return String(title || "").trim().split(/\s+/).filter(Boolean).map(function(text) {
        var bare = text.toLowerCase().replace(/[^a-z']/g, "");
        return { text, connector: !!COVER_CONNECTORS[bare] };
      });
    }
    function titleUnits(tokens2) {
      var units = [];
      var pending = [];
      tokens2.forEach(function(token) {
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
    function phraseStack(tokens2) {
      var content = [];
      tokens2.forEach(function(token, index) {
        if (!token.connector) content.push(index);
      });
      if (content.length !== 2 || tokens2.length > 8) return null;
      var middle = tokens2.slice(content[0] + 1, content[1]);
      if (!middle.length || !middle.every(function(token) {
        return token.connector;
      })) return null;
      return [tokens2.slice(0, content[0] + 1), middle, tokens2.slice(content[1])];
    }
    function packUnits(units, lineCount) {
      var count = Math.max(1, Math.min(lineCount, units.length || 1));
      if (!units.length) return [];
      if (count >= units.length) return units.map(function(unit) {
        return unit.slice();
      });
      var total = 0;
      units.forEach(function(unit) {
        total += unit.length;
      });
      var lines = [];
      var current = [];
      var filled = 0;
      var placed = 0;
      units.forEach(function(unit, index) {
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
        lines.forEach(function(line, index) {
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
    function chooseTitleFamily(tokens2, units, phrase) {
      if (phrase) return "phrase-stack";
      if (units.length <= 1 && tokens2.length <= 4) return "single-line";
      if (units.length <= 2 && tokens2.length <= 5) return "short-stack";
      if (tokens2.length >= 10 || units.length >= 6) return "long-title";
      if (units.length >= 3 && tokens2.length >= 7) return "tall-three-line";
      if (units.length >= 2) return "wide-two-line";
      return "single-line";
    }
    function titleContrast(cover) {
      var blob = [cover && cover.lighting, cover && cover.atmosphere, cover && cover.environment, cover && cover.tone].join(" ").toLowerCase();
      if (/night|evening|dusk|dark/.test(blob)) return "light";
      return "dark";
    }
    function titleBounds(cover) {
      var region = String(cover && cover.titleSafeRegion || "upper");
      if (region.indexOf("lower") >= 0) return { region, top: "", bottom: "7%", maxHeight: "30%" };
      return { region: region || "upper", top: "8%", bottom: "", maxHeight: "30%" };
    }
    function coverTitleLayout(title, cover, options) {
      var tokens2 = titleTokens(title);
      var units = titleUnits(tokens2);
      var phrase = phraseStack(tokens2);
      var asked = options && COVER_TITLE_FAMILIES.indexOf(options.family) >= 0 ? options.family : "";
      var family = asked || chooseTitleFamily(tokens2, units, phrase);
      var grouped = family === "phrase-stack" && phrase ? phrase : packUnits(units, lineCountFor(family, units));
      if (!grouped.length && tokens2.length) grouped = [tokens2];
      var rows = grouped.map(function(line) {
        return line.map(function(token) {
          return { text: token.text, role: token.connector ? "connector" : "primary" };
        });
      });
      var lines = rows.map(function(row) {
        return row.map(function(word) {
          return word.text;
        }).join(" ");
      });
      var treatment = options && options.treatment === "hierarchy" ? "hierarchy" : options && options.treatment === "offset" ? "offset" : "restrained";
      return {
        title: tokens2.map(function(token) {
          return token.text;
        }).join(" "),
        family,
        treatment,
        lines,
        rows,
        region: cover && cover.titleSafeRegion || "upper",
        bounds: titleBounds(cover),
        contrast: titleContrast(cover),
        fontFamily: COVER_TITLE_FONT,
        fontScale: family === "long-title" ? 0.74 : lines.length >= 3 ? 0.84 : lines.length === 2 ? 0.92 : 1,
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
        return (layout && layout.lines || []).map(function(line) {
          return '<span class="cover-line">' + escapeHtml(line) + "</span>";
        }).join("");
      }
      return rows.map(function(row) {
        var words = row.map(function(word) {
          var role = word.role === "connector" ? "connector" : "primary";
          return '<span class="cover-word is-' + role + '">' + escapeHtml(word.text) + "</span>";
        }).join(" ");
        return '<span class="cover-line">' + words + "</span>";
      }).join("");
    }
    function coverFrameMarkup(layout, imagePath, imprintPath, thumb) {
      var box = layout && layout.bounds || { top: "8%", maxHeight: "30%" };
      var top = box.top ? "top:" + box.top + ";" : "";
      var bottom = box.bottom ? "bottom:" + box.bottom + ";" : "";
      var mark = imprintPath || layout && layout.imprint && layout.imprint.mark || "";
      var imprint = layout && layout.imprint ? layout.imprint.text : "";
      return [
        '<article class="cover' + (thumb ? " is-thumb" : "") + '" data-family="' + escapeHtml(layout && layout.family || "") + '" data-treatment="' + escapeHtml(layout && layout.treatment || "restrained") + '" data-contrast="' + escapeHtml(layout && layout.contrast || "light") + '" data-title-region="' + escapeHtml(layout && layout.region || "upper") + '" style="--title-top:' + (box.top || "auto") + ";--title-bottom:" + (box.bottom || "auto") + ";--title-max:" + (box.maxHeight || "30%") + ';">',
        '<img class="cover-art" src="' + escapeHtml(imagePath || "") + '" alt=""/>',
        '<h1 class="cover-title" style="' + top + bottom + '">' + coverTitleMarkup(layout) + "</h1>",
        imprint ? '<p class="cover-imprint">' + (mark ? '<img src="' + escapeHtml(mark) + '" alt=""/>' : "") + "<span>" + escapeHtml(imprint) + "</span></p>" : "",
        "</article>"
      ].join("");
    }
    function coverPreviewStyle() {
      return [
        "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;font-family:Nunito,system-ui,sans-serif;color:#24304a;}",
        ".cover{container-type:inline-size;position:relative;width:min(440px,92vw);aspect-ratio:1024/1536;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(20,27,77,.16);background:#1c2438;}",
        ".cover-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}",
        '.cover-title{position:absolute;left:13%;right:13%;z-index:1;max-height:var(--title-max,30%);margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:"Fredoka","Nunito",sans-serif;font-weight:600;font-size:clamp(0.78rem,8.1cqi,2.65rem);line-height:.9;letter-spacing:.01em;}',
        ".cover-line{display:block;}",
        ".cover-word{display:inline-block;}",
        ".cover-word.is-connector{font-weight:500;font-size:.78em;letter-spacing:.045em;}",
        ".cover-word.is-primary{font-weight:600;}",
        '.cover[data-treatment="hierarchy"] .cover-word.is-connector{font-size:.62em;font-weight:500;}',
        '.cover[data-treatment="hierarchy"] .cover-word.is-primary{font-size:1.16em;}',
        '.cover[data-treatment="hierarchy"] .cover-title{gap:.02em;}',
        '.cover[data-treatment="offset"] .cover-line:nth-child(odd){transform:translateX(-.22em);}',
        '.cover[data-treatment="offset"] .cover-line:nth-child(even){transform:translateX(.38em);}',
        '.cover[data-contrast="light"] .cover-title{color:#fff8ee;text-shadow:0 1px 0 rgba(20,18,40,.16),0 8px 16px rgba(16,18,40,.28);}',
        '.cover[data-contrast="dark"] .cover-title{color:#24304a;text-shadow:0 1px 0 rgba(255,252,246,.55);}',
        '.cover[data-family="phrase-stack"] .cover-line:nth-child(2){margin:.02em 0 .06em;}',
        ".cover-imprint{position:absolute;left:0;right:0;bottom:3.2%;z-index:1;margin:0;display:flex;align-items:center;justify-content:center;gap:.4rem;pointer-events:none;}",
        ".cover-imprint img{height:clamp(10px,2.6cqi,16px);width:auto;}",
        '.cover-imprint span{font-family:"Fredoka","Nunito",sans-serif;font-size:clamp(.48rem,2.15cqi,.68rem);font-weight:600;letter-spacing:.16em;text-transform:uppercase;}',
        '.cover[data-contrast="light"] .cover-imprint span{color:#fff6ea;text-shadow:0 1px 2px rgba(20,18,40,.4);}',
        '.cover[data-contrast="dark"] .cover-imprint span{color:#24304a;}',
        ".cover.is-thumb{width:132px;border-radius:8px;box-shadow:0 8px 16px rgba(20,27,77,.12);}",
        "@media (max-width:640px){.cover{width:min(340px,88vw);}}"
      ].join("");
    }
    function coverPreviewDocument(cover, layout, imagePath, imprintPath) {
      return [
        "<!DOCTYPE html>",
        '<html lang="en-GB"><head><meta charset="utf-8"/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
        '<link rel="preconnect" href="https://fonts.googleapis.com"/>',
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@600&display=swap" rel="stylesheet"/>',
        "<title>Cover preview</title>",
        "<style>",
        coverPreviewStyle(),
        "</style></head><body>",
        coverFrameMarkup(layout, imagePath, imprintPath, false),
        "</body></html>"
      ].join("");
    }
    function coverReviewDocument(entries) {
      var frames = (entries || []).map(function(entry) {
        var full = coverFrameMarkup(entry.layout, entry.imagePath, entry.imprintPath, false);
        var thumb = coverFrameMarkup(entry.layout, entry.imagePath, entry.imprintPath, true);
        return '<section class="review-card"><h2>' + escapeHtml(entry.label) + "</h2><p>" + escapeHtml(entry.note || "") + "</p>" + full + '<div class="review-thumb"><p>Thumbnail</p>' + thumb + "</div></section>";
      }).join("");
      return [
        "<!DOCTYPE html>",
        '<html lang="en-GB"><head><meta charset="utf-8"/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
        '<link rel="preconnect" href="https://fonts.googleapis.com"/>',
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@600&display=swap" rel="stylesheet"/>',
        "<title>Cover title review</title>",
        "<style>",
        coverPreviewStyle(),
        "body{display:block;padding:28px 20px 48px;}",
        'h1{font-family:"Fredoka","Nunito",sans-serif;font-weight:600;font-size:1.6rem;margin:0 0 .3rem;}',
        ".review-lead{margin:0 0 1.4rem;max-width:40rem;}",
        ".review-row{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start;}",
        ".review-card{display:flex;flex-direction:column;gap:.4rem;width:min(440px,100%);}",
        '.review-card h2{font-family:"Fredoka","Nunito",sans-serif;font-size:1.3rem;margin:0;}',
        ".review-card p{margin:0 0 .4rem;}",
        ".review-thumb{margin-top:.8rem;}",
        ".review-thumb p{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;}",
        "</style></head><body>",
        "<h1>Cover title direction</h1>",
        '<p class="review-lead">The same approved painting. Three title layouts. Nothing here is chosen yet.</p>',
        '<div class="review-row">' + frames + "</div>",
        "</body></html>"
      ].join("");
    }
    function acceptCover(vision, cover) {
      var plan = cover || {};
      var instances = {};
      (plan.heroCharacterIds || plan.protagonists || []).forEach(function(id) {
        instances[id] = 1;
      });
      var spread = {
        charactersPresent: plan.heroCharacterIds || plan.protagonists || [],
        characterInstances: instances,
        montage: false,
        entitySpecs: (plan.storyEntities || plan.featuredEntityIds || []).map(function(row) {
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
      return { ok: problems.length === 0, problems };
    }
    function coverQualityNotes(report) {
      var notes = [];
      if (report && report.qualityNotes) notes = notes.concat(report.qualityNotes);
      if (report && report.readsAsInteriorSpread === true) notes.push("Looks close to an interior spread.");
      return { notes, regenerate: false };
    }
    function acceptIllustration(vision, spread) {
      var report = vision || {};
      var problems = [];
      if (spread.bookCast) {
        problems = problems.concat(BookCast.reviewSpread(spread.bookCast, spread, report).problems);
      } else {
        (spread.charactersPresent || []).forEach(function(id) {
          var row = (report.characters || []).filter(function(item) {
            return item.characterId === id;
          })[0];
          if (!row || row.identityMatch !== true) problems.push("identity:" + id);
          if (row && row.outfitMatch === false) problems.push("outfit:" + id);
          var expected = spread.characterInstances && spread.characterInstances[id];
          if (row && typeof row.count === "number" && expected === 1 && row.count !== 1) problems.push("count:" + id);
        });
      }
      if (report.style) readingDrift(report.style).forEach(function(problem) {
        problems.push(problem);
      });
      if (report.momentMatch === false) problems.push("moment");
      if (report.montageShown === true && !spread.montage) problems.push("montage");
      var requiredIds = spread.mustShow && spread.mustShow.length ? spread.mustShow : spread.entitiesRequired || [];
      var specs = spread.entitySpecs || requiredIds.map(function(id) {
        return { entityId: id, aliases: aliasesFor({ entityId: id, name: id, identity: "" }), scale: "ordinary", landmark: false };
      });
      judgeSightings(specs, report).forEach(function(row) {
        if (row.redraw) problems.push("entity:" + row.entityId);
      });
      if (report.locationMatch === false) problems.push("location");
      if (report.prematureResult === true) problems.push("premature");
      if (report.textDetected === true) problems.push("text-in-image");
      if (report.anatomyOk === false) problems.push("anatomy");
      if (report.textSafeUsable === false) problems.push("text-safe");
      if (report.duplicateCharacter === true && !spread.montage && !spread.bookCast) problems.push("duplicate");
      return { ok: problems.length === 0, problems };
    }
    function characterConsistencyCheckpoint(pages, options) {
      var settings = options || {};
      var problems = [];
      (pages || []).forEach(function(page, index) {
        var number = page && page.page ? page.page : index + 1;
        if (!page || !page.characters) {
          problems.push("unchecked:p" + number);
          return;
        }
        page.characters.forEach(function(character) {
          var id = character && character.characterId || "unknown";
          if (!character || character.identityMatch !== true) problems.push("identity:" + id + ":p" + number);
          if (character && character.outfitMatch === false) problems.push("outfit:" + id + ":p" + number);
        });
      });
      var human = settings.humanApproved === true && problems.length === 0;
      return {
        approved: human,
        needsHumanReview: !human,
        problems,
        referenceIsNotProof: true,
        note: "Supplying a character reference, or matching it on one page, does not prove that character stays the same across the book."
      };
    }
    module.exports = {
      STYLE_ID,
      LAYOUTS,
      MAX_VISUAL_REPAIRS,
      styleFor,
      styleContract,
      spreadStyle,
      styleClause,
      styleOverrides,
      styleCoherence,
      sameIllustrator,
      atmosphereDelta,
      repairPrompt,
      layoutFor,
      unplannedVisualProblems,
      visualBookBible,
      pageVisualContract,
      contractsFor,
      planVisuals,
      proofSpreads,
      regenContract,
      mustShow,
      aliasesFor,
      entitySpec,
      judgeSightings,
      illustrationMoment,
      momentProblems,
      wornOutfit,
      defineStoryEntity,
      bookCast: BookCast,
      sheetPrompt,
      spreadPrompt,
      acceptIllustration,
      characterConsistencyCheckpoint,
      planCover,
      coverPrompt,
      coverRepairPrompt,
      COVER_TITLE_FAMILIES,
      coverTitleLayout,
      coverPreviewStyle,
      coverFrameMarkup,
      coverPreviewDocument,
      coverReviewDocument,
      acceptCover,
      coverQualityNotes
    };
  }
});

// js/book-adventure.js
var require_book_adventure = __commonJS({
  "js/book-adventure.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookAdventure = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
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
        return (list || []).filter(function(item, index) {
          return item && list.indexOf(item) === index;
        });
      }
      function storyKind(ask) {
        var tone = String(ask && ask.tone || "");
        var idea = String(ask && ask.idea || "").toLowerCase();
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
        (locations || []).forEach(function(place) {
          if (place && place.locationId) known[place.locationId] = true;
        });
        return (raw || []).map(function(section, index) {
          var locationId = slug(section && section.locationId);
          var leads = norm(section && section.leadsTo);
          var leadsTo = leads === "same" ? "same" : slug(section && section.leadsTo);
          return {
            section: text(section && section.section) || "part-" + (index + 1),
            locationId,
            purpose: text(section && section.purpose),
            objective: text(section && section.objective),
            discoveryOrObstacle: text(section && section.discoveryOrObstacle),
            change: text(section && section.change),
            leadsTo,
            knownPlace: !locationId || !!known[locationId]
          };
        }).filter(function(section) {
          return section.locationId || section.purpose || section.objective;
        });
      }
      function placeById(bible, locationId) {
        return (bible && bible.locations || []).filter(function(place) {
          return place.locationId === locationId;
        })[0] || null;
      }
      function settingOf(place) {
        if (!place) return "";
        return norm(place.setting || place.visualIdentity || place.locationId);
      }
      var HANDLING = /\b(lift|lifts|lifted|place|places|placed|fit|fits|fitted|scoop|scoops|scooped|press|presses|pressed|socket|mend|mends|mended|repair|repairs|repaired|crack|cracks|cracked|float|floats|floated|lower|lowers|lowered|wobble|wobbles|wobbled|silt)\b/i;
      var GLUE = {
        about: 1,
        after: 1,
        again: 1,
        along: 1,
        around: 1,
        before: 1,
        being: 1,
        could: 1,
        first: 1,
        from: 1,
        have: 1,
        into: 1,
        just: 1,
        leo: 1,
        maya: 1,
        over: 1,
        place: 1,
        said: 1,
        still: 1,
        that: 1,
        their: 1,
        there: 1,
        they: 1,
        this: 1,
        through: 1,
        under: 1,
        water: 1,
        were: 1,
        when: 1,
        where: 1,
        which: 1,
        while: 1,
        with: 1,
        would: 1,
        steps: 1
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
        (beats || []).forEach(function(beat) {
          if (!beat || !beat.locationId) return;
          seen += 1;
          counts[beat.locationId] = (counts[beat.locationId] || 0) + 1;
        });
        var top = 0;
        Object.keys(counts).forEach(function(id) {
          if (counts[id] > top) top = counts[id];
        });
        return seen ? top / seen : 0;
      }
      function contentNouns(action) {
        return unique(norm(action).split(/[^a-z]+/).filter(function(word) {
          return word.length > 4 && !GLUE[word] && !HANDLING.test(word);
        }));
      }
      function taskFocus(beats) {
        var list = beats || [];
        var handling = list.filter(function(beat) {
          return HANDLING.test(String(beat && beat.action || ""));
        });
        var nouns = {};
        handling.forEach(function(beat) {
          contentNouns(beat.action).forEach(function(word) {
            nouns[word] = (nouns[word] || 0) + 1;
          });
        });
        var top = 0;
        Object.keys(nouns).forEach(function(word) {
          if (nouns[word] > top) top = nouns[word];
        });
        return {
          handlingShare: list.length ? handling.length / list.length : 0,
          nounShare: list.length ? top / list.length : 0
        };
      }
      function dominantEntity(bible) {
        var beats = bible && bible.beats || [];
        var counts = {};
        beats.forEach(function(beat) {
          var ids = beat.entitiesRequired || [];
          if (!ids.length && beat.stateAfter && beat.stateAfter.entities) {
            ids = beat.stateAfter.entities.map(function(entity) {
              return entity.entityId;
            });
          }
          unique(ids).forEach(function(id) {
            counts[id] = (counts[id] || 0) + 1;
          });
        });
        var top = "";
        var count = 0;
        Object.keys(counts).forEach(function(id) {
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
        sections.forEach(function(section, index) {
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
        (source.beats || []).forEach(function(beat) {
          if (beat && beat.locationId) beatPlaces[beat.locationId] = true;
        });
        if (sections.length) {
          var named = {};
          sections.forEach(function(section) {
            if (section.locationId) named[section.locationId] = true;
          });
          Object.keys(named).forEach(function(id) {
            if (!beatPlaces[id]) block.push("journey-unused-place:" + id);
          });
          Object.keys(beatPlaces).forEach(function(id) {
            if (!named[id]) block.push("journey-unknown-place:" + id);
          });
        }
        var settings = unique(sections.map(function(section) {
          return settingOf(placeById(source, section.locationId));
        }));
        if (needsJourney(request)) {
          (source.locations || []).forEach(function(place) {
            if (place && place.locationId && beatPlaces[place.locationId] && !text(place.setting)) {
              block.push("setting-missing:" + place.locationId);
            }
          });
        }
        if (kind === "bedtime") {
          var blob = sections.map(function(section) {
            return [section.purpose, section.discoveryOrObstacle, section.change].join(" ");
          }).join(" ");
          if (/\b(chase|battle|danger|monster)\b/i.test(blob)) review.push("bedtime-spectacle");
        }
        if (kind === "mystery" && sections.length >= 2) {
          var clues = unique(sections.map(function(section) {
            return norm(section.discoveryOrObstacle);
          }));
          if (clues.length < 2) block.push("clue-stuck");
        }
        var focus = taskFocus(source.beats);
        var stay = placeShare(source.beats);
        if (kind === "adventure" && sections.length >= 2) {
          var objectives = unique(sections.map(function(section) {
            return norm(section.objective);
          }));
          var changes = unique(sections.map(function(section) {
            return norm(section.change);
          }));
          var dominant = dominantEntity(source);
          if (settings.length <= 1 && objectives.length <= 1 && changes.length <= 1 && dominant.share >= 0.6) {
            block.push("narrow-world");
          }
          var sameTask = focus.handlingShare >= 0.6 && focus.nounShare >= 0.45;
          var promisedStay = promisesWiderWorld(request.idea) && stay >= 0.6 && focus.handlingShare >= 0.5;
          if (!ideaAsksForRepair(request.idea) && (sameTask || promisedStay)) block.push("narrow-adventure");
        }
        return {
          kind,
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
        storyKind,
        needsJourney,
        writerGuide,
        normalise,
        assess
      };
    });
  }
});

// js/book-brain.js
var require_book_brain = __commonJS({
  "js/book-brain.js"(exports, module) {
    (function(root, factory) {
      var api = factory(root);
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookBrain = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function(root) {
      "use strict";
      function characterApi() {
        if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
        return require_character_bible();
      }
      function crewApi() {
        if (root && root.WondiiCrew) return root.WondiiCrew;
        return require_wondii_crew();
      }
      function castApi() {
        return require_book_cast();
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
          scope: "About 6\u20138 spreads",
          minSpreads: 6,
          maxSpreads: 8,
          minPlotMoves: 4,
          roles: ["hook", "discovery", "attempt", "turn", "climax", "resolution"]
        },
        storybook: {
          id: "storybook",
          title: "Storybook",
          line: "A full illustrated story",
          scope: "About 10\u201312 spreads",
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
          scope: "About 14\u201318 spreads",
          minSpreads: 14,
          maxSpreads: 18,
          minPlotMoves: 9,
          roles: ["hook", "discovery", "exploration", "attempt", "complication", "setback", "reveal", "approach", "climax", "resolution"]
        }
      };
      var AGE_BANDS = {
        "3-4": { stage: "reception", constraintYear: "Reception", ageRange: "3\u20134", narrativeComplexity: "a few concrete moments a child can see" },
        "5-6": { stage: "year1", constraintYear: "Year 1", ageRange: "5\u20136", narrativeComplexity: "a simple cause the reader can follow" },
        "7-8": { stage: "year3", constraintYear: "Year 3", ageRange: "7\u20138", narrativeComplexity: "a problem with a consequence the reader can connect" },
        "9-10": { stage: "year5", constraintYear: "Year 5", ageRange: "9\u201310", narrativeComplexity: "a question that can last across the book" },
        "11-12": { stage: "year6", constraintYear: "Year 6", ageRange: "11\u201312", narrativeComplexity: "mixed feelings and a little inference" },
        /* Family bands keep the older child's level. 7–9 is not written as 7–8, and 10–12 is not written as 9–10. */
        "4-6": { stage: "year1", constraintYear: "Year 1", ageRange: "4\u20136", narrativeComplexity: "a simple cause the reader can follow" },
        "7-9": {
          stage: "ages-7-9",
          constraintYear: "Ages 7\u20139",
          ageRange: "7\u20139",
          narrativeComplexity: "a problem with a consequence the reader can connect, with a feeling allowed under the action",
          limits: { maxSentenceWords: 18, maxSentences: 4, maxDialogueTurns: 2, maxPageWords: 64 },
          writing: "Clear sentences a seven-year-old can follow. Dialogue can carry a decision. A feeling can sit under the action. The page stays a picture book."
        },
        "10-12": { stage: "year6", constraintYear: "Year 6", ageRange: "10\u201312", narrativeComplexity: "mixed feelings and a little inference" }
      };
      var YEAR_STAGE = {
        Reception: { stage: "reception", constraintYear: "Reception", ageRange: "4\u20135", narrativeComplexity: "a few concrete moments a child can see" },
        "Year 1": { stage: "year1", constraintYear: "Year 1", ageRange: "5\u20136", narrativeComplexity: "a simple cause the reader can follow" },
        "Year 2": { stage: "year2", constraintYear: "Year 2", ageRange: "6\u20137", narrativeComplexity: "a simple cause, with one feeling shown in what someone does" },
        "Year 3": { stage: "year3", constraintYear: "Year 3", ageRange: "7\u20138", narrativeComplexity: "a problem with a consequence the reader can connect" },
        "Year 4": { stage: "year4", constraintYear: "Year 4", ageRange: "8\u20139", narrativeComplexity: "a worry or a joke can sit under the action" },
        "Year 5": { stage: "year5", constraintYear: "Year 5", ageRange: "9\u201310", narrativeComplexity: "a question that can last across the book" },
        "Year 6": { stage: "year6", constraintYear: "Year 6", ageRange: "10\u201311", narrativeComplexity: "mixed feelings and a little inference" }
      };
      var ALLOWED_ROLES = {
        hook: 1,
        world: 1,
        discovery: 1,
        reaction: 1,
        goal: 1,
        exploration: 1,
        attempt: 1,
        consequence: 1,
        complication: 1,
        relationship: 1,
        setback: 1,
        reveal: 1,
        setup: 1,
        payoff: 1,
        approach: 1,
        climax: 1,
        resolution: 1,
        breath: 1,
        turn: 1,
        wonder: 1,
        humour: 1,
        anticipation: 1
      };
      var QUIET_ROLES = { reaction: 1, breath: 1, wonder: 1, humour: 1, anticipation: 1 };
      var STAGE_LABELS = {
        dreaming: "Dreaming up your adventure\u2026",
        planning: "Planning the journey\u2026",
        writing: "Writing your story\u2026",
        visualPlanning: "Bringing the world to life\u2026",
        illustrating: "Illustrating your book\u2026",
        assembling: "Putting the pages together\u2026",
        ready: "Your book is ready."
      };
      var STOP = {
        a: 1,
        an: 1,
        the: 1,
        and: 1,
        or: 1,
        but: 1,
        they: 1,
        them: 1,
        their: 1,
        she: 1,
        he: 1,
        it: 1,
        to: 1,
        of: 1,
        under: 1,
        underneath: 1,
        in: 1,
        on: 1,
        at: 1,
        with: 1,
        for: 1,
        from: 1,
        by: 1,
        as: 1,
        is: 1,
        was: 1,
        were: 1,
        be: 1,
        this: 1,
        that: 1,
        then: 1,
        when: 1,
        who: 1,
        what: 1,
        her: 1,
        his: 1
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
        adventure: "Curiosity changes what the characters do next. They may explore, meet someone, uncover a surprise, or face a cost. Do not default to repairing one magical object.",
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
        return words(String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ")).filter(function(word) {
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
      function requestedPageCount(source) {
        if (!source || source.pageCount == null || source.pageCount === "") return 0;
        var count = Number(source.pageCount);
        if (count !== Math.floor(count)) return -1;
        return count;
      }
      function publicRequest(input) {
        var source = input || {};
        var tone = source.tone ? String(source.tone) : null;
        if (tone && TONES.indexOf(tone) < 0) tone = null;
        var ageBand = source.ageBand ? String(source.ageBand) : "";
        if (ageBand && !AGE_BANDS[ageBand]) ageBand = "";
        var yearGroup = String(source.yearGroup || "");
        if (yearGroup && !YEAR_LIMITS[yearGroup]) yearGroup = "";
        var context = source.context === "school" || source.context === "family" ? source.context : yearGroup ? "school" : ageBand ? "family" : null;
        var request = {
          castIds: Array.isArray(source.castIds) ? source.castIds.map(String) : [],
          idea: String(source.idea || "").trim(),
          yearGroup,
          ageBand,
          length: String(source.length || ""),
          tone,
          context
        };
        var pageCount = requestedPageCount(source);
        if (pageCount) request.pageCount = pageCount;
        return request;
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
        var limits = chosen.limits || textLimits(chosen.constraintYear);
        return {
          source: year ? "year" : "age",
          stage: chosen.stage,
          yearGroup: ask.yearGroup || "",
          ageBand: ask.ageBand || "",
          constraintYear: chosen.constraintYear,
          approximateAgeRange: chosen.ageRange,
          narrativeComplexity: chosen.narrativeComplexity,
          writing: chosen.writing || "",
          limits
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
        var shared = a.filter(function(word) {
          return b.indexOf(word) >= 0;
        }).length;
        return shared / Math.max(a.length, b.length);
      }
      function lengthShape(beats, profile) {
        var problems = [];
        var list = beats || [];
        if (profile && profile.exactPages) {
          if (list.length !== profile.exactPages) problems.push("page-count");
        } else if (!profile || list.length < profile.minSpreads || list.length > profile.maxSpreads) problems.push("length-shape");
        if (!list.length || list[0].role !== "hook" || list[list.length - 1].role !== "resolution") problems.push("length-shape");
        if (!list.some(function(beat) {
          return beat.role === "climax";
        })) problems.push("length-shape");
        list.forEach(function(beat) {
          if (!ALLOWED_ROLES[beat.role]) problems.push("length-shape");
        });
        var plot = 0;
        list.forEach(function(beat, index) {
          var copy = index > 0 && actionOverlap(list[index - 1].action, beat.action) >= 0.72;
          if (copy) {
            problems.push("beat-split:" + (beat.beatId || index));
            return;
          }
          if (QUIET_ROLES[beat.role] || QUIET_ROLES[beat.experience]) return;
          plot += 1;
        });
        if (profile && plot < profile.minPlotMoves) problems.push("depth-thin");
        require_book_journey().depthProblems(list).forEach(function(problem) {
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
          stage,
          label: pageLabel || STAGE_LABELS[stage] || STAGE_LABELS.dreaming,
          percent: null,
          determinate: false,
          pageLabel
        };
      }
      function savedReferences(input) {
        var rows = Array.isArray(input && input.characterReferences) ? input.characterReferences : [];
        var out = {};
        rows.forEach(function(row) {
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
        request.castIds.forEach(function(id) {
          if (refs[id]) return;
          var system = systemMember(id);
          if (system) refs[id] = system;
        });
        return refs;
      }
      function acceptCreation(input) {
        var request = publicRequest(input);
        var refs = referenceMap(input);
        var locked = {};
        (input.identityRegistry || []).forEach(function(row) {
          if (row && row.locked === true && row.characterId && (row.portrait || row.approvedReference)) {
            locked[String(row.characterId)] = row;
          }
        });
        var lock = characterApi().lockCast(request.castIds);
        var problems = lock.problems.filter(function(problem) {
          var id = problem.indexOf("unknown-cast:") === 0 ? problem.slice("unknown-cast:".length) : "";
          return !(id && (refs[id] || locked[id]));
        });
        var cast = lock.cast.slice();
        request.castIds.forEach(function(id) {
          if (cast.some(function(row) {
            return row.characterId === id;
          })) return;
          if (locked[id]) cast.push(locked[id]);
          else if (refs[id]) cast.push(refs[id]);
        });
        if (request.castIds.length < 1 || request.castIds.length > 4) problems.push("cast-size");
        if (!request.idea) problems.push("idea-missing");
        if (!readerProfile(request)) problems.push("year");
        if (!lengthProfile(request.length)) problems.push("length");
        if (request.pageCount) {
          var pagesWanted = lengthProfile(request.length);
          if (request.pageCount < 0 || !pagesWanted || request.pageCount < pagesWanted.minSpreads || request.pageCount > pagesWanted.maxSpreads) {
            problems.push("page-count");
          }
        }
        request.characterReferences = request.castIds.map(function(id) {
          return refs[id];
        }).filter(Boolean);
        return {
          ok: problems.length === 0,
          request,
          cast,
          problems,
          imageCalls: 0,
          stage: problems.length ? "failed" : "planning",
          writer: "off"
        };
      }
      function entityIds(list) {
        return (list || []).map(function(entity) {
          return entity.entityId;
        });
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
        var known = knownRegistry(book.identityRegistry);
        var cast = characterApi().lockCast(book.castIds || []);
        if (!cast.ok) {
          cast.problems.forEach(function(problem) {
            var id = problem.indexOf("unknown-cast:") === 0 ? problem.slice("unknown-cast:".length) : "";
            if (!(id && known[id])) problems.push(problem);
          });
        }
        if (!book.userIdea && !ask.idea) problems.push("idea-missing");
        var idea = ask.idea || book.userIdea || "";
        var ideaWords = contentWords(idea);
        var storyText = [book.premise, book.hook].concat(beats.map(function(beat) {
          return beat.action || "";
        })).join(" ");
        var found = ideaWords.filter(function(word) {
          return ideaAppears(word, storyText);
        });
        if (ideaWords.length && found.length < Math.min(2, ideaWords.length)) problems.push("idea-not-central");
        if (!book.goal) problems.push("goal-missing");
        if (!book.centralProblem) problems.push("problem-missing");
        (book.castIds || []).forEach(function(id) {
          var seen = false;
          var missingReason = false;
          beats.forEach(function(beat) {
            var present = (beat.charactersPresent || []).indexOf(id) >= 0;
            if (present) seen = true;
            else if (!(beat.absent && beat.absent[id])) missingReason = true;
          });
          if (!seen || missingReason) problems.push("cast-missing:" + id);
          var character = catalogueCharacter(id, book.identityRegistry);
          var expressed = beats.some(function(beat) {
            return (beat.expresses || []).some(function(note) {
              return note.characterId === id && character && character.personality.indexOf(note.trait) >= 0;
            });
          });
          if (character && character.personality.length && !expressed) problems.push("personality-unused:" + id);
        });
        var exact = ask.pageCount || book.pageCount || 0;
        var shaped = profile;
        if (exact < 0 || exact > 0 && profile && (exact < profile.minSpreads || exact > profile.maxSpreads)) {
          problems.push("page-count");
        } else if (exact > 0 && profile) {
          shaped = clone(profile);
          shaped.exactPages = exact;
        }
        if (!profile) problems.push("length-shape");
        else problems = problems.concat(lengthShape(beats, shaped));
        require_book_progression().review({ bible: book }).blockProblems.forEach(function(problem) {
          if (problems.indexOf(problem) < 0) problems.push(problem);
        });
        var climax = beats.filter(function(beat) {
          return beat.beatId === book.climaxBeatId;
        })[0];
        var resolution = beats.filter(function(beat) {
          return beat.beatId === book.resolutionBeatId;
        })[0];
        var climaxAt = beats.indexOf(climax);
        var resolutionAt = beats.indexOf(resolution);
        if (!climax) problems.push("climax-missing");
        if (!resolution) problems.push("resolution-missing");
        if (climax && resolution && !(climaxAt > 0 && resolutionAt > climaxAt)) problems.push("ending-not-planned");
        if (ideaWords.length && climax && contentWords(climax.action).filter(function(word) {
          return ideaWords.indexOf(word) >= 0;
        }).length < 1) problems.push("idea-not-structural");
        if (ideaWords.length && resolution && contentWords(resolution.action).filter(function(word) {
          return ideaWords.indexOf(word) >= 0;
        }).length < 1) problems.push("idea-not-structural");
        if (climax && (!climax.because || beats.slice(0, climaxAt).every(function(beat) {
          return climax.because.indexOf(beat.beatId) < 0;
        }))) problems.push("climax-unearned");
        if (resolution && !resolution.resolvesProblem) problems.push("resolution-missing");
        beats.forEach(function(beat, index) {
          if (index > 0 && beat.because !== beats[index - 1].beatId) problems.push("not-causal:" + beat.beatId);
          if (index > 0 && beat.problemFamily && beat.problemFamily === beats[index - 1].problemFamily) {
            problems.push("story-repetition:" + beat.beatId);
          }
          var beforeIds = entityIds(beat.stateBefore && beat.stateBefore.entities);
          var afterIds = entityIds(beat.stateAfter && beat.stateAfter.entities);
          afterIds.forEach(function(id) {
            var record = entities.filter(function(entity) {
              return entity.entityId === id;
            })[0];
            if (!record) problems.push("object-unintroduced:" + id);
            else if (beforeIds.indexOf(id) < 0 && record.introducedAt !== beat.beatId) problems.push("object-unintroduced:" + id);
            else if (record.introducedAt) {
              var intro = beats.filter(function(item) {
                return item.beatId === record.introducedAt;
              })[0];
              if (intro && beats.indexOf(intro) > index) problems.push("object-unintroduced:" + id);
            }
          });
          (beat.stateBefore && beat.stateBefore.characters || []).forEach(function(before) {
            var after = (beat.stateAfter && beat.stateAfter.characters || []).filter(function(item) {
              return item.characterId === before.characterId;
            })[0];
            if (!after || before.locationId === after.locationId) return;
            var place = locations.filter(function(item) {
              return item.locationId === before.locationId;
            })[0];
            if (!place || place.connectedTo.indexOf(after.locationId) < 0) problems.push("teleport:" + before.characterId);
          });
        });
        if (!readerProfile({ yearGroup: book.yearGroup || ask.yearGroup, ageBand: book.ageBand || ask.ageBand })) problems.push("year");
        return { ok: problems.length === 0, problems };
      }
      function continuityProblems(pages) {
        var problems = [];
        (pages || []).forEach(function(page, index) {
          if (!index) return;
          if (!sameJson(page.stateBefore, pages[index - 1].stateAfter)) {
            problems.push("state-handoff:" + page.pageId);
          }
        });
        return problems;
      }
      function compositionProblems(pages) {
        var problems = [];
        (pages || []).forEach(function(page, index) {
          if (SHOTS.indexOf(page.shotType) < 0) problems.push("shot:" + page.pageId);
          if (index && page.shotType === pages[index - 1].shotType) problems.push("composition-repeat:" + page.pageId);
        });
        return problems;
      }
      function planPages(bible) {
        var review = validateBible(bible);
        if (!review.ok) return { ok: false, problems: review.problems, pages: null };
        var beats = bible.beats;
        var pages = beats.map(function(beat, index) {
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
        var progress = require_book_progression().review({ bible, pages });
        var bySpread = {};
        progress.storyProgressionMap.forEach(function(row) {
          bySpread[row.spreadId] = row;
        });
        var byVisual = {};
        progress.visualProgressionMap.forEach(function(row) {
          byVisual[row.spreadId] = row;
        });
        pages.forEach(function(page) {
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
        if (bible.pageCount && pages.length !== bible.pageCount) problems.push("page-count");
        var hooks = pages.filter(function(page) {
          return page.pageTurnHook;
        }).length;
        if (pages.length > 2 && hooks === pages.length) problems.push("page-turn-every-page");
        if (problems.length) return { ok: false, problems, pages: null };
        return { ok: true, problems: [], pages };
      }
      function sealPlan(bible, pages) {
        var problems = [];
        if (!bible || !bible.resolutionBeatId || !(pages || []).some(function(page) {
          return page.beatId === bible.resolutionBeatId;
        })) problems.push("ending-not-planned");
        if (!bible || !bible.climaxBeatId || !(pages || []).some(function(page) {
          return page.beatId === bible.climaxBeatId;
        })) problems.push("climax-missing");
        return { ok: problems.length === 0, sealed: problems.length === 0, problems };
      }
      function allowedWords(page, bible) {
        var bag = {};
        function take(text) {
          words(String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ")).forEach(function(word) {
            bag[word] = 1;
          });
        }
        take(bible.userIdea);
        take(page.action);
        take(page.emotion);
        take(page.textPurpose);
        (bible.locations || []).forEach(function(place) {
          if (place.locationId === page.locationId) take(place.name);
        });
        (page.charactersPresent || []).forEach(function(id) {
          var character = characterApi().getCharacter(id);
          if (character) take(character.name);
        });
        (page.entitiesRequired || []).forEach(function(id) {
          (bible.entities || []).forEach(function(entity) {
            if (entity.entityId === id) take(entity.name);
          });
        });
        Object.keys(STOP).forEach(function(word) {
          bag[word] = 1;
        });
        return bag;
      }
      function commitProse(bible, pages, sealed) {
        if (!sealed) {
          return { ok: false, problems: ["ending-not-planned"], pages: pages || [] };
        }
        var limits = limitsFor(bible);
        var problems = [];
        var next = (pages || []).map(function(page) {
          var copy = clone(page);
          var prose = [];
          (page.sentences || []).forEach(function(sentence) {
            var text = String(sentence.text || "").trim();
            if (!text) return;
            (sentence.entities || []).forEach(function(id) {
              var known = (bible.entities || []).some(function(entity) {
                return entity.entityId === id;
              });
              var onPage = (page.entitiesRequired || []).indexOf(id) >= 0;
              if (!known || !onPage) problems.push("unplanned-object:" + id);
            });
            (sentence.locations || []).forEach(function(id) {
              if (id !== page.locationId) problems.push("unplanned-location:" + id);
            });
            var allow = allowedWords(page, bible);
            words(text.toLowerCase().replace(/[^a-z0-9' ]/g, " ")).forEach(function(word) {
              if (!allow[word]) problems.push("unplanned-object:" + word);
            });
            (bible.entities || []).forEach(function(entity) {
              if ((page.entitiesRequired || []).indexOf(entity.entityId) >= 0) return;
              if (text.toLowerCase().indexOf(String(entity.name).toLowerCase()) >= 0) {
                problems.push("unplanned-object:" + entity.entityId);
              }
            });
            (bible.locations || []).forEach(function(place) {
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
        return { ok: problems.length === 0, problems, pages: next };
      }
      function sentencesOf(prose) {
        return String(prose || "").split(/[.!?]+/).map(function(part) {
          return part.trim();
        }).filter(Boolean);
      }
      function loadProblems(limits, prose, pageId) {
        if (!limits) return [];
        var sentences = sentencesOf(prose);
        var problems = [];
        var total = 0;
        sentences.forEach(function(sentence) {
          var count = wordCount(sentence);
          total += count;
          if (count > limits.maxSentenceWords) problems.push("age-sentence:" + pageId);
        });
        var clauses = (String(prose || "").match(/\b(because|although|though|which|while|whereas|whenever|unless)\b/gi) || []).length;
        var average = sentences.length ? total / sentences.length : 0;
        var heavy = total + clauses * 4 > limits.maxPageWords;
        if (!heavy && sentences.length > limits.maxSentences && average > limits.maxSentenceWords * 0.75) heavy = true;
        if (heavy) problems.push("reading-load:" + pageId);
        return problems;
      }
      var ECHO_SKIP = {
        you: 1,
        your: 1,
        yours: 1,
        our: 1,
        when: 1,
        where: 1,
        some: 1,
        day: 1,
        days: 1,
        once: 1,
        just: 1,
        then: 1,
        there: 1,
        here: 1,
        very: 1,
        into: 1,
        over: 1,
        upon: 1,
        through: 1,
        about: 1,
        after: 1,
        before: 1,
        again: 1,
        still: 1,
        even: 1,
        only: 1,
        really: 1,
        also: 1
      };
      function echoTokens(text) {
        return words(String(text || "").toLowerCase().replace(/'s\b/g, "").replace(/[^a-z0-9 ]/g, " ")).filter(function(word) {
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
        trigrams(echoTokens(leftText)).forEach(function(item) {
          seen[item] = 1;
        });
        trigrams(echoTokens(rightText)).forEach(function(item) {
          if (!seen[item] || hits.indexOf(item) >= 0) return;
          var parts = item.split(" ");
          if (names && parts.every(function(part) {
            return names[part];
          })) return;
          hits.push(item);
        });
        return hits;
      }
      function promptEcho(idea, prose, yearGroup) {
        if (yearGroup === "Reception") return false;
        var ideaTri = trigrams(echoTokens(idea));
        if (ideaTri.length < 2) return false;
        var pageTri = {};
        trigrams(echoTokens(prose)).forEach(function(item) {
          pageTri[item] = 1;
        });
        var hit = 0;
        ideaTri.forEach(function(item) {
          if (pageTri[item]) hit += 1;
        });
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
        var perPage = (pages || []).map(function(page) {
          var found = {};
          sentencesOf(page.prose).forEach(function(sentence) {
            var parts = words(sentence);
            var lemma = parts.length > 1 ? verbLemma(parts[1]) : "";
            if (lemma) found[lemma] = 1;
          });
          return found;
        });
        var problems = [];
        var seen = {};
        perPage.forEach(function(found, index) {
          Object.keys(found).forEach(function(verb) {
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
        if (bible && bible.pageCount && (pages || []).length !== bible.pageCount) problems.push("page-count");
        var limits = limitsFor(bible);
        var openings = [];
        var names = (bible.castIds || []).map(function(id) {
          var character = catalogueCharacter(id, bible.identityRegistry);
          return character ? character.name : "";
        });
        (pages || []).forEach(function(page) {
          var prose = String(page.prose || "");
          var lower = prose.toLowerCase();
          if (!prose) problems.push("empty-prose:" + page.pageId);
          FILLER.forEach(function(phrase) {
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
          sentences.forEach(function(sentence) {
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
        var joined = (pages || []).map(function(page) {
          return page.prose || "";
        }).join(" ");
        var ideaHits = ideaWords.filter(function(word) {
          return ideaAppears(word, joined);
        });
        if (ideaWords.length && ideaHits.length < Math.min(2, ideaWords.length)) problems.push("idea-not-central");
        var climaxPage = (pages || []).filter(function(item) {
          return item.beatId === bible.climaxBeatId;
        })[0];
        var resolutionPage = (pages || []).filter(function(item) {
          return item.beatId === bible.resolutionBeatId;
        })[0];
        var nameSet = {};
        names.forEach(function(name) {
          if (name) nameSet[name.toLowerCase()] = 1;
        });
        if (bible.yearGroup !== "Reception" && climaxPage && resolutionPage && sharedTrigrams(climaxPage.prose, resolutionPage.prose, nameSet).length >= 2) {
          problems.push("ending-repeated:" + resolutionPage.pageId);
        }
        [climaxPage, resolutionPage].forEach(function(page) {
          if (!page) return;
          var prose = String(page.prose || "");
          if (/\b(wasn'?t|isn'?t|weren'?t|no longer)\b[^.]{0,48}\b(lonely|scared|afraid|happy|proud|sad)\b|\bnot\s+(?:so\s+|very\s+)?(lonely|scared|afraid|happy|proud|sad)\b|\b(was|were|felt|seemed)\s+(lonely|scared|afraid|happy|proud|glad)\b|\beveryone (was|were|felt) (happy|glad|proud)\b|\bthey (were|was) (all )?(happy|glad|proud)\b/i.test(prose)) {
            problems.push("emotion-told:" + page.pageId);
          }
        });
        if (/\b(was|were|felt|seemed)\s+(curious|brave|careful|kind|inventive|bold|observant|gentle)\b/i.test(joined)) {
          problems.push("trait-told");
        }
        (bible.castIds || []).forEach(function(id) {
          var character = catalogueCharacter(id, bible.identityRegistry);
          if (character && joined.indexOf(character.name) < 0) problems.push("cast-missing:" + id);
        });
        if (!(pages || []).some(function(page) {
          return page.beatId === bible.climaxBeatId;
        })) problems.push("climax-missing");
        if (!(pages || []).some(function(page) {
          return page.beatId === bible.resolutionBeatId && page.prose;
        })) {
          problems.push("resolution-missing");
        }
        problems = problems.concat(continuityProblems(pages));
        problems = problems.concat(require_book_visual().unplannedVisualProblems(bible, pages));
        return { ok: problems.length === 0, problems };
      }
      function coverPlan(bible, pages) {
        return require_book_visual().planCover(bible, pages || bible && bible.pages || []);
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
        ["narrativePhase", "locationZone", "pageTurnIntent", "layoutIntent", "progressionReason", "visualNoveltyReason", "worldState"].forEach(function(key) {
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
        pages.forEach(function(page2, i) {
          if (page2.pageId === pageId) index = i;
        });
        var page = index >= 0 ? pages[index] : null;
        return {
          pageId,
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
        return (bible.entities || []).filter(function(entity) {
          return String(text || "").toLowerCase().indexOf(entity.name.toLowerCase()) >= 0;
        }).map(function(entity) {
          return entity.entityId;
        }).sort();
      }
      function applyTextEdit(book, pageId, text) {
        var source = book.bible || book;
        var page = (book.pages || []).filter(function(item) {
          return item.pageId === pageId;
        })[0];
        if (!page) return { ok: false, problems: ["missing-page"], imageCalls: 0 };
        var limits = textLimits(source.yearGroup || book.yearGroup);
        var sentences = String(text || "").split(/[.!?]+/).map(function(part) {
          return part.trim();
        }).filter(Boolean);
        if (limits && sentences.some(function(sentence) {
          return wordCount(sentence) > limits.maxSentenceWords;
        })) {
          return { ok: false, problems: ["age-sentence"], imageCalls: 0, imageStale: false };
        }
        var before = namesIn(page.prose, source);
        var after = namesIn(text, source);
        return {
          ok: true,
          problems: [],
          pageId,
          text: String(text || "").trim(),
          imageStale: before.join() !== after.join(),
          imageCalls: 0
        };
      }
      function readerStoryFromShelfItem(item) {
        var layout = item && item.readerArtLayout === "facing" ? "facing" : "duplex";
        var mode = item && (item.storyTextMode === "prose" || item.storyTextMode === "rhyme") ? item.storyTextMode : layout === "facing" ? "prose" : "rhyme";
        var length = item && (item.storyLength === "short" || item.storyLength === "medium" || item.storyLength === "long") ? item.storyLength : "medium";
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
          pages: (item.pages || []).map(function(page) {
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
        pages.forEach(function(page) {
          readerPages.push({
            text: page.prose,
            imageUrl: null,
            pageId: page.pageId,
            textSafeRegion: page.textSafeRegion,
            textSafeZones: [{ side: "left", position: page.textSafeRegion, priority: 1 }]
          });
          readerPages.push({ text: "", imageUrl: null });
        });
        var names = (book.castIds || []).map(function(id) {
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
          pages: story.pages.map(function(page) {
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
      function knownRegistry(rows) {
        var locked = {};
        (rows || []).forEach(function(row) {
          if (row && row.locked === true && row.characterId && (row.portrait || row.approvedReference)) {
            locked[String(row.characterId)] = row;
          }
        });
        return locked;
      }
      function compileStory(draft, request) {
        var registry = Array.isArray(request && request.identityRegistry) ? request.identityRegistry : [];
        var known = knownRegistry(registry);
        var ask = publicRequest(request || {});
        var problems = [];
        var profile = lengthProfile(ask.length);
        var source = draft || {};
        var incoming = source.beats || [];
        if (!profile) problems.push("length");
        if (!ask.idea) problems.push("idea-missing");
        if (ask.castIds.length < 1 || ask.castIds.length > 4) problems.push("cast-size");
        var lock = characterApi().lockCast(ask.castIds);
        if (!lock.ok) {
          lock.problems.forEach(function(problem) {
            var id = problem.indexOf("unknown-cast:") === 0 ? problem.slice("unknown-cast:".length) : "";
            if (!(id && known[id])) problems.push(problem);
          });
        }
        problems = problems.concat(lengthShape(incoming, profile));
        if (problems.length) return { ok: false, problems, bible: null };
        var locations = (source.locations || []).map(function(place) {
          return {
            locationId: slug(place.locationId || place.name),
            name: String(place.name || place.locationId || ""),
            connectedTo: (place.connectedTo || []).map(slug),
            visualIdentity: String(place.visualIdentity || ""),
            setting: String(place.setting || "").trim(),
            zones: (place.zones || []).map(function(zone) {
              return String(zone || "");
            }).filter(Boolean),
            persistentObjects: (place.persistentObjects || []).map(slug)
          };
        }).filter(function(place) {
          return place.locationId;
        });
        locations.forEach(function(place) {
          place.connectedTo.forEach(function(other) {
            var there = locations.filter(function(item) {
              return item.locationId === other;
            })[0];
            if (there && there.connectedTo.indexOf(place.locationId) < 0) there.connectedTo.push(place.locationId);
          });
        });
        var entityRecords = (source.entities || []).map(function(entity) {
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
        }).filter(function(entity) {
          return entity.entityId;
        });
        var previousShot = "";
        var living = [];
        var storyCast = (source.storyCast || []).filter(function(row) {
          return row && row.characterId;
        }).map(function(row) {
          var locked = castApi().lockIdentity(Object.assign({}, row, { origin: "story" }));
          locked.referenceAssetIds = (row.referenceAssetIds || []).slice();
          locked.visualImportance = row.visualImportance || "";
          return locked;
        });
        storyCast.forEach(function(row) {
          if (ask.castIds.indexOf(row.characterId) >= 0) problems.push("story-replaces-selected:" + row.characterId);
          registry.forEach(function(selected) {
            if (!selected || selected.source === "story-generated") return;
            if (row.name && selected.name && row.name.toLowerCase() === selected.name.toLowerCase() && row.characterId !== selected.characterId) {
              problems.push("story-name-clash:" + row.characterId);
            }
            (row.referenceAssetIds || []).forEach(function(file) {
              if (file && (file === selected.portrait || file === selected.approvedReference || file === selected.reference)) {
                problems.push("story-uses-selected-art:" + row.characterId);
              }
            });
          });
        });
        var storyIds = storyCast.map(function(row) {
          return row.characterId;
        });
        var storyMemory = {};
        var characters = ask.castIds.map(function(id) {
          return charState(id, slug(incoming[0].locationId), "steady", "friend", [], registry);
        });
        var beats = incoming.map(function(raw, index) {
          var beatId = "b" + (index + 1);
          var present = (raw.charactersPresent || []).map(String);
          present.forEach(function(id) {
            if (ask.castIds.indexOf(id) < 0 && storyIds.indexOf(id) < 0) problems.push("unplanned-character:" + id);
          });
          ask.castIds.forEach(function(id) {
            if (present.indexOf(id) < 0 && !(raw.absent && raw.absent[id])) problems.push("cast-missing:" + id);
          });
          (raw.expresses || []).forEach(function(note) {
            if (storyIds.indexOf(note.characterId) >= 0) return;
            var character = catalogueCharacter(note.characterId, registry);
            if (!character || character.personality.indexOf(note.trait) < 0) problems.push("personality-unused:" + note.characterId);
            if (!note.shows || TOLD_TRAIT.test(note.shows) || String(note.shows).toLowerCase() === String(note.trait).toLowerCase()) {
              problems.push("trait-told:" + beatId);
            }
          });
          var before = { characters: clone(characters), entities: clone(living) };
          storyIds.forEach(function(id) {
            if (present.indexOf(id) < 0 && !storyMemory[id]) return;
            if (storyMemory[id]) before.characters.push(clone(storyMemory[id]));
          });
          var locationId = slug(raw.locationId);
          present.forEach(function(id) {
            if (storyIds.indexOf(id) < 0) return;
            var prior = storyMemory[id] || { characterId: id, locationId: "", clothing: "", carriedEntities: [], emotion: "", storyRole: "story", mud: "", damage: "", wetness: "", disguise: "", transformation: "", expression: "", pose: "", removedAccessories: [] };
            var patch = (raw.characterState || []).filter(function(row) {
              return row.characterId === id;
            })[0] || {};
            var applied = castApi().applyState(storyCast.filter(function(row) {
              return row.characterId === id;
            })[0], Object.assign({}, prior, patch, { locationId }));
            if (!applied.ok) {
              problems.push("identity-changed:" + id);
              return;
            }
            storyMemory[id] = Object.assign({ characterId: id, storyRole: "story" }, applied.state);
          });
          characters = characters.map(function(row) {
            var here = present.indexOf(row.characterId) >= 0;
            return charState(row.characterId, here ? locationId : row.locationId, here ? raw.emotion || row.emotion : row.emotion, row.storyRole, row.carriedEntities, registry);
          });
          (raw.entityState || []).forEach(function(change) {
            var id = slug(change.entityId);
            var record = entityRecords.filter(function(entity) {
              return entity.entityId === id;
            })[0];
            if (!record) {
              problems.push("object-unintroduced:" + id);
              return;
            }
            var found = living.filter(function(entity) {
              return entity.entityId === id;
            })[0];
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
          living.forEach(function(entity) {
            var owner = characters.filter(function(row) {
              return row.characterId === entity.ownerCharacterId;
            })[0];
            if (owner) entity.locationId = owner.locationId;
            var record = entityRecords.filter(function(item) {
              return item.entityId === entity.entityId;
            })[0];
            if (!record) return;
            record.ownerCharacterId = entity.ownerCharacterId;
            record.locationId = entity.locationId;
            record.state = entity.state;
          });
          characters = characters.map(function(row) {
            var carried = living.filter(function(entity) {
              return entity.ownerCharacterId === row.characterId;
            }).map(function(entity) {
              return entity.entityId;
            });
            return charState(row.characterId, row.locationId, row.emotion, row.storyRole, carried, registry);
          });
          var shot = SHOTS.indexOf(raw.shotType) >= 0 ? raw.shotType : "medium";
          if (shot === previousShot) shot = SHOTS[(SHOTS.indexOf(shot) + 1) % SHOTS.length];
          previousShot = shot;
          var after = { characters: clone(characters), entities: clone(living) };
          storyIds.forEach(function(id) {
            if (storyMemory[id]) after.characters.push(clone(storyMemory[id]));
          });
          return {
            beatId,
            role: raw.role,
            locationId,
            charactersPresent: present,
            absent: raw.absent || {},
            expresses: (raw.expresses || []).map(function(note) {
              return { characterId: note.characterId, trait: note.trait, shows: note.shows };
            }),
            problemFamily: raw.problemFamily || "",
            because: index ? "b" + index : "",
            resolvesProblem: raw.role === "resolution",
            action: String(raw.action || ""),
            emotion: String(raw.emotion || ""),
            entitiesRequired: living.map(function(entity) {
              return entity.entityId;
            }),
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
        beats.forEach(function(beat, index) {
          if (!beat.heldHook || index === beats.length - 1) return;
          if (hookBudget <= 0) return;
          beat.pageTurnHook = beat.heldHook;
          hookBudget -= 1;
        });
        beats.forEach(function(beat) {
          delete beat.heldHook;
        });
        var climax = beats.filter(function(beat) {
          return beat.role === "climax";
        })[0];
        var resolution = beats.filter(function(beat) {
          return beat.role === "resolution";
        })[0];
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
          pageCount: ask.pageCount > 0 ? ask.pageCount : 0,
          userIdea: ask.idea,
          castIds: ask.castIds.slice(),
          identityRegistry: registry,
          storyCast,
          visualStyle: VISUAL_STYLE,
          premise: String(source.premise || ""),
          hook: String(source.hook || ""),
          goal: String(source.goal || ""),
          centralProblem: String(source.centralProblem || ""),
          stakes: String(source.stakes || ""),
          climaxBeatId: climax ? climax.beatId : "",
          resolutionBeatId: resolution ? resolution.beatId : "",
          emotionalArc: source.emotionalArc || beats.map(function(beat) {
            return beat.emotion;
          }),
          motif: String(source.motif || ""),
          locations,
          entities: entityRecords,
          beats
        };
        bible.journey = require_book_adventure().normalise(source.journey, locations);
        var adventureReview = require_book_adventure().assess(bible, ask);
        bible.adventureNotes = adventureReview.reviewProblems.slice();
        adventureReview.blockProblems.forEach(function(problem) {
          if (problems.indexOf(problem) < 0) problems.push(problem);
        });
        var review = validateBible(bible, ask);
        return { ok: review.ok && problems.length === 0, problems: problems.concat(review.problems), bible };
      }
      function attachSpokenProse(bible, pages, spoken) {
        var byId = {};
        (spoken || []).forEach(function(page) {
          byId[page.pageId] = page.sentences || [];
        });
        var next = (pages || []).map(function(page) {
          var copy = clone(page);
          var sentences = (byId[page.pageId] || []).map(function(line) {
            return String(line || "").trim();
          }).filter(Boolean);
          copy.sentences = sentences.map(function(line) {
            return { text: line, entities: [], locations: [] };
          });
          copy.prose = sentences.join(" ");
          return copy;
        });
        var problems = [];
        var limits = limitsFor(bible);
        next.forEach(function(page) {
          if (!page.prose) problems.push("empty-prose:" + page.pageId);
          var quotes = (String(page.prose || "").match(/"/g) || []).length / 2;
          if (limits && quotes > limits.maxDialogueTurns) problems.push("age-dialogue:" + page.pageId);
          (bible.entities || []).forEach(function(entity) {
            if ((page.entitiesRequired || []).indexOf(entity.entityId) >= 0) return;
            if (entity.name && String(page.prose || "").toLowerCase().indexOf(entity.name.toLowerCase()) >= 0) {
              problems.push("unplanned-object:" + entity.entityId);
            }
          });
          (bible.locations || []).forEach(function(place) {
            if (place.locationId === page.locationId) return;
            if (place.name && String(page.prose || "").toLowerCase().indexOf(place.name.toLowerCase()) >= 0) {
              problems.push("unplanned-location:" + place.locationId);
            }
          });
        });
        var review = reviewText(bible, next);
        return { ok: problems.length === 0 && review.ok, problems: problems.concat(review.problems), pages: next };
      }
      function catalogueCharacter(id, registry) {
        var direct = characterApi().getCharacter(id);
        if (direct) return direct;
        var row = (registry || []).filter(function(item) {
          return item && (item.characterId === id || item.journeyId === id);
        })[0];
        if (row && row.bibleId) return characterApi().getCharacter(row.bibleId);
        return null;
      }
      function charState(id, locationId, emotion, role, carried, registry) {
        var character = characterApi().getCharacter(id);
        if (!character) {
          var row = (registry || []).filter(function(item) {
            return item && (item.characterId === id || item.journeyId === id);
          })[0];
          if (row) character = { characterId: id, defaultClothing: row.clothing || "" };
        }
        var state = characterApi().storyState(character, {
          locationId,
          emotion,
          storyRole: role,
          carriedEntities: carried || []
        });
        return state.state;
      }
      function ent(id, owner, locationId, state) {
        return { entityId: id, ownerCharacterId: owner, locationId, state };
      }
      function fixtureBible() {
        var hall = ["maya", "leo"].map(function(id) {
          return charState(id, "hall", id === "maya" ? "curious" : "steady", "friend", []);
        });
        var hallKey = hall.map(function(row) {
          return row.characterId === "maya" ? charState("maya", "hall", "hopeful", "finder", []) : charState("leo", "hall", "careful", "friend", []);
        });
        var cellar = ["maya", "leo"].map(function(id) {
          return charState(id, "cellar", id === "maya" ? "brave" : "glad", "friend", id === "maya" ? ["golden-key"] : []);
        });
        var garden = ["maya", "leo"].map(function(id) {
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
        var b3after = snap(hall.map(function(row) {
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
            role,
            locationId,
            charactersPresent: ["maya", "leo"],
            expresses: expresses(id),
            problemFamily: family,
            because,
            resolvesProblem: id === "b6",
            action: lines.join(" "),
            emotion,
            entitiesRequired,
            visualFocus: purpose,
            shotType: shot,
            compositionIntent: composition,
            textPurpose: purpose,
            pageTurnHook: hook,
            textSafeRegion: region,
            stateBefore: before,
            stateAfter: after,
            sentences: lines.map(function(line) {
              return {
                text: line,
                entities: entitiesRequired.filter(function(entityId) {
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
          return { ok: false, problems: storyReview.problems, storyReview, pages: null, imageCalls: 0, stages };
        }
        var planned = planPages(bible);
        stages.push("writing");
        if (!planned.ok) {
          return { ok: false, problems: planned.problems, storyReview, pages: null, imageCalls: 0, stages };
        }
        var sealed = sealPlan(bible, planned.pages);
        var prose = commitProse(bible, planned.pages, sealed.sealed);
        if (!sealed.ok || !prose.ok) {
          return {
            ok: false,
            problems: sealed.problems.concat(prose.problems),
            storyReview,
            pages: prose.pages,
            imageCalls: 0,
            stages
          };
        }
        var textReview = reviewText(bible, prose.pages);
        stages.push("visualPlanning");
        var journey = require_book_journey().analyse({ bible, pages: prose.pages });
        var journeyById = {};
        journey.spreads.forEach(function(spread) {
          journeyById[spread.spreadId] = spread;
        });
        var visual = prose.pages.map(function(page) {
          return visualBrief(page, bible, journeyById[page.pageId]);
        });
        var cover = coverPlan(bible, prose.pages);
        var images = requestImages({ textReview, storyReview }, { draw: function() {
          throw new Error("image provider called");
        } });
        if (!textReview.ok) {
          return { ok: false, problems: textReview.problems, textReview, storyReview, pages: prose.pages, imageCalls: 0, stages };
        }
        stages.push("assembling", "ready");
        var readerStory = readerStoryFromPages(bible, prose.pages);
        var finished = {
          ok: true,
          problems: [],
          bible,
          castIds: bible.castIds.slice(),
          storyReview,
          textReview,
          pages: prose.pages,
          cover,
          visual,
          visualJourney: {
            visualArc: journey.visualArc,
            repetition: journey.repetition,
            problems: journey.problems
          },
          readerStory,
          shelfItem: shelfItemFromReader(readerStory, bible),
          imageCalls: images.imageCalls,
          imageReason: images.reason,
          stages,
          yearGroup: bible.yearGroup,
          title: bible.title
        };
        finished.shelfItem.savedAt = "";
        return finished;
      }
      return {
        PUBLIC_KEYS,
        YEAR_GROUPS,
        YEAR_WRITING,
        TONE_WRITING,
        MAX_REPAIRS,
        TONES,
        SHOTS,
        VISUAL_STYLE,
        IMAGES_ENABLED,
        STAGE_LABELS,
        publicRequest,
        textLimits,
        lengthProfile,
        lengthShape,
        readerProfile,
        limitsFor,
        AGE_BANDS,
        generationView,
        acceptCreation,
        validateBible,
        continuityProblems,
        compositionProblems,
        planPages,
        planJourney: function(bible, pages) {
          return require_book_journey().analyse({ bible, pages: pages || [] });
        },
        planProgression: function(bible, pages) {
          return require_book_progression().review({ bible, pages: pages || [] });
        },
        sealPlan,
        commitProse,
        reviewText,
        coverPlan,
        visualBrief,
        requestImages,
        repairRequest,
        applyTextEdit,
        readerStoryFromShelfItem,
        fixtureBible,
        runFixture,
        compileStory,
        attachSpokenProse,
        contentWords
      };
    });
  }
});

// js/book-v2-adapter.js
var require_book_v2_adapter = __commonJS({
  "js/book-v2-adapter.js"(exports, module) {
    (function(root, factory) {
      var api = factory(root);
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookV2Adapter = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function(root) {
      "use strict";
      var FAMILY_AGE = {
        "4-6": "4-6",
        "7-9": "7-9",
        "10-12": "10-12"
      };
      var V2_AGE = { "3-4": 1, "5-6": 1, "7-8": 1, "9-10": 1, "11-12": 1 };
      var LENGTHS = { short: "quick", medium: "storybook", long: "adventure" };
      var TONES = {
        Adventure: "adventure",
        Magic: "magical",
        Mystery: "mystery",
        "Surprise me": "surprise"
      };
      var PLACES = {
        library: "Wondii World",
        bedroom: "the child's home",
        woods: "the woods",
        undersea: "under the sea",
        castle: "the castle"
      };
      var BIBLE_PAIR = {
        "wondii-maya": "maya",
        "wondii-leo": "leo"
      };
      function identityApi() {
        if (root && root.WondiiBookV2Identity) return root.WondiiBookV2Identity;
        return require_book_v2_identity();
      }
      function brain() {
        if (root && root.WondiiBookBrain) return root.WondiiBookBrain;
        return require_book_brain();
      }
      function crewApi() {
        if (root && root.WondiiCrew) return root.WondiiCrew;
        return require_wondii_crew();
      }
      function characterApi() {
        if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
        return require_character_bible();
      }
      function enabled(env) {
        var host = String(env && env.host || "");
        if (host !== "localhost" && host !== "127.0.0.1") return false;
        var flag = env && env.bookV2;
        return flag === true || flag === 1 || flag === "1" || flag === "true";
      }
      function mapAge(input) {
        var given = String(input && (input.familyAgeBand || input.ageBand) || "");
        if (FAMILY_AGE[given]) return { familyAgeBand: given, ageBand: FAMILY_AGE[given] };
        if (V2_AGE[given]) return { familyAgeBand: "", ageBand: given };
        return null;
      }
      function referenceMatches(id, reference) {
        var path = String(reference || "");
        if (!path) return false;
        if (path.indexOf("maya-v1") >= 0) return id === "wondii-maya" || id === "maya";
        var file = path.split("/").pop() || "";
        var stem = file.replace(/\.[a-z0-9]+$/i, "");
        if (path.indexOf("/characters/crew/") >= 0) return stem === id;
        return true;
      }
      function referencesFor(members, saved) {
        var byId = {};
        (saved || []).forEach(function(row) {
          if (!row) return;
          var id = String(row.characterId || row.id || "");
          if (id) byId[id] = row;
        });
        var refs = [];
        (members || []).forEach(function(member) {
          if (!member || !member.id) return;
          var id = String(member.id);
          var row = byId[id];
          if (!row) return;
          if (row.ownerType !== "family" && row.ownerType !== "school") return;
          if (!row.ownerId || !row.reference) return;
          if (!referenceMatches(id, row.reference)) return;
          refs.push({
            characterId: id,
            reference: String(row.reference),
            ownerType: row.ownerType,
            ownerId: String(row.ownerId)
          });
        });
        return refs;
      }
      function savedRowFor(id, saved) {
        var found = null;
        (saved || []).forEach(function(row) {
          if (!row) return;
          var rowId = String(row.characterId || row.id || "");
          if (rowId === id) found = row;
        });
        return found;
      }
      function mapMember(member, saved) {
        var journeyId = String(member && member.id || "");
        var givenName = String(member && member.name || "");
        var bibleId = BIBLE_PAIR[journeyId] || "";
        var bible = bibleId ? characterApi().getCharacter(bibleId) : null;
        var crew = journeyId ? crewApi().get(journeyId) : null;
        var portrait = crew && crew.portrait ? crew.portrait : "";
        var approved = bible ? characterApi().resolveReference(bibleId) : null;
        var approvedFile = approved && approved.status === "approved" ? String(approved.file || "") : "";
        var problems = [];
        if (!journeyId) problems.push("cast-missing");
        if (bibleId && (!bible || crew && crew.bibleId && crew.bibleId !== bibleId)) problems.push("unmapped-cast:" + journeyId);
        if (bible && givenName && givenName.toLowerCase() !== String(bible.name).toLowerCase()) problems.push("identity-mismatch:" + journeyId);
        if (!bibleId) {
          var kind = journeyId.indexOf("wondii-") === 0 ? "unsupported" : "saved";
          var row = savedRowFor(journeyId, saved);
          var ownReference = "";
          if (kind === "saved" && row && row.ownerId && (row.ownerType === "family" || row.ownerType === "school") && referenceMatches(journeyId, row.reference)) {
            ownReference = String(row.reference);
          }
          if (journeyId) problems.push("unmapped-cast:" + journeyId);
          return {
            ok: false,
            kind,
            journeyId,
            bibleId: "",
            name: givenName,
            portrait: ownReference,
            reference: ownReference,
            lockedSheet: false,
            sheet: "none",
            problems
          };
        }
        return {
          ok: problems.length === 0,
          kind: "supported",
          journeyId,
          bibleId,
          name: bible.name,
          portrait,
          reference: approvedFile || portrait,
          approvedReference: approvedFile,
          referenceVersionId: approved && approved.status === "approved" ? approved.versionId || "" : "",
          lockedSheet: !!approvedFile,
          sheet: approvedFile ? approved.versionId || "approved" : portrait ? "portrait-only" : "none",
          problems
        };
      }
      function ideaFor(input) {
        var written = String(input && input.idea || "").trim();
        var place = PLACES[input && input.place] || "";
        if (!written) return place ? "A story set in " + place + "." : "";
        if (place && written.toLowerCase().indexOf(place.toLowerCase()) < 0) {
          return written.replace(/[.?!]\s*$/, "") + ". The story is set in " + place + ".";
        }
        return written;
      }
      function prepare(input) {
        var source = input || {};
        if (!enabled(source)) {
          return {
            active: false,
            route: "clever-service",
            ok: true,
            generated: false,
            imageCalls: 0,
            problems: []
          };
        }
        return planRequest(source);
      }
      function planRequest(input) {
        var source = input || {};
        var age = mapAge(source);
        if (!age) {
          return {
            active: true,
            route: "book-v2",
            ok: false,
            generated: false,
            imageCalls: 0,
            problems: ["age-missing"],
            message: "Choose an age band before this book can be planned."
          };
        }
        var profile = brain().readerProfile({ ageBand: age.ageBand });
        var built = identityApi().buildRegistry(source);
        var identities = built.selected || [];
        if (!built.ok) {
          return {
            active: true,
            route: "book-v2",
            ok: false,
            generated: false,
            imageCalls: 0,
            problems: built.problems,
            identities,
            request: { castIds: [], idea: ideaFor(source) },
            cast: identities,
            familyAgeBand: age.familyAgeBand,
            ageBand: age.ageBand,
            constraintYear: profile && profile.constraintYear || "",
            place: source.place || "",
            illustrationStyle: brain().VISUAL_STYLE,
            message: "The story plan could not start. Nothing was saved."
          };
        }
        var ask = {
          castIds: identities.map(function(identity) {
            return identity.journeyId;
          }),
          identityRegistry: built.registry,
          idea: ideaFor(source),
          ageBand: age.ageBand,
          length: LENGTHS[source.length] || "",
          pageCount: source.pageCount,
          tone: TONES[source.theme] || null,
          context: "family",
          characterReferences: referencesFor(source.members, source.savedReferences)
        };
        var accepted = brain().acceptCreation(ask);
        var style = brain().VISUAL_STYLE;
        if (!accepted.ok) {
          return {
            active: true,
            route: "book-v2",
            ok: false,
            generated: false,
            imageCalls: 0,
            problems: accepted.problems,
            identities,
            request: accepted.request,
            cast: identities,
            familyAgeBand: age.familyAgeBand,
            ageBand: age.ageBand,
            constraintYear: profile && profile.constraintYear || "",
            place: source.place || "",
            illustrationStyle: style,
            message: "The story plan could not start. Nothing was saved."
          };
        }
        accepted.request.identityRegistry = built.registry;
        return {
          active: true,
          route: "book-v2",
          ok: true,
          generated: false,
          imageCalls: 0,
          problems: [],
          identities,
          request: accepted.request,
          cast: identities,
          familyAgeBand: age.familyAgeBand,
          ageBand: age.ageBand,
          constraintYear: profile && profile.constraintYear || "",
          place: source.place || "",
          illustrationStyle: style,
          illustration: built.illustration,
          message: "Book V2 is ready to plan. The story model has not been called."
        };
      }
      function readerPlan(book) {
        if (!book || !book.id) {
          return { ok: false, reason: "missing", message: "This link does not name a book." };
        }
        var sourcePages = book.pages || [];
        if (!sourcePages.length) {
          return { ok: false, reason: "empty", message: "This book has no pages yet." };
        }
        var pages = sourcePages.map(function(page, index) {
          var inline = page && page.imageDataUrl ? String(page.imageDataUrl) : "";
          var fallback = page && page.imageUrlFallback ? String(page.imageUrlFallback) : "";
          var src = inline || fallback;
          return {
            number: index + 1,
            text: page && page.text ? String(page.text) : "",
            imageSrc: src,
            missingArt: !src
          };
        });
        var coverSrc = book.sceneDataUrl ? String(book.sceneDataUrl) : "";
        if (!coverSrc && book.sceneUrlFallback) coverSrc = String(book.sceneUrlFallback);
        if (!coverSrc && pages[0] && pages[0].imageSrc) coverSrc = pages[0].imageSrc;
        return {
          ok: true,
          plan: {
            id: String(book.id),
            title: String(book.title || "Untitled story"),
            author: String(book.author || ""),
            coverSrc,
            readerArtLayout: book.readerArtLayout === "facing" ? "facing" : "duplex",
            storyTextMode: book.storyTextMode === "rhyme" ? "rhyme" : "prose",
            pages
          }
        };
      }
      function shelfFromProof(proof) {
        if (!proof || proof.status !== "REVIEWABLE" || !proof.bible || !proof.pages || !proof.pages.length) {
          return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
        }
        if (proof.textProblems && proof.textProblems.length) {
          return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
        }
        var pages = [];
        proof.pages.forEach(function(page) {
          pages.push({
            text: page && page.prose ? String(page.prose) : "",
            imageDataUrl: null,
            imageUrlFallback: page && page.imageUrl ? String(page.imageUrl) : null,
            pageId: page && page.pageId ? String(page.pageId) : ""
          });
          pages.push({ text: "", imageDataUrl: null, imageUrlFallback: null });
        });
        var shelf = {
          id: String(proof.id || ""),
          title: String(proof.bible.title || ""),
          author: "",
          readerArtLayout: "duplex",
          storyTextMode: "prose",
          storyLength: "medium",
          v2: true,
          castIds: (proof.bible.castIds || []).slice(),
          pages,
          sceneDataUrl: null,
          sceneUrlFallback: null
        };
        if (!shelf.id || !shelf.pages.length || !shelf.title) {
          return { ok: false, reason: "incomplete", message: "This book is not ready to open." };
        }
        var planned = readerPlan(shelf);
        if (!planned.ok) return planned;
        return {
          ok: true,
          shelf,
          plan: planned.plan,
          illustrationStyle: proof.bible.visualStyle || brain().VISUAL_STYLE,
          imageCalls: 0
        };
      }
      return {
        FAMILY_AGE,
        enabled,
        BIBLE_PAIR,
        mapAge,
        mapMember,
        prepare,
        planRequest,
        readerPlan,
        shelfFromProof
      };
    });
  }
});

// js/book-v2-budget.js
var require_book_v2_budget = __commonJS({
  "js/book-v2-budget.js"(exports, module) {
    (function(root, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      if (root) root.WondiiBookV2Budget = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var TEXT_USD = 0.057495;
      var IMAGE_USD = 0.039657;
      var VISION_USD = 1472e-6;
      var GBP_PER_USD = 0.754;
      var MAX_TEXT = 8;
      var MAX_IMAGE = 24;
      var MAX_VISION = 24;
      var BUDGET_USD = 1.2;
      function money(usd) {
        var dollars = Math.round(usd * 1e6) / 1e6;
        return {
          usd: dollars,
          gbp: Math.round(dollars * GBP_PER_USD * 1e3) / 1e3
        };
      }
      function price(calls) {
        var used = calls || {};
        var usd = (Number(used.text) || 0) * TEXT_USD + (Number(used.image) || 0) * IMAGE_USD + (Number(used.vision) || 0) * VISION_USD;
        return money(usd);
      }
      function expectedCalls() {
        return { text: 3, image: 13, vision: 13 };
      }
      function ceilingCalls() {
        return { text: MAX_TEXT, image: MAX_IMAGE, vision: MAX_VISION };
      }
      function quote() {
        var expected = price(expectedCalls());
        var ceiling = price(ceilingCalls());
        return {
          pages: 12,
          calls: expectedCalls(),
          maxCalls: ceilingCalls(),
          budgetUsd: BUDGET_USD,
          expectedUsd: expected.usd,
          expectedGbp: expected.gbp,
          ceilingUsd: ceiling.usd,
          ceilingGbp: ceiling.gbp,
          steps: [
            { id: "plan", state: "ready" },
            { id: "story", state: "waiting" },
            { id: "check", state: "waiting" },
            { id: "art", state: "waiting" },
            { id: "pictures", state: "waiting" },
            { id: "save", state: "waiting" },
            { id: "read", state: "waiting" }
          ]
        };
      }
      function block(reason, message, extra) {
        return Object.assign({
          ok: false,
          authorised: false,
          duplicate: reason === "already-generated",
          reason,
          calls: { text: 0, image: 0, vision: 0 },
          quote: quote(),
          message
        }, extra || {});
      }
      function budgetFor(input) {
        var requested = Number(input && input.budgetUsd);
        if (!isFinite(requested) || requested <= 0) return BUDGET_USD;
        return Math.min(requested, BUDGET_USD);
      }
      function decide(input) {
        var source = input || {};
        var plan = quote();
        if (source.approved !== true) {
          return block(
            "paid-generation-not-approved",
            "The story plan can be saved. Writing and pictures stay off until that is approved."
          );
        }
        if (!source.accountId) return block("unauthorised", "Sign in before this book can be written. Nothing was started.");
        if (source.accountKind === "child" && source.childPermitted !== true) {
          return block("child-not-permitted", "A child cannot start a paid story unless a parent has allowed it. Nothing was started.");
        }
        if (source.accountKind === "child" && source.allowanceReserved !== true) {
          return block("allowance", "This child has no story allowance left for today. Nothing was started.");
        }
        if (source.alreadyGenerated) {
          return block("already-generated", "This book is already on the shelf. It was not generated again.");
        }
        var calls = source.calls || expectedCalls();
        if ((Number(calls.text) || 0) > MAX_TEXT || (Number(calls.image) || 0) > MAX_IMAGE || (Number(calls.vision) || 0) > MAX_VISION) {
          return block("call-cap", "This book would take more story or picture calls than Wondii allows. Nothing was started.");
        }
        var cost = price(calls);
        if (cost.usd > budgetFor(source)) {
          return block("budget", "This book would cost more than its budget. Nothing was started.");
        }
        return {
          ok: true,
          authorised: true,
          duplicate: false,
          reason: "ready",
          calls: {
            text: Number(calls.text) || 0,
            image: Number(calls.image) || 0,
            vision: Number(calls.vision) || 0
          },
          quote: plan,
          cost,
          message: "This book is within the story, picture, and budget limits."
        };
      }
      function authorise(input) {
        return decide(Object.assign({}, input || {}, { approved: false }));
      }
      return {
        TEXT_USD,
        IMAGE_USD,
        VISION_USD,
        GBP_PER_USD,
        MAX_TEXT,
        MAX_IMAGE,
        MAX_VISION,
        BUDGET_USD,
        quote,
        price,
        decide,
        authorise
      };
    });
  }
});

// scripts/book/handle-request.js
var require_handle_request = __commonJS({
  "scripts/book/handle-request.js"(exports, module) {
    var Adapter = require_book_v2_adapter();
    var Budget = require_book_v2_budget();
    function names(body, planned) {
      var fromMembers = (body && body.members || []).map(function(member) {
        return member && member.name ? String(member.name) : "";
      }).filter(Boolean);
      if (fromMembers.length) return fromMembers;
      return (planned.cast || []).map(function(row) {
        return row.characterId;
      });
    }
    function identityOf(planned) {
      if (planned.identities && planned.identities.length) return planned.identities;
      return (planned.cast || []).map(function(row) {
        var id = String(row.characterId || "");
        var reference = String(row.reference || "");
        var locked = (id === "wondii-maya" || id === "maya") && reference.indexOf("maya-v1") >= 0;
        return {
          characterId: id,
          reference,
          lockedSheet: locked,
          sheet: locked ? "maya-v1" : "portrait-only"
        };
      });
    }
    function previewShelf(body, planned) {
      var who = names(body, planned);
      var place = planned.request && planned.request.idea ? planned.request.idea : "";
      var writing = (planned.familyAgeBand || planned.ageBand || "unspecified") + (planned.constraintYear ? ", written at " + planned.constraintYear : "");
      var first = "Book V2 accepted this plan. The story model was not called, and no pictures were drawn.\n\n" + who.join(", ") + ". " + writing + ". " + place;
      var second = "Picture consistency is not solved. Maya's approved sheet is maya-v1. Other selected characters still need their own approved reference sheets.";
      return {
        id: "book-v2-local-preview",
        title: "Local preview \u2014 not a finished book",
        author: "",
        readerArtLayout: "duplex",
        storyTextMode: "prose",
        storyLength: "medium",
        v2: true,
        simulated: true,
        pages: [
          { text: first, imageDataUrl: null, imageUrlFallback: null },
          { text: "", imageDataUrl: null, imageUrlFallback: null },
          { text: second, imageDataUrl: null, imageUrlFallback: null },
          { text: "", imageDataUrl: null, imageUrlFallback: null }
        ],
        sceneDataUrl: null,
        sceneUrlFallback: null
      };
    }
    function handleBookV2(body) {
      var planned = Adapter.planRequest(body || {});
      if (!planned.ok) {
        return {
          status: 400,
          body: {
            ok: false,
            generated: false,
            simulated: false,
            illustrations: "not-run",
            pictureConsistency: "not-solved",
            problems: planned.problems || [],
            identities: planned.identities || [],
            message: planned.message || "The story plan could not start. Nothing was saved."
          }
        };
      }
      return {
        status: 200,
        body: {
          ok: true,
          generated: false,
          simulated: true,
          reason: "paid-generation-not-approved",
          illustrationStyle: planned.illustrationStyle || "wondii-picture-book",
          illustrations: "not-run",
          pictureConsistency: "not-solved",
          identity: identityOf(planned),
          writing: {
            familyAgeBand: planned.familyAgeBand || "",
            ageBand: planned.ageBand || "",
            constraintYear: planned.constraintYear || ""
          },
          castIds: (planned.identities || []).map(function(row) {
            return row.journeyId;
          }),
          bibleIds: (planned.identities || []).map(function(row) {
            return row.bibleId;
          }),
          identities: planned.identities || [],
          message: "Book V2 accepted the plan. The story model was not called, and no pictures were drawn.",
          generation: Budget.authorise({
            approved: true,
            accountId: "ignored",
            accountKind: body && body.accountKind,
            childPermitted: true,
            allowanceReserved: true,
            budgetUsd: body && body.budgetUsd,
            calls: { text: 100, image: 100, vision: 100 }
          }),
          preview: previewShelf(body, planned)
        }
      };
    }
    module.exports = { handleBookV2 };
  }
});
export default require_handle_request();
