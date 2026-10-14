# Knowledge quality gate evidence

Recorded from `normalisePlan` on this branch, before `planBeats`. The combined lesson in section C was not rebuilt after the strand-minimum change.

## Method

This environment has no `OPENAI_API_KEY`, no Anthropic key, and no Supabase secrets, so a live plan model was not called. Every map below is the object the production `normalisePlan` path admits or rejects with `depthRequired: true`. That is the same call `learn-generate` makes before `planBeats`. Shallow rows also set `breadthSettled: true`, which is the flag on the one plan repair. `planBeats` is not called for sections A and B.

Lessons are 15 minutes unless a row says otherwise. The hard gate uses the existing depth budget. A depth-seeking goal asks for developed strands on this scale:

| Band | Depth floor | Narrow floor | Developed strands for a 15-minute depth-seeking goal |
| --- | --- | --- | --- |
| Year 1–2 | 5 | 3 | 2 |
| Year 3–4 | 6 | 4 | 3 |
| Year 5–6 | 7 | 5 | 3 |

Year 5–6 does not require a fourth strand. The older step is the higher depth floor, clearer mechanisms, a connection, vocabulary, and reasoning. A foundation may sit beside the strands in a simple sentence.

A short lesson whose floor drops below 4 still uses `strandRange.low` of 1. A 12-minute Year 4 lesson has a maximum of 6 points, which cannot hold a foundation and three strands, so it stays at 2. An 8-minute Year 5 river map is required 1 and is admitted. That is the existing budget, not a new quota.

The planner prompt asks Year 1–2 for two everyday feature-then-how strands, and Year 3–6 for three developed strands. Year 5–6 also asks for mechanisms and a connection, and says deeper is not a fourth strand of names.

## What now fails closed

A depth-seeking goal uses the depth floor, not the narrow floor, and needs the strand minimum above. Depth-seeking means the goal asks how or why something is adapted, survives, or works, how one thing affects another, or a cause, effect, or contribution. A procedure (`how to`, or intent `procedure`) stays on the narrow floor and one strand. A comparison stays out of this gate. A broad topic that is not depth-seeking stays at `strandRange.low` (2 for a standard lesson).

`breadthSettled` may still waive a short point list when the goal is not depth-seeking. It does not waive a developed-strand failure, and it does not waive the depth floor for a how or why goal.

A sentence that only names what something has can stay as a foundation. Labelling it `mechanism` or `function` does not make it the explaining half of a strand. The explanation has to state a relationship, and a later point has to depend on an earlier point in the same strand.

## A. How are sharks adapted to living in the ocean?

Goal: "Pupils will understand how sharks are adapted to living in the ocean."

### Name list, rejected in every band

Proposed points: sharks live in the ocean; sharks have fins, gills, teeth, a tail, skin, and a pointed nose; "These parts help sharks survive in the ocean."

`breadthSettled: true` on all three.

Year 2. Required depth 5, achieved 3, strands required 2, developed 0, `met` false. The budget trims the list to six points:

- k1 foundation: Sharks live in the ocean.
- k2 feature, depends on k1: Sharks have fins.
- k3 function, depends on k2: These parts help sharks survive in the ocean.
- k4 feature, depends on k1: Sharks have gills.
- k5 feature, depends on k1: Sharks have sharp teeth.
- k6 feature, depends on k1: Sharks have a tail.

Issues: "The learning map needs more connected learning points." and "The learning map needs developed strands that explain how or why, not only a name."

Year 4. Required 6, achieved 4, strands required 3, developed 0. The same issues. Skin and the pointed nose stay on the map and still do not develop a strand.

Year 6. Required 7, achieved 4, strands required 3, developed 0. The same issues.

"Sharks have fins." remains on the map. It is not a developed strand.

### Developed maps

Year 2, five points, required 5, achieved 5, strands required 2, developed 2, `met` true.

- k1 foundation: Sharks are fish that live in the ocean.
- k2 feature, depends on k1: A shark has a smooth, pointed body.
- k3 mechanism, depends on k2: The pointed shape lets water slide past, so the shark can swim more easily.
- k4 feature, depends on k1: A shark has a strong tail.
- k5 mechanism, depends on k4: The tail pushes water backwards so that the shark swims forward.

A pupil can say two hows: the pointed body lets water slide past, and the tail pushes water back.

The same five points fail Year 4 even with `breadthSettled: true`. Required depth is 6, achieved is 5, developed strands are 2 and the minimum is 3.

A sixth point on the same tail strand ("That forward push lets the shark chase fish in the ocean.") meets the Year 4 point floor: required 6, achieved 6, developed 2. It is still rejected. The issue is only the strand gate. `breadthSettled` does not waive it.

Year 4, seven points, required 6, achieved 7, strands required 3, developed 3, `met` true. The Year 2 map plus a third strand:

- k6 feature, depends on k1: A shark has gills on the sides of its head.
- k7 mechanism, depends on k6: Gills take oxygen out of the water so that the shark can breathe.

The foundation stays a simple sentence. The three hows are the pointed body, the tail, and the gills.

Those six points of body plus tail fail Year 6. Required depth is 7, achieved is 6, strands required 3, developed 2.

The seven-point three-strand map meets Year 6 as well: required 7, achieved 7, strands required 3, developed 3, `met` true. A fourth strand is not required.

Year 6 can also keep a connection as an eighth point, still with three developed strands. Required 7, achieved 8, strands required 3, developed 3. The connection is synthesis. It does not count as a fourth strand.

