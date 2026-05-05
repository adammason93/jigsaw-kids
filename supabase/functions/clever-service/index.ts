import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * OpenAI speech built-in voices for `gpt-4o-mini-tts` (full set).
 * `tts-1` / `tts-1-hd` only support: alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer.
 * @see https://platform.openai.com/docs/guides/text-to-speech#voice-options
 *
 * Choose one via `OPENAI_TTS_VOICE`, `?ttsVoice=`, or `STORYBOOK_TTS_VOICE` in storybook.js.
 * Default voice is **ballad** (warm male-presenting; good for story read-aloud).
 */
const OPENAI_TTS_VOICE_IDS = [
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

type OpenAiTtsVoiceId = (typeof OPENAI_TTS_VOICE_IDS)[number];

const OPENAI_TTS_VOICE_SET: Set<string> = new Set(
  OPENAI_TTS_VOICE_IDS as unknown as string[],
);

/** Subset supported by `tts-1` and `tts-1-hd` only. */
const OPENAI_TTS_LEGACY_VOICE_SET: Set<string> = new Set([
  "alloy",
  "ash",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
]);

const DEFAULT_TTS_VOICE: OpenAiTtsVoiceId = "ballad";

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const LEGACY_TTS_MODELS = new Set(["tts-1", "tts-1-hd"]);

function resolveOpenAiTtsModel(): "gpt-4o-mini-tts" | "tts-1" | "tts-1-hd" {
  const m = Deno.env.get("OPENAI_TTS_MODEL")?.trim().toLowerCase() ?? "";
  if (LEGACY_TTS_MODELS.has(m)) {
    return m as "tts-1" | "tts-1-hd";
  }
  return DEFAULT_TTS_MODEL;
}

function resolveOpenAiTtsVoice(requestedQuery: string | null): OpenAiTtsVoiceId {
  const q = requestedQuery?.trim().toLowerCase() ?? "";
  if (q && OPENAI_TTS_VOICE_SET.has(q)) {
    return q as OpenAiTtsVoiceId;
  }
  const fromEnv = Deno.env.get("OPENAI_TTS_VOICE")?.trim().toLowerCase() ?? "";
  if (fromEnv && OPENAI_TTS_VOICE_SET.has(fromEnv)) {
    return fromEnv as OpenAiTtsVoiceId;
  }
  return DEFAULT_TTS_VOICE;
}

/** If using `tts-1` / `tts-1-hd`, coerce to a supported voice (ballad → echo: upbeat male). */
function coerceVoiceForTtsModel(
  voice: OpenAiTtsVoiceId,
  model: string,
): OpenAiTtsVoiceId {
  if (model === DEFAULT_TTS_MODEL) {
    return voice;
  }
  if (OPENAI_TTS_LEGACY_VOICE_SET.has(voice)) {
    return voice;
  }
  if (voice === "ballad" || voice === "verse") {
    return "echo";
  }
  if (voice === "cedar" || voice === "marin") {
    return "onyx";
  }
  return "nova";
}

const CHARACTERS: Record<string, string> = {
  unicorn:
    "a friendly horse-like unicorn with four hooves, equine face and body, single spiral horn on forehead, sparkly mane and tail",
  dragon: "a small cute dragon with soft round wings",
  dinosaur:
    "a friendly small upright cartoon dinosaur with a soft rounded snout, big eyes, short tail, and stubby arms — toy-clay style, rounded scales, never scary",
  robot: "a round friendly robot with big eyes",
  bunny: "a fluffy bunny with long ears",
  teddy: "a cuddly teddy bear",
  cat: "a cute round cartoon cat with big eyes and soft striped fur, tiny paws, simple whiskers",
  dog: "a friendly floppy-eared cartoon puppy with big eyes, soft fur, and a wagging tail",
  fox: "a small bright storybook fox with big ears, a fluffy tail, and a friendly face — soft warm colours",
  penguin: "a round cartoon penguin with big eyes and simple flippers — classic black-and-white markings, wobbly cute stance",
  owl: "a small wide-eyed cartoon owl with soft feather tufts and rounded wings — can appear as a gentle fuzzy mascot with big friendly eyes, simple blue-and-white stripes or a soft scarf, plush toy style (no logos or readable text), never scary or hyper-realistic",
  octopus:
    "a small cheerful cartoon octopus with a round body and curly tentacles — soft colours, big friendly eyes, rounded suckers",
  giraffe:
    "a gentle cartoon giraffe with soft biscuit-yellow fur, cocoa spots, a friendly long neck, and big kind eyes — toy-clay style",
  bee: "a tiny friendly cartoon bumblebee with fuzzy amber-and-inky stripes, translucent round wings, and a sweet smile — never scary",
  butterfly:
    "a bright storybook butterfly with big rounded patterned wings (soft spots, no logos), tiny smiley face, and gentle antennae",
  ladybug:
    "a round cherry-red cartoon ladybug with soft black spots, shiny friendly eyes, and tiny dots for feet",
  frog: "a bouncy cartoon frog in fresh leaf-green with a wide happy grin, big golden eyes, and rounded toe-pads — pond-pal energy",
  hedgehog:
    "a small fluffy hedgehog with soft caramel spines, fuzzy cream tummy, pink nose, and shy happy eyes",
  mouse: "a tiny friendly cartoon mouse with big ears, pink nose, soft grey fur, and a curly tail — storybook cute",
  hippo:
    "a round lavender-grey cartoon hippo with a huge friendly smile, tiny ears, and tubby toy proportions — bath-time buddy",
  flamingo:
    "a tall sweet cartoon flamingo with soft coral-pink feathers, one leg tucked, big kind eyes, and a curved beak smile",
  turtle:
    "a little cheerful turtle with a rounded mossy-green shell, bright belly, and stubby legs scrambling along happily",
  koala:
    "a cuddly grey koala with fluffy ears, button nose, and gentle black eyes — holding a sprig of round leaves, plush toy style",
  llama:
    "a fluffy cream-and-tan cartoon llama with a tasselled blanket, gentle smile, and big friendly eyes — silly and sweet",
  raccoon:
    "a wee bandit-mask raccoon with a fluffy striped tail and curious shiny eyes — soft rounded cartoon proportions",
  seal:
    "a smooth friendly cartoon seal with wide dark eyes and a sweet smile — simple flippers and soft grey coat",
  otter:
    "a slippery-cute otter with round belly and tiny paws, often floating on its back with a sparkly pebble toy",
  panda:
    "a chunky roly-poly panda cub with bold eye patches and tiny rounded ears — clumsy hugs energy",
  bear:
    "a round grizzly-brown bear cub with tiny ears and a tummy built for blueberry picnics — soft plush toy vibes",
  polarbear:
    "an Arctic-white polar bear cub with soft fur ruff and pink nose peeking through snow dust — cuddly iceberg buddy",
  lion:
    "a tiny fuzzy-maned lion cub with oversized paws — brave smile but kitten-soft and never scary",
  tiger:
    "a stripy-orange tiger cub with big whisker dots and floppy ears — storybook safari pal, gentle roar optional",
  monkey:
    "a small tousle-haired monkey friend with curled tail wrapped around branches — sparkly eyes full of bananas",
  elephant:
    "a baby elephant with oversized ears draped like cozy blankets — tiny trunk curled like a telescope",
  zebra:
    "a soft zebra foal with wavy monochrome stripes hugging marshmallow fluff — clumsy hoof dance energy",
  cow:
    "a friendly Jersey cow calf with dreamy eyes and a daisy-chewing grin — grassy meadow companion",
  pig:
    "a pink piglet wearing a tiny knitted vest — sparkly snoot and giggly curls on the tail tip",
  sheep:
    "a cloud-fluffy lamb wearing a plaid neck bow — sparkly eyes shining through curls",
  horse:
    "a short-legged pony foal with a silky pastel mane and tiny golden horseshoe charm dangling from its forelock",
  chicken:
    "a round-cheek hen chick wearing a tiny polka-dot kerchief — puffy fluff and confident waddle energy",
  duck:
    "a sunny duckling in soft butter-yellow fluff with sailor kerchief knot — sparkly eye and happy waddle rhythm",
  parrot:
    "a petite parrot with candy-coloured plumage and head feathers like party streamers — soft rounded vector friend",
  deer:
    "a dappled fawn with velvet antler nubs and tiny white tail flag — woodland shy but brave when needed",
  dolphin:
    "a sleek sparkly dolphin calf with giggly dorsal fins that catch rainbows mid-leap — never scary predator vibes",
  whale:
    "a sky-blue whale calf with bubbly water-trail curls and shimmering spots — sleepy smile and gentle tides",
  crab:
    "a toy-bright crab with rounded claws waving hello — sparkly shell polka dots like candy buttons",
  snail:
    "a glossy snail buddy with swirling shell painted like a lollipop swirl — sparkly antenna boops happily",
  caterpillar:
    "a chunky storybook caterpillar with rainbow segments and sparkly shoes on every foot — clumsy giggles",
  lightningbug:
    "a whimsical glow-buddy made of gentle starlight sparks with a grin — cuddly bedtime firefly sparkle, never buggy-scary",
  fairy:
    "a palm-sized sparkly fairy wearing petal armour and ribbon wings — giggly dust trail and leafy crown",
  alien:
    "a squishy lavender alien buddy with oversized curious eyes — soft antennas and zero scary tech",
  ghost:
    "a friendly drifting bedsheet ghost with rosy-cheek grin — cozy lantern glow tucked under its folds",
  snowbuddy:
    "a sparkly snow-character buddy wearing scarf wraps and button eyes — giggly avalanche of hugs warmth",
  mermaidbuddy:
    "one mer-kid friend with shimmering tail scales kept soft and chunky — sparkly shell accessories, wholesome sea vibes",
  /** Human-only books: no imaginary creature companion. */
  nobuddy:
    "NONE — no imaginary creature buddy; humans only unless the plot explicitly requires a specific creature.",
};

const PLACES: Record<string, string> = {
  beach: "a sunny beach with gentle waves and sand castles",
  woods: "a forest with tall trees — picture-book woods; match story mood (sunlit glade or dim mystical understory per plot)",
  castle: "a fairy-tale castle with colourful flags",
  garden: "a flower garden with butterflies",
  space: "a friendly cartoon planet with stars and a pastel rocket",
  sea: "open sea and rolling waves — wide horizon, soft blues and foam, friendly sail shapes or a wooden ship rail in the mid-distance, gulls and sparkle",
  pirateship:
    "aboard a colourful storybook sailing ship — wooden decks, rope coils, masts and billowing sails, brass fittings; cheerful pirate-adventure mood with no skull flags, cannons, or weapons",
  mountain:
    "rolling green hills and rocky peaks — winding paths, wildflowers, soft clouds, maybe a wooden bridge or lookout, crisp bright air",
  zoo: "a cheerful storybook zoo — wide leafy paths, friendly rounded enclosure fences, toy-bright viewing decks, colourful kiosks with no readable text, no crowds of stranger faces",
  farm: "a sunny storybook farm — red barn, golden hay bales, green fields, fence lines, a tractor in soft focus, chickens scratching nearby",
  circus:
    "a circus fairground and big top — striped tent, bunting flags, soft lights, carousel shapes in the distance, cotton-candy colours, gentle silly fun (no scary clowns)",
  city:
    "a friendly toy-town city — rounded pastel buildings, bakeries and shop awnings, flower boxes, simple cars and lampposts, no readable shop signs",
  train:
    "a vintage storybook train journey — gleaming locomotive, plush carriage seats, big windows showing passing hills or coastline, station platform glimpses",
  lake: "a peaceful lake shore — reeds, wooden jetty or rowing boat, lily pads, distant treeline, gentle ripples, dragonflies",
  snow: "a snowy winter landscape — soft drifts, pine trees with sugar-frost tops, scarf-bright colours, maybe a sled path and distant cottages with glowing windows",
  desert: "soft cartoon desert dunes — warm rose and gold sand, rounded cactus shapes, distant rock mesas, clear turquoise sky",
  museum:
    "a bright children's museum hall — big dinosaur skeleton silhouette in the round, colourful display cases with toy-like exhibits, polished floor reflections",
  stadium:
    "a big friendly storybook football stadium — lush green pitch with soft white line markings and simple goal frames, sweeping curved stands in royal blue and white seats, roof shelter and floodlight rigs overhead, bright open sky; tiny soft-focus crowd blobs only — no readable signs, logos, crests, or sponsor text; hero and buddy can stand on the grass or touchline — pairs beautifully with an owl buddy as a cuddly mascot",
  island:
    "a tiny tropical island — curved beach, palm trees, tide pools, bright lagoon colours, inviting storybook adventure vibe",
  cave:
    "a wide glittering storybook cave — rounded rock arches, dangling stalactites, shallow reflective pools, warm lantern glow lining the walls",
  undersea:
    "an underwater world — coral terraces, drifting kelp, sandy seabed, friendly distant fish blobs, gentle blue-green shafts of light — age-friendly magical sea",
  jungle:
    "a lush jungle trail — dangling vines, big tropical leaves, sleepy river glimpses through mist, chirpy canopy sparkles overhead",
  school:
    "a bright cheerful school day — sunflower-yellow halls, lockers with rounded corners, bulletin boards filled with scribbles shapes (no readable text), playground glimpses beyond windows",
  playground:
    "a sunny playground park — soft rubber safety surfacing in candy colours, curvy slides, gentle swings without chains looking harsh, merry-go-round blobs, shady trees edging the fence",
  bedroom:
    "a cozy kid bedroom — duvet fort possibilities, constellation night-light glow, bedside books with blank spines, toys tidied along shelves as soft shapes only",
  treehouse:
    "a lofty wooden treehouse platform wrapped around a chunky friendly tree trunk — rope ladder, lanterns, binoculars dangling, leafy curtains framing sunsets",
  library:
    "a cozy round-edged library nook — ladders on rails, overstuffed sofas, towering shelves with softly coloured spine blocks showing no readable titles, warm amber lamps",
  campsite:
    "a friendly campsite meadow — zipped pastel tents around a glowing fire ring, telescopes sprawled nearby, constellation charts as abstract shapes atop the picnic blanket",
  swimmingpool:
    "a sparkly community pool plaza — aqua lanes with gentle ramps, unicorn-float blobs, umbrellas as candy dots along the deck, cheerful splashes frozen mid-air cartoon style",
  icerink:
    "an indoor ice rink with rounded boards and peppermint-striped rail padding — sparkly overhead LEDs and soft-focus crowd lumps with no logos",
  airport:
    "a tiny friendly departure lounge — vaulted glass walls showing candy-coloured sunsets, suitcase stacks as rounded toys, skylight skylines with gentle planes looping",
  fairground:
    "a luminous fair midway — swirling Ferris wheel lights (no signage), sugary fog from cotton candy machines, merry-go-round animals as plush shapes",
  village:
    "a hillside village plaza — pastel cottages clustered around cobble blobs, fountains as gentle stacks of stones with flower buckets, kite tails streaking pastel sky gradients",
  bakery:
    "a sweet-smelling bakery front — braided bread mountains, donut towers dripping glaze, apron-clad sill shapes with no logos, sugared-window sparkles",
  greenhouse:
    "a steaming glass greenhouse conservatory — dripping vines overhead, succulent shelves with candy-coloured planters, humming mist sparkles drifting through arcs",
  savannah:
    "a dreamy savannah plain — buttery golden grass waving, lone acacia umbrella trees, drifting clouds brushing distant pink mesas — warm adventure feeling",
  volcano:
    "a distant quiet volcano hillside — soft smoking crown that reads friendly, chunky lava lumps cooling into colourful glass pebbles, wildflowers bordering safe viewing ridge",
  meadow:
    "a rolling meadow of wildflowers in rainbow arcs — pollinator sparkles swirling, braided paths of clover hopping stones, picnics hinted at mid-distance without faced extras",
  petshop:
    "a gentle pet boutique window — cages showing abstract fluffy silhouettes safely behind bright frames, dangling toy bones and yarn balls sparkling with glitter",
  workshop:
    "a messy-creative inventors loft — chunky workbenches, rainbow tool outlines without sharp edges glowing, dangling blueprints scribbled as abstract curls",
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
/** Cover / reader accent — keep in sync with storybook wizard `BOOK_COLOR_OPTIONS`. */
type BookColorKey =
  | "pink"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "teal"
  | "red"
  | "yellow"
  | "lilac"
  | "mint"
  | "coral"
  | "navy";

type StoryJson = {
  title: string;
  characterDesign?: string;
  bookColor?: BookColorKey;
  pages: StoryPage[];
};

/** Reader typefaces — keep in sync with `games/storybook.js` SB_READER_FONT_PRESETS. */
const STORY_READER_FONT_KEYS = [
  "fredoka",
  "schoolbell",
  "sniglet",
  "kalam",
  "patrick",
  "comic",
] as const;
type StoryReaderFontKey = (typeof STORY_READER_FONT_KEYS)[number];

function pickStoryReaderFont(): StoryReaderFontKey {
  const idx = Math.floor(Math.random() * STORY_READER_FONT_KEYS.length);
  return STORY_READER_FONT_KEYS[idx] ?? "fredoka";
}

const DALLE3_PROMPT_MAX = 3900;
/** Max length for the child's free-text plot idea (~1000 words prose; must match storybook UI `maxlength`). */
const STORYBOOK_PLOT_HINT_MAX = 6000;
const STORYBOOK_CUSTOM_CHOICE_MAX = 200;

function sanitizeCustomChoice(raw: string): string {
  return String(raw ?? "")
    .replace(/[^\p{L}\p{N}'\-\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, STORYBOOK_CUSTOM_CHOICE_MAX);
}

/** Normalise preset ids from the wizard (tolerate casing / stray spaces from caches or old builds). */
function normalizeWizardKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Optional hero photo(s) from the client (base64 data URL); cap raw size like game portraits. */
const MAX_HERO_REFERENCE_BYTES = 1_200_000;
const MAX_HERO_REFERENCE_IMAGES = 3;
/** Total decoded bytes across all hero reference images (keeps Edge request size safe). */
const MAX_HERO_REFERENCES_TOTAL_BYTES = 2_800_000;

const BOOK_COLOR_KEYS = new Set<BookColorKey>([
  "pink",
  "blue",
  "green",
  "purple",
  "orange",
  "teal",
  "red",
  "yellow",
  "lilac",
  "mint",
  "coral",
  "navy",
]);

function coerceBookColor(
  requested: string | undefined,
  modelRaw: unknown,
  childName: string,
): BookColorKey {
  const r = String(requested ?? "")
    .trim()
    .toLowerCase();
  if (BOOK_COLOR_KEYS.has(r as BookColorKey)) return r as BookColorKey;
  const m = String(modelRaw ?? "")
    .trim()
    .toLowerCase();
  if (BOOK_COLOR_KEYS.has(m as BookColorKey)) return m as BookColorKey;
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

const BOOK_COLOR_MODEL_HINT =
  'MUST be exactly one of: "pink", "blue", "green", "purple", "orange", "teal", "red", "yellow", "lilac", "mint", "coral", "navy"';

function composeDallePrompt(parts: {
  preamble: string;
  envTheme: string;
  sceneBrief: string;
  castBible: string;
  firstPanelLock: string;
  heroFirstName: string;
  mandatoryCastLine: string;
}): string {
  const lockChunk = parts.firstPanelLock.trim()
    ? `MATCH FIRST SPREAD — copy these exact looks (faces, hair, outfits, creatures): ${parts.firstPanelLock.trim()}\n\n`
    : "";
  const identity =
    `TEXT-LOCKED CAST: Draw ONLY the people and creatures explicitly named in SCENE ACTION — exactly who this spread's verse names or clearly refers to (no one else). ` +
    `When ${parts.heroFirstName} is named in SCENE ACTION, they must appear clearly in the foreground (full face, correct child). ` +
    `Only ONE imaginary buddy individual from the BUDDY line (e.g. one unicorn), not a duplicate big+small pair, unless SCENE ACTION explicitly names two distinct buddies. ` +
    `NO unnamed villagers, torch-bearer extras, silhouettes with faces, mascots, or filler crowd. NO logos or brand marks. Background = whatever PLACE/ENVIRONMENT specifies (castle, woods, cave, beach, garden, space, sea, ship, mountain, zoo, farm, circus, city, train, lake, snow, desert, museum, island, etc.) without extra faced characters beyond SCENE ACTION.\n\n`;
  const mid =
    `SCENE ACTION: ${parts.sceneBrief}\n\n${identity}${lockChunk}MANDATORY CAST (${parts.mandatoryCastLine}):\n`;
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

/** Verse + brief imply vertical / airborne motion — image prompts should force wide full-body framing. */
function needsFullBodyWideFraming(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /\b(bounc(?:e|ed|es|ing)?|bounce|jump(?:ed|ing|s)?|leap(?:t|ed|s|ing)?|soar(?:ed|ing|s)?|trampoline|trampolines|high\s+in\s+the\s+air|up\s+in\s+the\s+air|spring|sprung|springs|hop(?:ped|ping|s)?|cartwheel|flew|flying|\bfly\s+high\b|airborne|flips?|somersault|skyward)\b/i.test(
    t,
  );
}

/** Bias image prompts toward the lighting / structural cues implied by the child's plot. */
function plotLightingEnvAddon(plotHint: string, heroFirstName: string): string {
  const p = plotHint.trim();
  if (!p) return "";
  const parts: string[] = [];

  const isCastle = /castle|fortress|palace|throne|drawbridge|turret|tower|keep|dungeon|battlement/i.test(p);
  const isWoods = /woods?|forest|trees|jungle|glade|grove|thicket|undergrowth/i.test(p);
  const isCave = /cave|cavern|tunnel|underground/i.test(p);
  const isUnderwater =
    /underwater|under\s*the\s*sea|ocean\s*floor|submarine|mermaid|kelp|seabed|\bcoral\s+reef\b/i.test(p);
  const isSpace = /space|stars|moon|planet|galaxy|cosmic|rocket|comet/i.test(p);
  const isBeach = /beach|shore|sand|seaside/i.test(p);
  const isSeaSurface =
    /\b(at\s*sea|open\s*ocean|sailing|yacht|on\s+the\s+waves)\b/i.test(p) ||
    /\b(pirate\s*ship|galleon|shipwreck|aboard\s+a\s+ship)\b/i.test(p);
  const isMountain = /mountain|mountains|alpine|summit|peak|hillside|hilltop/i.test(p);
  const isZoo = /zoo|safari|petting\s+zoo|animal\s+park|aquarium/i.test(p);
  const isFarm = /farm|barn|tractor|hayloft|farmland/i.test(p);
  const isCircus = /circus|big\s*top/i.test(p);
  const isTrain = /train|railway|locomotive|carriage|station\s+platform/i.test(p);
  const isCity = /\b(town|city|market\s+square|high\s*street)\b/i.test(p);
  const isDesert = /desert|sand\s*dunes|oasis/i.test(p);
  const isSnow = /snow|snowy|igloo|ski\s+slope|winter\s+wonderland/i.test(p);
  const isLake = /lake|lakeside|riverbank|rowing\s+boat/i.test(p);
  const isMuseum = /museum|gallery/i.test(p);
  const isIsland = /tropical\s*island|on\s+an\s+island|island\s+adventure/i.test(p);

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
    } else if (isSeaSurface) {
      lighting +=
        "cool moonlit open water — silver highlights on rolling waves, warm lantern glow if aboard a ship. ";
    } else if (isMuseum || isZoo) {
      lighting +=
        "soft indoor exhibit lighting with gentle pools of warm light on faces and cool ambient fill. ";
    } else if (isTrain) {
      lighting +=
        "warm golden carriage lamps with blue dusk or night sky visible through big windows. ";
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
  if (isSeaSurface && !isUnderwater) {
    parts.push(
      "STRUCTURE: rolling ocean waves, wide horizon, salt-spray sparkle, wooden ship rails or deck planks if aboard a vessel, distant friendly sails. " +
        "This is surface water or ship deck — NOT a deep underwater seabed unless the plot also says underwater. ",
    );
  }
  if (isMountain) {
    parts.push(
      "STRUCTURE: grassy slopes, rocky outcrops, winding paths, wildflowers, soft clouds around peaks, distant valleys. ",
    );
  }
  if (isZoo) {
    parts.push(
      "STRUCTURE: wide leafy paths, rounded enclosure fences, viewing platforms, toy-bright exhibit shapes — show setting depth without crowds of stranger faces or readable signage. ",
    );
  }
  if (isFarm) {
    parts.push(
      "STRUCTURE: red barn, hay bales, green fields, fence lines, distant tractor, chicken coop shapes, orchard rows optional. ",
    );
  }
  if (isCircus) {
    parts.push(
      "STRUCTURE: striped big top, bunting flags, fairground lights, carousel silhouettes, soft cotton-candy colours. ",
    );
  }
  if (isTrain) {
    parts.push(
      "STRUCTURE: locomotive nose, plush seats, big picture windows, luggage racks, station platform glimpses, passing countryside blur. ",
    );
  }
  if (isCity) {
    parts.push(
      "STRUCTURE: rounded pastel buildings, awnings, flower boxes, simple toy cars, lampposts, market stalls without readable text. ",
    );
  }
  if (isDesert) {
    parts.push(
      "STRUCTURE: soft dunes, rounded cactus shapes, distant mesas, heat-shimmer optional, clear bright sky. ",
    );
  }
  if (isSnow) {
    parts.push(
      "STRUCTURE: snowdrifts, frosted pine trees, sled tracks, cottage windows glowing warm, icicles optional. ",
    );
  }
  if (isLake) {
    parts.push(
      "STRUCTURE: reeds, wooden jetty, lily pads, calm ripples, distant forest line, dragonflies optional. ",
    );
  }
  if (isMuseum) {
    parts.push(
      "STRUCTURE: polished floors, tall exhibit halls, dinosaur skeleton silhouette, colourful display cases with toy-like objects, no readable labels. ",
    );
  }
  if (isIsland) {
    parts.push(
      "STRUCTURE: curved beach, palm trunks, tide pools, lagoon colours, small rocky headlands. ",
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
    plotNamedHumans: string[];
    /** Vision summary from uploaded reference photos — must win over vague draft prose for HERO / named kids. */
    portraitAppearance?: string;
    /** Single line for compile lock: allowed art vocabulary (matches illustration style). */
    compileLockArtWords: string;
  },
): Promise<string> {
  const co = input.plotNamedHumans.length > 0
    ? input.plotNamedHumans.join(", ")
    : "(none)";
  const photoBlock = String(input.portraitAppearance ?? "").trim();
  const user =
    `Hero first name: ${input.childName}\n` +
    `Main buddy type (${input.buddyKey}): ${input.buddyDesc}\n` +
    `Setting: ${input.placeDesc}\n` +
    `Plot: ${input.plotHint || "cozy adventure"}\n` +
    `Human co-stars named in the plot (each is a REAL CHILD — NOT the imaginary buddy; give each their own NAME: line if they appear in the draft): ${co}\n` +
    `Who appears in pictures (beats): ${input.briefsSummary}\n` +
    (photoBlock
      ? `\nREFERENCE PHOTOS (vision summary — HERO and any named line MUST match hair, eyes, skin, age here; do not invent a different child):\n${photoBlock}\n` +
        (/\bCo_star_ref\s*:/i.test(photoBlock)
          ? "Co_star_ref must become its own LOCKED CAST line for the human co-star using their real story name (e.g. REMY:), with the same Hair:/Eyes: facts — not a second hero line.\n"
          : "")
      : "") +
    `\nStorywriter draft (may be messy):\n${input.draftDesign || "(none)"}\n\n` +
    `Rewrite into LOCKED CAST only — plain text, no JSON.\n` +
    `Use labeled lines: HERO:, BUDDY:, then one line per other named recurring HUMAN child from the plot or draft (e.g. ISAAC:) — same detail as HERO (gender, hair, eyes, skin, outfit). Never add MONKEY:, BEAR:, LION:, or random extras.\n` +
    `When REFERENCE PHOTOS are present above, every human line MUST quote the same Hair: colour, length, and style words from those lines (you may add short style-appropriate texture words after). Wrong hair = failure.\n` +
    `If reference lines include **Gender: girl** or **Gender: boy**, each LOCKED CAST human must use that gender — do not swap to the opposite because a name "sounds" masculine or feminine.\n` +
    `Never assign one child dark brown short hair and the other long blonde for cast "variety" when references show both blonde — match each line's hair literally.\n` +
    `Each line: exact colours, relative size vs hero, silhouette, distinctive marks, wings/tail yes/no.\n` +
    `${input.compileLockArtWords}\n` +
    `Max 2100 characters. No scenery. No actions.`;

  const noBuddyLock = input.buddyKey === "nobuddy";
  const systemLock = noBuddyLock
    ? "You are an art director for a children's book. Output only the LOCKED CAST block. Be dense and consistent. " +
      "This book has NO imaginary creature buddy — only humans (hero, plot-named children, game friends). " +
      "Output HERO: and one line per other named HUMAN (e.g. ISAAC:, TILLY:) from the draft. Do NOT output BUDDY: or any creature/animal mascot line unless the plot explicitly requires a non-human co-star (rare). " +
      "If the draft truly has only the hero, output exactly one HERO: line. Never invent MONKEY:, BEAR:, unicorn, or dragon unless the storywriter draft explicitly includes that creature."
    : "You are an art director for a children's book. Output only the LOCKED CAST block. Be dense and consistent. " +
      "Include EVERY named person and recurring creature from the storywriter draft who actually appears in the book (HERO, BUDDY, named human siblings/friends from the plot, and any named game friends from the draft). " +
      "If the user lists human co-stars in the plot (e.g. Isaac), they MUST appear as their own NAME: lines — never merge a human child into BUDDY and never call the dragon/dinosaur by a human sibling's name. " +
      "If the draft truly has only the child and one imaginary friend, output exactly HERO: and BUDDY: — never invent unnamed forest animals. " +
      "If the draft names extra friends (e.g. Tilly), add one line each — never add MONKEY:, BEAR:, or random extras not in the draft.";

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
          content: systemLock,
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

/** Capitalised words in the plot that look like extra human first names (e.g. Isaac when hero is Sofia). */
const PLOT_NAME_STOP = new Set(
  (
    "the they them their and but when until then with from into that this her his she he him one love playing paying hide seek castle " +
      "outside inside above below everywhere every day story big see flying flying friend dinosaur dragon unicorn griffin storybook " +
      "until again still just very also what who how why both each other another while during because games game about " +
      "playing paying seek hiding found look looks looking search searching cant find"
  )
    .split(/\s+/)
    .filter(Boolean),
);

function extractPlotNamedHumans(plotHint: string, heroFirstName: string): string[] {
  const hero = heroFirstName.trim().toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of plotHint.matchAll(/\b([A-Z][a-z]{2,15})\b/g)) {
    const w = m[1];
    const low = w.toLowerCase();
    if (low === hero) continue;
    if (PLOT_NAME_STOP.has(low)) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(w);
  }
  return out.slice(0, 4);
}

function mergeUniqueFirstNames(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of a) {
    const t = String(x ?? "").trim();
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  for (const x of b) {
    const t = String(x ?? "").trim();
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** True when the verse is about searching for / not finding the buddy creature (not a human name). */
function buddyCreatureHiddenInVerse(verse: string): boolean {
  const v = verse.toLowerCase();
  if (
    /\b(there\s+he\s+is|there\s+she\s+is|there\s+they\s+are|found\s+him|found\s+her|see\s+him\s+glide|see\s+him\s+fly|up\s+in\s+the\s+air|flying\s+so\s+high|flying\s+right\s+into\s+view|saw\s+him\s+flying|spotted\s+him)\b/i
      .test(v)
  ) {
    return false;
  }
  const creature = /\b(dinosaur|dragon|unicorn|griffin)\b/i.test(v);
  const seeking =
    /\b(where'?s?\s+the|where\s+is\s+the|where\s+are\s+they|where\s+could|can'?t\s+find|cannot\s+find|no\s+sign|nowhere\b|not\s+around|not\s+here|looking\s+for|searching\s+for|still\s+can'?t\s+find|have\s+no\s+idea|where\s+is\s+he\b|where'?s\s+he\b)\b/i
      .test(v);
  return creature && seeking;
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
        `These ${items.length} images are reference photos for named characters in a kids' picture book, in order: ${ordered}.\n` +
        `Reply with exactly ${items.length} lines. Each line MUST use this exact template (fill in from the photo only; keep the labels):\n` +
        `NAME: Gender (photo only — ignore whether the NAME sounds male or female): girl | boy; Hair: [colour — be specific, e.g. platinum blonde / light brown], [length — e.g. very short / chin / shoulder / mid-back / long past shoulders], [style — e.g. high pigtails with pink bands, centre part, full fringe]; Eyes: [colour]; Skin: [tone]; Age: [e.g. about 5]; Clothes: [silhouette + colours — if the shirt has a big print, say "graphic tee" without copying the art].\n` +
        `Be literal: if the photo shows a girl, you MUST write Gender: girl even if the name is often used for boys. If hair is long in the photo, say long; if blonde, say blonde. Do not transcribe logos or tiny text. max 48 words per line; no art-style words.\n` +
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
      model: storybookPortraitVisionModel(),
      temperature: 0.05,
      max_tokens: 550,
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
  return text.slice(0, 1600);
}

/**
 * One or more photos of the same child (hero). Always returns a single appearance line
 * so story text + image prompts don't get duplicate hero rows.
 */
async function openaiVisionSummarizeHeroFromRefs(
  apiKey: string,
  displayName: string,
  dataUrls: string[],
  role: "hero" | "character" = "hero",
): Promise<string> {
  if (dataUrls.length === 0) return "";
  const name = sanitizeName(displayName) || "Child";
  const rolePhrase =
    role === "hero"
      ? `${name}, the child hero of a kids' picture book`
      : `${name}, a named child character in a kids' picture book`;
  const content: Record<string, unknown>[] = [];
  if (dataUrls.length === 1) {
    content.push({
      type: "text",
      text:
        `This image is a reference photo of ${name} (${role === "hero" ? "story hero" : "story character"}).\n` +
        `Reply with exactly one line using this template ONLY:\n` +
        `${name}: Gender (photo only — ignore whether the name "${name}" is usually a boy or girl name): girl | boy; Hair: [colour — specific], [length], [style including fringe/pigtails/accessories]; Eyes: [colour]; Skin: [tone]; Age: [approx]; Clothes: [silhouette + colours, or graphic tee/jeans].\n` +
        `If the photo shows a young girl (long hair, dress, typical presentation), you MUST write Gender: girl even for names like Remy, Alex, or Sam. State real hair length and colour. Do not copy logos. max 52 words; no art-style words.\n` +
        `Use the NAME exactly as spelled above. No other text.`,
    });
    content.push({ type: "image_url", image_url: { url: dataUrls[0] } });
  } else {
    content.push({
      type: "text",
      text:
        `These ${dataUrls.length} images are all of the SAME person: ${rolePhrase} (different angles or moments).\n` +
        `Reply with exactly ONE line using this template ONLY:\n` +
        `${name}: Gender (photo only, ignore name stereotypes): girl | boy; Hair: [colour — specific], [length], [style across photos — e.g. pigtails with pink scrunchies]; Eyes: [colour]; Skin: [tone]; Age: [approx]; Clothes: [common vibe or two outfits].\n` +
        `Combine: hair must reflect the LONGEST / clearest view — do not shorten length. Keep exact colour words from the photos. Ignore logos and tiny text. max 60 words; no art-style words.\n` +
        `Use the NAME exactly as spelled above. No other text.`,
    });
    for (const u of dataUrls) {
      content.push({ type: "image_url", image_url: { url: u } });
    }
  }

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: storybookPortraitVisionModel(),
      temperature: 0.05,
      max_tokens: 600,
      messages: [{ role: "user", content }],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("openai vision (hero refs) error", r.status, t.slice(0, 400));
    throw new Error(`vision_hero_error:${r.status}`);
  }

  const data = await r.json();
  const text = String(data.choices?.[0]?.message?.content ?? "").trim();
  return text.slice(0, 1600);
}

/**
 * Compare two hero-tagged reference photos. If they look like two different
 * children, we emit two appearance lines so the story co-star is not invented
 * as a generic "short brown hair" kid. Defaults to **same** on failure (old merge).
 */
/**
 * Quick same-person check for two hero-tagged uploads. Uses mini + low image
 * detail — cheap (fixed token budget per image) and sufficient for SAME vs TWO;
 * does not affect illustration model or prompts.
 */
async function openaiVisionTwoHeroPhotosSameChild(
  apiKey: string,
  urlA: string,
  urlB: string,
): Promise<boolean> {
  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text:
        "Two photos for a picture book (attached). Are they the SAME individual child (same person, different day/outfit/angle), or TWO DIFFERENT children?\n" +
        "Reply with exactly one word: SAME or TWO",
    },
    { type: "image_url", image_url: { url: urlA, detail: "low" } },
    { type: "image_url", image_url: { url: urlB, detail: "low" } },
  ];
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 16,
      messages: [{ role: "user", content }],
    }),
  });
  if (!r.ok) {
    console.warn("[clever-service] two-photo same/two vision skipped", r.status);
    return true;
  }
  const data = await r.json();
  const text = String(data.choices?.[0]?.message?.content ?? "")
    .trim()
    .toUpperCase();
  if (/\bTWO\b/.test(text)) return false;
  return true;
}

/**
 * Vision pass: optional tagged photos for hero + selected game friends; then default game portraits.
 */
async function appearanceNotesFromReferences(
  apiKey: string,
  assetsBase: string,
  people: FamilyPerson[],
  childName: string,
  heroUrls: string[],
  customByFriendId: Record<string, string[]>,
): Promise<string> {
  const chunks: string[] = [];
  if (heroUrls.length === 2) {
    try {
      const sameChild = await openaiVisionTwoHeroPhotosSameChild(
        apiKey,
        heroUrls[0],
        heroUrls[1],
      );
      if (!sameChild) {
        const nm = sanitizeName(childName) || "Hero";
        const dual = await openaiVisionDescribePortraits(apiKey, [
          { label: nm, dataUrl: heroUrls[0] },
          { label: "Co_star_ref", dataUrl: heroUrls[1] },
        ]);
        if (dual.trim()) {
          chunks.push(
            "(Two photos: two different children. First line matches the hero; Co_star_ref matches the other named human in the story — not the imaginary buddy.)\n" +
              dual.trim(),
          );
        }
      } else {
        const heroLine = await openaiVisionSummarizeHeroFromRefs(
          apiKey,
          childName,
          heroUrls,
          "hero",
        );
        if (heroLine.trim()) chunks.push(heroLine.trim());
      }
    } catch (e) {
      console.warn("[clever-service] hero ref (two-photo path) failed", e);
      try {
        const heroLine = await openaiVisionSummarizeHeroFromRefs(
          apiKey,
          childName,
          heroUrls,
          "hero",
        );
        if (heroLine.trim()) chunks.push(heroLine.trim());
      } catch (e2) {
        console.warn("[clever-service] hero ref vision failed", e2);
      }
    }
  } else if (heroUrls.length > 0) {
    try {
      const heroLine = await openaiVisionSummarizeHeroFromRefs(
        apiKey,
        childName,
        heroUrls,
        "hero",
      );
      if (heroLine.trim()) chunks.push(heroLine.trim());
    } catch (e) {
      console.warn("[clever-service] hero ref vision failed", e);
    }
  }

  const base = (assetsBase ?? "").trim();
  const batchItems: { label: string; dataUrl: string }[] = [];

  for (const p of people) {
    const custom = customByFriendId[p.id];
    if (custom && custom.length > 0) {
      try {
        const line = await openaiVisionSummarizeHeroFromRefs(
          apiKey,
          p.label,
          custom,
          "character",
        );
        if (line.trim()) chunks.push(line.trim());
      } catch (e) {
        console.warn("[clever-service] friend ref vision failed", p.id, e);
      }
    } else if (base) {
      const path = FAMILY_PORTRAIT_PATHS[p.id];
      if (!path) continue;
      const dataUrl = await fetchPortraitDataUrl(base, path);
      if (dataUrl) batchItems.push({ label: p.label, dataUrl });
    }
  }

  const knownIds = new Set(people.map((p) => p.id));
  for (const [friendId, urls] of Object.entries(customByFriendId)) {
    if (!urls || urls.length === 0) continue;
    if (friendId === "hero") continue;
    if (knownIds.has(friendId)) continue;
    const label =
      friendId.length > 0
        ? friendId.charAt(0).toUpperCase() + friendId.slice(1)
        : "Friend";
    try {
      const line = await openaiVisionSummarizeHeroFromRefs(
        apiKey,
        label,
        urls,
        "character",
      );
      if (line.trim()) chunks.push(line.trim());
    } catch (e) {
      console.warn("[clever-service] tagged ref vision failed", friendId, e);
    }
  }

  if (batchItems.length > 0) {
    const familyText = await openaiVisionDescribePortraits(apiKey, batchItems);
    if (familyText.trim()) chunks.push(familyText.trim());
  }

  return chunks.join("\n");
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
    .slice(0, STORYBOOK_PLOT_HINT_MAX);
  const cleaned = oneLine.replace(/[^\p{L}\p{N}'\-\s\.,!?—–]/gu, "").trim();
  return cleaned.slice(0, STORYBOOK_PLOT_HINT_MAX);
}

/** Accepts only `data:image/(png|jpeg|webp);base64,...` from the storybook UI. */
function sanitizeHeroReferenceImage(raw: unknown): string | null {
  const s =
    typeof raw === "string"
      ? raw.trim().replace(/\s+/gu, "").replace(/\r|\n/gu, "")
      : "";
  if (!s) return null;
  const m =
    /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(s);
  if (!m) return null;
  const b64 = m[2];
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_HERO_REFERENCE_BYTES || approxBytes < 200) {
    return null;
  }
  const mime =
    m[1].toLowerCase() === "image/jpg" ? "image/jpeg" : m[1].toLowerCase();
  return `data:${mime};base64,${b64}`;
}

/** Up to `MAX_HERO_REFERENCE_IMAGES` data URLs; supports legacy `heroReferenceImage` string. */
function sanitizeHeroReferenceImages(body: {
  heroReferenceImage?: string;
  heroReferenceImages?: unknown;
}): string[] {
  const candidates: unknown[] = [];
  if (Array.isArray(body.heroReferenceImages)) {
    for (const x of body.heroReferenceImages) candidates.push(x);
  } else if (
    body.heroReferenceImage !== undefined &&
    body.heroReferenceImage !== null
  ) {
    candidates.push(body.heroReferenceImage);
  }

  const decodedSizes: number[] = [];
  const out: string[] = [];
  for (const raw of candidates) {
    const one = sanitizeHeroReferenceImage(raw);
    if (!one) continue;
    const m =
      /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(
        one.replace(/\s+/gu, "").replace(/\r|\n/gu, ""),
      );
    const approx = m ? Math.floor((m[1].length * 3) / 4) : 0;
    decodedSizes.push(approx);
    out.push(one);
    if (out.length >= MAX_HERO_REFERENCE_IMAGES) break;
  }

  let total = 0;
  const capped: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const add = decodedSizes[i] ?? 0;
    if (total + add > MAX_HERO_REFERENCES_TOTAL_BYTES) {
      console.warn(
        `[clever-service] hero reference images truncated at ${capped.length} (total byte budget)`,
      );
      break;
    }
    total += add;
    capped.push(out[i]);
  }

  return capped;
}

/**
 * Tagged reference photos: `who` is "hero", the hero's first name, a friend `id` (e.g. freya), or friend's label.
 * Falls back to legacy `heroReferenceImages` when `characterReferencePhotos` is missing/empty.
 */
function sanitizeCharacterReferencePhotos(
  body: {
    characterReferencePhotos?: unknown;
    heroReferenceImages?: unknown;
    heroReferenceImage?: string;
  },
  familyPeople: FamilyPerson[],
  childName: string,
): { heroUrls: string[]; customByFriendId: Record<string, string[]> } {
  const allowedFriend = new Set(familyPeople.map((p) => p.id));

  const resolveWho = (whoRaw: string): "hero" | string | null => {
    const trimmed = whoRaw.trim();
    const whoLo = trimmed.toLowerCase();
    const whoNorm = whoLo.replace(/[^a-z0-9]/gu, "");

    if (!whoNorm || whoNorm === "hero" || whoNorm === "me") return "hero";

    const heroToken =
      sanitizeName(childName)
        .toLowerCase()
        .split(/\s+/)[0]
        ?.replace(/[^a-z]/gu, "") ?? "";
    if (heroToken && whoNorm === heroToken) return "hero";

    if (allowedFriend.has(whoNorm)) return whoNorm;

    const byLabel = familyPeople.find(
      (p) => p.label.trim().toLowerCase() === whoLo,
    );
    if (byLabel && allowedFriend.has(byLabel.id)) return byLabel.id;

    if (whoNorm.length >= 2 && whoNorm.length <= 24 && /^[a-z0-9]+$/u.test(whoNorm)) {
      return whoNorm;
    }
    return null;
  };

  type Tagged = { target: "hero" | string; url: string; approx: number };
  const tagged: Tagged[] = [];

  const rawArr = body.characterReferencePhotos;
  if (!Array.isArray(rawArr) || rawArr.length === 0) {
    const legacy = sanitizeHeroReferenceImages(body);
    return { heroUrls: legacy, customByFriendId: {} };
  }

  for (const x of rawArr.slice(0, 24)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const url = sanitizeHeroReferenceImage(o.image ?? o.dataUrl);
    if (!url) continue;
    const whoR = String(o.who ?? o.character ?? "hero");
    const target = resolveWho(whoR);
    if (target === null) {
      console.warn(
        "[clever-service] characterReferencePhotos skipped unknown who (hero name, game friend, or simple name token)",
        whoR,
      );
      continue;
    }
    const m =
      /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(
        url.replace(/\s+/gu, "").replace(/\r|\n/gu, ""),
      );
    const approx = m ? Math.floor((m[1].length * 3) / 4) : 0;
    tagged.push({ target, url, approx });
  }

  const outHero: string[] = [];
  const outFriend: Record<string, string[]> = {};
  let count = 0;
  let totalBytes = 0;
  for (const t of tagged) {
    if (count >= MAX_HERO_REFERENCE_IMAGES) break;
    if (totalBytes + t.approx > MAX_HERO_REFERENCES_TOTAL_BYTES) break;
    totalBytes += t.approx;
    count++;
    if (t.target === "hero") outHero.push(t.url);
    else {
      if (!outFriend[t.target]) outFriend[t.target] = [];
      outFriend[t.target].push(t.url);
    }
  }
  return { heroUrls: outHero, customByFriendId: outFriend };
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
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

/**
 * Models often write heights like 4'0" inside characterDesign — the inch " terminates the JSON string and breaks parse.
 * Rewrite common ft/in patterns to words before JSON.parse.
 */
function sanitizeModelJsonForParse(s: string): string {
  let t = s;
  t = t.replace(/(\d{1,2})\s*['′]\s*(\d{1,2})\s*["″]/g, "$1 ft $2 in");
  t = t.replace(/(\d{1,2})['′](\d{1,2})["″]/g, "$1 ft $2 in");
  return t;
}

/** 12 text+picture pages from the model (before two front-matter pages are prepended). */
const PAGE_COUNT = 12;
const FRONT_MATTER_PAGE_COUNT = 2;

/** Facing pages can carry longer prose when we pad thin model output — keep under client/JSON comfort. */
const STORYBOOK_PROSE_PAGE_TEXT_MAX = 2200;

/** Zero-based index of the LAST prose-first page before the finale picture slot (usually page 11 in 1-based terms). */
const LAST_MODEL_TEXT_PAGE_INDEX = PAGE_COUNT - 2;

/** 0-based indices of picture pages in the **12-page model** output (normalize + briefs). */
const MODEL_PICTURE_PAGE_INDICES = [1, 3, 5, 7, 9, 11] as const;

/** After `FRONT_MATTER_PAGE_COUNT` pages are prepended, core picture indices stay odd (1,3,5,…) but skip pages with no brief (e.g. dedication). */
function oddPagesWithIllustrationBriefs(pages: StoryPage[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pages.length; i += 2) {
    const p = pages[i];
    if (p?.illustrationBrief && String(p.illustrationBrief).trim()) {
      out.push(i);
    }
  }
  return out;
}

function prependFrontMatterPages(
  corePages: StoryPage[],
  authorDisplayName: string,
): StoryPage[] {
  const name = String(authorDisplayName || "").trim();
  const credit =
    name.length > 0
      ? `This book was brought to you by the wonderful mind of ${name}.`
      : "This book was brought to you by a wonderful young storyteller.";
  return [
    { text: "", illustrationBrief: null },
    { text: credit, illustrationBrief: null },
    ...corePages,
  ];
}

/** Picture page index in the **12-page** array; story beat is usually on the previous (text) page. */
function spreadTextForPicturePage(pictureIndex: number, pages: StoryPage[]): string {
  const left = pages[pictureIndex - 1]?.text?.trim() ?? "";
  const same = pages[pictureIndex]?.text?.trim() ?? "";
  const merged = (left.length >= same.length ? left : same) || left || same;
  return merged.replace(/[.!?…]+$/u, "").trim();
}

/** Shown on shelf thumbnail + opener — constrain crowding vs cast lineup / storywriter over-listing. */
const OPENING_SCENE_IMAGE_CONSTRAINTS =
  "OPENING PICTURE (also the bookshelf cover thumbnail): Prefer a **CLEAR, UN-CROWDED** tableau — ideally **≤3 full-bodied figures visible** (**hero + buddy + at most ONE extra human**, each named on the paired prose page unless the child's plot snippet literally insists on more people gathered for moment one — then **≤4**, still uncrowded). **FORBIDDEN:** clipped or half-visible children or buddies sneaking into frame from extreme left/right — no cropped-only elbows, stray hat rims, or half torsos at the edges; every pictured person is fully framed. EVERY named figure must appear **COMPLETE** inside the margins with roomy setting foreground/background breathing space. ";

function fallbackProseForEmptyEvenTextPage(pageIndexEven0: number): string {
  if (pageIndexEven0 === LAST_MODEL_TEXT_PAGE_INDEX) {
    return (
      "Everything felt still for a heartbeat—then bubbling laughter broke it open again.\n\n" +
      "They wandered home slowly together, swapping favourite bits aloud and grinning whenever the day's sparkle twinkled back to mind—the kind that keeps bedtime smiles glowing long after the door clicks shut."
    );
  }
  return "Little quiet fell between giggles—but they leaned toward the next idea before it could sneak away.";
}

/** When the model returns too few entries, synthesise placeholders by spread — avoid repeating the SAME closing line mid-book. */
function paddingTextForSyntheticTextSlot(index0Based: number): string {
  const spread1 = Math.floor(index0Based / 2) + 1;
  const stubs = [
    "Their shoes pattered onward without stopping — somewhere new waited just ahead.",
    "They paused mid-path to grin at one another — the day still had room for one more silly idea.",
    "When the breeze picked up again, laughter carried with it.",
    "A little wrinkle in the plan only made everyone try harder.",
    "The best bit was not guessing what would surprise them next.",
    "Back toward home, sleepy but pleased, everyone agreed it had been exactly the adventure they hoped for.",
  ];
  return stubs[(spread1 - 1) % stubs.length] ?? stubs[stubs.length - 1];
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
    const i = pages.length;
    // Even 0-based index = prose-first beat; odd = picture row (often empty text overlay).
    if (i % 2 === 0) {
      pages.push({
        text: paddingTextForSyntheticTextSlot(i),
        illustrationBrief: null,
      });
    } else {
      pages.push({ text: "", illustrationBrief: null });
    }
  }
  pages.length = PAGE_COUNT;

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const raw = String(p.text ?? "").replace(/[ \t]+/g, " ").trim();
    if (i % 2 === 1) {
      /* Picture-slot rows: duplex may overlay verse sometimes; facing leaves these blank often. Never inject generic prose here — that polluted facing text pages beside "The End". */
      p.text = raw;
    } else if (!raw) {
      p.text = fallbackProseForEmptyEvenTextPage(i);
    } else {
      p.text = raw;
    }
    if (p.text.length > STORYBOOK_PROSE_PAGE_TEXT_MAX) {
      p.text =
        p.text.slice(0, Math.max(0, STORYBOOK_PROSE_PAGE_TEXT_MAX - 1)) + "…";
    }
  }

  for (let i = 0; i < pages.length; i++) {
    if (i % 2 === 0) pages[i].illustrationBrief = null;
  }

  for (const i of MODEL_PICTURE_PAGE_INDICES) {
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
  let bookColor: BookColorKey | undefined;
  const bcRaw = String((obj as StoryJson).bookColor ?? "")
    .trim()
    .toLowerCase();
  if (BOOK_COLOR_KEYS.has(bcRaw as BookColorKey)) {
    bookColor = bcRaw as BookColorKey;
  }

  return { title, characterDesign, bookColor, pages };
}

async function openaiChatJsonOnce(
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
      max_tokens: 10000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("openai chat error", r.status, t.slice(0, 900));
    throw new Error(`story_model_error:${r.status}`);
  }

  const data = await r.json();
  const choice = data.choices?.[0];
  const finish = choice?.finish_reason;
  if (finish === "length") {
    console.warn("[clever-service] story chat finish_reason=length (output may be truncated)");
    throw new Error("story_truncated");
  }
  const content = choice?.message?.content;
  if (!content) throw new Error("story_empty");
  const unwrapped = sanitizeModelJsonForParse(unwrapJsonContent(content));
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapped);
  } catch (e) {
    console.error("story json parse", e, unwrapped.slice(0, 500));
    throw new Error("story_parse");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as StoryJson).pages)) {
    throw new Error("story_shape");
  }

  return normalizeStoryJson(parsed);
}

async function openaiChatJson(
  apiKey: string,
  system: string,
  user: string
): Promise<StoryJson> {
  const maxAttempts = 3;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(600 * attempt + Math.floor(Math.random() * 500));
    }
    try {
      return await openaiChatJsonOnce(apiKey, system, user);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const msg = lastErr.message;
      const httpRetry = /^story_model_error:(429|5\d\d)$/.test(msg);
      const softRetry =
        msg === "story_parse" ||
        msg === "story_empty" ||
        msg === "story_truncated" ||
        msg === "story_shape";
      const retryable = httpRetry || softRetry;
      if (!retryable || attempt === maxAttempts - 1) {
        throw lastErr;
      }
      console.warn("[clever-service] openaiChatJson retry", attempt + 1, msg);
    }
  }
  throw lastErr ?? new Error("story_unknown");
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
 * `gpt-image-1.5` by default (override via STORYBOOK_GPTIMAGE_MODEL). Output is
 * base64 PNG; we upload it to the public `storybook_images` Supabase Storage
 * bucket and return a public URL so the storybook UI can render it like any
 * other URL.
 * ────────────────────────────────────────────────────────────────────────── */

