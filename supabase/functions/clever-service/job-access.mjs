/* Capability keys for story-generation jobs.
   The browser receives the key once. The database stores only its SHA-256.
   Polling sends the key in a header. A query-string key is ignored. */

const JOB_KEY_HEADER = "x-wondii-job-key";
const LEGACY_WINDOW_MS = 24 * 60 * 60 * 1000;
const TTS_MAX_CHARS = 4000;
const TTS_SHORT_CHARS = 80;
const TTS_HOUR_CHARS = 400000;
const TTS_HOUR_SHORT = 4000;
const TTS_HOUR_LONG = 500;
const SPEECH_BUSY_MESSAGE = "Wondii needs a short rest before reading again. Try once more in a little while.";
const SPEECH_UNAVAILABLE_MESSAGE = "Wondii could not read that just now. Try again in a moment.";

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

function parseIpv4Part(part) {
  if (!/^(0x[0-9a-f]+|\d+)$/i.test(part)) return null;
  const value = part.toLowerCase().startsWith("0x")
    ? parseInt(part, 16)
    : part.length > 1 && part.startsWith("0")
      ? parseInt(part, 8)
      : parseInt(part, 10);
  if (!Number.isInteger(value) || value < 0 || value > 255) return null;
  return value;
}

function ipv4FromHostname(host) {
  if (/^\d+$/.test(host)) {
    const value = Number(host);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return null;
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const value = parseInt(host, 16);
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) return null;
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
  }
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  if (!parts.every(function (part) { return /^(0x[0-9a-f]+|\d+)$/i.test(part); })) return null;
  const numbers = parts.map(parseIpv4Part);
  if (numbers.some(function (part) { return part == null; })) return null;
  if (parts.length === 4) return numbers;
  return null;
}

function privateIpv4(octets) {
  const a = octets[0];
  const b = octets[1];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && octets[2] === 0) return true;
  if (a === 192 && b === 0 && octets[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0 && octets[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

function privateIpv6(host) {
  const text = host.toLowerCase();
  if (text === "::" || text === "::1") return true;
  if (text.startsWith("fc") || text.startsWith("fd") || text.startsWith("fe8") || text.startsWith("fe9") || text.startsWith("fea") || text.startsWith("feb")) return true;
  if (text.startsWith("ff")) return true;
  const mapped = text.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    const octets = ipv4FromHostname(mapped[1]);
    return !octets || privateIpv4(octets);
  }
  const hexMapped = text.match(/^::ffff:([0-9a-f:]+)$/);
  if (hexMapped && hexMapped[1].includes(":")) {
    const pieces = hexMapped[1].split(":");
    if (pieces.length === 2) {
      const hi = parseInt(pieces[0], 16);
      const lo = parseInt(pieces[1], 16);
      if (Number.isInteger(hi) && Number.isInteger(lo)) {
        return privateIpv4([(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255]);
      }
    }
  }
  return false;
}

function isPrivateAddress(address) {
  const host = String(address || "").toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = ipv4FromHostname(host);
  if (v4) return privateIpv4(v4);
  if (host.includes(":")) return privateIpv6(host);
  return false;
}

function allowedImageHost(host) {
  if (IMAGE_HOST_SUFFIXES.some(function (suffix) {
    return host === suffix || host.endsWith("." + suffix);
  })) return true;
  return host === "fal-cdn.com" || host.endsWith(".fal-cdn.com");
}

function assessProxyUrl(raw) {
  const text = String(raw || "").trim();
  if (!text || /[\u0000-\u0020\\]/.test(text) || /%00/i.test(text)) {
    return { ok: false, reason: "malformed" };
  }
  let url;
  try {
    url = new URL(text);
  } catch (e) {
    return { ok: false, reason: "malformed" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "protocol" };
  if (url.username || url.password) return { ok: false, reason: "credentials" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "local" };
  }
  if (isPrivateAddress(host) || ipv4FromHostname(host)) return { ok: false, reason: "address" };
  if (!allowedImageHost(host)) return { ok: false, reason: "host" };
  return { ok: true, href: url.href, hostname: host };
}

function imageProxyAllowed(raw) {
  return assessProxyUrl(raw).ok;
}

function publicHttpsUrl(raw) {
  const text = String(raw || "").trim();
  if (!text || /[\u0000-\u0020\\]/.test(text) || /%00/i.test(text)) return null;
  let url;
  try {
    url = new URL(text);
  } catch (e) {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (isPrivateAddress(host) || ipv4FromHostname(host)) return null;
  return { href: url.href, hostname: host };
}

function addressesArePublic(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return false;
  return addresses.every(function (address) { return !isPrivateAddress(address); });
}

function proxyRedirectAllowed(current, location) {
  let next;
  try {
    next = new URL(location, current);
  } catch (e) {
    return false;
  }
  return assessProxyUrl(next.href).ok;
}

async function readJob(row, headerValue, nowMs, callerUserId) {
  const presented = presentedJobKey(headerValue);
  const presentedHash = presented ? await hashAccessKey(presented) : "";
  const decision = authorizeJobRead(row, presentedHash, nowMs, callerUserId);
  if (!decision.allow || !row) {
    return { status: 404, body: { error: "storybook_job_not_found" } };
  }
  return {
    status: 200,
    body: {
      storybook_job_status: row.status,
      http_status: row.http_status,
      result: row.result_payload,
      updated_at: row.updated_at,
      storybook_job_progress: typeof row.progress === "number" ? row.progress : 0,
      storybook_job_label: typeof row.progress_label === "string" ? row.progress_label : ""
    }
  };
}

function ttsLengthAllowed(text) {
  const value = String(text || "");
  return value.length > 0 && value.length <= TTS_MAX_CHARS;
}

function ttsQuotaDecision(usage, textLength) {
  const length = Number(textLength) || 0;
  const current = usage || {};
  const chars = Number(current.chars) || 0;
  const shortCount = Number(current.shortCount) || 0;
  const longCount = Number(current.longCount) || 0;
  if (length < 1 || length > TTS_MAX_CHARS) return { allow: false, reason: "length" };
  const short = length <= TTS_SHORT_CHARS;
  if (chars + length > TTS_HOUR_CHARS) return { allow: false, reason: "chars" };
  if (short && shortCount + 1 > TTS_HOUR_SHORT) return { allow: false, reason: "short" };
  if (!short && longCount + 1 > TTS_HOUR_LONG) return { allow: false, reason: "long" };
  return { allow: true, reason: "ok" };
}

function canonicalPublicAddress(value) {
  const host = String(value || "").trim().toLowerCase();
  if (!host || /[\s,]/.test(host)) return "";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const parts = host.split(".");
    if (parts.some(function (part) { return part.length > 1 && part.startsWith("0"); })) return "";
    const octets = parts.map(function (part) { return Number(part); });
    if (octets.some(function (part) { return part > 255; })) return "";
    if (privateIpv4(octets)) return "";
    return host;
  }
  if (host.includes(":") && /^[0-9a-f:]+$/i.test(host) && !privateIpv6(host)) return host;
  return "";
}

function headerValue(headers, name) {
  if (!headers || typeof headers.get !== "function") return "";
  return String(headers.get(name) || "");
}

async function speechSignature(secret, address, minute) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(address) + "\n" + String(minute))
  );
  return bytesToHex(new Uint8Array(mac));
}

