# Goal-reach contribution and dinosaur pack guidance

Draft only. Not merged. Not deployed. Pull requests #13, #14, #15, #16, and #17 stay separate drafts. This branch starts at the head of #17 (`cursor/strand-aiding-inflection-377c`, `443fdf3`), so `statesFunction` still includes `aiding`. No retrieval. No extra repair attempt. Strand minimums are unchanged.

## 1. Goal-reach pruning

`buildLearningMap` treats a how/why contribution question as `seeksContribution`. A point used to count as answering only when `statesFunction` or `statesRelation` was true and the point shared a stem with the words after the contribution verb (`outcomeWords`). If any point answered, the filter kept that point's dependency component and rejected everything else with **"not connected to the learning goal"**.

For "how are sharks adapted to living in the ocean" those outcome words are the setting: ocean, environment, living. A parallel adaptation that explains a feature's job, and does not repeat the setting, was not an answer. The strand counter then saw too few strands. Year 4 still requires 3 developed strands for this depth-seeking goal. The filter was removing the breadth the counter requires. It was also keeping a sentence about something else when that sentence happened to say "ocean" and use a function verb.

### Saved bounded-corrections-live Year 4 map

Source: the repaired map in the saved `y4-sharks` run (six points: streamlined, cartilage, ampullae, each with a mechanism). Replayed through `buildLearningMap` on this branch.

Outcome words of the goal: ocean, environment. None of the six sentences contain them, so `answers` was false for every point. The goal-reach branch did not run. The dependency branch kept all six, because each mechanism depends on its feature. Nothing was rejected. With `aiding` present, the cartilage mechanism develops its strand: **3 of 3, plan ok**. This saved map is the counter miss fixed in #17. It is not the pruning miss.

| point | before | after | removal reason |
| --- | --- | --- | --- |
| Streamlined body reduces water resistance | kept | kept | — |
| Streamlined shape reduces drag, allowing sharks to swim | kept | kept | — |
| Cartilage instead of bones, which makes them lighter | kept | kept | — |
| Cartilage provides flexibility and buoyancy, aiding in movement | kept | kept | — |
| Ampullae of Lorenzini detects electrical fields | kept | kept | — |
| Ampullae help sharks detect prey | kept | kept | — |

### Live-v2 pattern

The later live rerun's raw model JSON was not in the saved files. The written trace of that run says the repaired map that reached the counter had collapsed to the cartilage pair, and that a three-pair map taken from that pack collapsed the same way because only the buoyancy sentence shared "ocean".

That filter is reproduced here with three parallel pairs, plus two irrelevant points. Only "Cartilage helps sharks maintain buoyancy in the ocean" and "The ocean covers most of the Earth and helps clouds form rain" share the setting and state a function. The cartilage mechanism in the regression does not say "shark" or "ocean"; it depends on "Sharks have a layer of cartilage instead of bones."

Before this change:

| point | answers by shared setting word | after filter | removal reason |
| --- | --- | --- | --- |
| Streamlined bodies reduce water resistance | no | removed | not connected to the learning goal |
| Streamlined shape reduces drag, allowing sharks to swim | no | removed | not connected to the learning goal |
| Cartilage instead of bones | no | kept | dependency of the buoyancy sentence |
| Cartilage helps sharks maintain buoyancy in the ocean | yes | kept | — |
| Ampullae detects electrical fields | no | removed | not connected to the learning goal |
| Ampullae help sharks detect prey | no | removed | not connected to the learning goal |
| The ocean helps clouds form rain | yes | kept | — |
| Sharks are a kind of fish | no | removed | not connected to the learning goal |

Result: **1 of 3** developed strands. The irrelevant clouds sentence stayed. The two real parallel strands did not.

After this change the same map keeps the three feature→mechanism pairs, including the cartilage mechanism that never says "shark". It rejects the clouds sentence and "Sharks are a kind of fish", both with **"not connected to the learning goal"**. Developed strands **3 of 3**. Required strands still **3**.

The same shape on camels ("how are camels adapted to the desert") kept the hump and eyelash strands, which never say "desert", and rejected "The desert is hot in the day, which helps a mirage form" and "Camels are mammals." One pair still develops 1 strand against a requirement of 3. Three extra feature names with no mechanism are rejected and do not raise the count.

