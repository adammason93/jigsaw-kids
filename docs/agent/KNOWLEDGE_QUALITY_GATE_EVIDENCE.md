# Knowledge quality gate evidence

Recorded from `normalisePlan` on this branch, before `planBeats`, except the combined lesson in the last section.

## Method

This environment has no `OPENAI_API_KEY`, no Anthropic key, and no Supabase secrets, so a live plan model was not called. Every map below is the object the production `normalisePlan` path admits or rejects with `depthRequired: true`. That is the same call `learn-generate` makes before `planBeats`. Shallow rows also set `breadthSettled: true`, which is the flag on the one plan repair. `planBeats` is not called for sections A and B.

Lessons are 15 minutes. The hard gate uses the existing depth budget:

| Band | Depth floor | Narrow floor | Developed strands required for a depth-seeking goal |
| --- | --- | --- | --- |
| Year 1–2 | 5 | 3 | 2 (`strandRange.low`; the floor is at least 4) |
| Year 3–4 | 6 | 4 | 2 |
| Year 5–6 | 7 | 5 | 2 |

`strandRange.high` stays a prompt target (2 for Year 1–2, 2 to 3 for older 15-minute lessons). It is not a hard minimum, so a coherent two-strand map is not rejected for lacking a third strand. A short lesson whose floor drops below 4 still uses `strandRange.low` of 1. That is the existing year architecture, not a new quota.

The planner prompt asks Year 1–2 for everyday feature-then-how strands, Year 3–4 for several important ideas with a consequence where it matters, and Year 5–6 for mechanisms plus a connection. Deeper for older pupils is a higher substantive floor and a clearer how or why, not a longer list of names.

## What now fails closed

A depth-seeking goal uses the depth floor, not the narrow floor, and needs developed strands. Depth-seeking means the goal asks how or why something is adapted, survives, or works, how one thing affects another, or a cause, effect, or contribution. A procedure (`how to`, or intent `procedure`) stays on the narrow floor and one strand. A comparison stays out of this gate.

`breadthSettled` may still waive a short point list when the goal is not depth-seeking. It does not waive a developed-strand failure, and it does not waive the depth floor for a how or why goal.

A sentence that only names what something has can stay as a foundation. Labelling it `mechanism` or `function` does not make it the explaining half of a strand. The explanation has to state a relationship, and a later point has to depend on an earlier point in the same strand.

## A. How are sharks adapted to living in the ocean?

Goal: "Pupils will understand how sharks are adapted to living in the ocean."

### Name list, rejected in every band

Proposed points: sharks live in the ocean; sharks have fins, gills, teeth, a tail, skin, and a pointed nose; "These parts help sharks survive in the ocean."

`breadthSettled: true` on all three.

Year 1 and Year 2. Required depth 5, achieved 3, strands required 2, developed 0, `met` false. The budget trims the list to six points. Admitted before `planBeats`:

- k1 foundation: Sharks live in the ocean.
- k2 feature, depends on k1: Sharks have fins.
- k3 function, depends on k2: These parts help sharks survive in the ocean.
- k4 feature, depends on k1: Sharks have gills.
- k5 feature, depends on k1: Sharks have sharp teeth.
- k6 feature, depends on k1: Sharks have a tail.

Issues: "The learning map needs more connected learning points." and "The learning map needs developed strands that explain how or why, not only a name."

Year 4. Required 6, achieved 4, strands required 2, developed 0. The same issues. Skin and the pointed nose stay on the map and still do not develop a strand.

Year 6. Required 7, achieved 4, strands required 2, developed 0. The same issues.

"Sharks have fins." remains on the map. It is not a developed strand. A second probe that labels "Sharks have fins." and "Sharks have gills." as `mechanism` and `function` is also developed 0.

One real strand is not a pass. Five linked points that all hang off one chain (pointed body, then the slide of water, then the tail push, then chasing) develop 1 strand. Year 2 already meets the point floor and is still rejected for strands.

### Developed maps that are admitted

Year 2, five points, required 5, achieved 5, strands required 2, developed 2, `met` true.

- k1 foundation: Sharks are fish that live in the ocean.
- k2 feature, depends on k1: A shark has a smooth, pointed body.
- k3 mechanism, depends on k2: The pointed shape lets water slide past, so the shark can swim more easily.
- k4 feature, depends on k1: A shark has a strong tail.
- k5 mechanism, depends on k4: The tail pushes water backwards so that the shark swims forward.

