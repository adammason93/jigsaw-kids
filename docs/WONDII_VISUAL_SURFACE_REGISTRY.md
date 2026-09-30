# Wondii visual surface registry

Rebuild programme: Phase 0 baseline is `docs/rebuild/PHASE_00_BASELINE.md`. Phase 1 (`docs/rebuild/PHASE_01_DATA_FOUNDATION.md`) changed persistence, not these visual rows.

Discovery only. No screens were redesigned in this pass.

This file is the source of truth for visual migration. A surface is a distinct thing a person can see: a page, a hash view, a step, a game state, or an overlay. It is not a CSS class and not a route alias.

Worktree copies under `.claude/worktrees/` are not product surfaces. They are not listed.

## How to read a row

| Field | Meaning |
| --- | --- |
| Generation | `LEGACY` old per-page styling. `MIXED` newer chrome or school layout still using its own CSS. `CURRENT` latest school look (class room, teacher home, new adventure steps). `UNKNOWN` markup does not show the state. |
| Tokens | `YES` only if the surface reads shared design tokens. There is no token file in this repo, so every row is `NO` or `PARTIAL`. `PARTIAL` means it uses a shared stylesheet (`wondii-shell.css`, `org-portal.css`, `class-room.css`) that still hardcodes values. |
| Runtime | `REQUIRED` means this audit did not open that state in a browser. Code inspection is not a visual sign-off. |

`CURRENT` is not awarded for a logo, a navy hex, or a shared header. Play boards behind `wondii-shell` stay `LEGACY`.

## Routes

29 navigable HTML documents, plus 1 redirect and 1 fragment that is not a page.

Worker aliases in `workers-site/index.ts` serve existing files. They are not extra screens.

| URL | File |
| --- | --- |
| `/` | `index.html` |
| `/welcome.html` | `welcome.html` (instant redirect to `/`) |
| `/portal.html` and `#home` `#stories` `#games` `#puzzles` `#learning` `#favourites` `#search` | `portal.html` |
| `/characters.html` | `characters.html` |
| `/ramsden` | `ramsden.html` |
| `/games/*.html` | 19 family games plus `games/storybook.html` |
| `/teacher/class` and `/schools/learn/class.html` | `schools/learn/class.html` |
| `/teacher/learning/create` and `/schools/learn/create.html` | `schools/learn/create.html` |
| `/teacher/learning/present` and `/schools/learn/present.html` | `schools/learn/present.html` |
| `/join` and `/schools/learn/join.html` | `schools/learn/join.html` |
| `/schools/demo/electricity` | `schools/demo/electricity.html` |

`games/link-grid-levels-content.html` is injected into Link Grid. It is not its own route.

No `/admin` route exists.

## Counts

Counted from the IDs in this file.

| Area | Surfaces |
| --- | ---: |
| Public | 12 |
| Family | 16 |
| School (org, microsite, demo) | 23 |
| Classroom and live lesson | 42 |
| Adventure creator | 29 |
| Games | 43 |
| Stories | 17 |
| Admin | 0 |
| **Total** | **182** |

Overlays, dialogs, and sheets are included in those totals (see Overlay index). They are not a 180th product.

Runtime review required at audit time: **182**. The migration pass below records only surfaces opened in a browser after `css/wondii-p1.css` was applied. A row stays LEGACY or MIXED in the tables until that pass marks it.

## P1 migration status

Shared tokens live in `css/wondii-tokens.css`. Customer chrome is `css/wondii-p1.css`, loaded last. Boards keep their own pieces. Nothing here is deployed.

A surface is **VISUALLY VERIFIED** only after a screenshot of that state showed paper, navy type, and navy primary buttons. These were checked:

FAM-001, FAM-006, FAM-007, FAM-009, FAM-012, FAM-013, FAM-014, SCH-001, SCH-003, SCH-007, SCH-015, SCH-017, SCH-018, SCH-022, CLS-002, CLS-009, CLS-014, CLS-024, CLS-026, CLS-027, CLS-028, CLS-029, CLS-032, CLS-033, CLS-037, CLS-038, CLS-039, CLS-040, CLS-041, CLS-042, ADV-001, ADV-002, ADV-003, ADV-005, ADV-007, ADV-011, ADV-014, ADV-021, ADV-026, GME-002, GME-003, GME-004, GME-006, GME-009, GME-018, GME-020, GME-023, GME-035, GME-039, GME-042, GME-043.

Still open after that check:

- Storybook steps STR-007, STR-008, STR-009, STR-010, STR-014, STR-017. `storybook.html` leaves the page unless `?demo=1` or `?char=1` is set, and those loads did not finish a screenshot.
- Snakes play GME-007 still uses an orange roll button. The win screen GME-008 was behind the welcome card.
- Snap play GME-010, Connect Four play, noughts win GME-016, runner crash GME-024, rock-paper-scissors result GME-026, marble end GME-030. The result nodes did not cover the screen when opened empty.
- Jigsaw GME-031 and GME-033 still use a purple Games pill in their own top bar.
- Snake game-over title GME-028 was still yellow on the shot taken before the title colour change.
- Electricity story, maths, quiz, and build (SCH-016, SCH-019, SCH-020, SCH-021) were opened and not reviewed frame by frame.
- Legacy adventure steps ADV-015 through ADV-020, ADV-022, ADV-023, ADV-025, and FAM-002, FAM-003, FAM-005 were captured and not given a fresh look after the latest skin.
- GME-005, GME-012, GME-013, GME-014, GME-015, GME-017, GME-019, GME-021, GME-022, GME-025, GME-027, GME-029, GME-034, GME-036, GME-037, GME-038, GME-040, GME-041 have screenshots that were not reviewed.

## Component trees

Real names from this repo. Functions are the renderers. There is no React component tree.

### `/` — `index.html`

```
index.html
 ├── o-bar
 ├── o-hero
 ├── o-features
 ├── o-name
 ├── o-cast
 ├── o-feel
 ├── o-stages
 ├── o-explore
 ├── o-safe
 ├── o-quotes
 ├── o-how
 ├── o-devices
 ├── o-foot
 └── dialog#tryDialog
```

Styles: `welcome.css`.

### `/portal.html`

