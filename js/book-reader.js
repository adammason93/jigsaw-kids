/* Physical picture-book reader. State only — no images, no sound. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookReader = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TURN_MS = 680;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function planOpenings(spreads) {
    var openings = [];
    var pending = null;
    (spreads || []).forEach(function (spread) {
      var role = spread.pageRole || spread.role || "";
      var page = {
        id: spread.spreadId || spread.id || "",
        role: role,
        image: spread.image || "",
        text: spread.text || "",
        textSide: spread.textSide || sideFromRegion(spread.plannedTextRegion || spread.textSafeRegion || "")
      };
      if (role === "double-page-spread") {
        if (pending) {
          openings.push({ kind: "single-page", pages: [pending] });
          pending = null;
        }
        openings.push({ kind: "double-page-spread", provisional: false, pages: [page] });
        return;
      }
      if (!pending) {
        pending = page;
        if (!pending.role) pending.role = "left-page";
        return;
      }
      if (!page.role) page.role = "right-page";
      openings.push({ kind: "page-pair", provisional: false, pages: [pending, page] });
      pending = null;
    });
    if (pending) {
      pending.role = pending.role === "left-page" ? "right-page" : (pending.role || "right-page");
      openings.push({ kind: "single-page", provisional: false, pages: [pending] });
    }
    return openings;
  }

  function sideFromRegion(region) {
    var text = String(region || "");
    if (text.indexOf("right") >= 0) return "right";
    if (text.indexOf("left") >= 0) return "left";
    if (text.indexOf("center") >= 0) return "center";
    return "left";
  }

  function proofOpenings(pages) {
    return (pages || []).map(function (page) {
      return {
        kind: "double-page-spread",
        provisional: true,
        authoredAs: "single-landscape",
        pages: [{
          id: page.id || page.pageId || "",
          role: "double-page-spread",
          image: page.image || "",
          text: page.text || page.prose || "",
          textSafeRegion: page.textSafeRegion || "",
          textSide: page.textSide || sideFromRegion(page.textSafeRegion || "")
        }]
      };
    });
  }

  function gutterClear(page) {
    var side = page && (page.textSide || sideFromRegion(page.textSafeRegion || ""));
    var role = page && (page.role || page.pageRole || "");
    if (side === "center") return false;
    if (role === "left-page") return side === "left";
    if (role === "right-page") return side === "right";
    if (role === "double-page-spread") return side === "left" || side === "right";
    return side === "left" || side === "right";
  }

  function createSession(options) {
    var source = options || {};
    var reduced = !!source.reducedMotion;
    var narrow = !!source.narrow;
    return {
      mode: "cover",
      index: 0,
      animating: false,
      reducedMotion: reduced,
      narrow: narrow,
      debug: !!source.debug,
      openings: clone(source.openings || []),
      cover: clone(source.cover || { kind: "cover" }),
      durationMs: reduced ? 0 : TURN_MS,
      pending: null
    };
  }

  function presentation(session) {
    var state = session || createSession();
    if (state.mode === "cover") {
      return { layout: "closed-cover", kind: "cover", opening: null, debugLabels: !!state.debug, developmentNote: false };
    }
    var opening = state.openings[state.index] || null;
    var layout = state.narrow ? "single-page" : (opening ? opening.kind : "single-page");
    return {
      layout: layout,
      kind: opening ? opening.kind : "",
      opening: opening,
      provisional: !!(opening && opening.provisional),
      debugLabels: !!state.debug,
      developmentNote: false
    };
  }

  function atEnd(session) {
    return session.mode === "open" && session.index >= session.openings.length - 1;
  }

  function atStart(session) {
    return session.mode === "cover";
  }

  function apply(session, mode, index) {
    var next = clone(session);
    next.mode = mode;
    next.index = index;
    next.animating = false;
    next.pending = null;
    return next;
  }

  function command(session, input) {
    var state = session || createSession();
    var ask = input || {};
    if (state.animating) return { ok: false, reason: "locked", session: state, animate: false, durationMs: 0 };
    var direction = ask.direction || "";
    if (ask.key === "ArrowRight" || ask.edge === "right" || ask.swipe === "left") direction = "next";
    if (ask.key === "ArrowLeft" || ask.edge === "left" || ask.swipe === "right") direction = "previous";
    if (direction !== "next" && direction !== "previous") {
      return { ok: false, reason: "none", session: state, animate: false, durationMs: 0 };
    }
    if (direction === "next" && atEnd(state)) return { ok: false, reason: "end", session: state, animate: false, durationMs: 0 };
    if (direction === "previous" && atStart(state)) return { ok: false, reason: "start", session: state, animate: false, durationMs: 0 };
    var mode = state.mode;
    var index = state.index;
    if (direction === "next") {
      if (mode === "cover") mode = "open";
      else index += 1;
    } else if (mode === "open" && index === 0) mode = "cover";
    else index -= 1;
    var animate = !state.reducedMotion;
    var durationMs = animate ? (state.narrow ? 420 : state.durationMs || TURN_MS) : 0;
    if (!animate) return { ok: true, reason: "", session: apply(state, mode, index), animate: false, durationMs: 0, direction: direction };
    var pending = clone(state);
    pending.animating = true;
    pending.pending = { mode: mode, index: index, direction: direction };
    return { ok: true, reason: "", session: pending, animate: true, durationMs: durationMs, direction: direction };
  }

  function finishTurn(session) {
    var state = session || createSession();
    if (!state.pending) {
      var idle = clone(state);
      idle.animating = false;
      return idle;
    }
    return apply(state, state.pending.mode, state.pending.index);
  }

  return {
    TURN_MS: TURN_MS,
    planOpenings: planOpenings,
    proofOpenings: proofOpenings,
    gutterClear: gutterClear,
    createSession: createSession,
    presentation: presentation,
    command: command,
    finishTurn: finishTurn
  };
});
