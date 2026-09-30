/* Curated Year 4 electricity demonstration.
   Static content — nothing here calls story or image generation.
   A later generator could fill the same learningJourney shape. */

const IMG = "../../games/images/schools/demo/";

const learningJourney = {
  yearGroup: 4,
  subject: "Science",
  topic: "Electricity",
  character: "Alex",
  buddy: "Fox",
  learningObjective: "Identify whether a lamp will light in a simple series circuit.",
  demo: true,
  story: {
    title: "The Night the Lights Went Out",
    scenes: [
      {
        id: "click",
        kicker: "The problem",
        image: "lights-click",
        alt: "Alex and a fox stop on a lane as the cottage windows go dark",
        before: [
          "Evening was settling over Wondii Town. Alex and Fox padded along the lane, waiting for the lamps to twinkle on."
        ],
        burst: "CLICK!",
        after: [
          "Every light went out. Windows blinked dark. The street fell quiet.",
          "Something had happened to the town's electricity."
        ]
      },
      {
        id: "clue",
        kicker: "The first clue",
        image: "lights-clue",
        alt: "Alex and Fox look at a dark bulb, a cell and a coil of wire on a step",
        before: [
          "On a cottage step sat a little lamp. Its bulb would not light.",
          "Beside it lay a cell, a coil of wire, and a bulb that had rolled free."
        ],
        after: [
          "Fox tipped his head. “Why isn’t it shining?”",
          "Alex looked at the loose pieces. Electricity needs a complete path. If the path is broken, the bulb cannot light."
        ]
      },
      {
        id: "glows",
        kicker: "Building the circuit",
        image: "lights-glows",
        alt: "Alex holds a glowing bulb joined by wire to a cell, while Fox watches",
        before: [
          "Alex joined the pieces, one by one. Cell. Wire. Bulb. Wire. Back to the cell.",
          "This time the path was whole."
        ],
        burst: "GLOWS!",
        burstKind: "glow",
        after: [
          "Warm light spilled over Fox’s whiskers.",
          "“The electricity can travel all the way around,” said Alex."
        ]
      },
      {
        id: "gap",
        kicker: "The broken circuit",
        image: "lights-gap",
        alt: "Alex points at a cell and a dark bulb whose wire does not make a full loop",
        before: [
          "Further along, another lamp waited. This circuit had a gap. The wire did not meet, and the bulb stayed dark."
        ],
        ask: "Why isn’t this bulb lighting?",
        after: [
          "An incomplete circuit has a gap, so the electricity cannot flow around it. The cell is still there. The path is not."
        ]
      },
      {
        id: "switch",
        kicker: "The switch",
        image: "lights-switch",
        alt: "Alex reaches for a switch on a lamp post while Fox sits beside him",
        before: [
          "On the lamp post, Alex found a switch.",
          "Open, it left a gap in the circuit. Closed, it joined the path again."
        ],
        after: [
          "“Closing the switch completes the circuit,” said Fox, tail bright."
        ]
      },
      {
        id: "whoosh",
        kicker: "The town lights up",
        image: "lights-whoosh",
        alt: "Alex celebrates on a lane while cottage windows and street lamps glow, and Fox runs beside him",
        before: [
          "Alex closed the town’s circuit."
        ],
        burst: "WHOOSH!",
        after: [
          "Windows glowed. Street lamps shone like tiny moons. Fox leapt in a circle.",
          "Wondii Town was awake again — and Alex wanted to know what else a circuit could do."
        ]
      }
    ]
  },
  vocabulary: {
    words: ["CIRCUIT", "CELL", "BULB", "WIRE", "SWITCH", "POWER"],
    meanings: {
      circuit: "A circuit is a path that electricity can travel around.",
      cell: "A cell gives the circuit its energy. People often call it a battery.",
      bulb: "A bulb lights up when electricity flows through it.",
      wire: "A wire carries the electricity from one part of the circuit to the next.",
      switch: "A switch opens or closes a gap in the circuit.",
      electricity: "Electricity is the energy that can light a bulb when the path is complete.",
      complete: "A complete circuit has no gaps. The path joins all the way round.",
      incomplete: "An incomplete circuit has a gap, so the electricity cannot flow round.",
      gap: "A gap is a break in the path. Electricity cannot jump across it here.",
      power: "Power is the electricity the town uses to light its lamps."
    },
    grid: [
      "CIRCUITMXP",
      "EABFHKNRSQ",
      "LLBULBTYZA",
      "LDCVEGJHOW",
      "MWIRESPLKD",
      "NQXRFWABCE",
      "OSTUYIGKHM",
      "PRWVZT NQLF".replace(" ", ""),
      "QSUYCCEFRD",
      "POWERHGLMX"
    ],
    placed: {
      CIRCUIT: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
      CELL: [[0, 0], [1, 0], [2, 0], [3, 0]],
      BULB: [[2, 2], [2, 3], [2, 4], [2, 5]],
      WIRE: [[4, 1], [4, 2], [4, 3], [4, 4]],
      SWITCH: [[4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5]],
      POWER: [[9, 0], [9, 1], [9, 2], [9, 3], [9, 4]]
    }
  },
  activities: {
    circuitChallenge: {
      title: "Can you light the bulb?",
      pieces: ["cell", "bulb", "wire", "switch"],
      validLoops: [
        ["cell", "wire", "bulb", "wire"],
        ["cell", "wire", "bulb", "switch"],
        ["cell", "wire", "switch", "bulb"],
        ["cell", "switch", "bulb", "wire"]
      ]
    },
    mathsChallenge: {
      questions: [
        {
          prompt: "Alex needs enough bulbs to light 4 streets. Each street needs 6 bulbs. How many bulbs does Alex need altogether?",
          choices: ["10", "18", "24", "46"],
          answer: "24",
          nearly: "Nearly! There are 4 streets, and each one needs 6 bulbs. Try 4 groups of 6.",
          yes: "Exactly! 4 streets with 6 bulbs is 24."
        },
        {
          prompt: "Fox finds 5 spare wires. Alex already has 3. How many wires do they have now?",
          choices: ["2", "8", "15", "35"],
          answer: "8",
          nearly: "Nearly! Put the 3 wires and the 5 wires together.",
          yes: "Exactly! 3 and 5 make 8 wires."
        },
        {
          prompt: "Seven cottages each need 2 bulbs. How many bulbs is that?",
          choices: ["9", "14", "27", "72"],
          answer: "14",
          nearly: "Nearly! That is 7 groups of 2.",
          yes: "Exactly! 7 cottages with 2 bulbs is 14."
        },
        {
          prompt: "The town needs 24 bulbs. 6 are already shining. How many are still dark?",
          choices: ["4", "18", "20", "30"],
          answer: "18",
          nearly: "Nearly! Start at 24 and take away the 6 that are already lit.",
          yes: "Exactly! 24 take away 6 leaves 18 bulbs still dark."
        }
      ]
    },
    quiz: {
      questions: [
        {
          prompt: "What does a circuit need for electricity to flow?",
          choices: ["A complete path", "A broken wire", "An open gap"],
          answer: 0,
          nearly: "Nearly! Remember what happened when Alex found the gap in the circuit.",
          yes: "Exactly! Electricity needs a complete path."
        },
        {
          prompt: "What happens when a switch opens a circuit?",
          choices: ["The path is broken", "The bulb becomes larger", "The battery disappears"],
          answer: 0,
          nearly: "Nearly! When the switch was open, it left a gap.",
          yes: "Exactly! An open switch breaks the path."
        },
        {
          prompt: "Which component provides energy to our simple circuit?",
          choices: ["The fox", "The cell", "The flower"],
          answer: 1,
          nearly: "Nearly! The cell is the source of energy. The bulb uses it to shine.",
          yes: "Exactly! The cell provides the energy."
        },
        {
          prompt: "The bulb stays dark and the wire does not meet. What kind of circuit is this?",
          choices: ["A complete circuit", "An incomplete circuit", "A switch that is closed"],
          answer: 1,
          nearly: "Nearly! If the path is not joined all the way round, the circuit is incomplete.",
          yes: "Exactly! A gap makes the circuit incomplete."
        },
        {
          prompt: "What does closing a switch do?",
          choices: ["It removes the cell", "It breaks the bulb", "It completes the circuit"],
          answer: 2,
          nearly: "Nearly! Closing the switch joins the path so the electricity can travel round.",
          yes: "Exactly! Closing the switch completes the circuit."
        }
      ]
    },
    engineeringChallenge: {
      title: "Now you’re the engineer.",
      groups: [
        {
          id: "bulb",
          label: "Where should the bulb go?",
          choices: [
            { id: "window", label: "In the treehouse window", ok: true },
            { id: "buried", label: "Buried under the tree", ok: false, nearly: "Nearly! A bulb hidden under the tree would not light the room." },
            { id: "flowers", label: "In the flowers", ok: false, nearly: "Nearly! The flowers are lovely, but the treehouse window is the place to light." }
          ]
        },
        {
          id: "cell",
          label: "Where could the cell go?",
          choices: [
            { id: "box", label: "In a dry box by the trunk", ok: true },
            { id: "rain", label: "Out in the rain on the roof", ok: false, nearly: "Nearly! A cell stays safer somewhere dry." },
            { id: "inside", label: "Inside the glass bulb", ok: false, nearly: "Nearly! The cell stays outside the bulb, joined by wire." }
          ]
        },
        {
          id: "switch",
          label: "Where should the switch go?",
          choices: [
            { id: "door", label: "By the door, easy to reach", ok: true },
            { id: "top", label: "At the very top of the tree", ok: false, nearly: "Nearly! A switch is easier to use by the door." },
            { id: "none", label: "Nowhere", ok: false, nearly: "Nearly! A switch lets you turn the light off again." }
          ]
        }
      ]
    }
  },
  levels: {
    supported: "The lamp is dark. The wire has a gap. Can the electricity go round?",
    expected: "This circuit has a gap. Why isn’t the bulb lighting?",
    challenge: "Explain why an open switch and a broken wire both stop the bulb, even though the cell is still connected."
  },
  directions: [
    { year: "Year 2", topic: "Plants" },
    { year: "Year 3", topic: "Forces and magnets" },
    { year: "Year 4", topic: "Electricity", here: true },
    { year: "Year 5", topic: "Earth and space" }
  ]
};

