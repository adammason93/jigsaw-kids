# Year 3 dinosaur path — depth, apply, check, required evidence

Draft only. Not merged. Not deployed. No retrieval. No extra repair attempt. Shark goal-reach pruning is unchanged. Prior files under `docs/agent/goal-reach-contribution/` are unchanged.

Diagnosis uses the saved Year 3 run (terminal `EDUCATIONAL_VALIDATION_FAILED`, not `COMPLETE`). The checkout replay below is the same proposed map run through the corrected planner. It is a plan. It is not a pupil lesson.

## Saved run

Request: “Year 3 science. Teach children about dinosaurs.” Model `gpt-4o-mini`. Selected pack (contested extinction held back):

| claim | role in the pack |
| --- | --- |
| Dinosaurs lived during the Mesozoic Era, which lasted about 180 million years. | fact |
| There are two main types of dinosaurs: herbivores, which eat plants, and carnivores, which eat meat. | fact |
| Tyrannosaurus rex, powerful jaws and sharp teeth | fact |
| Sharp teeth tear flesh; effective predator | mechanism |
| Brachiosaurus, long neck for high vegetation | fact |
| Long neck reaches high trees and helps it survive | mechanism |

The planner proposed all six. The connection filter kept the two feature→mechanism pairs and rejected the era and the two types with **not connected to the learning map**. That reason is the orphan rule (a point with no `dependsOn`, and nothing depending on it), not the shark rule **not connected to the learning goal**.

| | strands | depth | plan `ok` | `met` |
| --- | --- | --- | --- | --- |
| first pass | 2 / 2 | 4 / 6 | false | — |
| after one repair | 2 / 2 | 4 / 6 | true, issues empty | false |

The repair’s two extra sentences were rejected as **invented fact outside the knowledge pack**. `breadthSettled` then waived the depth floor because the goal is a broad topic and the strand count was already met, so the pipeline continued with a four-point map.

Content was generated and not admitted. Issues: “The apply slot does not use the taught knowledge.” and “The check scores knowledge that was not taught.” Apply after the one content repair: “Choose one dinosaur and explain how its features help it survive.” Check prompt: “What features help the Tyrannosaurus rex survive?” Correct answer: “Its sharp teeth for tearing flesh.” Choices also included the long neck and “Its speed for escaping predators.” Check coverage was `partial`. `requiredEvidence` was “Students can identify and describe at least three different types of dinosaurs and their features.”

No `COMPLETE` adventure was returned. The teach, apply, and check lines above are diagnostic quotes from that failed run. They are not a lesson children were given.

## 1. Depth — why 4/6

Year 3, 15 minutes, broad topic: depth floor 6, strand minimum 2. Achieved depth counts substantive points, plus at most one supporting point and one synthesis point. Two developed strands meet the strand minimum and still leave the map at 4.

The missing substance was already in the selected pack: the Mesozoic sentence and the herbivore/carnivore sentence. The repair did not put them back. It paraphrased the teeth and neck sentences, and pack grounding correctly refused those paraphrases. Nothing in the pack names a third dinosaur type, so a third type was not added.

The connection filter now keeps an unlinked selected-pack claim when the linked map is still under the depth floor, the claim’s role is prior knowledge (fact, concept, foundation, definition, or unlabelled), and it shares a content stem of at least five letters with a point that was already linked. That claim is labelled foundation and the linked points depend on it. A map that is already at the floor does not take an extra unlinked claim. An unlinked mechanism is not attached this way. Two developed strands do not waive the floor. After the one plan repair, the floor is still waived only while the strand count itself is the open failure, so a broad topic that has not yet formed its strands keeps that existing diagnosis.

Replay of the saved six-claim proposal, including with `breadthSettled`:

| id | role | depends on | knowledge |
| --- | --- | --- | --- |
| k1 | foundation | — | Mesozoic Era, about 180 million years |
| k2 | foundation | — | two main types: herbivores and carnivores |
| k3 | fact | k1, k2 | T. rex, powerful jaws and sharp teeth |
| k4 | mechanism | k3 | sharp teeth tear flesh; effective predator |
| k5 | fact | k1, k2 | Brachiosaurus, long neck for high vegetation |
| k6 | mechanism | k5 | long neck reaches high trees and helps it survive |

Result: `ok: true`, depth **6 / 6**, strands **2 / 2**, `met: true`. The same invented paraphrases are still **invented fact outside the knowledge pack**.

## 2. Apply

`apply.requiredKnowledge` stays the full key-knowledge list. Alignment statuses are unchanged: a deterministic fail stays a fail, and an unresolved case still goes to the judge.

The saved task named neither the teeth mechanism nor the neck mechanism. It asked the pupil to choose a dinosaur and talk about features in general. The apply beat was the teeth explanation. The content brief and the one slot-repair brief now name that taught idea and require the pupil sentence and the instruction to show how the pupil uses it on a new case. “Choose a topic and explain its features” is named as not using it.

The model can still write a task that misses that idea. There is still only one slot repair.

## 3. Check

Check refs on the saved map were the teeth mechanism and the neck mechanism, both taught before the check. The hard failure is the untaught-knowledge scan, not a retrieve beat aimed at a later point.

That scan used to read the question, the correct answer, and the feedback. Feedback may restate a dropped wording. The scan now reads the question and the correct answer. A correct answer that uses a word only present in dropped knowledge still fails with “The check scores knowledge that was not taught.” A wrong choice may be a short alternative that was not taught. The content brief tells the model that the correct answer has to be the retrieve beat’s already-taught knowledge, and that a fact left out of the map is not the correct answer.

The saved check’s `check-partial` verdicts stay quality warnings after the one repair. They are not turned into a pass, and the evidence gate is not lowered.

## 4. Required evidence — three types

Origin: the teacher-intent model. The request was “Teach children about dinosaurs.” The year is Year 3. The selected pack states two types, herbivore and carnivore, and uses T. rex and Brachiosaurus as examples. It does not state a third type. “Year 3” is not a request for three types. Adding a third type would invent a pack fact. The educational requirement is the types and features the pack actually supports, not a count the model inserted.

`requiredEvidence` generation is told not to put a count of types, kinds, examples, or features in the evidence unless the teacher asked for that count. `normaliseTeacherIntent` removes an unrequested count of that kind. A count the teacher did ask for is kept. On the saved sentence, the count drops and the rest stays: “Students can identify and describe types of dinosaurs and their features.”

## Live pipeline

`OPENAI_API_KEY` is not set. No model call was made. No fixture lesson is presented as live evidence.

```
GOAL_REACH_CASES=y3-dinosaurs GOAL_REACH_OUT=docs/agent/y3-dinosaur-path node scripts/goal-reach-live.js
```

That wrote `docs/agent/y3-dinosaur-path/LIVE_VALIDATION_BLOCKED.md` and did not write `y3-dinosaurs.json`. `docs/agent/goal-reach-contribution/LIVE_VALIDATION_BLOCKED.md` is still the earlier file.

## Pupil lesson

None admitted. There is no `COMPLETE` adventure to inspect, so this note does not say what children learn, what the apply task is, or what the check asks, beyond the failed-run quotes above.

## Remaining failures

- Live Year 3 generation is blocked until the key is present. The harness runs that case only, one plan repair, the engine’s one slot repair, and no shark case.
- A later model can still miss the named apply idea, or put an untaught fact in the correct answer. Those stay failures.
- A check that covers less than the required evidence can still finish as `check-partial` after repair. That warning is unchanged.
- A broad map that is still short of its strand count after one repair can still pass the depth floor. A broad map that already has its strands cannot.
