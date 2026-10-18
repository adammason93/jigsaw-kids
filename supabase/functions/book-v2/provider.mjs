/* Server-only Book V2 providers. Imported only after allow.mjs accepts one
   adult account and one story key. The website never receives the provider
   key. This file calls the same story, picture, and vision endpoints already
   used by generate.js and visual-proof.js. It does not start a run by itself. */

import { createClient } from "npm:@supabase/supabase-js@2";
import { readPublishableKey } from "../_shared/service-key.mjs";
import { claimDecision } from "../clever-service/generation-allowance.mjs";
import { mayStartPaid, paidJobAllowed } from "./allow.mjs";
import { claimGate, confirmLease, LEASE_MS, PICTURE_CALL_TIMEOUT_MS, STORY_WRITER_TIMEOUT_MS, pictureCallFailure, storyWriterFailure } from "./lease.mjs";

const TEXT_MODEL = "gpt-6.1-sol";
const IMAGE_MODEL = "gpt-image-2.5-sunburst";
const VISION_MODEL = "gpt-4o-mini";

function serviceRoleKey() {
  try { return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""; } catch (_error) { return ""; }
}

/* Unique insert in private.book_operation_claims. A storage create is not a fallback:
   if the database claim is missing, the provider is not called. */
async function operationRpc(base, name, body) {
  const key = serviceRoleKey();
  if (!base || !key) return { ok: false, reason: "checkpoint" };
  let response = null;
  try {
    response = await fetch(base.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (_error) {
    return { ok: false, reason: "uncertain" };
  }
  if (!response || !response.ok) return { ok: false, reason: "checkpoint" };
  try {
    const decision = await response.json();
    if (!decision || decision.ok !== true) return { ok: false, reason: decision && decision.reason || "duplicate" };
    return { ok: true, reason: decision.reason || "claimed" };
  } catch (_error) {
    return { ok: false, reason: "uncertain" };
  }
}

async function holdPaidOperation(base, operationId, owner) {
  if (!operationId || !owner) return { ok: false, reason: "checkpoint" };
  return operationRpc(base, "hold_book_operation", {
    p_operation_id: operationId,
    p_owner: owner
  });
}

async function confirmPaidOperation(base, operationId, owner) {
  if (!operationId || !owner) return { ok: false, reason: "checkpoint" };
  return operationRpc(base, "confirm_book_operation", {
    p_operation_id: operationId,
    p_owner: owner
  });
}

export { claimPaidOperation, confirmPaidOperation, holdPaidOperation };

async function claimPaidOperation(base, accountId, creationKey, operationId, owner) {
  if (!accountId || !creationKey || !operationId || !owner) return { ok: false, reason: "checkpoint" };
  return operationRpc(base, "claim_book_operation", {
    p_operation_id: operationId,
    p_account_id: accountId,
    p_creation_key: creationKey,
    p_owner: owner
  });
}

function tokenOf(req) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function authHeaders(publishable, token, extra) {
  return Object.assign({
    apikey: publishable,
    Authorization: "Bearer " + token
  }, extra || {});
}

/* The scheduler's storage credential is the service role, sent as both the
   apikey and the bearer. Pairing the publishable key with that bearer is
   rejected before the saved job can be read. A normal user token stays on
   the publishable key. */
function storageKey(publishable, token) {
  const service = serviceRoleKey();
  if (service && token === service) return service;
  return publishable;
}

function storageUrl(base, bucket, path) {
  return base.replace(/\/$/, "") + "/storage/v1/object/" + bucket + "/" + path.split("/").map(encodeURIComponent).join("/");
}

async function readJson(base, publishable, token, path) {
  const res = await fetch(storageUrl(base, "storybook_room", path) + "?t=" + Date.now(), {
    headers: authHeaders(publishable, token, { "Cache-Control": "no-cache" })
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) return null;
  try { return await res.json(); } catch (_error) { return null; }
}

async function writeJson(base, publishable, token, path, value) {
  const res = await fetch(storageUrl(base, "storybook_room", path), {
    method: "POST",
    headers: authHeaders(publishable, token, {
      "Content-Type": "application/json",
      "x-upsert": "true",
      "Cache-Control": "no-cache"
    }),
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error("shelf");
}

function memoryShelf(accountId, books) {
  const shelves = {};
  shelves[accountId] = Array.isArray(books) ? books.slice() : [];
  return {
    readShelf: function (userId) {
      if (userId !== accountId) return [];
      return shelves[userId] ? shelves[userId].slice() : [];
    },
    writeShelf: function (userId, next) {
      if (userId !== accountId) return;
      shelves[userId] = (next || []).slice();
    },
    putObject: function () {},
    deleteObject: function () {}
  };
}

function memoryJobs(accountId, key, prior) {
  const rows = {};
  const id = accountId + ":" + key;
  if (prior) rows[id] = prior;
  return {
    read: function (userId, creationKey) { return rows[userId + ":" + creationKey] || null; },
    write: function (userId, creationKey, job) { rows[userId + ":" + creationKey] = job; },
    claim: function (userId, creationKey) {
      const rowId = userId + ":" + creationKey;
      const current = rows[rowId];
      if (userId !== accountId) return { ok: false, reason: "wrong-account", job: null };
      if (current && current.status === "complete") return { ok: false, reason: "already-generated", job: current };
      if (current && current.status === "running") {
        const age = Date.now() - Number(current.startedAt || 0);
        if (age < 120000) return { ok: false, reason: "already-running", job: current };
      }
      rows[rowId] = Object.assign({}, current || {}, { status: "running", startedAt: Date.now() });
      return { ok: true, prior: current || null };
    },
    entries: function () { return rows; }
  };
}

function ownedPath(accountId, characterId, file) {
  return file === accountId + "/characters/" + characterId + ".png";
}

async function encoded(res) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function crewPath(file) {
  const path = String(file || "");
  if (!path || path.indexOf("..") >= 0 || path.indexOf("\\") >= 0) return false;
  if (path.indexOf("maya-v1") >= 0) return true;
  return path.indexOf("images/characters/crew/") === 0 || path.indexOf("/characters/crew/") >= 0;
}

async function callModel(key, brief, opts) {
  const model = (opts && opts.model) || TEXT_MODEL;
  const reasoning = /^(?:gpt-5|gpt-6|o\d)/.test(model);
  const body = Object.assign({
    model: model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: brief.system },
      { role: "user", content: brief.user }
    ]
  }, reasoning
    ? { reasoning_effort: (opts && opts.effort) || "low", max_completion_tokens: (opts && opts.maxTokens) || 4000 }
    : { temperature: 0.7, max_tokens: (opts && opts.maxTokens) || 4000 });
  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(STORY_WRITER_TIMEOUT_MS)
    });
  } catch (error) {
    throw storyWriterFailure(error);
  }
  const payload = await res.json();
  if (!res.ok) throw new Error("story");
  const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "";
  return { value: JSON.parse(content), usage: payload && payload.usage || null };
}

