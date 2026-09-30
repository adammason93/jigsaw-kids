# Phase 1 — Persistent school domain

Recorded 30 September 2026. Phase 2 has not started.

The live database is the shared Supabase project `enuzrcjnrxwglacivlnu` (name: Morris and Son). Discovery was read-only. The school tables added afterwards are new. Morris and Son offer tables were not altered.

## Schema before

Public Wondii tables that already existed:

| Table | Ownership |
| --- | --- |
| `organisations` | A school. `type` is constrained to `school`. |
| `organisation_members` | `user_id` → `auth.users`. Roles: `owner`, `school_admin`, `teacher`, `staff`. One user can have a row in more than one organisation (`unique (organisation_id, user_id)`). |
| `organisation_invites` | Invite email and role. Token stored as a hash. |
| `organisation_story_starters` | Organisation-owned. |
| `organisation_navigation` | Organisation-owned. |
| `score_bundles` | One jsonb payload per `user_id`. RLS: `auth.uid() = user_id`. |
| `storybook_generation_jobs` | RLS enabled, no policies, so the Data API denies anon and authenticated. The edge function uses the service role. No `user_id` column. |

There was no class, pupil, adventure, session, or result table.

Remote migration history already contained `organisations` (`20260929081430`) and `fix_organisation_navigation_href` (`20260929082457`). The local files `20260929100000_organisations.sql` and `20260929110000_fix_organisation_navigation_href.sql` match those objects. They were not inferred from filenames only. The tables, columns, policies, and `private` RPCs were present.

Storage buckets relevant to Wondii: `characters_room`, `colouring_room`, `storybook_room`, `storybook_images`, `organisation_branding`. Character, colouring, and storybook-room policies are named `*_own`. `storybook_images_public_select` allows public read of generated images.

`private` functions already present: `org_role`, `is_org_member`, `is_org_admin`, `create_organisation`, invites, and member role changes. Public wrappers call those.

## Auth

Teachers and families use the same Supabase Auth password session (`js/score-cloud.js`, `signInWithPassword`). There is no second auth system.

A family account is an `auth.users` row with no organisation membership. A teacher is the same kind of user plus an `organisation_members` row. `js/organisation.js` loads that membership and exposes `organisationId` and `role`.

`user_metadata` is not used for authorisation.

## Ownership before this phase

| Object | Where it lived | Owner |
| --- | --- | --- |
| Family scores | `score_bundles` and account-scoped local keys | USER OWNED |
| Family character | `characters_room` path under the auth user id | USER OWNED |
| Story / book shelf | `jigsawKids_storybookShelf_v1`, account-scoped when `score-cloud.js` is loaded | USER OWNED in the browser; cloud copy follows that account |
| Story job row | `storybook_generation_jobs` | NO CLIENT ACCESS. Service role writes it. No user column. |
| Generated story images | `storybook_images` | PUBLIC READ policy. Paths were not re-audited for guessability. |
| Organisation, nav, starters | Database | ORGANISATION OWNED |
| Class, pupil, adventure, session | `wondii-school-classes`, `wondii-learning-adventures`, `wondii-class-sessions` | BROWSER STORAGE, account-scoped only on pages that load `score-cloud.js` |
| Results | `session.responses` inside that browser session | BROWSER STORAGE |
| Pupil character | Hair, eyes, presentation, and a portrait file name derived from those fields | BROWSER STORAGE. Not a new generated character per screen. |

`join.html` does not load `score-cloud.js`, so it still uses raw `localStorage` for `wondii-class-sessions`.

## Cross-account findings

More than one cause:

1. **Shared localStorage.** Before `js/score-cloud.js` wrapped account keys, stories, scores, classes, and adventures used one browser key for every login. That is the Sofia-content leak. The wrapper now returns null for those keys when nobody is signed in, and stores them under `wondii-u:{userId}:{key}` when someone is. This phase did not weaken that.

2. **Sofia is not a database child.** The name appears as a suggested-girl example, as the family login email in `js/score-config.js`, and as old game-art labels. It is not inserted as a pupil for other accounts. A name list that includes Sofia only suggests presentation. It does not create a pupil.

3. **Join page.** Unsigned raw `localStorage` on `join.html` can still see or write `wondii-class-sessions` outside the account scope.

4. **Public story images.** `storybook_images_public_select` is a public read. That is separate from the account-switch bug. Not changed here.

5. **Story jobs have no owner column.** RLS with zero policies blocks the Data API. It does not record which user a job belongs to.

