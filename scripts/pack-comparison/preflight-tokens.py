#!/usr/bin/env python3
"""Recount the preflight worst case with tiktoken o200k_base (no model calls).

python3 scripts/pack-comparison/preflight-tokens.py DIR

Reads DIR/preflight-prompts.json and DIR/manifest.json (written by
run.js --preflight-only or by a live run before its first paid call) and writes
DIR/worst-case-tiktoken.json. Pack prompts for tests whose intent is generated
during the run carry an upper-bound margin of spaces; the margin is counted as
chars/3 tokens, which over-counts. Output is maxTokens per call."""
import json, math, sys, os
import tiktoken

d = sys.argv[1]
cfg = json.load(open(os.path.join(d, "manifest.json")))["config"]
prompts = json.load(open(os.path.join(d, "preflight-prompts.json")))
plan = json.load(open(os.path.join(d, "manifest.json")))["plannedCalls"]
enc = tiktoken.get_encoding("o200k_base")
listed = cfg["listedPricesUsdPer1M"]
mult = cfg["guardPriceMultiplier"]
mx = cfg["maxTokens"]
rows, tot_listed, max_pack_listed = [], 0.0, 0.0
for p in prompts:
    text_tokens = sum(len(enc.encode(m["content"].rstrip(" ") if p.get("marginChars") else m["content"])) for m in p["messages"])
    tokens = text_tokens + 3 * len(p["messages"]) + 3 + math.ceil(p.get("marginChars", 0) / 3)
    models = [p["model"]] if p["kind"] == "intent" else list(cfg["arms"].values())
    calls = 1 if p["kind"] == "intent" else cfg["repeats"]
    for m in models:
        c = (tokens * listed[m]["input"] + mx * listed[m]["output"]) / 1e6
        tot_listed += c * calls
        if p["kind"] == "pack":
            max_pack_listed = max(max_pack_listed, c)
        rows.append({"test": p["test"], "kind": p["kind"], "model": m, "calls": calls, "tiktokenPromptTokens": tokens, "listedWorstUsdPerCall": round(c, 6)})
retry = json.load(open(os.path.join(d, "worst-case.json")))["retryBudget"]
out = {
    "method": "tiktoken o200k_base prompt tokens (+3 per message +3), output = maxTokens %d, listed prices; guard figure = listed x %s" % (mx, mult),
    "rows": rows,
    "retryBudget": retry,
    "plannedListedWorstUsd": round(tot_listed, 6),
    "retriesListedWorstUsd": round(retry * max_pack_listed, 6),
    "totalListedWorstUsd": round(tot_listed + retry * max_pack_listed, 6),
    "totalGuardWorstUsd": round((tot_listed + retry * max_pack_listed) * mult, 6),
    "capUsd": cfg["capUsd"],
    "withinCapAtListed": tot_listed + retry * max_pack_listed <= cfg["capUsd"],
    "withinCapAtGuard": (tot_listed + retry * max_pack_listed) * mult <= cfg["capUsd"],
}
json.dump(out, open(os.path.join(d, "worst-case-tiktoken.json"), "w"), indent=2)
print(json.dumps({k: v for k, v in out.items() if k != "rows"}, indent=2))