const STEPS = [
  ["story", "Story"],
  ["words", "Words"],
  ["circuit", "Circuit"],
  ["maths", "Maths"],
  ["quiz", "Quiz"],
  ["engineering", "Build"]
];

const KEY = "wondii-demo-electricity";
const root = document.getElementById("journey");
const stepsNav = document.getElementById("jSteps");

const state = load();

function load() {
  const blank = {
    stage: "intro",
    scene: 0,
    found: [],
    slots: [null, null, null, null],
    switchOn: false,
    picked: null,
    mathsAt: 0,
    mathsDone: [],
    quizAt: 0,
    quizDone: [],
    plan: { bulb: null, cell: null, switch: null },
    board: { window: null, box: null, door: null },
    level: "expected",
    cleared: { story: false, words: false, circuit: false, maths: false, quiz: false, engineering: false }
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return saved ? Object.assign(blank, saved, {
      cleared: Object.assign(blank.cleared, saved.cleared || {}),
      plan: Object.assign(blank.plan, saved.plan || {}),
      board: Object.assign(blank.board, saved.board || {})
    }) : blank;
  } catch (err) {
    return blank;
  }
}

function save() {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

function go(stage, focus) {
  state.stage = stage;
  save();
  paint(focus !== false);
}

function paint(focus) {
  renderSteps();
  const view = {
    intro: viewIntro,
    story: viewStory,
    words: viewWords,
    circuit: viewCircuit,
    maths: viewMaths,
    quiz: viewQuiz,
    engineering: viewEngineering,
    done: viewDone,
    more: viewMore
  }[state.stage] || viewIntro;
  document.body.classList.toggle("is-words", state.stage === "words");
  root.innerHTML = view();
  bind(root);
  if (focus) {
    const head = root.querySelector("h1, h2");
    if (head) {
      head.setAttribute("tabindex", "-1");
      head.focus();
    }
  }
}

function renderSteps() {
  const onJourney = STEPS.some(function (step) { return step[0] === state.stage; });
  stepsNav.hidden = !onJourney && state.stage !== "done";
  const done = STEPS.filter(function (step) { return state.cleared[step[0]]; }).length;
  stepsNav.innerHTML = "<span class=\"j-meter\" role=\"progressbar\" aria-valuenow=\"" + done + "\" aria-valuemin=\"0\" aria-valuemax=\"" + STEPS.length + "\" aria-label=\"" + done + " of " + STEPS.length + " parts finished\"><span style=\"width:" + Math.round((done / STEPS.length) * 100) + "%\"></span></span>" +
    STEPS.map(function (step, index) {
    const id = step[0];
    const open = unlocked(id);
    const current = state.stage === id ? " aria-current=\"step\"" : "";
    const tick = state.cleared[id] ? " is-done" : "";
    return "<button type=\"button\" class=\"" + tick.trim() + "\" data-goto=\"" + id + "\" aria-label=\"Step " + (index + 1) + " " + step[1] + (state.cleared[id] ? ", done" : "") + "\"" + current + (open ? "" : " disabled") + "><span>" + (state.cleared[id] ? "✓" : index + 1) + "</span><span class=\"j-step-name\"> " + step[1] + "</span></button>";
  }).join("");
}

function unlocked(id) {
  const index = STEPS.findIndex(function (step) { return step[0] === id; });
  if (index <= 0) return true;
  return !!state.cleared[STEPS[index - 1][0]];
}

function viewIntro() {
  const steps = [
    "Read the story",
    "Word challenge",
    "Circuit challenge",
    "Maths challenge",
    "Quick quiz",
    "Engineering challenge"
  ];
  return wrap(
    "<p class=\"j-kicker\">Year 4 science</p>" +
    "<h1 class=\"j-title\">The Night the Lights Went Out</h1>" +
    "<p class=\"j-lead\">Something strange has happened in Wondii Town… Every light has gone out.</p>" +
    "<p class=\"j-lead\">Join the adventure, discover how circuits work and see if you can bring the town back to life.</p>" +
    "<ol class=\"j-path\">" + steps.map(function (label, i) {
      return "<li><b>" + (i + 1) + "</b><span>" + label + "</span></li>";
    }).join("") + "</ol>" +
    "<p class=\"j-note\">This is a curated demonstration for teachers. It uses Alex, Year 4, science and electricity. It is not part of the live student product, and it does not generate a new story.</p>" +
    "<div class=\"j-actions\">" +
      "<button type=\"button\" class=\"o-btn o-btn--lg j-btn\" data-go=\"story\">Start the adventure <span aria-hidden=\"true\">→</span></button>" +
      "<button type=\"button\" class=\"o-btn j-ghost\" data-go=\"done\">For teachers</button>" +
    "</div>"
  );
}

function viewStory() {
  const scene = learningJourney.story.scenes[state.scene];
  const last = state.scene === learningJourney.story.scenes.length - 1;
  const burst = scene.burst
    ? "<p class=\"j-burst" + (scene.burstKind === "glow" ? " j-burst--glow" : "") + "\">" + scene.burst + "</p>"
    : "";
  return "<article class=\"j-wrap j-wrap--wide j-spread\">" +
    "<img src=\"" + src(scene.image, scene.image === "lights-click" || scene.image === "lights-whoosh" ? 1400 : 1100) + "\" alt=\"" + scene.alt + "\" width=\"1100\" height=\"780\" />" +
    "<div>" +
      "<p class=\"j-progress\">Scene " + (state.scene + 1) + " of " + learningJourney.story.scenes.length + "</p>" +
      "<p class=\"j-kicker\">" + scene.kicker + "</p>" +
      "<h1 class=\"j-title\" style=\"font-size:clamp(1.8rem,3vw,2.4rem)\">" + learningJourney.story.title + "</h1>" +
      scene.before.map(para).join("") +
      burst +
      (scene.ask ? "<p class=\"j-ask\">" + scene.ask + "</p>" : "") +
      scene.after.map(para).join("") +
      "<div id=\"jDef\"></div>" +
      "<div class=\"j-actions\">" +
        "<button type=\"button\" class=\"o-btn j-ghost\" data-scene=\"-1\"" + (state.scene === 0 ? " disabled" : "") + ">Back</button>" +
        (last
          ? "<button type=\"button\" class=\"o-btn j-btn\" data-finish=\"story\">Word challenge <span aria-hidden=\"true\">→</span></button>"
          : "<button type=\"button\" class=\"o-btn j-btn\" data-scene=\"1\">Next scene <span aria-hidden=\"true\">→</span></button>") +
      "</div></div></article>";
}

function para(text) {
  return "<p class=\"j-lead\">" + markVocab(text) + "</p>";
}

function markVocab(text) {
  return text.replace(/\b(circuits|circuit|cells|cell|bulbs|bulb|wires|wire|switch|electricity|complete|incomplete|gap|power)\b/gi, function (word) {
    const key = word.toLowerCase().replace(/s$/, "").replace("cells", "cell");
    const meaningKey = learningJourney.vocabulary.meanings[word.toLowerCase()]
      ? word.toLowerCase()
      : (learningJourney.vocabulary.meanings[key] ? key : "");
    if (!meaningKey) return word;
    return "<button type=\"button\" class=\"j-vocab\" data-vocab=\"" + meaningKey + "\" aria-expanded=\"false\">" + word + "</button>";
  });
}

function viewWords() {
  const words = learningJourney.vocabulary.words;
  const found = state.found.length;
  return "<div class=\"j-wrap j-wrap--words\">" +
    "<div class=\"j-words-layout\">" +
      "<div class=\"j-words-copy\">" +
        "<p class=\"j-kicker\">Word challenge</p>" +
        "<h1 class=\"j-title\">Can you find the electricity words?</h1>" +
        "<p class=\"j-lead\">Drag in a straight line, or tap the first letter and then the last. Words can go across or down.</p>" +
        "<p class=\"j-progress\" id=\"jWordCount\">" + found + " of " + words.length + " words</p>" +
        meter(found, words.length) +
        "<ul class=\"j-words\">" + words.map(function (word) {
          const got = state.found.indexOf(word) !== -1;
          return "<li" + (got ? " class=\"is-found\"" : "") + ">" + word + "</li>";
        }).join("") + "</ul>" +
        (found === words.length
          ? "<div class=\"j-actions\"><button type=\"button\" class=\"o-btn j-btn\" data-finish=\"words\">Circuit challenge <span aria-hidden=\"true\">→</span></button></div>"
          : "") +
      "</div>" +
      "<div class=\"j-words-play\">" +
        "<div class=\"j-grid\" role=\"grid\" aria-label=\"Electricity word search\">" + gridHtml() + "</div>" +
        "<p class=\"j-live\" id=\"jLive\" aria-live=\"polite\"></p>" +
      "</div>" +
    "</div></div>";
}

function gridHtml() {
  const grid = learningJourney.vocabulary.grid;
  let html = "";
  grid.forEach(function (row, r) {
    for (let c = 0; c < row.length; c++) {
      const found = cellFound(r, c);
      html += "<button type=\"button\" class=\"j-cell" + (found ? " is-found" : "") + "\" role=\"gridcell\" data-r=\"" + r + "\" data-c=\"" + c + "\" aria-label=\"" + row[c] + (found ? ", in a found word" : "") + "\">" + row[c] + "</button>";
    }
  });
  return html;
}

function cellFound(r, c) {
  const placed = learningJourney.vocabulary.placed;
  return state.found.some(function (word) {
    return placed[word].some(function (cell) { return cell[0] === r && cell[1] === c; });
  });
}

function viewCircuit() {
  const labels = { cell: "Cell", bulb: "Bulb", wire: "Wire", switch: "Switch" };
  const stock = pieceStock();
  const lit = circuitOk().ok;
  return wrap(
    "<p class=\"j-kicker\">Circuit challenge</p>" +
    "<h1 class=\"j-title\">Can you light the bulb?</h1>" +
    "<p class=\"j-lead\">Drag a piece into the loop. You need a cell, a bulb and wires that join all the way round. A switch can sit in the loop too — close it to let the electricity through.</p>" +
    meter(state.slots.filter(Boolean).length, 4) +
    "<div class=\"j-loop" + (lit ? " is-lit" : "") + "\" aria-label=\"Circuit loop\">" +
      state.slots.map(function (piece, i) {
        const name = piece ? labels[piece] : "Empty space " + (i + 1);
        return "<button type=\"button\" class=\"j-slot" + (piece ? " is-filled" : "") + "\" data-slot=\"" + i + "\"" + (piece ? " data-drag=\"" + piece + "\" data-from=\"" + i + "\"" : "") + " aria-label=\"" + name + "\">" +
          (piece ? icon(piece) + "<span>" + labels[piece] + "</span>" : "<span>Drop here</span>") +
          "</button>";
      }).join("") +
    "</div>" +
    "<p class=\"j-note\">The bottom of the loop joins back to the start. Empty spaces are gaps.</p>" +
    "<div class=\"j-piece-row\" aria-label=\"Pieces\">" +
      learningJourney.activities.circuitChallenge.pieces.map(function (piece) {
        const left = stock[piece];
        const picked = state.picked === piece;
        return "<button type=\"button\" class=\"j-piece" + (picked ? " is-picked" : "") + "\" data-piece=\"" + piece + "\" data-drag=\"" + piece + "\"" + (left < 1 ? " disabled" : "") + " aria-pressed=\"" + picked + "\">" +
          icon(piece) + "<span>" + labels[piece] + (piece === "wire" ? " (" + left + ")" : "") + "</span></button>";
      }).join("") +
    "</div>" +
    (state.slots.indexOf("switch") !== -1
      ? "<div class=\"j-switch\"><button type=\"button\" data-switch>" + (state.switchOn ? "Switch is closed" : "Switch is open") + "</button><span>An open switch leaves a gap.</span></div>"
      : "") +
    "<p class=\"j-live\" id=\"jLive\" aria-live=\"polite\"></p>" +
    "<div class=\"j-actions\">" +
      "<button type=\"button\" class=\"o-btn j-btn\" data-try-circuit>Try the circuit</button>" +
      "<button type=\"button\" class=\"o-btn j-ghost\" data-clear-circuit>Clear</button>" +
      (state.cleared.circuit ? "<button type=\"button\" class=\"o-btn j-btn\" data-finish=\"circuit\">Maths challenge <span aria-hidden=\"true\">→</span></button>" : "") +
    "</div>"
  );
}

function icon(kind) {
  const paths = {
    cell: "<rect x=\"7\" y=\"8\" width=\"10\" height=\"22\" rx=\"3\" fill=\"#2563eb\"/><rect x=\"7\" y=\"8\" width=\"10\" height=\"7\" rx=\"3\" fill=\"#f59e0b\"/><rect x=\"10\" y=\"4\" width=\"4\" height=\"5\" rx=\"1\" fill=\"#94a3b8\"/>",
    bulb: "<circle cx=\"12\" cy=\"11\" r=\"6\" fill=\"#fef3c7\" stroke=\"#141b4d\" stroke-width=\"1.4\"/><path d=\"M10 16h4l-1 4h-2z\" fill=\"#94a3b8\"/><path d=\"M12 8v4M10 10h4\" stroke=\"#d97706\" stroke-width=\"1.2\"/>",
    wire: "<path d=\"M3 16c3-6 5 6 8 0s5 6 10 0\" fill=\"none\" stroke=\"#c2410c\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>",
    switch: "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\" fill=\"none\" stroke=\"#141b4d\" stroke-width=\"1.6\"/><path d=\"M7 16l8-6\" stroke=\"#c41230\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>"
  };
  return "<svg class=\"j-ico\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">" + paths[kind] + "</svg>";
}

function pieceStock() {
  const used = state.slots.filter(Boolean);
  const count = function (kind) { return used.filter(function (piece) { return piece === kind; }).length; };
  return { cell: 1 - count("cell"), bulb: 1 - count("bulb"), wire: 2 - count("wire"), switch: 1 - count("switch") };
}

function cycleMatch(kinds, pattern) {
  if (kinds.length !== pattern.length || kinds.some(function (kind) { return !kind; })) return false;
  const forward = kinds.join(",");
  const backward = kinds.slice().reverse().join(",");
  const target = pattern.join(",");
  return (forward + "," + forward).indexOf(target) !== -1 || (backward + "," + backward).indexOf(target) !== -1;
}

function circuitOk() {
  if (state.slots.some(function (piece) { return !piece; })) return { ok: false, reason: "gap" };
  const hasSwitch = state.slots.indexOf("switch") !== -1;
  if (hasSwitch && !state.switchOn) return { ok: false, reason: "switch" };
  const loops = learningJourney.activities.circuitChallenge.validLoops;
  const match = loops.some(function (pattern) { return cycleMatch(state.slots, pattern); });
  return match ? { ok: true } : { ok: false, reason: "gap" };
}

function viewMaths() {
  return questionView("maths", learningJourney.activities.mathsChallenge.questions, state.mathsAt, state.mathsDone, "Maths challenge", "These stay inside Alex’s town.", "Quick quiz");
}

function viewQuiz() {
  return questionView("quiz", learningJourney.activities.quiz.questions, state.quizAt, state.quizDone, "Quick quiz", "From the adventure you just played.", "Engineering challenge");
}

function questionView(kind, questions, index, done, kicker, blurb, nextLabel) {
  const q = questions[index];
  const solved = done.indexOf(index) !== -1;
  const dots = questions.map(function (_, i) {
    const mark = done.indexOf(i) !== -1 ? " is-done" : (i === index ? " is-now" : "");
    return "<span class=\"j-dot" + mark + "\"></span>";
  }).join("");
  return wrap(
    "<div class=\"j-pop\">" +
    "<p class=\"j-kicker\">" + (kind === "quiz" ? "Pop quiz" : kicker) + "</p>" +
    "<div class=\"j-dots\" aria-hidden=\"true\">" + dots + "</div>" +
    "<h1 class=\"j-title\">" + (kind === "maths" ? "Bulbs for the town" : "Pop quiz") + "</h1>" +
    "<p class=\"j-progress\">Question " + (index + 1) + " of " + questions.length + " · " + done.length + " correct. " + blurb + "</p>" +
    meter(done.length, questions.length) +
    "<p class=\"j-ask\">" + q.prompt + "</p>" +
    "<div class=\"j-choices\">" + q.choices.map(function (choice, i) {
      return "<button type=\"button\" class=\"j-choice\" data-" + kind + "=\"" + i + "\">" + choice + "</button>";
    }).join("") + "</div>" +
    "<p class=\"j-live\" id=\"jLive\" aria-live=\"polite\"></p>" +
    "<div class=\"j-actions\">" +
      (solved && index < questions.length - 1 ? "<button type=\"button\" class=\"o-btn j-btn\" data-next-q=\"" + kind + "\">Next question</button>" : "") +
      (solved && index === questions.length - 1 ? "<button type=\"button\" class=\"o-btn j-btn\" data-finish=\"" + kind + "\">" + nextLabel + " <span aria-hidden=\"true\">→</span></button>" : "") +
    "</div></div>"
  );
}

function meter(now, max) {
  const pct = max ? Math.round((now / max) * 100) : 0;
  return "<div class=\"j-meter j-meter--block\" role=\"progressbar\" aria-valuenow=\"" + now + "\" aria-valuemin=\"0\" aria-valuemax=\"" + max + "\" aria-label=\"" + now + " of " + max + "\"><span style=\"width:" + pct + "%\"></span></div>";
}

function viewEngineering() {
  const activity = learningJourney.activities.engineeringChallenge;
  const labels = { bulb: "Bulb", cell: "Cell", switch: "Switch" };
  const zones = [
    { id: "window", label: "Window" },
    { id: "box", label: "Dry box" },
    { id: "door", label: "By the door" }
  ];
  const board = state.board;
  const used = {};
  zones.forEach(function (zone) { if (board[zone.id]) used[board[zone.id]] = true; });
  const placed = zones.filter(function (zone) { return board[zone.id] && ZONE_PIECE[zone.id] === board[zone.id]; }).length;
  return "<div class=\"j-wrap j-plan\">" +
    "<p class=\"j-kicker\">Engineering challenge</p>" +
    "<h1 class=\"j-title\">" + activity.title + "</h1>" +
    "<p class=\"j-lead\">Drag the bulb, the cell and the switch onto the treehouse. The bulb lights the window, the cell stays dry, and the switch needs to be easy to reach.</p>" +
    "<p class=\"j-progress\">" + placed + " of 3 in the right place</p>" +
    meter(placed, 3) +
    "<div class=\"j-tree" + (state.cleared.engineering ? " is-lit" : "") + "\">" +
      "<img src=\"" + src("lights-tree", 1400) + "\" alt=\"Alex and Fox look up at a dark treehouse window\" width=\"1400\" height=\"788\" />" +
      zones.map(function (zone) {
        const piece = board[zone.id];
        return "<button type=\"button\" class=\"j-zone j-zone--" + zone.id + (piece ? " is-filled" : "") + "\" data-zone=\"" + zone.id + "\"" +
          (piece ? " data-drag=\"" + piece + "\" data-from-zone=\"" + zone.id + "\"" : "") +
          " aria-label=\"" + zone.label + (piece ? ", " + labels[piece] + ". Drag it away or tap to put it back." : ". Drop a piece here, or tap a piece first.") + "\">" +
          (piece ? icon(piece) + "<span>" + labels[piece] + "</span>" : "<span>" + zone.label + "</span>") +
          "</button>";
      }).join("") +
    "</div>" +
    "<div class=\"j-piece-row j-piece-row--build\" aria-label=\"Pieces to place\">" +
      ["bulb", "cell", "switch"].map(function (piece) {
        if (used[piece]) return "";
        const picked = state.picked === piece;
        return "<button type=\"button\" class=\"j-piece" + (picked ? " is-picked" : "") + "\" data-eng=\"" + piece + "\" data-drag=\"" + piece + "\" aria-pressed=\"" + picked + "\">" +
          icon(piece) + "<span>" + labels[piece] + "</span></button>";
      }).join("") +
    "</div>" +
    "<p class=\"j-note\">Try a wrong spot too. Drag a piece onto one of these, or tap a piece and then the spot.</p>" +
    "<div class=\"j-decoys\">" +
      "<button type=\"button\" class=\"j-decoy\" data-decoy=\"buried\">Under the tree</button>" +
      "<button type=\"button\" class=\"j-decoy\" data-decoy=\"roof\">On the roof</button>" +
      "<button type=\"button\" class=\"j-decoy\" data-decoy=\"top\">Top of the tree</button>" +
    "</div>" +
    "<p class=\"j-live\" id=\"jLive\" aria-live=\"polite\"></p>" +
    "<div class=\"j-actions\">" +
      "<button type=\"button\" class=\"o-btn j-btn\" data-light>Light the treehouse</button>" +
      (state.cleared.engineering ? "<button type=\"button\" class=\"o-btn j-ghost\" data-go=\"done\">Finish the journey</button>" : "") +
    "</div></div>";
}

function viewDone() {
  const ticks = [
    ["story", "Story"],
    ["words", "Words"],
    ["circuit", "Circuit"],
    ["maths", "Maths"],
    ["quiz", "Quiz"],
    ["engineering", "Engineering"]
  ];
  const all = ticks.every(function (tick) { return state.cleared[tick[0]]; });
  return wrap(
    "<p class=\"j-kicker\">" + (all ? "Journey complete" : "For teachers") + "</p>" +
    "<h1 class=\"j-title\">" + (all ? "You brought the lights back!" : "Imagine creating this from one lesson.") + "</h1>" +
    (all ? "<p class=\"j-lead\">Alex and Fox can see Wondii Town again.</p>" : "<p class=\"j-lead\">You can read this before you play. The activities above are the demonstration.</p>") +
    "<ul class=\"j-ticks\">" + ticks.map(function (tick) {
      return "<li>" + tick[1] + (state.cleared[tick[0]] ? "" : " — still to explore") + "</li>";
    }).join("") + "</ul>" +
    "<div class=\"j-card\"><h2>Today you explored</h2><p>Electrical circuits, complete paths, cells, bulbs, switches and problem solving.</p></div>" +
    teacherBlocks() +
    "<div class=\"j-actions\">" +
      "<button type=\"button\" class=\"o-btn j-btn\" data-go=\"more\">Explore another adventure</button>" +
      "<button type=\"button\" class=\"o-btn j-ghost\" data-restart>Start again</button>" +
      "<a class=\"o-btn j-ghost\" href=\"../../ramsden.html#learning\">Back to the school page</a>" +
    "</div>"
  );
}

function teacherBlocks() {
  const level = state.level;
  return "<div class=\"j-card\"><h2>This example uses</h2>" +
    "<p><strong>Alex</strong> · Year 4 · Science · Electricity</p>" +
    "<p>The same kind of journey could later be shaped around:</p>" +
    "<p><strong>Your child or class</strong> + year group + subject + topic + learning objective + level.</p>" +
    "<ul class=\"j-soon\">" + learningJourney.directions.map(function (item) {
      return "<li><span>" + item.year + " · " + item.topic + "</span><span class=\"j-pill\">" + (item.here ? "This demo" : "Direction · not ready") + "</span></li>";
    }).join("") + "</ul>" +
    "<p class=\"j-note\">Those other topics show where Wondii could go. They are not production-ready adventures.</p></div>" +
    "<div class=\"j-card\"><h2>Adapt the experience</h2>" +
    "<p class=\"j-note\">A look at how the wording could change. This demo itself stays at the expected Year 4 level. There is no adaptive engine here yet.</p>" +
    "<div class=\"j-levels\">" +
      levelButton("supported", "Supported") +
      levelButton("expected", "Expected") +
      levelButton("challenge", "Challenge") +
    "</div>" +
    "<div class=\"j-sample\"><p><strong>" + levelLabel(level) + ".</strong> " + levelBlurb(level) + "</p><p>" + learningJourney.levels[level] + "</p></div></div>" +
    "<div class=\"j-card\"><h2>Imagine creating this from one lesson objective.</h2>" +
    "<p><strong>Year group:</strong> Year 4<br /><strong>Subject:</strong> Science<br /><strong>Topic:</strong> Electricity<br /><strong>Learning objective:</strong> " + learningJourney.learningObjective + "</p>" +
    "<p>Wondii creates:</p><ul class=\"j-ticks\"><li>Personalised story</li><li>Vocabulary activity</li><li>STEM challenge</li><li>Maths reinforcement</li><li>Comprehension quiz</li><li>Creative task</li></ul>" +
    "<p class=\"j-note\">In this demonstration those six pieces were written and illustrated in advance, so every teacher sees the same example.</p></div>";
}

function levelButton(id, label) {
  return "<button type=\"button\" data-level=\"" + id + "\" aria-pressed=\"" + (state.level === id) + "\">" + label + "</button>";
}

function levelLabel(id) {
  return { supported: "Supported", expected: "Expected", challenge: "Challenge" }[id];
}

function levelBlurb(id) {
  return {
    supported: "Shorter sentences, simpler vocabulary, more visual clues, fewer answer options.",
    expected: "Age-appropriate vocabulary, independent questions, a standard challenge.",
    challenge: "Richer vocabulary, reasoning questions, more complex problems."
  }[id];
}

function viewMore() {
  return wrap(
    "<p class=\"j-kicker\">Product direction</p>" +
    "<h1 class=\"j-title\">More adventures could follow.</h1>" +
    "<p class=\"j-lead\">This demonstration has one journey ready to play. The others are examples of topics Wondii could turn into the same kind of adventure later.</p>" +
    "<ul class=\"j-soon\">" + learningJourney.directions.map(function (item) {
      return "<li><span>" + item.year + " · " + item.topic + "</span><span class=\"j-pill\">" + (item.here ? "Play this one" : "Not built yet") + "</span></li>";
    }).join("") + "</ul>" +
    "<div class=\"j-actions\">" +
      "<button type=\"button\" class=\"o-btn j-btn\" data-go=\"intro\">Back to this adventure</button>" +
      "<a class=\"o-btn j-ghost\" href=\"../../ramsden.html#learning\">School page</a>" +
    "</div>"
  );
}

function wrap(html) {
  return "<div class=\"j-wrap\">" + html + "</div>";
}

function src(name, width) {
  const wide = {
    "lights-click": ["lights-click-900.webp", "lights-click-1400.webp"],
    "lights-clue": ["lights-clue-760.webp", "lights-clue-1100.webp"],
    "lights-glows": ["lights-glows-760.webp", "lights-glows-1100.webp"],
    "lights-gap": ["lights-gap-760.webp", "lights-gap-1100.webp"],
    "lights-switch": ["lights-switch-760.webp", "lights-switch-1100.webp"],
    "lights-whoosh": ["lights-whoosh-900.webp", "lights-whoosh-1400.webp"],
    "lights-tree": ["lights-tree-900.webp", "lights-tree-1400.webp"]
  }[name];
  return IMG + (width > 1000 ? wide[1] : wide[0]);
}

function bind(scope) {
  scope.querySelectorAll("[data-go]").forEach(function (btn) {
    btn.addEventListener("click", function () { go(btn.getAttribute("data-go")); });
  });
  scope.querySelectorAll("[data-scene]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.scene = Math.max(0, Math.min(learningJourney.story.scenes.length - 1, state.scene + Number(btn.getAttribute("data-scene"))));
      save();
      paint(true);
    });
  });
  scope.querySelectorAll("[data-finish]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-finish");
      state.cleared[id] = true;
      const order = ["story", "words", "circuit", "maths", "quiz", "engineering", "done"];
      go(order[order.indexOf(id) + 1]);
    });
  });
  scope.querySelectorAll("[data-vocab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const key = btn.getAttribute("data-vocab");
      const box = document.getElementById("jDef");
      const open = btn.getAttribute("aria-expanded") === "true";
      scope.querySelectorAll("[data-vocab]").forEach(function (other) { other.setAttribute("aria-expanded", "false"); });
      if (open) {
        box.innerHTML = "";
        return;
      }
      btn.setAttribute("aria-expanded", "true");
      box.innerHTML = "<p class=\"j-def\">" + learningJourney.vocabulary.meanings[key] + "</p>";
    });
  });
  scope.querySelectorAll("[data-restart]").forEach(function (btn) {
    btn.addEventListener("click", restart);
  });
  scope.querySelectorAll("[data-level]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.level = btn.getAttribute("data-level");
      save();
      paint(false);
      const pressed = root.querySelector("[data-level=\"" + state.level + "\"]");
      if (pressed) pressed.focus();
    });
  });
  bindWords(scope);
  bindCircuit(scope);
  bindQuestions(scope);
  bindPlan(scope);
  bindDrag(scope);
}

