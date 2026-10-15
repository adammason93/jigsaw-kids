/* Optional personality for a saved character.
   Catalogue and crew lists stay as they are. This file does not draw
   and does not invent a trait for a character who has none. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiPersonality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CHOICES = [
    "brave", "curious", "kind", "funny", "adventurous", "shy", "clever", "playful",
    "creative", "helpful", "gentle", "confident", "mischievous", "thoughtful", "energetic", "imaginative"
  ];
  var HINTS = {
    brave: "they might step forward when something is uncertain",
    curious: "they might investigate something unusual",
    kind: "they might help another character",
    funny: "they might lighten a worry",
    adventurous: "they might choose the unexplored way",
    shy: "they might hang back, then join when they feel safe",
    clever: "they might notice a useful detail",
    playful: "they might make a game out of an obstacle",
    creative: "they might try an unusual solution",
    helpful: "they might take on a job for someone else",
    gentle: "they might move carefully around something small",
    confident: "they might decide and invite the others",
    mischievous: "they might try a cheeky shortcut",
    thoughtful: "they might pause and consider the others",
    energetic: "they might be the first to move",
    imaginative: "they might picture a way the others had not"
  };

  function choices() {
    return CHOICES.slice();
  }

  function label(trait) {
    var word = String(trait || "");
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
  }

  function cleanTraits(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      var word = String(item || "").trim().toLowerCase();
      if (CHOICES.indexOf(word) < 0 || out.indexOf(word) >= 0 || out.length >= 3) return;
      out.push(word);
    });
    return out;
  }

  function cleanDescription(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
  }

  function pack(input) {
    var traits = cleanTraits(Array.isArray(input) ? input : (input && input.traits));
    var description = cleanDescription(input && !Array.isArray(input) ? input.description : "");
    if (!traits.length && !description) return null;
    return { traits: traits, description: description };
  }

  function traitsOf(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item || "").trim(); }).filter(Boolean);
    }
    if (Array.isArray(value.traits)) {
      return value.traits.map(function (item) { return String(item || "").trim(); }).filter(Boolean);
    }
    return [];
  }

  function descriptionOf(value) {
    if (!value || Array.isArray(value)) return "";
    return cleanDescription(value.description);
  }

  function toggle(selected, trait) {
    var next = cleanTraits(selected);
    var word = String(trait || "").trim().toLowerCase();
    var at = next.indexOf(word);
    if (at >= 0) {
      next.splice(at, 1);
      return next;
    }
    if (next.length >= 3 || CHOICES.indexOf(word) < 0) return next;
    next.push(word);
    return next;
  }

  function hint(trait) {
    return HINTS[String(trait || "").trim().toLowerCase()] || "";
  }

  return {
    choices: choices,
    label: label,
    pack: pack,
    traitsOf: traitsOf,
    descriptionOf: descriptionOf,
    toggle: toggle,
    hint: hint
  };
});
