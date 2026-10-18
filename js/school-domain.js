/* Pure school-domain helpers. No network. Used by the browser store and the isolation tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiSchoolDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isUuid(value) {
    return UUID.test(String(value || ""));
  }

  function uuid() {
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoObj && cryptoObj.randomUUID) return cryptoObj.randomUUID();
    var bytes = [];
    for (var i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = bytes.map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function assign(map, id) {
    var current = String(id || "");
    if (isUuid(current)) {
      map[current] = current;
      return current;
    }
    if (current && map[current]) return map[current];
    var next = uuid();
    if (current) map[current] = next;
    return next;
  }

  function firstName(value) {
    return String(value || "").trim().split(/\s+/)[0].slice(0, 40);
  }

  function lookOf(pupil) {
    var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
    var length = pupil.length === "long" ? "long" : "short";
    var eyes = /^(brown|blue|green|hazel)$/.test(pupil.eyes) ? pupil.eyes : "brown";
    var look = { hair: hair, length: length, eyes: eyes };
    if (pupil.wave) look.wave = true;
    return look;
  }

  function presentationOf(value) {
    return value === "girl" || value === "boy" ? value : "";
  }

  /* Rewrite prototype ids to uuids. One map is shared so a class id stays the same across the book and its sessions. */
  function adopt(book, adventures, sessions) {
    var map = {};
    var classes = (book && book.classes) || [];
    classes.forEach(function (room) {
      room.id = assign(map, room.id);
      (room.pupils || []).forEach(function (pupil) {
        pupil.id = assign(map, pupil.id);
        pupil.firstName = firstName(pupil.firstName || pupil.display_name);
        pupil.presentation = presentationOf(pupil.presentation);
      });
    });
    (adventures || []).forEach(function (item) {
      item.id = assign(map, item.id);
      if (item.classId) item.classId = map[item.classId] || (isUuid(item.classId) ? item.classId : null);
    });
    (sessions || []).forEach(function (session) {
      session.id = assign(map, session.id);
      if (session.classId) session.classId = map[session.classId] || (isUuid(session.classId) ? session.classId : null);
      if (session.journeyId) session.journeyId = map[session.journeyId] || session.journeyId;
    });
    return { book: book || { classes: [] }, adventures: adventures || [], sessions: sessions || [], map: map };
  }

  function pupilRow(orgId, room, pupil) {
    return {
      id: pupil.id,
      organisation_id: orgId,
      class_id: room.id,
      display_name: firstName(pupil.firstName),
      presentation: presentationOf(pupil.presentation),
      look: lookOf(pupil),
      seat: String(pupil.seat || "").slice(0, 40)
    };
  }

  function classRow(orgId, userId, room) {
    return {
      id: room.id,
      organisation_id: orgId,
      name: String(room.name || "Class").trim().slice(0, 80),
      year_label: String(room.yearLabel || room.yearGroup || "").slice(0, 40),
      created_by: userId
    };
  }

  /* An individual event only when the participant id is a real pupil. Demo rows never become pupil results. */
  function eventForResponse(session, response, pupilIds) {
    if (!response || response.demo) return null;
    var pupilId = response.participantId && pupilIds[response.participantId] ? response.participantId : null;
    if (!pupilId) {
      return {
        scope: "class",
        pupil_id: null,
        team_id: null,
        mechanic: "question",
        result: response.isCorrect ? "correct" : "incorrect",
        points: 0,
        demo: false
      };
    }
    return {
      scope: "pupil",
      pupil_id: pupilId,
      team_id: null,
      mechanic: "question",
      result: response.isCorrect ? "correct" : "incorrect",
      points: 0,
      demo: false
    };
  }

  function sessionsStayDistinct(left, right) {
    return !!(left && right && left.id && right.id && left.id !== right.id);
  }

  var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function classroomCode() {
    var chars = "";
    var i;
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    var bytes = new Uint8Array(8);
    if (cryptoObj && cryptoObj.getRandomValues) cryptoObj.getRandomValues(bytes);
    else for (i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < 8; i++) chars += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return chars.slice(0, 4) + "-" + chars.slice(4);
  }

  function copyRoom(room) {
    return {
      id: room.id,
      name: room.name,
      yearLabel: room.yearLabel || "",
      pupils: (room.pupils || []).map(function (pupil) {
        return {
          id: pupil.id,
          firstName: pupil.firstName,
          presentation: pupil.presentation || "",
          hair: pupil.hair,
          length: pupil.length,
          eyes: pupil.eyes,
          wave: !!pupil.wave,
          seat: pupil.seat || ""
        };
      })
    };
  }

  /* Remote rows stay. A class or pupil that never reached the database is kept. */
  function mergeBooks(remote, pending) {
    var book = { classes: ((remote && remote.classes) || []).map(copyRoom) };
    ((pending && pending.classes) || []).forEach(function (room) {
      var found = null;
      book.classes.forEach(function (item) { if (item.id === room.id) found = item; });
      if (!found) {
        book.classes.push(copyRoom(room));
        return;
      }
      var seen = {};
      found.pupils.forEach(function (pupil) { seen[pupil.id] = 1; });
      (room.pupils || []).forEach(function (pupil) {
        if (!seen[pupil.id]) found.pupils.push(copyRoom({ pupils: [pupil] }).pupils[0]);
      });
    });
    return book;
  }

  function separateMemberships(sessions) {
    var seenTeams = {};
    var seenPeople = {};
    (sessions || []).forEach(function (session) {
      var state = session && session.engine;
      if (!state) return;
      (state.teams || []).forEach(function (team) {
        var previous = team.id;
        if (!previous || !isUuid(previous) || seenTeams[previous]) {
          var nextTeam = uuid();
          (state.participants || []).forEach(function (person) {
            if (person.teamId === previous) person.teamId = nextTeam;
          });
          (state.events || []).forEach(function (event) {
            if (event.teamId === previous) event.teamId = nextTeam;
          });
          team.id = nextTeam;
          previous = nextTeam;
        }
        seenTeams[previous] = 1;
      });
      (state.participants || []).forEach(function (person) {
        var previousId = person.id;
        if (!previousId || !isUuid(previousId) || seenPeople[previousId]) {
          var nextPerson = uuid();
          (state.events || []).forEach(function (event) {
            if (event.participantId === previousId) event.participantId = nextPerson;
          });
          (state.responses || []).forEach(function (row) {
            if (row.participantId === previousId) row.participantId = nextPerson;
          });
          if (state.selectedParticipantId === previousId) state.selectedParticipantId = nextPerson;
          person.id = nextPerson;
          previousId = nextPerson;
        }
        seenPeople[previousId] = 1;
      });
    });
    return sessions;
  }

  function mergeLists(remote, pending) {
    var out = (remote || []).slice();
    var seen = {};
    out.forEach(function (item) { if (item && item.id) seen[item.id] = 1; });
    (pending || []).forEach(function (item) {
      if (item && item.id && !seen[item.id]) out.push(item);
    });
    return out;
  }

  return {
    isUuid: isUuid,
    uuid: uuid,
    adopt: adopt,
    firstName: firstName,
    lookOf: lookOf,
    pupilRow: pupilRow,
    classRow: classRow,
    eventForResponse: eventForResponse,
    sessionsStayDistinct: sessionsStayDistinct,
    classroomCode: classroomCode,
    mergeBooks: mergeBooks,
    mergeLists: mergeLists,
    separateMemberships: separateMemberships
  };
});