function pictureSize(input) {
  const asked = String(input && input.size || "");
  if (asked === "1024x1536" || asked === "1536x1024") return asked;
  return "1536x1024";
}

async function drawImage(key, input) {
  const refs = (input && input.references || []).filter(function (row) { return row && row.bytes; });
  const size = pictureSize(input);
  let res;
  try {
  if (refs.length) {
    const form = new FormData();
    form.append("model", IMAGE_MODEL);
    form.append("prompt", String(input.prompt || ""));
    refs.forEach(function (row) {
      const bytes = Uint8Array.from(atob(String(row.bytes)), function (ch) { return ch.charCodeAt(0); });
      form.append("image[]", new Blob([bytes], { type: "image/jpeg" }), row.characterId + ".jpg");
    });
    form.append("size", size);
    form.append("quality", "medium");
    form.append("output_format", "jpeg");
    form.append("output_compression", "80");
    form.append("n", "1");
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form,
      signal: AbortSignal.timeout(PICTURE_CALL_TIMEOUT_MS)
    });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: String(input.prompt || ""),
        size: size,
        quality: "medium",
        output_format: "jpeg",
        output_compression: 80,
        moderation: "auto",
        n: 1
      }),
      signal: AbortSignal.timeout(PICTURE_CALL_TIMEOUT_MS)
    });
  }
    const payload = await res.json();
    const b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
    if (!res.ok || !b64) throw new Error("picture");
    return { image: "data:image/jpeg;base64," + b64, usage: payload && payload.usage || null };
  } catch (error) {
    if (error && error.message === "picture") throw error;
    throw pictureCallFailure(error);
  }
}

