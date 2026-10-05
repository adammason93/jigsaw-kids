# Engineering rules

## Required workflow

Every change follows this sequence. Do not skip steps and do not reorder them.

1. **OBSERVE**: collect the actual failure: request ID, logs, saved adventure, screenshots. Not a guess.
2. **TRACE**: follow that exact request through the pipeline stages (`ARCHITECTURE.md` section 2).
3. **FIND THE FIRST INVALID STATE**: the earliest point where data is wrong. Later symptoms are not causes.
4. **PROVE THE ROOT CAUSE**: reproduce it locally from the real data (replay the production structure in a test). State it as evidence, not as a likely story.
5. **DESIGN THE SMALLEST COHERENT FIX**: fix the cause in the layer that owns it. Respect frozen contracts. If the smallest fix touches a frozen contract, stop and report.
6. **IMPLEMENT.**
7. **TEST**: a test that fails before the fix and passes after, built from the real failing structure.
8. **REGRESSION TEST**: run every `node tests/<file>.test.js`. All must pass.
9. **VERIFY**: check behaviour, not only exit codes. Replay the production case; read the diagnostics.
10. **COMMIT / DEPLOY**: HEREDOC commit message, push, and deploy only what the task authorises. Bump cache-busting versions (`?v=` and `sw.js` `CACHE`) when static files change, and verify live hashes.
11. **STOP FOR THE HUMAN CANARY**: the product owner runs production canaries. Do not generate production lessons yourself.

## Never

- **Never add fixture-specific or topic-specific hacks.** No shark, volcano or earthquake special cases in validators, prompts or planners. Repair-brief examples must be topic-neutral (`tests/developed-strands.test.js` asserts the strands repair line does not mention sharks).
- **Never weaken a validator to get a lesson through.** If a validator rejects a good lesson, prove it is a false rejection and fix the rule's logic. If it rejects a bad lesson, fix generation.
- **Never change pupil copy to satisfy an obsolete heuristic.** If a rule and the pupil-copy contract disagree, the rule is the suspect.
- **Never add a semantic judge where structure works.** `dependsOn`, the taught ledger and strand structure are deterministic and testable. Prefer them over asking a model.
- **Never re-tune semantic prompts without evidence.** The APPLY and CHECK judges are frozen (`FROZEN_CONTRACTS.md`).
- **Never let tests define quality.** Tests guard contracts. `LESSON_QUALITY_STANDARD.md` defines quality. A passing suite with a weak lesson is a failure.
- **Never repeat canaries while a failure is unexplained.** A second generation adds cost and noise, not understanding. Diagnose the first.
- Never hand structure back to the model.
- Never add the server-only semantic judges to the browser re-accept.
- Never deploy `supabase/functions/learn-generate/index.ts` or `supabase/functions/learn-visuals/index.ts` (stale).
- Never print secrets.
- Never merge `main` unless told to.

## Tracing a production failure by request ID

The teacher's browser sends `attemptId`; the boot logs every stage as `{"event":"learn-generate","stage":...,"attemptId":...}`.

1. Get the request ID or attempt ID and the time window.
2. Query the Supabase logs API for project `enuzrcjnrxwglacivlnu`: `/v1/projects/enuzrcjnrxwglacivlnu/analytics/endpoints/logs` with SQL `... FROM logs WHERE source='function_logs'` (or `'function_edge_logs'` for HTTP status). `logs.all` no longer exists. Edge logs are lossy; absence is not proof.
3. Read the stages in order: `TEACHER_INTENT`, `PLAN_REQUEST`, `PLAN_VALIDATE` (`firstPass`), `PLAN_REPAIR` (`repairInstruction`, `repaired`), `STORY_*`, `LEARNING_MAP`, `TEACHING_PLAN`, `CONTENT_REQUEST`, `CONTENT_VALIDATE` (`contentBeats`), `CONTENT_REPAIR`, `APPLY_ALIGNMENT`, `CHECK_ALIGNMENT`, then `COMPLETE` or a failure stage with `issues`, `pupilBeatDiagnostics`, `slotDiagnostic` and `output`.
4. If the server says `COMPLETE` but the teacher saw a failure, the failure is in the browser: re-accept (`lesson-brain.js` `request` → `accept`), `validateAdventure` / `brokenLesson`, or visuals. Replay the returned adventure through `accept` with a browser-shaped context (no `lessonSkeleton`).
5. Cloudflare Worker logs: the wrangler OAuth token is rejected by the observability API. Do not assume Worker logs are available.
6. Keep auth tokens out of output. Read them from the keychain inside a helper script.

## Tests

- 32 `tests/*.test.js` files, plus `tests/lesson-contract-matrix.js` and `tests/lesson-model-compare.js` (scripts without the `.test.js` suffix, not part of the suite).
- Run each as `node tests/<file>.test.js` from the repo root. There is no `package.json`.
- `tests/teacher-journey.test.js` asserts the `sw.js` cache version. Bump both together.
- `tests/generate-loader.test.js` locks the boot's `lesson-brain.js?v=53` pin and required strings.
- Diagnostics: `TEACHING_REPORT=1 node tests/teaching-plan.test.js` prints teaching plans for fixtures A–H.
