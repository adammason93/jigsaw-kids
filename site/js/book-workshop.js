/* Read-only Book Workshop. This file does not start generation, send Continue,
   or read another account's artwork. */
(function (root, factory) {
  var Progress = null;
  if (typeof module === "object" && module.exports) {
    Progress = require("./book-v2-progress.js");
  } else if (root) {
    Progress = root.WondiiBookV2Progress;
  }
  var api = factory(Progress);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookWorkshop = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Progress) {
  "use strict";

  var SHELF_HREF = "../portal.html#stories";

  function text(value) {
    return String(value || "");
  }

  function count(value) {
    var number = Number(value);
    if (!isFinite(number) || number < 0) return 0;
    return Math.floor(number);
  }

  function shelfReady(book) {
    if (!book || book.generated !== true || book.recordKind === "plan" || !book.id) return false;
    var pages = book.pages || [];
    if (!pages.length) return false;
    if (Number(book.pageCount) > 0 && pages.length !== Number(book.pageCount)) return false;
    return pages.every(function (page) {
      if (!page) return false;
      var line = text(page.text || page.prose).trim();
      var image = text(page.imageDataUrl || page.imageUrlFallback);
      return !!line && image.indexOf("data:image/") === 0;
    });
  }

  function readHref(book) {
    if (!shelfReady(book)) return "";
    return "book-prototype/?book=" + encodeURIComponent(book.id);
  }

  function ownsJob(job, accountId) {
    var owner = text(job && job.accountId);
    var signedIn = text(accountId);
    if (!owner || !signedIn) return true;
    return owner === signedIn;
  }

  function previewSrc(item) {
    var src = typeof item === "string" ? item : text(item && item.src);
    if (!src || src.indexOf("..") >= 0 || src.indexOf("\\") >= 0) return "";
    if (/^data:image\/(png|jpeg|jpg|webp);/i.test(src)) return src;
    if (/^images\/workshop\/[a-z0-9.-]+\.(jpg|webp)$/i.test(src)) return src;
    return "";
  }

  function previewsOf(job, accepted, allowed) {
    if (!allowed || accepted < 1) return [];
    var list = job && Array.isArray(job.acceptedPreviews) ? job.acceptedPreviews : [];
    var out = [];
    list.forEach(function (item) {
      if (out.length >= accepted || out.length >= 6) return;
      var src = previewSrc(item);
      if (!src) return;
      out.push({ src: src, alt: "Accepted illustration" });
    });
    return out;
  }

  function countLine(scene, accepted, total) {
    if (!total) return "";
    if (scene === "opening" || scene === "writing" || scene === "planning" || scene === "idea") return "";
    if (scene === "completed" && !accepted) return "";
    return accepted + " of " + total + " illustrations accepted";
  }

  function readerHref(job) {
    var href = text(job && job.reader);
    if (!/^book-prototype\/\?book=[A-Za-z0-9._~%-]+$/.test(href)) return "";
    return href;
  }

  function pauseCopy(reason) {
    if (reason === "needs-review") {
      return "This illustration needs an adult to look at it before Wondii requests another picture. Saved pages and pictures stay as they are.";
    }
    if (reason === "uncertain" || reason === "picture-uncertain" || reason === "picture-lost") {
      return "This step paused before it finished. It will not be started again on its own.";
    }
    if (reason === "budget" || reason === "call-cap") {
      return "This story has paused because it reached its spending limit. Nothing more was started.";
    }
    if (reason === "model-timeout" || reason === "picture-timeout") {
      return "This step paused. Nothing extra was started.";
    }
    if (reason === "authorisation-withdrawn") {
      return "This story has stopped. Permission to continue was taken away.";
    }
    return "This story is paused. Nothing is running by itself.";
  }

  function activeCopy(scene, writerStage, accepted, total) {
    var stage = text(writerStage);
    if (scene === "writing" || scene === "planning") {
      if (stage === "prose" || stage === "prose-repair") return "Making sure your story is just right…";
      if (stage.indexOf("bible") >= 0 || stage.indexOf("page") >= 0 || scene === "planning") {
        return "Finding the perfect words…";
      }
      return "Dreaming up your adventure…";
    }
    if (scene === "drawing") {
      if (total > 0 && accepted < total) {
        return "Painting illustration " + (accepted + 1) + " of " + total + "…";
      }
      return "Adding colour to your book…";
    }
    if (scene === "checking") return "Making sure your characters look just right…";
    if (scene === "assembling") return "Putting the finishing touches on your book…";
    if (scene === "saving") return "Finding the perfect spot on your bookshelf…";
    return "Your adventure is coming to life!";
  }

  function restingCopy(scene, accepted, total) {
    if (scene === "drawing" && total > 0) {
      var next = accepted < total ? accepted + 1 : total;
      return "Illustration " + next + " of " + total + " is waiting. Nothing is being painted right now.";
    }
    if (scene === "checking") return "The character check is waiting. Nothing is being checked right now.";
    if (scene === "assembling") return "The pages are ready to gather. Nothing is moving on its own.";
    if (scene === "saving") return "The book is ready to be saved. Nothing is being saved right now.";
    return "This step is ready when you are. Nothing is running by itself.";
  }

  function present(job, options) {
    var settings = options || {};
    var now = Number(settings.now) || Date.now();
    var shop = Progress && Progress.workshop ? Progress.workshop(job) : {
      scene: "paused",
      status: "paused",
      acceptedIllustrations: 0,
      illustrationTotal: 0,
      startsPaidWork: false
    };
    var seen = Progress && Progress.view ? Progress.view(job, now, { names: settings.names || [] }) : {
      state: "saved",
      active: false,
      canContinue: false,
      button: "",
      buttonEnabled: false,
      detail: ""
    };
    var accepted = count(shop.acceptedIllustrations);
    var total = count(shop.illustrationTotal);
    var reason = text(job && job.reason);
    var reduced = settings.reducedMotion === true;
    var owned = ownsJob(job, settings.accountId);
    var readyBook = shelfReady(settings.shelfBook) ? settings.shelfBook : null;
    var base = {
      showWorkshop: false,
      scene: "idea",
      status: "saved",
      moving: false,
      reducedMotion: reduced,
      headline: "",
      message: "",
      note: "",
      acceptedIllustrations: accepted,
      illustrationTotal: total,
      countLine: "",
      previews: [],
      continueLabel: "",
      continueEnabled: false,
      readHref: "",
      shelfHref: SHELF_HREF,
      completed: false,
      startsPaidWork: false
    };
    if (!owned) {
      base.showWorkshop = true;
      base.scene = "unavailable";
      base.status = "unavailable";
      base.headline = "This story belongs to another library";
      base.message = "Sign in to the library that started this book.";
      base.acceptedIllustrations = 0;
      base.illustrationTotal = 0;
      return base;
    }
    var status = text(job && job.status);
    if (settings.opening === true || status === "checking") {
      base.showWorkshop = true;
      base.scene = "opening";
      base.status = "checking";
      base.moving = !reduced;
      base.headline = "Creating your book";
      base.message = "Creating your book";
      base.acceptedIllustrations = 0;
      base.illustrationTotal = 0;
      return base;
    }
    if (!job || !status || status === "saved" || seen.state === "saved") return base;
    if (seen.state === "unavailable" || status === "unavailable") {
      base.showWorkshop = true;
      base.scene = "unavailable";
      base.status = "unavailable";
      base.headline = "We could not see this story";
      base.message = text(job && job.message) || seen.detail || "Unable to check progress right now.";
      return base;
    }

    var finished = shop.completed === true || status === "complete" || reason === "saved";
    var savedReader = finished ? readerHref(job) : "";
    if (finished && (readyBook || savedReader)) {
      base.showWorkshop = true;
      base.scene = "completed";
      base.status = "completed";
      base.headline = "Your book is ready!";
      base.message = "Your book is ready!";
      base.completed = true;
      base.readHref = readyBook ? readHref(readyBook) : savedReader;
      base.countLine = countLine(base.scene, accepted, total);
      base.previews = previewsOf(job, accepted, true);
      return base;
    }
    if (finished) {
      base.showWorkshop = true;
      base.scene = "saving";
      base.status = "waiting";
      base.headline = "Creating your book";
      base.message = "Finding the perfect spot on your bookshelf…";
      base.note = "The finished book is not on the shelf yet.";
      base.countLine = countLine(base.scene, accepted, total);
      return base;
    }

    var blocked = reason === "authorisation-withdrawn";
    var continueOk = !blocked && seen.canContinue === true && seen.buttonEnabled === true && seen.active !== true;
    var label = continueOk ? text(seen.button) : "";
    if (/unavailable/i.test(label)) {
      continueOk = false;
      label = "";
    }

    if (shop.failed) {
      base.showWorkshop = true;
      base.scene = "failed";
      base.status = "failed";
      base.headline = "This story has stopped";
      base.message = "This step did not pass, so the book has stopped. Nothing else was started.";
      base.note = text(seen.detail);
      base.countLine = countLine(base.scene, accepted, total);
      base.previews = previewsOf(job, accepted, true);
      return base;
    }
    if (shop.paused) {
      base.showWorkshop = true;
      base.scene = "paused";
      base.status = "paused";
      base.headline = "This step has paused";
      base.message = pauseCopy(reason);
      base.note = text(seen.detail);
      base.countLine = countLine(base.scene, accepted, total);
      base.previews = previewsOf(job, accepted, true);
      base.continueLabel = label;
      base.continueEnabled = continueOk;
      return base;
    }

    var scene = shop.scene || "writing";
    var live = seen.active === true && seen.state === "working" && shop.status === "working";
    var willResume = !!(job && job.automaticResume === true) && !shop.paused && !shop.failed;
    base.showWorkshop = true;
    base.scene = scene;
    base.status = live ? "working" : "waiting";
    base.moving = live && !reduced;
    base.headline = "Creating your book";
    base.message = live
      ? activeCopy(scene, job && job.writerStage, accepted, total)
      : (willResume ? "Your story is still being made. The next step will start on its own." : restingCopy(scene, accepted, total));
    base.note = live ? "" : (willResume ? "You can close this page. The book will keep going." : "Nothing is running by itself.");
    base.countLine = countLine(base.scene, accepted, total);
    base.previews = previewsOf(job, accepted, true);
    base.continueLabel = (live || willResume) ? "" : label;
    base.continueEnabled = (live || willResume) ? false : continueOk;
    return base;
  }

  function snapshot(job) {
    var row = job || {};
    return {
      accountId: text(row.accountId),
      status: text(row.status),
      reason: text(row.reason),
      stage: text(row.stage),
      writerStage: text(row.writerStage),
      pendingKind: text(row.pendingKind),
      acceptedPictures: count(row.acceptedPictures),
      illustrationUnits: count(row.illustrationUnits),
      startedAt: Number(row.startedAt) || 0,
      recoverable: row.recoverable === true,
      automaticResume: row.automaticResume === true,
      message: text(row.message).slice(0, 280),
      reader: typeof row.reader === "string" ? row.reader : "",
      attempts: count(row.attempts)
    };
  }

  function field(root, name) {
    return root.querySelector("[data-field='" + name + "']");
  }

  function render(container, model, handlers) {
    if (!container || !model) return null;
    var hooks = handlers || {};
    var root = container.querySelector("[data-workshop]");
    if (!root) {
      root = document.createElement("section");
      root.className = "bw";
      root.setAttribute("data-workshop", "true");
      root.innerHTML = [
        "<p class='bw-kicker'>Wondii Book Workshop</p>",
        "<div class='bw-stage' aria-hidden='true'>",
        "<img class='bw-shelf' data-field='shelf' alt=''>",
        "<div class='bw-book'>",
        "<img class='bw-cover' data-field='cover' alt=''>",
        "<div class='bw-open'>",
        "<div class='bw-leaf bw-leaf--left'><span></span><span></span><span></span></div>",
        "<div class='bw-leaf bw-leaf--right'><span></span><span></span><span></span><span></span></div>",
        "</div>",
        "<div class='bw-pencil'></div>",
        "<div class='bw-brush'></div>",
        "<div class='bw-glass'></div>",
        "<img class='bw-peek' data-field='peek' alt=''>",
        "<div class='bw-spark' aria-hidden='true'><i></i><i></i><i></i></div>",
        "</div></div>",
        "<p class='bw-message' data-field='message' role='status'></p>",
        "<p class='bw-count' data-field='count'></p>",
        "<div class='bw-previews' data-field='previews'></div>",
        "<p class='bw-note' data-field='note'></p>",
        "<div class='bw-actions' data-field='actions'></div>"
      ].join("");
      container.appendChild(root);
      var base = hooks.artBase || "images/workshop/";
      field(root, "cover").src = base + "book-cover.jpg";
      field(root, "peek").src = base + "sofia-peek.jpg";
      field(root, "shelf").src = base + "bookshelf.jpg";
    }
    root.dataset.scene = model.scene;
    root.dataset.status = model.status;
    root.dataset.motion = model.moving ? "on" : "off";
    if (model.reducedMotion) root.dataset.reduced = "true";
    else root.removeAttribute("data-reduced");
    field(root, "message").textContent = model.message || "";
    var countNode = field(root, "count");
    countNode.textContent = model.countLine || "";
    countNode.hidden = !model.countLine;
    field(root, "note").textContent = model.note || "";
    var shots = field(root, "previews");
    var signature = (model.previews || []).map(function (shot) { return shot.src; }).join("\n");
    if (shots.getAttribute("data-signature") !== signature) {
      shots.setAttribute("data-signature", signature);
      shots.innerHTML = "";
      (model.previews || []).forEach(function (shot) {
        var image = document.createElement("img");
        image.src = shot.src;
        image.alt = shot.alt || "Accepted illustration";
        shots.appendChild(image);
      });
    }
    shots.hidden = !(model.previews && model.previews.length);
    var actions = field(root, "actions");
    actions.innerHTML = "";
    if (model.continueEnabled && model.continueLabel && hooks.onContinue) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bw-continue";
      button.textContent = model.continueLabel;
      button.addEventListener("click", function () {
        hooks.onContinue();
      });
      actions.appendChild(button);
    }
    if (model.completed && model.readHref) {
      var read = document.createElement("a");
      read.className = "bw-read";
      read.href = model.readHref;
      read.textContent = "Read My Book";
      actions.appendChild(read);
      var shelf = document.createElement("a");
      shelf.className = "bw-library";
      shelf.href = model.shelfHref || SHELF_HREF;
      shelf.textContent = "Go to My Bookshelf";
      actions.appendChild(shelf);
    } else if (model.status === "unavailable" || model.status === "failed") {
      var leave = document.createElement("a");
      leave.className = "bw-library";
      leave.href = model.shelfHref || SHELF_HREF;
      leave.textContent = "Go to My Bookshelf";
      actions.appendChild(leave);
    }
    return root;
  }

  return {
    present: present,
    render: render,
    snapshot: snapshot,
    shelfReady: shelfReady,
    readHref: readHref
  };
});
