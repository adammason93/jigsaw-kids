/* Standalone game platform. Not the classroom session engine.
   Lesson mechanics stay in mechanic-core.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiGamePlatform = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var STATES = { SETUP: "setup", READY: "ready", PLAYING: "playing", PAUSED: "paused", COMPLETE: "complete", ERROR: "error" };

  var GAMES = [
    { id: "jigsaw", title: "Picture Jigsaw", description: "Put the pieces together to complete fun pictures.", route: "games/jigsaw.html", category: "standalone", art: "games/images/portal/jigsaw.jpg", cats: ["puzzles"], status: "legacy", shell: "v1", input: "pointer", score: "moves" },
    { id: "colouring", title: "Colouring Book", description: "Choose a picture and bring it to life with colours.", route: "games/colouring.html", category: "standalone", art: "games/images/portal/colouring.png", cats: ["creative"], status: "current", shell: "v2", input: "pointer", score: "none", help: "Pick a colour and draw. Saving keeps the picture on this account." },
    { id: "storybook", title: "Your Story", description: "Create your own story with your name and characters.", route: "games/storybook.html?create=1", category: "story", art: "games/images/portal/storybook-nook.jpg", cats: ["stories", "creative"], status: "legacy", shell: "none", input: "pointer", score: "none" },
    { id: "characters", title: "My Characters", description: "Turn a photo into a cuddly clay cartoon buddy.", route: "characters.html", category: "story", art: "", cats: ["stories", "creative"], status: "legacy", shell: "none", input: "pointer", score: "none" },
    { id: "prompt-game", title: "Make a 3D Game", description: "Describe a game and watch it come to life.", route: "games/prompt-game.html", category: "standalone", art: "games/images/portal/prompt-game.svg", cats: ["creative"], status: "legacy", shell: "v1", input: "pointer", score: "none" },
    { id: "star-catcher", title: "Star Catcher", description: "Catch the stars and beat your score!", route: "games/star-catcher.html", category: "standalone", art: "games/images/portal/star-catcher.svg", cats: ["arcade"], status: "legacy", shell: "v1", input: "pointer", score: "points" },
    { id: "math-race", title: "Number Path", description: "Race along the path by solving sums.", route: "games/math-race.html", category: "standalone", art: "games/images/math-race-park-wide.png", cats: ["racing", "puzzles"], status: "legacy", shell: "v1", input: "pointer", score: "points" },
    { id: "memory", title: "Memory Match", description: "Find the pairs and clear the board!", route: "games/memory.html", category: "standalone", art: "games/images/portal/memory.png", cats: ["puzzles", "classic"], status: "current", shell: "v2", input: "pointer", score: "moves", help: "Turn two cards. Matching pairs stay open. Clear the board." },
    { id: "snakes-ladders", title: "Snakes & Ladders", description: "Roll the dice, climb up and slide down.", route: "games/snakes-ladders.html", category: "standalone", art: "games/images/portal/snakes-ladders.png", cats: ["classic"], status: "legacy", shell: "v1", input: "pointer", score: "race" },
    { id: "noughts-crosses", title: "Noughts & Crosses", description: "Get three in a row to win.", route: "games/noughts-crosses.html", category: "standalone", art: "games/images/portal/noughts-crosses.png", cats: ["classic"], status: "current", shell: "v2", input: "pointer", score: "wins", help: "Take turns. Get three in a line, column, or diagonal." },
    { id: "connect-four", title: "Connect 4", description: "Drop your counters and line up four.", route: "games/connect-four.html", category: "standalone", art: "games/images/portal/connect-four.png", cats: ["classic"], status: "legacy", shell: "v1", input: "pointer", score: "wins" },
    { id: "word-search", title: "Word Search", description: "Hunt for hidden words in the grid.", route: "games/word-search.html", category: "standalone", art: "games/images/portal/word-search.png", cats: ["puzzles"], status: "current", shell: "v2", input: "pointer", score: "grids", help: "Drag in a straight line across a word, then let go." },
    { id: "snap", title: "Snap", description: "Watch the cards and shout snap first!", route: "games/snap.html", category: "standalone", art: "games/images/portal/snap.png", cats: ["classic"], status: "legacy", shell: "v1", input: "pointer", score: "wins" },
    { id: "rps", title: "Rock Paper Scissors", description: "Pick your hand and beat the computer.", route: "games/rock-paper-scissors.html", category: "standalone", art: "games/images/portal/rock-paper-scissors-card.png", cats: ["classic"], status: "legacy", shell: "v1", input: "pointer", score: "wins" },
    { id: "snake", title: "Snake", description: "Munch the snacks and grow super long.", route: "games/snake-arcade.html", category: "standalone", art: "games/images/portal/snake-portal.png", cats: ["arcade"], status: "current", shell: "v2", input: "keyboard", score: "points", help: "Use the arrows or the on-screen buttons. Pause when you need a break. A refresh starts a new game." },
    { id: "zuma", title: "Zuma", description: "Shoot the balls and match the colours.", route: "games/zuma.html", category: "standalone", art: "games/images/portal/zuma-portal.png", cats: ["arcade"], status: "legacy", shell: "v1", input: "pointer", score: "points" },
    { id: "marble-tilt", title: "Marble Maze", description: "Tilt and roll the marble to the goal.", route: "games/marble-tilt.html", category: "standalone", art: "games/images/portal/marble-tilt.svg", cats: ["arcade", "puzzles"], status: "legacy", shell: "v1", input: "pointer", score: "none" },
    { id: "link-grid", title: "Link Grid", description: "Join the matching dots without crossing.", route: "games/link-grid.html", category: "standalone", art: "games/images/portal/link-grid.svg", cats: ["puzzles"], status: "legacy", shell: "v1", input: "pointer", score: "levels" },
    { id: "block-stack", title: "Block Stack", description: "Stack the falling blocks and clear lines.", route: "games/block-stack.html", category: "standalone", art: "games/images/portal/block-stack.svg", cats: ["puzzles", "arcade"], status: "legacy", shell: "v1", input: "pointer", score: "points" },
    { id: "runner", title: "Runner", description: "Run and jump along the path.", route: "games/runner.html", category: "standalone", art: "", cats: ["arcade"], status: "legacy", shell: "v1", input: "keyboard", score: "points", listed: false }
  ];

  function byId(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  function catalogue() {
    return GAMES.filter(function (game) {
      return game.listed !== false && (game.category === "standalone" || game.category === "story");
    });
  }

  function portalCards() {
    return catalogue().map(function (game) {
      var card = {
        id: game.id,
        title: game.title,
        desc: game.description,
        href: game.route,
        cats: game.cats.slice(),
        status: game.status,
        shell: game.shell
      };
      if (game.art) card.img = game.art;
      else card.emoji = "🎭";
      return card;
    });
  }

  function transition(state, event) {
    var next = state || STATES.SETUP;
    if (event === "ready") next = STATES.READY;
    else if (event === "play") next = STATES.PLAYING;
    else if (event === "pause" && next === STATES.PLAYING) next = STATES.PAUSED;
    else if (event === "resume" && next === STATES.PAUSED) next = STATES.PLAYING;
    else if (event === "complete") next = STATES.COMPLETE;
    else if (event === "error") next = STATES.ERROR;
    else if (event === "restart") next = STATES.SETUP;
    else if (event === "destroy") next = STATES.SETUP;
    return next;
  }

  function result(fields) {
    fields = fields || {};
    var out = { completedAt: fields.completedAt || new Date().toISOString() };
    ["outcome", "score", "winner", "duration", "moves", "difficulty"].forEach(function (key) {
      if (fields[key] != null && fields[key] !== "") out[key] = fields[key];
    });
    return out;
  }

  function scopedKey(uid, key) {
    if (!uid || !key) return null;
    return "wondii-u:" + uid + ":" + key;
  }

  function readAccount(storage, uid, key) {
    var name = scopedKey(uid, key);
    if (!name || !storage) return null;
    return storage.getItem(name);
  }

  function writeAccount(storage, uid, key, value) {
    var name = scopedKey(uid, key);
    if (!name || !storage) return false;
    storage.setItem(name, String(value));
    return true;
  }

  function prefersReduced(matches) {
    return !!matches;
  }

  function createContract(spec) {
    spec = spec || {};
    if (!spec.id || !spec.title) return { ok: false, error: "missing" };
    var known = byId(spec.id);
    return {
      ok: true,
      game: {
        id: spec.id,
        title: spec.title,
        category: spec.category || (known && known.category) || "standalone",
        description: spec.description || (known && known.description) || "",
        help: spec.help || (known && known.help) || "",
        score: spec.score || (known && known.score) || "none",
        state: STATES.SETUP
      }
    };
  }

  return {
    STATES: STATES,
    games: function () { return GAMES.slice(); },
    byId: byId,
    catalogue: catalogue,
    portalCards: portalCards,
    transition: transition,
    result: result,
    scopedKey: scopedKey,
    readAccount: readAccount,
    writeAccount: writeAccount,
    prefersReduced: prefersReduced,
    createContract: createContract
  };
});