```
portal.html
 ├── #portalGate          portal-gate.js
 ├── #orgBoot
 ├── side nav + #orgNav   js/organisation.js
 ├── [data-view=home|stories|games|puzzles|learning|favourites|search]
 │    └── portal.js renderHome/renderStories/renderGames/renderPuzzles/renderLearning/renderFavourites/renderSearch
 ├── #orgToday            schools/learn/home.js shell()  (only when an organisation is loaded)
 │    ├── hero / class cards
 │    └── class wizard    sizeStep(), pupilStep()
 ├── #orgOnboard #orgHello #orgSettings
 └── home-cast.js cast strip on the family home
```

`schools/learn/home.js` is the teacher dashboard. Root `home.js` is not referenced by any HTML file.

### `/characters.html`

```
characters.html
 ├── #chSignedOut
 ├── #chGrid
 └── #chModal
      ├── form
      ├── #chBusy
      └── #chResult
```

### `/ramsden` — `ramsden.html` + `schools/school.css` + `schools/ramsden.js`

```
ramsden.html
 ├── school-hero
 ├── #what
 ├── #lesson
 ├── #learning
 ├── #stories
 ├── #ideas
 ├── #teachers
 └── school-close
```

### `/schools/demo/electricity`

```
electricity.html
 └── #journey            electricity.js paint()
      ├── viewIntro
      ├── viewStory
      ├── viewWords
      ├── viewCircuit
      ├── viewMaths
      ├── viewQuiz
      ├── viewEngineering
      ├── viewDone
      └── viewMore
```

### `/teacher/class`

```
class.html
 └── class-room.js paint() → page()
      ├── empty account state
      ├── tabs()
      ├── scene()          floor, seats, board label, full screen
      ├── below()          today's adventure card, choose-someone card
      ├── strip()
      ├── pupilsTab()
      ├── groupsTab()
      ├── progressTab()
      ├── settingsTab()
      ├── card()           pupil overlay
      └── lessonPicker()
```

`classroom.js` is loaded here but its board UI is drawn by `present.js`, not by `page()`.

### `/teacher/learning/create`

```
create.html
 ├── flow.js (default path)
 │    ├── viewIdea
 │    ├── viewMaterial
 │    ├── viewClass
 │    ├── viewFound
 │    ├── viewChoices
 │    │    └── editFields()
 │    ├── viewAdventure
 │    ├── viewPersonal
 │    ├── viewReview
 │    ├── viewStory
 │    │    └── sheet() activity picker
 │    └── viewSaved
 └── create.js (query-param path: library, guided, prefs, feedback, pace, custom, adapt, template, example, demo)
      ├── viewQuick viewPace viewSuggest viewGap viewExisting
      ├── viewPrefs viewAdapt viewFeedback
      ├── viewSource viewMap viewActivities viewLevel viewCharacters
      ├── viewPlan viewConfirm viewGenerating viewReady viewLibrary
```

`create.js` returns before `flow.js` owns the page when those query flags are set.

### `/teacher/learning/present`

```
present.html
 └── present.js
      ├── viewAssign
      ├── viewLobby
      ├── viewRoster
      ├── viewGate
      ├── viewStage
      │    ├── storyHtml
      │    ├── questionHtml          hidden answer / revealed right / revealed wrong
      │    ├── spinHtml              classroom.js board
      │    ├── mysteryHtml
      │    ├── doorsHtml
      │    ├── doneHtml
      │    ├── rewardBar
      │    └── details.class-tools   teacher controls
      ├── viewResults
      └── viewPreview
```

### `/join`

```
join.html
 └── join.js
      ├── viewCode
      ├── viewWait
      ├── viewLive
      ├── viewTeams
      └── viewDone
```

Styles: `class.css`.

### `/games/<game>.html` (19 files, not storybook)

```
game html
 ├── own board / screens          game css + game js
 ├── .gsc scorecard               js/game-scorecard.js  (where present)
 └── wondii-shell.js
      ├── back link → portal.html#games
      ├── .wondii-kicker
      ├── details.wondii-scores    wraps .gsc
      └── .wondii-modal            How to play
```

`wondii-shell.js` returns immediately on `storybook.html`. It does not draw the board, score, pause, or results.

### `/games/storybook.html`

```
storybook.html
 ├── #sbPortalWelcome
 ├── #sbLanding
 │    ├── #sbError
 │    └── #sbLibrary / #sbShelf
 ├── #sbModal                     showWizard()
 │    ├── #sbPanel0 Who’s the hero?
 │    ├── panel 1 Who comes along?
 │    ├── panel 2 Where does it happen?
 │    ├── panel 3 What happens?
 │    ├── panel 4 How should it look?
 │    └── #sbSavedCharPanel
 ├── #sbBusy                      generation
 └── #sbBook                      showBook()
      ├── #sbCoverPanel #sbCoverTitle #sbCoverAuthor
      ├── #sbSpreadArt / #sbSpreadArtImg
      ├── #sbSpreadText
      └── #sbDownloadBook #sbShelfBook
```

Styles: `storybook-app.css` then `storybook-wondii.css`. No `wondii-shell`.

## Public

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-001 | Home bar | `/` | `o-bar` | `index.html` | index | Open the site | nav | MIXED | NO | Own `welcome.css` (88 hexes). Separate from school CSS. | Share nav tokens when a token file exists | P2 |
| PUB-002 | Hero | `/` | `o-hero` | `index.html` | index | First screen | default | MIXED | NO | Marketing layout, not the school system. | Leave until marketing is in scope | P3 |
| PUB-003 | Feature band | `/#features` | `o-features` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-004 | Name band | `/` | `o-name` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-005 | Character band | `/#characters` | `o-cast` | `index.html` | index | Scroll | default | MIXED | NO | Cast art is marketing, not the classroom floor sprites. | P3 | P3 |
| PUB-006 | Feelings band | `/#feelings` | `o-feel` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-007 | Stages band | `/#stages` | `o-stages` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-008 | Explore band | `/#explore` | `o-explore` | `index.html` | index | Scroll | default | MIXED | NO | Links into games and stories that do not share this layout. | P2 | P2 |
| PUB-009 | Safety band | `/#safe` | `o-safe` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-010 | Quotes | `/` | `o-quotes` | `index.html` | index | Scroll | carousel | MIXED | NO | Own carousel controls. | P3 | P3 |
| PUB-011 | How it works and devices | `/#how` | `o-how`, `o-devices` | `index.html` | index | Scroll | default | MIXED | NO | Same stylesheet. | P3 | P3 |
| PUB-012 | Try dialog | `/` | `dialog#tryDialog` | `index.html` | index | Try control | form / result | MIXED | NO | Local-only form. Own dialog styles. | P3 | P3 |

