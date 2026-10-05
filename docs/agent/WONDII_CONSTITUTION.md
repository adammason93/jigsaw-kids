# Wondii constitution

These are the rules that define Wondii. A change that conflicts with one of them is wrong even if every test passes.

## 1. Wondii is not a generic slide generator

Wondii turns a teacher's plain request into a lesson that actually teaches, delivered as a classroom adventure. It is not a tool that pads a topic into a deck of screens.

## 2. A plain request is enough

A teacher can type:

> Teach children about sharks.

and pick a year group and a duration. From that, Wondii decides:

- **scope** — what part of "sharks" a Year 1, 15-minute lesson should cover
- **knowledge** — the substantive ideas to teach
- **prerequisites** — what pupils need first
- **concepts** — the ideas that organise the knowledge
- **relationships** — how the ideas depend on and explain each other
- **progression** — the order that builds understanding
- **examples** — concrete instances that make ideas real
- **application** — a task that uses what was taught
- **assessment** — questions that sample what was learned
- **recap** — a summary of the journey
- **adventure** — the story world that carries all of the above

## 3. No teacher prompt-engineering

The teacher must not need to know how to phrase a request for a model. Messy wording, filler, constraints like "don't reteach X", and duration slang must still produce a good lesson. If a lesson only works when the request is worded carefully, Wondii has failed.

## 4. Learning comes first. The adventure is the delivery world

The adventure (characters, mission, scenes, artwork, the pupils as cast) is how the lesson is delivered. It is never a substitute for the lesson. When story and teaching conflict, teaching wins.

## 5. Visuals cannot compensate for weak teaching

A beautiful scene with thin content is a failed lesson. Visual polish is not evidence of quality and must not be prioritised over teaching substance.

## 6. Passing is not proof

None of these prove a lesson is good:

- the tests pass
- a generation completes with HTTP 200
- one canary looked fine

Quality is judged against `LESSON_QUALITY_STANDARD.md`, across many requests. One success does not generalise. One failure that is not understood is a reason to stop, not to retry.

## 7. It must generalise

Wondii must work across:

- subjects (science, maths, English, history, geography, and others)
- year groups (Reception to Year 6)
- durations (short starters to full lessons)
- broad requests ("sharks") and narrow ones ("how do sharks breathe?")
- messy or unusual wording

A fix that works for one topic, one fixture or one canary and not in general is not a fix. Topic-specific code is forbidden (see `ENGINEERING_RULES.md`).

## 8. DETERMINISTIC STRUCTURE + BOUNDED AI CONTENT

This is the core architectural principle, decided in `f2d2844` ("let Wondii own the lesson skeleton") and reinforced in every phase since.

- **Wondii owns the architecture.** Deterministic code decides the seven internal stages, their order, the teaching moves (beats), the learning map admission, depth budgets, strand structure, scene grouping, the taught ledger, which knowledge each slot may use, validation, and the bounded repair.
- **The model writes bounded content.** It proposes learning points and writes copy for slots and beats that Wondii has already planned. It returns small, validated units.
- **Repair is the smallest unit.** When content fails, only the failing slot is regenerated, once, with the specific reason it failed.

Do not hand structure back to the model. Do not ask the model to decide the stage order, the number of scenes, which knowledge to assess, or whether the lesson is good enough. Every past attempt to let the model own structure produced lessons that repeated one idea, skipped teaching, or assessed untaught facts (see `DECISION_HISTORY.md`).