function bindWords(scope) {
  const grid = scope.querySelector(".j-grid");
  if (!grid) return;
  let origin = null;
  let anchor = null;
  let dragging = false;
  grid.addEventListener("pointerdown", function (event) {
    const cell = event.target.closest("[data-r]");
    if (!cell) return;
    dragging = true;
    origin = cellPos(cell);
    grid.setPointerCapture(event.pointerId);
    preview([origin]);
  });
  grid.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY);
    const hit = cell && cell.closest ? cell.closest("[data-r]") : null;
    if (!hit) return;
    const line = cellsOnLine(origin, cellPos(hit));
    if (line) preview(line);
  });
  grid.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    const line = currentPreview();
    clearPreview();
    if (!line || line.length < 2) {
      if (anchor) {
        const joined = cellsOnLine(anchor, origin);
        anchor = null;
        if (joined && joined.length > 1) commitWord(joined);
      } else {
        anchor = origin;
        const live = document.getElementById("jLive");
        if (live) live.textContent = "First letter chosen. Tap or drag to the last letter.";
      }
      return;
    }
    anchor = null;
    commitWord(line);
  });
  grid.addEventListener("keydown", function (event) {
    const cell = event.target.closest("[data-r]");
    if (!cell) return;
    const pos = cellPos(cell);
    const move = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[event.key];
    if (move) {
      event.preventDefault();
      const next = grid.querySelector("[data-r=\"" + (pos.r + move[0]) + "\"][data-c=\"" + (pos.c + move[1]) + "\"]");
      if (next) next.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!anchor) {
        anchor = pos;
        cell.classList.add("is-hot");
      } else {
        const line = cellsOnLine(anchor, pos);
        clearPreview();
        anchor = null;
        if (line && line.length > 1) commitWord(line);
      }
    }
  });
}

