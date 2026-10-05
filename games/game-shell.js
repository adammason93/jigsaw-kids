/* Standalone game frame. Gameplay stays in the game. */
(function () {
  "use strict";

  var Platform = window.WondiiGamePlatform;
  if (!Platform) return;

  var frame = null;
  var game = null;
  var state = Platform.STATES.SETUP;
  var reduced = Platform.prefersReduced(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function escape(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function setState(event) {
    state = Platform.transition(state, event);
    if (!frame) return state;
    frame.setAttribute("data-state", state);
    var pause = frame.querySelector("[data-shell='pause']");
    if (pause) {
      pause.textContent = state === Platform.STATES.PAUSED ? "Resume" : "Pause";
      pause.setAttribute("aria-pressed", state === Platform.STATES.PAUSED ? "true" : "false");
    }
    return state;
  }

  function dialog(kind, title, body, actions) {
    var node = frame.querySelector(".wgs-dialog");
    node.hidden = false;
    node.className = "wgs-dialog wgs-dialog--" + kind;
    node.innerHTML = "<div class=\"wgs-dialog__card\" role=\"dialog\" aria-modal=\"true\"><h2>" + escape(title) + "</h2><p>" + escape(body) + "</p><div class=\"wgs-dialog__actions\">" + actions + "</div></div>";
    var close = node.querySelector("button");
    if (close) close.focus();
  }

  function hideDialog() {
    var node = frame.querySelector(".wgs-dialog");
    if (node) node.hidden = true;
  }

  function mount(meta) {
    if (frame) return frame;
    var made = Platform.createContract(meta || {});
    if (!made.ok) return null;
    game = made.game;
    frame = document.createElement("header");
    frame.className = "wgs";
    frame.setAttribute("data-state", state);
    var score = game.score === "none" ? "" : "<p class=\"wgs-score\" data-shell=\"score\"></p>";
    frame.innerHTML =
      "<a class=\"wgs-back\" href=\"../portal.html#games\">Games</a>" +
      "<div class=\"wgs-id\"><p class=\"wgs-kicker\">Wondii</p><h1>" + escape(game.title) + "</h1></div>" +
      score +
      "<div class=\"wgs-actions\">" +
      "<button type=\"button\" data-shell=\"help\">Help</button>" +
      "<button type=\"button\" data-shell=\"pause\">Pause</button>" +
      "<button type=\"button\" data-shell=\"full\">Full screen</button>" +
      "</div>" +
      "<div class=\"wgs-dialog\" hidden></div>";
    document.body.insertBefore(frame, document.body.firstChild);
    document.body.classList.add("wondii-game-v2");
    if (reduced) document.body.classList.add("wgs-still");
    frame.addEventListener("click", onClick);
    return frame;
  }

  function onClick(event) {
    var button = event.target.closest ? event.target.closest("[data-shell]") : null;
    if (!button || !frame.contains(button)) return;
    var action = button.getAttribute("data-shell");
    if (action === "help") showHelp();
    else if (action === "pause") togglePause();
    else if (action === "full") fullscreen();
    else if (action === "close") hideDialog();
    else if (action === "restart") {
      hideDialog();
      setState("restart");
      if (game && game.reset) game.reset();
      document.dispatchEvent(new CustomEvent("wondii-game-restart"));
    } else if (action === "again") {
      hideDialog();
      setState("play");
      document.dispatchEvent(new CustomEvent("wondii-game-restart"));
    }
  }

  function showHelp() {
    dialog("help", "How to play", game.help || "Have a go on the main area.", "<button type=\"button\" data-shell=\"close\">Got it</button>");
  }

  function togglePause() {
    if (state === Platform.STATES.PAUSED) {
      setState("resume");
      hideDialog();
      document.dispatchEvent(new CustomEvent("wondii-game-resume"));
      return;
    }
    if (state !== Platform.STATES.PLAYING && state !== Platform.STATES.READY) setState("play");
    setState("pause");
    document.dispatchEvent(new CustomEvent("wondii-game-pause"));
    dialog("pause", "Paused", "The game is waiting.", "<button type=\"button\" data-shell=\"pause\">Resume</button>");
  }

  function fullscreen() {
    var node = document.documentElement;
    if (!document.fullscreenElement && node.requestFullscreen) node.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  }

  function showResult(fields) {
    var packed = Platform.result(fields || {});
    setState("complete");
    var line = packed.winner || packed.outcome || "Finished";
    if (packed.score != null) line += " · " + packed.score;
    if (packed.moves != null && String(line).indexOf(String(packed.moves)) < 0) line += " · " + packed.moves;
    dialog("result", game.title, line, "<button type=\"button\" data-shell=\"again\">Play again</button><a class=\"wgs-link\" href=\"../portal.html#games\">Back to games</a>");
    return packed;
  }

  function showError() {
    setState("error");
    dialog("error", "Something went wrong", "The game could not continue.", "<button type=\"button\" data-shell=\"restart\">Try again</button><a class=\"wgs-link\" href=\"../portal.html#games\">Back to games</a>");
  }

  function setScore(text) {
    var node = frame && frame.querySelector("[data-shell='score']");
    if (node) node.textContent = text || "";
  }

  function destroy() {
    if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
    frame = null;
    game = null;
    state = Platform.STATES.SETUP;
  }

  function boot() {
    var id = document.body && document.body.getAttribute("data-game-id");
    if (!id) return;
    var meta = Platform.byId(id);
    if (!meta) return;
    mount(meta);
    document.addEventListener("wondii-game-play", function () { setState("play"); hideDialog(); });
    document.addEventListener("wondii-game-result", function (event) { showResult(event.detail || {}); });
    document.addEventListener("wondii-game-error", function () { showError(); });
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);

  window.WondiiGameShell = {
    mount: mount,
    setState: setState,
    showHelp: showHelp,
    showResult: showResult,
    showError: showError,
    setScore: setScore,
    destroy: destroy,
    state: function () { return state; },
    reduced: function () { return reduced; }
  };
})();