- k8 connection, depends on k3, k5, and k7: The pointed body, the tail and the gills work together so the shark can live and hunt in the ocean.

Giving the eight-point map to Year 2 keeps six points (the gills explanation and the connection are over the Year 2 maximum) and still passes, with two developed strands.

## B. Other topics

Same 15-minute bands. Shallow rows use `breadthSettled: true`.

### Geography: How do rivers shape the land?

A name list (banks, bed, source, mouth, water, "rivers are long") is rejected for Year 2, Year 4, and Year 6. Developed strands 0. Required depth 5, 6, and 7. Strands required 2, 3, and 3. Year 2 achieved depth is 1. "Rivers have banks." is not a developed explanation.

Year 2 admitted map, required 5, achieved 5, strands 2/2:

- A river is water moving downhill across the land.
- Fast water hits the rock and soil in the river bed.
- That water wears the rock away, so the valley grows deeper.
- The river picks up the pieces of worn rock.
- The water carries that rock downstream, so new land builds where the river slows.

Year 4 adds a third strand. Required 6, achieved 7, strands 3/3:

- A river bends where the land is flatter.
- The outside of the bend flows faster, so it wears that bank away.

Year 6 adds the connection and still requires 3 strands, not 4. Required 7, achieved 8, strands 3/3: wearing rock away, carrying it and bending the banks work together, so the river reshapes the land along its whole path.

The Year 2 river map fails Year 4 with `breadthSettled: true`.

### History: Why did the Romans build roads in Britain?

A name list (Romans built roads, roads were straight, roads were made of stone) is rejected in every band. Developed strands 0. The why-goal also fails "The key knowledge states the outcome, not the reason." Required depth 5, 6, and 7. Strands required 2, 3, and 3. Achieved depth on this name list is 3.

Year 2 admitted map, strands 2/2:

- The Romans ruled a large part of Britain.
- Roman towns were a long way apart.
- Straight roads let soldiers move quickly because the route did not wander.
- Traders needed to carry food and goods between those towns.
- The roads carried those goods so that towns could share what they grew.

Year 4 adds a third strand. Required 6, achieved 7, strands 3/3:

- Roman governors needed news from distant towns.
- Riders carried those messages along the roads, so an order could arrive while the army was still away.

Year 6 adds the connection. Required 7, achieved 8, strands 3/3: moving soldiers, carrying goods and sending messages worked together, so the roads held Roman Britain together.

### Science: How do plants make their own food?

"Plants grow in soil.", "Plants need water.", "Plants have leaves.", and "Plants are green." are rejected for Year 2 and Year 6 with `breadthSettled: true`. Year 2 required 5, achieved 2, strands 2/0. Year 6 required 7, achieved 2, strands 3/0. Issues include the strand gate, the depth floor, "the outcome, not the reason", and "the parts, not the change."

Year 2 admitted map, strands 2/2:

- A plant makes food inside its leaves.
- Leaves look green because they hold chlorophyll.
- Chlorophyll catches sunlight, which makes the leaf able to start building food.
- The leaf takes in carbon dioxide from the air.
- Water from the roots joins that gas, so the leaf can make sugar.

Year 4 adds a third strand. Required 6, achieved 7, strands 3/3:

- The leaf stores some of the sugar it makes.
- Stored sugar feeds the plant when there is no sunlight, and the leaf releases oxygen while the food is made.

Year 6 adds the connection. Required 7, achieved 8, strands 3/3: sunlight, water and stored sugar work together, so the leaf makes food the rest of the plant can use.

### A further how or why, not an animal list

"Why do shadows change during the day?" with only "Shadows are dark." and "Shadows can be long." fails Year 4. Required depth 6 (not the narrow floor of 4), achieved 2, strands required 3, developed 0. Issues are the point floor, the strand gate, and "the outcome, not the reason." `breadthSettled` does not accept it.

### What stays a procedure

"Show the class how to add two-digit numbers in columns." Year 4, four steps, one developed strand. Required depth is the narrow floor 4, strands required 1, `met` true. The depth-seeking rule does not pull a method lesson up to three strands.

### What a breadth repair may still accept

"Teach children about the school garden." is a broad topic, not a how or why. Five points and two developed strands miss the Year 4 floor of 6, so the first pass fails. With `breadthSettled: true` the point floor is waived and the plan is accepted. `substantiveDepth.met` stays false, so the shortfall is still visible. The same flag does not accept the shark, river, plant, road, or shadow maps above.

## C. Combined lesson with Batch A (PR #13)

PR #13 (`cursor/teaching-beat-quality-ecad`) was merged only in a detached test checkout with this branch's `js/lesson-brain.js`. `git merge-file` reported no conflicts. That checkout was not committed, not pushed, and not merged to `main`. PR #13 stays open.

The pupil-facing sample from the previous revision used a Year 4 shark map with two developed strands and a chase consequence. That map is no longer admitted: required depth 6, achieved 6, strands required 3, developed 2. The only issue is the strand gate. This adjustment did not rebuild the pupil sentences or call `planBeats` again. No live content model was available.

The Year 4 map `normalisePlan` admits now is the seven-point map in section A: pointed body, tail, and gills. Required 6, achieved 7, strands required 3, developed 3, `met` true.

## Pins

`schools/learn/create.html` loads `lesson-brain.js?v=60`. The boot harness stays on `lesson-brain.js?v=53` because `tests/generate-loader.test.js` locks that pin. After a future merge, `learn-generate` must be redeployed: the edge function imports its own copy of `js/lesson-brain.js`.