6. **Demo explorers.** `addDemoClass` creates “Explorer N” participants with `demo: true`. Those are labelled demo. This phase does not store them as pupil results.

No query in the new school tables selects every row and filters only in the browser. Policies use `private.is_org_member` and `private.can_teach`.

## Schema after

New tables, all with `organisation_id` and RLS:

| Table | Role |
| --- | --- |
| `school_classes` | Class name and year label. |
| `school_pupils` | Display name, presentation (`girl`, `boy`, or empty), `look` jsonb (`hair`, `length`, `eyes`, `wave` only via the client), seat. |
| `school_adventures` | Organisation-owned. `class_id` is optional and `on delete set null`, so an adventure can be reused. `config` jsonb keeps the creator document. |
| `school_sessions` | One row per play. Unique `(organisation_id, code)`. Not unique on adventure, so Monday and Wednesday stay separate. `snapshot` jsonb is the play copy the current presenter still needs. |
| `school_teams` | Team name and points for a session. |
| `school_participants` | Optional `pupil_id`. |
| `school_events` | `scope` is `class`, `team`, or `pupil`. A pupil scope requires `pupil_id`. A class scope cannot carry a pupil or team id. |

`private.can_teach(org)` is true for `owner`, `school_admin`, and `teacher`. `staff` can read through `is_org_member` and cannot write.

Child rows must use the parent row’s organisation. A pupil insert fails the policy if `organisation_id` does not match the class.

Anon has no grants.

Applied remotely as migration name `school_domain`. The repo copy is `supabase/migrations/20260930120000_school_domain.sql`. `school_classes` was empty immediately after apply. Offer order rows were not modified.

Rollback: `drop table` the seven `school_*` tables and `drop function private.can_teach(uuid)`. That does not touch organisations or family tables. Do not run it while real classes are stored.

## Local storage

Authoritative when a teacher is signed in and belongs to an organisation:

- `wondii-school-classes`
- `wondii-learning-adventures`
- `wondii-class-sessions`

`js/school-store.js` loads those from the database. If the organisation has no classes yet and the browser has a class book, it rewrites prototype ids to uuids once and inserts them. After that, saves upsert. Pupil removal deletes only pupils missing from a class that was loaded from the database. Classes are not deleted just because they are absent from a partial book.

Still browser-only, on purpose:

- `wondii-learning-draft` — unsaved creator draft
- `wondii-teach-prefs`, `wondii-teach-favs`, `wondii-teach-recent`, `wondii-teach-feedback`, `wondii-teach-seen`
- `wondii-board-names`

`join.html` was not switched onto this store. A pupil device must not import a teacher’s browser book into a school.

## Access layer

`js/school-domain.js` is pure (ids, pupil rows, event scope). `js/school-store.js` is the only new Supabase caller for school classes, adventures, and sessions. Pages call `WondiiSchoolData.syncClasses`, `syncAdventures`, and `syncSessions` from the existing save functions.

## Tests

`node tests/school-ownership.test.js` passed.

It checks two schools get different organisation, class, and pupil ids; a demo response creates no event; an unknown participant is a class event, not a pupil event; two sessions of one adventure keep different ids; the migration enables RLS and does not alter `score_bundles` or offer tables.

Not run: two real logins in the browser. No second teacher password was available, and creating test users on the shared production project was avoided. Refresh-and-return therefore is not visually signed off.

## Risks at the end of the first implementation

These were open before Phase 1.5. The close-out below records which ones are done.

- Join still uses unscoped `localStorage`.
- A failed upsert followed by a later page load can drop a class that never reached the database.
- `snapshot` still duplicates the play state until Phase 4.
- `storybook_images` public read and story jobs without `user_id` are unchanged.
- Staff can read pupils. That is the current role. There is no finer permission.
- The working tree on `wondii-restructure-2026-09-30` includes this phase and is not committed.

## Phase 1.5

Phase 2 has not started.

### Join

`schools/learn/join.html` no longer loads `session.js` and no longer reads `wondii-class-sessions`. A pupil does not need a Wondii account. The page calls `public.school_join_lookup`, `public.school_join`, and `public.school_join_answer`. The organisation id is taken from the session row inside the database function. The browser does not send one.

A waiting session accepts a first name. The name stored is the first word, letters only, or "Explorer". That insert is a `school_participants` row with `pupil_id` null. An answer is a `school_events` row with `scope` `class`, `participant_id` set, and `pupil_id` null. It is not a pupil result.

