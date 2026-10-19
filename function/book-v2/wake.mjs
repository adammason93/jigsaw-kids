/* Scheduled wake. index.ts checks the automatic flag and the dedicated wake
   secret before this module is imported. This file repeats those checks,
   lists only the one account named by the paid secret, and runs the injected
   step only after a claim. The wake secret is not a storage credential. */

import Wake from "./engine.mjs";
const { paidJobAllowed } = await import("./allow.mjs");

function envRead(envGet, name) {
  try { return String(envGet(name) || ""); } catch (_error) { return ""; }
}

export async function listAccountJobs(envGet, fetchImpl) {
  const account = envRead(envGet, "BOOK_V2_PAID_ACCOUNT").trim();
  const base = envRead(envGet, "SUPABASE_URL").replace(/\/$/, "");
  const service = envRead(envGet, "SUPABASE_SERVICE_ROLE_KEY");
  if (!account || !base || !service) return [];
  try {
  const fetcher = fetchImpl || fetch;
  const listed = await fetcher(base + "/storage/v1/object/list/storybook_room", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + service,
      apikey: service,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix: account + "/storybook/jobs/", limit: 100 })
  });
  if (!listed || !listed.ok) return [];
  const rows = await listed.json();
  const names = (Array.isArray(rows) ? rows : []).map(function (row) {
    return String(row && row.name || "");
  }).filter(function (name) { return name.slice(-5) === ".json"; });
  const jobs = [];
  for (const name of names) {
    const key = name.replace(/\.json$/, "");
    const response = await fetcher(
      base + "/storage/v1/object/storybook_room/" + account + "/storybook/jobs/" + encodeURIComponent(name) + "?t=" + Date.now(),
      { headers: { Authorization: "Bearer " + service, apikey: service, "Cache-Control": "no-cache" } }
    );
    if (!response || !response.ok) continue;
    const job = await response.json();
    if (!job || String(job.accountId || "") !== account || String(job.creationKey || "") !== key) continue;
    jobs.push(job);
  }
  return jobs;
  } catch (_error) {
    return [];
  }
}

function memoryStore(jobs) {
  const versions = new Map();
  jobs.forEach(function (job, index) {
    versions.set(index, { version: 1, job: job });
  });
  return {
    list: function () {
      return jobs.map(function (_job, index) { return index; });
    },
    read: function (index) {
      const row = versions.get(index);
      return row ? { version: row.version, job: JSON.parse(JSON.stringify(row.job)) } : null;
    },
    compareAndSet: function (index, version, job) {
      const row = versions.get(index);
      if (!row) return false;
      if (version != null && version !== row.version) return false;
      row.version += 1;
      row.job = JSON.parse(JSON.stringify(job));
      return true;
    }
  };
}

function secretsFrom(envGet) {
  return {
    accountId: envRead(envGet, "BOOK_V2_PAID_ACCOUNT").trim(),
    creationKey: envRead(envGet, "BOOK_V2_PAID_STORY").trim(),
    budgetUsd: envRead(envGet, "BOOK_V2_PAID_BUDGET_USD"),
    selfService: envRead(envGet, "BOOK_V2_PAID_SELF_SERVICE")
  };
}

export function sameSecret(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  const length = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0 && a.length >= 32;
}

export function admission(envGet, token) {
  if (envRead(envGet, "BOOK_V2_AUTO") !== "on") {
    return { ok: false, status: 403, reason: "automatic-generation-off" };
  }
  const expected = envRead(envGet, "BOOK_V2_WAKE_SECRET").trim();
  const presented = String(token || "").trim();
  if (!sameSecret(expected, presented)) {
    return { ok: false, status: 401, reason: "wake-not-authorised" };
  }
  const account = envRead(envGet, "BOOK_V2_PAID_ACCOUNT").trim();
  if (!account) return { ok: false, status: 403, reason: "automatic-generation-off" };
  return { ok: true, account: account };
}

export async function runScheduledPass(options) {
  const opts = options || {};
  const envGet = opts.envGet || ((name) => Deno.env.get(name));
  const admitted = admission(envGet, opts.wakeSecret);
  if (!admitted.ok) {
    return { status: admitted.status, body: { ok: false, generated: false, reason: admitted.reason } };
  }
  const listed = !Array.isArray(opts.jobs);
  const jobs = listed ? await listAccountJobs(envGet, opts.fetch) : opts.jobs;
  const now = Number(opts.now) || Date.now();
  const secrets = secretsFrom(envGet);
  const preparedPorts = new Map();
  const store = opts.store || (listed ? storageStore(envGet, opts.fetch, jobs) : memoryStore(jobs));
  const result = await Wake.pass(store, now, {
    automatic: true,
    permit: function (job) {
      if (String(job.accountId || "") !== secrets.accountId) return { ok: false, reason: "wrong-account" };
      const kind = String(job.accountKind || (job.auto && job.auto.accountKind) || "");
      if (kind !== "adult") return { ok: false, reason: "not-adult" };
      return paidJobAllowed({
        accountId: job.accountId,
        accountKind: "adult",
        creationKey: job.creationKey,
        secrets: secrets
      });
    },
    claimOperation: opts.claimOperation,
    confirmOperation: opts.confirmOperation,
    holdOperation: opts.holdOperation,
    prepare: typeof opts.step === "function" ? opts.prepare : async function (job) {
      const ready = await prepareScheduledStep(job, envGet);
      if (!ready.ok) return { ok: false, reason: ready.reason || "paid-generation-not-approved" };
      if (job.auto && job.auto.claimOwner) preparedPorts.set(job.auto.claimOwner, ready.ports);
      return { ok: true };
    },
    step: typeof opts.step === "function" ? opts.step : async function (job, decision) {
      const ports = job.auto && preparedPorts.get(job.auto.claimOwner);
      return connectedStep(job, decision, envGet, ports);
    }
  });
  return {
    status: 200,
    body: {
      ok: true,
      generated: false,
      woke: result.ran === true,
      reason: result.reason || "",
      operationId: result.operationId || ""
    }
  };
}

