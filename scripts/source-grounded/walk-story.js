"use strict";
/* Headless walk of a story-led lesson in the real Wondii player (local provisional preview).
   Class screen: present.html?session=CODE after ClassRooms.createSession(journey, "live"), the call
   present.js makes. Pupil device: sg/join.html (real join.js with the local join stand-in).
   Each choose activity is answered wrong first, then right; each quiz question wrong then right.
   Usage: NODE_PATH=/path/to/node_modules node walk-story.js http://127.0.0.1:PORT OUTDIR */
var chromium = require("playwright-core").chromium;
var fs = require("fs");
var BASE = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
var log = [];
function L(o) { log.push(o); console.log(JSON.stringify(o).slice(0, 300)); }
function slug(t) { return String(t).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60); }
(async function () {
  var b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true });
  var ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  var p = await ctx.newPage();
  var errs = [];
  p.on("pageerror", function (e) { errs.push(e.message); });
  p.on("console", function (m) { if (m.type() === "error") errs.push("console:" + m.text()); });
  await p.goto(BASE + "/sg/index.html"); await p.waitForTimeout(2500);
  var journey = await (await p.request.get(BASE + "/sg/journey.json")).json();
  var code = await p.evaluate(function () { var id = new URLSearchParams(location.search).get("journey"); var j = WondiiLearn.allJourneys().find(function (x) { return x.id === id; }); var c = ClassRooms.createSession(j, "live", false, {}); return c && c.code; });
  L({ session: code, journey: journey.id, slides: journey.plan.slides.length });
  await p.goto(BASE + "/schools/learn/present.html?session=" + code); await p.waitForTimeout(2000);
  var n = 0;
  async function shot(label) { var f = "class-" + String(n).padStart(2, "0") + "-" + slug(label) + ".png"; n++; await p.screenshot({ path: OUT + "/" + f }); return f; }
  async function state() {
    return p.evaluate(function () {
      var q = function (s) { return document.querySelector(s); };
      var t = function (s) { return q(s) ? q(s).innerText.replace(/\s+/g, " ").trim() : ""; };
      var m = document.body.innerText.match(/Round (\d+) of (\d+)/); var qm = document.body.innerText.match(/Question (\d+) of (\d+)/);
      return { round: m ? Number(m[1]) : 0, question: qm ? Number(qm[1]) : 0, tag: t(".lesson-world-tag"), kicker: t(".lesson-kicker") || "",
        img: Array.from(document.querySelectorAll("img")).map(function (i) { return i.getAttribute("src"); }).filter(function (s) { return /sg\/images/.test(s || ""); }).join(","),
        picks: Array.from(document.querySelectorAll("[data-option]")).map(function (x) { return { i: x.getAttribute("data-option"), t: x.innerText.trim(), dis: x.disabled }; }),
        qchoices: Array.from(document.querySelectorAll("[data-choice]")).map(function (x) { return { c: x.getAttribute("data-choice"), t: x.innerText.trim(), dis: x.disabled }; }),
        go: q("#lessonPrimary") ? q("#lessonPrimary").innerText.trim() : "", startLive: !!q("#lessonStartLive"),
        text: document.body.innerText.replace(/\s+/g, " ").replace(/^.*?Finish Round \d+ of \d+/, "").slice(0, 700), full: document.body.innerText.replace(/\s+/g, " ") + "|" + (document.querySelector(".lesson-stage") ? document.querySelector(".lesson-stage").innerHTML.length : 0) };
    });
  }
  var quiz = (journey.plan.slides.find(function (s) { return s.type === "question"; }) || {}).questions || [];
  var chooseInt = [];
  journey.plan.slides.forEach(function (s) { (s.interactions || []).forEach(function (x) { if (x.type === "choose") chooseInt.push(x); }); });
  var s = await state(); L(Object.assign({ step: "lobby" }, s)); await shot("lobby");
  var pupil = await ctx.newPage();
  pupil.on("pageerror", function (e) { errs.push("pupil:" + e.message); });
  await pupil.setViewportSize({ width: 420, height: 820 });
  var pn = 0;
  async function pshot(label) { var f = "pupil-" + String(pn).padStart(2, "0") + "-" + slug(label) + ".png"; pn++; await pupil.screenshot({ path: OUT + "/" + f, fullPage: true }); return f; }
  async function ptext() { return (await pupil.evaluate(function () { return document.body.innerText; })).replace(/\s+/g, " ").trim().slice(0, 300); }
  await pupil.goto(BASE + "/sg/join.html?code=" + code); await pupil.waitForTimeout(1500);
  await pupil.fill("#joinName", "Pat"); if (!(await pupil.inputValue("#joinCode"))) await pupil.fill("#joinCode", code);
  await pupil.click("#joinGo"); await pupil.waitForTimeout(1200);
  L({ step: "pupil-join", shot: await pshot("after-join"), text: await ptext() });
  async function pupilAt(label) { await pupil.evaluate(function () { if (window.WondiiJoin) location.reload(); }); await pupil.waitForTimeout(1200); var f = await pshot(label); L({ step: "pupil-view", label: label, shot: f, text: await ptext() }); await p.bringToFront(); }
  await p.bringToFront();
  await p.click("#lessonStartLive"); await p.waitForTimeout(1500);
  var answered = {}; var actDone = {}; var actRound = {}; var lastKey = ""; var same = 0; var pupilScenes = 0;
  for (var i = 0; i < 140; i++) {
    s = await state();
    var key = s.round + "|" + s.question + "|" + s.full + "|" + s.go + "|" + s.picks.map(function (x) { return x.dis; }).join();
    same = key === lastKey ? same + 1 : 0; lastKey = key;
    if (same > 2) { L({ step: "stuck", s: s }); break; }
    var label = "r" + s.round + (s.question ? "-q" + s.question : "");
    var open = s.picks.filter(function (x) { return !x.dis; });
    if (open.length && !s.go) {
      // Activities appear in story order; one per round in a story lesson.
      if (actRound[s.round] == null) actRound[s.round] = Object.keys(actRound).length;
      var k = actRound[s.round];
      var ci = chooseInt[k] || chooseInt[0];
      var correct = ci.choices.findIndex(function (c) { return c.correct === true; });
      var wrong = ci.choices.findIndex(function (c) { return c.correct !== true; });
      if (!actDone[k]) {
        L({ step: "activity-shown", activity: k + 1, shot: await shot(label + "-activity" + (k + 1) + "-before"), s: s });
        await pupilAt(label + "-activity" + (k + 1));
        actDone[k] = 1;
        await p.click('[data-option="' + wrong + '"]'); await p.waitForTimeout(900); s = await state();
        L({ step: "activity-wrong", activity: k + 1, pick: ci.choices[wrong].text, shot: await shot(label + "-activity" + (k + 1) + "-wrong"), nextShown: !!s.go, s: s });
        continue;
      }
      await p.click('[data-option="' + correct + '"]'); await p.waitForTimeout(900); s = await state();
      L({ step: "activity-right", activity: k + 1, pick: ci.choices[correct].text, shot: await shot(label + "-activity" + (k + 1) + "-right"), nextShown: !!s.go, s: s });
      continue;
    }
    if (s.qchoices.length && s.qchoices.some(function (x) { return !x.dis; }) && !answered[s.question]) {
      var qd = quiz[s.question - 1];
      var f0 = await shot(label + "-question"); await pupilAt(label + "-question");
      var w = s.qchoices.find(function (x) { return x.t.indexOf(qd.correct) === -1; });
      await p.click('[data-choice="' + w.c + '"]'); await p.waitForTimeout(2000); answered[s.question] = 1;
      var s2 = await state();
      L({ step: "question-answered", q: s.question, prompt: qd.prompt, picked: w.t, correct: qd.correct, shotBefore: f0, shot: await shot(label + "-feedback"), after: s2.text });
      if (s.question === 1) await pupilAt(label + "-after-answer");
      continue;
    }
    var kind = /Teaching/.test(s.tag) ? "teaching" : s.tag ? "story" : "noimg";
    var f = await shot(label + "-" + slug(s.kicker || "") + "-" + kind);
    L({ step: "screen", shot: f, s: s });
    if (pupilScenes < 1 && kind === "story" && s.round > 1) { pupilScenes++; await pupilAt(label + "-story-scene"); }
    if (s.go) { await p.click("#lessonPrimary"); await p.waitForTimeout(900); continue; }
    L({ step: "end-no-next", s: s }); break;
  }
  await p.waitForTimeout(1000); s = await state(); L({ step: "final", shot: await shot("end"), s: s }); await pupilAt("end");
  L({ errors: errs });
  fs.writeFileSync(OUT + "/walk-log.json", JSON.stringify(log, null, 1));
  await b.close();
})();