function cellPos(cell) {
  return { r: Number(cell.getAttribute("data-r")), c: Number(cell.getAttribute("data-c")) };
}

function cellsOnLine(a, b) {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = dr === 0 ? 0 : dr / Math.abs(dr);
  const sc = dc === 0 ? 0 : dc / Math.abs(dc);
  const line = [];
  for (let i = 0; i <= steps; i++) line.push({ r: a.r + sr * i, c: a.c + sc * i });
  return line;
}

function preview(line) {
  document.querySelectorAll(".j-cell").forEach(function (cell) { cell.classList.remove("is-hot"); });
  line.forEach(function (pos) {
    const cell = document.querySelector("[data-r=\"" + pos.r + "\"][data-c=\"" + pos.c + "\"]");
    if (cell) cell.classList.add("is-hot");
  });
}

function currentPreview() {
  const cells = Array.from(document.querySelectorAll(".j-cell.is-hot")).map(cellPos);
  if (!cells.length) return null;
  cells.sort(function (a, b) { return a.r - b.r || a.c - b.c; });
  return cells;
}

function clearPreview() {
  document.querySelectorAll(".j-cell.is-hot").forEach(function (cell) { cell.classList.remove("is-hot"); });
}

function commitWord(line) {
  const grid = learningJourney.vocabulary.grid;
  const text = line.map(function (pos) { return grid[pos.r][pos.c]; }).join("");
  const reverse = text.split("").reverse().join("");
  const words = learningJourney.vocabulary.words;
  const match = words.indexOf(text) !== -1 ? text : (words.indexOf(reverse) !== -1 ? reverse : "");
  const live = document.getElementById("jLive");
  if (!match) {
    if (live) {
      live.className = "j-live is-near";
      live.textContent = "Not one of the electricity words. Try a straight line.";
    }
    return;
  }
  if (state.found.indexOf(match) === -1) state.found.push(match);
  save();
  paint(false);
  const note = document.getElementById("jLive");
  if (note) {
    note.className = "j-live is-good";
    note.textContent = "Found " + match + ". " + state.found.length + " of " + words.length + ".";
  }
}

