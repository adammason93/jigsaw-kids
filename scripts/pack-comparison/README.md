# Pack model comparison harness (test script only)

This is a bounded exploratory comparison of the knowledge-pack call:
- **Arm A** is `gpt-4o-mini-2024-07-18`, the current production model.
- **Arm B** is `gpt-4.1-2025-04-14`.

Only the model name differs between arms. The pack prompt is chosen by `config.contract`:

| `contract` | Prompt | Status |
|---|---|---|
| `production-0d53e3d` (default) | `knowledgePackBrief` from `js/lesson-brain.js` at frozen commit `0d53e3d`, read from code unchanged | Run on Tue 6 Oct 2026. This is the **OLD-CONTRACT BASELINE** |
| `v2-harness` | `contract-prompt.js`: the proposed subject-neutral v2 contract (role-free claims, element/explanation units by id with `relationType`, chains, examples by id, `provenance`/`confidence`/`factuallyVerified`, `localScope`/`places`/`needsSource`, `sourceRef` to supplied material only) | **Harness only. Paid run not approved** (`config-v2-contract.json` has `approvalStatus: PENDING_FOUNDER_APPROVAL`) |

**This folder changes no production code, prompt or gate.** `js/` stays byte-identical to `0d53e3d`, and the tests check this.

## Files

| File | Purpose |
|---|---|
| `config.json` | Old-contract baseline config: frozen models, listed prices (USD per 1M tokens), cap $2.50, 40-call limit, `max_tokens` 4000, 60 s timeout, temperature 0, 2 repeats, run-order seed |
| `inputs.json`, `frozen-intents.json` | Old-contract baseline inputs: T1–T8 contexts, frozen unit counts, saved intents for T3/T4/T6/T8 |
| `config-v2-contract.json` | New-contract config. `maxCalls` 0, `capUsd` 0, `approvalStatus: PENDING_FOUNDER_APPROVAL`, so any paid run is refused |
| `inputs-v2-contract.json`, `frozen-intents-v2.json` | Same 8 requests and frozen counts. All 8 intents are reused verbatim (T1/T2/T5/T7 from the baseline run's intent calls, with source sha256), so there are **0 intent calls**. No material is supplied |
| `contract-prompt.js` | New-contract pack prompt (harness only), subject-neutral |
| `contract-validate.js` | Format validator: required fields, enums, ids resolve, element ≠ explanation, fused units, verbatim phrases and word limits, `factuallyVerified` false, place flags, cycles, `sourceRef` resolution (`UNRESOLVED_SOURCE`) and `needsSource` clearing rules |
| `contract-graph.js` | Root/chain counter. Strands = distinct roots with a passing first hop. Depth credits and longest path are reported separately. Examples never add strands |
| `contract-adapter.js` | v2 pack → the frozen engine's raw pack shape, for gate agreement through the unchanged `normaliseKnowledgePack` → `selectPackForLesson` → `assessPackReadiness`. Never invents explanations, never turns examples into mechanisms, never touches minima |
| `contract-evaluate.js` | Per-pack evaluation: validator, holds, strands/depth, contract verdict, adapter, frozen gate, linkage agreement, T8 refusal |
| `gate-context.js` | Harness gate-input assembly. Adds a sentence boundary to each free-text field the frozen code joins, which removes the "Landslides Students" place-name false positive without touching `js/` |
| `lib.js` | Budget guard, OpenAI client (same body as production `callModel`, plus `max_tokens`), seeded shuffle |
| `run.js` | Freezes intents and prompts, then runs the pack calls in seeded random order. Saves every call. Options: `--config`, `--inputs`, `--intents`, `--tests T3,T4,...` |
| `analyse.js` | Deterministic analysis. Options: `--analysis-dir NAME` (default `analysis`), `--raw-gate-context` (original assembly) |
| `blind-export.js` | Blind packets for the teachable runs, with the unblinding key written separately. Handles both contracts |
| `preflight-tokens.py` | Re-counts the preflight worst case with tiktoken `o200k_base` |
| `offline.test.js` | Original offline test (mocked fetch, no network) |
| `contract.test.js` | Offline tests for the v2 contract code. Uses **synthetic** fixtures (`fixtures/contract-synthetic.json`, hand-written, not model output, not verified facts) |

## Budget guard

- **Before every paid call**, the guard stops if the call count has reached `maxCalls`, or if guard spend plus the worst case of the next call would exceed `capUsd`.
- **Worst case of a call** = prompt chars ÷ 3 + 20 tokens of input, plus 4,000 output tokens, priced at listed price × 2.
- **Calls with no usage reported** (timeouts, transport errors) are charged at their full worst case.
- **Retries** cover transport errors only, from a fixed budget: `maxCalls` − planned calls.
- **A config whose `approvalStatus` is set and is not `APPROVED` refuses every paid run.** Only `--preflight-only` works.

## Usage

```bash
node scripts/pack-comparison/offline.test.js
node scripts/pack-comparison/contract.test.js
# Old-contract baseline (already run):
node scripts/pack-comparison/run.js --out OUT --preflight-only
# New contract: preflight only until the founder approves calls and a cap
node scripts/pack-comparison/run.js --out OUT --preflight-only --config config-v2-contract.json --inputs inputs-v2-contract.json --intents frozen-intents-v2.json [--tests T3,T4,T6,T8]
python3 scripts/pack-comparison/preflight-tokens.py OUT
node scripts/pack-comparison/analyse.js --out OUT [--analysis-dir NAME] [--raw-gate-context]
node scripts/pack-comparison/blind-export.js --out OUT
```

- `run.js` refuses an output folder that already has a ledger, so earlier artifacts are never overwritten.
- The API key is never logged or saved.

## What this does not do

- It does not score teaching quality. A separate blind scorer uses the frozen rubric on the blind packets. "STRUCTURALLY_COMPLETE" only means that enough format-valid units with selectable claims come from distinct roots.
- It does not claim that any lesson is ready.
- It does not merge, deploy, or change `js/`. Defects found in `js/` are reported separately, with a proposed fix that is not applied here.
