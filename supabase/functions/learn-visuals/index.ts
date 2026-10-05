import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../../../js/visual-adventure.js";

type VisualApi = {
  PROTOTYPE: string;
  MODEL: string;
  SIZE: string;
  visualsEnabled: (request: Record<string, unknown>) => boolean;
  volcanoPrototype: () => Record<string, unknown>;
  defineCharacters: (story: unknown, year: number) => unknown[];
  defineExperienceCharacters: (year: number) => unknown[];
  planVisualAssets: (adventure: Record<string, unknown>) => Array<Record<string, unknown>>;
  buildVisualPrompt: (adventure: Record<string, unknown>, asset: Record<string, unknown>, characters: unknown[]) => string;
  buildExperiencePrompt: (adventure: Record<string, unknown>, asset: Record<string, unknown>, characters: unknown[]) => string;
  buildCharacterSheetPrompt: (characters: unknown[]) => string;
  visualsAllowed: (request: Record<string, unknown>) => boolean;
  charactersForAdventure: (adventure: Record<string, unknown>) => unknown[];
  buildAdventurePrompt: (adventure: Record<string, unknown>, asset: Record<string, unknown>, characters: unknown[]) => string;
  PROTOTYPE_98B: string;
  volcanoExperience: () => Record<string, unknown>;
  diversityIssues: (assets: Array<Record<string, unknown>>) => string[];
  PROTOTYPE_98A: string;
  hashBrief: (text: string) => string;
  attachResult: (adventure: Record<string, unknown>, asset: Record<string, unknown>, result: Record<string, unknown>) => Record<string, unknown>;
};

const visuals = (globalThis as { WondiiVisualAdventure?: VisualApi }).WondiiVisualAdventure;
const BUCKET = "wondii_adventure_visuals";
const MODEL = "gpt-image-2.5-sunburst";
const SIZE = "1536x864";
const QUALITY = "high";

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

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (raw) {
    try {
      const dict = JSON.parse(raw) as Record<string, string>;
      if (dict.default) return dict.default.trim();
      for (const value of Object.values(dict)) {
        if (typeof value === "string" && value.length > 20) return value.trim();
      }
    } catch (_error) { /* fall through */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

function openAiHeaders(apiKey: string, jsonBody: boolean): Record<string, string> {
  const headers: Record<string, string> = { Authorization: "Bearer " + apiKey };
  const org = Deno.env.get("OPENAI_ORGANIZATION")?.trim();
  if (org) headers["OpenAI-Organization"] = org;
  if (jsonBody) headers["Content-Type"] = "application/json";
  return headers;
}

async function teacherAllowed(orgId: string, auth: string, apiKey: string, base: string): Promise<boolean> {
  const userRes = await fetch(base + "/auth/v1/user", { headers: { Authorization: auth, apikey: apiKey } });
  if (!userRes.ok) return false;
  const user = await userRes.json() as { id?: string };
  if (!user.id) return false;
  const query = new URL(base + "/rest/v1/organisation_members");
  query.searchParams.set("user_id", "eq." + user.id);
  query.searchParams.set("organisation_id", "eq." + orgId);
  query.searchParams.set("select", "role,status");
  const member = await fetch(query.toString(), {
    headers: { Authorization: auth, apikey: apiKey, Accept: "application/json" }
  });
  if (!member.ok) return false;
  const rows = await member.json() as Array<{ role?: string; status?: string }>;
  const row = rows[0];
  if (!row || row.status !== "active") return false;
  return row.role === "owner" || row.role === "school_admin" || row.role === "teacher";
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type ImageRef = { bytes: Uint8Array; mime: string; name: string };

async function styleReferences(): Promise<ImageRef[]> {
  const samples = [
    { url: "https://wondii.co.uk/games/images/schools/portal-hello.jpg", mime: "image/jpeg", name: "wondii-world.jpg" },
    { url: "https://wondii.co.uk/games/images/oovi/max.webp", mime: "image/webp", name: "wondii-character.webp" }
  ];
  const refs: ImageRef[] = [];
  for (const sample of samples) {
    const response = await fetch(sample.url);
    if (!response.ok) continue;
    refs.push({ bytes: new Uint8Array(await response.arrayBuffer()), mime: sample.mime, name: sample.name });
  }
  return refs;
}

async function openaiImage(apiKey: string, prompt: string, references: ImageRef[]): Promise<{ bytes: Uint8Array; usage: unknown }> {
  const started = Date.now();
  let response: Response;
  if (references.length) {
    const form = new FormData();
    form.set("model", MODEL);
    form.set("prompt", prompt);
    form.set("size", SIZE);
    form.set("quality", QUALITY);
    form.set("output_format", "jpeg");
    form.set("output_compression", "80");
    form.set("moderation", "auto");
    references.forEach((reference) => {
      form.append("image[]", new Blob([reference.bytes.buffer as ArrayBuffer], { type: reference.mime }), reference.name);
    });
    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: openAiHeaders(apiKey, false),
      body: form,
      signal: AbortSignal.timeout(110000)
    });
  } else {
    response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: openAiHeaders(apiKey, true),
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: SIZE,
        quality: QUALITY,
        output_format: "jpeg",
        output_compression: 80,
        moderation: "auto",
        n: 1
      }),
      signal: AbortSignal.timeout(110000)
    });
  }
  const raw = await response.text();
  if (!response.ok) {
    let detail = "HTTP " + response.status;
    try {
      const parsed = JSON.parse(raw) as { error?: { code?: string; message?: string } };
      if (parsed.error?.code) detail = parsed.error.code;
      else if (parsed.error?.message) detail = parsed.error.message.slice(0, 180);
    } catch (_error) { /* keep status */ }
    throw new Error(detail);
  }
  const parsed = JSON.parse(raw) as { data?: Array<{ b64_json?: string }>; usage?: unknown };
  const b64 = parsed.data && parsed.data[0] && parsed.data[0].b64_json;
  if (!b64) throw new Error("empty_image");
  console.log(JSON.stringify({ event: "learn-visuals", phase: references.length ? "edit" : "generate", ms: Date.now() - started }));
  return { bytes: decodeBase64(b64), usage: parsed.usage || null };
}

