import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Progress = require("../js/book-v2-progress.js");
const source = fs.readFileSync(new URL("../games/story-journey.js", import.meta.url), "utf8");
const start = source.indexOf("function continueStamp(job)");
const end = source.indexOf("function sentContinueStamp()");
const decision = new Function(
  source.slice(start, end) + "\nreturn { continueStamp: continueStamp, shouldAutoContinue: shouldAutoContinue };"
)();

function seen(job) {
  return Progress.view(job, Date.parse("2026-10-19T12:00:00Z"), { names: ["Maya", "Sofia"] });
}

function job(patch) {
  return Object.assign({
    status: "interrupted",
    reason: "continue",
    recoverable: true,
    attempts: 1,
    calls: { text: 1, image: 0, vision: 0 }
  }, patch);
}

const sequence = [
  job({ status: "running", reason: "running", startedAt: Date.parse("2026-10-19T11:59:00Z") }),
  job({ attempts: 1 }),
  job({ attempts: 1 }),
  job({ status: "running", reason: "running", attempts: 2, calls: { text: 2, image: 0, vision: 0 }, startedAt: Date.parse("2026-10-19T11:59:30Z") }),
  job({ attempts: 2, calls: { text: 2, image: 0, vision: 0 } }),
  job({ attempts: 3, calls: { text: 2, image: 1, vision: 1 } }),
  job({ status: "interrupted", reason: "uncertain", recoverable: false, attempts: 4 }),
  job({ status: "interrupted", reason: "budget", recoverable: true, attempts: 4 }),
  job({ status: "interrupted", reason: "needs-review", recoverable: false, attempts: 4 }),
  job({ status: "complete", reason: "saved", recoverable: false, attempts: 5, calls: { text: 2, image: 1, vision: 1 } })
];

let sent = "";
let inflight = false;
const sends = [];
sequence.forEach(function (row) {
  const view = seen(row);
  if (row.status === "running") inflight = true;
  if (row.status !== "running") inflight = false;
  const allowed = !inflight && decision.shouldAutoContinue(row, view, sent);
  if (allowed) {
    sends.push(decision.continueStamp(row));
    sent = decision.continueStamp(row);
    inflight = true;
  }
});

assert.deepEqual(sends, [
  "interrupted|continue|1|1|0|0",
  "interrupted|continue|2|2|0|0",
  "interrupted|continue|3|2|1|1"
]);
assert.equal(decision.shouldAutoContinue(sequence[1], seen(sequence[1]), sends[0]), false);
assert.equal(seen(sequence[6]).canContinue, false);
assert.equal(seen(sequence[7]).canContinue, false);
assert.equal(seen(sequence[8]).state === "ready", false);
assert.equal(seen(sequence[9]).canContinue, false);
assert.match(source, /state\.sending \|\| nextBtn\.disabled/);
assert.match(source, /Shelf\.continueRequest/);
assert.match(source, /nextBtn\.click\(\)/);
assert.match(source, /Create My Book/);
console.log("book-continue-button: ok");