The presenter still plays from its own session snapshot. It does not yet subscribe to those participant and event rows. A later phase has to show them on the class screen.

### Session codes

New codes are 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, shown as `XXXX-XXXX`. `crypto.getRandomValues` fills them. `upper(code)` is unique across schools, in addition to `(organisation_id, code)`.

Lookup requires `^[A-Z2-9-]{4,12}$` and one exact match. A bad code and a missing code both return null. The payload is code, title, status, phase, slide, reveal, group count, and the current question prompt and choice text. It does not include the organisation, class, pupils, other sessions, responses, or the correct choice. The explanation is included only after reveal.

The public functions are `security definer` and are the only school entry point granted to `anon`. `anon` has no `select` on the school tables, no `usage` on `private`, and no execute on the private join functions. Existing RLS policies were not opened up.

### Save failure and sync

A class, adventure, or session save writes a pending browser copy first (`wondii-school-pending`, `wondii-school-pending-adventures`, `wondii-school-pending-sessions`). Those keys are account-scoped in `js/score-cloud.js`.

States used internally are saving, saved, and failed. A failed write keeps the pending copy, shows one line that the school save did not finish, and `beforeunload` asks before a reload. The next load merges pending rows that are missing from the database and tries the write again. Pupil deletes run only after the class upsert has succeeded.

There is no offline sync queue beyond those three pending keys.

### Relationship checks

`private.school_enforce_links()` runs before insert or update on pupils, adventures, sessions, teams, participants, and events. It rejects a pupil whose organisation does not match the class, a session or adventure whose class or adventure is in another organisation, a team from another session, a participant pupil from another organisation or another class, and an event whose pupil, team, class, adventure, or participant does not belong to that session. Policies still require `can_teach` for ordinary writes. The triggers also apply to the join functions.

Applied remotely as migration name `school_join_guard`. The repo copy is `supabase/migrations/20260930140000_school_join_guard.sql`. `school_domain` was already applied. Both are on `enuzrcjnrxwglacivlnu`. Smoke rows were deleted afterwards. School class, pupil, session, adventure, event, and participant counts were 0 after cleanup.

### Runtime smoke

No new auth user was created. The existing active organisation member was used from SQL, not from a browser login.

Passed against the database:

- Class and pupil inserted, then read back by id.
- A pupil organisation that does not match the class is rejected.
- A session class that does not match the organisation is rejected.
- A participant pupil from another class is rejected.
- Two sessions of one adventure have different ids.
- Join lookup for `SMOK-AAAA` returned only the join fields, with the question prompt and without the correct answer.
- Join stored the first name. The answer event was `scope` `class` and `pupil_id` null.
- With the member's auth id in the request claims, that role could select the class. A different auth id selected 0 rows.
- `anon` cannot select the school tables.

Not run: the teacher screens in a browser. No password was used, and a second login was not created. The pending-save banner was covered by `mergeBooks` in `node tests/school-ownership.test.js`, not by a forced failed network call in the browser.

### Tests

`node tests/school-ownership.test.js` passed after Phase 1.5. It also checks pending classes survive a merge, two sessions stay distinct, classroom codes use the unambiguous alphabet, and the join migration does not grant `anon` select on `school_classes` or usage on `private`.

### Story security — still open

Not changed, and not treated as done:

- `storybook_images_public_select` allows public read of generated images.
- `storybook_generation_jobs` has no `user_id`. RLS with no policies blocks the Data API. The service role writes the rows.

### Remaining risks after Phase 1.5

- The class screen does not yet show joiners or their answers. Those rows exist on the session.
- `snapshot` still duplicates play state until Phase 4.
- Join codes are not rate limited. They are single-use lookups, not a list API.
- Answers are only A, B, or C.
- Staff can still read pupils. There is no finer permission.
- Story image public read and story jobs without `user_id` remain later security work.
- The signed-in teacher path was not clicked through in a browser.

Implementation commit: recorded in the following documentation commit once the hash exists.

## Files

- `supabase/migrations/20260930120000_school_domain.sql`
- `js/school-domain.js`
- `js/school-store.js`
- `tests/school-ownership.test.js`
- `schools/learn/home.js`, `class-room.js`, `flow.js`, `model.js`, `session.js`
- `portal.html`, `schools/learn/class.html`, `create.html`, `present.html`
- `docs/WONDII_DESIGN_DEBT.md`, `docs/WONDII_VISUAL_SURFACE_REGISTRY.md` (pointers only; visual rows not reclassified)
