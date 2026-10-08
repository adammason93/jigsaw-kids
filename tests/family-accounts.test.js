/* Phase 1 family accounts: parent records, not child logins. */
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var root = path.join(__dirname, "..");
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

var sql = read("supabase/migrations/20261008170000_families.sql");
var family = read("js/family.js");
var portal = read("portal.html");
var gate = read("portal-gate.js");
var cloud = read("js/score-cloud.js");
var org = read("js/organisation.js");

assert.ok(sql.indexOf("create table public.families") >= 0);
assert.ok(sql.indexOf("create table public.child_profiles") >= 0);
assert.ok(sql.indexOf("interval '30 days'") >= 0);
assert.ok(sql.indexOf("pending_deletion") >= 0);
assert.ok(sql.indexOf("enable row level security") >= 0);
assert.ok(sql.indexOf("revoke all on public.child_profiles from public, anon, authenticated") >= 0);
assert.strictEqual(sql.indexOf("create policy"), -1);
assert.ok(sql.indexOf("grant execute on function public.start_family(text) to authenticated") >= 0);
assert.ok(sql.indexOf("revoke all on function public.start_family(text) from public, anon, authenticated") >= 0);
assert.ok(sql.indexOf("auth.uid()") >= 0);
assert.strictEqual(sql.indexOf("create table public.credit_"), -1);
assert.ok(sql.indexOf("between 0 and 10") >= 0);

assert.strictEqual(family.indexOf("createClient"), -1);
assert.ok(family.indexOf("WondiiSession.client") >= 0);
assert.ok(family.indexOf("request_child_deletion") >= 0);
assert.ok(family.indexOf("restore_child_profile") >= 0);
assert.ok(family.indexOf("export_child_profile") >= 0);
assert.ok(family.indexOf("30 days") >= 0);

assert.ok(portal.indexOf('id="gateParentName"') >= 0);
assert.ok(portal.indexOf('data-view="family"') >= 0);
assert.ok(portal.indexOf("My Family") >= 0);
assert.ok(gate.indexOf("displayName") >= 0);
assert.ok(gate.indexOf("Enter your name.") >= 0);
assert.ok(cloud.indexOf("full_name: displayName") >= 0);
assert.ok(org.indexOf('raw.intent === "school"') >= 0);
assert.ok(read("portal.js").indexOf('"family"') >= 0);
assert.strictEqual(read("portal.js").indexOf("createClient"), -1);

console.log("family-accounts tests ok");