const ZONE_PIECE = { window: "bulb", box: "cell", door: "switch" };
const DECOY_NEARLY = {
  bulb: {
    buried: "Nearly! A bulb hidden under the tree would not light the room.",
    roof: "Nearly! The bulb lights the window.",
    top: "Nearly! The bulb belongs in the window, where Alex can see."
  },
  cell: {
    buried: "Nearly! A cell stays safer somewhere dry.",
    roof: "Nearly! A cell stays safer somewhere dry.",
    top: "Nearly! The cell stays outside the bulb, in a dry box."
  },
  switch: {
    buried: "Nearly! A switch is easier to use by the door.",
    roof: "Nearly! A switch on the roof would be hard to reach.",
    top: "Nearly! A switch is easier to use by the door."
  }
};
const WRONG_ZONE = {
  bulb: {
    box: "Nearly! The bulb lights the window, not the dry box.",
    door: "Nearly! The bulb belongs in the window."
  },
  cell: {
    window: "Nearly! The cell stays outside the bulb, joined by wire.",
    door: "Nearly! A cell stays safer in a dry box."
  },
  switch: {
    window: "Nearly! A switch is easier to use by the door.",
    box: "Nearly! The switch goes by the door, easy to reach."
  }
};

let suppressClick = false;

function bindDrag(scope) {
  scope.querySelectorAll("[data-drag]").forEach(function (btn) {
    btn.addEventListener("pointerdown", function (event) {
      if (event.button > 0 || btn.disabled) return;
      const piece = btn.getAttribute("data-drag");
      const fromSlot = btn.hasAttribute("data-from") ? Number(btn.getAttribute("data-from")) : null;
      const fromZone = btn.getAttribute("data-from-zone");
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      const ghost = document.createElement("div");
      ghost.className = "j-drag";
      ghost.innerHTML = icon(piece);
      document.body.appendChild(ghost);
      placeGhost(ghost, event);
      function move(e) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) moved = true;
        placeGhost(ghost, e);
        if (!moved) return;
        ghost.hidden = true;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        ghost.hidden = false;
        document.querySelectorAll(".is-over").forEach(function (el) { el.classList.remove("is-over"); });
        const hit = under && under.closest && under.closest("[data-slot], [data-zone], [data-decoy], .j-piece-row");
        if (hit) hit.classList.add("is-over");
      }
      function up(e) {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        ghost.remove();
        document.querySelectorAll(".is-over").forEach(function (el) { el.classList.remove("is-over"); });
        if (!moved) return;
        suppressClick = true;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const slot = under && under.closest && under.closest("[data-slot]");
        const zone = under && under.closest && under.closest("[data-zone]");
        const decoy = under && under.closest && under.closest("[data-decoy]");
        const tray = under && under.closest && under.closest(".j-piece-row");
        if (state.stage === "circuit") dropCircuit(piece, fromSlot, slot, tray);
        else dropBoard(piece, fromZone, zone, decoy, tray);
        setTimeout(function () { suppressClick = false; }, 0);
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  });
}

function placeGhost(ghost, event) {
  ghost.style.left = event.clientX + "px";
  ghost.style.top = event.clientY + "px";
}

function dropCircuit(piece, fromSlot, slotEl) {
  if (fromSlot == null) {
    if (!slotEl) return;
    const index = Number(slotEl.getAttribute("data-slot"));
    if (state.slots[index] || pieceStock()[piece] < 1) return;
    state.slots[index] = piece;
    state.picked = null;
  } else if (slotEl) {
    const index = Number(slotEl.getAttribute("data-slot"));
    if (index === fromSlot) return;
    const other = state.slots[index];
    state.slots[index] = piece;
    state.slots[fromSlot] = other || null;
  } else {
    state.slots[fromSlot] = null;
  }
  settleCircuit();
}

function settleCircuit() {
  const result = state.slots.every(Boolean) ? circuitOk() : null;
  state.cleared.circuit = !!(result && result.ok);
  save();
  paint(false);
  if (!result) return;
  const live = document.getElementById("jLive");
  if (!live) return;
  if (result.ok) {
    live.className = "j-live is-good";
    live.textContent = "You did it! The circuit is complete. Electricity needs a complete path around the circuit.";
  } else if (result.reason === "switch") {
    live.className = "j-live is-near";
    live.textContent = "Almost! The switch is open, so the path is broken.";
  } else {
    live.className = "j-live is-near";
    live.textContent = "Almost! There's still a gap in the circuit.";
  }
}

function dropBoard(piece, fromZone, zoneEl, decoyEl) {
  const note = { text: "", good: false };
  if (fromZone) state.board[fromZone] = null;
  if (decoyEl) {
    note.text = (DECOY_NEARLY[piece] || {})[decoyEl.getAttribute("data-decoy")] || "Nearly! Try the window, the dry box, or the door.";
  } else if (zoneEl) {
    const zone = zoneEl.getAttribute("data-zone");
    if (ZONE_PIECE[zone] !== piece) {
      note.text = (WRONG_ZONE[piece] || {})[zone] || "Nearly! That piece belongs somewhere else.";
    } else {
      Object.keys(state.board).forEach(function (key) {
        if (state.board[key] === piece) state.board[key] = null;
      });
      state.board[zone] = piece;
      note.good = true;
      note.text = piece === "bulb" ? "The bulb sits in the window." : piece === "cell" ? "The cell is safe in the dry box." : "The switch is by the door.";
    }
  }
  state.picked = null;
  const complete = state.board.window === "bulb" && state.board.box === "cell" && state.board.door === "switch";
  state.cleared.engineering = complete;
  state.plan.bulb = complete || state.board.window === "bulb" ? "window" : null;
  state.plan.cell = complete || state.board.box === "cell" ? "box" : null;
  state.plan.switch = complete || state.board.door === "switch" ? "door" : null;
  if (complete) {
    note.good = true;
    note.text = "The window glows. Bulb in the window, cell in a dry box, switch by the door — joined in one complete circuit.";
  }
  save();
  paint(false);
  const live = document.getElementById("jLive");
  if (live && note.text) {
    live.className = "j-live " + (note.good ? "is-good" : "is-near");
    live.textContent = note.text;
  }
}

function bindCircuit(scope) {
  scope.querySelectorAll("[data-piece]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (suppressClick) return;
      state.picked = btn.getAttribute("data-piece");
      save();
      paint(false);
      const again = root.querySelector("[data-piece=\"" + state.picked + "\"]");
      if (again) again.focus();
    });
  });
  scope.querySelectorAll("[data-slot]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (suppressClick) return;
      const index = Number(btn.getAttribute("data-slot"));
      if (state.slots[index]) {
        state.slots[index] = null;
        state.cleared.circuit = false;
        save();
        paint(false);
        return;
      }
      if (state.picked && pieceStock()[state.picked] > 0) {
        state.slots[index] = state.picked;
        state.picked = null;
      }
      settleCircuit();
    });
  });
  scope.querySelectorAll("[data-switch]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.switchOn = !state.switchOn;
      settleCircuit();
    });
  });
  scope.querySelectorAll("[data-clear-circuit]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.slots = [null, null, null, null];
      state.switchOn = false;
      state.picked = null;
      state.cleared.circuit = false;
      save();
      paint(false);
    });
  });
  scope.querySelectorAll("[data-try-circuit]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      settleCircuit();
      const live = document.getElementById("jLive");
      if (live && !state.slots.every(Boolean) && !live.textContent) {
        live.className = "j-live is-near";
        live.textContent = "Almost! There's still a gap in the circuit.";
      }
    });
  });
}

