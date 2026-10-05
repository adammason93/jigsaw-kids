# Agent autonomy rules

> **Provenance note.** The brief that commissioned this pack said to record GREEN, AMBER and RED lists "exactly as specified". The verbatim lists were not retained in any source available when this file was written: not the repository, not the session transcript. The lists below are reconstructed from the standing constraints the product owner has stated across phases, and from `ENGINEERING_RULES.md` and `FROZEN_CONTRACTS.md`. **The product owner should replace or confirm them.** Until then, treat anything unclear as AMBER.

## GREEN — do without asking

- Read any file, run `git status`, `git log`, `git diff`.
- Run the test suite (`node tests/<file>.test.js`).
- Read production logs for diagnosis (without printing secrets).
- Replay a production structure in a local test to diagnose it.
- Write diagnostics and reports when asked.
- Within an approved phase: implement the scoped fix, add regression tests built from real failing data, bump cache versions, and commit with a HEREDOC message.

## AMBER — needs explicit product-owner approval in the phase brief

- Deploying anything (static site, Worker, edge functions).
- Pushing to the remote branch (unless the brief says to).
- Changing a validator's logic, a repair brief, a depth budget, the scene planner or player behaviour.
- Changing prompts sent to the model.
- Adding a new test fixture that encodes a quality judgement.
- Adding or changing a database migration, RLS policy or storage policy.
- Changing the visual allow-list, image model or cost profile.
- Anything that changes what a teacher or pupil sees.

## RED — never

- Merge `main`.
- Print or commit secrets (anon key, JWTs, `OPENAI_API_KEY`, passwords, access tokens).
- Create permanent pupil accounts.
- Replace `supabase/functions/learn-generate/index.ts` with the thin plan → story → `accept` path, or with a CDN eval of `lesson-brain.js`.
- Deploy the stale local `supabase/functions/learn-visuals/index.ts`.
- Generate a production lesson or canary yourself.
- Force push, amend, or commit with `--no-verify`.
- Add topic- or fixture-specific hacks.
- Weaken a validator to make a lesson pass.
- Run the server-only semantic judges in the browser.
- Change a frozen contract incidentally.
- Work ahead of the current roadmap milestone.

## Stop and report

Stop work, change nothing further, and report to the product owner with evidence when:

- **evidence contradicts the phase assumption** (for example, the brief says an issue is current but the repo proves it fixed, or the root cause is in a different layer than the brief expects)
- **a frozen contract is the smallest fix**
- **tests expose a larger issue** than the phase scope
- **code and docs disagree** in a way that affects the task
- a production failure is unexplained (do not retry it)
- the task would require an AMBER action that the brief did not authorise
