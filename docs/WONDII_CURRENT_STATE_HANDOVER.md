# Wondii current state handover

Written 30 September 2026 from the working tree. No code was changed to produce the findings. This file is the handover itself.

Wondii’s school product, design skin, and game chrome all sit in the uncommitted working tree on `main`. Nothing in that tree is a finished shared game shell. `WondiiGameShell` and `GameSessionEngine` do not exist.

Origin `main` is still the family homepage and portal (`c2a2bf5`). The school system, organisation SQL, tokens, and P1 skin are local only. Production and Supabase were not queried for this report, so this file cannot say what is already live.

---

## 1. What was completed

Statuses below mean the working tree, not a commit and not a production deploy.

### Account-scoped local data — IMPLEMENTED, uncommitted

Requested so one family account would stop showing another account’s stories, games, and classes.

`js/score-cloud.js` treats a fixed key list as private to the signed-in user. Unsigned reads of those keys return null. Signed-in scorecards, shelf, classes, adventures, and class sessions sync or stay on that account.

Keys include the nine `.gsc` scorecards, storybook shelf, `wondii-school-classes`, `wondii-learning-adventures`, `wondii-class-sessions`, runner/RPS/snake/star-catcher/link-grid progress, and `wondii-fave:*`.

No new pupil table. Classes stay in `localStorage` under that wrapper.

### School organisations — IMPLEMENTED in client + SQL file, migration apply UNKNOWN

`js/organisation.js` loads the signed-in user’s organisation from Supabase (`organisations`, members, invites, story starters, navigation) and themes the portal. Personal accounts stay on the normal portal.

SQL is `supabase/migrations/20260929100000_organisations.sql` and `supabase/migrations/20260929110000_fix_organisation_navigation_href.sql`. Tables: `organisations`, `organisation_members`, `organisation_invites`, `organisation_story_starters`, `organisation_navigation`, plus RLS and RPCs (`create_organisation`, invites, roles). Whether this SQL has been applied to the shared project was not checked.

`clever-service` was not given organisation routes. The uncommitted `clever-service` diff is story illustration (visual bible, character references, image-model flags), about +1,137 lines.

### Teacher class and classroom — IMPLEMENTED, uncommitted

Teacher today, class wizard (size, then each pupil’s name, hair, eyes, presentation), illustrated class floor, remove pupil, and year-to-age art.

Age rule in code: Reception/Year 1 use a `5-` portrait prefix, Year 2–3 use `6-`, Year 4 and unknown use the unprefixed set, Year 5–6 use `10-`. An explicit Boy/Girl choice is stored as `presentation` and overrides a name guess.

Files: `schools/learn/home.js`, `class-room.js`, `class-room.css`, `schools/org-portal.css`, portraits under `games/images/schools/room/`.

Class data is `wondii-school-classes` in the browser. There is no pupil database.

### Learning Adventure creator — PARTIAL

The short path in `schools/learn/flow.js` is the default on `schools/learn/create.html`. The old builder in `create.js` still runs when the URL has `library`, `guided`, `prefs`, `feedback`, `pace`, `custom`, `adapt`, `template`, `example`, or `demo`.

Activities are catalogue entries in `schools/learn/model.js`. Several of them are not playable games (see inventory).

### Whole-class board — PARTIAL

`schools/learn/present.js` plays a saved adventure as slides: story, question, spin, mystery, doors, done. `schools/learn/session.js` keeps a browser session (`wondii-class-sessions`) with a join code. `schools/learn/classroom.js` does a fair spin and a class reward pip.

Team objects exist and stay at 0. There is no team scoreboard, no pause, and no “today we learned” finale.

### Family game chrome — PARTIAL

`games/wondii-shell.js` is on 19 `/games` pages and not on storybook. It adds a back link, a theme line, a help modal, and wraps `.gsc` in a disclosure. Boards, rules, and scores stay inside each game.

### Design tokens and P1 skin — PARTIAL, not a migrated design system

