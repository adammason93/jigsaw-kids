const visualSource = await fetch("https://wondii.co.uk/js/visual-adventure.js?v=9").then((res) => {
  if (!res.ok) throw new Error("visual_script");
  return res.text();
});
(0, eval)(visualSource);
const visuals = globalThis.WondiiVisualAdventure;
const BUCKET = "wondii_adventure_visuals";
const MODEL = "gpt-image-2.5-sunburst";
const SIZE = visuals.SIZE || "2560x1440";
const QUALITY = "high";
const COMPRESSION = "92";
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
function secretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (raw) {
    try {
      const dict = JSON.parse(raw);
      if (dict.default) return dict.default.trim();
      for (const value of Object.values(dict)) {
        if (typeof value === "string" && value.length > 20) return value.trim();
      }
    } catch (_error) {
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}
function openAiHeaders(apiKey, jsonBody) {
  const headers = { Authorization: "Bearer " + apiKey };
  const org = Deno.env.get("OPENAI_ORGANIZATION")?.trim();
  if (org) headers["OpenAI-Organization"] = org;
  if (jsonBody) headers["Content-Type"] = "application/json";
  return headers;
}
async function teacherAllowed(orgId, auth, apiKey, base) {
  const userRes = await fetch(base + "/auth/v1/user", { headers: { Authorization: auth, apikey: apiKey } });
  if (!userRes.ok) return false;
  const user = await userRes.json();
  if (!user.id) return false;
  const query = new URL(base + "/rest/v1/organisation_members");
  query.searchParams.set("user_id", "eq." + user.id);
  query.searchParams.set("organisation_id", "eq." + orgId);
  query.searchParams.set("select", "role,status");
  const member = await fetch(query.toString(), {
    headers: { Authorization: auth, apikey: apiKey, Accept: "application/json" }
  });
  if (!member.ok) return false;
  const rows = await member.json();
  const row = rows[0];
  if (!row || row.status !== "active") return false;
  return row.role === "owner" || row.role === "school_admin" || row.role === "teacher";
}
function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function styleReferences() {
  const samples = [
    { url: "https://wondii.co.uk/games/images/schools/portal-hello.jpg", mime: "image/jpeg", name: "wondii-world.jpg" },
    { url: "https://wondii.co.uk/games/images/oovi/max.webp", mime: "image/webp", name: "wondii-character.webp" }
  ];
  const refs = [];
  for (const sample of samples) {
    const response = await fetch(sample.url);
    if (!response.ok) continue;
    refs.push({ bytes: new Uint8Array(await response.arrayBuffer()), mime: sample.mime, name: sample.name });
  }
  return refs;
}
async function openaiImage(apiKey, prompt, references) {
  const started = Date.now();
  let response;
  if (references.length) {
    const form = new FormData();
    form.set("model", MODEL);
    form.set("prompt", prompt);
    form.set("size", SIZE);
    form.set("quality", QUALITY);
    form.set("output_format", "jpeg");
    form.set("output_compression", COMPRESSION);
    form.set("moderation", "auto");
    references.forEach((reference) => {
      form.append("image[]", new Blob([reference.bytes.buffer], { type: reference.mime }), reference.name);
    });
    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: openAiHeaders(apiKey, false),
      body: form,
      signal: AbortSignal.timeout(13e4)
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
        output_compression: Number(COMPRESSION),
        moderation: "auto",
        n: 1
      }),
      signal: AbortSignal.timeout(13e4)
    });
  }
  const raw = await response.text();
  if (!response.ok) {
    let detail = "HTTP " + response.status;
    try {
      const parsed2 = JSON.parse(raw);
      if (parsed2.error?.code) detail = parsed2.error.code;
      else if (parsed2.error?.message) detail = parsed2.error.message.slice(0, 180);
    } catch (_error) {
    }
    throw new Error(detail);
  }
  const parsed = JSON.parse(raw);
  const b64 = parsed.data && parsed.data[0] && parsed.data[0].b64_json;
  if (!b64) throw new Error("empty_image");
  console.log(JSON.stringify({ event: "learn-visuals", phase: references.length ? "edit" : "generate", ms: Date.now() - started }));
  return { bytes: decodeBase64(b64), usage: parsed.usage || null };
}
async function storageFetch(base, key, path, method, body) {
  const headers = { Authorization: "Bearer " + key, apikey: key };
  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "image/jpeg";
    headers["x-upsert"] = "true";
  }
  return await fetch(base + "/storage/v1/object/" + BUCKET + "/" + path, {
    method,
    headers,
    body: body ? body : void 0
  });
}
globalThis.handleVisual = async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, category: "method" }, 405);
  if (!visuals) return json({ ok: false, category: "provider" }, 500);
  let body = {};
  try {
    body = await request.json();
  } catch (_error) {
    return json({ ok: false, category: "request" }, 400);
  }
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
    const lesson = body.adventure;
    const characters2 = visuals.charactersForAdventure(lesson);
    const plannedAssets2 = visuals.planVisualAssets(lesson);
    const planned2 = assetId === "characters" ? { id: "characters", type: "character_sheet", usedByScenes: ["characters"], brief: null, importantObjects: [], shot: null, uiSafeArea: "" } : plannedAssets2.find((item) => item.id === assetId);
    if (!planned2) return json({ ok: false, category: "request" }, 400);
    let prompt2 = assetId === "characters" ? visuals.buildCharacterSheetPrompt(characters2) : visuals.buildAdventurePrompt(lesson, planned2, characters2);
    const avatarList = Array.isArray(body.avatarRefs) ? body.avatarRefs : (lesson.avatarRefs || []);
    const avatarCount = avatarList.filter((item) => /^kid-(?:5-|6-|10-)?(?:brown|black|blonde|auburn)-(?:long|short)$/.test(String(item && item.avatarId || ""))).length;
    if (assetId !== "characters") {
      prompt2 += avatarCount
        ? "\nThe first images are style only. Each file named kid- is one established character. Match that face, hair, clothes, and colours. Do not copy the cutout pose or the empty background. Do not write a name."
        : "\nThe last reference is a character identity sheet, not a previous scene. Match those exact faces, hair, clothes, shoes, and colours. Do not copy the plain background or the side-by-side standing pose. Use a new camera, pose, and place.";
    }
    const visualBriefHash2 = visuals.hashBrief(prompt2);
    const topicKey = visuals.hashBrief(String(lesson.topic || lesson.title || "lesson") + "|" + String(lesson.yearGroup || lesson.year || ""));
    const folder2 = orgId + "/lesson-" + topicKey;
    const storagePath2 = folder2 + "/" + assetId + "-" + visualBriefHash2 + ".jpg";
    const service2 = secretKey();
    const publicUrl2 = base + "/storage/v1/object/public/" + BUCKET + "/" + storagePath2;
    const strategy2 = assetId === "characters" ? "wondii-style-character-sheet" : "character-sheet-identity-new-composition";
    if (!service2 || !Deno.env.get("OPENAI_API_KEY")) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned2, visualBriefHash2, strategy2, "storage_or_provider_unavailable") });
    }
    if (!body.force) {
      const existing = await storageFetch(base, service2, storagePath2, "HEAD");
      if (existing.ok) {
        return json({ ok: true, enabledGlobally: false, cached: true, asset: readyAsset(planned2, storagePath2, publicUrl2, visualBriefHash2, strategy2, 0, 0, null) });
      }
    }
    const references2 = await styleReferences();
    for (const item of avatarList) {
      const avatarId = String(item && item.avatarId || "");
      if (!/^kid-(?:5-|6-|10-)?(?:brown|black|blonde|auburn)-(?:long|short)$/.test(avatarId)) continue;
      const avatarRes = await fetch("https://wondii.co.uk/games/images/schools/room/" + avatarId + ".webp");
      if (!avatarRes.ok) continue;
      references2.push({ bytes: new Uint8Array(await avatarRes.arrayBuffer()), mime: "image/webp", name: avatarId + ".webp" });
    }
    if (body.referencePath) {
      const ref = await storageFetch(base, service2, String(body.referencePath), "GET");
      if (ref.ok) references2.push({ bytes: new Uint8Array(await ref.arrayBuffer()), mime: "image/jpeg", name: "characters.jpg" });
    }
    if (!references2.length) {
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned2, visualBriefHash2, strategy2, "style_reference_unavailable") });
    }
    const started2 = Date.now();
    try {
      const image = await openaiImage(Deno.env.get("OPENAI_API_KEY") || "", prompt2, references2);
      const uploaded = await storageFetch(base, service2, storagePath2, "POST", image.bytes);
      if (!uploaded.ok) {
        return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned2, visualBriefHash2, strategy2, "storage_upload_failed") });
      }
      console.log(JSON.stringify({ event: "learn-visuals", mode: "lesson", assetId, status: "ready", bytes: image.bytes.length, ms: Date.now() - started2 }));
      return json({ ok: true, enabledGlobally: false, asset: readyAsset(planned2, storagePath2, publicUrl2, visualBriefHash2, strategy2, image.bytes.length, Date.now() - started2, image.usage) });
    } catch (error) {
      const failure = error instanceof Error ? error.message : "image_failed";
      console.log(JSON.stringify({ event: "learn-visuals", mode: "lesson", assetId, status: "failed", failure, ms: Date.now() - started2 }));
      return json({ ok: true, enabledGlobally: false, asset: failedAsset(planned2, visualBriefHash2, strategy2, failure) });
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
  const planned = assetId === "characters" ? { id: "characters", type: "character_sheet", usedByScenes: ["Arrival", "The Pressure Builds", "The Final Presentation"], brief: null, importantObjects: [], shot: null, uiSafeArea: "" } : found;
  if (!planned) return json({ ok: false, category: "request" }, 400);
  let prompt = assetId === "characters" ? visuals.buildCharacterSheetPrompt(characters) : experience ? visuals.buildExperiencePrompt(adventure, planned, characters) : visuals.buildVisualPrompt(adventure, planned, characters);
  if (sheet && assetId !== "characters") {
    prompt += "\nThe last reference is a character identity sheet, not a previous scene. Match those exact faces, hair, clothes, shoes, and colours. Do not copy the plain background or the side-by-side standing pose. Use a new camera, pose, and place.";
  }
  const visualBriefHash = visuals.hashBrief(prompt);
  const folder = sheet ? "year5-volcano-9.8b" : experience ? "year5-volcano-9.8a" : "year5-volcano-9.8";
  const storagePath = orgId + "/" + folder + "/" + assetId + "-" + visualBriefHash + ".jpg";
  const service = secretKey();
  const publicUrl = base + "/storage/v1/object/public/" + BUCKET + "/" + storagePath;
  const strategy = sheet ? assetId === "characters" ? "wondii-style-character-sheet" : "character-sheet-identity-new-composition" : experience ? body.referencePath ? "wondii-style-and-world-anchor-new-composition" : "wondii-style-reference-new-shot" : body.referencePath ? "edit-from-opening-reference" : "text-generation-establishes-world";
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
  const references = experience ? await styleReferences() : [];
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
};
function readyAsset(planned, storagePath, publicUrl, visualBriefHash, strategy, bytes, ms, usage) {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function failedAsset(planned, visualBriefHash, strategy, failure) {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