async function storageFetch(base: string, key: string, path: string, method: string, body?: Uint8Array): Promise<Response> {
  const headers: Record<string, string> = { Authorization: "Bearer " + key, apikey: key };
  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "image/jpeg";
    headers["x-upsert"] = "true";
  }
  return await fetch(base + "/storage/v1/object/" + BUCKET + "/" + path, {
    method,
    headers,
    body: body ? body : undefined
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, category: "method" }, 405);
  if (!visuals) return json({ ok: false, category: "provider" }, 500);
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch (_error) { return json({ ok: false, category: "request" }, 400); }
  const realLesson = !!(body.adventure && typeof body.adventure === "object" && visuals.visualsAllowed(body));
  if (!realLesson && !visuals.visualsEnabled(body)) {
    return json({ ok: true, enabledGlobally: false, generated: false, reason: "visual_adventure_flag_off" });
  }
  const auth = request.headers.get("Authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  const orgId = String(body.organisationId || "");
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  if (!auth || !apiKey || !orgId || !base) return json({ ok: false, category: "unauthorised" }, 401);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return json({ ok: false, category: "request" }, 400);
  const allowed = await teacherAllowed(orgId, auth, apiKey, base);
  if (!allowed) return json({ ok: false, category: "unauthorised" }, 403);

  const assetId = String(body.assetId || "");
  if (realLesson) {
    const lesson = body.adventure as Record<string, unknown>;
    const characters = visuals.charactersForAdventure(lesson);
    const plannedAssets = visuals.planVisualAssets(lesson);
    const planned = assetId === "characters"
      ? { id: "characters", type: "character_sheet", usedByScenes: ["characters"], brief: null, importantObjects: [], shot: null, uiSafeArea: "" }
      : plannedAssets.find((item) => item.id === assetId);
    if (!planned) return json({ ok: false, category: "request" }, 400);
    let prompt = assetId === "characters"
      ? visuals.buildCharacterSheetPrompt(characters)
      : visuals.buildAdventurePrompt(lesson, planned, characters);
    if (assetId !== "characters") {
      prompt += "\nThe last reference is a character identity sheet, not a previous scene. Match those exact faces, hair, clothes, shoes, and colours. Do not copy the plain background or the side-by-side standing pose. Use a new camera, pose, and place.";
    }
    const visualBriefHash = visuals.hashBrief(prompt);
    const topicKey = visuals.hashBrief(String(lesson.topic || lesson.title || "lesson") + "|" + String(lesson.yearGroup || lesson.year || ""));
    const folder = orgId + "/lesson-" + topicKey;
    const storagePath = folder + "/" + assetId + "-" + visualBriefHash + ".jpg";
    const service = secretKey();
    const publicUrl = base + "/storage/v1/object/public/" + BUCKET + "/" + storagePath;
    const strategy = assetId === "characters" ? "wondii-style-character-sheet" : "character-sheet-identity-new-composition";
    if (!service || !Deno.env.get("OPENAI_API_KEY")) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "storage_or_provider_unavailable") });
    }
    if (!body.force) {
      const existing = await storageFetch(base, service, storagePath, "HEAD");
      if (existing.ok) {
        return json({ ok: true, enabledGlobally: false, cached: true, asset: readyAsset(planned, storagePath, publicUrl, visualBriefHash, strategy, 0, 0, null) });
      }
    }
    const references: ImageRef[] = await styleReferences();
    if (body.referencePath) {
      const ref = await storageFetch(base, service, String(body.referencePath), "GET");
      if (ref.ok) references.push({ bytes: new Uint8Array(await ref.arrayBuffer()), mime: "image/jpeg", name: "characters.jpg" });
    }
    if (!references.length) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "style_reference_unavailable") });
    }
    const started = Date.now();
    try {
      const image = await openaiImage(Deno.env.get("OPENAI_API_KEY") || "", prompt, references);
      const uploaded = await storageFetch(base, service, storagePath, "POST", image.bytes);
      if (!uploaded.ok) {
        return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "storage_upload_failed") });
      }
      console.log(JSON.stringify({ event: "learn-visuals", mode: "lesson", assetId, status: "ready", bytes: image.bytes.length, ms: Date.now() - started }));
      return json({ ok: true, enabledGlobally: false, asset: readyAsset(planned, storagePath, publicUrl, visualBriefHash, strategy, image.bytes.length, Date.now() - started, image.usage) });
    } catch (error) {
      const failure = error instanceof Error ? error.message : "image_failed";
      console.log(JSON.stringify({ event: "learn-visuals", mode: "lesson", assetId, status: "failed", failure, ms: Date.now() - started }));
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, failure) });
    }
  }
  const sheet = body.prototype === visuals.PROTOTYPE_98B;
  const experience = body.prototype === visuals.PROTOTYPE_98A || sheet;
  const adventure = experience ? visuals.volcanoExperience() : visuals.volcanoPrototype();
  const year = 5;
  const characters = experience ? visuals.defineExperienceCharacters(year) : visuals.defineCharacters(adventure.storyPlan, year);
  const plannedAssets = visuals.planVisualAssets(adventure);
  if (experience && assetId !== "characters") {
    const diversity = visuals.diversityIssues(plannedAssets);
    if (diversity.length) {
      return json({ ok: true, enabledGlobally: false, asset: { id: assetId, status: "failed", fallback: true, failure: "scene_diversity" } });
    }
  }
  const found = plannedAssets.find((item) => item.id === assetId);
  const planned = assetId === "characters"
    ? { id: "characters", type: "character_sheet", usedByScenes: ["Arrival", "The Pressure Builds", "The Final Presentation"], brief: null, importantObjects: [], shot: null, uiSafeArea: "" }
    : found;
  if (!planned) return json({ ok: false, category: "request" }, 400);
  let prompt = assetId === "characters"
    ? visuals.buildCharacterSheetPrompt(characters)
    : (experience
      ? visuals.buildExperiencePrompt(adventure, planned, characters)
      : visuals.buildVisualPrompt(adventure, planned, characters));
  if (sheet && assetId !== "characters") {
    prompt += "\nThe last reference is a character identity sheet, not a previous scene. Match those exact faces, hair, clothes, shoes, and colours. Do not copy the plain background or the side-by-side standing pose. Use a new camera, pose, and place.";
  }
  const visualBriefHash = visuals.hashBrief(prompt);
  const folder = sheet ? "year5-volcano-9.8b" : (experience ? "year5-volcano-9.8a" : "year5-volcano-9.8");
  const storagePath = orgId + "/" + folder + "/" + assetId + "-" + visualBriefHash + ".jpg";
  const service = secretKey();
  const publicUrl = base + "/storage/v1/object/public/" + BUCKET + "/" + storagePath;
  const strategy = sheet
    ? (assetId === "characters" ? "wondii-style-character-sheet" : "character-sheet-identity-new-composition")
    : (experience
      ? (body.referencePath ? "wondii-style-and-world-anchor-new-composition" : "wondii-style-reference-new-shot")
      : (body.referencePath ? "edit-from-opening-reference" : "text-generation-establishes-world"));

  if (!service || !Deno.env.get("OPENAI_API_KEY")) {
    return json({
      ok: true,
      enabledGlobally: false,
      asset: failedAsset(planned, visualBriefHash, strategy, "storage_or_provider_unavailable")
    });
  }

  if (!body.force) {
    const existing = await storageFetch(base, service, storagePath, "HEAD");
    if (existing.ok) {
      return json({
        ok: true,
        enabledGlobally: false,
        cached: true,
        asset: readyAsset(planned, storagePath, publicUrl, visualBriefHash, strategy, 0, 0, null)
      });
    }
  }

  const references: ImageRef[] = experience ? await styleReferences() : [];
  if (body.referencePath) {
    const ref = await storageFetch(base, service, String(body.referencePath), "GET");
    if (!ref.ok) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "reference_unavailable") });
    }
    references.push({ bytes: new Uint8Array(await ref.arrayBuffer()), mime: "image/jpeg", name: sheet ? "characters.jpg" : "opening.jpg" });
  }
  if (experience && !references.length) {
    return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "style_reference_unavailable") });
  }

  const started = Date.now();
  try {
    const image = await openaiImage(Deno.env.get("OPENAI_API_KEY") || "", prompt, references);
    const uploaded = await storageFetch(base, service, storagePath, "POST", image.bytes);
    if (!uploaded.ok) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, "storage_upload_failed") });
    }
    console.log(JSON.stringify({
      event: "learn-visuals",
      assetId,
      status: "ready",
      bytes: image.bytes.length,
      ms: Date.now() - started,
      model: MODEL
    }));
    return json({
      ok: true,
      enabledGlobally: false,
      asset: readyAsset(planned, storagePath, publicUrl, visualBriefHash, strategy, image.bytes.length, Date.now() - started, image.usage)
    });
  } catch (error) {
    const failure = error instanceof Error ? error.message : "image_failed";
    console.log(JSON.stringify({ event: "learn-visuals", assetId, status: "failed", failure, ms: Date.now() - started }));
    return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned, visualBriefHash, strategy, failure) });
  }
});

