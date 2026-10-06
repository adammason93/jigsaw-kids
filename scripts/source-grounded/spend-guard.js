"use strict";

/* Hard spend guard over every paid OpenAI call made in this process (text, web search,
   images, vision). Before a call it prices the worst case at listed rates, doubles it
   (the guard margin), and refuses the call when guard spend plus that figure would pass
   the cap. After the call it settles real usage x 2. Every decision goes to a JSONL
   ledger that later steps reload, so the cap holds across separate scripts.
   Prices are USD per 1M tokens, verified Tue 6 Oct 2026 (see PRICES.source). */

var fs = require("fs");

var PRICES = {
  source: {
    "gpt-4o-mini": "https://developers.openai.com/api/docs/models/gpt-4o-mini (re-checked 6 Oct 2026 08:02 BST, BUDGET.md)",
    "gpt-4.1-mini": "https://developers.openai.com/api/docs/models/gpt-4.1-mini ($0.40 in / $1.60 out), read 6 Oct 2026; used only for the web search step",
    "gpt-6-luna": "https://developers.openai.com/api/docs/models/gpt-6-luna ($0.10 in / $0.50 out, standard), read 6 Oct 2026; used for the web search step and, experimentally in research mode only, the knowledge, entailment and repair calls",
    "gpt-6.1-sol": "https://developers.openai.com/api/docs/pricing (Flagship models, standard, short context: $2.00 in / $10.00 out per 1M), read 6 Oct 2026 13:50 BST; used only for the story call of story-led research lessons",
    "web_search": "https://developers.openai.com/api/docs/pricing (Tools: web search $10.00 / 1k calls; gpt-4o-mini and gpt-4.1-mini search content billed as a fixed 8,000 input-token block per call), read 6 Oct 2026",
    "gpt-image-2.5-sunburst": "https://developers.openai.com/api/docs/pricing (Image generation, standard: text in $5.00, image in $8.00, image out $30.00 per 1M), read 6 Oct 2026"
  },
  text: { "gpt-4o-mini": { input: 0.15, output: 0.60 }, "gpt-4.1-mini": { input: 0.40, output: 1.60 }, "gpt-6-luna": { input: 0.10, output: 0.50 }, "gpt-6.1-sol": { input: 2.00, output: 10.00 } },
  webSearchPerCall: 0.01,
  webSearchContentTokens: 8000,
  // Reasoning models bill search content at model rates with no fixed block; the guard
  // assumes up to 40,000 content tokens per search call for them.
  webSearchContentTokensReasoning: 40000,
  image: { "gpt-image-2.5-sunburst": { textInput: 5.0, imageInput: 8.0, imageOutput: 30.0 } },
  // gpt-4o-mini bills a low-detail image as 2,833 input tokens.
  visionLowDetailTokens: 2833,
  // Worst-case output tokens for one image. OpenAI's calculator gives 196 (1024x1024 low)
  // and 158 (1536x1024 low); 600 covers medium at these sizes.
  imageOutputWorst: 600,
  // No max_tokens is sent by the lesson boot, so the text worst case is the model's cap.
  textOutputWorst: 16384
};

function textPrice(model) {
  var key = Object.keys(PRICES.text).filter(function (name) { return String(model || "").indexOf(name) === 0; })[0];
  return key ? PRICES.text[key] : null;
}

