/** Named server key. The value stays in Supabase and is never logged. */
export const SERVICE_KEY_NAME = "cursornew";

let announcedService = false;
let announcedPublic = false;

export function isSecretApiKey(key) {
  return key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
}

function namedValue(raw, name) {
  if (!raw) return "";
  try {
    const dict = JSON.parse(raw);
    const named = dict && dict[name];
    return typeof named === "string" ? named.trim() : "";
  } catch (_error) {
    return "";
  }
}

/**
 * The server key named cursornew. There is no fallback to the legacy
 * service-role JWT: a missing name fails closed.
 */
export function readServiceKey(getEnv) {
  const key = namedValue(String(getEnv("SUPABASE_SECRET_KEYS") || "").trim(), SERVICE_KEY_NAME);
  if (!announcedService) {
    announcedService = true;
    console.log(JSON.stringify({
      event: "service-key",
      source: key ? SERVICE_KEY_NAME : "missing",
      present: key.length > 0,
    }));
  }
  return { key, source: key ? SERVICE_KEY_NAME : "missing" };
}

/** Public website key. Prefer the injected publishable key named default. */
export function readPublishableKey(getEnv) {
  let key = namedValue(String(getEnv("SUPABASE_PUBLISHABLE_KEYS") || "").trim(), "default");
  let source = key ? "publishable" : "missing";
  if (!key) {
    const legacy = String(getEnv("SUPABASE_ANON_KEY") || "").trim();
    if (legacy) {
      key = legacy;
      source = "legacy-anon";
    }
  }
  if (!announcedPublic) {
    announcedPublic = true;
    console.log(JSON.stringify({ event: "publishable-key", source, present: key.length > 0 }));
  }
  return { key, source };
}

/** New secret keys go on apikey only. A legacy JWT still uses Bearer. */
export function serviceAuthHeaders(key, extra) {
  const headers = Object.assign({}, extra || {}, { apikey: key });
  if (key && !isSecretApiKey(key)) headers.Authorization = "Bearer " + key;
  return headers;
}

export function stripSecretBearer(key, init) {
  const headers = new Headers(init && init.headers);
  if (isSecretApiKey(key)) {
    const auth = headers.get("Authorization") || "";
    if (auth.slice(7) === key && auth.slice(0, 7).toLowerCase() === "bearer ") {
      headers.delete("Authorization");
    }
    if (!headers.has("apikey")) headers.set("apikey", key);
  }
  return Object.assign({}, init || {}, { headers });
}

export function serviceClientFetch(key, baseFetch) {
  const inner = baseFetch || fetch;
  return (input, init) => inner(input, stripSecretBearer(key, init));
}
