# LIVE_VALIDATION_BLOCKED

OPENAI_API_KEY is not set in this environment. No model call was made.
No fixture pack, fixture plan, or fixture pupil lesson is presented as live evidence.

Re-run on a machine that has the key:

```
OPENAI_API_KEY=... node scripts/bounded-corrections-live.js
```

Optional: LESSON_MODEL (default gpt-4o-mini).

The script loads js/learn-generate-boot.js with the local js/lesson-brain.js (the code under test) and sends every model stage to api.openai.com. Supabase auth is stubbed so the boot can start. It writes one JSON file per case into docs/agent/bounded-corrections-live/ and does not merge, deploy, or change gates if a case fails.

Cases:

1. Year 4 — How are sharks adapted to living in the ocean? Full pipeline: pack, developed-strand gate, beat substance, pupil teach / apply / check / consolidation.
2. Year 3 — Teach children about dinosaurs. Record whether the required developed strands exist.
3. Year 6 — Explain how the geology of Mam Tor caused the landslip. Unsupported local geology and causation must not be admitted as teaching facts.
