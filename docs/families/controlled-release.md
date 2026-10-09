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
- `20261008250000_child_access_switch.sql` (pairing and child content both default to false)
- Edge function `child-pair` (source only; `verify_jwt = false` in `supabase/config.toml`)
- Branch `clever-service` (daily claim on book and character generation; refuses speech when `SPEECH_QUOTA_SECRET` is empty)
- Branch worker (`workers-site/index.ts` speech signature)
- Branch website (Family Dashboard, `child.html`, private library scripts, service worker `jigsaw-kids-v458`)

`SPEECH_QUOTA_SECRET` is not set. `CHILD_PAIRING_ENABLED` is not set. Do not invent either value in the repo. Do not deploy `clever-service` or the worker until a secret-name check shows `SPEECH_QUOTA_SECRET`. Leave `CHILD_PAIRING_ENABLED` unset through the public rollout. Set it to `1` only for the controlled pairing test below, and set it back to `0` immediately afterwards if public launch is not approved.

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
- `20261008250000` adds one singleton switch, defaults both flags to false, and replaces `child_content_access`, `create_child_pairing`, `consume_child_pairing`, `register_child_device`, and `pairing_attempt_allowed`. It does not delete profiles, devices, shelves, books, characters, or files.

Applying these four files does not create a child login and does not open private child content.

- `child_home`, the library RPCs, and `claim_child_generation` call `child_content_access` or `session_child_id`. With `content_enabled` false, that returns `allowed: false` before a device is accepted.
- `private.session_child_folder()` returns null unless `child_content_access` allows the session. The `child_library_*` storage policies compare the object folder with that value, so a direct storage request from a child session does not match. The bucket is private (`public = false`). A request with no session does not match the authenticated policies.
- `create_child_pairing`, `consume_child_pairing`, and `register_child_device` all refuse while `pairing_enabled` is false. `consume_child_pairing` returns before it marks a ticket used.
- No statement grants these functions to `anon`. Adult `storybook_room` and `characters_room` policies are outside these files.
- There are currently no family, child-profile, or child-device rows. These files do not insert any.

Apply them in that filename order, after `20261008210000` is already recorded. If a statement fails, stop. Do not retry a later file. After `20261008250000`, read the switch and stop unless both flags are false:

```sql
select pairing_enabled, content_enabled
from private.child_access_control
where singleton;
```

Recovery is to leave the applied statements in place and follow Rollback. Do not drop `child_library` once a child file has been written.

## Pairing address and account creation

`child-pair` is not deployed. When it is deployed, it returns 503 before any database or auth call unless `CHILD_PAIRING_ENABLED` is exactly `1`. A user is created only after `consume_child_pairing` returns a live ticket. Wrong, expired, and reused codes do not create a user. The code is one of 32^8 values, lasts 10 minutes, and a parent can mint at most 10 codes an hour.

The rate limit is 20 attempts per address bucket and 300 attempts globally, each in a 10-minute window. `pairingClientAddress` accepts only one `cf-connecting-ip` value. The public project URL is behind Cloudflare (`server: cloudflare` and `cf-ray` on `https://enuzrcjnrxwglacivlnu.supabase.co/functions/v1/`). Cloudflare overwrites that header on requests which enter its edge. `x-forwarded-for`, `x-real-ip`, and `true-client-ip` are ignored. A missing or comma-separated value uses the one shared bucket `unknown`. Once a bucket is over 20, further calls return limited without incrementing the global bucket.

Supabase Auth does not use this header for its own limits, and Supabase does not document it as an edge-function contract. The trustworthy case is the public `supabase.co` URL. A path that reached the isolate without Cloudflare could still present its own `cf-connecting-ip` and open another 20-attempt bucket. That does not create an account. The global cap and the single-use code remain. The worker speech proxy is separate: it reads `cf-connecting-ip` on the Wondii Cloudflare Worker and signs it.

## Emergency switch

The resting state after the migration is both flags false. This does not delete saved content.

Deny child access, including during the test if launch is not approved:

```sql
update private.child_access_control
set pairing_enabled = false,
    content_enabled = false,
    updated_at = now()
where singleton;
```

`create_child_pairing` raises `pairing_unavailable` and does not mint a code. `consume_child_pairing` returns `unavailable` before it marks a ticket used. `child_content_access` returns `allowed: false` before the device check. Library RPCs then refuse. `session_child_folder()` returns null, so a direct request to `storage.objects` in `child_library` fails the child policies even when the caller still holds a child access token. Shelves, books, characters, device rows, and objects stay. A parent can still open a folder they own, because parent policies use the family id rather than the child-content flag.

Then set `CHILD_PAIRING_ENABLED` to `0` and redeploy `child-pair` if that function has been deployed. The function returns 503 before `createUser` when the value is not exactly `1`. The SQL update is the immediate control if an isolate still has the old value.

Reverse the switch later without deleting rows:

