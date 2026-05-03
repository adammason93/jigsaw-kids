# clever-service (storybook)

Generates a **12-page** story (6 double-page spreads) with **GPT-4o-mini** JSON. **Illustrations:** with **`FAL_KEY`** set (default) — one **Flux** text-to-image **cast lineup / model sheet** (anchor), then **all 6 spreads** use **[Fal Flux Ultra Redux](https://fal.ai)** **image→image** from that anchor for consistent characters across scenes. Without **`FAL_KEY`**, all 6 images use **DALL·E 3** (OpenAI).

## Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# Public HTTPS origin where your static site serves files (no trailing slash).
# Used to fetch portrait PNGs (e.g. games/images/character-freya.png) for vision → DALL·E prompts.
supabase secrets set BOOK_ASSETS_BASE_URL=https://your-site.example

# Optional — cast anchor T2I + 6× image→image Redux (strongest consistency). If a Fal image step errors, the request fails with **`fal_failed`** (no DALL·E fallback — avoids mixed-style books). Without **`FAL_KEY`**, all pictures use DALL·E as before.
supabase secrets set FAL_KEY=...
# Optional overrides:
# supabase secrets set STORYBOOK_FAL_TEXT_MODEL=fal-ai/flux-pro/v1.1   # anchor + legacy spread-1 model
# supabase secrets set STORYBOOK_FAL_MODEL=fal-ai/flux-pro/v1.1-ultra/redux
# supabase secrets set STORYBOOK_FAL_REFERENCE_STRENGTH=0.35
# supabase secrets set STORYBOOK_FAL_CAST_ANCHOR=0   # legacy: spread 1 T2I, spreads 2–6 Redux from spread 1 (not anchor sheet)
# supabase secrets set STORYBOOK_REUSE_FIRST_ON_LAST=1   # opt-in: last picture spread reuses spread 1 art as a bookend; omit or leave unset for a distinct final illustration (default)
# supabase secrets set STORYBOOK_FAL_DISABLE=1   # force all DALL·E even if FAL_KEY is set

# Optional — switch image pipeline to OpenAI GPT Image (generations + edits; default model gpt-image-1.5).
# Anchor = text-to-image, spreads 2–6 = images/edits with the anchor as reference (best character consistency on the OpenAI side).
# Requires the public storage bucket created by migration 20260501093000_storybook_images_public_bucket.sql.
# supabase secrets set STORYBOOK_IMAGE_MODE=gptimage
# supabase secrets set STORYBOOK_GPTIMAGE_MODEL=gpt-image-1.5   # or gpt-image-1, gpt-image-1-mini, etc.
# supabase secrets set STORYBOOK_GPTIMAGE_MODERATION=low        # default low (omit or set low); use auto for OpenAI default moderation
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=high    # optional: high on anchor AND all six spread edits (priciest; restores old “max detail” tier)
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=medium  # optional: one tier for anchor + all edits (between economy and high)
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=low       # optional: cheapest — low on anchor + edits
# # If you omit STORYBOOK_GPTIMAGE_QUALITY: anchor = medium, six spread edits = low (~half the image-token cost vs former high+medium defaults).
# supabase secrets set STORYBOOK_GPTIMAGE_SIZE=1536x1024    # optional: default 1024x1024 (cheapest); 1536x1024 = wider spread, costs more
# supabase secrets set STORYBOOK_GPTIMAGE_INPUT_FIDELITY=low    # edits: force low | high; if OMITTED: high when `pictureBookQuality` is high OR the child uploaded reference photos, else low (stricter lock helps photo likeness)
# supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_SIZE=4         # how many spread edits to run in parallel per chunk (default 4 — anchor+4=5/min, the tier-1 ceiling)
# supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS=12000  # pause between chunks (default 12000ms; raise to 20000+ if 429 rate limits; try 8000 only on higher OpenAI tiers)
# Adaptive cooldown (default on): if the previous batch was slow, the function sleeps less so the ~150s edge limit is less likely to hit. To always use the full wait: supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_WAIT_ADAPTIVE=0
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug. **`character`** and **`place`** in the JSON body must be keys from `CHARACTERS` and `PLACES` in `supabase/functions/clever-service/index.ts` (the storybook UI lists the same ids in `games/storybook.js`). **`plotHint`** is trimmed to **800** characters server-side (same cap as the storybook textarea).

**`pictureBookQuality`** (optional, GPT Image mode only): **`"standard"`** (default if omitted) — economy pass: **1024×1024** art and **medium/low** quality when `STORYBOOK_GPTIMAGE_QUALITY` is unset. **`"high"`** — print-oriented defaults when secrets are unset: **1536×1024** spreads and **high/medium** quality on anchor vs edits. Fal / DALL·E paths ignore this field. Global secrets **`STORYBOOK_GPTIMAGE_SIZE`** and **`STORYBOOK_GPTIMAGE_QUALITY`** still override both tiers when set.

## Cost (indicative)

Rough order: With Fal, typically **1** text-to-image (anchor) **+ 6** Redux image→image calls, or legacy **7** calls (1 T2I + 6 Redux), plus DALL·E-only paths **+** story chat **+** character-bible chat **+** optional **vision** (portraits + first-panel lock) **+** **Fal** latency. Check [OpenAI](https://openai.com/pricing) and [Fal pricing](https://fal.ai/pricing) for current rates.

The JSON response **`meta`** includes **`imageMode`** (`fal` or `gptimage`), **`falCastAnchorUsed`**, **`falTextSpreads`**, **`falReduxSpreads`**, **`falTextModel`** / **`falReduxModel`** when Fal is enabled, and **`gptImageModel`** / **`gptImageSpreads`** when GPT Image is enabled.

Portrait images are **not** sent to DALL·E (it only accepts text). The function downloads PNGs from your deployed site, summarises looks with vision, and injects that text into story + image prompts.

The static **storybook** page loads illustration URLs through the same **`clever-service?url=`** image proxy as DALL·E for **Fal** CDN links (`fal.media`, etc.) so spreads don’t randomly show a black picture pane when the browser can’t fetch the remote file directly.

## Troubleshooting

- **GPT Image (`STORYBOOK_IMAGE_MODE=gptimage`)** — **strict, no fallback**: When this mode is on, the function will ONLY use the configured GPT Image model (**default `gpt-image-1.5`** if `STORYBOOK_GPTIMAGE_MODEL` is unset). There is **no silent fallback** to Fal or DALL·E — if the anchor or any spread edit fails, the function returns `error: "gpt_image_failed"` with the OpenAI detail in `detail` and `imageMode: "gptimage"` so the client knows exactly which engine failed. Anchor uses **`/v1/images/generations`**; the 6 spread edits use **`/v1/images/edits`** with the anchor PNG as reference. **Per-request `pictureBookQuality`:** **`standard`** (default) vs **`high`** — see “Deploy” section above; **`STORYBOOK_GPTIMAGE_QUALITY`** / **`STORYBOOK_GPTIMAGE_SIZE`** env secrets override the tier defaults when set. **`size: 1024x1024`** vs **`1536x1024`** depends on tier and env (see above), **`input_fidelity`** on edits defaults to **`high`** when the request includes **uploaded reference photos** or **`pictureBookQuality` is high**, else **`low`** (override with **`STORYBOOK_GPTIMAGE_INPUT_FIDELITY`**), **`moderation: low`**, **`output_format: png`**, **`stream: false`**, and **HTTP 400 fallbacks** (minimal generation payload; edits retry without `quality`). Output is decoded from base64 (or fetched if a URL is ever returned) and uploaded to the public **`storybook_images`** bucket. Spread edits run in **chunks** — by default **4** edits in parallel, then **~12s** pause (tune `STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS`), then the remaining **2** edits — to respect tier-1 **5 images/min** together with the anchor. Visual lock vision is **skipped** for this pipeline. A built-in **429 retry-after backoff** handles bursts. Errors usually come from missing bucket, prompt moderation, rate limits, or edge timeout — check function logs.
- **Fal (`fal_failed`)**: When **`FAL_KEY`** is set, a failed Fal step stops the whole book (no DALL·E substitution). Check function logs, Fal queue errors, and billing. With **cast anchor**, the reference is the anchor URL; with **`STORYBOOK_FAL_CAST_ANCHOR=0`**, Fal must fetch spread 1’s image URL. Tune `STORYBOOK_FAL_REFERENCE_STRENGTH` (higher = stick closer to the reference). The **first picture spread** uses a slightly lower strength than the rest so the opening scene (woods, torches, etc.) can replace the neutral lineup backdrop.
- **`images_failed` / DALL·E HTTP 400** (no Fal, or non-Fal errors): Redeploy so you have the latest function (sequential images + retries). The API response body is returned as `detail` in the JSON and logged. Common causes: deprecated parameter combos (the function retries with minimal payload), invalid image size for the account, or prompt **content policy** (read the `detail` message from OpenAI).
- **Log line `gpt-image chunk cooldown …`**: This is normal — the function pauses between batches of spread edits for OpenAI rate limits. It is **not** an error. If the **first batch was slow** (often 55s+), the new **adaptive** cooldown uses a **shorter** sleep so the total run is less likely to exceed the edge **~150s** wall clock (HTTP 546). Disable with `STORYBOOK_GPTIMAGE_CHUNK_WAIT_ADAPTIVE=0` if you see **429**s and need the full wait every time.
- **HTTP 546 / 504 / “ran out of time”**: The Edge invocation has a ~150s wall clock. GPT Image is **1 anchor + 6 edits** plus pacing between batches. Prefer **deploying latest** `clever-service` (adaptive cooldown + fast defaults). If it still happens, raise OpenAI image throughput tier or tune `STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS` (only lower if you are **not** seeing 429 in logs).
