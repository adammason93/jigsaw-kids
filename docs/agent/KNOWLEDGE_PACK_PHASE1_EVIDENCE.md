# Knowledge Pack — Phase 1 evidence

Founder review only. Draft. Not merged. Not deployed. Pull requests #13 and #14 are not merged.

Locked path: teacher request → teacherIntent → Knowledge Grounding → Knowledge Pack → learningMap → Teaching Beat Layer → adventure.

Phase 1 adds the pack boundary in `js/lesson-brain.js` and the grounding model call in `supabase/functions/learn-generate/index.ts` and `js/learn-generate-boot.js`. The pack holds claims, mechanisms, concepts, vocabulary, misconceptions, confidence, provenance, and uncertainty. It does not own stages, beats, questions, interactions, narrative, or pupil wording. Those fields are stripped if a model returns them.

## How this was run

`OPENAI_API_KEY` is not set. No production call was made. No web search, retrieval, curated store, or cache was built.

What ran is the production-equivalent path: scripted teacher intents and scripted raw packs through the real admission, selection, learning-map binding, plan gates, and (for sharks) the real `learn-generate` boot. The model name in the logs is the configured default, `gpt-4o-mini`. The payloads are fixtures, not a live completion.

Machine dump of the five topics: `docs/agent/knowledge-pack-phase1/matrix.json`.

Year 4 sharks through the boot on this branch: `docs/agent/knowledge-pack-phase1/shark-e2e.json`.

The same shark request through a detached checkout that also contains unmerged #13 (beat substance, `55ad0dc`) and #14 (developed-strand gate, `cc4cc44`): `docs/agent/knowledge-pack-phase1/shark-e2e-with-pr13-pr14.json`. That checkout was not pushed and was not merged to main.

Every admitted claim below has `factuallyVerified: false`. Status `usable` means "enough claims to select from". It does not mean verified.

## Same pack, three years

One shark pack. Selection changes the claims, not the wording of a claim.

| Year | depthMode | claims selected |
| --- | --- | --- |
| Year 2 | concrete | 4 concrete only: fish/fins/gills/tail, gills on the head, strong tail, pointed body |
| Year 4 | mechanism | those 4, plus gills take oxygen, the tail pushes water back, the pointed shape lets water slide past |
| Year 6 | system | the Year 4 set, plus fins, tail and gills working as one system for hunting in open water |

Held out of Year 6 as well: the optional low-confidence food-web claim. Year 2 does not receive mechanism claims whose age fit starts at Year 3. That is a different lesson, not a longer sentence.

## 1. Year 3 dinosaurs

Request: "Year 3 science. Teach the class about dinosaurs."

teacherIntent: pupils understand that fossils show what dinosaurs were like. Evidence: a pupil says what a fossil can show, including what it ate. 15 minutes. Science.

Raw pack: 9 model claims, status usable. One low-confidence claim says some dinosaurs could breathe fire.

Admitted pack `kp` from the claim-id hash. Status **usable**. Provenance of every claim: `model` / `model-originated/unverified`. `verificationOverrides: 1` (a raw `factuallyVerified: true` was forced false).

| claimId | depth | confidence | text |
| --- | --- | --- | --- |
| c304157 | concrete | high | Dinosaurs were animals that lived a very long time ago. |
| cwbnalp | concrete | high | A fossil is a trace of a living thing kept in rock. |
| c6y8s2r | mechanism | high | Sharp fossil teeth cut meat, so that the fossil shows a meat-eating dinosaur. |
| c1ruxdu8 | concrete | high | A dinosaur egg is a round fossil with a shell. |
| chgfz4n | mechanism | high | The shell kept the baby inside, because a thin shell would have broken. |
| cuh45ro | concrete | medium | Some dinosaur bones are hollow. |
| c1aqrfa4 | mechanism | medium | Hollow bones made the body lighter, so that a large dinosaur could still move. |
| cljd3le | system | medium | Fossils, tooth shape and the rock layer together show how a dinosaur lived. |
| c1a7mx0t | concrete | low | Some dinosaurs could breathe fire when they were angry. |

Selected for Year 3, depthMode **mechanism**: c304157, cwbnalp, c6y8s2r, c1ruxdu8, chgfz4n, cuh45ro. (The log order is the selector order: concrete first.)

Held back: cljd3le system, outside age fit. c1a7mx0t low confidence.

learningMap (plan admitted on this branch):

- k1 c304157 foundation — dinosaurs lived a long time ago
- k2 cwbnalp definition — a fossil is a trace kept in rock
- k3 c6y8s2r mechanism — sharp teeth cut meat, so the fossil shows a meat-eater
- k4 c1ruxdu8 feature — a dinosaur egg is a round fossil with a shell
- k5 chgfz4n mechanism — the shell kept the baby inside
- k6 cuh45ro feature — some bones are hollow