```sql
update private.child_access_control
set pairing_enabled = true,
    content_enabled = true,
    updated_at = now()
where singleton;
```

Set `CHILD_PAIRING_ENABLED` back to `1` and redeploy `child-pair` only when pairing should accept codes again.

## Service worker rollout

Cache name `jigsaw-kids-v458`. Install skips waiting. Activate deletes every other cache name, claims clients, and reloads open portal, school learn, game, and child pages. Successful network responses are not written back into the cache. Requests to Supabase storage, including `child_library`, are not handled by the service worker. That stops the service worker from replaying a stored body. It does not stop Supabase Smart CDN. Child library uploads send a raw `Cache-Control: private, no-store` header. The JavaScript `cacheControl` option is a multipart field, and Storage rewrites that field to `max-age=<value>`, which is then served as a public response Cloudflare can store. Updating `storage.objects` directly does not emit the storage event that invalidates Smart CDN. An already cached private image stays reachable on the same URL until the object is replaced through the Storage API or purged with the secret-key cache purge. Both can take up to 60 seconds, and neither clears a browser cache. Those navigations, plus `wondii-session.js`, `score-cloud.js`, `kids-core.js`, `family.js`, `child-join.js`, `child-library.js`, and `portal.js`, use a reload request so an old HTTP cache copy is not mixed in.

Personal, school, and anonymous sessions keep the same `wondii-u:{uid}:` storage keys and the same Supabase session in `js/wondii-session.js`. Anonymous score writes stay no-ops until a session is bound. A page that is not in the reload list keeps the scripts already in memory until the next navigation. Offline fallback can serve the new precache only after activate; until one successful load, a failed network falls back to `portal.html`.

## Preview

`www.wondii.co.uk` is unchanged by a branch preview. The Families dashboard and `child.html` call family or pairing RPCs only on `wondii.co.uk`, `www.wondii.co.uk`, `localhost`, or `127.0.0.1`. A `workers.dev` preview shows that family setup and pairing are off, including after this branch is pushed and Cloudflare builds a preview alias. `child-pair` stays undeployed until the window below, so a pairing code cannot create a child auth user.

## Order

Two separate approvals. Phase A publishes the site with pairing left off. Phase B is the only time pairing is enabled, and only for the controlled test. Stop on the first failed check. The expected commit is the one that last changed this file:

```bash
git log -1 --format=%H -- docs/families/controlled-release.md
```

Use that SHA only. Do not merge to `main`.

### Phase A — public rollout, pairing stays off

Do not set `CHILD_PAIRING_ENABLED`. Do not deploy `child-pair`.

1. **Confirm hosted state.** `20261008170000`, `20261008180000`, and `20261008210000` are recorded. No `wondii-sec-%` users. No family, child-profile, or child-device rows. `child_library` does not exist. `child-pair` is not deployed. `SPEECH_QUOTA_SECRET` and `CHILD_PAIRING_ENABLED` are absent.
2. **Apply SQL in filename order only:**
   - `20261008220000_child_home.sql`
   - `20261008230000_child_library.sql`
   - `20261008240000_child_artwork.sql`
   - `20261008250000_child_access_switch.sql`
3. **Record** those four versions. Read `private.child_access_control`. Stop unless `pairing_enabled` and `content_enabled` are both false.
4. **Secrets, before any function or worker publish.** List names only.
   - Generate one `SPEECH_QUOTA_SECRET` outside the repo.
   - Set it on the `clever-service` function secrets.
   - Set the same value as a Worker secret (`npx wrangler secret put SPEECH_QUOTA_SECRET`).
   - Leave `CHILD_PAIRING_ENABLED` unset.
   - Leave `OPENAI_API_KEY` and the Supabase service role where they already are. Do not put the service role in the website. Do not print any secret value.
5. **Deploy `clever-service`:** `supabase functions deploy clever-service --no-verify-jwt` from this SHA. The branch function returns 503 for speech when `SPEECH_QUOTA_SECRET` is empty. Do this before the worker.
6. **Publish the website and worker together** with `npx wrangler deploy` from this SHA. Do not merge to `main`. Service worker cache is `jigsaw-kids-v458`.
7. **Adult and public checks, before any pairing.** Use an existing personal account, an existing school account, a signed-out browser, and one adult storybook:
   - Personal books and characters still open.
   - School classes still open. School pictures stay in `characters_room`.
   - A signed-out game still plays, and its score is not written to another account.
   - A signed-out visitor can still start a storybook.
   - Read to me still plays for an adult.
   - `child-pair` is still absent. A pairing code, if one is minted, cannot create a child auth user.
8. Stop. Do not announce child login. Phase A can remain the live site with pairing off.

The Family screen is on the site after step 6. A signed-in parent can create a family profile because those RPCs are already applied. That creates a record, not a child login. Redeeming a code stays closed while the switch and `child-pair` are off.

### Phase B — controlled pairing test

Start this only after Phase A checks pass, and only with a fresh approval. Use two temporary parent accounts created for this test, not existing customer accounts. Give them two child profiles.

