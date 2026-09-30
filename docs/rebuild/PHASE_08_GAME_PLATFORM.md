# Phase 8 — Unified games and activities platform

Recorded 30 September 2026. This phase adds a standalone game shell and moves five pilots onto it. It does not migrate the other family games, and it does not change the classroom session engine.

## Taxonomy

| Category | Runtime | Examples |
| --- | --- | --- |
| Lesson mechanic | `WondiiSessionEngine` and `WondiiLessonShell` | Quiz, Spin a pupil, classroom Word Search |
| Standalone game | `WondiiGameShell` or the older `wondii-shell` | Memory, Snake, Noughts and Crosses, Colouring |
| Shared engine | Not a catalogue item | Classroom `generateWordSearch`. Family placement stays in `games/word-search.js` |
| Demo | Not a production game | Electricity demo |
| Legacy | Still reachable | The family games that are not the five pilots |

Lesson creation keeps using the mechanic registry. The family catalogue uses `games/game-platform.js`.

## GameShell

`games/game-shell.js` draws the frame: title, Games link, Help, Pause, Full screen, and the result or error dialog. The game file still owns the board, the cards, the canvas, and the rules.

States are `setup`, `ready`, `playing`, `paused`, `complete`, and `error`. A game does not need a separate screen for every state. Snake has no setup page. Colouring has no score and no win screen.

The contract checked by tests is `id`, `title`, `category`, `description`, `help`, and `score`, plus `transition`, `result`, and account key helpers. Pilots already mount their own DOM. `games/pilot-bridge.js` listens for their existing win, pause, and replay controls and tells the shell. The shell does not know how a match or a snake step works.

`games/wondii-shell.js` returns immediately when `data-game-shell="v2"`. The five pilots do not load it, so they do not get a second back button, help button, or score disclosure.

## Registry

`WondiiGamePlatform.portalCards()` is what `portal.js` renders. The five pilots are `current` and `shell: "v2"`. Other standalone games are `legacy`. Runner is registered and is not a portal card. Quiz, spin, and `word_search` are absent.

## Score and result

The shell dialog is the completion surface on the pilots. Colouring has `score: "none"`, so the frame has no score slot.

A result may include `outcome`, `score`, `winner`, `duration`, `moves`, `difficulty`, and `completedAt`. Empty fields are omitted. These are family-game results, not school attainment.

`js/game-scorecard.js` still stores totals for Memory, Noughts and Crosses, and family Word Search. The visible `.gsc` card is hidden on those pilots. Unmigrated games still show that card inside `wondii-shell`. There is one stored score adapter and one visible completion dialog on the pilots.

## Persistence

Account keys use `wondii-u:<uid>:<key>` in both the platform helper and `js/score-cloud.js`.

`jigsawKidsColouringAutoSaveV1` is now an account-local key, with the existing colouring gallery key. `linkGridCompletedLevels` was already in the score-cloud list. The Link Grid call site still passes that raw name. The scope is applied only when `score-cloud.js` is loaded and an account is bound. Signed-out writes to those keys are dropped, so a signed-out score total does not stick.

A browser check bound account A, wrote a colouring picture, the autosave preference, and Link Grid progress, then bound account B. B read null for all three. A still read its own picture after B wrote a different one.

## Word search

Family Word Search places a random handful of 4–5 letter words, horizontal or vertical, forward or reverse, and builds a new grid every time. Classroom `generateWordSearch` is seeded, uses the lesson vocabulary, and its easy mode is forward-only. Sharing that function would change the family game. The two algorithms stay separate.

`SOFIA` and `TILLY` were removed from the family word pool.

## Pilots

| Game | What moved | What stayed |
| --- | --- | --- |
| Noughts and Crosses | Frame, help, result dialog. Old win overlay hidden | Modes, character faces, board rules |
| Memory | Frame, help, result dialog. Duplicate play header hidden | Card matching |
| Word Search | Frame, help, result dialog | Family placement rules |
| Colouring | Frame and help. No score | Canvas, tools, colours, save |
| Snake | Frame, help, pause, result. Old overlay hidden | Canvas loop, arrows, on-screen buttons |

Snake pause clicks the game's own pause control so the interval stops. A refresh starts a new run. The best score is the persisted piece.

## Accessibility

Shell buttons are real buttons with a visible focus ring. Help and result dialogs have a heading and actions. Memory and Noughts controls are buttons. Snake moves with the arrow keys and labelled on-screen buttons. Word Search is a pointer drag. Colouring and Snake canvases are not described stroke by stroke or cell by cell. Reduced motion skips shell decoration and Memory's match animation. The snake still moves, because movement is the game.

## Still legacy

Snakes and Ladders, Snap, Connect Four, Math Race, Runner, Rock Paper Scissors, Marble Tilt, Jigsaw, Block Stack, Zuma, Drive Mad, Link Grid, Star Catcher, Prompt game.

Storybook and My Characters are not GameShell games. The electricity demo is a demo.
