/**
 * Make a 3D Game (`game-maker`, deployed as `dynamic-action`).
 *
 * `verify_jwt` is not enough on its own: the public anon key is a valid JWT,
 * so the gateway lets it through. This handler rejects anything that is not a
 * real signed-in user before it reads the prompt or calls OpenAI.
 */

const DEFAULT_SITE_ORIGINS = [
  "https://jigsaw-kids.adammason93.workers.dev",
  "https://wondii.co.uk",
  "https://www.wondii.co.uk",
];

const NON_USER_ROLES = new Set(["anon", "service_role"]);

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type";

const ALLOWED_SCRIPT_HOST = "https://cdn.babylonjs.com/";
const MAX_PROMPT_LEN = 480;
const MAX_HTML_OUT = 120_000;

export type EnvGet = (name: string) => string | undefined;

export type GameMakerDeps = {
  getEnv?: EnvGet;
  fetchImpl?: typeof fetch;
};

type AuthOk = { userId: string };

function envGet(deps: GameMakerDeps): EnvGet {
  return deps.getEnv ?? ((name) => Deno.env.get(name));
}

function fetchImpl(deps: GameMakerDeps): typeof fetch {
  return deps.fetchImpl ?? fetch;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function configuredOrigins(getEnv: EnvGet): Set<string> {
  const allowed = new Set(DEFAULT_SITE_ORIGINS);
  const raw = getEnv("GAME_MAKER_ALLOWED_ORIGINS") ?? "";
  for (const part of raw.split(",")) {
    const origin = normalizeOrigin(part);
    if (origin) allowed.add(origin);
  }
  return allowed;
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return local && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin: string, getEnv: EnvGet): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (configuredOrigins(getEnv).has(normalized)) return true;
  return isLocalDevOrigin(normalized);
}

export function corsHeadersFor(req: Request, getEnv: EnvGet): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const origin = req.headers.get("Origin");
  if (origin && isAllowedOrigin(origin, getEnv)) {
    headers["Access-Control-Allow-Origin"] = normalizeOrigin(origin);
  }
  return headers;
}