const GPT_IMAGE_BUCKET = "storybook_images";
const GPT_IMAGE_PROMPT_MAX = 4000;

/** Whitelisted GPT Image `size` values (API rejects unknown strings). */
const GPT_IMAGE_SIZES: ReadonlySet<string> = new Set([
  "1024x1024",
  "1536x1024",
  "1024x1536",
]);

/** User-chosen tier from JSON `pictureBookQuality` (GPT Image path only; Fal unchanged). */
type PictureBookQuality = "standard" | "high";

/**
 * `standard` = economy (screen): 1024² anchor + edits; when env quality unset,
 * defaults are medium/low — **unless** the child uploaded reference photos and
 * **`STORYBOOK_REF_PHOTO_IMAGE_BOOST=1`** (or `true` / `on` / `yes`), in which case we use a
 * **high** cast anchor once + **medium** edits so likeness reads better (costs more).
 * Default (unset): economy image quality with refs — same as no uploads on standard tier.
 * `high` = print-oriented: 1536×1024 when env size unset, quality high/medium when env unset.
 * `STORYBOOK_GPTIMAGE_SIZE` / `STORYBOOK_GPTIMAGE_QUALITY` secrets still override per tier.
 */
function coercePictureBookQuality(raw: unknown): PictureBookQuality {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "high" || s === "print" || s === "premium") return "high";
  return "standard";
}

