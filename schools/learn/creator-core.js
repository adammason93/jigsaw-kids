/* Teacher adventure draft. Not a live session and not a second class store.
   Suggestions come from the lesson text. They are not treated as facts. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiCreatorCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PLAY = [
    { id: "whole_class", engine: "none", title: "Whole class", text: "Everyone works together and earns one class reward." },
    { id: "teacher_class", engine: "teacher_class", title: "Teacher vs class", text: "Can the class beat the teacher?" },
    { id: "two", engine: "two", title: "2 teams", text: "Split the class into two teams." },
    { id: "multiple", engine: "multiple", title: "Multiple teams", text: "Split the class into three teams." },
    { id: "individual", engine: "none", title: "Individual turns", text: "Wondii chooses pupils during activities." },
    { id: "custom", engine: "custom", title: "Custom teams", text: "Choose exactly who is on each team." }
  ];

  var CAPABILITIES = [
    { id: "quiz", name: "Quiz", description: "A class question with a correct answer.", purpose: "Check understanding", minutes: 4, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "spin", name: "Spin a pupil", description: "Choose someone from today's class.", purpose: "Choose a pupil", minutes: 1, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "word_search", name: "Word search", description: "Find the lesson words in a grid.", purpose: "Vocabulary recap", minutes: 6, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "story", name: "Story", description: "Read a short passage together.", purpose: "Introduce the idea", minutes: 3, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "mystery", name: "Mystery", description: "Reveal one idea from the lesson.", purpose: "A surprise recall", minutes: 2, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] },
    { id: "doors", name: "Pick a door", description: "The class chooses one of three doors.", purpose: "Choose together", minutes: 2, modes: ["whole_class", "teacher_class", "two", "multiple", "individual", "custom"] }
  ];

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 8);
  }

  function playMode(id) {
    for (var i = 0; i < PLAY.length; i++) if (PLAY[i].id === id) return PLAY[i];
    return PLAY[0];
  }

  function capabilities(registry) {
    return CAPABILITIES.filter(function (item) {
      if (!registry || !registry.resolve) return true;
      var info = registry.resolve(item.id);
      return info && !info.unknown && item.id !== "done" && item.id !== "complete";
    });
  }

  function capability(id, registry) {
    var list = capabilities(registry);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function blankDraft() {
    return {
      id: uid("adv"),
      status: "draft",
      sourceKind: "",
      source: { type: "", filename: "", text: "", unsupported: false },
      title: "",
      subject: "",
      topic: "",
      year: "",
      yearSource: "",
      goals: [],
      vocabulary: [],
      classId: "",
      className: "",
      classYear: "",
      playMode: "whole_class",
      teamStyle: "auto",
      teams: [],
      away: [],
      guests: [],
      activities: [],
      notes: "",
      minutes: 0,
      notice: "",
      adaptedFrom: "",
      saved: false
    };
  }

  function yearFromText(text) {
    var match = String(text || "").match(/\byear\s*([1-6])\b/i);
    return match ? "Year " + match[1] : "";
  }

  function yearFromClass(room) {
    if (!room) return "";
    if (room.yearLabel) return String(room.yearLabel);
    return yearFromText(room.name || "");
  }

  function subjectFrom(text) {
    var lower = String(text || "").toLowerCase();
    if (/science|electric|plant|force|magnet|space|habitat/.test(lower)) return "Science";
    if (/\bmaths\b|mathematics|fraction|addition|times table|subtraction|multiplication/.test(lower)) return "Maths";
    if (/\benglish\b|phonics|grammar|spelling|comprehension/.test(lower)) return "English";
    if (/history|roman|tudor|viking|victorians/.test(lower)) return "History";
    if (/geograph|river|map skills/.test(lower)) return "Geography";
    return "";
  }

  function topicFrom(text) {
    var lower = String(text || "").toLowerCase();
    if (/electric/.test(lower)) return "Electricity";
    if (/fraction/.test(lower)) return "Fractions";
    if (/magnet/.test(lower)) return "Magnets";
    var line = String(text || "").split(/\n/).map(function (part) { return part.trim(); }).filter(Boolean)[0] || "";
    if (line.length > 48) return "";
    return line.replace(/[.?!]$/, "");
  }

  function linesAfter(text, label) {
    var parts = String(text || "").split(/\n/);
    var found = -1;
    var i;
    for (i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase().indexOf(label) !== -1) found = i;
    }
    if (found < 0) return [];
    var out = [];
    for (i = found + 1; i < parts.length; i++) {
      var line = parts[i].trim().replace(/^[-•]\s*/, "");
      if (!line) {
        if (out.length) break;
        continue;
      }
      if (/^[A-Za-z ]{0,40}:$/.test(line) && out.length) break;
      out.push(line);
    }
    return out;
  }

  function wordsFrom(text) {
    var listed = linesAfter(text, "vocabulary").concat(linesAfter(text, "key words"));
    var found = {};
    var words = [];
    function add(word) {
      var clean = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (clean.length < 3 || clean.length > 14 || found[clean]) return;
      found[clean] = 1;
      words.push(clean);
    }
    listed.forEach(function (line) {
      line.split(/[,;/]/).forEach(add);
    });
    var hints = String(text || "").match(/\b(circuit|battery|switch|current|conductor|insulator|wire|bulb|fraction|quarter|half|numerator|denominator|magnet|force)\b/gi) || [];
    hints.forEach(add);
    return words.slice(0, 12);
  }

  function analyseSource(text) {
    var source = String(text || "").trim();
    if (source.length < 12) return { ok: false, message: "Add a little more about the lesson." };
    var year = yearFromText(source);
    var subject = subjectFrom(source);
    var topic = topicFrom(source);
    var goals = linesAfter(source, "objective").slice(0, 4);
    var vocabulary = wordsFrom(source);
    return {
      ok: true,
      subject: subject,
      subjectStated: !!subject,
      topic: topic,
      topicStated: !!topic,
      year: year,
      yearStated: !!year,
      goals: goals,
      vocabulary: vocabulary,
      notice: "Wondii only filled what the lesson text states. Check anything that looks uncertain."
    };
  }

  function applyAnalysis(draft, analysis) {
    if (!analysis || !analysis.ok) return draft;
    if (analysis.subjectStated) draft.subject = analysis.subject;
    if (analysis.topicStated) draft.topic = analysis.topic;
    if (analysis.yearStated) {
      draft.year = analysis.year;
      draft.yearSource = "stated";
    }
    if (analysis.goals.length) draft.goals = analysis.goals.slice();
    if (analysis.vocabulary.length) draft.vocabulary = analysis.vocabulary.slice();
    draft.notice = analysis.notice;
    if (!draft.title) draft.title = draft.topic ? draft.topic + " adventure" : "Learning adventure";
    return draft;
  }

  function setClass(draft, room) {
    draft.classId = room ? room.id : "";
    draft.className = room ? room.name : "";
    draft.classYear = yearFromClass(room);
    draft.away = [];
    draft.guests = [];
    draft.teams = [];
    if (draft.yearSource !== "teacher" && draft.yearSource !== "stated" && draft.classYear) {
      draft.year = draft.classYear;
      draft.yearSource = "class";
    }
    return draft;
  }

  function setLearningYear(draft, year) {
    draft.year = year;
    draft.yearSource = "teacher";
    return draft;
  }

  function takingPart(draft, room) {
    var away = {};
    (draft.away || []).forEach(function (id) { away[id] = 1; });
    return ((room && room.pupils) || []).filter(function (pupil) { return pupil && !away[pupil.id]; });
  }

  function excludePupil(draft, pupilId, away) {
    var next = (draft.away || []).filter(function (id) { return id !== pupilId; });
    if (away) next.push(pupilId);
    draft.away = next;
    return draft;
  }

  function addGuest(draft, name) {
    var clean = String(name || "").trim().split(/\s+/)[0].slice(0, 24);
    if (!clean) return draft;
    draft.guests = (draft.guests || []).concat([{ id: uid("guest"), name: clean, temporary: true }]);
    return draft;
  }

  function splitTeams(pupils, count) {
    var people = (pupils || []).slice().sort(function (a, b) {
      return String(a.firstName || "").localeCompare(String(b.firstName || "")) || String(a.id).localeCompare(String(b.id));
    });
    var teams = [];
    var i;
    for (i = 0; i < count; i++) teams.push([]);
    people.forEach(function (pupil, index) { teams[index % count].push(pupil.id); });
    return teams;
  }

  function presentationSplit(pupils) {
    var girls = [];
    var boys = [];
    var open = [];
    (pupils || []).forEach(function (pupil) {
      if (pupil.presentation === "girl") girls.push(pupil.id);
      else if (pupil.presentation === "boy") boys.push(pupil.id);
      else open.push(pupil.id);
    });
    return { girls: girls, boys: boys, open: open, available: girls.length > 0 && boys.length > 0 };
  }

  function ensureTeams(draft, pupils) {
    var mode = playMode(draft.playMode);
    if (mode.engine === "none") {
      draft.teams = [];
      return draft;
    }
    var names = mode.engine === "teacher_class" ? ["Teacher", "Class"]
      : mode.engine === "two" || draft.playMode === "custom" ? ["Red", "Blue"]
      : ["Red", "Blue", "Green"];
    if (draft.playMode === "custom" && draft.teams && draft.teams.length >= 2 && draft.teamStyle === "custom") return draft;
    var buckets;
    if (mode.engine === "teacher_class") buckets = [[], pupils.map(function (pupil) { return pupil.id; })];
    else buckets = splitTeams(pupils, names.length);
    draft.teams = names.map(function (name, index) {
      return { id: (draft.teams[index] && draft.teams[index].id) || uid("team"), name: name, pupilIds: buckets[index] || [] };
    });
    draft.teamStyle = draft.playMode === "custom" ? "custom" : "auto";
    return draft;
  }

  function assignPupil(draft, pupilId, teamId) {
    draft.teams = (draft.teams || []).map(function (team) {
      var ids = (team.pupilIds || []).filter(function (id) { return id !== pupilId; });
      if (team.id === teamId) ids.push(pupilId);
      return { id: team.id, name: team.name, pupilIds: ids };
    });
    draft.teamStyle = "custom";
    draft.playMode = "custom";
    return draft;
  }

  function quizFrom(prompt, choices, correct, points) {
    return {
      id: uid("quiz"),
      mechanic: "quiz",
      purpose: "Check understanding",
      title: "Quiz",
      minutes: choices && choices.length === 2 && (correct === "true" || correct === "false") ? 3 : 4,
      why: "A question from the lesson you provided.",
      config: {
        kind: correct === "true" || correct === "false" ? "boolean" : "multiple",
        prompt: prompt,
        choices: choices,
        correct: correct,
        points: points == null ? 1 : points,
        participation: "whole_class",
        askSelected: false
      }
    };
  }

  function recommend(draft) {
    var words = (draft.vocabulary || []).slice(0, 12);
    var topic = draft.topic || "today's lesson";
    var activities = [];
    if (words.length >= 2) {
      activities.push(quizFrom("Which word belongs with " + topic + "?", [
        words[0], words[1], words[2] || "CLOUD", words[3] || "PENCIL"
      ].filter(function (word, index, list) { return list.indexOf(word) === index; }).slice(0, 4), words[0], 1));
      activities[0].title = "Quick start";
      activities[0].minutes = 2;
      activities[0].why = "A quick check using a word from the lesson.";
    } else if ((draft.goals || [])[0]) {
      activities.push(quizFrom(draft.goals[0], null, "true", 1));
      activities[0].config.kind = "boolean";
      activities[0].config.choices = ["True", "False"];
      activities[0].config.correct = "true";
      activities[0].title = "Quick start";
      activities[0].minutes = 2;
      activities[0].why = "A true or false check from the learning goal. Confirm it before the lesson.";
    } else {
      activities.push(quizFrom("", ["Yes", "No"], "", 1));
      activities[0].title = "Quick start";
    }
    activities.push({
      id: uid("spin"),
      mechanic: "spin",
      purpose: "Choose a pupil",
      title: "Pick an explorer",
      minutes: 1,
      why: "Choose someone from the class to take part.",
      config: { pool: "included", avoidRepeat: true, preferFresh: true }
    });
    if (words.length >= 2) {
      activities.push(quizFrom("True or false: " + (draft.goals[0] || (words[0] + " is part of " + topic + ".")), ["True", "False"], "true", 1));
      activities[activities.length - 1].title = "Check understanding";
      activities[activities.length - 1].config.kind = "boolean";
      activities[activities.length - 1].config.correct = "true";
    }
    if (words.length >= 2) {
      activities.push({
        id: uid("word"),
        mechanic: "word_search",
        purpose: "Vocabulary recap",
        title: "Key word hunt",
        minutes: 6,
        why: "Practise the key vocabulary from your lesson.",
        config: { title: topic, instruction: "Find the lesson words.", words: words.slice(0, 12), points: 1 }
      });
    }
    if (words.length >= 3) {
      activities.push(quizFrom("Which of these is also from " + topic + "?", [words[1], words[0], "TABLE", "RIVER"].filter(function (word, index, list) {
        return list.indexOf(word) === index;
      }).slice(0, 4), words[1], 1));
      activities[activities.length - 1].title = "Final challenge";
    }
    activities.forEach(function (activity) {
      var meta = capability(activity.mechanic);
      if (meta && !activity.purpose) activity.purpose = meta.purpose;
    });
    draft.activities = activities;
    draft.minutes = activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    return draft;
  }

  function moveActivity(draft, index, dir) {
    var next = index + dir;
    if (next < 0 || next >= draft.activities.length) return draft;
    var copy = draft.activities.slice();
    var item = copy[index];
    copy[index] = copy[next];
    copy[next] = item;
    draft.activities = copy;
    return draft;
  }

  function duplicateActivity(draft, index) {
    var source = draft.activities[index];
    if (!source) return draft;
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = uid("act");
    draft.activities.splice(index + 1, 0, copy);
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    return draft;
  }

  function removeActivity(draft, index) {
    draft.activities.splice(index, 1);
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    return draft;
  }

  function addActivity(draft, mechanic, registry) {
    var meta = capability(mechanic, registry);
    if (!meta) return draft;
    var activity = {
      id: uid("act"),
      mechanic: meta.id,
      purpose: meta.purpose,
      title: meta.name,
      minutes: meta.minutes,
      why: meta.description,
      config: {}
    };
    if (meta.id === "quiz") activity.config = { kind: "multiple", prompt: "", choices: ["", ""], correct: "", points: 1, participation: "whole_class", askSelected: false };
    if (meta.id === "spin") activity.config = { pool: "included", avoidRepeat: true, preferFresh: true };
    if (meta.id === "word_search") activity.config = { title: draft.topic || "Word search", instruction: "Find the lesson words.", words: [], points: 1, participation: playMode(draft.playMode).engine === "none" ? "whole_class" : "team_turn" };
    if (meta.id === "story" || meta.id === "mystery" || meta.id === "doors") activity.config = { lines: [draft.topic || "Today's idea."] };
    draft.activities.push(activity);
    draft.minutes += meta.minutes;
    return draft;
  }

  function activityIssue(activity, registry) {
    if (!activity || !capability(activity.mechanic, registry)) return "This activity cannot be played.";
    if (activity.mechanic === "quiz") {
      var quiz = activity.config || {};
      var kind = quiz.kind === "boolean" ? "boolean" : "multiple";
      if (!String(quiz.prompt || "").trim()) return "This quiz needs a question.";
      if (kind === "boolean") {
        if (quiz.correct !== "true" && quiz.correct !== "false") return "This quiz needs a correct answer.";
        return "";
      }
      var choices = (quiz.choices || []).map(function (choice) { return String(choice || "").trim(); }).filter(Boolean);
      if (choices.length < 2) return "Add at least two answers.";
      if (choices.length > 6) return "Use up to six answers.";
      if (!quiz.correct || choices.indexOf(quiz.correct) === -1) return "This quiz needs a correct answer.";
      return "";
    }
    if (activity.mechanic === "word_search") {
      var words = ((activity.config && activity.config.words) || []).map(function (word) {
        return String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
      }).filter(Boolean);
      if (!words.length) return "Add at least one word.";
      if (words.length > 12) return "A word search can hold up to 12 words.";
      var long = words.filter(function (word) { return word.length > 14; })[0];
      if (long) return long + " is too long. Use 14 letters or fewer.";
      return "";
    }
    return "";
  }

  function issues(draft, registry) {
    var list = [];
    if (!draft.activities.length) list.push("Add at least one activity.");
    draft.activities.forEach(function (activity, index) {
      var issue = activityIssue(activity, registry);
      if (issue) list.push("Activity " + (index + 1) + ": " + issue);
    });
    return list;
  }

  function slidesFor(draft) {
    return (draft.activities || []).map(function (activity) {
      if (activity.mechanic === "quiz") {
        var quiz = activity.config || {};
        var boolean = quiz.kind === "boolean";
        var choices = boolean
          ? [{ id: "true", text: "True" }, { id: "false", text: "False" }]
          : (quiz.choices || []).map(function (choice) { return String(choice || "").trim(); }).filter(Boolean);
        return {
          type: "question",
          kicker: activity.title || "Quiz",
          participation: quiz.participation || (quiz.askSelected ? "selected_pupil" : "whole_class"),
          teacherCue: (quiz.participation === "selected_pupil" || quiz.askSelected) ? "Ask the pupil Wondii has chosen." : "Choose an answer, then reveal it to the class.",
          lines: activity.why ? [] : [],
          question: {
            id: activity.id,
            kind: boolean ? "boolean" : "multiple",
            prompt: quiz.prompt,
            choices: choices,
            correct: boolean ? quiz.correct : quiz.correct,
            points: quiz.points == null ? 1 : Number(quiz.points)
          }
        };
      }
      if (activity.mechanic === "spin") {
        return {
          type: "spin",
          kicker: activity.title || "Spin a pupil",
          teacherCue: "Spin for someone who is here.",
          avoidRepeat: activity.config && activity.config.avoidRepeat !== false,
          preferFresh: !activity.config || activity.config.preferFresh !== false,
          lines: ["Spin for a pupil."]
        };
      }
      if (activity.mechanic === "word_search") {
        var search = activity.config || {};
        return {
          type: "word_search",
          participation: (activity.config && activity.config.participation) || "whole_class",
          kicker: search.title || activity.title || "Word search",
          teacherCue: activity.why || "",
          lines: [search.instruction || "Find the words."],
          words: (search.words || []).slice(),
          points: search.points == null ? 1 : Number(search.points)
        };
      }
      return {
        type: activity.mechanic,
        kicker: activity.title || "Activity",
        teacherCue: activity.why || "",
        lines: (activity.config && activity.config.lines) || [activity.title || ""]
      };
    });
  }

  function toAdventure(draft, orgId) {
    var copy = {
      id: draft.id,
      status: "ready",
      creator: "v2",
      organisationId: orgId || null,
      classId: draft.classId || "",
      className: draft.className || "",
      title: draft.title || draft.topic || "Learning adventure",
      source: { type: draft.sourceKind || draft.source.type || "paste", filename: draft.source.filename || "", text: draft.source.text || "" },
      learningMap: {
        subject: draft.subject || "",
        yearGroup: draft.year || "",
        topic: draft.topic || "",
        learningObjectives: (draft.goals || []).slice(),
        keyVocabulary: (draft.vocabulary || []).slice()
      },
      plan: {
        title: draft.title || draft.topic || "Learning adventure",
        slides: slidesFor(draft),
        activities: JSON.parse(JSON.stringify(draft.activities || []))
      },
      playMode: draft.playMode,
      teams: JSON.parse(JSON.stringify(draft.teams || [])),
      estimateMinutes: draft.minutes || 0,
      notes: draft.notes || "",
      adaptedFrom: draft.adaptedFrom || "",
      updatedAt: new Date().toISOString()
    };
    return copy;
  }

  function fromAdventure(item) {
    var draft = blankDraft();
    if (!item) return draft;
    draft.id = uid("adv");
    draft.adaptedFrom = item.id || "";
    draft.status = "draft";
    draft.title = item.title || (item.plan && item.plan.title) || "";
    draft.classId = "";
    draft.className = "";
    var map = item.learningMap || {};
    draft.subject = map.subject || "";
    draft.topic = map.topic || "";
    draft.year = map.yearGroup || "";
    draft.yearSource = draft.year ? "stated" : "";
    draft.goals = (map.learningObjectives || []).slice();
    draft.vocabulary = (map.keyVocabulary || []).slice();
    draft.source = { type: item.source && item.source.type || "", filename: item.source && item.source.filename || "", text: item.source && item.source.text || "", unsupported: false };
    draft.sourceKind = draft.source.type;
    draft.playMode = item.playMode || "whole_class";
    draft.teams = JSON.parse(JSON.stringify(item.teams || []));
    draft.notes = item.notes || "";
    draft.activities = JSON.parse(JSON.stringify((item.plan && item.plan.activities) || []));
    if (!draft.activities.length && item.plan && item.plan.slides) draft.activities = activitiesFromSlides(item.plan.slides);
    draft.activities = draft.activities.filter(function (activity) { return capability(activity.mechanic); });
    draft.minutes = draft.activities.reduce(function (sum, activity) { return sum + (activity.minutes || 0); }, 0);
    draft.saved = false;
    return draft;
  }

  function activitiesFromSlides(slides) {
    return (slides || []).map(function (slide) {
      var type = slide.type === "question" ? "quiz" : (slide.type === "word-search" ? "word_search" : slide.type);
      var activity = { id: uid("act"), mechanic: type || "story", purpose: "", title: slide.kicker || "Activity", minutes: 4, why: "", config: {} };
      if (type === "quiz" && slide.question) {
        activity.config = {
          kind: slide.question.kind || "multiple",
          prompt: slide.question.prompt || "",
          choices: (slide.question.choices || []).map(function (choice) { return typeof choice === "string" ? choice : choice.text; }),
          correct: slide.question.correct || "",
          points: slide.question.points == null ? 1 : slide.question.points,
          participation: slide.participation || "whole_class",
          askSelected: slide.participation === "selected_pupil"
        };
      } else if (type === "word_search") {
        activity.config = { title: slide.kicker || "", instruction: (slide.lines || [])[0] || "", words: slide.words || [], points: slide.points == null ? 1 : slide.points, participation: slide.participation || "whole_class" };
      } else if (type === "spin") {
        activity.config = { pool: "included", avoidRepeat: slide.avoidRepeat !== false, preferFresh: slide.preferFresh !== false };
        activity.minutes = 1;
      } else activity.config = { lines: slide.lines || [] };
      return activity;
    }).filter(function (activity) { return capability(activity.mechanic); });
  }

  var PARTICIPATION = [
    { id: "whole_class", label: "Whole class", text: "The class answers together." },
    { id: "selected_pupil", label: "Selected pupil", text: "The pupil already chosen answers." },
    { id: "spin", label: "Spin a pupil", text: "Spin chooses who answers." },
    { id: "team_turn", label: "Team turn", text: "The active team answers." },
    { id: "teacher_class", label: "Teacher vs class", text: "The class plays against the teacher." }
  ];

  function participationOptions(mechanic, modeId) {
    if (mechanic === "spin" || mechanic === "story" || mechanic === "mystery" || mechanic === "doors") return ["whole_class"];
    var mode = playMode(modeId);
    return PARTICIPATION.map(function (item) { return item.id; }).filter(function (id) {
      if (id === "team_turn" && mode.engine === "none") return false;
      if (id === "teacher_class" && mode.engine !== "teacher_class") return false;
      return true;
    });
  }

  function participationOf(activity) {
    var config = (activity && activity.config) || {};
    if (config.participation) return config.participation;
    if (config.askSelected) return "selected_pupil";
    return "whole_class";
  }

  function participationLabel(id) {
    var i;
    for (i = 0; i < PARTICIPATION.length; i++) if (PARTICIPATION[i].id === id) return PARTICIPATION[i].label;
    return "Whole class";
  }

  function scoreCopy(activity, modeId) {
    var config = (activity && activity.config) || {};
    var points = config.points == null ? 1 : Number(config.points);
    var part = participationOf(activity);
    var teamed = playMode(modeId).engine !== "none";
    if (!activity || activity.mechanic === "spin") return "Chooses who goes next.";
    if (activity.mechanic !== "quiz" && activity.mechanic !== "word_search") return "The class follows this together.";
    var unit = activity.mechanic === "word_search" ? " per word" : "";
    if (part === "selected_pupil" || part === "spin") return "+" + points + unit + (teamed ? " to their team" : " class reward");
    if (part === "team_turn") return "+" + points + unit + " to the active team";
    if (part === "teacher_class") return "+" + points + unit + " to the class";
    return "+" + points + unit + " class reward";
  }

  function libraryActions(item) {
    if (!isCurrent(item)) return ["Update this adventure"];
    return ["Start", "Preview", "Adapt", "Duplicate"];
  }

  function isCurrent(item) {
    if (!item || item.creator !== "v2" || !item.plan || !item.plan.activities) return false;
    return unsupportedMechanics(item).length === 0;
  }

  function unsupportedMechanics(item) {
    var found = {};
    var list = [];
    var activities = (item && item.plan && item.plan.activities) || [];
    var slides = (item && item.plan && item.plan.slides) || [];
    activities.forEach(function (activity) {
      var id = activity && activity.mechanic;
      if (id && !capability(id) && !found[id]) { found[id] = 1; list.push(id); }
    });
    if (!activities.length) slides.forEach(function (slide) {
      var id = slide && (slide.type === "question" ? "quiz" : slide.type);
      if (id && !capability(id) && !found[id]) { found[id] = 1; list.push(id); }
    });
    return list;
  }

  function sessionPlan(draft, room) {
    var here = takingPart(draft, room);
    var guests = (draft.guests || []).map(function (guest) {
      return { id: guest.id, firstName: guest.name, temporary: true };
    });
    var people = here.concat(guests.map(function (guest) { return { id: guest.id, firstName: guest.firstName }; }));
    var mode = playMode(draft.playMode);
    var working = { playMode: draft.playMode, teamStyle: draft.playMode === "custom" ? "custom" : "auto", teams: JSON.parse(JSON.stringify(draft.teams || [])) };
    if (mode.engine !== "none") {
      var present = {};
      people.forEach(function (pupil) { present[pupil.id] = 1; });
      if (working.teams.length) {
        working.teams = working.teams.map(function (team) {
          return { id: team.id, name: team.name, pupilIds: (team.pupilIds || []).filter(function (id) { return present[id]; }) };
        });
      } else ensureTeams(working, people);
    } else working.teams = [];
    var assignments = [];
    if (mode.engine !== "none") {
      working.teams.forEach(function (team, index) {
        (team.pupilIds || []).forEach(function (id) { assignments.push({ id: id, teamIndex: index }); });
      });
    }
    return {
      classId: draft.classId || "",
      pupils: here.map(function (pupil) { return { id: pupil.id, firstName: pupil.firstName }; }),
      guests: guests,
      teamMode: mode.engine,
      teamNames: working.teams.map(function (team) { return team.name; }),
      teamIds: working.teams.map(function (team) { return team.id; }),
      assignments: mode.engine === "none" ? null : assignments,
      begin: true,
      playMode: draft.playMode
    };
  }

  return {
    PLAY: PLAY,
    playMode: playMode,
    capabilities: capabilities,
    capability: capability,
    blankDraft: blankDraft,
    yearFromText: yearFromText,
    yearFromClass: yearFromClass,
    analyseSource: analyseSource,
    applyAnalysis: applyAnalysis,
    setClass: setClass,
    setLearningYear: setLearningYear,
    takingPart: takingPart,
    excludePupil: excludePupil,
    addGuest: addGuest,
    splitTeams: splitTeams,
    presentationSplit: presentationSplit,
    ensureTeams: ensureTeams,
    assignPupil: assignPupil,
    recommend: recommend,
    moveActivity: moveActivity,
    duplicateActivity: duplicateActivity,
    removeActivity: removeActivity,
    addActivity: addActivity,
    activityIssue: activityIssue,
    issues: issues,
    slidesFor: slidesFor,
    toAdventure: toAdventure,
    fromAdventure: fromAdventure,
    sessionPlan: sessionPlan,
    PARTICIPATION: PARTICIPATION,
    participationOptions: participationOptions,
    participationOf: participationOf,
    participationLabel: participationLabel,
    scoreCopy: scoreCopy,
    libraryActions: libraryActions,
    isCurrent: isCurrent,
    unsupportedMechanics: unsupportedMechanics
  };
});
