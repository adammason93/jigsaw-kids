"use strict";

// Answer feedback over a picture must be readable: the card's light background (#fff6ec for
// "again", success-soft for "yes") needs dark text. Found in the run 14 real-player walk, where
// the wrong-answer feedback was white on cream.
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var css = fs.readFileSync(path.join(__dirname, "../schools/learn/lesson-shell.css"), "utf8");

function luminance(hex) {
  var c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
  var rgb = [0, 2, 4].map(function (i) { var v = parseInt(c.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

var rule = css.match(/\.lesson\.has-world \.lesson-feedback,\s*\.lesson\.has-fallback \.lesson-feedback \{ color: (#[0-9a-fA-F]{3,6}); \}/);
assert.ok(rule, "world-mode feedback colour rule present");
var again = css.match(/\.lesson-feedback--again \{ background: (#[0-9a-fA-F]{3,6}); \}/)[1];
var yes = css.match(/\.lesson-feedback--yes \{ background: var\(--w-color-success-soft, (#[0-9a-fA-F]{3,6})\); \}/)[1];
// Positive: WCAG AA (4.5:1) on both feedback backgrounds.
assert.ok(contrast(rule[1], again) >= 4.5, "again feedback contrast " + contrast(rule[1], again).toFixed(2));
assert.ok(contrast(rule[1], yes) >= 4.5, "yes feedback contrast " + contrast(rule[1], yes).toFixed(2));
// Negative: the old white text fails on the same backgrounds.
assert.ok(contrast("#fff", again) < 4.5 && contrast("#fff", yes) < 4.5);
console.log("feedback contrast tests passed");

// Choose feedback over a picture sits on the navy panel rgba(20, 27, 77, .72-.9): light text.
(function () {
  var navy = "#141b4d";
  var again2 = css.match(/\.lesson\.has-fallback \.lesson-choose \.lesson-react--again \{ color: (#[0-9a-fA-F]{3,6}); \}/);
  var yes2 = css.match(/\.lesson\.has-fallback \.lesson-choose \.lesson-react--yes \{ color: (#[0-9a-fA-F]{3,6}); \}/);
  assert.ok(again2 && yes2, "choose feedback colour rules present");
  assert.ok(contrast(again2[1], navy) >= 4.5 && contrast(yes2[1], navy) >= 4.5);
  // Negative: the default "again" brown fails on navy.
  assert.ok(contrast("#9a6230", navy) < 4.5);
  console.log("choose feedback contrast tests passed");
})();
