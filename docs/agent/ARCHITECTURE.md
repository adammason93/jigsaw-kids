# Architecture (as built at `c28c7f7`)

Status labels:

- **CURRENT**: in production code and used.
- **PLANNED**: on the roadmap, not built.
- **LEGACY/FALLBACK**: still in code, used only on a fallback path or kept for old data.

Most generation logic lives in one file, `js/lesson-brain.js` (about 5,900 lines, UMD, exported as `WondiiLessonBrain`). The same file runs in the browser and is imported by the `learn-generate` edge function.

## 1. Deployment topology — CURRENT

| Piece | Where | Notes |
| --- | --- | --- |
| Static site | Cloudflare Worker `workers-site/index.ts` | Serves files. Proxies `/api/learn/generate` and `/api/learn/visuals` to Supabase edge functions with no retry. Holds no model key. |
| `learn-generate` edge function | Supabase project `enuzrcjnrxwglacivlnu` | Deploy `supabase/functions/learn-generate/index.ts`. It is the boot pipeline (`TEACHER_INTENT` → plan → story → `lessonSkeleton` / `planBeats` → `resolveLessonContent`) and imports local `../../../js/lesson-brain.js`. `Deno.serve` is the entry. `verify_jwt` stays on. Do not replace it with the thin plan → story → `accept` path, and do not eval a CDN copy of the brain. `js/learn-generate-boot.js` is the test harness; it still fetches `lesson-brain.js?v=53` (locked by `tests/generate-loader.test.js`) and is not the edge entry. |
| `learn-visuals` edge function | Same project | Inline loader for `js/learn-visuals-boot.js`, which fetches `js/visual-adventure.js?v=9`. |
| Model | `LESSON_MODEL` env, default `gpt-4o-mini` | JSON-object responses. Teacher intent and judges run at temperature 0. |
| Images | `gpt-image-2.5-sunburst`, 2560×1440 JPEG | Stored in bucket `wondii_adventure_visuals`. |

**`learn-generate` source.** `supabase/functions/learn-generate/index.ts` is the v61 restore of the boot pipeline. Production v60 deployed the thin classic path (plan → story → `accept`, no skeleton) and Year 1 sharks failed with `SCHEMA_VALIDATION_FAILED` and zero activities. Deploy this file. **`learn-visuals` is still stale.** `supabase/functions/learn-visuals/index.ts` predates its boot file. Never deploy it.

**Version pins.** The browser loads `lesson-brain.js?v=57` (`schools/learn/create.html`). The edge boot fetches `lesson-brain.js?v=53`. The query string is only a cache key; both fetch the same current file. Changing the boot pin breaks the loader check, so leave it at `v=53`. The risk is a CDN serving a stale copy under `?v=53`. Verify live hashes after deploying.

## 2. Generation pipeline

Production order, as run by `supabase/functions/learn-generate/index.ts` (the same stages as `js/learn-generate-boot.js`), with browser steps around it.