function readyAsset(planned: Record<string, unknown>, storagePath: string, publicUrl: string, visualBriefHash: string, strategy: string, bytes: number, ms: number, usage: unknown) {
  return {
    id: planned.id,
    type: planned.type,
    status: "ready",
    fallback: false,
    storagePath,
    publicUrl,
    visualBriefHash,
    provider: "openai",
    model: MODEL,
    dimensions: SIZE,
    quality: QUALITY,
    bytes,
    ms,
    usage,
    promptStrategy: strategy,
    brief: planned.brief || null,
    importantObjects: planned.importantObjects || [],
    usedByScenes: planned.usedByScenes || [],
    shot: planned.shot || null,
    uiSafeArea: planned.uiSafeArea || "",
    createdAt: new Date().toISOString()
  };
}

function failedAsset(planned: Record<string, unknown>, visualBriefHash: string, strategy: string, failure: string) {
  return {
    id: planned.id,
    type: planned.type,
    status: "failed",
    fallback: true,
    storagePath: "",
    publicUrl: "",
    visualBriefHash,
    provider: "openai",
    model: MODEL,
    dimensions: SIZE,
    promptStrategy: strategy,
    brief: planned.brief || null,
    importantObjects: planned.importantObjects || [],
    usedByScenes: planned.usedByScenes || [],
    failure,
    createdAt: new Date().toISOString()
  };
}
