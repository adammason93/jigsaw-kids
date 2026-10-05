# START HERE

## BEFORE MODIFYING WONDII, READ THE REQUIRED AGENT DOCUMENTATION

The code is not the full specification. It records what Wondii does today, not what Wondii is for, why the architecture is shaped the way it is, which approaches already failed, or which contracts are frozen. An agent that reads only the code will repeat experiments that were already tried and abandoned, and will "fix" things that are deliberate.

These files are written for AI coding agents joining the project. They were derived from the repository, `docs/`, git history, the tests and the code on branch `wondii-restructure-2026-09-30` at `c28c7f7`. Where documentation and code disagree, the disagreement is recorded rather than resolved.

## Reading order

Read all of them, in this order, before proposing any change.

1. `docs/agent/START_HERE.md` (this file)
2. `docs/agent/WONDII_CONSTITUTION.md` — what Wondii is and the rules that do not bend
3. `docs/agent/PRODUCT_VISION.md` — teacher and pupil experience, scene targets
4. `docs/agent/LESSON_QUALITY_STANDARD.md` — what a good lesson is, with examples
5. `docs/agent/ARCHITECTURE.md` — the actual pipeline in code, marked CURRENT / PLANNED / LEGACY
6. `docs/agent/FROZEN_CONTRACTS.md` — what must not change incidentally, and why
7. `docs/agent/ENGINEERING_RULES.md` — the required workflow and the never-do list
8. `docs/agent/DECISION_HISTORY.md` — what was tried, what happened, what not to repeat
9. `docs/agent/CURRENT_STATE.md` — branch, versions, latest canary, proven issues
10. `docs/agent/ROADMAP.md` — the ordered milestones. Do not work ahead
11. `docs/agent/AGENT_AUTONOMY_RULES.md` — what you may do alone, what needs approval, what is forbidden

Older material in `docs/` and `docs/rebuild/` is history. Its status is listed in `CURRENT_STATE.md` under "Status of older documents". Do not treat a superseded document as a description of today's code.

## Your first task: onboarding, not code

A newly joining agent does not change anything in its first task.

1. Inspect the repository: branch, HEAD, `js/lesson-brain.js`, `js/learn-generate-boot.js`, `schools/learn/creator.js`, `schools/learn/creator-core.js`, `schools/learn/lesson-shell.js`, `schools/learn/lesson-mechanics.js`, `js/visual-adventure.js`, `js/learn-visuals-boot.js`, `workers-site/index.ts`, `tests/`, `docs/`, and `git log main..HEAD`.
2. Compare what you find with these documents.
3. Explain Wondii back in your own words, using the schema below.
4. Identify every discrepancy between the documents and the code.
5. **CHANGE NOTHING.** No edits, no commits, no deploys, no lesson generation.

Code changes begin only after the product owner approves your onboarding response.

## Onboarding response schema

Reply with exactly these headings, in this order.

- **PRODUCT UNDERSTANDING** — what Wondii is, who uses it, what "good" means.
- **CURRENT PIPELINE** — teacher request to completed adventure, naming the real functions and files.
- **LESSON QUALITY STANDARD** — the standard in your own words, including why fact count is not depth.
- **OWNERSHIP BOUNDARIES** — what Wondii (deterministic code) owns versus what the model writes, and what the browser re-checks versus the server.
- **FROZEN CONTRACTS** — each contract and why it is frozen.
- **IMPORTANT HISTORICAL DECISIONS** — the decisions that most constrain future work, and what must not be repeated.
- **KNOWN PROBLEMS** — proven issues, open risks, and gaps against the product targets.
- **CURRENT MILESTONE** — where the roadmap stands and what the next permitted step is.
- **ROADMAP** — the ordered milestones after the current one.
- **DOCUMENTATION/CODE DISCREPANCIES** — everything you found that these documents get wrong or leave out, with file and line evidence.
- **QUESTIONS REQUIRING PRODUCT-OWNER DECISION** — decisions you must not make yourself.

## Standing constraints (apply to every task)

- Do not merge `main`. Work on `wondii-restructure-2026-09-30` unless told otherwise.
- Never print secrets: anon key, JWTs, `OPENAI_API_KEY`, passwords, access tokens.
- No permanent pupil accounts.
- Run tests as `node tests/<file>.test.js` from the repo root (CommonJS, Node 20). There is no `package.json` test runner.
- Deploy `supabase/functions/learn-generate/index.ts`. It is the boot pipeline and imports local `js/lesson-brain.js`. Never deploy the thin plan → story → `accept` path in its place. Never deploy `supabase/functions/learn-visuals/index.ts` (stale). See `ARCHITECTURE.md`.
- Commit with a HEREDOC message. No `--no-verify`, no force push, no amend.
- Do not generate a production lesson yourself. The human runs canaries.
