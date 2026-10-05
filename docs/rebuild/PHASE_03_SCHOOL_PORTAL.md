# Phase 3 — Teacher portal and class experience

Phase 1 and Phase 2 were already complete. This phase changes how a teacher moves through Wondii Schools. It does not rebuild the adventure creator, the lesson player, or the family games.

## Before

`portal.html` was the family app. A signed-in school saw the same Stories, Games, Puzzles, Learning, My World, and Favourites links, with a teacher dashboard injected into `#orgToday`. Adding a class asked for a size, then walked through every pupil. The class page (`schools/learn/class.html`) was a separate layout. Removing a pupil used the browser confirm. Create, Library, and Results were not primary destinations.

## After

While an organisation is loaded, the primary navigation is:

Home, Classes, Create, Library, Results

School settings stay on the existing School button. Account settings stay on Settings. Family links remain for accounts with no organisation.

The teacher pages are hash views inside the portal home, painted by `schools/learn/home.js`:

| Hash | What it shows |
| --- | --- |
| `#home` | Greeting, three create cards, classes, continue |
| `#classes` | Class cards and Add class |
| `#create` | Learning Adventure, Quick Game, Create Story |
| `#library` | Saved adventures, and a link to the existing story shelf |
| `#results` | Class sessions already stored on this account |

`schools/learn/teacher-shell.css` is the shared teacher chrome. The class page uses the same nav labels and the Phase 2 components.

## Class context

Inside a class, Create Adventure links to `create.html?class=`. Quick Game links to `present.html?example=lights&class=`. Create Story links to `games/storybook.html?create=1&class=`. The class page also stores `{ classId, name, yearLabel }` in `sessionStorage` under `wondii-class-context`.

The adventure creator and the presenter already read `class`. Storybook does not read that query yet. The link is there so the class is not thrown away.

On Home and Create, the class id is added only when the teacher has exactly one class. With several classes, those entry cards do not guess.

## Pupils and characters

Add class asks for a class name, a year, and first names pasted one per line. A pasted surname is not stored: only the first word is kept. Characters are assigned from the existing hair and presentation defaults. The teacher can open the class before editing any character.

On the class page, pupils can be pasted the same way, or added one at a time. Character edit changes girl or boy, hair, and eyes on the same pupil record (`look` on `school_pupils` when the class syncs). It is not a second character store.

Removing a pupil uses `dialog.w-dialog`. Deleting a whole class is not available: the class sync upserts rows and does not delete a missing class, so a local delete would come back on the next load.

## Visual classroom

The floor in `class-room.js` is still the class home, not the lesson player. Names stay visible. Hover or keyboard focus can wave. A tap selects. Idle motion still moves at most a few children, and reduced motion turns the wave and idle animation off. Primary actions use navy. The school accent is the current-nav underline and the year badge, not the button fill and not the error colour.

## What was checked

Chrome headless rendered fixture pages that load the real `home.js` and `class-room.js` with the Ramsdens organisation name, public logo, and primary colour `#c01818`:

- Teacher home, classes, add-class dialog, create, library, results, and the empty home, at desktop. Home and classes also at tablet. Home at 1280×720.
- Class floor with three pupils at desktop, tablet, and 1280×720. Empty floor. Pupils tab. Character dialog. Remove dialog. Pupils tab at 390px wide.

Local checks, not a signed-in cloud save:

- Add class stored name `5C`, year `Year 5`, and first names Maya, Jack, and Sofia. `Jack Smith` was stored as Jack.
- Pasting Amelia, Noah, and Priya into a class wrote those pupils, then a reload of the same fixture still showed them.

`node tests/school-ownership.test.js` passed. Signed-in login, cloud upsert, and logout were not run. No teacher password was used, and no temporary pupil rows were written to the database.

## Known limits

- Storybook ignores `?class=`.
- Quick Game opens the existing prepared electricity session with the class id. It is not a new game builder.
- Results lists sessions from `wondii-class-sessions`. It does not score pupils.
- Custom organisation navigation is hidden while the teacher nav is showing. Those links can still be edited in School settings.
- Portrait file names are still chosen in both `home.js` and `class-room.js`.
- The adventure creator, presenter, join page, and Ramsden public site were left as they were.