async function verifiedSpeechAddress(headers, secret, nowMs) {
  if (!secret) return "";
  const address = canonicalPublicAddress(headerValue(headers, "x-wondii-speech-ip"));
  const presented = headerValue(headers, "x-wondii-speech-sig");
  if (!address || !presented) return "";
  const minute = Math.floor(Number(nowMs) / 60000);
  const current = await speechSignature(secret, address, minute);
  const previous = await speechSignature(secret, address, minute - 1);
  if (timingSafeEqual(presented, current) || timingSafeEqual(presented, previous)) return address;
  return "";
}

function speechPlaybackPlan(input) {
  const request = input || {};
  if (request.dbError) {
    return { openai: false, status: 503, counted: false, cached: false, message: SPEECH_UNAVAILABLE_MESSAGE };
  }
  if (request.cacheHit) {
    return { openai: false, status: 200, counted: false, cached: true, message: "" };
  }
  if (!request.quotaAllow) {
    return { openai: false, status: 429, counted: false, cached: false, message: SPEECH_BUSY_MESSAGE };
  }
  return { openai: true, status: 200, counted: true, cached: false, message: "" };
}

function createAtomicQuota() {
  const rows = new Map();
  let tail = Promise.resolve();
  function take(bucket, text) {
    const run = tail.then(function () {
      const length = String(text || "").length;
      const row = rows.get(bucket) || { chars: 0, shortCount: 0, longCount: 0 };
      const decision = ttsQuotaDecision(row, length);
      if (!decision.allow) return false;
      const short = length <= TTS_SHORT_CHARS;
      rows.set(bucket, {
        chars: row.chars + length,
        shortCount: row.shortCount + (short ? 1 : 0),
        longCount: row.longCount + (short ? 0 : 1)
      });
      return true;
    });
    tail = run.then(function () { return undefined; }, function () { return undefined; });
    return run;
  }
  return { take: take, rows: rows };
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
  TTS_SHORT_CHARS,
  TTS_HOUR_CHARS,
  TTS_HOUR_SHORT,
  TTS_HOUR_LONG,
  SPEECH_BUSY_MESSAGE,
  SPEECH_UNAVAILABLE_MESSAGE,
  generateAccessKey,
  hashAccessKey,
  timingSafeEqual,
  presentedJobKey,
  authorizeJobRead,
  readJob,
  assessProxyUrl,
  imageProxyAllowed,
  publicHttpsUrl,
  addressesArePublic,
  proxyRedirectAllowed,
  isPrivateAddress,
  ttsLengthAllowed,
  ttsQuotaDecision,
  canonicalPublicAddress,
  speechSignature,
  verifiedSpeechAddress,
  speechPlaybackPlan,
  createAtomicQuota,
  childContentDecision
};
