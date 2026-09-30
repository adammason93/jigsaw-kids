# Wondii game matrix

Rebuild programme: Phase 0 baseline is `docs/rebuild/PHASE_00_BASELINE.md` (30 September 2026). No game moved to a lesson shell or a session engine.

Discovery only. Cells are what the source shows. `Runtime` means the markup does not name that state, so it was not invented. This audit did not play the games.

`wondii-shell.js` is on the 19 family games and not on `storybook.html`. It adds a back link, a kicker, a help modal, and a scores disclosure. It does not draw the board.

Shared scorecard (`js/game-scorecard.js`) is linked from: Memory, Snakes and Ladders, Snap, Connect Four, Noughts and Crosses, Math Race, Runner, Word Search, Jigsaw. The other family games do not link it.

## Family games

| Game | Implementation | File | Setup | Intro | Playing | Feedback | Scoreboard | Completion | Results | Legacy/current | Needs redesign | Shared components |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Memory | Pair cards | `games/memory.html`, `memory.js`, `memory.css` | `#screenSetup` | No | `#screenPlay` | No separate correct/incorrect screen | `.gsc` plus GME-002 | `#memoryWin` status line | No full screen | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Snakes and Ladders | Board race | `games/snakes-ladders.html`, `snakes-ladders.js`, `snakes-ladders.css` | `#screenSetup` | No | `#screenGame` | No | `.gsc` | No | `#screenWin` | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Snap | Card snap | `games/snap.html`, `snap.js`, `snap.css` | `#screenSetup` | `#snapRulesModal` | `#screenPlay` | Runtime | `.gsc` | Runtime | No | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Connect Four | Grid | `games/connect-four.html`, `connect-four.js`, `connect-four.css` | `#screenSetup` | No | `#screenPlay` | Runtime | `.gsc` | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Noughts and Crosses | 3×3 | `games/noughts-crosses.html`, `noughts-crosses.js`, `noughts-crosses.css` | `#screenSetup` | No | `#screenPlay` | `#tttWinOverlay` | `.gsc` and side stats | No | Win overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Math Race | Sums on a track | `games/math-race.html`, `math-race.js`, `math-race.css` | `#screenSetup` | No | `#screenPlay` | `#questionModal` (right and wrong not separate screens) | `.gsc` | No | `#screenWin`, `#screenLose` | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Runner | Side runner | `games/runner.html`, `runner.js`, `runner.css` | `#setup` | No | Canvas play | `#overlay` crash | `.gsc` | No | Crash overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Rock Paper Scissors | Pick, countdown, reveal | `games/rock-paper-scissors.html`, `rock-paper-scissors.js` | Same screen as play | No | Main view | `#rpsWinOverlay` | Score line inside the overlay | No | Win overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Snake | Arcade snake | `games/snake-arcade.html`, `snake-arcade.js`, `snake-arcade.css` | No | No | Canvas | `#snakeOverlay` "Game over" | No shared card | No | Overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Marble Tilt | Tilt maze | `games/marble-tilt.html`, `marble-tilt.css` | No | No | `#app` | No | No | `#tiltEnd` exists, contents UNKNOWN | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Jigsaw | Photo puzzle | `games/jigsaw.html`, `jigsaw.js`, `jigsaw.css` | `.jz-setup` | `#boardIntro` | `#board`, `#playArea` | Runtime | `.gsc` | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Word Search | Letter grid | `games/word-search.html`, `word-search.js`, `word-search.css` | No separate screen | No | `.word-search-app` | Runtime | `.gsc` | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Colouring | Colour a picture | `games/colouring.html`, `colouring.js`, `colouring.css` | No | No | `.colour-app` | No | No | No | No | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Block Stack | Stack blocks | `games/block-stack.html`, `block-stack.css` | No | No | `#board` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Zuma | Marble shot | `games/zuma.html`, `zuma.js`, `zuma.css` | No | No | `.zuma-app` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Drive Mad | Driving | `games/drive-mad.html`, `drive-mad.css` | No | No | `.drive-mad-app` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Link Grid | Join a path | `games/link-grid.html`, `link-grid-main.js`, `link-grid-maze.js`, `link-grid-bootstrap.js`, `link-grid-part-a.js`, `link-grid-shapes.js`, `link-grid-levels-content.html` | Level list | No | Maze | No named correct/incorrect screen | `localStorage` `linkGridCompletedLevels` (not account-scoped) | `completeLevel()` marks the level | No results page | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Star Catcher | Catch stars | `games/star-catcher.html` | No | No | Single page | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Prompt game | Make a 3D game | `games/prompt-game.html`, `prompt-game.css` | No | No | Single page | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |

