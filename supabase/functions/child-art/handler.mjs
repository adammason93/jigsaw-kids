/* Private child_library delivery.
   The browser calls this route. After the caller's own session is accepted,
   the object is read from the S3 origin. S3 keys stay in this function. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PART = /^[A-Za-z0-9_.-]{1,80}$/;
const MAX_BYTES = 8000000;
const TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
  "application/json": true
};

function allowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  if (/^https:\/\/([a-z0-9-]+\.)?wondii\.co\.uk$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "";
}

function privateHeaders(req, contentType) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    "Surrogate-Control": "no-store",
    Pragma: "no-cache",
    Expires: "0",
    Vary: "Authorization",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, noimageindex"
  };
  if (contentType) headers["Content-Type"] = contentType;
  const origin = allowedOrigin(req);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, cache-control, pragma";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
  }
  return headers;
}

function reply(req, status, reason, bytes, contentType) {
  if (bytes) {
    return new Response(bytes, { status: status, headers: privateHeaders(req, contentType) });
  }
  return new Response(JSON.stringify({ allowed: false, reason: reason || "unavailable" }), {
    status: status,
    headers: privateHeaders(req, "application/json")
  });
}

export function libraryPathFromRequest(url) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch (e) {
    return "";
  }
  const marker = "/child-art/";
  const at = pathname.indexOf(marker);
  if (at === -1) return "";
  return pathname.slice(at + marker.length);
}

export function parseLibraryObject(raw) {
  const text = String(raw || "");
  if (!text || text.length > 240) return null;
  if (text.indexOf("\\") !== -1 || text.indexOf("\0") !== -1 || text.indexOf("%") !== -1) return null;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch (e) {
    return null;
  }
  if (!decoded || decoded.indexOf("..") !== -1 || decoded.indexOf("\\") !== -1 || decoded.indexOf("%") !== -1) return null;
  const parts = decoded.split("/");
  if (parts.length < 3 || parts.length > 4) return null;
  if (parts.some(function (part) { return !part || part === "." || part === ".."; })) return null;
  const childId = parts[0].toLowerCase();
  if (!UUID.test(childId)) return null;
  const area = parts[1];
  if (area !== "books" && area !== "characters" && area !== "shared") return null;
  if (!parts.slice(2).every(function (part) { return PART.test(part); })) return null;
  let shareId = "";
  if (area === "shared") {
    if (parts.length !== 4) return null;
    shareId = parts[2].toLowerCase();
    if (!UUID.test(shareId)) return null;
  }
  return {
    childId: childId,
    area: area,
    shareId: shareId,
    objectPath: [childId].concat(parts.slice(1)).join("/")
  };
}

function bearer(req) {
  const header = String(req.headers.get("authorization") || "");
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : "";
}

function accountKind(token) {
  const part = String(token || "").split(".")[1] || "";
  if (!part) return "";
  try {
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    const kind = json && json.app_metadata && json.app_metadata.account_kind;
    return kind ? String(kind) : "";
  } catch (e) {
    return "";
  }
}

async function rpc(env, token, name, args, fetchImpl) {
  const res = await fetchImpl(env.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
    method: "POST",
    cache: "no-store",
    redirect: "manual",
    headers: {
      Authorization: "Bearer " + token,
      apikey: env.anonKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(args || {})
  });
  if (res.status >= 300 && res.status < 400) return { ok: false, status: res.status, data: null };
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  const object = data && typeof data === "object" && !Array.isArray(data);
  return { ok: res.ok && object, status: res.status, data: object ? data : null };
}

function shareListed(home, shareId) {
  const rows = [].concat(home.sharedBooks || [], home.sharedCharacters || []);
  return rows.some(function (row) {
    return String(row && row.id || "").toLowerCase() === shareId;
  });
}

async function authorise(env, token, objectInfo, fetchImpl) {
  const access = await rpc(env, token, "child_content_access", {}, fetchImpl);
  /* PostgREST has already checked the signature and expiry. A failed call
     is not a parent. A child claim is not a parent either. */
  if (!access.ok) return { allow: false, status: 401, reason: "sign_in_required" };
  const data = access.data;
  if (data.allowed === true && String(data.childId || "").toLowerCase() === objectInfo.childId) {
    if (objectInfo.area !== "shared") return { allow: true };
    const home = await rpc(env, token, "child_home", {}, fetchImpl);
    if (!home.ok || home.data.allowed !== true || !shareListed(home.data, objectInfo.shareId)) {
      return { allow: false, status: 403, reason: "not_shared" };
    }
    return { allow: true };
  }
  if (data.allowed === true) return { allow: false, status: 403, reason: "not_owner" };
  const reason = data.reason ? String(data.reason) : "unavailable";
  if (reason === "device_revoked" || reason === "profile_unavailable" || accountKind(token) === "child") {
    return { allow: false, status: 403, reason: reason };
  }
  const parent = await rpc(env, token, "parent_child_activity", { p_child: objectInfo.childId }, fetchImpl);
  if (parent.ok && String(parent.data.childId || "").toLowerCase() === objectInfo.childId) {
    return { allow: true };
  }
  return { allow: false, status: 403, reason: reason === "not_child" ? "not_owner" : reason };
}

