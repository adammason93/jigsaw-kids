"use strict";

/* Shared pieces for the pack model comparison harness (test script only).
   Nothing here changes production code. The pack and intent prompts are read
   from js/lesson-brain.js at the frozen commit, unchanged. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var REPO_ROOT = path.resolve(__dirname, "../..");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

function loadBrain() {
  return require(path.join(REPO_ROOT, "js/lesson-brain.js"));
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Seeded PRNG (mulberry32) and Fisher-Yates shuffle, so run order and blind
// order are reproducible from the recorded seed.
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, seed) {
  var out = list.slice();
  var rand = mulberry32(seed);
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

function briefMessages(brief) {
  return [
    { role: "system", content: brief.system },
    { role: "user", content: brief.user }
  ];
}

function promptChars(messages) {
  return messages.reduce(function (sum, m) { return sum + String(m.content || "").length; }, 0);
}

/* Budget guard.
   - check() runs BEFORE every paid call: it refuses when calls >= maxCalls, or
     when spentGuard + worstCase(next) > capUsd.
   - worstCase uses a conservative prompt estimate (chars / charsPerToken +
     overhead) and the full maxTokens of output, priced at listed price x
     guardPriceMultiplier.
   - settle() records the call. Usage-reported cost is added at guard prices;
     a call with no usage (timeout, transport error) is charged its full worst
     case, because a provider may still bill for it. */
function createBudgetGuard(opts) {
  var state = {
    maxCalls: opts.maxCalls,
    capUsd: opts.capUsd,
    listed: opts.listedPricesUsdPer1M,
    multiplier: opts.guardPriceMultiplier || 1,
    charsPerToken: opts.promptCharsPerToken || 3,
    overhead: opts.promptOverheadTokens || 0,
    calls: 0,
    spentGuardUsd: 0,
    spentListedUsd: 0,
    stopped: null
  };
  function price(model) {
    var p = state.listed[model];
    if (!p) throw new Error("No listed price for model " + model + ". Refusing to call it.");
    return p;
  }
  function estimatePromptTokens(messages) {
    return Math.ceil(promptChars(messages) / state.charsPerToken) + state.overhead;
  }
  function worstCase(model, messages, maxTokens) {
    var p = price(model);
    var promptTokens = estimatePromptTokens(messages);
    return (promptTokens * p.input + maxTokens * p.output) * state.multiplier / 1e6;
  }
  function check(model, messages, maxTokens) {
    if (state.stopped) return { ok: false, reason: state.stopped.reason };
    var worst = worstCase(model, messages, maxTokens);
    if (state.calls >= state.maxCalls) {
      state.stopped = { reason: "CALL_LIMIT", calls: state.calls, spentGuardUsd: state.spentGuardUsd, nextWorstCaseUsd: worst };
      return { ok: false, reason: "CALL_LIMIT", worstCaseUsd: worst };
    }
    if (state.spentGuardUsd + worst > state.capUsd) {
      state.stopped = { reason: "SPEND_CAP", calls: state.calls, spentGuardUsd: state.spentGuardUsd, nextWorstCaseUsd: worst };
      return { ok: false, reason: "SPEND_CAP", worstCaseUsd: worst };
    }
    return { ok: true, worstCaseUsd: worst };
  }
  function begin() {
    state.calls += 1;
    return state.calls;
  }
  function settle(model, messages, maxTokens, usage) {
    var p = price(model);
    var listed = 0;
    var guard;
    if (usage && typeof usage.prompt_tokens === "number" && typeof usage.completion_tokens === "number") {
      listed = (usage.prompt_tokens * p.input + usage.completion_tokens * p.output) / 1e6;
      guard = listed * state.multiplier;
    } else {
      guard = worstCase(model, messages, maxTokens);
    }
    state.spentListedUsd += listed;
    state.spentGuardUsd += guard;
    return { listedUsd: listed, guardUsd: guard };
  }
  return {
    check: check,
    begin: begin,
    settle: settle,
    worstCase: worstCase,
    estimatePromptTokens: estimatePromptTokens,
    state: function () { return clone(state); }
  };
}

/* OpenAI Chat Completions client. Same request body as production callModel
   (model, temperature, response_format json_object, system + user messages)
   plus max_tokens. fetchImpl is injectable so the offline test can drive the
   real client code with a mock. The API key is never logged or returned. */
function createOpenAIClient(opts) {
  var apiKey = opts.apiKey;
  var fetchImpl = opts.fetchImpl;
  return {
    chat: async function (req) {
      var control = new AbortController();
      var started = Date.now();
      var timer = setTimeout(function () { control.abort(); }, req.timeoutMs);
      var result = { ok: false, httpStatus: 0, errorCategory: "", rawBody: "", content: "", usage: null, returnedModel: "", requestId: "", latencyMs: 0 };
      try {
        var response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: control.signal,
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: req.model,
            temperature: req.temperature,
            response_format: { type: "json_object" },
            max_tokens: req.maxTokens,
            messages: req.messages
          })
        });
        result.httpStatus = response.status;
        result.requestId = (response.headers && typeof response.headers.get === "function" && response.headers.get("x-request-id")) || "";
        result.rawBody = await response.text();
        if (!response.ok) {
          result.errorCategory = response.status === 429 ? "rate_limit" : (response.status >= 500 ? "server" : (response.status === 408 ? "timeout" : "http_" + response.status));
          return result;
        }
        var payload = null;
        try { payload = JSON.parse(result.rawBody); } catch (e) { payload = null; }
        if (!payload) { result.errorCategory = "empty_body"; return result; }
        result.usage = payload.usage || null;
        result.returnedModel = payload.model || "";
        var choice = payload.choices && payload.choices[0];
        result.finishReason = (choice && choice.finish_reason) || "";
        result.content = String((choice && choice.message && choice.message.content) || "");
        if (!result.content) { result.errorCategory = "empty_body"; return result; }
        result.ok = true;
        return result;
      } catch (error) {
        result.errorCategory = error && error.name === "AbortError" ? "timeout" : "network";
        result.errorMessage = String(error && error.message || "").slice(0, 200);
        return result;
      } finally {
        clearTimeout(timer);
        result.latencyMs = Date.now() - started;
      }
    }
  };
}

// Transport failures only. A quality failure (bad JSON content, weak pack) is
// never retried.
function isRetryable(result) {
  return !result.ok && ["timeout", "network", "rate_limit", "server", "empty_body"].indexOf(result.errorCategory) !== -1;
}

function parseContent(content) {
  try {
    var parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { parsed: null, parseError: "not a JSON object" };
    return { parsed: parsed, parseError: "" };
  } catch (e) {
    return { parsed: null, parseError: String(e.message || e).slice(0, 200) };
  }
}

function median(values) {
  var v = values.filter(function (x) { return typeof x === "number"; }).sort(function (a, b) { return a - b; });
  if (!v.length) return null;
  var mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

module.exports = {
  REPO_ROOT: REPO_ROOT,
  sha256: sha256,
  fileSha256: fileSha256,
  loadBrain: loadBrain,
  loadJson: loadJson,
  writeJson: writeJson,
  clone: clone,
  mulberry32: mulberry32,
  shuffle: shuffle,
  briefMessages: briefMessages,
  promptChars: promptChars,
  createBudgetGuard: createBudgetGuard,
  createOpenAIClient: createOpenAIClient,
  isRetryable: isRetryable,
  parseContent: parseContent,
  median: median
};
