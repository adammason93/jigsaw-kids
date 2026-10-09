# Wondii Families — controlled release

Local branch: `cursor/family-accounts`. Do not push, merge to `main`, apply these migrations, or deploy `child-pair` until that window is approved.

Live site stays the account-menu release until this window. A push to `main` publishes the Cloudflare Worker and the website together (`.github/workflows/deploy-cloudflare-worker.yml`). That push is the website and worker step, not a separate static upload.

`origin/main` is not the parent of this branch. Merging into `main` would also carry the story-lesson history and would publish the site. The safer website step is a Wrangler deploy of this commit after the database, secret, and function steps below. Pull request #26 targets `cursor/portal-session` and does not publish `www.wondii.co.uk`.

Games load `js/wondii-session.js` before `js/score-cloud.js`. The settings gear keeps sound, contrast, and motion only. It does not ask for a family password or offer a second sign-in. Sign-in and sign-out stay on the Wondii home. A signed-out storybook can still be generated.

Project: `enuzrcjnrxwglacivlnu` (eu-west-1).

## Already on the hosted database

Applied earlier, and left in place:

- `20261008170000_families.sql`
- `20261008180000` job keys, child JWT guards, `child_devices`, speech quota, purge
- `20261008210000_child_pairing.sql`
- `pg_cron` job `purge-expired-child-profiles` (`15 1 * * *`)

Confirm those three versions are still recorded before applying anything else. Do not replay them.

## Not applied, not deployed

- `20261008220000_child_home.sql`
- `20261008230000_child_library.sql`
- `20261008240000_child_artwork.sql`
- `20261008250000_child_access_switch.sql` (emergency flags; defaults leave pairing and content open once applied)
- Edge function `child-pair` (source only; `verify_jwt = false` in `supabase/config.toml`)
- Branch `clever-service` (daily claim on book and character generation; refuses speech when `SPEECH_QUOTA_SECRET` is empty)
- Branch worker (`workers-site/index.ts` speech signature)
- Branch website (Family Dashboard, `child.html`, private library scripts, service worker `jigsaw-kids-v457`)

`SPEECH_QUOTA_SECRET` is not set. `CHILD_PAIRING_ENABLED` is not set. Do not invent either value in the repo. Do not deploy `clever-service` or the worker until a secret-name check shows `SPEECH_QUOTA_SECRET`. Do not deploy `child-pair` until `CHILD_PAIRING_ENABLED` is exactly `1`.

## What the branch already does

- A child book is stored as shelf JSON in `private.child_shelves`. Page pictures and `cover.jpg` go in the private `child_library` bucket under `{childId}/books/{bookId}/`. The shelf keeps `wondii-private:` markers. Reopening downloads those objects with the child session and never uses a public or signed URL.
- A parent share copies the grown-up’s book or character into `{childId}/shared/{shareId}/`. The child can read that folder only while the share row exists. Unshare deletes the row and the copied files. Adult `storybook_room` and `characters_room` policies are unchanged.
- A saved child character PNG is `{childId}/characters/{id}.png`. The storybook “saved characters” picker loads that private picture and sends it as the book reference.
- Book and character generation call `claim_child_generation` before the paid work when the bearer is a child session. The same key is refunded if generation fails. Signed-out visitors and adult sessions are unchanged.

## Release blocker that stays open on purpose

A caller who sends only the public anon key is not a child session, so book and character generation stay on the public storybook path and are not allowance-gated. Closing that means requiring a signed-in session for every generation, which changes the public site. Do not do that in this release.

A paired child who is signed in is gated. The browser sends that child’s access token and a reserved `creationKey`.

## Pending migrations

These four files are additive. They do not drop or alter adult story tables, adult storage policies, or saved adult rows.

- `20261008220000` replaces `child_home()` with an empty library response. No drop, delete, or alter.
- `20261008230000` adds private library tables and replaces `child_home()` again. Grants stay off `anon`. Adult `storybook_room` and `characters_room` policies are not in this file.
- `20261008240000` adds the private `child_library` bucket and generation claims. The only policies it drops are `child_library_*`, and those do not exist until this file creates them.
- `20261008250000` adds one singleton switch and replaces `child_content_access`, `create_child_pairing`, `consume_child_pairing`, and `register_child_device`. It does not delete profiles, devices, shelves, books, characters, or files.