`css/wondii-tokens.css` and `css/wondii-p1.css?v=9` are linked last on the portal, characters, Ramsden, class, create, present, join, electricity, storybook, and the 19 games. The skin forces paper backgrounds and navy buttons on many controls. Play boards keep their own CSS.

`docs/WONDII_DESIGN_DEBT.md` still says there is no token file. That sentence is stale. The file exists. The registry’s per-row generation column was not rewritten after the skin.

### Visual surface audit — IMPLEMENTED as documents

182 surfaces recorded. See section 12. A later screenshot pass verified 51 of them for paper and navy chrome only.

### Audits that were not turned into code

Publishing Engine V2, the product blueprint, and the game-shell architecture audit were written in chat and then stopped. There is no blueprint file in `docs/`.

### Deliberately not changed

No commit. No deploy from this handover. Service worker name in the working copy is `jigsaw-kids-v367` (origin `main` is still `v347`). Offer Studio `site_url` was not changed. No pupil table. No surnames, emails, or attainment on the board. Preview does not write a class result. Email confirmation was left on. Sofia is artwork, not a fallback child.

---

## 2. What is still in the queue

| Task | Status |
| --- | --- |
| P1 visual migration of all 182 surfaces | PARTIAL. 51 visually verified for chrome. Generation labels in the registry tables are still the pre-skin audit. |
| Snakes roll button, RPS result, jigsaw’s own nav, snake game-over title, storybook wizard screenshots | PARTIAL. Some CSS was added after the screenshot. Those shots were not retaken. |
| `WondiiGameShell` + `GameSessionEngine` | NOT STARTED. Audit only. Waiting for approval. |
| Publishing Engine V2 | PLANNED. Audit only. No engine. |
| Product blueprint implementation | PLANNED. No file, no build. |
| Wondii Admin (staff console, duplicate a school) | NOT STARTED. |
| Second school microsite without a new HTML page | NOT STARTED. |
| Real matching, sequencing, word-search, and circuit inside an adventure | NOT STARTED. Those names exist as slides or as a link out. |
| Boss battle and the other named-but-missing games | NOT STARTED. |
| Pupil database | NOT STARTED. Blocked until a schema is approved. |
| Commit and deploy of the working tree | NOT STARTED. |

---

## 3. Product structure

There is no app router. `workers-site/index.ts` rewrites a few paths onto static HTML. Everything else is a file.

**Public**

- `/` → `index.html` (marketing homepage)
- `/welcome.html` → redirect to `/`
- `/ramsden` → `ramsden.html`

**Family**

- `/portal.html` with `#home`, `#stories`, `#games`, `#puzzles`, `#learning`, `#favourites`, `#search`
- Unsigned users hit a password gate on that page
- `/characters.html` — photo to clay character, separate from class pupils

**Schools / teacher**

Teacher home is not its own site. It is `portal.html#home` when `js/organisation.js` finds an organisation.

- `/teacher/class` → `schools/learn/class.html` (floor)
- `/teacher/learning/create` → `schools/learn/create.html`
- `/teacher/learning/present` → `schools/learn/present.html`
- `/join` → `schools/learn/join.html`
- `/schools/demo/electricity` → one hardcoded electricity journey

**Classes** live in the browser key `wondii-school-classes`, painted by `class-room.js`.

**Learning Adventures** are drafts in `wondii-learning-adventures`, built by `flow.js` / `create.js`, played by `present.js`.

**Games** are individual files under `/games/*.html`, listed in `portal.js`.

**Stories** are `games/storybook.html`. The portal Stories tab and the storybook shelf are two views of the shelf store.

**School microsites:** only Ramsden, as its own HTML file.

**Wondii Admin:** no `/admin` route. The only settings UI is the school sheet `#orgSettings` inside the portal (`SCH-006`). That edits one organisation for a member. It is not a Wondii staff console.

---

## 4. Design system

**What exists**

