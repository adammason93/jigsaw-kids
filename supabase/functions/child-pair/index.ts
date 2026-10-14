import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";
import { childDeviceEmail, normalisePairingCode, pairingClientAddress, pairingCodeIsShape } from "./pairing.mjs";

/* Redeems one pairing code and returns a child session.
   Not deployed. The service role stays in this function. */

function allowedOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (/^https:\/\/([a-z0-9-]+\.)?wondii\.co\.uk$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "";
}

function json(req: Request, body: unknown, status: number): Response {
  const origin = allowedOrigin(req);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function pairingBucket(req: Request): Promise<string> {
  const raw = pairingClientAddress(req.headers);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pair|" + raw));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = allowedOrigin(req);
    return new Response(null, {
      status: 204,
      headers: origin
        ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "authorization, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          Vary: "Origin",
        }
        : {},
    });
  }
  if (req.method !== "POST") return json(req, { allowed: false, reason: "invalid" }, 405);
  if ((Deno.env.get("CHILD_PAIRING_ENABLED") || "").trim() !== "1") {
    return json(req, { allowed: false, reason: "unavailable" }, 503);
  }

  const url = (Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
  if (!url || !serviceKey || !anonKey) {
    return json(req, { allowed: false, reason: "unavailable" }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const code = normalisePairingCode(body && body.code);
  if (!pairingCodeIsShape(code)) return json(req, { allowed: false, reason: "invalid" }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const gate = await admin.rpc("pairing_attempt_allowed", { p_bucket: await pairingBucket(req) });
  if (gate.error || !gate.data || gate.data.allowed !== true) {
    return json(req, { allowed: false, reason: "limited" }, 429);
  }
  const consumed = await admin.rpc("consume_child_pairing", { p_code: code });
  const decision = consumed.data;
  if (consumed.error || !decision || decision.allowed !== true || !decision.childId) {
    if (decision && decision.reason === "unavailable") {
      return json(req, { allowed: false, reason: "unavailable" }, 503);
    }
    const reason = decision && decision.reason === "profile_unavailable"
      ? "profile_unavailable"
      : "invalid";
    return json(req, { allowed: false, reason }, 403);
  }

  const deviceId = crypto.randomUUID();
  const email = childDeviceEmail(deviceId);
  const password = randomPassword();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { account_kind: "child", child_profile_id: decision.childId },
  });
  if (created.error || !created.data || !created.data.user) {
    return json(req, { allowed: false, reason: "unavailable" }, 503);
  }

  const registered = await admin.rpc("register_child_device", {
    p_child: decision.childId,
    p_auth_user: created.data.user.id,
  });
  if (registered.error || !registered.data) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return json(req, { allowed: false, reason: "unavailable" }, 503);
  }

  const signed = await fetch(url + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await signed.json().catch(() => null);
  if (!signed.ok || !session || !session.access_token || !session.refresh_token) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return json(req, { allowed: false, reason: "unavailable" }, 503);
  }

  return json(req, {
    allowed: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  }, 200);
});