| # | Step | Code | Status |
| --- | --- | --- | --- |
| 1 | Teacher request read in the browser | `creator.js` `beginBuild` → `creator-core.js` `analyseSource` / `applyAnalysis` → `lesson-brain.js` `contextFrom` | CURRENT |
| 2 | Auth: active owner, school_admin or teacher in the organisation | boot `teacherAllowed` | CURRENT |
| 3 | **teacherIntent**: learning goal, required evidence, focus concepts, prior knowledge, exclusions, preferences, subject, duration | `teacherIntentBrief` → `normaliseTeacherIntent` → `applyTeacherIntent` | CURRENT |
| 4 | **planBrief**: model proposes the plan and a learning map of connected points (`id`, `knowledge`, `role`, `importance`, `dependsOn`) | `planBrief` | CURRENT |
| 5 | **Learning map** admission: connection to the goal, paraphrase removal, dependency order, fit to the depth budget | `normalisePlan` → `buildLearningMap`, `mapProposals`, `mapOrder`, `mapRestates`, `depthBudget` | CURRENT |
| 6 | **Scope and depth**: broad or narrow, depth filter, required depth and strands | `teachingScope`, `depthFilter`, `strandRange`, `depthSnapshot` | CURRENT |
| 7 | **teachingPlan** (`version: 1`): point categories, strands, achieved depth, `met` | `buildTeachingPlan` | CURRENT |
| 8 | **Strands**: foundation `f`, teaching strands `t1…`, `synthesis` | `strandsOf` | CURRENT |
| 9 | One plan repair if the first pass fails (`depthRequired: true`). The second pass runs with `breadthSettled: true`, so a still-shallow map is recorded as `met: false` instead of blocking | `planRepairBrief` / `repairRelationship`; logs `PLAN_VALIDATE` (`firstPass`) and `PLAN_REPAIR` | CURRENT |
| 10 | Story: mission, characters, continuity; one repair, then a deterministic fallback | `storyBrief`, `normaliseStory`, `storyRepairBrief`, `storyFromPlan` | CURRENT |
| 11 | **lessonSkeleton**: seven stage slots with mechanic, minutes, required knowledge, participation, `mayAssess` / `mayRevealAnswer` | `lessonSkeleton`, `skeletonMinutes`, `slotBudget`, `contractArc`, `pedagogy` | CURRENT |
| 12 | **planBeats**: teaching moves per slot. With a teaching plan, each strand is taught as name → explain → connect | `planBeats` → `planMapBeats` → `planThreadBeats` | CURRENT |
| 13 | `LEARNING_MAP` and `TEACHING_PLAN` diagnostics | `learningMapReport`, `teachingPlanReport` | CURRENT |
| 14 | **contentBrief**: model writes cue and text per beat, plus slot content (quiz, apply task) | `contentBrief`, `beatResponseExample`, `moveGuide`, `pupilCopyContract` | CURRENT |
| 15 | **accept**: materialise slots into activities, validate structure, education, beats, pupil copy, apply and check | `accept`, `materialiseSkeleton`, `educationalIssues`, `stageIssues`, `beatProblems`, `pupilBeatProblems`, `applySlotIssues`, `checkSlotIssues`, `untaughtKnowledgeIssues`, `substanceIssues` | CURRENT |
| 16 | Semantic judges, server only: APPLY judge for unresolved apply; CHECK evidence extractor plus coverage comparison per question | `resolveLessonContent` with `applySemanticBrief`, `checkEvidenceBrief`, `checkCoverageBrief` | CURRENT, FROZEN |
| 17 | **Repair**: one slot repair of only the failing slots, with each rejected beat and its reason | `slotRepairBrief`, `failuresForSlot`, `beatRepairFix`, `mergeSlotContent` | CURRENT |
| 18 | Post-repair policy: a remaining APPLY or CHECK semantic verdict becomes a `qualityWarning`, not a rejection. Structural failures still fail | `semanticWarningsAllowed`, `semanticQualityWarning` | CURRENT, FROZEN |
| 19 | Response: `COMPLETE` with adventure and meta, or a failure stage | boot | CURRENT |
| 20 | **Browser re-accept**: `accept(body.adventure, ctx)` with no `ctx.lessonSkeleton`. A beat skeleton carried on the adventure becomes `participationSkeleton`, so the browser uses the same beat participation contract as the server, without server-only judges | `request` → `accept`, `beatSkeleton`, `substanceIssues` → `participationIssues` | CURRENT (since `c28c7f7`) |
| 21 | Browser checks | `creator.js` `applyBrain` → `creator-core.js` `validateAdventure` / `brokenLesson` | CURRENT |
| 22 | **Visuals** | `creator.js` `createWorld` → `/api/learn/visuals` | CURRENT, allow-listed org only |
| 23 | **materialise → planScenes → slides** at save time | `creator-core.js` `toAdventure` → `slidesFor` → `scenePlan` (`planScenes`) → `sceneSlides` | CURRENT |
| 24 | **Save** | `persistAdventure` → `school_adventures` | CURRENT |
| 25 | **Session** | `ClassRooms.createSession` → `WondiiSessionEngine` (`js/learning-session.js`) → `school_sessions` | CURRENT |
| 26 | **Player** | `present.js` → `WondiiLessonShell` (`lesson-shell.js`) → `lesson-mechanics.js` / `mechanic-core.js` | CURRENT |
| 27 | **Completion**: finish ends the session; results persist | session engine | CURRENT |

On failure, `creator.js` `useLibrary` runs the deterministic library (`recommend` → `contentFor` / `packActivities`). If that is also broken, the teacher sees "Wondii couldn't finish this adventure." (LEGACY/FALLBACK).

