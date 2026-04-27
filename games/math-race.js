/**
 * Number path: addition / subtraction, levels, character moves per correct answer.
 * Answers: multiple choice (4 options).
 */
(function () {
  var gameSteps = 10;
  const CHOICE_COUNT = 4;
  var pictureHelp = false;
  var wrongAttempts = 0;

  const softWrong = [
    "Almost! Try another number.",
    "Good try — pick a different answer!",
    "Not that one — have another go!",
    "You can do it — try another!",
  ];
  const LEVEL_LABELS = ["Step 1 — numbers up to 5 (adding)", "Step 2 — up to 10 (adding & taking away)", "Step 3 — up to 20 (adding & taking away)"];

  const CHAR_EMOJI = {
    dog: "🐶",
  };

  /** Image characters (path relative to this HTML file in games/) */
  const CHAR_IMAGE = {
    babyca: "images/character-babyca.png",
    coolegg: "images/character-baby-coolegg.png",
    girlblonde: "images/character-girl-blonde.png",
    kelly: "images/character-kelly.png",
  };

  const praise = ["Nice one!", "You got it!", "That’s right!", "Super!", "Brilliant!", "Yes!"];

  const screenSetup = document.getElementById("screenSetup");
  const screenPlay = document.getElementById("screenPlay");
  const screenWin = document.getElementById("screenWin");
  const appEl = document.getElementById("app");
  const raceStage = document.getElementById("raceStage");
  const raceSteps = document.getElementById("raceSteps");
  const raceRunner = document.getElementById("raceRunner");
  const raceRunnerEmoji = document.getElementById("raceRunnerEmoji");
  const questionText = document.getElementById("questionText");
  const choiceGrid = document.getElementById("choiceGrid");
  const feedbackText = document.getElementById("feedbackText");
  const playLevelLabel = document.getElementById("playLevelLabel");
  const playProgress = document.getElementById("playProgress");
  const winMessage = document.getElementById("winMessage");

  let level = 0;
  let character = "babyca";
  let position = 0;
  /** @type {{ text: string; answer: number } | null} */
  let current = null;
  /** @type {number[]} */
  let choiceOrder = [];

  function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function answerCap() {
    if (level === 0) {
      return 10;
    }
    if (level === 1) {
      return 20;
    }
    return 40;
  }

  /**
   * Four unique options including the correct answer; wrong answers are nearby or random in range.
   */
  function buildChoices(correct) {
    const cap = answerCap();
    const set = new Set();
    set.add(correct);
    const tryAdd = function (c) {
      if (set.size < CHOICE_COUNT && c >= 0 && c <= cap) {
        set.add(c);
      }
    };
    const offsets = [1, -1, 2, -2, 3, -3, 4, 5, -4, 7, 10, -5, 6, 8, -6];
    for (let i = 0; i < offsets.length && set.size < CHOICE_COUNT; i++) {
      tryAdd(correct + offsets[i]);
    }
    let guard = 0;
    while (set.size < CHOICE_COUNT && guard < 500) {
      guard++;
      tryAdd(rand(0, cap));
    }
    let n = 0;
    while (set.size < CHOICE_COUNT && n <= cap) {
      set.add(n);
      n += 1;
    }
    return shuffle(Array.from(set));
  }

  function makeProblem() {
    if (level === 0) {
      const a = rand(0, 5);
      const b = rand(0, 5);
      return { text: `${a} + ${b} = ?`, answer: a + b };
    }
    if (level === 1) {
      const useAdd = Math.random() < 0.5;
      if (useAdd) {
        const a = rand(0, 10);
        const b = rand(0, 10);
        if (a + b > 20) {
          return makeProblem();
        }
        return { text: `${a} + ${b} = ?`, answer: a + b };
      }
      const m = rand(0, 10);
      const n = rand(0, m);
      return { text: `${m} − ${n} = ?`, answer: m - n };
    }
    const useAdd = Math.random() < 0.5;
    if (useAdd) {
      const a = rand(0, 20);
      const b = rand(0, 20);
      return { text: `${a} + ${b} = ?`, answer: a + b };
    }
    const m = rand(0, 20);
    const n = rand(0, m);
    return { text: `${m} − ${n} = ?`, answer: m - n };
  }

  function showScreen(which) {
    if (appEl) {
      appEl.classList.toggle("app--playing", which === "play");
    }
    const screens = {
      setup: screenSetup,
      play: screenPlay,
      win: screenWin,
    };
    Object.entries(screens).forEach(function (entry) {
      const on = entry[0] === which;
      entry[1].classList.toggle("is-hidden", !on);
      entry[1].hidden = !on;
    });
  }

  function setRunnerPosition() {
    if (!raceStage) {
      return;
    }
    const pct = 2 + (position / gameSteps) * 86;
    raceStage.style.setProperty("--runner-left", pct + "%");
  }

  function ensureRaceSteps() {
    if (!raceSteps) {
      return;
    }
    raceSteps.innerHTML = "";
    for (let i = 1; i <= gameSteps; i++) {
      const d = document.createElement("div");
      d.className = "race-step-dot";
      d.dataset.step = String(i);
      d.setAttribute("role", "listitem");
      raceSteps.appendChild(d);
    }
  }

  function setRunnerCharacter() {
    if (!raceRunnerEmoji) {
      return;
    }
    const path = CHAR_IMAGE[character];
    if (path) {
      raceRunnerEmoji.textContent = "";
      let im = raceRunnerEmoji.querySelector("img");
      if (!im) {
        im = document.createElement("img");
        im.className = "race-runner__pic";
        im.alt = "";
        im.setAttribute("aria-hidden", "true");
        im.decoding = "async";
        raceRunnerEmoji.appendChild(im);
      }
      im.src = path;
      raceRunnerEmoji.classList.add("race-runner__emoji--pic");
    } else {
      raceRunnerEmoji.classList.remove("race-runner__emoji--pic");
      raceRunnerEmoji.textContent = CHAR_EMOJI[character] || "⭐";
    }
  }

  function updateRaceVisual() {
    setRunnerPosition();
    setRunnerCharacter();
    if (playProgress) {
      if (position === 0) {
        playProgress.textContent =
          "On the start line — reach the finish in " + gameSteps + " right answers!";
      } else if (position >= gameSteps) {
        playProgress.textContent = "You reached the finish line!";
      } else {
        playProgress.textContent = "Step " + position + " of " + gameSteps + " — keep going!";
      }
    }
    document.querySelectorAll(".race-step-dot").forEach(function (el) {
      const i = Number(el.dataset.step);
      if (!i) {
        return;
      }
      el.classList.toggle("is-passed", position >= i);
      el.classList.toggle("is-current", position === i);
    });
  }

  function playRunnerHop() {
    if (!raceRunner) {
      return;
    }
    const emoji = raceRunner.querySelector(".race-runner__emoji");
    raceRunner.classList.remove("race-runner--hop");
    if (emoji) {
      void emoji.offsetWidth;
    }
    raceRunner.classList.add("race-runner--hop");
    setTimeout(function () {
      raceRunner.classList.remove("race-runner--hop");
    }, 580);
  }

  function renderChoices() {
    choiceGrid.innerHTML = "";
    if (!current) {
      return;
    }
    choiceOrder = buildChoices(current.answer);
    choiceOrder.forEach(function (val, i) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mc-btn";
      const keyNum = i + 1;
      b.innerHTML =
        '<span class="mc-btn__key" aria-hidden="true">' +
        keyNum +
        '</span><span class="mc-btn__num">' +
        val +
        "</span>";
      b.setAttribute("aria-label", "Answer " + val + " (keyboard " + keyNum + ")");
      b.addEventListener("click", function () {
        submitChoice(val);
      });
      choiceGrid.appendChild(b);
    });
    setTimeout(function () {
      const first = choiceGrid.querySelector("button");
      if (first) {
        first.focus();
      }
    }, 0);
  }

  function enrichForDots(p) {
    p.showDots = false;
    p.isSub = false;
    p.dA = 0;
    p.dB = 0;
    const add = p.text.match(/^(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
    const sub = p.text.match(/^(\d+)\s*[\u2212-]\s*(\d+)\s*=\s*\?/);
    if (pictureHelp && add) {
      p.dA = Number(add[1]);
      p.dB = Number(add[2]);
      p.showDots = p.dA <= 10 && p.dB <= 10;
    }
    if (pictureHelp && sub) {
      p.dA = Number(sub[1]);
      p.dB = Number(sub[2]);
      p.isSub = true;
      p.showDots = p.dA <= 12;
    }
    return p;
  }

  function renderQuestionDots() {
    const el = document.getElementById("questionDots");
    if (!el) {
      return;
    }
    if (!current || !current.showDots) {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "";
    function row(n, cls) {
      const r = document.createElement("div");
      r.className = "question-dots__row";
      for (let i = 0; i < n; i++) {
        const d = document.createElement("span");
        d.className = "question-dot " + cls;
        r.appendChild(d);
      }
      return r;
    }
    if (current.isSub) {
      el.appendChild(row(current.dA, "question-dot--a"));
      const h = document.createElement("p");
      h.className = "question-dots__hint";
      h.textContent = "Take away " + current.dB + " (count down in your head!)";
      el.appendChild(h);
    } else {
      el.appendChild(row(current.dA, "question-dot--a"));
      el.appendChild(row(current.dB, "question-dot--b"));
    }
  }

  function nextQuestion() {
    wrongAttempts = 0;
    current = enrichForDots(makeProblem());
    questionText.textContent = current.text;
    feedbackText.textContent = "";
    feedbackText.className = "feedback";
    renderQuestionDots();
    renderChoices();
    if (typeof KidsCore !== "undefined" && KidsCore.isReadAloudOn()) {
      KidsCore.speak(current.text.replace(/\?/g, "").replace(/=/g, "equals"));
    }
  }

  function selectedLevel() {
    const r = document.querySelector('input[name="level"]:checked');
    return r ? Number(r.value) : 0;
  }

  function selectedPathSteps() {
    const r = document.querySelector('input[name="pathLen"]:checked');
    return r ? Number(r.value) : 10;
  }

  function startGame() {
    level = selectedLevel();
    gameSteps = selectedPathSteps();
    const ph = document.getElementById("pictureHelp");
    pictureHelp = !!(ph && ph.checked);
    position = 0;
    playLevelLabel.textContent = LEVEL_LABELS[level] || LEVEL_LABELS[0];
    showScreen("play");
    ensureRaceSteps();
    updateRaceVisual();
    nextQuestion();
  }

  function submitChoice(num) {
    if (!current) {
      return;
    }
    if (num === current.answer) {
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("ok");
        KidsCore.haptic("success");
      }
      feedbackText.textContent = praise[Math.floor(Math.random() * praise.length)];
      feedbackText.className = "feedback feedback--good";
      position += 1;
      playRunnerHop();
      if (position >= gameSteps) {
        updateRaceVisual();
        let streak = 1;
        try {
          streak = Number(sessionStorage.getItem("mathWinStreak") || 0) + 1;
          sessionStorage.setItem("mathWinStreak", String(streak));
        } catch (e) {}
        winMessage.textContent =
          "You got " +
          gameSteps +
          " questions right and made it to the end. What a star! Win streak this visit: " +
          streak +
          ".";
        if (typeof KidsCore !== "undefined") {
          KidsCore.recordGame("math");
          KidsCore.confetti(document.getElementById("screenWin") || document.body);
          KidsCore.playSound("win");
          KidsCore.haptic("success");
        }
        showScreen("win");
        return;
      }
      updateRaceVisual();
      nextQuestion();
    } else {
      wrongAttempts += 1;
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("no");
        KidsCore.haptic("light");
      }
      feedbackText.textContent =
        wrongAttempts === 1
          ? softWrong[Math.floor(Math.random() * softWrong.length)]
          : "Not quite — try another answer!";
      feedbackText.className = "feedback feedback--bad";
      const card = document.querySelector(".question-card");
      if (card) {
        card.classList.add("shake");
        setTimeout(function () {
          card.classList.remove("shake");
        }, 400);
      }
    }
  }

  document.getElementById("btnStart").addEventListener("click", startGame);

  document.querySelectorAll(".char-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      character = btn.getAttribute("data-char") || "babyca";
      document.querySelectorAll(".char-btn").forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
    });
  });

  document.getElementById("btnQuit").addEventListener("click", function () {
    showScreen("setup");
  });

  document.getElementById("btnPlayAgain").addEventListener("click", function () {
    startGame();
  });

  document.getElementById("btnMenu").addEventListener("click", function () {
    showScreen("setup");
  });

  document.addEventListener("keydown", function (e) {
    if (screenPlay.classList.contains("is-hidden") || screenPlay.hidden) {
      return;
    }
    const key = e.key;
    if (key < "1" || key > "4") {
      return;
    }
    const idx = parseInt(key, 10) - 1;
    if (choiceOrder[idx] !== undefined) {
      e.preventDefault();
      submitChoice(choiceOrder[idx]);
    }
  });

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