`css/wondii-tokens.css`:

- Ink `#141b4d`, soft `#5c6284`, paper `#f6f5fc`, card `#fffdfb`
- Accent: `--org-primary`, then `--school-red`, then ink
- Radius 22 / 28, two shadows
- Fredoka for display, Nunito for body
- OK `#0f9f6e`, NO `#e11d48`

There is no component library. Pages are HTML strings and per-page CSS. Shared pieces that actually exist:

- `games/wondii-shell.js` — family header only
- `js/game-scorecard.js` — personal bests on 9 games
- `schools/learn/classroom.js` `rewardBar` — class pips on the board
- Portal SVG tiles and letter marks in `portal.js`
- Org sheets in `portal.html` + `organisation.js`

Buttons are many classes (`.room-go`, `.learn-btn`, `.teach-go`, `.class-btn`, `.o-btn`, `.sb-btn`, per-game buttons). `wondii-p1.css` paints a subset navy. It does not replace them.

Modals: org sheets, class wizard, character `#chModal`, shell help, Snap’s own rules modal, storybook modals, and a native `window.confirm` when removing a pupil.

Icons: inline SVG in the portal. Emoji remains on some older tiles and titles. No icon package.

**Still legacy or inconsistent**

- All 19 game boards and their stylesheets
- Storybook (`storybook-app.css` plus `storybook-wondii.css`), with extra display fonts per book
- Public homepage `welcome.css`
- Ramsden `schools/school.css` and hardcoded `#c41230`
- Electricity demo CSS
- Presenter `class.css` versus class floor `class-room.css`
- Old adventure builder behind query flags
- Jigsaw’s own top bar, including a purple Games pill on the last reviewed shot

`docs/WONDII_DESIGN_DEBT.md` hex counts were taken before the token file. Treat that file as the audit, not as a description of the skin.

---

## 5. Game inventory

`WondiiGameShell`: not used by any game.
`GameSessionEngine`: does not exist.
Visual status is chrome-only. A “verified” cell means a screenshot showed paper and navy controls, not that the mechanic was redesigned or played through.

### Family games (own pages)

| Name | File | Design | Shell | Session | Visual |
| --- | --- | --- | --- | --- | --- |
| Memory Match | `games/memory.html`, `memory.js` | LEGACY board, P1 chrome | `wondii-shell` only | Own `.gsc` | Setup and play verified (GME-002–004). Win line not a full results screen. |
| Snakes & Ladders | `games/snakes-ladders.html`, `.js` | LEGACY board | shell | Own `.gsc` | Setup verified (GME-006). Play roll was still orange. Win sat behind the welcome card. |
| Snap | `games/snap.html`, `.js` | LEGACY board | shell | Own `.gsc` | Setup verified (GME-009). Play not reviewed. |
| Connect 4 | `games/connect-four.html`, `.js` | LEGACY board | shell | Own `.gsc` | Play and win not cleanly verified. |
| Noughts & Crosses | `games/noughts-crosses.html`, `.js` | LEGACY board | shell | Own `.gsc` | Win overlay did not cover setup. |
| Number Path | `games/math-race.html`, `.js` | LEGACY board | shell | Own `.gsc` | Play and win verified (GME-018, GME-020). |
| Word Search | `games/word-search.html`, `js/word-search.js` | LEGACY board | shell | Own `.gsc` | Screenshot taken, not reviewed. |
| Jigsaw | `games/jigsaw.html`, `js/jigsaw.js` | LEGACY board, own nav | shell plus its own bar | Own `.gsc` | Purple Games pill still visible. |
| Runner | `games/runner.html`, `runner.js` | LEGACY canvas | shell | Own `.gsc` | Play verified (GME-023). Crash overlay did not cover setup. |
| Rock Paper Scissors | `games/rock-paper-scissors.html`, `.js` | LEGACY | shell | Own `rpsScoreV1` | Result button was still a purple gradient on the shot. Later CSS was not reshot. |
| Snake | `games/snake-arcade.html`, `.js` | LEGACY canvas | shell | Own high score | Game-over title was yellow on the shot. Later CSS was not reshot. |
| Star Catcher | `games/star-catcher.html` | LEGACY | shell | `threeStarCatcherBest` | Start screen verified (GME-042). |
| Link Grid | `games/link-grid.html` plus several `link-grid-*.js` | LEGACY | shell | `linkGridCompletedLevels` (now in the account sync list) | Level list verified (GME-039). |
| Colouring | `games/colouring.html`, `.js` | LEGACY; pink remains on pen chips | shell | Own picture key | Save button verified (GME-035), with that caveat. |
| Prompt game | `games/prompt-game.html` | LEGACY | shell | None | Form verified (GME-043). |
| Block Stack | `games/block-stack.html` | LEGACY | shell | In-page | Screenshot not reviewed. |
| Zuma | `games/zuma.html`, `zuma.js` | LEGACY | shell | In-page | Screenshot not reviewed. |
| Marble Maze | `games/marble-tilt.html` | LEGACY | shell | In-page | End state did not show a results screen. |
| Drive Mad | `games/drive-mad.html` | LEGACY | shell | In-page | Screenshot not reviewed. |