**Parallel pipeline in the brain.** `lesson-brain.js` also exports `runPipeline`, used by `tests/lesson-brain.test.js` and `tests/lesson-contract-matrix.js`. It has no teacher-intent step, no `depthRequired` gate and no semantic judges. It is **not** the production path. Production behaviour is defined by `supabase/functions/learn-generate/index.ts`. `js/learn-generate-boot.js` mirrors those stages for tests and still evals a fetched brain; it is not the edge entry.

## 3. The seven internal stages — CURRENT, FROZEN

`hook → investigate → teach → apply → check → resolution → recap`

(`SCENE_STAGES` in `lesson-brain.js`; `STAGE_ORDER` in `visual-adventure.js`.)

| Stage | Mechanic | Purpose |
| --- | --- | --- |
| hook | story | Open the world and the mission |
| investigate | story + interaction | Pupils look and notice |
| teach | story | Guided teaching through beats |
| apply | story + interaction | Pupils use taught knowledge |
| check | quiz | Assessment of taught knowledge |
| resolution | story | Mission payoff |
| recap | mystery | Consolidate what was learned |

The stages are an **internal contract**: they organise planning, validation, repair and visuals. **They are not exposed as seven screens.** Beat adventures are played as learning scenes (section 6). Only beatless lessons fall back to one slide per stage.

## 4. Move vocabulary (closed) — CURRENT, FROZEN

`BEAT_MOVES`: `notice, predict, name, explain, exemplify, model, compare, connect, practise, apply, retrieve, reveal, consolidate`

- Teaching moves (`TEACHING_MOVES`), which put knowledge into the taught ledger: `name, explain, model, connect, exemplify`.
- Typical placement: hook/investigate `notice` (+`predict`, `compare` from Year 3); teach `name / explain / model / exemplify / connect`; apply `practise` (Year 1–3) or `apply`; check `retrieve` (the quiz is the retrieve beat); resolution `reveal`; recap `consolidate`.
- Beat caps by year (`beatLimit`): Year 1–2 cap 4, Year 3–4 cap 6, Year 5–6 cap 8.

## 5. Ledgers and targets — CURRENT

- **taughtLedger(slots)**: walks beats in stage order and records where each knowledge ref is first taught by a teaching move. `untaughtKnowledgeIssues` uses it so APPLY, CHECK, resolution and recap cannot use knowledge that was not taught before them.
- **applicationTarget** (built by `teachingApplication`): picks the teaching strand containing the point that answers the goal, otherwise the strand with the most explained points. Its focus is an explained point, with up to four refs and an evidence line ("The pupil uses the taught explanation to get a new case right: …"). This is guidance for the APPLY slot. It does not narrow `requiredKnowledge`.
- **assessmentCandidates(plan, slots)**: substantive and synthesis points (up to 10). Each has a level (application, explanation or retrieval), an evidence line, and a `taughtBefore` flag taken from the taught ledger before the check. It is reported in `TEACHING_PLAN`. The actual CHECK refs are chosen in `planThreadBeats`: `depthBudget(...).questions` points, one per strand first, ranked by `ASSESSABLE` weight (relationship 4, connection 4, procedure 3, comparison 2, definition 2; an explained point otherwise 4). Each becomes one `retrieve` beat and one question. A properly sized and mixed final challenge is PLANNED (9.15.4).
- **recapTakeaways(plan, slots)**: one takeaway per strand within each consolidate beat. The foundation strand is folded in when other strands exist. Up to 6.
- **depthBudget(year, minutes)**: `DEPTH_BANDS` young (Y1–2) low 5 / target 6 / high 7 / questions 2; middle (Y3–4) 6/8/9/3; older (Y5–6) 7/8/10/4. Lessons of 8 minutes or less get 1 question.

## 6. Scenes — CURRENT

`planScenes(slots, plan, ctx)` runs over the validated seven-stage lesson with beats. It returns null (classic path) if the lesson is not exactly seven stages with beats.

| Purpose | Label (`SCENE_LABELS`) | Contents | Base visual (`SCENE_SHOTS`) |
| --- | --- | --- | --- |
| investigate | Explore | hook + investigate beats, plus the first teach unit if it fits | hook |
| learn | Discover | teach beats grouped by knowledge anchor and strand | teach |
| connect | Connect | synthesis or connect beats | teach |
| synthesise | Try it | apply beats | apply |
| challenge | Challenge | the check quiz | check |
| finish | Finish | resolution outcome + recap | resolution |