A specific outcome is unchanged. "How a shark's body helps it swim" still keeps the swimming mechanism and still rejects "Sharks live in oceans all over the world" and the clouds sentence.

### The correction

For an adapt or survive question, a point answers when it states a function or relation of the contribution subject (the head of "how are camels adapted"), or when that function depends on a point that names the subject. The words after the verb are the setting. Sharing them is not the test.

"How a shark's body helps it swim", "how rivers change the landscape", and the other specific-outcome questions still use the outcome-word test.

`strandsRequired`, `strandsOf`, the paraphrase rule, and `aiding` are unchanged.

## 2. Year 3 dinosaurs

The saved pack's selection for Year 3 is:

| claim | what it actually says |
| --- | --- |
| Two main types, herbivores and carnivores | a classification |
| Tyrannosaurus rex had sharp teeth for eating meat | an example of that classification |
| Lived in forests, deserts, and wetlands | a list of habitats |
| Classified by body shape and size | a classification, not a job a feature does |
| Adapted to their environments, which influenced their physical features and behaviors | no habitat, no feature, no mechanism |
| Tooth structure indicates diet, helping to classify herbivore or carnivore | one concrete feature→function |

That is one developed strand (teeth and diet). The habitat sentence is grouped correctly and still does not develop a strand. The goal is a broad topic, not an adapt question, so goal-reach does not prune it. The saved repaired map stays **1 of 2**. Required strands stay **2**.

There is not a second concrete feature→function in the selected pack, so the planner was not told to split ideas it does not have. `knowledgePackBrief` now asks for several mechanisms when the topic is broad, each naming one concrete feature and the job it does, in words a child of the requested year can say, and only when that can be stated without guessing. A sentence that only says the subject is adapted, or that an environment influenced its features or behaviour, is not a mechanism. The prompt says not to invent a feature or a function to widen the pack.

Grounding admission is unchanged: `factuallyVerified` stays false, there is still no retrieval, and the Mam Tor block still fires when the goal needs an unsupported local cause.

## Detection limits

- The subject is the last content word before the adapt/survive verb. "Sharks" matches "shark". An irregular plural such as cactus/cacti can miss.
- If that head cannot be read, the outcome-word test remains.
- A function of the subject is kept even when it is not an adaptation of the subject. "Sharks help a film studio" would pass this lexical test.
- The filter trusts `dependsOn`. An irrelevant function hung on a point that names the subject is kept. A function with an empty `dependsOn` still does not develop a strand.
- A specific-outcome question still needs the outcome word. Parallel strands of "how does the body help it swim" that never say "swim" are still removed.
- The pack prompt cannot supply a mechanism the model will not state. If the model still writes the vague habitat sentence, the strand counter still rejects it.

## Checks

Unit checks, not a live model:

- `node tests/goal-reach.test.js`
- `node tests/strand-live-maps.test.js` (saved shark map 3 of 3 with `aiding`; the same map without `aiding` is 2 of 3; the dinosaur habitat strand stays undeveloped)
- `node tests/bounded-corrections.test.js` (Mam Tor `NEEDS_SOURCE` block, and an unsupported Mam Tor sentence held out of a rivers lesson)
- With those: `knowledge-pack`, `knowledge-quality-gate`, `knowledge-depth`, `developed-strands`, `learning-map`, `teaching-plan`, `generation-path`, `beat-substance`

## Live validation

**LIVE_VALIDATION_BLOCKED.** `OPENAI_API_KEY` is not set here. No live pack, map, strand count, repair, or pupil lesson was observed for this change. See `LIVE_VALIDATION_BLOCKED.md`.

```
OPENAI_API_KEY=... node scripts/goal-reach-live.js
```

That writes `y4-sharks.json` and `y3-dinosaurs.json` from real completions, including each pass's proposed map, the map after pruning, and the rejection reasons. If a case fails the existing gates, the JSON keeps the failure. The gates are not loosened to force a pass. No pupil lesson from this change has been inspected, so this note does not claim lesson quality.
