import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  authorizeJobRead,
  childContentDecision,
  generateAccessKey,
  hashAccessKey,
  imageProxyAllowed,
  addressesArePublic,
  proxyRedirectAllowed,
  isPrivateAddress,
  LEGACY_WINDOW_MS,
  presentedJobKey,
  ttsLengthAllowed,
  ttsQuotaDecision,
  TTS_MAX_CHARS,
  TTS_HOUR_CHARS,
  TTS_HOUR_LONG,
  TTS_HOUR_SHORT
} from "../supabase/functions/clever-service/job-access.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = Date.parse("2026-10-08T14:00:00Z");

const key = generateAccessKey();
assert.strictEqual(key.length, 64);
assert.notStrictEqual(key, await hashAccessKey(key));
const hash = await hashAccessKey(key);
const other = await hashAccessKey(generateAccessKey());

const locked = {
  access_key_hash: hash,
  created_at: "2026-10-01T00:00:00Z",
  owner_user_id: null
};

assert.deepStrictEqual(
  authorizeJobRead(locked, "", now),
  { allow: false, status: 404, reason: "missing_key" }
);
assert.deepStrictEqual(
  authorizeJobRead(locked, other, now),
  { allow: false, status: 404, reason: "invalid_key" }
);
assert.deepStrictEqual(
  authorizeJobRead(locked, hash, now),
  { allow: true, status: 200, reason: "key" }
);
assert.strictEqual(authorizeJobRead(null, hash, now).reason, "missing");

const owned = Object.assign({}, locked, { owner_user_id: "parent-1" });
assert.strictEqual(authorizeJobRead(owned, hash, now, "parent-1").reason, "key");
assert.strictEqual(authorizeJobRead(owned, hash, now, "other").reason, "owner");
assert.strictEqual(authorizeJobRead(owned, hash, now).reason, "owner");

const legacy = { access_key_hash: null, created_at: new Date(now - 60 * 60 * 1000).toISOString() };
assert.strictEqual(authorizeJobRead(legacy, "", now).reason, "legacy");
const expired = { access_key_hash: "", created_at: new Date(now - LEGACY_WINDOW_MS - 1000).toISOString() };
assert.strictEqual(authorizeJobRead(expired, "", now).reason, "legacy_expired");
assert.strictEqual(authorizeJobRead(expired, hash, now).reason, "legacy_expired");

assert.strictEqual(presentedJobKey("  abc  "), "abc");
assert.strictEqual(presentedJobKey(""), "");
assert.strictEqual(presentedJobKey(undefined), "");

assert.strictEqual(imageProxyAllowed("https://images.oaiusercontent.com/file.png"), true);
assert.strictEqual(imageProxyAllowed("https://cdn.fal.media/a.png"), true);
assert.strictEqual(imageProxyAllowed("https://account.blob.core.windows.net/a.png"), true);
assert.strictEqual(imageProxyAllowed("https://pub.r2.dev/a.png"), true);
assert.strictEqual(imageProxyAllowed("https://cdn.fal-cdn.com/a.png"), true);
assert.strictEqual(imageProxyAllowed("http://images.oaiusercontent.com/file.png"), false);
assert.strictEqual(imageProxyAllowed("https://169.254.169.254/latest"), false);
assert.strictEqual(imageProxyAllowed("https://127.0.0.1/secret"), false);
assert.strictEqual(imageProxyAllowed("https://example.com/file.png"), false);
assert.strictEqual(imageProxyAllowed("file:///etc/passwd"), false);
assert.strictEqual(imageProxyAllowed("https://2130706433/latest"), false);
assert.strictEqual(imageProxyAllowed("https://0x7f000001/latest"), false);
assert.strictEqual(imageProxyAllowed("https://0177.0.0.1/latest"), false);
assert.strictEqual(imageProxyAllowed("https://[::1]/latest"), false);
assert.strictEqual(imageProxyAllowed("https://[::ffff:169.254.169.254]/latest"), false);
assert.strictEqual(imageProxyAllowed("https://10.0.0.5/latest"), false);
assert.strictEqual(imageProxyAllowed("https://192.168.1.1/latest"), false);
assert.strictEqual(imageProxyAllowed("https://user:pass@images.oaiusercontent.com/file.png"), false);
assert.strictEqual(imageProxyAllowed("https://images.oaiusercontent.com.evil.com/file.png"), false);
assert.strictEqual(imageProxyAllowed("https://not-fal-cdn.evil.com/file.png"), false);
assert.strictEqual(imageProxyAllowed("https://images.oaiusercontent.com/fi\nle.png"), false);
assert.strictEqual(imageProxyAllowed("https://images.oaiusercontent.com/file.png%00.png"), false);
assert.strictEqual(imageProxyAllowed("https://images.oaiusercontent.com\\@evil.com/file.png"), false);
assert.strictEqual(proxyRedirectAllowed(
  "https://images.oaiusercontent.com/file.png",
  "https://169.254.169.254/latest/meta-data"
), false);
assert.strictEqual(proxyRedirectAllowed(
  "https://images.oaiusercontent.com/file.png",
  "https://cdn.fal.media/other.png"
), true);
assert.strictEqual(addressesArePublic(["8.8.8.8"]), true);
assert.strictEqual(addressesArePublic(["8.8.8.8", "127.0.0.1"]), false);
assert.strictEqual(addressesArePublic(["169.254.169.254"]), false);
assert.strictEqual(addressesArePublic(["10.1.2.3"]), false);
assert.strictEqual(addressesArePublic(["192.168.0.2"]), false);
assert.strictEqual(addressesArePublic(["172.16.5.5"]), false);
assert.strictEqual(addressesArePublic(["100.64.0.1"]), false);
assert.strictEqual(addressesArePublic(["::1"]), false);
assert.strictEqual(addressesArePublic(["fd00::1"]), false);
assert.strictEqual(addressesArePublic([]), false);
assert.strictEqual(isPrivateAddress("::ffff:127.0.0.1"), true);

