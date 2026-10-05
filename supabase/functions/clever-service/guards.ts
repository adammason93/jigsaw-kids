/**
 * Pure checks for clever-service. The HTTP handler calls these before any
 * OpenAI request. Kept free of Supabase client imports so Deno tests can
 * load them without starting the edge server.
 */

export const STORYBOOK_LIVE_ORIGIN = "https://jigsaw-kids.adammason93.workers.dev";

export type AuthOk = { ok: true; userId: string };
export type AuthNo = {
  ok: false;
  status: 401;
  error: "unauthorized";
  detail: string;
};

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * Anon-key and service-role bearers are not a signed-in child/family session.
 * `lookupUser` is only called for tokens that look like a user JWT; it must
 * be `auth.getUser` (or a test double) and is the source of truth.
 */
export async function authenticateBearer(
  token: string,
  anonKey: string,
  lookupUser: (token: string) => Promise<string | null>,
): Promise<AuthOk | AuthNo> {
  const bearer = token.trim();
  if (!bearer) {
    return { ok: false, status: 401, error: "unauthorized", detail: "missing_session" };
  }
  if (anonKey && bearer === anonKey.trim()) {
    return { ok: false, status: 401, error: "unauthorized", detail: "anon_key_not_a_user" };
  }
  const payload = decodeJwtPayload(bearer);
  const role = typeof payload?.role === "string" ? payload.role : "";
  if (role === "anon" || role === "service_role") {
    return { ok: false, status: 401, error: "unauthorized", detail: "not_a_user_session" };
  }
  const sub = typeof payload?.sub === "string" ? payload.sub.trim() : "";
  if (!sub) {
    return { ok: false, status: 401, error: "unauthorized", detail: "not_a_user_session" };
  }
  let userId: string | null = null;
  try {
    userId = await lookupUser(bearer);
  } catch {
    userId = null;
  }
  if (!userId || userId !== sub) {
    return { ok: false, status: 401, error: "unauthorized", detail: "invalid_session" };
  }
  return { ok: true, userId };
}

export function bearerTokenFromHeader(authorization: string | null): string {
  const m = /^Bearer\s+(\S+)/i.exec(authorization ?? "");
  return m?.[1]?.trim() ?? "";
}

export function isAllowedStoryOrigin(origin: string, extraEnv = ""): boolean {
  const raw = origin.trim().replace(/\/+$/, "");
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (host === "localhost" || host === "127.0.0.1")
  ) {
    return true;
  }
  const allow = new Set<string>([STORYBOOK_LIVE_ORIGIN]);
  for (const part of extraEnv.split(",")) {
    const o = part.trim().replace(/\/+$/, "");
    if (o) allow.add(o);
  }
  return allow.has(raw);
}

/** Buckets this function may re-fetch. Anything else is refused. */
export const STORYBOOK_PROXY_BUCKETS: ReadonlySet<string> = new Set([
  "storybook_images",
  "storybook_images_private",
  "storybook_room",
  "characters_room",
]);

export type ProxyOk = { ok: true; url: string };
export type ProxyNo = { ok: false; reason: string };

/**
 * Allow only an object URL on this project's Supabase storage host, in a known bucket.
 * Query tokens (signed URLs) are kept. Userinfo and other hosts are refused.
 */
export function assessStorageProxyUrl(raw: string, supabaseUrl: string): ProxyOk | ProxyNo {
  let decoded = raw.trim();
  if (!decoded) return { ok: false, reason: "missing_url" };
  try {
    const once = decodeURIComponent(decoded);
    if (once.startsWith("http://") || once.startsWith("https://")) decoded = once;
  } catch {
    /* keep the raw string */
  }
  let parsed: URL;
  try {
    parsed = new URL(decoded);
  } catch {
    return { ok: false, reason: "bad_url" };
  }
  if (parsed.username || parsed.password) return { ok: false, reason: "userinfo" };
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "bad_scheme" };
  }
  let allowedHost: URL;
  try {
    allowedHost = new URL(supabaseUrl);
  } catch {
    return { ok: false, reason: "storage_unconfigured" };
  }
  if (parsed.hostname !== allowedHost.hostname) {
    return { ok: false, reason: "foreign_host" };
  }
  const match = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/.+/i.exec(
    parsed.pathname,
  );
  if (!match) return { ok: false, reason: "not_storage_object" };
  if (!STORYBOOK_PROXY_BUCKETS.has(match[1])) {
    return { ok: false, reason: "bucket_not_allowed" };
  }
  return { ok: true, url: parsed.toString() };
}