function safeType(header) {
  const value = String(header || "").split(";")[0].trim().toLowerCase();
  return TYPES[value] ? value : "application/octet-stream";
}

const EMPTY_PAYLOAD_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function hexBytes(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let out = "";
  let i;
  for (i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

function amzTimestamp(env) {
  const now = env && env.now ? new Date(env.now) : new Date();
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function s3Origin(env) {
  if (env && env.s3Endpoint) return String(env.s3Endpoint).replace(/\/$/, "");
  const url = String(env && env.supabaseUrl || "").replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(url)) return "";
  return url.replace(".supabase.co", ".storage.supabase.co");
}

async function hmacSha256(keyBytes, text) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

async function sha256Hex(text) {
  return hexBytes(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/* AWS Signature Version 4. The signed request is a GetObject on the storage
   hostname, not a Smart CDN object URL. */
export async function awsSigV4Authorization(spec) {
  const names = Object.keys(spec.headers).map(function (name) {
    return name.toLowerCase();
  }).sort();
  const canonicalHeaders = names.map(function (name) {
    return name + ":" + String(spec.headers[name]).trim() + "\n";
  }).join("");
  const signedHeaders = names.join(";");
  const payload = spec.payloadHash || EMPTY_PAYLOAD_SHA256;
  const canonical = [
    spec.method,
    spec.uri,
    spec.query || "",
    canonicalHeaders,
    signedHeaders,
    payload
  ].join("\n");
  const dateStamp = String(spec.amzDate).slice(0, 8);
  const scope = dateStamp + "/" + spec.region + "/s3/aws4_request";
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    spec.amzDate,
    scope,
    await sha256Hex(canonical)
  ].join("\n");
  let key = new TextEncoder().encode("AWS4" + spec.secretAccessKey);
  key = await hmacSha256(key, dateStamp);
  key = await hmacSha256(key, spec.region);
  key = await hmacSha256(key, "s3");
  key = await hmacSha256(key, "aws4_request");
  const signature = hexBytes(await hmacSha256(key, stringToSign));
  return "AWS4-HMAC-SHA256 Credential=" + spec.accessKeyId + "/" + scope +
    ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
}

async function readPrivateObject(env, objectPath, fetchImpl) {
  const origin = s3Origin(env);
  const region = String(env.s3Region || "eu-west-1");
  if (!origin || !env.s3AccessKeyId || !env.s3SecretAccessKey || !region) return { error: "unconfigured" };
  const encoded = objectPath.split("/").map(function (part) {
    return encodeURIComponent(part);
  }).join("/");
  const uri = "/storage/v1/s3/child_library/" + encoded;
  const amzDate = amzTimestamp(env);
  const host = new URL(origin).host;
  const signedHeaders = {
    host: host,
    "x-amz-content-sha256": EMPTY_PAYLOAD_SHA256,
    "x-amz-date": amzDate
  };
  const authorization = await awsSigV4Authorization({
    method: "GET",
    uri: uri,
    region: region,
    accessKeyId: env.s3AccessKeyId,
    secretAccessKey: env.s3SecretAccessKey,
    amzDate: amzDate,
    headers: signedHeaders
  });
  const res = await fetchImpl(origin + uri, {
    method: "GET",
    cache: "no-store",
    redirect: "manual",
    headers: {
      "x-amz-content-sha256": EMPTY_PAYLOAD_SHA256,
      "x-amz-date": amzDate,
      Authorization: authorization
    }
  });
  if (res.status >= 300 && res.status < 400) return { error: "unavailable" };
  if (!res.ok) return { error: "missing" };
  const cached = String(res.headers.get("cf-cache-status") || "").toUpperCase();
  if (cached === "HIT" || cached === "STALE") return { error: "unavailable" };
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return { error: "missing" };
  return { bytes: bytes, contentType: safeType(res.headers.get("content-type")) };
}

export async function handleChildArt(req, env, fetchImpl) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: privateHeaders(req) });
  }
  if (req.method !== "GET") return reply(req, 405, "invalid");
  const objectInfo = parseLibraryObject(libraryPathFromRequest(req.url));
  if (!objectInfo) return reply(req, 400, "invalid");
  const token = bearer(req);
  if (!token || token === env.anonKey || token === env.serviceKey) return reply(req, 401, "sign_in_required");
  if (!env.supabaseUrl || !env.anonKey || !env.serviceKey) return reply(req, 503, "unavailable");
  const decision = await authorise(env, token, objectInfo, fetchImpl);
  if (!decision.allow) return reply(req, decision.status || 403, decision.reason || "unavailable");
  const file = await readPrivateObject(env, objectInfo.objectPath, fetchImpl);
  if (!file.bytes) {
    const status = file.error === "unconfigured" ? 503 : file.error === "unavailable" ? 502 : 404;
    return reply(req, status, file.error === "unconfigured" ? "unavailable" : (file.error || "missing"));
  }
  return reply(req, 200, "", file.bytes, file.contentType);
}