### Classroom slides (one player: `schools/learn/present.js`)

These are not the family games. None use `wondii-shell`. Session is `ClassRooms` in `schools/learn/session.js`, and only while that page is open.

| Name | Renderer | What it actually is | Design | Visual |
| --- | --- | --- | --- | --- |
| Story | `storyHtml` | Picture and lines | MIXED `class.css` | Part of the board checks |
| Prediction / quiz / exit / maths / comprehension | `questionHtml` | A/B/C | MIXED | Answer bars verified (CLS-024) |
| Word search | `storyHtml` via `type: "activity"` | A word list, not `word-search.html` | MIXED | Not a grid |
| Matching | `questionHtml` `match_0` | One 3-choice question | MIXED | Not a matching board |
| Sequencing, STEM, creative | `storyHtml` | A paragraph | MIXED | Not a mechanic |
| Circuit | `storyHtml` plus a link | Leaves the lesson for the electricity demo | MIXED | Not embedded |
| Spin a pupil | `spinHtml` | Fair pick from the class | MIXED | Verified (CLS-026). Uses preset animals unless a portrait is set. |
| Mystery | `mysteryHtml` | Reveal a fact | MIXED | Verified (CLS-027) |
| Doors | `doorsHtml` | Three choices, one objective line | MIXED | Verified (CLS-028, CLS-029) |
| Done | `doneHtml` | Short completion copy | MIXED | Not a finale |
| Ready / lobby / results | `viewGate`, waiting view, `viewResults` | Around the slides | MIXED | Lobby and tools partly verified |

`Classroom.award` adds 1 class pip per slide key for a correct answer, an opened mystery, or a chosen door. It does not add team points.

### Electricity demo — LEGACY, separate app

`schools/demo/electricity.js`: intro, story, words, circuit, maths, quiz, engineering, done, more. Intro, words, circuit, and done were reviewed as navy chrome (SCH-015, 017, 018, 022). Story, maths, quiz, and build were opened and not reviewed frame by frame. This quiz is not `questionHtml`. This word list is not the family word search.

### Storybook — not a game

`games/storybook.html`, `storybook.js`. Wizard, reader, shelf. Shell is skipped. Wizard steps were not screenshot-verified because the page navigates away or hung the checker.

### Catalogue entries that are not engines

`schools/learn/model.js` `ACTIVITIES`: story, word_search, quiz, circuit_game, comprehension, maths, stem, matching, sequencing, creative, exit_ticket.

`teach.js` templates (quick_quiz, vocabulary, retrieval, starter, and the rest) only pick those ids.

### Named in product language, with no file

