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
      db.from("school_sessions").select("id, class_id, adventure_id, code, mode, status, phase, slide_index, selected_pupil_id, reward_total, demo, snapshot, started_at, completed_at, created_at").eq("organisation_id", org)
    ]).then(function (parts) {
      pulling = false;
      if (parts.some(function (part) { return part.error; })) {
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
        var sessions = (parts[3].data || []).map(function (row) {
          var snap = row.snapshot || {};
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
    if (!classRows.length) return Promise.resolve();
    hold("classes", PENDING_KEY, { classes: book.classes || [] });
    return db.from("school_classes").upsert(classRows, { onConflict: "id" }).then(function (saved) {
      if (saved.error) {
        finish("classes", PENDING_KEY, false);
        return;
      }
      var pupils = pupilRows.length
        ? db.from("school_pupils").upsert(pupilRows, { onConflict: "id" })
        : Promise.resolve({ error: null });
      return pupils.then(function (pupilSaved) {
        if (pupilSaved.error) {
          finish("classes", PENDING_KEY, false);
          return;
        }
        finish("classes", PENDING_KEY, true);
        if (!hydrated) return;
        book.classes.forEach(function (room) {
          var keep = (room.pupils || []).map(function (pupil) { return pupil.id; });
          db.from("school_pupils").select("id").eq("class_id", room.id).then(function (existing) {
            if (existing.error || !existing.data) return;
            existing.data.forEach(function (row) {
              if (keep.indexOf(row.id) === -1) db.from("school_pupils").delete().eq("id", row.id);
            });
          });
        });
      });
    }).catch(function () {
      finish("classes", PENDING_KEY, false);
    });
  }

  function syncAdventures(list) {
    var db = client();
    var org = orgNow();
    if (!db || !org || !userId || !canTeach(roleNow()) || !Array.isArray(list)) return;
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
    if (!rows.length) return;
    var kept = list.filter(function (item) { return Domain.isUuid(item.id); });
    hold("adventures", ADV_PENDING, kept);
    db.from("school_adventures").upsert(rows, { onConflict: "id" }).then(function (saved) {
      finish("adventures", ADV_PENDING, !saved.error);
    }).catch(function () {
      finish("adventures", ADV_PENDING, false);
    });
  }

  function syncSessions(list) {
    var db = client();
    var org = orgNow();
    if (!db || !org || !userId || !canTeach(roleNow()) || !Array.isArray(list)) return;
    list.forEach(function (session) {
      if (session && !Domain.isUuid(session.id)) session.id = Domain.uuid();
    });
    writeJson("wondii-class-sessions", list);
    var rows = [];
    list.forEach(function (session) {
      if (!Domain.isUuid(session.id) || !session.code) return;
      rows.push({
        id: session.id,
        organisation_id: org,
        created_by: userId,
        class_id: Domain.isUuid(session.classId) ? session.classId : null,
        adventure_id: Domain.isUuid(session.journeyId) ? session.journeyId : null,
        code: String(session.code).slice(0, 12),
        mode: session.mode || "board",
        status: session.status || "playing",
        phase: session.phase || "waiting",
        slide_index: Number(session.slide) || 0,
        selected_pupil_id: Domain.isUuid(session.selectedPupilId) ? session.selectedPupilId : null,
        reward_total: session.board && Number(session.board.reward) || 0,
        demo: !!session.demo,
        snapshot: session,
        started_at: session.startedAt || null,
        completed_at: session.endedAt || null
      });
    });
    if (!rows.length) return;
    var keptSessions = list.filter(function (session) { return Domain.isUuid(session.id) && session.code; });
    hold("sessions", SES_PENDING, keptSessions);
    db.from("school_sessions").upsert(rows, { onConflict: "id" }).then(function (saved) {
      if (saved.error) {
        finish("sessions", SES_PENDING, false);
        return;
      }
      finish("sessions", SES_PENDING, true);
      list.forEach(function (session) {
        if (!Domain.isUuid(session.id) || session.demo) return;
        var pupilIds = {};
        var book = readJson("wondii-school-classes", { classes: [] });
        (book.classes || []).forEach(function (room) {
          (room.pupils || []).forEach(function (pupil) { pupilIds[pupil.id] = 1; });
        });
        (session.responses || []).forEach(function (response) {
          if (response.persistedEvent) return;
          var event = Domain.eventForResponse(session, response, pupilIds);
          if (!event) return;
          response.persistedEvent = true;
          event.organisation_id = org;
          event.session_id = session.id;
          event.class_id = Domain.isUuid(session.classId) ? session.classId : null;
          event.adventure_id = Domain.isUuid(session.journeyId) ? session.journeyId : null;
          db.from("school_events").insert(event).then(function (inserted) {
            if (inserted.error) response.persistedEvent = false;
          });
        });
      });
    });
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
    if (syncState === "failed" || syncState === "saving") {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  global.WondiiSchoolData = {
    pull: pull,
    syncClasses: syncClasses,
    syncAdventures: syncAdventures,
    syncSessions: syncSessions,
    state: function () { return syncState; }
  };
})(window);
