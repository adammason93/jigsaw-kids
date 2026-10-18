
// scripts/book/produce.js
var require_produce = __commonJS({
  "scripts/book/produce.js"(exports, module) {
    "use strict";
    var Adapter = require_book_v2_adapter();
    var Writer = require_writer();
    var Art = require_book_art_direction();
    var Visual = require_book_visual();
    var Identity = require_book_v2_identity();
    var Shelf = require_book_v2_shelf();
    var Budget = require_book_v2_budget();
    var Cost = require_book_v2_cost();
    var Composition = require_book_composition();
    var Spread = require_book_spread();
    var Hosted = require_hosted_job();
    var Orchestrate = require_orchestrate();
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
    function uniqueProblems(list) {
      var seen = {};
      return (list || []).map(function(item) {
        return String(item || "");
      }).filter(function(item) {
        if (!item || seen[item]) return false;
        seen[item] = true;
        return true;
      });
    }
    function named(registry, characterId) {
      var row = (registry || []).filter(function(entry) {
        return entry.characterId === characterId;
      })[0];
      return row && row.name ? row.name : characterId;
    }
    function storyRows(bible) {
      return (bible && bible.storyCast || []).map(function(row) {
        var appearance = [row.face, row.colouring, row.markings, row.covering].filter(Boolean).join(". ");
        return {
          id: row.characterId,
          name: row.name,
          appearance,
          clothing: (row.accessories || []).join(", ")
        };
      }).filter(function(row) {
        return row.id && row.appearance;
      });
    }
    function markStages(active, done) {
      if (done) {
        return Hosted.stages("read").map(function(stage) {
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
        generation,
        job: {
          stage: prior && prior.stage || "plan",
          status: prior && prior.status || "saved",
          paid: false,
          started: false,
          calls: callsOf(prior),
          stages: prior && prior.stages || markStages("plan"),
          reason: reason || generation && generation.reason || "paid-generation-not-approved",
          message: reason === "already-running" ? "This story is already being made. It was not started again." : reason === "already-generated" ? "This book is already on the shelf. It was not generated again." : generation && generation.message || "The story idea is saved. The illustrated book has not been made yet.",
          reader: ""
        }
      });
      return {
        ok: reason === "already-generated",
        ran: false,
        duplicate: reason === "already-generated" || reason === "already-running",
        reason,
        job: publicJob(job),
        generation,
        book: null,
        reader: ""
      };
    }
    function ensureComposition(checkpoint, book) {
      var pages = book && book.pages || [];
      var saved = checkpoint.story && checkpoint.story.composition;
      if (Composition.usable(saved, pages)) return saved;
      var bible = book && book.bible || {};
      var planned = null;
      try {
        planned = Composition.plan(pages.map(function(page) {
          return {
            id: page.pageId,
            text: page.prose || page.text || "",
            characters: page.charactersPresent || [],
            entities: page.entitiesRequired || [],
            emotion: page.emotion || "",
            phase: page.narrativePhase || page.phase || "",
            shot: page.shotType || page.shot || "",
            action: page.action || "",
            layoutIntent: page.layoutIntent || "",
            locationId: page.locationId || "",
            locationZone: page.locationZone || ""
          };
        }), {
          ageBand: bible.ageBand || bible.familyAgeBand || "",
          yearGroup: bible.yearGroup || "",
          tone: bible.tone || ""
        });
      } catch (error) {
        planned = null;
      }
      if (!Composition.usable(planned, pages)) return null;
      checkpoint.story.composition = planned;
      return planned;
    }
    function snapshot(job) {
      var copy = JSON.parse(JSON.stringify(job || {}));
      var refs = copy.checkpoint && copy.checkpoint.references || {};
      Object.keys(refs).forEach(function(id) {
        if (refs[id]) delete refs[id].bytes;
      });
      return copy;
    }
    function unpackModel(out) {
      if (out && typeof out === "object" && Object.prototype.hasOwnProperty.call(out, "value") && Object.prototype.hasOwnProperty.call(out, "usage")) {
        return { value: out.value, usage: out.usage || null };
      }
      return { value: out, usage: null };
    }
    function unpackImage(out) {
      if (typeof out === "string") return { image: out, usage: null };
      if (out && typeof out.image === "string") return { image: out.image, usage: out.usage || null };
      return { image: "", usage: null };
    }
    function unpackVision(out) {
      if (out && out.report) return { report: out.report, usage: out.usage || null };
      return { report: out, usage: null };
    }
    function acceptedReference(accountId, entry) {
      var id = String(entry && entry.characterId || "");
      var file = String(entry && (entry.approvedReference || entry.portrait || entry.reference) || "");
      if (!id || !file || file.indexOf("..") >= 0 || file.indexOf("\\") >= 0) return "";
      if (id === "wondii-maya") return file.indexOf("maya-v1") >= 0 ? file : "";
      if (id === "wondii-sofia") {
        if (file.indexOf("maya-v1") >= 0 || file.indexOf("wondii-sofia") < 0) return "";
        return file;
      }
      if (entry.source === "saved" || entry.privateArt === true) return Identity.ownedPortrait(accountId, id, file);
      if (file.indexOf("maya-v1") >= 0 || file.indexOf(id) < 0) return "";
      return file;
    }
    function visionReport(report, spread) {
      var verdict = Visual.acceptIllustration(report, spread);
      if (!(spread && spread.pageRole === "double-page-spread")) return verdict;
      var problems = (verdict.problems || []).filter(function (item) {
        return item !== "text-safe";
      });
      return { ok: problems.length === 0, problems: problems };
    }
    function writingUncertain(job) {
      var spend = job && (job.checkpoint && job.checkpoint.spend || job.spend) || {};
      var entries = Array.isArray(spend.entries) ? spend.entries : [];
      var found = null;
      entries.forEach(function(entry) {
        if (entry && entry.kind === "text" && entry.status === "uncertain") found = entry;
      });
      return found;
    }
    function run(existing, input, ports) {
      var source = input || {};
      var store = ports && ports.store;
      var jobs = ports && ports.jobs;
      var accountId = String(source.accountId || "");
      var key = String(source.creationKey || "");
      return Promise.resolve(!existing && jobs && jobs.read ? jobs.read(accountId, key) : null).then(function(loaded) {
        return runLoaded(existing || loaded || null, source, ports, store, jobs, accountId, key);
      });
    }
    function runLoaded(prior, source, ports, store, jobs, accountId, key) {
      var finished = null;
      if (store && store.readShelf) {
        finished = (store.readShelf(accountId) || []).filter(function(book) {
          return book && String(book.creationKey || "") === key && !Shelf.isStoryPlan(book);
        })[0] || null;
      }
      if (finished || prior && prior.status === "complete" || source.alreadyGenerated === true) {
        var again = Budget.decide({
          approved: true,
          accountId,
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
      if (prior && writingUncertain(prior)) {
        var paused = JSON.parse(JSON.stringify(prior));
        paused.status = "interrupted";
        paused.reason = "uncertain";
        paused.recoverable = false;
        paused.message = "This step did not finish. It was not started again.";
        return Promise.resolve(jobs && jobs.write ? jobs.write(accountId, key, snapshot(paused)) : null).then(function() {
          return {
            ok: false,
            ran: false,
            duplicate: false,
            reason: "uncertain",
            job: publicJob(paused),
            generation: null,
            book: null,
            reader: "",
            message: paused.message
          };
        });
      }
      if (prior && prior.status !== "complete" && prior.reason !== "saved" && prior.stage !== "read") {
        var stoppedReason = "";
        if (prior.reason === "budget" || prior.reason === "call-cap") stoppedReason = prior.reason;
        var grant = prior.auto || {};
        var freshApproval = ports && ports.automatic === true && source.approveGeneration === true && source.automatic === true && source.accountKind === "adult";
        if (!stoppedReason && !freshApproval && (prior.reason === "authorisation-withdrawn" || grant.revoked === true)) stoppedReason = "authorisation-withdrawn";
        if (stoppedReason) {
          return Promise.resolve({
            ok: false,
            ran: false,
            duplicate: false,
            reason: stoppedReason,
            job: publicJob(prior),
            generation: null,
            book: null,
            reader: "",
            message: stoppedReason === "budget" || stoppedReason === "call-cap" ? "This story has paused because it reached its spending limit. Nothing more was started." : "This story has stopped. Permission to continue was taken away."
          });
        }
      }
      var gate = Budget.decide({
        approved: !!(ports && ports.approved === true),
        accountId,
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
      var budgetUsd = Number(ports && ports.budgetUsd);
      if (!(budgetUsd > 0) || budgetUsd > Cost.MAX_BUDGET_USD) budgetUsd = Budget.BUDGET_USD;
      return Promise.resolve(jobs && jobs.claim ? jobs.claim(accountId, key) : { ok: true, prior }).then(function(claim) {
        if (!claim.ok) return held(source, claim.job || prior, gate, claim.reason || "already-running");
        prior = claim.prior || prior;
        var checkpoint = prior && prior.checkpoint || {};
        var calls = callsOf(prior);
        var textAtStart = calls.text;
        var spend = checkpoint.spend || prior && prior.spend || { listedUsd: 0, entries: [] };
        if (!Array.isArray(spend.entries)) spend.entries = [];
        spend.listedUsd = Cost.money(spend.listedUsd);
        spend.entries.forEach(function(entry) {
          if (entry && entry.status === "reserved") entry.status = "uncertain";
        });
        checkpoint.spend = spend;
        checkpoint.references = checkpoint.references || {};
        checkpoint.pictures = checkpoint.pictures || {};
        checkpoint.repairs = checkpoint.repairs || {};
        var attempts = (Number(prior && prior.attempts) || 0) + 1;
        var live = jobFor(source, {
          attempts,
          calls,
          generation: gate,
          job: {
            stage: prior && prior.stage || "story",
            status: "running",
            paid: calls.text + calls.image + calls.vision > 0,
            started: true,
            recoverable: true,
            budgetUsd,
            calls,
            spend,
            stages: markStages(prior && prior.stage || "story"),
            reason: "running",
            message: "The illustrated book is being made.",
            reader: "",
            checkpoint,
            startedAt: Date.now()
          }
        });
        attachAuto(live, false);
        function attachAuto(job, settle2) {
          var record = prior && prior.auto ? prior : live;
          var stamp = Orchestrate.remember(record, source, ports);
          if (!stamp) return job;
          var copy = JSON.parse(JSON.stringify(stamp));
          if (!Array.isArray(copy.completed)) copy.completed = [];
          var open = (spend.entries || []).some(function(entry) {
            return entry && (entry.status === "reserved" || entry.status === "uncertain");
          });
          if (settle2 && copy.inflight && !open && (job.reason === "continue" || job.reason === "saved" || job.status === "complete")) {
            if (copy.completed.indexOf(copy.inflight) < 0) copy.completed.push(copy.inflight);
            copy.inflight = "";
          }
          job.auto = copy;
          live.auto = copy;
          return job;
        }
        function persist() {
          live.calls = calls;
          live.spend = spend;
          live.checkpoint = checkpoint;
          live.paid = calls.text + calls.image + calls.vision > 0;
          live.startedAt = Date.now();
          if (live.status !== "complete" && live.status !== "interrupted") live.status = "running";
          return Promise.resolve(jobs && jobs.write ? jobs.write(accountId, key, snapshot(live)) : null);
        }
        function freshOwner() {
          if (live.auto && live.auto.claimOwner) return String(live.auto.claimOwner);
          if (!live.claimOwner) {
            var random = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "";
            live.claimOwner = random || "owner-" + key + "-" + Date.now();
          }
          return live.claimOwner;
        }
        function operationKey(kind, meta) {
          if (live.auto && live.auto.inflight) return String(live.auto.inflight);
          var pageId = meta && meta.pageId || "";
          var purpose = meta && meta.purpose || kind;
          var seen = 0;
          spend.entries.forEach(function(entry) {
            if (entry && entry.kind === kind && String(entry.pageId || "") === String(pageId)) seen += 1;
          });
          return key + ":" + kind + ":" + pageId + ":" + purpose + ":" + (seen + 1);
        }
        function reserve(kind, upperUsd, meta) {
          var next = callsOf({ calls });
          next[kind] += 1;
          if (next.text > Budget.MAX_TEXT || next.image > Budget.MAX_IMAGE || next.vision > Budget.MAX_VISION) {
            return Promise.resolve({ ok: false, reason: "call-cap" });
          }
          var upper = Cost.money(upperUsd);
          if (!(upper >= 0) || Cost.money(spend.listedUsd + upper) > budgetUsd) {
            return Promise.resolve({ ok: false, reason: "budget" });
          }
          var operationId = operationKey(kind, meta);
          var owner = freshOwner();
          function commit() {
            var entry = {
              id: spend.entries.length + 1,
              kind,
              status: "reserved",
              worstUsd: upper,
              listedUsd: upper,
              pageId: meta && meta.pageId || "",
              purpose: meta && meta.purpose || kind,
              operationId
            };
            if (meta && meta.unitId) entry.unitId = meta.unitId;
            if (meta && meta.size) entry.size = meta.size;
            spend.entries.push(entry);
            spend.listedUsd = Cost.money(spend.listedUsd + upper);
            calls = next;
            checkpoint.spend = spend;
            if (kind === "text") live.stage = "story";
            if (kind === "image") live.stage = "pictures";
            if (kind === "vision") live.stage = "check";
            return persist().then(function() {
              return { ok: true, entry };
            });
          }
          if (typeof ports.claimOperation !== "function") return commit();
          return Promise.resolve().then(function() {
            return ports.claimOperation(operationId, owner);
          }).then(function(claimed) {
            if (!claimed || claimed.ok !== true) return { ok: false, reason: claimed && claimed.reason || "duplicate" };
            if (typeof ports.confirmOperation !== "function") return commit();
            return Promise.resolve(ports.confirmOperation(operationId, owner)).then(function(check) {
              if (!check || check.ok !== true) return { ok: false, reason: check && check.reason || "stale-claim" };
              return commit();
            });
          }).catch(function() {
            return { ok: false, reason: "uncertain" };
          });
        }
        function settle(entry, kind, usage) {
          var actual = Cost.settle(kind, usage, entry.worstUsd);
          entry.listedUsd = actual;
          entry.status = "settled";
          entry.usage = Cost.usageSummary(usage);
          spend.listedUsd = Cost.money(spend.entries.reduce(function(sum, row) {
            return sum + (Number(row.listedUsd) || 0);
          }, 0));
          checkpoint.spend = spend;
          return persist();
        }
        function uncertain(entry) {
          if (entry && entry.status === "reserved") entry.status = "uncertain";
          checkpoint.spend = spend;
          var held = typeof ports.holdOperation === "function" && entry
            ? Promise.resolve(ports.holdOperation(entry.operationId, freshOwner())).catch(function() { return null; })
            : Promise.resolve(null);
          return held.then(function() { return persist(); });
        }
        function stop(stage, reason, message, art) {
          var job = jobFor(source, {
            attempts,
            calls,
            generation: gate,
            job: {
              stage,
              status: "interrupted",
              paid: calls.text + calls.image + calls.vision > 0,
              started: true,
              recoverable: reason !== "uncertain",
              budgetUsd,
              calls,
              spend,
              stages: markStages(stage).map(function(row) {
                return row.id === stage ? Object.assign({}, row, { state: "blocked" }) : row;
              }),
              reason,
              message,
              layouts: art && art.pages ? art.pages.map(function(page) {
                return page.layout;
              }) : [],
              reader: "",
              checkpoint
            }
          });
          attachAuto(job, true);
          live.status = "interrupted";
          return Promise.resolve(jobs && jobs.write ? jobs.write(accountId, key, snapshot(job)) : null).then(function() {
            var out = held(source, null, gate, reason);
            out.job = publicJob(job);
            out.art = art || null;
            out.calls = calls;
            out.spend = { listedUsd: spend.listedUsd, entries: spend.entries.map(function(entry) {
              return {
                id: entry.id,
                kind: entry.kind,
                status: entry.status,
                listedUsd: entry.listedUsd,
                pageId: entry.pageId || "",
                unitId: entry.unitId || "",
                size: entry.size || ""
              };
            }) };
            return out;
          });
        }
        function fetchFiles(registry, files) {
          var references = checkpoint.references;
          var seen = {};
          Object.keys(references).forEach(function(id) {
            if (references[id] && references[id].bytes) seen[references[id].bytes] = id;
          });
          var pending = (files || []).filter(function(file) {
            var got = references[file.characterId];
            return !got || !got.bytes;
          });
          return pending.reduce(function(chain, file) {
            return chain.then(function(problem) {
              if (problem) return problem;
              var entry = registry.filter(function(row) {
                return row.characterId === file.characterId;
              })[0] || {};
              if (entry.source === "story-generated") return "";
              var path = acceptedReference(accountId, entry);
              if (!path) return named(registry, file.characterId);
              var priv = entry.privateArt === true || entry.source === "saved";
              return Promise.resolve(ports.fetchReference({
                accountId,
                characterId: file.characterId,
                file: path,
                privateArt: priv
              })).then(function(got) {
                var bytes = got && got.ok ? String(got.bytes || "") : "";
                if (!bytes) return named(registry, file.characterId);
                if (seen[bytes] && seen[bytes] !== file.characterId) return named(registry, file.characterId);
                seen[bytes] = file.characterId;
                references[file.characterId] = { file: path, bytes, privateArt: priv };
                return "";
              });
            });
          }, Promise.resolve("")).then(function(problem) {
            checkpoint.references = references;
            return problem;
          });
        }
        function portraitStop(who) {
          return stop("pictures", "artwork", who + " needs their own portrait before pictures can be drawn. Nothing was saved.");
        }
        return persist().then(function() {
          var planned = Adapter.planRequest(source);
          if (!planned.ok) {
            return stop("plan", "plan", planned.message || "The story plan could not start. Nothing was saved.");
          }
          var selectedBuilt = Identity.buildRegistry({
            members: source.members || [],
            savedReferences: source.savedReferences,
            sharedCharacters: source.sharedCharacters,
            storyCharacters: [],
            accountId,
            pages: []
          });
          if (!selectedBuilt.ok) {
            var problemId = String((selectedBuilt.problems || [])[0] || "").split(":").pop();
            return portraitStop(named(selectedBuilt.registry, problemId) || "A character");
          }
          var selectedFiles = (selectedBuilt.selected || []).map(function(entry) {
            return { characterId: entry.characterId };
          });
          return fetchFiles(selectedBuilt.registry, selectedFiles).then(function(missing) {
            if (missing) return portraitStop(missing);
            return persist();
          }).then(function(stopped) {
            if (stopped && stopped.job) return stopped;
            var openWriting = (spend.entries || []).filter(function(entry) {
              return entry && entry.kind === "text" && entry.status === "uncertain";
            });
            if (openWriting.length) {
              return openWriting.reduce(function(chain, entry) {
                return chain.then(function() {
                  if (typeof ports.holdOperation !== "function" || !entry.operationId) return null;
                  return Promise.resolve(ports.holdOperation(entry.operationId, freshOwner())).catch(function() {
                    return null;
                  });
                });
              }, Promise.resolve(null)).then(function() {
                return stop("story", "uncertain", "This step did not finish. It was not started again.");
              });
            }
            var halt = "";
            var bookPromise = checkpoint.story && checkpoint.story.status === "REVIEWABLE" && checkpoint.story.pages ? Promise.resolve(checkpoint.story) : Writer.generateBook(planned.request, {
              oneCall: ports.chunked === true,
              writerState: checkpoint.writer || null,
              callModel: function(brief, opts) {
                var upper = Cost.textBound(brief, opts && opts.maxTokens);
                return reserve("text", upper, { purpose: opts && opts.purpose || "story" }).then(function(heldCall) {
                  if (!heldCall.ok) {
                    halt = heldCall.reason;
                    var refused = new Error(heldCall.reason || "checkpoint");
                    refused.code = heldCall.reason === "uncertain" ? "stale-claim" : heldCall.reason || "checkpoint";
                    throw refused;
                  }
                  return Promise.resolve(ports.callModel(brief, opts)).then(function(out) {
                    var unpacked = unpackModel(out);
                    if (unpacked.value == null || unpacked.value === "") {
                      return uncertain(heldCall.entry).then(function() {
                        var missing = new Error("uncertain");
                        missing.code = "uncertain";
                        throw missing;
                      });
                    }
                    return settle(heldCall.entry, "text", unpacked.usage).then(function() {
                      return unpacked.value;
                    });
                  }, function(error) {
                    var code = error && error.code;
                    if (code === "budget" || code === "call-cap" || code === "duplicate" || code === "stale-claim") throw error;
                    return uncertain(heldCall.entry).then(function() {
                      var halted = new Error("uncertain");
                      halted.code = "uncertain";
                      throw halted;
                    });
                  });
                });
              },
              model: ports.model || "gpt-6.1-sol"
            });
            return bookPromise.then(function(book) {
              if (halt === "budget" || halt === "call-cap" || halt === "duplicate" || halt === "stale-claim" || halt === "uncertain") {
                if (halt === "duplicate" || halt === "stale-claim") {
                  return stop(checkpoint.story ? "pictures" : "story", "already-running", "This step belongs to another worker. It was not started again.");
                }
                if (halt === "uncertain") {
                  return stop(checkpoint.story ? "pictures" : "story", "uncertain", "This step did not finish. It was not started again.");
                }
                return stop("story", halt, halt === "budget" ? "This book would cost more than its budget. Nothing more was started, and the book was not saved." : "This book would take more story calls than Wondii allows. The book was not saved.");
              }
              if (book && book.status === "CONTINUE" && book.writer) {
                if (book.writer.reusedDraft) {
                  checkpoint.failures = Array.isArray(checkpoint.failures) ? checkpoint.failures : [];
                  checkpoint.failures.push({
                    reason: "rechecked",
                    problems: book.writer.priorProblems || [],
                    kept: "saved-draft"
                  });
                }
                checkpoint.writer = book.writer;
                return stop("story", "continue", "The story is still being written.");
              }
              if (!book || book.status !== "REVIEWABLE" || !(book.pages || []).length) {
                var unresolved = uniqueProblems(book && (book.storyProblems || book.problems));
                checkpoint.failures = Array.isArray(checkpoint.failures) ? checkpoint.failures : [];
                checkpoint.failures.push({ reason: "story", problems: unresolved });
                return stop("story", "story", unresolved.length ? "The story stopped because " + unresolved.join(", ") + ". No pictures were drawn and nothing was saved." : "The story was not finished, so no pictures were drawn and nothing was saved.");
              }
              checkpoint.writer = null;
              checkpoint.story = {
                status: book.status,
                bible: book.bible,
                pages: book.pages,
                textProblems: book.textProblems || [],
                storyProblems: book.storyProblems || []
              };
              return persist().then(function() {
                var pages = book.pages;
                var registryBuilt = Identity.buildRegistry({
                  members: source.members || [],
                  savedReferences: source.savedReferences,
                  sharedCharacters: source.sharedCharacters,
                  storyCharacters: storyRows(book.bible),
                  accountId,
                  pages: pages.map(function(page) {
                    return { pageId: page.pageId, charactersPresent: page.charactersPresent || [] };
                  })
                });
                if (!registryBuilt.ok) {
                  return stop("story", "artwork", "A character reference could not be checked. Nothing was saved.");
                }
                var registry = registryBuilt.registry || [];
                Identity.clearCache();
                var wanted = {};
                pages.forEach(function(page) {
                  (page.charactersPresent || []).forEach(function(id) {
                    wanted[id] = true;
                  });
                });
                var scenes = pages.map(function(page) {
                  return Identity.prepareScene(registry, page.charactersPresent || [], { ownerId: accountId });
                });
                if (scenes.some(function(scene) {
                  return scene.blocksGeneration;
                })) {
                  var blocked = scenes.filter(function(scene) {
                    return scene.blocksGeneration;
                  })[0];
                  var who = (blocked.limitations || []).map(function(item) {
                    var id = String(item).split(":").pop();
                    return named(registry, id);
                  }).filter(Boolean)[0] || "A character";
                  return stop("pictures", "artwork", who + " needs their own portrait before pictures can be drawn. Nothing was saved.");
                }
                var files = [];
                scenes.forEach(function(scene) {
                  (scene.files || []).forEach(function(file) {
                    if (!files.some(function(row) {
                      return row.characterId === file.characterId;
                    })) files.push(file);
                  });
                });
                var references = checkpoint.references;
                return fetchFiles(registry, files).then(function(problem) {
                  if (problem) {
                    return stop("pictures", "artwork", problem + " needs their own portrait before pictures can be drawn. Nothing was saved.");
                  }
                  checkpoint.references = references;
                  var directed = Art.directBook({
                    tone: planned.request && planned.request.tone,
                    pages: pages.map(function(page) {
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
                    pages: pages.map(function(page) {
                      return { text: page.prose || page.text || "" };
                    })
                  }, directed);
                  var artBlocking = (artCheck.issues || []).filter(function(issue) {
                    return issue.indexOf("text-room:") !== 0;
                  });
                  if (artBlocking.length) {
                    return stop("art", "art", "The page layouts were not ready, so no pictures were drawn and nothing was saved.", directed);
                  }
                  var contracts = Visual.contractsFor(book.bible, pages, {});
                  var lineup = contracts.visualBible.bookCast && contracts.visualBible.bookCast.members || [];
                  checkpoint.pictures = checkpoint.pictures || {};
                  checkpoint.repairs = checkpoint.repairs || {};
                  var pictures = checkpoint.pictures;
                  var repairs = checkpoint.repairs;
                  var composition = ensureComposition(checkpoint, book);
                  if (!composition) {
                    return stop("art", "art", "The page layouts were not ready, so no pictures were drawn and nothing was saved.", directed);
                  }
                  var spreadPlan = Spread.review(pages, { art: Art, limit: 1, composition: composition });
                  checkpoint.spreadPlan = spreadPlan;
                  Spread.bindComposition(composition, pages, spreadPlan);
                  Spread.restoreQuiet(composition, pages, spreadPlan, pictures);
                  function rememberShared(url) {
                    (spreadPlan.selected || []).forEach(function(pair) {
                      var beat = composition.beats[pair.leftIndex];
                      if (!beat) return;
                      (composition.units || []).forEach(function(unit) {
                        if (unit && unit.unitId === beat.unitId) unit.imageSrc = url;
                      });
                    });
                  }
                  function spreadDraw(index, spread) {
                    var call = Spread.pictureCall(pages, spreadPlan, index);
                    if (!(call.pair && spread)) return call;
                    var right = pages[call.pair.rightIndex] || {};
                    var left = pages[call.pair.leftIndex] || {};
                    spread.pageRole = "double-page-spread";
                    spread.textSafeRegion = "lower";
                    spread.compositionNote = Spread.displayMap().note;
                    spread.illustrationMoment = Spread.momentLine(left, right);
                    spread.storyEvent = spread.illustrationMoment;
                    var both = (spread.charactersPresent || []).concat(right.charactersPresent || []);
                    spread.charactersPresent = both.filter(function(id, at) { return both.indexOf(id) === at; });
                    return call;
                  }
                  function unitFor(page) {
                    return Composition.unitForPage(composition, page && page.pageId);
                  }
                  function describe(spread, page) {
                    var unit = unitFor(page);
                    if (!unit || !spread) return unit || null;
                    if (unit.note) spread.compositionNote = [spread.compositionNote, unit.note].filter(Boolean).join(" ");
                    spread.imageSize = unit.size;
                    spread.plannedImageSize = unit.size;
                    if (unit.composition === "spread") spread.pageRole = "double-page-spread";
                    if (unit.quietRegion && unit.quietRegion !== "none") spread.plannedTextRegion = unit.quietRegion;
                    var spreadCall = Spread.pictureCall(pages, spreadPlan, pages.indexOf(page));
                    if (spreadCall.pair && unit) unit.size = Spread.IMAGE.size;
                    return unit;
                  }
                  function illustrationPages() {
                    var steps = Composition.checkpointPages(composition);
                    if (steps.length !== pages.length) return pages;
                    var ordered = steps.map(function(step) {
                      return pages.filter(function(page) {
                        return page.pageId === step.beatId;
                      })[0] || null;
                    });
                    if (ordered.some(function(page) {
                      return !page;
                    })) return pages;
                    return ordered;
                  }
                  var PictureStep = require_picture_step();
                  function onePicture() {
                    var decision = PictureStep.nextPictureStep(illustrationPages(), pictures, spend, checkpoint.pictureHolds || {}, { maxRepairs: Visual.MAX_VISUAL_REPAIRS });
                    if (decision.action === "finish") return Promise.resolve("");
                    var page = pages[decision.index];
                    var spread = (contracts.spreads || [])[decision.index];
                    var pageId = decision.pageId;
                    if (decision.action === "hold") {
                      checkpoint.pictureHolds = checkpoint.pictureHolds || {};
                      checkpoint.pictureHolds[pageId] = "reported";
                      return stop("pictures", decision.reason, PictureStep.pictureUnitMessage(decision.reason, decision.index + 1), directed);
                    }
                    if (decision.action === "blocked") return Promise.resolve(pageId);
                    var note = directed.pages[decision.index] && directed.pages[decision.index].promptNote;
                    if (note && spread) spread.compositionNote = note;
                    var unit = describe(spread, page);
                    var call = spreadDraw(decision.index, spread);
                    if (call.copy) {
                      var leftPage = pages[call.pair.leftIndex];
                      var sharedUrl = leftPage && (leftPage.imageDataUrl || pictures[leftPage.pageId] && pictures[leftPage.pageId].dataUrl) || "";
                      if (!sharedUrl) return pageId;
                      Spread.shareImage(pages, call.pair, sharedUrl);
                      pictures[pageId] = {
                        accepted: true,
                        dataUrl: sharedUrl,
                        shared: true,
                        report: pictures[leftPage.pageId] && pictures[leftPage.pageId].report,
                        unitId: unit && unit.unitId || ""
                      };
                      page.imageDataUrl = sharedUrl;
                      rememberShared(sharedUrl);
                      Spread.restoreQuiet(composition, pages, spreadPlan, pictures);
                      checkpoint.pictures = pictures;
                      return persist().then(function() {
                        var next = PictureStep.nextPictureStep(illustrationPages(), pictures, spend, checkpoint.pictureHolds || {}, { maxRepairs: Visual.MAX_VISUAL_REPAIRS });
                        if (next.action === "finish") return "";
                        return stop("pictures", "continue", PictureStep.pictureUnitMessage("accepted", decision.index + 1), directed);
                      });
                    }
                    var prompt = Visual.spreadPrompt(book.bible, spread, lineup);
                    var refs = (spread.charactersPresent || []).map(function(id) {
                      return references[id] ? { characterId: id, file: references[id].file, bytes: references[id].bytes } : null;
                    }).filter(Boolean);
                    function remember(kind, image) {
                      var priorAttempts = pictures[pageId] && pictures[pageId].attempts || [];
                      pictures[pageId] = {
                        accepted: false,
                        pending: kind === "repair" ? "repair-check" : "check",
                        dataUrl: image,
                        attempts: priorAttempts,
                        unitId: unit && unit.unitId || ""
                      };
                      checkpoint.pictures = pictures;
                      if (checkpoint.pictureHolds) delete checkpoint.pictureHolds[pageId];
                    }
                    function draw(kind) {
                      var picturePrompt = kind === "repair" ? Visual.repairPrompt(book.bible, spread, lineup) : prompt;
                      return reserve("image", Cost.imageBound(picturePrompt, refs.length), {
                        pageId,
                        purpose: kind,
                        unitId: unit && unit.unitId || "",
                        size: unit && unit.size || ""
                      }).then(function(heldCall) {
                        if (!heldCall.ok) return Promise.reject(Object.assign(new Error(heldCall.reason), { code: heldCall.reason }));
                        return Promise.resolve(ports.drawImage({
                          pageId,
                          unitId: unit && unit.unitId || "",
                          prompt: picturePrompt,
                          references: refs,
                          repair: kind === "repair",
                          size: unit && unit.size || ""
                        })).then(function(out) {
                          var unpacked = unpackImage(out);
                          remember(kind, unpacked.image);
                          return settle(heldCall.entry, "image", unpacked.usage).then(function() {
                            return unpacked.image;
                          });
                        }, function(error) {
                          return uncertain(heldCall.entry).then(function() {
                            throw error;
                          });
                        });
                      });
                    }
                    function inspect(image) {
                      return reserve("vision", Cost.money(Cost.visionBound() * (refs.length + 1)), {
                        pageId,
                        purpose: "check",
                        unitId: unit && unit.unitId || "",
                        size: unit && unit.size || ""
                      }).then(function(heldCall) {
                        if (!heldCall.ok) return Promise.reject(Object.assign(new Error(heldCall.reason), { code: heldCall.reason }));
                        return Promise.resolve(ports.inspectImage({
                          pageId,
                          image,
                          spread,
                          brief: Visual.inspectionBrief(spread, lineup),
                          references: refs
                        })).then(function(out) {
                          var unpacked = unpackVision(out);
                          var verdict = visionReport(unpacked.report, spread);
                          var shot = pictures[pageId] || { accepted: false, attempts: [], dataUrl: image };
                          shot.report = unpacked.report;
                          shot.dataUrl = shot.dataUrl || image;
                          if (verdict.ok) shot.pending = "accepting";
                          else {
                            shot.pending = "";
                            if (!Array.isArray(shot.attempts)) shot.attempts = [];
                            shot.attempts.push({
                              kind: decision.kind === "repair" ? "repair" : "new",
                              problems: (verdict.problems || []).slice(),
                              dataUrl: image
                            });
                          }
                          pictures[pageId] = shot;
                          checkpoint.pictures = pictures;
                          return settle(heldCall.entry, "vision", unpacked.usage).then(function() {
                            return { image, report: unpacked.report, verdict };
                          });
                        }, function(error) {
                          return uncertain(heldCall.entry).then(function() {
                            throw error;
                          });
                        });
                      });
                    }
                    function acceptSaved(image, report) {
                      var stored = ports.storePicture ? ports.storePicture({
                        accountId,
                        creationKey: key,
                        pageId,
                        dataUrl: image
                      }) : image;
                      return Promise.resolve(stored).then(function(saved) {
                        var url = String(saved || "");
                        if (url.indexOf("data:image/") !== 0) return pageId;
                        var priorAttempts = pictures[pageId] && pictures[pageId].attempts || [];
                        pictures[pageId] = {
                          accepted: true,
                          dataUrl: url,
                          report,
                          attempts: priorAttempts,
                          unitId: unit && unit.unitId || ""
                        };
                        page.imageDataUrl = url;
                        if (call.pair) {
                          Spread.shareImage(pages, call.pair, url);
                          var rightPage = pages[call.pair.rightIndex];
                          var rightId = rightPage && rightPage.pageId;
                          if (rightId) {
                            pictures[rightId] = {
                              accepted: true,
                              dataUrl: url,
                              shared: true,
                              report: report,
                              unitId: unit && unit.unitId || ""
                            };
                            rightPage.imageDataUrl = url;
                          }
                          rememberShared(url);
                          Spread.assignQuiet(composition, pages, call.pair, report, spread && spread.textSafeRegion);
                        }
                        checkpoint.pictures = pictures;
                        return persist().then(function() {
                          var next = PictureStep.nextPictureStep(illustrationPages(), pictures, spend, checkpoint.pictureHolds || {}, { maxRepairs: Visual.MAX_VISUAL_REPAIRS });
                          if (next.action === "finish") return "";
                          return stop("pictures", "continue", PictureStep.pictureUnitMessage("accepted", decision.index + 1), directed);
                        });
                      });
                    }
                    if (decision.action === "draw") {
                      return draw(decision.kind).then(function() {
                        return stop("pictures", "continue", PictureStep.pictureUnitMessage("drawn", decision.index + 1), directed);
                      });
                    }
                    if (decision.action === "accept") return acceptSaved(decision.image, decision.report);
                    return inspect(decision.image).then(function(checked) {
                      if (!checked.verdict.ok) {
                        var again2 = PictureStep.nextPictureStep(illustrationPages(), pictures, spend, checkpoint.pictureHolds || {}, { maxRepairs: Visual.MAX_VISUAL_REPAIRS });
                        if (again2.action === "draw" && again2.kind === "repair") {
                          return persist().then(function() {
                            return stop("pictures", "continue", PictureStep.pictureUnitMessage("repair", decision.index + 1), directed);
                          });
                        }
                        if (pictures[pageId]) pictures[pageId].unresolved = true;
                        checkpoint.pictures = pictures;
                        return persist().then(function() {
                          return pageId;
                        });
                      }
                      return acceptSaved(checked.image, checked.report);
                    });
                  }
                  if (ports.pictureSteps === true && calls.text > textAtStart) {
                    return stop("pictures", "continue", "The pages are saved. The first picture has not been started. Continuing may use more of this book's budget.", directed);
                  }
                  return (ports.pictureSteps === true ? onePicture() : illustrationPages().reduce(function(chain, page, index) {
                    return chain.then(function(failed) {
                      if (failed) return failed;
                      var spread = (contracts.spreads || [])[index];
                      var pageId = page.pageId || spread && spread.spreadId;
                      if (pictures[pageId] && pictures[pageId].accepted) return "";
                      var note = directed.pages[index] && directed.pages[index].promptNote;
                      if (note) spread.compositionNote = note;
                      var unit = describe(spread, page);
                      var call = spreadDraw(index, spread);
                      if (call.copy) {
                        var leftPage = pages[call.pair.leftIndex];
                        var sharedUrl = leftPage && (leftPage.imageDataUrl || pictures[leftPage.pageId] && pictures[leftPage.pageId].dataUrl) || "";
                        if (!sharedUrl) return pageId;
                        Spread.shareImage(pages, call.pair, sharedUrl);
                        pictures[pageId] = { accepted: true, dataUrl: sharedUrl, shared: true, report: pictures[leftPage.pageId] && pictures[leftPage.pageId].report };
                        page.imageDataUrl = sharedUrl;
                        rememberShared(sharedUrl);
                        Spread.restoreQuiet(composition, pages, spreadPlan, pictures);
                        return "";
                      }
                      var prompt = Visual.spreadPrompt(book.bible, spread, lineup);
                      var refs = (spread.charactersPresent || []).map(function(id) {
                        return references[id] ? { characterId: id, file: references[id].file, bytes: references[id].bytes } : null;
                      }).filter(Boolean);
                      function draw(kind) {
                        var picturePrompt = kind === "repair" ? Visual.repairPrompt(book.bible, spread, lineup) : prompt;
                        return reserve("image", Cost.imageBound(picturePrompt, refs.length), {
                          pageId,
                          purpose: kind,
                          unitId: unit && unit.unitId || "",
                          size: unit && unit.size || ""
                        }).then(function(heldCall) {
                          if (!heldCall.ok) return Promise.reject(Object.assign(new Error(heldCall.reason), { code: heldCall.reason }));
                          return Promise.resolve(ports.drawImage({
                            pageId,
                            unitId: unit && unit.unitId || "",
                            prompt: picturePrompt,
                            references: refs,
                            repair: kind === "repair",
                            size: unit && unit.size || ""
                          })).then(function(out) {
                            var unpacked = unpackImage(out);
                            return settle(heldCall.entry, "image", unpacked.usage).then(function() {
                              return unpacked.image;
                            });
                          }, function(error) {
                            return uncertain(heldCall.entry).then(function() {
                              throw error;
                            });
                          });
                        });
                      }
                      function inspect(image) {
                        return reserve("vision", Cost.money(Cost.visionBound() * (refs.length + 1)), {
                          pageId,
                          purpose: "check",
                          unitId: unit && unit.unitId || "",
                          size: unit && unit.size || ""
                        }).then(function(heldCall) {
                          if (!heldCall.ok) return Promise.reject(Object.assign(new Error(heldCall.reason), { code: heldCall.reason }));
                          return Promise.resolve(ports.inspectImage({
                            pageId,
                            image,
                            spread,
                            brief: Visual.inspectionBrief(spread, lineup),
                            references: refs
                          })).then(function(out) {
                            var unpacked = unpackVision(out);
                            return settle(heldCall.entry, "vision", unpacked.usage).then(function() {
                              return { image, report: unpacked.report, verdict: visionReport(unpacked.report, spread) };
                            });
                          }, function(error) {
                            return uncertain(heldCall.entry).then(function() {
                              throw error;
                            });
                          });
                        });
                      }
                      return draw("new").then(inspect).then(function(first) {
                        if (first.verdict.ok) return first;
                        if ((repairs[pageId] || 0) >= Visual.MAX_VISUAL_REPAIRS) return first;
                        repairs[pageId] = (repairs[pageId] || 0) + 1;
                        return draw("repair").then(inspect);
                      }).then(function(checked) {
                        if (!checked.verdict.ok) return pageId;
                        var stored = ports.storePicture ? ports.storePicture({
                          accountId,
                          creationKey: key,
                          pageId,
                          dataUrl: checked.image
                        }) : checked.image;
                        return Promise.resolve(stored).then(function(saved) {
                          var url = String(saved || "");
                          if (url.indexOf("data:image/") !== 0) return pageId;
                          pictures[pageId] = {
                            accepted: true,
                            dataUrl: url,
                            report: checked.report,
                            unitId: unit && unit.unitId || ""
                          };
                          page.imageDataUrl = url;
                          if (call.pair) Spread.assignQuiet(composition, pages, call.pair, checked.report, spread && spread.textSafeRegion);
                          return "";
                        });
                      });
                    });
                  }, Promise.resolve(""))).then(function(failed) {
                    if (failed && failed.job) return failed;
                    checkpoint.pictures = pictures;
                    checkpoint.repairs = repairs;
                    if (failed) {
                      return stop("check", "picture", "A picture did not pass its check, so the book was not saved and no story allowance was used.", directed);
                    }
                    var consistency = Visual.characterConsistencyCheckpoint(pages.map(function(page, index) {
                      var shot = pictures[page.pageId];
                      return {
                        page: index + 1,
                        characters: shot && shot.report && shot.report.characters || []
                      };
                    }), { humanApproved: false });
                    if (consistency.problems.length) {
                      return stop("check", "picture", "A character did not match their own portrait, so the book was not saved.", directed);
                    }
                    Spread.record(directed, pages, spreadPlan);
                    var result = {
                      status: "REVIEWABLE",
                      illustrationStyle: "wondii-picture-book",
                      bible: book.bible,
                      pages,
                      textProblems: book.textProblems || [],
                      storyProblems: book.storyProblems || [],
                      composition,
                      artDirection: {
                        schema: directed.schema,
                        pages: directed.pages,
                        spreads: directed.spreads || []
                      }
                    };
                    var saved = Shelf.commitBook({
                      result,
                      owner: {
                        userId: accountId,
                        accountKind: source.accountKind === "child" ? "child" : "adult",
                        childId: source.accountKind === "child" ? source.childId : ""
                      },
                      creationKey: key
                    }, { store, allowance: ports.allowance });
                    if (!saved.ok || !saved.book) {
                      var saveMessage = saved.reason === "page-count" ? "The story did not come back with the requested number of pages, so the book was not saved." : "The book could not be saved. No story allowance was used.";
                      return stop("save", saved.reason || "save", saveMessage, directed);
                    }
                    if (!(saved.duplicate === true && saved.reason === "already-saved")) {
                      var shelfPages = saved.book.pages || [];
                      var wantedPages = Number(saved.book.pageCount || 0);
                      var shelfReady = shelfPages.length > 0 && (wantedPages <= 0 || shelfPages.length === wantedPages) && shelfPages.every(function(page) {
                        var text = page && String(page.text || page.prose || "").trim();
                        var image = page && String(page.imageDataUrl || page.imageUrlFallback || "");
                        return !!text && (image.indexOf("data:image/") === 0 || image.indexOf("wondii-private:") === 0);
                      });
                      if (!shelfReady) {
                        return stop("save", "incomplete", "The book could not be saved. No story allowance was used.", directed);
                      }
                      saved.book.generated = true;
                      saved.book.recordKind = "book";
                      saved.book.openable = true;
                      saved.book.savedAt = (/* @__PURE__ */ new Date()).toISOString();
                      if (store.writeShelf) {
                        var list = store.readShelf(accountId) || [];
                        store.writeShelf(accountId, list.map(function(item) {
                          return item && item.id === saved.book.id ? saved.book : item;
                        }));
                      }
                    }
                    var done = jobFor(source, {
                      attempts,
                      calls,
                      generation: gate,
                      job: {
                        stage: "read",
                        status: "complete",
                        paid: true,
                        started: true,
                        recoverable: false,
                        budgetUsd,
                        calls,
                        spend,
                        stages: markStages("read", true),
                        reason: "saved",
                        message: "The illustrated book is ready.",
                        layouts: directed.pages.map(function(page) {
                          return page.layout;
                        }),
                        reader: saved.reader || "",
                        checkpoint: { story: checkpoint.story, pictures: Object.keys(pictures), spend }
                      }
                    });
                    attachAuto(done, true);
                    return Promise.resolve(jobs && jobs.write ? jobs.write(accountId, key, snapshot(done)) : null).then(function() {
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
                        references: Object.keys(references).map(function(id) {
                          return { characterId: id, file: references[id].file };
                        }),
                        calls,
                        spend
                      };
                    });
                  });
                });
              });
            }).catch(function(error) {
              var code = error && error.code || "story";
              var stage = checkpoint.story ? "pictures" : "story";
              if (code === "budget" || code === "call-cap") stage = "pictures";
              if (code === "duplicate" || code === "stale-claim") {
                return stop(stage, "already-running", "This step belongs to another worker. It was not started again.");
              }
              if (code === "uncertain") {
                return stop(stage, "uncertain", "This step did not finish. It was not started again.");
              }
              var message = code === "budget" ? "This book would cost more than its budget. Nothing more was started, and the book was not saved." : code === "call-cap" ? "This book would take more picture checks than Wondii allows. The book was not saved." : code === "model-timeout" ? "The story writer took too long, so this step was saved and no further call was made." : code === "picture-timeout" ? "This picture call took too long, so it was saved as uncertain and no further call was made." : "The story stopped before it was finished. Nothing was saved.";
              return stop(stage, code, message);
            });
          });
        });
      });
    }
    module.exports = { run };
  }
});