function createGuard(options) {
  var capUsd = Number(options.capUsd);
  var ledgerPath = options.ledgerPath;
  var margin = options.margin || 2;
  var key = options.redact || "";
  var state = { guardSpent: 0, listedSpent: 0, calls: 0, refused: 0 };
  if (!(capUsd > 0)) throw new Error("spend guard needs a positive cap");
  if (fs.existsSync(ledgerPath)) {
    fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).forEach(function (line) {
      var row = JSON.parse(line);
      if (row.event === "settled") { state.guardSpent += row.guardUsd; state.listedSpent += row.listedUsd; state.calls += 1; }
      if (row.event === "refused") state.refused += 1;
    });
  }
  function write(row) {
    row.at = new Date().toISOString();
    row.capUsd = capUsd;
    row.guardSpentAfter = Number(state.guardSpent.toFixed(6));
    fs.appendFileSync(ledgerPath, JSON.stringify(row) + "\n");
  }
  // Shared total: other agents' and earlier steps' ledgers plus a fixed prior figure count
  // against options.totalCapUsd. They are re-read before every call (both ledger formats).
  function sharedGuardSpent() {
    var total = Number(options.baseGuardUsd || 0);
    (options.sharedLedgers || []).forEach(function (file) {
      if (!file || file === ledgerPath || !fs.existsSync(file)) return;
      fs.readFileSync(file, "utf8").split("\n").filter(Boolean).forEach(function (line) {
        var row = {};
        try { row = JSON.parse(line); } catch (e) { return; }
        if (row.event === "settled") total += Number(row.guardUsd || 0);
        else if (!row.event && row.guard != null) total += Number(row.guard || 0);
      });
    });
    return total;
  }
  function redact(text) { return key ? String(text).split(key).join("[redacted]") : String(text); }

  function estimate(url, body, label) {
    var href = String(url);
    if (href.indexOf("/v1/chat/completions") !== -1) {
      var price = textPrice(body.model);
      if (!price) return { error: "no verified price for model " + body.model };
      var chars = 0;
      var images = 0;
      (body.messages || []).forEach(function (message) {
        if (typeof message.content === "string") chars += message.content.length;
        else (message.content || []).forEach(function (part) {
          if (part.type === "text") chars += String(part.text || "").length;
          if (part.type === "image_url") images += 1;
        });
      });
      var inTokens = Math.ceil(chars / 3) + images * PRICES.visionLowDetailTokens;
      var outTokens = body.max_tokens || body.max_completion_tokens || PRICES.textOutputWorst;
      return { kind: images ? "vision" : "text", model: body.model, listedUsd: (inTokens * price.input + outTokens * price.output) / 1e6, inTokens: inTokens, outTokens: outTokens };
    }
    if (href.indexOf("/v1/responses") !== -1) {
      var p = textPrice(body.model);
      if (!p) return { error: "no verified price for model " + body.model };
      // A live call with max_tool_calls 1 billed 2 searches (run 9, 6 Oct 2026), so allow one more.
      var tools = (body.max_tool_calls || 3) + 1;
      var block = /^(?:gpt-5|gpt-6|o\d)/.test(body.model) ? PRICES.webSearchContentTokensReasoning : PRICES.webSearchContentTokens;
      var inT = Math.ceil(String(body.input || "").length / 3) + tools * block;
      var outT = body.max_output_tokens || PRICES.textOutputWorst;
      return { kind: "web_search", model: body.model, listedUsd: tools * PRICES.webSearchPerCall + (inT * p.input + outT * p.output) / 1e6, inTokens: inT, outTokens: outT, toolCalls: tools };
    }
    if (href.indexOf("/v1/images/generations") !== -1) {
      var ip = PRICES.image[body.model];
      if (!ip) return { error: "no verified price for image model " + body.model };
      if (Number(body.n || 1) !== 1) return { error: "only n=1 is allowed" };
      if (["low", "medium"].indexOf(body.quality) === -1) return { error: "image quality must be low or medium under this guard" };
      var pt = Math.ceil(String(body.prompt || "").length / 3);
      return { kind: "image", model: body.model, listedUsd: (pt * ip.textInput + PRICES.imageOutputWorst * ip.imageOutput) / 1e6, inTokens: pt, outTokens: PRICES.imageOutputWorst };
    }
    return { error: "endpoint not priced by the guard: " + href.replace(/\?.*$/, "") };
  }

  function settle(est, url, payload) {
    var usage = payload && payload.usage;
    var listed = null;
    var detail = {};
    if (usage && est.kind === "text" || usage && est.kind === "vision") {
      var price = textPrice(est.model);
      listed = (usage.prompt_tokens * price.input + usage.completion_tokens * price.output) / 1e6;
      detail = { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens };
    } else if (est.kind === "web_search" && usage) {
      var p = textPrice(est.model);
      var calls = ((payload.output || []).filter(function (item) { return item.type === "web_search_call"; })).length;
      // Conservative: add the fixed search-content block on top of reported input tokens.
      listed = calls * PRICES.webSearchPerCall + ((usage.input_tokens + calls * PRICES.webSearchContentTokens) * p.input + usage.output_tokens * p.output) / 1e6;
      detail = { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, webSearchCalls: calls };
    } else if (est.kind === "image" && usage) {
      var ip = PRICES.image[est.model];
      var d = usage.input_tokens_details || {};
      var textIn = d.text_tokens != null ? d.text_tokens : usage.input_tokens || 0;
      var imageIn = d.image_tokens || 0;
      listed = (textIn * ip.textInput + imageIn * ip.imageInput + (usage.output_tokens || 0) * ip.imageOutput) / 1e6;
      detail = { textInputTokens: textIn, imageInputTokens: imageIn, outputTokens: usage.output_tokens || 0 };
    }
    if (listed == null) { listed = est.listedUsd; detail.settledAtEstimate = true; }
    return { listedUsd: listed, detail: detail };
  }

  function wrap(realFetch) {
    return function guardedFetch(url, init) {
      var href = String(url);
      if (href.indexOf("https://api.openai.com/") !== 0) return realFetch(url, init);
      var body = {};
      try { body = JSON.parse(init && init.body || "{}"); } catch (e) { body = {}; }
      var est = estimate(href, body);
      var label = (options.labelFor && options.labelFor(href, body)) || "";
      if (est.error) {
        state.refused += 1;
        write({ event: "refused", label: label, endpoint: href, reason: est.error });
        return Promise.reject(new Error("SPEND_GUARD_REFUSED: " + est.error));
      }
      var guardEstimate = est.listedUsd * margin;
      if (options.totalCapUsd > 0) {
        var shared = sharedGuardSpent();
        if (shared + state.guardSpent + guardEstimate > options.totalCapUsd) {
          state.refused += 1;
          write({ event: "refused", label: label, endpoint: href, kind: est.kind, model: est.model, worstListedUsd: est.listedUsd, worstGuardUsd: guardEstimate, sharedGuardUsd: Number(shared.toFixed(6)), reason: "shared total plus worst case would pass the total cap" });
          return Promise.reject(new Error("SPEND_GUARD_REFUSED: total cap " + options.totalCapUsd + " would be exceeded"));
        }
      }
      if (state.guardSpent + guardEstimate > capUsd) {
        state.refused += 1;
        write({ event: "refused", label: label, endpoint: href, kind: est.kind, model: est.model, worstListedUsd: est.listedUsd, worstGuardUsd: guardEstimate, reason: "guard spend plus worst case would pass the cap" });
        return Promise.reject(new Error("SPEND_GUARD_REFUSED: cap " + capUsd + " would be exceeded"));
      }
      var started = Date.now();
      return realFetch(url, init).then(function (res) {
        return res.clone().json().catch(function () { return null; }).then(function (payload) {
          var s = res.ok ? settle(est, href, payload) : { listedUsd: res.status >= 500 ? 0 : 0, detail: { httpStatus: res.status, error: redact(payload && payload.error && payload.error.message || "").slice(0, 200) } };
          var guardUsd = s.listedUsd * margin;
          state.guardSpent += guardUsd;
          state.listedSpent += s.listedUsd;
          state.calls += 1;
          write({ event: "settled", label: label, endpoint: href.replace("https://api.openai.com", ""), kind: est.kind, model: est.model, ok: res.ok, ms: Date.now() - started, worstListedUsd: Number(est.listedUsd.toFixed(6)), listedUsd: Number(s.listedUsd.toFixed(6)), guardUsd: Number(guardUsd.toFixed(6)), detail: s.detail });
          return res;
        });
      }, function (error) {
        // A timed-out or aborted call may still be billed: settle it at the worst case.
        state.guardSpent += guardEstimate;
        state.listedSpent += est.listedUsd;
        state.calls += 1;
        write({ event: "settled", label: label, endpoint: href.replace("https://api.openai.com", ""), kind: est.kind, model: est.model, ok: false, ms: Date.now() - started, worstListedUsd: Number(est.listedUsd.toFixed(6)), listedUsd: Number(est.listedUsd.toFixed(6)), guardUsd: Number(guardEstimate.toFixed(6)), detail: { transportError: redact(error && (error.name + ": " + error.message) || error).slice(0, 200), settledAtWorstCase: true } });
        throw error;
      });
    };
  }

  return {
    wrap: wrap,
    estimate: estimate,
    sharedGuardSpent: sharedGuardSpent,
    state: function () { return { capUsd: capUsd, guardSpent: Number(state.guardSpent.toFixed(6)), listedSpent: Number(state.listedSpent.toFixed(6)), remaining: Number((capUsd - state.guardSpent).toFixed(6)), calls: state.calls, refused: state.refused }; },
    redact: redact
  };
}

module.exports = { PRICES: PRICES, createGuard: createGuard };