/** Reader layout: duplex = one wide image with HTML text overlaid; facing = art alone on one page. */
type ReaderArtLayoutKey = "duplex" | "facing";

function coerceReaderArtLayout(raw: unknown): ReaderArtLayoutKey {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "facing" || s === "single" || s === "one_page") return "facing";
  return "duplex";
}

/** Prose paragraphs vs strict rhyming lines — independent of reader layout. */
type StoryTextModeKey = "prose" | "rhyme";

function coerceStoryTextMode(
  raw: unknown,
  layout: ReaderArtLayoutKey,
): StoryTextModeKey {
  const s = String(raw ?? "").trim().toLowerCase();
  if (
    s === "prose" ||
    s === "normal" ||
    s === "story" ||
    s === "paragraph" ||
    s === "paragraphs"
  ) {
    return "prose";
  }
  if (s === "rhyme" || s === "rhyming" || s === "poem" || s === "verse") {
    return "rhyme";
  }
  return layout === "facing" ? "prose" : "rhyme";
}

/** Per-page verbosity: short / medium / long — same 12 pages, different word or line budgets. */
type StoryLengthKey = "short" | "medium" | "long";

function coerceStoryLength(raw: unknown): StoryLengthKey {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "short" || s === "brief" || s === "quick" || s === "small") {
    return "short";
  }
  if (s === "long" || s === "longer" || s === "epic" || s === "extra") {
    return "long";
  }
  return "medium";
}

type StoryLengthSpec = {
  proseParagraphLead: string;
  proseWordRange: string;
  proseAntiRhymeHint: string;
  rhymeLines: number;
  rhymeLinesHint: string;
  rhymeSchemeExamples: string;
  rhymeLineShape: string;
  rhymeOddPageTail: string;
};

