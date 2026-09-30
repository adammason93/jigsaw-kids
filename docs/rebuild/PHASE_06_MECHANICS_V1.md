# Phase 6 — Canonical classroom mechanics

Quiz, Spin a pupil, and Word Search. They run inside the Phase 5 lesson shell and report to the Phase 4 session engine. Story, mystery, and doors stay adapters. The family games were not changed.

## Contract

`schools/learn/mechanic-core.js` is pure logic. `schools/learn/lesson-mechanics.js` mounts and destroys the DOM.

A mechanic receives the slide, the engine view, the round id, portraits, pause, reduced motion, and `actions.play`. `play` sends a packet:

- `mechanicState` for that round only
- `emission` for the engine (`response`, `score`, `participantId`, `completion`)
- `reveal` or `hide`
- `feedback` for the shell banner
- `done` when the shell should show the round transition

The mechanic does not keep a second scoreboard.

`WondiiMechanicCore.resolve` maps `question` to quiz and `word-search` to word search. `story`, `mystery`, `doors`, `done`, and `complete` stay adapters. Anything else is invalid. The shell asks the engine to mark a recoverable error, and the existing error dialog offers try again, skip, and end.

`WondiiMechanicCore.commitMechanic` is the shared apply step: save mechanic state, record the response, award points, select a participant, reveal. `ClassRooms.applyMechanic` uses it.

## Registry and lifecycle

`mount` draws into `#lessonMechanic` and returns `destroy`. The shell calls `destroy` before it repaints, so listeners and the spin timer do not stack. Pause remounts with interaction off: quiz choices are disabled, word search does not listen for a drag, and a spin timer is cleared.

## Mechanic state

`engine.mechanicStore` is a bag keyed by round id. It is not the play snapshot and it is not `mechanicRuntime` (that is still the class board).

Same-browser refresh keeps it because the presenter stores the engine. A second browser that only rehydrates the database snapshot does not receive the grid or the spin order. Found words and the spin pool come back on the same device.

Spin stores the order, cursor, last id, and who has already been picked. Word search stores the seed, grid, placements, found words, and the active team. Quiz stores the latest choice. Drag coordinates are not stored.

## Quiz

Multiple choice accepts 2, 3, or 4 choices, and up to 6. Labels are a letter plus the words. True/false uses the words True and False.

A known or anonymous selected pupil is the respondent. A class-wide answer with nobody selected uses a teacher participant named Class, so it is not stored as a pupil. Points go to that pupil's team when teams exist. With no teams, a correct answer adds to the class reward. With teams and nobody selected, the quiz does not guess a team.

The public join RPC still accepts only A, B, and C. The classroom quiz is not limited to those letters. A fourth choice is for the board until a later join change.

Correct and try-again copy is the Phase 5 shell banner.

## Spin

Eligible people are pupils and anonymous joiners. Teachers, team seats, and demo rows are left out. The order is a seeded shuffle. Each person is used once, then the pool starts again and the person just chosen is not first if anyone else is waiting. That is the implemented rule. It is not a claim of perfect randomness.

The strip shows at most five faces. A class of 30 shows the count, not thirty full-size portraits. Known pupils use their class portrait. Others get an initial. Reduced motion selects immediately and shows the name with no travel animation. The shell then shows the usual "You're up" moment.

The chosen id is `selectedParticipantId`. The next quiz reads that person.

## Word search

Words are upper-case letters. At most 12 words, each at most 14 letters. The grid grows from the longest word up to 14 if needed. If the words cannot be placed, the mechanic fails instead of dropping a word. The same seed rebuilds the same grid.

Directions are horizontal, vertical, and one diagonal, forwards and backwards. Easy mode is forward horizontal and vertical only.

A straight drag uses pointer events, so mouse and touch share one path. Arrow keys move. Enter starts a line and Enter again checks it. A match must be a stored placement. A wrong line clears. Each found word can award a point through the engine. When teams exist, the teacher picks which team the find is for. When every word is found, the mechanic completes and the shell shows the round transition.

## Fixture

`fixtureSlides()` is an Electricity example: a four-choice quiz, spin, true/false, a four-word search, and a two-choice quiz. It is for tests. It is not a published lesson. `present.html?example=mechanics` opens that plan in memory and does not write it to the library.

Older question slides still normalise. A correct answer may be the choice id or the choice text. `question` still becomes quiz. `word-search` still resolves.

## Accessibility

Quiz choices and the Spin button are buttons. Word search cells are buttons. Focus rings stay the shell's navy ring. Team names are written, not colour alone. Reduced motion skips the spin travel.

## Visual QA

Rendered in headless Chrome from a temporary preview, then deleted. Inspected screenshots:

- Quiz at 1920×1080: two choices, four choices, true/false, a correct "Great work!" banner with a team point, a try-again banner, a selected pupil, and two teams.
- Spin at 1920×1080: two pupils with a portrait and an initial, a 30-pupil class showing five faces plus the count, and reduced motion as a static name.
- Word Search at 1920×1080: a fresh grid, a drag highlight, a partly found list, a completed find, and two-team chips. At 1280×720 the words stay on one line and the grid stays readable. 1366×768 and a tablet landscape width were also rendered.

## What is still an adapter

Story, mystery, and pick a door. Family Word Search. The adventure creator. The results list.
