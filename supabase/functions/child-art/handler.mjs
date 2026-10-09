/* Private child_library delivery.
   The browser calls this route. The service role is used only here, after
   the caller's own session has been accepted, and is never returned. */

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

function cacheNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  let i;
  for (i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function readPrivateObject(env, objectPath, fetchImpl) {
  const encoded = objectPath.split("/").map(function (part) {
    return encodeURIComponent(part);
  }).join("/");
  /* cacheNonce is the Smart CDN bypass. Other query strings are ignored and
     can replay a cached object. This does not write the object. */
  const res = await fetchImpl(
    env.supabaseUrl.replace(/\/$/, "") + "/storage/v1/object/child_library/" + encoded + "?cacheNonce=" + cacheNonce(),
    {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      headers: {
        Authorization: "Bearer " + env.serviceKey,
        apikey: env.serviceKey,
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    }
  );
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
  if (!file.bytes) return reply(req, file.error === "unavailable" ? 502 : 404, file.error || "missing");
  return reply(req, 200, "", file.bytes, file.contentType);
}