function storyLengthSpec(key: StoryLengthKey): StoryLengthSpec {
  switch (key) {
    case "short":
      return {
        proseParagraphLead: "**1–2 short paragraphs**",
        proseWordRange:
          "~**85–115 words** total on that page",
        proseAntiRhymeHint: "many stacked single-line rhyming rows",
        rhymeLines: 6,
        rhymeLinesHint:
          "snappy, read-aloud beats — **tighter** than a medium book",
        rhymeSchemeExamples:
          "e.g. AABBCC or two ABCB triplets with a clear rhyme scheme",
        rhymeLineShape:
          "a **short, snappy phrase** — keep vocabulary simple for age ~5",
        rhymeOddPageTail:
          "light and quick — fewer lines than medium, still strong rhyme",
      };
    case "long":
      return {
        proseParagraphLead: "**3–5 short or medium paragraphs**",
        proseWordRange:
          "~**220–280 words** total on that page",
        proseAntiRhymeHint:
          "ten forced single-line rhyming rows",
        rhymeLines: 12,
        rhymeLinesHint:
          "aim for **full** pages — noticeably wordier than medium",
        rhymeSchemeExamples:
          "e.g. AABBCCDDEEFF, or three blocks of four lines with a clear rhyme scheme",
        rhymeLineShape:
          "a **moderate phrase or short sentence** with room for dialogue beats and sensory detail — vocabulary still simple for age ~5",
        rhymeOddPageTail:
          "full, rhyming — stretch each line with detail while staying readable aloud",
      };
    default:
      return {
        proseParagraphLead: "**2–4 short paragraphs**",
        proseWordRange:
          "~**150–190 words** total on that page",
        proseAntiRhymeHint: "ten single-line rhyming rows",
        rhymeLines: 10,
        rhymeLinesHint:
          "~**double** the words of a tight five-line verse — aim for noticeably fuller pages",
        rhymeSchemeExamples:
          "e.g. AABBCCDDEE, ABCB repeated, or two blocks of five lines with a clear rhyme scheme",
        rhymeLineShape:
          "a **moderate phrase or short sentence** — richer detail, small dialogue beats, and sensory touches so each spread feels full, but keep vocabulary simple for age ~5",
        rhymeOddPageTail:
          "full, rhyming, about twice as wordy as a five-line verse",
      };
  }
}

function countStoryWordsUk(s: string): number {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/u).filter((w) => w.length > 0).length;
}

/** Soft minimum words per prose-first page — keeps facing cream sheets from looking empty before “The End”. */
function proseEvenPageFloorWords(len: StoryLengthKey): number {
  switch (len) {
    case "short":
      return 74;
    case "long":
      return 215;
    default:
      return 130;
  }
}

/**
 * When the draft under-fills prose pages (common late spreads), append gentle filler paragraphs.
 * Mirrors read-aloud warmth; rotates chunks by spread slot to dull repetition slightly.
 */
const PROSE_PAGE_PAD_BY_LENGTH: Record<StoryLengthKey, readonly string[]> = {
  short: [
    "They swung their joined hands gently, pretending the pavement was glitter. “Remember that bit?” someone whispered, and noses wrinkled with quiet pride because of course everybody remembered—it had only happened moments ago.",
    "A pigeon tilted near, cocked its head once, then flapped off as though it had giggled. The air still tasted like sunshine on sleeves; footsteps fell in sleepy little thuds nobody tried to hurry.",
    "Somebody bumped an elbow on purpose—not hard, only friendly—and the giggles rewound faster than socks could skid. Shadows stretched longer toward home, soft as warm milk before bedtime.",
    "They counted birds on a fence post, lost track on purpose twice, laughed about forgetting, then tried again sincerely. Evening settled like a duvet—still bright enough to grin, snug enough to feel finished.",
    "Tiny stones clicked under soles; butterflies flickered orange and teal like loose confetti overhead. Everybody agreed without speaking that staying side-by-side for one more curb felt exactly right.",
    "Tomorrow could wait politely on the doorstep. Tonight hovered like sugar on tongues—“Same adventure next time?” teased somebody, sparking cheers that floated down the alley like lanterns.",
    "They replayed mishaps softly, tweaking each punchline warmer than it really was. Windows glowed apricot farther along the street—a promise of toast, socks, sleepy stories still smiling behind closed doors.",
    "No one hurried the last grin away. It bobbed gently between shoulders, bumped into giggles already half-asleep with joy, lingered anyhow because joy loves company even when slippers are calling.",
    "When they paused beside a dripping tap, sparkle droplets chased one another—a tiny encore nobody scheduled. Laughs curled smaller, cosier; hearts still marched on tiptoes even if shoes dragged a little.",
    "They promised exaggerated secret handshakes, broke them immediately laughing, reinvented sillier variants with thumbs and pinkies waving. Shadows pooled friendly as puddles nobody minded stepping through.",
    "The buddy wriggled a happy shuffle only best friends decipher. Humans copied badly on purpose until everyone twirled once—lightly, breathlessly—as if choreography had been practising all afternoon.",
    "Home lights blinked hello from down the avenue. Breath drew in sugary-cool dusk; hugs-that-weren’t-quite-yet leaned closer. Every voice kept one last sparkle stocked for pillow-time retellings whispered warmly.",
  ],
  medium: [
    "Hands linked again without anyone announcing it—tiny squeezes spelled “still here” between wrists. Boots scuffed mellow rhythms on path stones while someone retold the best joke, stretching the punchline lovingly because nobody wanted applause to fade just yet.",
    "Butterflies looped careless loops; a sprinkler hissed sleepy diamonds across lawns that smelled clipped-green and earthy. Voices layered soft questions—“Did YOU see THAT?”—answered by shoulder bumps happier than dictionaries.",
    "They invented an unnecessary victory lap round a lamppost, leaning into centrifugal giggles till hair flew like holiday flags. The buddy struck a triumphant hoof-pose exaggerated on purpose until everyone applauded politely with nose boops.",
    "Clouds leaned pink as strawberry milk while someone narrated footsteps like a sleepy sports announcer—“And HERE comes the silliest champ STILL giggling…” Nobody disputed the leaderboard; pride sat comfy as fleeces.",
    "A dog somewhere woof-cheered—or maybe belly-laughed—they decided it counted same. Shadows stretched sideways, politely making room so last golden light could butter everyone’s elbows equal.",
    "They replayed calamities sweeter than reality dared—“Remember when…” began each sentence, endings already forgiven into frosting. Friendship hummed a low tune only ribs could harmonise.",
    "Hearts still cartwheeled softly, though legs pretended exhaustion. Gentle fibs about bravery traded hands; each confession grew warmer, puffing chests outward like marshmallow armour nobody needed shedding yet.",
    "Evening curled around chimneys humming tea-kettle hymns. Breath drew in spiced-cool air tinged faintly with distant toast; plans for pajamas tickled ankles but nobody surrendered grins hostage first.",
    "Somebody skimmed fingers along railings purely for sparkly dust motes swirling. The buddy mimicked orchestral swells badly—strings made of giggles—and the audience rewarded effort with melodramatic bows to blades of grass.",
    "They vowed tomorrow’s silliness quotas must double; contracts sealed with exaggerated pinky locks nobody intended keeping legal. Satisfaction stretched long as lazy cats across the whole walkway home.",
    "Windows flicked golden rectangles onto pavement quilts. Tiny moths flirted bulb halos politely; chatter settled into sweaters tucked under chins—not sad smaller, happier tighter, like scarves knitted from sunlight.",
    "Last jokes stacked like sleepy pancakes—sweet, buttery, collapsing gently into hugs waiting on porches imaginary or real. Air itself felt politely proud: another chapter tucked safe where dreams could alphabetise giggles nightly.",
  ],
  long: [
    "Grass-blades tickled sock gaps; elbows brushed on purpose exchanging warmth like trading cards nobody wanted swapped back. Dialogue bloomed anew—little negotiations about who carried the silliest souvenir memory, crowned finally by democratic finger-pointing giggles bouncing like rubber balls downhill.",
    "Sky lowered friendly lavender rims while windows far off flicked early lamps on, golden as pancake syrup dribbling reassurance. Breath drew deep and everybody tasted faint cinnamon—someone guessed neighbour’s toaster, someone else sworn-saw fairies grilling invisible snacks—truth mattered less than laughter glueing sentences.",
    "The buddy experimented grand curtain-call hoof flourishes daring physics to intervene; humans countered with clumsy arabesques that wobbled into group spins stopped only by dizziness democracy. Applause came from crows on cables unimpressed-but-participatory; drama coaches inside chests vowed future encores anyhow.",
    "They mapped homeward quirks like explorers—three cracks to hop, five hydrangeas smelling purple-thoughts, two friendly potholes guarding puddle mirrors. Observation turned competitive kindly: richest detail wins nothing except extra squeeze-hand privileges nobody hoarded stingily.",
    "Conversation braided threads—memory, prophecy, outrageous fib—into rope sturdy enough for imaginary tug-o-war referee’d by dusk itself. Satisfaction settled thick as custard in veins; adrenaline unspooled into cozy yarn balls kittens might knead happily later.",
    "Even shadows coordinated choreography, stretching parallel like polite bridge supports under tired shoulders. Silence experimented brief cameos between punchlines—not awkward emptiness, roomy pause letting heartbeats audible-orchestrate next giggles syncing perfectly.",
    "Windows glow stitched patchwork reassurance down terraces; moth friends auditioned halo spotlight roles, wings trembling sincerity. Socks whispered blister truces—tonight forgiveness unconditional in exchange for hot chocolate rumours allegedly waiting indoors.",
    "They rehearsed exaggerated tomorrow manifestos—“More glitter jurisdiction!” “Mandatory extra snack tribunals!”—statutes giggled into oblivion beside hydrants spraying memory mist cooling cheeks rose-petal warm still.",
    "Horizon inked violet signatures approachable as bedtime doodles framing sleepy satisfaction. Backpacks thunked mellow counterpoint rhythms; stray leaf confetti parachuted awarding everyone participation medals braided from chlorophyll ribbons.",
    "Somebody coined accidental philosophy—“Adventures end but sparkle carries interest overnight.” Heads tilted pondering; unanimous verdict decided interest rates absurdly favourable compounding giggles compounded cuddles compound relief.",
    "Doorways leaned inviting without rushing—porch lights blinked sleepy Morse promising cocoa thermodynamics favourable. Sock-feet rehearsals telegraphed last communal shoulder lean borrowing strength like library books happily overdue on purpose.",
    "Final sentences stretched long as lazy summer trains—caboose packed with echoes everyone knew would hitchhike neatly into pillow dialogues stitched under quilts. Satisfaction nested layered as trifle: spongy daylight, custard courage, berry-bright giggles crowned lightly dreaming already.",
  ],
};

function enrichProseStoryEvenPages(
  story: StoryJson,
  textMode: StoryTextModeKey,
  lengthKey: StoryLengthKey,
): StoryJson {
  if (textMode !== "prose") return story;
  const floor = proseEvenPageFloorWords(lengthKey);
  const pads = [...PROSE_PAGE_PAD_BY_LENGTH[lengthKey]];
  if (!pads.length) return story;

  const pages = story.pages.map((p, idx) =>
    idx % 2 === 0 ? { ...p, text: String(p.text ?? "") } : { ...p },
  );

  for (let i = 0; i < pages.length; i += 2) {
    const spreadSlot = Math.floor(i / 2);
    let t = pages[i].text.trim();
    let added = 0;
    while (countStoryWordsUk(t) < floor && added < 4 && t.length < STORYBOOK_PROSE_PAGE_TEXT_MAX - 380) {
      const chunk = pads[(spreadSlot + added) % pads.length]?.trim();
      if (!chunk) break;
      t = t.length ? `${t}\n\n${chunk}` : chunk;
      added++;
    }
    if (t.length > STORYBOOK_PROSE_PAGE_TEXT_MAX) {
      t =
        t.slice(0, Math.max(0, STORYBOOK_PROSE_PAGE_TEXT_MAX - 1)) + "…";
    }
    pages[i].text = t;
  }

  return { ...story, pages };
}

/** Visual style for storybook illustrations (JSON `illustrationStyle`). */
type IllustrationStyleKey =
  | "clay3d"
  | "vector_flat"
  | "watercolor"
  | "papercut"
  | "soft_3d";

type ArtStyleSpec = {
  /** Injected into storywriter system rules — guides characterDesign wording. */
  storyBrief: string;
  /** compileCharacterLock user prompt — allowed vocabulary for cast lines. */
  compileLockArtWords: string;
  /** Fallback HERO line segment before " — always the same..." */
  castHeroSurface: string;
  /** After BUDDY description: continuity phrase. */
  buddyFollowStyle: string;
  /** End of co-star fallback line. */
  coStarLineEnd: string;
  /** Full STYLE sentence in image preamble (ends with space). */
  preambleStyleSentence: string;
  /** Phrase in cast anchor T2I (after photo lock). */
  anchorMaterialClause: string;
  /** GPT Image edit blocks — opening phrase. */
  gptEditStyleOpener: string;
  /** Fal Redux short tag after "Textless; ". */
  falReduxStyleTag: string;
  /** Fal legacy chain tag after TEXTLESS. */
  falLegacyStyleTag: string;
  /** composeDallePrompt MANDATORY CAST middle line. */
  composeMandatoryCast: string;
};

const ART_STYLE_SPECS: Record<IllustrationStyleKey, ArtStyleSpec> = {
  clay3d: {
    storyBrief:
      "Illustration look: soft matte clay and toy-plastic 3D — rounded limbs, gentle pastel light, not photoreal skin. In characterDesign use clay-appropriate texture words (e.g. smooth sculpted clay hair, fuzzy felt fur, gentle plastic sheen).",
    compileLockArtWords:
      "Art style words allowed ONLY: \"soft matte clay toy, rounded limbs, gentle toy plastic sheen\" — never \"realistic\" or \"Pixar skin\".",
    castHeroSurface:
      "young child, friendly rounded face, simple solid-colour top and trousers, soft matte clay toy 3D",
    buddyFollowStyle: "same toy-clay style on every page",
    coStarLineEnd: "Soft matte clay toy 3D whenever this child appears.",
    preambleStyleSentence:
      "STYLE: soft matte clay and toy-plastic 3D ONLY — rounded limbs, gentle pastel lighting, not realistic human skin, not glossy CGI. Edge-to-edge scene, no frames or borders. Wholesome and safe for toddlers. ",
    anchorMaterialClause: "soft matte clay and toy-plastic 3D, gentle pastel light",
    gptEditStyleOpener:
      "Children's picture-book illustration, soft matte clay and toy-plastic 3D, gentle pastel light, edge-to-edge with no borders or text. ",
    falReduxStyleTag: "Textless; soft matte clay toy 3D. ",
    falLegacyStyleTag:
      "TEXTLESS — no words, signs, book pages with text, logos, paper scraps with writing, or gibberish texture; soft matte clay toy 3D only. ",
    composeMandatoryCast:
      "same toy-clay 3D models on every page — identical proportions, colours, species; do not redesign or swap styles",
  },
  vector_flat: {
    storyBrief:
      "Illustration look: bold flat vector children's book art — clean shapes, limited harmonious palette, crisp edges, minimal gradients, no clay or 3D toy look. In characterDesign use flat-colour language (solid fills, simple graphic shadows).",
    compileLockArtWords:
      "Art style words allowed ONLY: \"flat vector illustration, clean shapes, limited flat colours\" — never clay, photoreal skin, or glossy 3D CGI.",
    castHeroSurface:
      "young child, friendly simplified face, simple outfit blocks of solid colour, bold flat vector kid-lit style",
    buddyFollowStyle: "same flat vector style on every page",
    coStarLineEnd: "Flat vector kid illustration whenever this child appears.",
    preambleStyleSentence:
      "STYLE: bold flat vector children's illustration ONLY — geometric shapes, crisp edges, flat colour fills, no 3D clay, no photoreal skin, no heavy airbrush. Edge-to-edge scene. Wholesome and safe for toddlers. ",
    anchorMaterialClause: "bold flat vector children's art, gentle bright palette",
    gptEditStyleOpener:
      "Children's picture-book illustration, bold flat vector style with clean shapes and flat colours, edge-to-edge with no borders or text. ",
    falReduxStyleTag: "Textless; bold flat vector kid book style. ",
    falLegacyStyleTag:
      "TEXTLESS — no words, signs, logos, or gibberish texture; bold flat vector children's style only. ",
    composeMandatoryCast:
      "same flat vector character designs on every page — identical proportions, colours, species; do not redesign or swap styles",
  },
  watercolor: {
    storyBrief:
      "Illustration look: soft watercolor picture-book art — gentle washes, slight paper texture feel, soft edges, luminous but not photoreal. In characterDesign mention watercolor-friendly cues (soft pigments, flowing hair colour washes).",
    compileLockArtWords:
      "Art style words allowed ONLY: \"soft watercolor, gentle washes, picture-book painterly\" — never clay, never sharp vector flats, never photoreal.",
    castHeroSurface:
      "young child, gentle friendly features, simple outfit, soft watercolor picture-book rendering",
    buddyFollowStyle: "same watercolor storybook style on every page",
    coStarLineEnd: "Soft watercolor kid-book style whenever this child appears.",
    preambleStyleSentence:
      "STYLE: traditional watercolor children's book illustration ONLY — soft washes, gentle paper texture feeling, luminous pastel palette, NOT clay, NOT flat vector, NOT photoreal. Edge-to-edge scene. Wholesome and safe for toddlers. ",
    anchorMaterialClause: "soft watercolor children's book illustration, gentle light",
    gptEditStyleOpener:
      "Children's picture-book illustration, soft watercolor washes and gentle picture-book color, edge-to-edge with no borders or text. ",
    falReduxStyleTag: "Textless; soft watercolor children's book style. ",
    falLegacyStyleTag:
      "TEXTLESS — no words, signs, logos, or gibberish texture; soft watercolor picture-book style only. ",
    composeMandatoryCast:
      "same watercolor-rendered character designs on every page — identical proportions, colours, species; do not redesign or swap styles",
  },
  papercut: {
    storyBrief:
      "Illustration look: layered cut-paper / collage children's art — crisp paper edges, subtle drop shadows between layers, craft texture, no clay. In characterDesign use paper-craft wording (cut-paper shapes, layered colour blocks).",
    compileLockArtWords:
      "Art style words allowed ONLY: \"cut-paper collage, layered shapes, craft paper texture\" — never clay, never airbrushed CGI.",
    castHeroSurface:
      "young child, simplified friendly face, outfit as layered cut-paper shapes, collage picture-book style",
    buddyFollowStyle: "same cut-paper collage style on every page",
    coStarLineEnd: "Cut-paper collage kid style whenever this child appears.",
    preambleStyleSentence:
      "STYLE: cut-paper collage children's illustration ONLY — layered coloured shapes, slight shadow between layers, craft textures, NO clay, NO photoreal skin. Edge-to-edge scene. Wholesome and safe for toddlers. ",
    anchorMaterialClause: "cut-paper layered collage children's book style",
    gptEditStyleOpener:
      "Children's picture-book illustration, cut-paper collage with layered shapes and soft craft shadows, edge-to-edge with no borders or text. ",
    falReduxStyleTag: "Textless; cut-paper collage children's book style. ",
    falLegacyStyleTag:
      "TEXTLESS — no words, signs, logos, or gibberish texture; cut-paper collage style only. ",
    composeMandatoryCast:
      "same cut-paper collage models on every page — identical proportions, colours, species; do not redesign or swap styles",
  },
  soft_3d: {
    storyBrief:
      "Illustration look: soft rounded 3D animation — like a gentle family feature film still: smooth forms, pastel lighting, appealing exaggeration, NOT gritty photoreal. In characterDesign use smooth stylized 3D wording (rounded forms, soft subsurface feel) but never hyperreal pores.",
    compileLockArtWords:
      "Art style words allowed ONLY: \"soft rounded 3D animation style, gentle pastel cinematic light, stylized not photoreal\" — never stop-motion clay lumps unless asked.",
    castHeroSurface:
      "young child, appealing rounded face, simple outfit, soft rounded 3D animation style",
    buddyFollowStyle: "same soft 3D animation style on every page",
    coStarLineEnd: "Soft rounded 3D animation style whenever this child appears.",
    preambleStyleSentence:
      "STYLE: soft rounded 3D animated film look ONLY — appealing exaggerated proportions, gentle pastel cinematic lighting, smooth stylized surfaces, NOT photoreal humans, NOT gritty CGI. Edge-to-edge scene. Wholesome and safe for toddlers. ",
    anchorMaterialClause: "soft rounded 3D animation style, gentle pastel cinematic light",
    gptEditStyleOpener:
      "Children's picture-book illustration, soft rounded 3D animation style with gentle pastel light, edge-to-edge with no borders or text. ",
    falReduxStyleTag: "Textless; soft rounded 3D animation kid-book style. ",
    falLegacyStyleTag:
      "TEXTLESS — no words, signs, logos, or gibberish texture; soft rounded 3D animation style only. ",
    composeMandatoryCast:
      "same soft 3D animated character designs on every page — identical proportions, colours, species; do not redesign or swap styles",
  },
};

