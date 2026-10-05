# Phase 4 — Learning session engine

Phases 1–3 were already complete. This phase adds one runtime controller for a classroom play-through. It does not build the lesson shell, redesign `present.html`, add mechanics, or rebuild the adventure creator.

## Before

`schools/learn/session.js` owned the live lesson: slide index, joiners, answers, and completion, stored as one browser object. `js/school-store.js` copied that whole object into `school_sessions.snapshot`. Scores on the board lived in `schools/learn/classroom.js` (`board.reward`). Join rows written by the Phase 1.5 functions were not read back onto the teacher screen. Monday and Wednesday could already be two session rows, but the snapshot mixed the adventure with the play.

## After

`js/learning-session.js` (`WondiiSessionEngine`) is the authority. `schools/learn/session.js` keeps the presenter-shaped object the current screen reads, and writes it from the engine. `schools/learn/present.js` still looks the same. Award, finish, and early end go through the engine. `classroom.js` still runs the spin and the roster form.

The teacher portal screens from Phase 3 were not redesigned.

## State

A session holds:

- `sessionId`, `sessionCode`, `organisationId`, `classId`, `adventureId`
- `snapshot` — the play copy of the adventure
- `status`, `phase`, `currentRound`, `rounds`
- `participants`, `teams`, `teamMode`
- `selectedParticipantId`
- `responses`, `events`
- `rewardTotal` for a class reward with no team
- `reveal`, `mechanicRuntime`
- `startedAt`, `updatedAt`, `completedAt`, `endedAt`, `result`

`mechanicRuntime` is where the existing board keeps its wheel and roster. Future mechanics should keep their own scratch there, not as new fields on the shared session. Hover, animation frames, and button-pressed state are not stored.

## Lifecycle

| Status | Meaning |
| --- | --- |
| `waiting` | Created, not started |
| `active` | In play |
| `paused` | Teacher paused |
| `completed` | Played through to a finish |
| `ended` | Stopped early. The session is kept |
| `recoverable_error` | One step failed. Scores and rounds stay |

`startSession` only from `waiting`. `pauseSession` only from `active`. `resumeSession` only from `paused`. `completeSession` from `active` or `paused`. `endSession` from anything except `completed`. A second complete or a second end returns the same session and does not add another completion event.

`canResume` is true while the status is `active`, `paused`, or `recoverable_error`. Phase 5 can use that to offer Resume. `resumeSession` itself only continues a paused session. `recoverSession` reloads a saved engine state, and moves `recoverable_error` back to `paused`.

The old presenter still shows a board session as `playing` so the existing lobby and gate screens stay in place. The engine status is on `engineStatus`. An early end uses presenter status `ended`, and the existing results screen opens for that as well as `completed`.

## Actions

Used by the engine, and only where they change a real lesson:

`createSession`, `startSession`, `pauseSession`, `resumeSession`, `setCurrentMechanic`, `nextRound`, `skipRound`, `selectParticipant`, `createTeams`, `assignTeam`, `addParticipant`, `removeParticipant`, `claimTeam`, `awardPoints`, `removePoints`, `recordResponse`, `revealAnswer`, `hideAnswer`, `completeMechanic`, `completeSession`, `endSession`, `markFailed`, `recoverSession`, `applyMechanicResult`.

Repeating the same award reason, the same answer, the same `actionId`, or a second completion does not apply twice.

## Adventure and snapshot

`school_adventures.config` stays the editable adventure.

`school_sessions.snapshot` is now `{ kind: "play", adventureId, title, version, rounds }`. Each round is `{ id, mechanic, config }`. It is copied when the session is created. Later edits to the adventure, and later scores, do not change it.

Slide decks from the current creator become rounds. A question slide is mechanic `quiz`. Anything else keeps its slide type (`story`, `spin`, `mystery`, `doors`, `done`). The engine does not know only those names.

## Persistence

The database is the durable copy when a teacher is signed in:

- Session row: status, phase, slide index, selected pupil id when the person is a real pupil, class reward, times, and the play snapshot
- `school_teams`: names and points for this session
- `school_participants`: people in this session
- `school_events`: the event log

The browser list `wondii-class-sessions` is the fast copy, still account-scoped by `js/score-cloud.js`. It holds the engine so a refresh on that browser can continue. It is not a second history. `js/school-store.js` upserts the rows above. A failed save still uses the existing pending-session banner.

Critical changes (start, pause, round, score, answer, complete, end) save immediately. There is not a separate write for hover or a button highlight.

Anonymous selection is not written to `selected_pupil_id`. It is restored from the local engine, or from a `participant_selected` event on another device.

## Recovery

Same browser: reload reads the local engine, including the round, scores, participants, teams, answers, and the board wheel.

Another browser: `rehydrate` rebuilds from the play snapshot, the session columns, teams, participants, and events. The board wheel order is not in the database. `canResume` tells Phase 5 that the lesson can continue.

