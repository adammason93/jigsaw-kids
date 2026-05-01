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
# supabase secrets set STORYBOOK_REUSE_FIRST_ON_LAST=0   # default: last picture spread reuses spread 1 art; set 0 to generate distinct final art
# supabase secrets set STORYBOOK_FAL_DISABLE=1   # force all DALL·E even if FAL_KEY is set
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug.

## Cost (indicative)

Rough order: With Fal, typically **1** text-to-image (anchor) **+ 6** Redux image→image calls, or legacy **7** calls (1 T2I + 6 Redux), plus DALL·E-only paths **+** story chat **+** character-bible chat **+** optional **vision** (portraits + first-panel lock) **+** **Fal** latency. Check [OpenAI](https://openai.com/pricing) and [Fal pricing](https://fal.ai/pricing) for current rates.

The JSON response **`meta`** includes **`falCastAnchorUsed`** (true when the anchor + 6× Redux path ran), **`falTextSpreads`**, **`falReduxSpreads`**, plus **`falTextModel`** / **`falReduxModel`** when Fal is enabled.

Portrait images are **not** sent to DALL·E (it only accepts text). The function downloads PNGs from your deployed site, summarises looks with vision, and injects that text into story + image prompts.

The static **storybook** page loads illustration URLs through the same **`clever-service?url=`** image proxy as DALL·E for **Fal** CDN links (`fal.media`, etc.) so spreads don’t randomly show a black picture pane when the browser can’t fetch the remote file directly.

## Troubleshooting

- **Fal (`fal_failed`)**: When **`FAL_KEY`** is set, a failed Fal step stops the whole book (no DALL·E substitution). Check function logs, Fal queue errors, and billing. With **cast anchor**, the reference is the anchor URL; with **`STORYBOOK_FAL_CAST_ANCHOR=0`**, Fal must fetch spread 1’s image URL. Tune `STORYBOOK_FAL_REFERENCE_STRENGTH` (higher = stick closer to the reference). The **first picture spread** uses a slightly lower strength than the rest so the opening scene (woods, torches, etc.) can replace the neutral lineup backdrop.
- **`images_failed` / DALL·E HTTP 400** (no Fal, or non-Fal errors): Redeploy so you have the latest function (sequential images + retries). The API response body is returned as `detail` in the JSON and logged. Common causes: deprecated parameter combos (the function retries with minimal payload), invalid image size for the account, or prompt **content policy** (read the `detail` message from OpenAI).
- **Logs still show `Promise.all`**: That stack trace is from an **older deployment** — run `supabase functions deploy clever-service` again.
