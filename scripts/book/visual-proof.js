"use strict";

/* First visual proof. Maya only. Three spreads of book E. No other cast. */

var fs = require("fs");
var path = require("path");
var Guard = require("../source-grounded/spend-guard.js");
var Cast = require("../../js/character-bible.js");
var Visual = require("../../js/book-visual.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "visual-proof", "e");
var LEDGER = path.join(ROOT, "docs", "agent", "book-v2", "visual-proof", "spend-ledger.jsonl");
var BOOK = path.join(ROOT, "docs", "agent", "book-v2", "text-validation-depth", "e", "book.json");
var MODEL = "gpt-image-2.5-sunburst";
var SIZE = "1536x1024";
var QUALITY = "medium";
var VISION = "gpt-4o-mini";

function arg(name) {
  var hit = process.argv.filter(function (item) { return item.indexOf("--" + name + "=") === 0; })[0];
  return hit ? hit.slice(name.length + 3) : "";
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\n/).forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;
    var eq = trimmed.indexOf("=");
    if (eq < 1) return;
    var name = trimmed.slice(0, eq).trim();
    var value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2 && (value.charAt(0) === '"' || value.charAt(0) === "'") && value.charAt(value.length - 1) === value.charAt(0)) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  });
}

function listedImage(prompt, withRef) {
  var pt = Math.ceil(String(prompt || "").length / 3);
  return (pt * 5 + (withRef ? 8000 * 8 : 0) + 600 * 30) / 1e6;
}

loadEnv(path.join(ROOT, ".env"));
var key = process.env.OPENAI_API_KEY || "";
var step = arg("step") || "plans";
var only = arg("only").split(",").filter(Boolean);
var book = JSON.parse(fs.readFileSync(BOOK, "utf8"));
var bible = book.bible;
if ((bible.castIds || []).join() !== "maya") throw new Error("proof cast must be Maya only");

var plans = Visual.contractsFor(bible, book.pages, {});
var chosen = Visual.proofSpreads(book.pages, bible.beats);
var lockedSpreads = { p2: true, p5: true, p10: true };
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "images"), { recursive: true });
fs.writeFileSync(path.join(OUT, "visual-bible.json"), JSON.stringify(plans.visualBible, null, 2));
fs.writeFileSync(path.join(OUT, "page-plans.json"), JSON.stringify({
  title: bible.title,
  spreads: plans.spreads,
  proofSpreadIds: chosen.map(function (page) { return page.pageId; }),
  cover: { pageId: "cover", separateFrom: "p1", generated: false }
}, null, 2));

