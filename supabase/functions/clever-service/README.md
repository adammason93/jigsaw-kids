# clever-service (storybook)

Generates a **12-page** story (six double-page spreads) with OpenAI chat (tiered **`gpt-4o`** / **`gpt-4o-mini`** per **`pictureBookQuality`** and env overrides).

**Illustrations (documented setup):** set **`STORYBOOK_IMAGE_MODE=gptimage`** so every book uses **OpenAI GPT Image** only (**default model `gpt-image-2`** when **`STORYBOOK_GPTIMAGE_MODEL`** is omitted): **one anchor** **`/v1/images/generations`**, then **six spreads** **`/v1/images/edits`** against that anchor PNG (uploaded to Supabase **`storybook_images`**). That path has **no silent fallback** — failures return **`gpt_image_failed`** / **`gpt_image_anchor_failed`**.

Older **non–GPT-Image** pipelines may still exist **in source** for forks; omit **`STORYBOOK_IMAGE_MODE`** only if your deployment deliberately uses another path and you maintain it yourself — this README does not describe third-party illustration APIs.

## Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# Optional — story read-aloud voice (default **ballad** if unset). Full list: alloy, ash, ballad, cedar, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse. Requires **gpt-4o-mini-tts** (default model).
# supabase secrets set OPENAI_TTS_VOICE=ballad
# Optional — faster/cheaper legacy TTS (no ballad/cedar/marin/verse): `tts-1` or `tts-1-hd` (voices outside the 9-voice subset are remapped).
# supabase secrets set OPENAI_TTS_MODEL=tts-1
# Optional — only for gpt-4o-mini-tts; overrides the built-in kid-friendly instruction line
# supabase secrets set OPENAI_TTS_INSTRUCTIONS=Speak in a cheerful storyteller voice.
# Public HTTPS origin where your static site serves files (no trailing slash).
# Used to fetch portrait PNGs (e.g. games/images/character-freya.png) for vision → prompts.
supabase secrets set BOOK_ASSETS_BASE_URL=https://your-site.example
# Optional — model for summarising **uploaded** hero/friend reference photos (default gpt-4o for better hair/colour accuracy; use mini to save cost):
# supabase secrets set STORYBOOK_VISION_MODEL=gpt-4o-mini

# Illustrations — OpenAI GPT Image (recommended)
# Anchor = text-to-image, spreads 2–6 = images/edits with the anchor as reference.
# Requires the public storage bucket created by migration 20260501093000_storybook_images_public_bucket.sql.
supabase secrets set STORYBOOK_IMAGE_MODE=gptimage
# supabase secrets set STORYBOOK_GPTIMAGE_MODEL=gpt-image-2   # omitted default; or gpt-image-1.5 to save vs Image 2, etc.
# **`high`** **`pictureBookQuality`** + default **`gpt-image-2`** → **cost-parity** caps (1024², tighter edit **`quality`** / **`input_fidelity`**) unless you opt out — keeps picture spend nearer legacy ~£0.40–0.60 (**verify** usage):
# supabase secrets set STORYBOOK_GPTIMAGE_LEGACY_BUDGET=0    # **max** print fidelity: 1536×1024 + high/med defaults again
# supabase secrets set STORYBOOK_GPTIMAGE_LEGACY_BUDGET=1    # force parity for **any** image model (e.g. tighten 1.5 too)
# supabase secrets set STORYBOOK_GPTIMAGE_MODERATION=low        # default low (omit or set low); use auto for OpenAI default moderation
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=high    # optional: high on anchor AND all six spread edits (priciest; restores old “max detail” tier)
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=medium  # optional: one tier for anchor + all edits (between economy and high)
# supabase secrets set STORYBOOK_GPTIMAGE_QUALITY=low       # optional: cheapest — low on anchor + edits
# # If you omit STORYBOOK_GPTIMAGE_QUALITY: **standard** tier uses **medium** anchor + **low** edits + **low** `input_fidelity` by default — **including when reference photos are uploaded** (economy; uploads + vision summaries still steer likeness). Opt into pricier likeness with **`STORYBOOK_REF_PHOTO_IMAGE_BOOST=1`** (or `true` / `on` / `yes`): then with uploads you get **high** anchor + **medium** edits + **high** `input_fidelity` on edits. **High** `pictureBookQuality` is unchanged (`high` / `medium`). `STORYBOOK_GPTIMAGE_QUALITY` still overrides everything when set.
# supabase secrets set STORYBOOK_REF_PHOTO_IMAGE_BOOST=1   # optional: standard + ref photos — bump image quality/fidelity (costs more; better face/hair lock)
# supabase secrets set STORYBOOK_GPTIMAGE_SIZE=1536x1024    # optional: default 1024x1024 (cheapest); 1536x1024 = wider spread, costs more
# supabase secrets set STORYBOOK_GPTIMAGE_INPUT_FIDELITY=low    # edits: force low | high; if OMITTED: see cost-parity for **high** + `gpt-image-2`, else **high** when **`high`** tier OR (ref photos + boost on)
# supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_SIZE=4         # how many spread edits to run in parallel per chunk (default 6 — one wave when possible)
# supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS=12000  # pause between chunks (default 0ms within one wave; raise if 429 rate limits)
# Adaptive cooldown (default on): if the previous batch was slow, the function sleeps less so the ~150s edge limit is less likely to hit. To always use the full wait: supabase secrets set STORYBOOK_GPTIMAGE_CHUNK_WAIT_ADAPTIVE=0

