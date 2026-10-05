# Decision history

Sources: `git log main..HEAD` and commit bodies, `docs/rebuild/`, tests, and code. Where a decision is known only from a phase brief and not from the repo, that is stated. Commit hashes are on `wondii-restructure-2026-09-30`.

Format: PROBLEM / APPROACH TRIED / RESULT / DECISION / DO NOT REPEAT.

---

## 1. AI-written activities to a deterministic skeleton

- **PROBLEM:** The first generator (`ec75149`) asked the model for a finished adventure. Before that, `contentFor` only knew a few topic packs, and anything else became a generic quiz with "Playtime / Home time / The register" distractors (`docs/rebuild/PHASE_10_AI_LESSON_BRAIN_AUDIT.md`).
- **APPROACH TRIED:** Model-written activity lists, validated and repaired once.
- **RESULT:** Lessons varied in structure, skipped teaching and were hard to repair.
- **DECISION:** `f2d2844`: Wondii owns the skeleton (stage order, mechanic families, bounded slot repair). The model writes slot content.
- **DO NOT REPEAT:** Do not let the model decide stages, order, mechanics or lesson length.

## 2. APPLY evolution, semantic APPLY and the freeze

- **PROBLEM:** Valid apply tasks ("create", "write", "draw") were rejected; then topic-word-only tasks were accepted.
- **APPROACH TRIED:**
  - `2079963` accepted create, write and draw.
  - `38664a4` added a deterministic alignment gate (reject topic-word-only and the wrong required sentence).
  - `fc8512d` sent only unresolved tasks to a frozen categorical classifier; code maps apply / reproduce / unrelated.
  - `43ab98c` and `PHASE_992_APPLY_DIAGNOSIS.md`: diagnosis without changing validation.
- **RESULT:** In the Phase 9.9 unseen benchmark, 7/24 lessons were delivered (`PHASE_99_REPORT.md`). The 9.9.2 diagnosis found 14 of 17 first-pass apply failures were valid tasks rejected by lexical rules (verb allowlist, single stem, sibling sentence). No false accepts.
- **DECISION:** `6878e89`: a missing allowlisted verb, a single shared stem or a partial sibling overlap is **unresolved** and goes to the frozen judge. Definite recall, pupil selection, bare mechanics, topic depiction and a clearly different fact still fail closed. Later commits made the beat and task arrive together (`bd5dfb5`) and recognised a materialised task without a verb (`38e7638`).
- **DO NOT REPEAT:** Do not grow verb allowlists or lexical overlap rules. Do not let the judge overturn a definite fail. Do not re-tune the judge prompt without new evidence.

## 3. CHECK semantic experiments and the freeze

- **PROBLEM:** Checks asked a nearby definition ("What is an array?") instead of the requested thinking (`PHASE_99_REPORT.md`, `PHASE_992` "Known check failures").
- **APPROACH TRIED:**
  - `572a470` judged whether a check tests the learning goal.
  - `e89a368` required a correct answer to perform the goal's action.
  - `43fb829` split the judge into evidence extraction (blind to the goal) and a coverage comparison.
- **RESULT:** The two-step judge is the version kept. The judge timing out was briefly misreported as misalignment (fixed in `789d27b`).
- **DECISION:** CHECK semantics frozen (product-owner instruction in later phase briefs). Per-question judging; check refs must be taught before the check.
- **DO NOT REPEAT:** Do not add more CHECK judge variants or merge extraction and comparison back into one call.

## 4. Post-repair warning policy

- **PROBLEM:** After the single repair, a conservative APPLY or CHECK verdict rejected an otherwise valid lesson, so the teacher got nothing.
- **APPROACH TRIED:** Rejection on any remaining semantic verdict.
- **RESULT:** Structurally sound lessons were lost.
- **DECISION:** `40541d1`: after repair, a remaining semantic verdict becomes a `qualityWarning`. Structural failures still fail.
- **DO NOT REPEAT:** Do not turn warnings back into hard failures, and do not extend warning status to structural or deterministic failures.

## 5. Player viewport / Next blocker

- **PROBLEM:** A valid quiz answer was stored, but the tall choice card pushed the Next dock off screen, so the lesson could not continue (`27f07c4`). Earlier, the opening hotspot sat under the stage and the class could not leave the first screen (`7ef8204`).
- **APPROACH TRIED / RESULT:** Fixed the layout so the Next control stays on screen; separate scene per stage and a clickable first look-closer.
- **DECISION:** Player controls must always remain reachable at classroom viewport sizes.
- **DO NOT REPEAT:** Do not diagnose "the lesson is stuck" as a generation problem without checking the player first.

## 6. Teaching beats

- **PROBLEM:** Slots were judged by word totals ("12 words") and one answering sentence could complete a lesson.
- **APPROACH TRIED:**
  - `dad791b` wired beats (planned moves per slot) into the live generator.
  - `789d27b` judged beats by their planned moves, not word totals.
  - `679e097` made the quiz the check's retrieve beat and stated the recap word rule.
  - `700e730` asked beat slots for cue and text only and stopped forbidding beats on repair (canaries had left every beat empty).
- **RESULT:** Beats became the participation contract on the server.
- **DECISION:** Beats are Wondii-planned; the model fills cue and text.
- **DO NOT REPEAT:** Do not tell the model rules it was never given (the recap four-word rule), and do not forbid the structure you require in a repair prompt.

## 7. Client re-accept problems

- **PROBLEM:** The browser re-accepts the server's adventure without `ctx.lessonSkeleton`, so it ran older heuristics the server had moved past.
- **APPROACH TRIED:**
  - `38e7638` recognised a materialised apply task without a verb.
  - `c28c7f7` (Phase 9.15.3B): the browser carries `lessonSkeleton` from the adventure as `participationSkeleton` and uses the same beat-based `participationIssues`; beatless lessons keep the legacy line check.