The teaching-scene budget is `sceneTeachBudget`: 1 scene for 8 minutes or less, 2 for up to 12, 3 for up to 17, 4 for up to 24, otherwise 5. Groups merge by strand affinity until within budget. Each scene carries `knowledgeRefs` (newly taught), `usesRefs`, `visual`, `interaction` and `label`.

**Interactions.** Only the investigate and synthesise scenes get an interaction (from the investigate and apply slots). In `creator-core.js` `sceneStep`, any `move`/`drag` interaction that is not the earthquake plate slip is converted to `tap-to-reveal` ("Look more closely"). So the brain's `WORLD_INTERACTIONS` list (drag, sort, sequence, match, …) is wider than what the scene player actually plays. A meaningful interaction registry is PLANNED (roadmap 9.15.5).

**Transition cards.** Scene slides (`slide.sceneId`) move on without a "Round complete" card (`lesson-shell.js` `queueTransition`). Classic slides keep the card (LEGACY/FALLBACK).

**Generic rectangle fallback.** Removed for scenes in `3387dff`: a generic move no longer draws the earthquake plate "slab" rectangles. Only the true earthquake slip (`earthquakeMove`) keeps them (`tests/learning-scenes.test.js`).

**Classic path — LEGACY/FALLBACK.** `stageSlides` builds one slide per activity for beatless or old lessons, with transition cards.

## 7. Server versus browser validation — CURRENT

| Check | Server (`learn-generate`) | Browser (re-accept) |
| --- | --- | --- |
| Materialise from skeleton | yes (`ctx.lessonSkeleton`) | no; uses the materialised activities |
| Beat problems, pupil-copy contract, investigate looks | yes | no (needs `ctx.lessonSkeleton`) |
| Participation | `participationIssues` against the skeleton | `participationIssues` against the carried skeleton (since `c28c7f7`); beatless lessons keep the legacy line check |
| APPLY deterministic alignment, untaught-knowledge | yes | no |
| APPLY / CHECK semantic judges | yes | never. Do not add them to the browser |
| Educational, stage and story issues | yes | yes |
| `validateAdventure` / `brokenLesson` | n/a | yes |

The browser must never reject a lesson that the server accepted under the same contract. That divergence caused production failures twice (`38e7638`, `c28c7f7`).

## 8. Visual architecture — CURRENT

- **Gate**: `visualsAllowed` checks `VISUAL_ORGS`, which has one organisation id. Other organisations skip visuals and go straight to review.
- **Plan**: `planVisualAssets` makes **one asset per stage** (seven) when all seven stages exist (`stageAsset`, `STAGE_SHOTS`, `STAGE_LINES`), plus a `characters` sheet unless class avatars are used. Scenes reuse stage assets through `SCENE_SHOTS`, so `learn` and `connect` scenes share the teach image. Richer per-scene visuals are PLANNED (9.15.6).
- **Prompt**: `buildAdventurePrompt` has the Wondii style, age direction, `NO_TEXT`, `SAFETY`, a no-other-landmark guard, continuity, a UI safe area, apply task objects, check evidence with the answer stripped (`stripAnswer`), and no answer marking.
- **Cast**: `bindFeatured` picks class pupils with `kid-*` avatars; `avatarRefs` are sent as references; `sessionCast` and the role assignment helpers cast the pupils present.
- **Provider and cache**: `learn-visuals-boot.js` stores at `{org}/lesson-{hash(topic|year)}/{assetId}-{hash(prompt)}.jpg`. A HEAD hit returns the cached asset unless `force`. Style references are the portal image and the `max.webp` character. The character sheet, when generated, is passed as a reference for scenes.
- **Scheduling**: `scheduleVisualAssets`, concurrency 3, characters first.
- **Failure**: a failed asset is recorded as `status: failed, fallback: true`; the lesson still plays.
- **Prototype paths** (`PROTOTYPE`, `PROTOTYPE_98A`, `PROTOTYPE_98B`, the volcano experience): LEGACY/FALLBACK demo paths.

## 9. Persistence — CURRENT

Adventures are stored in `school_adventures.config`, with `plan.slides` holding the built scene slides and `sceneReport`. Sessions are stored in `school_sessions` plus participants, teams and events (`WondiiSessionEngine`). `present.html` does not load `lesson-brain.js`; it plays the slides saved at creation.
