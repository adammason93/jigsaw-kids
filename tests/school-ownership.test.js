"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Domain = require("../js/school-domain.js");

var schoolA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
var schoolB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
var teacher = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

var bookA = {
  classes: [{
    id: "cls_local_a",
    name: "Year 3A",
    pupils: [{ id: "pup_sofia", firstName: "Sofia", presentation: "girl", hair: "blonde", length: "long", eyes: "blue" }]
  }]
};
var bookB = {
  classes: [{
    id: "cls_local_b",
    name: "Year 5",
    pupils: [{ id: "pup_jack", firstName: "Jack", presentation: "boy", hair: "brown", length: "short", eyes: "brown" }]
  }]
};

var adoptedA = Domain.adopt(bookA, [], []);
var adoptedB = Domain.adopt(bookB, [], []);
var rowA = Domain.pupilRow(schoolA, adoptedA.book.classes[0], adoptedA.book.classes[0].pupils[0]);
var rowB = Domain.pupilRow(schoolB, adoptedB.book.classes[0], adoptedB.book.classes[0].pupils[0]);

assert.notStrictEqual(rowA.organisation_id, rowB.organisation_id);
assert.notStrictEqual(rowA.class_id, rowB.class_id);
assert.notStrictEqual(rowA.id, rowB.id);
assert.strictEqual(rowA.organisation_id, schoolA);
assert.strictEqual(rowB.organisation_id, schoolB);
assert.strictEqual(rowA.display_name, "Sofia");
assert.ok(Domain.isUuid(rowA.id));
assert.ok(Domain.isUuid(rowA.class_id));

var classA = Domain.classRow(schoolA, teacher, adoptedA.book.classes[0]);
var classB = Domain.classRow(schoolB, teacher, adoptedB.book.classes[0]);
assert.notStrictEqual(classA.organisation_id, classB.organisation_id);
assert.strictEqual(classA.organisation_id, rowA.organisation_id);

var demo = Domain.eventForResponse({ id: "s" }, { demo: true, participantId: rowA.id, isCorrect: true }, {});
assert.strictEqual(demo, null);

var unknown = Domain.eventForResponse({ id: "s" }, { participantId: "someone", isCorrect: true, demo: false }, {});
assert.strictEqual(unknown.scope, "class");
assert.strictEqual(unknown.pupil_id, null);

var known = Domain.eventForResponse({ id: "s" }, { participantId: rowA.id, isCorrect: true, demo: false }, { [rowA.id]: 1 });
assert.strictEqual(known.scope, "pupil");
assert.strictEqual(known.pupil_id, rowA.id);

var monday = { id: Domain.uuid(), adventureId: "volcano" };
var wednesday = { id: Domain.uuid(), adventureId: "volcano" };
assert.strictEqual(Domain.sessionsStayDistinct(monday, wednesday), true);
assert.strictEqual(monday.adventureId, wednesday.adventureId);

var sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20260930120000_school_domain.sql"), "utf8");
["school_classes", "school_pupils", "school_adventures", "school_sessions", "school_events"].forEach(function (table) {
  assert.ok(sql.indexOf("alter table public." + table + " enable row level security") !== -1, table);
  assert.ok(sql.indexOf("private.is_org_member(organisation_id)") !== -1);
});
assert.ok(sql.indexOf("scope = 'pupil' and pupil_id is not null") !== -1);
assert.ok(sql.indexOf("private.can_teach") !== -1);
assert.strictEqual(sql.indexOf("alter table public.score_bundles"), -1);
assert.strictEqual(sql.indexOf("shared_offer"), -1);

var kept = Domain.mergeBooks(
  { classes: [{ id: adoptedA.book.classes[0].id, name: "Year 3A", pupils: [] }] },
  { classes: [
    { id: adoptedA.book.classes[0].id, name: "Year 3A", pupils: [{ id: rowA.id, firstName: "Sofia" }] },
    { id: "pending-class", name: "Wondii phase15 smoke", pupils: [{ id: "pending-pupil", firstName: "Nia" }] }
  ] }
);
assert.strictEqual(kept.classes.length, 2);
assert.strictEqual(kept.classes[0].pupils.length, 1);
assert.strictEqual(kept.classes[0].pupils[0].firstName, "Sofia");
assert.strictEqual(kept.classes[1].id, "pending-class");

var remoteSession = { id: monday.id, adventureId: "volcano" };
var pendingSession = { id: wednesday.id, adventureId: "volcano" };
var mergedSessions = Domain.mergeLists([remoteSession], [pendingSession, remoteSession]);
assert.strictEqual(mergedSessions.length, 2);
assert.strictEqual(Domain.sessionsStayDistinct(mergedSessions[0], mergedSessions[1]), true);

var pupil = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
var first = { engine: { teams: [], participants: [{ id: pupil, pupilId: pupil, displayName: "Amelia" }], events: [], responses: [], selectedParticipantId: pupil } };
var second = { engine: { teams: [], participants: [{ id: pupil, pupilId: pupil, displayName: "Amelia" }], events: [{ participantId: pupil }], responses: [], selectedParticipantId: pupil } };
Domain.separateMemberships([first, second]);
assert.notStrictEqual(first.engine.participants[0].id, second.engine.participants[0].id);
assert.strictEqual(first.engine.participants[0].pupilId, pupil);
assert.strictEqual(second.engine.participants[0].pupilId, pupil);
assert.strictEqual(second.engine.selectedParticipantId, second.engine.participants[0].id);
assert.strictEqual(second.engine.events[0].participantId, second.engine.participants[0].id);
var packedIds = {};
[first, second].forEach(function (session) {
  session.engine.participants.forEach(function (person) {
    assert.strictEqual(packedIds[person.id], undefined);
    packedIds[person.id] = 1;
  });
});

var sampleCode = Domain.classroomCode();
assert.ok(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(sampleCode), sampleCode);
assert.strictEqual(/[01IO]/.test(sampleCode), false);

var joinSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20260930140000_school_join_guard.sql"), "utf8");
assert.ok(joinSql.indexOf("private.school_join_lookup") !== -1);
assert.ok(joinSql.indexOf("private.school_enforce_links") !== -1);
assert.ok(joinSql.indexOf("pupil organisation does not match class") !== -1);
assert.ok(joinSql.indexOf("session organisation does not match class") !== -1);
assert.ok(joinSql.indexOf("team organisation does not match session") !== -1);
assert.ok(joinSql.indexOf("participant pupil is in another organisation") !== -1);
assert.ok(joinSql.indexOf("event pupil is in another organisation") !== -1);
assert.ok(joinSql.indexOf("event team is from another session") !== -1);
assert.ok(joinSql.indexOf("event participant is from another session") !== -1);
assert.strictEqual(joinSql.indexOf("grant select on public.school_classes to anon"), -1);
assert.strictEqual(joinSql.indexOf("grant usage on schema private to anon"), -1);
assert.ok(joinSql.indexOf("security definer") !== -1);
assert.strictEqual(joinSql.indexOf("shared_offer"), -1);

console.log("school-ownership tests passed");
