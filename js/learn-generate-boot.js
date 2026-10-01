const lessonSource = await fetch("https://wondii.co.uk/js/lesson-brain.js?v=30").then((res) => {
  if (!res.ok) throw new Error("lesson_script");
  return res.text();
});
(0, eval)(lessonSource);
const brain = globalThis.WondiiLessonBrain;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store"
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
function logMeta(meta) {
  console.log(JSON.stringify({ event: "learn-generate", ...meta }));
}
async function teacherAllowed(orgId, auth, apiKey, base) {
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
async function callModel(brief, apiKey, model, timeoutMs) {
  const control = new AbortController();
  const timer = setTimeout(function() {
    control.abort();
  }, timeoutMs || 2e4);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: control.signal,
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: brief.system },
          { role: "user", content: brief.user }
        ]
      })
    });
    if (!response.ok) {
      const failed = new Error("provider");
      failed.category = response.status === 408 ? "timeout" : "provider";
      throw failed;
    }
    const payload = await response.json();
    const text = String(payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "");
    try {
      return JSON.parse(text);
    } catch (_parseError) {
      const invalid = new Error("parse");
      invalid.category = "parse";
      throw invalid;
    }
  } catch (error) {
    const named = error;
    if (named && named.category) throw error;
    const wrapped = new Error("model");
    wrapped.category = named && named.name === "AbortError" ? "timeout" : "provider";
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}
globalThis.handleGenerate = async (req) => {
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
  let body;
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
  function requestMeta(source) {
    const brief = source && source.lessonBrief || {};
    return {
      topic: String(source && source.topic || brief.topic || "").slice(0, 120),
      year: String(source && source.yearGroup || brief.yearGroup || "").slice(0, 20),
      minutes: source && source.requestedMinutes,
      lessonChars: String(source && source.lessonText || "").length
    };
  }
  function arcMeta(plan) {
    const arc = plan && Array.isArray(plan.lessonArc) ? plan.lessonArc : [];
    return arc.map(function(stage) {
      return String(stage && stage.purpose || "").slice(0, 24);
    });
  }
  function digest(raw) {
    const activities = raw && typeof raw === "object" && Array.isArray(raw.activities) ? raw.activities : [];
    return activities.slice(0, 8).map(function(activity, index) {
      const config = activity && activity.config || {};
      const questions = Array.isArray(config.questions) && config.questions.length ? config.questions : (config.prompt ? [config] : []);
      return {
        id: String(activity && activity.id || index + 1).slice(0, 40),
        mechanic: String(activity && activity.mechanic || "").slice(0, 40),
        minutes: activity && activity.minutes,
        beat: String(activity && activity.scene && activity.scene.beat || activity && activity.beat || "").slice(0, 40),
        questions: questions.slice(0, 3).map(function(item) {
          return {
            prompt: String(item && item.prompt || "").slice(0, 180),
            choices: (item && item.choices || []).slice(0, 4).map(function(choice) { return String(choice).slice(0, 80); }),
            correct: String(item && item.correct || "").slice(0, 80)
          };
        })
      };
    });
  }
  function clip(value, max) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max || 220);
  }
  function applyModel(raw) {
    const slot = raw && raw.slots && raw.slots.apply;
    if (!slot || typeof slot !== "object") return null;
    return {
      instruction: clip(slot.instruction),
      target: clip(slot.target, 80),
      knowledgeUsed: clip(slot.knowledgeUsed),
      successCondition: clip(slot.successCondition),
      teachingConnection: clip(slot.teachingConnection),
      lines: Array.isArray(slot.lines) ? slot.lines.slice(0, 3).map((line) => clip(line, 180)) : []
    };
  }
  function slotModel(raw, id) {
    const slot = raw && raw.slots && raw.slots[id];
    if (!slot || typeof slot !== "object") return null;
    return {
      instruction: clip(slot.instruction),
      lines: Array.isArray(slot.lines) ? slot.lines.slice(0, 4).map((line) => clip(line, 180)) : [],
      prompt: clip(slot.prompt),
      correct: clip(slot.correct, 120),
      knowledgeUsed: clip(slot.knowledgeUsed)
    };
  }
  function applyActivity(result) {
    const activities = result && result.adventure && result.adventure.activities || result && result.previous && result.previous.activities || [];
    const apply = activities.find((activity) => activity && activity.slotId === "apply");
    if (!apply) return null;
    const interaction = apply.scene && apply.scene.interaction || {};
    return {
      mechanic: clip(apply.mechanic, 40),
      instruction: clip(apply.applyInstruction || interaction.instruction || ((apply.config && apply.config.lines) || []).join(" ")),
      target: clip(interaction.target, 80),
      interactionType: clip(apply.learningInteraction && apply.learningInteraction.type, 40),
      knowledgeUsed: clip(apply.knowledgeUsed),
      successCondition: clip(apply.successCondition),
      teachingConnection: clip(apply.teachingConnection),
      lines: ((apply.config && apply.config.lines) || []).slice(0, 3).map((line) => clip(line, 180))
    };
  }
  function diagnosis(raw, result, skeleton, extra) {
    const applySlot = (skeleton || []).find((slot) => slot.id === "apply") || {};
    const slotIds = result && result.slotIds || [];
    return {
      modelSlots: raw && raw.slots && typeof raw.slots === "object" ? Object.keys(raw.slots) : [],
      modelApply: applyModel(raw),
      failedSlots: slotIds.map((id) => ({ id, model: slotModel(raw, id) })),
      materialisedApply: applyActivity(result),
      requiredKnowledge: (applySlot.requiredKnowledge || []).slice(0, 6).map((item) => clip(item, 180)),
      interactionFamily: clip(applySlot.interactionIntent, 40),
      mechanic: clip(applySlot.mechanic, 40),
      issues: (result && result.issues || []).slice(0, 8),
      slotIds,
      ...(extra || {})
    };
  }
  function failStage(issues) {
    const text = (issues || []).join(" ");
    if (/correct answer|no real question|needs three|needs a reveal|door number|needs something|no activities|not valid structured/.test(text)) return "SCHEMA_VALIDATION_FAILED";
    return "EDUCATIONAL_VALIDATION_FAILED";
  }
  let phase = "PLAN_REQUEST";
  try {
    logMeta({ stage: "PLAN_REQUEST", attemptId, repair: false, model, ...requestMeta(ctx) });
    const planStarted = Date.now();
    const firstPlan = await callModel(brain.planBrief(ctx), apiKey, model, 2e4);
    let planMs = Date.now() - planStarted;
    let planned = brain.normalisePlan(firstPlan, ctx);
    let planRepaired = false;
    let repairMs = 0;
    if (!planned.ok) {
      logMeta({
        stage: "PLAN_VALIDATE",
        category: "invalid",
        repair: true,
        model,
        attemptId,
        planMs,
        issues: (planned.issues || []).slice(0, 8)
      });
      planRepaired = true;
      const planRepairStarted = Date.now();
      const secondPlan = await callModel(brain.planRepairBrief(ctx, planned.issues || [], planned.previous), apiKey, model, 2e4);
      repairMs += Date.now() - planRepairStarted;
      planned = brain.normalisePlan(secondPlan, ctx);
      if (!planned.ok) {
        logMeta({
          stage: "EDUCATIONAL_VALIDATION_FAILED",
          category: "invalid",
          ms: Date.now() - started,
          repair: true,
          model,
          attemptId,
          issues: (planned.issues || []).slice(0, 8)
        });
        return json({ ok: false, category: "invalid", stage: "EDUCATIONAL_VALIDATION_FAILED" });
      }
    }
    const withPlan = Object.assign({}, ctx, { lessonPlan: planned.plan });
    phase = "STORY_REQUEST";
    let storyMs = 0;
    let storyPlan = brain.storyFromPlan(planned.plan, withPlan);
    let storyFallback = false;
    let storyFirstPass = false;
    let storyRepaired = false;
    try {
      logMeta({ stage: "STORY_REQUEST", attemptId, repair: false, model, planMs });
      const storyStarted = Date.now();
      const firstStory = await callModel(brain.storyBrief(withPlan, planned.plan), apiKey, model, 18e3);
      storyMs = Date.now() - storyStarted;
      let story = brain.normaliseStory(firstStory, withPlan);
      if (story.ok) storyFirstPass = true;
      if (!story.ok) {
        storyRepaired = true;
        logMeta({ stage: "STORY_VALIDATE", category: "invalid", repair: true, model, attemptId, storyMs, issues: (story.issues || []).slice(0, 8) });
        const storyRepairStarted = Date.now();
        const secondStory = await callModel(brain.storyRepairBrief(withPlan, story.issues || [], story.previous), apiKey, model, 18e3);
        const storyRepairMs = Date.now() - storyRepairStarted;
        storyMs += storyRepairMs;
        repairMs += storyRepairMs;
        story = brain.normaliseStory(secondStory, withPlan);
      }
      if (story.ok && story.story) storyPlan = story.story;
      else {
        storyFallback = true;
        storyPlan = brain.storyFromPlan(planned.plan, withPlan);
        logMeta({ stage: "STORY_FALLBACK", attemptId, model, storyMs, issues: (story.issues || []).slice(0, 8) });
      }
    } catch (storyError) {
      storyFallback = true;
      storyPlan = brain.storyFromPlan(planned.plan, withPlan);
      const storyCategory = storyError.category || "provider";
      logMeta({ stage: "STORY_FALLBACK", category: storyCategory, attemptId, model, storyMs });
    }
    const withStory = Object.assign({}, withPlan, { storyPlan });
    const skeleton = brain.lessonSkeleton(planned.plan, withStory);
    const framed = Object.assign({}, withStory, { lessonSkeleton: skeleton });
    phase = "CONTENT_REQUEST";
    logMeta({ stage: "CONTENT_REQUEST", attemptId, repair: false, model, planMs, storyMs, arc: arcMeta(planned.plan) });
    const contentStarted = Date.now();
    const first = await callModel(brain.contentBrief(framed, planned.plan, storyPlan), apiKey, model, 28e3);
    const contentMs = Date.now() - contentStarted;
    logMeta({ stage: "CONTENT_VALIDATE", attemptId, repair: false, model, contentMs });
    const accepted = brain.accept(first, framed);
    if (accepted.structuralOk === false) {
      logMeta({
        stage: "STRUCTURAL_VALIDATION_FAILED",
        category: "invalid",
        repair: false,
        model,
        attemptId,
        issues: (accepted.issues || []).slice(0, 8),
        output: digest(first)
      });
      return json({ ok: false, category: "invalid", stage: "STRUCTURAL_VALIDATION_FAILED", issues: (accepted.issues || []).slice(0, 8), meta: { structuralOk: false, repairKind: "none", repairUsed: false } });
    }
    const routeMeta = { planFirstPass: !planRepaired, planRepaired, storyFirstPass, storyRepaired, storyFallback };
    if (accepted.ok && accepted.adventure) {
      const timing = { durationMs: Date.now() - started, planMs, storyMs, contentMs, repairMs, repairUsed: false, repairKind: "none", structuralOk: true, planRepaired, storyFallback, storyFirstPass, storyRepaired, repairedSlots: [], applyRepair: false, durationRepair: false, diagnosis: diagnosis(first, accepted, skeleton, { repairModelApply: null, finalApply: applyActivity(accepted) }) };
      logMeta({ stage: "COMPLETE", category: "ok", ms: timing.durationMs, repair: false, repairKind: "none", structuralOk: true, planRepaired, model, attemptId, planMs, contentMs, repairMs });
      return json({ ok: true, adventure: accepted.adventure, stage: "COMPLETE", meta: timing });
    }
    logMeta({
      stage: failStage(accepted.issues || []),
      category: "invalid",
      repair: false,
      model,
      attemptId,
      structuralOk: true,
      issues: (accepted.issues || []).slice(0, 8),
      slotIds: accepted.slotIds || [],
      output: digest(first)
    });
    logMeta({ stage: "CONTENT_VALIDATE", attemptId, repair: false, model, issues: (accepted.issues || []).slice(0, 8) });
    logMeta({ stage: "CONTENT_REQUEST", attemptId, repair: true, model, repairAction: "slot", slotIds: accepted.slotIds || [] });
    const slotStarted = Date.now();
    const second = await callModel(brain.slotRepairBrief(framed, accepted.slotIds || [], accepted.issues || [], accepted.previous), apiKey, model, 28e3);
    repairMs += Date.now() - slotStarted;
    logMeta({ stage: "CONTENT_VALIDATE", attemptId, repair: true, model, repairMs, repairAction: "slot" });
    const repairedSlots = accepted.slotIds || [];
    const applyRepair = repairedSlots.indexOf("apply") !== -1;
    const durationRepair = repairedSlots.some((id) => id !== "apply");
    const repaired = brain.accept(brain.mergeSlotContent(accepted.previous, second), framed);
    const trace = diagnosis(first, accepted, skeleton, { repairModelApply: applyModel(second), repairSlots: second && second.slots ? Object.keys(second.slots) : [], finalApply: applyActivity(repaired), finalIssues: (repaired.issues || []).slice(0, 8) });
    if (repaired.ok && repaired.adventure) {
      const timing = { durationMs: Date.now() - started, planMs, storyMs, contentMs, repairMs, repairUsed: true, repairKind: "slot", structuralOk: repaired.structuralOk !== false, storyFallback, storyFirstPass, storyRepaired, repairedSlots, applyRepair, durationRepair, diagnosis: trace };
      logMeta({ stage: "COMPLETE", category: "ok", ms: timing.durationMs, repair: true, repairKind: "slot", structuralOk: true, model, attemptId, planMs, contentMs, repairMs, applyRepair, durationRepair });
      return json({ ok: true, adventure: repaired.adventure, stage: "COMPLETE", meta: timing });
    }
    const stage = repaired.structuralOk === false ? "STRUCTURAL_VALIDATION_FAILED" : failStage(repaired.issues || []);
    logMeta({
      stage,
      category: "invalid",
      ms: Date.now() - started,
      repair: true,
      model,
      attemptId,
      structuralOk: repaired.structuralOk !== false,
      issues: (repaired.issues || []).slice(0, 8),
      repairAction: "slot",
      output: digest(second)
    });
    return json({ ok: false, category: "invalid", stage, issues: (repaired.issues || []).slice(0, 8), meta: { structuralOk: repaired.structuralOk !== false, repairKind: "slot", repairUsed: true, repairedSlots, applyRepair, durationRepair, ...routeMeta, diagnosis: trace } });
  } catch (error) {
    const category = error.category || "provider";
    const stage = category === "parse" ? phase === "PLAN_REQUEST" ? "PLAN_PARSE" : phase === "STORY_REQUEST" ? "STORY_PARSE" : "CONTENT_PARSE" : category === "timeout" ? phase : "AI_REQUEST_FAILED";
    logMeta({ stage, category, ms: Date.now() - started, repair: false, model, attemptId });
    return json({ ok: false, category: category === "timeout" ? "timeout" : category === "parse" ? "invalid" : "provider", stage });
  }
};