## Adventure stage mechanics

These render inside `present.js` `viewStage()`. They are not separate apps and they do not use `wondii-shell`. Data helpers live in `schools/learn/classroom.js` (`blankBoard`, animal avatars `pip` `fox` `dino` `bun` `frog` `moon`).

| Game | Implementation | File | Setup | Intro | Playing | Feedback | Scoreboard | Completion | Results | Legacy/current | Needs redesign | Shared components |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Story slide | Picture and lines | `present.js` `storyHtml()` | `viewAssign` | `viewGate` | Slide | No | `rewardBar()` in board mode | `doneHtml()` | `viewResults()` | MIXED | Yes | `class.css`, `classroom.js` |
| Class question | A/B/C | `present.js` `questionHtml()` | Assign / roster | Gate | Hidden answer | `.is-right`, "Nearly", try again | `.class-bars` when live | `doneHtml()` | `viewResults()` | MIXED | Yes | `class.css`, `session.js` |
| Spin for an explorer | One pupil's turn | `present.js` `spinHtml()` | Board roster | Gate | Spin button | Chosen face | `rewardBar()` | `doneHtml()` | `viewResults()` | MIXED | Yes | `classroom.js` avatars, not floor sprites |
| Mystery | Open a fact | `present.js` `mysteryHtml()` | No | Gate | Closed | Opened fact | `rewardBar()` | `doneHtml()` | `viewResults()` | MIXED | Yes | `class.css` |
| Pick a door | Three doors | `present.js` `doorsHtml()` | No | Gate | Three buttons | One learning-objective line | `rewardBar()` | `doneHtml()` | `viewResults()` | MIXED | Yes | `class.css` |

Teacher controls on every stage: `details.class-tools` (full screen, another explorer, end). End confirm is an inline paragraph, not a dialog.

The class-room floor (`class-room.js` `scene()`) is not one of these games. "Choose someone" on that page only sets a turn line. The spin UI is on the present stage.

## Electricity demo

One hardcoded journey, not a game engine. File: `schools/demo/electricity.js`, `electricity.css`.

| Stage | Function | Setup | Playing | Feedback | Results |
| --- | --- | --- | --- | --- | --- |
| Intro | `viewIntro` | Path list | — | — | — |
| Story | `viewStory` | — | Illustrated lines | — | — |
| Words | `viewWords` | — | Word list | — | — |
| Circuit | `viewCircuit` | — | Circuit board | — | — |
| Maths | `viewMaths` | — | Sums | — | — |
| Quiz | `viewQuiz` | — | Questions | — | — |
| Build | `viewEngineering` | — | Build | — | — |
| Done | `viewDone` | — | — | — | Completion |
| More | `viewMore` | — | — | — | Extra |

Legacy. Needs redesign if the demo stays in the product. It does not use the adventure player.

## Storybook

Not a game. Listed so it is not folded into "games".

| Product | File | Setup | Playing | Feedback | Completion |
| --- | --- | --- | --- | --- | --- |
| Build a book | `games/storybook.html`, `storybook.js` | Landing plus 5 wizard steps | Reader cover, spread art, spread text | `#sbError`, `#sbModalError` | `#sbBusy` then `#sbBook` |

No `wondii-shell`. Fonts are chosen per book from a local list.

## Not implementations

No file, renderer, or route was found for: Treasure Hunt, Race to the Finish, Boss Battle, Picture Reveal, Crossword, True or False, Drag & Drop, Wheel of Wonder (as its own app), Match It, Sort It.

`teach.js` ids `quick_quiz`, `vocabulary`, `story`, `stem`, `retrieval`, `exit_ticket`, `starter`, `matching`, `sequencing`, `end_topic` are planner cards. Matching and sequencing have no board. A quiz card becomes `questionHtml` only when a slide of type `question` is built.

## Counts

| | |
| --- | ---: |
| Family game implementations | 19 |
| Family game visual states named in the registry (GME-003–GME-043) | 41 |
| Shared game chrome surfaces (help, scores wrap) | 2 |
| Adventure stage mechanics | 5 |
| Electricity demo stages | 9 |
| States marked Runtime or UNKNOWN in the family matrix | see Runtime column above |

A family game is not redesigned because `wondii-shell` restyled its header.