Apply them in that filename order, after `20261008210000` is already recorded. If a statement fails, stop. Do not retry a later file. Recovery is to leave the applied statements in place and follow Rollback. Do not drop `child_library` once a child file has been written.

## Pairing address

`child-pair` rate limits with `pairingClientAddress`. The only address it accepts is a single `cf-connecting-ip` value, which Cloudflare sets and overwrites on the request that reaches the function. `x-forwarded-for`, `x-real-ip`, and `true-client-ip` are ignored. A missing or comma-separated `cf-connecting-ip` uses the one shared bucket `unknown`, so a spoofed list cannot open a fresh allowance. The worker speech proxy is separate: it also reads `cf-connecting-ip` on the Cloudflare Worker and signs it. That path does not trust forwarded headers either.

## Emergency disable

This does not delete saved content.

1. In the Supabase SQL editor, as the database owner:

```sql
update private.child_access_control
set pairing_enabled = false,
    content_enabled = false,
    updated_at = now()
where singleton;
```

`create_child_pairing` then raises `pairing_unavailable` and does not mint a code. `consume_child_pairing` returns `unavailable` before it marks a ticket used. `child_content_access` returns `allowed: false` before the device check, so existing child sessions lose library RPCs and `child_library` storage access. Shelves, books, characters, device rows, and objects stay. Parents still reach their own family records.

2. Set the `child-pair` secret `CHILD_PAIRING_ENABLED` to `0`, or unset it, and redeploy that function. The function returns 503 before it creates an auth user when the value is not exactly `1`. The SQL update is the immediate control if an isolate still has the old value.

3. To reopen later, set both flags back to `true` and set `CHILD_PAIRING_ENABLED` to `1` again. Do not delete rows to do this.

## Service worker rollout

Cache name `jigsaw-kids-v457`. Install skips waiting. Activate deletes every other cache name, claims clients, and reloads open portal, school learn, game, and child pages. Successful network responses are not written back into the cache. Those navigations, plus `wondii-session.js`, `score-cloud.js`, `kids-core.js`, `family.js`, `child-join.js`, `child-library.js`, and `portal.js`, use a reload request so an old HTTP cache copy is not mixed in.

Personal, school, and anonymous sessions keep the same `wondii-u:{uid}:` storage keys and the same Supabase session in `js/wondii-session.js`. Anonymous score writes stay no-ops until a session is bound. A page that is not in the reload list keeps the scripts already in memory until the next navigation. Offline fallback can serve the new precache only after activate; until one successful load, a failed network falls back to `portal.html`.

## Preview

`www.wondii.co.uk` is unchanged by a branch preview. The Families dashboard and `child.html` call family or pairing RPCs only on `wondii.co.uk`, `www.wondii.co.uk`, `localhost`, or `127.0.0.1`. A `workers.dev` preview shows that family setup and pairing are off, including after this branch is pushed and Cloudflare builds a preview alias. `child-pair` stays undeployed until the window below, so a pairing code cannot create a child auth user.

## Order

Do these in one approved window. Stop on the first failed check. The expected commit is the one that last changed this file:

```bash
git log -1 --format=%H -- docs/families/controlled-release.md
```

Deploy that SHA only. Do not merge to `main`.

1. **Confirm hosted state.** `20261008170000`, `20261008180000`, and `20261008210000` are recorded. No `wondii-sec-%` test users remain. `child_library` bucket does not exist yet. `child-pair` is not deployed.
2. **Apply SQL in filename order only:**
   - `20261008220000_child_home.sql`
   - `20261008230000_child_library.sql`
   - `20261008240000_child_artwork.sql`
   - `20261008250000_child_access_switch.sql`
3. **Record** those four versions the same way the earlier Families migrations were recorded.
4. **Secrets, before any function or worker publish.** List secret names only. Stop if `SPEECH_QUOTA_SECRET` is missing.
   - Generate one `SPEECH_QUOTA_SECRET` outside the repo.
   - Set it on the `clever-service` function secrets.
   - Set the same value as a Worker secret (`npx wrangler secret put SPEECH_QUOTA_SECRET`).
   - Leave `OPENAI_API_KEY` and the Supabase service role where they already are. Do not put the service role in the website. Do not print any secret value.