export function staleCheckpoint(current, job) {
  if (!current || !current.auto || !job || !job.auto) return false;
  const storedDone = Array.isArray(current.auto.completed) ? current.auto.completed : [];
  const nextDone = Array.isArray(job.auto.completed) ? job.auto.completed : [];
  if (storedDone.length > nextDone.length) return true;
  /* While a stamp is in flight, another owner cannot replace it or clear it. */
  if (current.auto.inflight && current.auto.claimOwner && job.auto.claimOwner && current.auto.claimOwner !== job.auto.claimOwner) {
    return true;
  }
  if (current.auto.inflight && job.auto.inflight && current.auto.inflight !== job.auto.inflight) return true;
  return false;
}

export function stepSettled(before, stored) {
  if (!stored) return false;
  const reason = String(stored.reason || "");
  if (stored.status === "complete" || reason === "saved") return true;
  const sum = function (job) {
    const calls = job && job.calls || {};
    return (Number(calls.text) || 0) + (Number(calls.image) || 0) + (Number(calls.vision) || 0);
  };
  if (sum(stored) > sum(before)) return true;
  const settled = function (job) {
    const spend = job && (job.checkpoint && job.checkpoint.spend || job.spend) || {};
    const entries = Array.isArray(spend.entries) ? spend.entries : [];
    return entries.filter(function (entry) { return entry && entry.status === "settled"; }).length;
  };
  return settled(stored) > settled(before);
}

function jobPath(account, creationKey) {
  return account + "/storybook/jobs/" + creationKey + ".json";
}

function objectUrl(base, path) {
  return base + "/storage/v1/object/storybook_room/" + path.split("/").map(encodeURIComponent).join("/");
}

async function readStored(envGet, fetchImpl, account, creationKey) {
  const base = envRead(envGet, "SUPABASE_URL").replace(/\/$/, "");
  const service = envRead(envGet, "SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !service) return null;
  const response = await (fetchImpl || fetch)(
    objectUrl(base, jobPath(account, creationKey)) + "?t=" + Date.now(),
    { headers: { Authorization: "Bearer " + service, apikey: service, "Cache-Control": "no-cache" } }
  );
  if (!response || !response.ok) return null;
  try { return await response.json(); } catch (_error) { return null; }
}

async function writeStored(envGet, fetchImpl, account, creationKey, job) {
  const base = envRead(envGet, "SUPABASE_URL").replace(/\/$/, "");
  const service = envRead(envGet, "SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !service) return false;
  const response = await (fetchImpl || fetch)(objectUrl(base, jobPath(account, creationKey)), {
    method: "POST",
    headers: {
      Authorization: "Bearer " + service,
      apikey: service,
      "Content-Type": "application/json",
      "x-upsert": "true",
      "Cache-Control": "no-cache"
    },
    body: JSON.stringify(job)
  });
  return !!(response && response.ok);
}

function storageStore(envGet, fetchImpl, jobs) {
  const versions = new Map();
  jobs.forEach(function (job, index) {
    versions.set(index, 1);
  });
  return {
    list: function () {
      return jobs.map(function (_job, index) { return index; });
    },
    read: async function (index) {
      const known = jobs[index];
      if (!known) return null;
      const job = await readStored(envGet, fetchImpl, known.accountId, known.creationKey) || known;
      return { version: versions.get(index) || 1, job: job };
    },
    compareAndSet: async function (index, version, job) {
      const current = versions.get(index) || 1;
      if (version != null && version !== current) return false;
      const account = String(job.accountId || "");
      const key = String(job.creationKey || "");
      if (!account || !key || account !== envRead(envGet, "BOOK_V2_PAID_ACCOUNT").trim()) return false;
      const currentJob = await readStored(envGet, fetchImpl, account, key);
      if (staleCheckpoint(currentJob, job)) return false;
      const token = crypto.randomUUID();
      const stamped = JSON.parse(JSON.stringify(job));
      stamped.auto = Object.assign({}, stamped.auto || {}, { wakeToken: token });
      const wrote = await writeStored(envGet, fetchImpl, account, key, stamped);
      if (!wrote) return false;
      const check = await readStored(envGet, fetchImpl, account, key);
      if (!check || !check.auto || check.auto.wakeToken !== token) return false;
      versions.set(index, current + 1);
      jobs[index] = check;
      return true;
    }
  };
}

function scheduledRequest(service) {
  return {
    headers: {
      get: function (name) {
        return String(name || "").toLowerCase() === "authorization" ? "Bearer " + service : "";
      }
    }
  };
}

/* The website continues by sending the shelf plan's saved resume. The
   scheduler has no browser payload, so it rebuilds that same request from the
   stored plan. A missing or thinner record is not a new story. */
export async function savedContinuation(shelf, job) {
  await import("./handle.mjs");
  const key = String(job && job.creationKey || "");
  const account = String(job && job.accountId || "");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key) || !account) return null;
  const books = Array.isArray(shelf) ? shelf : [];
  let saved = null;
  for (let index = 0; index < books.length; index += 1) {
    const book = books[index];
    if (!book || String(book.creationKey || "") !== key) continue;
    const owner = String(book.ownerUserId || book.ownerId || "");
    if (owner && owner !== account) continue;
    if (book.generated === true || book.recordKind === "book") continue;
    if (!book.resume || typeof book.resume !== "object") continue;
    saved = book.resume;
  }
  if (!saved || String(saved.creationKey || "") !== key) return null;
  const idea = String(saved.idea || "").trim();
  const place = String(saved.place || "");
  const length = String(saved.length || "");
  const theme = String(saved.theme || "");
  const age = String(saved.familyAgeBand || "");
  const members = Array.isArray(saved.members) ? saved.members : [];
  if (!idea || !place || !length || !theme || !age) return null;
  if (!members.length || members.some(function (member) {
    return !member || !member.id || !member.name || !member.source;
  })) return null;
  const shelfApi = globalThis.WondiiBookV2Shelf;
  const continueRequest = shelfApi && shelfApi.continueRequest;
  if (typeof continueRequest !== "function") return null;
  const body = continueRequest(saved);
  if (!body) return null;
  /* Defaults inside the website helper must not rewrite a saved choice. */
  if (body.idea !== idea || body.place !== place || body.length !== length || body.theme !== theme || body.familyAgeBand !== age) return null;
  if (body.creationKey !== key || body.continueJob !== true || body.approveGeneration !== false) return null;
  body.accountId = account;
  body.accountKind = "adult";
  body.automaticWake = true;
  delete body.automatic;
  return body;
}

