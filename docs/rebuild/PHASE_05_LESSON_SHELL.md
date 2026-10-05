# Phase 5 — WondiiLessonShell

The classroom player. Phases 1–4 stay as they were. This phase adds the presentation around `WondiiSessionEngine`. It does not redesign the adventure creator, the family games, the results list, or the mechanics themselves.

## Architecture

```
Adventure
  → WondiiSessionEngine   (js/learning-session.js)
  → WondiiLessonShell     (schools/learn/lesson-shell.js)
  → mechanic adapter      (schools/learn/lesson-mechanics.js)
```

`present.js` is the controller for `/teacher/learning/present`. It loads the adventure, calls the session adapter in `schools/learn/session.js`, and passes a view into the shell. The shell paints. The engine decides scores, participants, rounds, pause, and completion.

Files:

| File | Job |
| --- | --- |
| `schools/learn/lesson-shell.js` | Layout, scoreboard, dock, overlays, screen choice |
| `schools/learn/lesson-shell.css` | Classroom scale, 16:9 frame, motion |
| `schools/learn/lesson-mechanics.js` | Story, question, spin, mystery, doors, placeholder |
| `schools/learn/present.js` | Controller. Not a second player |
| `schools/learn/present.html` | Loads the shell after the existing class styles |
| `schools/learn/session.js` | Presenter adapter: pause, resume, skip, recover, take points, team mode |
| `tests/lesson-shell.test.js` | Screen choice, score mode, activity names, help |

`?edit=1` still renders the older question form from `class.css`. That form is authoring, not the player.

## Layout

16:9 first. Three bands:

1. Top: Wondii wordmark, school name and logo when an organisation is loaded, adventure title, progress pills, round count, status. Joined count appears in live mode.
2. Stage: the current activity, or an overlay.
3. Dock: scores on the left, one large primary action and a Teacher menu on the right.

Critical actions sit inside the page padding, not on the extreme edge. Below 1100px the top bar stacks and the story image sits above the copy. Portrait phones are not the target. Pupil devices stay on `/join`.

## Engine relationship

The shell reads `view.engine` and `view.engineStatus`. It calls `model.actions`, which `present.js` maps onto `ClassRooms` (`pause`, `resume`, `skipRound`, `award`, `takePoints`, `chooseParticipant`, `setSlide`, `complete`, `end`, `recover`).

It does not calculate scores, invent participants, or complete a round by itself. A round change on the primary button first shows a transition. Continue calls `goTo`, which is `setSlide` on the engine.

Teacher +1 / −1 uses a new reason each click so the engine's idempotent award does not ignore the second press.

## Stage contract

`WondiiLessonMechanics.render(slide, ctx)` returns `{ mode, html }`. Modes: `story`, `question`, `game`, `celebration`, `standard`.

`ctx` includes the mechanic name, reveal, pick, question, mystery, door, and the selected participant from the engine. The shell does not lay out choices, doors, or story lines.

## Scoreboard

Scores come from `engine.teams` and `engine.rewardTotal`.

| Mode | What the class sees |
| --- | --- |
| No teams | Class reward, using the adventure reward name |
| Two teams | Named rows, for example Red team and Blue team |
| Teacher and class | Same row treatment, teacher tone and class tone |
| More teams | One labelled row per engine team |

A point change shows a short +N, then it settles. `prefers-reduced-motion` and the existing `class.css` reduced-motion rule turn that animation off.

## Teacher controls

The dock has one primary label: Next, Reveal, Continue, Finish, or Resume while paused.

The Teacher menu holds Pause, Skip activity, Help, Full screen, a pupil list, +1 / −1, and End lesson. End lesson opens a confirm: keep playing, or end. Ending keeps what is already stored.

Help is short and depends on the current activity.

## Join

A live session that is still waiting shows JOIN THIS LESSON, the code in classroom-size type, the joined count from `WondiiSessionEngine.joinedCount`, and Start lesson. The count updates when the existing session poll repaints. This phase does not add a new realtime channel.

## Selected pupil

When the engine's selected participant changes, the shell shows that person's display name and "You're up!", then returns to the activity. A known pupil uses the portrait map from the class record (`games/images/schools/room/kid-*.webp`). An anonymous participant gets an initial. The shell does not keep its own selected-pupil id. It only remembers who has already been introduced, so the moment does not repeat on every repaint.

## Feedback

Correct: green choice and "Great work!", with an optional team point note. Try again: warm copy, "Nearly! Let's have another look.", and a Try again control. Round win, the between-rounds card, and session completion are the larger moments. They are not a full-screen burst.

## Pause, transition, completion, recovery, error

Pause covers the stage: "The class is waiting. Scores stay as they are." The dock primary becomes Resume. Resume calls the engine.

Between rounds the shell shows the round that just finished, the current scores, and the next activity name. Continue advances the engine.

Completion and early end use `engine.result`: team or class points, rounds completed, and how many took part. There is no attainment line. Actions are View results (portal `#results`), Play again, and Back to class.

A saved in-progress session offers Continue your lesson? with Resume and End session. The teacher is not dropped into the middle of the activity.

`recoverable_error` offers Try again, Skip activity, and End lesson. Try again recovers the engine state and resumes. The session is not deleted.

## Responsive and accessibility

Checked as rendered fixtures at 1920×1080, 1366×768, 1280×720, and 1112×834. Question text, choices, names, scores, and the primary button stay in the classroom range (prompts from about 2rem, scores from about 2rem, primary control 76px tall, other targets at least 64px).

Focus rings are navy. Escape closes an open dialog, menu, or pupil moment and does not clear the "already entered" flag, so a lesson in progress does not jump back to the recovery card. Dialogs move focus to their main button. Team rows include the team name, not only a colour.

## Ramsden

A fixture with the Ramsdens name, logo, and `#c01818` accent was rendered. The logo and name sit beside the Wondii wordmark. Completed progress uses that accent as an underline. Primary buttons stay navy. Correct stays green. Try again stays warm.

## Remaining mechanic debt

Story, class question, spin, mystery, and pick-a-door are adapters so an existing adventure can run. Phase 6 is the place to rebuild the first canonical mechanics. Word search is a card that says the activity sits in the lesson. Live per-choice bars are not in the shell. The electricity microsite is unchanged.

## What was not run

Signed-in cloud save, logout, and a second browser joining a real session were not run. Fixture flows used the engine in the page and did not write database rows.
