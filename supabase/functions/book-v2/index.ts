import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import handle from "./handle.mjs";

/* Book V2 plan check. The bundled handler is scripts/book/handle-request.js.
   It does not call a story model, draw pictures, or read a provider key.
   The gateway leaves OPTIONS open so the browser preflight can succeed.
   A story plan still requires the signed-in user's own token.
   Deploy only after this review is approved. */

function allowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (/^https:\/\/([a-z0-9-]+\.)?wondii\.co\.uk$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "";
}

function json(req: Request, body: unknown, status: number): Response {
  const origin = allowedOrigin(req);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, content-type, apikey";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function signedInUser(req: Request): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const header = req.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!url || !anon || !token || token === anon) return "";
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.getUser(token);
  const user = result.data && result.data.user;
  if (result.error || !user || !user.id) return "";
  return String(user.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = allowedOrigin(req);
    const headers: Record<string, string> = {};
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Headers"] = "authorization, content-type, apikey";
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
      headers.Vary = "Origin";
    }
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return json(req, { ok: false, message: "Book V2 is not on this path." }, 404);
  }
  let userId = "";
  try {
    userId = await signedInUser(req);
  } catch (_error) {
    userId = "";
  }
  if (!userId) {
    return json(req, { ok: false, message: "Sign in again before this story can be planned. Nothing was saved." }, 401);
  }
  let body: unknown = {};
  try {
    body = await req.json();
  } catch (_error) {
    return json(req, { ok: false, message: "The story request could not be read." }, 400);
  }
  const result = handle.handleBookV2(body);
  const planned = result.body && typeof result.body === "object" ? result.body as Record<string, unknown> : {};
  return json(req, { ...planned, accountId: userId }, result.status);
});
