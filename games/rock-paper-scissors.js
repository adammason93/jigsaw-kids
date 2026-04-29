/**
 * Rock paper scissors vs computer — pick → 3s countdown → reveal → winner overlay.
 */
(function () {
  var MOVES = ["rock", "paper", "scissors"];
  var STORAGE_KEY = "rpsScoreV1";
  var COUNTDOWN_MS = 1000;

  var hero = document.getElementById("rpsHero");
  var titleLine = document.getElementById("rpsTitleLine");
  var scoreEl = document.getElementById("rpsScore");
  var picksWrap = document.getElementById("rpsPicks");
  var btnAgain = document.getElementById("rpsAgain");
  var appEl = document.getElementById("app");

  var flowBackdrop = document.getElementById("rpsFlowBackdrop");
  var flowPick = document.getElementById("rpsFlowPick");
  var flowCount = document.getElementById("rpsFlowCount");
  var flowReveal = document.getElementById("rpsFlowReveal");
  var countNum = document.getElementById("rpsCountNum");
  var revealYou = document.getElementById("rpsRevealYou");
  var revealCpu = document.getElementById("rpsRevealCpu");
  var winOverlay = document.getElementById("rpsWinOverlay");
  var winHeading = document.getElementById("rpsWinHeading");
  var winDetail = document.getElementById("rpsWinDetail");
  var winScore = document.getElementById("rpsWinScore");

  var flowScoreEls = document.querySelectorAll(".rps-flow-score--sheet");

  var scoreYou = 0;
  var scoreCpu = 0;
  var busy = false;
  var countdownTimer = null;
  var revealTimeout = null;

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
    var t = "You " + scoreYou + " · Computer " + scoreCpu;
    if (scoreEl) scoreEl.textContent = t;
    flowScoreEls.forEach(function (el) {
      el.textContent = t;
    });
  }

  function clearTimers() {
    if (countdownTimer != null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (revealTimeout != null) {
      clearTimeout(revealTimeout);
      revealTimeout = null;
    }
  }

  /** @param {string} move */
  function clonePickIcon(move) {
    var btn = document.querySelector('.rps-pick[data-move="' + move + '"]');
    if (!btn) return null;
    var img = btn.querySelector(".rps-pick__img");
    if (!img) return null;
    var c = img.cloneNode(true);
    c.classList.remove("rps-pick__img");
    c.classList.add("rps-reveal-img");
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

  function winTitle(res) {
    if (res === 0) return "It’s a tie!";
    if (res === 1) return "You win!";
    return "Computer wins!";
  }

  /** @param {string} you @param {string} cpu */
  function setRevealIcons(you, cpu) {
    if (!revealYou || !revealCpu) return;
    revealYou.replaceChildren();
    revealCpu.replaceChildren();
    var sy = clonePickIcon(you);
    var sc = clonePickIcon(cpu);
    if (sy) revealYou.appendChild(sy);
    if (sc) revealCpu.appendChild(sc);
  }

  function showFlowStep(step) {
    if (flowPick) flowPick.classList.toggle("is-hidden", step !== "pick");
    if (flowCount) flowCount.classList.toggle("is-hidden", step !== "count");
    if (flowReveal) flowReveal.classList.toggle("is-hidden", step !== "reveal");
  }

  function resetRoundUI() {
    clearTimers();
    busy = false;
    if (hero) hero.classList.remove("is-hidden");
    if (titleLine) titleLine.textContent = "Let’s play!!";
    if (flowBackdrop) flowBackdrop.classList.remove("is-hidden");
    showFlowStep("pick");
    if (winOverlay) winOverlay.classList.add("is-hidden");
    if (picksWrap) {
      picksWrap.querySelectorAll(".rps-pick").forEach(function (b) {
        b.disabled = false;
      });
    }
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
  }

  /** @param {string} you @param {string} cpu @param {number} res */
  function showWinOverlay(you, cpu, res) {
    if (res === 1) scoreYou++;
    else if (res === -1) scoreCpu++;
    saveScore();
    renderScore();

    if (winHeading) winHeading.textContent = winTitle(res);
    if (winDetail) winDetail.textContent = resultMessage(you, cpu, res);
    if (winScore) winScore.textContent = "You " + scoreYou + " · Computer " + scoreCpu;

    if (winOverlay) winOverlay.classList.remove("is-hidden");

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

    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
  }

  /** @param {string} you @param {string} cpu @param {number} res */
  function afterCountdown(you, cpu, res) {
    showFlowStep("reveal");
    setRevealIcons(you, cpu);
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("tap");
    }

    revealTimeout = window.setTimeout(function () {
      revealTimeout = null;
      if (flowBackdrop) flowBackdrop.classList.add("is-hidden");
      showWinOverlay(you, cpu, res);
    }, 1400);
  }

  /** @param {string} you @param {string} cpu @param {number} res */
  function runCountdown(you, cpu, res) {
    showFlowStep("count");
    var seq = [3, 2, 1];
    var i = 0;
    if (countNum) countNum.textContent = String(seq[0]);
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("roll");
    }

    countdownTimer = window.setInterval(function () {
      i++;
      if (i >= seq.length) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        afterCountdown(you, cpu, res);
        return;
      }
      if (countNum) countNum.textContent = String(seq[i]);
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("tap");
      }
    }, COUNTDOWN_MS);
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

      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("tap");
        KidsCore.haptic("light");
      }

      runCountdown(you, cpu, res);
    });
  });

  if (btnAgain) {
    btnAgain.addEventListener("click", resetRoundUI);
  }

  loadScore();
  renderScore();
  resetRoundUI();

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
