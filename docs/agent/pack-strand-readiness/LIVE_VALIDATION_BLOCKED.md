# LIVE_VALIDATION_BLOCKED

OPENAI_API_KEY is not set in this environment. No model call was made.
No fixture pack, fixture plan, or fixture pupil lesson is presented as live evidence.

Re-run on a machine that has the key:

```
OPENAI_API_KEY=... node scripts/goal-reach-live.js
```

Optional: LESSON_MODEL (default gpt-4o-mini), GOAL_REACH_OUT (output directory), GOAL_REACH_CASES (comma list; default y4-sharks,y3-dinosaurs).

The script loads js/learn-generate-boot.js with the local js/lesson-brain.js and sends every model stage to api.openai.com. Supabase auth is stubbed so the boot can start. It writes one JSON file per case into docs/agent/pack-strand-readiness/. Each file includes the model's proposed learning map, the map after pruning, the rejection reasons, strand counts, and, when a lesson is admitted, the pupil teach, apply, check, and consolidation text. It does not merge, deploy, or add a repair attempt if a case fails.

Cases this invocation would run:

1. Year 3 — Teach children about dinosaurs.

Mam Tor blocking stays a unit check in tests/bounded-corrections.test.js. This harness does not call the model for it.
