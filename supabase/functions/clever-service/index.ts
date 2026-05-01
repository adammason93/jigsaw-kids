import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CHARACTERS: Record<string, string> = {
  unicorn:
    "a friendly horse-like unicorn with four hooves, equine face and body, single spiral horn on forehead, sparkly mane and tail",
  dragon: "a small cute dragon with soft round wings",
  robot: "a round friendly robot with big eyes",
  bunny: "a fluffy bunny with long ears",
  teddy: "a cuddly teddy bear",
};

const PLACES: Record<string, string> = {
  beach: "a sunny beach with gentle waves and sand castles",
  woods: "a forest with tall trees — picture-book woods; match story mood (sunlit glade or dim mystical understory per plot)",
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
type StoryJson = {
  title: string;
  characterDesign?: string;
  bookColor?: "pink" | "blue" | "green";
  pages: StoryPage[];
};

const DALLE3_PROMPT_MAX = 3900;

function coerceBookColor(
  requested: string | undefined,
  modelRaw: unknown,
  childName: string,
): "pink" | "blue" | "green" {
  const r = String(requested ?? "")
    .trim()
    .toLowerCase();
  if (r === "pink" || r === "blue" || r === "green") return r;
  const m = String(modelRaw ?? "")
    .trim()
    .toLowerCase();
  if (m === "pink" || m === "blue" || m === "green") return m;
  const n = (childName.trim().toLowerCase().split(/\s+/)[0] ?? "").replace(/[^a-z]/gu, "");
  const boyNames = new Set([
    "isaac", "noah", "oliver", "george", "harry", "jack", "leo", "arthur",
    "james", "henry", "oscar", "ethan", "lucas", "mason", "liam", "theo",
    "freddie", "charlie", "thomas", "william", "joshua", "samuel", "max",
    "daniel", "alexander", "archie", "alfie", "teddy", "reuben", "adam",
    "jacob", "benjamin", "joseph", "david", "logan", "finley", "harrison",
  ]);
  if (boyNames.has(n)) return "blue";
  return "pink";
}

function composeDallePrompt(parts: {
  preamble: string;
  envTheme: string;
  sceneBrief: string;
  castBible: string;
  firstPanelLock: string;
  heroFirstName: string;
}): string {
  const lockChunk = parts.firstPanelLock.trim()
    ? `MATCH FIRST SPREAD — copy these exact looks (faces, hair, outfits, creatures): ${parts.firstPanelLock.trim()}\n\n`
    : "";
  const identity =
    `TEXT-LOCKED CAST: Draw ONLY the people and creatures explicitly named in SCENE ACTION — exactly who this spread's verse names or clearly refers to (no one else). ` +
    `When ${parts.heroFirstName} is named in SCENE ACTION, they must appear clearly in the foreground (full face, correct child). ` +
    `Only ONE imaginary buddy individual from the BUDDY line (e.g. one unicorn), not a duplicate big+small pair, unless SCENE ACTION explicitly names two distinct buddies. ` +
    `NO unnamed villagers, torch-bearer extras, silhouettes with faces, mascots, or filler crowd. NO logos or brand marks. Background = whatever PLACE/ENVIRONMENT specifies (castle interior/grounds, woodland, cave, beach, garden, etc.) without extra faced characters beyond SCENE ACTION.\n\n`;
  const mid =
    `SCENE ACTION: ${parts.sceneBrief}\n\n${identity}${lockChunk}MANDATORY CAST (same toy-clay 3D models on every page — identical proportions, colours, species; do not redesign or swap styles):\n`;
  const head = `${parts.preamble}${parts.envTheme}`;
  const room = DALLE3_PROMPT_MAX - head.length - mid.length;
  let cast = parts.castBible.trim();
  if (cast.length > room) {
    const cap = Math.max(120, room - 1);
    cast = cast.slice(0, cap) + "…";
  }
  const out = `${head}${mid}${cast}`;
  return out.slice(0, DALLE3_PROMPT_MAX);
}

/** Bias image prompts toward the lighting / structural cues implied by the child's plot. */
function plotLightingEnvAddon(plotHint: string, heroFirstName: string): string {
  const p = plotHint.trim();
  if (!p) return "";
  const parts: string[] = [];

  const isCastle = /castle|fortress|palace|throne|drawbridge|turret|tower|keep|dungeon|battlement/i.test(p);
  const isWoods = /woods?|forest|trees|jungle|glade|grove|thicket|undergrowth/i.test(p);
  const isCave = /cave|cavern|tunnel|underground/i.test(p);
  const isUnderwater = /underwater|ocean|sea|coral|reef|mermaid|submarine/i.test(p);
  const isSpace = /space|stars|moon|planet|galaxy|cosmic|rocket|comet/i.test(p);
  const isBeach = /beach|shore|sand|seaside/i.test(p);

  const isDimMood = /dark|night|torch|lanterns?|moonlit|shadowy|spooky|dim|twilight|dusk|glow|flicker|campfire|fairy\s*lights/i.test(p);
  const hasHandTorches = /\btorch(es)?\b/i.test(p);
  const hasLanterns = /\blanterns?\b/i.test(p);

  if (isDimMood) {
    let lighting = "LIGHTING/MOOD: ";
    if (isCastle) {
      lighting +=
        "dim atmospheric castle interior or moonlit castle grounds — warm flicker from wall sconces, glowing braziers, or hanging lanterns against cool stone walls. " +
        "Not bright midday sun, not a washed-out white sky. ";
    } else if (isCave) {
      lighting +=
        "dim cave interior — warm pools of torchlight bouncing off rough rock walls, deep shadow in the recesses. ";
    } else if (isUnderwater) {
      lighting +=
        "soft caustic blue-green underwater light with shimmering rays from above and gentle bioluminescent glow. ";
    } else if (isSpace) {
      lighting +=
        "deep starry-night space lighting with cool moonlight or planet-glow on faces, distant nebulae as soft pastel washes. ";
    } else if (isBeach) {
      lighting +=
        "moonlit beach at night — silver moonlight on calm waves, warm bonfire or lantern glow on faces. ";
    } else {
      // Outdoor / woods default
      lighting +=
        "dim mystical outdoor scene with warm torchlight or soft lantern glow and deep soft shadows. " +
        "Not bright midday sun, not a washed-out white sky, not a generic sunny picnic or storybook street. ";
    }
    parts.push(lighting);
  }

  if (hasHandTorches) {
    parts.push(
      `PROPS: ${heroFirstName} and the buddy each hold simple wooden hand-torches with visible warm flames in their hands — ` +
        "that torch light falls on their faces and the surroundings; do not replace with only ground sparkles, coin glow, or a studio spotlight with no torches. ",
    );
  } else if (hasLanterns) {
    parts.push(
      `PROPS: ${heroFirstName} and the buddy each carry a small glowing lantern (warm flame inside metal-and-glass casing) — ` +
        "the lantern light falls on their faces and the surroundings. ",
    );
  }

  // Structural / setting cues — give the model concrete elements to paint
  // appropriate to the plot, not woods by default.
  if (isCastle) {
    parts.push(
      "STRUCTURE: stone walls and corridors with arched doorways, hanging tapestries or banners, flagstone floors, narrow windows; or castle grounds with crenellated walls, courtyards, and turrets. " +
        "Show CASTLE architecture clearly — this is NOT a forest. " +
        (isWoods
          ? "If both castle AND surrounding woods are mentioned, blend them (woodland approach to castle gates, or castle visible through trees). "
          : "Trees should NOT dominate any spread unless the plot explicitly says woods. "),
    );
  }
  if (isCave) {
    parts.push(
      "STRUCTURE: rough rock walls, stalactites, narrow passages opening into wider chambers, occasional puddles reflecting torchlight. ",
    );
  }
  if (isUnderwater) {
    parts.push(
      "STRUCTURE: coral formations, kelp forests, sandy seabed, fish schools in mid-distance, bubbles rising from characters. " +
        "No campfires or torches underwater — use bioluminescent props instead if a glow is needed. ",
    );
  }
  if (isSpace) {
    parts.push(
      "STRUCTURE: soft asteroid field or planet surface with low gravity feel, distant pastel planets, comet trails. " +
        "No fire torches in vacuum — use friendly glowing crystals or starlight. ",
    );
  }
  if (isBeach) {
    parts.push(
      "STRUCTURE: soft sand, gentle waves, scattered shells, distant calm horizon, maybe palm trees or rocky outcrops. ",
    );
  }

  return parts.join("");
}

async function compileCharacterLockForImages(
  apiKey: string,
  input: {
    childName: string;
    buddyKey: string;
    buddyDesc: string;
    placeDesc: string;
    plotHint: string;
    draftDesign: string;
    briefsSummary: string;
  },
): Promise<string> {
  const user =
    `Hero first name: ${input.childName}\n` +
    `Main buddy type (${input.buddyKey}): ${input.buddyDesc}\n` +
    `Setting: ${input.placeDesc}\n` +
    `Plot: ${input.plotHint || "cozy adventure"}\n` +
    `Who appears in pictures (beats): ${input.briefsSummary}\n\n` +
    `Storywriter draft (may be messy):\n${input.draftDesign || "(none)"}\n\n` +
    `Rewrite into LOCKED CAST only — plain text, no JSON.\n` +
    `Use labeled lines: HERO:, BUDDY:, then ONLY if the draft explicitly adds more named recurring characters, one line each (e.g. TILLY:). Never add MONKEY:, BEAR:, LION:, or random extras.\n` +
    `Each line: exact colours, relative size vs hero, silhouette, distinctive marks, wings/tail yes/no.\n` +
    `Art style words allowed ONLY: "soft matte clay toy, rounded limbs, gentle toy plastic sheen" — never "realistic" or "Pixar skin".\n` +
    `Max 2100 characters. No scenery. No actions.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.15,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You are an art director for a children's book. Output only the LOCKED CAST block. Be dense and consistent. " +
            "Include EVERY named person and recurring creature from the storywriter draft who actually appears in the book (HERO, BUDDY, and any named game friends from the draft). " +
            "If the draft truly has only the child and one imaginary friend, output exactly HERO: and BUDDY: — never invent unnamed forest animals. " +
            "If the draft names extra friends (e.g. Tilly), add one line each — never add MONKEY:, BEAR:, or random extras not in the draft.",
        },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("compileCharacterLock error", r.status, t.slice(0, 400));
    return "";
  }
  const data = await r.json();
  const text = String(data.choices?.[0]?.message?.content ?? "").trim();
  return text.slice(0, 2100);
}

async function visualLockFromFirstImage(apiKey: string, imageUrl: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "This is cast lineup / spread 1 art for a kids' picture book. Write a single compact paragraph LOCK: repeatable character looks for later spreads. " +
                "Include every principal figure in the **foreground** of this art (the human hero child first, the one main buddy creature, plus any other named child who is clearly a main co-star in the lineup). " +
                "For each: face shape, hair, eyes, skin, outfit colours, species/size for creatures. If crowd or blurry extras appear, IGNORE them — do not lock them. " +
                "No background, no story. Max 900 characters.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error("visualLock error", r.status, t.slice(0, 400));
    return "";
  }
  const data = await r.json();
  return String(data.choices?.[0]?.message?.content ?? "").trim().slice(0, 900);
}

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
        `NAME: neutral appearance for an illustrator only — hair, skin tone, clothing colours and cut, approximate age; max 28 words; no art-style words; match the reference. CRITICAL: Ignore and omit any logos, graphics, or patterns on clothing.\n` +
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

/** When `FAL_KEY` is set, illustration failures must not fall back to DALL·E (avoids mixed-style books). */
class FalImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FalImageError";
  }
}

function throwFalImage(label: string, cause: unknown): never {
  const tail =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : String(cause);
  console.error("[clever-service] Fal failure (no DALL·E fallback):", label, cause);
  throw new FalImageError(`${label}: ${tail}`.slice(0, 900));
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
      .replace(/[ \t]+/g, " ")
      .trim(),
    illustrationBrief:
      (p as StoryPage)?.illustrationBrief != null &&
      String((p as StoryPage).illustrationBrief).trim()
        ? String((p as StoryPage).illustrationBrief).trim().slice(0, 520)
        : null,
  }));

  while (pages.length < PAGE_COUNT) {
    pages.push({ text: "And that was a lovely day.", illustrationBrief: null });
  }
  pages.length = PAGE_COUNT;

  for (const p of pages) {
    if (!p.text) p.text = "They smiled and looked around.";
    if (p.text.length > 600) p.text = p.text.slice(0, 597) + "…";
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

  const characterDesign = obj.characterDesign ? String(obj.characterDesign).trim() : undefined;
  let bookColor: "pink" | "blue" | "green" | undefined;
  const bcRaw = String((obj as StoryJson).bookColor ?? "")
    .trim()
    .toLowerCase();
  if (bcRaw === "pink" || bcRaw === "blue" || bcRaw === "green") {
    bookColor = bcRaw;
  }

  return { title, characterDesign, bookColor, pages };
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
      temperature: 0.35,
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
  retryCount = 0,
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
    if (r.status === 429 && retryCount < 3) {
      // Try to parse reset time from headers, fallback to 22s
      const resetHeader = r.headers.get("x-ratelimit-reset-requests") || r.headers.get("x-ratelimit-reset");
      let waitMs = 22000;
      
      if (resetHeader) {
        // e.g. "12s" or "1m2s"
        const matchS = resetHeader.match(/(\d+)s/);
        const matchM = resetHeader.match(/(\d+)m/);
        let seconds = 0;
        if (matchM) seconds += parseInt(matchM[1], 10) * 60;
        if (matchS) seconds += parseInt(matchS[1], 10);
        if (seconds > 0) waitMs = seconds * 1000;
      }
      
      waitMs += Math.random() * 3000; // Add jitter
      
      console.warn(`[clever-service] 429 Rate limit, waiting ${Math.round(waitMs/1000)}s before retry ${retryCount + 1}...`);
      await delay(waitMs);
      return openaiImageGenerations(apiKey, payload, retryCount + 1);
    }
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
            style: "natural",
          },
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

/** Fal prompts are shorter; Redux already conditions on reference image. */
const FAL_REDUX_PROMPT_MAX = 2800;

async function falQueueResult(
  falKey: string,
  modelId: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const queueBase = `https://queue.fal.run/${modelId}`;
  const tryBodies = [JSON.stringify(input), JSON.stringify({ input })];

  let submitText = "";
  let submitOk = false;
  for (const body of tryBodies) {
    const submitRes = await fetch(queueBase, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body,
    });
    submitText = await submitRes.text();
    if (submitRes.ok) {
      submitOk = true;
      break;
    }
    if (submitRes.status !== 400 && submitRes.status !== 422) {
      throw new Error(`fal_submit_${submitRes.status}:${submitText.slice(0, 280)}`);
    }
  }
  if (!submitOk) {
    throw new Error(`fal_submit:${submitText.slice(0, 280)}`);
  }

  let sub: {
    request_id?: string;
    status_url?: string;
    response_url?: string;
  };
  try {
    sub = JSON.parse(submitText);
  } catch {
    throw new Error("fal_submit_bad_json");
  }
  const rid = sub.request_id;
  if (!rid) throw new Error("fal_no_request_id");

  const statusUrl = sub.status_url ?? `${queueBase}/requests/${rid}/status`;
  const resultUrl = sub.response_url ?? `${queueBase}/requests/${rid}`;

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await delay(2500);
    const st = await fetch(`${statusUrl}?logs=0`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (!st.ok) continue;
    let sj: { status?: string; error?: string };
    try {
      sj = await st.json();
    } catch {
      continue;
    }
    if (sj.status === "COMPLETED") {
      const res = await fetch(resultUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`fal_result_${res.status}:${t.slice(0, 220)}`);
      }
      return (await res.json()) as Record<string, unknown>;
    }
    if (sj.status === "FAILED") {
      throw new Error(`fal_job_failed:${sj.error ?? "unknown"}`);
    }
    if (sj.error) throw new Error(`fal_job:${sj.error}`);
  }
  throw new Error("fal_timeout");
}