function bindQuestions(scope) {
  [["maths", learningJourney.activities.mathsChallenge.questions, "mathsAt", "mathsDone"],
    ["quiz", learningJourney.activities.quiz.questions, "quizAt", "quizDone"]].forEach(function (pack) {
    scope.querySelectorAll("[data-" + pack[0] + "]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const questions = pack[1];
        const index = state[pack[2]];
        const q = questions[index];
        const choice = Number(btn.getAttribute("data-" + pack[0]));
        const correct = String(q.choices[q.answer] || q.answer) === String(q.choices[choice] || choice) && (typeof q.answer === "number" ? choice === q.answer : q.choices[choice] === q.answer);
        const live = document.getElementById("jLive");
        scope.querySelectorAll("[data-" + pack[0] + "]").forEach(function (other) { other.classList.remove("is-right", "is-near"); });
        if (correct) {
          btn.classList.add("is-right");
          if (state[pack[3]].indexOf(index) === -1) state[pack[3]].push(index);
          save();
          if (live) {
            live.className = "j-live is-good";
            live.textContent = q.yes;
          }
          paint(false);
          const note = document.getElementById("jLive");
          if (note) {
            note.className = "j-live is-good";
            note.textContent = q.yes;
          }
        } else if (live) {
          btn.classList.add("is-near");
          live.className = "j-live is-near";
          live.textContent = q.nearly;
        }
      });
    });
  });
  scope.querySelectorAll("[data-next-q]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const kind = btn.getAttribute("data-next-q");
      if (kind === "maths") state.mathsAt += 1;
      else state.quizAt += 1;
      save();
      paint(true);
    });
  });
}

