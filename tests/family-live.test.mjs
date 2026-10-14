/* Hosted check of the applied family functions. Skips unless FAMILY_LIVE=1.
   Creates two temporary parents, then deletes them. Does not apply migrations. */
import assert from "node:assert";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.FAMILY_LIVE !== "1") {
  console.log("family-live skipped");
  process.exit(0);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = fs.readFileSync(path.join(root, "js/score-config.js"), "utf8");
const url = config.match(/supabaseUrl:\s*"([^"]+)"/)[1];
const anon = config.match(/supabaseAnonKey:\s*"([^"]+)"/)[1];
const ref = "enuzrcjnrxwglacivlnu";
const token = execSync('security find-generic-password -s "Supabase CLI" -a "supabase" -w', { encoding: "utf8" }).trim();
const keysRes = await fetch("https://api.supabase.com/v1/projects/" + ref + "/api-keys", {
  headers: { Authorization: "Bearer " + token }
});
assert.strictEqual(keysRes.status, 200);
const keys = await keysRes.json();
const service = keys.find(function (item) { return item.name === "service_role"; }).api_key;
const stamp = crypto.randomBytes(4).toString("hex");
const created = [];

function password() {
  return crypto.randomBytes(18).toString("base64url");
}

async function createUser(label) {
  const email = "wondii-family-live-" + label + "-" + stamp + "@example.com";
  const secret = password();
  const res = await fetch(url + "/auth/v1/admin/users", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + service,
      apikey: service,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: email, password: secret, email_confirm: true })
  });
  const body = await res.json();
  assert.ok(res.status === 200 || res.status === 201, "create " + label + " " + res.status);
  created.push(body.id);
  return { email: email, secret: secret, id: body.id };
}

async function signIn(user) {
  const res = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.secret })
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200, "sign in " + res.status);
  return body.access_token;
}

async function rpc(name, token, args) {
  const headers = { apikey: anon, "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(url + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(args || {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text.slice(0, 120) }; }
  return { status: res.status, data: data };
}

async function removeUsers() {
  for (const id of created) {
    await fetch(url + "/auth/v1/admin/users/" + id, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + service, apikey: service }
    });
  }
}

try {
  const migrations = await fetch("https://api.supabase.com/v1/projects/" + ref + "/database/query", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "select version from supabase_migrations.schema_migrations order by version" })
  });
  const applied = await migrations.json();
  const versions = applied.map(function (row) { return row.version; });
  assert.ok(versions.indexOf("20261008170000") >= 0);
  assert.strictEqual(versions.indexOf("20261008180000"), -1);

  const parent = await createUser("parent");
  const other = await createUser("other");
  const parentToken = await signIn(parent);
  const otherToken = await signIn(other);

  const anonStart = await rpc("start_family", "", { p_display_name: "Nobody" });
  assert.ok(anonStart.status === 401 || anonStart.status === 403);

  const started = await rpc("start_family", parentToken, { p_display_name: "Ada Parent" });
  assert.strictEqual(started.status, 200);
  assert.strictEqual(started.data.family.displayName, "Ada Parent");
  const familyId = started.data.family.id;

  const again = await rpc("start_family", parentToken, { p_display_name: "Ada Parent" });
  assert.strictEqual(again.data.family.id, familyId);

  const child = await rpc("save_child_profile", parentToken, {
    p_id: null,
    p_nickname: "Pip",
    p_avatar: "wondii-sofia",
    p_age_band: "4-6",
    p_books: 3,
    p_characters: 2,
    p_games: true
  });
  assert.strictEqual(child.status, 200);
  assert.strictEqual(child.data.children.length, 1);
  const childId = child.data.children[0].id;
  assert.strictEqual(child.data.children[0].nickname, "Pip");

  const stranger = await rpc("family_snapshot", otherToken, {});
  assert.strictEqual(stranger.status, 200);
  assert.strictEqual(stranger.data.family, null);
  const strangerWrite = await rpc("save_child_profile", otherToken, {
    p_id: childId,
    p_nickname: "Stolen",
    p_avatar: "wondii-leo",
    p_age_band: "7-9",
    p_books: 1,
    p_characters: 1,
    p_games: false
  });
  assert.ok(strangerWrite.status >= 400);

  const table = await fetch(url + "/rest/v1/child_profiles?select=id", {
    headers: { apikey: anon, Authorization: "Bearer " + parentToken }
  });
  const tableBody = await table.text();
  let rows = null;
  try { rows = JSON.parse(tableBody); } catch (e) { rows = null; }
  assert.ok(table.status === 401 || table.status === 403 || (Array.isArray(rows) && rows.length === 0));

  const paused = await rpc("set_child_status", parentToken, { p_id: childId, p_status: "suspended" });
  assert.strictEqual(paused.data.children[0].status, "suspended");
  const resumed = await rpc("set_child_status", parentToken, { p_id: childId, p_status: "active" });
  assert.strictEqual(resumed.data.children[0].status, "active");

  const removed = await rpc("request_child_deletion", parentToken, { p_id: childId });
  const firstPurge = removed.data.children[0].purgeAfter;
  assert.strictEqual(removed.data.children[0].status, "pending_deletion");
  const purgeMs = new Date(firstPurge).getTime() - Date.now();
  assert.ok(purgeMs > 29 * 24 * 60 * 60 * 1000);
  assert.ok(purgeMs < 31 * 24 * 60 * 60 * 1000);
  await new Promise(function (resolve) { setTimeout(resolve, 1100); });
  const removedAgain = await rpc("request_child_deletion", parentToken, { p_id: childId });
  assert.strictEqual(removedAgain.data.children[0].purgeAfter, firstPurge);

  const exported = await rpc("export_child_profile", parentToken, { p_id: childId });
  assert.strictEqual(exported.data.profile.nickname, "Pip");
  assert.ok(exported.data.note.indexOf("not part of a child profile yet") >= 0);

  const restored = await rpc("restore_child_profile", parentToken, { p_id: childId });
  assert.strictEqual(restored.data.children[0].status, "active");
  assert.strictEqual(restored.data.children[0].purgeAfter, null);

  const seen = await rpc("family_snapshot", parentToken, {});
  assert.strictEqual(seen.data.children[0].nickname, "Pip");
  console.log("family-live tests ok");
} finally {
  await removeUsers();
}
