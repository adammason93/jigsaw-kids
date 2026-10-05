# Current state

Written 5 October 2026 at `c28c7f7`. Update this file whenever a phase lands.

## Repository

| | |
| --- | --- |
| Branch | `wondii-restructure-2026-09-30` (not merged to `main`; do not merge) |
| HEAD when this pack was written | `c28c7f702c58673412ce286cf341f0e446970101` — "Align client participation contract and make developed strands structural (Phase 9.15.3B)" |
| Commits since `main` | 52 (from `0ef77cc` checkpoint, 30 Sep 2026) |
| Tests | 32 `tests/*.test.js`, all passing at `c28c7f7` |

## Verifiable versions (from the repo)

| Item | Value | Where |
| --- | --- | --- |
| Browser brain | `lesson-brain.js?v=57` | `schools/learn/create.html` |
| Edge boot brain fetch | `lesson-brain.js?v=53` (cache key; locked by test) | `js/learn-generate-boot.js` |
| Creator | `creator.js?v=19`, `creator-core.js?v=23` | `create.html` |
| Player | `present.js?v=25`, `lesson-shell.js?v=18`, `lesson-mechanics.js?v=18` | `present.html` |
| Visuals | `visual-adventure.js?v=9` (browser and visuals boot) | `create.html`, `present.html`, `learn-visuals-boot.js` |
| Service worker | `jigsaw-kids-v433` | `sw.js`, asserted in `tests/teacher-journey.test.js` |
| Lesson model | `LESSON_MODEL` env, default `gpt-4o-mini` | boot |
| Image model | `gpt-image-2.5-sunburst`, 2560×1440 | `learn-visuals-boot.js` |

**Deployment records (not verifiable from the repo; recorded at the `c28c7f7` deploy):** Supabase `learn-generate` edge function v59 (inline loader). Live file hashes: brain `36024ef5`, boot `5c84d0a2`, `sw.js` `0d0e9281`. Cloudflare Worker version `de624899-4e25-4747-8a8d-7c5b83968ef4`. Re-check before relying on them. Later, v60 deployed the thin local function and failed; production was restored as v61 with the boot pipeline in `supabase/functions/learn-generate/index.ts` (local brain import, JWT verify on).

## Latest canary

Year 1, Science, 15 minutes, "Teach children about sharks." Request `469a81fc-7233-4dd8-8cca-44edb527d30f`.

**Diagnosis (Phase 9.15.3A):**

1. The server completed: `COMPLETE`, HTTP 200.
2. The browser rejected it on re-accept. `accept(body.adventure, ctx)` has no `ctx.lessonSkeleton`, so `substanceIssues` fell back to the legacy `teachingLine` rule (lines of at least 8 words, at least 2 before the quiz). Year 1 beats are deliberately one short sentence, so the lesson failed with "The lesson does not contain enough teaching and participation for the requested time." The teacher saw "Wondii couldn't finish this adventure."
3. False developed strands: the learning map had six points, every `dependsOn` empty, yet strands counted as developed and depth was `met: true`, because the old rule accepted relationship wording ("because", "work together").

### PROVEN CURRENT ISSUES — status

The phase brief for this pack asked for these to be recorded as proven current issues "unless the repository proves a later fix". **The repository proves a later fix.** This is recorded as a discrepancy against the brief's assumption.

| Issue | Status in repo | Evidence |
| --- | --- | --- |
| Browser re-accept uses the legacy line rule for beat lessons | **Fixed in code and tests** (`c28c7f7`). Deployed. **Awaiting human canary verification.** | `accept` sets `participationSkeleton = beatSkeleton(parsed.lessonSkeleton)`; `substanceIssues` uses `participationIssues`. `tests/participation-parity.test.js` |
| False developed strands from wording with empty `dependsOn` | **Fixed in code and tests** (`c28c7f7`). Deployed. **Awaiting human canary verification.** | `buildTeachingPlan` `isDeveloped`; `tests/developed-strands.test.js` replays the production map (0/2 strands, first pass fails) |

Neither is proven fixed **in production** until the human broad-sharks canary passes.

## Other known problems and gaps

