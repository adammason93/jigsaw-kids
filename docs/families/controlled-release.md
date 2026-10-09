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
- Edge function `child-pair` (source only; `verify_jwt = false` in `supabase/config.toml`)
- Branch `clever-service` (daily claim on book and character generation)
- Branch worker (`workers-site/index.ts` speech signature)
- Branch website (Family Dashboard, `child.html`, private library scripts, service worker `jigsaw-kids-v456`)

`SPEECH_QUOTA_SECRET` is not set. Do not invent a value in the repo.

## What the branch already does

- A child book is stored as shelf JSON in `private.child_shelves`. Page pictures and `cover.jpg` go in the private `child_library` bucket under `{childId}/books/{bookId}/`. The shelf keeps `wondii-private:` markers. Reopening downloads those objects with the child session and never uses a public or signed URL.
- A parent share copies the grown-up’s book or character into `{childId}/shared/{shareId}/`. The child can read that folder only while the share row exists. Unshare deletes the row and the copied files. Adult `storybook_room` and `characters_room` policies are unchanged.
- A saved child character PNG is `{childId}/characters/{id}.png`. The storybook “saved characters” picker loads that private picture and sends it as the book reference.
- Book and character generation call `claim_child_generation` before the paid work when the bearer is a child session. The same key is refunded if generation fails. Signed-out visitors and adult sessions are unchanged.

## Release blocker that stays open on purpose

A caller who sends only the public anon key is not a child session, so book and character generation stay on the public storybook path and are not allowance-gated. Closing that means requiring a signed-in session for every generation, which changes the public site. Do not do that in this release.

A paired child who is signed in is gated. The browser sends that child’s access token and a reserved `creationKey`.

## Order

Do these in one approved window. Stop on the first failed check.

1. **Confirm hosted state.** The three applied migrations above are present. No `wondii-sec-%` test users remain. `child_library` bucket does not exist yet.
2. **Apply SQL in filename order only:**
   - `20261008220000_child_home.sql`
   - `20261008230000_child_library.sql` (replaces `child_home()` with the real library)
   - `20261008240000_child_artwork.sql` (private bucket, claims, storage policies)
3. **Record** those three versions the same way the earlier Families migrations were recorded.
4. **Secrets, before any function or worker publish.**
   - Generate one `SPEECH_QUOTA_SECRET` outside the repo.
   - Set it on the `clever-service` function secrets.
   - Set the same value as a Worker secret (`wrangler secret put SPEECH_QUOTA_SECRET`).
   - Leave `OPENAI_API_KEY` and the Supabase service role where they already are. Do not put the service role in the website.
5. **Deploy `clever-service`:** `supabase functions deploy clever-service --no-verify-jwt` from this branch. Do this before the worker so Read to me keeps a function that understands the speech signature.
6. **Deploy `child-pair`:** `supabase functions deploy child-pair --no-verify-jwt`. This is the public child-login switch. The function creates the child auth user with the service role. Deploy it only in this window, after step 2.
7. **Publish the website and worker together** with `npx wrangler deploy` from this commit. Do not merge to `main` for this step. The worker refuses Read to me when `SPEECH_QUOTA_SECRET` is empty, so step 4 must already be done. Service worker cache is `jigsaw-kids-v456`, and game, child, and account scripts are reloaded from the network.
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
2. Redeploy the previous `clever-service`. Adults and the public storybook return to today’s behaviour. Child claims simply stop being called.
3. Undeploy or disable `child-pair`. New devices can no longer join. Existing child sessions keep working until their devices are revoked from the dashboard, or until the parent suspends the profile.
4. Leave `20261008220000`, `20261008230000`, and `20261008240000` in place if any private files were written. They are unused by the previous website. Dropping `child_library` deletes those pictures.
5. The earlier family, device, and pairing tables stay. They are already live and the purge job should keep running.

## After this window

Families stops here. Next product work is the permanent twelve Wondii Crew characters, then the main portal homepage and Your Wondii World.
