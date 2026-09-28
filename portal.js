/* Oovi portal: sidebar sections (home, stories, games, puzzles, learning, favourites) on one page. */
(function () {
  "use strict";

  var FAV_KEY = "portalFavourites";
  var SHELF_KEY = "jigsawKids_storybookShelf_v1";
  var STORY_URL = "games/storybook.html";
  var VIEWS = ["home", "stories", "games", "puzzles", "learning", "favourites", "search"];

  var GAMES = [
    { id: "jigsaw", title: "Picture Jigsaw", desc: "Put the pieces together to complete fun pictures.", href: "games/jigsaw.html", img: "games/images/portal/jigsaw.jpg", cats: ["puzzles"] },
    { id: "colouring", title: "Colouring Book", desc: "Choose a picture and bring it to life with colours.", href: "games/colouring.html", img: "games/images/portal/colouring.png", cats: ["creative"] },
    { id: "storybook", title: "Your Story", desc: "Create your own story with your name and characters.", href: "games/storybook.html?from=portal", img: "games/images/portal/storybook-nook.jpg", cats: ["stories", "creative"] },
    { id: "characters", title: "My Characters", desc: "Turn a photo into a cuddly clay cartoon buddy.", href: "characters.html", emoji: "🎭", cats: ["stories", "creative"] },
    { id: "prompt-game", title: "Make a 3D Game", desc: "Describe a game and watch it come to life.", href: "games/prompt-game.html", img: "games/images/portal/prompt-game.svg", cats: ["creative"] },
    { id: "star-catcher", title: "Star Catcher", desc: "Catch the stars and beat your score!", href: "games/star-catcher.html", img: "games/images/portal/star-catcher.svg", cats: ["arcade"] },
    { id: "math-race", title: "Number Path", desc: "Race along the path by solving sums.", href: "games/math-race.html", img: "games/images/math-race-park-wide.png", cats: ["racing", "puzzles"] },
    { id: "memory", title: "Memory Match", desc: "Find the pairs and clear the board!", href: "games/memory.html", img: "games/images/portal/memory.png", cats: ["puzzles", "classic"] },
    { id: "snakes-ladders", title: "Snakes & Ladders", desc: "Roll the dice, climb up and slide down.", href: "games/snakes-ladders.html", img: "games/images/portal/snakes-ladders.png", cats: ["classic"] },
    { id: "noughts-crosses", title: "Noughts & Crosses", desc: "Get three in a row to win.", href: "games/noughts-crosses.html", img: "games/images/portal/noughts-crosses.png", cats: ["classic"] },
    { id: "connect-four", title: "Connect 4", desc: "Drop your counters and line up four.", href: "games/connect-four.html", img: "games/images/portal/connect-four.png", cats: ["classic"] },
    { id: "word-search", title: "Word Search", desc: "Hunt for hidden words in the grid.", href: "games/word-search.html", img: "games/images/portal/word-search.png", cats: ["puzzles"] },
    { id: "snap", title: "Snap", desc: "Watch the cards and shout snap first!", href: "games/snap.html", img: "games/images/portal/snap.png", cats: ["classic"] },
    { id: "rps", title: "Rock Paper Scissors", desc: "Pick your hand and beat the computer.", href: "games/rock-paper-scissors.html", img: "games/images/portal/rock-paper-scissors-card.png", cats: ["classic"] },
    { id: "snake", title: "Snake", desc: "Munch the snacks and grow super long.", href: "games/snake-arcade.html", img: "games/images/portal/snake-portal.png", cats: ["arcade"] },
    { id: "zuma", title: "Zuma", desc: "Shoot the balls and match the colours.", href: "games/zuma.html", img: "games/images/portal/zuma-portal.png", cats: ["arcade"] },
    { id: "marble-tilt", title: "Marble Maze", desc: "Tilt and roll the marble to the goal.", href: "games/marble-tilt.html", img: "games/images/portal/marble-tilt.svg", cats: ["arcade", "puzzles"] },
    { id: "link-grid", title: "Link Grid", desc: "Join the matching dots without crossing.", href: "games/link-grid.html", img: "games/images/portal/link-grid.svg", cats: ["puzzles"] },
    { id: "drive-mad", title: "Drive Mad", desc: "Drive your truck over bumpy tracks.", href: "games/drive-mad.html", img: "games/images/portal/drive-mad.svg", cats: ["racing"] },
    { id: "block-stack", title: "Block Stack", desc: "Stack the falling blocks and clear lines.", href: "games/block-stack.html", img: "games/images/portal/block-stack.svg", cats: ["puzzles", "arcade"] },
  ];

  var GAME_CHIPS = [
    ["all", "All"], ["creative", "Creative"], ["puzzles", "Puzzles"], ["arcade", "Arcade"],
    ["racing", "Racing"], ["classic", "Classic"], ["stories", "Stories"],
  ];

  var PUZZLES = [
    { file: "unicorn.jpg", title: "Rainbow Unicorn", pieces: 12, cats: ["animals", "fantasy"] },
    { file: "puppy.jpg", title: "Happy Puppy", pieces: 6, cats: ["animals"] },
    { file: "rocket.jpg", title: "Space Rocket", pieces: 24, cats: ["vehicles"] },
    { file: "kitten.jpg", title: "Cosy Kitten", pieces: 12, cats: ["animals"] },
    { file: "sofia-tractor.png", title: "Sofia’s Tractor", pieces: 24, cats: ["vehicles", "characters"] },
    { file: "dolphin.jpg", title: "Dolphin Splash", pieces: 12, cats: ["animals"] },
    { file: "dino.jpg", title: "Dino Friend", pieces: 6, cats: ["animals"] },
    { file: "sofia-baby-bedtime.png", title: "Bedtime", pieces: 12, cats: ["characters"] },
    { file: "baby-sister-onesie.png", title: "Baby Sister", pieces: 6, cats: ["characters"] },
  ];

  var PUZZLE_CHIPS = [["all", "All"], ["animals", "Animals"], ["vehicles", "Vehicles"], ["characters", "Characters"], ["fantasy", "Fantasy"]];
  var LEVEL = { 6: ["Easy", "easy"], 12: ["Medium", "medium"], 24: ["Hard", "hard"] };

  var LEARN = [
    { id: "numbers", title: "Numbers", desc: "Count, add and race", icon: "🔢", tone: "yellow", cats: ["maths"], href: "games/math-race.html" },
    { id: "words", title: "Words", desc: "Find the hidden words", icon: "🔤", tone: "blue", cats: ["reading"], href: "games/word-search.html" },
    { id: "writing", title: "Story Writing", desc: "Make up your own story", icon: "✏️", tone: "pink", cats: ["reading", "creativity"], href: "games/storybook.html?from=portal" },
    { id: "colours", title: "Colours", desc: "Fun with colours", icon: "🎨", tone: "peach", cats: ["creativity"], href: "games/colouring.html" },
    { id: "memory", title: "Memory", desc: "Remember and match pairs", icon: "🧠", tone: "purple", cats: ["logic"], href: "games/memory.html" },
    { id: "problem", title: "Problem Solving", desc: "Join the dots, no crossing", icon: "🔗", tone: "teal", cats: ["logic"], href: "games/link-grid.html" },
    { id: "shapes", title: "Shapes", desc: "Fit the falling shapes", icon: "🟦", tone: "green", cats: ["logic", "maths"], href: "games/block-stack.html" },
    { id: "create", title: "Imagination", desc: "Describe a game and play it", icon: "🚀", tone: "violet", cats: ["creativity"], href: "games/prompt-game.html" },
  ];

  var LEARN_CHIPS = [["all", "All"], ["maths", "Maths"], ["reading", "Reading"], ["creativity", "Creativity"], ["logic", "Logic"]];

  var STORY_CHIPS = [
    ["all", "All", null],
    ["adventure", "Adventure", /adventure|quest|journey|explor|map|treasure|pirate|jungle/i],
    ["animals", "Animals", /dog|puppy|cat|kitten|bunny|rabbit|fox|bear|animal|dino|unicorn|horse|pony|elephant|lion|tiger|bird|fish|dolphin|owl|duck/i],
    ["bedtime", "Bedtime", /night|sleep|bed|moon|dream|lullaby|star/i],
    ["friends", "Friends", /friend|together|share|sister|brother|family|mum|dad|nana|grandad/i],
    ["fantasy", "Fantasy", /magic|fairy|dragon|unicorn|castle|princess|wizard|wand|spell|mermaid/i],
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dayIndex() {
    return Math.floor(Date.now() / 864e5);
  }

  /* ---------- Favourites ---------- */

  var favs = (function () {
    try {
      var a = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  })();

  function isFav(id) {
    return favs.indexOf(id) >= 0;
  }

  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.push(id);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch (e) {}
  }

  var HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.3 2.3 4 6.3 4c2.3 0 3.9 1.3 5.7 3.3C13.8 5.3 15.4 4 17.7 4c4 0 5.9 4.3 4.3 7.7C19.5 16.4 12 21 12 21z"/></svg>';

  /* ---------- Card templates ---------- */

  var PILLS = {
    story: ["📖", "Story"],
    game: ["🎮", "Game"],
    puzzle: ["🧩", "Puzzle"],
    learning: ["💡", "Learning"],
  };

  function pill(kind) {
    var p = PILLS[kind];
    return '<span class="p-pill p-pill--' + kind + '"><span aria-hidden="true">' + p[0] + "</span>" + p[1] + "</span>";
  }

  function gameCard(g, withPill) {
    var thumb = g.img
      ? '<img src="' + esc(g.img) + '" alt="" loading="lazy" decoding="async" />'
      : '<span class="p-card__emoji" aria-hidden="true">' + g.emoji + "</span>";
    var on = isFav(g.id);
    return (
      '<li class="p-card" data-game="' + esc(g.id) + '">' +
      '<a class="p-card__link" href="' + esc(g.href) + '">' +
      '<span class="p-card__img">' + thumb + "</span>" +
      '<span class="p-card__body"><b class="p-card__title">' + esc(g.title) + "</b>" +
      (withPill ? pill("game") : '<span class="p-card__desc">' + esc(g.desc) + "</span>") +
      "</span></a>" +
      '<button type="button" class="p-fav' + (on ? " is-on" : "") + '" aria-pressed="' + on + '" aria-label="Favourite ' + esc(g.title) + '">' + HEART + "</button>" +
      "</li>"
    );
  }

  function puzzleHref(p) {
    return "games/jigsaw.html?pic=" + encodeURIComponent(p.file) + "&pieces=" + p.pieces;
  }

  function puzzleCard(p, withPill) {
    var lv = LEVEL[p.pieces];
    return (
      '<li class="p-card p-card--puzzle">' +
      '<a class="p-card__link" href="' + puzzleHref(p) + '">' +
      '<span class="p-card__img p-card__img--square"><img src="games/images/jigsaw-presets/' + esc(p.file) + '" alt="" loading="lazy" decoding="async" /></span>' +
      '<span class="p-card__body">' +
      (withPill
        ? '<b class="p-card__title">' + esc(p.title) + "</b>" + pill("puzzle")
        : '<span class="p-card__pieces"><span aria-hidden="true">🧩</span> ' + p.pieces + " pieces</span>" +
          '<span class="p-level p-level--' + lv[1] + '">' + lv[0] + "</span>") +
      "</span></a></li>"
    );
  }

  function learnCard(l, small) {
    if (small) {
      return (
        '<li class="p-card">' +
        '<a class="p-card__link" href="' + esc(l.href) + '">' +
        '<span class="p-card__img p-card__img--tone p-tone--' + l.tone + '"><span class="p-card__emoji" aria-hidden="true">' + l.icon + "</span></span>" +
        '<span class="p-card__body"><b class="p-card__title">' + esc(l.title) + "</b>" + pill("learning") + "</span></a></li>"
      );
    }
    return (
      '<li class="p-learn__item p-tone--' + l.tone + '">' +
      '<a href="' + esc(l.href) + '">' +
      '<span class="p-learn__icon" aria-hidden="true">' + l.icon + "</span>" +
      '<b class="p-learn__title">' + esc(l.title) + "</b>" +
      '<span class="p-learn__desc">' + esc(l.desc) + "</span></a></li>"
    );
  }

  /* ---------- Story shelf ---------- */

  var books = [];

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function bookHue(b) {
    return hash(String(b.id) + ":" + String(b.title)) % 360;
  }

  function coverSources(b) {
    var out = [];
    function add(u) {
      u = String(u || "").trim();
      if (u && out.indexOf(u) === -1 && u.indexOf("blob:") !== 0) out.push(u);
    }
    add(b.sceneDataUrl);
    add(b.sceneUrlFallback);
    var pages = Array.isArray(b.pages) ? b.pages : [];
    for (var i = 0; i < pages.length && out.length < 4; i++) {
      add(pages[i] && pages[i].imageDataUrl);
      add(pages[i] && pages[i].imageUrlFallback);
    }
    return out;
  }

  function pageCount(b) {
    var n = (b.pages || []).length;
    return n + (n === 1 ? " page" : " pages");
  }

  function bookText(b) {
    var t = String(b.title || "");
    (b.pages || []).forEach(function (p) {
      t += " " + String((p && p.text) || "");
    });
    return t;
  }

  /** Put cover art into `holder`, trying each saved image in turn, else a coloured placeholder. */
  function fillCover(holder, b) {
    var sources = coverSources(b);
    holder.style.setProperty("--h", String(bookHue(b)));
    if (!sources.length) {
      holder.classList.add("is-plain");
      return;
    }
    var img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    var at = 0;
    img.onerror = function () {
      at += 1;
      if (at < sources.length) img.src = sources[at];
      else {
        img.remove();
        holder.classList.add("is-plain");
      }
    };
    img.src = sources[0];
    holder.appendChild(img);
  }

  function bookCard(b, withPill) {
    var li = document.createElement("li");
    li.className = "p-card p-card--book";
    var a = document.createElement("a");
    a.className = "p-card__link";
    a.href = STORY_URL + "?book=" + encodeURIComponent(b.id);
    var holder = document.createElement("span");
    holder.className = "p-card__img p-card__img--book";
    fillCover(holder, b);
    var body = document.createElement("span");
    body.className = "p-card__body";
    var t = document.createElement("b");
    t.className = "p-card__title";
    t.textContent = String(b.title || "My Story");
    body.appendChild(t);
    if (withPill) body.insertAdjacentHTML("beforeend", pill("story"));
    else {
      var n = document.createElement("span");
      n.className = "p-card__desc";
      n.textContent = pageCount(b);
      body.appendChild(n);
    }
    a.appendChild(holder);
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  function newStoryCard() {
    return (
      '<li class="p-card p-card--new"><a class="p-card__link" href="' + STORY_URL + '?from=portal">' +
      '<span class="p-card__img p-card__img--book p-card__img--new"><span aria-hidden="true">✨</span></span>' +
      '<span class="p-card__body"><b class="p-card__title">Make a new story</b><span class="p-card__desc">Starring you!</span></span></a></li>'
    );
  }

  function loadBooks(cb) {
    function fromLs() {
      try {
        var d = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]");
        return Array.isArray(d) ? d : [];
      } catch (e) {
        return [];
      }
    }
    var store = window.StorybookShelfStore;
    if (!store || typeof store.getJson !== "function") {
      cb(fromLs());
      return;
    }
    store
      .getJson()
      .then(function (l) {
        cb(Array.isArray(l) ? l : []);
      })
      .catch(function () {
        cb(fromLs());
      });
  }

  /* ---------- Chips ---------- */

  function renderChips(el, chips, current, onPick) {
    el.innerHTML = chips
      .map(function (c) {
        var on = c[0] === current;
        return '<button type="button" class="p-chip' + (on ? " is-on" : "") + '" data-chip="' + c[0] + '" aria-pressed="' + on + '">' + esc(c[1]) + "</button>";
      })
      .join("");
    el.onclick = function (e) {
      var b = e.target.closest("[data-chip]");
      if (!b) return;
      onPick(b.getAttribute("data-chip"));
    };
  }

  /* ---------- Views ---------- */

  var gameFilter = "all";
  var puzzleFilter = "all";
  var learnFilter = "all";
  var storyFilter = "all";

  function renderGames() {
    renderChips($("gameChips"), GAME_CHIPS, gameFilter, function (f) {
      gameFilter = f;
      renderGames();
    });
    var list = GAMES.filter(function (g) {
      return gameFilter === "all" || g.cats.indexOf(gameFilter) >= 0;
    });
    $("gameGrid").innerHTML = list.map(function (g) { return gameCard(g); }).join("");
    $("gameEmpty").hidden = list.length > 0;
  }

  function renderPuzzles() {
    renderChips($("puzzleChips"), PUZZLE_CHIPS, puzzleFilter, function (f) {
      puzzleFilter = f;
      renderPuzzles();
    });
    $("puzzleGrid").innerHTML = PUZZLES.filter(function (p) {
      return puzzleFilter === "all" || p.cats.indexOf(puzzleFilter) >= 0;
    })
      .map(function (p) { return puzzleCard(p); })
      .join("");
    $("puzzleGames").innerHTML = GAMES.filter(function (g) {
      return g.id !== "jigsaw" && g.cats.indexOf("puzzles") >= 0;
    })
      .map(function (g) { return gameCard(g); })
      .join("");
  }

  function renderLearning() {
    renderChips($("learnChips"), LEARN_CHIPS, learnFilter, function (f) {
      learnFilter = f;
      renderLearning();
    });
    $("learnGrid").innerHTML = LEARN.filter(function (l) {
      return learnFilter === "all" || l.cats.indexOf(learnFilter) >= 0;
    })
      .map(function (l) { return learnCard(l); })
      .join("");
  }

  function renderFavourites() {
    var list = GAMES.filter(function (g) { return isFav(g.id); });
    $("favGrid").innerHTML = list.map(function (g) { return gameCard(g); }).join("");
    $("favEmpty").hidden = list.length > 0;
  }

  function renderStoryFeature() {
    var el = $("storyFeature");
    var b = books[0];
    el.textContent = "";
    el.className = "p-feature";
    var art = document.createElement("span");
    art.className = "p-feature__art";
    var copy = document.createElement("div");
    copy.className = "p-feature__copy";
    if (b) {
      fillCover(art, b);
      copy.innerHTML =
        '<p class="p-feature__kicker">Your newest story</p><h2 class="p-feature__title"></h2>' +
        '<p class="p-feature__meta"><span>📖 Story</span><span>' + pageCount(b) + "</span></p>" +
        '<a class="p-feature__go" href="' + STORY_URL + "?book=" + encodeURIComponent(b.id) + '"><span aria-hidden="true">▶</span> Read now</a>';
      copy.querySelector(".p-feature__title").textContent = String(b.title || "My Story");
    } else {
      var img = document.createElement("img");
      img.src = "games/images/portal/stories-night.jpg";
      img.alt = "";
      art.appendChild(img);
      copy.innerHTML =
        '<p class="p-feature__kicker">Try a sample</p><h2 class="p-feature__title">The Star That Found a Home</h2>' +
        '<p class="p-feature__meta"><span>📖 Story</span><span>Ages 3–6</span></p>' +
        '<a class="p-feature__go" href="' + STORY_URL + '?sample=1"><span aria-hidden="true">▶</span> Read now</a>';
      el.classList.add("is-sample");
    }
    el.appendChild(art);
    el.appendChild(copy);
  }

  function renderStories() {
    var chips = STORY_CHIPS.filter(function (c) {
      return !c[2] || books.some(function (b) { return c[2].test(bookText(b)); });
    });
    if (!chips.some(function (c) { return c[0] === storyFilter; })) storyFilter = "all";
    renderChips($("storyChips"), chips, storyFilter, function (f) {
      storyFilter = f;
      renderStories();
    });
    $("storyChips").hidden = chips.length < 2;
    renderStoryFeature();
    var re = null;
    STORY_CHIPS.forEach(function (c) {
      if (c[0] === storyFilter) re = c[2];
    });
    var list = books.filter(function (b) { return !re || re.test(bookText(b)); });
    var grid = $("storyGrid");
    grid.textContent = "";
    list.forEach(function (b) { grid.appendChild(bookCard(b)); });
    grid.insertAdjacentHTML("beforeend", newStoryCard());
    $("storyEmpty").hidden = true;
  }

  function renderRecommended() {
    var d = dayIndex();
    var out = [];
    if (books.length) {
      out.push(bookCard(books[d % Math.min(books.length, 5)], true));
    } else {
      out.push(newStoryCard());
    }
    var favGames = GAMES.filter(function (g) { return isFav(g.id); });
    var pool = favGames.length ? favGames : GAMES.filter(function (g) { return g.img; });
    out.push(gameCard(pool[d % pool.length], true));
    out.push(puzzleCard(PUZZLES[d % PUZZLES.length], true));
    out.push(learnCard(LEARN[d % LEARN.length], true));
    var el = $("pRecommended");
    el.textContent = "";
    out.forEach(function (x) {
      if (typeof x === "string") el.insertAdjacentHTML("beforeend", x);
      else el.appendChild(x);
    });
  }

  function renderSearch(q) {
    q = String(q || "").trim().toLowerCase();
    $("searchSub").textContent = q ? "Results for “" + q + "”" : "Type to search games, stories, puzzles and learning.";
    var grid = $("searchGrid");
    grid.textContent = "";
    if (!q) {
      $("searchEmpty").hidden = true;
      return;
    }
    function hit(s) {
      return String(s).toLowerCase().indexOf(q) >= 0;
    }
    var n = 0;
    books.forEach(function (b) {
      if (hit(b.title)) {
        grid.appendChild(bookCard(b, true));
        n++;
      }
    });
    var html = "";
    GAMES.forEach(function (g) {
      if (hit(g.title + " " + g.desc)) {
        html += gameCard(g, true);
        n++;
      }
    });
    PUZZLES.forEach(function (p) {
      if (hit(p.title + " jigsaw puzzle")) {
        html += puzzleCard(p, true);
        n++;
      }
    });
    LEARN.forEach(function (l) {
      if (hit(l.title + " " + l.desc)) {
        html += learnCard(l, true);
        n++;
      }
    });
    grid.insertAdjacentHTML("beforeend", html);
    $("searchEmpty").hidden = n > 0;
  }

  var current = null;

  function show(view, opts) {
    if (VIEWS.indexOf(view) < 0) view = "home";
    current = view;
    document.querySelectorAll(".p-view").forEach(function (s) {
      s.hidden = s.getAttribute("data-view") !== view;
    });
    document.querySelectorAll("[data-view-link]").forEach(function (a) {
      var on = a.getAttribute("data-view-link") === view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (view === "favourites") renderFavourites();
    if (view === "home") renderRecommended();
    if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
  }

  function viewFromHash() {
    var h = (window.location.hash || "").replace("#", "");
    return VIEWS.indexOf(h) >= 0 && h !== "search" ? h : "home";
  }

  window.addEventListener("hashchange", function () {
    show(viewFromHash());
  });

  /* Favourite buttons anywhere */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".p-fav");
    if (!btn) return;
    e.preventDefault();
    var card = btn.closest("[data-game]");
    if (!card) return;
    var id = card.getAttribute("data-game");
    toggleFav(id);
    var on = isFav(id);
    document.querySelectorAll('[data-game="' + id + '"] .p-fav').forEach(function (b) {
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (current === "favourites") renderFavourites();
  });

  document.querySelectorAll("[data-settings]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.openSettings) KidsCore.openSettings();
    });
  });

  /* Search */
  var searchBtn = $("pSearchBtn");
  var searchForm = $("pSearch");
  var searchInput = $("pSearchInput");
  var viewBeforeSearch = "home";

  function closeSearch() {
    searchForm.hidden = true;
    searchBtn.setAttribute("aria-expanded", "false");
    searchInput.value = "";
    if (current === "search") show(viewBeforeSearch);
  }

  searchBtn.addEventListener("click", function () {
    if (!searchForm.hidden) {
      closeSearch();
      return;
    }
    viewBeforeSearch = current || "home";
    searchForm.hidden = false;
    searchBtn.setAttribute("aria-expanded", "true");
    searchInput.focus();
  });

  searchInput.addEventListener("input", function () {
    if (current !== "search") show("search", { keepScroll: true });
    renderSearch(searchInput.value);
  });

  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearch();
  });

  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    searchInput.blur();
  });

  /* Greeting */
  var sub = $("helloSub");
  if (sub) {
    var hr = new Date().getHours();
    var greet = hr < 12 ? "Good morning!" : hr < 18 ? "Good afternoon!" : "Good evening!";
    sub.textContent = greet + " What shall we explore today?";
  }

  function refreshBooks() {
    loadBooks(function (list) {
      books = list.filter(function (b) {
        return b && b.id && Array.isArray(b.pages) && b.pages.length;
      });
      renderStories();
      if (current === "home") renderRecommended();
    });
  }

  renderGames();
  renderPuzzles();
  renderLearning();
  renderStories();
  show(viewFromHash(), { keepScroll: true });
  refreshBooks();
  window.addEventListener("kids-scorecard-refresh", refreshBooks);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refreshBooks();
  });
})();
