# Phase 0 — Safety and baseline

Recorded 30 September 2026. This phase did not change product code, schema, or surface status.

The school product, design skin, and game chrome exist only in the dirty working tree. Origin `main` does not contain them. No backup commit was created.

## Git

| | |
| --- | --- |
| Branch | `main` |
| Tracks | `origin/main` |
| HEAD | `c2a2bf5bc904325c6ec2a1c0dbcc13c7e137c94a` |
| HEAD subject | Homepage hero: full-bleed scene, bigger tablet, Nunito Black title to match design |
| Ahead / behind origin | 0 / 0 |
| Working tree | Dirty |

Modified tracked files: **52** (`git diff --stat`: 3,983 insertions, 1,021 deletions).

Largest modified areas: `games/storybook.js`, `supabase/functions/clever-service/index.ts` (+1,137 lines, story illustration / visual bible, not school organisations), `js/score-cloud.js`, `welcome.css`, `portal.html`, `workers-site/index.ts`.

`sw.js` cache name in the working tree is `jigsaw-kids-v367`. The committed file on HEAD is `jigsaw-kids-v347`.

Untracked, and not on origin:

- `css/` (`wondii-tokens.css`, `wondii-p1.css`)
- `docs/` (audits, handover, this file)
- `schools/`
- `ramsden.html`
- `js/organisation.js`
- `games/wondii-shell.js`, `games/wondii-shell.css`, `games/storybook-wondii.css`
- `games/images/brand/`, `games/images/oovi/`, `games/images/presets/`, `games/images/schools/`
- `supabase/migrations/20260929100000_organisations.sql`
- `supabase/migrations/20260929110000_fix_organisation_navigation_href.sql`

Recovery: this work is the working directory only. `git reset`, `git checkout`, or a clean clone of `origin/main` drops it. A backup commit or a copy of the tree is still outstanding. This phase did not create one.

## Build

There is no `package.json`, no `node_modules`, and no project test script.

| Check | Result |
| --- | --- |
| `node --check` on 54 product `.js` files (`.claude/` excluded) | Pass. No syntax errors printed. |
| `npx wrangler@4.40.0 deploy --dry-run` | Pass. Worker upload size 24.27 KiB / gzip 5.64 KiB. Binding `env.ASSETS`. Exited before upload. |
| `clever-service` typecheck | Not run. Deno is not installed. The function uses `jsr:` and `npm:` imports. |
| Automated tests | None in the repository. |
| Deploy | Not run. |

Wrangler warned that this Mac is 12.6.0 and the Workers runtime prefers macOS 13.5+. The dry-run still exited 0.

Node used: v20.20.2. Wrangler and the Supabase CLI are not installed globally. Wrangler was invoked through `npx`.

## Database and migrations

Remote database was not queried. Applied-or-not status of every migration is **unknown**.

Tracked migrations already on HEAD:

- `20240905100000_storybook_room.sql`
- `20260427120000_score_bundles.sql`
- `20260428180000_colouring_room_storage.sql`
- `20260429180000_storybook_room_storage.sql`
- `20260430120000_storybook_room_rls_split_part.sql`
- `20260501093000_storybook_images_public_bucket.sql`
- `20260505120000_storybook_generation_jobs.sql`
- `20260506120000_storybook_job_progress.sql`
- `20260506130000_characters_room_storage.sql`

Present only in the working tree, not applied by this phase:

- `20260929100000_organisations.sql` — `organisations`, members, invites, story starters, navigation, RLS, RPCs
- `20260929110000_fix_organisation_navigation_href.sql`

Those two files target the same Supabase project the family site already uses. Do not apply them until the live schema has been read.

Classes, pupils, adventures, and class sessions are still browser objects (`wondii-school-classes`, `wondii-learning-adventures`, `wondii-class-sessions`). There is no pupil, session, or result table.

## Environment

Static pages can be opened without a build. School organisation UI needs a signed-in Supabase user and the organisation tables.

`js/score-config.js` is tracked. It holds the browser Supabase URL, anon key, and family login email. This document does not copy those values. `js/score-config.example.js` is the template.

Edge function `clever-service` (`verify_jwt = false` in `supabase/config.toml`) expects hosted secrets, including `OPENAI_API_KEY`, and reads `SUPABASE_URL` plus a service role from `SUPABASE_SECRET_KEYS` or `SUPABASE_SERVICE_ROLE_KEY`. Optional story and image secrets are listed in `supabase/functions/clever-service/README.md`. `game-maker` is a second function, also `verify_jwt = false`.

Worker config: `wrangler.jsonc`, name `jigsaw-kids`, entry `workers-site/index.ts`, assets directory `.`.

## Known failures and gaps

These are recorded, not fixed.

1. No automated test suite.
2. `clever-service` was not typechecked.
3. Organisation SQL apply state is unknown.
4. School domain data is browser storage, not a database. Phase 1 owns that problem.
5. `docs/WONDII_DESIGN_DEBT.md` still says there is no token file. `css/wondii-tokens.css` exists and is untracked. The debt doc is stale on that point.
6. Visual registry generation counts (legacy 71, mixed 80, current 29, unknown 2, total 182) were not rewritten after the P1 skin. 51 surfaces were marked visually verified for chrome only, in the registry’s P1 section.
7. `WondiiLessonShell` and `LearningSessionEngine` do not exist. `games/wondii-shell.js` is family chrome only.
8. Join (`schools/learn/join.html`) does not load `js/score-cloud.js`.
9. Service worker cache name differs between HEAD and the working tree.
10. The school product is uncommitted.

## Audit documents read

- `docs/WONDII_CURRENT_STATE_HANDOVER.md`
- `docs/WONDII_VISUAL_SURFACE_REGISTRY.md`
- `docs/WONDII_GAME_MATRIX.md`
- `docs/WONDII_DESIGN_DEBT.md`

No separate product-blueprint, route-audit, or database-audit file exists. Those reviews are in the handover and in chat.

## Files created this phase

- `docs/rebuild/PHASE_00_BASELINE.md`

Registry, game matrix, and design-debt findings were not reclassified. A pointer to this baseline was added to each so the programme state is visible.

## Checkpoint

Phase 0 is complete. Phase 1 has not started.

### Git safety checkpoint

Recorded after the baseline, on 30 September 2026. Not pushed.

| | |
| --- | --- |
| Branch | `wondii-restructure-2026-09-30` |
| Checkpoint commit | `0ef77cc8ac7e57f8a83e30094bd5595a972aa9d6` |
| Message | checkpoint: Wondii pre-restructure baseline |
| Files in that commit | 241 (school product, audits, tokens, shell, Ramsden, organisation SQL, class artwork) |
| Pushed | No |

The checkpoint includes `schools/`, `js/organisation.js`, `ramsden.html`, `css/wondii-tokens.css`, `css/wondii-p1.css`, `games/wondii-shell.js`, the audit docs, and both organisation migration files.

Deliberately not in the checkpoint commit:

- `js/score-config.js` — unchanged from `main`, so it was not part of this commit. It is already tracked. It holds a browser-public Supabase URL, an anon JWT (`role` is `anon`), a login email, and edge-function slugs. No service-role key, no API secret, and no password value.
- `.env` and `.env.*` — already in `.gitignore`. None were present to stage.
- `.wrangler`, `.dev.vars*`, `node_modules/`, `supabase/.temp/`, `.claude/` — already ignored. `.gitignore` was not changed.

This documentation update is a follow-up commit so the recorded hash does not leave the tree dirty.
