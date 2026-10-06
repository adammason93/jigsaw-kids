/* Provisional. Builds a local preview of a finished source-grounded lesson in the
   real Wondii player (schools/learn/present.html). It turns the boot's adventure into
   a journey with the creator's own code path (Core.toAdventure, the same call
   creator.js persistAdventure makes) and writes a seed page that puts that journey
   into this browser's localStorage library, then opens present.html?preview=1.
   The local site replaces js/score-config.js with an empty one, so the preview
   never talks to any Supabase project. Nothing here writes outside siteDir. */
"use strict";

var fs = require("fs");
var path = require("path");
var Core = require("../../schools/learn/creator-core.js");

var LIBRARY_KEY = "wondii-learning-adventures";
/* score-cloud.js hides account keys (the library is one) unless an account scope is
   bound. The local preview binds a fixed local scope instead of signing in. */
var PREVIEW_SCOPE = "local-preview";
var SCOPED_KEY = "wondii-u:" + PREVIEW_SCOPE + ":" + LIBRARY_KEY;
var REPO = path.resolve(__dirname, "../..");
var LINKS = ["schools", "js", "css", "games", "images", "fonts", "favicon.ico"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* Mirrors creator.js applyBrain + persistAdventure without the browser. */
function journeyFor(adventure, options) {
  var opts = options || {};
  var draft = Core.blankDraft();
  draft.id = opts.id || "sg-preview-" + Date.now();
  draft.activities = clone(adventure.activities || []);
  draft.minutes = adventure.estimateMinutes || draft.activities.reduce(function (sum, a) { return sum + (a.minutes || 0); }, 0);
  draft.subject = adventure.subject || "";
  draft.topic = adventure.topic || "";
  draft.title = adventure.title || "";
  draft.year = adventure.yearGroup || adventure.year || "";
  draft.goals = (adventure.objectives || []).slice();
  draft.vocabulary = (adventure.vocabulary || []).slice();
  draft.lessonPlan = adventure.lessonPlan || null;
  draft.storyPlan = adventure.storyPlan || null;
  if (adventure.storyScenes && adventure.storyScenes.length) draft.storyScenes = clone(adventure.storyScenes);
  draft.visualAssets = (adventure.visualAssets || []).map(function (asset) {
    var copy = clone(asset);
    if (copy.status === "ready" && opts.imageBase) copy.publicUrl = opts.imageBase + copy.id + ".jpg";
    return copy;
  });
  draft.generation = adventure.meta || { fallbackUsed: false };
  var journey = Core.toAdventure(draft, null);
  journey.provisional = "Provisional. Not classroom-ready. Not human-reviewed.";
  return journey;
}

function seedHtml(journey) {
  var data = JSON.stringify(journey).replace(/</g, "\\u003c");
  return "<!DOCTYPE html><html lang=\"en-GB\"><head><meta charset=\"UTF-8\"><title>Provisional preview seed</title></head><body>" +
    "<p>Provisional. Not classroom-ready. Not human-reviewed. Loading the lesson into this browser's local library...</p>" +
    "<script>(function(){var j=" + data + ";var k=" + JSON.stringify(SCOPED_KEY) + ";var list=[];" +
    "try{list=JSON.parse(localStorage.getItem(k)||\"[]\")||[];}catch(e){list=[];}" +
    "list=list.filter(function(x){return x&&x.id!==j.id;});list.unshift(j);localStorage.setItem(k,JSON.stringify(list));" +
    "location.replace(\"/schools/learn/present.html?journey=\"+encodeURIComponent(j.id)+\"&preview=1\");})();</script></body></html>";
}

function buildSite(options) {
  var siteDir = options.siteDir;
  var lessonDir = options.lessonDir;
  var lesson = JSON.parse(fs.readFileSync(path.join(lessonDir, "lesson.json"), "utf8"));
  fs.mkdirSync(path.join(siteDir, "sg", "images"), { recursive: true });
  LINKS.forEach(function (name) {
    var target = path.join(REPO, name);
    var link = path.join(siteDir, name);
    if (!fs.existsSync(target) || fs.existsSync(link)) return;
    if (name === "js") return;
    fs.symlinkSync(target, link);
  });
  // js/ is copied file by file as links so score-config.js can be replaced.
  var jsDir = path.join(siteDir, "js");
  fs.mkdirSync(jsDir, { recursive: true });
  fs.readdirSync(path.join(REPO, "js")).forEach(function (name) {
    var link = path.join(jsDir, name);
    if (name === "score-config.js" || name === "score-cloud.js" || fs.existsSync(link)) return;
    fs.symlinkSync(path.join(REPO, "js", name), link);
  });
  fs.writeFileSync(path.join(jsDir, "score-config.js"), "/* Local provisional preview: no Supabase. */\nwindow.SCORE_SYNC = { supabaseUrl: \"\", supabaseAnonKey: \"\" };\nwindow.SCORE_CONFIG = window.SCORE_SYNC;\n");
  fs.writeFileSync(path.join(jsDir, "score-cloud.js"), fs.readFileSync(path.join(REPO, "js", "score-cloud.js"), "utf8") +
    "\n/* Local provisional preview: bind a local scope, never an account. */\nif (window.KidsScoreCloud && KidsScoreCloud.bindAccountScope) KidsScoreCloud.bindAccountScope(" + JSON.stringify(PREVIEW_SCOPE) + ");\n");
  fs.writeFileSync(path.join(siteDir, "sw.js"), "/* no service worker in the local preview */\n");
  var imagesDir = path.join(lessonDir, "images");
  if (fs.existsSync(imagesDir)) fs.readdirSync(imagesDir).forEach(function (name) {
    fs.copyFileSync(path.join(imagesDir, name), path.join(siteDir, "sg", "images", name));
  });
  var journey = journeyFor(lesson.adventure, { id: options.id || "sg-y3-dinosaurs", imageBase: "/sg/images/" });
  fs.writeFileSync(path.join(siteDir, "sg", "journey.json"), JSON.stringify(journey, null, 1));
  fs.writeFileSync(path.join(siteDir, "sg", "index.html"), seedHtml(journey));
  return { journey: journey, seed: "/sg/index.html" };
}

module.exports = { journeyFor: journeyFor, seedHtml: seedHtml, buildSite: buildSite, LIBRARY_KEY: LIBRARY_KEY, SCOPED_KEY: SCOPED_KEY };

if (require.main === module) {
  var args = process.argv.slice(2);
  function arg(name, fallback) {
    var i = args.indexOf("--" + name);
    return i >= 0 ? args[i + 1] : fallback;
  }
  var result = buildSite({ lessonDir: path.resolve(arg("lesson")), siteDir: path.resolve(arg("site")), id: arg("id") });
  console.log(JSON.stringify({ seed: result.seed, slides: result.journey.plan.slides.length, assets: (result.journey.learningMap.visualAssets || []).length }));
}
