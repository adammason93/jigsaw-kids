const lessonSource = await fetch("https://wondii.co.uk/js/lesson-brain.js?v=53").then((res) => {
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
async function callModel(brief, apiKey, model, timeoutMs, temperature) {
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
        temperature: typeof temperature === "number" ? temperature : 0.4,
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
    if (!activities.length && raw && raw.slots && typeof raw.slots === "object") {
      const check = raw.slots.check || {};
      const apply = raw.slots.apply || {};
      return [
        {
          id: "check",
          questions: [{
            prompt: clip(check.prompt, 180),
            choices: (Array.isArray(check.choices) ? check.choices : []).slice(0, 4).map((choice) => clip(choice, 80)),
            correct: clip(check.correct, 80)
          }]
        },
        {
          id: "apply",
          instruction: clip(apply.instruction),
          knowledgeUsed: clip(apply.knowledgeUsed),
          successCondition: clip(apply.successCondition),
          teachingConnection: clip(apply.teachingConnection)
        }
      ];
    }
    return activities.slice(0, 8).map(function(activity, index) {
      const config = activity && activity.config || {};
      const questions = Array.isArray(config.questions) && config.questions.length ? config.questions : (config.prompt ? [config] : []);
      return {
        id: String(activity && activity.id || index + 1).slice(0, 40),
        mechanic: String(activity && activity.mechanic || "").slice(0, 40),
        minutes: activity && activity.minutes,
        beat: String(activity && activity.scene && activity.scene.beat || activity && activity.beat || "").slice(0, 40),
        questions: questions.slice(0, 4).map(function(item) {
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
  function checkSnapshot(result) {
    const activities = result && result.adventure && result.adventure.activities || result && result.previous && result.previous.activities || [];
    const check = activities.find((activity) => activity && activity.slotId === "check");
    if (!check) return null;
    const config = check.config || {};
    const question = (config.questions && config.questions[0]) || config;
    const questions = Array.isArray(config.questions) && config.questions.length ? config.questions.slice(0, 4) : [question];
    return {
      prompt: clip(question.prompt || config.prompt),
      choices: Array.isArray(question.choices) ? question.choices.slice(0, 4).map((choice) => clip(choice, 80)) : [],
      correct: clip(question.correct || config.correct, 80),
      knowledgeChecked: clip(question.knowledgeChecked || config.knowledgeChecked),
      successEvidence: clip(question.successEvidence || config.successEvidence),
      teachingConnection: clip(question.teachingConnection || config.teachingConnection),
      questions: questions.map((item) => ({
        prompt: clip(item.prompt || config.prompt),
        choices: Array.isArray(item.choices) ? item.choices.slice(0, 4).map((choice) => clip(choice, 80)) : [],
        correct: clip(item.correct || config.correct, 80),
        knowledgeChecked: clip(item.knowledgeChecked || config.knowledgeChecked)
      }))
    };
  }
  function hookLines(result) {
    const activities = result && result.adventure && result.adventure.activities || result && result.previous && result.previous.activities || [];
    const hook = activities.find((activity) => activity && activity.slotId === "hook");
    return hook ? ((hook.config && hook.config.lines) || []).slice(0, 4).map((line) => clip(line, 180)) : [];
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
  function intentMeta(source) {
    const intent = source && source.lessonBrief && source.lessonBrief.teacherIntent || {};
    return {
      ok: !!intent.ok,
      learningGoal: clip(intent.learningGoal, 180),
      requiredEvidence: clip(intent.requiredEvidence, 220),
      focusConcepts: (intent.focusConcepts || []).slice(0, 4),
      priorKnowledge: (intent.priorKnowledge || []).slice(0, 4),
      exclusions: (intent.exclusions || []).slice(0, 4),
      preferences: (intent.preferences || []).slice(0, 4),
      subject: clip(intent.subject, 40),
      subjectConfidence: clip(intent.subjectConfidence, 20),
      durationMinutes: intent.durationMinutes || null
    };
  }
  function slotDiagnostic(trace, checkAlignment, applyAlignment, intent) {
    const check = (trace && trace.finalCheck) || {};
    const apply = (trace && trace.finalApply) || {};
    return {
      requiredEvidence: (intent && intent.requiredEvidence) || "",
      check: {
        prompt: check.prompt || "",
        choices: check.choices || [],
        correct: check.correct || "",
        demonstratedEvidence: checkAlignment.demonstratedEvidence || "",
        coverage: checkAlignment.semanticRelationship || "",
        reason: checkAlignment.semanticReason || ""
      },
      apply: {
        instruction: apply.instruction || "",
        target: apply.target || "",
        knowledgeUsed: apply.knowledgeUsed || "",
        successCondition: apply.successCondition || "",
        teachingConnection: apply.teachingConnection || "",
        semanticOutcome: applyAlignment.semanticOutcome || "",
        reason: applyAlignment.semanticReason || ""
      }
    };
  }
  function stampedWarnings(list) {
    return (Array.isArray(list) ? list : []).map((item) => Object.assign({}, item, { attemptId }));
  }
  let phase = "TEACHER_INTENT";
  try {
    let intentMs = 0;
    try {
      const intentStarted = Date.now();
      const rawIntent = await callModel(brain.teacherIntentBrief(ctx), apiKey, model, 12e3, 0);
      intentMs = Date.now() - intentStarted;
      brain.applyTeacherIntent(ctx, brain.normaliseTeacherIntent(rawIntent, ctx));
    } catch (intentError) {
      brain.applyTeacherIntent(ctx, { ok: false, reason: intentError && intentError.category || "error" });
    }
    logMeta({ stage: "TEACHER_INTENT", attemptId, model, intentMs, teacherIntent: intentMeta(ctx) });
    phase = "PLAN_REQUEST";
    logMeta({ stage: "PLAN_REQUEST", attemptId, repair: false, model, ...requestMeta(ctx) });
    const planStarted = Date.now();
    const firstPlan = await callModel(brain.planBrief(ctx), apiKey, model, 2e4);
    let planMs = Date.now() - planStarted;
    let planned = brain.normalisePlan(firstPlan, Object.assign({}, ctx, { depthRequired: true }));
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
        issues: (planned.issues || []).slice(0, 8),
        firstPass: planned.depth || null
      });
      planRepaired = true;
      const planRepairStarted = Date.now();
      const planRepairBrief = brain.planRepairBrief(ctx, planned.issues || [], planned.previous);
      let repairInstruction = [];
      try { repairInstruction = (JSON.parse(planRepairBrief.user).relationshipRequired || []).slice(0, 6).map((line) => String(line).slice(0, 900)); } catch (_error) { repairInstruction = []; }
      const secondPlan = await callModel(planRepairBrief, apiKey, model, 2e4);
      repairMs += Date.now() - planRepairStarted;
      // breadthSettled marks the repaired breadth choice. normalisePlan still enforces depth-seeking strands.
      planned = brain.normalisePlan(secondPlan, Object.assign({}, ctx, { depthRequired: true, breadthSettled: true }));
      logMeta({ stage: "PLAN_REPAIR", attemptId, model, ok: !!planned.ok, repairInstruction, repaired: planned.depth || null, issues: (planned.issues || []).slice(0, 8) });
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
        return json({ ok: false, category: "invalid", stage: "EDUCATIONAL_VALIDATION_FAILED", meta: { teacherIntent: intentMeta(ctx) } });
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
    const skeleton = brain.planBeats(
      brain.lessonSkeleton(planned.plan, withStory),
      planned.plan,
      ctx.yearGroup || planned.plan.yearGroup || (ctx.yearAssumed ? ctx.yearAssumption : "")
    );
    const framed = Object.assign({}, withStory, { lessonSkeleton: skeleton });
    const learningMap = brain.learningMapReport(planned.plan, skeleton, ctx);
    logMeta({ stage: "LEARNING_MAP", attemptId, model, ...learningMap });
    try {
      const teachingPlan = typeof brain.teachingPlanReport === "function" ? brain.teachingPlanReport(planned.plan, skeleton, ctx) : null;
      if (teachingPlan) logMeta({ stage: "TEACHING_PLAN", attemptId, model, ...teachingPlan });
    } catch (error) {
      logMeta({ stage: "TEACHING_PLAN", attemptId, model, error: "report-failed" });
    }
    phase = "CONTENT_REQUEST";
    logMeta({ stage: "CONTENT_REQUEST", attemptId, repair: false, model, planMs, storyMs, arc: arcMeta(planned.plan) });
    const contentStarted = Date.now();
    const first = await callModel(brain.contentBrief(framed, planned.plan, storyPlan), apiKey, model, 28e3);
    const contentMs = Date.now() - contentStarted;
    logMeta({ stage: "CONTENT_VALIDATE", attemptId, repair: false, model, contentMs, contentBeats: brain.boundedBeatLog(first) });
    let repairUser = null;
    let repairRaw = null;
    const resolved = await brain.resolveLessonContent(first, framed, {
      judge: async (input) => {
        const judgeStarted = Date.now();
        try {
          const payload = await callModel(brain.applySemanticBrief(input), apiKey, model, 12e3, 0);
          const parsed = brain.parseApplySemantic(payload);
          return { ok: parsed.ok, relationship: parsed.relationship, reason: parsed.reason, ms: Date.now() - judgeStarted };
        } catch (error) {
          return { ok: false, relationship: null, reason: error && error.category || "error", ms: Date.now() - judgeStarted };
        }
      },
      checkJudge: async (input) => {
        const judgeStarted = Date.now();
        try {
          const evidencePayload = await callModel(brain.checkEvidenceBrief(input), apiKey, model, 12e3, 0);
          const evidence = brain.parseCheckEvidence(evidencePayload);
          if (!evidence.ok) return { ok: false, coverage: null, reason: "malformed", ms: Date.now() - judgeStarted };
          const coveragePayload = await callModel(brain.checkCoverageBrief({
            requiredEvidence: input && input.requiredEvidence,
            demonstratedEvidence: evidence.demonstratedEvidence
          }), apiKey, model, 12e3, 0);
          const coverage = brain.parseCheckCoverage(coveragePayload);
          if (!coverage.ok) return { ok: false, coverage: null, reason: "malformed", ms: Date.now() - judgeStarted };
          return {
            ok: true,
            coverage: coverage.coverage,
            reason: coverage.reason,
            demonstratedEvidence: evidence.demonstratedEvidence,
            ms: Date.now() - judgeStarted
          };
        } catch (error) {
          return { ok: false, coverage: null, reason: error && error.category || "error", ms: Date.now() - judgeStarted };
        }
      },
      repair: async (accepted) => {
        const repairBrief = brain.slotRepairBrief(framed, accepted.slotIds || [], accepted.issues || [], accepted.previous);
        repairUser = JSON.parse(repairBrief.user);
        const slotStarted = Date.now();
        repairRaw = await callModel(repairBrief, apiKey, model, 28e3);
        repairMs += Date.now() - slotStarted;
        logMeta({ stage: "CONTENT_REPAIR", attemptId, repair: true, model, repairBeats: brain.boundedBeatLog(repairRaw) });
        return repairRaw;
      }
    });
    const applyAlignment = resolved.applyAlignment || {};
    logMeta({
      stage: "APPLY_ALIGNMENT",
      attemptId,
      model,
      deterministicStatus: applyAlignment.deterministicStatus || "",
      deterministicReason: applyAlignment.deterministicReason || "",
      semanticJudgeUsed: !!applyAlignment.semanticJudgeUsed,
      semanticRelationship: applyAlignment.semanticRelationship || "",
      semanticOutcome: applyAlignment.semanticOutcome || "",
      semanticMs: applyAlignment.semanticMs,
      semanticCalls: applyAlignment.semanticCalls || 0
    });
    const checkAlignment = resolved.checkAlignment || {};
    logMeta({
      stage: "CHECK_ALIGNMENT",
      attemptId,
      model,
      deterministicStatus: checkAlignment.deterministicStatus || "",
      deterministicReason: checkAlignment.deterministicReason || "",
      semanticJudgeUsed: !!checkAlignment.semanticJudgeUsed,
      semanticRelationship: checkAlignment.semanticRelationship || "",
      semanticOutcome: checkAlignment.semanticOutcome || "",
      semanticMs: checkAlignment.semanticMs,
      semanticCalls: checkAlignment.semanticCalls || 0
    });
    if (resolved.structuralOk === false && !resolved.repairUsed) {
      logMeta({
        stage: "STRUCTURAL_VALIDATION_FAILED",
        category: "invalid",
        repair: false,
        model,
        attemptId,
        issues: (resolved.issues || []).slice(0, 8),
        output: digest(first)
      });
      return json({ ok: false, category: "invalid", stage: "STRUCTURAL_VALIDATION_FAILED", issues: (resolved.issues || []).slice(0, 8), meta: { structuralOk: false, repairKind: "none", repairUsed: false, applyAlignment, checkAlignment, teacherIntent: intentMeta(ctx) } });
    }
    const routeMeta = { planFirstPass: !planRepaired, planRepaired, storyFirstPass, storyRepaired, storyFallback, applyAlignment, checkAlignment, teacherIntent: intentMeta(ctx) };
    const repairedSlots = resolved.repairedSlots || [];
    const applyRepair = repairedSlots.indexOf("apply") !== -1;
    const durationRepair = repairedSlots.some((id) => id !== "apply");
    const trace = diagnosis(first, resolved, skeleton, {
      repairModelApply: applyModel(repairRaw),
      repairSlots: repairRaw && repairRaw.slots ? Object.keys(repairRaw.slots) : [],
      repairSpecs: ((repairUser && repairUser.slotsToRewrite) || []).map((spec) => ({ slotType: spec.slotType, failure: spec.failure || [] })),
      repairHook: slotModel(repairRaw, "hook"),
      finalHook: hookLines(resolved),
      finalApply: applyActivity(resolved),
      finalCheck: checkSnapshot(resolved),
      finalIssues: (resolved.issues || []).slice(0, 8),
      applyAlignment,
      checkAlignment
    });
    const intentRecord = intentMeta(ctx);
    const diagnostic = slotDiagnostic(trace, checkAlignment, applyAlignment, intentRecord);
    const qualityWarnings = stampedWarnings(resolved.qualityWarnings);
    if (resolved.ok && resolved.adventure) {
      const timing = { durationMs: Date.now() - started, planMs, storyMs, contentMs, repairMs, repairUsed: !!resolved.repairUsed, repairKind: resolved.repairUsed ? "slot" : "none", structuralOk: true, planRepaired, storyFallback, storyFirstPass, storyRepaired, repairedSlots, applyRepair, durationRepair, applyAlignment, checkAlignment, teacherIntent: intentRecord, qualityWarnings, slotDiagnostic: diagnostic, diagnosis: trace, learningMap };
      logMeta({ stage: "COMPLETE", category: "ok", ms: timing.durationMs, repair: !!resolved.repairUsed, repairKind: timing.repairKind, structuralOk: true, planRepaired, model, attemptId, planMs, contentMs, repairMs, applyRepair, durationRepair, semanticOutcome: applyAlignment.semanticOutcome || "", qualityWarnings, slotDiagnostic: diagnostic });
      return json({ ok: true, adventure: resolved.adventure, stage: "COMPLETE", meta: timing });
    }
    const stage = resolved.structuralOk === false ? "STRUCTURAL_VALIDATION_FAILED" : failStage(resolved.issues || []);
    logMeta({
      stage,
      category: "invalid",
      ms: Date.now() - started,
      repair: !!resolved.repairUsed,
      model,
      attemptId,
      structuralOk: resolved.structuralOk !== false,
      issues: (resolved.issues || []).slice(0, 8),
      pupilBeatDiagnostics: (resolved.pupilBeatDiagnostics || []).slice(0, 12),
      repairAction: resolved.repairUsed ? "slot" : "none",
      semanticOutcome: applyAlignment.semanticOutcome || "",
      qualityWarnings,
      slotDiagnostic: diagnostic,
      output: digest(repairRaw || first)
    });
    return json({ ok: false, category: "invalid", stage, issues: (resolved.issues || []).slice(0, 8), meta: { structuralOk: resolved.structuralOk !== false, repairKind: resolved.repairUsed ? "slot" : "none", repairUsed: !!resolved.repairUsed, repairedSlots, applyRepair, durationRepair, ...routeMeta, qualityWarnings, pupilBeatDiagnostics: (resolved.pupilBeatDiagnostics || []).slice(0, 12), slotDiagnostic: diagnostic, diagnosis: trace } });
  } catch (error) {
    const category = error.category || "provider";
    const stage = category === "parse" ? phase === "PLAN_REQUEST" ? "PLAN_PARSE" : phase === "STORY_REQUEST" ? "STORY_PARSE" : "CONTENT_PARSE" : category === "timeout" ? phase : "AI_REQUEST_FAILED";
    logMeta({ stage, category, ms: Date.now() - started, repair: false, model, attemptId });
    return json({ ok: false, category: category === "timeout" ? "timeout" : category === "parse" ? "invalid" : "provider", stage });
  }
};
