"use strict";

/* Harness input assembly for the frozen gate (test script only).

   The frozen js/lesson-brain.js builds one "request text" for place detection
   by joining ctx.lessonText, ctx.teacherInstructions, ctx.topic,
   lessonBrief.rawRequest, lessonBrief.learningGoal and
   lessonBrief.teacherIntent.learningGoal with single spaces
   (lessonRequestText, js/lesson-brain.js lines 597-604 at 0d53e3d). Its proper-
   noun detector (properPlaces, lines 528-549) then matches runs of 2-4
   capitalised words. A field that ends without punctuation therefore runs into
   the next field: topic "Landslides" + goal "Students should ..." becomes
   "Landslides Students", which is read as a place name, and with "How" and
   "landslides" in the request the frozen code blocks the pack NEEDS_SOURCE.

   The harness cannot change js/. It fixes its own input assembly instead: every
   free-text field that the frozen code joins is given a sentence boundary
   (a trailing full stop) when it has none, so no capitalised run can cross a
   field boundary. No other field is touched, no text is removed, and the
   unit counts (strandsRequiredFor) are checked to be unchanged by the offline
   test. The root cause in js/ is reported separately as a production bug. */

var JOINED_FIELDS = [
  ["lessonText"],
  ["teacherInstructions"],
  ["topic"],
  ["lessonBrief", "rawRequest"],
  ["lessonBrief", "learningGoal"],
  ["lessonBrief", "teacherIntent", "learningGoal"]
];

function terminate(value) {
  var text = String(value);
  var trimmed = text.replace(/\s+$/, "");
  if (!trimmed) return text;
  if (/[.!?\u2026]["'\u2019\u201d)\]]*$/.test(trimmed)) return trimmed;
  return trimmed + ".";
}

function boundarySafeGateContext(ctx) {
  var copy = JSON.parse(JSON.stringify(ctx || {}));
  var changed = [];
  JOINED_FIELDS.forEach(function (path) {
    var parent = copy;
    for (var i = 0; i < path.length - 1; i++) {
      if (!parent || typeof parent[path[i]] !== "object" || parent[path[i]] === null) return;
      parent = parent[path[i]];
    }
    var key = path[path.length - 1];
    if (typeof parent[key] !== "string" || !parent[key].trim()) return;
    var next = terminate(parent[key]);
    if (next !== parent[key]) {
      changed.push({ field: path.join("."), from: parent[key], to: next });
      parent[key] = next;
    }
  });
  return { ctx: copy, changed: changed };
}

module.exports = { boundarySafeGateContext: boundarySafeGateContext, JOINED_FIELDS: JOINED_FIELDS, terminate: terminate };