Treasure Hunt, Race to the Finish, Boss Battle, Picture Reveal, Crossword, True or False, Drag and Drop, Wheel of Wonder as its own app, Match It, Sort It.

---

## 6. Game architecture

| Piece | Status |
| --- | --- |
| `WondiiGameShell` | NOT STARTED |
| `GameSessionEngine` | NOT STARTED |
| Central game registry | NOT STARTED. Four lists: `portal.js`, shell theme map, `model.js` `ACTIVITIES`, `teach.js` templates |
| Family chrome | IMPLEMENTED as `wondii-shell.js`. Header only |
| Classroom session | IMPLEMENTED as `ClassRooms` in `session.js`. New id per session. 4-hour `expiresAt`. Browser `localStorage`, account-scoped when `score-cloud.js` is loaded. Join page does not load that script |
| Scoring | PARTIAL. Family: per-game keys. Classroom: one class pip. Team `reward` fields exist and are never incremented |
| Teams | PARTIAL. `makeTeams` names Rocket, Explorer, Dinosaur, Ocean. No points |
| Participants | PARTIAL. Class pupils on the floor. Spin stores an index for that moment. Live join has `participants[]` and `responses[]`. The next slide is not required to show the spun pupil |
| Teacher controls | PARTIAL. `<details class="class-tools">`: another explorer, full screen, end, reveal on a live question, previous/next. No add/remove point, no pause |
| Rewards | PARTIAL. `Classroom.rewardName` plus pips. Topic words change the label. One class total |
| Round transitions | PARTIAL. Next slide on the same page. No “round complete / next up” screen |
| Results | PARTIAL. Live responses and a done card. Not a shared event log. Family win overlays are per game |
| Quick game mode on the session engine | NOT STARTED |
| Score continuity across a quiz and a word search | NOT STARTED. They are different pages or a word-list slide |

The recommended direction, not built: extend `ClassRooms` and `Classroom`, and keep each mechanic’s own state. Do not wrap the 19 games first.

---

## 7. School / teacher experience

**Login.** Family password via Supabase in `score-cloud.js` / the portal gate. A teacher is the same account plus an `organisation_members` row. A real login was not retested for this handover.

**Dashboard.** `schools/learn/home.js` paints “today” only when an organisation loads: classes, adventures, quick actions. Copy on the reviewed shot said participation is not a score.

**Class.** `/teacher/class`. Illustrated floor, pupils, start-a-lesson picker. Portraits follow the year rule above.

**Pupils.** First name, presentation, hair, eyes. Stored on the class object in the browser. Remove uses `window.confirm`. No surname, DOB, or SEND fields on the board.

**Create.** `/teacher/learning/create`. Short flow is the default. The long builder is still there behind query flags. Lesson text is keyword shaping in `teach.js`. That is not a live model. Pasted plain text is read. PDF, Word, and photos are stored; words are not extracted. PowerPoint is not supported. Draft questions can be placeholders (“This matches today’s lesson”).

**Play.** `/teacher/learning/present`. Board mode is the classroom screen. Live mode has a join code for `/join`. Preview (`?preview=1` without a session) does not save results.

**Results.** `viewResults` and the done slide. Session history is the array in `wondii-class-sessions` until expiry. There is no attainment record and no cross-adventure progress for a pupil.

**Clunky or placeholder**

- Floor and presenter are different layouts. Spin avatars are not the floor faces unless a portrait is copied onto the pupil.
- Matching, sequencing, lesson word search, and circuit are not the games their names suggest.
- Leaving for electricity drops the presenter.
- Two creators.
- No historical progress beyond that browser’s session list.
- Teacher dashboard, class, and adventures disappear when signed out, because those keys return null.

---

## 8. Story / publishing

**What exists**

`games/storybook.js` is the wizard and reader. Shelf persistence is `js/storybook-shelf-store.js` (`jigsawKids_storybookShelf_v1`), account-scoped when score-cloud is loaded. Characters come from `characters.html` / `js/character-store.js` through `clever-service`. Generation runs in the `clever-service` edge function. The uncommitted function diff adds a visual bible and canonical character references for illustrations.