- **Final challenge too small for the vision.** `DEPTH_BANDS.questions` gives 2 questions for Year 1–2, 3 for Year 3–4 and 4 for Year 5–6. The vision wants about 4 for Year 1–2 at 15 minutes and 5–6 for older pupils (roadmap 9.15.4).
- **Interactions are weak.** Only the opening and the task scenes get an interaction, and non-earthquake move/drag becomes tap-to-reveal (roadmap 9.15.5).
- **Visuals are per stage, not per scene.** Teaching scenes share the teach image (roadmap 9.15.6). Visuals are allow-listed to one organisation (`VISUAL_ORGS`).
- **A shallow map can still ship after the one repair.** With `breadthSettled: true`, an undeveloped map is recorded as `met: false` and the lesson proceeds. This is deliberate (no infinite repair), and it is visible in `TEACHING_PLAN`.
- **Library fallback quality.** `useLibrary` can still build a deterministic pack lesson ("Wondii built this from its lesson library.") that does not meet the quality standard.
- **CDN pin risk.** `js/learn-generate-boot.js` still fetches the brain as `?v=53` for tests. The edge function imports `js/lesson-brain.js` directly. Do not deploy a handler that evals the CDN copy.
- **`learn-generate` v60 / v61.** v60 deployed the thin `index.ts` (plan → story → `accept`, no skeleton). Year 1 sharks returned `SCHEMA_VALIDATION_FAILED` with zero activities. Production was restored as v61 by deploying the boot pipeline (`TEACHER_INTENT` → plan → story → `lessonSkeleton` / `planBeats` → `resolveLessonContent`) with a local brain import and JWT verify still on. That handler is now `supabase/functions/learn-generate/index.ts`. Deploy that file.
- **Stale `learn-visuals`.** `supabase/functions/learn-visuals/index.ts` must never be deployed.
- **`runPipeline` in `lesson-brain.js` is not the production path** and has diverged from the boot (no teacher intent, no depth gate, no judges). Tests that use it do not prove production behaviour.
- **Duplicate request `cc073476`.** Identical body replayed at the network level; cause not provable.

## Documentation / code discrepancies recorded

1. The brief treats the `469a81fc` issues as current. The repo proves them fixed in `c28c7f7`, pending a canary (above).
2. The vision targets about 5–6 substantial learning scenes per 15–20 minutes. Code at 15 minutes produces an opening (Explore), up to 3 teaching scenes (`sceneTeachBudget`), Try it, Challenge and Finish: up to 7 slides, of which roughly 4–5 are learning scenes. The counts are close but are defined differently.
3. The vision targets about 2 knowledge-connected interactions. Code attaches at most 2 (Explore and Try it), but generic move/drag becomes tap-to-reveal, so they are often not knowledge-connected.
4. The brain declares a wide `WORLD_INTERACTIONS` vocabulary (drag, sort, sequence, match, …) that the scene player does not play.
5. The vision's final challenge sizes are larger than `DEPTH_BANDS.questions`.
6. The edge brain pin (`?v=53`) differs from the browser pin (`?v=57`). Same file, different cache keys.
7. `learn-visuals/index.ts` still differs from the deployed visuals loader (stale). `learn-generate/index.ts` is the v61 boot pipeline and is the file to deploy.
8. `runPipeline` differs from the production boot pipeline.
9. `WONDII_CURRENT_STATE_HANDOVER.md` and `PHASE_10_AI_LESSON_BRAIN_AUDIT.md` describe pre-restructure or pre-AI states.
10. `AGENT_AUTONOMY_RULES.md` lists are reconstructed; the verbatim brief lists were not available.

## Status of older documents

None of these were deleted. Read them as history.

| Document | Status |
| --- | --- |
| `docs/WONDII_CURRENT_STATE_HANDOVER.md` | **Superseded.** Written 30 Sep 2026 on `main` before the restructure. It says the school build is uncommitted, there are no tests, the short creator is `flow.js`, the AI generator does not exist, and `sw.js` is `v367`. All of that is out of date. |
| `docs/WONDII_DESIGN_DEBT.md` | Partly current for visual and design debt. Its token-file statement was corrected; the 182-surface counts are historical. |
| `docs/WONDII_GAME_MATRIX.md` | Current for family games and GameShell V2 pilots. Not about lesson generation. |
| `docs/WONDII_VISUAL_SURFACE_REGISTRY.md` | Source of truth for visual surface migration. Not about lesson generation. |
| `docs/rebuild/PHASE_00`–`PHASE_09_*` | Historical records of the 30 Sep restructure phases (data, design system, portal, session engine, lesson shell, mechanics, creator, game platform, routes, teacher journey). Mostly still accurate for those layers. |
| `docs/rebuild/PHASE_10_AI_LESSON_BRAIN_AUDIT.md` | **Superseded** as a description. "Path today" is the pre-AI pack path; `learn-generate` now exists. Still useful for the player schemas and for why the model key lives in an edge function. |
| `docs/rebuild/PHASE_99_REPORT.md`, `PHASE_99_*.json`, `PHASE_991/993/995_RESULTS.json` | Historical benchmark evidence at `fc8512d` (7/24 delivered). Not current performance. |
| `docs/rebuild/PHASE_992_APPLY_DIAGNOSIS.md` | Historical. Its findings drove `6878e89` and `4dd6b93`; the validator states it describes no longer exist. |
| Phase 9.15.3A diagnosis | Not in the repo. It was delivered in chat. Its conclusions are recorded here and in `c28c7f7` and its tests. |
