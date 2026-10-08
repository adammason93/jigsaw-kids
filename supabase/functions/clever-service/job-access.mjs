/* Capability keys for story-generation jobs.
   The browser receives the key once. The database stores only its SHA-256.
   Polling sends the key in a header. A query-string key is ignored. */

const JOB_KEY_HEADER = "x-wondii-job-key";
const LEGACY_WINDOW_MS = 24 * 60 * 60 * 1000;
const TTS_MAX_CHARS = 4000;

const IMAGE_HOST_SUFFIXES = [
  "blob.core.windows.net",
  "oaiusercontent.com",
  "fal.media",
  "r2.dev"
];

function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function generateAccessKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashAccessKey(key) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(key || "")));
  return bytesToHex(new Uint8Array(digest));
}

function timingSafeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* Query values are accepted as an argument so tests can prove they are ignored. */
function presentedJobKey(headerValue) {
  return typeof headerValue === "string" ? headerValue.trim() : "";
}

function authorizeJobRead(row, presentedHash, nowMs, callerUserId) {
  if (!row) return { allow: false, status: 404, reason: "missing" };
  if (row.owner_user_id && row.owner_user_id !== callerUserId) {
    return { allow: false, status: 404, reason: "owner" };
  }
  const stored = typeof row.access_key_hash === "string" ? row.access_key_hash : "";
  if (stored) {
    if (!presentedHash || !timingSafeEqual(stored, presentedHash)) {
      return { allow: false, status: 404, reason: presentedHash ? "invalid_key" : "missing_key" };
    }
    return { allow: true, status: 200, reason: "key" };
  }
  const created = Date.parse(row.created_at);
  if (!Number.isFinite(created) || nowMs - created > LEGACY_WINDOW_MS) {
    return { allow: false, status: 404, reason: "legacy_expired" };
  }
  return { allow: true, status: 200, reason: "legacy" };
}

function imageProxyAllowed(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch (e) {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.includes(":") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
  return IMAGE_HOST_SUFFIXES.some(function (suffix) {
    return host === suffix || host.endsWith("." + suffix);
  }) || host.includes("fal-cdn");
}

function ttsLengthAllowed(text) {
  const value = String(text || "");
  return value.length > 0 && value.length <= TTS_MAX_CHARS;
}

function childContentDecision(claims, device) {
  const kind = claims && claims.account_kind;
  if (kind !== "child") return { allowed: false, reason: "not_child" };
  if (!device || device.revoked_at) return { allowed: false, reason: "device_revoked" };
  if (device.profile_status !== "active") return { allowed: false, reason: "profile_unavailable" };
  return { allowed: true, reason: "live", childId: device.child_profile_id };
}

export {
  JOB_KEY_HEADER,
  LEGACY_WINDOW_MS,
  TTS_MAX_CHARS,
  generateAccessKey,
  hashAccessKey,
  timingSafeEqual,
  presentedJobKey,
  authorizeJobRead,
  imageProxyAllowed,
  ttsLengthAllowed,
  childContentDecision
};
