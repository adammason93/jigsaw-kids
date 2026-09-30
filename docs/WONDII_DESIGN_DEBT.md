# Wondii design debt

Rebuild programme: Phase 0 baseline is `docs/rebuild/PHASE_00_BASELINE.md`. Phase 1 data foundation is `docs/rebuild/PHASE_01_DATA_FOUNDATION.md`. Phase 2 design system is `docs/rebuild/PHASE_02_DESIGN_SYSTEM.md`. Phase 3 teacher portal is `docs/rebuild/PHASE_03_SCHOOL_PORTAL.md`.

`css/wondii-tokens.css` is the canonical token set. `css/wondii-system.css` is the opt-in component layer. `css/wondii-p1.css` is an earlier skin that restyles old class names. It is not the design system. The internal reference is `/design-system.html`.

The debt below is still open. Phase 2 did not migrate the 182 surfaces. Phase 3 replaced the teacher dashboard wizard and the class-page confirm with the shared shell. Phase 5 replaced the adventure player chrome with `WondiiLessonShell`. Phase 7 replaced the create route with Creator V2. It did not migrate the family game boards or the Ramsden public page.

Phase 3 removed the teacher-home size wizard, the per-pupil wizard on that dashboard, and `window.confirm` for removing a pupil. Family Stories, Games, Puzzles, Learning, My World, and Favourites stay in the DOM and are hidden only while an organisation is loaded. Custom organisation nav links are hidden in that same state so they are not extra primary items.

Still later: storybook, family catalogues, school settings sheets, Ramsden microsite CSS, electricity demo, deleting a whole class, and a results experience beyond the session list. Creator V2 is the create route. `flow.js` and `create.js` remain in the repo and are not loaded. `present.html?edit=1` is still the older question form. The classroom player chrome is the Phase 5 lesson shell. Quiz, Spin a pupil, and Word Search are canonical mechanics. Story, mystery, and doors are still adapters. Five family pilots now use GameShell V2: Noughts and Crosses, Memory, family Word Search, Colouring, and Snake. Their boards still use their own CSS. The other family games stay on `wondii-shell`. Family Word Search does not use the classroom word-search generator.

A surface moves LEGACY → IN PROGRESS → MIGRATED → VISUALLY VERIFIED only after it is checked against `docs/WONDII_VISUAL_SURFACE_REGISTRY.md`. A header change does not migrate the board behind it.

This audit's score, from the registry:

| | |
| --- | ---: |
| Total surfaces | 182 |
| Current (latest school UI, still not tokenised) | 29 |
| Mixed | 80 |
| Legacy | 71 |
| Unknown | 2 |
| Migrated and visually verified in this audit | 0 |
| Runtime review required | 182 |

## P0 — broken or inconsistent core journey

The teacher path changes visual product in the middle.

1. Class room (`class-room.css`, CLS-002–CLS-014) and the lesson player are still different layouts. "Start adventure" leaves the floor. The player is now `WondiiLessonShell` and uses the class portraits. It is not the floor scene.
2. `flow.js` and `create.js` are no longer loaded by `create.html`. They remain in the repo. Creator V2 is the only route. Old query flags such as `guided` and `prefs` open the new opening screen.
3. Storybook (STR-001–STR-017) is a third product: `storybook-app.css` (190 hexes) plus `storybook-wondii.css` (83). The reader font is picked from Fredoka, Schoolbell, Sniglet, Kalam, Patrick Hand, or Comic Neue.
4. Family home (FAM-005) still uses emoji as the tile icons (`📖` `🎮` `🧩` `💡`) while the teacher home in the same portal uses the school cards.
5. The old present results kicker is gone. Completion is the lesson shell and links to portal `#results`. The teacher question form (`?edit=1`) still uses `class.css`.
6. `linkGridCompletedLevels` is still the raw key at the call site. `score-cloud.js` scopes it, and the colouring autosave preference, when an account is bound. Signed-out writes to those keys are dropped.

## P1 — legacy customer-facing UI

