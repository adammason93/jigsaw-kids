# game-maker

Generates a **single HTML file** mini-game with **Babylon.js** (from CDN) from a short child’s text prompt. Called from `games/prompt-game.html`.

## Secrets

Uses the same OpenAI key as storybook:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Deploy

```bash
supabase functions deploy game-maker --no-verify-jwt
```

`verify_jwt` is off in `config.toml` so the static site can call with the **anon** key. Use Dashboard rate limits and budgets.

Set **`gameMakerEdgeSlug`** in `js/score-config.js` if you rename the function (default: `game-maker`).