/**
 * Image-to-image style spread using reference (spread 1). Better character continuity than text-only DALL·E.
 * @see https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/redux
 */
async function falFluxReduxImageUrl(
  falKey: string,
  modelId: string,
  referenceImageUrl: string,
  prompt: string,
  imagePromptStrength: number,
): Promise<string> {
  const input = {
    image_url: referenceImageUrl,
    prompt: prompt.slice(0, FAL_REDUX_PROMPT_MAX),
    aspect_ratio: "4:3",
    image_prompt_strength: Math.min(0.95, Math.max(0.05, imagePromptStrength)),
    safety_tolerance: "2",
    output_format: "png",
    enhance_prompt: false,
    num_images: 1,
  };
  const data = await falQueueResult(falKey, modelId, input);
  const err = data.error;
  if (typeof err === "string" && err) throw new Error(`fal_output:${err.slice(0, 200)}`);
  const images = data.images as { url?: string }[] | undefined;
  const u = images?.[0]?.url;
  if (!u) throw new Error("fal_empty_images");
  return u;
}

/** Spread 1 only: text-to-image (same Flux family as Redux for style alignment). */
async function falFluxProTextToImageUrl(
  falKey: string,
  modelId: string,
  prompt: string,
): Promise<string> {
  const input = {
    prompt: prompt.slice(0, DALLE3_PROMPT_MAX),
    image_size: "landscape_4_3",
    output_format: "png",
    safety_tolerance: "2",
    enhance_prompt: false,
    num_images: 1,
  };
  const data = await falQueueResult(falKey, modelId, input);
  const err = data.error;
  if (typeof err === "string" && err) throw new Error(`fal_output:${err.slice(0, 200)}`);
  const images = data.images as { url?: string }[] | undefined;
  const u = images?.[0]?.url;
  if (!u) throw new Error("fal_empty_images");
  return u;
}