1. Run the reverse SQL in **Emergency switch**, the update that sets `pairing_enabled` and `content_enabled` to true. This does not delete anything.
2. Set `CHILD_PAIRING_ENABLED` to `1`, then `supabase functions deploy child-pair --no-verify-jwt` from this same SHA. This is the moment a pairing code can create a child auth user. Do it immediately before the test, not during Phase A.
3. Run **Controlled pairing test**.
4. If public launch is not approved, disable pairing before ending the session:
   - Run the deny SQL in **Emergency switch**. Both flags return to false. Existing test sessions lose library RPCs and direct `child_library` reads. Saved rows and files stay.
   - Set `CHILD_PAIRING_ENABLED` to `0` and redeploy `child-pair`, or undeploy it. New codes cannot create users even if an isolate still has the old env, because the SQL flag is already false.
   - Leave the temporary parents, profiles, and files in place until a separate cleanup is approved. Do not delete them as part of the disable.
5. Public launch is a later decision. It requires both flags true and `CHILD_PAIRING_ENABLED=1` again, after the test results are accepted. Do not leave the flags true overnight while that decision is open.

Personal and school portals use the same `portal.html` and the same storage buckets. Families adds a Family view and does not replace those policies. School character storage stays on `characters_room`.

## Controlled pairing test

Run only in Phase B, with two temporary parents (A and B) and two children (A1 and A2 on parent A). Set each child to 1 book and 1 character per London day.

1. A1 joins with a pairing code. Home shows A1’s name only.
2. A1 creates one book. The cover and pages reopen from My Books and from Continue reading. The picture requests use the child session, not a public URL.
3. A second book for A1 on the same London day is refused by the generator, not only by the button.
4. A1 creates one character. It appears on My Characters and can be chosen as the reference for a book. That book still counts against the allowance.
5. Parent A shares one of their own books and one character. They appear for A1 and open with pictures. A2 does not see them.
6. Parent B cannot open A1’s books, characters, or storage objects. A1 cannot open B’s family.
7. A direct `child_library` request without A1’s session does not load. With A1’s session it loads. After the deny SQL, the same request with A1’s still-valid token does not load, and the object is still in the bucket.
8. Parent A revokes A1’s device. Refresh returns to the code screen and cannot open A1’s books. A2 can still join.
9. Parent A suspends A2. A new code for A2 is refused. Restoring A2 does not delete the profile.
10. Turn the switch and `CHILD_PAIRING_ENABLED` back off if launch is not approved. Confirm a new code cannot create a user, and A1’s old token still cannot read `child_library`.

## Rollback

Stop forward work. Do not drop Families tables if any child has saved a book or character.

1. Republish the previous website and worker (the current live account-menu release). Read to me on that worker does not need `SPEECH_QUOTA_SECRET`.
2. Redeploy the previous `clever-service` (live version 248 at the time of this review). Adults and the public storybook return to today’s behaviour. Child claims simply stop being called.
3. Run the deny SQL in **Emergency switch**, then set `CHILD_PAIRING_ENABLED` to `0` and redeploy or undeploy `child-pair`. New pairing stops. Existing child sessions lose protected library and storage access. Saved rows and files stay.
4. Leave `20261008220000` through `20261008250000` in place if any private files were written. They are unused by the previous website. Dropping `child_library` deletes those pictures.
5. The earlier family, device, and pairing tables stay. They are already live and the purge job should keep running.

## Go / no-go

Go only when every line below is true. Otherwise stop.

- The SHA from `git log -1 --format=%H -- docs/families/controlled-release.md` is the SHA in the release report, and `origin/main` is still the pre-Families commit.
- Hosted migration history matches **Already on the hosted database**. The four pending files are not yet recorded.
- Phase A secret names include `SPEECH_QUOTA_SECRET` on `clever-service` and on the worker before those deploys. `CHILD_PAIRING_ENABLED` stays unset and `child-pair` stays undeployed.
- Phase A commands, from `/tmp/wondii-families` at that SHA: apply the four SQL files in order, confirm both switch flags are false, `supabase functions deploy clever-service --no-verify-jwt`, `npx wrangler deploy`.
- Phase A hosted checks are the adult and public checks in step 7. `FAMILY_LIVE=1` stays unset. No `wondii-sec-%` users.
- Phase B starts only after a second approval. Pairing is enabled only at Phase B steps 1 and 2, and returns to disabled at step 4 unless launch is approved in the same session.
- Rollback is the five steps above. Stop if a migration errors, either switch flag is true after Phase A SQL, a secret name is missing, `clever-service` deploy fails, Read to me fails for an adult, an adult storage policy changes, personal or school data is unreadable, `child-pair` is deployed during Phase A, or the test cannot be closed by the deny SQL.

## After this window

Families stops here. Next product work is the permanent twelve Wondii Crew characters, then the main portal homepage and Your Wondii World.
