var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Type = require("../js/book-type.js");

var source = fs.readFileSync(path.join(__dirname, "../js/book-type.js"), "utf8");
assert.ok(!/maya|flowerpot|hidden-star|garden-wall|a blink for the sky/i.test(source));
assert.ok(source.indexOf("Fredoka") < 0);
assert.ok(Type.FACE.indexOf("Nunito") === 0);

var young = Type.metricsFor({ stage: "reception" });
var older = Type.metricsFor({ yearGroup: "Year 6" });
assert.ok(young.minPx > older.minPx);
assert.ok(young.maxCh < older.maxCh);
assert.ok(young.lineHeight > older.lineHeight);
assert.ok(young.cqh > older.cqh);

function grid(level, width, height, jitter) {
  var values = [];
  var y;
  var x;
  for (y = 0; y < height; y += 1) {
    for (x = 0; x < width; x += 1) {
      var wobble = jitter ? (((x * 3 + y * 5) % 7) - 3) * jitter : 0;
      values.push(Math.max(0, Math.min(1, level + wobble)));
    }
  }
  return { grid: values, width: width, height: height };
}

var sky = Type.place({
  text: "The kite stayed folded on the sand.",
  profile: { stage: "year2" },
  textSafeRegion: "upper-left",
  pageRole: "double-page-spread",
  spreadWidth: 1040,
  spreadHeight: 690,
  sample: function (box) {
    return box.y < 0.1 ? grid(0.86, 8, 6, 0) : grid(0.22, 8, 6, 0.12);
  }
});
assert.strictEqual(sky.ink, "dark");
assert.ok(sky.box.y < 0.1);
assert.ok(sky.box.side === "left");
assert.ok(sky.box.x + sky.box.w <= 0.46);
assert.ok(sky.measureCh <= sky.maxCh);
assert.ok(sky.fontPx >= sky.minPx);
assert.ok(sky.lineHeight >= 1.44);
assert.ok(sky.problems.indexOf("gutter") < 0);
assert.ok(sky.problems.indexOf("page-edge") < 0);
assert.ok(sky.problems.indexOf("font-small") < 0);
assert.ok(sky.problems.indexOf("measure-wide") < 0);

var night = Type.place({
  text: "A lantern glowed under the pines.",
  profile: { stage: "year2" },
  textSafeRegion: "upper-right",
  pageRole: "double-page-spread",
  spreadWidth: 1040,
  spreadHeight: 690,
  sample: function () { return grid(0.08, 8, 6, 0); }
});
assert.strictEqual(night.ink, "light");
assert.strictEqual(night.box.side, "right");
assert.ok(night.box.x >= 0.54);
assert.ok(night.contrast >= 3.2);

var busy = Type.place({
  text: "The robot rolled across the kitchen.",
  profile: { stage: "year3" },
  textSafeRegion: "upper-left",
  pageRole: "double-page-spread",
  spreadWidth: 1040,
  spreadHeight: 690,
  sample: function () { return grid(0.45, 8, 6, 0.14); }
});
assert.ok(busy.treatment === "scrim" || busy.treatment === "halo");
assert.ok(busy.contrast > busy.plainContrast);

var spoken = Type.units('She waited. "Here," she said. Closed them.');
assert.ok(spoken.some(function (line) { return line.text === "Closed them."; }));
assert.ok(spoken.some(function (line) { return line.text.indexOf("Here") >= 0; }));
assert.ok(spoken.every(function (line) { return line.text.length < 80; }));

var packed = Type.place({
  text: new Array(80).join("word ") + "end.",
  profile: { stage: "reception" },
  textSafeRegion: "upper-left",
  pageRole: "double-page-spread",
  spreadWidth: 1040,
  spreadHeight: 690,
  sample: function () { return grid(0.9, 4, 4, 0); }
});
assert.ok(packed.fontPx >= packed.minPx);
assert.ok(packed.fontPx >= young.minPx);
assert.ok(packed.problems.indexOf("overflow") >= 0);
assert.ok(packed.problems.indexOf("font-small") < 0);

var forced = Type.validate({
  stage: "year6",
  fontPx: 10,
  measureCh: 80,
  lineHeight: 1.1,
  fits: false,
  gutterClear: false,
  edgeClear: false,
  contrast: 1.2
}, older);
["font-small", "measure-wide", "leading-tight", "overflow", "gutter", "page-edge", "contrast"].forEach(function (code) {
  assert.ok(forced.indexOf(code) >= 0, code);
});

var markup = Type.markup(sky);
assert.ok(markup.indexOf("story-line") >= 0);
assert.ok(markup.indexOf("<script") < 0);

console.log("book-type tests ok");