/* ──────────────────────────────────────────────────────────────────────────
 * GPT Image (a.k.a. "GPT Image 2" in some UIs) pipeline
 *
 * Uses OpenAI's `/v1/images/generations` and `/v1/images/edits` with model
 * `gpt-image-1` (override via STORYBOOK_GPTIMAGE_MODEL). Output is base64 PNG;
 * we upload it to the public `storybook_images` Supabase Storage bucket and
 * return a public URL so the storybook UI can render it like any other URL.
 * ────────────────────────────────────────────────────────────────────────── */

const GPT_IMAGE_BUCKET = "storybook_images";
const GPT_IMAGE_SIZE_LANDSCAPE = "1536x1024";
const GPT_IMAGE_PROMPT_MAX = 4000;

function decodeB64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/[a-z]+;base64,/i, "").trim();
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomKey(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${t}-${r}.png`;
}

async function uploadPngToStorybookImages(
  bytes: Uint8Array,
  name: string,
): Promise<string> {
  const url = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!url || !key) {
    throw new Error("storage_misconfigured: SUPABASE_URL or SERVICE_ROLE_KEY");
  }
  const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, "");
  const path = `gptimage/${cleanName}`;
  const upUrl = `${url.replace(/\/+$/, "")}/storage/v1/object/${GPT_IMAGE_BUCKET}/${path}`;
  const r = await fetch(upUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: new Blob([bytes as unknown as BlobPart], { type: "image/png" }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`storage_upload_${r.status}:${t.slice(0, 240)}`);
  }
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${GPT_IMAGE_BUCKET}/${path}`;
}

/** Parse a 429 retry hint and add jitter; default 14s + 0–3s jitter. */
function parseRetryAfterMs(headerStr: string | null, fallback = 14000): number {
  if (!headerStr) return fallback + Math.random() * 3000;
  const matchS = headerStr.match(/(\d+)s/);
  const matchM = headerStr.match(/(\d+)m/);
  let seconds = 0;
  if (matchM) seconds += parseInt(matchM[1], 10) * 60;
  if (matchS) seconds += parseInt(matchS[1], 10);
  if (seconds > 0) return seconds * 1000 + Math.random() * 3000;
  return fallback + Math.random() * 3000;
}