async function inspectImage(key, input) {
  const image = String(input && input.image || "");
  const brief = String(input && input.brief || "").trim() || "Check this children's book picture. Return JSON with characters, entities, locationMatch, momentMatch, textDetected, anatomyOk, textSafeUsable, duplicateCharacter and montageShown.";
  const content = [{ type: "text", text: brief }];
  content.push({ type: "text", text: "This is the page." });
  content.push({ type: "image_url", image_url: { url: image, detail: "low" } });
  const refs = Array.isArray(input && input.references) ? input.references : [];
  refs.forEach(function (ref) {
    const bytes = String(ref && ref.bytes || "");
    if (!bytes) return;
    const url = bytes.indexOf("data:image/") === 0 ? bytes : "data:image/jpeg;base64," + bytes;
    content.push({ type: "text", text: "Reference image for " + String(ref.characterId || "character") + "." });
    content.push({ type: "image_url", image_url: { url: url, detail: "low" } });
  });
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: content }]
      }),
      signal: AbortSignal.timeout(PICTURE_CALL_TIMEOUT_MS)
    });
    const payload = await res.json();
    if (!res.ok) throw new Error("check");
    const reply = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "";
    return { report: JSON.parse(reply), usage: payload && payload.usage || null };
  } catch (error) {
    if (error && error.message === "check") throw error;
    throw pictureCallFailure(error);
  }
}

function slimJob(job) {
  const copy = JSON.parse(JSON.stringify(job || {}));
  const refs = copy.checkpoint && copy.checkpoint.references || {};
  Object.keys(refs).forEach(function (id) {
    if (refs[id]) delete refs[id].bytes;
  });
  return copy;
}

