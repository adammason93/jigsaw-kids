import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import handle from "./handle.mjs";
import { readPublishableKey } from "../_shared/service-key.mjs";
import { authorCredit, paidJobAllowed } from "./allow.mjs";
/* Book V2. The bundled handler plans a story without a provider key.
   Paid writing needs server secrets: one adult account and a budget.
   A single story key still limits a controlled test. Self-service for
   that account starts only when BOOK_V2_PAID_SELF_SERVICE is exactly "on".
   Empty secrets keep every account on the unpaid path.
   A browser request cannot set those secrets, and a new book also needs
   the parent's own approval before any paid call starts. */ function allowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  if (/^https:\/\/([a-z0-9-]+\.)?wondii\.co\.uk$/i.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return origin;
  return "";
}
function json(req, body, status) {
  const origin = allowedOrigin(req);
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, content-type, apikey";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}
function publicJob(job) {
  const copy = Object.assign({}, job || {});
  const checkpoint = copy.checkpoint && typeof copy.checkpoint === "object" ? copy.checkpoint : {};
  const writer = checkpoint.writer && typeof checkpoint.writer === "object" ? checkpoint.writer : {};
  const writerStage = typeof writer.stage === "string" ? writer.stage : "";
  const pictures = checkpoint.pictures && typeof checkpoint.pictures === "object" ? checkpoint.pictures : {};
  let acceptedPictures = 0;
  let pendingPicture = "";
  let pendingKind = "";
  for (const [id, picture] of Object.entries(pictures)){
    if (!picture || typeof picture !== "object") continue;
    const row = picture;
    if (row.accepted === true) acceptedPictures += 1;
    const pending = typeof row.pending === "string" ? row.pending : "";
    if (pending && row.accepted !== true) {
      pendingPicture = id;
      pendingKind = pending;
    }
  }
  const story = checkpoint.story && typeof checkpoint.story === "object" ? checkpoint.story : {};
  const storyPageCount = Array.isArray(story.pages) ? story.pages.length : 0;
  const composition = story.composition && typeof story.composition === "object" ? story.composition : {};
  const illustrationUnits = Array.isArray(composition.units) ? composition.units.length : 0;
  const physicalPages = Array.isArray(composition.leaves) ? composition.leaves.length : 0;
  delete copy.checkpoint;
  if (writerStage && !copy.writerStage) copy.writerStage = writerStage;
  if (acceptedPictures && !copy.acceptedPictures) copy.acceptedPictures = acceptedPictures;
  if (storyPageCount && !copy.storyPageCount) copy.storyPageCount = storyPageCount;
  if (illustrationUnits && !copy.illustrationUnits) copy.illustrationUnits = illustrationUnits;
  if (physicalPages && !copy.physicalPages) copy.physicalPages = physicalPages;
  if (pendingPicture && !copy.pendingPicture) {
    copy.pendingPicture = pendingPicture;
    copy.pendingKind = pendingKind;
  }
  const auto = copy.auto && typeof copy.auto === "object" ? copy.auto : null;
  const automaticOn = (Deno.env.get("BOOK_V2_AUTO") || "") === "on";
  copy.automaticResume = automaticOn && !!auto && auto.authorised === true && auto.revoked !== true && auto.accountKind === "adult";
  if (auto) {
    copy.auto = {
      authorised: auto.authorised === true,
      revoked: auto.revoked === true,
      accountKind: typeof auto.accountKind === "string" ? auto.accountKind : "",
      budgetUsd: auto.budgetUsd
    };
  }
  delete copy.automatic;
  return copy;
}
async function readOwnJob(req, userId, creationKey) {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(creationKey)) return null;
  const base = Deno.env.get("SUPABASE_URL") || "";
  const clientKey = readPublishableKey((name)=>Deno.env.get(name)).key || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!base || !clientKey || !token) return null;
  const url = base.replace(/\/$/, "") + "/storage/v1/object/storybook_room/" + userId + "/storybook/jobs/" + creationKey + ".json?t=" + Date.now();
  const res = await fetch(url, {
    headers: {
      apikey: clientKey,
      Authorization: "Bearer " + token,
      "Cache-Control": "no-cache"
    }
  });
  if (!res.ok) return null;
  try {
    const job = await res.json();
    return job && typeof job === "object" ? publicJob(job) : null;
  } catch (_error) {
    return null;
  }
}
async function signedInUser(req) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const clientKey = readPublishableKey((name)=>Deno.env.get(name)).key || anon;
  const header = req.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!url || !clientKey || !token || token === anon || token === clientKey) return {
    id: "",
    accountKind: ""
  };
  const client = createClient(url, clientKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
  const result = await client.auth.getUser(token);
  const user = result.data && result.data.user;
  if (result.error || !user || !user.id) return {
    id: "",
    accountKind: ""
  };
  const meta = user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {};
  return {
    id: String(user.id),
    accountKind: String(meta.account_kind || "")
  };
}
/* Automatic continuation stays off unless BOOK_V2_AUTO is exactly "on".
   The wake header only selects this path. The dedicated wake secret is not
   permission to spend, and it is not the storage credential. */ function sameWakeSecret(left, right) {
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for(let index = 0; index < length; index += 1){
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0 && left.length >= 32;
}
async function scheduledWake(req) {
  if ((Deno.env.get("BOOK_V2_AUTO") || "") !== "on") {
    return json(req, {
      ok: false,
      generated: false,
      reason: "automatic-generation-off"
    }, 403);
  }
  const presented = (req.headers.get("x-wondii-wake-secret") || "").trim();
  const expected = (Deno.env.get("BOOK_V2_WAKE_SECRET") || "").trim();
  if (!sameWakeSecret(expected, presented)) {
    return json(req, {
      ok: false,
      generated: false,
      reason: "wake-not-authorised"
    }, 401);
  }
  const wake = await import("./wake.mjs");
  const provider = await import("./provider.mjs");
  const accountId = Deno.env.get("BOOK_V2_PAID_ACCOUNT") || "";
  const base = Deno.env.get("SUPABASE_URL") || "";
  const result = await wake.runScheduledPass({
    now: Date.now(),
    wakeSecret: presented,
    claimOperation: function(operationId, owner) {
      const creationKey = String(operationId || "").split(":")[0];
      return provider.claimPaidOperation(base, accountId, creationKey, operationId, owner);
    },
    confirmOperation: function(operationId, owner) {
      return provider.confirmPaidOperation(base, operationId, owner);
    },
    holdOperation: function(operationId, owner) {
      return provider.holdPaidOperation(base, operationId, owner);
    }
  });
  return json(req, result.body, result.status || 200);
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    const origin = allowedOrigin(req);
    const headers = {};
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Headers"] = "authorization, content-type, apikey";
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
      headers.Vary = "Origin";
    }
    return new Response(null, {
      status: 204,
      headers
    });
  }
  if (req.method !== "POST") {
    return json(req, {
      ok: false,
      message: "Book V2 is not on this path."
    }, 404);
  }
  if (req.headers.get("x-wondii-scheduled-wake") === "1") {
    return scheduledWake(req);
  }
  let user = {
    id: "",
    accountKind: ""
  };
  try {
    user = await signedInUser(req);
  } catch (_error) {
    user = {
      id: "",
      accountKind: ""
    };
  }
  if (!user.id) {
    return json(req, {
      ok: false,
      message: "Sign in again before this story can be planned. Nothing was saved."
    }, 401);
  }
  let body = {};
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return json(req, {
      ok: false,
      message: "The story request could not be read."
    }, 400);
  }
  body.accountId = user.id;
  body.authorDisplay = authorCredit(body.authorDisplay);
  delete body.budgetUsd;
  if (user.accountKind === "child" || user.accountKind === "adult") body.accountKind = user.accountKind;
  if (user.accountKind === "child") {
    body.childPermitted = false;
    body.allowanceReserved = false;
  }
  if (body.watch === true) {
    const watched = await readOwnJob(req, user.id, String(body.creationKey || ""));
    return json(req, {
      ok: true,
      watch: true,
      generated: false,
      accountId: user.id,
      job: watched,
      message: watched && watched.message ? watched.message : "The story progress was read. No new writing was started."
    }, 200);
  }
  /* Reject an unusable cast before the 202 accept. Otherwise the page only
     learns that no job appeared, and shows a progress error with no reason. */ if (body.approveGeneration === true || body.continueJob === true) {
    const inspected = typeof handle.inspectBookV2 === "function" ? handle.inspectBookV2(body) : {
      ok: true
    };
    if (!inspected.ok) {
      return json(req, {
        ...inspected.body || {},
        accountId: user.id
      }, inspected.status || 400);
    }
  }
  const paid = paidJobAllowed({
    accountId: user.id,
    accountKind: user.accountKind,
    creationKey: body.creationKey,
    secrets: {
      accountId: Deno.env.get("BOOK_V2_PAID_ACCOUNT") || "",
      creationKey: Deno.env.get("BOOK_V2_PAID_STORY") || "",
      budgetUsd: Deno.env.get("BOOK_V2_PAID_BUDGET_USD") || "",
      selfService: Deno.env.get("BOOK_V2_PAID_SELF_SERVICE") || ""
    }
  });
  let ports;
  if (paid.ok) {
    const provider = await import("./provider.mjs");
    ports = await provider.portsFor(req, {
      accountId: user.id,
      accountKind: user.accountKind,
      creationKey: String(body.creationKey || ""),
      budgetUsd: paid.budgetUsd,
      consent: body.approveGeneration === true
    });
    if (!ports || ports.approved !== true) ports = undefined;
    /* A browser field named automatic is not permission. Only this server flag is. */ if (ports) ports.automatic = (Deno.env.get("BOOK_V2_AUTO") || "") === "on";
  }
  const work = Promise.resolve(handle.handleBookV2(body, ports)).then(async (result)=>{
    if (ports && typeof ports.finish === "function") {
      try {
        await ports.finish();
      } catch (_error) {}
    }
    return result;
  });
  const background = paid.ok && ports && body.background === true;
  const edge = globalThis.EdgeRuntime;
  if (background && edge && typeof edge.waitUntil === "function") {
    edge.waitUntil(work);
    return json(req, {
      ok: true,
      accepted: true,
      background: true,
      generated: false,
      accountId: user.id,
      message: "The story is being made. This page can check its progress."
    }, 202);
  }
  const result = await work;
  const planned = result.body && typeof result.body === "object" ? result.body : {};
  const userId = user.id;
  return json(req, {
    ...planned,
    accountId: userId
  }, result.status);
});