`welcome.html` is a redirect, not a surface.

## Family

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAM-001 | Log in | `/portal.html` | `#portalGate` `#gateTabLogin` | `portal.html`, `portal-gate.js`, `portal-gate.css` | portal | Signed out | login | MIXED | NO | Gate CSS is separate from `portal.css` and `org-portal.css`. | One account shell | P1 |
| FAM-002 | Register | `/portal.html` | `#gateTabRegister` | `portal-gate.js` | gate | Register tab | register | MIXED | NO | Same gate. | P1 | P1 |
| FAM-003 | Register intent | `/portal.html` | `#gateIntent` | `portal.html` | gate | Register | family vs school choice | MIXED | NO | Hidden until register. | P1 | P1 |
| FAM-004 | Opening boot | `/portal.html` | `#orgBoot` | `portal.html` | portal | After auth, before paint | loading | MIXED | NO | One line of copy. | P3 | P3 |
| FAM-005 | Family home | `/portal.html#home` | `[data-view=home]` | `portal.js`, `home-cast.js`, `portal.css`, `home.css` | portal | Signed in, no organisation | tiles, cast | MIXED | NO | Emoji tile icons. Child tiles still in the HTML. `is-teacher` hides them when an org exists. | Replace emoji tiles | P1 |
| FAM-006 | Stories library | `#stories` | `renderStories` | `portal.js` | portal | Stories nav | list / empty | MIXED | NO | Shelf cards differ from storybook library cards. | One book card | P1 |
| FAM-007 | Games catalogue | `#games` | `renderGames` | `portal.js` | portal | Games nav | list | MIXED | NO | Catalogue is not the in-game chrome. | P1 | P1 |
| FAM-008 | Puzzles catalogue | `#puzzles` | `renderPuzzles` | `portal.js` | portal | Puzzles nav | list | MIXED | NO | Puzzle vs game is a catalogue split, not a different engine. | P2 | P2 |
| FAM-009 | Learning catalogue | `#learning` | `renderLearning` | `portal.js` | portal | Learning nav | list | MIXED | NO | Family learning tiles are not the teacher adventure creator. | P1 | P1 |
| FAM-010 | Favourites | `#favourites` | `renderFavourites` | `portal.js` | portal | Favourites nav | list / empty | MIXED | NO | Empty state not opened. | P2 | P2 |
| FAM-011 | Search | `#search` | `renderSearch` | `portal.js` | portal | Search field | results / empty | MIXED | NO | Not opened. | P2 | P2 |
| FAM-012 | Characters signed out | `/characters.html` | `#chSignedOut` | `characters.html` | characters | Signed out | empty | LEGACY | NO | Own character CSS, 34 hexes in the HTML. | Move into portal | P1 |
| FAM-013 | Character grid | `/characters.html` | `#chGrid` | `characters.html`, `js/character-store.js` | characters | Signed in | list / empty | LEGACY | NO | Separate from classroom pupil art. | P1 | P1 |
| FAM-014 | New character form | `/characters.html` | `#chModal` | `characters.html` | grid | Add a character | form | LEGACY | NO | Modal, photo picker, name field. | P1 | P1 |
| FAM-015 | Character generating | `/characters.html` | `#chBusy` | `characters.html` | modal | Generate | loading | LEGACY | NO | Not opened. | P2 | P2 |
| FAM-016 | Character preview | `/characters.html` | `#chResult` | `characters.html` | modal | After generate | result / error | LEGACY | NO | Save and retry. Not opened. | P2 | P2 |

## School

Teacher home and org sheets live inside `portal.html`. Ramsden and the electricity demo are their own pages.

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCH-001 | Teacher today | `#home` when org loaded | `home.js` `shell()` into `#orgToday` | `schools/learn/home.js`, `schools/org-portal.css` | portal | Signed-in org member | classes, adventures, quick actions | CURRENT | PARTIAL | Latest school dashboard. `org-portal.css` still has 72 hexes. Class cards differ from adventure class cards. | Tokenise; one class card | P1 |
| SCH-002 | New class size | portal | `sizeStep()` | `home.js` | teacher today | Add a class | wizard step | CURRENT | PARTIAL | Modal built as HTML string. | Shared sheet | P2 |
| SCH-003 | New class pupils | portal | `pupilStep()` | `home.js` | wizard | After size | names and look | CURRENT | PARTIAL | Portrait helper duplicated with class room, present, and flow. | One portrait helper | P1 |
| SCH-004 | School onboard | portal | `#orgOnboard` | `portal.html`, `js/organisation.js` | portal | First school create | sheet | CURRENT | PARTIAL | Logo, colour, site, preview. | P2 | P2 |
| SCH-005 | School ready | portal | `#orgHello` | `portal.html` | portal | After create | sheet | CURRENT | PARTIAL | Invite entry point. | P3 | P3 |
| SCH-006 | School settings | portal | `#orgSettings` | `portal.html`, `organisation.js` | portal | Settings / School | sheet: logo, colour, hero, team, starters, nav | CURRENT | PARTIAL | This is the only admin-like UI. It is school-admin, not a Wondii staff console. | P2 | P2 |
| SCH-007 | Ramsden hero | `/ramsden` | `school-hero` | `ramsden.html`, `schools/school.css` | ramsden | Public microsite | hero | MIXED | NO | Accent `#c41230` in the page and `schools/ramsden.js`. | Brand from org record | P1 |
| SCH-008 | Ramsden what | `/ramsden#what` | `school-band` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | `school.css` 35 hexes. | P2 | P2 |
| SCH-009 | Ramsden lesson | `/ramsden#lesson` | `school-flow` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | Promises a lesson flow the product only partly has. | P2 | P2 |
| SCH-010 | Ramsden learning | `/ramsden#learning` | `school-learn` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | Same page system. | P2 | P2 |
| SCH-011 | Ramsden woods | `/ramsden#stories` | `school-split` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | School-specific story marketing. | P2 | P2 |
| SCH-012 | Ramsden ideas | `/ramsden#ideas` | `school-band` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | Same page system. | P3 | P3 |
| SCH-013 | Ramsden teachers | `/ramsden#teachers` | `school-split` | `ramsden.html` | ramsden | Scroll | band | MIXED | NO | Same page system. | P3 | P3 |
| SCH-014 | Ramsden close | `/ramsden` | `school-close` | `ramsden.html` | ramsden | Scroll | close | MIXED | NO | Same page system. | P3 | P3 |
| SCH-015 | Electricity intro | `/schools/demo/electricity` | `viewIntro` | `schools/demo/electricity.js`, `electricity.css` | journey | Open demo | intro | LEGACY | NO | Hardcoded Ramsden red. Own CSS (51 hexes). | Fold into adventure player or keep as a labelled demo | P1 |
| SCH-016 | Electricity story | same | `viewStory` | `electricity.js` | journey | Story step | story | LEGACY | NO | Illustrated steps, not the storybook reader. | P1 | P1 |
| SCH-017 | Electricity words | same | `viewWords` | `electricity.js` | journey | Words step | word list | LEGACY | NO | Not the family word-search game. | P1 | P1 |
| SCH-018 | Electricity circuit | same | `viewCircuit` | `electricity.js` | journey | Circuit step | interactive | LEGACY | NO | One-off board. | P1 | P1 |
| SCH-019 | Electricity maths | same | `viewMaths` | `electricity.js` | journey | Maths step | question | LEGACY | NO | Not Math Race. | P1 | P1 |
| SCH-020 | Electricity quiz | same | `viewQuiz` | `electricity.js` | journey | Quiz step | question | LEGACY | NO | Not `present.js` `questionHtml`. | P1 | P1 |
| SCH-021 | Electricity build | same | `viewEngineering` | `electricity.js` | journey | Build step | build | LEGACY | NO | One-off. | P1 | P1 |
| SCH-022 | Electricity done | same | `viewDone` | `electricity.js` | journey | Finish | completion | LEGACY | NO | Own ending. | P1 | P1 |
| SCH-023 | Electricity more | same | `viewMore` | `electricity.js` | journey | After done | extra | LEGACY | NO | Not opened. | P2 | P2 |