1. Unmigrated family play boards still use `wondii-shell` as chrome only. The five pilots use GameShell V2 for the frame and still keep their own board CSS. Largest own stylesheets: `snakes-ladders.css` 155 hexes, `math-race.css` 105, `snap.css` 97, `colouring.css` 84, `noughts-crosses.css` 57, `connect-four.css` 57, `word-search.css` 56, `memory.css` 40, `jigsaw.css` 42, `runner.css` 39. `runner.js` itself has about 98 hex matches.
2. `characters.html` (FAM-012–FAM-016), its own modal and about 34 hexes in the page.
3. Electricity demo (SCH-015–SCH-023), own CSS, hardcoded `#c41230`, and a back link aimed at Ramsden.
4. Ramsden microsite (SCH-007–SCH-014). The accent is written into the page and `schools/ramsden.js` instead of coming only from the organisation record.
5. Join (CLS-038–CLS-042) uses `class.css`, not the class room.
6. Portal catalogues (FAM-006–FAM-011) and the storybook shelf are different book and game cards.
7. `classroom.js` still has preset animal avatars for older board helpers. The lesson shell shows a known pupil's class portrait. An anonymous joiner gets an initial, not a stored portrait.

## P2 — mixed design

1. Public homepage `welcome.css` (88 hexes) and portal `portal.css` (82) plus `portal-app.css` (51) plus `home.css` (60) plus `portal-gate.css` (18). One account, five stylesheets.
2. `org-portal.css` (72 hexes) is the newest school skin and still not tokens. It sits on top of portal CSS.
3. `wondii-shell.css` still loads Fredoka and Nunito on unmigrated games. GameShell V2 (`games/game-shell.css`) is the frame for the five pilots. `js/game-scorecard.js` is still the stored score adapter. Pilots hide the visible `.gsc` card. Unmigrated games still show it. Canvas games (Snake, Colouring, and the unmigrated arcade boards) are not keyboard cell grids.
4. Storybook wondii layer on top of the old app CSS.
5. `flow.js` still contains the old step list, but that file is not on the create route.
6. Native `window.confirm` for removing a pupil (CLS-015). Ending a lesson is now a dialog in the lesson shell (CLS-034).
7. Help is duplicated: shell modal (GME-001) and Snap's own rules modal (GME-011).

## P3 — polish

1. Marketing bands on `/` and the lower Ramsden bands.
2. Quote carousel, try dialog, boot line, welcome banner.
3. Emoji in the jigsaw title and the Star Catcher title.
4. Full-screen buttons implemented separately on the class room, the present stage, and the storybook reader.

## Duplication (do not merge yet)

| Pattern | Copies | Same job? |
| --- | --- | --- |
| Class card | `teach-class` in `home.js`, `learn-class` in `flow.js`, `room-card` in `class-room.js` | Same idea, three markups |
| Portrait URL | `class-room.js`, `home.js`, `present.js`, `flow.js` | Same age prefix and hair files, copied |
| Name → girl/boy | `class-room.js`, `home.js`, `present.js` | Same lists, copied |
| Primary button | `.room-go`, `.learn-btn`, `.teach-go`, `.o-btn`, `.class-btn`, `.sb-btn`, per-game buttons | Same role, different CSS |
| Quiet button | `.room-ghost`, `.learn-ghost`, `.teach-quiet`, `.class-ghost` | Same role |
| Book card | Portal `renderStories`, storybook `#sbShelf` | Same library, two cards |
| Game card | Portal `renderGames` / `renderPuzzles` | Catalogue only. Not a play board |
| Score | `game-scorecard.js`, lesson-shell scoreboard, portal results list, noughts side stats, RPS overlay score | Family boards and the classroom still differ |
| Help | `wondii-modal`, `#snapRulesModal`, storybook step read-aloud | Overlapping |
| Adventure library | Teacher today, `viewSaved`, `viewLibrary` | Three lists of the same drafts |
| Lesson quiz | `questionHtml`, electricity `viewQuiz` | Two quiz UIs |
| Word activity | `word-search.html`, electricity `viewWords`, template `word_search` | Three different things |

`GameCard`, `LearningGameCard`, `ActivityCard`, `PuzzleCard`, and `QuizCard` do not exist as components. Portal render functions and `teach.js` template objects are the real duplicates.

## Component consolidation plan

Build shared pieces only where the registry shows the same job repeated. Do not wrap every game in one component.