A pupil can say two hows: the pointed body lets water slide past, and the tail pushes water back.

The same five points fail Year 4 even with `breadthSettled: true`. Required depth is 6, achieved is 5, developed strands are already 2. The repair flag does not waive that floor.

Year 4, six points, required 6, achieved 6, developed 2, `met` true. The Year 2 map plus:

- k6 effect, depends on k5: That forward push lets the shark chase fish in the ocean.

A pupil can add the consequence: the push is what lets the shark chase.

Those six points fail Year 6. Required depth is 7, achieved is 6.

Year 6, seven points, required 7, achieved 7, developed 2, `met` true. The Year 4 map plus:

- k7 connection, depends on k3 and k6: The pointed body and the tail work together so the shark can move through the ocean.

A pupil can connect the two strands. The connection is synthesis. It does not fake a third developed strand. Giving this seven-point map to Year 2 keeps six points (the connection is over the Year 2 maximum) and still passes, with the same two strands in everyday sentences.

## B. Other topics

Same 15-minute bands. Shallow rows use `breadthSettled: true`.

### Geography: How do rivers shape the land?

Name list (banks, bed, source, mouth, water, "rivers are long") is rejected for Year 2, Year 4, and Year 6. Developed strands 0. Required depth 5, 6, and 7. "Rivers have banks." stays on the map and is not a developed explanation. Many of those short names are too thin to count toward the floor (Year 2 achieved depth 1), which is a separate miss from the strand gate.

Year 2 admitted map, required 5, achieved 5, developed 2:

- A river is water moving downhill across the land.
- Fast water hits the rock and soil in the river bed.
- That water wears the rock away, so the valley grows deeper.
- The river picks up the pieces of worn rock.
- The water carries that rock downstream, so new land builds where the river slows.

Year 4 adds the consequence: a slow bend drops some of that rock, which changes the shape of the bank. Required 6, achieved 6, developed 2.

Year 6 adds the connection: wearing rock away and dropping it further on work together, so the river reshapes the land along its whole path. Required 7, achieved 7, developed 2.

The Year 2 river map fails Year 4 with `breadthSettled: true`.

### History: Why did the Romans build roads in Britain?

A name list (Romans built roads, roads were straight, roads were made of stone) is rejected in every band. Developed strands 0, and the why-goal also fails "The key knowledge states the outcome, not the reason." Required depth 5, 6, and 7.

Year 2 admitted map, developed 2:

- The Romans ruled a large part of Britain.
- Roman towns were a long way apart.
- Straight roads let soldiers move quickly because the route did not wander.
- Traders needed to carry food and goods between those towns.
- The roads carried those goods so that towns could share what they grew.

Year 4 adds: messages could travel along the same roads, which kept the army in touch.

Year 6 adds: moving soldiers and carrying goods worked together, so the roads held Roman Britain together.

### Science: How do plants make their own food?

"Plants need water.", "Plants have leaves.", and "Plants are green." are rejected for Year 2 and Year 6 with `breadthSettled: true`. Required depth 5 and 7, achieved 3, strands required 2, developed 0. Issues include the strand gate, the depth floor, "the outcome, not the reason", and "the parts, not the change." "Plants need water." stays on the map.

Year 2 admitted map, developed 2:

- A plant makes food inside its leaves.
- Leaves look green because they hold chlorophyll.
- Chlorophyll catches sunlight, which makes the leaf able to start building food.
- The leaf takes in carbon dioxide from the air.
- Water from the roots joins that gas, so the leaf can make sugar.

Year 4 adds the consequence: the plant uses that sugar to grow, and it releases oxygen while the food is made.

Year 6 adds the connection: sunlight, water and carbon dioxide work together, so the leaf makes food the rest of the plant can use.

### A further how or why, not an animal list

"Why do shadows change during the day?" with only "Shadows are dark." and "Shadows can be long." fails Year 4. Required depth 6 (not the narrow floor of 4), strands required 2, developed 0, and `breadthSettled` does not accept it.

### What stays a procedure

