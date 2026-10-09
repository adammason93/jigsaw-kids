import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sharedCacheMayStore } from "../js/child-library-rules.mjs";
import { handleChildArt, parseLibraryObject } from "../supabase/functions/child-art/handler.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHILD = "863ea310-302c-42d5-b139-0906124b3641";
const SIBLING = "998cb1a3-6bc6-46a7-abd3-d2209b965720";
const SHARE = "e7d4e450-2e5a-44af-a6bb-1d6afbf51c9f";
const PNG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const env = {
  supabaseUrl: "https://example.supabase.co",
  anonKey: "anon-test-key",
  serviceKey: "service-test-key"
};

function request(objectPath, token, query) {
  return new Request("https://example.supabase.co/functions/v1/child-art/" + objectPath + (query || ""), {
    method: "GET",
    headers: {
      origin: "https://www.wondii.co.uk",
      ...(token ? { Authorization: "Bearer " + token } : {})
    }
  });
}

function world(state) {
  const calls = [];
  const fetchImpl = (url, init) => {
    const target = String(url);
    calls.push({ url: target, init: init || {} });
    if (target.endsWith("/child_content_access")) {
      return Promise.resolve(new Response(JSON.stringify(state.access || {}), { status: state.accessStatus || 200 }));
    }
    if (target.endsWith("/child_home")) return Promise.resolve(Response.json(state.home));
    if (target.endsWith("/parent_child_activity")) {
      return Promise.resolve(new Response(JSON.stringify(state.parentBody || {}), { status: state.parentStatus || 200 }));
    }
    if (target.indexOf("/storage/v1/object/child_library/") !== -1) {
      if (state.storageStatus && state.storageStatus !== 200) {
        return Promise.resolve(new Response("no", { status: state.storageStatus }));
      }
      const headers = {
        "Content-Type": state.contentType || "image/png",
        "Cache-Control": "public, max-age=3600"
      };
      if (state.cacheStatus) headers["cf-cache-status"] = state.cacheStatus;
      return Promise.resolve(new Response(PNG, { status: 200, headers: headers }));
    }
    return Promise.resolve(new Response("unexpected", { status: 500 }));
  };
  return { calls: calls, fetchImpl: fetchImpl };
}

function storageCalls(calls) {
  return calls.filter((call) => call.url.indexOf("/storage/v1/object/") !== -1);
}

function rpcNames(calls) {
  return calls.map((call) => call.url.split("/").pop());
}

async function bodyBytes(res) {
  return new Uint8Array(await res.arrayBuffer());
}