Not taught: hollow-bones mechanism, dropped by the existing restatement check (`restates` the teeth relationship). Fire claim, rejected as invented because it was not eligible. System claim stays in the pack.

Teach names the fossil and the egg, and explains the teeth and the shell. Apply practises k3 / c6y8s2r. Check retrieves c6y8s2r, chgfz4n, and cuh45ro.

Year/depth: Year 3 mechanism. System claim not selected. Plan ok on this branch.

## 2. Year 4 shark adaptations

Request: "Year 4 science. Teach how sharks' adaptations help them live and hunt in the sea."

teacherIntent: pupils explain how a shark's body helps it live and hunt. Evidence: a pupil explains how gills, the tail, or the body shape helps. 15 minutes.

Raw pack: 9 claims, all model, all unverified. Misconception stored, not taught: "Sharks are mammals."

Admitted pack id **kp_10odpbz**. Status **usable**. `verificationOverrides: 0`. Provenance summary states that no claim is factually verified.

| claimId | depth | confidence | text |
| --- | --- | --- | --- |
| c1uwmm8v | concrete | high | A shark is a fish with fins, gills and a tail. |
| c66lxbg | concrete | high | A shark has gills on the side of its head. |
| cmqr5m5 | mechanism | high | Gills take oxygen from the water so that a shark can breathe. |
| c1mnmv6n | concrete | high | A shark has a strong tail. |
| c6uqz6n | mechanism | high | The tail pushes water backwards so that the shark moves forward. |
| c1226kz2 | concrete | high | A shark has a pointed body shape. |
| c1mop7pp | mechanism | high | The pointed shape lets water slide past the body so that the shark slows down less. |
| c66eto5 | system | medium | Fins, tail and gills work together as one system that lets a shark hunt in open water. |
| cibzkg1 | system | low | Sharks keep fish numbers in balance, so the ocean stays healthy. |

Selected: the four concrete claims and the three mechanisms. Held: both system claims, outside age fit for Year 4.

learningMap:

- k1 c1uwmm8v foundation
- k2 c66lxbg feature — gills on the head
- k3 cmqr5m5 mechanism — gills take oxygen
- k4 c1mnmv6n feature — strong tail
- k5 c6uqz6n mechanism — tail pushes water back
- k6 c1226kz2 feature — pointed body
- k7 c1mop7pp mechanism — shape lets water slide past

Rejected map sentence: "Sharks keep the ocean healthy by being important predators." Reason: invented fact outside the knowledge pack. That sentence is not claim cibzkg1, and cibzkg1 was not eligible anyway.

Year/depth: Year 4, **mechanism**. Three developed how/why strands (gills, tail, shape), plus a foundation. The system claim is a Year 6 selection, not a longer Year 4 sentence.

Trace: teach names k1, k2, k4, k6 and explains k3, k5, k7. Apply is bound to k3 / cmqr5m5. Check retrieves cmqr5m5, c6uqz6n, c1mop7pp.

### Pupil-facing lesson (boot)

Stages: TEACHER_INTENT → KNOWLEDGE_PACK → PLAN_REQUEST → STORY_REQUEST → LEARNING_MAP → TEACHING_PLAN → CONTENT_REQUEST → CONTENT_VALIDATE → APPLY_ALIGNMENT → CHECK_ALIGNMENT → COMPLETE.

On this branch the teaching plan records `strandsRequired: 1`, `strandsDeveloped: 3`, depth 7 against a floor of 6, `met: true`.

With #13 and #14 in the detached checkout the same lesson still completes. The #14 gate records `strandsRequired: 3`, `strandsDeveloped: 3`, `met: true`. Apply alignment: deterministic pass, relation-covered. Check alignment: semantic sufficient, check-pass. Beat substance from #13 accepted the pupil sentences.

What the pupil hears:

- Look at the shark and say what you can see.
- Say what you think the gills are for.
- A shark is a fish with fins, gills and a tail.
- You can see this when a shark is a fish with fins, gills and a tail.
- A shark has gills on the side of its head.
- Gills take oxygen from the water so that a shark can breathe.
- A shark has a strong tail.
- The tail pushes water backwards so that the shark moves forward.
- A shark has a pointed body shape.
- The pointed shape lets water slide past the body so that the shark slows down less.
- Apply beat: "Choose the body part that helps: gills take oxygen from the water so that a shark can breathe." Bound to cmqr5m5.
- Check: which sentence explains the gills mechanism; which sentence explains the tail mechanism; which sentence explains the body-shape mechanism. The wrong choice in the fixture is "The shark is a mammal because it lives in the sea."
- Resolution: "So, gills take oxygen from the water so that a shark can breathe."
- Recap states the fish sentence and the tail sentence.

