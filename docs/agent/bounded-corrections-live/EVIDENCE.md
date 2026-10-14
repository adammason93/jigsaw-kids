# Bounded corrections — planner strands and local admission

Draft only. Not merged. Not deployed. Pull requests #13, #14, and #15 stay separate drafts. This branch merges them only so the checks exercise the real combination. Nothing here is Batch B, and nothing here retrieves a source.

## Correction 1 — planner and repair match the strand contract

`strandsOf`, `isDeveloped`, `thinStrands`, and `strandsRequired` are unchanged. A singleton function is still not a developed strand. Seeking-depth validation is not bypassed. There is no validator fallback that collapses several foundations into one.

The live failure mode was the planner labelling each adaptation as its own foundation and hanging a function off that foundation. Every foundation role collapses into the shared `f` group, so each function becomes an undeveloped singleton.

`planBrief`, `scopeGuide`, and `planRepairBrief` now tell the model:

- At most one shared foundation, and only when that sentence adds teaching value. It is optional. Do not invent one to satisfy the format.
- An adaptation's named feature is a feature or concept strand head, not a foundation.
- The function or mechanism `dependsOn` that feature, not the foundation.
- A developed strand contains both the named idea and its linked how or why.
- Repair relabels foundations that are really features, keeps the underlying knowledge and the true dependencies, and does not invent a foundation.

A feature→mechanism pair is one developed strand. Year 4 still requires three. One pair does not pass the gate.

## Correction 2 — place-bound admission, outside model confidence

`normaliseKnowledgePack` decides this after the model's confidence, `status`, and `niche` are recorded. Those fields do not clear the rule.

A named place is not enough. A claim is place-bound when a proper-name place in that sentence is bound to specific geology or rock type, a physical site event (landslip, flood, eruption, collapse), a year together with a physical or causal word, or a cause together with a physical noun such as soil, slope, rain, or rock. "London is a city" and "Mam Tor is a hill" are not place-bound. "The geology of Mam Tor includes layers of shale" is.

The request requires that binding when it names the place and asks how, why, what caused it, or how it formed, and the wording is geological or physical. Generic sentences about rain and slopes do not satisfy "how the geology of this place caused the landslip."

- **Usable.** The rule finds no unsupported place-bound claim the lesson depends on.
- **Qualified.** The goal can be taught from generic claims, or from a teacher-supplied place sentence. Unsupported place-bound claims stay on the pack and are held out of `knowledgeSelection` with reason `unsupported local claim`. They are not selected as core and the learning map cannot cite them.
- **Blocked / NEEDS_SOURCE.** The goal needs the place-bound explanation and no teacher-supplied claim covers that place. `status` is `blocked`, `statusReason` starts with `NEEDS_SOURCE`, and selection selects nothing. Generation stops at the existing pack block. Model `usable` and `niche: false` do not override this.

Supplied, support, and verification stay separate. Overlap with uploaded teacher material can set provenance `teacher_material` and `support: "supplied"`. `factuallyVerified` stays false. A retrieved or curriculum label is still downgraded when the words are not in the upload. Supplied text is not verification, and it does not make a neighbouring model-only local claim selectable.

### How dependency is recognised

The request and the claims are read together. Places are taken from capitalised names (a multi-word name, a name after at/in/of/about, or a possessive), including a name that appears on a claim and also in the request. The request "needs" the local explanation only when that name sits next to an explanatory ask and a physical or geological target. Otherwise a spicy local claim is held and the rest of the pack can still be selected.

### Detection limitations

This is a lexical check, not a gazetteer and not retrieval.

- A place written only in lowercase, and not repeated as a proper noun on a claim, can be missed.
- A place that is only a sentence-initial capital, and not after a preposition, can be missed.
- Words in the same sentence are treated as a binding. A cause word and a physical noun next to a place can hold a sentence that is not really about that place's geology.
- Ordinary history is not this rule. A date about a person or an institution, without geology or a physical site event, is not place-bound. A false historical date can still be admitted as unverified model knowledge, which is the existing Phase 1 limit.
- Generic geology with no place name ("shale can become slippery when wet") is not held. If the goal is the named place, the pack is still blocked. If the goal is generic, that sentence can be selected.
- The check cannot tell a true local fact from a false one. It refuses to teach a model-originated local binding as an established fact. It does not look anything up.

## Focused checks

Deterministic. Not a live model.

`node tests/bounded-corrections.test.js` passed, and the surrounding pack, strand, gate, depth, generation-path, and beat-substance files passed with it.

1. A feature→mechanism pair counts as one developed strand. Year 4 still requires three, so that lone pair does not admit.
2. Functions that depend only on a foundation, including several points each labelled foundation, develop zero strands.
3. An unsupported Mam Tor sentence inside a rivers lesson is held. Pack status is qualified. Selection does not include it. The learning map rejects it.
4. "Explain how the geology of Mam Tor caused the landslip" with high-confidence model claims is blocked, `NEEDS_SOURCE`, and `normalisePlan` does not admit a lesson.
5. That block happens when the model said `status: usable`, `niche: false`, and confidence high.
6. "Teach children about London" with city and travel claims, and no place-bound geology, date, or cause, stays usable.

A teacher-supplied Beachy Head sentence stays selectable with `factuallyVerified: false` and `support: "supplied"`. A model-only 1999 claim beside it is held.

## Live validation

**LIVE_VALIDATION_BLOCKED.** `OPENAI_API_KEY` is not set here. No live pack, strand count, repair, or pupil lesson was observed. See `LIVE_VALIDATION_BLOCKED.md`.

Re-run:

```
OPENAI_API_KEY=... node scripts/bounded-corrections-live.js
```

That writes `y4-sharks.json`, `y3-dinosaurs.json`, and `y6-mam-tor.json` from real completions. If a case fails the existing gates, the JSON keeps the failure. The gates are not loosened to force a pass.
