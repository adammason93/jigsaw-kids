/* Connects the five pilot games to GameShell without owning their rules. */
(function () {
  "use strict";

  var Shell = window.WondiiGameShell;
  if (!Shell || !document.body || document.body.getAttribute("data-game-shell") !== "v2") return;

  var finished = false;

  function play() {
    document.dispatchEvent(new CustomEvent("wondii-game-play"));
  }

  function finish(detail) {
    if (finished) return;
    finished = true;
    document.dispatchEvent(new CustomEvent("wondii-game-result", { detail: detail || {} }));
  }

  function click(id) {
    var node = document.getElementById(id);
    if (node) node.click();
  }

  document.addEventListener("click", function (event) {
    var start = event.target.closest && event.target.closest("#btnStart");
    if (start) play();
  });

  var id = document.body.getAttribute("data-game-id");
  if (id === "word-search" || id === "snake") play();
  if (id === "colouring") {
    document.addEventListener("pointerdown", function (event) {
      var canvas = event.target.closest && event.target.closest("canvas");
      if (canvas) play();
    });
  }

  document.addEventListener("wondii-game-pause", function () { click("snakePause"); });
  document.addEventListener("wondii-game-resume", function () { click("snakeResume"); });
  document.addEventListener("wondii-game-restart", function () {
    finished = false;
    click("btnAgain");
    click("btnPlayAgain");
    click("btnWordSearchNew");
    click("snakeRestart");
    if (id === "colouring") play();
  });

  window.addEventListener("error", function () {
    document.dispatchEvent(new CustomEvent("wondii-game-error"));
  });

  var watch = new MutationObserver(function () {
    var overlay = document.getElementById("tttWinOverlay");
    if (overlay && overlay.hidden === false) {
      var title = document.getElementById("tttWinTitle");
      var message = document.getElementById("tttWinMsg");
      var sentence = (message && message.textContent) || (title && title.textContent) || "Finished";
      finish({ outcome: /draw/i.test(sentence) ? "draw" : "win", winner: sentence });
    }
    var memory = document.getElementById("memoryWin");
    if (memory && /matched them all/i.test(memory.textContent || "")) {
      finish({ outcome: memory.textContent });
    }
    var words = document.getElementById("wordSearchStatus");
    if (words && /every word/i.test(words.textContent || "")) finish({ outcome: words.textContent });
    var snakeTitle = document.getElementById("snakeOverTitle");
    var snakeOverlay = document.getElementById("snakeOverlay");
    if (snakeOverlay && snakeOverlay.hidden === false && snakeTitle && /game over/i.test(snakeTitle.textContent || "")) {
      var score = document.getElementById("snakeScore");
      finish({ outcome: "Game over. Score " + (score ? score.textContent : "0") });
    }
  });
  var root = document.getElementById("app") || document.body;
  watch.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
})();