The activity instruction stored on the apply slot in the fixture is a tail choice ("a tail that pushes water back, or a tail that stays still"). The beat the pipeline bound is the gills claim. Both were accepted. That split is in the scripted content, not in a live model. The frozen apply judge was not changed.

This lesson is educationally thicker than a name list: three mechanisms are taught and each is retrieved. The ocean-health overclaim never enters the lesson. That thickness is in the scripted pack plus the real gates. A live `gpt-4o-mini` pack was not observed.

## 3. Year 5 Henry VIII and Rome

Request: "Year 5 history. Teach how Henry VIII's break with Rome changed the church in England."

teacherIntent: pupils explain how the break changed the church. 20 minutes. History.

Admitted pack status **qualified**. Reason: contested claims stay in the pack and out of the lesson. Every claim `model` / unverified. `verificationOverrides: 1` (the fake quotation arrived marked verified and was forced false). depthMode **system**.

| claimId | depth | notes | text |
| --- | --- | --- | --- |
| c1booj6h | concrete | high | Henry VIII was king of England from 1509 to 1547. |
| c1feagon | concrete | high | In 1534 the Act of Supremacy said Henry, not the Pope, was head of the Church in England. |
| c17zw4mb | mechanism | high | Henry wanted a male heir, so he asked Rome to end his marriage to Catherine of Aragon. |
| c12scby3 | mechanism | medium | When Rome refused, Henry's break with Rome let him control the English church. |
| c1usgzhm | concrete | high | Catherine of Aragon was Henry's first wife. |
| c1l4w9sc | concrete | high | A monastery was a religious house that owned land. |
| csqopaw | system | medium | The break closed many monasteries, so that their land and wealth went to the crown and new owners. |
| c41n7q8 | system | contested, held | Historians still disagree about whether Henry cared more about religion or about power. |
| ci1inqu | concrete | low, held; verification overridden | Henry said the exact words 'I am the only church' in 1534. |

Selected: the seven uncontested, non-low claims, including the monastery system claim. Year 5 can take system depth. The contested motive and the fake quotation are not selected.

learningMap on this branch (plan ok): k1 dates, k2 heir so he asked Rome, k3 Rome's refusal let him control the church, k4 Act of Supremacy, k5 monastery definition, k6 closures moved land to the crown, k7 Catherine of Aragon.

Map sentences for the quotation and the contested motive were rejected. The rejection reason recorded is "invented fact outside the knowledge pack" because those claims are ineligible, so the binder does not treat them as a citation. They were not invented by the map relative to the raw pack; they were held back. See issues.

Teach explains the heir, the break, and the monastery closures. Apply uses k3 / c12scby3. Check retrieves the heir, the break, the monastery definition, and the closure claim.

With #14's gate in the detached checkout, this same map does **not** admit. Issue: "The learning map needs developed strands that explain how or why, not only a name." The pack and the claim selection are unchanged. The gate was not weakened and no extra historical fact was added.

## 4. Year 6 Mam Tor

Request: "Year 6 geography. Teach how the geology of Mam Tor caused the landslip."

teacherIntent: pupils explain how the rock and water made the hillside slip. 20 minutes. Geography.

Raw pack: model status **blocked**, niche, block reason "Specific strata, dates and measurements for this hillside are not secure enough to teach without inventing them." Two thin claims: Mam Tor is a hill in the Peak District (medium); the road below has cracked and been closed (low).

Admitted status **blocked**. Selection status **blocked**. Selected claim ids: none. Both claims held with reason "pack blocked". No learning map. No beats. No lesson.

Fail closed. The pipeline returns before plan generation when pack or selection is blocked.

## 5. Year 4 false premise — why sharks are mammals

Request: "Year 4 science. Explain why sharks are mammals."

Uploaded material: "Sharks are fish. They use gills to take oxygen from water."

teacherIntent keeps the teacher's goal text: pupils explain why sharks are mammals. That string is not rewritten. There is no conflict UI.

Raw pack sets `falsePremise: "sharks are mammals"` and marks "Sharks are mammals." `accepted: false`, `teacherRequested: true`, `factuallyVerified: true`.

Admitted status **qualified**. Reason: false premise removed from the claims. `falsePremise` stays on the pack. `verificationOverrides: 3`.

Rejected: "Sharks are mammals." Reason on the pack: "not accepted" (the fixture marked it unaccepted, so the false-premise overlap rule did not have to fire). The overlap rule is covered by `tests/knowledge-pack.test.js`, which expects reason "false premise" when an affirming claim is not pre-rejected.