# Optional — reuse first illustration on last spread (any image mode)
# supabase secrets set STORYBOOK_REUSE_FIRST_ON_LAST=1
```

## Deploy

```bash
supabase functions deploy clever-service --no-verify-jwt
```

(`verify_jwt` is off in `config.toml` for `[functions.clever-service]` so the static kids’ site can call with the **anon** key; use **Dashboard rate limits** and billing alerts.)

### Read-aloud voice (OpenAI TTS)

The storybook uses **`GET …/clever-service?ttsText=…`** (optional **`&ttsVoice=…`**) for MP3 playback.

**Auto voice from the book (browser):** When `STORYBOOK_TTS_VOICE` in `games/storybook.js` is empty, the client picks **`ttsVoice=ballad`** for boy-leaning first names and **`ttsVoice=sage`** for girl-leaning (and common unisex) names. It reads the first “title-ish” token from **generated book title → custom title field → hero name** (skips words like “The”, “My”). Names not in the local lists omit `ttsVoice`, so the **server default** applies. Override by setting **`STORYBOOK_TTS_VOICE`** to any allowed voice id.

**Default:** model **`gpt-4o-mini-tts`**, voice **`ballad`** (warm male-presenting storyteller). Override with secret **`OPENAI_TTS_VOICE`** or query **`ttsVoice=`**.

**All built-in voices** (for **`gpt-4o-mini-tts`** — try them on [OpenAI.fm](https://openai.fm/)):

| Voice | Notes (informal) |
|-------|------------------|
| `ballad` | **Default** — warm, male-presenting, story-friendly |
| `verse` | Dynamic |
| `marin` | Bright |
| `cedar` | Deep, warm |
| `coral` | Lively |
| `sage` | Calm |
| `fable` | Expressive |
| `nova` | Youthful |
| `shimmer` | Gentle |
| `alloy` | Neutral |
| `ash` | Soft |
| `echo` | Male |
| `onyx` | Deep male |

**Legacy models:** set **`OPENAI_TTS_MODEL=tts-1`** or **`tts-1-hd`** for lower latency/cost. Only these voices work then: `alloy`, `ash`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`. If you ask for `ballad` while on legacy, the function uses **`echo`** instead.

**Instructions** (optional, **`gpt-4o-mini-tts` only):** secret **`OPENAI_TTS_INSTRUCTIONS`** overrides the default “read to children” line.

Allowlist: **`OPENAI_TTS_VOICE_IDS`** in `supabase/functions/clever-service/index.ts`.

The browser calls `…/functions/v1/clever-service` — set **`storybookEdgeSlug`** in `js/score-config.js` if you ever use a different slug. **`character`** / **`place`** normally pick preset keys listed in **`CHARACTERS`** and **`PLACES`** in `supabase/functions/clever-service/index.ts` (matching `games/storybook.js`). Keys are normalised with **`normalizeWizardKey`** (trim, lower case, spaces collapsed to underscores). If the browser has **newer** chip keys than your deployed function, you get **`error: "invalid_choices"`** with **`detail`** like **`unknown_place:fairground`** until you redeploy **`clever-service`**. For **any buddy or place** the picker also supports **`custom_buddy`** with **`buddyCustom`** and **`custom_place`** with **`placeCustom`** (trimmed prose, minimum a few letters after sanitise, maximum **200** characters each — same caps as `STORYBOOK_CUSTOM_CHOICE_MAX` on the Edge function). **`plotHint`** is trimmed to **800** characters server-side (same cap as the storybook textarea).

