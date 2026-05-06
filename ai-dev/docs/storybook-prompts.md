# Storybook generation — OpenAI prompts

This document maps every OpenAI call made during the storybook creation flow,
in the order they fire. All calls live in
[`supabase/functions/clever-service/index.ts`](../../supabase/functions/clever-service/index.ts).

Each section gives:

- **Where**: file + function + line number of the `fetch` site
- **Endpoint** + **default model**
- **Purpose** — what the call produces and where the output is used
- **System prompt** (when present)
- **User prompt** (template — `${…}` are runtime substitutions)

Runtime payloads for every call are also logged at runtime via
`logOpenAiPrompt(label, payload)` and visible in
**Supabase Dashboard → Edge Functions → `clever-service` → Logs**
(filter `openai-prompt`). Set `STORYBOOK_LOG_PROMPTS=0` to silence.

---

## Pipeline order

For a typical book the calls fire in this order:

1. **Vision — describe portraits** (multi-portrait or hero refs) — once if any
   reference photos were uploaded.
2. **Vision — same/two hero check** — only if two photos are tagged for the hero.
3. **Chat — story JSON** (`openaiChatJsonOnce`) — the 12-page story.
4. **Chat — compile character lock** (`compileCharacterLock`) — LOCKED CAST block.
5. **Image — anchor / cast lineup** (`gptImageGenerate`) — spread 1 model sheet.
6. *(Skipped on GPT Image path)* **Vision — visualLockFromFirstImage** — only used by
   the legacy DALL·E / Fal paths; superseded when the anchor PNG is reused as a
   reference for every spread.
7. **Image — six spread edits** (`gptImageEdit`, ×6) — the picture pages.
8. **TTS** (`/v1/audio/speech`) — only when the user taps "read aloud" later;
   not part of generation.

---

## 1. `compileCharacterLock` — chat (cast lock)