| claimId | provenance | depth | text |
| --- | --- | --- | --- |
| c1nx7x9s | teacher_material, unverified, factuallyVerified false | concrete | Sharks are fish, not mammals. |
| cmqr5m5 | teacher_material, unverified. Raw label `retrieved` ignored because the sentence overlaps the upload | mechanism | Gills take oxygen from the water so that a shark can breathe. |
| c8o5zvc | model | mechanism | Mammals feed milk to their young and breathe air with lungs. |
| c7srvfk | model | mechanism | A shark does not feed its young on milk, because a shark is a fish. |
| c1fr83t0 | model | mechanism | Sharks have scales rather than hair, so that they are not classed as mammals. |
| c13qh5jy | model | mechanism | Whales and dolphins are mammals, because they breathe air and feed milk. |
| cu2t7yr | model | concrete | A shark's skin is covered in tiny scales called denticles. |
| c1lankyu | model | mechanism | Denticles let water flow smoothly over the skin, so that the shark wastes less effort. |
| c5k98ge | model. Raw label `curriculum_planning` downgraded. Phase 1 has no curriculum source | system | Lungs and gills are different systems for getting oxygen. |

`teacherRequested` and `factuallyVerified` stay separate. The false sentence was what the teacher asked for, and it is not an admitted fact. The correction overlaps the upload, so provenance is `teacher_material`, and it is still unverified. Upload text is not treated as truth.

Selected for Year 4: eight claims. Held: c5k98ge, system, outside age fit.

learningMap on this branch (plan ok): fish not mammals, gills, what mammals do, whales and dolphins, scales rather than hair, denticles, denticles and water flow.

Bound rejections: "Sharks are mammals." — "rejected claim is not a fact" (the false sentence is a word-subset of "Sharks are fish, not mammals" and must not be laundered by that overlap). The milk-feeding sentence — repetition of an earlier point.

With #14 in the detached checkout this map does **not** admit, for the same developed-strand issue as Henry. Not repaired by inventing another fact.

## Trace the founder asked for

For the shark lesson the chain is visible in one place:

1. Origin: model-originated, unverified, pack kp_10odpbz. No claim is marked grounded or verified.
2. Why selected: Year 4 mechanism mode keeps concrete claims and mechanisms. System claims stay in the pack. The ocean-health sentence is not a selected claim.
3. How taught: name beats state the part; explain beats state the how (oxygen, backward push, water sliding past).
4. Where practised and retrieved: apply is bound to the gills mechanism cmqr5m5; check questions retrieve cmqr5m5, c6uqz6n, and c1mop7pp.

Narrative in the story fixture (a rocky bay, a harbour naturalist) is allowed to be invented. The learning-map sentences are not.

## Architectural issues (not redesigned here)

1. **usable is not verified.** Phase 1 can only mark `model` or `teacher_material`. Both notes say unverified. A later phase must not read status `usable` as grounded.

2. **Teacher request and factual status are different fields.** `teacherRequested` is overlap with the request. `factuallyVerified` is forced false. The false-premise lesson keeps the original goal string, so existing depth and relation gates still see "why sharks are mammals". The pack refuses the falsehood. There is no conflict UI, by design. The goal text and the taught claims can disagree until a later phase.

3. **Held-back claims are rejected as if they were invented.** A map sentence that quotes a contested, low-confidence, or wrong-depth claim is logged as "invented fact outside the knowledge pack" because that claim is not eligible to cite. The fire claim, the fake Henry quotation, and the contested motive all took that path. A repair model could treat "invented" as a prompt to write a new fact. It should instead see "held back". Not changed in this phase.

4. **Word-for-word cover is strict.** A point must be covered by the words of an eligible claim. Age paraphrase that adds a fact fails. That is intentional. It will reject some legitimate pupil-language shortenings that introduce a new noun.

5. **Year 2 concrete selection can starve a how/why lesson.** Mechanisms default to age fit from Year 3. Year 2 of this shark pack gets four concrete claims and no mechanism. #14 asks Year 1–2 depth-seeking lessons for developed how/why strands. Those two rules will conflict. #14 was not weakened.

6. **#14's Year 3–6 strand minimum is stricter than this pack's historical and correction maps.** Shark adaptations meets 3 developed strands and completes. Henry and the false-premise map admit on this branch and fail in the #13+#14 checkout with "The learning map needs developed strands that explain how or why, not only a name." Fail closed was kept. No facts were added to scrape through the gate.

7. **The existing depth floor can ask for more points than an honest pack has.** Mam Tor blocks before that floor. A thin but usable pack can still fail the floor. The right failure is to block or qualify, not to invent.

8. **The existing restatement check can drop a second true mechanism.** Hollow bones versus teeth shared a relationship signature, so the hollow-bone mechanism was not taught. The check was not loosened.

9. **A negated claim can hide a falsehood.** "Sharks are mammals" is covered, word for word, by "Sharks are fish, not mammals" unless rejected claims are denied. That deny-list is in place (`rejected claim is not a fact`).

10. **No live model.** Educational richness of a real `gpt-4o-mini` knowledge pack was not observed. The shark lesson above is richer than "sharks have fins" because the fixture contained three mechanisms and the gates taught and checked them.