/** A redirect is followed only when the next hop still passes assessStorageProxyUrl. */
export function proxyRedirectAllowed(
  currentUrl: string,
  location: string | null,
  supabaseUrl: string,
): ProxyOk | ProxyNo {
  if (!location || !location.trim()) {
    return { ok: false, reason: "proxy_redirect_blocked" };
  }
  let next = "";
  try {
    next = new URL(location, currentUrl).toString();
  } catch {
    return { ok: false, reason: "proxy_redirect_blocked" };
  }
  const verdict = assessStorageProxyUrl(next, supabaseUrl);
  if (!verdict.ok) return { ok: false, reason: "proxy_redirect_blocked" };
  return verdict;
}

const PHOTO_PAYLOAD_KEYS = [
  "heroReferenceImage",
  "heroReferenceImages",
  "characterReferencePhotos",
  "referencePhoto",
  "referenceImage",
];

function stringLooksLikePhoto(value: string): boolean {
  if (/^data:image\//i.test(value)) return true;
  return value.length > 2000 && /^[A-Za-z0-9+/=\s]+$/.test(value);
}

/** True when the request is carrying an uploaded face or reference image. */
export function bodyHasReferencePhoto(body: Record<string, unknown>): boolean {
  for (const key of PHOTO_PAYLOAD_KEYS) {
    const value = body[key];
    if (typeof value === "string" && value.trim().length > 0) return true;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0) return true;
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const img = rec.image ?? rec.dataUrl ?? rec.url;
          if (typeof img === "string" && img.trim().length > 0) return true;
        }
      }
    }
  }
  return false;
}

/**
 * What is allowed to sit in storybook_generation_jobs.request_payload.
 * No names, no plot text, no image bytes.
 */
export function minimalJobMetadata(body: Record<string, unknown>): Record<string, unknown> {
  const child = String(body.childName ?? "");
  const plot = String(body.plotHint ?? "");
  return {
    v: 1,
    character: String(body.character ?? "").slice(0, 80),
    place: String(body.place ?? "").slice(0, 80),
    pictureBookQuality: String(body.pictureBookQuality ?? "").slice(0, 40),
    childNameLen: child.trim().length,
    plotHintLen: plot.trim().length,
    hadReferencePhotos: bodyHasReferencePhoto(body),
  };
}

/** Drop photo fields on the in-memory body once generation has finished. */
export function blankReferencePhotos(body: Record<string, unknown>): void {
  for (const key of PHOTO_PAYLOAD_KEYS) {
    if (key in body) body[key] = null;
  }
}

/** Remove data-URLs and long base64 strings from a finished payload. Keeps https image URLs. */
export function stripEmbeddedPhotoStrings(value: unknown): unknown {
  if (typeof value === "string") return stringLooksLikePhoto(value) ? null : value;
  if (Array.isArray(value)) return value.map((item) => stripEmbeddedPhotoStrings(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (PHOTO_PAYLOAD_KEYS.includes(key)) {
      out[key] = null;
      continue;
    }
    out[key] = stripEmbeddedPhotoStrings(item);
  }
  return out;
}

export function corsHeadersForOrigin(
  origin: string | null,
  extraEnv = "",
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  const o = (origin ?? "").trim();
  if (o && isAllowedStoryOrigin(o, extraEnv)) {
    headers["Access-Control-Allow-Origin"] = o.replace(/\/+$/, "");
  }
  return headers;
}
