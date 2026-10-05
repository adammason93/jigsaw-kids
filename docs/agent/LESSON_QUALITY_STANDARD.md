# Lesson quality standard

This is how a lesson is judged. Tests encode parts of it; they do not define it.

## 1. Fact count is not substantive learning

A lesson with eight facts is not deeper than a lesson with three well-developed ideas. Depth is how far pupils' understanding of an idea is taken: noticed, named, explained, illustrated, connected, used.

The engine reflects this. `buildTeachingPlan` in `js/lesson-brain.js` does not count map entries. It classifies each point as substantive, supporting, synthesis, unsupported-example, generic-connection, paraphrase or low-substance. Achieved depth is `substantive + min(supporting, 1) + min(synthesis, 1)`. A broad request also needs enough **developed strands**. A strand is developed only when an explained or supporting point depends (by `dependsOn`) on a substantive point in the same strand.

Padding does not count. Paraphrase does not count. "Learning about sharks is fun" does not count.

## 2. Weak versus strong: a worked example

**These examples illustrate the standard. They must never be hard-coded into production code, prompts, validators or fixtures used as production behaviour.** Wondii must reach this quality for any topic.

A Year 1, 15-minute broad lesson, "Teach children about sharks."

**Weak** (six flat facts, no development):

- Sharks are fish.
- Sharks live in the sea.
- Sharks have a streamlined body.
- Sharks have a tail.
- Sharks have fins.
- Sharks have sharp teeth.

Every line is true. Nothing is explained. Nothing depends on anything else. Pupils could repeat it and understand nothing.

The production map in request `469a81fc` had this structure: six points, every `dependsOn` empty. Two of its points used relationship wording ("because of their strong fins", "all work together"). Before `c28c7f7` that wording was enough for the engine to count strands as developed. It is preserved in `tests/developed-strands.test.js`. Relationship words in a sentence do not create development; dependency between points does.

**Strong** (two developed strands):

- *Strand: body shape.* Sharks are fish that swim in the sea. A shark has a **streamlined** body: smooth and pointed at the front. A streamlined shape lets water slide past, so the shark can swim fast without much effort. *(name → explain, with the explanation depending on the feature)*
- *Strand: tail.* A shark has a big tail fin. The tail sweeps from side to side and pushes against the water, which drives the shark forward. *(name → explain → example)*
- *Connection.* The streamlined body and the strong tail work together: the tail pushes and the shape lets the shark slip through the water.

The strong version has fewer facts and far more learning.

## 3. Broad versus narrow requests

`teachingScope` classifies the request.

- **Narrow**: one method ("how to…"), one definition ("what is a…"), or one relationship ("how / why / what makes / what causes / what happens when / difference between / compare"). Teach that one thing properly, with its prerequisites, an explanation, examples and an application. Do not drift to neighbouring topics.
- **Broad**: a topic without one relationship ("sharks", "the Romans"). Wondii chooses a coherent scope and teaches **two or more developed strands** that connect, rather than a list of loosely related facts.

A narrow request must not be inflated into a topic tour. A broad request must not collapse into one fact repeated across stages.

## 4. Age appropriateness

- Vocabulary, sentence length and the number of ideas fit the year group. Year 1 and Year 2 pupil sentences are exactly one sentence each (`pupilCopyContract`).
- Depth scales with year and duration (`depthBudget`, `DEPTH_BANDS`). A Year 1 lesson is not a cut-down Year 6 lesson; it is a lesson designed for five- and six-year-olds.
- Nothing frightening, graphic or unsafe. Story roles are fair to the pupils cast in them.

## 5. Application uses taught understanding

The APPLY task must require the knowledge that was taught. A task the class could complete without the lesson is a failure. So is a task that only asks pupils to repeat a sentence back.

- Good: sort materials into magnetic and non-magnetic after learning which metals magnets attract.
- Weak: "Draw a shark." It depicts the topic but uses no taught idea.
- Weak: "Say what a streamlined body is." This is recall, not application.

## 6. Assessment samples the learning, with no giveaways

- Questions sample across what was taught (across strands for a broad lesson). They do not all test one fact.
- Each question tests something that was actually taught before it (the taught-before rule). An untaught fact must never be assessed.
- Questions mix retrieval, explanation and application, not only "what is X called?".
- No giveaways. The question, the choices and the artwork must not reveal the answer. Joke distractors ("Playtime", "a sock") and obviously wrong choices are not real assessment.
- A nearby definition is not evidence of the goal. If the goal is "explain how a tail moves a shark", "what is a fin?" does not assess it.

## 7. The recap represents the journey

The recap states what was learned, in pupil language, covering the strands that were taught. It is concise. It is not "Today we learned lots about sharks!", not generic praise, and not a list of every sentence repeated.
