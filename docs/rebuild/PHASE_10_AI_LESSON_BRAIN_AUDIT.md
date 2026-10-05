# Phase 10 audit — how a lesson becomes a played adventure

Recorded before the lesson brain was added. The presentation and session path stays. Generation is what changes.

## Path today

Teacher text in the Creator (`schools/learn/creator.js`, `beginBuild`)

→ `analyseSource` reads a year, a subject, a topic, objectives, vocabulary, and a minute count only when the wording matches a small set of rules (`creator-core.js`)

→ `applyAnalysis` copies stated fields onto the draft. A selected class year is kept unless the teacher stated a year or picked a learning level (`setClass`, `setLearningYear`)

→ `generationContext` packs source text, year, class id, subject, topic, vocabulary, goals, target minutes, play mode, teams, and — today — pupil and teacher objects

→ `contentFor` fills questions, a story, a word list, and a mystery from hard-coded packs: Fractions, Phonics, Water cycle, Electricity or any topic with three vocabulary words, a times table, or a generic “what is this lesson about?” quiz

→ `packActivities` spends those minutes inside `durationBand` (20% of the target, at least 3 minutes, never below 5). It adds a story, one multi-question quiz, a word search when there are three words, a spin, a follow-up quiz, then mystery or doors if the total is still short

→ `validateAdventure` / `activityIssue` checks mechanic support, quiz prompt, choices, correct answer, word-search letters, and a short placeholder list

→ The teacher reviews, then Save or Start (`persistAdventure` → `school_adventures`, then `ClassRooms.createSession` → `school_sessions` / participants)

→ `present.js` loads the session after the account scope is ready and paints `WondiiLessonShell`

→ `lesson-mechanics.js` and `mechanic-core.js` play the slides. There is no second player.

## Mechanics the presentation engine actually plays

Canonical, with scoring (`mechanic-core.js`): `quiz`, `spin`, `word_search`.

Read-aloud adapters, not scored games: `story`, `mystery`, `doors`, plus `done` / `complete` as the end of a deck.

Creator labels match those ids. `rocket_race`, treasure hunt, and boss battle are not resolvable and must not be emitted.

## Schemas the player expects

Quiz activity `config`: `kind` (`multiple` or `boolean`), `prompt`, `choices` (strings, or True/False), `correct` (the choice text, or `true` / `false`), `points`, `participation` (`whole_class`, `selected_pupil`, `spin`, `team_turn`, `teacher_class`), optional `questions[]` with the same prompt/choices/correct/explain/kind. `slidesFor` turns that into a `question` slide whose `questions` array is the multi-question quiz. The first question is also copied onto `question`.

Story, mystery, doors: `config.lines` (non-empty strings). Slide `type` is the mechanic id. `lines` are what the class reads.

Word search: `config.words` (A–Z, 1–12 words, each at most 14 letters), `instruction`, `points`, `participation`. Slide `type` is `word_search`.

Spin: `config.pool`, `avoidRepeat`, `preferFresh`. Slide `type` is `spin`. One minute. It chooses a pupil; the next activity uses `participation: selected_pupil` for that pupil’s turn.

Teams: word search may use `team_turn` when the play mode has teams. Quiz participation can be `team_turn` or `teacher_class` only when that mode is selected.

Rewards: quiz and word search award `points` through `mechanic-core` onto the class, team, or selected pupil. Spin does not score by itself.

Duration: each activity has integer `minutes`. The draft total is the sum. The accepted band is `max(5, target - max(3, round(target * 0.2)))` through `target + max(3, round(target * 0.2))`.

Completion: a quiz question, a finished word, or the teacher moving on advances the round. Finish ends the session and the existing results path persists it.

Progression: slide index on the session. Play again returns to the creator with the same adventure id.

## What is hard-coded

`contentFor` only knows fractions, phonics graphemes, the water cycle, electricity-style vocabulary, and times tables. Anything else becomes two generic questions whose wrong answers are Playtime, Home time, and The register. Gravity, Roman Britain, persuasive writing, volcanoes, day and night, Florence Nightingale, and suspension bridges are not packs.

Class year wins when the teacher did not state a year. Uploaded files are read by `WondiiLearn.readFile` into `draft.source.text` (PDF, Word, and photos still need pasted lines). Adventures persist as `school_adventures.config`. Sessions persist as `school_sessions` plus teams, participants, and events. Participant ids are unique per session. `pupil_id` stays the pupil.

## Where an AI call can live

The Cloudflare worker (`workers-site/index.ts`) only serves the static site. It has no model secret.

`OPENAI_API_KEY` already exists as a Supabase secret for `clever-service` and `game-maker`. Those functions are allowed to return HTML for other products. A lesson must not.

The safe place for a lesson call is a new edge function, `learn-generate`, with JWT verification on, membership checked against `organisation_members` (owner, school_admin, or teacher, active). The site calls `POST /api/learn/generate` on the worker, which forwards the teacher’s token and does not hold the model key. The function validates, repairs once, and returns a Wondii adventure. The browser validates again before anything is shown or saved. The deterministic packs stay as the fallback.
