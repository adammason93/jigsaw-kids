# clever-service (storybook)

Generates a **12-page** story (6 double-page spreads) with GPT-4o-mini JSON and **6** DALL·E 3 illustrations (**1792×1024** landscape, standard): **one picture page per spread**, shown in the reader as **full-bleed art across both pages** with text on a white panel.

## Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# Public HTTPS origin where your static site serves files (no trailing slash).
# Used to fetch portrait PNGs (e.g. games/images/character-freya.png) for vision → DALL·E prompts.
supabase secrets set BOOK_ASSETS_BASE_URL=https://your-site.example
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug.

## Cost (indicative)

Rough order: **6 × DALL·E 3** square page art **+** one chat completion **+** optional **one GPT‑4o‑mini vision** call (when game people are selected and `BOOK_ASSETS_BASE_URL` is set) — check [OpenAI pricing](https://openai.com/pricing) for current rates.

Portrait images are **not** sent to DALL·E (it only accepts text). The function downloads PNGs from your deployed site, summarises looks with vision, and injects that text into story + image prompts.
