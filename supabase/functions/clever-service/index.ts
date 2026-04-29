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

type StoryPage = { text: string; illustrationBrief: string | null };
type StoryJson = { title: string; pages: StoryPage[] };

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
    if (!pages[i].illustrationBrief || !String(pages[i].illustrationBrief).trim()) {
      const basis = pages[i].text.replace(/[.!?…]+$/u, "").slice(0, 140);
      pages[i].illustrationBrief =
        (basis.length ? basis : "The heroes") +
        ", bright friendly picture-book scene, simple shapes";
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

type DalleSize = "1024x1024" | "1792x1024" | "1024x1792";

async function openaiImageUrl(
  apiKey: string,
  prompt: string,
  size: DalleSize = "1024x1024",
): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 3900),
      n: 1,
      size,
      quality: "standard",
      style: "vivid",
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("openai image error", r.status, t);
    throw new Error(`image_model_error:${r.status}`);
  }

  const data = await r.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("image_empty");
  return url as string;
}

Deno.serve(async (req) => {
  console.info("[clever-service]", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

  const system = `You write very short picture-book stories for UK English-speaking children about age 5.
Rules:
- Warm, gentle, silly — never scary, violent, or mean.
- No romance, no weapons, no villains that frighten.
- Exactly 12 pages (six double-page spreads). Each page "text" is at most 2 short sentences. Use simple words.
- The hero's name is given — use it often.
- Include fields title (string) and pages (array of 12 objects).
- Each page: { "text": string, "illustrationBrief": string | null }.
- DOUBLE-PAGE SPREADS: pair pages as (1,2), (3,4), (5,6), (7,8), (9,10), (11,12).
  Odd-numbered pages (1,3,5,7,9,11) are TEXT-FIRST pages only — use "illustrationBrief": null.
  Even-numbered pages (2,4,6,8,10,12) are PICTURE pages — each MUST have a non-null "illustrationBrief": a short visual scene description for an illustrator (no text to draw, no words on signs). One new picture per spread; the brief should match that spread's moment.
- If a "plot idea" is given, weave it in gently. If it is empty, invent a short happy outing that fits the setting.
- JSON only, no markdown.`;

  const user = `Child name: ${childName}
Main friend character: ${characterDesc}
Setting to feature: ${placeDesc}
Plot idea from the child (use as inspiration; keep gentle and age-appropriate): ${
    plotHint.length ? plotHint : "(none — invent a cosy little adventure that fits the setting)"
  }

Return JSON shape: { "title": string, "pages": [ { "text": string, "illustrationBrief": string | null }, ... 12 items ] }`;

  let story: StoryJson;
  try {
    story = await openaiChatJson(apiKey, system, user);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "story_failed" }, 502);
  }

  const imagePromptPrefix =
    "Same soft 3D clay and matte toy render as a fancy kids' app, rounded shapes, gentle pastel lighting, " +
    "single full scene, cohesive with a magical tableau, " +
    "vertical portrait composition (roughly 3:4 page like a book leaf), main subject centered with comfortable margin away from edges (will sit in a tall picture page), " +
    "no letters no words no text in the image, wholesome and safe for toddlers. " +
    `Main character to show: ${characterDesc}. Setting mood: ${placeDesc}. Scene: `;

  const pagesOut: { text: string; imageUrl: string | null }[] = [];

  try {
    const briefs: { index: number; brief: string }[] = [];
    for (const i of ILLUSTRATED_PAGE_INDICES) {
      const p = story.pages[i];
      if (p?.illustrationBrief && String(p.illustrationBrief).trim()) {
        briefs.push({ index: i, brief: String(p.illustrationBrief).trim() });
      }
    }

    const urls = await Promise.all(
      briefs.map((b) => openaiImageUrl(apiKey, imagePromptPrefix + b.brief)),
    );

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
    return jsonResponse(
      {
        error: "images_failed",
        title: story.title,
        pages: story.pages.map((p) => ({ text: p.text.trim(), imageUrl: null })),
      },
      502
    );
  }

  return jsonResponse({
    title: story.title,
    pages: pagesOut,
    meta: {
      childName,
      characterKey,
      placeKey,
      plotHintLen: plotHint.length,
      imageCount: pagesOut.filter((p) => p.imageUrl).length,
      spreads: 6,
    },
  });
});