var maya = Cast.getCharacter("maya");
var sheetText = Visual.sheetPrompt(maya);
var proofContracts = (only.length ? plans.spreads.filter(function (spread) {
  return only.indexOf(spread.spreadId) >= 0;
}) : chosen.map(function (page) {
  return plans.spreads.filter(function (spread) { return spread.spreadId === page.pageId; })[0];
})).filter(function (spread) {
  return spread && !lockedSpreads[spread.spreadId];
});
var storyEntityFile = path.join(OUT, "story-entities.json");
var storyEntitySpecs = fs.existsSync(storyEntityFile) ? JSON.parse(fs.readFileSync(storyEntityFile, "utf8")) : [];
var storyEntityById = {};
storyEntitySpecs.forEach(function (spec) { storyEntityById[spec.entityId] = spec; });
proofContracts.forEach(function (spread) {
  spread.mustShow = Visual.mustShow(bible, spread);
  var place = (bible.locations || []).filter(function (item) { return item.locationId === spread.locationId; })[0];
  spread.entitySpecs = spread.mustShow.map(function (id) {
    var entity = (bible.entities || []).filter(function (item) { return item.entityId === id; })[0] || { entityId: id, name: id, identity: "" };
    return Visual.entitySpec(entity, spread, place);
  });
  var present = {};
  (spread.entityStateBefore || []).forEach(function (row) { present[row.entityId] = 1; });
  (spread.mustShow || []).forEach(function (id) { present[id] = 1; });
  spread.storyEntities = Object.keys(present).map(function (id) {
    var entity = (bible.entities || []).filter(function (item) { return item.entityId === id; })[0];
    return entity ? Visual.defineStoryEntity(entity, storyEntityById[id] || {}) : null;
  }).filter(Boolean);
});
var pageTexts = proofContracts.map(function (spread) {
  var lineup = (plans.visualBible.bookCast && plans.visualBible.bookCast.members) || plans.visualBible.cast;
  return Visual.spreadPrompt(bible, spread, lineup);
});
var sheetCost = listedImage(sheetText, false);
var pageCost = pageTexts.reduce(function (sum, text) { return sum + listedImage(text, true); }, 0);
var repairCost = pageCost;
var visionCost = 6 * ((2000 * 0.15 + 400 * 0.60) / 1e6);
var estimate = {
  provider: "OpenAI",
  model: MODEL,
  size: SIZE,
  quality: QUALITY,
  visionModel: VISION,
  imageCallsPlanned: proofContracts.length,
  repairAllowance: Visual.MAX_VISUAL_REPAIRS + " per new spread, so at most " + proofContracts.length + " extra images",
  listedUsdIfNoRepairs: Number((pageCost + visionCost * (proofContracts.length / 6)).toFixed(4)),
  listedUsdIfEveryRepair: Number((pageCost + repairCost + visionCost * (proofContracts.length / 3)).toFixed(4)),
  sheetExcluded: true,
  lockedSpreads: ["p2", "p5", "p10"],
  cast: ["maya"],
  spreads: proofContracts.map(function (spread) { return spread.spreadId; })
};
if (!only.length) fs.writeFileSync(path.join(OUT, "cost-estimate.json"), JSON.stringify(estimate, null, 2));
console.log(JSON.stringify(estimate));
if (step === "plans") process.exit(0);
if ((step === "pages" || step === "all" || step === "sheet") && plans.visualBible.bookCast && !plans.visualBible.bookCast.ready) {
  console.error(JSON.stringify({ blocked: true, problems: plans.visualBible.bookCast.problems }));
  process.exit(2);
}
if (!key) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

var guard = Guard.createGuard({
  capUsd: Number(arg("cap") || "3"),
  ledgerPath: LEDGER,
  margin: 2,
  redact: key,
  labelFor: function (href, body) { return "book-visual:" + String(body && body.__purpose || "image"); }
});

function rawFetch(url, init) {
  var href = String(url);
  var body = init.body;
  if (typeof body === "string") {
    var parsed = JSON.parse(body);
    delete parsed.__purpose;
    body = JSON.stringify(parsed);
  }
  return fetch(href, Object.assign({}, init, { body: body }));
}

var guarded = guard.wrap(rawFetch);

function generateImage(prompt, purpose) {
  return guarded("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: prompt,
      size: SIZE,
      quality: QUALITY,
      output_format: "jpeg",
      output_compression: 80,
      moderation: "auto",
      n: 1,
      __purpose: purpose
    })
  }).then(function (res) { return res.json().then(function (payload) { return { ok: res.ok, payload: payload }; }); });
}

function editImage(prompt, reference, purpose) {
  var files = Array.isArray(reference) ? reference : [{ name: "maya-sheet.jpg", bytes: reference }];
  var form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  files.forEach(function (file) {
    var bytes = file && file.bytes ? file.bytes : file;
    var name = file && file.name ? file.name : "reference.jpg";
    form.append("image[]", new Blob([bytes], { type: "image/jpeg" }), name);
  });
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("output_format", "jpeg");
  form.append("output_compression", "80");
  form.append("n", "1");
  return guarded("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form
  }).then(function (res) { return res.json().then(function (payload) { return { ok: res.ok, payload: payload }; }); });
}