function coerceIllustrationStyle(raw: unknown): IllustrationStyleKey {
  const s = String(raw ?? "").trim().toLowerCase().replace(/-/g, "_");
  const map: Record<string, IllustrationStyleKey> = {
    clay3d: "clay3d",
    clay: "clay3d",
    toy_clay: "clay3d",
    vector_flat: "vector_flat",
    vector: "vector_flat",
    flat: "vector_flat",
    watercolor: "watercolor",
    watercolour: "watercolor",
    papercut: "papercut",
    paper_cut: "papercut",
    collage: "papercut",
    soft_3d: "soft_3d",
    soft3d: "soft_3d",
    pixar: "soft_3d",
  };
  const k = map[s];
  if (k) return k;
  return "clay3d";
}

/** When true (opt-in only): standard tier bumps GPT Image quality if user uploaded ref photos. Unset = economy tier even with refs (~standard cost); uploads + vision text still steer likeness. */
function gptImageRefPhotoQualityBoostEnabled(): boolean {
  const v = (Deno.env.get("STORYBOOK_REF_PHOTO_IMAGE_BOOST") ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function gptImageSizeForRequest(bookTier: PictureBookQuality): string {
  const raw = (Deno.env.get("STORYBOOK_GPTIMAGE_SIZE") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .replace("×", "x");
  if (raw && GPT_IMAGE_SIZES.has(raw)) return raw;
  if (bookTier === "high") return "1536x1024";
  return "1024x1024";
}

function gptImageDefaultModel(): string {
  return (Deno.env.get("STORYBOOK_GPTIMAGE_MODEL") ?? "").trim() || "gpt-image-1.5";
}

/** OpenAI default is "auto"; we default to "low" to reduce false refusals on kids' story prompts. */
function gptImageModerationParam(): "low" | "auto" {
  return (Deno.env.get("STORYBOOK_GPTIMAGE_MODERATION") ?? "").trim() === "auto"
    ? "auto"
    : "low";
}

function gptImageQualityForRequest(
  scope: "generation" | "edit",
  bookTier: PictureBookQuality,
  hasUserPortraitRefs = false,
): "low" | "medium" | "high" | "auto" {
  const envRaw = (Deno.env.get("STORYBOOK_GPTIMAGE_QUALITY") ?? "").trim().toLowerCase();
  if (
    envRaw === "medium" ||
    envRaw === "high" ||
    envRaw === "auto" ||
    envRaw === "low"
  ) {
    return envRaw;
  }
  if (bookTier === "high") {
    return scope === "generation" ? "high" : "medium";
  }
  // Standard tier — optional bump when ref photos (costly; enable with STORYBOOK_REF_PHOTO_IMAGE_BOOST=1)
  if (hasUserPortraitRefs && gptImageRefPhotoQualityBoostEnabled()) {
    return scope === "generation" ? "high" : "medium";
  }
  return scope === "generation" ? "medium" : "low";
}

/** When env unset: high book tier or (ref photos + quality boost on) → stricter edit lock. */
function gptImageInputFidelityForRequest(
  bookTier: PictureBookQuality,
  hasUserPortraitRefs: boolean,
): "low" | "high" {
  const env = (Deno.env.get("STORYBOOK_GPTIMAGE_INPUT_FIDELITY") ?? "").trim().toLowerCase();
  if (env === "high") return "high";
  if (env === "low") return "low";
  if (bookTier === "high") return "high";
  if (hasUserPortraitRefs && gptImageRefPhotoQualityBoostEnabled()) return "high";
  return "low";
}

/**
 * Vision model for summarising **uploaded** reference photos (hero/friend/custom).
 * Default `gpt-4o` reads hair colour/length more reliably than mini; override with
 * `STORYBOOK_VISION_MODEL=gpt-4o-mini` to save cost.
 */
function storybookPortraitVisionModel(): string {
  const m = (Deno.env.get("STORYBOOK_VISION_MODEL") ?? "").trim();
  if (m) return m;
  return "gpt-4o";
}

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

async function gptImageBytesFromImagesResponse(raw: string): Promise<Uint8Array> {
  let data: { data?: { b64_json?: string; url?: string }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("gpt_image_response_not_json");
  }
  const item = data.data?.[0];
  if (item?.b64_json) {
    return decodeB64ToBytes(item.b64_json);
  }
  const u = item?.url;
  if (u && /^https?:\/\//i.test(u)) {
    const ir = await fetch(u);
    if (!ir.ok) {
      throw new Error(`gpt_image_url_fetch_${ir.status}`);
    }
    return new Uint8Array(await ir.arrayBuffer());
  }
  const hint = raw.length > 400 ? raw.slice(0, 400) + "…" : raw;
  console.error("[gpt-image] missing b64_json/url in data[0]; body:", hint);
  throw new Error("gpt_image_empty");
}

async function gptImageGenerate(
  apiKey: string,
  prompt: string,
  bookTier: PictureBookQuality,
  retryCount = 0,
  hasUserPortraitRefs = false,
): Promise<{ url: string; bytes: Uint8Array }> {
  const model = gptImageDefaultModel();
  const moderation = gptImageModerationParam();
  const size = gptImageSizeForRequest(bookTier);
  const quality = gptImageQualityForRequest("generation", bookTier, hasUserPortraitRefs);
  const trimmed = prompt.slice(0, GPT_IMAGE_PROMPT_MAX);

  const post = (body: Record<string, unknown>) =>
    fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  let r = await post({
    model,
    prompt: trimmed,
    n: 1,
    size,
    quality,
    moderation,
    output_format: "png",
    stream: false,
  });
  let raw = await r.text();
  if (!r.ok && r.status === 400) {
    console.warn(
      "[gpt-image] generations HTTP 400 — retrying minimal payload (no size/quality)",
    );
    r = await post({
      model,
      prompt: trimmed,
      n: 1,
      moderation,
      output_format: "png",
      stream: false,
    });
    raw = await r.text();
  }
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
      return gptImageGenerate(
        apiKey,
        prompt,
        bookTier,
        retryCount + 1,
        hasUserPortraitRefs,
      );
    }
    console.error("[gpt-image] generations error", r.status, raw.slice(0, 700));
    throw new Error(openaiImageErrorDetail(r.status, raw));
  }

  const bytes = await gptImageBytesFromImagesResponse(raw);
  const url = await uploadPngToStorybookImages(bytes, randomKey("anchor"));
  return { url, bytes };
}

async function gptImageEdit(
  apiKey: string,
  prompt: string,
  referenceBytes: Uint8Array[],
  bookTier: PictureBookQuality,
  retryCount = 0,
  hasUserPortraitRefs = false,
): Promise<{ url: string; bytes: Uint8Array }> {
  const model = gptImageDefaultModel();
  const moderation = gptImageModerationParam();
  const size = gptImageSizeForRequest(bookTier);
  const quality = gptImageQualityForRequest("edit", bookTier, hasUserPortraitRefs);
  const trimmed = prompt.slice(0, GPT_IMAGE_PROMPT_MAX);
  const fidelity = gptImageInputFidelityForRequest(bookTier, hasUserPortraitRefs);

  const buildForm = (withQuality: boolean): FormData => {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", trimmed);
    form.append("n", "1");
    form.append("size", size);
    if (withQuality) {
      form.append("quality", quality);
    }
    form.append("output_format", "png");
    form.append("stream", "false");
    form.append("moderation", moderation);
    form.append("input_fidelity", fidelity);
    for (let i = 0; i < referenceBytes.length; i++) {
      const blob = new Blob([referenceBytes[i]] as unknown as BlobPart[], {
        type: "image/png",
      });
      form.append("image[]", blob, `ref-${i + 1}.png`);
    }
    return form;
  };

  let r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: buildForm(true),
  });
  let raw = await r.text();
  if (!r.ok && r.status === 400) {
    console.warn("[gpt-image] edits HTTP 400 — retrying without quality field");
    r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: buildForm(false),
    });
    raw = await r.text();
  }
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
      return gptImageEdit(
        apiKey,
        prompt,
        referenceBytes,
        bookTier,
        retryCount + 1,
        hasUserPortraitRefs,
      );
    }
    console.error("[gpt-image] edits error", r.status, raw.slice(0, 700));
    throw new Error(openaiImageErrorDetail(r.status, raw));
  }

  const bytes = await gptImageBytesFromImagesResponse(raw);
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
      const ttsModel = resolveOpenAiTtsModel();
      let ttsVoice = resolveOpenAiTtsVoice(searchParams.get("ttsVoice"));
      ttsVoice = coerceVoiceForTtsModel(ttsVoice, ttsModel);

      const payload: Record<string, string> = {
        model: ttsModel,
        voice: ttsVoice,
        input: ttsText,
      };
      if (ttsModel === DEFAULT_TTS_MODEL) {
        const ins = Deno.env.get("OPENAI_TTS_INSTRUCTIONS")?.trim();
        payload.instructions =
          ins ||
          "Speak in a warm, upbeat, clear tone suitable for reading a children's story aloud.";
      }

      try {
        const r = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
    /** Display name on dedication page (falls back to child name). */
    author?: string;
    /** Optional `data:image/jpeg|png|webp;base64,...` for hero appearance (storybook step 1). */
    heroReferenceImage?: string;
    /** Up to 3 hero reference photos; only used if `characterReferencePhotos` is absent. */
    heroReferenceImages?: string[];
    /** Tagged refs: `who` = "hero", hero's first name, friend id, or friend label (friend must be in `familyPeople`). */
    characterReferencePhotos?: unknown;
    /** GPT Image only: `"standard"` (economy, screen) or `"high"` (print-oriented size + quality when secrets unset). */
    pictureBookQuality?: string;
    /** Illustration look: clay3d | vector_flat | watercolor | papercut | soft_3d */
    illustrationStyle?: string;
    /** Reader layout: duplex (text overlaid on art) vs facing (art alone on one page). */
    readerArtLayout?: string;
    /** Story shape: prose (`normal`) vs rhyming poem. Omitted → prose for facing, rhyme for duplex. */
    storyTextMode?: string;
    /** Per-page length: short | medium | long. Omitted → medium. */
    storyLength?: string;
    /** When `character` is `custom_buddy`, short free-text from the child (max 200 chars). */
    buddyCustom?: string;
    /** When `place` is `custom_place`, short free-text from the child (max 200 chars). */
    placeCustom?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  const childName = sanitizeName(String(body.childName ?? ""));
  const dedicationAuthor =
    String(body.author ?? "").trim() || childName;
  const characterKey = normalizeWizardKey(body.character ?? "");
  const placeKey = normalizeWizardKey(body.place ?? "");

  let characterDesc = CHARACTERS[characterKey];
  let placeDesc = PLACES[placeKey];

  if (characterKey === "custom_buddy") {
    const c = sanitizeCustomChoice(String(body.buddyCustom ?? ""));
    if (c.length < 4) {
      return jsonResponse({
        error: "invalid_choices",
        detail: "custom_buddy_too_short",
      }, 400);
    }
    characterDesc =
      `One imaginary buddy as described: ${c}. Keep a single consistent friendly storybook design — soft proportions, kind expression, never scary or adult; no realistic weapons, gore, horror, or recognizable licensed characters.`;
  }
  if (placeKey === "custom_place") {
    const p = sanitizeCustomChoice(String(body.placeCustom ?? ""));
    if (p.length < 4) {
      return jsonResponse({
        error: "invalid_choices",
        detail: "custom_place_too_short",
      }, 400);
    }
    placeDesc =
      `Setting as described: ${p}. Bright picture-book world for young children — warm and readable, no nightmare horror, disasters, politics, or logos / brand text.`;
  }

  if (!characterDesc || !placeDesc) {
    if (!characterDesc) {
      return jsonResponse({
        error: "invalid_choices",
        detail: `unknown_character:${characterKey}`,
      }, 400);
    }
    return jsonResponse({
      error: "invalid_choices",
      detail: `unknown_place:${placeKey}`,
    }, 400);
  }

  const noBuddyBook = characterKey === "nobuddy";

  const plotHint = sanitizePlotHint(String(body.plotHint ?? ""));
  const pictureBookQuality = coercePictureBookQuality(body.pictureBookQuality);
  const illustrationStyleKey = coerceIllustrationStyle(body.illustrationStyle);
  const readerArtLayoutKey = coerceReaderArtLayout(body.readerArtLayout);
  const storyTextModeKey = coerceStoryTextMode(body.storyTextMode, readerArtLayoutKey);
  const storyLengthKey = coerceStoryLength(body.storyLength);
  const lenSpec = storyLengthSpec(storyLengthKey);
  const artStyleSpec = ART_STYLE_SPECS[illustrationStyleKey];

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
        desc: PLACES.cave,
      },
      {
        pattern:
          /\b(football\s*stadium|soccer\s*stadium|football\s*ground|football\s*pitch|soccer\s*pitch|soccer\s*field|at\s+the\s+stadium|in\s+the\s+stadium|stadium\s+stands?)\b/i,
        key: "stadium",
        desc: PLACES.stadium,
      },
      {
        pattern: /\b(museum|gallery)\b/i,
        key: "museum",
        desc: PLACES.museum,
      },
      {
        pattern: /\b(train|railway|locomotive|carriage|station\s+platform)\b/i,
        key: "train",
        desc: PLACES.train,
      },
      {
        pattern: /\b(circus|big\s*top|under\s+the\s+circus\s+tent)\b/i,
        key: "circus",
        desc: PLACES.circus,
      },
      {
        pattern: /\b(pirate\s*ship|galleon|shipwreck|aboard\s+a\s+ship|on\s+a\s+pirate\s+ship)\b/i,
        key: "pirateship",
        desc: PLACES.pirateship,
      },
      {
        pattern: /\b(zoo|safari\s*park|petting\s+zoo|animal\s*park|aquarium)\b/i,
        key: "zoo",
        desc: PLACES.zoo,
      },
      {
        pattern: /\b(farm|barn|tractor|hayloft|farmland)\b/i,
        key: "farm",
        desc: PLACES.farm,
      },
      {
        pattern: /\b(mountain|mountains|alpine|summit|peak|hillside|hilltop)\b/i,
        key: "mountain",
        desc: PLACES.mountain,
      },
      {
        pattern: /\b(desert|sand\s*dunes|oasis)\b/i,
        key: "desert",
        desc: PLACES.desert,
      },
      {
        pattern: /\b(snow|snowy|igloo|ski\s+slope|winter\s+wonderland)\b/i,
        key: "snow",
        desc: PLACES.snow,
      },
      {
        pattern: /\b(town|city|market\s+square|high\s*street)\b/i,
        key: "city",
        desc: PLACES.city,
      },
      {
        pattern: /\b(lake|lakeside|riverbank|rowing\s+boat)\b/i,
        key: "lake",
        desc: PLACES.lake,
      },
      {
        pattern: /\b(tropical\s*island|on\s+an\s+island|island\s+adventure)\b/i,
        key: "island",
        desc: PLACES.island,
      },
      {
        pattern: /\b(underwater|under\s*the\s*sea|ocean\s*floor|coral|reef|mermaid|submarine)\b/i,
        key: "undersea",
        desc: PLACES.undersea,
      },
      {
        pattern: /\b(space|outer\s*space|moon|planet|galaxy|cosmic|rocket|asteroid|comet)\b/i,
        key: "space",
        desc: "a friendly cartoon planet or asteroid in space — soft pastel landscape with distant ringed planets, comet trails, and starry sky",
      },
      {
        pattern: /\b(at\s*sea|open\s*ocean|sailing|yacht|out\s*on\s*the\s*waves)\b/i,
        key: "sea",
        desc: PLACES.sea,
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
  const plotNamedHumans = extractPlotNamedHumans(plotHint, childName);
  const storyHumanNames = mergeUniqueFirstNames(
    [childName],
    mergeUniqueFirstNames(familyNames, plotNamedHumans),
  );
  const plotOnlyHumans = plotNamedHumans.filter(
    (n) => !familyNames.some((f) => f.toLowerCase() === n.toLowerCase()),
  );

  const bookAssetsBase = (Deno.env.get("BOOK_ASSETS_BASE_URL") ?? "").trim();
  const refPack = sanitizeCharacterReferencePhotos(
    body,
    familyPeople,
    childName,
  );

  let portraitAppearance = "";
  const portraitVisionAttempted = Boolean(
    refPack.heroUrls.length > 0 ||
      Object.keys(refPack.customByFriendId).length > 0 ||
      (bookAssetsBase && familyPeople.length > 0),
  );
  if (portraitVisionAttempted) {
    try {
      portraitAppearance = await appearanceNotesFromReferences(
        apiKey,
        bookAssetsBase,
        familyPeople,
        childName,
        refPack.heroUrls,
        refPack.customByFriendId,
      );
    } catch (e) {
      console.warn("[clever-service] portrait vision failed", e);
    }
  }

  const portraitBlockForText =
    portraitAppearance.length > 0
      ? `\n\nAppearance from reference photos (each line is one person — hero and any friends you tagged with a photo, or default game portraits; match when describing these people in the story):\n${portraitAppearance}\n`
      : "";

  const storyLengthAndFormatRule =
    storyTextModeKey === "prose"
      ? readerArtLayoutKey === "facing"
        ? `- Exactly 12 pages (six double-page spreads). **Facing-page layout** (one full-page picture + one dedicated text page): each **odd** text page is shown alone on a cream text page in the app — not overlaid on art. Write ${lenSpec.proseParagraphLead} per odd page (${lenSpec.proseWordRange}), warm read-aloud prose for age ~5, with natural dialogue and sensory detail. Separate paragraphs with **two newlines** (\\n\\n) in the JSON string. **Do not** force ${lenSpec.proseAntiRhymeHint}; light rhythm or occasional rhyme is fine — **clarity and story flow come first**.`
        : `- Exactly 12 pages (six double-page spreads). **Duplex layout** (one wide picture with read-aloud text overlaid on the spread in the app): each **odd** text page pairs with the illustration — write ${lenSpec.proseParagraphLead} per odd page (${lenSpec.proseWordRange}), warm read-aloud prose for age ~5, with natural dialogue and sensory detail. Separate paragraphs with **two newlines** (\\n\\n) in the JSON string. **Do not** force ${lenSpec.proseAntiRhymeHint}; light rhythm or occasional rhyme is fine — **clarity and story flow come first**.`
      : readerArtLayoutKey === "facing"
      ? `- Exactly 12 pages (six double-page spreads). **Facing-page layout** (one full-page picture + one dedicated text page): each **odd** text page is shown alone on a cream text page in the app — not overlaid on art. The text on every such page MUST be exactly **${lenSpec.rhymeLines}** lines long (${lenSpec.rhymeLinesHint}), written as a fun, rhythmic poem that rhymes perfectly across the page (${lenSpec.rhymeSchemeExamples}). Each line should be ${lenSpec.rhymeLineShape}. Format the text with actual line breaks (\\n) after each line so the rhyming words fall at the ends of lines.`
      : `- Exactly 12 pages (six double-page spreads). The text on every page MUST be exactly **${lenSpec.rhymeLines}** lines long (${lenSpec.rhymeLinesHint}), written as a fun, rhythmic poem that rhymes perfectly across the page (${lenSpec.rhymeSchemeExamples}). Each line should be ${lenSpec.rhymeLineShape}. Format the text with actual line breaks (\\n) after each line so the rhyming words fall at the ends of lines.`;

  const oddPageTextFormatHint =
    storyTextModeKey === "prose"
      ? readerArtLayoutKey === "facing"
        ? `${lenSpec.proseParagraphLead} in each \"text\" string, paragraphs separated by two newline characters (\\n\\n), ${lenSpec.proseWordRange.replace("total on that page", "per page")}, warm read-aloud prose (not strict line-by-line rhyme).`
        : `${lenSpec.proseParagraphLead} in each \"text\" string, paragraphs separated by two newline characters (\\n\\n), ${lenSpec.proseWordRange.replace("total on that page", "per page")}, warm read-aloud prose for text shown with the wide illustration (not strict line-by-line rhyme).`
      : `exactly **${lenSpec.rhymeLines}** lines, separated by newline characters (\\n) in each \"text\" string — ${lenSpec.rhymeOddPageTail}.`;

  const proseVolumeParityRule =
    storyTextModeKey === "prose"
      ? `- **Even read-aloud heft:** Every prose-first TEXT page should feel **similarly full** (${lenSpec.proseParagraphLead}; ${lenSpec.proseWordRange.replace("total on that page", "each page alike")}). Pages **9** (spread 5 text) and **11** (spread 6 text) are not epilogue scraps—never shrink them to one skinny sentence. Match the cosy weight of spreads 2–4: weave dialogue, tactile detail (path, breeze, hands), sleepy jokes, and reactions among named characters—still advancing THIS plot—so the cream page ahead of the finale reads beautifully aloud.`
      : "";

  const system = `You write warm picture-book stories for UK English-speaking children about age 5.
Rules:
- ${artStyleSpec.storyBrief}
${noBuddyBook ? `BOOK MODE — NO IMAGINARY BUDDY: The reader chose "No buddy". For this entire book: (1) Do NOT add a recurring fantasy creature companion (unicorn, dragon, robot, etc.) in story text, characterDesign, or illustrationBriefs unless the child's plot idea explicitly requires that creature. (2) characterDesign must describe ONLY humans — the hero, any plot-named children, and game people. (3) Each illustrationBrief VISIBLE line lists only people (humans) named in that verse. (4) Page 1 must not introduce a creature buddy. Invent gentle human-centred adventures when the plot is open-ended.\n\n` : ""}- Warm, gentle, silly — never scary, violent, or mean.
- No romance, no weapons, no villains that frighten.
${storyLengthAndFormatRule}
${proseVolumeParityRule ? `${proseVolumeParityRule}\n` : ""}- **Where the ending lives (critical):** The \`pages\` array holds **exactly twelve** slots in reading order (**1-indexed aloud:** page **1**, page **2**, … page **12**). Odd slots are prose-first beats; each even slot sits with the illustration for that spread (duplex overlays text *or*, in facing layouts, prose lives on odd slots only). Treat this as **six spreads**: spreads **1–4** introduce and escalate; spread **5 (pages 9–10)** tends to carry the climax; spread **6 (pages 11–12)** **resolves**. The **LAST full prose close** MUST sit on **page 11 only** (**array index \`10\`**, zero-based). Give **two short paragraphs there** tying up THIS plot (celebration, hugs, quiet pride, thanking the buddy) — plot-specific joy, **not vague summary**. **Page 12** (**index \`11\`**) carries **picture only** (\`illustrationBrief\` full; its \`text\` stays minimal by JSON shape). Readers should feel done after page **11**'s words. Do **not** drop a cliché goodbye like "**And that was a lovely day**" on pages **7** or **9** and vanish. If a beat tilts sentimental mid-book you must still invent **fresh, plot-specific prose** on **later odd pages**, especially through **page 11**'s last lines (walking home slower, jokes, squeezing in another little moment). **Never fully wrap the whole adventure** before slot **page 11** — reserve that page for real closure.
- Odd-numbered (text-first) pages: end calmly — do NOT tack on a random ALL CAPS sound effect (SPLASH! SNORE! ZOOM!) after the text; those often feel disconnected. Keep the whole page in normal sentence case. Only use a short capped word if it is genuinely the punchline of that beat (rare); most pages should have no ALL CAPS word at all.
- NAMES VS GENDER (critical): Do **not** choose boy/girl from how a first name "usually" sounds. Names like Remy, Riley, Alex, Sam, Jordan, Charlie can be girls or boys. **The appearance-from-photos lines are ground truth:** if a line says **Gender: girl** and long blonde hair, that named child is a **girl** in the story — use **she/her** pronouns in verses, and characterDesign must say **girl** with that exact hair — never give her a boy's short brown haircut or **he/him** unless the line explicitly says **Gender: boy**. Never override a photo-derived girl line with a masculine default.
- The hero's name is given — use it often. The hero IS ${childName} — this exact first name must appear in the story text on every page where the main child acts. Whenever ${childName} is in a spread's scene, that spread's illustrationBrief must name ${childName} (you may list other named friends first if the verse introduces them that way). Never substitute a different child, wrong name, or wrong gender as the hero. The art paints only who you name — do not imply an unnamed generic kid.
- HUMAN CO-STARS vs IMAGINARY BUDDY (critical): The "Main friend character" below is always ONE imaginary creature (unicorn, dragon, dinosaur, etc.). If the plot idea also names another child, that child is a REAL HUMAN — not the buddy, not a shape-shifted version of the buddy, and never given the buddy's role in the plot. NEVER merge names: do not write that the human co-star flies as the dragon, or that the dragon "is" that child. When the plot says the children cannot find the DINOSAUR / DRAGON, the verses must ask where the DINOSAUR or DRAGON is — do not substitute a child's name as the thing that is lost unless the plot literally says that child is hiding.
- CAST vs TEXT (strict): Each illustrationBrief may include ONLY characters who appear **by name** on that spread's paired text page (the odd page before it), or the one imaginary buddy when the text clearly means them ("the dinosaur", "their friend") after names were established. If the verse names ${childName} plus a human co-star (e.g. Isaac) plus the buddy, all three may appear when the verse puts them in the scene. If the verse only mentions ${childName} and the buddy, the picture has only those two. If the verse also names game people who are in that scene, they may appear — list everyone the text actually puts in the moment. Never add lions, bears, random pals, villagers, crowds, or background "silhouette people" that the text does not mention. A few characters is fine **only** when the text names them all for that beat.
- If "People from the child's games" are listed, include them in the story by name as extra friends or family. They should feel like the same friendly faces the child picks in other games (e.g. Tilly, Baby). They are separate from the one imaginary "main friend character" (unicorn, dragon, etc.) — both can appear.${
    portraitAppearance
      ? " If appearance lines are given for the hero or game people, stay consistent with those visual details when you naturally describe them."
      : ""
  }
${
  portraitAppearance
    ? `\nPHOTO-MATCH (reference photos were uploaded): The "Appearance from reference photos" block in the user message was produced from real family pictures. For every person named there, characterDesign and every spread must preserve that identity — **hair colour, hair length, and style (including accessories)**, eye colour, skin tone, approximate age, and gender presentation — never swap in a different-looking child. If a photo line conflicts with generic "plain solid tee" boilerplate, follow the photo summary (you may describe a busy real-life top as one short neutral phrase such as "cream sweatshirt with a colourful front" rather than inventing a different outfit).\n**NO HAIR CONTRAST:** If two (or more) lines all describe long blonde hair (or the same family of colouring), **every** named child must keep that — do **not** make one child brunette, auburn, or short-haired so they "look different" next to the hero. Differentiate co-stars with outfit, face shape, or small style details only, not opposite hair colours.\n`
    : ""
}
${
  /\bCo_star_ref\s*:/i.test(portraitAppearance)
    ? `\nCo_star_ref: That line describes the second uploaded **human** reference. Map it in characterDesign and illustrations to the other named child in the story (the human co-star from the plot or games) — not ${childName} when two kids are in the book, and never the imaginary buddy creature.\n`
    : ""
}
${
  portraitAppearance
    ? `\nCO-STAR HAIR (when two kids, one merged photo line): If the appearance block only fully describes ${childName} but the plot names a second human child and there is NO Co_star_ref line, give that second child hair/skin colouring **consistent with the references** (e.g. long blonde references → do not invent short brown hair for the sibling/friend unless the plot says they look different).\n`
    : ""
}
- Include fields title (string), characterDesign (string), bookColor (string: ${BOOK_COLOR_MODEL_HINT}. If unsure, pick a tint that fits the child's name — cooler tones for many boy names, warmer for many girl names), and pages (array of 12 objects).
  For "characterDesign": describe the hero, the one main buddy creature, EVERY human child named in the plot idea who appears in the story, and any named game people who actually appear. If the plot names only ${childName} plus the buddy, characterDesign has exactly those two rich descriptions. If the plot names an extra child (e.g. Isaac), add a full third block for that child — never fold them into the buddy description. Never lions, bears, or unnamed critters. For each included character you MUST define their EXACT gender (e.g. boy/girl) **from the appearance-from-photos lines when present — those Gender: girl/boy tokens override any guess from the spelling of the child's name.** Then age, height in words or feet without inch marks (e.g. about four feet tall, or 4 ft), body shape, skin/surface tone, eye color, facial features, hair color, hair style, AND exact texture/material (e.g. smooth sculpted clay hair, fuzzy felt fur, shiny plastic — never use the double-quote character anywhere in this field). For the buddy creature, explicitly define anatomy (horse-like unicorn with hooves and horn; or winged dragon; etc.). Plus ONE specific, unchanging outfit or set of accessories with exact colors and materials. If an animal or creature wears nothing, say they are in natural animal form with no human outfits.${
    portraitAppearance
      ? " When reference-photo appearance lines exist for a person, treat those as authoritative for hair, eyes, skin, and outfit vibe for that person — do not overwrite with a generic description."
      : ""
  } CRITICAL: Keep clothing solid-colored and simple. DO NOT put logos, graphics, patterns, or text on clothing (DALL-E hallucinates these). DO NOT give them multiple outfits or changing colors. You MUST use the exact same clothing description for the hero in EVERY single illustrationBrief. That locks their look for the book; the illustrator still shows different faces and poses per spread from the story beats — your prose should not force the same generic smile line into every brief.
- Each page: { "text": string, "illustrationBrief": string | null }.
- DOUBLE-PAGE SPREADS: pair pages as (1,2), (3,4), (5,6), (7,8), (9,10), (11,12).
  Odd-numbered pages (1,3,5,7,9,11) are TEXT-FIRST pages only — use "illustrationBrief": null.
  Even-numbered pages (2,4,6,8,10,12) are PICTURE pages — each MUST have a non-null "illustrationBrief": a vivid visual scene description for an illustrator (no text to draw, no words on signs). Each brief MUST be different and visibly progress the journey.
  STRICT BRIEF FORMAT — start each brief with one explicit line, then a free description:
    "VISIBLE: <comma-separated list of who is actually in this picture frame> — DESCRIPTION: <one or two sentences of what they do and where>"
  VISIBLE CAST RULES (very important — read the paired verse carefully):
    • Default visible = hero + any human co-stars named in the verse (e.g. a sibling) + the buddy, **only when that verse actually puts them on stage together**. If the verse is only about ${childName} and the buddy, VISIBLE lists those two. If the verse names ${childName}, Isaac, and the buddy together, list all three.
    • If the verse says someone is HIDDEN, missing, lost, "where is", "can't find", "nowhere to be seen", "hiding", "we cannot see", "out of sight", or has flown / run / sailed AWAY — that character is NOT visible. Exclude them from VISIBLE.
    • Example, hide-and-seek beat where the dragon is the seeker hiding: VISIBLE: Sofia, Isaac (dragon hidden — do not include).
    • Example, beat where dragon is found / revealed: VISIBLE: Sofia, Isaac, dragon.
    • Example, beat where the dragon is flying overhead and they spot it: VISIBLE: Sofia, Isaac, dragon (dragon small in the upper sky, whole body and wings fully visible — not clipped by the top edge).
    • Never include a character in VISIBLE if the verse says they are NOT around for that moment.
  The DESCRIPTION (after VISIBLE) must spell out the same specific moment as the verse on the previous page: same action, same setting, same props, same time of day — not a generic scene and NEVER a different location or activity than the verse (e.g. if the verse says bouncy castle under the sky, the picture is that bouncy castle with sky visible — not a bike ride in the woods). NEVER add guardians, helpers, or creatures the verse does not mention. NEVER duplicate the buddy unless the text says so. CRITICAL FOR CONSISTENCY: DO NOT re-describe permanent looks (clothes, hair colours) in the brief — the illustrator has the master designs. DO hint mood or emotion when the verse supports it (surprise, giggling, worry melting into relief) — only in the DESCRIPTION, not by re-listing outfits; avoid copying the same stock smile line into every spread.
  ENVIRONMENT DETAIL (very important — each brief must paint a different *place* on the journey, matching the SETTING and PLOT IDEA above):
    Every illustrationBrief MUST contain at least 2 specific environmental nouns (architecture, foliage, terrain, structure, weather, depth) AND at least 1 named prop or focal object from that beat. The environmental nouns MUST come from the actual SETTING and PLOT IDEA — if the plot says CASTLE, the briefs are inside or around a castle (stone walls, banners, courtyards, towers, throne room, drawbridge, tapestries) NOT in deep woods. If the plot says CAVE, the briefs are inside cave passages and chambers. If the plot says BEACH, UNDERSEA, SPACE, ZOO, FARM, MOUNTAIN, DESERT, SNOW, LAKE, ISLAND, MUSEUM, CIRCUS, TRAIN, CITY, OPEN SEA, or PIRATE SHIP, paint THAT setting with matching props. Only paint a forest if the plot or setting actually mentions woods/forest/trees.
    Examples of good briefs — note how each one fits a DIFFERENT plot, and how each only includes things the plot would actually contain:
      • CASTLE plot: "${childName} and the dragon peek around a stone archway in a torchlit castle corridor, banners hanging from the wall, suit of armour standing nearby."
      • CASTLE plot: "${childName} climbs a spiral stone staircase inside a tower, narrow window showing the dragon flying past in the night sky."
      • WOODS plot: "${childName} and the unicorn walk between tall trees at sunset, soft sunbeams falling on the path."
      • SPACE plot: "${childName} bounces on a soft pastel asteroid, ringed planet huge in the starry sky behind them."
      • UNDERWATER plot: "${childName} swims past a coral reef, rays of sunlight cutting down through the water, a friendly turtle alongside."
      • BAKERY plot: "${childName} stands at a wooden counter rolling out dough, flour cloud puffing up, big stone oven glowing warmly behind."
      • ZOO plot: "${childName} and their buddy creature wave from a wide zoo path, leafy trees and a rounded viewing deck behind them, colourful enclosure shapes in soft focus."
      • PIRATE SHIP plot: "${childName} balances on a sunny wooden deck beside coiled ropes, billowing sails and a bright horizon, the dragon perched on the rail like a lookout."
      • MOUNTAIN plot: "${childName} hikes a flower-lined mountain path, rocky peaks and soft clouds above, a wooden bridge crossing a tiny stream."
    Vary the *place* between spreads in line with the plot's beats — e.g. CASTLE: gates → corridor → great hall → spiral tower → rooftop → courtyard with the dragon flying overhead. Don't repeat the same backdrop. State a different camera angle / shot type for each (wide establishing shot, mid shot, low-angle hero kneeling, over-the-shoulder peering, etc).
    Background details ARE allowed (in fact required) — what is NOT allowed is faced extras the verse doesn't mention.
    ${
      readerArtLayoutKey === "facing"
        ? "COMPOSITION / SCALE FOR THE ILLUSTRATOR (single-page pictures — story text is on the facing HTML page, not painted on this image): Each illustration reads as ONE standalone page. **No empty half, blank strip, or soft dead zone reserved for captions** in the art — paint a **balanced full-bleed** scene edge-to-edge. **Centre the cast and focal action** — keep the group's visual mass roughly **~45–55% from the left** (near the picture's horizontal middle), **not** parked on the far right or far left. **Camera pulled back** — picture-book *wide* or *medium-wide* framing: the **environment** must stay a major part of every illustration. Typical group shots: the whole cast together only **~30–45% of frame height** (single-figure beats a bit less). Modest inset — horns, ears, wing tips fully inside the frame. When the verse describes jumping, bouncing, trampolines, soaring, flying, or reaching high in the air, the illustrationBrief MUST specify a wide or full shot with every visible named figure shown completely head-to-toe — never a tight mid-shot that crops at the neck, waist, or knees."
        : "COMPOSITION / SCALE FOR THE ILLUSTRATOR: Full-bleed spreads — the setting and atmosphere fill the double-page edge-to-edge. **Camera pulled back** — picture-book *wide* or *medium-wide* framing, not tight hero close-ups: the **environment** (walls, sky, terrain, props) must be a major part of every illustration so readers can “see the place”, not just faces. Typical group shots: the whole cast together only **~30–45% of frame height** (single-figure beats a bit less); avoid filling most of the canvas with heads and torsos. Keep a modest inset so every listed character fits without edge-clipping (full heads and feet on wide shots; on closer emotional beats, still show plenty of background, not a portrait zoom). The tallest features (unicorn horn, ears, hair, wing tips) must sit fully inside the frame with visible margin — never cropped. If tight, **widen the shot** or shrink the characters. **GUTTER:** Do not place a main character’s face or body on the exact vertical centre — bias the group slightly left or right of the fold so the book spine does not cut a child in half. When the verse describes jumping, bouncing, trampolines, soaring, flying, or reaching high in the air, the illustrationBrief MUST specify a wide or full shot with every visible named figure shown completely head-to-toe — never a tight mid-shot that crops at the neck, waist, or knees."
    }
  OPENING SPREAD (page 2 only — the first illustrationBrief; also reused as bookshelf cover thumbnail): MUST match page 1 text and the child's plot, AND establish the actual SETTING (castle / woods / cave / beach / space / zoo / farm / mountain / sea / ship / train / city / circus / lake / snow / desert / museum / island / etc. — whichever the plot calls for).\nOPENING CAST BUDGET — **minimal faces so the cover thumbnail reads clearly:** Pair page 1 text with page 2 so **VISIBLE** ordinarily lists ONLY ${childName}, the imaginary buddy (if any), and **at most one other named human actually in that opening verse**, unless the plot snippet explicitly needs several children together in scene one. **Do NOT put every optional game friend onto spreads 1–2**: introduce extra pals **from spread 3 onward** unless page 1 names each one **on stage together.** **VISIBLE** mirrors page 1 only — **no half-visible bodies creeping from frame edges**; every faced figure wholly inside margins.\n Example: castle hide-and-seek opens at gates or courtyard — not a woods default.** No unwritten extras.
  When game people with portrait notes appear on a picture page, the brief should mention them looking like those notes (hair, outfit colours, age vibe).
- If a "plot idea" is given, you MUST make it the central theme of the story and feature it heavily in EVERY illustration brief. If it is empty, invent a short happy outing that fits the setting.
- PLOT FIDELITY — read the plot idea LITERALLY:
  • Use ONLY props, locations, and story beats that actually appear in the plot the child wrote. Don't invent extras.
  • Resolve the story with whatever the plot actually says is the climax — for example "they realised the dragon could fly", "they finally caught the cheeky dragon", "the cake came out of the oven golden brown". Don't substitute a generic ending.
  • Stay inside the setting the plot names. If the plot says castle, every spread is in the castle. If beach, every spread is on the beach.
  • Use only the named cast (hero + human co-stars from the plot + buddy + any game people the plot uses). Don't add background characters, animals, or family members the plot does not name.
  • If the plot has a narrative twist or reveal, build to that reveal as the climax around spread 4 or 5 — not an off-hand line.
- OUTPUT MUST BE VALID JSON: In title, characterDesign, and EVERY page "text" and "illustrationBrief" string, do NOT put the double-quote character ("). It ends the string and corrupts the whole file. For heights use words (about four feet tall) or 4 ft / 5 ft — never write 4'0\" or 5'2\" style inch marks. For emphasis use single quotes or nothing — never paste (e.g. \"smooth clay\") with raw \" inside values.
- JSON only, no markdown.`;

  const user = `Child name: ${childName}
${
  noBuddyBook
    ? "Imaginary buddy: none — human-only book (no standing creature companion unless the plot explicitly demands one).\n"
    : `Main friend character (imaginary buddy): ${characterDesc}\n`
}Setting to feature: ${placeDesc}
People from the child's games to include by name (friends/family — use them warmly when listed; each may have a portrait note above): ${
    familyNames.length > 0 ? familyNames.join(", ") : "(none)"
  }
Other human children named ONLY in the plot idea below (they are REAL KIDS in the story — NOT the imaginary buddy; give each a clear role; ${
    portraitBlockForText
      ? `each MUST match their appearance line above if present — never give opposite hair colour or length for 'visual contrast' with ${childName}.`
      : "if not listed above, invent a simple distinct look"
  }): ${
    plotOnlyHumans.length > 0 ? plotOnlyHumans.join(", ") : "(none)"
  }${portraitBlockForText}
Plot idea from the child (CRITICAL: make this the core focus of the story and pictures): ${
    plotHint.length ? plotHint : "(none — invent a cosy little adventure that fits the setting)"
  }
Page 1 and page 2 must OPEN this plot: the first illustration (page 2 brief) is the first scene readers see — match this plot's SETTING and props${
  noBuddyBook ? "" : ", and buddy"
}. Read the plot literally: if it says "castle", spread 1 is the castle (gates, great hall, courtyard); if it says "woods", spread 1 is woods; if it says "underwater", spread 1 is underwater. Do NOT default to woods.
${
  familyNames.length === 0 && plotNamedHumans.length === 0
    ? noBuddyBook
      ? `Picture cast rule: only people **named in each verse** may appear on that spread's illustration — usually ${childName} alone or with named human friends. No creature buddy.\n`
      : `Picture cast rule: only people/creatures **named in each verse** may appear on that spread's illustration — usually ${childName} and the buddy. Do not name anyone in a brief who is not in the paired text.\n`
    : `Main human cast for this book (must appear in the verses whenever they are in the scene together — use these exact names): ${storyHumanNames.join(", ")}. Picture rule: only names that appear in each verse may be in that spread's illustration; match the plot's who-is-hiding logic with the VISIBLE line.\n`
  }