Portal Stories lists that shelf. Storybook is a different UI from the adventure player.

**Publishing Engine V2**

PLANNED only. No module, no route, no schema, no prices. The audit said not to invent model prices and not to treat keyword lesson analysis as a model. Do not describe V2 as built.

---

## 9. School microsites

Ramsden is a hardcoded page.

`ramsden.html` contains the hero, sections, and a red logo fill `#c41230` in the markup. `schools/ramsden.js` sets `window.SCHOOL_PAGE` with the same copy and `accentColor`. `schools/school-page.js` only copies that accent into `--school-red`. It does not render the page from the config.

Another public school page cannot be created from settings. It needs a new HTML file and a worker rewrite.

An organisation record can be created in the portal (`create_organisation`) if the SQL is applied: name, slug, colours, logo, hero, story starters, nav links, invites. That themes the teacher portal. It does not publish `/ramsden`-style marketing pages.

Wondii Admin school duplication: NOT STARTED.

---

## 10. Account and data isolation

**What went wrong.** Stories, games, classes, and adventures lived in shared `localStorage` keys. A second account on the same browser saw the first account’s shelf and classes. Sofia was also easy to treat as a default child; that fallback was removed.

**What changed.** `js/score-cloud.js` now nulls those keys until a session exists, then loads that user’s cloud copy. Class and adventure keys are on the account-local list. Character and shelf APIs go through the signed-in user. Every `clever-service` path was not re-audited for this report.

**Server-side.** Organisation rows use RLS in the uncommitted migration (members read their org). Story and character ownership still depends on existing `clever-service` and storage paths. Those policies were not re-read for this report.

**Remaining risks**

- Any page that does not load `score-cloud.js` still uses raw `localStorage`. Join is one of those pages.
- A bug in the wrapper, or a new key forgotten from the list, leaks again.
- Preview must keep avoiding writes. That is a client rule, not a database constraint.
- Classes are not server-owned. Copying a browser profile copies the class.
- Whether the working-tree wrapper matches production is unknown.

**Tests.** Isolation was exercised in an earlier session by using a second account and by stubbing unsigned `getItem`. That test was not repeated for this handover.

---

## 11. Data model (real names)

| Idea | What actually exists |
| --- | --- |
| User | Supabase `auth.users`. The app calls this the family password session. |
| Family / child | No child table. `kidsProfileV1` in the browser. Characters are separate. |
| Character | Saved cartoons via `clever-service` / characters storage. Not class pupils. |
| School | `public.organisations` in the migration file. Client: `WondiiOrg`. |
| Teacher | `organisation_members.role` (`owner`, `school_admin`, `teacher`, `staff`). Same auth user. |
| Class | Object in `wondii-school-classes`. Not a table. |
| Pupil | Object on that class: id, first name, `presentation`, hair, eyes, seat, portrait. Not a table. |
| Adventure | Object in `wondii-learning-adventures` (`learningMap`, `selected`, `plan.slides`). |
| Game | A static HTML file, or a slide `type` inside `plan.slides`. |
| Session | Object in `wondii-class-sessions`: `id`, `code`, `journeyId`, `mode`, `status`, `phase`, `slide`, `participants`, `responses`, `board`, `expiresAt`. |
| Result | `responses[]` on that session, plus `board.reward`. No results table. |
| Story / book | Shelf entry in `jigsawKids_storybookShelf_v1` and cloud storage. Jobs live in the existing story pipeline inside `clever-service`. |
| Microsite | `ramsden.html` + `window.SCHOOL_PAGE`. Not an `organisations` row. |

There is no `Game`, `Session`, or `Result` table.

---

## 12. Visual audit

From `docs/WONDII_VISUAL_SURFACE_REGISTRY.md`. Per-row generation was not updated after the skin. “Current” here means “newest school UI at audit time,” not “token-complete.”

