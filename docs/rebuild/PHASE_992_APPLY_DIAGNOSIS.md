# Phase 9.9.2 apply bottleneck diagnosis

Diagnostic only. Production lesson code was not changed. Evidence is the frozen Phase 9.9.1 run in `PHASE_991_RESULTS.json`. Lessons were not regenerated.

The saved adventure, and therefore the full `requiredKnowledge` list, exists for the 10 delivered lessons. The 14 rejected lessons store the original apply, the repaired apply, and the deterministic reason, but not the competing knowledge sentence.

## Decision

B. Deterministic validation is the primary problem.

Of 17 first-pass apply failures, 14 are educationally valid tasks rejected by a lexical rule. Three are weak or not really an application. None of the seven first-pass passes is a false accept. The semantic judge ran once, after a repair reached `unresolved`. The other hard fails never reach it.

## Confusion table

Educational judgement is of the original model apply, not the validator.

| Educational class | Deterministic pass | Deterministic fail | Unresolved |
|---|---|---|---|
| GOOD_APPLY or WEAK_BUT_VALID (21) | 7 | 14 | 0 |
| RECALL, WRONG_KNOWLEDGE, or NOT_ACTION (3) | 0 | 3 | 0 |

First-pass passes, all valid: shadows, rivers, loud, speech, chrono, maps, angles.

## False rejects

The original task uses the taught idea. The validator returned fail.

| ID | Educational class | Rule | Why the wording failed |
|---|---|---|---|
| y3-arrays | GOOD | different-knowledge | "Create an array to show a multiplication fact" overlaps a sibling sentence more than the named definition. |
| y2-habitats | WEAK_BUT_VALID | different-knowledge | "Identify what each animal needs" uses habitat provisions, and a sibling sentence outscored the named one. |
| y6-evidence | GOOD | not-an-action | "Analyze a source" is a real task. Analyze is not an allowlisted verb. |
| y1-shapes | WEAK_BUT_VALID | topic-word-only | "Draw a square, circle, and triangle" shares only "square" with "four equal sides". |
| y5-settlements | GOOD | not-an-action | "List the advantages" of rivers and hills. List is not an allowlisted verb. |
| y2-lifecycle | GOOD | topic-word-only | "Arrange the stages" shares only "life" with "Frogs start as eggs in water". |
| y3-backbone | GOOD | topic-word-only | "Sort the pictures into two groups" shares only "animal" with the vertebrate sentence. The criterion is in the target, which the matcher does not read. |
| y4-states | GOOD | not-an-action | "Experiment with heating and cooling". Experiment is not an allowlisted verb. |
| y2-order | GOOD | not-an-action | "Try adding these pairs in both orders". Add and try are not allowlisted. |
| y6-infer | GOOD | different-knowledge | Inferring a feeling from a letter is the goal. A sibling sentence outscored the named inference sentence. |
| y3-magnets | GOOD | topic-word-only | "Sort magnetic and non-magnetic" shares only "materials" with "iron, nickel, or cobalt". |
| y1-forces | GOOD | topic-word-only | "Show a push and a pull" shares only "push" with the push definition. Pull is the other half of the goal. |
| y3-questions | WEAK_BUT_VALID | topic-word-only | "Write questions using question marks" shares only "question" with the definition sentence. |
| y5-persuade | GOOD | topic-word-only | "Write a short argument" shares only "argument" with the structure sentence. |

## False accepts

None. The three educationally weak originals (plants, flood, sources) were all deterministic fails.

## 17 first-pass failures by rule

| Rule | Count | IDs |
|---|---|---|
| not-an-action | 7 | evidence, settlements, plants, flood, states, order, sources |
| topic-word-only | 7 | shapes, lifecycle, backbone, magnets, forces, questions, persuade |
| different-knowledge | 3 | arrays, habitats, infer |
| recall-only | 0 | |
| selection-only | 0 | |
| mechanic mismatch | 0 | The validator has no such reason. |
| missing contract field | 0 | |
| other | 0 | |

Representative cases:

- not-an-action: "Try adding these pairs in both orders" (order). "Analyze a source" (evidence). "Experiment with heating and cooling" (states). Each is a pupil task. The allowlist does not contain add, analyze, or experiment.
- topic-word-only: "Sort magnetic and non-magnetic" against iron/nickel/cobalt (magnets). "Draw a square, circle, and triangle" against four equal sides (shapes). "Write a short argument" against main point, details, and conclusion (persuade). One shared stem, and the named sentence has three or more content words, is a hard fail.
- different-knowledge: creating an array "to show a multiplication fact" (arrays). The instruction is the right lesson, and another required sentence contains more of its words than the sentence named in knowledgeUsed.

Fourteen of the 17 fails are the wording test. Three tasks are themselves weak: pouring water on a plant (plants), talking about flood scenarios (flood), and discussing a source (sources).

## Required knowledge

Full key-knowledge lists were stored for delivered lessons only.

| Question | Count of the 17 |
|---|---|
| Named knowledge is on the teacher's goal | 15 |
| It is the piece this task should use | 12 |
| The model task uses an equivalent or paraphrased idea | 14 |
| The matcher fails because the words differ | 14 |
| The model task uses a genuinely different fact | 3 |

