# Phase 9 — Teacher journey

The teacher path is one product: class, adventure, attendance, lesson, score, and result stay on the same records.

## Canonical journey

Home or class → Create → lesson source → class and learning level → who is taking part → play mode → activities → review → save or start → who's here today → play confirmation → lesson shell → mechanics → score → complete → that session's result → class or home.

Quick Game is the short form: class already chosen → Quiz, Spin, or Word Search → attendance → a temporary session. It is not saved unless the teacher saves it. It is not the Electricity demo.

## Class context

`create.html?class=<id>` calls `setClass` after the organisation and the account scope are ready. The draft keeps the organisation, class id, class name, class year, and pupils. Every pupil starts selected, so a class of 4 shows “4 of 4 pupils taking part”. Away marks and visitors live on the draft for this sitting only. `toAdventure` stores `classId`, `className`, `playMode`, and teams. It does not store who is away or visitors. The session plan copies teams and drops anyone marked away. The saved adventure is not rewritten.

## Attendance and play mode

Attendance title: “Who's here today?”. The roster uses the class portraits. Default is everyone here. A visitor is a first name, temporary, and a session participant only.

Confirmation uses the play mode saved on the adventure:

- Whole class: “Playing together as one class.”
- Two teams: “Red Team vs Blue Team”, with the pupils who are here under each team.
- Teacher vs class, individual turns, and custom teams use that saved setup.

“Change setup” is the only way back to the mode list. Absences change the session copy. A checked two-team adventure still listed Jack on Blue after he was marked away for the sitting. The confirmation showed Sofia alone on Blue.

## Participation and scoring

Activity config `participation` is one of `whole_class`, `selected_pupil`, `spin`, `team_turn`, `teacher_class`. Options follow the mechanic and the play mode. Story, mystery, doors, and spin stay whole class. Team turn is hidden when there are no teams. Teacher vs class is only offered in that play mode.

Quiz editing shows the question, answer type, choices, correct answer, points, and who answers. Review states participation and scoring, and says a quiz after a spin is answered by the selected pupil. No pupil name is hardcoded.

`scoreTarget` in `mechanic-core.js` decides the team. The session engine `awardPoints` is the only score write. A known selected pupil on a team scores that team. No teams means a class reward. Team turn needs an active team chosen for that round. A missing team is not guessed.

## Legacy adventures

Current means `creator: "v2"` and every activity is a known mechanic. Older cards offer “Update this adventure”. That opens Adapt, which makes a new id and leaves unsupported mechanics out of the copy. The original stays. Matching and sequencing cannot start a live session. Current cards offer Start, Preview, Adapt, and Duplicate. Groups or devices, Share with teacher, Use next year, and Favourited are not on the library.

`flow.js` and `create.js` are still in the repo and are not loaded. `present.html?edit=1` still has its handler and no current link.

## Start, resume, results, quick game

Creator waits until the organisation is ready and account scope has settled, then builds. A missing id shows a specific notice. If the session cannot be created after a save, the notice says the adventure is still saved.

Home and the class page say “Continue lesson” only for a waiting, active, paused, or recoverable session, and that link is `present.html?session=<code>` without `fresh=1`. A saved adventure with no session is “Start adventure”.

The complete screen is that session: duration is on the engine result, and the screen shows rounds, class reward or team points, people taking part, and correct and incorrect counts. View results stays on `present.html?session=<code>`. Play again goes to `create.html?start=` so the next sitting calls `createSession` again. Results rows on the portal open the same session URL.

## Browser QA

Local fixture only. A signed-in production school was not used, so cloud rows were not changed.

Checked in headless Chrome against `http://127.0.0.1:8771`:

- Year 2, Amelia, Noah, Sofia, Jack. Create showed 4 of 4.
- Review, library current card, library older card with Update this adventure.
- Attendance, Jack away, “3 of 4 here today”, whole-class confirmation, lesson start.
- Spin chose Noah. The next quiz showed Noah. Correct answer added 1 class reward.
- Refresh offered “Continue your lesson” for the same session code `W5KF-P99T`.
- Complete screen: 2 of 2 rounds, 3 taking part, 1 correct, 0 to look at again, class reward 1.
- Two-team confirmation after Jack was away: Red Amelia and Noah, Blue Sofia. Saved teams still included Jack.

Viewports used for the screens that were open: 1440×900, 1280×720, and 1112×834. Not every screen was captured at all three sizes. The class step, attendance, selected-pupil quiz, library, and team confirmation were checked at more than one width.

## Tests

`tests/teacher-journey.test.js` plus the existing school, session, shell, mechanics, creator, and game-platform tests. All passed.

## Database

No schema change.

## Known limits

- Mechanic state is stored on the session in this browser. Another browser does not restore an in-progress word search or quiz choice.
- `present.html?edit=1` remains, unlinked.
- `flow.js` and `create.js` remain, unloaded.
- The Electricity sample is still available as a demo. Quick Game does not open it.
- Production signed-in cloud save and resume were not exercised.
- The spin “You're up” card sits over the quiz until the teacher continues.
- Play again was not clicked in the browser. The button leaves the completed session and the engine test checks that a new session id is created.

## Files

Creator, lesson shell, mechanics, presenter, home, class room, score-cloud account-ready signal, portal and create script versions, this audit, the visual registry rows that were rechecked, and design debt. No family game files.