5. **Deploy `clever-service`:** `supabase functions deploy clever-service --no-verify-jwt` from this SHA. The branch function returns 503 for speech when `SPEECH_QUOTA_SECRET` is empty, including a direct call that skips the worker. Do this before the worker so Read to me keeps a function that understands the speech signature.
6. **Enable and deploy `child-pair`.** Set `CHILD_PAIRING_ENABLED` to `1`, then `supabase functions deploy child-pair --no-verify-jwt`. This is the public child-login switch. Deploy it only after step 2. If the secret is unset, the function returns 503 and creates no user.
7. **Publish the website and worker together** with `npx wrangler deploy` from this SHA. Do not merge to `main`. The worker refuses Read to me when `SPEECH_QUOTA_SECRET` is empty, so step 4 must already be done. Service worker cache is `jigsaw-kids-v457`.
8. **Leave public marketing unchanged.** Do not announce child login until the smoke tests pass.

Personal and school portals use the same `portal.html` and the same storage buckets. Families adds a Family view and does not replace those policies. School character storage stays on `characters_room`.

## Smoke tests

Use two real parent accounts and two child profiles. Delete the devices afterwards from the Family Dashboard.

1. Parent signs in. Existing personal books and school classes still open.
2. Parent creates two children, sets a low daily allowance (1 book, 1 character), and shows a pairing code.
3. Child device joins with the code. Home shows that child’s name only.
4. Child creates one book. The cover and pages reopen from My Books and from Continue reading. A second book the same London day is refused by the generator, not only by the button.
5. Child creates one character. It appears on My Characters and can be added inside a new book’s saved-character picker.
6. Parent shares one of their own books and one character. They appear on that child’s Family Bookshelf and open with pictures. The other child does not see them.
7. Parent revokes the device. Refresh on that device returns to the code screen and cannot open the first child’s books.
8. Parent suspends the profile. A new code for that profile is refused. The other child still signs in.
9. A direct storage URL for a child picture, without that child’s session, does not load. A parent session can open the child they own.
10. Read to me still plays on an adult storybook page.
11. A signed-out adult can still start a storybook. That path is the known ungated public generation.

## Rollback

Stop forward work. Do not drop Families tables if any child has saved a book or character.

1. Republish the previous website and worker (the current live account-menu release). Read to me on that worker does not need `SPEECH_QUOTA_SECRET`.
2. Redeploy the previous `clever-service` (live version 248 at the time of this review). Adults and the public storybook return to today’s behaviour. Child claims simply stop being called.
3. Run the emergency SQL in **Emergency disable**, then set `CHILD_PAIRING_ENABLED` to `0` and redeploy or undeploy `child-pair`. New pairing stops. Existing child sessions lose protected library and storage access. Saved rows and files stay.
4. Leave `20261008220000` through `20261008250000` in place if any private files were written. They are unused by the previous website. Dropping `child_library` deletes those pictures.
5. The earlier family, device, and pairing tables stay. They are already live and the purge job should keep running.

## Go / no-go

Go only when every line below is true. Otherwise stop.

- The SHA from `git log -1 --format=%H -- docs/families/controlled-release.md` is the SHA in the release report, and `origin/main` is still the pre-Families commit.
- Hosted migration history matches **Already on the hosted database**. The four pending files are not yet recorded.
- Secret names include `SPEECH_QUOTA_SECRET` on `clever-service` and on the worker before those deploys. `CHILD_PAIRING_ENABLED` is `1` only for the `child-pair` deploy.
- Commands, from `/tmp/wondii-families` at that SHA: apply the four SQL files in order, `supabase functions deploy clever-service --no-verify-jwt`, `supabase functions deploy child-pair --no-verify-jwt`, `npx wrangler deploy`.
- Hosted checks after deploy, still not before approval: the eleven smoke tests in this file. `FAMILY_LIVE=1` stays unset until that window. No `wondii-sec-%` users.
- Rollback is the five steps above. Stop if a migration errors, a secret name is missing, `clever-service` deploy fails, Read to me fails for an adult, an adult storage policy changes, or `child-pair` is deployed before `20261008250000`.

## After this window

Families stops here. Next product work is the permanent twelve Wondii Crew characters, then the main portal homepage and Your Wondii World.