"Show the class how to add two-digit numbers in columns." Year 4, four steps, one developed strand. Required depth is the narrow floor 4, strands required 1, `met` true. The depth-seeking rule does not pull a method lesson up to two strands.

### What a breadth repair may still accept

"Teach children about the school garden." is a broad topic, not a how or why. Five points and two developed strands miss the Year 4 floor of 6, so the first pass fails. With `breadthSettled: true` the point floor is waived and the plan is accepted. `substantiveDepth.met` stays false, so the shortfall is still visible. The same flag does not accept the shark, river, plant, road, or shadow maps above.

## C. Combined lesson with Batch A (PR #13)

PR #13 (`cursor/teaching-beat-quality-ecad`) was merged only in a detached test checkout with this branch's `js/lesson-brain.js`. `git merge-file` reported no conflicts. That checkout was not committed, not pushed, and not merged to `main`. PR #13 stays open.

No live content model was available. The lesson below is the merged brain's `normalisePlan` (with `depthRequired: true`), then `lessonSkeleton` and `planBeats`, then pupil sentences written into those beats and passed through the merged `accept()`. Apply alignment passed on its own (`relation-covered`). The check contract is unresolved until the evidence judge, which is the production behaviour; this harness supplied `coverage: "sufficient"` because each correct choice is the admitted sentence. Those sentences are not a live model sample. The beat order, moves, and knowledge refs are the Teaching Beat Layer's. This change does not alter that layer.

Teacher request: "How are sharks adapted to living in the ocean?" Year 4, 15 minutes.

Admitted map before `planBeats`. Required 6, achieved 6, strands required 2, developed 2, `met` true.

- k1 foundation: Sharks are fish that live in the ocean.
- k2 feature, depends on k1: A shark has a smooth, pointed body.
- k3 mechanism, depends on k2: The pointed shape lets water slide past, so the shark can swim more easily.
- k4 feature, depends on k1: A shark has a strong tail.
- k5 mechanism, depends on k4: The tail pushes water backwards so that the shark swims forward.
- k6 effect, depends on k5: That forward push lets the shark chase fish in the ocean.

`accept()` returned ok. Pupil-facing text:

Hook, notice: Look at the shark gliding past and say what you notice.

Hook, predict: Say what you think lets this shark move so easily, before the explanation.

Investigate, notice: Look at the shark's shape and say what you notice about how it meets the water.

Teach, name k1: Sharks are fish that live in the ocean.

Teach, exemplify k1: For example, a hammerhead is a fish that lives in the ocean and hunts over a reef.

Teach, name k2: A shark has a smooth, pointed body.

Teach, explain k3: The pointed shape lets water slide past, so the shark can swim more easily.

Teach, name k4: A shark has a strong tail.

Teach, explain k5: The tail pushes water backwards so that the shark swims forward.

Teach, connect k6 and k5: The pointed body lets water slide past and the tail pushes water back, so the shark can chase fish.

Apply, task on k6: Push the model shark forward so its tail drives it after the fish.

Check, three retrieves, within the Year 4 question budget of 3:

- Where sharks live. Correct: Sharks are fish that live in the ocean. Other: Sharks are mammals that come onto the sand to live.
- The pointed body. Correct: The pointed shape lets water slide past, so the shark can swim more easily. Other: The pointed shape blocks the water, so the shark can only float.
- Chasing. Correct: That forward push lets the shark chase fish in the ocean. Other: The forward push makes the shark sink, so it cannot chase fish.

Resolution, reveal: The shark can hunt in the ocean because its body is built to move through the water.

Recap, consolidate the body strand: A shark has a smooth, pointed body, and that shape lets water slide past so the shark can swim more easily.

Recap, consolidate the tail strand: A strong tail pushes water backwards so the shark swims forward and can chase fish in the ocean.

Chain: teacher request, admitted map with two how-strands and a consequence, Teaching Beat Layer order, teach the mechanisms, exemplify the foundation, practise by pushing the model, retrieve three taught ideas, consolidate both strands, resolve the mission.

## Pins

`schools/learn/create.html` loads `lesson-brain.js?v=59`. The boot harness stays on `lesson-brain.js?v=53` because `tests/generate-loader.test.js` locks that pin. After a future merge, `learn-generate` must be redeployed: the edge function imports its own copy of `js/lesson-brain.js`.
