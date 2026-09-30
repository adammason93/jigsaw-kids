/* Shared game chrome. Does not replace a game's rules or board. */
(function () {
  "use strict";

  var file = (location.pathname.split("/").pop() || "").split("?")[0];
  if (file === "storybook.html") return;
  if (document.documentElement.getAttribute("data-game-shell") === "v2") return;
  if (document.body && document.body.getAttribute("data-game-shell") === "v2") return;

  var THEME = {
    "colouring.html": ["creative", "Creative"],
    "prompt-game.html": ["creative", "Creative"],
    "star-catcher.html": ["creative", "Creative"],
    "jigsaw.html": ["puzzles", "Puzzles"],
    "memory.html": ["puzzles", "Puzzles"],
    "link-grid.html": ["puzzles", "Puzzles"],
    "block-stack.html": ["puzzles", "Puzzles"],
    "word-search.html": ["words", "Words"],
    "math-race.html": ["numbers", "Numbers"],
    "runner.html": ["numbers", "Numbers"],
    "noughts-crosses.html": ["logic", "Logic"],
    "connect-four.html": ["logic", "Logic"],
    "snap.html": ["logic", "Logic"],
    "snakes-ladders.html": ["logic", "Logic"],
    "rock-paper-scissors.html": ["logic", "Logic"],
    "snake-arcade.html": ["stem", "Play"],
    "zuma.html": ["stem", "Play"],
    "marble-tilt.html": ["stem", "Play"],
    "drive-mad.html": ["stem", "Play"]
  };

  var theme = THEME[file] || ["logic", "Play"];
  document.body.classList.add("wondii-game");
  document.body.setAttribute("data-wondii-theme", theme[0]);

  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Fredoka:wght@560;650&family=Nunito:wght@700;800&display=swap";
  document.head.appendChild(font);

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var nav = document.querySelector(".game-nav") || document.querySelector("nav");
    var back = document.querySelector(".game-nav .back-btn, .game-nav .back-link, a.back-btn");
    if (back) {
      back.setAttribute("href", "../portal.html#games");
      var label = back.querySelector(".back-btn__text");
      if (label) label.textContent = "Games";
      else back.textContent = "← Games";
    }
    if (nav && !nav.querySelector(".wondii-help")) {
      var helpBtn = document.createElement("button");
      helpBtn.type = "button";
      helpBtn.className = "wondii-help";
      helpBtn.textContent = "?";
      helpBtn.setAttribute("aria-label", "How to play");
      nav.appendChild(helpBtn);
      helpBtn.addEventListener("click", openHelp);
    }

    var heading = document.querySelector(".app h1, .screen h1, h1");
    var before = heading && heading.previousElementSibling;
    if (heading && !(before && before.classList && before.classList.contains("wondii-kicker"))) {
      var kick = document.createElement("p");
      kick.className = "wondii-kicker";
      kick.textContent = theme[1];
      heading.parentNode.insertBefore(kick, heading);
    }

    var notes = [];
    document.querySelectorAll("#app header p, .app header p, .page-header p, .screen > header p, [class$='lede'], [class*='__lede']").forEach(function (p) {
      var text = (p.textContent || "").trim();
      if (text.length < 24) return;
      if (p.classList.contains("wondii-kicker")) return;
      notes.push(text);
      p.hidden = true;
    });

    document.querySelectorAll(".gsc").forEach(function (card) {
      if (card.closest(".wondii-scores")) return;
      var box = document.createElement("details");
      box.className = "wondii-scores";
      var summary = document.createElement("summary");
      summary.textContent = "Scores";
      card.parentNode.insertBefore(box, card);
      box.appendChild(summary);
      box.appendChild(card);
    });

    var modal = document.createElement("div");
    modal.className = "wondii-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="wondii-modal__card" role="dialog" aria-modal="true" aria-labelledby="wondiiHelpTitle">' +
      '<h2 id="wondiiHelpTitle">How to play</h2>' +
      '<div class="wondii-modal__body"></div>' +
      '<button type="button" class="wondii-modal__go">Got it</button></div>';
    document.body.appendChild(modal);
    var body = modal.querySelector(".wondii-modal__body");
    if (!notes.length) notes.push("Have a go. The main game is the big area on the screen.");
    notes.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      body.appendChild(p);
    });
    modal.querySelector(".wondii-modal__go").addEventListener("click", function () {
      modal.hidden = true;
    });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.hidden = true;
    });

    function openHelp() {
      modal.hidden = false;
      modal.querySelector(".wondii-modal__go").focus();
    }
  });
})();
