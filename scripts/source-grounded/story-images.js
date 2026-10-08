"use strict";
// Pictures for a story-led lesson, drawn in one locked style from one cast/style reference sheet.
// The sheet (asset id "cast-sheet") is drawn first with /v1/images/generations; every asset marked
// reference:true is then drawn with /v1/images/edits, passing the sheet as the reference image,
// so characters keep their faces, hair and outfits and the art style stays the same. Assets without
// characters (e.g. a living-animal scene, which has no people) still carry the same style text.
// Sequential, so the spend guard sees each settled cost before the next worst case.
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var MODEL = "gpt-image-2.5-sunburst";
var SIZE = "1536x1024";

function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16); }

// opts: { quality, reuse (bool), only (array of ids, or null for all), log }
function drawImages(fetchFn, key, assets, outDir, opts) {
  opts = opts || {};
  var quality = opts.quality || "medium";
  var dir = path.join(outDir, "lesson", "images");
  fs.mkdirSync(dir, { recursive: true });
  var results = [];
  var sheet = null; // { buf, hash }
  var order = assets.filter(function (a) { return a.id === "cast-sheet"; }).concat(assets.filter(function (a) { return a.id !== "cast-sheet"; }));
  function row(asset, extra) {
    var copy = Object.assign({}, asset);
    return Object.assign(copy, { slotId: asset.id, model: MODEL, dimensions: SIZE, quality: quality }, extra);
  }
  return order.reduce(function (chain, asset) {
    return chain.then(function () {
      var file = path.join(dir, asset.id + ".jpg");
      var sideFile = path.join(dir, asset.id + ".made.json");
      var useRef = !!(asset.reference && sheet);
      var made = { prompt: asset.prompt, reference: useRef ? sheet.hash : "", quality: quality };
      var prior = fs.existsSync(sideFile) ? JSON.parse(fs.readFileSync(sideFile, "utf8")) : null;
      var same = prior && fs.existsSync(file) && prior.prompt === made.prompt && prior.reference === made.reference && prior.quality === made.quality;
      if (same && opts.reuse !== false) {
        if (asset.id === "cast-sheet") { var b = fs.readFileSync(file); sheet = { buf: b, hash: sha(b) }; }
        results.push(row(asset, { status: "ready", publicUrl: "images/" + asset.id + ".jpg", file: file, referenceUsed: !!made.reference, reused: true, usage: prior.usage || null }));
        return null;
      }
      if (opts.only && opts.only.indexOf(asset.id) === -1) {
        results.push(row(asset, { status: "planned", referenceUsed: false }));
        return null;
      }
      var req;
      if (useRef) {
        var form = new FormData();
        form.append("model", MODEL);
        form.append("prompt", asset.prompt);
        form.append("image[]", new Blob([sheet.buf], { type: "image/jpeg" }), "cast-sheet.jpg");
        form.append("size", SIZE);
        form.append("quality", quality);
        form.append("output_format", "jpeg");
        form.append("output_compression", "80");
        form.append("n", "1");
        req = fetchFn("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + key }, body: form });
      } else {
        req = fetchFn("https://api.openai.com/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify({ model: MODEL, prompt: asset.prompt, size: SIZE, quality: quality, output_format: "jpeg", output_compression: 80, moderation: "auto", n: 1 }) });
      }
      return req.then(function (res) {
        return res.json().then(function (body) {
          var b64 = body && body.data && body.data[0] && body.data[0].b64_json;
          if (!res.ok || !b64) throw new Error("image failed: HTTP " + res.status + " " + String(body && body.error && body.error.message || "").slice(0, 160));
          var buf = Buffer.from(b64, "base64");
          fs.writeFileSync(file, buf);
          made.usage = body.usage || null;
          fs.writeFileSync(sideFile, JSON.stringify(made, null, 2));
          fs.writeFileSync(path.join(dir, asset.id + ".prompt.txt"), asset.prompt);
          if (asset.id === "cast-sheet") sheet = { buf: buf, hash: sha(buf) };
          if (opts.log) opts.log("IMAGE", { id: asset.id, endpoint: useRef ? "edits+reference" : "generations", usage: body.usage || null });
          results.push(row(asset, { status: "ready", publicUrl: "images/" + asset.id + ".jpg", file: file, referenceUsed: useRef, usage: body.usage || null }));
        });
      }).catch(function (error) {
        if (opts.log) opts.log("IMAGE_FAILED", { id: asset.id, error: String(error && error.message || error).slice(0, 200) });
        results.push(row(asset, { status: "failed", failure: String(error && error.message || error).slice(0, 200), referenceUsed: false }));
      });
    });
  }, Promise.resolve()).then(function () { return results; });
}

module.exports = { drawImages: drawImages, MODEL: MODEL, SIZE: SIZE };
