var assert = require("assert");
var Reader = require("../js/book-reader.js");

var planned = Reader.planOpenings([
  { spreadId: "a", pageRole: "left-page", text: "Left", textSide: "left" },
  { spreadId: "b", pageRole: "right-page", text: "Right", textSide: "right" },
  { spreadId: "c", pageRole: "double-page-spread", text: "Across", textSide: "left" },
  { spreadId: "d", pageRole: "right-page", text: "Last", textSide: "right" }
]);
assert.strictEqual(planned[0].kind, "page-pair");
assert.deepStrictEqual(planned[0].pages.map(function (page) { return page.id; }), ["a", "b"]);
assert.strictEqual(planned[0].pages[0].role, "left-page");
assert.strictEqual(planned[0].pages[1].role, "right-page");
assert.strictEqual(planned[1].kind, "double-page-spread");
assert.strictEqual(planned[1].pages[0].id, "c");
assert.strictEqual(planned[2].kind, "single-page");

var proof = Reader.proofOpenings([
  { id: "p1", image: "images/p1.jpg", text: "One", textSafeRegion: "upper-left" }
]);
assert.strictEqual(proof[0].provisional, true);
assert.strictEqual(proof[0].authoredAs, "single-landscape");
assert.strictEqual(proof[0].kind, "double-page-spread");

assert.strictEqual(Reader.gutterClear({ role: "left-page", textSide: "left" }), true);
assert.strictEqual(Reader.gutterClear({ role: "right-page", textSide: "left" }), false);
assert.strictEqual(Reader.gutterClear({ role: "double-page-spread", textSide: "center" }), false);
assert.strictEqual(Reader.gutterClear({ role: "double-page-spread", textSide: "right" }), true);

var session = Reader.createSession({ openings: planned, cover: { kind: "cover" } });
assert.strictEqual(session.mode, "cover");
assert.strictEqual(Reader.presentation(session).layout, "closed-cover");
assert.strictEqual(Reader.presentation(session).debugLabels, false);
assert.strictEqual(Reader.presentation(session).developmentNote, false);

var opened = Reader.command(session, { direction: "next" });
assert.strictEqual(opened.ok, true);
assert.strictEqual(opened.animate, true);
assert.strictEqual(opened.durationMs, Reader.TURN_MS);
assert.strictEqual(opened.session.animating, true);
var locked = Reader.command(opened.session, { key: "ArrowRight" });
assert.strictEqual(locked.ok, false);
assert.strictEqual(locked.reason, "locked");
var shown = Reader.finishTurn(opened.session);
assert.strictEqual(shown.mode, "open");
assert.strictEqual(shown.index, 0);
assert.strictEqual(Reader.presentation(shown).kind, "page-pair");

var back = Reader.command(shown, { key: "ArrowLeft" });
var coverAgain = Reader.finishTurn(back.session);
assert.strictEqual(coverAgain.mode, "cover");

var byEdge = Reader.finishTurn(Reader.command(coverAgain, { edge: "right" }).session);
assert.strictEqual(byEdge.mode, "open");
var bySwipe = Reader.finishTurn(Reader.command(byEdge, { swipe: "right" }).session);
assert.strictEqual(bySwipe.mode, "cover");

var reduced = Reader.createSession({ openings: planned, reducedMotion: true });
var jumped = Reader.command(reduced, { direction: "next" });
assert.strictEqual(jumped.animate, false);
assert.strictEqual(jumped.durationMs, 0);
assert.strictEqual(jumped.session.mode, "open");
assert.strictEqual(jumped.session.animating, false);

var narrow = Reader.createSession({ openings: proof, narrow: true });
var narrowOpen = Reader.command(narrow, { direction: "next" });
assert.strictEqual(narrowOpen.session.pending.mode, "open");
var narrowShown = Reader.finishTurn(narrowOpen.session);
assert.strictEqual(Reader.presentation(narrowShown).layout, "single-page");

var debug = Reader.createSession({ openings: planned, debug: true });
assert.strictEqual(Reader.presentation(debug).debugLabels, true);
assert.strictEqual(Reader.presentation(debug).developmentNote, false);

console.log("book-reader tests ok");
