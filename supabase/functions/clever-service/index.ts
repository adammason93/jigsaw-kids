import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CHARACTERS: Record<string, string> = {
  unicorn: "a friendly unicorn with a sparkly mane",
  dragon: "a small cute dragon with soft round wings",
  robot: "a round friendly robot with big eyes",
  bunny: "a fluffy bunny with long ears",
  teddy: "a cuddly teddy bear",
};

const PLACES: Record<string, string> = {
  beach: "a sunny beach with gentle waves and sand castles",
  woods: "a magical forest with tall trees and dappled light",
  castle: "a fairy-tale castle with colourful flags",
  garden: "a flower garden with butterflies",
  space: "a friendly cartoon planet with stars and a pastel rocket",
};

/** Paths relative to site root; must match static deploy + `kids-game-characters.js` portrait fields. */
const FAMILY_PORTRAIT_PATHS: Record<string, string> = {
  babyca: "games/images/character-babyca.png",
  tilly: "games/images/tilly-mascot.png",
  isaac: "games/images/character-baby-coolegg.png",
  sofia: "games/images/character-girl-blonde.png",
  kelly: "games/images/character-kelly.png",
  freya: "games/images/character-freya.png",
};

type FamilyPerson = { id: string; label: string };

type StoryPage = { text: string; illustrationBrief: string | null };
type StoryJson = { title: string; characterDesign?: string; pages: StoryPage[] };

function sanitizeFamilyNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw.slice(0, 8)) {
    const cleaned = String(x ?? "")
      .trim()
      .replace(/[^\p{L}\p{N}'\-\s]/gu, "")
      .trim()
      .slice(0, 24);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

/** Selected game people with ids (for portrait lookup). Ignores unknown ids. */
function sanitizeFamilyPeople(raw: unknown): FamilyPerson[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FamilyPerson[] = [];
  for (const x of raw.slice(0, 8)) {
    const o = x as Record<string, unknown>;
    const id = String(o?.id ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!id || !FAMILY_PORTRAIT_PATHS[id]) continue;
    const label = String(o?.label ?? "")
      .trim()
      .replace(/[^\p{L}\p{N}'\-\s]/gu, "")
      .trim()
      .slice(0, 24);
    if (!label) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function fetchPortraitDataUrl(
  assetsBase: string,
  path: string,
): Promise<string | null> {
  const base = assetsBase.replace(/\/$/u, "");
  const rel = path.replace(/^\//u, "");
  const url = `${base}/${rel}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12_000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    const mime =
      r.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!mime.startsWith("image/")) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 1_500_000) return null;
    return `data:${mime};base64,${bytesToBase64(buf)}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turn reference portraits into short appearance lines for DALL·E (text-only).
 * DALL·E 3 cannot take images; vision summarises them first.
 */
async function openaiVisionDescribePortraits(
  apiKey: string,
  items: { label: string; dataUrl: string }[],
): Promise<string> {
  if (items.length === 0) return "";
  const ordered = items.map((i) => i.label).join(", ");
  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text:
        `These ${items.length} images are official reference portraits for named characters in a kids' picture book, in order: ${ordered}.\n` +
        `Reply with exactly ${items.length} lines, one per character, format:\n` +
        `NAME: neutral appearance for an illustrator only — hair, skin tone, clothing colours and cut, approximate age; max 28 words; no art-style words; match the reference.\n` +
        `Use each NAME exactly as spelled above. No other text.`,
    },
  ];
  for (const it of items) {
    content.push({
      type: "image_url",
      image_url: { url: it.dataUrl },
    });
  }

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.15,
      max_tokens: 450,
      messages: [{ role: "user", content }],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("openai vision error", r.status, t.slice(0, 400));
    throw new Error(`vision_error:${r.status}`);
  }

  const data = await r.json();
  const text = String(data.choices?.[0]?.message?.content ?? "").trim();
  return text.slice(0, 1200);
}

async function appearanceNotesFromFamilyPortraits(
  apiKey: string,
  assetsBase: string,
  people: FamilyPerson[],
): Promise<string> {
  if (!people.length || !assetsBase) return "";
  const withUrls: { label: string; dataUrl: string }[] = [];
  for (const p of people) {
    const path = FAMILY_PORTRAIT_PATHS[p.id];
    if (!path) continue;
    const dataUrl = await fetchPortraitDataUrl(assetsBase, path);
    if (dataUrl) withUrls.push({ label: p.label, dataUrl });
  }
  if (withUrls.length === 0) return "";
  return openaiVisionDescribePortraits(apiKey, withUrls);
}

function sanitizeName(raw: string): string {
  const s = (raw ?? "").trim().slice(0, 24);
  const cleaned = s.replace(/[^\p{L}\p{N}'\-\s]/gu, "").trim();
  return cleaned.length ? cleaned : "My friend";
}

function sanitizePlotHint(raw: string): string {
  const oneLine = (raw ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 220);
  const cleaned = oneLine.replace(/[^\p{L}\p{N}'\-\s\.,!?—–]/gu, "").trim();
  return cleaned.slice(0, 220);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unwrapJsonContent(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  return s;
}

/** 12 pages = 6 spreads; illustration only on the second page of each spread (indices 1,3,…,11). */
const ILLUSTRATED_PAGE_INDICES = [1, 3, 5, 7, 9, 11] as const;
const PAGE_COUNT = 12;

/** Picture page index (1,3,…); story beat is usually on the previous (text) page. */
function spreadTextForPicturePage(pictureIndex: number, pages: StoryPage[]): string {
  const left = pages[pictureIndex - 1]?.text?.trim() ?? "";
  const same = pages[pictureIndex]?.text?.trim() ?? "";
  const merged = (left.length >= same.length ? left : same) || left || same;
  return merged.replace(/[.!?…]+$/u, "").trim();
}

/** Normalise model output: 12 pages, exactly 6 illustration briefs on spread "picture" pages only. */
function normalizeStoryJson(raw: unknown): StoryJson {
  const obj = raw as Partial<StoryJson>;
  const title = String(obj.title ?? "A little adventure")
    .trim()
    .slice(0, 120);
  const src = Array.isArray(obj.pages) ? obj.pages : [];
  const pages: StoryPage[] = src.map((p) => ({
    text: String((p as StoryPage)?.text ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    illustrationBrief:
      (p as StoryPage)?.illustrationBrief != null &&
      String((p as StoryPage).illustrationBrief).trim()
        ? String((p as StoryPage).illustrationBrief).trim().slice(0, 400)
        : null,
  }));

  while (pages.length < PAGE_COUNT) {
    pages.push({ text: "And that was a lovely day.", illustrationBrief: null });
  }
  pages.length = PAGE_COUNT;

  for (const p of pages) {
    if (!p.text) p.text = "They smiled and looked around.";
    if (p.text.length > 320) p.text = p.text.slice(0, 317) + "…";
  }

  for (let i = 0; i < pages.length; i++) {
    if (i % 2 === 0) pages[i].illustrationBrief = null;
  }

  for (const i of ILLUSTRATED_PAGE_INDICES) {
    let brief = pages[i].illustrationBrief ? String(pages[i].illustrationBrief).trim() : "";
    if (!brief) {
      const basis = spreadTextForPicturePage(i, pages).slice(0, 220);
      pages[i].illustrationBrief =
        (basis.length ? basis : `Spread ${i / 2 + 1} adventure moment`) +
        ", bright friendly picture-book scene, simple shapes, this spread only";
    } else {
      pages[i].illustrationBrief = brief;
    }
  }

  return { title, pages };
}

async function openaiChatJson(
  apiKey: string,
  system: string,
  user: string
): Promise<StoryJson> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.75,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("openai chat error", r.status, t);
    throw new Error(`story_model_error:${r.status}`);
  }

  const data = await r.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("story_empty");
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonContent(content));
  } catch (e) {
    console.error("story json parse", e, content.slice(0, 500));
    throw new Error("story_parse");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoryJson).pages)) {
    throw new Error("story_shape");
  }

  return normalizeStoryJson(parsed);
}

type DalleSize = "1024x1024" | "1792x1024" | "1024x1792" | "512x512" | "256x256";

function openaiImageErrorDetail(status: number, bodyText: string): string {
  let d = `HTTP ${status}`;
  try {
    const j = JSON.parse(bodyText) as { error?: { message?: string } };
    if (j.error?.message) d += ": " + j.error.message.slice(0, 300);
  } catch {
    const s = bodyText.trim();
    if (s) d += ": " + s.slice(0, 200);
  }
  return d;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openaiImageGenerations(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await r.text();
  if (!r.ok) {
    console.error("openai image error", r.status, raw.slice(0, 900));
    throw new Error(openaiImageErrorDetail(r.status, raw));
  }

  let data: { data?: { url?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("image_response_not_json");
  }
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("image_empty");
  return url as string;
}

/**
 * Retry on HTTP 400 with simpler payloads — some accounts reject `style` / `quality` combos.
 */
async function openaiImageUrl(
  apiKey: string,
  prompt: string,
  size: DalleSize = "1024x1024",
): Promise<string> {
  const trimmed = prompt.slice(0, 4000);
  const attempts: Record<string, unknown>[] =
    size === "512x512" || size === "256x256"
      ? [
          {
            model: "dall-e-2",
            prompt: trimmed.slice(0, 1000), // dall-e-2 has a 1000 character prompt limit
            n: 1,
            size,
          },
        ]
      : [
          {
            model: "dall-e-3",
            prompt: trimmed,
            n: 1,
            size,
            quality: "standard",
            style: "vivid",
          },
          {
            model: "dall-e-3",
            prompt: trimmed,
            n: 1,
            size,
            quality: "standard",
            style: "natural",
          },
          {
            model: "dall-e-3",
            prompt: trimmed,
            n: 1,
            size,
            quality: "standard",
          },
          {
            model: "dall-e-3",
            prompt: trimmed,
            n: 1,
            size,
          },
        ];

  let lastErr: Error | null = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await openaiImageGenerations(apiKey, attempts[i]);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastErr = err;
      const is400 = err.message.includes("HTTP 400");
      if (!is400) throw err;
      if (i < attempts.length - 1) {
        console.warn(
          `[clever-service] DALL·E 400 — retry simpler payload (${i + 2}/${attempts.length})`,
          err.message.slice(0, 180),
        );
      }
    }
  }
  throw lastErr ?? new Error("image_failed");
}

/** Landscape spread first; some keys/billing paths fail on 1792×1024 — fall back to square. */
async function openaiSpreadImageUrl(apiKey: string, prompt: string): Promise<string> {
  // Try DALL-E 3 at 1792x1024 (landscape) to perfectly fit a double-page spread.
  // The parallel Promise.all generation makes this fast enough to bypass the 504/546 timeout.
  try {
    return await openaiImageUrl(apiKey, prompt, "1792x1024");
  } catch (e) {
    console.warn("[clever-service] DALL-E 3 1792x1024 failed, retrying with 1024x1024", e);
    return await openaiImageUrl(apiKey, prompt, "1024x1024");
  }
}

Deno.serve(async (req) => {
  console.info("[clever-service]", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Optional simple proxy for downloading OpenAI images to avoid strict CORS
  if (req.method === "GET") {
    const urlStr = new URL(req.url).searchParams.get("url");
    if (!urlStr) return jsonResponse({ error: "missing_url" }, 400);
    try {
      const res = await fetch(urlStr);
      if (!res.ok) throw new Error("proxy_upstream_error");
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": res.headers.get("Content-Type") || "image/png",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    } catch (e) {
      console.error("[proxy error]", e);
      return jsonResponse({ error: "proxy_failed" }, 502);
    }
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "server_missing_openai" }, 500);
  }

  let body: {
    childName?: string;
    character?: string;
    place?: string;
    plotHint?: string;
    familyNames?: string[];
    familyPeople?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  const childName = sanitizeName(String(body.childName ?? ""));
  const characterKey = String(body.character ?? "");
  const placeKey = String(body.place ?? "");

  const characterDesc = CHARACTERS[characterKey];
  const placeDesc = PLACES[placeKey];
  if (!characterDesc || !placeDesc) {
    return jsonResponse({ error: "invalid_choices" }, 400);
  }

  const plotHint = sanitizePlotHint(String(body.plotHint ?? ""));
  const familyPeople = sanitizeFamilyPeople(body.familyPeople);
  const familyNames =
    familyPeople.length > 0
      ? familyPeople.map((p) => p.label)
      : sanitizeFamilyNames(body.familyNames);

  const bookAssetsBase = (Deno.env.get("BOOK_ASSETS_BASE_URL") ?? "").trim();

  let portraitAppearance = "";
  const portraitVisionAttempted = Boolean(bookAssetsBase && familyPeople.length > 0);
  if (portraitVisionAttempted) {
    try {
      portraitAppearance = await appearanceNotesFromFamilyPortraits(
        apiKey,
        bookAssetsBase,
        familyPeople,
      );
    } catch (e) {
      console.warn("[clever-service] portrait vision failed", e);
    }
  }

  const portraitBlockForText =
    portraitAppearance.length > 0
      ? `\n\nAppearance from reference portraits (match when describing these game people):\n${portraitAppearance}\n`
      : "";

  const system = `You write very short picture-book stories for UK English-speaking children about age 5.
Rules:
- Warm, gentle, silly — never scary, violent, or mean.
- No romance, no weapons, no villains that frighten.
- Exactly 12 pages (six double-page spreads). Each page "text" is at most 2 short sentences. Use simple words.
- The hero's name is given — use it often.
- If "People from the child's games" are listed, include them in the story by name as extra friends or family. They should feel like the same friendly faces the child picks in other games (e.g. Tilly, Baby). They are separate from the one imaginary "main friend character" (unicorn, dragon, etc.) — both can appear.${
    portraitAppearance
      ? " If appearance lines are given for those people, stay consistent with those visual details when you naturally describe them."
      : ""
  }
- Include fields title (string), characterDesign (string, very detailed visual description of the main characters to keep them identical across all illustrations), and pages (array of 12 objects).
- Each page: { "text": string, "illustrationBrief": string | null }.
- DOUBLE-PAGE SPREADS: pair pages as (1,2), (3,4), (5,6), (7,8), (9,10), (11,12).
  Odd-numbered pages (1,3,5,7,9,11) are TEXT-FIRST pages only — use "illustrationBrief": null.
  Even-numbered pages (2,4,6,8,10,12) are PICTURE pages — each MUST have a non-null "illustrationBrief": a short visual scene description for an illustrator (no text to draw, no words on signs). Each brief MUST be different. The brief MUST spell out the same specific moment as the text on the previous page: same characters, action, setting details, and props — not a generic scene for that chapter.
  When game people with portrait notes appear on a picture page, the brief should mention them looking like those notes (hair, outfit colours, age vibe).
- If a "plot idea" is given, you MUST make it the central theme of the story and feature it heavily in EVERY illustration brief. If it is empty, invent a short happy outing that fits the setting.
- JSON only, no markdown.`;

  const user = `Child name: ${childName}
Main friend character (imaginary buddy): ${characterDesc}
Setting to feature: ${placeDesc}
People from the child's games to include by name (friends/family — use them warmly and often; if none listed, skip): ${
    familyNames.length > 0 ? familyNames.join(", ") : "(none)"
  }${portraitBlockForText}
Plot idea from the child (CRITICAL: make this the core focus of the story and pictures): ${
    plotHint.length ? plotHint : "(none — invent a cosy little adventure that fits the setting)"
  }

Return JSON shape: { "title": string, "characterDesign": string, "pages": [ { "text": string, "illustrationBrief": string | null }, ... 12 items ] }`;

  let story: StoryJson;
  try {
    story = await openaiChatJson(apiKey, system, user);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "story_failed" }, 502);
  }

  const portraitForImage = portraitAppearance.replace(/\s+/gu, " ").trim().slice(0, 900);
  const finalCharacterDesc = story.characterDesign || characterDesc;
  const imagePromptPrefix =
    "Same soft 3D clay and matte toy render as a fancy kids' app, rounded shapes, gentle pastel lighting, " +
    "beautiful cinematic wide-angle scene filling the picture entirely edge-to-edge; " +
    "draw the actual story environment flowing seamlessly without any frames or margins; " +
    "no letters no words no text in the image, wholesome and safe for toddlers. " +
    `Main character to show (keep this character EXACTLY consistent): ${finalCharacterDesc}. Setting mood: ${placeDesc}. ` +
    (plotHint.length > 0 ? `CRITICAL VISUAL THEME to include: ${plotHint}. ` : "") +
    (familyNames.length > 0
      ? ` When groups of friends appear, include these as friendly toy-like characters in the scene (not labelled): ${familyNames.join(", ")}. `
      : " ") +
    (portraitForImage
      ? `When a named game person appears, match these looks from official references (same hair, clothing colours, skin tone, age vibe — keep toy/clay style): ${portraitForImage} `
      : "") +
    `Scene: `;

  const pagesOut: { text: string; imageUrl: string | null }[] = [];
  let sceneImageUrl: string | null = null;

  try {
    const briefs: { index: number; brief: string }[] = [];
    for (const i of ILLUSTRATED_PAGE_INDICES) {
      const p = story.pages[i];
      if (p?.illustrationBrief && String(p.illustrationBrief).trim()) {
        briefs.push({ index: i, brief: String(p.illustrationBrief).trim() });
      }
    }

    const staggerMs = 450;
    
    // Add cover image to the list of parallel generations
    const coverPrompt = imagePromptPrefix + ` Beautiful illustration to be used as a cover art for "${story.title}". Centered, well-composed, full-bleed artwork.`;
    
    const [urls, coverUrl] = await Promise.all([
      Promise.all(
        briefs.map(async (b, k) => {
          if (k > 0) await delay(k * staggerMs);
          const beat = spreadTextForPicturePage(b.index, story.pages).slice(0, 320);
          const beatSafe = beat.replace(/"/gu, "'");
          const beatClause = beatSafe
            ? ` Illustrate this story moment from the text page before this picture (same characters, action, place): ${beatSafe}. `
            : " ";
          const fullPrompt = imagePromptPrefix + beatClause + b.brief;
          return await openaiSpreadImageUrl(apiKey, fullPrompt);
        }),
      ),
      // Generate cover image simultaneously (square 1024x1024)
      delay(briefs.length * staggerMs).then(() => openaiImageUrl(apiKey, coverPrompt, "1024x1024"))
    ]);
    
    sceneImageUrl = coverUrl;

    const urlByIndex = new Map<number, string>();
    briefs.forEach((b, k) => urlByIndex.set(b.index, urls[k]));

    story.pages.forEach((p, i) => {
      pagesOut.push({
        text: p.text.trim(),
        imageUrl: urlByIndex.get(i) ?? null,
      });
    });
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      {
        error: "images_failed",
        detail,
        title: story.title,
        pages: story.pages.map((p) => ({ text: p.text.trim(), imageUrl: null })),
      },
      502,
    );
  }

  return jsonResponse({
    title: story.title,
    sceneImageUrl,
    pages: pagesOut,
    meta: {
      childName,
      characterKey,
      placeKey,
      plotHintLen: plotHint.length,
      familyNames,
      familyPeopleIds: familyPeople.map((p) => p.id),
      portraitVisionAttempted,
      portraitAppearanceUsed: portraitAppearance.length > 0,
      imageCount: pagesOut.filter((p) => p.imageUrl).length,
      spreads: 6,
    },
  });
});
