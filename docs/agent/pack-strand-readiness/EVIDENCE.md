# Pack strand readiness

A resolved `featureClaimId` is not a teaching pair. Strand structure is built only from a pair that names a concrete feature, explains how or why that feature works, links two different selected claims, and belongs to the learning goal. `factuallyVerified` stays false. Depth, strand minima, and `statesMechanism` are unchanged. `helped` was not added.

This is not a live pupil lesson. `OPENAI_API_KEY` is absent, so no model call was made. Prior evidence under `docs/agent/y3-dinosaur-path/`, `docs/agent/y3-dependson-links/`, `docs/agent/goal-reach-contribution/`, `docs/agent/bounded-corrections-live/`, and `docs/agent/strand-aiding/` is unchanged.

The saved live JSON for the two Year 3 runs is not in this repo. The replay uses the relationships and wording in the strand-loss diagnosis. Claim ids match the live pack only where the sentence is the same saved sentence (`clgk2q7` for the sharp-teeth claim). Other ids are from these sentences, not from the missing JSON.

## What the code does

The pack prompt asks for `strandPairsRequired` distinct pairs. Each pair is a concrete claim that names a feature and a different claim that states how or why it works. The number is the strand count the lesson already requires.

After the pack is selected, and before any lesson plan call, readiness is checked. Fewer ready pairs than that count returns `PACK_INCOMPLETE` and names the missing substance. The plan and the one plan repair are not called. No extra model call or repair attempt was added.

When a pair is ready, map building sets the explanation's `dependsOn` to that feature claim, including when the model pointed at a different hub. An empty `featureClaimId` does not create a head. An unrelated feature link is not moved onto a neighbour. Point order does not fill `dependsOn`. If pruning removes a ready pair, readiness is checked again and the removal reason is reported.

## Four outcomes

`PACK_INCOMPLETE` is earlier detection. The milestone is still a complete coherent lesson. These replays do not meet it.

| | Run 1 replay | Run 2 replay | Live Year 3 |
| --- | --- | --- | --- |
| Pack readiness | Incomplete. 1 of 2. The body-shape pair is ready (`affects`). The teeth pair resolves an id and is not ready. The neck has no feature claim. | Incomplete. 0 of 2. Legs and necks have no feature claim. The teeth id is `clgk2q7` and the `helped` explanation is not ready. | Not run. |
| Relationships preserved | Not attempted. Generation stops before the plan. | Not attempted. A replay map does not invent neck or leg heads and does not protect the thin teeth edge. | Not run. |
| Educational validation | Not reached. | Not reached. | Not run. |
| Complete lesson | No. | No. | No. |

Run 1 issue:

`PACK_INCOMPLETE: this lesson needs 2 distinct feature-and-explanation pairs. The pack has 1.` The neck is missing a concrete feature. The teeth sentence is missing a how or why, even though the feature claim resolves.

Run 2 issue:

`PACK_INCOMPLETE: this lesson needs 2 distinct feature-and-explanation pairs. The pack has 0.` Legs are missing a feature claim and a how or why. Necks are missing a feature claim (`allowed` would count as a mechanism if a real feature claim existed). Teeth resolve `clgk2q7` and still fail because the explanation does not state how or why.

## Negative checks

`tests/pack-readiness.test.js`:

- Resolved id plus an explanation that does not state how or why (`determine`, `helped`) is not ready. A `factuallyVerified: true` flag on the raw claim does not change that, and the stored claim stays unverified.
- An unrelated feature phrase does not create a link and is not moved onto a neighbouring claim.
- Two substantive teeth pairs count as one teaching idea.
- A moon-and-tide pair inside a dinosaur lesson is not relevant to the goal.
- Two concrete facts and no mechanism is incomplete.
- A validated teeth pair that the model hangs on a fossil hub is rebuilt onto the sharp-teeth claim.
- An echoed explanation that pruning removes is reported with the prune reason, and the remaining count is rechecked.
- `help` still develops a strand. `helped` does not. Year 3 still requires depth 6 and 2 strands.

## Offline checks

Passed: `pack-readiness`, `link-contract`, `knowledge-quality-gate`, `learning-map`, `developed-strands`, `goal-reach`, `teacher-intent`, `evidence-contract`, `knowledge-pack`, `knowledge-depth`, `teaching-plan`, `generation-path`, `strand-live-maps`, `bounded-corrections`, `repair-diagnosis`, `learning-richness`, `generate-loader`, `lesson-brain`.

`generation-path` is a stubbed pipeline. Its pack fixture now names `pointed body` and `strong tail`. With those two ready pairs the boot continues, both edges stay on their features, teaching-plan depth is met at 2 of 2 strands, and the stub returns `COMPLETE`. That is not a live lesson.

`apply-routing` fails on this branch and on the parent commit with the same `shared-knowledge` result. It was not changed here.

## Live

`OPENAI_API_KEY` is not set. The harness was invoked for Year 3 only. Sharks were not run. See `LIVE_VALIDATION_BLOCKED.md`. Two live runs were not made.

On a machine with the key, two separate Year 3 runs:

```
GOAL_REACH_CASES=y3-dinosaurs GOAL_REACH_OUT=docs/agent/pack-strand-readiness/run1 LESSON_MODEL=gpt-4o-mini node scripts/goal-reach-live.js
GOAL_REACH_CASES=y3-dinosaurs GOAL_REACH_OUT=docs/agent/pack-strand-readiness/run2 LESSON_MODEL=gpt-4o-mini node scripts/goal-reach-live.js
```

A live `PACK_INCOMPLETE` means the pack was caught before lesson generation. It is not a complete lesson. A live complete lesson still has to pass educational validation.
