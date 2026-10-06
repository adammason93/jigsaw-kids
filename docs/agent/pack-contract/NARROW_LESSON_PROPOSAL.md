# Narrow-lesson counting: separate proposal

**Status:** PROPOSAL ONLY. **Not implemented. Not applied** to the pack model comparison.
**Date:** Tue 6 Oct 2026 (BST).
**Relationship to `PROTOCOL.md`:** none. The comparison scores T2 and T5 at their frozen counts (2 and 3). Nothing in this file changes those counts or any score.

---

## 1. The problem

`strandsRequiredFor` sets the unit minimum from the **wording** of the request: a how/why "relationship" request at Year 3 or above is depth-seeking and needs 3. That suits breadth topics, where the lesson needs several distinct ideas (sharks, Henry VIII, landslides, dinosaurs). It does not suit lessons built around **one** method, technique or rule, which are taught as one core explanation developed through examples.

Evidence comes from an offline replay at commit `0d53e3dffe528eba3189fabdb11a8e54f3835de4`, 15 minutes, with no model calls:

| Request | Scope | Minimum | Teaching view (provisional, for the Education Lead) |
|---|---|---|---|
| T2 "Year 2 maths. Show children why adding numbers in any order gives the same answer, but subtracting does not." | narrow | 2 | One core idea (combining the same amounts gives the same total) shown through examples, plus a contrast with subtraction. A count of 2 fits only if the contrast is treated as a second idea |
| T5 "Year 4 English. Teach how fronted adverbials help a reader." | narrow | **3** | **One** core explanation (it sets when, where or how before the main clause, followed by a comma), developed through examples and the pupil's own use. It is not three independent causal ideas |
| "Year 4 English. Fronted adverbials." (bare) | broad | 2 | The same lesson. A **more focused** question **raises** the minimum |

The risk is that the model either pads with weak or duplicate "ideas" to reach 3, or fails honestly.

## 2. Proposal: `lessonShape`

| `lessonShape` | Meaning | Requirement | Who sets it |
|---|---|---|---|
| `breadth` (**default**) | N distinct ideas | N distinct roots with passing first hops. **N = `strandsRequiredFor`, unchanged** | Code |
| `depth_of_one` | One core explanation developed through applications | **1 passing core unit + N distinct, accurate examples or applications**, each showing the core explanation at work rather than just naming an instance. Method and rule lessons also need **≥ 1 non-example or misconception with its correction**. N is the same number `strandsRequiredFor` gives, so the requirement **does not drop** | Code, by a deterministic rule. **The model cannot set it** |

**Guard against lowering:**
- `depth_of_one` is eligible **only** when the request names one method, technique or rule, **and** the core unit's relation type is `method_reason`, `technique_effect` or `rule_reason`.
- It is **never** used for how/why requests about a topic (sharks, Henry VIII, landslides, dinosaurs). Those stay `breadth` at their current minima.
- Breadth numbers are unchanged.

## 3. What implementing it would need (none of this is approved)

1. A founder and Education Lead decision on whether to adopt it, plus the eligibility rule wording, and whether Year 1 naming lessons (T1) need explanation units at all.
2. A separate, tested change to the pack readiness check and to the teaching-plan development check (`isDeveloped`), with fixtures showing that:
   - T2 and T5 qualify for `depth_of_one`;
   - T3, T4, T6 and T7 never do;
   - the `strandsRequiredFor` output table is byte-identical.
3. Education Lead-checked maths and English fixtures, covering both passing examples and padded failures.
4. A new comparison protocol version, if it is ever to affect scoring.

## 4. Effect on the current comparison

**None.** If T5 fails in both arms at a count of 3, that result stands in the primary totals. Read it alongside this note, not as a reason to re-score.
