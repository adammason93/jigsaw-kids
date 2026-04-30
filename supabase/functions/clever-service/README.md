# clever-service (storybook)

Generates a **12-page** story (6 double-page spreads) with GPT-4o-mini JSON and **6** illustrations: **spread 1** is **DALL·E 3** (1024×1024); **spreads 2–6** are either **DALL·E 3** or **[Fal](https://fal.ai) Flux 1.1 Ultra Redux** (image-conditioned on spread 1) when `FAL_KEY` is set — see below.

## Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# Public HTTPS origin where your static site serves files (no trailing slash).
# Used to fetch portrait PNGs (e.g. games/images/character-freya.png) for vision → DALL·E prompts.
supabase secrets set BOOK_ASSETS_BASE_URL=https://your-site.example

# Optional — improves character continuity on spreads 2–6 by conditioning on spread 1’s image.
supabase secrets set FAL_KEY=...
# Optional overrides:
# supabase secrets set STORYBOOK_FAL_MODEL=fal-ai/flux-pro/v1.1-ultra/redux
# supabase secrets set STORYBOOK_FAL_REFERENCE_STRENGTH=0.35
# supabase secrets set STORYBOOK_FAL_DISABLE=1   # force all DALL·E even if FAL_KEY is set
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug.

## Cost (indicative)

Rough order: **6** image calls (mix of DALL·E 3 and optional Fal) **+** story chat **+** character-bible chat **+** optional **vision** (portraits + first-panel lock) **+** optional **Fal queue** latency. Check [OpenAI](https://openai.com/pricing) and [Fal pricing](https://fal.ai/pricing) for current rates.

The JSON response `meta` includes `falReduxSpreads` (how many panels used Fal) and `falReduxModel` when Fal is enabled.

Portrait images are **not** sent to DALL·E (it only accepts text). The function downloads PNGs from your deployed site, summarises looks with vision, and injects that text into story + image prompts.

## Troubleshooting

- **Fal**: If spreads 2–6 fall back to OpenAI, check function logs for `Fal Redux failed`. Ensure `FAL_KEY` is valid and Fal can fetch spread 1’s temporary OpenAI image URL (must run soon after generation). Tune `STORYBOOK_FAL_REFERENCE_STRENGTH` (higher = stick closer to spread 1 composition; lower = more freedom for new scenes).
- **`images_failed` / DALL·E HTTP 400**: Redeploy so you have the latest function (sequential images + retries). The API response body is returned as `detail` in the JSON and logged. Common causes: deprecated parameter combos (the function retries with minimal payload), invalid image size for the account, or prompt **content policy** (read the `detail` message from OpenAI).
- **Logs still show `Promise.all`**: That stack trace is from an **older deployment** — run `supabase functions deploy clever-service` again.