function jsonResponse(
  cors: Record<string, string>,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function bearerToken(req: Request): string {
  const raw = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return match?.[1] ?? "";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** True when the token is missing, not a JWT, or a non-user key (anon / service role). */
function isNonUserToken(token: string, getEnv: EnvGet): boolean {
  if (!token) return true;
  const anon = (getEnv("SUPABASE_ANON_KEY") ?? "").trim();
  const service = (getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if ((anon && token === anon) || (service && token === service)) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const role = typeof payload.role === "string" ? payload.role : "";
  return NON_USER_ROLES.has(role);
}

function supabaseUrl(getEnv: EnvGet): string {
  return (getEnv("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");
}

function supabaseApiKey(getEnv: EnvGet, req: Request): string {
  const fromEnv = (
    getEnv("SUPABASE_ANON_KEY") ??
    getEnv("SUPABASE_PUBLISHABLE_KEY") ??
    ""
  ).trim();
  if (fromEnv) return fromEnv;
  return (req.headers.get("apikey") ?? "").trim();
}

/**
 * Same check as `supabase.auth.getUser(token)`: `GET {SUPABASE_URL}/auth/v1/user`.
 * Returns 401 for anon, service-role, missing, and invalid tokens, and does not
 * call the network in those cases. Returns 503 when a user-looking token cannot
 * be checked (no OpenAI call either way).
 */
async function requireSignedInUser(
  req: Request,
  cors: Record<string, string>,
  deps: GameMakerDeps,
): Promise<AuthOk | Response> {
  const getEnv = envGet(deps);
  const token = bearerToken(req);
  if (isNonUserToken(token, getEnv)) {
    return jsonResponse(cors, { error: "sign_in_required" }, 401);
  }

  const url = supabaseUrl(getEnv);
  const apiKey = supabaseApiKey(getEnv, req);
  if (!url || !apiKey) {
    console.error("[game-maker] cannot verify user (SUPABASE_URL or anon key missing)");
    return jsonResponse(cors, { error: "auth_unconfigured" }, 503);
  }

  let res: Response;
  try {
    res = await fetchImpl(deps)(`${url}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });
  } catch (e) {
    console.error("[game-maker] auth lookup failed", e);
    return jsonResponse(cors, { error: "auth_unreachable" }, 503);
  }

  if (!res.ok) {
    return jsonResponse(cors, { error: "sign_in_required" }, 401);
  }

  let user: { id?: unknown; role?: unknown };
  try {
    user = await res.json();
  } catch {
    return jsonResponse(cors, { error: "sign_in_required" }, 401);
  }

  const userId = typeof user.id === "string" ? user.id : "";
  const role = typeof user.role === "string" ? user.role : "";
  if (!userId || NON_USER_ROLES.has(role)) {
    return jsonResponse(cors, { error: "sign_in_required" }, 401);
  }

  return { userId };
}

function unwrapJsonContent(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  return s;
}

function sanitizePrompt(raw: string): string {
  return raw
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_PROMPT_LEN);
}

/** Reject obviously unsafe patterns; keep false positives low. */
function validateGameHtml(html: string): string | null {
  if (html.length < 200 || html.length > MAX_HTML_OUT) return "html_size";
  const lower = html.toLowerCase();
  if (!lower.includes("cdn.babylonjs.com/babylon.js")) return "missing_babylon";
  if (/\beval\s*\(/i.test(html)) return "unsafe_eval";
  if (/\bnew\s+Function\s*\(/i.test(html)) return "unsafe_function";
  if (/\bfetch\s*\(/i.test(html)) return "unsafe_fetch";
  if (/\bXMLHttpRequest\b/i.test(html)) return "unsafe_xhr";
  if (/\bWebSocket\b/i.test(html)) return "unsafe_ws";
  if (/<iframe\b/i.test(html)) return "unsafe_iframe";
  const re = /<script\b[^>]*src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1].trim();
    if (!u.startsWith(ALLOWED_SCRIPT_HOST)) return "disallowed_script_src";
  }
  return null;
}

export async function handleGameMakerRequest(
  req: Request,
  deps: GameMakerDeps = {},
): Promise<Response> {
  const getEnv = envGet(deps);
  const cors = corsHeadersFor(req, getEnv);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const auth = await requireSignedInUser(req, cors, deps);
  if (auth instanceof Response) return auth;

  console.info("[game-maker] signed-in", auth.userId);

  if (req.method !== "POST") {
    return jsonResponse(cors, { error: "method_not_allowed" }, 405);
  }

  const apiKey = (getEnv("OPENAI_API_KEY") ?? "").trim();
  if (!apiKey) {
    return jsonResponse(cors, { error: "server_misconfigured", detail: "OPENAI_API_KEY" }, 500);
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(cors, { error: "bad_json" }, 400);
  }

  const prompt = sanitizePrompt(String(body.prompt ?? ""));
  if (prompt.length < 8) {
    return jsonResponse(cors, { error: "prompt_too_short" }, 400);
  }

  const system =
    `You build single-file Babylon.js mini-games for children (ages ~5–9), UK English any UI text.
Reply with JSON only: one object with key "html" (string).

The "html" value must be a full HTML document that runs offline in a browser with NO build step.

STRICT rules:
- Kid-safe: gentle, silly, no violence, scares, romance, weapons, or data collection.
- Load Babylon ONLY from these two script URLs in order (no other script src):
  https://cdn.babylonjs.com/babylon.js
  https://cdn.babylonjs.com/gui/babylon.gui.min.js
- Inline all CSS in <style>. Put game logic in <script> after those two tags.
- NO fetch, XMLHttpRequest, WebSocket, eval, new Function, import maps, workers, or iframes.
- NO other external script/link to JS except the two CDN lines above.
- Full-bleed 3D: html,body{margin:0;height:100%;overflow:hidden;} #renderCanvas{width:100%;height:100%;touch-action:none;display:block;}
- Use BABYLON globally (Engine, Scene, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, PointerEventTypes, etc.). Use BABYLON.GUI for a simple on-screen label and a large "Again" / restart button.
- Touch + mouse: pointer on canvas; big colourful shapes; one simple goal (e.g. tap moving targets, roll a ball to a zone, collect floating stars). Keep the Babylon JS portion concise (aim ~120–320 lines) but complete and runnable.
- Professional look: soft lighting (hemisphere + directional), subtle colours, rounded box/sphere toys — not flat clip-art.
- If a JS string must mention a closing script tag, split it with string concatenation so the HTML file stays valid.

Implement THIS idea from the child:
`;

  const user = prompt;

  const r = await fetchImpl(deps)("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 12000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("[game-maker] openai", r.status, t.slice(0, 400));
    return jsonResponse(
      cors,
      { error: "openai_failed", detail: t.slice(0, 200) },
      502,
    );
  }

  const data = await r.json();
  const content = String(data.choices?.[0]?.message?.content ?? "").trim();
  let parsed: { html?: string };
  try {
    parsed = JSON.parse(unwrapJsonContent(content)) as { html?: string };
  } catch (e) {
    console.error("[game-maker] json parse", e, content.slice(0, 400));
    return jsonResponse(cors, { error: "bad_model_json" }, 502);
  }

  const html = String(parsed.html ?? "").trim();
  const bad = validateGameHtml(html);
  if (bad) {
    console.warn("[game-maker] validate failed", bad);
    return jsonResponse(cors, { error: "unsafe_or_invalid_html", code: bad }, 422);
  }

  return jsonResponse(cors, { html });
}