## Classroom and live lesson

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CLS-001 | Class missing | `/teacher/class` | `paint()` empty branch | `class-room.js` | class | Bad or foreign class id | empty | CURRENT | PARTIAL | Copy is correct. Layout is a plain `room-page`. | P2 | P2 |
| CLS-002 | Classroom floor | `class.html?tab=classroom` | `scene()` | `class-room.js`, `class-room.css` | page | Open a class | playing / idle | CURRENT | PARTIAL | Inline seat positions. Wave is CSS. Full-screen button. | Shared room frame | P1 |
| CLS-003 | Classroom empty | same | `scene()` `.room-empty` | `class-room.js` | scene | Class with no pupils | empty | CURRENT | PARTIAL | Not reopened. | P2 | P2 |
| CLS-004 | Welcome banner | `?welcome=1` | `.room-banner` | `class-room.js` | page | After class create | banner | CURRENT | PARTIAL | Not reopened. | P3 | P3 |
| CLS-005 | Choose pupils | classroom tab | `.room-banner` `#chooseContinue` | `class-room.js` | scene | Choose pupils | selection | CURRENT | PARTIAL | Not a designed modal. | P2 | P2 |
| CLS-006 | Turn line | classroom tab | `.room-turn` | `class-room.js` | scene | After choose someone | status | CURRENT | PARTIAL | Text line, not a scoreboard. | P2 | P2 |
| CLS-007 | Today and week cards | classroom tab | `below()` | `class-room.js` | page | Classroom tab | cards | CURRENT | PARTIAL | Start adventure jumps to `present.html`, a different visual system. | P0 | P0 |
| CLS-008 | Pupil strip | classroom tab | `strip()` | `class-room.js` | page | Classroom tab | list | CURRENT | PARTIAL | Duplicates pupil faces. | P3 | P3 |
| CLS-009 | Pupils tab | `?tab=pupils` | `pupilsTab()` | `class-room.js` | page | Pupils tab | list / add | CURRENT | PARTIAL | Girl/Boy chips. Remove uses `window.confirm`. | P1 | P1 |
| CLS-010 | Tables tab | `?tab=groups` | `groupsTab()` | `class-room.js` | page | Groups tab | selects | CURRENT | PARTIAL | Tables, not a visual seating chart. | P2 | P2 |
| CLS-011 | Progress tab | `?tab=progress` | `progressTab()` | `class-room.js` | page | Progress tab | participation | CURRENT | PARTIAL | Participation counts, not attainment. | P2 | P2 |
| CLS-012 | Class settings | `?tab=settings` | `settingsTab()` | `class-room.js` | page | Settings tab | rename | CURRENT | PARTIAL | Age copy only. | P3 | P3 |
| CLS-013 | Pupil card | class | `card()` | `class-room.js` | page | Tap a pupil | overlay | CURRENT | PARTIAL | Float card, not a shared dialog. | P2 | P2 |
| CLS-014 | Lesson picker | class | `lessonPicker()` | `class-room.js` | page | Start a lesson | overlay | CURRENT | PARTIAL | Links into present.html. | P1 | P1 |
| CLS-015 | Remove confirm | class | `window.confirm` | `class-room.js` | pupils or card | Remove | native dialog | UNKNOWN | NO | Browser chrome, not Wondii. | Designed confirm | P2 |
| CLS-016 | Assign mode | `present.html?assign=1` | `viewAssign()` | `present.js`, `class.css` | present | Other ways to teach | setup | MIXED | NO | Older class.css system. | One player shell | P0 |
| CLS-017 | Lobby | present | `viewLobby()` | `present.js` | present | Live session before start | lobby | MIXED | NO | Not opened. | P0 | P0 |
| CLS-018 | Roster | present | `viewRoster()` | `present.js` | present | Roster step | roster | MIXED | NO | Uses `classroom.js` animal avatars (`pip` `fox` `dino` `bun` `frog` `moon`), not floor sprites. | P0 | P0 |
| CLS-019 | Adventure gate | present | `viewGate()` | `present.js` | present | Open a journey | intro | MIXED | NO | Different intro from the class-room card. | P0 | P0 |
| CLS-020 | Stage story | present | `storyHtml()` | `present.js` | viewStage | Story slide | playing | MIXED | NO | Inline styles in the stage header. | P0 | P0 |
| CLS-021 | Stage question | present | `questionHtml()` | `present.js` | viewStage | Question slide | question hidden | MIXED | NO | Draft questions unless electricity demo. | P0 | P0 |
| CLS-022 | Answer revealed right | present | `questionHtml()` `.is-right` | `present.js` | question | Reveal or pick correct | correct | MIXED | NO | Not opened. | P0 | P0 |
| CLS-023 | Answer revealed wrong | present | `questionHtml()` try again | `present.js` | question | Reveal wrong pick | incorrect | MIXED | NO | Not opened. | P0 | P0 |
| CLS-024 | Answer bars | present | `.class-bars` | `present.js` | question | Live session reveal | scoreboard | MIXED | NO | Inline bar width. | P1 | P1 |
| CLS-025 | Spin | present | `spinHtml()` | `present.js`, `classroom.js` | viewStage | Spin slide or board | playing | MIXED | NO | Not a separate Spin game. Portrait from animal avatars or `pupil.portrait`. | P0 | P0 |
| CLS-026 | Mystery closed | present | `mysteryHtml()` | `present.js` | viewStage | Mystery slide | playing | MIXED | NO | Not a Mystery Box product. | P1 | P1 |
| CLS-027 | Mystery open | `?mystery=1` | `mysteryHtml()` | `present.js` | mystery | Open it | reward | MIXED | NO | Not opened. | P1 | P1 |
| CLS-028 | Doors | present | `doorsHtml()` | `present.js` | viewStage | Doors slide | playing | MIXED | NO | Three buttons, not a Pick a Door game. | P1 | P1 |
| CLS-029 | Door result | `?door=` | `doorsHtml()` | `present.js` | doors | After a door | feedback | MIXED | NO | Not opened. | P1 | P1 |
| CLS-030 | Stage complete | present | `doneHtml()` | `present.js` | viewStage | Last slide | completion | MIXED | NO | Reward line from board. | P0 | P0 |
| CLS-031 | Adventure missing | present | `viewStage()` empty | `present.js` | present | Journey not on this account | error | MIXED | NO | Plain sheet. | P2 | P2 |
| CLS-032 | Reward bar | present | `rewardBar()` | `present.js` | viewStage | Board mode | progress | MIXED | NO | Pips, not a team scoreboard. | P1 | P1 |
| CLS-033 | Teacher tools | present | `details.class-tools` | `present.js` | viewStage | Teacher summary | overlay | MIXED | NO | Full screen, skip, end. | Shared teacher controls | P1 |
| CLS-034 | End confirm | present | `#endYes` | `present.js` | viewStage | End session | confirm | MIXED | NO | Inline paragraph, not a dialog. | P2 | P2 |
| CLS-035 | Join chip | present | `.class-joinchip` | `present.js` | viewStage | Live mode | overlay | MIXED | NO | Not opened. | P2 | P2 |
| CLS-036 | Results | present | `viewResults()` | `present.js` | present | Session ended | results | MIXED | NO | Kicker colour `#c41230` inline. | P0 | P0 |
| CLS-037 | Teacher preview | `?preview=1` | `viewPreview()` | `present.js` | present | Preview | edit | MIXED | NO | Inline navy buttons. Must not write analytics. | P1 | P1 |
| CLS-038 | Join code | `/join` | `viewCode()` | `join.js`, `class.css` | join | Pupil opens join | setup | MIXED | NO | Own join views. | P1 | P1 |
| CLS-039 | Join waiting | `/join` | `viewWait()` | `join.js` | join | After a code | waiting | MIXED | NO | Not opened. | P1 | P1 |
| CLS-040 | Join live | `/join` | `viewLive()` | `join.js` | join | Session started | playing | MIXED | NO | Not opened. | P1 | P1 |
| CLS-041 | Join teams | `/join` | `viewTeams()` | `join.js` | join | Team mode | teams | MIXED | NO | Not opened. | P1 | P1 |
| CLS-042 | Join done | `/join` | `viewDone()` | `join.js` | join | Session ended | results | MIXED | NO | Not opened. | P1 | P1 |