export async function portsFor(req, grant) {
  const accountId = String(grant && grant.accountId || "");
  const allowed = paidJobAllowed({
    accountId: accountId,
    accountKind: grant && grant.accountKind,
    creationKey: grant && grant.creationKey,
    secrets: {
      accountId: Deno.env.get("BOOK_V2_PAID_ACCOUNT") || "",
      creationKey: Deno.env.get("BOOK_V2_PAID_STORY") || "",
      budgetUsd: Deno.env.get("BOOK_V2_PAID_BUDGET_USD") || "",
      selfService: Deno.env.get("BOOK_V2_PAID_SELF_SERVICE") || ""
    }
  });
  if (!allowed.ok) return { approved: false };
  const key = String(Deno.env.get("OPENAI_API_KEY") || "");
  if (!key || !accountId) return { approved: false };
  const base = String(Deno.env.get("SUPABASE_URL") || "");
  const publishable = readPublishableKey(function (name) { return Deno.env.get(name); }).key || "";
  const token = tokenOf(req);
  if (!base || !publishable || !token) return { approved: false };
  const storedWith = storageKey(publishable, token);
  const creationKey = String(grant && grant.creationKey || "");
  let existingJob = null;
  if (grant.consent !== true && creationKey) {
    existingJob = await readJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json");
  }
  const consent = mayStartPaid({
    accountId: accountId,
    accountKind: grant && grant.accountKind,
    creationKey: creationKey,
    approveGeneration: grant && grant.consent === true,
    existingJob: existingJob,
    secrets: {
      accountId: Deno.env.get("BOOK_V2_PAID_ACCOUNT") || "",
      creationKey: Deno.env.get("BOOK_V2_PAID_STORY") || "",
      budgetUsd: Deno.env.get("BOOK_V2_PAID_BUDGET_USD") || "",
      selfService: Deno.env.get("BOOK_V2_PAID_SELF_SERVICE") || ""
    }
  });
  if (!consent.ok) return { approved: false };
  let shelfBooks = [];
  try {
    const downloaded = await readJson(base, storedWith, token, accountId + "/storybook/shelf.json");
    shelfBooks = Array.isArray(downloaded) ? downloaded : [];
  } catch (_error) {
    shelfBooks = [];
  }
  const store = memoryShelf(accountId, shelfBooks);
  const jobs = memoryJobs(accountId, "", null);
  const client = createClient(base, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + token } }
  });
  const budgetUsd = allowed.budgetUsd;
  return {
    approved: true,
    chunked: true,
    /* One paid picture call, then a saved checkpoint. The website does not
       start the next call by itself. */
    pictureSteps: true,
    model: TEXT_MODEL,
    budgetUsd: budgetUsd,
    store: store,
    claimOperation: async function (operationId, owner) {
      return claimPaidOperation(base, accountId, creationKey, operationId, owner);
    },
    confirmOperation: async function (operationId, owner) {
      return confirmPaidOperation(base, operationId, owner);
    },
    holdOperation: async function (operationId, owner) {
      return holdPaidOperation(base, operationId, owner);
    },
    jobs: {
      read: async function (userId, creationKey) {
        const cached = jobs.read(userId, creationKey);
        if (cached) return cached;
        if (userId !== accountId) return null;
        const prior = await readJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json");
        if (prior) jobs.write(userId, creationKey, prior);
        return prior;
      },
      write: async function (userId, creationKey, job) {
        if (userId !== accountId || !creationKey) return;
        const stored = slimJob(job);
        jobs.write(userId, creationKey, stored);
        await writeJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json", stored);
      },
      claim: async function (userId, creationKey) {
        if (userId !== accountId) return { ok: false, reason: "wrong-account", job: null };
        const prior = await readJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json");
        const gate = claimGate(prior, Date.now(), LEASE_MS);
        if (!gate.ok) return { ok: false, reason: gate.reason, job: prior };
        const lease = crypto.randomUUID();
        const claimed = Object.assign({}, prior || {}, {
          status: "running",
          startedAt: Date.now(),
          lease: lease,
          accountId: accountId,
          creationKey: creationKey
        });
        await writeJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json", slimJob(claimed));
        const check = await readJson(base, storedWith, token, accountId + "/storybook/jobs/" + creationKey + ".json");
        if (!confirmLease(check, lease)) return { ok: false, reason: "already-running", job: check };
        jobs.write(userId, creationKey, check);
        return { ok: true, prior: prior || null };
      }
    },
    allowance: {
      claim: async function (_childId, creationKey) {
        const claimed = await client.rpc("claim_child_generation", { p_kind: "book", p_key: String(creationKey || "") });
        const decision = claimDecision("child", claimed.data);
        return { allowed: decision.proceed === true, reason: decision.reason };
      }
    },
    fetchReference: async function (row) {
      const file = String(row && row.file || "");
      const characterId = String(row && row.characterId || "");
      if (row && row.privateArt) {
        if (!ownedPath(accountId, characterId, file)) return { ok: false, reason: "wrong-artwork" };
        const res = await fetch(storageUrl(base, "characters_room", file), {
          headers: authHeaders(storedWith, token)
        });
        if (!res.ok) return { ok: false, reason: "missing" };
        return { ok: true, bytes: await encoded(res) };
      }
      if (characterId === "wondii-maya" && file.indexOf("maya-v1") < 0) return { ok: false, reason: "wrong-artwork" };
      if (characterId !== "wondii-maya" && file.indexOf("maya-v1") >= 0) return { ok: false, reason: "wrong-artwork" };
      if (characterId === "wondii-sofia" && file.indexOf("wondii-sofia") < 0) return { ok: false, reason: "wrong-artwork" };
      if (!crewPath(file)) return { ok: false, reason: "wrong-artwork" };
      const res = await fetch("https://wondii.co.uk/" + file.replace(/^\/+/, ""));
      if (!res.ok) return { ok: false, reason: "missing" };
      return { ok: true, bytes: await encoded(res) };
    },
    callModel: function (brief, opts) { return callModel(key, brief, opts); },
    drawImage: function (input) { return drawImage(key, input); },
    inspectImage: function (input) { return inspectImage(key, input); },
    storePicture: async function (input) {
      if (!input || input.accountId !== accountId) return "";
      const dataUrl = String(input.dataUrl || "");
      if (dataUrl.indexOf("data:image/") !== 0) return "";
      const pageName = String(input.pageId || "");
      if (!/^[A-Za-z0-9_-]+$/.test(pageName)) return "";
      // Accepted pictures and rejected reviews both stay in the private
      // storybook_room bucket. This write uses the owner's token, so the
      // first folder must be their account. Upsert keeps one file per name:
      // the accepted picture, plus at most one original and one repair.
      const folder = input.review ? "reviews" : "pictures";
      const path = accountId + "/storybook/" + folder + "/" + String(input.creationKey || "") + "/" + pageName + ".jpg";
      const encoded = dataUrl.split(",")[1] || "";
      const bytes = Uint8Array.from(atob(encoded), function (ch) { return ch.charCodeAt(0); });
      const res = await fetch(storageUrl(base, "storybook_room", path), {
        method: "POST",
        headers: authHeaders(storedWith, token, {
          "Content-Type": "image/jpeg",
          "x-upsert": "true"
        }),
        body: bytes
      });
      if (!res.ok) return "";
      return input.review ? path : dataUrl;
    },
    finish: async function () {
      await writeJson(base, storedWith, token, accountId + "/storybook/shelf.json", store.readShelf(accountId));
      const rows = jobs.entries();
      const ids = Object.keys(rows);
      for (let i = 0; i < ids.length; i++) {
        const row = rows[ids[i]];
        if (!row || !row.creationKey) continue;
        await writeJson(base, storedWith, token, accountId + "/storybook/jobs/" + row.creationKey + ".json", row);
      }
    }
  };
}
