/**
 * Number path: addition / subtraction, levels, characters move per correct answer.
 * Modes: solo, 2–3 player turns, race vs dinosaur (CPU).
 */
(function () {
  var gameSteps = 10;
  const CHOICE_COUNT = 4;
  var pictureHelp = false;
  var wrongAttempts = 0;

  /** @type {'solo'|'two'|'three'|'computer'} */
  var playMode = "solo";

  /** Dinosaur gets its own turn with a pop-up question; it answers most of the time (fair “race”) */
  const DINO_ANSWER_CORRECT_CHANCE = 0.82;

  const softWrong = [
    "Almost! Try another number.",
    "Good try — pick a different answer!",
    "Not that one — have another go!",
    "You can do it — try another!",
  ];
  const LEVEL_LABELS = ["Step 1 — numbers up to 5 (adding)", "Step 2 — up to 10 (adding & taking away)", "Step 3 — up to 20 (adding & taking away)"];

  const CHAR_EMOJI = {
    dino: "🦖",
  };

  const CHAR_IMAGE = {
    dino: "images/math-race-dino.png",
    babyca: "images/character-babyca.png",
    coolegg: "images/character-baby-coolegg.png",
    girlblonde: "images/character-sofia-running.png",
    kelly: "images/character-kelly.png",
    freya: "images/character-freya.png",
    dog: "images/tilly-mascot.png",
  };

  const praise = ["Nice one!", "You got it!", "That's right!", "Super!", "Brilliant!", "Yes!"];

  const screenSetup = document.getElementById("screenSetup");
  const screenPlay = document.getElementById("screenPlay");
  const screenWin = document.getElementById("screenWin");
  const screenLose = document.getElementById("screenLose");
  const appEl = document.getElementById("app");
  const raceStage = document.getElementById("raceStage");
  const raceSteps = document.getElementById("raceSteps");
  const raceRunners = document.getElementById("raceRunners");
  const questionText = document.getElementById("questionText");
  const choiceGrid = document.getElementById("choiceGrid");
  const feedbackText = document.getElementById("feedbackText");
  const playLevelLabel = document.getElementById("playLevelLabel");
  const playTurn = document.getElementById("playTurn");
  const playProgress = document.getElementById("playProgress");
  const winTitle = document.getElementById("winTitle");
  const winMessage = document.getElementById("winMessage");
  const loseTitle = document.getElementById("loseTitle");
  const loseMessage = document.getElementById("loseMessage");
  const loseCard = document.getElementById("loseCard");
  const charSectionHint = document.getElementById("charSectionHint");
  const questionTurnTitle = document.getElementById("questionTurnTitle");
  const mcHint = document.getElementById("mcHint");

  /** In vs-dino mode: true while the dinosaur's question pop-up is active */
  var dinoQuestionTurn = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  var dinoTurnTimer = null;

  let level = 0;
  /** @type {{ id: string; label: string; character: string; position: number; lane: number; isCpu?: boolean; el?: HTMLElement }[]} */
  let players = [];
  let currentPlayerIndex = 0;
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
      appEl.classList.toggle("app--setup", which === "setup");
    }
    const screens = {
      setup: screenSetup,
      play: screenPlay,
      win: screenWin,
      lose: screenLose,
    };
    Object.entries(screens).forEach(function (entry) {
      const on = entry[0] === which;
      entry[1].classList.toggle("is-hidden", !on);
      entry[1].hidden = !on;
    });
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(which === "play");
    }
  }

  function selectedPlayMode() {
    const r = document.querySelector('input[name="playMode"]:checked');
    const v = r ? r.value : "solo";
    if (v === "two" || v === "three" || v === "computer" || v === "solo") {
      return v;
    }
    return "solo";
  }

  function getCharForPlayer() {
    return "girlblonde";
  }

  function syncSetupUiForMode() {
    const mode = selectedPlayMode();
    if (charSectionHint) {
      if (mode === "computer") {
        charSectionHint.textContent =
          "You start one step ahead. You and the dinosaur take turns — each turn shows a pop-up with that player's question. Reach the finish before it catches you!";
      } else if (mode === "two" || mode === "three") {
        charSectionHint.textContent =
          "Take turns as Sofia. Only the player whose turn it is moves forward when they're right!";
      } else {
        charSectionHint.textContent = "You play as Sofia.";
      }
    }
  }

  document.querySelectorAll('input[name="playMode"]').forEach(function (inp) {
    inp.addEventListener("change", syncSetupUiForMode);
  });
  syncSetupUiForMode();

  function buildPlayers() {
    playMode = selectedPlayMode();
    const list = [];
    if (playMode === "solo") {
      list.push({
        id: "h0",
        label: "You",
        character: getCharForPlayer(0),
        position: 0,
        lane: 0,
      });
    } else if (playMode === "two") {
      list.push({
        id: "h0",
        label: "Player 1",
        character: getCharForPlayer(0),
        position: 0,
        lane: 1,
      });
      list.push({
        id: "h1",
        label: "Player 2",
        character: getCharForPlayer(1),
        position: 0,
        lane: 0,
      });
    } else if (playMode === "three") {
      list.push({
        id: "h0",
        label: "Player 1",
        character: getCharForPlayer(0),
        position: 0,
        lane: 2,
      });
      list.push({
        id: "h1",
        label: "Player 2",
        character: getCharForPlayer(1),
        position: 0,
        lane: 1,
      });
      list.push({
        id: "h2",
        label: "Player 3",
        character: getCharForPlayer(2),
        position: 0,
        lane: 0,
      });
    } else if (playMode === "computer") {
      list.push({
        id: "cpu",
        label: "Dinosaur",
        character: "dino",
        position: 0,
        lane: 0,
        isCpu: true,
      });
      list.push({
        id: "h0",
        label: "You",
        character: getCharForPlayer(0),
        position: 1,
        lane: 0,
        isCpu: false,
      });
    }
    return list;
  }

  function isVersusDino() {
    return playMode === "computer";
  }

  function childPlayer() {
    return players.find(function (p) {
      return !p.isCpu;
    });
  }

  function clearDinoTimer() {
    if (dinoTurnTimer) {
      clearTimeout(dinoTurnTimer);
      dinoTurnTimer = null;
    }
  }

  function pickWrongDistractor() {
    if (!current) {
      return 0;
    }
    const wrongs = choiceOrder.filter(function (v) {
      return v !== current.answer;
    });
    if (wrongs.length) {
      return wrongs[Math.floor(Math.random() * wrongs.length)];
    }
    return current.answer;
  }

  function dinoPlayer() {
    return players.find(function (p) {
      return p.isCpu;
    });
  }

  function layoutStageClasses() {
    if (!raceStage) {
      return;
    }
    const multi = playMode === "two" || playMode === "three";
    raceStage.classList.toggle("has-multi-lane", multi);
    raceStage.classList.toggle("is-dino", playMode === "computer");
    raceStage.classList.remove("is-caught");
  }

  function pctForPosition(pos) {
    return 2 + (pos / gameSteps) * 86;
  }

  function fillRunnerEmoji(container, player) {
    if (!container) {
      return;
    }
    const ch = player.character;
    const path = CHAR_IMAGE[ch];
    if (path) {
      container.textContent = "";
      let im = container.querySelector("img");
      if (!im) {
        im = document.createElement("img");
        im.className = "race-runner__pic";
        im.alt = "";
        im.setAttribute("aria-hidden", "true");
        im.decoding = "async";
        container.appendChild(im);
      }
      im.src = path;
      container.classList.add("race-runner__emoji--pic");
    } else {
      container.classList.remove("race-runner__emoji--pic");
      const im = container.querySelector("img");
      if (im) {
        im.remove();
      }
      container.textContent = CHAR_EMOJI[ch] || "⭐";
    }
  }

  function ensureRunnersDom() {
    if (!raceRunners) {
      return;
    }
    raceRunners.innerHTML = "";
    players.forEach(function (p, i) {
      const row = document.createElement("div");
      row.className = "race-runner race-runner--lane" + p.lane + (p.isCpu ? " race-runner--dino" : "");
      row.dataset.playerId = p.id;
      row.innerHTML =
        '<span class="race-runner__emoji" aria-hidden="true"></span>' +
        '<div class="race-runner__glow" aria-hidden="true"></div>' +
        '<div class="race-runner__shadow" aria-hidden="true"></div>';
      const emoji = row.querySelector(".race-runner__emoji");
      fillRunnerEmoji(emoji, p);
      p.el = row;
      raceRunners.appendChild(row);
      row.style.setProperty("--runner-left", pctForPosition(p.position) + "%");
    });
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

  function updateStepDots() {
    const maxPos = Math.max.apply(
      null,
      players.map(function (p) {
        return p.position;
      })
    );
    document.querySelectorAll(".race-step-dot").forEach(function (el) {
      const i = Number(el.dataset.step);
      if (!i) {
        return;
      }
      el.classList.toggle("is-passed", maxPos >= i);
      el.classList.toggle("is-current", maxPos === i);
    });
  }

  function updateProgressText() {
    if (!playProgress) {
      return;
    }
    if (playMode === "solo") {
      const p = players[0];
      if (p.position === 0) {
        playProgress.textContent = "On the start line — reach the finish in " + gameSteps + " right answers!";
      } else if (p.position >= gameSteps) {
        playProgress.textContent = "You reached the finish line!";
      } else {
        playProgress.textContent = "Step " + p.position + " of " + gameSteps + " — keep going!";
      }
      return;
    }
    if (playMode === "computer") {
      const c = childPlayer();
      const d = dinoPlayer();
      if (!c || !d) {
        return;
      }
      playProgress.textContent =
        "You: step " + c.position + " of " + gameSteps + " · Dinosaur: step " + d.position + " — reach the finish before it catches you!";
      return;
    }
    const parts = players.map(function (p) {
      return p.label.split(" ")[0] + " " + p.position + "/" + gameSteps;
    });
    playProgress.textContent = parts.join(" · ");
  }

  function updateTurnLabel() {
    if (!playTurn) {
      return;
    }
    if (playMode === "solo") {
      playTurn.textContent = "";
      return;
    }
    if (playMode === "computer") {
      if (dinoQuestionTurn) {
        playTurn.textContent = "Dinosaur's turn — watch the pop-up!";
      } else {
        playTurn.textContent = "Your turn — answer in the pop-up to move!";
      }
      return;
    }
    const p = players[currentPlayerIndex];
    playTurn.textContent = p ? p.label + "'s turn — answer to move forward!" : "";
  }

  function updateQuestionModalHeading() {
    if (!questionTurnTitle) {
      return;
    }
    questionTurnTitle.classList.remove("question-modal__turn--dino");
    if (playMode === "solo") {
      questionTurnTitle.textContent = "Your turn";
    } else if (playMode === "computer") {
      if (dinoQuestionTurn) {
        questionTurnTitle.textContent = "Dinosaur's turn";
        questionTurnTitle.classList.add("question-modal__turn--dino");
      } else {
        questionTurnTitle.textContent = "Your turn";
      }
    } else {
      const p = players[currentPlayerIndex];
      questionTurnTitle.textContent = p ? p.label + "'s turn" : "Your turn";
    }
  }

  function setMcHintForPhase() {
    if (!mcHint) {
      return;
    }
    if (isVersusDino() && dinoQuestionTurn) {
      mcHint.textContent = "Watch the path — the dinosaur is picking an answer…";
      mcHint.setAttribute("aria-hidden", "false");
    } else {
      mcHint.textContent = "Tap an answer, or press 1–4 on the keyboard";
      mcHint.setAttribute("aria-hidden", "false");
    }
  }

  function updateRaceBgProgress() {
    if (!raceStage || gameSteps < 1) {
      return;
    }
    try {
      if (
        document.documentElement.classList.contains("kids-reduce-motion") ||
        (typeof window.matchMedia !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      ) {
        raceStage.style.removeProperty("--race-progress");
        return;
      }
    } catch (e) {}
    var maxPos = 0;
    for (var i = 0; i < players.length; i++) {
      if (players[i].position > maxPos) {
        maxPos = players[i].position;
      }
    }
    var t = Math.min(1, Math.max(0, maxPos / gameSteps));
    raceStage.style.setProperty("--race-progress", String(t));
  }

  function updateRaceVisual() {
    players.forEach(function (p) {
      if (p.el) {
        p.el.style.setProperty("--runner-left", pctForPosition(p.position) + "%");
      }
    });
    updateRaceBgProgress();
    updateStepDots();
    updateProgressText();
    updateTurnLabel();
  }

  function playRunnerHopByPlayerId(id) {
    const p = players.find(function (x) {
      return x.id === id;
    });
    if (!p || !p.el) {
      return;
    }
    p.el.classList.remove("race-runner--hop");
    const emoji = p.el.querySelector(".race-runner__emoji");
    if (emoji) {
      void emoji.offsetWidth;
    }
    p.el.classList.add("race-runner--hop");
    setTimeout(function () {
      p.el.classList.remove("race-runner--hop");
    }, 580);
  }

  function advanceTurn() {
    if (playMode === "solo" || playMode === "computer") {
      return;
    }
    const n = players.length;
    currentPlayerIndex = (currentPlayerIndex + 1) % n;
  }

  function checkWinMultiplayer(mover) {
    if (mover.position < gameSteps) {
      return false;
    }
    winTitle.textContent = mover.label + " wins!";
    winMessage.textContent =
      mover.label + " got to the finish first with " + gameSteps + " right answers in a row on their turns. Amazing race!";
    if (typeof KidsCore !== "undefined") {
      KidsCore.recordGame("math");
      KidsCore.confetti(document.getElementById("screenWin") || document.body);
      KidsCore.playSound("win");
      KidsCore.haptic("success");
    }
    let streak = 1;
    try {
      streak = Number(sessionStorage.getItem("mathWinStreak") || 0) + 1;
      sessionStorage.setItem("mathWinStreak", String(streak));
    } catch (e) {}
    winMessage.textContent += " Win streak this visit: " + streak + ".";
    showScreen("win");
    return true;
  }

  function checkWinSolo(mover) {
    if (mover.position < gameSteps) {
      return false;
    }
    winTitle.textContent = "You made it!";
    let streak = 1;
    try {
      streak = Number(sessionStorage.getItem("mathWinStreak") || 0) + 1;
      sessionStorage.setItem("mathWinStreak", String(streak));
    } catch (e) {}
    winMessage.textContent =
      "You got " + gameSteps + " questions right and made it to the end. What a star! Win streak this visit: " + streak + ".";
    if (typeof KidsCore !== "undefined") {
      KidsCore.recordGame("math");
      KidsCore.confetti(document.getElementById("screenWin") || document.body);
      KidsCore.playSound("win");
      KidsCore.haptic("success");
    }
    showScreen("win");
    return true;
  }

  function checkWinVersusDino(mover) {
    if (!mover || mover.isCpu) {
      return false;
    }
    if (mover.position < gameSteps) {
      return false;
    }
    winTitle.textContent = "You won the race!";
    winMessage.textContent =
      "You reached the finish before the dinosaur could catch you — and you kept " + gameSteps + " steps ahead on the path. Roar-some!";
    if (typeof KidsCore !== "undefined") {
      KidsCore.recordGame("math");
      KidsCore.confetti(document.getElementById("screenWin") || document.body);
      KidsCore.playSound("win");
      KidsCore.haptic("success");
    }
    let streak = 1;
    try {
      streak = Number(sessionStorage.getItem("mathWinStreak") || 0) + 1;
      sessionStorage.setItem("mathWinStreak", String(streak));
    } catch (e) {}
    winMessage.textContent += " Win streak this visit: " + streak + ".";
    showScreen("win");
    return true;
  }

  function showLoseDino() {
    if (raceStage) {
      raceStage.classList.add("is-caught");
    }
    loseTitle.textContent = "The dinosaur caught up!";
    loseMessage.textContent =
      "It got as far as you on the path. Take a breath and try again — you still get a one-step head start!";
    if (loseCard) {
      loseCard.classList.remove("lose-card--multi");
    }
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("no");
      KidsCore.haptic("light");
    }
    showScreen("lose");
    setTimeout(function () {
      if (raceStage) {
        raceStage.classList.remove("is-caught");
      }
    }, 700);
  }

  function resolveDinoTurn() {
    dinoTurnTimer = null;
    if (!isVersusDino() || !dinoQuestionTurn || !current) {
      return;
    }
    const d = dinoPlayer();
    const c = childPlayer();
    if (!d || !c) {
      return;
    }
    const gotIt = Math.random() < DINO_ANSWER_CORRECT_CHANCE;
    const dinoPick = gotIt ? current.answer : pickWrongDistractor();
    if (gotIt) {
      feedbackText.textContent = "Grr! The dinosaur got " + dinoPick + " — it stomps one step forward!";
      feedbackText.className = "feedback feedback--good";
      d.position += 1;
      playRunnerHopByPlayerId("cpu");
    } else {
      feedbackText.textContent = "Stomp! A wrong guess — the dinosaur doesn't move this time.";
      feedbackText.className = "feedback feedback--bad";
    }
    const card = document.querySelector(".question-modal__panel");
    if (card) {
      card.classList.add("shake");
      setTimeout(function () {
        card.classList.remove("shake");
      }, 400);
    }
    updateRaceVisual();
    if (d.position >= c.position) {
      showLoseDino();
      return;
    }
    dinoQuestionTurn = false;
    nextQuestion();
  }

  function renderChoices() {
    choiceGrid.innerHTML = "";
    if (!current) {
      return;
    }
    const dinoWait = isVersusDino() && dinoQuestionTurn;
    choiceOrder = buildChoices(current.answer);
    if (dinoWait) {
      choiceGrid.classList.add("mc-grid--dino-pending");
    } else {
      choiceGrid.classList.remove("mc-grid--dino-pending");
    }
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
      b.setAttribute("aria-label", "Answer " + val + (dinoWait ? "" : " (keyboard " + keyNum + ")"));
      if (dinoWait) {
        b.disabled = true;
        b.setAttribute("aria-disabled", "true");
      } else {
        b.addEventListener("click", function () {
          submitChoice(val);
        });
      }
      choiceGrid.appendChild(b);
    });
    if (!dinoWait) {
      setTimeout(function () {
        const first = choiceGrid.querySelector("button");
        if (first) {
          first.focus();
        }
      }, 0);
    }
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
    clearDinoTimer();
    wrongAttempts = 0;
    if (isVersusDino() && dinoQuestionTurn) {
      current = enrichForDots(makeProblem());
      questionText.textContent = current.text;
      feedbackText.textContent = "";
      feedbackText.className = "feedback";
      updateQuestionModalHeading();
      setMcHintForPhase();
      renderQuestionDots();
      renderChoices();
      updateTurnLabel();
      if (typeof KidsCore !== "undefined" && KidsCore.isReadAloudOn()) {
        KidsCore.speak("Dinosaur's turn. " + current.text.replace(/\?/g, "").replace(/=/g, "equals"));
      }
      dinoTurnTimer = setTimeout(resolveDinoTurn, 2000);
      return;
    }
    current = enrichForDots(makeProblem());
    questionText.textContent = current.text;
    feedbackText.textContent = "";
    feedbackText.className = "feedback";
    updateQuestionModalHeading();
    setMcHintForPhase();
    renderQuestionDots();
    renderChoices();
    updateTurnLabel();
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

  function placeRaceBirds() {
    const b1 = document.querySelector(".race-bird--1");
    const b2 = document.querySelector(".race-bird--2");
    if (!b1 || !b2) {
      return;
    }
    /* Left third vs right third so they never bunch in the middle */
    const left1 = 5 + Math.random() * 22;
    const left2 = 63 + Math.random() * 21;
    const top1 = 7 + Math.random() * 9;
    const top2 = 8 + Math.random() * 12;
    b1.style.left = left1 + "%";
    b1.style.top = top1 + "%";
    b2.style.left = left2 + "%";
    b2.style.top = top2 + "%";
    const d1 = -(Math.random() * 14).toFixed(1);
    const d2 = -(Math.random() * 16).toFixed(1);
    b1.style.setProperty("--bird-anim-delay", d1 + "s");
    b2.style.setProperty("--bird-anim-delay-2", d2 + "s");
  }

  function startGame() {
    clearDinoTimer();
    dinoQuestionTurn = false;
    level = selectedLevel();
    gameSteps = selectedPathSteps();
    const ph = document.getElementById("pictureHelp");
    pictureHelp = !!(ph && ph.checked);
    players = buildPlayers();
    if (playMode === "two" || playMode === "three") {
      currentPlayerIndex = 0;
    } else {
      currentPlayerIndex = 0;
    }
    playLevelLabel.textContent = LEVEL_LABELS[level] || LEVEL_LABELS[0];
    layoutStageClasses();
    showScreen("play");
    ensureRaceSteps();
    ensureRunnersDom();
    placeRaceBirds();
    updateRaceVisual();
    nextQuestion();
  }

  function activeMover() {
    if (playMode === "solo" || playMode === "computer") {
      return childPlayer() || players[0];
    }
    return players[currentPlayerIndex];
  }

  function submitChoice(num) {
    if (!current) {
      return;
    }
    if (isVersusDino() && dinoQuestionTurn) {
      return;
    }
    const mover = activeMover();
    if (!mover) {
      return;
    }
    if (num === current.answer) {
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("ok");
        KidsCore.haptic("success");
      }
      feedbackText.textContent = praise[Math.floor(Math.random() * praise.length)];
      feedbackText.className = "feedback feedback--good";
      mover.position += 1;
      playRunnerHopByPlayerId(mover.id);

      if (playMode === "solo") {
        if (checkWinSolo(mover)) {
          return;
        }
      } else if (playMode === "computer") {
        if (checkWinVersusDino(mover)) {
          return;
        }
        dinoQuestionTurn = true;
        updateRaceVisual();
        nextQuestion();
        return;
      } else {
        if (checkWinMultiplayer(mover)) {
          return;
        }
        advanceTurn();
        updateRaceVisual();
        nextQuestion();
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

      if (playMode === "computer") {
        dinoQuestionTurn = true;
        updateTurnLabel();
        nextQuestion();
        return;
      }
    }
  }

  document.getElementById("btnStart").addEventListener("click", startGame);

  document.getElementById("btnQuit").addEventListener("click", function () {
    clearDinoTimer();
    dinoQuestionTurn = false;
    showScreen("setup");
  });

  document.getElementById("btnPlayAgain").addEventListener("click", function () {
    startGame();
  });

  document.getElementById("btnMenu").addEventListener("click", function () {
    showScreen("setup");
  });

  var btnLoseAgain = document.getElementById("btnLoseAgain");
  var btnLoseMenu = document.getElementById("btnLoseMenu");
  if (btnLoseAgain) {
    btnLoseAgain.addEventListener("click", function () {
      startGame();
    });
  }
  if (btnLoseMenu) {
    btnLoseMenu.addEventListener("click", function () {
      showScreen("setup");
    });
  }

  document.addEventListener("keydown", function (e) {
    if (screenPlay.classList.contains("is-hidden") || screenPlay.hidden) {
      return;
    }
    if (isVersusDino() && dinoQuestionTurn) {
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