assert.strictEqual(ttsLengthAllowed("Once upon a time."), true);
assert.strictEqual(ttsLengthAllowed(""), false);
assert.strictEqual(ttsLengthAllowed("a".repeat(TTS_MAX_CHARS + 1)), false);
assert.strictEqual(ttsQuotaDecision({ chars: 0, shortCount: 0, longCount: 0 }, 12).allow, true);
assert.strictEqual(ttsQuotaDecision({ chars: 0, shortCount: 0, longCount: TTS_HOUR_LONG }, 120).allow, false);
assert.strictEqual(ttsQuotaDecision({ chars: 0, shortCount: TTS_HOUR_SHORT, longCount: 0 }, 4).allow, false);
assert.strictEqual(ttsQuotaDecision({ chars: TTS_HOUR_CHARS - 10, shortCount: 0, longCount: 0 }, 12).allow, false);
assert.strictEqual(ttsQuotaDecision({ chars: 0, shortCount: 0, longCount: 0 }, TTS_MAX_CHARS).allow, true);

assert.deepStrictEqual(
  childContentDecision({ account_kind: "child" }, null),
  { allowed: false, reason: "device_revoked" }
);
assert.deepStrictEqual(
  childContentDecision({ account_kind: "child" }, { revoked_at: "2026-10-08T12:00:00Z", profile_status: "active" }),
  { allowed: false, reason: "device_revoked" }
);
assert.deepStrictEqual(
  childContentDecision({ account_kind: "child" }, { revoked_at: null, profile_status: "suspended", child_profile_id: "c1" }),
  { allowed: false, reason: "profile_unavailable" }
);
assert.strictEqual(
  childContentDecision({ account_kind: "child" }, { revoked_at: null, profile_status: "active", child_profile_id: "c1" }).allowed,
  true
);
assert.strictEqual(childContentDecision({ account_kind: "parent" }, { revoked_at: null, profile_status: "active" }).reason, "not_child");

const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const poll = story.slice(story.indexOf("function pollStorybookJob"), story.indexOf("function getSelectedFamilyPeople"));
assert.ok(poll.indexOf("X-Wondii-Job-Key") >= 0);
assert.strictEqual(poll.indexOf("storybook_job_key="), -1);
assert.ok(story.indexOf("b.storybook_job_key") >= 0);
const service = fs.readFileSync(path.join(root, "supabase/functions/clever-service/index.ts"), "utf8");
assert.ok(service.indexOf("access_key_hash") >= 0);
assert.ok(service.indexOf("readJob") >= 0);
assert.ok(service.indexOf("assessProxyUrl") >= 0);
assert.ok(service.indexOf('redirect: "manual"') >= 0);
assert.ok(service.indexOf("hostResolvesPublic") >= 0);
assert.ok(service.indexOf("ttsLengthAllowed") >= 0);
assert.ok(service.indexOf("tts_quota_take") >= 0);
assert.ok(service.indexOf("tts_busy") >= 0);
assert.ok(service.indexOf("x-wondii-job-key") >= 0);

console.log("job-access tests ok");
