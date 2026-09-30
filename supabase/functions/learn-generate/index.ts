import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../../../js/lesson-brain.js";

const brain = (globalThis as { WondiiLessonBrain?: LessonBrain }).WondiiLessonBrain;

type LessonBrain = {
  forModel: (ctx: Record<string, unknown>) => Record<string, unknown>;
  modelBrief: (ctx: Record<string, unknown>) => { system: string; user: string };
  repairBrief: (ctx: Record<string, unknown>, issues: string[], previous: unknown) => { system: string; user: string };
  accept: (raw: unknown, ctx: Record<string, unknown>) => { ok: boolean; issues?: string[]; previous?: unknown; adventure?: Record<string, unknown> };
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function logMeta(meta: Record<string, unknown>) {
  console.log(JSON.stringify({ event: "learn-generate", ...meta }));
}

async function teacherAllowed(orgId: string, auth: string, apiKey: string, base: string): Promise<string> {
  const userRes = await fetch(base + "/auth/v1/user", {
    headers: { Authorization: auth, apikey: apiKey }
  });
  if (!userRes.ok) return "";
  const user = await userRes.json();
  const userId = String(user && user.id || "");
  if (!userId) return "";
  const query = new URL(base + "/rest/v1/organisation_members");
  query.searchParams.set("user_id", "eq." + userId);
  query.searchParams.set("organisation_id", "eq." + orgId);
  query.searchParams.set("select", "role,status");
  const memberRes = await fetch(query.toString(), {
    headers: { Authorization: auth, apikey: apiKey, Accept: "application/json" }
  });
  if (!memberRes.ok) return "";
  const rows = await memberRes.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row || row.status !== "active") return "";
  if (row.role !== "owner" && row.role !== "school_admin" && row.role !== "teacher") return "";
  return userId;
}

async function callModel(brief: { system: string; user: string }, apiKey: string, model: string): Promise<unknown> {
  const control = new AbortController();
  const timer = setTimeout(function () { control.abort(); }, 22000);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: control.signal,
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: brief.system },
          { role: "user", content: brief.user }
        ]
      })
    });
    if (!response.ok) {
      const failed = new Error("provider") as Error & { category?: string };
      failed.category = response.status === 408 ? "timeout" : "provider";
      throw failed;
    }
    const payload = await response.json();
    const text = String(payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "");
    return JSON.parse(text);
  } catch (error) {
    const named = error as { name?: string; category?: string };
    if (named && named.category) throw error;
    const wrapped = new Error("model") as Error & { category?: string };
    wrapped.category = named && named.name === "AbortError" ? "timeout" : "provider";
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, category: "method" }, 405);
  const started = Date.now();
  if (!brain) {
    logMeta({ category: "unconfigured", ms: Date.now() - started });
    return json({ ok: false, category: "unconfigured" }, 500);
  }
  const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  const anon = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  const model = (Deno.env.get("LESSON_MODEL") ?? "").trim() || "gpt-4o-mini";
  if (!apiKey || !base || !anon) {
    logMeta({ category: "unconfigured", ms: Date.now() - started });
    return json({ ok: false, category: "unconfigured" }, 500);
  }
  const auth = req.headers.get("Authorization") || "";
  let body: { context?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch (_error) {
    return json({ ok: false, category: "invalid" }, 400);
  }
  const ctx = body && body.context && typeof body.context === "object" ? body.context : null;
  const orgId = String(ctx && ctx.organisationId || "");
  const lesson = String(ctx && (ctx.lessonText || ctx.teacherInstructions) || "").trim();
  if (!ctx || !orgId || lesson.length < 12) return json({ ok: false, category: "invalid" }, 400);
  const userId = await teacherAllowed(orgId, auth, anon, base);
  if (!userId) return json({ ok: false, category: "unauthorised" }, 401);
  try {
    const first = await callModel(brain.modelBrief(ctx), apiKey, model);
    const accepted = brain.accept(first, ctx);
    if (accepted.ok && accepted.adventure) {
      logMeta({ category: "ok", ms: Date.now() - started, repair: false, model: model });
      return json({ ok: true, adventure: accepted.adventure, meta: { durationMs: Date.now() - started, repairUsed: false } });
    }
    const second = await callModel(brain.repairBrief(ctx, accepted.issues || [], accepted.previous), apiKey, model);
    const repaired = brain.accept(second, ctx);
    if (repaired.ok && repaired.adventure) {
      logMeta({ category: "ok", ms: Date.now() - started, repair: true, model: model });
      return json({ ok: true, adventure: repaired.adventure, meta: { durationMs: Date.now() - started, repairUsed: true } });
    }
    logMeta({ category: "invalid", ms: Date.now() - started, repair: true, model: model });
    return json({ ok: false, category: "invalid" });
  } catch (error) {
    const category = (error as { category?: string }).category || "provider";
    logMeta({ category: category, ms: Date.now() - started, repair: false, model: model });
    return json({ ok: false, category: category === "timeout" ? "timeout" : "provider" });
  }
});
