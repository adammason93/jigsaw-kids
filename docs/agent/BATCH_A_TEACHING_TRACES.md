# Batch A teaching traces

These traces are produced by the existing Teaching Beat Layer (`planBeats` / `teachingTrace`) for three representative plans. Wondii chooses the beats, the order, the stage, and the knowledge refs. The model only writes the pupil sentence for the beat it is given.

Depth is the existing `depthBudget`: Year 2 asks up to 2 check questions, Year 4 up to 3, Year 6 up to 4. The check asks fewer only when the map has fewer assessable points. Every use, check, and consolidation below refers to a ref that was already taught.

## Year 2 plants

Year 2, 15 minutes. Depth floor 5, max 6, question budget 2, check questions 2. Check strands: t1, t2.

| Knowledge | Where the pupil first learns it | Where they use it | Where Wondii checks it | Consolidation |
| --- | --- | --- | --- | --- |
| A plant is a living thing that needs water and light to grow. | name, then exemplify, in teach |  |  | recap:0 |
| Roots grow down into the soil. | name in teach |  |  | recap:0 |
| Roots take in water from the soil, and the stem carries it up to the leaves. | explain in teach | practise in apply | check:0 | recap:0 |
| Most leaves are wide and flat. | name in teach |  |  | recap:1 |
| Leaves use light to make food that helps the plant grow. | explain in teach |  | check:1 | recap:1 |

The pupil meets the plant, then the two strands (roots, leaves). Apply practises the water path that was explained. The check retrieves that path and the leaf explanation, one question each. Recap consolidates only those taught refs.

## Year 4 equivalent fractions

Year 4, 20 minutes. Depth floor 6, max 9, question budget 3, check questions 2. Check strands: f, t1.

| Knowledge | Where the pupil first learns it | Where they use it | Where Wondii checks it | Consolidation |
| --- | --- | --- | --- | --- |
| Equivalent fractions are different names for the same amount. | name, then exemplify, in teach |  | check:0 | recap:0 |
| One half is the same amount as two quarters. | exemplify in teach |  |  | recap:0 |
| Multiply the top and the bottom by the same number. | name, then model, in teach | apply | check:1 | recap:0 |

The procedure is modelled, not only named, and that modelled step is the apply task. The check retrieves the definition and the procedure. The budget is 3, and the map has two assessable points, so the check stops at two. It does not invent a third question.

## Year 6 rivers

Year 6, 20 minutes. Depth floor 7, max 10, question budget 4, check questions 4. Check strands: f, t1, t2, t3.

| Knowledge | Where the pupil first learns it | Where they use it | Where Wondii checks it | Consolidation |
| --- | --- | --- | --- | --- |
| A river is water flowing downhill in a channel from its source to its mouth. | name in teach |  | check:0 | recap:0 |
| Rain on high ground feeds small streams. | name in teach |  |  | recap:0 |
| Tributaries join the main river, so it carries more water as it flows downstream. | name, then model, in teach |  | check:1 | recap:0 |
| Fast water picks up stones and drags them along the riverbed. | explain in teach |  | check:2 | recap:1 |
| The moving stones wear away the banks, which deepens the valley. | explain in teach |  |  | recap:1 |
| When the river slows, it drops the mud it was carrying. | explain in teach | apply | check:3 | recap:2 |
| Dropped mud builds new land, such as a delta at the mouth. | explain, then exemplify, in teach |  |  | recap:2 |
| The Nile delta grew where the river dropped mud into the sea. | exemplify in teach |  |  | recap:2 |

Four strands are checked. Apply uses the deposition explanation, which was taught before the task. The Nile delta is an example of that deposition, not a new fact in the recap.

## What now fails closed

A correct `knowledgeRef` is not enough.

- An explain beat that only names the thing is rejected.
- An exemplify beat that only says an example exists is rejected.
- A model beat that only says there is a worked step is rejected.
- A practise beat that only says "use it in what you make" is rejected.
- A reveal or consolidate beat that only says the class can now use the idea is rejected.
- A check question whose prompt and answer do not draw on the retrieve beat's knowledge is rejected.
- Draw-and-explain of the named fact fails the existing apply gate as not-an-action. A task that shows the idea in action, such as "Show the fins pushing against the water", still passes that gate.
- Model and exemplify beats are no longer the first moves dropped when a stage is shortened.

## What still fails closed, unchanged

- A pure restatement of the fact, with no drawing verb, stays unresolved until the frozen apply judge. That path was not loosened.
- Check questions that do mention the taught knowledge still go through the frozen evidence judge. Partial and unrelated coverage still fail.
- Apply is still one focus on the existing story interaction. The check is still the quiz. No new mechanic was added.
- The question budget is a ceiling. A lesson is not padded with extra questions when the map has fewer assessable points.