| Area | Surfaces | Audit generation | Visually verified chrome |
| --- | ---: | --- | ---: |
| Public | 12 | In the 71 legacy / 80 mixed split | None in the verified list |
| Family | 16 | Mixed / legacy | 7 (FAM-001, 006, 007, 009, 012, 013, 014) |
| School | 23 | Current for teacher home; mixed Ramsden; legacy electricity | 7 |
| Classroom | 42 | Current for the floor; mixed for present/join | 16 |
| Adventure creator | 29 | Current for the short path; legacy for the old builder | 9 |
| Games | 43 | Legacy boards, mixed chrome | 12 |
| Stories | 17 | Legacy / mixed | 0 |
| Admin | 0 | — | — |
| **Total** | **182** | Legacy 71, mixed 80, current 29, unknown 2 | **51** |

Unknown at audit time: CLS-015 (native confirm) and GME-030 (marble end).

Runtime review is still required for every surface whose play state was not opened. Screenshot of chrome is not a play-through. 131 surfaces are not in the verified list. Some of those have unreviewed screenshots on disk under `/tmp/wondii-p1/`.

---

## 13. Fifteen problems

1. Two products. Classroom slides and `/games` pages do not share a session, a score, or a class.
2. Several lesson “games” are paragraphs or a single fake question. The catalogue overclaims.
3. Circuit play leaves the session.
4. No team scores, no round-complete screen, no learning finale.
5. Class floor and lesson player look and behave like different apps, including different faces.
6. Two adventure builders still ship.
7. Design tokens exist, but most CSS still owns its own hex, type, and buttons. The P1 file is an override.
8. Storybook is a third visual system, and its main steps were not visually signed off.
9. Ramsden cannot be cloned from data.
10. There is no Wondii admin.
11. Classes, adventures, and sessions are browser state with a 4-hour session expiry. Refresh on a machine without that account key loses the room.
12. Draft quiz text can be shown as if it were a real question.
13. Keyword lesson shaping is not a model, and uploaded PDF/Word/photos are not read as text.
14. The whole school build is uncommitted. Production may not match this tree. The service worker name already differs (`v347` on origin, `v367` locally).
15. Organisation SQL may be unapplied. If it is applied, it is on the shared Supabase project used by other products. That has not been re-checked here.

---

## 14. Files created

On disk, untracked:

- `docs/WONDII_VISUAL_SURFACE_REGISTRY.md`
- `docs/WONDII_GAME_MATRIX.md`
- `docs/WONDII_DESIGN_DEBT.md`
- `docs/WONDII_CURRENT_STATE_HANDOVER.md` (this file)
- `css/wondii-tokens.css`
- `css/wondii-p1.css`
- `games/wondii-shell.js`
- `games/wondii-shell.css`
- `games/storybook-wondii.css`
- `js/organisation.js`
- `ramsden.html`
- `schools/` (portal skin, class, creator, presenter, join, electricity demo, Ramsden config)
- `supabase/migrations/20260929100000_organisations.sql`
- `supabase/migrations/20260929110000_fix_organisation_navigation_href.sql`
- School, preset, and brand images under `games/images/`

Not on disk:

- Product blueprint
- Publishing Engine V2 spec
- Game-shell architecture doc (the audit is in the chat only)

The design-debt doc and the registry disagree about tokens. Trust the registry’s P1 section plus `css/wondii-tokens.css` for “does a token file exist,” and trust the registry tables for the original 182-row classification.

---

## 15. Test status