**`pictureBookQuality`** (optional, GPT Image mode only): **`"standard"`** (**default**) — **play / screen** economy: **`gpt-4o-mini`** story + LOCKED CAST + **`gpt-4o-mini`** portrait vision unless **`STORYBOOK_STORY_MODEL`**, **`STORYBOOK_COMPILE_LOCK_MODEL`**, or **`STORYBOOK_VISION_MODEL`** override; **1024×1024** spreads when size secret unset; **`STORYBOOK_REF_PHOTO_IMAGE_BOOST`** is **off** unless you opt in (**`1`** / **`true`**). **`"high"`** — **grown-ups / keepsakes**: **`gpt-4o`** story + cast lock + **`gpt-4o`** portrait vision by default. With **`gpt-image-2`** (default model), **`high`** defaults to **cost-parity**: **1024×1024** + lighter edit **`quality`** / **`input_fidelity`** when **`STORYBOOK_GPTIMAGE_LEGACY_BUDGET`** is unset (same goal as legacy ~£0.40–0.60 pictures — verify usage). Use **`STORYBOOK_GPTIMAGE_LEGACY_BUDGET=0`** for full **high** fidelity (**1536×1024**, high/med GPT Image tiers). Ref-photo GPT Image bump is **on** for **`high`** unless **`STORYBOOK_REF_PHOTO_IMAGE_BOOST=0`**. **`STORYBOOK_GPTIMAGE_SIZE`** / **`STORYBOOK_GPTIMAGE_QUALITY`** still override both tiers.

## Cost (indicative)

Rough order **for GPT Image books:** **one** GPT Image generation **+ six** GPT Image edits **plus** story / LOCKED CAST / optional portrait vision. Check **[OpenAI pricing](https://openai.com/pricing)** for current rates.

**GPT Image:** **standard** is often **~14p-order** for **AI pictures only** (anchor + spreads); **high** often **~40–60p** for pictures — **verify** billing. Turn **`STORYBOOK_REF_PHOTO_IMAGE_BOOST=1`** on standard + uploads for stronger likeness at higher image cost.

**Micro savings:** the **two-hero-photo** SAME/TWO vision check uses **`gpt-4o-mini`** with **`detail: low`**. Portrait **hair** vision is **`gpt-4o-mini`** on **standard** tier and **`gpt-4o`** on **high** unless **`STORYBOOK_VISION_MODEL`** is set.

The JSON **`meta`** includes **`imageMode`** and, when GPT Image ran, **`gptImageModel`** and **`gptImageSpreads`**.

Portrait images are summarised via vision text (not pasted into GPT Image multipart as raw uploads for the spreads — see code for portrait reference handling).

**Two photos both tagged for the hero:** the function runs a quick vision check (same child vs two different children). If they look like **two** kids, it produces two appearance lines (`Co_star_ref` for the second) so the illustrated co-star is not a random generic. First photo = hero, second = other named child when split. If it decides **same** child but your story has two human characters, prompts still nudge the co-star’s hair toward the reference family look.

Some illustration URLs load through **`clever-service?url=`** when the browser needs a **same-origin proxy** — see `games/storybook.js` (**`storyImageNeedsEdgeProxy`**).

## Troubleshooting

- **GPT Image (`STORYBOOK_IMAGE_MODE=gptimage`)** — **strict**: the function ONLY uses the configured GPT Image model (**default `gpt-image-2`** if `STORYBOOK_GPTIMAGE_MODEL` is unset). If the anchor or any spread edit fails, the function returns **`gpt_image_failed`** (or **`gpt_image_anchor_failed`**) with the OpenAI **`detail`** and **`imageMode: "gptimage"`**. **`size`**, **`quality`**, **`input_fidelity`** follow tier + **`STORYBOOK_GPTIMAGE_*`** secrets — see Secrets block. **`HTTP 400` fallbacks** may retry minimal payloads inside the GPT Image pipeline only — not a provider switch.

- **`images_failed` / DALL·E HTTP 400**: only applies if your deployment runs the **legacy OpenAI Images (DALL·E)** path (**no** GPT Image mode). Otherwise ignore if you strictly use GPT Image.

- **Log line `gpt-image chunk cooldown …`**: normal — pacing for rate limits. **Adaptive cooldown** trims sleep when batches were slow; disable with **`STORYBOOK_GPTIMAGE_CHUNK_WAIT_ADAPTIVE=0`** if debugging **429** behaviour.

- **HTTP 546 / 504**: Edge **~150s** budget. GPT Image is **anchor + six edits**. Reduce parallel batch size (**`STORYBOOK_GPTIMAGE_CHUNK_SIZE`**), add waits (**`STORYBOOK_GPTIMAGE_CHUNK_WAIT_MS`**), upgrade OpenAI throughput, or extend Edge limit (**paid Supabase**) if needed.

