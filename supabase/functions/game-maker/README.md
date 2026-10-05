# game-maker

Generates a **single HTML file** mini-game with **Babylon.js** (from CDN) from a short child’s text prompt. Called from `games/prompt-game.html`.

The browser calls the slug **`dynamic-action`** (`gameMakerEdgeSlug` in `js/score-config.js`). The source lives in this folder. Deploy with the command below so that slug is updated from this source.

## Who can call it

This function spends OpenAI money, so it only runs for a **signed-in family**.

- `verify_jwt = true` in `supabase/config.toml` for `[functions.game-maker]` and `[functions.dynamic-action]`. The gateway rejects a missing or badly signed token.
- The public **anon key is itself a valid JWT** (`role: anon`), so the gateway would still let it through. The function therefore checks the bearer token with Supabase Auth (`GET /auth/v1/user`, the same check as `supabase.auth.getUser`). The anon key, the service-role key, and any missing or invalid token get **401** and **OpenAI is not called**.
- Hosted functions already have `SUPABASE_URL` and `SUPABASE_ANON_KEY`. No extra auth secret is required.
- Make a 3D Game sends the signed-in user’s **access token** as `Authorization` (from `KidsScoreCloud.getSession` on the page) and still sends the anon key as `apikey`. A signed-out visitor sees **“Please sign in to make a game.”** and the request is not sent.

## CORS

Responses allow these browser origins:

- `https://wondii.co.uk` and `https://www.wondii.co.uk`
- `https://jigsaw-kids.adammason93.workers.dev`
- `localhost`, `127.0.0.1`, and `::1` on any port (`http` or `https`), for local dev

Other origins are not echoed. Add more with a comma-separated secret (optional spaces, trailing slashes ignored):

```bash
supabase secrets set GAME_MAKER_ALLOWED_ORIGINS=https://preview.example.com
```

A phone on a LAN address such as `http://192.168.1.20:8080` is not covered by localhost. Add that origin with the secret above if you test that way.

## Secrets

Uses the same OpenAI key as storybook:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Deploy

Merging the site repo does **not** redeploy this function. Edge functions are deployed by hand with the Supabase CLI.

From the repo root, with the CLI linked to the project (CLI **1.215.0 or newer**, so `entrypoint` is used):

```bash
supabase functions deploy dynamic-action
```

Do **not** pass `--no-verify-jwt`.

That publishes `supabase/functions/game-maker/index.ts` as the slug **`dynamic-action`**. `supabase/config.toml` sets:

```toml
[functions.dynamic-action]
entrypoint = "./functions/game-maker/index.ts"
verify_jwt = true
```

Deploy **only** `dynamic-action`. Do not deploy every function in one go — that would also redeploy `clever-service`.

Ship the static site **before** this function. The updated page sends the family access token. If the function goes out first, the old page still sends the anon key and Make a 3D Game will ask the family to sign in until the site update is live.

The `entrypoint` path is relative to the `supabase` folder (next to `config.toml`). If the CLI says that file is missing, upgrade the CLI.
