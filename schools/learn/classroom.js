/* Whole-class board mechanics. First names and preset avatars only.
   Rewards belong to the class session, not a public pupil ranking. */
(function (global) {
  "use strict";

  var NAMES_KEY = "wondii-board-names";
  var AVATARS = [
    { id: "pip", name: "Pip", image: "../../games/images/presets/preset-pip.jpg" },
    { id: "fox", name: "Fox", image: "../../games/images/presets/preset-fox.jpg" },
    { id: "dino", name: "Dinosaur", image: "../../games/images/presets/preset-dino.jpg" },
    { id: "bun", name: "Bunny", image: "../../games/images/presets/preset-bun.jpg" },
    { id: "frog", name: "Frog", image: "../../games/images/presets/preset-frog.jpg" },
    { id: "moon", name: "Moon", image: "../../games/images/presets/preset-moon.jpg" }
  ];
  var TEAM_NAMES = ["Rocket", "Explorer", "Dinosaur", "Ocean"];

  function uid() {
    return "pup_" + Math.random().toString(36).slice(2, 8);
  }

  function firstName(value) {
    var name = String(value || "").trim().split(/\s+/)[0] || "";
    return name.slice(0, 24);
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function rewardName(topic) {
    var text = String(topic || "").toLowerCase();
    if (/volcano|magma|lava/.test(text)) return "Magma crystals";
    if (/electric|circuit|energy/.test(text)) return "Energy";
    if (/ocean|sea|pearl/.test(text)) return "Pearls";
    if (/space|rocket|planet/.test(text)) return "Rocket fuel";
    if (/dino/.test(text)) return "Dinosaur eggs";
    if (/castle|knight/.test(text)) return "Keys";
    if (/wood|forest|tree/.test(text)) return "Acorns";
    if (/egypt|pharaoh/.test(text)) return "Pharaoh gems";
    if (/pirate|treasure/.test(text)) return "Treasure coins";
    return "Class tokens";
  }

  function savedNames() {
    try {
      var list = JSON.parse(localStorage.getItem(NAMES_KEY) || "[]");
      return Array.isArray(list) ? list.map(firstName).filter(Boolean).slice(0, 40) : [];
    } catch (e) {
      return [];
    }
  }

  function remember(names) {
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(names.map(firstName).filter(Boolean).slice(0, 40)));
    } catch (e) {}
  }

  function blankBoard(topic, playfulness) {
    return {
      roster: [],
      remaining: [],
      picked: [],
      currentId: "",
      selection: "fair",
      rewardName: rewardName(topic),
      reward: 0,
      rewardGoal: 5,
      rewards: "class",
      teams: [],
      teamCount: 0,
      awarded: {},
      playfulness: playfulness || "playful",
      reduced: false,
      sound: false
    };
  }

  function addPupil(board, name) {
    var clean = firstName(name);
    if (!clean) return null;
    var pupil = {
      id: uid(),
      firstName: clean,
      avatar: AVATARS[board.roster.length % AVATARS.length].id,
      here: true,
      inWheel: true
    };
    board.roster.push(pupil);
    return pupil;
  }

  function eligible(board) {
    return board.roster.filter(function (pupil) { return pupil.here && pupil.inWheel; });
  }

  function byId(board, id) {
    for (var i = 0; i < board.roster.length; i++) if (board.roster[i].id === id) return board.roster[i];
    return null;
  }

  function refill(board) {
    board.remaining = shuffle(eligible(board).map(function (pupil) { return pupil.id; }));
  }

  function take(board) {
    var pool = eligible(board);
    if (!pool.length) return null;
    if (board.selection === "teacher") return null;
    if (board.selection === "random") {
      var pupil = pool[Math.floor(Math.random() * pool.length)];
      board.currentId = pupil.id;
      if (board.picked.indexOf(pupil.id) === -1) board.picked.push(pupil.id);
      return pupil;
    }
    board.remaining = (board.remaining || []).filter(function (id) {
      return pool.some(function (pupil) { return pupil.id === id; });
    });
    if (!board.remaining.length) refill(board);
    var id = board.remaining.shift();
    var chosen = byId(board, id);
    if (!chosen) return null;
    board.currentId = chosen.id;
    if (board.picked.indexOf(chosen.id) === -1) board.picked.push(chosen.id);
    return chosen;
  }

  function skip(board) {
    var current = board.currentId;
    if (current) board.remaining.push(current);
    board.currentId = "";
    return take(board);
  }

  function choose(board, id) {
    var pupil = byId(board, id);
    if (!pupil || !pupil.here || !pupil.inWheel) return null;
    board.remaining = (board.remaining || []).filter(function (item) { return item !== id; });
    board.currentId = id;
    if (board.picked.indexOf(id) === -1) board.picked.push(id);
    return pupil;
  }

  function award(board, slideKey) {
    if (!board || board.rewards === "none") return false;
    if (!slideKey) return false;
    if (board.awarded[slideKey]) return false;
    board.awarded[slideKey] = true;
    board.reward += 1;
    return true;
  }

  function makeTeams(board, count) {
    board.teamCount = count;
    board.teams = [];
    if (!count) {
      board.roster.forEach(function (pupil) { pupil.team = ""; });
      return;
    }
    for (var t = 0; t < count; t++) board.teams.push({ id: "team_" + t, name: TEAM_NAMES[t] || "Team " + (t + 1), reward: 0 });
    var here = board.roster.filter(function (pupil) { return pupil.here; });
    here.forEach(function (pupil, index) { pupil.team = board.teams[index % count].id; });
  }

  function avatar(id) {
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i];
    return AVATARS[0];
  }

  global.Classroom = {
    AVATARS: AVATARS,
    firstName: firstName,
    rewardName: rewardName,
    savedNames: savedNames,
    remember: remember,
    blankBoard: blankBoard,
    addPupil: addPupil,
    eligible: eligible,
    byId: byId,
    take: take,
    skip: skip,
    choose: choose,
    award: award,
    makeTeams: makeTeams,
    avatar: avatar
  };
})(window);