/* Read the saved job before any database claim. Not approved means the
   provider must not be contacted. */
export async function prepareScheduledStep(job, envGet) {
  const read = envGet || ((name) => Deno.env.get(name));
  const provider = await import("./provider.mjs");
  const service = envRead(read, "SUPABASE_SERVICE_ROLE_KEY");
  const ports = await provider.portsFor(scheduledRequest(service), {
    accountId: job.accountId,
    accountKind: "adult",
    creationKey: job.creationKey,
    consent: false
  });
  if (!ports || ports.approved !== true) {
    return { ok: false, reason: "paid-generation-not-approved" };
  }
  const context = await savedContinuation(ports.store && ports.store.readShelf(job.accountId), job);
  if (!context) return { ok: false, reason: "saved-context-missing" };
  ports.continuation = context;
  ports.automatic = envRead(read, "BOOK_V2_AUTO") === "on";
  return { ok: true, ports: ports };
}

/* Used only after index.ts has accepted a wake and prepareScheduledStep has
   approved this job. Tests pass their own step and do not call this. */
export async function connectedStep(job, _decision, envGet, prepared) {
  const read = envGet || ((name) => Deno.env.get(name));
  const loaded = await import("./handle.mjs");
  const handle = loaded && loaded.default;
  if (!handle || typeof handle.handleBookV2 !== "function") {
    return { skipped: true, preProvider: true, reason: "handler-unavailable" };
  }
  let ports = prepared || null;
  if (!ports) {
    const ready = await prepareScheduledStep(job, read);
    if (!ready.ok) return { skipped: true, preProvider: true, reason: ready.reason || "paid-generation-not-approved" };
    ports = ready.ports;
  }
  if (!ports || ports.approved !== true) {
    return { skipped: true, preProvider: true, reason: "paid-generation-not-approved" };
  }
  const context = await savedContinuation(ports.store && ports.store.readShelf(job.accountId), job);
  if (!context) return { skipped: true, preProvider: true, reason: "saved-context-missing" };
  await handle.handleBookV2(context, ports);
  let stored = null;
  if (ports.jobs && typeof ports.jobs.read === "function") {
    stored = await ports.jobs.read(job.accountId, job.creationKey);
  }
  if (!stored) stored = await readStored(read, fetch, job.accountId, job.creationKey);
  const reason = String(stored && stored.reason || "");
  if (!stored) return { settled: false, reason: "uncertain", preserve: true };
  if (stepSettled(job, stored)) return { settled: true, job: stored };
  /* A continue checkpoint that did not add a settled call is not this wake's
     completed operation. Holding it stops another provider call. */
  return { settled: false, reason: reason === "continue" ? "uncertain" : (reason || "uncertain"), preserve: true, job: stored };
}
