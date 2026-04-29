/**
 * Rock paper scissors vs computer — simple kid-friendly UI.
 */
(function () {
  var MOVES = ["rock", "paper", "scissors"];
  var STORAGE_KEY = "rpsScoreV1";

  var hero = document.getElementById("rpsHero");
  var duel = document.getElementById("rpsDuel");
  var iconYou = document.getElementById("rpsIconYou");
  var iconCpu = document.getElementById("rpsIconCpu");
  var titleLine = document.getElementById("rpsTitleLine");
  var resultEl = document.getElementById("rpsResult");
  var scoreEl = document.getElementById("rpsScore");
  var picksWrap = document.getElementById("rpsPicks");
  var btnAgain = document.getElementById("rpsAgain");
  var appEl = document.getElementById("app");

  var scoreYou = 0;
  var scoreCpu = 0;
  var busy = false;

  function loadScore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o.you === "number") scoreYou = Math.max(0, o.you);
      if (o && typeof o.cpu === "number") scoreCpu = Math.max(0, o.cpu);
    } catch (e) {}
  }

  function saveScore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ you: scoreYou, cpu: scoreCpu }));
    } catch (e) {}
  }

  function renderScore() {
    if (scoreEl) {
      scoreEl.textContent = "You " + scoreYou + " · Computer " + scoreCpu;
    }
  }

  /** @param {string} move */
  function clonePickIcon(move) {
    var btn = document.querySelector('.rps-pick[data-move="' + move + '"]');
    if (!btn) return null;
    var svg = btn.querySelector("svg");
    if (!svg) return null;
    var c = svg.cloneNode(true);
    c.classList.remove("rps-icon--pick");
    c.setAttribute("class", "rps-icon");
    c.style.width = "min(5.5rem, 22vw)";
    c.style.height = "auto";
    return c;
  }

  /**
   * @param {string} a
   * @param {string} b
   * @returns {number} 1 you win, -1 cpu wins, 0 tie
   */
  function outcome(a, b) {
    if (a === b) return 0;
    if (a === "rock" && b === "scissors") return 1;
    if (a === "paper" && b === "rock") return 1;
    if (a === "scissors" && b === "paper") return 1;
    return -1;
  }

  function label(move) {
    if (move === "rock") return "Rock";
    if (move === "paper") return "Paper";
    return "Scissors";
  }

  /** @param {string} you @param {string} cpu @param {number} res */
  function resultMessage(you, cpu, res) {
    if (res === 0) {
      return "Same move — it’s a tie!";
    }
    if (res === 1) {
      return label(you) + " beats " + label(cpu).toLowerCase() + " — you win!";
    }
    return label(cpu) + " beats " + label(you).toLowerCase() + " — computer wins!";
  }

  function setDuelIcons(you, cpu) {
    if (!iconYou || !iconCpu) return;
    iconYou.replaceChildren();
    iconCpu.replaceChildren();
    var sy = clonePickIcon(you);
    var sc = clonePickIcon(cpu);
    if (sy) {
      iconYou.appendChild(sy);
    }
    if (sc) {
      iconCpu.appendChild(sc);
    }
  }

  function resetRoundUI() {
    busy = false;
    if (hero) hero.classList.remove("is-hidden");
    if (duel) duel.classList.add("is-hidden");
    if (titleLine) titleLine.textContent = "Let’s play!!";
    if (resultEl) {
      resultEl.textContent = "";
      resultEl.hidden = true;
    }
    if (btnAgain) btnAgain.classList.add("is-hidden");
    if (picksWrap) {
      picksWrap.classList.remove("is-hidden");
      picksWrap.querySelectorAll(".rps-pick").forEach(function (b) {
        b.disabled = false;
      });
    }
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
  }

  function showResult(you, cpu, res) {
    if (hero) hero.classList.add("is-hidden");
    if (duel) duel.classList.remove("is-hidden");
    setDuelIcons(you, cpu);
    if (titleLine) titleLine.textContent = "Nice one!";
    if (resultEl) {
      resultEl.hidden = false;
      resultEl.textContent = resultMessage(you, cpu, res);
    }
    if (picksWrap) picksWrap.classList.add("is-hidden");
    if (btnAgain) btnAgain.classList.remove("is-hidden");
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }

    if (res === 1) scoreYou++;
    else if (res === -1) scoreCpu++;
    saveScore();
    renderScore();

    if (typeof KidsCore !== "undefined") {
      if (res === 1) {
        KidsCore.playSound("win");
        KidsCore.haptic("success");
        KidsCore.confetti(appEl || document.body);
      } else if (res === -1) {
        KidsCore.playSound("ok");
        KidsCore.haptic("light");
      } else {
        KidsCore.playSound("tap");
        KidsCore.haptic("light");
      }
      KidsCore.recordGame("rps");
    }
  }

  document.querySelectorAll(".rps-pick").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (busy) return;
      var you = btn.getAttribute("data-move");
      if (!you || MOVES.indexOf(you) < 0) return;
      busy = true;
      picksWrap.querySelectorAll(".rps-pick").forEach(function (b) {
        b.disabled = true;
      });
      var cpu = MOVES[Math.floor(Math.random() * 3)];
      var res = outcome(you, cpu);
      window.setTimeout(function () {
        showResult(you, cpu, res);
      }, 320);
    });
  });

  if (btnAgain) {
    btnAgain.addEventListener("click", resetRoundUI);
  }

  loadScore();
  renderScore();

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
