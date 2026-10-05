# Roadmap

## DO NOT WORK AHEAD

Work only on the current milestone. Do not start the next one, "prepare" for it, or refactor toward it, until the product owner says the current one is done. Finishing early is a reason to report, not to continue.

## Phase 9.15.3B — client participation parity and structural strands (CURRENT)

| # | Item | Status |
| --- | --- | --- |
| 1 | One participation contract: the browser re-accept uses the beat-based `participationIssues` when the adventure carries a beat skeleton, without server-only judges; beatless lessons keep the legacy rule | Done in `c28c7f7` |
| 2 | A developed strand is structural: an explained or supporting point depends on a substantive point in the same strand; no phrase lists | Done in `c28c7f7` |
| 3 | The production flat map (`469a81fc`) fails the first pass; the repair brief explains `dependsOn` with a topic-neutral example | Done in `c28c7f7` |
| 4 | Diagnostics: `PLAN_VALIDATE.firstPass`; `PLAN_REPAIR` with `repairInstruction`, `repaired`, `ok`, `issues` | Done in `c28c7f7` |
| 5 | Regression tests: `participation-parity`, `developed-strands`, and an updated `teaching-plan` | Done in `c28c7f7`; deployed |
| 6 | **ONE broad-sharks human canary** (Year 1, Science, 15 min, "Teach children about sharks.") | **PENDING: product owner runs it.** Agents do not generate it. |

If the canary fails, diagnose that single request (`ENGINEERING_RULES.md`) before anything else. Do not run a second canary while the first failure is unexplained.

## Phase 9.15.4 — a proper final challenge

- About **4 questions** for Year 1–2 at about 15 minutes; **5–6** for older pupils.
- Spread across the taught strands (threads), not all on one fact.
- Mix **retrieval, explanation and application**.
- Every question taught-before; no giveaways.
- These are targets, not hard quotas. Today `DEPTH_BANDS.questions` is 2 / 3 / 4.

## Phase 9.15.5 — meaningful interaction registry

A registry of interactions that use the knowledge being taught, playable in the scene player:

- tap / find
- label
- match
- sort
- sequence
- choose / predict
- simple manipulate

This replaces today's tap-to-reveal conversion of generic move/drag steps.

## Phase 9.15.6 — richer scene visuals

Visuals planned per learning scene rather than one per internal stage, so teaching scenes stop sharing the same picture.

## Later (unordered until the product owner orders them)

- Loading UX during generation and world creation
- Teacher polish
- Reliability
- Cost and latency
