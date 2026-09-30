/* School data access. Supabase is authoritative for a signed-in organisation.
   Browser storage is a cache and a one-time import source. */
(function (global) {
  "use strict";

  var Domain = global.WondiiSchoolDomain;
  var sb = null;
  var userId = "";
  var orgId = "";
  var hydrated = false;
  var pulling = false;
  var syncState = "saved";
  var PENDING_KEY = "wondii-school-pending";
  var ADV_PENDING = "wondii-school-pending-adventures";
  var SES_PENDING = "wondii-school-pending-sessions";
  var openKinds = { classes: false, adventures: false, sessions: false };

  function cfg() {
    return global.SCORE_SYNC || {};
  }

  function client() {
    var c = cfg();
    if (!c.supabaseUrl || !c.supabaseAnonKey || !global.supabase || !global.supabase.createClient) return null;
    if (!sb) sb = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
    return sb;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function orgNow() {
    var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
    return org && org.organisationId ? org.organisationId : "";
  }

  function canTeach(role) {
    return role === "owner" || role === "school_admin" || role === "teacher";
  }

  function roleNow() {
    var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
    return org && org.role ? org.role : "";
  }

  function bookFromRows(classes, pupils) {
    var byClass = {};
    classes.forEach(function (room) {
      byClass[room.id] = {
        id: room.id,
        name: room.name,
        yearLabel: room.year_label || "",
        pupils: []
      };
    });
    pupils.forEach(function (pupil) {
      var room = byClass[pupil.class_id];
      if (!room) return;
      var look = pupil.look || {};
      room.pupils.push({
        id: pupil.id,
        firstName: pupil.display_name,
        presentation: pupil.presentation || "",
        hair: look.hair || "brown",
        length: look.length || "short",
        eyes: look.eyes || "brown",
        wave: !!look.wave,
        seat: pupil.seat || ""
      });
    });
    return { classes: classes.map(function (room) { return byClass[room.id]; }) };
  }

  function notify() {
    try { document.dispatchEvent(new CustomEvent("wondii-school-data")); } catch (e) {}
    if (global.WondiiHome && global.WondiiHome.paint && global.WondiiOrg) {
      try { global.WondiiHome.paint(global.WondiiOrg.get()); } catch (e2) {}
    }
    if (global.WondiiClass && global.WondiiClass.reload) {
      try { global.WondiiClass.reload(); } catch (e3) {}
    }
  }

  function sessionView(row, teams, participants, events, local, org) {
    var Eng = global.WondiiSessionEngine;
    var snap = row.snapshot || {};
    if (Eng && snap.kind === "play") {
      if (local && local.engine && local.engine.sessionId) {
        var merged = Eng.ingestRemote(local.engine, { participants: participants, events: events });
        if (merged.ok) return Eng.toPresenter(merged.state);
      }
      var hydrated = Eng.rehydrate({ session: row, teams: teams, participants: participants, events: events });
      if (hydrated.ok) return Eng.toPresenter(hydrated.state);
    }
    snap.id = row.id;
    snap.code = row.code;
    snap.mode = row.mode;
    snap.status = row.status;
    snap.phase = row.phase;
    snap.slide = row.slide_index;
    snap.classId = row.class_id || "";
    snap.journeyId = row.adventure_id || snap.journeyId || "";
    snap.demo = row.demo;
    snap.organisationId = org;
    return snap;
  }

  function pull(done) {
    var db = client();
    var org = orgNow();
    if (!db || !org || !userId || pulling) {
      if (done) done();
      return;
    }
    pulling = true;
    orgId = org;
    Promise.all([
      db.from("school_classes").select("id, name, year_label").eq("organisation_id", org).order("created_at"),
      db.from("school_pupils").select("id, class_id, display_name, presentation, look, seat").eq("organisation_id", org),
      db.from("school_adventures").select("id, class_id, title, subject, year_label, objectives, source_note, config, created_at, updated_at").eq("organisation_id", org),
      db.from("school_sessions").select("id, class_id, adventure_id, code, mode, status, phase, slide_index, selected_pupil_id, reward_total, demo, snapshot, started_at, completed_at, created_at").eq("organisation_id", org),
      db.from("school_teams").select("id, session_id, name, sort_order, points").eq("organisation_id", org),
      db.from("school_participants").select("id, session_id, pupil_id, team_id, display_name, kind").eq("organisation_id", org),
      db.from("school_events").select("id, session_id, scope, team_id, pupil_id, participant_id, mechanic, result, points, demo, created_at").eq("organisation_id", org)
    ]).then(function (parts) {
      pulling = false;
      if (parts.slice(0, 4).some(function (part) { return part.error; })) {
        if (done) done();
        return;
      }
      var remoteClasses = parts[0].data || [];
      var localBook = readJson("wondii-school-classes", { classes: [] });
      var localAdventures = readJson("wondii-learning-adventures", []);
      var localSessions = readJson("wondii-class-sessions", []);
      if (!Array.isArray(localAdventures)) localAdventures = [];
      if (!Array.isArray(localSessions)) localSessions = [];
      var pending = readJson(PENDING_KEY, null);
      if (!remoteClasses.length && localBook.classes && localBook.classes.length && canTeach(roleNow())) {
        var adopted = Domain.adopt(localBook, localAdventures, localSessions);
        writeJson("wondii-school-classes", adopted.book);
        writeJson("wondii-learning-adventures", adopted.adventures);
        writeJson("wondii-class-sessions", adopted.sessions);
        syncClasses(adopted.book);
        syncAdventures(adopted.adventures);
        syncSessions(adopted.sessions);
      } else if (remoteClasses.length) {
        var remoteBook = bookFromRows(remoteClasses, parts[1].data || []);
        var kept = Domain.mergeBooks(remoteBook, pending);
        writeJson("wondii-school-classes", kept);
        if (pending && pending.classes && pending.classes.length) syncClasses(kept);
        var pendingAdventures = readJson(ADV_PENDING, []);
        if (!Array.isArray(pendingAdventures)) pendingAdventures = [];
        var adventures = (parts[2].data || []).map(function (row) {
          var config = row.config || {};
          config.id = row.id;
          config.classId = row.class_id || "";
          config.title = config.title || row.title;
          config.organisationId = org;
          return config;
        });
        if (!pendingAdventures.length && !adventures.length && localAdventures.length) pendingAdventures = localAdventures;
        var mergedAdventures = Domain.mergeLists(adventures, pendingAdventures);
        writeJson("wondii-learning-adventures", mergedAdventures);
        if (pendingAdventures.length) syncAdventures(mergedAdventures);
        var pendingSessions = readJson(SES_PENDING, []);
        if (!Array.isArray(pendingSessions)) pendingSessions = [];
        var teamRows = parts[4] && !parts[4].error ? parts[4].data || [] : [];
        var peopleRows = parts[5] && !parts[5].error ? parts[5].data || [] : [];
        var eventRows = parts[6] && !parts[6].error ? parts[6].data || [] : [];
        function rowsFor(list, sessionId) {
          return list.filter(function (item) { return item.session_id === sessionId; });
        }
        var localById = {};
        localSessions.forEach(function (item) { if (item && item.id) localById[item.id] = item; });
        var sessions = (parts[3].data || []).map(function (row) {
          return sessionView(row, rowsFor(teamRows, row.id), rowsFor(peopleRows, row.id), rowsFor(eventRows, row.id), localById[row.id], org);
        });
        if (!pendingSessions.length && !sessions.length && localSessions.length) pendingSessions = localSessions;
        var mergedSessions = Domain.mergeLists(sessions, pendingSessions);
        writeJson("wondii-class-sessions", mergedSessions);
        if (pendingSessions.length) syncSessions(mergedSessions);
      }
      hydrated = true;
      notify();
      if (done) done();
    }).catch(function () {
      pulling = false;
      if (done) done();
    });
  }

  function paintSync() {
    var note = document.getElementById("wondiiSyncNote");
    if (syncState !== "failed") {
      if (note) note.remove();
      return;
    }
    if (!note) {
      note = document.createElement("p");
      note.id = "wondiiSyncNote";
      note.setAttribute("role", "status");
      note.style.cssText = "margin:0;padding:10px 16px;background:#fff4e5;color:#141b4d;font:700 15px Nunito,sans-serif;";
      document.body.insertBefore(note, document.body.firstChild);
    }
    note.textContent = "This school work is still on this device. Wondii could not save it yet.";
    if (!note.querySelector("button")) {
      var retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry save";
      retry.style.cssText = "margin-left:12px;min-height:36px;padding:6px 12px;border:0;border-radius:999px;background:#141b4d;color:#fff;font:700 14px Nunito,sans-serif;";
      retry.addEventListener("click", function () { retrySaves(); });
      note.appendChild(retry);
    }
  }

  function retrySaves() {
    var jobs = [];
    var classes = readJson(PENDING_KEY, null);
    var adventures = readJson(ADV_PENDING, []);
    var sessions = readJson(SES_PENDING, []);
    if (classes && classes.classes && classes.classes.length) jobs.push(syncClasses(classes));
    if (Array.isArray(adventures) && adventures.length) jobs.push(syncAdventures(adventures));
    if (Array.isArray(sessions) && sessions.length) jobs.push(syncSessions(sessions));
    if (!jobs.length) return Promise.resolve(syncState !== "failed");
    return Promise.all(jobs).then(function () {
      return syncState !== "failed";
    });
  }

  function refreshSync() {
    syncState = openKinds.classes || openKinds.adventures || openKinds.sessions ? "failed" : "saved";
    paintSync();
  }

  function hold(kind, key, value) {
    openKinds[kind] = true;
    syncState = "saving";
    writeJson(key, value);
    paintSync();
  }

  function finish(kind, key, ok) {
    openKinds[kind] = !ok;
    if (ok) {
      try { localStorage.removeItem(key); } catch (e) {}
    }
    if (syncState === "saving" || syncState === "failed" || syncState === "saved") refreshSync();
  }

  function syncClasses(book) {
    var db = client();
    var org = orgNow();
    if (!book || !book.classes) return Promise.resolve();
    if (!db || !org || !userId || !canTeach(roleNow())) {
      if (org && canTeach(roleNow())) {
        hold("classes", PENDING_KEY, { classes: book.classes || [] });
        finish("classes", PENDING_KEY, false);
      }
      return Promise.resolve();
    }
    book.classes.forEach(function (room) {
      if (!Domain.isUuid(room.id)) room.id = Domain.uuid();
      (room.pupils || []).forEach(function (pupil) {
        if (!Domain.isUuid(pupil.id)) pupil.id = Domain.uuid();
      });
    });
    writeJson("wondii-school-classes", book);
    var classRows = [];
    var pupilRows = [];
    book.classes.forEach(function (room) {
      if (!Domain.isUuid(room.id)) return;
      classRows.push(Domain.classRow(org, userId, room));
      (room.pupils || []).forEach(function (pupil) {
        if (!Domain.isUuid(pupil.id) || !Domain.firstName(pupil.firstName)) return;
        pupilRows.push(Domain.pupilRow(org, room, pupil));
      });
    });
    if (!classRows.length) return Promise.resolve(true);
    hold("classes", PENDING_KEY, { classes: book.classes || [] });
    return track(db.from("school_classes").upsert(classRows, { onConflict: "id" }).then(function (saved) {
      if (saved.error) {
        finish("classes", PENDING_KEY, false);
        return false;
      }
      var pupils = pupilRows.length
        ? db.from("school_pupils").upsert(pupilRows, { onConflict: "id" })
        : Promise.resolve({ error: null });
      return pupils.then(function (pupilSaved) {
        if (pupilSaved.error) {
          finish("classes", PENDING_KEY, false);
          return false;
        }
        finish("classes", PENDING_KEY, true);
        if (hydrated) {
          book.classes.forEach(function (room) {
            var keep = (room.pupils || []).map(function (pupil) { return pupil.id; });
            db.from("school_pupils").select("id").eq("class_id", room.id).then(function (existing) {
              if (existing.error || !existing.data) return;
              existing.data.forEach(function (row) {
                if (keep.indexOf(row.id) === -1) db.from("school_pupils").delete().eq("id", row.id);
              });
            });
          });
        }
        return true;
      });
    }).catch(function () {
      finish("classes", PENDING_KEY, false);
      return false;
    }));
  }

  function ensureUser() {
    var db = client();
    if (!db) return Promise.resolve(false);
    if (userId) return Promise.resolve(true);
    return db.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      userId = session && session.user ? session.user.id : "";
      return !!userId;
    }).catch(function () { return false; });
  }

  function syncAdventures(list) {
    if (!userId && client()) {
      return ensureUser().then(function (ready) {
        return ready ? syncAdventures(list) : Promise.resolve(false);
      });
    }
    var db = client();
    var org = orgNow();
    if (!Array.isArray(list)) return Promise.resolve(false);
    if (!db || !org || !userId || !canTeach(roleNow())) {
      if (org && canTeach(roleNow()) && list.length) {
        hold("adventures", ADV_PENDING, list.filter(function (item) { return item && Domain.isUuid(item.id); }));
        finish("adventures", ADV_PENDING, false);
      }
      return Promise.resolve(false);
    }
    list.forEach(function (item) {
      if (item && !Domain.isUuid(item.id)) item.id = Domain.uuid();
    });
    writeJson("wondii-learning-adventures", list);
    var rows = list.filter(function (item) { return Domain.isUuid(item.id); }).map(function (item) {
      var map = item.learningMap || {};
      return {
        id: item.id,
        organisation_id: org,
        created_by: userId,
        class_id: Domain.isUuid(item.classId) ? item.classId : null,
        title: String(item.title || map.topic || "Learning adventure").slice(0, 120),
        subject: String(map.subject || "").slice(0, 80),
        year_label: String(map.yearGroup || "").slice(0, 40),
        objectives: map.learningObjectives || [],
        source_note: String((item.source && item.source.text) || "").slice(0, 4000),
        config: item
      };
    });
    if (!rows.length) return Promise.resolve(true);
    var kept = list.filter(function (item) { return Domain.isUuid(item.id); });
    hold("adventures", ADV_PENDING, kept);
    return track(db.from("school_adventures").upsert(rows, { onConflict: "id" }).then(function (saved) {
      var ok = !saved.error;
      finish("adventures", ADV_PENDING, ok);
      return ok;
    }).catch(function () {
      finish("adventures", ADV_PENDING, false);
      return false;
    }));
  }

  function syncSessions(list) {
    if (!userId && client()) {
      return track(ensureUser().then(function (ready) {
        return ready ? syncSessions(list) : false;
      }));
    }
    var db = client();
    var org = orgNow();
    if (!Array.isArray(list)) return track(Promise.resolve(false));
    if (!db || !org || !userId || !canTeach(roleNow())) {
      if (org && canTeach(roleNow()) && list.length) {
        hold("sessions", SES_PENDING, list);
        finish("sessions", SES_PENDING, false);
      }
      return track(Promise.resolve(false));
    }
    var Eng = global.WondiiSessionEngine;
    if (!Eng) return track(Promise.resolve(false));
    list.forEach(function (session) {
      if (session && session.engine && !Domain.isUuid(session.engine.sessionId)) session.engine.sessionId = Domain.uuid();
      if (session && !Domain.isUuid(session.id)) session.id = session.engine && session.engine.sessionId ? session.engine.sessionId : Domain.uuid();
    });
    list.forEach(function (session) {
      if ((!session.engine || !session.engine.snapshot) && Eng) {
        var adopted = Eng.adoptPresenter(session);
        if (adopted.ok) session.engine = adopted.state;
      }
    });
    if (Domain.separateMemberships) Domain.separateMemberships(list);
    writeJson("wondii-class-sessions", list);
    var rows = [];
    var teamRows = [];
    var peopleRows = [];
    var eventRows = [];
    list.forEach(function (session) {
      var state = session && session.engine;
      if ((!state || !state.snapshot) && Eng && session) {
        var adopted = Eng.adoptPresenter(session);
        if (adopted.ok) state = adopted.state;
      }
      if (!state || !Domain.isUuid(state.sessionId) || !state.sessionCode) return;
      var packed = Eng.toRows(state);
      packed.session.organisation_id = org;
      packed.session.created_by = userId;
      packed.session.code = String(packed.session.code || "").slice(0, 12);
      if (!Domain.isUuid(packed.session.class_id)) packed.session.class_id = null;
      rows.push(packed.session);
      packed.teams.forEach(function (team) {
        team.organisation_id = org;
        teamRows.push(team);
      });
      packed.participants.forEach(function (person) {
        person.organisation_id = org;
        peopleRows.push(person);
      });
      packed.events.forEach(function (event) {
        event.organisation_id = org;
        if (!Domain.isUuid(event.class_id)) event.class_id = null;
        eventRows.push(event);
      });
    });
    if (!rows.length) return track(Promise.resolve(true));
    var keptSessions = list.filter(function (session) { return Domain.isUuid(session.id) && session.code; });
    hold("sessions", SES_PENDING, keptSessions);
    return track(db.from("school_sessions").upsert(rows, { onConflict: "id" }).then(function (saved) {
      if (saved.error) {
        finish("sessions", SES_PENDING, false);
        return false;
      }
      var teams = teamRows.length
        ? db.from("school_teams").upsert(teamRows, { onConflict: "id" })
        : Promise.resolve({ error: null });
      return teams.then(function (teamSaved) {
        if (teamSaved.error) {
          finish("sessions", SES_PENDING, false);
          return false;
        }
        var people = peopleRows.length
          ? db.from("school_participants").upsert(peopleRows, { onConflict: "id" })
          : Promise.resolve({ error: null });
        return people.then(function (peopleSaved) {
          if (peopleSaved.error) {
            finish("sessions", SES_PENDING, false);
            return false;
          }
          finish("sessions", SES_PENDING, true);
          if (eventRows.length) db.from("school_events").upsert(eventRows, { onConflict: "id" });
          return true;
        });
      });
    }).catch(function () {
      finish("sessions", SES_PENDING, false);
      return false;
    }));
  }

  var inflight = Promise.resolve(true);

  function track(promise) {
    inflight = Promise.resolve(promise).then(function (ok) {
      return ok !== false && syncState !== "failed";
    }, function () {
      return false;
    });
    return inflight;
  }

  var watchTimer = null;

  function stopWatch() {
    if (watchTimer) clearInterval(watchTimer);
    watchTimer = null;
  }

  function watchSession(sessionId, onData) {
    stopWatch();
    var db = client();
    if (!db || !sessionId || !onData) return;
    function tick() {
      var liveDb = client();
      if (!liveDb) return;
      Promise.all([
        liveDb.from("school_participants").select("id, pupil_id, team_id, display_name, kind").eq("session_id", sessionId),
        liveDb.from("school_events").select("id, scope, team_id, pupil_id, participant_id, mechanic, result, points, demo, created_at").eq("session_id", sessionId)
      ]).then(function (parts) {
        if (parts[0].error || parts[1].error) return;
        onData({ participants: parts[0].data || [], events: parts[1].data || [] });
      }).catch(function () {});
    }
    tick();
    watchTimer = setInterval(tick, 4000);
  }

  function bind() {
    var db = client();
    if (!db) return;
    db.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      userId = session && session.user ? session.user.id : "";
      if (userId && orgNow()) pull();
    });
  }

  document.addEventListener("wondii-org", function () {
    if (orgNow()) bind();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  global.addEventListener("beforeunload", function (event) {
    if (syncState === "failed") {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  global.WondiiSchoolData = {
    pull: pull,
    syncClasses: syncClasses,
    syncAdventures: syncAdventures,
    syncSessions: syncSessions,
    watchSession: watchSession,
    stopWatch: stopWatch,
    whenSaved: function () { return inflight; },
    retry: retrySaves,
    state: function () { return syncState; }
  };
})(window);