## Adventure creator

Default path is `flow.js`. Legacy path is `create.js` when a query flag is present.

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADV-001 | Idea | `create.html` | `viewIdea()` | `flow.js`, `create.css` | create | Open create, or `?class=` | setup | CURRENT | PARTIAL | Prompt plus file drop. PDF/Word/photos are not read. | P1 | P1 |
| ADV-002 | Material | create | `viewMaterial()` | `flow.js` | create | After a file | review upload | CURRENT | PARTIAL | Still in `STEPS`. Easy to miss. | P1 | P1 |
| ADV-003 | Class pick | create | `viewClass()` | `flow.js` | create | Several classes | selection | CURRENT | PARTIAL | Face cards differ from teacher class cards. | P1 | P1 |
| ADV-004 | Understood | create | `viewFound()` | `flow.js` | create | After analyse | review | CURRENT | PARTIAL | Keyword analyse, not a live model. | P0 | P0 |
| ADV-005 | Choices | create | `viewChoices()` | `flow.js` | create | Make changes | form | CURRENT | PARTIAL | Time, playfulness, characters. | P1 | P1 |
| ADV-006 | Advanced fields | choices | `editFields()` | `flow.js` | choices | Advanced edit | form | CURRENT | PARTIAL | Extra fields inside choices. | P2 | P2 |
| ADV-007 | Older adventure step | create | `viewAdventure()` | `flow.js` | create | `STEPS` includes it | editor | MIXED | PARTIAL | Still registered. Not the short path. | P1 | P1 |
| ADV-008 | Personal | create | `viewPersonal()` | `flow.js` | create | Step personal | editor | MIXED | PARTIAL | Older step. | P2 | P2 |
| ADV-009 | Review | create | `viewReview()` | `flow.js` | create | Step review | review | MIXED | PARTIAL | Older step. | P2 | P2 |
| ADV-010 | Storyboard | create | `viewStory()` | `flow.js` | create | After build | ready | CURRENT | PARTIAL | Magic edit is phrase matching. Cast faces. | P0 | P0 |
| ADV-011 | Activity sheet | storyboard | `sheet()` | `flow.js` | viewStory | Replace activity | overlay | CURRENT | PARTIAL | Picker of template ids, not game engines. | P1 | P1 |
| ADV-012 | Saved | create | `viewSaved()` | `flow.js` | create | Save for later | success | CURRENT | PARTIAL | Not opened this audit. | P2 | P2 |
| ADV-013 | Legacy quick | `?custom=1` or guided entry | `viewQuick()` | `create.js` | create | Query flag | setup | LEGACY | NO | Second creator on the same URL. | Remove when flow covers it | P0 |
| ADV-014 | Legacy pace | `?pace=1` | `viewPace()` | `create.js` | create | Query | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-015 | Legacy suggest | create.js path | `viewSuggest()` | `create.js` | create | Guided | list | LEGACY | NO | Same. | P1 | P1 |
| ADV-016 | Legacy gap | create.js path | `viewGap()` | `create.js` | create | Guided | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-017 | Legacy existing | create.js path | `viewExisting()` | `create.js` | create | Guided | list | LEGACY | NO | Same. | P1 | P1 |
| ADV-018 | Legacy prefs | `?prefs=1` | `viewPrefs()` | `create.js` | create | Query | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-019 | Legacy adapt | `?adapt=` | `viewAdapt()` | `create.js` | create | Query | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-020 | Legacy feedback | `?feedback=1` | `viewFeedback()` | `create.js` | create | Query | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-021 | Legacy source | `?guided=1` | `viewSource()` | `create.js` | create | Query | form | LEGACY | NO | Same. | P1 | P1 |
| ADV-022 | Legacy map | create.js path | `viewMap()` | `create.js` | create | Guided | review | LEGACY | NO | Same. | P1 | P1 |
| ADV-023 | Legacy activities | create.js path | `viewActivities()` | `create.js` | create | Guided | picker | LEGACY | NO | Activity ids are templates. | P1 | P1 |
| ADV-024 | Legacy level | create.js path | `viewLevel()` | `create.js` | create | Guided | form | LEGACY | NO | Same. | P2 | P2 |
| ADV-025 | Legacy characters | create.js path | `viewCharacters()` | `create.js` | create | Guided | picker | LEGACY | NO | Not the class-room cast. | P1 | P1 |
| ADV-026 | Legacy plan | create.js path | `viewPlan()` | `create.js` | create | Guided | review | LEGACY | NO | Same. | P1 | P1 |
| ADV-027 | Legacy confirm | create.js path | `viewConfirm()` | `create.js` | create | Guided | confirm | LEGACY | NO | Same. | P2 | P2 |
| ADV-028 | Legacy generating | create.js path | `viewGenerating()` | `create.js` | create | Generate | loading | LEGACY | NO | Timed wait, not a live model. | P0 | P0 |
| ADV-029 | Legacy ready and library | `?library=1` and `viewReady()` | `viewReady()` `viewLibrary()` | `create.js` | create | Library query or guided end | results / list | LEGACY | NO | Second library beside flow saved and teacher today. | P0 | P0 |

