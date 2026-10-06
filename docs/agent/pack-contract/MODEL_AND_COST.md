# Proposed stronger model, official pricing, cost and spend cap

**Status:** PROPOSAL for founder approval (PROTOCOL precondition P-2). **No paid call has been made.** Prices were retrieved from official OpenAI pages on **Tue 6 Oct 2026 (BST)**. Re-check them on the day of any run.

---

## 1. Recommendation

**Arm B model: `gpt-4.1`, pinned to snapshot `gpt-4.1-2025-04-14`.**

| Why | Detail |
|---|---|
| Only the model name changes | gpt-4.1 is a **non-reasoning** model ("low latency without a reasoning step") on Chat Completions with structured outputs. The production pack call's parameters (`temperature: 0`, `response_format: json_object`) carry over unchanged, so the comparison isolates the model |
| No hidden reasoning cost | There are no reasoning tokens, so the cost and latency bounds in §3 hold |
| Clearly stronger than gpt-4o-mini | It is a full-size model priced about 13× higher per output token, and its model page describes it as excelling "at instruction following and tool calling, with broad knowledge across domains" |
| Not deprecated | It is absent from the official deprecations page as of 6 Oct 2026. General-availability models get at least 6 months' notice |

**Caveats (stated plainly):**
- gpt-4.1 is a previous-generation model. Its own page says "we recommend starting with GPT-5 for complex tasks". This comparison answers "does a stronger model with identical settings fix pack quality?" It does **not** test the best model available.
- **Alternative not chosen: `gpt-6.1-sol`** ($2.00 input / $10.00 output per 1M, Standard, short context). It is a current-generation reasoning model whose reasoning effort can be set only from low up to max. That means hidden reasoning tokens (billed as output) and extra latency, and the same `temperature: 0` settings may not carry over. All of these confound a like-for-like test. It could be a later, separately costed round.
- **Longevity:** gpt-4.1 could be deprecated later. A nomination of gpt-4.1 would need a successor check before any production switch.

**Arm A model (current production): `gpt-4o-mini`, pinned to `gpt-4o-mini-2024-07-18`** (the snapshot listed for the alias on the official model page).

---

## 2. Official prices (USD per 1M tokens)

| Model | Input | Cached input | Output | Official source (accessed 6 Oct 2026) |
|---|---|---|---|---|
| **gpt-4o-mini** | **$0.15** | $0.075 | **$0.60** | <https://developers.openai.com/api/docs/models/gpt-4o-mini> |
| **gpt-4.1** | **$2.00** | $0.50 | **$8.00** | <https://developers.openai.com/api/docs/models/gpt-4.1> (page header: "$2•$8") |
| gpt-4o (reference only) | $2.50 | $1.25 | $10.00 | <https://developers.openai.com/api/docs/models/gpt-4o> |
| gpt-6.1-sol (alternative, Standard, short context) | $2.00 | $0.10 | $10.00 | <https://platform.openai.com/docs/pricing> |

**Notes on retrieval:**
- The main pricing page (<https://platform.openai.com/docs/pricing>) now lists only current-generation models in its tables. **gpt-4o-mini and gpt-4.1 prices were taken from their official model pages** on developers.openai.com.
- The scraped model-page text shows the label "Per 1M tokens ∙ Batch API price" beside the figures. This appears to be a pricing-tier toggle label. I treat the figures as **Standard** prices for two reasons:
  - the gpt-4.1 page header shows "$2•$8";
  - the "Quick comparison" lists GPT-4o at $2.50, which is GPT-4o's standard input price on its own page.
- If the founder sees higher Standard prices on the day, recompute §3. **The harness spend stop enforces the cap in dollars regardless.**
- Deprecations page checked: <https://developers.openai.com/api/docs/deprecations>. gpt-4.1 and gpt-4o-mini are not listed as deprecated.

---

## 3. Cost estimate

**Token budget per call:**
- **Input** is planned at 2,000 tokens. The measured pack brief is about 5,200 characters, or about 1,300–1,500 tokens with the frozen intent.
- **Output** is capped at **4,000 tokens** by the harness's `max_tokens` (PROTOCOL §3). Saved packs are about 3,100 characters, or about 800 tokens.

**Per-call worst case (2,000 in / 4,000 out):**
- gpt-4o-mini: 2,000 × $0.15/1M + 4,000 × $0.60/1M = **$0.0027**
- gpt-4.1: 2,000 × $2.00/1M + 4,000 × $8.00/1M = **$0.0360**

**GBP conversion:** 1 USD ≈ **£0.756** (GBP/USD ≈ 1.322, an indicative mid-market rate from public FX sites on 6 Oct 2026). Bank or card rates will differ slightly.

| Item | Calls | Model | Worst case USD | ≈ GBP | Typical USD (≈1.5k in / 1k out) |
|---|---|---|---|---|---|
| **Arm A** pack calls (14 teachable + 2 refusal) | 16 | gpt-4o-mini | **$0.043** | £0.03 | $0.013 |
| **Arm B** pack calls (14 teachable + 2 refusal) | 16 | gpt-4.1 | **$0.576** | £0.44 | $0.18 |
| Frozen teacher intents (T1–T8, shared) | 8 | gpt-4o-mini | $0.022 | £0.02 | $0.007 |
| **Planned total** | **40** | | **$0.64** | £0.48 | **≈ $0.20** (£0.15) |
| Transport retries (worst case, all priced at gpt-4.1) | 4 | gpt-4.1 | $0.144 | £0.11 | — |
| **Protocol worst case at the 44-call hard cap** | **44** | mixed | **$0.785** | **£0.59** | — |
| Absolute ceiling (all 44 calls at gpt-4.1, full 4,000 output tokens) | 44 | gpt-4.1 | **$1.584** | £1.20 | — |

---

## 4. Proposed spend cap

**Cap: USD $2.50 (≈ £1.89)** for the whole comparison, both arms, intents and retries.

- This is about **1.5 × the absolute ceiling** (1.5 × $1.584 = $2.38, rounded up to $2.50). It is about 3× the protocol worst case ($0.785) and about 12× the typical expected cost (about $0.20).
- **Enforcement:**
  - The harness keeps a running cost from the returned token usage and stops before any call that could take spend past the cap (assuming that call is a full gpt-4.1 call).
  - Separately, it stops at 44 calls.
  - A dedicated API project or key for this test, with a budget alert, is recommended. It is not relied on as the stop.
- **Approval needed (P-2):** the founder approves (a) Arm B = `gpt-4.1-2025-04-14` and (b) the cap of **$2.50 (≈ £1.89)**.

If `max_tokens` is **not** adopted in the harness, the worst case per gpt-4.1 call rises to its 32,768-token output limit (about $0.27 per call). The $2.50 cap would then still hold through the spend stop, but it could end the run early. The `max_tokens` bound is therefore part of the harness requirement.
