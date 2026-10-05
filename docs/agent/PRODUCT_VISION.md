# Product vision

## Teacher flow

1. **Select a class.** The class carries its year group and its pupils (first name, presentation, hair, eyes). Classes and pupils are school data; there are no permanent pupil accounts.
2. **Enter a request.** Plain language: "Teach children about sharks." No prompt-engineering.
3. **Optionally set a duration and who is taking part.** Duration defaults sensibly when not stated. Attendance ("Who's here today?") marks absent pupils and adds visitors by first name for this session only.
4. **Generate.**
5. **Receive a ready, personalised adventure.** It is checked and illustrated, with the class's own pupils cast as the adventurers, ready to play on the classroom screen.

In code: `/teacher/learning/create` → `schools/learn/creator.js` (`beginBuild`) → `/api/learn/generate` → `createWorld` (`/api/learn/visuals`) → save → `/teacher/learning/present`.

## Pupil experience

The class goes on the adventure together on the classroom screen. A pupil:

- is part of a story with a mission, in one consistent world
- sees their own class as the characters (pupils go on the adventure)
- notices something, learns its name, understands how it works, sees examples, and connects ideas
- does something with what they learned
- answers a proper final challenge
- sees a short recap of what they discovered

Pupils are chosen fairly for turns (spin, selected pupil). Participation is not a score.

## Shape of a lesson (targets, not quotas)

For a 15–20 minute lesson, aim for:

- **about 5–6 substantial learning scenes**
- **about 2 knowledge-connected interactions**, where the interaction uses the knowledge being taught
- **a proper final challenge** (see `ROADMAP.md` 9.15.4 for intended sizes)
- **a concise recap**

These are targets. A narrow lesson may need fewer scenes. Never pad to hit a number and never cut real teaching to fit one.

## What a scene is

- **A scene is not a fact.** It is a stretch of learning about one idea or one strand.
- **A scene is not a single sentence.** One line per screen is a slide deck, not a lesson.
- **A knowledge record is not a learning point.** A map entry like "Sharks are fish" is raw material. A learning point is what pupils come to understand after it has been noticed, named, explained and illustrated.

A scene progresses through moves:

1. **notice** — look at something in the world
2. **name** — give it its word
3. **explain** — say what it does or why
4. **exemplify / model / compare / connect** — make it concrete, show it working, contrast it, or link it to another idea

The code's move vocabulary is in `ARCHITECTURE.md`.

## Personalisation

The pupils go on the adventure. In code, `WondiiVisualAdventure.bindFeatured` picks class pupils as featured characters using their portrait avatars (`kid-*` avatar ids). `sessionCast` and the role assignment functions cast the pupils present that day and reassign roles for absent pupils. Story roles must be fair. `unfairRole` in `lesson-brain.js` rejects role labels such as villain, fool, idiot, stupid, culprit and failure.

Visuals currently run only for an allow-listed organisation (`VISUAL_ORGS` in `js/visual-adventure.js`). Other schools receive the adventure without generated artwork. See `CURRENT_STATE.md`.
