/* Child sessions stay blocked. QR login is not enabled. */
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var root = path.join(__dirname, "..");
var sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008180000_job_keys_and_child_guards.sql"), "utf8");
var familyJs = fs.readFileSync(path.join(root, "js/family.js"), "utf8");
var portalJs = fs.readFileSync(path.join(root, "portal.js"), "utf8");

function fnBody(name) {
  var start = sql.indexOf("create or replace function " + name);
  assert.ok(start >= 0, name);
  var end = sql.indexOf("create or replace function ", start + 10);
  if (end < 0) end = sql.length;
  return sql.slice(start, end);
}

[
  "public.create_organisation(p_name text, p_short_name text, p_primary_colour text, p_website text)",
  "public.create_organisation_invite(p_org uuid, p_email text, p_role text)",
  "public.accept_organisation_invite(p_token text)",
  "public.set_organisation_member_role(p_member uuid, p_role text)",
  "public.remove_organisation_member(p_member uuid)",
  "public.revoke_organisation_invite(p_invite uuid)",
  "public.school_join_lookup(p_code text)",
  "public.school_join(p_code text, p_name text)",
  "public.school_join_answer(p_code text, p_participant uuid, p_choice text)",
  "public.family_snapshot()",
  "public.start_family(p_display_name text)",
  "public.save_child_profile(",
  "public.set_child_status(p_id uuid, p_status text)",
  "public.request_child_deletion(p_id uuid)",
  "public.restore_child_profile(p_id uuid)",
  "public.export_child_profile(p_id uuid)",
  "public.revoke_child_device(p_device uuid)"
].forEach(function (name) {
  assert.ok(fnBody(name).indexOf("perform private.reject_child();") >= 0, name);
});

assert.ok(fnBody("private.org_role(org uuid)").indexOf("not private.is_child()") >= 0);
assert.ok(fnBody("public.child_content_access()").indexOf("device_revoked") >= 0);
assert.ok(fnBody("public.child_content_access()").indexOf("revoked_at is not null") >= 0);
assert.strictEqual(fnBody("public.child_content_access()").indexOf("reject_child"), -1);

var pause = fnBody("public.set_child_status(p_id uuid, p_status text)");
assert.ok(pause.indexOf("p_status not in ('active', 'suspended')") >= 0);
assert.strictEqual(pause.indexOf("purge_after"), -1);
assert.ok(pause.indexOf("row.status = 'pending_deletion'") >= 0);
assert.ok(pause.indexOf("set status = p_status") >= 0);

var removal = fnBody("public.request_child_deletion(p_id uuid)");
assert.ok(removal.indexOf("interval '30 days'") >= 0);
assert.ok(removal.indexOf("row.status <> 'pending_deletion'") >= 0);

var restore = fnBody("public.restore_child_profile(p_id uuid)");
assert.ok(restore.indexOf("purge_after <= now()") >= 0);
assert.ok(restore.indexOf("deletion_requested_at = null") >= 0);

var exported = fnBody("public.export_child_profile(p_id uuid)");
assert.ok(exported.indexOf("child-library-v1") >= 0);
assert.ok(exported.indexOf("'books'") >= 0);
assert.ok(exported.indexOf("'characters'") >= 0);

assert.ok(sql.indexOf("purge-expired-child-profiles") >= 0);
assert.ok(sql.indexOf("'15 1 * * *'") >= 0);
assert.ok(sql.indexOf("private.purge_expired_child_profiles()") >= 0);
assert.ok(sql.indexOf("access_key_hash") >= 0);
assert.ok(sql.indexOf("create table public.child_devices") >= 0);
assert.ok(sql.indexOf("revoke all on public.child_devices from public, anon, authenticated") >= 0);
assert.ok(sql.indexOf('create policy "characters_room_select_own"') >= 0);
assert.ok(sql.indexOf("and not private.is_child()") >= 0);
[
  "characters_room",
  "storybook_room",
  "colouring_room",
  "score_bundles"
].forEach(function (name) {
  assert.ok(sql.indexOf(name) >= 0, name);
});

assert.strictEqual(familyJs.indexOf("createClient"), -1);
assert.strictEqual(familyJs.indexOf("generate_link"), -1);
assert.strictEqual(portalJs.indexOf("createClient"), -1);
assert.ok(portalJs.indexOf("KidsScoreCloud.signOut") >= 0);

console.log("child-guards tests ok");
