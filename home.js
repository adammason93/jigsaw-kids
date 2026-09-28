(function () {
  "use strict";

  var FAV_KEY = "portalFavourites";

  var ACCENTS = {
    purple: ["#8b5cf6", "#f1ebff"],
    green: ["#22b07d", "#e6f8ef"],
    pink: ["#ec4899", "#fdebf4"],
    blue: ["#4f7cf7", "#e8efff"],
    orange: ["#f59e0b", "#fff4df"],
    violet: ["#a855f7", "#f5ebff"],
    teal: ["#14b8a6", "#e2f8f5"],
    red: ["#f43f5e", "#ffe8ec"],
  };

  var GAMES = [
    {
      id: "jigsaw",
      title: "Picture Jigsaw",
      desc: "Put the pieces together to complete fun pictures.",
      href: "games/jigsaw.html",
      img: "games/images/portal/jigsaw.jpg",
      cats: ["puzzles"],
      accent: "purple",
    },
    {
      id: "colouring",
      title: "Colouring Book",
      desc: "Choose a picture and bring it to life with colours.",
      href: "games/colouring.html",
      img: "games/images/portal/colouring.png",
      cats: ["creative"],
      accent: "green",
    },
    {
      id: "storybook",
      title: "Your Story",
      desc: "Create your own story with your name and characters.",
      href: "games/storybook.html?from=portal",
      img: "games/images/portal/storybook-nook.jpg",
      cats: ["stories", "creative"],
      accent: "pink",
    },
    {
      id: "characters",
      title: "My Characters",
      desc: "Turn a photo into a cuddly clay cartoon buddy.",
      href: "characters.html",
      emoji: "🎭",
      cats: ["stories", "creative"],
      accent: "violet",
    },
    {
      id: "prompt-game",
      title: "Make a 3D Game",
      desc: "Describe a game and watch it come to life.",
      href: "games/prompt-game.html",
      img: "games/images/portal/prompt-game.svg",
      cats: ["creative"],
      accent: "blue",
    },
    {
      id: "star-catcher",
      title: "Star Catcher",
      desc: "Catch the stars and beat your score!",
      href: "games/star-catcher.html",
      img: "games/images/portal/star-catcher.svg",
      cats: ["arcade"],
      accent: "blue",
    },
    {
      id: "math-race",
      title: "Number Path",
      desc: "Race along the path by solving sums.",
      href: "games/math-race.html",
      img: "games/images/math-race-park-wide.png",
      cats: ["racing", "puzzles"],
      accent: "orange",
    },
    {
      id: "memory",
      title: "Memory Match",
      desc: "Find the pairs and clear the board!",
      href: "games/memory.html",
      img: "games/images/portal/memory.png",
      cats: ["puzzles", "classic"],
      accent: "purple",
    },
    {
      id: "snakes-ladders",
      title: "Snakes & Ladders",
      desc: "Roll the dice, climb up and slide down.",
      href: "games/snakes-ladders.html",
      img: "games/images/portal/snakes-ladders.png",
      cats: ["classic"],
      accent: "green",
    },
    {
      id: "noughts-crosses",
      title: "Noughts & Crosses",
      desc: "Get three in a row to win.",
      href: "games/noughts-crosses.html",
      img: "games/images/portal/noughts-crosses.png",
      cats: ["classic"],
      accent: "pink",
    },
    {
      id: "connect-four",
      title: "Connect 4",
      desc: "Drop your counters and line up four.",
      href: "games/connect-four.html",
      img: "games/images/portal/connect-four.png",
      cats: ["classic"],
      accent: "red",
    },
    {
      id: "word-search",
      title: "Word Search",
      desc: "Hunt for hidden words in the grid.",
      href: "games/word-search.html",
      img: "games/images/portal/word-search.png",
      cats: ["puzzles"],
      accent: "teal",
    },
    {
      id: "snap",
      title: "Snap",
      desc: "Watch the cards and shout snap first!",
      href: "games/snap.html",
      img: "games/images/portal/snap.png",
      cats: ["classic"],
      accent: "orange",
    },
    {
      id: "rps",
      title: "Rock Paper Scissors",
      desc: "Pick your hand and beat the computer.",
      href: "games/rock-paper-scissors.html",
      img: "games/images/portal/rock-paper-scissors-card.png",
      cats: ["classic"],
      accent: "violet",
    },
    {
      id: "snake",
      title: "Snake",
      desc: "Munch the snacks and grow super long.",
      href: "games/snake-arcade.html",
      img: "games/images/portal/snake-portal.png",
      cats: ["arcade"],
      accent: "green",
    },
    {
      id: "zuma",
      title: "Zuma",
      desc: "Shoot the balls and match the colours.",
      href: "games/zuma.html",
      img: "games/images/portal/zuma-portal.png",
      cats: ["arcade"],
      accent: "teal",
    },
    {
      id: "marble-tilt",
      title: "Marble Maze",
      desc: "Tilt and roll the marble to the goal.",
      href: "games/marble-tilt.html",
      img: "games/images/portal/marble-tilt.svg",
      cats: ["arcade", "puzzles"],
      accent: "blue",
    },
    {
      id: "link-grid",
      title: "Link Grid",
      desc: "Join the matching dots without crossing.",
      href: "games/link-grid.html",
      img: "games/images/portal/link-grid.svg",
      cats: ["puzzles"],
      accent: "purple",
    },
    {
      id: "drive-mad",
      title: "Drive Mad",
      desc: "Drive your truck over bumpy tracks.",
      href: "games/drive-mad.html",
      img: "games/images/portal/drive-mad.svg",
      cats: ["racing"],
      accent: "orange",
    },
    {
      id: "block-stack",
      title: "Block Stack",
      desc: "Stack the falling blocks and clear lines.",
      href: "games/block-stack.html",
      img: "games/images/portal/block-stack.svg",
      cats: ["puzzles", "arcade"],
      accent: "pink",
    },
  ];

  var grid = document.getElementById("homeGrid");
  var empty = document.getElementById("homeEmpty");
  var search = document.getElementById("homeSearch");
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var countEl = document.getElementById("homeGameCount");

  var filter = "all";
  var favs = loadFavs();

  function loadFavs() {
    try {
      var arr = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavs() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    } catch (e) {}
  }

  function isFav(id) {
    return favs.indexOf(id) >= 0;
  }

  var CHEVRON =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var HEART =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.3 2.3 4 6.3 4c2.3 0 3.9 1.3 5.7 3.3C13.8 5.3 15.4 4 17.7 4c4 0 5.9 4.3 4.3 7.7C19.5 16.4 12 21 12 21z"/></svg>';

  function cardHtml(g) {
    var a = ACCENTS[g.accent] || ACCENTS.purple;
    var thumb = g.img
      ? '<img class="hcard__img" src="' + g.img + '" alt="" decoding="async" loading="lazy" />'
      : '<span class="hcard__emoji" aria-hidden="true">' + g.emoji + "</span>";
    var fav = isFav(g.id);
    return (
      '<li class="hcard" data-id="' + g.id + '" style="--accent:' + a[0] + ";--accent-soft:" + a[1] + '">' +
      '<a class="hcard__link" href="' + g.href + '">' +
      '<div class="hcard__thumb">' + thumb + "</div>" +
      '<div class="hcard__body">' +
      '<div class="hcard__text"><h3 class="hcard__title">' + g.title.replace(/&/g, "&amp;") + "</h3>" +
      '<p class="hcard__desc">' + g.desc + "</p></div>" +
      '<span class="hcard__go" aria-hidden="true">' + CHEVRON + "</span>" +
      "</div></a>" +
      '<button type="button" class="hcard__fav' + (fav ? " is-on" : "") + '" aria-pressed="' + fav +
      '" aria-label="Favourite ' + g.title.replace(/&/g, "&amp;") + '">' + HEART + "</button>" +
      "</li>"
    );
  }

  function matches(g, q) {
    if (filter === "fav" && !isFav(g.id)) return false;
    if (filter !== "all" && filter !== "fav" && g.cats.indexOf(filter) < 0) return false;
    if (!q) return true;
    return (g.title + " " + g.desc).toLowerCase().indexOf(q) >= 0;
  }

  function render() {
    var q = (search.value || "").trim().toLowerCase();
    var list = GAMES.filter(function (g) {
      return matches(g, q);
    });
    grid.innerHTML = list.map(cardHtml).join("");
    if (list.length) {
      empty.hidden = true;
    } else {
      empty.hidden = false;
      empty.textContent =
        filter === "fav" && !q
          ? "No favourites yet — tap the ♥ on a game to keep it here."
          : "No games match that. Try another word!";
    }
  }

  function setFilter(f) {
    filter = f;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-filter") === f;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    render();
  }

  function setNav(name) {
    navLinks.forEach(function (l) {
      var on = l.getAttribute("data-nav") === name;
      l.classList.toggle("is-active", on);
      if (on) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
  }

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var calm = document.documentElement.classList.contains("kids-reduce-motion");
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      var f = t.getAttribute("data-filter");
      setFilter(f);
      setNav(f === "fav" ? "favourites" : "games");
    });
  });

  search.addEventListener("input", render);

  grid.addEventListener("click", function (e) {
    var btn = e.target.closest(".hcard__fav");
    if (!btn) return;
    var id = btn.closest(".hcard").getAttribute("data-id");
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.push(id);
    saveFavs();
    if (filter === "fav") {
      render();
    } else {
      var on = isFav(id);
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  });

  navLinks.forEach(function (l) {
    l.addEventListener("click", function (e) {
      e.preventDefault();
      var name = l.getAttribute("data-nav");
      setNav(name);
      if (name === "home") {
        window.scrollTo({
          top: 0,
          behavior: document.documentElement.classList.contains("kids-reduce-motion") ? "auto" : "smooth",
        });
      } else if (name === "games") {
        setFilter("all");
        scrollToId("games");
      } else if (name === "favourites") {
        setFilter("fav");
        scrollToId("games");
      } else if (name === "characters") {
        scrollToId("cast");
      } else if (name === "about") {
        scrollToId("about");
      }
    });
  });

  var start = document.getElementById("homeStart");
  if (start) {
    start.addEventListener("click", function (e) {
      e.preventDefault();
      setNav("games");
      scrollToId("games");
    });
  }

  var gear = document.getElementById("homeSettings");
  if (gear) {
    gear.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.openSettings) KidsCore.openSettings();
    });
  }

  if (countEl) countEl.textContent = String(GAMES.length);

  render();

  var hashNav = { "#games": "games", "#favourites": "favourites", "#about": "about", "#cast": "characters" };
  var fromHash = hashNav[window.location.hash];
  if (fromHash) {
    var navLink = document.querySelector('[data-nav="' + fromHash + '"]');
    if (navLink) setTimeout(function () { navLink.click(); }, 50);
  }
})();
