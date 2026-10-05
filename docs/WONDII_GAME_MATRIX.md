# Wondii game matrix

Rebuild programme: Phase 0 baseline is `docs/rebuild/PHASE_00_BASELINE.md` (30 September 2026). Phase 8 is `docs/rebuild/PHASE_08_GAME_PLATFORM.md`. Five standalone pilots use GameShell V2. The other family games stay on `wondii-shell`. Classroom Quiz, Spin a pupil, and Word Search run in the lesson shell, not in GameShell.

Discovery cells below are still what the source shows, updated where Phase 8 played a pilot. `Runtime` means the markup does not name that state.

`wondii-shell.js` remains on the unmigrated family games and is not on `storybook.html` or the five pilots. It adds a back link, a kicker, a help modal, and a scores disclosure. It does not draw the board. It returns immediately when `data-game-shell="v2"`.

Shared scorecard (`js/game-scorecard.js`) is linked from: Memory, Snakes and Ladders, Snap, Connect Four, Noughts and Crosses, Math Race, Runner, Word Search, Jigsaw. The other family games do not link it.

## Family games

| Game | Implementation | File | Setup | Intro | Playing | Feedback | Scoreboard | Completion | Results | Legacy/current | Needs redesign | Shared components |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Memory | Pair cards | `games/memory.html`, `memory.js`, `memory.css` | `#screenSetup` | No | `#screenPlay` | No separate correct/incorrect screen | GameShell result. `.gsc` hidden. Storage still `game-scorecard` | `#memoryWin` plus shell dialog | Shell dialog | CURRENT shell, LEGACY board | Board CSS later | `game-shell`, `game-scorecard` |
| Snakes and Ladders | Board race | `games/snakes-ladders.html`, `snakes-ladders.js`, `snakes-ladders.css` | `#screenSetup` | No | `#screenGame` | No | `.gsc` | No | `#screenWin` | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Snap | Card snap | `games/snap.html`, `snap.js`, `snap.css` | `#screenSetup` | `#snapRulesModal` | `#screenPlay` | Runtime | `.gsc` | Runtime | No | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Connect Four | Grid | `games/connect-four.html`, `connect-four.js`, `connect-four.css` | `#screenSetup` | No | `#screenPlay` | Runtime | `.gsc` | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Noughts and Crosses | 3×3 | `games/noughts-crosses.html`, `noughts-crosses.js`, `noughts-crosses.css` | `#screenSetup` | No | `#screenPlay` | Shell result. `#tttWinOverlay` hidden | Side stats. `.gsc` hidden. Storage still `game-scorecard` | Shell dialog | Shell dialog | CURRENT shell, LEGACY board | Board CSS later | `game-shell`, `game-scorecard` |
| Math Race | Sums on a track | `games/math-race.html`, `math-race.js`, `math-race.css` | `#screenSetup` | No | `#screenPlay` | `#questionModal` (right and wrong not separate screens) | `.gsc` | No | `#screenWin`, `#screenLose` | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Runner | Side runner | `games/runner.html`, `runner.js`, `runner.css` | `#setup` | No | Canvas play | `#overlay` crash | `.gsc` | No | Crash overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Rock Paper Scissors | Pick, countdown, reveal | `games/rock-paper-scissors.html`, `rock-paper-scissors.js` | Same screen as play | No | Main view | `#rpsWinOverlay` | Score line inside the overlay | No | Win overlay | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Snake | Arcade snake | `games/snake-arcade.html`, `snake-arcade.js`, `snake-arcade.css` | No separate setup | No | Canvas | Shell pause and result. `#snakeOverlay` hidden | In-canvas HUD. High score `snakeArcadeHighV1` | Shell dialog | Shell dialog. Refresh starts a new run | CURRENT shell, LEGACY canvas | Canvas access later | `game-shell` |
| Marble Tilt | Tilt maze | `games/marble-tilt.html`, `marble-tilt.css` | No | No | `#app` | No | No | `#tiltEnd` exists, contents UNKNOWN | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Jigsaw | Photo puzzle | `games/jigsaw.html`, `jigsaw.js`, `jigsaw.css` | `.jz-setup` | `#boardIntro` | `#board`, `#playArea` | Runtime | `.gsc` | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell`, `game-scorecard` |
| Word Search | Letter grid | `games/word-search.html`, `word-search.js`, `word-search.css` | No separate screen | No | `.word-search-app` | Shell result | `.gsc` hidden. Storage still `game-scorecard` | Shell dialog | Shell dialog | CURRENT shell, LEGACY board | Board CSS later | `game-shell`, `game-scorecard`. Not the classroom generator |
| Colouring | Colour a picture | `games/colouring.html`, `colouring.js`, `colouring.css` | Tools stay on the page | No | `.colour-app` | No | None. Scoreless | Saved pictures | No win screen | CURRENT shell, LEGACY studio | Studio CSS later | `game-shell` |
| Block Stack | Stack blocks | `games/block-stack.html`, `block-stack.css` | No | No | `#board` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Zuma | Marble shot | `games/zuma.html`, `zuma.js`, `zuma.css` | No | No | `.zuma-app` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Drive Mad | Driving | `games/drive-mad.html`, `drive-mad.css` | No | No | `.drive-mad-app` | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Link Grid | Join a path | `games/link-grid.html`, `link-grid-main.js`, `link-grid-maze.js`, `link-grid-bootstrap.js`, `link-grid-part-a.js`, `link-grid-shapes.js`, `link-grid-levels-content.html` | Level list | No | Maze | No named correct/incorrect screen | Call site still uses `linkGridCompletedLevels`. `score-cloud.js` scopes that key when an account is bound | `completeLevel()` marks the level | No results page | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Star Catcher | Catch stars | `games/star-catcher.html` | No | No | Single page | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |
| Prompt game | Make a 3D game | `games/prompt-game.html`, `prompt-game.css` | No | No | Single page | Runtime | No | Runtime | Runtime | LEGACY board, MIXED chrome | Yes | `wondii-shell` |