function bindPlan(scope) {
  scope.querySelectorAll("[data-eng]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (suppressClick) return;
      state.picked = btn.getAttribute("data-eng");
      save();
      paint(false);
      const again = root.querySelector("[data-eng=\"" + state.picked + "\"]");
      if (again) again.focus();
    });
  });
  scope.querySelectorAll("[data-zone]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (suppressClick) return;
      const zone = btn.getAttribute("data-zone");
      if (state.picked) {
        dropBoard(state.picked, null, btn, null);
        return;
      }
      if (state.board[zone]) {
        state.board[zone] = null;
        state.cleared.engineering = false;
        state.plan = { bulb: state.board.window === "bulb" ? "window" : null, cell: state.board.box === "cell" ? "box" : null, switch: state.board.door === "switch" ? "door" : null };
        save();
        paint(false);
      }
    });
  });
  scope.querySelectorAll("[data-decoy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (suppressClick || !state.picked) return;
      dropBoard(state.picked, null, null, btn);
    });
  });
  scope.querySelectorAll("[data-light]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const live = document.getElementById("jLive");
      const complete = state.board.window === "bulb" && state.board.box === "cell" && state.board.door === "switch";
      if (!complete) {
        if (live) {
          live.className = "j-live is-near";
          live.textContent = "Drag the bulb to the window, the cell to the dry box, and the switch by the door.";
        }
        return;
      }
      state.cleared.engineering = true;
      save();
      paint(false);
      const note = document.getElementById("jLive");
      if (note) {
        note.className = "j-live is-good";
        note.textContent = "The window glows. Bulb in the window, cell in a dry box, switch by the door — joined in one complete circuit.";
      }
    });
  });
}

document.getElementById("jSteps").addEventListener("click", function (event) {
  const btn = event.target.closest("[data-goto]");
  if (!btn || btn.disabled) return;
  go(btn.getAttribute("data-goto"));
});

function restart() {
  sessionStorage.removeItem(KEY);
  const fresh = load();
  Object.keys(state).forEach(function (key) { delete state[key]; });
  Object.assign(state, fresh);
  go("intro");
}

document.addEventListener("keydown", function (event) {
  if (state.stage !== "story") return;
  if (event.target.closest("button, a, input, textarea")) return;
  if (event.key === "ArrowRight") {
    const next = root.querySelector("[data-scene=\"1\"], [data-finish=\"story\"]");
    if (next) next.click();
  }
  if (event.key === "ArrowLeft") {
    const back = root.querySelector("[data-scene=\"-1\"]");
    if (back && !back.disabled) back.click();
  }
});

paint(false);
