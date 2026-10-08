/* Shared Wondii Home. One page for every account.
   School tools appear only when the role can teach.
   This file does not invent counts, pupils, or progress. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiPortalHomeModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var EXAMPLES = [
    "Create a story about a dragon who can't fly...",
    "Make a game about the planets...",
    "Build a puzzle beneath the ocean..."
  ];
  var SCHOOL_EXAMPLES = [
    "Teach Year 3 why volcanoes erupt..."
  ];

  var SURPRISES = [
    { id: "dragon", mode: "story", title: "The dragon who can't fly", text: "A young dragon discovers another way to join the sky.", emoji: "🐉" },
    { id: "planets", mode: "game", title: "Mission to Mars", text: "Explore what gravity is like on different planets.", emoji: "🚀" },
    { id: "ocean", mode: "puzzle", title: "Beneath the ocean", text: "A puzzle path through a quiet coral reef.", emoji: "🐚" },
    { id: "dino", mode: "story", title: "Afraid of the dark", text: "A dinosaur who is scared of the dark finds one friendly light.", emoji: "🦕" }
  ];
  var SCHOOL_SURPRISES = [
    { id: "volcano", mode: "adventure", title: "Why volcanoes erupt", text: "Teach Year 3 why volcanoes erupt.", emoji: "🌋" }
  ];

  var DISCOVERY = [
    { id: "stars", characterId: "wondii-maya", title: "Why do stars shine?", line: "I've always wondered this!", mode: "story", prompt: "A story about why stars shine", href: "" },
    { id: "ocean-floor", characterId: "wondii-arlo", title: "Journey to the ocean floor", line: "Let's see what lives down there.", mode: "story", prompt: "An adventure beneath the ocean", href: "" },
    { id: "planets", characterId: "wondii-leo", title: "A game about planets", line: "Ready to try the first level?", mode: "game", prompt: "A game about the planets", href: "" },
    { id: "reef", characterId: "wondii-zara", title: "A puzzle in the reef", line: "Full of colourful ideas.", mode: "puzzle", prompt: "", href: "#puzzles" }
  ];
  var SCHOOL_DISCOVERY = [
    { id: "volcanoes", characterId: "wondii-theo", title: "Why volcanoes erupt", line: "A learning adventure for Year 3.", mode: "adventure", prompt: "Teach Year 3 why volcanoes erupt", href: "" }
  ];

  function greeting(date, name) {
    var hour = date && date.getHours ? date.getHours() : 12;
    var hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    var who = String(name || "").trim();
    return who ? hello + ", " + who : hello;
  }

  function supportLine(caps, context) {
    var info = context || {};
    if (caps && caps.canManageClasses && info.className) {
      var bits = [info.year, info.className].filter(Boolean);
      var line = bits.join(" · ");
      if (typeof info.pupils === "number") line += (line ? " · " : "") + info.pupils + (info.pupils === 1 ? " pupil" : " pupils");
      return line;
    }
    if (caps && caps.workspaceKind === "school" && info.schoolName) return info.schoolName;
    return "Ready to create something amazing?";
  }

  function creationModes(caps) {
    var modes = [
      { id: "story", label: "Story", emoji: "📖" },
      { id: "game", label: "Game", emoji: "🎮" },
      { id: "puzzle", label: "Puzzle", emoji: "🧩" },
      { id: "surprise", label: "Surprise me", emoji: "✨" }
    ];
    if (caps && caps.canCreateLearningAdventure) {
      modes.splice(3, 0, { id: "adventure", label: "Learning Adventure", emoji: "🎓" });
    }
    return modes;
  }

  function launchUrl(mode, prompt) {
    var text = String(prompt || "").trim().slice(0, 280);
    var query = text ? "&idea=" + encodeURIComponent(text) : "";
    if (mode === "game") return "games/prompt-game.html" + (text ? "?idea=" + encodeURIComponent(text) : "");
    if (mode === "puzzle") return "#puzzles";
    if (mode === "adventure") return "schools/learn/create.html" + (text ? "?idea=" + encodeURIComponent(text) : "");
    return "games/storybook.html?create=1" + query;
  }

  function examples(caps) {
    var list = EXAMPLES.slice();
    if (caps && caps.canCreateLearningAdventure) list = list.concat(SCHOOL_EXAMPLES);
    return list;
  }

  function surpriseBank(caps) {
    var list = SURPRISES.slice();
    if (caps && caps.canCreateLearningAdventure) list = list.concat(SCHOOL_SURPRISES);
    return list;
  }

  function surpriseAt(caps, index) {
    var bank = surpriseBank(caps);
    var at = Math.abs(Number(index) || 0) % bank.length;
    return bank[at];
  }

  function bookMeta(book) {
    var pages = book && Array.isArray(book.pages) ? book.pages.length : 0;
    return pages ? pages + (pages === 1 ? " page" : " pages") : "Story";
  }

  function continueItems(input) {
    var source = input || {};
    var items = [];
    (source.sessions || []).forEach(function (session) {
      if (!session || !session.title || session.demo === true) return;
      items.push({
        id: "session:" + (session.id || session.code || session.title),
        type: "Learning Adventure",
        title: session.title,
        meta: session.status || "Class session",
        href: session.href || "#results",
        cover: "",
        action: "Continue"
      });
    });
    (source.books || []).forEach(function (book) {
      if (!book || !book.id || !book.title) return;
      items.push({
        id: "book:" + book.id,
        type: "Story",
        title: book.title,
        meta: bookMeta(book),
        href: "games/storybook.html?book=" + encodeURIComponent(book.id),
        cover: book.cover || "",
        action: "Continue"
      });
    });
    (source.adventures || []).forEach(function (item) {
      if (!item || !item.title) return;
      var meta = [item.year, item.subject, item.status].filter(Boolean).join(" · ");
      items.push({
        id: "adventure:" + (item.id || item.title),
        type: "Learning Adventure",
        title: item.title,
        meta: meta || "Learning Adventure",
        href: item.href || "schools/learn/create.html?library=1",
        cover: "",
        action: "Open"
      });
    });
    return items.slice(0, 8);
  }

  function characterShelf(saved, crew) {
    var mine = (saved || []).filter(function (row) { return row && row.id && row.name; }).slice(0, 5);
    var seen = {};
    mine.forEach(function (row) { seen[row.id] = true; });
    var people = mine.map(function (row) {
      return {
        id: row.id,
        name: row.name,
        type: "workspace",
        href: "#characters",
        artwork: row.reference || row.artwork || row.image || ""
      };
    });
    (crew || []).forEach(function (row) {
      if (people.length >= 5 || !row || seen[row.id]) return;
      people.push({ id: row.id, name: row.name, type: "system", trait: row.trait, href: "#characters" });
    });
    return people;
  }

  function creations(input) {
    var source = input || {};
    var items = [];
    (source.books || []).forEach(function (book) {
      if (!book || !book.id || !book.title) return;
      items.push({
        id: book.id,
        type: "Story",
        title: book.title,
        meta: bookMeta(book),
        href: "games/storybook.html?book=" + encodeURIComponent(book.id),
        cover: book.cover || "",
        action: "Open"
      });
    });
    (source.adventures || []).forEach(function (item) {
      if (!item || !item.title) return;
      items.push({
        id: item.id || item.title,
        type: "Learning Adventure",
        title: item.title,
        meta: [item.year, item.subject].filter(Boolean).join(" · ") || "Learning Adventure",
        href: item.href || "#library",
        cover: "",
        action: "Open"
      });
    });
    return items.slice(0, 12);
  }

  function discovery(caps, crew) {
    var list = DISCOVERY.slice();
    if (caps && caps.canCreateLearningAdventure) list = list.concat(SCHOOL_DISCOVERY);
    var byId = {};
    (crew || []).forEach(function (row) { byId[row.id] = row; });
    return list.map(function (item) {
      var person = byId[item.characterId];
      var href = item.href || launchUrl(item.mode, item.prompt);
      return {
        id: item.id,
        characterId: item.characterId,
        characterName: person ? person.name : "",
        title: item.title,
        line: item.line,
        href: href,
        action: "Explore"
      };
    });
  }

  function worldDestinations(caps) {
    var places = [
      { id: "stories", label: "Stories", place: "Story Castle", href: "#stories" },
      { id: "characters", label: "Characters", place: "Character Forest", href: "#characters" },
      { id: "games", label: "Games", place: "Games Arcade", href: "#games" },
      { id: "puzzles", label: "Puzzles", place: "Puzzle Cave", href: "#puzzles" }
    ];
    if (caps && caps.canManageClasses) {
      places.push({ id: "classes", label: "Classes", place: "Class HQ", href: "#classes" });
    }
    return places;
  }

  function classSummary(classes) {
    var rooms = (classes || []).filter(function (room) { return room && (room.name || room.yearLabel); });
    if (!rooms.length) return { empty: true, rooms: [] };
    return {
      empty: false,
      rooms: rooms.slice(0, 3).map(function (room) {
        var pupils = Array.isArray(room.pupils) ? room.pupils.length : null;
        return {
          id: room.id || "",
          name: room.name || room.yearLabel || "Class",
          year: room.yearLabel || "",
          pupils: pupils,
          href: room.id ? "schools/learn/class.html?id=" + encodeURIComponent(room.id) : "#classes"
        };
      })
    };
  }

  function weekActivity(sessions, now) {
    var clock = now && now.getTime ? now.getTime() : Date.now();
    var since = clock - 7 * 24 * 60 * 60 * 1000;
    return (sessions || []).filter(function (session) {
      if (!session || session.demo === true || !session.title) return false;
      var when = Date.parse(session.createdAt || "");
      return !when || when >= since;
    }).slice(0, 4).map(function (session) {
      var row = {
        title: session.title,
        status: session.status || "",
        href: session.href || "#results"
      };
      if (typeof session.completed === "number" && typeof session.total === "number" && session.total > 0) {
        row.completed = session.completed;
        row.total = session.total;
      }
      return row;
    });
  }

  function contextStats(input) {
    var source = input || {};
    var stats = [];
    var books = source.books || [];
    var adventures = source.adventures || [];
    if (books.length) stats.push(books.length + (books.length === 1 ? " story" : " stories"));
    if (adventures.length) stats.push(adventures.length + (adventures.length === 1 ? " adventure" : " adventures"));
    var pupils = 0;
    var counted = false;
    (source.classes || []).forEach(function (room) {
      if (room && Array.isArray(room.pupils)) {
        pupils += room.pupils.length;
        counted = true;
      }
    });
    if (counted && pupils) stats.push(pupils + (pupils === 1 ? " pupil" : " pupils"));
    return stats;
  }

  function searchItems(input, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) return [];
    var source = input || {};
    var hits = [];
    function add(item) {
      if (!item || !item.title || hits.length >= 8) return;
      var hay = (item.title + " " + (item.meta || "") + " " + (item.type || "")).toLowerCase();
      if (hay.indexOf(q) < 0) return;
      hits.push(item);
    }
    (source.books || []).forEach(function (book) {
      add({ title: book.title, type: "Story", href: "games/storybook.html?book=" + encodeURIComponent(book.id || "") });
    });
    (source.games || []).forEach(function (game) {
      add({ title: game.title, type: "Game", meta: game.desc || "", href: game.href });
    });
    (source.puzzles || []).forEach(function (puzzle) {
      add({ title: puzzle.title, type: "Puzzle", href: puzzle.href || "#puzzles" });
    });
    (source.characters || []).forEach(function (person) {
      add({ title: person.name, type: "Character", href: "#characters" });
    });
    (source.adventures || []).forEach(function (item) {
      add({ title: item.title, type: "Learning Adventure", href: item.href || "#library" });
    });
    (source.classes || []).forEach(function (room) {
      add({ title: room.name || room.yearLabel, type: "Class", href: room.id ? "schools/learn/class.html?id=" + encodeURIComponent(room.id) : "#classes" });
    });
    return hits;
  }

  function cameo(crew, index) {
    var list = crew || [];
    if (!list.length) return null;
    var at = Math.abs(Number(index) || 0) % list.length;
    var person = list[at];
    return {
      id: person.id,
      name: person.name,
      line: person.id === "wondii-maya" ? "How about an adventure beneath the ocean?" : person.description || ""
    };
  }

  return {
    greeting: greeting,
    supportLine: supportLine,
    creationModes: creationModes,
    launchUrl: launchUrl,
    examples: examples,
    surpriseAt: surpriseAt,
    continueItems: continueItems,
    characterShelf: characterShelf,
    creations: creations,
    discovery: discovery,
    worldDestinations: worldDestinations,
    classSummary: classSummary,
    weekActivity: weekActivity,
    contextStats: contextStats,
    searchItems: searchItems,
    cameo: cameo
  };
});
