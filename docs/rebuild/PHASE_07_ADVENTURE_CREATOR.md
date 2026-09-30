# Phase 7 — Learning Adventure creator

One teacher creator on `create.html`. It builds a draft, then a saved school adventure, then a Phase 4 session. It does not keep a second class list or a second session engine.

## Old journey

`create.html` loaded two creators. `flow.js` was the short path. `create.js` still rendered a guided path when a query flag was set. Both offered activities the player cannot run, including matching, sequencing, and a number game. Starting a class adventure opened the lesson shell roster and asked for first names again.

Those scripts are still in the repo. They are not loaded. `present.html?journey=` without a session now opens the creator ready screen, except `preview=1`, `edit=1`, and `example=mechanics`.

## New journey

1. What are you teaching? Upload, paste, describe, or start from scratch.
2. Who is it for? The class from the link, or a list of the teacher's classes. Learning level is separate from the class year.
3. How should the class play?
4. Build my adventure. Quiz, Spin a pupil, and Word Search, plus story, mystery, and doors when the teacher adds them.
5. Review. Start now, save to the library, or edit.

Start now opens a ready screen: the class characters, who's away, play mode, then Start adventure. That creates the session and opens the lesson shell.

## Creator state

`schools/learn/creator-core.js` holds the draft. It is not a live session. A local draft is `wondii-creator-draft-v2`. Refresh offers continue or start again. The school library is written only on Save or Start, through `WondiiLearn.upsertLibrary` and `school_adventures`.

Absence and visiting pupils stay on the start screen. They are not written back onto the class or into the saved adventure.

## Class and play

Every pupil in the class is included until the teacher marks someone away. A visiting name is temporary. Changing class clears the previous pupil ids.

Play modes map to the Phase 4 team model: whole class and individual turns use no teams, teacher vs class, two teams, multiple teams, and custom teams. Automatic split is alphabetical and even. It is not an ability balance. Group by saved presentation appears only when the class has both Girl and Boy stored, and the teacher can move anyone.

## Activities

The picker reads `WondiiMechanicCore.resolve`. Quiz, spin, and word search are the default recommendation when the lesson text supports them. Story, mystery, and doors can be added because those adapters play. Matching, sequencing, and the other old template names are not offered.

Quiz supports multiple choice and true or false. Spin stores avoid-repeat and prefer-fresh, not a seed. Word search stops at 12 words and 14 letters. A quiz without a correct answer says so before play.

There is no live model. Analysis copies a year, subject, topic, objective, or vocabulary only when the text states it.

## Adapt and reuse

Adapt copies the adventure into a new draft. The original id is `adaptedFrom`. Saving writes the copy. Use with another class loads that class's pupils and does not keep the previous pupil ids.

## Limits

PDF, Word, and photos are not read. The teacher is told to paste the text. `present.html?edit=1` is still the older question form. Family accounts see a school-only message. Cross-account isolation still depends on the Phase 1 library filter and database rules, which the regression tests cover.
