/* One character library for the school portal, books, and later Wondii products.
   Canonical cast comes from the character bible. Saved characters come from
   the signed-in account's existing character store. This file does not save,
   copy, or delete records. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiCharacterLibrary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var COLOURS = [
    ["yellow", "#f6c445"],
    ["orange", "#ef8b3a"],
    ["green", "#3f9d62"],
    ["purple", "#7d5caf"],
    ["blue", "#4c78c8"],
    ["red", "#d4534b"]
  ];

  function personalityLine(character) {
    var traits = character && character.personality ? character.personality : [];
    if (!traits.length) return "";
    if (traits.length === 1) return traits[0];
    return traits.slice(0, -1).join(", ") + " and " + traits[traits.length - 1];
  }

  function accentFrom(text) {
    var lower = String(text || "").toLowerCase();
    var i;
    for (i = 0; i < COLOURS.length; i++) {
      if (lower.indexOf(COLOURS[i][0]) >= 0) return COLOURS[i][1];
    }
    return "";
  }

  function canonicalEntry(character, reference) {
    var approved = reference && reference.status === "approved" && reference.file;
    return {
      id: character.characterId,
      name: character.name,
      source: "canonical",
      ownerId: "",
      artwork: approved ? reference.file : "",
      artworkFrame: approved && /maya-v1\.jpg$/.test(reference.file) ? "lineup" : "",
      accent: accentFrom(character.defaultClothing),
      description: personalityLine(character),
      clothing: character.defaultClothing || "",
      type: "",
      createdAt: "",
      eligibleForBooks: true,
      eligibleForAdventures: false
    };
  }

  function classroomEntry(record) {
    return {
      id: String(record.id),
      name: String(record.name || "Pupil"),
      source: "classroom",
      ownerId: String(record.ownerId || ""),
      classId: String(record.classId || ""),
      className: String(record.className || ""),
      artwork: String(record.artwork || ""),
      artworkFrame: "",
      accent: "",
      description: String(record.className || ""),
      clothing: "",
      type: "",
      createdAt: "",
      eligibleForBooks: false,
      eligibleForAdventures: false
    };
  }

  function savedEntry(record, ownerId) {
    var id = String(record.id);
    var reference = String(record.reference || (id ? "characters/" + id + ".png" : ""));
    var ownerType = record.ownerType === "school" || record.ownerType === "family" ? record.ownerType : "";
    return {
      id: id,
      name: String(record.name || "Character"),
      source: "saved",
      ownerType: ownerType,
      ownerId: String(record.ownerId || ownerId || ""),
      artwork: String(record.artwork || ""),
      artworkFrame: "",
      accent: "",
      description: "",
      clothing: "",
      reference: reference,
      type: record.type === "hero" || record.type === "buddy" ? record.type : "",
      createdAt: record.createdAt || "",
      eligibleForBooks: !!(id && reference),
      eligibleForAdventures: false
    };
  }

  function availableCharacters(options) {
    var input = options || {};
    var bible = input.bible;
    var ownerId = String(input.ownerId || "");
    var seen = {};
    var list = [];
    var canonical = bible && bible.listCharacters ? bible.listCharacters() : (input.canonical || []);
    canonical.forEach(function (character) {
      if (!character || !character.characterId || seen[character.characterId]) return;
      var reference = bible && bible.resolveReference ? bible.resolveReference(character.characterId) : null;
      seen[character.characterId] = true;
      list.push(canonicalEntry(character, reference));
    });
    (input.saved || []).forEach(function (record) {
      if (!record || !record.id || seen[record.id]) return;
      if (input.ownerType === "school" && !record.ownerId) return;
      if (input.ownerType && record.ownerType && record.ownerType !== input.ownerType) return;
      if (ownerId && record.ownerId && String(record.ownerId) !== ownerId) return;
      seen[record.id] = true;
      list.push(savedEntry(record, record.ownerId || ownerId));
    });
    (input.classroom || []).forEach(function (record) {
      if (!record || !record.id || seen[record.id]) return;
      if (ownerId && record.ownerId && String(record.ownerId) !== ownerId) return;
      seen[record.id] = true;
      list.push(classroomEntry(record));
    });
    return list;
  }

  /* A book keeps the existing character id. It does not store a second copy. */
  function bookSelection(entries, ids) {
    var chosen = [];
    var seen = {};
    (ids || []).forEach(function (id) {
      if (!id || seen[id]) return;
      var match = null;
      (entries || []).forEach(function (entry) {
        if (entry && entry.id === id) match = entry;
      });
      if (!match || !match.eligibleForBooks) return;
      seen[id] = true;
      chosen.push({ characterId: match.id });
    });
    return chosen;
  }

  function artworkSrc(file, fromGamesPage) {
    if (!file) return "";
    if (/^(https?:|blob:|data:)/i.test(file)) return file;
    if (fromGamesPage && file.indexOf("games/") === 0) return file.slice("games/".length);
    return file;
  }

  return {
    availableCharacters: availableCharacters,
    bookSelection: bookSelection,
    artworkSrc: artworkSrc
  };
});