Template ids in `teach.js` (quick_quiz, vocabulary, story, stem, retrieval, exit_ticket, starter, matching, sequencing, end_topic) are planner cards. They are not playable games. They appear inside ADV-011 and ADV-023.

## Games

Shell chrome is shared. Each board is its own product. States below are ones the markup or script actually branches on. Missing pause, correct, or results rows mean that state was not found, not that it was redesigned.

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GME-001 | How to play | any of the 19 games | `.wondii-modal` | `games/wondii-shell.js`, `wondii-shell.css` | game nav | ? button | help | MIXED | PARTIAL | Hides the page lede and shows it here. Does not style the board. | Keep as shell help | P2 |
| GME-002 | Scores disclosure | games that contain `.gsc` | `details.wondii-scores` | `wondii-shell.js`, `js/game-scorecard.js` | game | Scores summary | scoreboard | MIXED | PARTIAL | Wraps the old scorecard. Does not replace it. | One scoreboard | P1 |
| GME-003 | Memory setup | `/games/memory.html` | `#screenSetup` | `memory.html`, `memory.css`, `memory.js` | memory | Open | setup | LEGACY | NO | Shell only adds chrome. | Game shell later | P1 |
| GME-004 | Memory play | memory | `#screenPlay` | `memory.html` | memory | Start | playing | LEGACY | NO | Own board. | P1 | P1 |
| GME-005 | Memory win line | memory | `#memoryWin` | `memory.html` | play | All pairs | completion | LEGACY | NO | Inline status, not a results page. | P1 | P1 |
| GME-006 | Snakes setup | `/games/snakes-ladders.html` | `#screenSetup` | `snakes-ladders.html` | snakes | Open | setup | LEGACY | NO | `snakes-ladders.css` has 155 hexes. | P1 | P1 |
| GME-007 | Snakes play | snakes | `#screenGame` | `snakes-ladders.html` | snakes | Start | playing | LEGACY | NO | Own board. | P1 | P1 |
| GME-008 | Snakes win | snakes | `#screenWin` | `snakes-ladders.html` | snakes | Finish | results | LEGACY | NO | Own win screen. | P1 | P1 |
| GME-009 | Snap setup | `/games/snap.html` | `#screenSetup` | `snap.html` | snap | Open | setup | LEGACY | NO | `snap.css` 97 hexes. | P1 | P1 |
| GME-010 | Snap play | snap | `#screenPlay` | `snap.html` | snap | Start | playing | LEGACY | NO | Own board. | P1 | P1 |
| GME-011 | Snap rules | snap | `#snapRulesModal` | `snap.html` | snap | Rules | help | LEGACY | NO | Second help beside GME-001. | P2 | P2 |
| GME-012 | Connect Four setup | `/games/connect-four.html` | `#screenSetup` | `connect-four.html` | connect four | Open | setup | LEGACY | NO | Win screen not found in HTML. | P1 | P1 |
| GME-013 | Connect Four play | connect four | `#screenPlay` | `connect-four.html` | connect four | Start | playing | LEGACY | NO | Completion needs a runtime look. | P1 | P1 |
| GME-014 | Noughts setup | `/games/noughts-crosses.html` | `#screenSetup` | `noughts-crosses.html` | noughts | Open | setup | LEGACY | NO | Own CSS, 57 hexes. | P1 | P1 |
| GME-015 | Noughts play | noughts | `#screenPlay` | `noughts-crosses.html` | noughts | Start | playing | LEGACY | NO | Side stats on the board. | P1 | P1 |
| GME-016 | Noughts win | noughts | `#tttWinOverlay` | `noughts-crosses.html` | play | Win or draw | results | LEGACY | NO | Own overlay. | P1 | P1 |
| GME-017 | Math Race setup | `/games/math-race.html` | `#screenSetup` | `math-race.html` | math race | Open | setup | LEGACY | NO | `math-race.css` 105 hexes. | P1 | P1 |
| GME-018 | Math Race play | math race | `#screenPlay` | `math-race.html` | math race | Start | playing | LEGACY | NO | Own track. | P1 | P1 |
| GME-019 | Math Race question | math race | `#questionModal` | `math-race.html` | play | A sum | question | LEGACY | NO | Correct and incorrect branches not separated in HTML. | P1 | P1 |
| GME-020 | Math Race win | math race | `#screenWin` | `math-race.html` | math race | Finish | results | LEGACY | NO | Own screen. | P1 | P1 |
| GME-021 | Math Race lose | math race | `#screenLose` | `math-race.html` | math race | Fail | results | LEGACY | NO | Own screen. | P1 | P1 |
| GME-022 | Runner setup | `/games/runner.html` | `#setup` | `runner.html`, `runner.js` | runner | Open | setup | LEGACY | NO | Name, place, character. `runner.js` has many inline colours. | P1 | P1 |
| GME-023 | Runner play | runner | canvas / app | `runner.js` | runner | Start | playing | LEGACY | NO | Not opened. | P1 | P1 |
| GME-024 | Runner crash | runner | `#overlay` | `runner.html` | runner | Hit | results | LEGACY | NO | "Ouch!" overlay. | P1 | P1 |
| GME-025 | Rock paper scissors play | `/games/rock-paper-scissors.html` | app | `rock-paper-scissors.js` | rps | Open | playing | LEGACY | NO | Countdown is inside play. | P1 | P1 |
| GME-026 | Rock paper scissors win | rps | `#rpsWinOverlay` | `rock-paper-scissors.html` | rps | Round end | results | LEGACY | NO | Own overlay. | P1 | P1 |
| GME-027 | Snake play | `/games/snake-arcade.html` | canvas | `snake-arcade.js` | snake | Open | playing | LEGACY | NO | Own CSS. | P1 | P1 |
| GME-028 | Snake game over | snake | `#snakeOverlay` | `snake-arcade.js` | snake | Collision | results | LEGACY | NO | Title set to "Game over". | P1 | P1 |
| GME-029 | Marble play | `/games/marble-tilt.html` | `#app` | `marble-tilt.html` | marble | Open | playing | LEGACY | NO | End node exists. | P1 | P1 |
| GME-030 | Marble end | marble | `#tiltEnd` | `marble-tilt.html` | marble | Finish | completion | UNKNOWN | NO | Node exists. Contents not read as a full results screen. | P1 | P1 |
| GME-031 | Jigsaw setup | `/games/jigsaw.html` | `.jz-setup` | `jigsaw.html`, `jigsaw.css`, `jigsaw.js` | jigsaw | Open | setup | LEGACY | NO | Emoji stars in the title. Root `jigsaw.js` is the live script. | P1 | P1 |
| GME-032 | Jigsaw intro | jigsaw | `#boardIntro` | `jigsaw.html` | board | Before pieces | intro | LEGACY | NO | Same page as the board. | P2 | P2 |
| GME-033 | Jigsaw play | jigsaw | `#board` `#playArea` | `jigsaw.html` | jigsaw | Start | playing | LEGACY | NO | Completion state not named in the HTML sample. | P1 | P1 |
| GME-034 | Word search | `/games/word-search.html` | `.word-search-app` | `word-search.html`, `word-search.css`, `word-search.js` | word search | Open | playing | LEGACY | NO | No setup/results ids found. `word-search.css` 56 hexes. | P1 | P1 |
| GME-035 | Colouring studio | `/games/colouring.html` | `.colour-app` | `colouring.html`, `colouring.css` | colouring | Open | playing | LEGACY | NO | `#templateOverlay` is art, not a dialog. 84 hexes in CSS. | P1 | P1 |
| GME-036 | Block stack | `/games/block-stack.html` | `#board` | `block-stack.html`, `block-stack.css` | block stack | Open | playing | LEGACY | NO | End state not found in HTML. | P1 | P1 |
| GME-037 | Zuma | `/games/zuma.html` | `.zuma-app` | `zuma.html`, `zuma.css` | zuma | Open | playing | LEGACY | NO | End state not found in HTML. | P1 | P1 |
| GME-038 | Drive Mad | `/games/drive-mad.html` | `.drive-mad-app` | `drive-mad.html`, `drive-mad.css` | drive mad | Open | playing | LEGACY | NO | End state not found in HTML. | P1 | P1 |
| GME-039 | Link Grid levels | `/games/link-grid.html` | level list | `link-grid.html`, `link-grid-main.js`, `link-grid-levels-content.html` | link grid | Open | setup | LEGACY | NO | Split across maze, bootstrap, part-a, shapes, main. | P1 | P1 |
| GME-040 | Link Grid maze | link grid | maze | `link-grid-maze.js`, `link-grid-main.js` | link grid | Pick a level | playing | LEGACY | NO | Own board. | P1 | P1 |
| GME-041 | Link Grid complete | link grid | `completeLevel()` | `link-grid-main.js` | maze | Path joined | completion | LEGACY | NO | Adds `did-complete` on the level list. Stored in `linkGridCompletedLevels` (not account-scoped). | P1 | P1 |
| GME-042 | Star Catcher | `/games/star-catcher.html` | page | `star-catcher.html` | star catcher | Open | playing | LEGACY | NO | Title uses star emoji. About 40 hexes in the HTML. End state not found. | P1 | P1 |
| GME-043 | Prompt game | `/games/prompt-game.html` | page | `prompt-game.html`, `prompt-game.css` | prompt game | Open | playing | LEGACY | NO | "Make a 3D game". End state not found. | P1 | P1 |

