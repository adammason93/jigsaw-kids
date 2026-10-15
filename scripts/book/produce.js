"use strict";

/* Runs the existing Book V2 pieces for one saved plan.
   The writer, art direction, picture prompts, visual check, and shelf save
   stay in their own files. This file supplies the order, the budget stop,
   and the recovery record. A model is called only through ports, and only
   after the budget gate has allowed it. */

var Adapter = require("../../js/book-v2-adapter.js");
var Writer = require("./writer.js");
var Art = require("../../js/book-art-direction.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Shelf = require("../../js/book-v2-shelf.js");
var Budget = require("../../js/book-v2-budget.js");
var Hosted = require("./hosted-job.js");

function callsOf(source) {
  var used = source && source.calls || {};
  return {
    text: Number(used.text) || 0,
    image: Number(used.image) || 0,
    vision: Number(used.vision) || 0
  };
}

function publicJob(job) {
  var copy = Object.assign({}, job || {});
  delete copy.checkpoint;
  return copy;
}

function named(registry, characterId) {
  var row = (registry || []).filter(function (entry) { return entry.characterId === characterId; })[0];
  return row && row.name ? row.name : characterId;
}

function storyRows(bible) {
  return (bible && bible.storyCast || []).map(function (row) {
    var appearance = [row.face, row.colouring, row.markings, row.covering].filter(Boolean).join(". ");
    return {
      id: row.characterId,
      name: row.name,
      appearance: appearance,
      clothing: (row.accessories || []).join(", ")
    };
  }).filter(function (row) { return row.id && row.appearance; });
}

function markStages(active, done) {
  if (done) {
    return Hosted.stages("read").map(function (stage) {
      return Object.assign({}, stage, { state: "done" });
    });
  }
  return Hosted.stages(active);
}

function jobFor(source, extra) {
  var gate = extra.generation || { reason: "paid-generation-not-approved" };
  return Object.assign({
    creationKey: String(source.creationKey || ""),
    accountId: String(source.accountId || ""),
    stage: "plan",
    status: "saved",
    paid: false,
    started: false,
    recoverable: true,
    attempts: Number(extra.attempts) || 0,
    budgetUsd: Budget.BUDGET_USD,
    calls: callsOf(extra),
    stages: markStages("plan"),
    reason: gate.reason || "",
    message: "The story idea is saved. The illustrated book has not been made yet.",
    layouts: [],
    reader: ""
  }, extra.job || {});
}

function held(source, prior, generation, reason) {
  var job = jobFor(source, {
    attempts: prior && prior.attempts,
    calls: prior && prior.calls,
    generation: generation,
    job: {
      stage: prior && prior.stage || "plan",
      status: prior && prior.status || "saved",
      paid: false,
      started: false,
      calls: callsOf(prior),
      stages: prior && prior.stages || markStages("plan"),
      reason: reason || (generation && generation.reason) || "paid-generation-not-approved",
    message: reason === "already-running"
      ? "This story is already being made. It was not started again."
      : reason === "already-generated"
        ? "This book is already on the shelf. It was not generated again."
        : (generation && generation.message) || "The story idea is saved. The illustrated book has not been made yet.",
    reader: ""
    }
  });
  return {
    ok: reason === "already-generated",
    ran: false,
    duplicate: reason === "already-generated" || reason === "already-running",
    reason: reason,
    job: publicJob(job),
    generation: generation,
    book: null,
    reader: ""
  };
}

function charge(calls, kind) {
  var next = callsOf({ calls: calls });
  next[kind] += 1;
  if (next.text > Budget.MAX_TEXT || next.image > Budget.MAX_IMAGE || next.vision > Budget.MAX_VISION) {
    return { ok: false, reason: "call-cap", calls: calls };
  }
  if (Budget.price(next).usd > Budget.BUDGET_USD) {
    return { ok: false, reason: "budget", calls: calls };
  }
  return { ok: true, calls: next };
}

function visionReport(report, spread) {
  return Visual.acceptIllustration(report, spread);
}

function run(existing, input, ports) {
  var source = input || {};
  var store = ports && ports.store;
  var jobs = ports && ports.jobs;
  var accountId = String(source.accountId || "");
  var key = String(source.creationKey || "");
  return Promise.resolve(!existing && jobs && jobs.read ? jobs.read(accountId, key) : null).then(function (loaded) {
    return runLoaded(existing || loaded || null, source, ports, store, jobs, accountId, key);
  });
}

function runLoaded(prior, source, ports, store, jobs, accountId, key) {

  var finished = null;
  if (store && store.readShelf) {
    finished = (store.readShelf(accountId) || []).filter(function (book) {
      return book && String(book.creationKey || "") === key && !Shelf.isStoryPlan(book);
    })[0] || null;
  }
  if (finished || (prior && prior.status === "complete") || source.alreadyGenerated === true) {
    var again = Budget.decide({
      approved: true,
      accountId: accountId,
      accountKind: source.accountKind,
      alreadyGenerated: true,
      calls: Budget.quote().calls
    });
    var duplicate = held(source, prior, again, "already-generated");
    duplicate.book = finished;
    duplicate.reader = finished ? "book-prototype/?book=" + encodeURIComponent(finished.id) : "";
    duplicate.job.message = "This book is already on the shelf. It was not generated again.";
    return Promise.resolve(duplicate);
  }

  var gate = Budget.decide({
    approved: !!(ports && ports.approved === true),
    accountId: accountId,
    accountKind: source.accountKind,
    childPermitted: source.childPermitted === true,
    allowanceReserved: source.allowanceReserved === true,
    alreadyGenerated: false,
    budgetUsd: Budget.BUDGET_USD,
    calls: Budget.quote().calls
  });
  if (!gate.authorised) return Promise.resolve(held(source, prior, gate, gate.reason));
  if (!ports || typeof ports.callModel !== "function" || typeof ports.drawImage !== "function" || typeof ports.inspectImage !== "function") {
    return Promise.resolve(held(source, prior, gate, "writer-not-connected"));
  }

  return Promise.resolve(jobs && jobs.claim ? jobs.claim(accountId, key) : { ok: true, prior: prior }).then(function (claim) {
  if (!claim.ok) return held(source, claim.job || prior, gate, claim.reason || "already-running");
  prior = claim.prior || prior;
  var checkpoint = prior && prior.checkpoint || {};
  var calls = callsOf(prior);
  var attempts = (Number(prior && prior.attempts) || 0) + 1;

  function stop(stage, reason, message, art) {
    var job = jobFor(source, {
      attempts: attempts,
      calls: calls,
      generation: gate,
      job: {
        stage: stage,
        status: "interrupted",
        paid: calls.text + calls.image + calls.vision > 0,
        started: true,
        recoverable: true,
        calls: calls,
        stages: markStages(stage).map(function (row) {
          return row.id === stage ? Object.assign({}, row, { state: "blocked" }) : row;
        }),
        reason: reason,
        message: message,
        layouts: art && art.pages ? art.pages.map(function (page) { return page.layout; }) : [],
        reader: "",
        checkpoint: checkpoint
      }
    });
    if (jobs && jobs.write) jobs.write(accountId, key, job);
    var out = held(source, null, gate, reason);
    out.job = publicJob(job);
    out.art = art || null;
    return out;
  }

  var planned = Adapter.planRequest(source);
  if (!planned.ok) {
    return Promise.resolve(stop("plan", "plan", planned.message || "The story plan could not start. Nothing was saved."));
  }

  var halt = "";
  var bookPromise = checkpoint.story && checkpoint.story.status === "REVIEWABLE" && checkpoint.story.pages
    ? Promise.resolve(checkpoint.story)
    : Writer.generateBook(planned.request, {
      callModel: function (brief, opts) {
        var billed = charge(calls, "text");
        if (!billed.ok) {
          halt = billed.reason;
          return Promise.resolve({ __error: billed.reason });
        }
        calls = billed.calls;
        return ports.callModel(brief, opts);
      },
      model: ports.model || "gpt-6.1-sol"
    });

  return bookPromise.then(function (book) {
    if (halt === "budget" || halt === "call-cap") {
      return stop("story", halt, halt === "budget"
        ? "This book would cost more than its budget. Nothing more was started, and the book was not saved."
        : "This book would take more story calls than Wondii allows. The book was not saved.");
    }
    if (!book || book.status !== "REVIEWABLE" || !(book.pages || []).length) {
      return stop("story", "story", "The story was not finished, so no pictures were drawn and nothing was saved.");
    }
    checkpoint.story = {
      status: book.status,
      bible: book.bible,
      pages: book.pages,
      textProblems: book.textProblems || [],
      storyProblems: book.storyProblems || []
    };
    var pages = book.pages;
    var registryBuilt = Identity.buildRegistry({
      members: source.members || [],
      savedReferences: source.savedReferences,
      sharedCharacters: source.sharedCharacters,
      storyCharacters: storyRows(book.bible),
      accountId: accountId,
      pages: pages.map(function (page) {
        return { pageId: page.pageId, charactersPresent: page.charactersPresent || [] };
      })
    });
    if (!registryBuilt.ok) {
      return stop("story", "artwork", "A character reference could not be checked. Nothing was saved.");
    }
    var registry = registryBuilt.registry || [];
    Identity.clearCache();
    var wanted = {};
    pages.forEach(function (page) {
      (page.charactersPresent || []).forEach(function (id) { wanted[id] = true; });
    });
    var scenes = pages.map(function (page) {
      return Identity.prepareScene(registry, page.charactersPresent || [], { ownerId: accountId });
    });
    if (scenes.some(function (scene) { return scene.blocksGeneration; })) {
      var blocked = scenes.filter(function (scene) { return scene.blocksGeneration; })[0];
      var who = (blocked.limitations || []).map(function (item) {
        var id = String(item).split(":").pop();
        return named(registry, id);
      }).filter(Boolean)[0] || "A character";
      return stop("pictures", "artwork", who + " needs their own portrait before pictures can be drawn. Nothing was saved.");
    }
    var files = [];
    scenes.forEach(function (scene) {
      (scene.files || []).forEach(function (file) {
        if (!files.some(function (row) { return row.characterId === file.characterId; })) files.push(file);
      });
    });
    checkpoint.references = checkpoint.references || {};
    var references = checkpoint.references;
    var seen = {};
    Object.keys(references).forEach(function (id) {
      if (references[id] && references[id].bytes) seen[references[id].bytes] = id;
    });
    var pending = files.filter(function (file) { return !references[file.characterId]; });
    return pending.reduce(function (chain, file) {
      return chain.then(function (problem) {
        if (problem) return problem;
        var entry = registry.filter(function (row) { return row.characterId === file.characterId; })[0] || {};
        var path = String(file.file || entry.reference || "");
        var priv = file.privateArt === true || entry.privateArt === true || entry.source === "saved";
        if (priv) {
          var owned = Identity.ownedPortrait(accountId, file.characterId, path);
          if (!owned) return named(registry, file.characterId) + " portrait";
          path = owned;
        } else if (!path || path.indexOf("..") >= 0 || path.indexOf("\\") >= 0) {
          return named(registry, file.characterId) + " portrait";
        }
        return Promise.resolve(ports.fetchReference({
          accountId: accountId,
          characterId: file.characterId,
          file: path,
          privateArt: priv
        })).then(function (got) {
          var bytes = got && got.ok ? String(got.bytes || "") : "";
          if (!bytes) return named(registry, file.characterId);
          if (seen[bytes] && seen[bytes] !== file.characterId) return named(registry, file.characterId);
          seen[bytes] = file.characterId;
          references[file.characterId] = { file: path, bytes: bytes, privateArt: priv };
          return "";
        });
      });
    }, Promise.resolve("")).then(function (problem) {
      if (problem) {
        return stop("pictures", "artwork", problem + " needs their own portrait before pictures can be drawn. Nothing was saved.");
      }
      checkpoint.references = references;
      var directed = Art.directBook({
        tone: planned.request && planned.request.tone,
        pages: pages.map(function (page) {
          return {
            text: page.prose || page.text || "",
            phase: page.narrativePhase || page.phase || "",
            shot: page.shotType || page.shot || "",
            characters: page.charactersPresent || [],
            emotion: page.emotion || ""
          };
        })
      });
      var artCheck = Art.checkBook({
        pages: pages.map(function (page) { return { text: page.prose || page.text || "" }; })
      }, directed);
      var artBlocking = (artCheck.issues || []).filter(function (issue) {
        return issue.indexOf("text-room:") !== 0;
      });
      if (artBlocking.length) {
        return stop("art", "art", "The page layouts were not ready, so no pictures were drawn and nothing was saved.", directed);
      }
      var contracts = Visual.contractsFor(book.bible, pages, {});
      var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
      checkpoint.pictures = checkpoint.pictures || {};
      checkpoint.repairs = checkpoint.repairs || {};
      var pictures = checkpoint.pictures;
      var repairs = checkpoint.repairs;
      return (contracts.spreads || []).reduce(function (chain, spread, index) {
        return chain.then(function (failed) {
          if (failed) return failed;
          var page = pages[index];
          var pageId = page.pageId || spread.spreadId;
          if (pictures[pageId] && pictures[pageId].accepted) return "";
          var note = directed.pages[index] && directed.pages[index].promptNote;
          if (note) spread.compositionNote = note;
          var prompt = Visual.spreadPrompt(book.bible, spread, lineup);
          var refs = (spread.charactersPresent || []).map(function (id) {
            return references[id] ? { characterId: id, file: references[id].file, bytes: references[id].bytes } : null;
          }).filter(Boolean);
          function draw(kind) {
            var billed = charge(calls, "image");
            if (!billed.ok) return Promise.reject(Object.assign(new Error(billed.reason), { code: billed.reason }));
            calls = billed.calls;
            return Promise.resolve(ports.drawImage({
              pageId: pageId,
              prompt: kind === "repair" ? Visual.repairPrompt(book.bible, spread, lineup) : prompt,
              references: refs,
              repair: kind === "repair"
            }));
          }
          function inspect(image) {
            var billed = charge(calls, "vision");
            if (!billed.ok) return Promise.reject(Object.assign(new Error(billed.reason), { code: billed.reason }));
            calls = billed.calls;
            return Promise.resolve(ports.inspectImage({ pageId: pageId, image: image, spread: spread })).then(function (report) {
              return { image: image, report: report, verdict: visionReport(report, spread) };
            });
          }
          return draw("new").then(inspect).then(function (first) {
            if (first.verdict.ok) return first;
            if ((repairs[pageId] || 0) >= Visual.MAX_VISUAL_REPAIRS) return first;
            repairs[pageId] = (repairs[pageId] || 0) + 1;
            return draw("repair").then(inspect);
          }).then(function (checked) {
            if (!checked.verdict.ok) return pageId;
            var stored = ports.storePicture ? ports.storePicture({
              accountId: accountId,
              creationKey: key,
              pageId: pageId,
              dataUrl: checked.image
            }) : checked.image;
            return Promise.resolve(stored).then(function (saved) {
              var url = String(saved || "");
              if (url.indexOf("data:image/") !== 0) return pageId;
              pictures[pageId] = { accepted: true, dataUrl: url, report: checked.report };
              page.imageDataUrl = url;
              return "";
            });
          });
        });
      }, Promise.resolve("")).then(function (failed) {
        checkpoint.pictures = pictures;
        checkpoint.repairs = repairs;
        if (failed) {
          return stop("check", "picture", "A picture did not pass its check, so the book was not saved and no story allowance was used.", directed);
        }
        var consistency = Visual.characterConsistencyCheckpoint(pages.map(function (page, index) {
          var shot = pictures[page.pageId];
          return {
            page: index + 1,
            characters: shot && shot.report && shot.report.characters || []
          };
        }), { humanApproved: false });
        if (consistency.problems.length) {
          return stop("check", "picture", "A character did not match their own portrait, so the book was not saved.", directed);
        }
        var result = {
          status: "REVIEWABLE",
          illustrationStyle: "wondii-picture-book",
          bible: book.bible,
          pages: pages,
          textProblems: book.textProblems || [],
          storyProblems: book.storyProblems || []
        };
        var saved = Shelf.commitBook({
          result: result,
          owner: {
            userId: accountId,
            accountKind: source.accountKind === "child" ? "child" : "adult",
            childId: source.accountKind === "child" ? source.childId : ""
          },
          creationKey: key
        }, { store: store, allowance: ports.allowance });
        if (!saved.ok || !saved.book) {
          return stop("save", saved.reason || "save", "The book could not be saved. No story allowance was used.", directed);
        }
        saved.book.generated = true;
        saved.book.recordKind = "book";
        saved.book.openable = true;
        saved.book.savedAt = new Date().toISOString();
        if (store.writeShelf) {
          var list = store.readShelf(accountId) || [];
          store.writeShelf(accountId, list.map(function (item) {
            return item && item.id === saved.book.id ? saved.book : item;
          }));
        }
        var done = jobFor(source, {
          attempts: attempts,
          calls: calls,
          generation: gate,
          job: {
            stage: "read",
            status: "complete",
            paid: true,
            started: true,
            recoverable: false,
            calls: calls,
            stages: markStages("read", true),
            reason: "saved",
            message: "The illustrated book is ready.",
            layouts: directed.pages.map(function (page) { return page.layout; }),
            reader: saved.reader || "",
            checkpoint: { story: checkpoint.story, pictures: Object.keys(pictures) }
          }
        });
        if (jobs && jobs.write) jobs.write(accountId, key, done);
        return {
          ok: true,
          ran: true,
          duplicate: false,
          reason: "saved",
          job: publicJob(done),
          generation: gate,
          book: saved.book,
          reader: saved.reader || "",
          art: directed,
          claimed: saved.claimed === true,
          references: Object.keys(references).map(function (id) {
            return { characterId: id, file: references[id].file };
          }),
          calls: calls
        };
      });
    });
  }).catch(function (error) {
    var code = error && error.code || "story";
    var stage = checkpoint.story ? "pictures" : "story";
    if (code === "budget" || code === "call-cap") stage = "pictures";
    var message = code === "budget"
      ? "This book would cost more than its budget. Nothing more was started, and the book was not saved."
      : code === "call-cap"
        ? "This book would take more picture checks than Wondii allows. The book was not saved."
        : "The story stopped before it was finished. Nothing was saved.";
    return stop(stage, code, message);
  });
  });
}

module.exports = { run: run };