| Check | What actually happened |
| --- | --- |
| TypeScript / build | `clever-service` was not typechecked for this report. No project test run. |
| Automated tests | None found for this product surface. |
| Browser | Headless Chrome against a local static server. Portal, class, present, join, create, electricity, characters, and many game pages were opened. |
| Visual | 51 screenshots were judged for paper and navy chrome. Many other shots were taken and not reviewed. Storybook wizard shots did not complete. |
| Mobile | Not systematically checked. |
| 16:9 board | Shots were about 1280×800. Not a whiteboard pass. |
| Account isolation | Done in an earlier session. Not repeated for this handover. |
| School isolation | Organisation RLS is in the SQL file. Not retested against a live database for this handover. |
| Games | A few were started (memory, math race, runner, star catcher). Most were not played to completion. Win overlays often failed to cover the setup screen. |
| Story generation | Not run for this handover. |
| Deploy | Not done from this task. |

Compilation was not used as visual verification.

---

## 16. Screens to open

Local file or local server, from the repo root. Look at the working tree, not origin `main`.

| Route | Look for |
| --- | --- |
| `/` | Marketing homepage. Still its own CSS. |
| `/portal.html` | Gate, then Home / Stories / Games / Learning. Family tiles versus teacher today. |
| `/portal.html#home` while signed in as an org teacher | Classes, adventures, “not a score.” |
| `/characters.html` | Signed-out state, then the grid. Separate from class pupils. |
| `/ramsden` | Hardcoded red school page. |
| `/teacher/class` | Floor, faces, start lesson. |
| `/teacher/learning/create` | Short creator. Then `?library=1` to see the old one. |
| `/teacher/learning/present?preview=1` | Slide types. Confirm matching is not a matching game. |
| `/schools/demo/electricity` | A different quiz and circuit from the presenter. |
| `/join` | Join UI. This page does not load score-cloud. |
| `/games/word-search.html` | Real grid. Compare with a lesson “word search” slide. |
| `/games/memory.html` | Shell header plus an older board. |
| `/games/jigsaw.html` | Second navigation bar. |
| `/games/snakes-ladders.html` | Orange roll, welcome card over the win state. |
| `/games/storybook.html?create=1` | Whether it stays on the wizard or jumps back to the portal. |

---

## 17. Git

- Branch: `main`, tracking `origin/main`
- HEAD: `c2a2bf5` — homepage hero
- Recent history is homepage and portal work. The school system is not in that history
- Uncommitted: 52 modified tracked files (portal, storybook, games, `score-cloud.js`, `clever-service`, `sw.js`, `workers-site/index.ts`)
- Untracked: `css/`, `docs/`, `schools/`, `ramsden.html`, `js/organisation.js`, `games/wondii-shell.js`, both organisation migrations, and a large image set
- `sw.js` cache name changed locally from `jigsaw-kids-v347` to `jigsaw-kids-v367`
- Migrations are not confirmed applied
- No environment change is required to read the static pages. Organisation features need the SQL on the shared Supabase project and a signed-in member. Do not apply that SQL until someone has checked the live schema.

---

## 18. Suggested next 10 tasks

Dependency order. Not started.

1. Decide what of this working tree is allowed to exist, then diff it against production before any deploy. The tree and origin `main` are different products.
2. Confirm whether the organisation migration is already on the shared database. If it is not, review the SQL before applying it. It touches a project other products use.
3. Retest account isolation on portal, class, storybook, and join, including a second user on the same browser.
4. Stop the visual-skin pass from being treated as a game redesign. Either finish the 131 unverified surfaces as chrome-only, or freeze the skin and record that in the registry.
5. Approve or reject the game architecture: extend `ClassRooms`, do not invent a second session store, do not wrap the 19 games yet.
6. If approved, add score events and a class scoreboard to the existing session only. Still render today’s slide functions.
7. Pilot three real mechanics: question slide, the family word-search grid mounted in the lesson, and the electricity circuit embedded so the session is not left. Then stop and review.
8. Relabel or rebuild matching, sequencing, and lesson word search so the creator cannot offer a game that is a paragraph.
9. Make a second school a data record that themes the teacher portal. Keep Ramsden as the one hardcoded marketing page until a template exists.
10. Only after the pilot, write Publishing V2 against the real story pipeline. Do not start it in parallel with the session work.