function assertPrivate(res) {
  const cache = res.headers.get("Cache-Control") || "";
  assert.equal(sharedCacheMayStore(cache), false);
  assert.match(cache, /private/);
  assert.match(cache, /no-store/);
  assert.equal(cache.includes("public"), false);
  assert.equal(cache.includes("3600"), false);
  assert.equal(res.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(res.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  assert.equal(res.headers.get("Surrogate-Control"), "no-store");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://www.wondii.co.uk");
}

function jwt(accountKind) {
  const payload = { role: "authenticated", app_metadata: accountKind ? { account_kind: accountKind } : {} };
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + body + ".sig";
}

const childJwt = jwt("child");
const parentJwt = jwt("");

function assertServiceFetch(call) {
  const nonce = new URL(call.url).searchParams.get("cacheNonce");
  assert.equal(call.init.cache, "no-store");
  assert.equal(call.init.redirect, "manual");
  assert.equal(call.init.headers.Authorization, "Bearer service-test-key");
  assert.equal(call.init.headers.apikey, "service-test-key");
  assert.equal(call.url.includes("/object/public/"), false);
  assert.match(nonce, /^[0-9a-f]{32}$/);
  assert.equal(call.init.headers.Authorization.includes(childJwt), false);
}

const picture = CHILD + "/books/b1791534140235-607078/p0.jpg";
const allowed = world({
  access: { allowed: true, childId: CHILD },
  home: { allowed: true, sharedBooks: [{ id: SHARE }], sharedCharacters: [] }
});
const ok = await handleChildArt(request(picture, "child-token"), env, allowed.fetchImpl);
assert.equal(ok.status, 200);
assert.equal(ok.headers.get("Content-Type"), "image/png");
assert.deepEqual(await bodyBytes(ok), PNG);
assertPrivate(ok);
assert.equal(storageCalls(allowed.calls).length, 1);
assertServiceFetch(storageCalls(allowed.calls)[0]);
assert.equal(allowed.calls[0].init.headers.Authorization, "Bearer child-token");
assert.equal(allowed.calls[0].init.headers.apikey, "anon-test-key");
assert.equal(JSON.stringify(allowed.calls).includes("service-test-key"), true);
assert.equal(ok.headers.get("Cache-Control").includes("service-test-key"), false);

const shapes = [
  CHILD + "/books/b1791534140235-607078.json",
  CHILD + "/books/b1791534140235-607078.original.json",
  CHILD + "/books/b1791534140235-607078/cover.jpg",
  CHILD + "/characters/char_mv0oz1m7_djnp3va3.png",
  CHILD + "/shared/" + SHARE + "/book.json",
  CHILD + "/shared/" + SHARE + "/p0.jpg"
];
for (const objectPath of shapes) {
  const hosted = world({
    access: { allowed: true, childId: CHILD },
    home: { allowed: true, sharedBooks: [{ id: SHARE }], sharedCharacters: [{ id: SHARE }] },
    contentType: objectPath.endsWith(".json") ? "application/json" : "image/jpeg"
  });
  const res = await handleChildArt(request(objectPath, "child-token"), env, hosted.fetchImpl);
  assert.equal(res.status, 200, objectPath);
  assert.equal(new URL(storageCalls(hosted.calls)[0].url).pathname.endsWith("/" + objectPath), true, objectPath);
  assertPrivate(res);
}

let revoked = false;
const repeatCalls = [];
const repeatFetch = (url, init) => {
  repeatCalls.push({ url: String(url), init: init || {} });
  if (String(url).endsWith("/child_content_access")) {
    return Promise.resolve(Response.json(revoked
      ? { allowed: false, reason: "device_revoked" }
      : { allowed: true, childId: CHILD }));
  }
  if (String(url).indexOf("/storage/v1/object/child_library/") !== -1) {
    return Promise.resolve(new Response(PNG, {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" }
    }));
  }
  return Promise.resolve(new Response("no", { status: 403 }));
};
const firstReq = request(picture, "child-token");
const secondReq = request(picture, "child-token");
const thirdReq = request(picture, "child-token", "?fresh=1");
const first = await handleChildArt(firstReq, env, repeatFetch);
revoked = true;
const second = await handleChildArt(secondReq, env, repeatFetch);
const third = await handleChildArt(thirdReq, env, repeatFetch);
assert.equal(first.status, 200);
assert.deepEqual(await bodyBytes(first), PNG);
assert.equal(second.status, 403);
assert.equal(third.status, 403);
const secondBody = await second.text();
const thirdBody = await third.text();
assert.equal(secondBody.includes("PNG"), false);
assert.equal(secondBody.includes(String.fromCharCode(137)), false);
assert.match(secondBody, /device_revoked/);
assert.match(thirdBody, /device_revoked/);
assertPrivate(second);
assertPrivate(third);
assert.equal(storageCalls(repeatCalls).length, 1);
assert.equal(firstReq.url, secondReq.url);
assert.equal(new URL(thirdReq.url).pathname, new URL(firstReq.url).pathname);

const revokedWorld = world({ access: { allowed: false, reason: "device_revoked" } });
const revokedRes = await handleChildArt(request(picture, "child-token"), env, revokedWorld.fetchImpl);
assert.equal(revokedRes.status, 403);
assert.match(await revokedRes.text(), /device_revoked/);
assert.equal(storageCalls(revokedWorld.calls).length, 0);
assert.equal(rpcNames(revokedWorld.calls).includes("parent_child_activity"), false);

const suspended = world({ access: { allowed: false, reason: "profile_unavailable" } });
const suspendedRes = await handleChildArt(request(picture, "child-token"), env, suspended.fetchImpl);
assert.equal(suspendedRes.status, 403);
assert.match(await suspendedRes.text(), /profile_unavailable/);
assert.equal(storageCalls(suspended.calls).length, 0);

const contentOffChild = world({
  access: { allowed: false, reason: "unavailable" },
  parentStatus: 200,
  parentBody: { childId: CHILD }
});
const contentOffRes = await handleChildArt(request(picture, childJwt), env, contentOffChild.fetchImpl);
assert.equal(contentOffRes.status, 403);
assert.match(await contentOffRes.text(), /unavailable/);
assert.equal(storageCalls(contentOffChild.calls).length, 0);
assert.equal(rpcNames(contentOffChild.calls).includes("parent_child_activity"), false);

const expired = world({
  accessStatus: 401,
  access: { allowed: true, childId: CHILD, reason: "unavailable" }
});
const expiredRes = await handleChildArt(request(picture, childJwt), env, expired.fetchImpl);
assert.equal(expiredRes.status, 401);
assert.equal(expired.calls.length, 1);
assert.equal(rpcNames(expired.calls)[0], "child_content_access");
assert.equal(storageCalls(expired.calls).length, 0);

const contentOffParent = world({
  access: { allowed: false, reason: "unavailable" },
  parentStatus: 200,
  parentBody: { childId: CHILD }
});
const parentOffRes = await handleChildArt(request(picture, parentJwt), env, contentOffParent.fetchImpl);
assert.equal(parentOffRes.status, 200);
assert.deepEqual(await bodyBytes(parentOffRes), PNG);
assertPrivate(parentOffRes);
assertServiceFetch(storageCalls(contentOffParent.calls)[0]);

const parent = world({
  access: { allowed: false, reason: "not_child" },
  parentStatus: 200,
  parentBody: { childId: CHILD }
});
const parentRes = await handleChildArt(request(CHILD + "/shared/" + SHARE + "/cover.jpg", "parent-token"), env, parent.fetchImpl);
assert.equal(parentRes.status, 200);
assert.equal(rpcNames(parent.calls).includes("child_home"), false);
assert.equal(storageCalls(parent.calls).length, 1);

const sibling = world({ access: { allowed: true, childId: CHILD } });
const siblingRes = await handleChildArt(request(SIBLING + "/characters/char_mv0oz1m7_djnp3va3.png", "child-token"), env, sibling.fetchImpl);
assert.equal(siblingRes.status, 403);
assert.match(await siblingRes.text(), /not_owner/);
assert.equal(storageCalls(sibling.calls).length, 0);
assert.equal(rpcNames(sibling.calls).includes("parent_child_activity"), false);

const otherFamily = world({
  access: { allowed: false, reason: "not_child" },
  parentStatus: 404,
  parentBody: { code: "P0002", message: "not_found" }
});
const otherRes = await handleChildArt(request(picture, "parent-b-token"), env, otherFamily.fetchImpl);
assert.equal(otherRes.status, 403);
assert.equal(storageCalls(otherFamily.calls).length, 0);

const school = world({
  access: { allowed: false, reason: "not_child" },
  parentStatus: 404,
  parentBody: { message: "not_found" }
});
const schoolRes = await handleChildArt(request(picture, "school-token"), env, school.fetchImpl);
assert.equal(schoolRes.status, 403);
assert.equal(storageCalls(school.calls).length, 0);

const anon = world({ access: { allowed: true, childId: CHILD } });
const anonRes = await handleChildArt(request(picture, ""), env, anon.fetchImpl);
assert.equal(anonRes.status, 401);
assert.equal(anon.calls.length, 0);
const anonKeyRes = await handleChildArt(request(picture, env.anonKey), env, anon.fetchImpl);
assert.equal(anonKeyRes.status, 401);
assert.equal(anon.calls.length, 0);
const serviceRes = await handleChildArt(request(picture, env.serviceKey), env, anon.fetchImpl);
assert.equal(serviceRes.status, 401);
assert.equal((await serviceRes.text()).includes("service-test-key"), false);
assert.equal(anon.calls.length, 0);

const shared = world({
  access: { allowed: true, childId: CHILD },
  home: { allowed: true, sharedBooks: [{ id: SHARE }], sharedCharacters: [{ id: SHARE }] }
});
const sharedRes = await handleChildArt(request(CHILD + "/shared/" + SHARE + "/p0.jpg", "child-token"), env, shared.fetchImpl);
assert.equal(sharedRes.status, 200);
assert.equal(new URL(storageCalls(shared.calls)[0].url).pathname.endsWith("/shared/" + SHARE + "/p0.jpg"), true);

const copied = ["book.json", "cover.jpg", "character.png", "p0.jpg", "p5.jpg"];
for (const name of copied) {
  const unshared = world({
    access: { allowed: true, childId: CHILD },
    home: { allowed: true, sharedBooks: [], sharedCharacters: [] }
  });
  const unsharedRes = await handleChildArt(request(CHILD + "/shared/" + SHARE + "/" + name, childJwt), env, unshared.fetchImpl);
  assert.equal(unsharedRes.status, 403, name);
  assert.match(await unsharedRes.text(), /not_shared/);
  assert.equal(storageCalls(unshared.calls).length, 0, name);
  assert.equal(rpcNames(unshared.calls).includes("parent_child_activity"), false, name);
}

const blockedPaths = [
  "../storybook_room/secret.jpg",
  CHILD + "/../../characters_room/secret.jpg",
  "%2e%2e/storybook_room/secret.jpg",
  "child_library/" + CHILD + "/books/a.jpg",
  CHILD + "/books/a/b/c.jpg",
  "storybook_room/" + CHILD + "/shelf.json"
];
for (const blocked of blockedPaths) {
  const gate = world({ access: { allowed: true, childId: CHILD } });
  const blockedRes = await handleChildArt(request(blocked, "child-token"), env, gate.fetchImpl);
  assert.equal(blockedRes.status, 400, blocked);
  assert.equal(gate.calls.length, 0, blocked);
  assertPrivate(blockedRes);
}

const foreignOrigin = new Request("https://example.supabase.co/functions/v1/child-art/" + picture, {
  method: "GET",
  headers: { Authorization: "Bearer child-token", origin: "https://evil.example" }
});
const foreign = world({ access: { allowed: true, childId: CHILD } });
const foreignRes = await handleChildArt(foreignOrigin, env, foreign.fetchImpl);
assert.equal(foreignRes.headers.get("Access-Control-Allow-Origin"), null);

const stale = world({ access: { allowed: true, childId: CHILD }, cacheStatus: "HIT" });
const staleRes = await handleChildArt(request(picture, childJwt), env, stale.fetchImpl);
assert.equal(staleRes.status, 502);
const staleText = await staleRes.text();
assert.equal(staleText.includes("PNG"), false);
assert.match(staleText, /unavailable/);
assert.equal(storageCalls(stale.calls).length, 1);

const firstNonce = new URL(storageCalls(allowed.calls)[0].url).searchParams.get("cacheNonce");
const secondRead = world({ access: { allowed: true, childId: CHILD }, cacheStatus: "MISS" });
const secondBytes = await handleChildArt(request(picture, childJwt), env, secondRead.fetchImpl);
assert.equal(secondBytes.status, 200);
assert.deepEqual(await bodyBytes(secondBytes), PNG);
const secondNonce = new URL(storageCalls(secondRead.calls)[0].url).searchParams.get("cacheNonce");
assert.notEqual(firstNonce, secondNonce);
assert.equal(new URL(request(picture, childJwt).url).searchParams.get("cacheNonce"), null);

const redirectWorld = world({ access: { allowed: true, childId: CHILD }, storageStatus: 302 });
const redirectRes = await handleChildArt(request(picture, "child-token"), env, redirectWorld.fetchImpl);
assert.equal(redirectRes.status, 502);
assert.equal((await redirectRes.text()).includes("PNG"), false);
assertPrivate(redirectRes);

const missingWorld = world({ access: { allowed: true, childId: CHILD }, storageStatus: 400 });
const missingRes = await handleChildArt(request(picture, "child-token"), env, missingWorld.fetchImpl);
assert.equal(missingRes.status, 404);
assertPrivate(missingRes);

const options = await handleChildArt(new Request("https://example.supabase.co/functions/v1/child-art/" + picture, {
  method: "OPTIONS",
  headers: { origin: "https://www.wondii.co.uk" }
}), env, world({}).fetchImpl);
assert.equal(options.status, 204);
assertPrivate(options);

const purgePaths = [
  CHILD + "/books/b1791534140235-607078.json",
  CHILD + "/books/b1791534140235-607078.original.json",
  CHILD + "/books/b1791534140235-607078/cover.jpg",
  CHILD + "/books/b1791534140235-607078/p0.jpg",
  CHILD + "/books/b1791534140235-607078/p1.jpg",
  CHILD + "/books/b1791534140235-607078/p2.jpg",
  CHILD + "/books/b1791534140235-607078/p3.jpg",
  CHILD + "/books/b1791534140235-607078/p4.jpg",
  CHILD + "/books/b1791534140235-607078/p5.jpg",
  CHILD + "/characters/char_mv0oz1m7_djnp3va3.png"
];
assert.equal(purgePaths.length, 10);
assert.equal(new Set(purgePaths).size, 10);
for (const objectPath of purgePaths) {
  assert.equal(parseLibraryObject(objectPath).objectPath, objectPath);
}

const hostedSelect = [
  ["Offer images: users select own folder", "((bucket_id = 'offer-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))"],
  ["Share cards: public read", "(bucket_id = 'share-cards'::text)"],
  ["Share items: public read", "(bucket_id = 'share-items'::text)"],
  ["characters_room_select_own", "((bucket_id = 'characters_room'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (NOT private.is_child()))"],
  ["characters_room_select_school", "((bucket_id = 'characters_room'::text) AND private.is_org_member(private.storage_school_id(name)) AND (NOT private.is_child()))"],
  ["child_library_child_read", "((bucket_id = 'child_library'::text) AND (split_part(name, '/'::text, 1) = private.session_child_folder()) AND ((split_part(name, '/'::text, 2) = ANY (ARRAY['books'::text, 'characters'::text])) OR ((split_part(name, '/'::text, 2) = 'shared'::text) AND private.child_share_visible(split_part(name, '/'::text, 3)))))"],
  ["child_library_parent_read", "((bucket_id = 'child_library'::text) AND private.parent_owns_child_folder(split_part(name, '/'::text, 1)))"],
  ["colouring_room_select_own", "((bucket_id = 'colouring_room'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (NOT private.is_child()))"],
  ["organisation_branding_read", "(bucket_id = 'organisation_branding'::text)"],
  ["storybook_images_public_select", "(bucket_id = 'storybook_images'::text)"],
  ["storybook_room_select_own", "((bucket_id = 'storybook_room'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text) AND (NOT private.is_child()))"],
  ["wondii_adventure_visuals_public_select", "(bucket_id = 'wondii_adventure_visuals'::text)"],
  ["wondii_catalogue_read", "(bucket_id = 'wondii_catalogue'::text)"]
];
function grantsChildLibrary(expr) {
  const names = [...String(expr).matchAll(/bucket_id = '([^']+)'/g)].map((match) => match[1]);
  if (!names.length) return true;
  return names.includes("child_library");
}
const stillGranting = hostedSelect.filter((row) => grantsChildLibrary(row[1]) && row[0] !== "child_library_child_read" && row[0] !== "child_library_parent_read");
assert.deepEqual(stillGranting, []);
assert.equal(hostedSelect.filter((row) => grantsChildLibrary(row[1])).length, 2);

const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008290000_child_library_direct_read_closed.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase/rollbacks/20261008290000_child_library_direct_read_closed.sql"), "utf8");
const config = fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8");
assert.match(sql, /drop policy if exists "child_library_child_read"/);
assert.match(sql, /drop policy if exists "child_library_parent_read"/);
assert.equal(sql.includes("child_library_parent_insert"), false);
assert.equal(sql.includes("child_library_child_delete"), false);
assert.equal(/update\s+storage\.objects/i.test(sql), false);
assert.equal(/update\s+private\.child_access_control/i.test(sql), false);
assert.equal(sql.includes("pairing_enabled = true"), false);
assert.equal(sql.includes("content_enabled = true"), false);
assert.match(rollback, /child_library_child_read/);
assert.match(rollback, /private\.session_child_folder\(\)/);
assert.match(rollback, /private\.parent_owns_child_folder/);
const artAt = config.indexOf("[functions.child-art]");
const artNext = config.indexOf("[functions.", artAt + 10);
assert.ok(artAt > 0 && artNext > artAt);
assert.match(config.slice(artAt, artNext), /verify_jwt = false/);
