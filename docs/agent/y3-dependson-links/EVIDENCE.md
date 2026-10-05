# Year 3 dependsOn links — diagnosis and correction

Saved live run: `GOAL_REACH_CASES=y3-dinosaurs`, checkout `926c7c13f4dc3087180faef2dfe90a3aeed1a9af`, model `gpt-4o-mini`, pack `kp_1pwqzv0`. Request: “Year 3 science. Teach children about dinosaurs.” Elapsed 30466 ms. Terminal stage `EDUCATIONAL_VALIDATION_FAILED`. Pupil lesson: none.

This file is the trace for that saved run and the correction that follows from it. It is not a new live model success.

## Where the links disappeared

The harness records each proposed point from the parsed model object, before pruning, as `dependsOn: item.dependsOn || []`. A non-empty array or a string id would have been stored as that value. Both passes stored `[]` on every point.

| pass | proposed dependsOn | kept dependsOn | depth | strands |
| --- | --- | --- | --- | --- |
| first | all `[]` (p1–p6) | all `[]` (k1–k6) | 6/6 | 0/2 |
| repair | all `[]` (p1–p8) | all `[]` (k1–k7) | 7/6 | 0/2 |

Issue both times: “The learning map needs two or more developed strands for this broad topic.”

- **Absent or empty in the parsed model JSON.** The teeth mechanism, the body mechanism, and the repair’s classification and neck sentences arrived with no link. Parsing did not clear a populated array: the pre-fix planner copied an array `dependsOn` through unchanged, and the trace is taken from that parsed object.
- **Not lost by overwriting a real link.** There was no link to overwrite. The repair response was a second model object, also with empty `dependsOn`. The one allowed repair retitled T. rex and Brachiosaurus as features and added a classification mechanism, then rejected the neck sentence as `restates p6`.
- **Schema did not require the link.** `callModel` sends `response_format: { type: "json_object" }` only. That accepts any JSON object. The saved pack mechanisms were `{ claimId, text }` with no feature. The plan prompt already told the model to set `dependsOn`, and the repair still returned none. Wording alone did not produce the field.

A missing key and an explicit `[]` are the same in this trace. Either way, the parsed object contained no relationship.

## Omnivore classification

Claim `c45lqio`: “There are three main types of dinosaurs: carnivores, herbivores, and omnivores.”

- provenance `model`, confidence `high`, `factuallyVerified` false, `teacherRequested` false
- selected for the lesson (one of eight; only the system claim `cam91g` was held, for age fit)
- copied into the map as an unlinked fact on both passes

High confidence was not verification. The teacher request does not ask for three types. That sentence is not carried into teaching from a new pack: a model-originated counted list of main types, kinds, groups, classes, or categories is marked `classificationHold` and held with reason `unsupported classification`. `factuallyVerified` stays false. A count the teacher asked for, and a sentence taken from teacher material, are not held.

## Correction

The generation contract now states the relationship, and the planner keeps or rejects the model’s own ids.

- Pack mechanisms are `{ text, feature }`. `feature` is the phrase the mechanism explains. `featureClaimId` is set only when exactly one other claim contains that phrase and the mechanism shares content with both that claim and the phrase. It is not filled from point order.
- Each plan point is `{ id, knowledge, role, importance, dependsOn, explains }`. A mechanism, function, cause, or process sets `explains` to the feature’s existing id and lists that same id in `dependsOn`.
- The parser accepts `dependsOn` as an array, a string id, a comma-separated list, or `{ id }`, and also `depends_on`, `explains`, `explainId`, `featureId`, and `feature` when that value is an id (`a`, `d1`, `p2b`, `k1`, and the same shape). A phrase such as “sharp teeth” is not matched to a point.
- An id that is not on the map is dropped. It is not replaced with a neighbour.
- A mechanism/function/cause/process link to a feature, concept, fact, or definition is dropped when the two sentences share no content word beyond the lesson topic and another named point does share one. The other point is not substituted.
- Repair passes `priorPlan` into the second `normalisePlan`. If the new point has no refs, links are restored by matching the earlier sentence and the earlier dependency’s sentence. A new sentence does not inherit another point’s link.
- Strand minimum, depth floor, and the one-repair budget are unchanged. Empty `dependsOn` is not filled from point order. The existing foundation attach, used only when linked rows are below the depth floor, is unchanged.

## Focused checks

`tests/link-contract.test.js` (saved Year 3 sentences, not a live call):

- empty `dependsOn` on the saved order is not filled from the previous point
- an array link, a string id, and an `explains` id from teeth to T. rex are kept
- teeth → Mesozoic is dropped and is not moved onto T. rex
- an unknown id is dropped
- a repair that omits `dependsOn` restores the earlier teeth → T. rex link; a new feathers sentence does not inherit it
- the omnivore claim stays unverified, is held, and is listed in `doNotTeach`
- a pack feature “sharp teeth” links the teeth mechanism to the T. rex claim; a feature “Mesozoic Era” does not create a link

Regression suites that passed after the id-shape correction: knowledge-quality-gate, link-contract, goal-reach, bounded-corrections, teaching-plan, strand-live-maps, knowledge-depth, developed-strands, knowledge-pack, teacher-intent, generation-path, learning-map, repair-diagnosis, learning-richness, generate-loader.

The goal-reach dinosaur fixture still expects one developed strand (teeth → types) and does not count the environment-influenced sentence. That link is a model-supplied id. It is kept because the sentences share diet words. It is not invented.

## Live validation

`OPENAI_API_KEY` is absent in this environment. No second live Year 3 path was run. The saved run remains the only live evidence, and it failed before a pupil lesson:

`EDUCATIONAL_VALIDATION_FAILED` — “The learning map needs two or more developed strands for this broad topic.”

Unit and saved-map checks passing is not live success. A machine with the key can re-run:

```
GOAL_REACH_CASES=y3-dinosaurs GOAL_REACH_OUT=docs/agent/y3-dependson-links node scripts/goal-reach-live.js
```

Prior evidence under `docs/agent/y3-dinosaur-path/`, `docs/agent/goal-reach-contribution/`, and `docs/agent/bounded-corrections-live/` is left as it was.
