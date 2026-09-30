/* Stage renderers for the current adventure slides.
   They draw inside LessonStage. They do not score or advance the session. */
(function (global) {
  "use strict";

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function lines(slide) {
    return (slide && slide.lines || []).map(function (line) {
      return "<p class=\"lesson-copy\">" + escape(line) + "</p>";
    }).join("");
  }

  function story(slide) {
    return "<div class=\"lesson-story\">" +
      (slide.image ? "<img class=\"lesson-scene\" src=\"" + slide.image + "\" alt=\"" + escape(slide.alt || "") + "\" />" : "") +
      "<div><p class=\"lesson-kicker\">" + escape(slide.kicker || "Story") + "</p>" + lines(slide) +
      (slide.teacherCue ? "<p class=\"lesson-cue\">" + escape(slide.teacherCue) + "</p>" : "") +
      "</div></div>";
  }

  function question(slide, ctx) {
    var q = ctx.question;
    if (!q) return story(slide);
    var shown = !!ctx.reveal;
    var choices = (q.choices || []).map(function (choice) {
      var right = shown && choice.id === q.correct;
      var chosen = shown && ctx.pick === choice.id;
      return "<button type=\"button\" class=\"lesson-choice" + (right ? " is-right" : "") + (chosen && !right ? " is-again" : "") + "\" data-pick=\"" + escape(choice.id) + "\"><b>" + escape(choice.id) + "</b><span>" + escape(choice.text) + "</span></button>";
    }).join("");
    var note = "";
    if (shown && ctx.pick && ctx.pick === q.correct) note = "<p class=\"lesson-react lesson-react--yes\">Great work!</p>";
    else if (shown && ctx.pick) note = "<p class=\"lesson-react lesson-react--again\">Nearly! Let's have another look.</p>";
    else if (shown && q.explain) note = "<p class=\"lesson-react\">" + escape(q.explain) + "</p>";
    if (shown && q.explain && ctx.pick) note += "<p class=\"lesson-cue\">" + escape(q.explain) + "</p>";
    return "<div class=\"lesson-question\"><p class=\"lesson-kicker\">" + escape((slide && slide.kicker) || "Quiz") + "</p><h2 class=\"lesson-prompt\">" + escape(q.prompt) + "</h2><div class=\"lesson-choices\">" + choices + "</div>" + note +
      (shown && ctx.pick && ctx.pick !== q.correct ? "<button type=\"button\" class=\"lesson-quiet\" id=\"lessonTry\">Try again</button>" : "") +
      "</div>";
  }

  function spin(slide, ctx) {
    var face = ctx.selected && ctx.selected.portrait
      ? "<img class=\"lesson-face\" src=\"" + ctx.selected.portrait + "\" alt=\"\" />"
      : "";
    var name = ctx.selected ? "<p class=\"lesson-name\">" + escape(ctx.selected.name) + "</p>" : "<p class=\"lesson-copy\">Someone in the class is about to have a turn.</p>";
    return "<div class=\"lesson-spin\"><p class=\"lesson-kicker\">" + escape(slide.kicker || "Spin") + "</p>" + lines(slide) + face + name +
      "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonSpin\">Spin for someone</button></div>";
  }

  function mystery(slide, ctx) {
    var open = !!ctx.mysteryOpen;
    return "<div class=\"lesson-mystery\"><p class=\"lesson-kicker\">" + escape(slide.kicker || "Mystery") + "</p>" + lines(slide) +
      (open ? "<p class=\"lesson-react lesson-react--yes\">" + escape(ctx.mysteryText || "Keep the idea you have just learned.") + "</p>" : "<button type=\"button\" class=\"lesson-go lesson-go--stage\" id=\"lessonMystery\">Open it</button>") +
      "</div>";
  }

  function doors(slide, ctx) {
    var doors = [1, 2, 3].map(function (n) {
      var on = String(ctx.door || "") === String(n);
      return "<button type=\"button\" class=\"lesson-door" + (on ? " is-on" : "") + "\" data-door=\"" + n + "\"><span>Door</span><strong>" + n + "</strong></button>";
    }).join("");
    return "<div class=\"lesson-doors\"><p class=\"lesson-kicker\">" + escape(slide.kicker || "Pick a door") + "</p><p class=\"lesson-copy\">The class chooses one door.</p><div class=\"lesson-door-row\">" + doors + "</div>" +
      (ctx.door ? "<p class=\"lesson-react\">" + escape(ctx.doorText || "Today's idea stays with the class.") + "</p>" : "") +
      "</div>";
  }

  function pending(slide, label) {
    return "<div class=\"lesson-pending\"><p class=\"lesson-kicker\">" + escape(label) + "</p><h2 class=\"lesson-prompt\">" + escape((slide && (slide.kicker || slide.title)) || label) + "</h2><p class=\"lesson-copy\">This activity sits in the lesson. The class moves on when you continue.</p></div>";
  }

  function render(slide, ctx) {
    ctx = ctx || {};
    var type = (slide && slide.type) || ctx.mechanic || "story";
    if (type === "question" || type === "quiz") return { mode: "question", html: question(slide, ctx) };
    if (type === "spin") return { mode: "game", html: spin(slide, ctx) };
    if (type === "mystery") return { mode: "game", html: mystery(slide, ctx) };
    if (type === "doors") return { mode: "game", html: doors(slide, ctx) };
    if (type === "done" || type === "complete") return { mode: "celebration", html: "<div class=\"lesson-pending\"><p class=\"lesson-kicker\">Finish</p>" + lines(slide) + "</div>" };
    if (type === "word-search") return { mode: "game", html: pending(slide, "Word search") };
    if (type !== "story") return { mode: "standard", html: pending(slide, ctx.activity || "Activity") };
    return { mode: "story", html: story(slide || {}) };
  }

  global.WondiiLessonMechanics = { render: render };
})(typeof window !== "undefined" ? window : globalThis);