| Future piece | Would replace | Leave alone |
| --- | --- | --- |
| Tokens (colour, type, space, radius, shadow, motion) | Hex and font repeats below | Per-game art |
| Button and quiet button | The button classes listed above | — |
| Sheet / dialog | Org sheets, class wizard, pupil card, character modal, activity sheet, native confirm | Browser `alert` until replaced |
| Page header | Portal bar, class `room-top`, present header, game nav, storybook chrome | Marketing `o-bar` until that page is in scope |
| Class card and portrait | The three cards and four portrait helpers | — |
| Empty, loading, error | Boot, class missing, adventure missing, library hints, `#sbBusy`, character `#chBusy` | — |
| Book card | Portal stories and storybook shelf | Reader spread |
| Scoreboard | Family `.gsc` still. Classroom scores are the lesson shell. | Participation tab, which is not a score |
| Teacher controls | Lesson shell dock and teacher menu | Family game controls |
| Result screen | `#screenWin`, `#screenLose`, overlays. Classroom completion is the lesson shell. | Portal `#results` list |

### Classroom shell

`WondiiLessonShell` is the classroom player (`schools/learn/lesson-shell.js`, `lesson-shell.css`, `lesson-mechanics.js`). `present.js` paints that shell. It reads `WondiiSessionEngine` and does not calculate scores.

What it owns: title, school name and logo, round progress, the stage, the scoreboard, the teacher dock, pause, join waiting, recovery, recoverable error, round transition, completion, and the end dialog.

Quiz, Spin a pupil, and Word Search now mount inside the stage. Story, mystery, and doors are still adapters. `?edit=1` is still the old question form. Family `wondii-shell.js` stays the family header. Family Word Search stays `games/word-search.html`.

School accent is identity (logo, name, a progress underline). Primary buttons stay navy. Correct and try-again colours stay semantic.

## Tokens today

There is no token file. No Tailwind. Values are repeated in CSS and in inline styles.

Colour, counted as hex matches in product CSS/HTML/JS (worktrees excluded). Largest files:

| File | Hex matches |
| --- | ---: |
| `games/storybook-app.css` | 190 |
| `games/snakes-ladders.css` | 155 |
| `games/math-race.css` | 105 |
| `games/snap.css` | 97 |
| `welcome.css` | 88 |
| `games/storybook-wondii.css` | 83 |
| `portal.css` | 82 |
| `games/colouring.css` | 84 |
| `schools/org-portal.css` | 72 |
| `home.css` | 60 |
| `games/noughts-crosses.css` | 57 |
| `games/connect-four.css` | 57 |
| `games/word-search.css` | 56 |
| `schools/demo/electricity.css` | 51 |
| `portal-app.css` | 51 |
| `jigsaw.css` | 42 |
| `games/memory.css` | 40 |
| `games/runner.css` | 39 |
| `js/game-scorecard.css` | 38 |
| `schools/learn/class.css` | 37 |
| `schools/school.css` | 35 |
| `characters.html` | 34 |
| `js/kids-core.css` | 34 |
| `schools/learn/create.css` | 32 |
| `games/runner.js` | 98 |
| `games/storybook.js` | 40 |
| `games/star-catcher.html` | 40 |

Navy `#141b4d` is repeated as a literal, including `orgColour` default `#141b4d` and preview buttons in `present.js`. Ramsden `#c41230` is literal in `ramsden.html`, `schools/ramsden.js`, `schools/demo/electricity.css`, and `present.js` results/preview kickers.

Type: Fredoka and Nunito are linked by the shell, the portal, and storybook. Storybook also offers Schoolbell, Sniglet, Kalam, Patrick Hand, Comic Neue. Marketing uses its own stack in `welcome.css`.

Spacing, radius, shadow, and motion are local to each stylesheet. This audit did not catalogue every `border-radius` and `box-shadow`. That pass is still open. Inline style is confirmed in `present.js` (header, results kicker, preview inputs and buttons, bar widths) and in `class-room.js` seat geometry.

Icons: inline SVG in the portal nav. Emoji as icons on the family home tiles, the jigsaw title, and Star Catcher. No second icon library was found.

## What not to say

Do not report "all pages updated", "all games redesigned", or "design system applied everywhere".

The only honest migration line until the registry changes is:

182 total. 0 migrated. 29 current-but-not-tokenised. 80 mixed. 71 legacy. 2 unknown. 182 runtime review required.