## Stories

| ID | Surface | Route | Component | File | Parent | Reach | State | Gen | Tokens | Problems | Refactor | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STR-001 | Landing | `/games/storybook.html` | `#sbLanding` | `storybook.html`, `storybook.js` | storybook | Open | setup | MIXED | NO | `storybook-app.css` (190 hexes) plus `storybook-wondii.css` (83). | P0 | P0 |
| STR-002 | Welcome back | storybook | `#sbPortalWelcome` | `storybook.html` | storybook | Return visit | overlay | MIXED | NO | Own overlay. | P2 | P2 |
| STR-003 | Library | storybook | `#sbLibrary` `#sbShelf` | `storybook.js` | landing | Has books, or empty hint | list / empty | MIXED | NO | Different card from portal stories. | One book card | P0 |
| STR-004 | Landing error | storybook | `#sbError` | `storybook.html` | landing | Failed start | error | MIXED | NO | Not opened. | P2 | P2 |
| STR-005 | Hero step | storybook | `#sbPanel0` | `storybook.js` `STEP_HEADINGS[0]` | `#sbModal` | Start journey | setup | MIXED | NO | Name, photo, saved characters. | P0 | P0 |
| STR-006 | Friend step | storybook | panel 1 | `storybook.js` | wizard | Next | selection | MIXED | NO | Buddy art is a fixed family list in the generator, not classroom sprites. | P0 | P0 |
| STR-007 | Place step | storybook | panel 2 | `storybook.js` | wizard | Next | selection | MIXED | NO | Not opened. | P1 | P1 |
| STR-008 | Plot step | storybook | panel 3 | `storybook.js` | wizard | Next | form | MIXED | NO | Starters and speak. | P1 | P1 |
| STR-009 | Look step | storybook | panel 4 | `storybook.js` | wizard | Next | style, colour, spread layout | MIXED | NO | Book colour chips are local. | P1 | P1 |
| STR-010 | Saved characters | wizard | `#sbSavedCharPanel` | `storybook.html` | hero step | Make / pick | overlay | MIXED | NO | Links to `characters.html`. | P1 | P1 |
| STR-011 | Wizard error | wizard | `#sbModalError` | `storybook.html` | modal | Validation | error | MIXED | NO | Not opened. | P2 | P2 |
| STR-012 | Generating | storybook | `#sbBusy` | `storybook.html`, `storybook.js` | storybook | Make my book | loading | MIXED | NO | Progress copy also comes from `clever-service`. Not opened. | P0 | P0 |
| STR-013 | Cover | `#sbBook` | `#sbCoverPanel` | `storybook.js` `showBook()` | reader | Book opens | cover | MIXED | NO | HTML title on the lineup image. Not a separate cover render. | P0 | P0 |
| STR-014 | Spread picture | reader | `#sbSpreadArt` | `storybook.js` | book | Turn a page | picture | MIXED | NO | Peel, flyleaf, and outgoing art are parts of this renderer. | P1 | P1 |
| STR-015 | Spread text | reader | `#sbSpreadText` | `storybook.js` | book | Page with words | text | MIXED | NO | Font picked from Fredoka, Schoolbell, Sniglet, Kalam, Patrick Hand, Comic Neue. | P0 | P0 |
| STR-016 | Reader chrome | reader | `#sbReaderDismiss` `#sbReaderFullscreen` | `storybook.html` | book | While reading | chrome | MIXED | NO | Not the game shell. | P2 | P2 |
| STR-017 | Download and shelf | reader | `#sbDownloadBook` `#sbShelfBook` | `storybook.js` | book | Book actions | share / save | MIXED | NO | Download is standalone HTML, not a share dialog. | P1 | P1 |