- **RESULT:** Production request `469a81fc` (Year 1 science, sharks, 15 min) completed on the server with HTTP 200 and was rejected in the browser by the legacy "enough teaching and participation" line rule. Replaying it after `c28c7f7` passes on server and client (`tests/participation-parity.test.js`).
- **DECISION:** One participation contract for server and browser. The browser does not run server-only slot or semantic checks.
- **DO NOT REPEAT:** Do not add a browser-only rule that the server does not apply. Do not run semantic judges in the browser.

## 8. Learning map

- **PROBLEM:** A true label (a date, a place) passed planning even when the goal needed a reason or process (`1e84289`). How/why goals kept nearby facts and dropped the answer (`4782284`). One relationship repeated across seven stages (`c37d7aa`).
- **APPROACH TRIED:** `f5ebd4c` told the plan repair which relationship was missing. `c37d7aa` taught and checked several relationships. `227ddcd` introduced the engine-owned learning map.
- **RESULT:** The model proposes connected points with roles and dependencies. Wondii admits, orders and sizes them; a taught ledger bounds apply and check.
- **DECISION:** Learning map plus depth budget by year and duration.
- **DO NOT REPEAT:** Do not let the model choose which points are taught or how many.

## 9. Learning scenes

- **PROBLEM:** Beat adventures played as seven stage slides, sharing three pictures, with transition cards; generic moves drew earthquake rectangles.
- **APPROACH TRIED:** `3387dff`: deterministic `planScenes` built at save time.
- **RESULT:** An opening scene (hook + investigate + first teach unit), teaching scenes grouped by knowledge and dependency, the task, the challenge, one finish screen.
- **DECISION:** Scenes are the presentation of the seven internal stages.
- **DO NOT REPEAT:** Do not expose the seven stages as seven screens again.

## 10. Transition-card removal

- **PROBLEM:** "Round complete / Next up" cards broke the flow between scenes.
- **DECISION:** `3387dff`: scene slides move on without transition cards (`queueTransition` returns early for `sceneId`). Classic slides keep them (`tests/learning-scenes.test.js` J/K).
- **DO NOT REPEAT:** Do not reintroduce cards between scenes.

## 11. Generic rectangle fallback

- **PROBLEM:** Any `move`/`drag` interaction drew earthquake plate "slab" rectangles, even for unrelated topics.
- **DECISION:** `3387dff`: only the earthquake slip keeps them. Other move/drag steps become tap-to-reveal (`sceneStep`; `tests/learning-scenes.test.js` M/N).
- **DO NOT REPEAT:** Do not reuse a topic's custom visual as a generic fallback. Note: this also means generic interactions are currently weak (see `ROADMAP.md` 9.15.5).

## 12. Broad versus narrow scope

- **PROBLEM:** Broad topic requests produced thin fact lists; narrow requests drifted.
- **APPROACH TRIED:** `a2ba281` (Phase 9.15.3): `teachingScope` classifies broad or narrow from the request; broad requests need developed strands.
- **DECISION:** Scope is decided deterministically from the request and the teacher intent.
- **DO NOT REPEAT:** Do not ask the model to decide scope.

## 13. Substantive depth

- **PROBLEM:** Depth was counted as the number of map entries, so padding, paraphrase and meta points counted.
- **APPROACH TRIED:** `a2ba281`: `depthFilter` (repetition, generic-connection) and `buildTeachingPlan` categories. Achieved depth = substantive + min(supporting, 1) + min(synthesis, 1).
- **DECISION:** Depth is substantive points, not entries.
- **DO NOT REPEAT:** Do not count entries as depth.

## 14. Threads (strands)

- **PROBLEM:** Broad lessons need several connected lines of understanding, not one list.
- **APPROACH TRIED:**
  - `a2ba281`: `strandsOf` groups `dependsOn` chains into foundation `f`, strands `t1…` and `synthesis`; `planThreadBeats` teaches each strand as name, explain, connect; `planScenes` uses strand affinity. A strand was "developed" if it contained relationship wording or a supporting example.
  - `c28c7f7`: that rule was wrong. The production map for `469a81fc` had every `dependsOn` empty, but its strands were counted as developed and depth was `met: true`, because sentences used relationship wording such as "because" and "work together".
- **DECISION:** A strand is developed only when an explained or supporting point depends on a substantive point in the same strand. The repair brief explains `dependsOn` with a topic-neutral example. `PLAN_VALIDATE` logs `firstPass`, and `PLAN_REPAIR` logs `repairInstruction` and `repaired`.
- **DO NOT REPEAT:** Do not infer structure from wording ("because", "helps", "work together"). Do not use phrase lists for development.

## 15. Production findings (from commit bodies)

- Every Year 1 pupil-copy failure surviving repair was a notice beat written as "look… then a question". Fixed by brief wording, not validation (`6c1e977`).
- The slot repair regenerated the same rejected copy because it got only generic issue labels (`ab3cf57`).
- The loader required a flag that lives in the brain, not the boot, so every generation failed before the pipeline (`d6d38ee`). The loader check is locked by test.
- The raw request word gate rejected correct lessons that avoided filler words like "reteach" (`4dd6b93`, `PHASE_992` "Maps leftover raw-word gate").
- Request `469a81fc`: server ok, browser rejection, plus false developed strands. Both fixed in `c28c7f7`, awaiting human canary.
- A duplicate request (`cc073476`) replayed an identical body at the network level. The cause was not provable. Recorded from session diagnosis, not the repo.
