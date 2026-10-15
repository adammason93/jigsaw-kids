import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import handle from "./handle.mjs";
import { readPublishableKey } from "../_shared/service-key.mjs";

/* Book V2. The bundled handler plans a story without a provider key.
   Paid writing runs only when BOOK_V2_PAID_TEST is exactly "approved",
   and only then through provider.mjs. That switch is not set. */

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

async function signedInUser(req: Request): Promise<{ id: string; accountKind: string }> {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const clientKey = readPublishableKey((name) => Deno.env.get(name)).key || anon;
  const header = req.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!url || !clientKey || !token || token === anon || token === clientKey) return { id: "", accountKind: "" };
  const client = createClient(url, clientKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const result = await client.auth.getUser(token);
  const user = result.data && result.data.user;
  if (result.error || !user || !user.id) return { id: "", accountKind: "" };
  const meta = user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata as Record<string, unknown> : {};
  return { id: String(user.id), accountKind: String(meta.account_kind || "") };
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
  let user = { id: "", accountKind: "" };
  try {
    user = await signedInUser(req);
  } catch (_error) {
    user = { id: "", accountKind: "" };
  }
  if (!user.id) {
    return json(req, { ok: false, message: "Sign in again before this story can be planned. Nothing was saved." }, 401);
  }
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch (_error) {
    return json(req, { ok: false, message: "The story request could not be read." }, 400);
  }
  body.accountId = user.id;
  if (user.accountKind === "child" || user.accountKind === "adult") body.accountKind = user.accountKind;
  if (user.accountKind === "child") {
    body.childPermitted = false;
    body.allowanceReserved = false;
  }
  const paidTest = Deno.env.get("BOOK_V2_PAID_TEST") === "approved";
  let ports: Record<string, unknown> | undefined;
  if (paidTest) {
    const provider = await import("./provider.mjs");
    ports = await provider.portsFor(req, user.id);
  }
  const result = await Promise.resolve(handle.handleBookV2(body, ports));
  if (ports && typeof ports.finish === "function") {
    try { await ports.finish(); } catch (_error) { /* the job record stays in memory for this request only */ }
  }
  const planned = result.body && typeof result.body === "object" ? result.body as Record<string, unknown> : {};
  const userId = user.id;
  return json(req, { ...planned, accountId: userId }, result.status);
});
