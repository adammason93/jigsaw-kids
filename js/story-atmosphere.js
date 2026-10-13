/* Living story atmosphere. Maps story metadata to a preset.
   No rendering, no network, no paid generation. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiStoryAtmosphere = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PRESETS = {
    magical: { theme: "magical", label: "Magical", sky: ["#24143a", "#100818"], glow: "rgba(255, 196, 110, 0.42)", cool: "rgba(150, 120, 210, 0.14)", particle: "sparkle", ink: "rgba(255, 228, 170, 0.9)", ink2: "rgba(255, 244, 220, 0.7)" },
    forest: { theme: "forest", label: "Forest", sky: ["#163028", "#0c1814"], glow: "rgba(186, 214, 120, 0.22)", cool: "rgba(255, 196, 110, 0.16)", particle: "firefly", ink: "rgba(230, 255, 170, 0.75)", ink2: "rgba(255, 236, 180, 0.55)" },
    space: { theme: "space", label: "Space", sky: ["#12182e", "#070912"], glow: "rgba(140, 170, 255, 0.2)", cool: "rgba(90, 70, 160, 0.18)", particle: "star", ink: "rgba(245, 248, 255, 0.9)", ink2: "rgba(190, 210, 255, 0.7)" },
    ocean: { theme: "ocean", label: "Ocean", sky: ["#12344a", "#071820"], glow: "rgba(140, 210, 220, 0.22)", cool: "rgba(80, 160, 200, 0.16)", particle: "bubble", ink: "rgba(220, 245, 255, 0.55)", ink2: "rgba(180, 230, 240, 0.4)" },
    dinosaur: { theme: "dinosaur", label: "Dinosaurs", sky: ["#3a2a18", "#140e0a"], glow: "rgba(255, 170, 80, 0.28)", cool: "rgba(180, 120, 60, 0.12)", particle: "dust", ink: "rgba(255, 214, 160, 0.45)", ink2: "rgba(220, 180, 120, 0.3)" },
    adventure: { theme: "adventure", label: "Adventure", sky: ["#3a2040", "#140e18"], glow: "rgba(255, 150, 80, 0.32)", cool: "rgba(120, 160, 200, 0.12)", particle: "mist", ink: "rgba(255, 220, 180, 0.28)", ink2: "rgba(255, 180, 120, 0.18)" },
    bedtime: { theme: "bedtime", label: "Bedtime", sky: ["#1a1c36", "#0c0e1c"], glow: "rgba(190, 206, 255, 0.2)", cool: "rgba(255, 220, 170, 0.08)", particle: "star", ink: "rgba(235, 240, 255, 0.75)", ink2: "rgba(255, 236, 200, 0.4)" },
    snow: { theme: "snow", label: "Snow", sky: ["#243044", "#101820"], glow: "rgba(210, 226, 245, 0.2)", cool: "rgba(160, 190, 220, 0.12)", particle: "snow", ink: "rgba(255, 255, 255, 0.8)", ink2: "rgba(220, 232, 245, 0.55)" },
    jungle: { theme: "jungle", label: "Jungle", sky: ["#143024", "#0a1810"], glow: "rgba(120, 180, 90, 0.22)", cool: "rgba(255, 200, 90, 0.1)", particle: "leaf", ink: "rgba(170, 210, 110, 0.55)", ink2: "rgba(90, 150, 70, 0.4)" },
    default: { theme: "default", label: "Wondii", sky: ["#2c2234", "#120e16"], glow: "rgba(255, 196, 130, 0.34)", cool: "rgba(126, 156, 210, 0.16)", particle: "sparkle", ink: "rgba(255, 244, 220, 0.85)", ink2: "rgba(255, 210, 140, 0.7)" }
  };

  var PLACE = {
    woods: "forest",
    garden: "forest",
    meadow: "forest",
    treehouse: "forest",
    campsite: "forest",
    greenhouse: "forest",
    farm: "forest",
    zoo: "forest",
    jungle: "jungle",
    space: "space",
    sea: "ocean",
    undersea: "ocean",
    lake: "ocean",
    beach: "ocean",
    swimmingpool: "ocean",
    pirateship: "adventure",
    island: "adventure",
    snow: "snow",
    icerink: "snow",
    bedroom: "bedtime",
    castle: "magical",
    cave: "magical",
    savannah: "dinosaur",
    desert: "dinosaur",
    volcano: "dinosaur"
  };

  var THEME = {
    magic: "magical",
    magical: "magical",
    fantasy: "magical",
    space: "space",
    adventure: "adventure",
    animals: "forest",
    nature: "forest",
    forest: "forest",
    ocean: "ocean",
    sea: "ocean",
    dinosaur: "dinosaur",
    dinosaurs: "dinosaur",
    prehistoric: "dinosaur",
    pirate: "adventure",
    pirates: "adventure",
    bedtime: "bedtime",
    snow: "snow",
    winter: "snow",
    jungle: "jungle"
  };

  var KEYWORDS = [
    ["dinosaur", ["dinosaur", "dinosaurs", "prehistoric", "fossil"]],
    ["space", ["space", "planet", "rocket", "galaxy", "astronaut"]],
    ["ocean", ["ocean", "undersea", "underwater", "under the sea"]],
    ["adventure", ["pirate", "pirates", "pirate ship"]],
    ["snow", ["snow", "snowy", "winter", "ice rink"]],
    ["jungle", ["jungle", "rainforest"]],
    ["forest", ["forest", "woods", "garden", "meadow", "treehouse"]],
    ["bedtime", ["bedtime", "bedroom"]],
    ["magical", ["magic", "magical", "castle", "fantasy", "fairy", "wizard"]]
  ];

  function text(value) {
    return String(value || "").trim().toLowerCase();
  }

  function pack(theme, source) {
    var preset = PRESETS[theme] || PRESETS.default;
    return { theme: preset.theme, label: preset.label, source: source };
  }

  function hasWord(hay, word) {
    var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    return new RegExp("(?:^|[^a-z])" + escaped + "(?:$|[^a-z])").test(hay);
  }

  function matchValue(value) {
    var raw = text(value);
    if (!raw) return "";
    if (PLACE[raw]) return PLACE[raw];
    if (THEME[raw]) return THEME[raw];
    var i;
    var k;
    for (i = 0; i < KEYWORDS.length; i += 1) {
      var words = KEYWORDS[i][1];
      for (k = 0; k < words.length; k += 1) {
        if (hasWord(raw, words[k])) return KEYWORDS[i][0];
      }
    }
    return "";
  }

  function resolve(story) {
    var book = story || {};
    var stored = book.atmosphere && book.atmosphere.theme;
    if (PRESETS[stored]) return pack(stored, "stored");
    var fields = [
      ["theme", book.theme],
      ["theme", book.genre],
      ["theme", book.tone],
      ["place", book.place || book.setting],
      ["environment", book.environment],
      ["plot", book.plot || book.idea || book.plotHint]
    ];
    var i;
    for (i = 0; i < fields.length; i += 1) {
      var hit = matchValue(fields[i][1]);
      if (hit) return pack(hit, fields[i][0]);
    }
    return pack("default", "default");
  }

  function preset(theme) {
    return PRESETS[theme] ? Object.assign({}, PRESETS[theme]) : Object.assign({}, PRESETS.default);
  }

  function themes() {
    return Object.keys(PRESETS);
  }

  function enabled() {
    if (typeof window === "undefined") return true;
    if (window.WONDII_STORY_ATMOSPHERE === false) return false;
    try {
      var flag = new URLSearchParams(window.location.search).get("atmosphere");
      if (flag === "0" || flag === "off" || flag === "false") return false;
    } catch (error) {
      return true;
    }
    return true;
  }

  return {
    resolve: resolve,
    preset: preset,
    themes: themes,
    enabled: enabled
  };
});
