/* Locks the characters a child selected, and keeps story-made characters separate.
   A portrait is not an approved reference sheet. This file does not draw. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Identity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var BIBLE_PAIR = { "wondii-maya": "maya", "wondii-leo": "leo" };
  /* One reference image per character. Four covers a full selected cast in one call.
     The old generator's three-image cap is not used to drop anyone.
     The picture model's own maximum was not confirmed with a live call. */
  var SCENE_REFERENCE_LIMIT = 4;
  var memory = {};

  function crewApi() {
    if (root && root.WondiiCrew) return root.WondiiCrew;
    return require("./wondii-crew.js");
  }

  function characterApi() {
    if (root && root.WondiiCharacterBible) return root.WondiiCharacterBible;
    return require("./character-bible.js");
  }

  function savedRow(id, rows) {
    var found = null;
    (rows || []).forEach(function (row) {
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
    crewApi().list().forEach(function (row) {
      if (owner) return;
      if (path.indexOf(row.portrait) >= 0 || path.indexOf("/" + row.id + ".") >= 0) owner = row.id;
    });
    return owner;
  }

  function appearanceSpec(entry, record) {
    var source = record || {};
    return {
      source: entry.referenceApproved ? "approved-sheet" : (entry.source === "story-generated" ? "story" : "portrait"),
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

  /* A signed portrait URL expires. Planning keeps the account's own file path. */
  function portraitPath(reference) {
    var raw = String(reference || "").trim();
    if (!raw || raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return "";
    var path = raw;
    if (/^https?:/i.test(raw)) {
      var match = raw.match(/\/storage\/v1\/object\/(?:sign|authenticated|public)\/characters_room\/([^?#]+)/i);
      if (!match) return "";
      try { path = decodeURIComponent(match[1]); } catch (ePath) { path = match[1]; }
    }
    path = path.split("?")[0].replace(/^\/+/, "");
    if (path.indexOf("characters_room/") === 0) path = path.slice("characters_room/".length);
    if (!path || path.indexOf("..") >= 0 || path.indexOf("\\") >= 0) return "";
    return path;
  }

  function ownedPortrait(accountId, characterId, reference) {
    var account = String(accountId || "");
    var id = String(characterId || "");
    var path = portraitPath(reference);
    if (!account || !id || account.indexOf("/") >= 0 || id.indexOf("/") >= 0 || id.indexOf("..") >= 0) return "";
    if (!path || path.indexOf("maya-v1") >= 0 || path.indexOf("/characters/crew/") >= 0) return "";
    if (path === account + "/characters/" + id + ".png") return path;
    return "";
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
      return { entry: entry, problems: problems };
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
    entry.sheet = approvedFile ? (approved.versionId || "approved") : "portrait-only";
    entry.reliable = !!approvedFile;
    entry.proposed = !approvedFile;
    entry.locked = true;
    entry.personality = (crew.personality || []).slice();
    entry.appearance = approvedFile
      ? "Approved sheet " + approved.versionId + ". Portrait " + crew.portrait + "."
      : "Match the portrait exactly. No written clothing description is stored for this portrait.";
    entry.clothing = "as shown in " + (approvedFile || crew.portrait);
    entry.distinctive = [crew.trait || ""].filter(Boolean);
    entry.appearanceSpec = appearanceSpec(entry, {});
    entry.blocksGeneration = false;
    entry.limitation = approvedFile ? "" : "Portrait only. This portrait is the reference. Visual consistency is not guaranteed.";
    entry.referenceVersion = approvedFile ? (approved.versionId || "approved") : "portrait:" + crew.portrait;
    return { entry: entry, problems: problems };
  }

  function lockRecord(member, kind, row, accountId) {
    var id = String(member.id || "");
    var entry = blank(kind, id, member.name || (row && row.name) || "");
    var problems = [];
    var reference = row && (row.reference || row.portrait) || "";
    var kept = accountId && kind === "saved" ? ownedPortrait(accountId, id, reference) : ownFile(id, reference);
    if (accountId && kind === "saved" && reference && !kept) {
      problems.push("wrong-artwork:" + id);
      return { entry: entry, problems: problems };
    }
    if (!row || !row.ownerId || (row.ownerType !== "family" && row.ownerType !== "school" && kind !== "shared")) {
      if (kind === "shared" && row && (row.shareId || row.ownerId) && kept) {
        entry.ownerId = String(row.ownerId || row.shareId || "");
      } else if (!kept) {
        problems.push(reference ? "wrong-artwork:" + id : "missing-artwork:" + id);
        return { entry: entry, problems: problems };
      }
    }
    if (!kept) {
      problems.push(reference ? "wrong-artwork:" + id : "missing-artwork:" + id);
      return { entry: entry, problems: problems };
    }
    if (kind === "shared" && !(row.shareId || row.id)) {
      problems.push("missing-artwork:" + id);
      return { entry: entry, problems: problems };
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
    return { entry: entry, problems: problems };
  }

  function lockStory(character, selected) {
    var id = String(character && (character.characterId || character.id) || "");
    var name = String(character && character.name || "");
    var problems = [];
    var entry = blank("story-generated", id, name);
    entry.role = "story-generated";
    if (!id || !name) problems.push("story-incomplete");
    selected.forEach(function (row) {
      if (row.characterId === id || row.journeyId === id) problems.push("story-replaces-selected:" + id);
      if (name && row.name && name.toLowerCase() === row.name.toLowerCase()) problems.push("story-name-clash:" + id);
    });
    var art = String(character && (character.portrait || character.reference) || "");
    if (art) {
      var owner = fileOwner(art);
      if (owner) problems.push("story-uses-selected-art:" + id);
      selected.forEach(function (row) {
        if (art && (art === row.portrait || art === row.approvedReference || art === row.reference)) {
          problems.push("story-uses-selected-art:" + id);
        }
      });
    }
    var appearance = String(character && (character.appearance || character.clothing) || "");
    if (!appearance) problems.push("story-incomplete:" + id);
    if (problems.length) return { entry: entry, problems: problems };
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
    return { entry: entry, problems: [] };
  }

  function buildRegistry(input) {
    var source = input || {};
    var members = Array.isArray(source.members) ? source.members : [];
    var saved = source.savedReferences || [];
    var shared = source.sharedCharacters || [];
    var problems = [];
    var selected = [];
    members.forEach(function (member) {
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
      var accountId = String(source.accountId || "");
      if (kind === "wondii-crew" || (!kind && crew)) locked = lockCrew(member);
      else if (kind === "shared" || (!kind && sharedRow)) locked = lockRecord(member, "shared", sharedRow || savedRecord, accountId);
      else if (kind === "saved" || (!kind && savedRecord)) locked = lockRecord(member, "saved", savedRecord, accountId);
      else if (crew) locked = lockCrew(member);
      else {
        problems.push("unknown-character:" + id);
        return;
      }
      problems = problems.concat(locked.problems);
      selected.push(locked.entry);
    });
    var story = [];
    (source.storyCharacters || []).forEach(function (character) {
      var made = lockStory(character, selected);
      problems = problems.concat(made.problems);
      if (!made.problems.length) story.push(made.entry);
    });
    if (!selected.length) problems.push("cast-size");
    var registry = selected.concat(story);
    return {
      ok: problems.length === 0,
      problems: problems.filter(function (problem, index) { return problems.indexOf(problem) === index; }),
      registry: registry,
      selected: selected,
      illustration: illustrationPlan(registry, source.pages || [])
    };
  }

  function assignPages(registry, pages) {
    (registry || []).forEach(function (row) { row.pages = []; });
    (pages || []).forEach(function (page) {
      var pageId = String(page && (page.pageId || page.id) || "");
      (page && page.charactersPresent || []).forEach(function (id) {
        var row = (registry || []).filter(function (item) { return item.characterId === id || item.journeyId === id; })[0];
        if (row && pageId && row.pages.indexOf(pageId) < 0) row.pages.push(pageId);
      });
    });
  }

  function pageReferences(registry, present) {
    var files = [];
    var limitations = [];
    var seen = {};
    (present || []).forEach(function (id) {
      var row = (registry || []).filter(function (item) { return item.characterId === id || item.journeyId === id; })[0];
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
        file: file,
        approved: row.referenceApproved === true,
        reliable: row.reliable === true,
        usable: true,
        privateArt: row.privateArt === true,
        ownerId: row.ownerId || "",
        version: row.referenceVersion || file
      });
    });
    return {
      ok: files.length === (present || []).length && !limitations.some(function (item) { return item.indexOf("wrong-artwork:") === 0 || item.indexOf("shared-artwork:") === 0 || item.indexOf("missing:") === 0 || item.indexOf("no-artwork:") === 0; }),
      files: files,
      limitations: limitations,
      reliable: files.length > 0 && files.every(function (file) { return file.reliable; }) && limitations.length === 0
    };
  }

  function artApi() {
    if (root && root.WondiiArtDirection) return root.WondiiArtDirection;
    try { return require("./book-art-direction.js"); } catch (e) { return null; }
  }

  function artDirectionFor(pages) {
    var art = artApi();
    var hasText = (pages || []).some(function (page) { return page && (page.text || page.prose); });
    if (!art || !hasText) return null;
    try { return art.directBook({ pages: pages }); } catch (e) { return null; }
  }

  function illustrationPlan(registry, pages) {
    assignPages(registry, pages);
    var directed = artDirectionFor(pages);
    var spreads = (pages || []).map(function (page, index) {
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
    var selected = (registry || []).filter(function (row) { return row.source !== "story-generated"; });
    var together = spreads.some(function (spread) {
      return spread.references.filter(function (file) {
        var row = selected.filter(function (item) { return item.characterId === file.characterId; })[0];
        return !!row;
      }).length >= 2;
    });
    var limitations = [];
    selected.forEach(function (row) {
      if (row.limitation) limitations.push(row.limitation);
    });
    return {
      spreads: spreads,
      multiCharacter: together,
      visuallyReviewed: false,
      solved: false,
      reliableReproduction: selected.length > 0 && selected.every(function (row) { return row.reliable === true; }) && limitations.length === 0,
      consistencyPromised: false,
      blocksGeneration: selected.some(function (row) { return row.blocksGeneration === true; }) || spreads.some(function (spread) { return spread.limitations.length > 0; }),
      reviewPath: "vision-check-and-one-repair",
      limitations: limitations,
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
    var allowed = (owner && (who.ownerId === owner || who.userId === owner)) || (share && who.shareId === share);
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
      key: key,
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
    passes.forEach(function (pass) {
      pass.forEach(function (file) { if (file && file.characterId) covered[file.characterId] = true; });
    });
    var omitted = list.filter(function (file) {
      return file && file.characterId && !covered[file.characterId];
    }).map(function (file) { return file.characterId; });
    return { passes: passes, omitted: omitted, limit: size };
  }

  function prepareScene(registry, present, viewer, store) {
    var plan = pageReferences(registry, present);
    var prepared = [];
    var problems = plan.limitations.slice();
    plan.files.forEach(function (file) {
      var entry = (registry || []).filter(function (row) { return row.characterId === file.characterId; })[0] || file;
      var cached = prepareReference(entry, viewer, store);
      if (!cached.ok) {
        problems.push((cached.reason || "inaccessible") + ":" + file.characterId);
        return;
      }
      prepared.push(Object.assign({}, file, { reused: cached.reused, version: cached.version, file: cached.file || file.file }));
    });
    var passes = scenePasses(prepared);
    return {
      ok: plan.ok && problems.every(function (item) { return item.indexOf("inaccessible:") !== 0 && item.indexOf("identity-before-scene:") !== 0 && item.indexOf("no-artwork:") !== 0 && item.indexOf("missing:") !== 0 && item.indexOf("wrong-artwork:") !== 0; }),
      files: prepared,
      passes: passes.passes,
      omitted: passes.omitted,
      limitations: problems,
      blocksGeneration: !plan.ok || passes.omitted.length > 0 || problems.some(function (item) { return item.indexOf("inaccessible:") === 0 || item.indexOf("no-artwork:") === 0 || item.indexOf("missing:") === 0; }),
      consistencyPromised: false
    };
  }

  return {
    BIBLE_PAIR: BIBLE_PAIR,
    SCENE_REFERENCE_LIMIT: SCENE_REFERENCE_LIMIT,
    ownedPortrait: ownedPortrait,
    buildRegistry: buildRegistry,
    pageReferences: pageReferences,
    illustrationPlan: illustrationPlan,
    prepareReference: prepareReference,
    prepareScene: prepareScene,
    scenePasses: scenePasses,
    clearCache: function () { memory = {}; }
  };
});