**Endpoint**: `POST /v1/chat/completions`
**Default model**: `gpt-4o-mini` (override via `STORYBOOK_COMPILE_LOCK_MODEL`)
**Site**: [`supabase/functions/clever-service/index.ts:798`](../../supabase/functions/clever-service/index.ts#L798)
**Log label**: `compileCharacterLock`

**Purpose**: Distil the storywriter's draft `characterDesign` into a tight
**LOCKED CAST** block (`HERO:`, `BUDDY:`, one line per other named human).
This block is later embedded in every image prompt to lock identity.

### System prompt

Two variants depending on `noBuddyBook` (i.e. the reader chose "no imaginary
buddy"). The trailing `photoTruth` clause appears only when reference photos
were uploaded.

**Default (with imaginary buddy):**

> You are an art director for a children's book. Output only the LOCKED CAST
> block. Be dense and consistent. Include EVERY named person and recurring
> creature from the storywriter draft who actually appears in the book (HERO,
> BUDDY, named human siblings/friends from the plot, and any named game friends
> from the draft). If the user lists human co-stars in the plot (e.g. Isaac),
> they MUST appear as their own NAME: lines — never merge a human child into
> BUDDY and never call the dragon/dinosaur by a human sibling's name. Never
> output a NAME: LOCK line for a PET or animal mascot named in plot parenthesis
> beside puppy/dog/cat — pets are drawn as animals only, not as extra human
> silhouette lines. If the draft truly has only the child and one imaginary
> friend, output exactly HERO: and BUDDY: — never invent unnamed forest
> animals. If the draft names extra friends (e.g. Tilly), add one line each —
> never add MONKEY:, BEAR:, or random extras not in the draft. OUTFIT COLOUR
> LOCK: Each human NAME: line must name ONE fixed solid shirt/top colour plus
> simple cut (e.g. **Isaac:** … **orange** short-sleeve crew tee; **Sofia:** …
> **white** unicorn tee summary); each child keeps exactly one hue — never two
> different shirt colours for the same NAME line.

**`noBuddyBook` variant** strips creature mentions and forbids `BUDDY:` lines.

**`photoTruth` suffix** (added when refs uploaded):

> CRITICAL: Uploaded reference summaries (and any HERO PHOTO FACTS line)
> OVERRIDE the storywriter draft for matching humans — if the draft's
> hair/skin/eyes contradict a reference line for the hero, treat the draft as
> WRONG.

### User prompt template

```
Hero first name: ${childName}
Main buddy type (${buddyKey}): ${buddyDesc}
Setting: ${placeDesc}
Plot: ${plotHint || "cozy adventure"}
${petPlotClause}                     # only when plot mentions a pet
Human co-stars named in the plot (REAL CHILDREN ONLY — NOT the imaginary buddy or pet names): ${co}
Who appears in pictures (beats): ${briefsSummary}

REFERENCE PHOTOS (vision summary — HERO and any human photo line MUST match hair, eyes, skin, age; do NOT invent a different-looking child):
${photoBlock}

>>> HERO PHOTO FACTS (AUTHORITATIVE for ${childName} — copy Gender/Hair/Eyes/Skin/Clothes into HERO: even if draft below contradicts):
${heroPin}

>>> NAMED CHILD PHOTO FACTS (AUTHORITATIVE for each co-star — copy Gender/Hair/Eyes/Skin/Clothes into the matching NAME: line, …):
${coStarPortraitPins}

Storywriter draft (may contradict photos — IGNORE wrong hair/skin for the hero when HERO PHOTO FACTS exist):
${draftDesign || "(none)"}

Rewrite into LOCKED CAST only — plain text, no JSON.
Use labeled lines: HERO:, BUDDY:, then one line per other named recurring HUMAN child …
… (gender / hair / outfit lock rules)
${compileLockArtWords}
Max 2100 characters. No scenery. No actions.
```

`temperature: 0.15`, `max_tokens: 1200`.

---

## 2. `visualLockFromFirstImage` — vision (legacy paths only)

**Endpoint**: `POST /v1/chat/completions`
**Model**: `gpt-4o-mini` (hard-coded)
**Site**: [`supabase/functions/clever-service/index.ts:837`](../../supabase/functions/clever-service/index.ts#L837)
**Log label**: `visualLockFromFirstImage`

**Purpose**: Convert the rendered anchor image into a short text "panel lock"
that subsequent spread prompts can embed. **Skipped on the GPT Image path** —
the anchor PNG is attached as a reference image for every edit instead.

### User prompt (single multimodal message)

> This is cast lineup / spread 1 art for a kids' picture book. Write a single
> compact paragraph LOCK: repeatable character looks for later spreads. Include
> every principal figure in the **foreground** of this art (the human hero
> child first, the one main buddy creature, plus any other named child who is
> clearly a main co-star in the lineup). For each: face shape, hair, eyes,
> skin, outfit colours, species/size for creatures. If crowd or blurry extras
> appear, IGNORE them — do not lock them. No background, no story. Max 900
> characters.

Plus one `image_url` block (the anchor PNG URL).

`temperature: 0.1`, `max_tokens: 500`.

---

## 3. `openaiVisionDescribePortraits` — vision (multi-portrait)

**Endpoint**: `POST /v1/chat/completions`
**Default model**: `storybookPortraitVisionModel(bookTier)` — `gpt-4o-mini` on
standard, `gpt-4o` on high; overridable via `STORYBOOK_VISION_MODEL`.
**Site**: [`supabase/functions/clever-service/index.ts:1177`](../../supabase/functions/clever-service/index.ts#L1177)
**Log label**: `openaiVisionDescribePortraits`

**Purpose**: Turn uploaded portraits into one-line appearance summaries
(name → gender, hair, eyes, skin, age, clothes) used by both the story prompt
and the cast lock.

### User prompt template

> These ${count} images are reference photos for named characters in a kids'
> picture book, in order: ${ordered}.
> Reply with exactly ${count} lines. Each line MUST use this exact template
> (fill in from the photo only; keep the labels):
> NAME: Gender (photo only — ignore whether the NAME sounds male or female):
> girl | boy; Hair: [colour — be specific, e.g. platinum blonde / light brown],
> [length — e.g. very short / chin / shoulder / mid-back / long past
> shoulders], [style — e.g. high pigtails with pink bands, centre part, full
> fringe]; Eyes: [colour]; Skin: [tone]; Age: [e.g. about 5]; Clothes:
> [silhouette + colours — if the shirt has a big print, say "graphic tee"
> without copying the art].
> Be literal: if the photo shows a girl, you MUST write Gender: girl even if
> the name is often used for boys. If hair is long in the photo, say long; if
> blonde, say blonde. Do not transcribe logos or tiny text. max 48 words per
> line; no art-style words.
> Use each NAME exactly as spelled above. No other text.

Followed by N `image_url` blocks (one per portrait).
`temperature: 0.05`, `max_tokens: 550`.

---

## 4. `openaiVisionSummarizeHeroFromRefs` — vision (hero refs)

**Endpoint**: `POST /v1/chat/completions`
**Default model**: same tier rule as above.
**Site**: [`supabase/functions/clever-service/index.ts:1248`](../../supabase/functions/clever-service/index.ts#L1248)
**Log label**: `openaiVisionSummarizeHeroFromRefs`

**Purpose**: One or more photos of the same child → a single hero appearance
line (avoids duplicate hero rows).

### User prompt — single image

> This image is a reference photo of ${name} (${role === "hero" ? "story hero"
> : "story character"}).
> Reply with exactly one line using this template ONLY:
> ${name}: Gender (photo only — ignore whether the name "${name}" is usually a
> boy or girl name): girl | boy; Hair: [colour — specific], [length], [style
> including fringe/pigtails/accessories]; Eyes: [colour]; Skin: [tone]; Age:
> [approx]; Clothes: [silhouette + colours, or graphic tee/jeans].
> If the photo shows a young girl (long hair, dress, typical presentation),
> you MUST write Gender: girl even for names like Remy, Alex, or Sam. Say
> **straight / wavy / curly** and **blonde / brown / black / red / auburn**
> exactly as visible — if forehead bangs/fringe cover the eyebrows, write
> "with blunt fringe (bangs)". If hair is in a ponytail or bun but roots are
> blonde, say blonde anyway — never downgrade to generic brown bob. State real
> hair length and colour. Do not copy logos. max 52 words; no art-style words.
> Use the NAME exactly as spelled above. No other text.

### User prompt — multiple images (same child)

> These ${count} images are all of the SAME person: ${rolePhrase} (different
> angles or moments).
> Reply with exactly ONE line using this template ONLY:
> ${name}: Gender (photo only, ignore name stereotypes): girl | boy; Hair:
> [colour — specific], [length], [style across photos — e.g. pigtails with
> pink scrunchies]; Eyes: [colour]; Skin: [tone]; Age: [approx]; Clothes:
> [common vibe or two outfits].
> Combine: hair must reflect the LONGEST / clearest view — do not shorten
> length. Keep exact colour words from the photos. Ignore logos and tiny text.
> max 60 words; no art-style words.
> Use the NAME exactly as spelled above. No other text.

`temperature: 0.05`, `max_tokens: 600`.

---

## 5. `openaiVisionTwoHeroPhotosSameChild` — vision (same/two check)

**Endpoint**: `POST /v1/chat/completions`
**Model**: `gpt-4o-mini` (hard-coded; `detail: "low"` on each image to
minimise token cost).
**Site**: [`supabase/functions/clever-service/index.ts:1297`](../../supabase/functions/clever-service/index.ts#L1297)
**Log label**: `openaiVisionTwoHeroPhotosSameChild`

**Purpose**: Decide whether two hero-tagged uploads are the same child or two
different children. Defaults to `SAME` on failure (preserves legacy merge).

### User prompt

> Two photos for a picture book (attached). Are they the SAME individual child
> (same person, different day/outfit/angle), or TWO DIFFERENT children?
> Reply with exactly one word: SAME or TWO

`temperature: 0`, `max_tokens: 16`.

---

## 6. `openaiChatJsonOnce` — chat (story JSON)

**Endpoint**: `POST /v1/chat/completions`
**Default model**: `storybookStoryChatModel(pictureBookQuality)` —
`gpt-4o-mini` on standard, `gpt-4o` on high; override
`STORYBOOK_STORY_MODEL`.
**Site**: [`supabase/functions/clever-service/index.ts:2008`](../../supabase/functions/clever-service/index.ts#L2008)
**Log label**: `openaiChatJsonOnce(story)`

**Purpose**: Generate the 12-page story JSON
(`{ title, characterDesign, bookColor, pages: [12] }`).

### System prompt (canonical, ~350 lines)

The full text is too long to inline here without rotting on every edit.
Read the source: [`supabase/functions/clever-service/index.ts:3585`](../../supabase/functions/clever-service/index.ts#L3585).

Top-level rules it imposes (paraphrased — see source for the binding
language):

- Warm, gentle, kid-safe — no scary, romance, weapons, frightening villains.
- Story length, tone, art-style brief (`artStyleSpec.storyBrief`).
- "No buddy" mode rewrites: humans only, no creature companion.
- Page layout — **exactly 12 slots** = six spreads. Odd = text-first,
  even = picture (`illustrationBrief`). Climax around spreads 4–5; **last
  full prose close on page 11**; page 12 is picture-only.
- Names vs gender — appearance-from-photos is ground truth.
- Hero name appears on every page where the hero acts. Never substitute.
- Imaginary buddy vs human co-stars — never merge identities.
- Pet names — animals, never human cast lines.
- Cast vs text — every illustration may only contain people named on the
  paired text page.
- VISIBLE order, on-stage completeness, hidden-character handling.
- Two-paragraph rule for prose mode pages.
- Character design: gender, age, height, body, skin, eyes, hair, hair texture,
  buddy anatomy, single locked outfit. **Outfit colour lock**.
- Output JSON — no markdown, no `"` characters inside string values, no inch
  marks, etc.
- Strict illustration brief format:
  `VISIBLE: <names> — DESCRIPTION: <one or two sentences>`
- Environment detail rules — at least 2 environment nouns + 1 named prop per
  brief, drawn from the actual SETTING / PLOT.
- Composition / scale — pulled-back camera, modest inset, 30–45% frame
  height typical, gutter handling for spreads.
- Opening spread budget — hero (+ buddy) on the cover thumbnail, no extra
  classmates unless page 1 names them.
- Plot fidelity — read the plot literally; no invented climax.
- Home / TV-room / kitchen — no mystery third child.

### User prompt template

```
Child name: ${childName}
${noBuddyBook
  ? "Imaginary buddy: none — human-only book …"
  : `Main friend character (imaginary buddy): ${characterDesc}`}
Setting to feature: ${placeDesc}
People from the child's games to include by name (friends/family — use them warmly when listed; each may have a portrait note above): ${familyNames or "(none)"}
Other human children named ONLY in the plot idea below (they are REAL KIDS in the story — NOT the imaginary buddy; …): ${plotOnlyHumans or "(none)"}${portraitBlockForText}
Plot idea from the child (CRITICAL: make this the core focus of the story and pictures): ${plotHint or "(none — invent a cosy little adventure that fits the setting)"}
Page 1 and page 2 must OPEN this plot: …
${famAndPlot empty ? picture-cast-rule-default : picture-cast-rule-with-cast}
Every odd text page: ${oddPageTextFormatHint}
Return JSON shape: { "title": string, "characterDesign": string, "bookColor": "pink" | "blue" | "green" | "purple" | "orange" | "teal" | "red" | "yellow" | "lilac" | "mint" | "coral" | "navy", "pages": [ { "text": string, "illustrationBrief": string | null }, ... 12 items ] }
```

`temperature: 0.35`, `max_tokens: 10000`,
`response_format: { type: "json_object" }`.

---

## 7. `openaiImageGenerations` — image (legacy DALL·E only)

**Endpoint**: `POST /v1/images/generations`
**Site**: [`supabase/functions/clever-service/index.ts:2102`](../../supabase/functions/clever-service/index.ts#L2102)
**Log label**: `openaiImageGenerations`

Legacy DALL·E path — only fires when `STORYBOOK_IMAGE_MODE` is **not**
`gptimage`. Payload is built by the caller (`payload.prompt` is the spread
prompt). No system prompt — text-to-image only.

---

## 8. `gptImageGenerate` — image (anchor / cast lineup)

**Endpoint**: `POST /v1/images/generations`
**Default model**: `gpt-image-2` (override via `STORYBOOK_GPTIMAGE_MODEL`).
**Site**: [`supabase/functions/clever-service/index.ts:3031`](../../supabase/functions/clever-service/index.ts#L3031)
**Log label**: `gptImageGenerate(anchor)`

**Purpose**: Render the cast lineup / model sheet that anchors every spread
edit.

### Prompt assembly (`anchorPrompt`, [index.ts:3944](../../supabase/functions/clever-service/index.ts#L3944))

```
${anchorPreamble}${envTheme}LOCKED CAST (draw exactly):
${castBible}
```

Trimmed to `DALLE3_PROMPT_MAX`.

`anchorPreamble` (truncated below — see source):

> A completely textless illustration. NO letters, words, typography, labels,
> speech bubbles, dialogue balloons, thought bubbles, comic captions, signs
> with text, book pages with writing, loose papers, scrolls, glyph noise,
> watermarks, or fake paragraph texture anywhere. Plain smooth background
> regions only — no pseudo-text. All read-aloud words are in the app — this
> sheet is **visual identity only** (no painted dialogue).
> CAST LINEUP / MODEL SHEET for a kids picture book: every character line in
> LOCKED CAST below (hero, buddy, and any named human co-stars or game people)
> — no one else, no third mascot or crowd, no duplicate unicorns. Together in
> ONE frame, calm neutral expressions and friendly standing poses for identity
> reference only — story illustrations later will change faces and poses per
> scene.
> ${photoRefHairLock}${heroPhotoPinLead}
> full bodies on a plain soft background that still fills the canvas
> edge-to-edge — modest inset so hair, feet, wings, and tails do not touch the
> border; figures roughly ~50–68% of frame height …
> ${artStyleSpec.anchorMaterialClause}.
> Edge-to-edge, wholesome for toddlers.

A `noBuddyBook` variant excludes the buddy / mascot wording.

Other parameters (resolved per-tier): `n: 1`, `size`, `quality`, `moderation`,
`output_format: "png"`, `stream: false`. See `gptImageDefaultModel`,
`gptImageSizeForRequest`, `gptImageQualityForRequest`,
`gptImageModerationParam`.

---

## 9. `gptImageEdit` — image (six spread edits)

**Endpoint**: `POST /v1/images/edits` (multipart form)
**Default model**: same as anchor (`gpt-image-2`).
**Site**: [`supabase/functions/clever-service/index.ts:3146`](../../supabase/functions/clever-service/index.ts#L3146)
**Log label**: `gptImageEdit(spread)`

**Purpose**: Repaint each of the six spread illustrations with the anchor PNG
(plus optional uploaded portraits) attached as reference images.

### Prompt assembly — `buildEditPrompt(b, idx)`

Source: [`supabase/functions/clever-service/index.ts:4192`](../../supabase/functions/clever-service/index.ts#L4192).
The prompt is the joined `blocks` array (separator: `\n\n`):

1. **Style + reference identity** —
   `artStyleSpec.gptEditStyleOpener` + safe-scale framing + a `refIdentityLine`
   variant chosen by how many reference images are attached.
2. **SETTING** —
   `SETTING — paint exactly this world on every spread:\n${placeDesc}.\nThe child's story idea: ${plotHint}`.
3. **(optional) Domestic-interior cast guard** — when the verse is clearly a
   home scene, prevents adding mystery extras.
4. **SHOT TYPE** — one of the six entries from `shotPlan` (wide / medium-wide
   / low-angle / over-the-shoulder / etc.).
5. **(idx === 0) Opening / shelf cover budget** — picks the cover-thumbnail
   guidance based on `noBuddyBook` and which children are named on page 1;
   adds **HERO REFERENCE** line when a hero portrait pin exists.
6. **(optional) CAMERA OVERRIDE — VERTICAL OR AIRBORNE ACTION** — added when
   the verse implies jumping/flying so the painter doesn't crop legs.
7. **THIS SPREAD'S MOMENT** — the exact verse, fenced in `"""`. With a
   **TWO-PARAGRAPH VERSE** rider when the verse contains `\n\n`, and a
   **PARK READABILITY** rider when the verse mentions park/playground/etc.
8. **VISUAL MATCHING** + **BEAT FIDELITY** — keep setting, time of day, props,
   and beat outcome (rain stopped, dry, etc.) consistent with the verse.
9. **EXPRESSION & POSE** lock — same identity, change pose/expression to fit
   this beat.
10. **OUTFIT LOCK** — never substitute a different solid tee for variety.
11. **WHO IS IN THIS PICTURE** — explicit `VISIBLE: …` line parsed from the
    illustration brief, plus a buddy-missing rider when the verse hides the
    buddy.
12. **FRAMING — NAMED KIDS & PETS** — anyone in WHO IS IN THIS PICTURE must
    read as a main figure.
13. **SCENE NOTE** — the LLM-generated `illustrationBrief` (free description).
14. **CAST IDENTITIES** — compact `castBible` snippet (cap 800 chars,
    1400 with portrait refs). `WHO IS IN THIS PICTURE` controls who is drawn.
15. **(if portrait refs)** **HAIR FIDELITY** + **GENDER** rider.
16. **PRONOUN LOCK** — match he/him/she/her in the verse.
17. Final guard: paint only what verse + WHO + SCENE NOTE describe; no
    extra props, no edge-cropped strangers, no on-canvas writing.

The result is trimmed to `GPT_IMAGE_PROMPT_MAX` (4000 chars) inside
`gptImageEdit`.

Multipart form fields (built by `buildForm`, [index.ts:3122](../../supabase/functions/clever-service/index.ts#L3122)):
`model`, `prompt`, `n=1`, `size`, `quality` (omitted on retry), `output_format=png`,
`stream=false`, `moderation`, `input_fidelity` (only on `gpt-image-1.x` /
`1.5`; not sent on Image 2), and one or more `image[]` parts.

---

## 10. TTS — `/v1/audio/speech` (read-aloud, post-generation)

**Endpoint**: `POST /v1/audio/speech`
**Default model**: `gpt-4o-mini-tts` (override `OPENAI_TTS_MODEL`).
**Default voice**: `ballad` (override `OPENAI_TTS_VOICE` or `?ttsVoice=`).
**Site**: [`supabase/functions/clever-service/index.ts:4836`](../../supabase/functions/clever-service/index.ts#L4836)

Not part of generation — fires when the child taps "read aloud". The only
prompt-like field is `instructions` (only honoured by `gpt-4o-mini-tts`):

**Default**:

> Speak in a warm, upbeat, clear tone suitable for reading a children's story
> aloud.

Override: `OPENAI_TTS_INSTRUCTIONS` env var.

---

## Where the runtime values come from

| Substitution | Source |
|---|---|
| `${childName}`, `${plotHint}`, etc. | Wizard form in [`games/storybook.js`](../../games/storybook.js) → POST body. |
| `${placeDesc}` / `${characterDesc}` | `PLACES` / `CHARACTERS` lookup in `clever-service/index.ts` (preset keys), or the user's `placeCustom` / `buddyCustom`. |
| `${familyNames}` | The "people from your games" list in `js/score-config.js`. |
| `${portraitAppearance}` (vision summary) | Output of vision calls #3/#4 above, then injected into chat #6 and lock #1. |
| `${castBible}` | Output of lock #1. |
| `${artStyleSpec}` | Picked by the user's art-style chip — see `STORY_ART_STYLES` table in source. |
| `${shotPlan}` | Per-tier ordered camera plan; same source file. |

---

## Updating this doc

When a prompt changes, update the matching section above **and** the line
numbers (or replace them with link-by-name once helpers stabilise). The
runtime payload logged via `logOpenAiPrompt` is the source of truth — diff
against a recent log line to verify.
