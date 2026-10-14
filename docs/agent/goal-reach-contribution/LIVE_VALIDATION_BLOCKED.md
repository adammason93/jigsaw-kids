# LIVE_VALIDATION_BLOCKED

OPENAI_API_KEY is not set in this environment. No model call was made.
No fixture pack, fixture plan, or fixture pupil lesson is presented as live evidence.

Re-run on a machine that has the key:

```
OPENAI_API_KEY=... node scripts/goal-reach-live.js
```

Optional: LESSON_MODEL (default gpt-4o-mini).

The script loads js/learn-generate-boot.js with the local js/lesson-brain.js and sends every model stage to api.openai.com. Supabase auth is stubbed so the boot can start. It writes y4-sharks.json and y3-dinosaurs.json into docs/agent/goal-reach-contribution/. Each file includes the model's proposed learning map, the map after goal-reach pruning, the rejection reasons, strand counts, and, when a lesson is admitted, the pupil teach, apply, check, and consolidation text. It does not merge, deploy, or add a repair attempt if a case fails.

Cases:

1. Year 4 — How are sharks adapted to living in the ocean?
2. Year 3 — Teach children about dinosaurs.

Mam Tor blocking stays a unit check in tests/bounded-corrections.test.js. This harness does not call the model for it.