## Participants

| Person | Engine identity | Database |
| --- | --- | --- |
| Known pupil | `pupil`, with `pupil_id` | `kind` `pupil` |
| Joiner with no pupil | `anonymous`, `pupil_id` null | `kind` `pupil`, `pupil_id` null |
| Teacher side of Teacher vs Class | `teacher` | `kind` `class` |
| Team seat in a group join | `team` | `kind` `team` |

An anonymous joiner is never given a pupil id. Demo explorers stay `demo` and do not become pupil events.

Team membership is `participant.teamId` on this session. Creating teams does not change the class pupil record.

Team modes: `none`, `two`, `multiple`, `teacher_class`, `custom`.

## Scoring

`awardPoints(state, teamId, amount, reason)` and `removePoints` update that team. With no team id, they update `rewardTotal` (the class tokens on the current board).

The same reason does not score twice. Points stay when the round changes. A mechanic returns a score through `applyMechanicResult`. It does not keep a separate total.

The presenter reward pips read `rewardTotal` after an award. They no longer increment only inside `classroom.js`.

## Events

Stored on `school_events`. `result` is the event type, with `|value` when a value has to travel in the existing text column. `mechanic` is the round mechanic, or `session`.

Types: `session_started`, `session_paused`, `session_resumed`, `participant_selected`, `question_answered`, `answer_correct`, `answer_incorrect`, `points_awarded`, `points_removed`, `mechanic_completed`, `round_completed`, `round_skipped`, `session_completed`, `session_ended`.

Scope is `pupil` only when that participant is a known pupil. Otherwise it is `class`, or `team` for a team score. Demo rows are not written.

The public join answer still stores the letter `A`, `B`, or `C` in `result` with mechanic `question`. The engine treats that as a choice response. New answers inside the engine also accept `boolean`, `text`, `match`, `sequence`, `word-found`, `completion`, and `teacher-awarded`. The join RPC was not widened.

## Mechanic contract

`mechanicContext(state)` gives the session id, the current round id, mechanic, and config, the participants, the teams, the selected participant, and the round config as the learning content.

A mechanic returns:

- `response` — participant, type, value, and whether it was correct when that is known
- `score` — team id or class, amount, reason
- `participantId` — when this action is the selection
- `completion` — `"mechanic"` or `"round"`

`completeMechanic` does not finish the round or the session. `nextRound` finishes the round and moves on. `completeSession` finishes the session. `skipRound` marks the round skipped.

`markFailed` keeps the session. `recoverSession`, `skipRound`, and `nextRound` are the ways out.

## Join and live answers

Pupil devices still use `public.school_join` and `public.school_join_answer`. They still do not read the teacher session book.

While a session is `active`, the teacher page polls `school_participants` and `school_events` for that session about every 4 seconds (`WondiiSchoolData.watchSession`). New joiners and new choice rows are merged with `ingestRemote`. `joinedCount` is the number Phase 5 can show. There is no new lobby screen.

Supabase Realtime broadcast in `session.js` is still only the same-browser echo from the pilot. It is not the record of who joined. Postgres Realtime was not added. Polling is enough for the current join tables, and it does not need a new publication.

## Result

`completeSession` and `endSession` set `result`: duration, rounds completed and skipped, mechanics and their status, team points, class reward, how many people joined, how many were known pupils, how many were anonymous, and how many answers were correct or incorrect. There is no attainment level. An ended session keeps the events and the answers.

The old results screen can still show a percentage from choice counts. That screen was not redesigned. The engine result does not include that percentage.

## Presenter

`present.html` loads the engine, then `session.js`. Creating, starting, moving, revealing, awarding, finishing, and ending call the engine. The visible layout is unchanged.

From a class, the existing `?class=` link is unchanged. The session stores `classId` when the adventure already has one.

## Tests

`node tests/learning-session.test.js` covers create, start, pause and resume, rounds, selection, teams and membership, award, removal, score continuity, a known pupil event, an anonymous event, mechanic completion, round completion, session completion, early end, two sessions of one adventure, refresh, rejected transitions, double actions, a foreign school, and a Volcano Adventure with story, spin, quiz, a word-search configuration, and mystery. No word-search screen was built.

`node tests/school-ownership.test.js` passed as well.

## Limits

- The lesson screen is still the old presenter. Pause is in the engine and not on that screen.
- Storybook still ignores the class.
- The join RPC still accepts only A, B, or C.
- A second browser does not restore the spin wheel order.
- Team “claimed” for group join is local. A rehydrate marks database team rows as joined.
- Board roster ids that are not pupil uuids stay on the device. They are not pupil results.
- Signed-in polling was not clicked through in a browser. No teacher password was used, and no session rows were written for this phase.
- Deleting a session is still not a teacher action.