function saveImage(id, payload) {
  var b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) throw new Error(id + " image missing");
  var buf = Buffer.from(b64, "base64");
  var file = path.join(OUT, "images", id + ".jpg");
  fs.writeFileSync(file, buf);
  return { file: file, b64: b64, buf: buf };
}

function visionCheck(spread, b64, purpose) {
  var place = (bible.locations || []).filter(function (item) { return item.locationId === spread.locationId; })[0];
  var people = (plans.visualBible.cast || []).map(function (look) {
    return look.name + " (" + look.characterId + ") must match " + (look.referenceFile || "their own reference") + ": " + look.hair + "; " + look.skinTone + "; " + look.face + "; " + look.defaultClothing + "; " + look.footwear + "; " + (look.visualIdentifiers || []).join(", ") + ".";
  }).join(" ");
  var question = [
    "You are checking one children's book illustration against a plan. Return JSON only.",
    "Every listed child must be identifiable. " + people,
    "Place: " + (place ? place.name + ". " + place.visualIdentity : spread.locationId) + ".",
    "Selected instant only: " + (spread.illustrationMoment || spread.storyEvent),
    "The full event is context. momentMatch is true only when the picture shows that one instant.",
    "montageShown is true if the same character appears in more than one pose or time.",
    "Persistent story entities: " + (spread.storyEntities || []).map(function (row) {
      return row.entityId + " is " + row.visualIdentity + " Face: " + row.face + ".";
    }).join(" "),
    "Required things, judged by how they look, not by whether their id is written in the picture: " + (spread.entitySpecs || []).map(function (spec) {
      return spec.entityId + " looks like: " + spec.aliases.join(", ");
    }).join("; ") + ".",
    "Describe what you see in observations. For each required id set status to confirmed, uncertain, or missing. confirmed means you can see it. uncertain means it is small or partly hidden and you are not sure. missing means a large, obvious thing is absent.",
    "duplicateCharacter is true if the same character is drawn more than once and the plan is not a montage.",
    "Text-safe region: " + spread.textSafeRegion + " should be calmer open space, not a drawn box.",
    "Also return style: {\"rendering\":\"painted\",\"characterRendering\":\"painted\",\"proportions\":\"picture-book\",\"edge\":\"soft\",\"texture\":\"painted\",\"finish\":\"picture-book\",\"environmentRendering\":\"painted\",\"palette\":\"\",\"weather\":\"\",\"timeOfDay\":\"\"}.",
    "Style names the illustrator, not the place. A new room, time of day, or weather is not a new style. rendering is 3d, vector, glossy, photoreal, or animation-still only if the picture actually switched technique.",
    "Return one characters entry for every listed child, using that child's characterId. Return {\"observations\":\"\",\"characters\":[{\"characterId\":\"maya\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"entities\":[{\"entityId\":\"id\",\"status\":\"confirmed\",\"seen\":\"\"}],\"locationMatch\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}.",
    "count is how many times that same child is drawn. outfitMatch is true only if the canonical clothes, socks, and shoes are the ones in the picture."
  ].join(" ");
  return guarded("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: question },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }
        ]
      }],
      __purpose: purpose
    })
  }).then(function (res) {
    return res.json().then(function (payload) {
      var content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      var parsed = null;
      try { parsed = JSON.parse(content || ""); } catch (e) { parsed = null; }
      return { http: res.ok, vision: parsed, verdict: Visual.acceptIllustration(parsed, spread) };
    });
  });
}