## Admin

No staff admin surface exists. There is no schools console, user console, microsite editor, generation queue, QA board, cost board, or feature-flag screen.

`SCH-006` is the closest UI. It edits one organisation for a member (logo, colour, site, hero, invites, story starters, nav links). It is not a Wondii-internal admin.

## Overlay index

These IDs are already in the tables. Listed once so overlays are not mistaken for "part of the page."

| ID | Kind |
| --- | --- |
| PUB-012 | dialog |
| FAM-001 FAM-002 FAM-003 | auth dialog |
| FAM-014 FAM-015 FAM-016 | character modal |
| SCH-002 SCH-003 | class wizard |
| SCH-004 SCH-005 SCH-006 | org sheets |
| CLS-013 | pupil card |
| CLS-014 | lesson picker |
| CLS-015 | native confirm |
| CLS-033 | teacher details |
| CLS-034 | end confirm (inline) |
| CLS-035 | join chip |
| ADV-011 | activity sheet |
| GME-001 | help modal |
| GME-002 | scores disclosure |
| GME-011 | snap rules |
| GME-016 | noughts win |
| GME-019 | math question |
| GME-024 | runner overlay |
| GME-026 | rps win |
| GME-028 | snake overlay |
| STR-002 | welcome |
| STR-005 to STR-011 | wizard modal and saved-character panel |
| STR-012 | busy |

Not found as designed UI: toast system, drawer system, popover system, tooltip system, share dialog, regenerate dialog, delete confirmation other than `window.confirm` and the present end-paragraph.

## Names that are not implementations

Searched. These are not separate games or screens:

| Name | What exists instead |
| --- | --- |
| Quick Quiz, Retrieval, Exit ticket, Lesson starter | `teach.js` template ids. Played, if at all, as `present.js` `questionHtml` or the electricity demo. |
| Spin & Answer, Wheel of Wonder | `spinHtml()` inside the adventure stage. |
| Pick a Door | `doorsHtml()`. |
| Mystery Box | `mysteryHtml()`. |
| Match It, Sort It, Sequencing | template ids `matching` and `sequencing`. No match board or sort board. |
| Treasure Hunt, Race to the Finish, Boss Battle, Picture Reveal, Crossword, True or False, Drag & Drop | No file, route, or renderer. |
| Number Quiz | Math Race is the family game. Electricity `viewMaths` is the demo. |
| Word Search as a lesson | Family game is `word-search.html`. Lesson template `word_search` is not that file. |
| Memory Game as a lesson | Family game is `memory.html`. Not mounted in the adventure player. |

## Unreachable or unused files

| File | Why it is not a surface |
| --- | --- |
| `home.js` (repo root) | No HTML script tag loads it. |
| `games/link-grid-levels-content.html` | Fragment loaded by Link Grid. |
| `.claude/worktrees/elastic-hawking-ed665e/**` | Duplicate tree. Not served. |

## Generation totals

| Generation | Surfaces |
| --- | ---: |
| LEGACY | 71 |
| MIXED | 80 |
| CURRENT | 29 |
| UNKNOWN | 2 |
| Runtime review required | 182 |

CURRENT rows are SCH-001–006, CLS-001–014, ADV-001–006 and ADV-010–012 (29). They are the latest school UI. They still hardcode colour and type. They are not a finished design system.

UNKNOWN is CLS-015 (the browser confirm) and GME-030 (marble end node).
