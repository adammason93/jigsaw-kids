import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../../../js/lesson-brain.js";

const brain = (globalThis as { WondiiLessonBrain?: LessonBrain }).WondiiLessonBrain;

type LessonBrain = {
  forModel: (ctx: Record<string, unknown>) => Record<string, unknown>;
  planBrief: (ctx: Record<string, unknown>) => { system: string; user: string };
  planRepairBrief: (ctx: Record<string, unknown>, issues: string[], previous: unknown) => { system: string; user: string };
  contentBrief: (ctx: Record<string, unknown>, plan: unknown, story?: unknown) => { system: string; user: string };
  storyBrief: (ctx: Record<string, unknown>, plan: unknown) => { system: string; user: string };
  storyRepairBrief: (ctx: Record<string, unknown>, issues: string[], previous: unknown) => { system: string; user: string };
  normaliseStory: (raw: unknown, ctx: Record<string, unknown>) => { ok: boolean; issues?: string[]; previous?: unknown; story?: Record<string, unknown> };
  storyFromPlan: (plan: unknown, ctx: Record<string, unknown>) => Record<string, unknown>;
  normalisePlan: (raw: unknown, ctx: Record<string, unknown>) => { ok: boolean; issues?: string[]; previous?: unknown; plan?: Record<string, unknown> };
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

async function callModel(brief: { system: string; user: string }, apiKey: string, model: string, timeoutMs?: number): Promise<unknown> {
  const control = new AbortController();
  const timer = setTimeout(function () { control.abort(); }, timeoutMs || 20000);
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
    try {
      return JSON.parse(text);
    } catch (_parseError) {
      const invalid = new Error("parse") as Error & { category?: string };
      invalid.category = "parse";
      throw invalid;
    }
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
  let body: { context?: Record<string, unknown>; attemptId?: string };
  try {
    body = await req.json();
  } catch (_error) {
    logMeta({ stage: "JSON_PARSE_FAILED", category: "invalid", ms: Date.now() - started });
    return json({ ok: false, category: "invalid", stage: "JSON_PARSE_FAILED" }, 400);
  }
  const ctx = body && body.context && typeof body.context === "object" ? body.context : null;
  const orgId = String(ctx && ctx.organisationId || "");
  const lesson = String(ctx && (ctx.lessonText || ctx.teacherInstructions) || "").trim();
  const attemptId = String(body && body.attemptId || "").slice(0, 40);
  if (!ctx || !orgId || lesson.length < 12) return json({ ok: false, category: "invalid", stage: "INTERPRETING_BRIEF" }, 400);
  const userId = await teacherAllowed(orgId, auth, anon, base);
  if (!userId) return json({ ok: false, category: "unauthorised", stage: "INTERPRETING_BRIEF" }, 401);
  function digest(raw: unknown) {
    const activities = raw && typeof raw === "object" && Array.isArray((raw as { activities?: unknown[] }).activities)
      ? (raw as { activities: Array<Record<string, unknown>> }).activities
      : [];
    return activities.slice(0, 8).map(function (activity) {
      return {
        mechanic: String(activity && activity.mechanic || "").slice(0, 40),
        minutes: activity && activity.minutes,
        title: String(activity && activity.title || "").slice(0, 80),
        beat: String((activity && activity.scene && (activity.scene as { beat?: string }).beat) || activity && (activity as { beat?: string }).beat || "").slice(0, 40)
      };
    });
  }
  function failStage(issues: string[]) {
    const text = (issues || []).join(" ");
    if (/correct answer|no real question|needs three|needs a reveal|door number|needs something|no activities|not valid structured/.test(text)) return "SCHEMA_VALIDATION_FAILED";
    return "EDUCATIONAL_VALIDATION_FAILED";
  }
  let phase = "PLAN_REQUEST";
  try {
    logMeta({ stage: "PLAN_REQUEST", attemptId: attemptId, repair: false, model: model });
    const planStarted = Date.now();
    const firstPlan = await callModel(brain.planBrief(ctx), apiKey, model, 20000);
    let planMs = Date.now() - planStarted;
    let planned = brain.normalisePlan(firstPlan, ctx);
    let planRepaired = false;
    let repairMs = 0;
    if (!planned.ok) {
      logMeta({
        stage: "PLAN_VALIDATE",
        category: "invalid",
        repair: true,
        model: model,
        attemptId: attemptId,
        planMs: planMs,
        issues: (planned.issues || []).slice(0, 8)
      });
      planRepaired = true;
      const planRepairStarted = Date.now();
      const secondPlan = await callModel(brain.planRepairBrief(ctx, planned.issues || [], planned.previous), apiKey, model, 20000);
      repairMs += Date.now() - planRepairStarted;
      planned = brain.normalisePlan(secondPlan, ctx);
      if (!planned.ok) {
        logMeta({
          stage: "EDUCATIONAL_VALIDATION_FAILED",
          category: "invalid",
          ms: Date.now() - started,
          repair: true,
          model: model,
          attemptId: attemptId,
          issues: (planned.issues || []).slice(0, 8)
        });
        return json({ ok: false, category: "invalid", stage: "EDUCATIONAL_VALIDATION_FAILED" });
      }
    }
    const withPlan = Object.assign({}, ctx, { lessonPlan: planned.plan });
    phase = "STORY_REQUEST";
    let storyMs = 0;
    let storyPlan: Record<string, unknown> = brain.storyFromPlan(planned.plan, withPlan);
    let storyFallback = false;
    try {
      logMeta({ stage: "STORY_REQUEST", attemptId: attemptId, repair: false, model: model, planMs: planMs });
      const storyStarted = Date.now();
      const firstStory = await callModel(brain.storyBrief(withPlan, planned.plan), apiKey, model, 18000);
      storyMs = Date.now() - storyStarted;
      let story = brain.normaliseStory(firstStory, withPlan);
      if (!story.ok) {
        logMeta({ stage: "STORY_VALIDATE", category: "invalid", repair: true, model: model, attemptId: attemptId, storyMs: storyMs, issues: (story.issues || []).slice(0, 8) });
        const storyRepairStarted = Date.now();
        const secondStory = await callModel(brain.storyRepairBrief(withPlan, story.issues || [], story.previous), apiKey, model, 18000);
        const storyRepairMs = Date.now() - storyRepairStarted;
        storyMs += storyRepairMs;
        repairMs += storyRepairMs;
        story = brain.normaliseStory(secondStory, withPlan);
      }
      if (story.ok && story.story) storyPlan = story.story;
      else {
        storyFallback = true;
        storyPlan = brain.storyFromPlan(planned.plan, withPlan);
        logMeta({ stage: "STORY_FALLBACK", attemptId: attemptId, model: model, storyMs: storyMs, issues: (story.issues || []).slice(0, 8) });
      }
    } catch (storyError) {
      storyFallback = true;
      storyPlan = brain.storyFromPlan(planned.plan, withPlan);
      const storyCategory = (storyError as { category?: string }).category || "provider";
      logMeta({ stage: "STORY_FALLBACK", category: storyCategory, attemptId: attemptId, model: model, storyMs: storyMs });
    }
    const withStory = Object.assign({}, withPlan, { storyPlan: storyPlan });
    phase = "CONTENT_REQUEST";
    logMeta({ stage: "CONTENT_REQUEST", attemptId: attemptId, repair: false, model: model, planMs: planMs, storyMs: storyMs });
    const contentStarted = Date.now();
    const first = await callModel(brain.contentBrief(withStory, planned.plan, storyPlan), apiKey, model, 28000);
    const contentMs = Date.now() - contentStarted;
    logMeta({ stage: "CONTENT_VALIDATE", attemptId: attemptId, repair: false, model: model, contentMs: contentMs });
    const accepted = brain.accept(first, withStory);
    if (accepted.ok && accepted.adventure) {
      const timing = { durationMs: Date.now() - started, planMs: planMs, storyMs: storyMs, contentMs: contentMs, repairMs: repairMs, repairUsed: planRepaired, storyFallback: storyFallback };
      logMeta({ stage: "COMPLETE", category: "ok", ms: timing.durationMs, repair: planRepaired, model: model, attemptId: attemptId, planMs: planMs, contentMs: contentMs, repairMs: repairMs });
      return json({ ok: true, adventure: accepted.adventure, stage: "COMPLETE", meta: timing });
    }
    logMeta({
      stage: failStage(accepted.issues || []),
      category: "invalid",
      repair: false,
      model: model,
      attemptId: attemptId,
      issues: (accepted.issues || []).slice(0, 8),
      output: digest(first)
    });
    logMeta({ stage: "CONTENT_VALIDATE", attemptId: attemptId, repair: false, model: model, issues: (accepted.issues || []).slice(0, 8) });
    logMeta({ stage: "CONTENT_REQUEST", attemptId: attemptId, repair: true, model: model });
    const contentRepairStarted = Date.now();
    const second = await callModel(brain.repairBrief(withStory, accepted.issues || [], accepted.previous), apiKey, model, 28000);
    repairMs += Date.now() - contentRepairStarted;
    logMeta({ stage: "CONTENT_VALIDATE", attemptId: attemptId, repair: true, model: model, repairMs: repairMs });
    const repaired = brain.accept(second, withStory);
    if (repaired.ok && repaired.adventure) {
      const timing = { durationMs: Date.now() - started, planMs: planMs, storyMs: storyMs, contentMs: contentMs, repairMs: repairMs, repairUsed: true, storyFallback: storyFallback };
      logMeta({ stage: "COMPLETE", category: "ok", ms: timing.durationMs, repair: true, model: model, attemptId: attemptId, planMs: planMs, contentMs: contentMs, repairMs: repairMs });
      return json({ ok: true, adventure: repaired.adventure, stage: "COMPLETE", meta: timing });
    }
    const stage = failStage(repaired.issues || []);
    logMeta({
      stage: stage,
      category: "invalid",
      ms: Date.now() - started,
      repair: true,
      model: model,
      attemptId: attemptId,
      issues: (repaired.issues || []).slice(0, 8),
      output: digest(second)
    });
    return json({ ok: false, category: "invalid", stage: stage });
  } catch (error) {
    const category = (error as { category?: string }).category || "provider";
    const stage = category === "parse"
      ? (phase === "PLAN_REQUEST" ? "PLAN_PARSE" : (phase === "STORY_REQUEST" ? "STORY_PARSE" : "CONTENT_PARSE"))
      : (category === "timeout" ? phase : "AI_REQUEST_FAILED");
    logMeta({ stage: stage, category: category, ms: Date.now() - started, repair: false, model: model, attemptId: attemptId });
    return json({ ok: false, category: category === "timeout" ? "timeout" : (category === "parse" ? "invalid" : "provider"), stage: stage });
  }
});
