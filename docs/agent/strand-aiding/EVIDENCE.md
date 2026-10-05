# Strand counter: count `aiding` as a function verb

Draft only. Not merged. Not deployed. Pull requests #13, #14, #15, and #16 stay separate drafts.

## What changed

`statesFunction` in `js/lesson-brain.js` listed `aid`, `aids`, and `aided`, and omitted `aiding`. Every other verb in that list already had its `-ing` form. The one-word addition is `aiding`, next to those forms.

`strandsRequired`, `strandsOf`, the paraphrase rule, and the goal-reach filter are unchanged. Singleton functions still do not develop a strand. No shark or dinosaur keyword was added. Dinosaur planner and pack prompts are unchanged.

## STRAND_TRACE

The diagnosis used the saved repaired maps from the live run.

- Year 4 sharks, cartilage strand. Grouping was already correct (`k3` feature → `k4` mechanism). The mechanism "The cartilage structure provides flexibility and buoyancy, aiding in movement." is a genuine how/why. Overlap with the feature was 0.29, below the 0.75 paraphrase threshold, so it stayed substantive. `statesMechanism` missed it only because `aiding` was not a function verb. With the inflection, that strand develops and the saved map is 3 of 3. Without it, the same map is 2 of 3.
- Year 3 dinosaurs, habitats strand. "Dinosaurs adapted to their environments, which influenced their physical features and behaviors." names no habitat, feature, or mechanism. That is inadequate how/why, not a counter miss. The saved map stays 1 of 2. The lexicon was not loosened for it.

## Separate finding, not changed here

A later live rerun, recorded in the STRAND_TRACE addendum, still failed the shark lesson after this inflection. The goal-reach filter ("not connected to the learning goal") dropped pairs whose wording did not share the outcome words of the goal. That filter is a separate decision and is not changed in this pull request.
