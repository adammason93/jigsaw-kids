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

Rough order: **4 × DALL·E 3 standard** (~USD 0.04 each at common list prices) **+** one small chat completion — check [OpenAI pricing](https://openai.com/pricing) for current rates.
