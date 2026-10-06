# Pack model comparison harness (test script only)

This is a bounded exploratory comparison of the knowledge-pack call:
- **Arm A** is `gpt-4o-mini-2024-07-18`, the current production model.
- **Arm B** is `gpt-4.1-2025-04-14`.

Both arms use the **current production pack prompt**, `knowledgePackBrief` from `js/lesson-brain.js` at frozen commit `0d53e3d`, read from code unchanged. Only the model name differs between arms.

**This folder changes no production code, prompt or gate.**

## Files

| File | Purpose |
|---|---|
| `config.json` | Frozen models, listed prices (USD per 1M tokens), cap $2.50, 40-call limit, `max_tokens` 4000, 60 s timeout, temperature 0, 2 repeats, run-order seed |
| `inputs.json` | T1–T8 contexts and frozen unit counts |
| `frozen-intents.json` | Saved raw teacher intents for T3, T4, T6 and T8 (copied from earlier live runs, with source sha256) |
| `lib.js` | Budget guard, OpenAI client (same body as production `callModel`, plus `max_tokens`), seeded shuffle |
| `run.js` | Freezes intents and prompts, then runs the 32 pack calls in seeded random order. Saves every call |
| `analyse.js` | Deterministic analysis: format validity, unchanged gate (`normaliseKnowledgePack` → `selectPackForLesson` → `assessPackReadiness`), T8 refusal, roots and depth, latency, cost |
| `blind-export.js` | Blind packets for the 28 teachable runs, with the unblinding key written separately |
| `preflight-tokens.py` | Re-counts the preflight worst case with tiktoken `o200k_base` |
| `offline.test.js` | Offline test with a mocked fetch. No network and no paid calls |

## Budget guard

- **Before every paid call**, the guard stops if the call count is already at 40, or if guard spend plus the worst case of the next call would exceed $2.50.
- **Worst case of a call** = prompt chars ÷ 3 + 20 tokens of input, plus 4,000 output tokens, priced at listed price × 2. The ×2 is a margin in case the listed figures are discounted (Batch) rates.
- **Calls with no usage reported** (timeouts, transport errors) are charged at their full worst case.
- **Retries** cover transport errors only (timeout, network, 429, 5xx, empty body). They come from a fixed budget: 40 − planned calls.
- **Before the first call**, `run.js` writes `worst-case.json` and refuses to run if the preflight worst case exceeds the cap. If it does, it reduces retries first.

## Usage

```bash
node scripts/pack-comparison/offline.test.js                              # offline checks
node scripts/pack-comparison/run.js --out OUT --preflight-only             # no calls; writes worst-case.json
python3 scripts/pack-comparison/preflight-tokens.py OUT                    # tiktoken recount (needs tiktoken)
OPENAI_API_KEY=... node scripts/pack-comparison/run.js --out OUT --live    # paid run (authorised runs only)
node scripts/pack-comparison/analyse.js --out OUT
node scripts/pack-comparison/blind-export.js --out OUT                     # OUT/blind/ + OUT/UNBLIND_KEY.json
```

- `run.js` refuses an output folder that already has a ledger, so earlier artifacts are never overwritten.
- The API key is never logged or saved.

## What this does not do

- It does not score teaching quality. A separate blind scorer uses the frozen rubric on the blind packets.
- It does not claim that any lesson is ready.
- It does not merge, deploy, or change `js/`.