The three different-fact cases are plants (pouring water, while the named fact is roots absorbing water), and the narrow named sentences for forces (push only) and lifecycle (eggs only). Those two tasks still use the lesson goal. They fail because the named sentence is a slice of the goal and the instruction does not repeat that slice.

## Mechanic and interaction family

The family is a label on a story slot. It does not by itself reject the instruction. Writing, drawing, measuring, and adding were often labeled match or sort, and the instruction was still allowed to say draw, write, or measure.

| Fit | Rejected applies |
|---|---|
| Clearly suitable | forces (move), magnets (move objects into groups), backbone (move pictures), settlements once rewritten as sort |
| Usable but awkward | shapes, order, questions, persuade, infer, evidence, sources, flood, states, lifecycle, arrays |
| Materially obstructs | habitats |

Habitats is the obstructive case. The original task was "identify what each animal needs". The repair, under the science move family, became "drag each animal to its habitat". That no longer uses food, water, and shelter, and it still failed.

Pedagogy ownership is awkward. It is not the reason 13 lessons failed apply.

## Repair quality

Seventeen apply repairs.

| Outcome | Count | IDs |
|---|---|---|
| Wording change let an already valid task pass | 4 | arrays, backbone, states, persuade |
| Still failed for the same rule | 11 | evidence, shapes, lifecycle, plants, flood, order, infer, magnets, forces, questions, sources |
| Failed for a different rule | 1 | settlements (not-an-action, then different-knowledge) |
| Made an already valid task worse | 1 | habitats |
| Fixed a genuine educational defect | 0 | |

States is the repair that reached the judge. "Experiment" became "Choose a material and heat it". Choose is allowlisted. "Heat" is four letters, so it does not count as a prefix of "heating". Overlap was unresolved. The judge said apply, and the lesson was delivered.

Persuade, arrays, and backbone passed after the repair copied more of the knowledge sentence into the instruction. The original tasks were already valid.

Order's repair became "Add 2 + 4 and 4 + 2", which is a better task, and still failed because add is not allowlisted.

## Semantic routing

`applyAlignment` returns fail, not unresolved, for recall-only, pupil selection, a bare interaction, a missing allowlisted verb, an unidentified knowledgeUsed, a competing sentence, and a single stem on a sentence of three or more words. The judge runs only for unresolved: restatement, no lexical overlap, or a partial overlap that is not the single-stem fail.

All 17 first-pass failures were one of those hard fails. The judge cannot override them.

If the 14 false rejects had arrived as unresolved, the frozen M.4 judge would have been the right tool. They are paraphrases and unlisted verbs, which is what that judge is for. Magnets, forces, order, evidence, and persuade are the clearest examples. This run does not show that the judge would have accepted them, because it was not called.

## Prior-knowledge four

| ID | Goal | Original apply | First result | Repair | Educational judgement | Cause |
|---|---|---|---|---|---|---|
| y2-order | Addition can be done in either order. | Try adding pairs in both orders and show the sums match. | not-an-action | Add 2+4 and 4+2. Still not-an-action. | GOOD_APPLY | Deterministic verb list. |
| y6-infer | Infer a feeling the writer does not state. | Use the letter to infer the writer's feelings. | different-knowledge | Identify the feelings using clues. Still different-knowledge. | GOOD_APPLY | Deterministic sibling-sentence rule. |
| y3-maps | Use a key and a compass point. | Use the key and compass points to find a location. | pass | Apply stayed a pass. | GOOD_APPLY | Not apply. The source-word gate rejected the lesson. |
| y3-magnets | Which materials a magnet pulls. | Sort materials into magnetic and non-magnetic. | topic-word-only | Same instruction. Still topic-word-only. | GOOD_APPLY | Deterministic single-stem rule. |

## Maps leftover raw-word gate

The check is in `educationalIssues` in `js/lesson-brain.js`, after teacher-intent coverage. It collects words from the raw teacher text that are longer than five letters and are not focus-concept words. If there are at least three, one of them must appear in the pupil text. Otherwise the issue is "The teacher's source material was not used."

The maps request contains picture, reteach, and something, plus geography. Compass and points are focus words, so they do not count. A lesson that correctly avoids "reteach" and "picture" fails. The same pattern can hit any request whose long words are constraints or filler rather than the new idea, especially "do not reteach" requests. It is outside the teacher-intent coverage check. It fired once in this run.

## Known check failures

Unchanged, and separate from apply:

- arrays: "What is an array?"
- rivers: "Where does a river begin?"
- angles: "What is a protractor used for?"
- persuasion: "Does your argument have a clear structure?"

## Root cause of the 14 undelivered lessons

| Cause | Count | IDs |
|---|---|---|
| False deterministic rejection | 10 | habitats, evidence, shapes, settlements, lifecycle, order, infer, magnets, forces, questions |
| Bad apply generation | 3 | plants, flood, sources |
| Required-knowledge mismatch as the primary cause | 0 | |
| Mechanic constraint as the primary cause | 0 | |
| Failed repair as the primary cause | 0 | |
| Non-apply gate | 1 | maps |
| Mixed, no primary | 0 | |

## Tests

`teacher-intent`, `apply-semantic`, `apply-alignment-audit`, and `lesson-quality` still exit 0. No production assertion was changed.