function run() {
  var imageDir = path.join(OUT, "images");
  if (step === "check") {
    return proofContracts.reduce(function (chain, spread) {
      return chain.then(function () {
        var file = path.join(OUT, "images", spread.spreadId + ".jpg");
        var b64 = fs.readFileSync(file).toString("base64");
        return visionCheck(spread, b64, "vision-" + spread.spreadId).then(function (check) {
          var row = {
            spreadId: spread.spreadId,
            status: check.verdict.ok ? "VISUAL_REVIEWABLE" : "VISUAL_NOT_REVIEWABLE",
            problems: check.verdict.problems,
            notes: check.vision && check.vision.notes || "",
            repairs: 0,
            file: "images/" + spread.spreadId + ".jpg"
          };
          fs.writeFileSync(path.join(OUT, "images", spread.spreadId + ".vision.json"), JSON.stringify(check.vision || {}, null, 2));
          console.log(JSON.stringify(row));
          return row;
        });
      });
    }, Promise.resolve());
  }
  if (step === "sheet" || step === "all") {
    return generateImage(sheetText, "maya-sheet").then(function (drawn) {
      if (!drawn.ok) throw new Error("sheet HTTP " + JSON.stringify(drawn.payload && drawn.payload.error || {}).slice(0, 180));
      var saved = saveImage("maya-sheet", drawn.payload);
      fs.writeFileSync(path.join(imageDir, "maya-sheet.prompt.txt"), sheetText);
      var proposal = Cast.proposeReference("maya", { assetId: "maya-sheet" });
      proposal.file = "images/maya-sheet.jpg";
      fs.writeFileSync(path.join(OUT, "maya-candidate.json"), JSON.stringify(proposal, null, 2));
      console.log(JSON.stringify({ stage: "sheet", locked: false, file: saved.file }));
      if (step === "sheet") return null;
      return drawPages(saved.buf);
    });
  }
  var canonical = Cast.resolveReference("maya");
  var sheetFile = canonical && canonical.file ? path.join(ROOT, canonical.file) : path.join(imageDir, "maya-sheet.jpg");
  if (!fs.existsSync(sheetFile)) sheetFile = path.join(imageDir, "maya-sheet.jpg");
  if (!fs.existsSync(sheetFile)) throw new Error("Maya sheet is missing. Run --step=sheet first.");
  return drawPages(fs.readFileSync(sheetFile));
}

function loadReference(file) {
  if (!file || !file.file) {
    if (file && file.appearance) return null;
    throw new Error("Missing reference for " + (file && file.characterId || "unknown"));
  }
  if (file.privateArt) throw new Error("Inaccessible reference for " + file.characterId);
  var abs = path.isAbsolute(file.file) ? file.file : path.join(ROOT, file.file);
  if (!fs.existsSync(abs)) throw new Error("Missing reference for " + file.characterId);
  return { name: path.basename(abs), bytes: fs.readFileSync(abs), characterId: file.characterId };
}

function referencesForSpread(spread, fallback) {
  var registry = bible.identityRegistry || [];
  if (!registry.length) return [[{ name: "maya-sheet.jpg", bytes: fallback }]];
  var Identity = require("../../js/book-v2-identity.js");
  var plan = Identity.prepareScene(registry, spread.charactersPresent || []);
  if (!plan.ok || plan.blocksGeneration || (plan.omitted || []).length) {
    throw new Error("Not drawing. " + (plan.limitations || []).concat(plan.omitted || []).join(" "));
  }
  var passes = (plan.passes || []).map(function (pass) {
    return pass.map(loadReference).filter(Boolean);
  });
  if (passes.length > 1) {
    throw new Error("Not drawing a partial cast. " + passes.length + " reference passes are prepared and nobody is omitted.");
  }
  return passes;
}

