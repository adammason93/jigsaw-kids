# clever-service (storybook)

Generates an 8-page story (GPT-4o-mini JSON) and **4** illustrations (DALL·E 3, `1024×1024`, standard quality).

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

Rough order: **1 × wide landscape (1792×1024) + 4 × square page art**, DALL·E 3 standard (~similar per-image list pricing) **+** one small chat completion — check [OpenAI pricing](https://openai.com/pricing) for current rates.
