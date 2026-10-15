/* Server-only Book V2 providers. Imported only when BOOK_V2_PAID_TEST is
   approved. The website never receives the provider key. This file calls the
   same story, picture, and vision endpoints already used by generate.js and
   visual-proof.js. It does not start a run by itself. */

import { createClient } from "npm:@supabase/supabase-js@2";
import { readPublishableKey } from "../_shared/service-key.mjs";
import { claimDecision } from "../clever-service/generation-allowance.mjs";

const TEXT_MODEL = "gpt-6.1-sol";
const IMAGE_MODEL = "gpt-image-2.5-sunburst";
const VISION_MODEL = "gpt-4o-mini";

function tokenOf(req) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function authHeaders(publishable, token, extra) {
  return Object.assign({
    apikey: publishable,
    Authorization: "Bearer " + token
  }, extra || {});
}

function storageUrl(base, bucket, path) {
  return base.replace(/\/$/, "") + "/storage/v1/object/" + bucket + "/" + path.split("/").map(encodeURIComponent).join("/");
}

async function readJson(base, publishable, token, path) {
  const res = await fetch(storageUrl(base, "storybook_room", path), {
    headers: authHeaders(publishable, token)
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
      "x-upsert": "true"
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
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await res.json();
  if (!res.ok) throw new Error("story");
  const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "";
  return JSON.parse(content);
}

async function drawImage(key, input) {
  const refs = (input && input.references || []).filter(function (row) { return row && row.bytes; });
  let res;
  if (refs.length) {
    const form = new FormData();
    form.append("model", IMAGE_MODEL);
    form.append("prompt", String(input.prompt || ""));
    refs.forEach(function (row) {
      const bytes = Uint8Array.from(atob(String(row.bytes)), function (ch) { return ch.charCodeAt(0); });
      form.append("image[]", new Blob([bytes], { type: "image/jpeg" }), row.characterId + ".jpg");
    });
    form.append("size", "1536x1024");
    form.append("quality", "medium");
    form.append("output_format", "jpeg");
    form.append("output_compression", "80");
    form.append("n", "1");
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form
    });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: String(input.prompt || ""),
        size: "1536x1024",
        quality: "medium",
        output_format: "jpeg",
        output_compression: 80,
        moderation: "auto",
        n: 1
      })
    });
  }
  const payload = await res.json();
  const b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!res.ok || !b64) throw new Error("picture");
  return "data:image/jpeg;base64," + b64;
}

async function inspectImage(key, input) {
  const image = String(input && input.image || "");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Check this children's book picture. Return JSON with characters, entities, locationMatch, momentMatch, textDetected, anatomyOk, textSafeUsable, duplicateCharacter and montageShown." },
          { type: "image_url", image_url: { url: image, detail: "low" } }
        ]
      }]
    })
  });
  const payload = await res.json();
  if (!res.ok) throw new Error("check");
  const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "";
  return JSON.parse(content);
}

export async function portsFor(req, accountId) {
  const key = String(Deno.env.get("OPENAI_API_KEY") || "");
  if (!key || !accountId) return { approved: false };
  const base = String(Deno.env.get("SUPABASE_URL") || "");
  const publishable = readPublishableKey(function (name) { return Deno.env.get(name); }).key || "";
  const token = tokenOf(req);
  if (!base || !publishable || !token) return { approved: false };
  let shelfBooks = [];
  try {
    const downloaded = await readJson(base, publishable, token, accountId + "/storybook/shelf.json");
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
  return {
    approved: true,
    model: TEXT_MODEL,
    store: store,
    jobs: {
      read: async function (userId, creationKey) {
        const cached = jobs.read(userId, creationKey);
        if (cached) return cached;
        if (userId !== accountId) return null;
        const prior = await readJson(base, publishable, token, accountId + "/storybook/jobs/" + creationKey + ".json");
        if (prior) jobs.write(userId, creationKey, prior);
        return prior;
      },
      write: function (userId, creationKey, job) { jobs.write(userId, creationKey, job); },
      claim: async function (userId, creationKey) {
        if (!jobs.read(userId, creationKey)) {
          const prior = await readJson(base, publishable, token, accountId + "/storybook/jobs/" + creationKey + ".json");
          if (prior) jobs.write(userId, creationKey, prior);
        }
        return jobs.claim(userId, creationKey);
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
          headers: authHeaders(publishable, token)
        });
        if (!res.ok) return { ok: false, reason: "missing" };
        return { ok: true, bytes: await encoded(res) };
      }
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
      const path = accountId + "/storybook/pictures/" + String(input.creationKey || "") + "/" + String(input.pageId || "") + ".jpg";
      const encoded = dataUrl.split(",")[1] || "";
      const bytes = Uint8Array.from(atob(encoded), function (ch) { return ch.charCodeAt(0); });
      const res = await fetch(storageUrl(base, "storybook_room", path), {
        method: "POST",
        headers: authHeaders(publishable, token, {
          "Content-Type": "image/jpeg",
          "x-upsert": "true"
        }),
        body: bytes
      });
      if (!res.ok) return "";
      return dataUrl;
    },
    finish: async function () {
      await writeJson(base, publishable, token, accountId + "/storybook/shelf.json", store.readShelf(accountId));
      const rows = jobs.entries();
      const ids = Object.keys(rows);
      for (let i = 0; i < ids.length; i++) {
        const row = rows[ids[i]];
        if (!row || !row.creationKey) continue;
        await writeJson(base, publishable, token, accountId + "/storybook/jobs/" + row.creationKey + ".json", row);
      }
    }
  };
}