function drawPages(sheetBuf) {
  var results = [];
  return proofContracts.reduce(function (chain, spread, index) {
    return chain.then(function () {
      if (lockedSpreads[spread.spreadId]) throw new Error("refusing to redraw approved spread " + spread.spreadId);
      var prompt = pageTexts[index];
      var repairs = 0;
      var lineup = (plans.visualBible.bookCast && plans.visualBible.bookCast.members) || plans.visualBible.cast;
      function finish(current, note) {
        var row = {
          spreadId: spread.spreadId,
          status: current.verdict.ok ? "VISUAL_REVIEWABLE" : "VISUAL_NOT_REVIEWABLE",
          problems: current.verdict.problems,
          notes: current.vision && current.vision.notes || "",
          repairs: repairs,
          repairNote: note || "",
          file: "images/" + spread.spreadId + ".jpg"
        };
        results.push(row);
        fs.writeFileSync(path.join(OUT, "images", spread.spreadId + ".vision.json"), JSON.stringify(current.vision || {}, null, 2));
        console.log(JSON.stringify(row));
      }
      fs.writeFileSync(path.join(OUT, "images", spread.spreadId + ".prompt.txt"), prompt);
      var passes = referencesForSpread(spread, sheetBuf);
      var references = passes[0] || [];
      return editImage(prompt, references, spread.spreadId).then(function (drawn) {
        if (!drawn.ok) {
          repairs += 1;
          var rejected = Visual.repairPrompt(bible, spread, lineup);
          fs.writeFileSync(path.join(OUT, "images", spread.spreadId + "-repair.prompt.txt"), rejected);
          return editImage(rejected, references, spread.spreadId + "-repair").then(function (again) {
            if (!again.ok) {
              var missed = {
                spreadId: spread.spreadId,
                status: "VISUAL_NOT_REVIEWABLE",
                problems: ["image-rejected"],
                notes: "",
                repairs: repairs,
                repairNote: "first-call-rejected",
                file: ""
              };
              results.push(missed);
              console.log(JSON.stringify(missed));
              return null;
            }
            var recovered = saveImage(spread.spreadId, again.payload);
            return visionCheck(spread, recovered.b64, "vision-" + spread.spreadId).then(function (check) {
              return finish(check, "recovered-after-rejection");
            });
          });
        }
        var saved = saveImage(spread.spreadId, drawn.payload);
        return visionCheck(spread, saved.b64, "vision-" + spread.spreadId).then(function (check) {
          if (check.verdict.ok) return finish(check);
          repairs += 1;
          var retry = Visual.repairPrompt(bible, spread, lineup);
          fs.writeFileSync(path.join(OUT, "images", spread.spreadId + "-repair.prompt.txt"), retry);
          return editImage(retry, references, spread.spreadId + "-repair").then(function (again) {
            if (!again.ok) return finish(check, "repair-not-accepted");
            var replaced = saveImage(spread.spreadId, again.payload);
            return visionCheck(spread, replaced.b64, "vision-" + spread.spreadId + "-repair").then(function (next) {
              return finish(next);
            });
          });
        });
      });
    });
  }, Promise.resolve()).then(function () {
    var after = guard.state();
    var report = {
      status: results.every(function (row) { return row.status === "VISUAL_REVIEWABLE"; }) ? "VISUAL_REVIEWABLE" : "VISUAL_NOT_REVIEWABLE",
      mayaLocked: Cast.referenceReport("maya").locked === true,
      referenceVersionId: Cast.resolveReference("maya") && Cast.resolveReference("maya").versionId,
      results: results,
      listedUsd: after.listedSpent,
      guardUsd: after.guardSpent,
      imageCalls: results.reduce(function (sum, row) { return sum + 1 + row.repairs; }, 0)
    };
    var validationPath = path.join(OUT, "validation.json");
    var existing = {};
    if (fs.existsSync(validationPath)) {
      try { existing = JSON.parse(fs.readFileSync(validationPath, "utf8")); } catch (e) { existing = {}; }
    }
    var prior = existing.results || [];
    var ids = {};
    results.forEach(function (row) { ids[row.spreadId] = 1; });
    report.results = prior.filter(function (row) { return !ids[row.spreadId]; }).concat(results);
    report.spreads = existing.spreads || [];
    report.artDirection = existing.artDirection || null;
    report.status = report.results.every(function (row) { return row.status === "VISUAL_REVIEWABLE"; }) ? "VISUAL_REVIEWABLE" : "VISUAL_NOT_REVIEWABLE";
    fs.writeFileSync(validationPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  });
}

run().catch(function (error) {
  console.error(guard.redact(String(error && error.message || error)).slice(0, 300));
  process.exit(1);
});
