# Frozen contracts

**What "frozen" means.** Do not change these incidentally: not as a side effect, not to make a test pass, not because something looks tidier. A frozen contract can change only when evidence proves it is the blocker. In that case **stop and report the evidence** to the product owner before touching it. Changing a frozen contract is a product decision, not an engineering one.

Each contract below lists what is frozen, where it lives, and why.

## 1. The seven internal stages

`hook → investigate → teach → apply → check → resolution → recap` (`SCENE_STAGES`, `lessonSkeleton`, `STAGE_ORDER`).

**Why:** planning, beats, the taught ledger, validation, slot repair, scenes and visuals are all keyed on these ids and this order. Changing them invalidates every downstream contract and every saved adventure. They are internal: they are not seven screens and must not be exposed as such.

## 2. Deterministic ownership

Wondii's code owns structure: stages, order, mechanics per slot, beats, map admission, depth budget, strands, scenes, ledgers, validation, repair. The model writes bounded content only (`f2d2844`).

**Why:** every model-owned structure produced lessons that repeated one idea, skipped teaching or assessed untaught facts. Deterministic structure is what makes quality inspectable and repair possible.

## 3. The closed move vocabulary

`notice, predict, name, explain, exemplify, model, compare, connect, practise, apply, retrieve, reveal, consolidate` (`BEAT_MOVES`). Teaching moves are `name, explain, model, connect, exemplify` (`TEACHING_MOVES`).

**Why:** beats, validation, the taught ledger and scene grouping all read move names. A new move silently changes what counts as "taught".

## 4. Bounded output

The model returns small, validated units: cue and text per beat, slot fields, plan points. Lines are capped (`activityFrom` caps six lines), question counts come from the plan, and there are no free-form activity lists.

**Why:** bounded units are what make validation and smallest-unit repair possible. Do not raise caps to hide a planning problem (for example, do not increase `activityFrom`'s line cap).

## 5. Smallest-unit repair

One plan repair. One story repair, then a deterministic story. One slot repair of only the failing slots, given each rejected beat's text and the plain reason (`slotRepairBrief`, `ab3cf57`, `f228a80`).

**Why:** regenerating whole lessons loses good content and is non-deterministic. Generic issue labels made the model return the same rejected copy.

## 6. APPLY contract and the frozen APPLY semantic architecture

- APPLY must use taught knowledge through a pupil action; the beat and the task arrive in the same response (`bd5dfb5`).
- The deterministic gate `applyAlignment` decides definite pass or fail: recall-only, pupil selection, bare mechanic, topic depiction, or a clearly different required fact fail closed.
- Only **unresolved** cases (paraphrase, unlisted verb, single shared stem, partial sibling overlap) go to the frozen categorical judge (`applySemanticBrief`), which returns `apply`, `reproduce` or `unrelated`. Code maps the verdict; the model cannot overturn a definite fail (`fc8512d`, `6878e89`).

**Why:** the Phase 9.9.2 diagnosis (`docs/rebuild/PHASE_992_APPLY_DIAGNOSIS.md`) showed 14 of 17 apply rejections were valid tasks killed by lexical rules. Routing to a fixed judge fixed that without letting the model grade itself. Re-tuning the prompt or the routing without new evidence reopens a solved problem.

## 7. CHECK architecture and the frozen CHECK semantics

- Every check question carries what it tests (`knowledgeChecked`) and is tested against the teacher's required evidence (`572a470`).
- A correct answer must perform the goal's action, not name a component (`e89a368`).
- Two-step judge: `checkEvidenceBrief` extracts what a correct answer demonstrates **without seeing the goal**; `checkCoverageBrief` compares that evidence with the required evidence (`43fb829`). It runs once per question.
- Check refs must be taught before the check (`untaughtKnowledgeIssues`, `4782284`).

**Why:** one-step judges let nearby definitions pass. Separating extraction from comparison was the change that worked. The CHECK semantics were then frozen by product-owner instruction in later phase briefs. The repo records the freeze only through commit history and these documents; there is no separate decision file.

## 8. Post-repair warning policy

After the one slot repair, a remaining APPLY or CHECK **semantic** verdict (`semantic-reproduce`, `semantic-unrelated`, `check-partial`, `check-unrelated`) becomes a `qualityWarning` and the lesson is kept. Structural and deterministic failures still fail (`40541d1`, `semanticWarningsAllowed`, `semanticQualityWarning`).

**Why:** conservative semantic judges were rejecting structurally valid lessons after the repair budget was spent, so teachers got nothing. Warnings are logged for review.

## 9. Taught-before

APPLY, CHECK, resolution and recap may only use knowledge first taught by a teaching move in an earlier beat (`taughtLedger`, `untaughtKnowledgeIssues`).

**Why:** assessing untaught facts was a repeated production defect.

## 10. Pupil-copy validation

`pupilCopyContract` / `pupilCopyReason`: Year 1–2 pupil sentences are exactly one sentence; later years one or two; terminal punctuation; at least four words (six for investigate); a consolidate beat states the knowledge itself, not meta language; no collision with internal copy. Year 1–2 notice beats are one sentence, not a look instruction followed by a question (`6c1e977`).

**Why:** this is the pupil-facing quality floor. Do not change pupil copy rules to satisfy an obsolete heuristic, and do not weaken them to get a lesson through.

## 11. Scene architecture

`planScenes` groups the validated seven-stage lesson into scenes: investigate (Explore), learn (Discover), connect (Connect), synthesise (Try it), challenge (Challenge), finish (Finish), with the teach-scene budget from `sceneTeachBudget`. No transition cards between scenes. No earthquake rectangles for generic moves (`3387dff`).

**Why:** seven one-sentence stage slides were a slide deck. Scenes build learning within a screen.

## 12. Classic fallback

Beatless or old adventures play through `stageSlides`, one slide per activity, with transition cards. The deterministic library (`useLibrary` → `recommend`) remains the fallback when generation fails.

**Why:** saved adventures from before beats must keep playing. Removing the fallback breaks existing data.

## 13. Visual provider, cache and cast

Provider and model in `learn-visuals-boot.js`; the cache path `{org}/lesson-{hash(topic|year)}/{assetId}-{hash(prompt)}.jpg` with a HEAD check; style references; the character sheet as an identity reference; `bindFeatured` / `avatarRefs` / `sessionCast` for casting; `VISUAL_ORGS` gate; `NO_TEXT`, `SAFETY`, answer stripping for check images.

**Why:** cost, safety (no real-child likenesses, no text, no answer giveaways) and identity continuity depend on these. Changing a prompt changes every cache key.

## 14. Saved adventure and session

The `school_adventures.config` shape (`toAdventure`: activities, `lessonPlan`, `lessonSkeleton`, `storyPlan`, `plan.slides`, `sceneReport`, `visualAssets`) and the session engine (`WondiiSessionEngine`, `school_sessions`, participants, teams, events). The player reads saved slides; `present.html` does not run the brain.

**Why:** saved lessons and live sessions must remain playable across deploys. No permanent pupil accounts.
