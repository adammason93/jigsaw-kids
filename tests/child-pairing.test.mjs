import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  childDeviceEmail,
  deviceAccessDecision,
  pairingCodeIsShape,
  ticketDecision,
} from "../supabase/functions/child-pair/pairing.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008210000_child_pairing.sql"), "utf8");
const fn = fs.readFileSync(path.join(root, "supabase/functions/child-pair/index.ts"), "utf8");
const join = fs.readFileSync(path.join(root, "js/child-join.js"), "utf8");
const family = fs.readFileSync(path.join(root, "js/family.js"), "utf8");

assert.match(sql, /perform private\.reject_child\(\)/);
assert.match(sql, /for update/);
assert.match(sql, /interval '10 minutes'/);
assert.match(sql, /grant execute on function public\.consume_child_pairing\(text\) to service_role/);
assert.match(sql, /grant execute on function public\.register_child_device\(uuid, uuid\) to service_role/);
assert.equal(sql.includes("grant execute on function public.consume_child_pairing(text) to authenticated"), false);
assert.equal(sql.includes("grant execute on function public.register_child_device(uuid, uuid) to authenticated"), false);
assert.equal(sql.includes("create policy"), false);
assert.match(sql, /revoke all on private\.child_pairing_tickets from public, anon, authenticated/);

assert.equal(pairingCodeIsShape("AB23EFGH"), true);
assert.equal(pairingCodeIsShape("AB23EFG0"), false);
assert.equal(pairingCodeIsShape("short"), false);

const now = Date.parse("2026-10-08T18:00:00Z");
assert.deepEqual(ticketDecision(null, now), { allow: false, reason: "invalid" });
assert.deepEqual(
  ticketDecision({ redeemedAt: "2026-10-08T17:00:00Z", expiresAt: now + 1000, profileStatus: "active" }, now),
  { allow: false, reason: "invalid" }
);
assert.deepEqual(
  ticketDecision({ redeemedAt: null, expiresAt: now, profileStatus: "active" }, now),
  { allow: false, reason: "invalid" }
);
assert.deepEqual(
  ticketDecision({ redeemedAt: null, expiresAt: now + 1000, profileStatus: "suspended" }, now),
  { allow: false, reason: "profile_unavailable" }
);
assert.deepEqual(
  ticketDecision({ redeemedAt: null, expiresAt: now + 1000, profileStatus: "active" }, now),
  { allow: true, reason: "ready" }
);

assert.equal(deviceAccessDecision({ accountKind: "parent" }).allow, false);
assert.equal(deviceAccessDecision({ accountKind: "child", deviceId: "", profileStatus: "active" }).reason, "device_revoked");
assert.equal(deviceAccessDecision({
  accountKind: "child",
  deviceId: "d1",
  revokedAt: "2026-10-08T17:00:00Z",
  profileStatus: "active",
}).reason, "device_revoked");
assert.equal(deviceAccessDecision({
  accountKind: "child",
  deviceId: "d1",
  revokedAt: null,
  profileStatus: "pending_deletion",
}).reason, "profile_unavailable");
assert.equal(deviceAccessDecision({
  accountKind: "child",
  deviceId: "d1",
  revokedAt: null,
  profileStatus: "active",
}).allow, true);

assert.equal(childDeviceEmail("5bfabc6d-a1a0-4904-b6f0-16ad9eb90888"), "device-5bfabc6d-a1a0-4904-b6f0-16ad9eb90888@users.child.invalid");
assert.equal(childDeviceEmail("not-a-device"), "");

assert.match(fn, /consume_child_pairing/);
assert.match(fn, /register_child_device/);
assert.match(fn, /account_kind: "child"/);
assert.match(fn, /deleteUser/);
assert.match(fn, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
assert.equal(fn.includes("serviceKey:"), false);
assert.equal(fn.includes("password:"), false);
assert.match(join, /functions\/v1\/child-pair/);
assert.equal(join.includes("service_role"), false);
assert.equal(join.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.match(family, /create_child_pairing/);
assert.match(family, /Add device/);
assert.equal(family.includes("service_role"), false);
assert.match(fs.readFileSync(path.join(root, "child.html"), "utf8"), /no-referrer/);

console.log("child-pairing tests ok");
