# clever-service (storybook)

Generates a **12-page** story (6 double-page spreads) with GPT-4o-mini JSON and **6** DALL·E 3 illustrations (`1024×1024`, standard): **one picture page per spread**, the paired page is text-only.

## Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug.

## Cost (indicative)

Rough order: **6 × DALL·E 3** square page art **+** one chat completion — check [OpenAI pricing](https://openai.com/pricing) for current rates.