async function gptImageGenerate(
  apiKey: string,
  prompt: string,
  size: string = GPT_IMAGE_SIZE_LANDSCAPE,
  retryCount = 0,
): Promise<{ url: string; bytes: Uint8Array }> {
  const model =
    (Deno.env.get("STORYBOOK_GPTIMAGE_MODEL") ?? "").trim() || "gpt-image-1";
  const trimmed = prompt.slice(0, GPT_IMAGE_PROMPT_MAX);

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: trimmed,
      n: 1,
      size,
      quality: "medium",
    }),
  });
  const raw = await r.text();
  if (!r.ok) {
    if (r.status === 429 && retryCount < 3) {
      const waitMs = parseRetryAfterMs(
        r.headers.get("retry-after") ||
          r.headers.get("x-ratelimit-reset-images") ||
          r.headers.get("x-ratelimit-reset-requests"),
      );
      console.warn(
        `[gpt-image] 429 generations — wait ${Math.round(waitMs / 1000)}s, retry ${retryCount + 1}`,
      );
      await delay(waitMs);
      return gptImageGenerate(apiKey, prompt, size, retryCount + 1);
    }
    console.error("[gpt-image] generations error", r.status, raw.slice(0, 700));
    throw new Error(openaiImageErrorDetail(r.status, raw));
  }
  let data: { data?: { b64_json?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("gpt_image_response_not_json");
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt_image_empty");
  const bytes = decodeB64ToBytes(b64);
  const url = await uploadPngToStorybookImages(bytes, randomKey("anchor"));
  return { url, bytes };
}

async function gptImageEdit(
  apiKey: string,
  prompt: string,
  referenceBytes: Uint8Array[],
  size: string = GPT_IMAGE_SIZE_LANDSCAPE,
  retryCount = 0,
): Promise<{ url: string; bytes: Uint8Array }> {
  const model =
    (Deno.env.get("STORYBOOK_GPTIMAGE_MODEL") ?? "").trim() || "gpt-image-1";
  const trimmed = prompt.slice(0, GPT_IMAGE_PROMPT_MAX);

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", trimmed);
  form.append("n", "1");
  form.append("size", size);
  form.append("quality", "medium");
  for (let i = 0; i < referenceBytes.length; i++) {
    const blob = new Blob([referenceBytes[i]] as unknown as BlobPart[], {
      type: "image/png",
    });
    form.append("image[]", blob, `ref-${i + 1}.png`);
  }

  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const raw = await r.text();
  if (!r.ok) {
    if (r.status === 429 && retryCount < 4) {
      const waitMs = parseRetryAfterMs(
        r.headers.get("retry-after") ||
          r.headers.get("x-ratelimit-reset-images") ||
          r.headers.get("x-ratelimit-reset-input-images") ||
          r.headers.get("x-ratelimit-reset-requests"),
      );
      console.warn(
        `[gpt-image] 429 edits — wait ${Math.round(waitMs / 1000)}s, retry ${retryCount + 1}`,
      );
      await delay(waitMs);
      return gptImageEdit(apiKey, prompt, referenceBytes, size, retryCount + 1);
    }
    console.error("[gpt-image] edits error", r.status, raw.slice(0, 700));
    throw new Error(openaiImageErrorDetail(r.status, raw));
  }
  let data: { data?: { b64_json?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("gpt_image_response_not_json");
  }
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt_image_empty");
  const bytes = decodeB64ToBytes(b64);
  const url = await uploadPngToStorybookImages(bytes, randomKey("spread"));
  return { url, bytes };
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
    const searchParams = new URL(req.url).searchParams;
    
    // 1. Text-to-Speech (TTS) Proxy
    const ttsText = searchParams.get("ttsText");
    if (ttsText) {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) return jsonResponse({ error: "server_missing_openai" }, 500);
      
      try {
        const r = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            voice: "shimmer", // Soft, upbeat, warm female voice
            input: ttsText,
          }),
        });
        
        if (!r.ok) {
          console.error("[tts error]", r.status, await r.text());
          return jsonResponse({ error: "tts_failed" }, 502);
        }
        
        return new Response(r.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=31536000",
          },
        });
      } catch (e) {
        console.error("[tts error]", e);
        return jsonResponse({ error: "tts_failed", detail: String(e) }, 502);
      }
    }

    // 2. Image Proxy
    const urlStr = searchParams.get("url");
    if (!urlStr) return jsonResponse({ error: "missing_url" }, 400);
    try {
      // Decode the URL if it was encoded twice, or just use it as is
      const decodedUrl = decodeURIComponent(urlStr);
      const finalUrl = decodedUrl.startsWith("http") ? decodedUrl : urlStr;
      
      const res = await fetch(finalUrl);
      if (!res.ok) {
        console.error("[proxy error] upstream returned", res.status, res.statusText, "for URL:", finalUrl);
        throw new Error(`proxy_upstream_error_${res.status}`);
      }
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": res.headers.get("Content-Type") || "image/png",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    } catch (e) {
      console.error("[proxy error]", e);
      return jsonResponse({ error: "proxy_failed", detail: String(e) }, 502);
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
    bookCoverColor?: string;
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
  let placeDesc = PLACES[placeKey];
  if (!characterDesc || !placeDesc) {
    return jsonResponse({ error: "invalid_choices" }, 400);
  }

  const plotHint = sanitizePlotHint(String(body.plotHint ?? ""));

  // If the child's plot prompt clearly names a different setting than the one
  // they tapped on (e.g. picker = "woods" but plot says "in a castle"), the
  // PLOT wins. Otherwise the LLM gets a conflicting "ENVIRONMENT: forest"
  // alongside "THEME: castle hide and seek" and the model averages them.
  // Detect the most specific setting word in the plot and swap.
  let placeOverridden: { from: string; to: string } | null = null;
  if (plotHint) {
    const settingMap: Array<{
      pattern: RegExp;
      key: string;
      desc: string;
    }> = [
      {
        pattern: /\b(castle|fortress|palace|throne\s*room|drawbridge|turret|keep|battlement)\b/i,
        key: "castle",
        desc: "a fairy-tale castle — stone walls and corridors with arched doorways, hanging tapestries and banners, flagstone floors, courtyards with crenellated walls, narrow turret windows",
      },
      {
        pattern: /\b(cave|cavern|tunnel|underground)\b/i,
        key: "cave",
        desc: "a glittering cave — rough rock walls, stalactites, narrow passages opening into wider chambers, occasional puddles reflecting torchlight",
      },
      {
        pattern: /\b(underwater|under\s*the\s*sea|ocean\s*floor|coral|reef|mermaid)\b/i,
        key: "undersea",
        desc: "an underwater world — coral formations, kelp forests, sandy seabed, fish schools in the mid-distance, soft caustic blue-green light from above",
      },
      {
        pattern: /\b(space|outer\s*space|moon|planet|galaxy|cosmic|rocket|asteroid|comet)\b/i,
        key: "space",
        desc: "a friendly cartoon planet or asteroid in space — soft pastel landscape with distant ringed planets, comet trails, and starry sky",
      },
      {
        pattern: /\b(beach|shore|seaside|sand\s*castle|surf|rockpool)\b/i,
        key: "beach",
        desc: "a sunny beach with gentle waves, soft sand, scattered shells, and palm trees or rocky outcrops in the distance",
      },
      {
        pattern: /\b(garden|meadow|orchard|vegetable\s*patch|allotment)\b/i,
        key: "garden",
        desc: "a flower garden with butterflies, tall hollyhocks, a winding path, and a wooden gate or trellis",
      },
      {
        pattern: /\b(woods?|forest|jungle|glade|grove|thicket|undergrowth)\b/i,
        key: "woods",
        desc: PLACES.woods,
      },
    ];
    for (const s of settingMap) {
      if (s.pattern.test(plotHint) && placeKey !== s.key) {
        placeOverridden = { from: placeKey, to: s.key };
        placeDesc = s.desc;
        console.info(
          `[clever-service] place override: picker="${placeKey}" -> plot-detected="${s.key}"`,
        );
        break;
      }
    }
  }
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
- Exactly 12 pages (six double-page spreads). The text on every page MUST be exactly 4 lines long, written as a fun, rhythmic poem that rhymes perfectly (e.g., AABB or ABCB). Format the text with actual line breaks (\n) after each line so the rhyming words are at the end of each line. Use simple words.
- On each odd-numbered (text-first) page, include exactly one short sound-effect or action word in ALL CAPS with an exclamation mark where it fits the rhyme (e.g. SPLASH! WHOOSH! YIPPEE!) so it feels like a printed picture book. Only that one word per page should be in all capitals; keep the rest in normal sentence case.
- The hero's name is given — use it often. The hero IS ${childName} — this exact first name must appear in the story text on every page where the main child acts. Whenever ${childName} is in a spread's scene, that spread's illustrationBrief must name ${childName} (you may list other named friends first if the verse introduces them that way). Never substitute a different child, wrong name, or wrong gender as the hero. The art paints only who you name — do not imply an unnamed generic kid.
- CAST vs TEXT (strict): Each illustrationBrief may include ONLY characters who appear **by name** on that spread's paired text page (the odd page before it), or the one imaginary buddy when the text clearly means them ("the unicorn", "their friend") after names were established. If the verse only mentions ${childName} and the buddy, the picture has only those two. If the verse also names game people who are in that scene, they may appear — list everyone the text actually puts in the moment. Never add lions, bears, random pals, villagers, crowds, or background "silhouette people" that the text does not mention. A few characters is fine **only** when the text names them all for that beat.
- If "People from the child's games" are listed, include them in the story by name as extra friends or family. They should feel like the same friendly faces the child picks in other games (e.g. Tilly, Baby). They are separate from the one imaginary "main friend character" (unicorn, dragon, etc.) — both can appear.${
    portraitAppearance
      ? " If appearance lines are given for those people, stay consistent with those visual details when you naturally describe them."
      : ""
  }
- Include fields title (string), characterDesign (string), bookColor (string: MUST be exactly "blue", "green", or "pink". If the child's name is typically male (e.g. Isaac, Leo), use "blue" or "green". If female, use "pink"), and pages (array of 12 objects).
  For "characterDesign": describe ONLY the hero, the one main buddy, and any named game people who actually appear in your story. If the cast is only hero + buddy, characterDesign has exactly those two rich descriptions — never lions, bears, or unnamed critters. For each included character you MUST define their EXACT gender (e.g. boy/girl), age, height, body shape, skin/surface tone, eye color, facial features, hair color, hair style, AND exact texture/material (e.g. "smooth sculpted clay hair", "fuzzy felt fur", "shiny plastic"). For the buddy creature, explicitly define anatomy (horse-like unicorn with hooves and horn; or winged dragon; etc.). Plus ONE specific, unchanging outfit or set of accessories with exact colors and materials. If an animal or creature wears nothing, explicitly state "in natural animal form (no human outfits)". CRITICAL: Keep clothing solid-colored and simple. DO NOT put logos, graphics, patterns, or text on clothing (DALL-E hallucinates these). DO NOT give them multiple outfits or changing colors. You MUST use the exact same clothing description for the hero in EVERY single illustrationBrief. This will be used as the master reference to keep them identical across all illustrations.
- Each page: { "text": string, "illustrationBrief": string | null }.
- DOUBLE-PAGE SPREADS: pair pages as (1,2), (3,4), (5,6), (7,8), (9,10), (11,12).
  Odd-numbered pages (1,3,5,7,9,11) are TEXT-FIRST pages only — use "illustrationBrief": null.
  Even-numbered pages (2,4,6,8,10,12) are PICTURE pages — each MUST have a non-null "illustrationBrief": a vivid visual scene description for an illustrator (no text to draw, no words on signs). Each brief MUST be different and visibly progress the journey. The brief MUST spell out the same specific moment as the text on the previous page: same characters named in that verse, same action, setting, props — not a generic scene. The brief must list **exactly** the same named cast as that text page (hero, buddy, and any game people actually in that verse). NEVER add guardians, helpers, or creatures the verse does not mention. NEVER duplicate the buddy as two unicorns unless the text says so. CRITICAL FOR CONSISTENCY: DO NOT re-describe permanent looks (clothes, hair colours) in the brief! Just state WHO (using names from the text) and WHAT they do. The illustrator has the master designs.
  ENVIRONMENT DETAIL (very important — each brief must paint a different *place* on the journey, matching the SETTING and PLOT IDEA above):
    Every illustrationBrief MUST contain at least 2 specific environmental nouns (architecture, foliage, terrain, structure, weather, depth) AND at least 1 named prop or focal object from that beat. The environmental nouns MUST come from the actual SETTING and PLOT IDEA — if the plot says CASTLE, the briefs are inside or around a castle (stone walls, banners, courtyards, towers, throne room, drawbridge, tapestries) NOT in deep woods. If the plot says CAVE, the briefs are inside cave passages and chambers. If the plot says BEACH or UNDERSEA or SPACE, paint THAT setting. Only paint a forest if the plot or setting actually mentions woods/forest/trees.
    Examples of good briefs — note how each one fits a DIFFERENT plot, and how each only includes things the plot would actually contain:
      • CASTLE plot: "${childName} and the dragon peek around a stone archway in a torchlit castle corridor, banners hanging from the wall, suit of armour standing nearby."
      • CASTLE plot: "${childName} climbs a spiral stone staircase inside a tower, narrow window showing the dragon flying past in the night sky."
      • WOODS plot: "${childName} and the unicorn walk between tall trees at sunset, soft sunbeams falling on the path."
      • SPACE plot: "${childName} bounces on a soft pastel asteroid, ringed planet huge in the starry sky behind them."
      • UNDERWATER plot: "${childName} swims past a coral reef, rays of sunlight cutting down through the water, a friendly turtle alongside."
      • BAKERY plot: "${childName} stands at a wooden counter rolling out dough, flour cloud puffing up, big stone oven glowing warmly behind."
    Vary the *place* between spreads in line with the plot's beats — e.g. CASTLE: gates → corridor → great hall → spiral tower → rooftop → courtyard with the dragon flying overhead. Don't repeat the same backdrop. State a different camera angle / shot type for each (wide establishing shot, mid shot, low-angle hero kneeling, over-the-shoulder peering, etc).
    Background details ARE allowed (in fact required) — what is NOT allowed is faced extras the verse doesn't mention.
    COMPOSITION: main characters in the middle vertical band with headroom and visible feet.
  OPENING SPREAD (page 2 only — the first illustrationBrief): MUST match page 1 text and the child's plot, AND establish the actual SETTING (castle / woods / cave / beach / space / etc. — whichever the plot calls for). Only characters named on page 1 (usually ${childName} and the buddy; plus game people only if page 1 names them). Example: if the plot is "hide and seek in a castle", the opening establishes castle gates / courtyard / great hall — NOT a forest. No unwritten extras.
  When game people with portrait notes appear on a picture page, the brief should mention them looking like those notes (hair, outfit colours, age vibe).
- If a "plot idea" is given, you MUST make it the central theme of the story and feature it heavily in EVERY illustration brief. If it is empty, invent a short happy outing that fits the setting.
- PLOT FIDELITY — read the plot idea LITERALLY:
  • Use ONLY props, locations, and story beats that actually appear in the plot the child wrote. Don't invent extras.
  • Resolve the story with whatever the plot actually says is the climax — for example "they realised the dragon could fly", "they finally caught the cheeky dragon", "the cake came out of the oven golden brown". Don't substitute a generic ending.
  • Stay inside the setting the plot names. If the plot says castle, every spread is in the castle. If beach, every spread is on the beach.
  • Use only the named cast (hero + buddy + any named friends). Don't add background characters, animals, or family members.
  • If the plot has a narrative twist or reveal, build to that reveal as the climax around spread 4 or 5 — not an off-hand line.
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
Page 1 and page 2 must OPEN this plot: the first illustration (page 2 brief) is the first scene readers see — match this plot's SETTING, props, and buddy. Read the plot literally: if it says "castle", spread 1 is the castle (gates, great hall, courtyard); if it says "woods", spread 1 is woods; if it says "underwater", spread 1 is underwater. Do NOT default to woods.
${
    familyNames.length === 0
      ? `Picture cast rule: only people/creatures **named in each verse** may appear on that spread's illustration — usually ${childName} and the buddy. Do not name anyone in a brief who is not in the paired text.\n`
      : `Picture cast rule: only names that actually appear in each verse (including the game people above when you put them in the scene). No invented crowd.\n`
  }
Return JSON shape: { "title": string, "characterDesign": string, "bookColor": "pink" | "blue" | "green", "pages": [ { "text": string, "illustrationBrief": string | null }, ... 12 items ] }`;

  const bookCoverColorReq = String(body.bookCoverColor ?? "").trim();

  let story: StoryJson;
  try {
    story = await openaiChatJson(apiKey, system, user);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "story_failed" }, 502);
  }

  const briefsSummary = ILLUSTRATED_PAGE_INDICES.map((idx) => story.pages[idx]?.illustrationBrief)
    .filter(Boolean)
    .join(" | ")
    .slice(0, 900);

  let compiledLock = "";
  try {
    compiledLock = await compileCharacterLockForImages(apiKey, {
      childName,
      buddyKey: characterKey,
      buddyDesc: characterDesc,
      placeDesc,
      plotHint,
      draftDesign: story.characterDesign || "",
      briefsSummary,
    });
  } catch (e) {
    console.warn("[clever-service] compileCharacterLock failed", e);
  }

  const duoImageCastFallback =
    `HERO: ${childName}, young child, friendly rounded face, simple solid-colour top and trousers, soft matte clay toy 3D — always the same human hero in every spread. ` +
    `BUDDY: ${characterDesc}, exactly ONE individual of this species in every image — never duplicate, never parent+baby pair, same toy-clay style on every page.`;

  const castBible =
    compiledLock.length > 120
      ? compiledLock
      : familyNames.length === 0
        ? duoImageCastFallback
        : story.characterDesign && story.characterDesign.length > 80
          ? story.characterDesign
          : duoImageCastFallback;

  const stylePreamble =
    "A completely textless illustration. DO NOT include any writing, letters, words, typography, labels, speech bubbles, newspapers, stone runes, book pages with text, loose paper sheets, scrolls, receipts, notebooks, stationery, litter, or ground clutter that looks like fake writing — no blurry shapes that look like fake paragraphs or gibberish anywhere. " +
    "No logos, social-media marks, app icons, or brand symbols. " +
    "The left third must be only smooth colour, soft sky, plain wall, or gentle gradient — zero pseudo-text texture there (the app draws real text in HTML). " +
    "CRITICAL LAYOUT RULE: Leave the left half of the image mostly uncluttered with a simple, soft, darker background so that WHITE storybook text can be printed over it clearly. Place the main characters and action on the right half or center-right of the image. " +
    "FRAMING: Keep hero and buddies mostly in the vertical middle band — heads not jammed against the top edge, feet not chopped by the bottom edge. Never line up the whole cast as a tiny strip along the bottom like stickers; show comfortable ground and body. " +
    "STYLE: soft matte clay and toy-plastic 3D ONLY — rounded limbs, gentle pastel lighting, not realistic human skin, not glossy CGI. Edge-to-edge scene, no frames or borders. Wholesome and safe for toddlers. " +
    `HERO VISIBILITY: When "${childName}" appears in SCENE ACTION, they must be clearly visible (face on, not swapped for another kid). ` +
    "ONE BUDDY ANIMAL: Only one imaginary buddy creature from the BUDDY line in the image (e.g. one unicorn), not clones or a big+little pair, unless SCENE ACTION names two. " +
    "TEXT-LOCKED: ONLY characters explicitly named in SCENE ACTION — same roster as this spread's verse, same count. NO unnamed extras: no villagers, silhouettes with faces, filler torch-bearers, spare animals, or audience. NO logos. Background = whatever the ENVIRONMENT line specifies (castle interior/grounds, woodland, cave, beach, garden, space, etc.) without extra faced characters. NO signs with lettering, carved runes, or flyers. ";

  const envTheme =
    `ENVIRONMENT (paint THIS exact setting on every spread — do not default to woods or any other generic backdrop): ${placeDesc}. ` +
    (plotHint.length > 0
      ? `THEME / PLOT IDEA from the child (READ LITERALLY — if it mentions castle, paint a castle; cave, paint a cave; beach, paint a beach; etc.): ${plotHint}. `
      : "") +
    plotLightingEnvAddon(plotHint, childName);

  const pagesOut: { text: string; imageUrl: string | null }[] = [];
  let sceneImageUrl: string | null = null;
  let firstPanelVisualLockUsed = false;
  let falReduxSpreadCount = 0;
  let falTextSpreadCount = 0;
  let falCastAnchorUsed = false;
  let gptImageSpreadCount = 0;

  /** Image generation mode: "fal" (default) or "gptimage" (OpenAI gpt-image-1 / future GPT Image 2). */
  const imageMode = (Deno.env.get("STORYBOOK_IMAGE_MODE") ?? "")
    .trim()
    .toLowerCase();
  const useGptImage = imageMode === "gptimage" || imageMode === "openai-image";

  const falKey = (Deno.env.get("FAL_KEY") ?? "").trim();
  const falDisabled = Deno.env.get("STORYBOOK_FAL_DISABLE") === "1";
  const useFalRedux = Boolean(falKey) && !falDisabled;
  const falReduxModel =
    (Deno.env.get("STORYBOOK_FAL_MODEL") ?? "").trim() ||
    "fal-ai/flux-pro/v1.1-ultra/redux";
  const falTextModel =
    (Deno.env.get("STORYBOOK_FAL_TEXT_MODEL") ?? "").trim() ||
    "fal-ai/flux-pro/v1.1";
  const falStrengthRaw = Number(Deno.env.get("STORYBOOK_FAL_REFERENCE_STRENGTH") ?? "0.35");
  const falStrength = Number.isFinite(falStrengthRaw) ? falStrengthRaw : 0.35;

  try {
    const briefs: { index: number; brief: string; verse: string }[] = [];
    for (const i of ILLUSTRATED_PAGE_INDICES) {
      const p = story.pages[i];
      if (p?.illustrationBrief && String(p.illustrationBrief).trim()) {
        // Picture pages live at even 0-based indices (1,3,5,7,9,11). The
        // matching VERSE — the rhyming text the child reads aloud — lives at
        // i-1. We pass it down to the image prompt so the model can read the
        // actual story beat verbatim, not just the LLM-paraphrased brief.
        const verse = String(story.pages[i - 1]?.text ?? "").trim();
        briefs.push({
          index: i,
          brief: String(p.illustrationBrief).trim(),
          verse,
        });
      }
    }

    const staggerMs = 450;
    const urls: string[] = [];

    if (briefs.length === 0) {
      throw new Error("no_illustration_briefs");
    }

    const spread1Prompt = composeDallePrompt({
      preamble: stylePreamble,
      envTheme,
      sceneBrief: briefs[0].brief,
      castBible,
      firstPanelLock: "",
      heroFirstName: childName,
    });

    /** When set (default): one T2I “cast lineup”, then all 6 spreads = Fal image→image (Redux) from that anchor — strongest consistency. */
    const useCastAnchor =
      !useGptImage && useFalRedux && Deno.env.get("STORYBOOK_FAL_CAST_ANCHOR") !== "0";

    const anchorPreamble =
      "A completely textless illustration. NO letters, words, typography, labels, speech bubbles, signs with text, book pages with writing, loose papers, scrolls, glyph noise, watermarks, or fake paragraph texture anywhere. Plain smooth background regions only — no pseudo-text. " +
      "CAST LINEUP / MODEL SHEET for a kids picture book: every character line in LOCKED CAST below (hero, buddy, and any named game people only) — no one else, no third mascot or crowd, no duplicate unicorns. Together in ONE frame, neutral friendly poses, " +
      "full bodies visible above the bottom edge with headroom, soft matte clay and toy-plastic 3D, gentle pastel light, plain soft background so each design reads clearly. " +
      "Edge-to-edge, wholesome for toddlers. ";

    const anchorPrompt = (
      anchorPreamble + envTheme + "LOCKED CAST (draw exactly):\n" + castBible
    ).slice(0, DALLE3_PROMPT_MAX);

    let panelLock = "";

    if (useGptImage) {
      // STRICT MODE — when STORYBOOK_IMAGE_MODE=gptimage is set, this is the
      // ONLY pipeline we want to run. No silent fallback to Fal or DALL-E.
      // If anything fails, we throw with a clear, actionable error so the
      // caller knows GPT Image specifically failed (rather than getting an
      // imageless 200 or a mixed-style book).
      let anchorOut: { url: string; bytes: Uint8Array };
      try {
        anchorOut = await gptImageGenerate(apiKey, anchorPrompt);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        throw new Error(`gpt_image_anchor_failed: ${detail}`);
      }

      {
        // Skip the text-based visual lock for the GPT Image path — the anchor
        // PNG is attached as a reference to EVERY spread edit, so a second
        // text description of "what the anchor looks like" is redundant and
        // costs ~10s of wall-clock we don't have inside Supabase's 150s edge
        // timeout. Identity is already locked by pixels. Visual lock stays in
        // play for the Fal / DALL·E paths below.
        const refBytes = anchorOut.bytes;
        // OpenAI gpt-image-1 has a tight per-minute image cap (5/min on tier 1,
        // shared across generations + edits). Going fully serial pushed past
        // Cloudflare/Supabase's 150s wall-clock (HTTP 546). Instead we run in
        // CHUNKS in parallel: first 4 spread edits together (anchor + 4 = 5,
        // exactly at the per-minute ceiling), short cooldown so the anchor's
        // request leaves the rate window, then the remaining edits in parallel.
        // The 429 retry inside gptImageEdit catches any leftover bursts.
        const chunkSize = (() => {
          const raw = Number(Deno.env.get("STORYBOOK_GPTIMAGE_CHUNK_SIZE"));
          return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 4;
        })();
        const interChunkWaitMs = (() => {
          const raw = Number(Deno.env.get("STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS"));
          return Number.isFinite(raw) && raw >= 0 ? raw : 20000;
        })();

        // SHOT PLAN — keeps each of the 6 spreads at a different camera
        // distance so the book reads as a journey, not 6 portraits. Notes are
        // intentionally generic — no example props (no "treasure", no
        // "glowing flower"), because mentioning those words even in negation
        // primes gpt-image-1 to render them.
        const shotPlan = [
          {
            label: "WIDE ESTABLISHING SHOT",
            note:
              "Wide establishing shot. Characters fill roughly the middle 35-45% of the frame, full bodies head to toe. The setting fills the rest with real depth — architecture, terrain, sky, ground.",
          },
          {
            label: "MID SHOT",
            note:
              "Mid shot from roughly the knees up. Characters occupy centre-left to centre. Setting visible behind and to the right with depth.",
          },
          {
            label: "OVER-THE-SHOULDER / DISCOVERY ANGLE",
            note:
              "Three-quarter or over-the-shoulder angle. One character partly visible from behind framing the focal moment from the verse. The other character reacts. The setting fills the surrounding space.",
          },
          {
            label: "CLOSE-UP ON THE VERSE'S FOCAL MOMENT",
            note:
              "Close-up on whatever the facing-page verse focuses on for this beat — the named action, expression, or object. Characters lean in from the edges; partial faces and hands are fine. The setting still shows behind with depth.",
          },
          {
            label: "WIDE JOURNEY SHOT — DIFFERENT PART OF THE SETTING",
            note:
              "A second wide shot, but in a DIFFERENT corner of the same setting from spread 1. Characters smaller (roughly 25-35% of the canvas), environment dominates with strong depth and a clear sense of progress.",
          },
          {
            label: "MEDIUM CLOSE ON FACES — WARM FINALE",
            note:
              "Medium-close on the characters' faces and upper bodies sharing a warm finale moment (smile, laugh, hug, cheer). Setting clearly visible behind them.",
          },
        ];

        // Clean, POSITIVE-ONLY edit prompt builder. We attach the anchor PNG as
        // the character reference; everything else describes ONLY what to
        // paint, not what to avoid. Negative lists were paradoxically nudging
        // gpt-image-1 toward stock props (treasure chests, glowing flowers,
        // mossy logs) — every "no treasure" line counts as a treasure mention
        // to the model. So we list nothing to avoid: just the positive scene.
        const buildEditPrompt = (b: typeof briefs[number], idx: number) => {
          const shot = shotPlan[idx] ?? shotPlan[shotPlan.length - 1];
          const verseLines = b.verse.trim().slice(0, 500);

          const blocks: string[] = [];

          // 1. Style + reference instruction
          blocks.push(
            "Children's picture-book illustration, soft matte clay and toy-plastic 3D, gentle pastel light, edge-to-edge with no borders or text. " +
              "The attached reference image shows the cast on a neutral backdrop — use it ONLY to lock the characters' identity (faces, hair, outfit colours, species, body shape). Repaint the world fresh.",
          );

          // 2. Setting (the override-resolved placeDesc + plotHint)
          blocks.push(
            `SETTING — paint exactly this world on every spread:\n${placeDesc}.${plotHint ? `\nThe child's story idea: ${plotHint}` : ""}`,
          );

          // 3. Shot framing
          blocks.push(`SHOT TYPE (spread ${idx + 1} of ${shotPlan.length}): ${shot.label}. ${shot.note}`);

          // 4. The exact moment, from the verse + brief
          if (verseLines) {
            blocks.push(
              `THIS SPREAD'S MOMENT (from the rhyming verse on the facing page — show every action and named object literally):\n"""\n${verseLines}\n"""`,
            );
          }
          blocks.push(`SCENE NOTE: ${b.brief}`);

          // 5. Cast — keep the bible compact for the edit prompt
          const castSnippet = castBible.trim().slice(0, 800);
          blocks.push(
            `CAST (paint exactly these named characters and only these — match the reference image for each):\n${castSnippet}`,
          );

          // 6. Critical constraint — kept simple and positive-leaning
          blocks.push(
            "Paint ONLY what the verse and SCENE NOTE describe — no extra props, no extra characters, no background crowd, no signs or writing in the picture.",
          );

          return blocks.join("\n\n");
        };

        for (
          let chunkStart = 0;
          chunkStart < briefs.length;
          chunkStart += chunkSize
        ) {
          if (chunkStart > 0 && interChunkWaitMs > 0) {
            console.info(
              `[clever-service] cooldown ${interChunkWaitMs}ms before next gpt-image chunk`,
            );
            await delay(interChunkWaitMs);
          }
          const slice = briefs.slice(chunkStart, chunkStart + chunkSize);
          const chunkResults = await Promise.all(
            slice.map(async (b, localIdx) => {
              const idx = chunkStart + localIdx;
              const editPrompt = buildEditPrompt(b, idx);
              try {
                const out = await gptImageEdit(apiKey, editPrompt, [refBytes]);
                return { idx, url: out.url };
              } catch (e) {
                console.warn(
                  "[clever-service] GPT Image edit failed for spread",
                  idx,
                  e,
                );
                throw e;
              }
            }),
          );
          for (const r of chunkResults) {
            urls[r.idx] = r.url;
            gptImageSpreadCount++;
          }
        }
        // Strict completeness check — if for any reason urls didn't fill,
        // surface a clear error so the UI doesn't render an imageless book.
        const missing = briefs
          .map((_, i) => i)
          .filter((i) => !urls[i] || typeof urls[i] !== "string");
        if (missing.length > 0) {
          throw new Error(
            `gpt_image_incomplete: missing ${missing.length}/${briefs.length} spread(s) at index ${missing.join(",")}`,
          );
        }
      }
    }

    if (!useGptImage && useCastAnchor) {
      let anchorUrl: string | null = null;
      try {
        anchorUrl = await falFluxProTextToImageUrl(falKey, falTextModel, anchorPrompt);
        falTextSpreadCount = 1;
      } catch (e) {
        console.warn(
          "[clever-service] Fal cast-anchor T2I failed; falling back to spread-1 T2I + Redux×5",
          e,
        );
      }

      if (anchorUrl) {
        try {
          panelLock = await visualLockFromFirstImage(apiKey, anchorUrl);
          firstPanelVisualLockUsed = panelLock.length > 40;
        } catch (e) {
          console.warn("[clever-service] visual lock (anchor) failed", e);
        }

        const allFromAnchor = await Promise.all(
          briefs.map(async (b, idx) => {
            if (idx > 0) await delay(idx * staggerMs);
            const composed = composeDallePrompt({
              preamble: stylePreamble,
              envTheme,
              sceneBrief: b.brief,
              castBible,
              firstPanelLock: panelLock,
              heroFirstName: childName,
            });
            try {
              const openingPrefix =
                idx === 0
                  ? "OPENING SPREAD — replace the plain reference backdrop with a full painted environment from the ENVIRONMENT and SCENE ACTION above. Read it literally: castle, woods, cave, beach, garden, space — paint that exact setting with depth, architecture, terrain, sky/ceiling. Include hand-held torches or lanterns only if SCENE ACTION says so. " +
                    "Match THEME/LIGHTING/MOOD exactly — not a bright sunny epilogue field or unrelated finale. " +
                    "Keep hero and every creature IDENTICAL to the reference (faces, hair, outfit colours, species, size). "
                  : "";
              const falPrompt =
                openingPrefix +
                "Story spread — NEW scene, poses, and background for this moment only. " +
                "Keep hero and every creature IDENTICAL to the reference lineup (faces, hair, outfit colours, species, size) — match reference character COUNT only; add no beings not named in SCENE ACTION. " +
                "TEXTLESS — no letters, fake text, signs, logos, paper scraps with writing, or glyph noise; soft matte clay toy 3D. " +
                "FRAME: subjects in middle vertical band with feet and faces fully inside the canvas — not a bottom-cropped row. " +
                composed.slice(0, FAL_REDUX_PROMPT_MAX - 420);
              // Lower image→image strength on spread 1 so the opening scene can diverge from the neutral cast lineup.
              const reduxStrength =
                idx === 0 ? Math.max(0.24, falStrength - 0.06) : falStrength;
              const u = await falFluxReduxImageUrl(
                falKey,
                falReduxModel,
                anchorUrl as string,
                falPrompt,
                reduxStrength,
              );
              falReduxSpreadCount++;
              return u;
            } catch (e) {
              console.warn("[clever-service] Fal Redux (anchor) failed for spread", idx, e);
              throwFalImage(`Fal image-to-image failed for spread ${idx + 1} of 6`, e);
            }
          }),
        );
        for (let i = 0; i < allFromAnchor.length; i++) {
          urls[i] = allFromAnchor[i];
        }
        falCastAnchorUsed = true;
      }
    }

    /* Legacy: spread 1 = T2I, spreads 2–6 = Redux(spread1). When FAL off, anchor off, anchor T2I failed, or incomplete urls. */
    const needLegacySpreads =
      !useGptImage &&
      (!useFalRedux ||
        urls.length < briefs.length ||
        (useCastAnchor && falTextSpreadCount === 0));

    if (needLegacySpreads) {
      if (useFalRedux && useCastAnchor && falTextSpreadCount === 0) {
        urls.length = 0;
      }
      if (urls.length === 0) {
        if (useFalRedux) {
          try {
            urls[0] = await falFluxProTextToImageUrl(falKey, falTextModel, spread1Prompt);
            falTextSpreadCount = 1;
          } catch (e) {
            console.warn("[clever-service] Fal text-to-image (spread 1) failed", e);
            throwFalImage("Fal text-to-image failed for the first picture", e);
          }
        } else {
          urls[0] = await openaiImageUrl(apiKey, spread1Prompt, "1024x1024");
        }

        if (!panelLock) {
          try {
            panelLock = await visualLockFromFirstImage(apiKey, urls[0]);
            firstPanelVisualLockUsed = panelLock.length > 40;
          } catch (e) {
            console.warn("[clever-service] visual lock failed", e);
          }
        }

        if (briefs.length > 1) {
          const referenceStillUrl = urls[0];
          const rest = await Promise.all(
            briefs.slice(1).map(async (b, idx) => {
              if (idx > 0) await delay(idx * staggerMs);
              const composed = composeDallePrompt({
                preamble: stylePreamble,
                envTheme,
                sceneBrief: b.brief,
                castBible,
                firstPanelLock: panelLock,
                heroFirstName: childName,
              });
              if (useFalRedux) {
                if (!referenceStillUrl) {
                  throwFalImage("Fal image-to-image missing reference from first picture", new Error("no_reference_url"));
                }
                try {
                  const falPrompt =
                    "New story moment — change poses, action, and background to match the scene. " +
                    "Keep the same hero face, hair, outfit colours, and the same buddy and named creatures as the reference — only beings named in SCENE ACTION, no new animals or people. " +
                    "TEXTLESS — no words, signs, book pages with text, logos, paper scraps with writing, or gibberish texture; soft matte clay toy 3D only. " +
                    "FRAME: keep characters in the middle-to-upper-middle of the frame with visible feet — do not squash everyone along the bottom edge. " +
                    composed.slice(0, FAL_REDUX_PROMPT_MAX - 220);
                  const u = await falFluxReduxImageUrl(
                    falKey,
                    falReduxModel,
                    referenceStillUrl,
                    falPrompt,
                    falStrength,
                  );
                  falReduxSpreadCount++;
                  return u;
                } catch (e) {
                  console.warn("[clever-service] Fal Redux failed", e);
                  throwFalImage(`Fal image-to-image failed for spread ${idx + 2} of 6`, e);
                }
              }
              return openaiImageUrl(apiKey, composed, "1024x1024");
            }),
          );
          for (let i = 0; i < rest.length; i++) {
            urls.push(rest[i]);
          }
        }
      }
    }

    /** Final picture page (page 12): reuse first spread art for a cosy bookend (disable with STORYBOOK_REUSE_FIRST_ON_LAST=0). */
    const reuseFirstIllustrationOnLast = Deno.env.get("STORYBOOK_REUSE_FIRST_ON_LAST") !== "0";
    if (reuseFirstIllustrationOnLast && briefs.length >= 2 && urls.length >= briefs.length) {
      const first = urls[0];
      if (first && typeof first === "string" && /^https?:\/\//i.test(first.trim())) {
        urls[briefs.length - 1] = first;
      }
    }

    sceneImageUrl = urls[0] || null;

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
    const isGpt = useGptImage && /^gpt_image_/i.test(detail);
    const errKey = isGpt
      ? "gpt_image_failed"
      : e instanceof FalImageError
      ? "fal_failed"
      : "images_failed";
    return jsonResponse(
      {
        error: errKey,
        detail,
        imageMode,
        title: story.title,
        pages: story.pages.map((p) => ({ text: p.text.trim(), imageUrl: null })),
      },
      502,
    );
  }

  const bookColorOut = coerceBookColor(bookCoverColorReq, story.bookColor, childName);

  return jsonResponse({
    title: story.title,
    bookColor: bookColorOut,
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
      characterLockCompiled: compiledLock.length > 0,
      firstPanelVisualLock: firstPanelVisualLockUsed,
      falTextModel: useFalRedux ? falTextModel : null,
      falTextSpreads: falTextSpreadCount,
      falCastAnchorUsed,
      falReduxModel: useFalRedux ? falReduxModel : null,
      falReduxSpreads: falReduxSpreadCount,
      imageMode: useGptImage ? "gptimage" : "fal",
      gptImageModel: useGptImage
        ? (Deno.env.get("STORYBOOK_GPTIMAGE_MODEL") ?? "").trim() || "gpt-image-1"
        : null,
      gptImageSpreads: useGptImage ? gptImageSpreadCount : 0,
      reuseFirstIllustrationOnLast:
        Deno.env.get("STORYBOOK_REUSE_FIRST_ON_LAST") !== "0",
    },
  });
});
  