## Phase 8 platform record

Catalogue source is `games/game-platform.js`. Portal cards read `portalCards()`. Lesson mechanics are not in that list. Runner is in the registry and is not a portal card (`listed: false`).

| Game | Runtime | Shell | Status | Score | Persistence | Debt |
| --- | --- | --- | --- | --- | --- | --- |
| Noughts and Crosses | Own board | GameShell V2 | CURRENT | Wins on the side panel. Result dialog | `tttScorecardV1` via score-cloud when an account is bound | Board CSS. Signed-out totals do not stick |
| Memory | Own cards | GameShell V2 | CURRENT | Moves on the board. Result dialog | `memoryScorecardV1` | Board CSS |
| Word Search | Own grid. Horizontal and vertical, including reverse | GameShell V2 | CURRENT | Grids completed, stored. Result dialog | `wordSearchScorecardV1` | Not the classroom generator. Board CSS |
| Colouring | Own canvas | GameShell V2 | CURRENT | None | `jigsawKidsColouringV1` and `jigsawKidsColouringAutoSaveV1`, account scoped | Studio CSS. Canvas is pointer-first |
| Snake | Own canvas | GameShell V2 | CURRENT | HUD score and best. Result dialog | `snakeArcadeHighV1`. A refresh starts a new run | Canvas is not a control grid |
| Snakes and Ladders, Snap, Connect Four, Math Race, Runner, Jigsaw | Own boards | wondii-shell | LEGACY | `.gsc` | Matching scorecard keys in score-cloud | Unmigrated |
| Rock Paper Scissors, Marble Tilt, Block Stack, Zuma, Drive Mad, Star Catcher, Prompt game | Own boards | wondii-shell | LEGACY | Own or none | Mixed | Unmigrated |
| Link Grid | Own maze | wondii-shell | LEGACY | Level list | `linkGridCompletedLevels`, scoped when an account is bound | Call site still uses the raw key |
| Storybook, My Characters | Story tools | none | LEGACY | None | Existing story keys | Not a GameShell game |

## Classroom mechanics

These run inside `WondiiLessonShell`, not inside the family game shell. Scores and the selected pupil belong to `WondiiSessionEngine`.

| Game | Implementation | File | Setup | Intro | Playing | Feedback | Scoreboard | Completion | Results | Legacy/current | Needs redesign | Shared components |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Story slide | Picture and lines | `lesson-mechanics.js` adapter | Roster | Ready | Slide | No | Lesson scoreboard | Shell transition | Shell completion | MIXED adapter | Yes | Lesson shell |
| Quiz | Multiple choice and true/false | `mechanic-core.js`, `lesson-mechanics.js` | Roster | Ready | Choices | Shell correct / try again | Engine scores | Shell transition | Shell completion | CURRENT | Later types only | Lesson shell, session engine |
| Spin a pupil | Selector from participants | `mechanic-core.js`, `lesson-mechanics.js` | Roster | Ready | Spin | Shell pupil moment | Engine scores | Shell transition | Shell completion | CURRENT | No | Class portraits, lesson shell |
| Word search | Letter grid | `mechanic-core.js`, `lesson-mechanics.js` | Roster | Ready | Drag or keyboard | Shell feedback | Engine scores | Shell transition | Shell completion | CURRENT | No | Lesson shell. Not `games/word-search.html` |
| Mystery | Open a fact | `lesson-mechanics.js` adapter | No | Ready | Closed | Opened fact | Engine scores | Shell transition | Shell completion | MIXED adapter | Yes | Lesson shell |
| Pick a door | Three doors | `lesson-mechanics.js` adapter | No | Ready | Three buttons | One line | Engine scores | Shell transition | Shell completion | MIXED adapter | Yes | Lesson shell |

Family Word Search (`games/word-search.html`) is a separate game. It was not restyled.

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

No separate game file was found for: Treasure Hunt, Race to the Finish, Boss Battle, Picture Reveal, Crossword, Drag & Drop, Wheel of Wonder (as its own app), Match It, Sort It. Classroom true/false is a quiz kind, not its own game.

`teach.js` ids `quick_quiz`, `vocabulary`, `story`, `stem`, `retrieval`, `exit_ticket`, `starter`, `matching`, `sequencing`, `end_topic` are planner cards. Matching and sequencing have no board. A quiz card becomes a lesson-shell quiz when the slide type is `question`.

## Counts

| | |
| --- | ---: |
| Family game implementations | 19 |
| Family game visual states named in the registry (GME-003–GME-043) | 41 |
| Shared game chrome surfaces (help, scores wrap) | 2 |
| Classroom mechanics in the lesson shell | 6 |
| Electricity demo stages | 9 |
| States marked Runtime or UNKNOWN in the family matrix | see Runtime column above |

A family game is not current because it loads a shell. Only Noughts and Crosses, Memory, family Word Search, Colouring, and Snake are CURRENT.