Every odd text page: ${oddPageTextFormatHint}
Return JSON shape: { "title": string, "characterDesign": string, "bookColor": "pink" | "blue" | "green" | "purple" | "orange" | "teal" | "red" | "yellow" | "lilac" | "mint" | "coral" | "navy", "pages": [ { "text": string, "illustrationBrief": string | null }, ... 12 items ] }`;

  const bookCoverColorReq = String(body.bookCoverColor ?? "").trim();

  let story: StoryJson;
  try {
    story = await openaiChatJson(apiKey, system, user);
    story = enrichProseStoryEvenPages(story, storyTextModeKey, storyLengthKey);
  } catch (e) {
    console.error(e);
    const detail =
      e instanceof Error ? e.message.slice(0, 420) : String(e).slice(0, 420);
    return jsonResponse({ error: "story_failed", detail }, 502);
  }

  story.pages = prependFrontMatterPages(story.pages, dedicationAuthor);

  const briefsSummary = oddPagesWithIllustrationBriefs(story.pages)
    .map((idx) => story.pages[idx]?.illustrationBrief)
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
      plotNamedHumans,
      portraitAppearance,
      compileLockArtWords: artStyleSpec.compileLockArtWords,
    });
  } catch (e) {
    console.warn("[clever-service] compileCharacterLock failed", e);
  }

  const coStarFallbackLine = (n: string) =>
    `${n.toUpperCase()}: human child co-star from the plot — match reference-photo hair and skin when storywriter draft lists them; distinguish from ${childName} by **outfit and face shape only**, not by flipping blonde→brown or long→short unless the written draft explicitly says so. ${artStyleSpec.coStarLineEnd}`;

  const duoImageCastFallback = noBuddyBook
    ? `HERO: ${childName}, ${artStyleSpec.castHeroSurface} — always the same human hero in every spread.` +
      (plotNamedHumans.length > 0
        ? " " + plotNamedHumans.map((n) => coStarFallbackLine(n)).join(" ")
        : "")
    : `HERO: ${childName}, ${artStyleSpec.castHeroSurface} — always the same human hero in every spread. ` +
      `BUDDY: ${characterDesc}, exactly ONE individual of this species in every image — never duplicate, never parent+baby pair, ${artStyleSpec.buddyFollowStyle}.` +
      (plotNamedHumans.length > 0
        ? " " + plotNamedHumans.map((n) => coStarFallbackLine(n)).join(" ")
        : "");

  const castBible =
    compiledLock.length > 120
      ? compiledLock
      : familyNames.length === 0 && plotNamedHumans.length === 0
        ? duoImageCastFallback
        : story.characterDesign && story.characterDesign.length > 80
          ? story.characterDesign
          : duoImageCastFallback;

  const stylePreambleLayoutDuplex =
    "The left third must be only smooth colour, soft sky, plain wall, or gentle gradient — zero pseudo-text texture there (the app draws real text in HTML). " +
    "CRITICAL LAYOUT RULE: Leave the left half of the image mostly uncluttered with a simple, soft, darker background so that WHITE storybook text can be printed over it clearly. Place the main characters and action on the right half or center-right of the image. ";

  const stylePreambleLayoutFacing =
    "LAYOUT (single-page art in the reader — story text is on the facing HTML page, NOT overlaid on this image): **Do not** reserve an empty left third, empty side strip, or blank half for captions. Paint a **balanced full-bleed** picture. **Centre the main characters and focal action** — aim the group's visual mass near **~45–55% from the left** (horizontal middle of the canvas), **not** flattened to one edge. ";

  const stylePreambleFramingDuplex =
    "FRAMING / CHARACTER SCALE (critical): FULL-BLEED SCENE — paint walls, sky, ground, props, and atmosphere so the artwork fills the entire canvas edge-to-edge (rich picture-book spread, not a tiny scene floating in empty space). **Pull the camera back** — **medium-wide** framing by default: the **background and setting** must read clearly in every spread, not just the characters’ faces. The cast together should typically occupy only **~28–42% of frame height** (single heroes or duos **~22–36%**) so caves, skies, rooms, and landscapes have room to breathe — never a tight bust or “zoomed-in” portrait unless the verse is purely a tight reaction beat (and even then keep architecture/sky visible). Keep modest inset — full heads, hair, hands, feet, tail, and wings inside the frame — never cropped or jammed against the border. Never crop a child or buddy at the neck or waist when the moment shows their whole body standing, jumping, or bouncing — use a wider shot instead. For jumping, trampolines, bouncing, soaring, or flying beats, default to a wide shot with the group using only **~30–42%** of frame height so heads, feet, and hooves stay clear of the top and bottom edges. **GUTTER / SPINE:** do not center a main character on the vertical midline — bias the group slightly **left or right** so the book fold does not slice through a face or torso. Unicorn horns, tall ears, hair poofs, wing tips, and raised hooves/paws must be fully visible with clear air above and beside them — never clipped. If a figure still feels tight, shrink only the cast and pull the camera back; keep the environment rich. Never line up the whole cast as a tiny strip along the bottom like stickers; show comfortable ground and body. ";

  const stylePreambleFramingFacing =
    "FRAMING / CHARACTER SCALE (critical): FULL-BLEED SCENE — paint walls, sky, ground, props, and atmosphere so the artwork fills the entire canvas edge-to-edge (rich single-page picture, not a tiny scene floating in empty space). **Pull the camera back** — **medium-wide** framing by default: the **background and setting** must read clearly in every spread, not just the characters’ faces. The cast together should typically occupy only **~28–42% of frame height** (single heroes or duos **~22–36%**) so caves, skies, rooms, and landscapes have room to breathe — never a tight bust or “zoomed-in” portrait unless the verse is purely a tight reaction beat (and even then keep architecture/sky visible). Keep modest inset — full heads, hair, hands, feet, tail, and wings inside the frame — never cropped or jammed against the border. Never crop a child or buddy at the neck or waist when the moment shows their whole body standing, jumping, or bouncing — use a wider shot instead. For jumping, trampolines, bouncing, soaring, or flying beats, default to a wide shot with the group using only **~30–42%** of frame height so heads, feet, and hooves stay clear of the top and bottom edges. **CENTRE COMPOSITION (standalone page):** keep the cast's visual weight near the **horizontal middle** (~45–55% from the left) — **do not** shove everyone to the far right or far left as if saving space for overlaid text; slight left/right asymmetry is fine. Unicorn horns, tall ears, hair poofs, wing tips, and raised hooves/paws must be fully visible with clear air above and beside them — never clipped. If a figure still feels tight, shrink only the cast and pull the camera back; keep the environment rich. Never line up the whole cast as a tiny strip along the bottom like stickers; show comfortable ground and body. ";

  const stylePreamble =
    "A completely textless illustration. DO NOT include any writing, letters, words, typography, labels, speech bubbles, newspapers, stone runes, book pages with text, loose paper sheets, scrolls, receipts, notebooks, stationery, litter, or ground clutter that looks like fake writing — no blurry shapes that look like fake paragraphs or gibberish anywhere. " +
    "No logos, social-media marks, app icons, or brand symbols. " +
    (readerArtLayoutKey === "facing" ? stylePreambleLayoutFacing : stylePreambleLayoutDuplex) +
    (readerArtLayoutKey === "facing" ? stylePreambleFramingFacing : stylePreambleFramingDuplex) +
    artStyleSpec.preambleStyleSentence +
    `HERO VISIBILITY: When "${childName}" appears in SCENE ACTION, they must be clearly visible (face on, not swapped for another kid). ` +
    (noBuddyBook
      ? "NO STANDING CREATURE BUDDY: Illustrate only humans named in SCENE ACTION — do not add a unicorn, dragon, robot, or animal mascot unless SCENE ACTION explicitly names that element from the plot. "
      : "ONE BUDDY ANIMAL: Only one imaginary buddy creature from the BUDDY line in the image (e.g. one unicorn), not clones or a big+little pair, unless SCENE ACTION names two. ") +
    "TEXT-LOCKED: ONLY characters explicitly named in SCENE ACTION — same roster as this spread's verse, same count. NO unnamed extras: no villagers, silhouettes with faces, filler torch-bearers, spare animals, or audience. NO logos. Background = whatever the ENVIRONMENT line specifies (castle, woods, cave, beach, garden, space, sea, ship, mountain, zoo, farm, circus, city, train, lake, snow, desert, museum, island, etc.) without extra faced characters. NO signs with lettering, carved runes, or flyers. ";

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

  const falLegacyFrameClause =
    readerArtLayoutKey === "facing"
      ? "FRAME / SCALE: full-bleed edge-to-edge; **pulled-back camera** — cast **~28–40% of frame height** typically, **setting prominent**, not zoomed portrait; modest inset — full heads, feet, hands, wings inside canvas; **centre-weighted composition** (~45–55% horizontal), not squeezed to one edge; do not squash everyone along the bottom edge. "
      : "FRAME / SCALE: full-bleed edge-to-edge; **pulled-back camera** — cast **~28–40% of frame height** typically, **setting prominent**, not zoomed portrait; modest inset — full heads, feet, hands, wings inside canvas; bias off centre gutter; do not squash everyone along the bottom edge. ";

  const falReduxLayoutHint =
    readerArtLayoutKey === "facing"
      ? "Standalone picture page — story text is on the facing page in the app; **centre the cast** (~45–55% horizontal), balanced composition. "
      : "";

  try {
    const briefs: { index: number; brief: string; verse: string }[] = [];
    for (const i of oddPagesWithIllustrationBriefs(story.pages)) {
      const p = story.pages[i];
      if (!p) continue;
      briefs.push({
        index: i,
        brief: String(p.illustrationBrief ?? "").trim(),
        verse: String(story.pages[i - 1]?.text ?? "").trim(),
      });
    }

    const staggerMs = 450;
    const urls: string[] = [];

    if (briefs.length === 0) {
      throw new Error("no_illustration_briefs");
    }

    const spread1Prompt = composeDallePrompt({
      preamble: stylePreamble,
      envTheme,
      sceneBrief: OPENING_SCENE_IMAGE_CONSTRAINTS + briefs[0].brief,
      castBible,
      firstPanelLock: "",
      heroFirstName: childName,
      mandatoryCastLine: artStyleSpec.composeMandatoryCast,
    });

    /** When set (default): one T2I “cast lineup”, then all 6 spreads = Fal image→image (Redux) from that anchor — strongest consistency. */
    const useCastAnchor =
      !useGptImage && useFalRedux && Deno.env.get("STORYBOOK_FAL_CAST_ANCHOR") !== "0";

    const photoRefHairLock =
      portraitAppearance.trim().length > 0
        ? "Reference photos were supplied: for every HUMAN in LOCKED CAST, match written **Gender girl/boy**, hair colour, hair LENGTH, and arrangement — never turn a written **girl** with long blonde into a boy with short brown hair because of her name. **If every line is long blonde, both children are long blonde** — no brunette co-star for contrast. "
        : "";

    const anchorPreamble =
      "A completely textless illustration. NO letters, words, typography, labels, speech bubbles, signs with text, book pages with writing, loose papers, scrolls, glyph noise, watermarks, or fake paragraph texture anywhere. Plain smooth background regions only — no pseudo-text. " +
      (noBuddyBook
        ? "CAST LINEUP / MODEL SHEET for a kids picture book: every character line in LOCKED CAST below (human hero and any named human co-stars or game people ONLY — no creature buddy in the lineup). Together in ONE frame, calm neutral expressions and friendly standing poses for identity reference only — story illustrations later will change faces and poses per scene. "
        : "CAST LINEUP / MODEL SHEET for a kids picture book: every character line in LOCKED CAST below (hero, buddy, and any named human co-stars or game people) — no one else, no third mascot or crowd, no duplicate unicorns. Together in ONE frame, calm neutral expressions and friendly standing poses for identity reference only — story illustrations later will change faces and poses per scene. ") +
      photoRefHairLock +
      "full bodies on a plain soft background that still fills the canvas edge-to-edge — modest inset so hair, feet, wings, and tails do not touch the border; figures roughly ~50–68% of frame height so each design reads clearly with a bit more breathing room around the lineup, " +
      artStyleSpec.anchorMaterialClause +
      ". " +
      "Edge-to-edge, wholesome for toddlers. ";

    const anchorPrompt = (
      anchorPreamble + envTheme + "LOCKED CAST (draw exactly):\n" + castBible
    ).slice(0, DALLE3_PROMPT_MAX);

    let panelLock = "";

    if (useGptImage) {
      const gptHasPortraitRefs =
        refPack.heroUrls.length > 0 ||
        Object.keys(refPack.customByFriendId).length > 0;
      // STRICT MODE — when STORYBOOK_IMAGE_MODE=gptimage is set, this is the
      // ONLY pipeline we want to run. No silent fallback to Fal or DALL-E.
      // If anything fails, we throw with a clear, actionable error so the
      // caller knows GPT Image specifically failed (rather than getting an
      // imageless 200 or a mixed-style book).
      let anchorOut: { url: string; bytes: Uint8Array };
      try {
        anchorOut = await gptImageGenerate(
          apiKey,
          anchorPrompt,
          pictureBookQuality,
          0,
          gptHasPortraitRefs,
        );
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
        // Stay under Supabase/Cloudflare wall-clock (~150s).
        // Cost-aware defaults: tier from `pictureBookQuality` + env overrides for size/quality/input_fidelity.
        // Tier-1 OpenAI image RPM is 5 — chunk 4 edits, brief wait, then 2 edits. Raise wait or
        // shrink chunk size if you see 429s; raise OpenAI tier or lower wait if 546.
        const chunkSize = (() => {
          const raw = Number(Deno.env.get("STORYBOOK_GPTIMAGE_CHUNK_SIZE"));
          return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 4;
        })();
        const interChunkWaitMs = (() => {
          const raw = Number(Deno.env.get("STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS"));
          return Number.isFinite(raw) && raw >= 0 ? raw : 12000;
        })();
        const adaptiveChunkWait =
          Deno.env.get("STORYBOOK_GPTIMAGE_CHUNK_WAIT_ADAPTIVE") !== "0";

        // SHOT PLAN — keeps each of the 6 spreads at a different camera
        // distance so the book reads as a journey, not 6 portraits. Notes are
        // intentionally generic — no example props (no "treasure", no
        // "glowing flower"), because mentioning those words even in negation
        // primes gpt-image-1 to render them.
        const shotPlanDuplex = [
          {
            label: "WIDE ESTABLISHING SHOT",
            note:
              "Wide establishing shot — camera well back. Full-bleed environment — sky, architecture, terrain, and foreground paint to every edge; **setting is the star as much as the cast**. Full bodies head to toe: the whole cast together roughly **~32–42% of frame height** (not a hero poster crop), fully inside the frame with generous breathing room — silhouettes never touch or clip the border. Bias the group slightly left or right of vertical centre so the book gutter does not slice a face.",
          },
          {
            label: "MID SHOT",
            note:
              "Medium-wide shot — **not** a tight knees-up portrait: show **waist-up or full-body at a comfortable distance** so walls, cave, or sky stay prominent. Cast roughly **~34–45% of frame height** together. Full-bleed setting behind and around them; entire heads (hair included) and hands inside the frame with modest inset. Bias cast off the exact centre fold. If the verse implies jumping, bouncing, trampoline, soaring, or flying, override: wide full-body (same inset as spread 1).",
          },
          {
            label: "OVER-THE-SHOULDER / DISCOVERY ANGLE",
            note:
              "Three-quarter or over-the-shoulder angle — **camera still pulled back** so the discovery and the **environment** both read. Full-bleed world. Foreground character fully inside canvas (no cropped ears or elbows at edges). Cast **~32–44% of frame height**; setting fills surrounding space to the edges. Avoid centre-spine through main faces.",
          },
          {
            label: "FOCAL MOMENT — MEDIUM FRAMING (NOT FACE FILL)",
            note:
              "**Medium** framing on the verse's focal action — **not** an extreme facial close-up: prefer **mid-thigh up, waist-up, or wider** so cave, room, or landscape stays visible. Cast **≤~40% of frame height**; background and atmosphere run edge-to-edge. Every face, hand, and prop that matters fully inside the frame with modest inset. If jumping, bouncing, or airborne, override to wide full-body — no tight crop on leaping bodies.",
          },
          {
            label: "WIDE JOURNEY SHOT — DIFFERENT PART OF THE SETTING",
            note:
              "A second wide shot in a DIFFERENT corner of the same setting. Full-bleed world — **environment dominates**. Cast smaller on the canvas (**~20–32% of frame height**), full figures readable, never cropped; gutter-safe placement.",
          },
          {
            label: "WARM FINALE — MEDIUM (NOT TIGHT PORTRAIT)",
            note:
              "Finale warmth — **medium three-quarter or waist-up**, not stacked tight face fill: show celebratory **background** (same setting) clearly. Cast **~35–45% of frame height**; entire heads with hair and ears inside frame with modest inset. If the verse still describes jumping, bouncing, or flying, use wide full-body instead.",
          },
        ];

        const shotPlanFacing = [
          {
            label: "WIDE ESTABLISHING SHOT",
            note:
              "Wide establishing shot — camera well back. Full-bleed environment — sky, architecture, terrain, and foreground paint to every edge; **setting is the star as much as the cast**. Full bodies head to toe: the whole cast together roughly **~32–42% of frame height** (not a hero poster crop), fully inside the frame with generous breathing room — silhouettes never touch or clip the border. **Centre-weighted composition:** the cast's visual mass near **~45–55% horizontal** — balanced for a standalone page (story text is on the facing page).",
          },
          {
            label: "MID SHOT",
            note:
              "Medium-wide shot — **not** a tight knees-up portrait: show **waist-up or full-body at a comfortable distance** so walls, cave, or sky stay prominent. Cast roughly **~34–45% of frame height** together. Full-bleed setting behind and around them; entire heads (hair included) and hands inside the frame with modest inset. **Balanced framing** — near the horizontal middle (~45–55%), not parked on one edge. If the verse implies jumping, bouncing, trampoline, soaring, or flying, override: wide full-body (same inset as spread 1).",
          },
          {
            label: "OVER-THE-SHOULDER / DISCOVERY ANGLE",
            note:
              "Three-quarter or over-the-shoulder angle — **camera still pulled back** so the discovery and the **environment** both read. Full-bleed world. Foreground character fully inside canvas (no cropped ears or elbows at edges). Cast **~32–44% of frame height**; setting fills surrounding space to the edges. Keep important faces **off the extreme left/right** edges with modest inset.",
          },
          {
            label: "FOCAL MOMENT — MEDIUM FRAMING (NOT FACE FILL)",
            note:
              "**Medium** framing on the verse's focal action — **not** an extreme facial close-up: prefer **mid-thigh up, waist-up, or wider** so cave, room, or landscape stays visible. Cast **≤~40% of frame height**; background and atmosphere run edge-to-edge. Every face, hand, and prop that matters fully inside the frame with modest inset — **centre the moment** in the frame (~45–55% horizontal). If jumping, bouncing, or airborne, override to wide full-body — no tight crop on leaping bodies.",
          },
          {
            label: "WIDE JOURNEY SHOT — DIFFERENT PART OF THE SETTING",
            note:
              "A second wide shot in a DIFFERENT corner of the same setting. Full-bleed world — **environment dominates**. Cast smaller on the canvas (**~20–32% of frame height**), full figures readable, never cropped; **balanced centre-friendly placement**.",
          },
          {
            label: "WARM FINALE — MEDIUM (NOT TIGHT PORTRAIT)",
            note:
              "Finale warmth — **medium three-quarter or waist-up**, not stacked tight face fill: show celebratory **background** (same setting) clearly. Cast **~35–45% of frame height**; entire heads with hair and ears inside frame with modest inset; **group near horizontal centre**. If the verse still describes jumping, bouncing, or flying, use wide full-body instead.",
          },
        ];

        const shotPlan = readerArtLayoutKey === "facing" ? shotPlanFacing : shotPlanDuplex;

        // Clean, POSITIVE-ONLY edit prompt builder. We attach the anchor PNG as
        // the character reference; everything else describes ONLY what to
        // paint, not what to avoid. Negative lists were paradoxically nudging
        // gpt-image-1 toward stock props (treasure chests, glowing flowers,
        // mossy logs) — every "no treasure" line counts as a treasure mention
        // to the model. So we list nothing to avoid: just the positive scene.
        // Pull the LLM's "VISIBLE: ..." line out of the brief if present, plus
        // detect missing-buddy cues in the verse ("where is", "can't find",
        // "nowhere to be seen", "hidden", etc.) so the buddy is excluded from
        // the picture when the story says they're not around.
        const parseVisibleCast = (
          brief: string,
          verse: string,
        ): { visibleLine: string | null; buddyMissing: boolean } => {
          const m = brief.match(/^\s*VISIBLE\s*:\s*([^\n]+?)(?:\s*[—\-]\s*DESCRIPTION\s*:|$)/i);
          const visibleLine = m ? m[1].trim() : null;
          const buddyMissing = buddyCreatureHiddenInVerse(verse);
          return { visibleLine, buddyMissing };
        };

        const buildEditPrompt = (b: typeof briefs[number], idx: number) => {
          const shot = shotPlan[idx] ?? shotPlan[shotPlan.length - 1];
          const verseLines = b.verse.trim().slice(0, 500);
          const { visibleLine, buddyMissing } = parseVisibleCast(b.brief, verseLines);
          const pairedMomentLead =
            storyTextModeKey === "rhyme"
              ? "from the rhyming verse on the paired text page"
              : "from the story text on the paired text page";

          const blocks: string[] = [];

          // 1. Style + reference instruction
          blocks.push(
            artStyleSpec.gptEditStyleOpener +
              (readerArtLayoutKey === "facing"
                ? "SAFE SCALE: Full-bleed scene — environment fills the entire canvas edge-to-edge. **Pull the camera back:** the cast together should use only **~28–42% of frame height** (typically) so **walls, sky, cave, or landscape read clearly** — not a zoomed portrait. Full heads, hair, feet, hands, wings, and tails inside the frame with modest inset — never edge-clipped. Never crop standing or jumping children at the neck, waist, or knees — if the moment is full-body, show full-body. **Single-page layout:** centre the cast — keep the focal group's visual mass near **~45–55% horizontal** (balanced; **not** squeezed to one side as if saving space for overlaid text). Do not leave empty margins around the whole painting. "
                : "SAFE SCALE: Full-bleed scene — environment fills the entire canvas edge-to-edge. **Pull the camera back:** the cast together should use only **~28–42% of frame height** (typically) so **walls, sky, cave, or landscape read clearly** — not a zoomed portrait. Full heads, hair, feet, hands, wings, and tails inside the frame with modest inset — never edge-clipped. Never crop standing or jumping children at the neck, waist, or knees — if the moment is full-body, show full-body. **Book gutter:** bias the group slightly left or right of frame centre — never put a main child's face on the vertical midline. Do not leave empty margins around the whole painting. ") +
              "The attached reference image shows the cast on a neutral backdrop — use it ONLY to lock each character's identity (face shapes, hair, outfit colours, species, body shape). Ignore the lineup's neutral expressions and poses for this sheet — on THIS spread, show expressions and poses that fit the story moment. Repaint the world fresh.",
          );

          // 2. Setting (the override-resolved placeDesc + plotHint)
          blocks.push(
            `SETTING — paint exactly this world on every spread:\n${placeDesc}.${plotHint ? `\nThe child's story idea: ${plotHint}` : ""}`,
          );

          // 3. Shot framing
          blocks.push(`SHOT TYPE (spread ${idx + 1} of ${shotPlan.length}): ${shot.label}. ${shot.note}`);

          if (idx === 0) {
            blocks.push(
              `OPENING / SHELF THUMB (${childName}'s FIRST picture): Compose like a paperback cover — **≤3 cleanly framed figures preferred** (${childName} + buddy ± one named friend from the verse) unless THIS verse deliberately groups more—and then **still ≤4** with wide camera. Absolutely **NO partial people** cropping in from far left/right edges.`,
            );
          }

          const verseBriefForCam = `${b.verse}\n${b.brief}`;
          if (needsFullBodyWideFraming(verseBriefForCam)) {
            blocks.push(
              "CAMERA OVERRIDE — VERTICAL OR AIRBORNE ACTION: This spread's verse or scene implies jumping, bouncing, trampoline, soaring, flying, or similar. Treat any mid-shot or close-up plan as superseded: use a WIDE or FULL shot with the camera pulled back. Every named person and the buddy (if listed in WHO IS IN THIS PICTURE) must show a complete head (hair, hat, unicorn horn if any), full torso, arms, legs, feet, and the buddy's tail, mane, and hooves — all fully inside the frame with clear margin from every edge. Never crop at the neck, waist, or knees. The cast together may use only **~30–42% of frame height** with plenty of visible sky or ceiling above.",
            );
          }

          // 4. The exact moment, from the verse
          if (verseLines) {
            blocks.push(
              `THIS SPREAD'S MOMENT (${pairedMomentLead} — show every action literally):\n"""\n${verseLines}\n"""`,
            );
            blocks.push(
              "VISUAL MATCHING: Paint the SAME setting, time of day, and activity as the verse — if it says bouncy castle under the sky, show padded inflatable bounce-house walls and open sky; if it says kitchen or courtyard, show that. Do not substitute a different scene (e.g. woods and bicycle) unless the verse names those.",
            );
          }

          blocks.push(
            "EXPRESSION & POSE: Keep each character's IDENTITY locked to the reference — same face shape, hair COLOUR, hair LENGTH, hair STYLE, skin tone, outfit colours, species, proportions. Change pose, body language, and facial expression to match THIS SPREAD'S MOMENT (e.g. surprised brows, belly laugh, anxious side-glance, sleepy smile, focused pout). Do not give every spread the same neutral grin unless the verse is neutral; buddy creatures should emote in species-appropriate ways too.",
          );

          // 5. Visible cast for THIS spread (the part that fixes the
          //    "dinosaur is hidden but appears in the picture" bug).
          //    Priority: explicit VISIBLE line from the LLM, else infer from
          //    the verse's missing-buddy cues, else fall back to "the cast".
          if (visibleLine) {
            blocks.push(
              `WHO IS IN THIS PICTURE (the only characters to draw — match the reference for each):\n${visibleLine}` +
                (buddyMissing
                  ? `\n(The verse says the buddy is hiding / out of sight / missing for this beat — keep them OUT of frame as VISIBLE says.)`
                  : ""),
            );
          } else if (buddyMissing) {
            const humanList =
              storyHumanNames.length > 0 ? storyHumanNames.join(", ") : childName;
            blocks.push(
              `WHO IS IN THIS PICTURE: ${humanList}. The imaginary buddy creature is not in this scene — the verse is about searching or not finding them — do not draw the buddy creature in this frame.`,
            );
          }

          // 6. Scene note (free description from the LLM)
          blocks.push(`SCENE NOTE: ${b.brief}`);

          // 7. Cast bible (compact; longer when photo refs so Hair: lines survive truncation)
          const castCap = portraitAppearance.trim().length > 0 ? 1400 : 800;
          const castSnippet = castBible.trim().slice(0, castCap);
          blocks.push(
            `CAST IDENTITIES (only draw the ones listed in WHO IS IN THIS PICTURE — match the reference for each):\n${castSnippet}`,
          );

          if (portraitAppearance.trim().length > 0) {
            blocks.push(
              "HAIR FIDELITY: Each named child must keep the exact hair colour, length, and arrangement from the reference lineup and lines above (e.g. long blonde stays long blonde; pigtails stay pigtails). **Never** give one girl dark brown ponytail and the other long blonde for contrast — if both lines say blonde, both are blonde. Do not revert to a default boy crew cut or generic brown bob unless the cast explicitly describes that. **GENDER:** If the cast bible says a named child is a girl (or reference had Gender: girl), illustrate a girl — do not draw them as a boy with short brown hair.",
            );
          }

          // 8. Final constraint
          blocks.push(
            "Paint ONLY what the verse, WHO IS IN THIS PICTURE, and SCENE NOTE describe — no extra props, no extra characters, no background crowd, no signs or writing in the picture.",
          );

          return blocks.join("\n\n");
        };

        let lastChunkMs = 0;
        for (
          let chunkStart = 0;
          chunkStart < briefs.length;
          chunkStart += chunkSize
        ) {
          if (chunkStart > 0 && interChunkWaitMs > 0) {
            // Full cooldown protects OpenAI tier-1 RPM. But if the previous chunk
            // already took ~one minute wall-clock, the rolling limit window has
            // usually advanced — sleeping the full amount often pushes past the
            // ~150s edge gateway (HTTP 546) for no benefit.
            const prevMs = lastChunkMs;
            let sleepMs = interChunkWaitMs;
            if (adaptiveChunkWait) {
              if (prevMs >= 55000) {
                sleepMs = Math.min(sleepMs, 2000);
              } else if (prevMs >= 35000) {
                sleepMs = Math.min(
                  sleepMs,
                  Math.max(2000, Math.floor(interChunkWaitMs / 2)),
                );
              }
            }
            console.info(
              `[clever-service] gpt-image chunk cooldown ${sleepMs}ms (prev chunk ${prevMs}ms; budget ${interChunkWaitMs}ms)`,
            );
            await delay(sleepMs);
          }
          const slice = briefs.slice(chunkStart, chunkStart + chunkSize);
          const chunkT0 = Date.now();
          const chunkResults = await Promise.all(
            slice.map(async (b, localIdx) => {
              const idx = chunkStart + localIdx;
              const editPrompt = buildEditPrompt(b, idx);
              try {
                const out = await gptImageEdit(
                  apiKey,
                  editPrompt,
                  [refBytes],
                  pictureBookQuality,
                  0,
                  gptHasPortraitRefs,
                );
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
          lastChunkMs = Date.now() - chunkT0;
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

        let refUrl: string = anchorUrl as string;
        for (let idx = 0; idx < briefs.length; idx++) {
          if (idx > 0) await delay(staggerMs);
          const b = briefs[idx];
          const composed = composeDallePrompt({
            preamble: stylePreamble,
            envTheme,
            sceneBrief: (idx === 0 ? OPENING_SCENE_IMAGE_CONSTRAINTS : "") + b.brief,
            castBible,
            firstPanelLock: panelLock,
            heroFirstName: childName,
            mandatoryCastLine: artStyleSpec.composeMandatoryCast,
          });
          const verseBeat = spreadTextForPicturePage(b.index, story.pages).slice(0, 360);
          const wideBeatClause = needsFullBodyWideFraming(`${verseBeat} ${b.brief}`)
            ? "WIDE FULL-BODY CAM: verse implies jumping/bouncing/airborne — pull camera back; every named figure complete head-to-toe, buddy tail/horn/mane in frame; no neck or waist crops. "
            : "";
          try {
            const falPrompt =
              falReduxLayoutHint +
              wideBeatClause +
              "PICTURE BOOK SPREAD — illustrate THIS story beat literally. " +
              "VERSE (must match mood, action, props): " +
              verseBeat +
              ". " +
              "SCENE: change layout, camera, and environment completely vs the reference. Show the action and setting in the brief — rockets, trampolines, castles, planets, etc. must appear visibly if the story calls for them. " +
              "Keep character IDENTITY only from the reference (face shape, species, hair/outfit colours, sizes)—vary expressions and poses to match the verse's emotion; do not recycle the same neutral smile on every spread. Do not recreate neutral lineup poses or plain backdrop. " +
              artStyleSpec.falReduxStyleTag +
              composed.slice(0, FAL_REDUX_PROMPT_MAX - 420);
            const u = await falFluxReduxImageUrl(
              falKey,
              falReduxModel,
              refUrl,
              falPrompt,
              falStrength,
            );
            urls[idx] = u;
            falReduxSpreadCount++;
            refUrl = u;
          } catch (e) {
            console.warn("[clever-service] Fal Redux (anchor chain) failed for spread", idx, e);
            throwFalImage(`Fal image-to-image failed for spread ${idx + 1} of 6`, e);
          }
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
                mandatoryCastLine: artStyleSpec.composeMandatoryCast,
              });
              if (useFalRedux) {
                if (!referenceStillUrl) {
                  throwFalImage("Fal image-to-image missing reference from first picture", new Error("no_reference_url"));
                }
                try {
                  const wideBeatClause = needsFullBodyWideFraming(`${b.verse} ${b.brief}`)
                    ? "WIDE FULL-BODY CAM: jumping/bouncing/airborne — pull camera back; head-to-toe for every named figure; buddy tail/horn in frame. "
                    : "";
                  const falPrompt =
                    falReduxLayoutHint +
                    wideBeatClause +
                    "New story moment — change poses, action, and background to match the scene. " +
                    "Keep the same hero face shape, hair, outfit colours, and the same buddy and named creatures as the reference — only beings named in SCENE ACTION, no new animals or people. Shift facial expressions and body language to match the story beat — not the same static expression every time. " +
                    artStyleSpec.falLegacyStyleTag +
                    falLegacyFrameClause +
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

    /** Final picture page (page 12): opt-in reuse of spread 1 art (set STORYBOOK_REUSE_FIRST_ON_LAST=1 for a bookend repeat). Default = generate a distinct final spread. */
    const reuseFirstIllustrationOnLast = Deno.env.get("STORYBOOK_REUSE_FIRST_ON_LAST") === "1";
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
  const readerFont = pickStoryReaderFont();

  return jsonResponse({
    title: story.title,
    bookColor: bookColorOut,
    readerFont,
    sceneImageUrl,
    pages: pagesOut,
    meta: {
      childName,
      characterKey,
      placeKey,
      placeOverridden,
      plotNamedHumans,
      storyHumanNames,
      plotHintLen: plotHint.length,
      familyNames,
      familyPeopleIds: familyPeople.map((p) => p.id),
      portraitVisionAttempted,
      portraitAppearanceUsed: portraitAppearance.length > 0,
      imageCount: pagesOut.filter((p) => p.imageUrl).length,
      spreads: Math.floor(pagesOut.length / 2),
      characterLockCompiled: compiledLock.length > 0,
      firstPanelVisualLock: firstPanelVisualLockUsed,
      falTextModel: useFalRedux ? falTextModel : null,
      falTextSpreads: falTextSpreadCount,
      falCastAnchorUsed,
      falReduxModel: useFalRedux ? falReduxModel : null,
      falReduxSpreads: falReduxSpreadCount,
      imageMode: useGptImage ? "gptimage" : "fal",
      gptImageModel: useGptImage
        ? (Deno.env.get("STORYBOOK_GPTIMAGE_MODEL") ?? "").trim() || "gpt-image-1.5"
        : null,
      gptImageSpreads: useGptImage ? gptImageSpreadCount : 0,
      pictureBookQuality,
      illustrationStyle: illustrationStyleKey,
      reuseFirstIllustrationOnLast:
        Deno.env.get("STORYBOOK_REUSE_FIRST_ON_LAST") === "1",
    },
  });
});
   