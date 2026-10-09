import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import qrcode from "../js/qrcode.js";
import {
  childDeviceEmail,
  deviceAccessDecision,
  pairingClientAddress,
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
assert.match(sql, /pairing_limited/);
assert.match(sql, /pairing_attempt_allowed/);
assert.match(sql, /ip_attempts > 20/);
assert.match(sql, /global_attempts > 300/);
assert.match(sql, /grant execute on function public\.pairing_attempt_allowed\(text\) to service_role/);
assert.equal(sql.includes("grant execute on function public.pairing_attempt_allowed(text) to authenticated"), false);

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

assert.match(fn, /pairing_attempt_allowed/);
const attemptAt = fn.indexOf("pairing_attempt_allowed");
const consumeAt = fn.indexOf("consume_child_pairing");
assert.ok(attemptAt >= 0 && consumeAt > attemptAt);
assert.match(fn, /consume_child_pairing/);
assert.match(fn, /register_child_device/);
assert.match(fn, /account_kind: "child"/);
assert.match(fn, /deleteUser/);
assert.match(fn, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
assert.equal(fn.includes("serviceKey:"), false);
assert.equal(fn.includes("password:"), false);
assert.match(join, /functions\/v1\/child-pair/);
assert.match(join, /Authorization: "Bearer " \+ cfg\.supabaseAnonKey/);
const config = fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8");
const pairConfig = config.slice(config.indexOf("[functions.child-pair]"));
assert.match(pairConfig, /verify_jwt = false/);
assert.equal(join.includes("service_role"), false);
assert.equal(join.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
assert.match(family, /create_child_pairing/);
assert.match(family, /Add device/);
assert.match(family, /qrcode\(0, "M"\)/);
assert.match(family, /code\.addData\(url\)/);
assert.match(family, /title: "Pairing code"/);
assert.equal(family.includes("service_role"), false);
function modules(value) {
  const drawn = qrcode(0, "M");
  drawn.addData(value);
  drawn.make();
  let bits = "";
  for (let row = 0; row < drawn.getModuleCount(); row += 1) {
    for (let col = 0; col < drawn.getModuleCount(); col += 1) bits += drawn.isDark(row, col) ? "1" : "0";
  }
  const svg = drawn.createSvgTag({ cellSize: 4, margin: 8, scalable: true, title: "Pairing code" });
  assert.equal(svg.includes("<svg"), true);
  assert.equal(svg.includes("nickname"), false);
  return bits;
}
const first = modules("https://www.wondii.co.uk/child.html?pair=AB23EFGH");
const second = modules("https://www.wondii.co.uk/child.html?pair=AB23EFGK");
assert.notEqual(first, second);
assert.match(fs.readFileSync(path.join(root, "child.html"), "utf8"), /no-referrer/);
const homeSql = fs.readFileSync(path.join(root, "supabase/migrations/20261008220000_child_home.sql"), "utf8");
assert.match(homeSql, /child_content_access\(\)/);
assert.match(homeSql, /'books', '\[\]'::jsonb/);
assert.match(homeSql, /grant execute on function public\.child_home\(\) to authenticated/);
assert.equal(homeSql.includes("grant execute on function public.child_home() to anon"), false);
assert.match(join, /child_home/);
assert.match(join, /games\/star-catcher\.html/);
assert.equal(join.includes("Create a Book"), false);

assert.equal(pairingClientAddress(new Headers({
  "cf-connecting-ip": "203.0.113.8",
  "x-forwarded-for": "198.51.100.9, 203.0.113.8",
  "x-real-ip": "198.51.100.9",
  "true-client-ip": "198.51.100.9",
})), "203.0.113.8");
assert.equal(pairingClientAddress(new Headers({
  "x-forwarded-for": "198.51.100.9, 203.0.113.50",
  "x-real-ip": "203.0.113.50",
  "true-client-ip": "203.0.113.50",
})), "unknown");
assert.equal(pairingClientAddress(new Headers({
  "cf-connecting-ip": "203.0.113.8, 198.51.100.9",
})), "unknown");
assert.equal(pairingClientAddress(new Headers({
  "cf-connecting-ip": " 203.0.113.8 ",
})), "203.0.113.8");
assert.equal(pairingClientAddress(new Headers()), "unknown");
assert.equal(fn.includes("x-forwarded-for"), false);
assert.equal(fn.includes("x-real-ip"), false);
assert.match(fn, /CHILD_PAIRING_ENABLED/);
assert.match(fn, /pairingClientAddress/);

assert.match(family, /familyWritesAllowed/);
assert.ok(family.indexOf("if (!familyWritesAllowed())") < family.indexOf("sb.rpc"));
assert.match(family, /Family setup is turned off on this preview/);
assert.match(family, /www\.wondii\.co\.uk/);
assert.ok(family.indexOf("function familyWritesAllowed") < family.indexOf("WondiiSession.subscribe"));
assert.match(join, /pairingAllowedHere/);
assert.match(join, /Pairing is not available on this preview/);
assert.ok(join.indexOf("function pairingAllowedHere") < join.indexOf('form.addEventListener("submit", redeem)'));

const switchSql = fs.readFileSync(path.join(root, "supabase/migrations/20261008250000_child_access_switch.sql"), "utf8");
assert.match(switchSql, /private\.child_access_control/);
assert.match(switchSql, /pairing_enabled boolean not null default true/);
assert.match(switchSql, /content_enabled boolean not null default true/);
assert.match(switchSql, /if private\.child_access_open\('content'\) is not true/);
assert.match(switchSql, /if private\.child_access_open\('pairing'\) is not true/);
assert.match(switchSql, /device_revoked/);
assert.equal(switchSql.includes("delete from"), false);
assert.equal(switchSql.includes("drop table"), false);
assert.match(switchSql, /grant execute on function public\.consume_child_pairing\(text\) to service_role/);
assert.equal(switchSql.includes("grant execute on function public.consume_child_pairing(text) to authenticated"), false);

console.log("child-pairing tests ok");
