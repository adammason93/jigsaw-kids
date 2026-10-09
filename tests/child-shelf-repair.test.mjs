import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { copyableStorybookUrl, serviceWorkerMustBypass, storedFavourite } from "../js/child-library-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repair = fs.readFileSync(path.join(root, "supabase/migrations/20261008270000_child_shelf_and_share_repair.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase/rollbacks/20261008270000_child_shelf_and_share_repair.sql"), "utf8");
const appliedLibrary = fs.readFileSync(path.join(root, "supabase/migrations/20261008230000_child_library.sql"), "utf8");
const artwork = fs.readFileSync(path.join(root, "supabase/migrations/20261008240000_child_artwork.sql"), "utf8");
const library = fs.readFileSync(path.join(root, "js/child-library.js"), "utf8");
const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const family = fs.readFileSync(path.join(root, "js/family.js"), "utf8");
const cloud = fs.readFileSync(path.join(root, "js/score-cloud.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const CHILD = "863ea310-302c-42d5-b139-0906124b3641";
const PICTURE = "https://enuzrcjnrxwglacivlnu.supabase.co/storage/v1/object/public/storybook_images/gptimage/spread.png";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

assert.equal(storedFavourite({}), false);
assert.equal(storedFavourite({ title: "Lantern" }, true), true);
assert.equal(storedFavourite({ favourite: true }, false), true);
assert.equal(storedFavourite({ favourite: false }, true), false);
assert.equal(storedFavourite({ favourite: "true" }, false), true);
assert.equal(copyableStorybookUrl(PICTURE), true);
assert.equal(copyableStorybookUrl("https://example.com/a.png"), false);
assert.equal(copyableStorybookUrl("http://enuzrcjnrxwglacivlnu.supabase.co/storage/v1/object/public/storybook_images/a.png"), false);
assert.equal(serviceWorkerMustBypass(PICTURE), true);
assert.equal(serviceWorkerMustBypass("https://www.wondii.co.uk/games/jigsaw"), false);

assert.match(repair, /when item \? 'favourite' then coalesce\(\(item ->> 'favourite'\) = 'true', false\)/);
assert.match(repair, /else saved\.favourite/);
assert.equal(/\n\s+\(item ->> 'favourite'\) = 'true'\n/.test(repair), false);
assert.match(repair, /private\.child_shelf_block_reason\(cid, p_shelf\)/);
const blockAt = repair.indexOf("blocked := private.child_shelf_block_reason");
const mutateAt = repair.indexOf("update private.child_books");
assert.ok(blockAt > 0 && mutateAt > blockAt);
assert.match(repair, /v_source text := left\(btrim\(coalesce\(p_source, ''\)\), 80\)/);
assert.equal(repair.includes("source_id text"), false);
assert.match(repair, /on conflict \(child_profile_id, kind, source_bucket, source_path, source_id\) do update/);
assert.match(repair, /set title = excluded\.title,\s*preview = excluded\.preview/);
assert.match(repair, /if held = 1 and new_count > 0 then/);
assert.match(repair, /grant execute on function public\.save_child_shelf\(jsonb, text\) to authenticated/);
assert.equal(repair.includes("to anon"), false);
assert.equal(repair.includes("drop policy"), false);
assert.equal(/update\s+private\.child_access_control/i.test(repair), false);
assert.equal(repair.includes("delete from storage.objects"), false);
assert.equal(repair.includes("The Glowing Lantern Adventure"), false);
assert.match(rollback, /source_id text :=/);
assert.match(rollback, /drop function if exists private\.child_shelf_block_reason/);
assert.match(appliedLibrary, /source_id text :=/);
assert.match(artwork, /private\.child_share_visible\(split_part\(name, '\/', 3\)\)/);
assert.match(artwork, /private\.session_child_folder\(\)/);
assert.match(artwork, /private\.parent_owns_child_folder/);
assert.equal(repair.includes("create policy"), false);

assert.match(library, /"Cache-Control": "private, no-store"/);
assert.equal(library.includes("cacheControl:"), false);
assert.match(library, /cache: "no-store"/);
assert.match(library, /\/storage\/v1\/object\/public\/storybook_images\//);
assert.match(library, /function copyableStorybookUrl/);
const uploadBody = library.slice(library.indexOf("function uploadShelf"), library.indexOf("function loadCharacters"));
assert.equal(uploadBody.includes("reserve_child_creation"), false);
assert.equal(uploadBody.includes("images/generations"), false);
assert.match(uploadBody, /save_child_shelf/);
assert.match(story, /function pendingChildShelfId/);
assert.match(story, /wondii-child-book-key/);
assert.equal(cloud.includes('cacheControl: "0"'), false);

const fetchAt = sw.indexOf('self.addEventListener("fetch"');
const bypassAt = sw.indexOf("if (isPrivateContentRequest(e.request)) return;");
const respondAt = sw.indexOf("e.respondWith", fetchAt);
assert.ok(fetchAt > 0 && bypassAt > fetchAt && respondAt > bypassAt);
assert.match(sw, /jigsaw-kids-v458/);
assert.match(sw, /supabase\.co/);
assert.equal(sw.includes("caches.put"), false);

const unshareAt = family.indexOf('action === "unshare"');
assert.ok(family.indexOf("unshare_library_item", unshareAt) < family.indexOf("removeShareFiles", unshareAt));

function loadLibrary(options) {
  const uploads = [];
  const rpcs = [];
  const fetches = [];
  const failPictures = options.failPictures === true;
  const failCover = options.failCover === true;
  const duplicate = options.duplicate === true;
  const deny = options.deny === true;
  const rpcResult = options.rpcResult || { allowed: true, remaining: 0 };
  const sb = {
    supabaseUrl: "https://enuzrcjnrxwglacivlnu.supabase.co",
    supabaseKey: "anon-test",
    auth: {
      getSession() {
        return Promise.resolve({
          data: { session: { access_token: "child-token", user: { app_metadata: { account_kind: "child", child_profile_id: CHILD } } } }
        });
      }
    },
    storage: {
      from() {
        return {
          upload(objectPath, blob, opts) {
            uploads.push({ path: objectPath, blob: blob, opts: opts });
            if (failCover && String(objectPath).endsWith("/cover.jpg")) {
              return Promise.resolve({ error: new Error("cover_failed") });
            }
            return Promise.resolve({ error: null });
          },
          remove() {
            return Promise.resolve({ error: null });
          }
        };
      }
    },
    rpc(name, args) {
      rpcs.push({ name: name, args: args });
      if (name === "save_child_shelf") return Promise.resolve({ data: rpcResult, error: null });
      return Promise.resolve({ data: { allowed: true }, error: null });
    }
  };
  const context = {
    console: console,
    URL: URL,
    Blob: Blob,
    atob: atob,
    encodeURIComponent: encodeURIComponent,
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    Error: Error,
    FileReader: class {
      readAsText(blob) {
        Promise.resolve(blob.text()).then((text) => {
          this.result = text;
          if (this.onload) this.onload();
        });
      }
      readAsDataURL() {
        this.result = "data:image/png;base64,YQ==";
        if (this.onload) this.onload();
      }
    },
    fetch(url, init) {
      const method = (init && init.method) || "GET";
      fetches.push({ url: String(url), cache: init && init.cache, method: method });
      if (method === "POST" && String(url).indexOf("/storage/v1/object/child_library/") !== -1) {
        const relative = decodeURIComponent(String(url).split("/storage/v1/object/child_library/")[1] || "");
        uploads.push({ path: relative, blob: init.body, headers: init.headers || {} });
        if (failCover && relative.endsWith("/cover.jpg")) {
          return Promise.resolve({ ok: false, status: 400, text() { return Promise.resolve("cover_failed"); } });
        }
        if (deny) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text() { return Promise.resolve('{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy"}'); }
          });
        }
        if (duplicate) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text() { return Promise.resolve('{"statusCode":"409","error":"Duplicate","code":"KeyAlreadyExists"}'); }
          });
        }
        return Promise.resolve({ ok: true, status: 200, text() { return Promise.resolve("{}"); } });
      }
      if (String(url).endsWith(".json")) {
        const body = JSON.stringify({ id: "b1791534140235-607078", title: "Saved", pages: [{ text: "Hello" }] });
        return Promise.resolve({ ok: true, status: 200, blob() { return Promise.resolve(new Blob([body], { type: "application/json" })); } });
      }
      if (failPictures) return Promise.resolve({ ok: false, status: 404, blob() { return Promise.resolve(new Blob()); } });
      return Promise.resolve({ ok: true, status: 200, blob() { return Promise.resolve(new Blob(["png"], { type: "image/png" })); } });
    },
    WondiiSession: {
      get() {
        return { session: { user: { app_metadata: { account_kind: "child", child_profile_id: CHILD } } } };
      },
      client(done) { done(sb); }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(library, context, { filename: "child-library.js" });
  return { api: context.ChildLibrary, uploads: uploads, rpcs: rpcs, fetches: fetches };
}

function shelfCall(api, book, key) {
  return new Promise(function (resolve) {
    api.uploadShelf(JSON.stringify([book]), key, function (err) {
      resolve(err || null);
    });
  });
}

const saved = loadLibrary({});
const book = {
  id: "b1791534140235-607078",
  title: "The Glowing Lantern Adventure",
  pages: [
    { text: "A lantern glowed.", imageUrlFallback: PICTURE },
    { text: "The same light.", imageUrlFallback: PICTURE }
  ],
  sceneUrlFallback: PICTURE
};
const firstError = await shelfCall(saved.api, book, "wondiilanternkey01");
assert.equal(firstError, null);
assert.equal(saved.rpcs.some(call => call.name === "reserve_child_creation"), false);
const saveCall = saved.rpcs.filter(call => call.name === "save_child_shelf");
assert.equal(saveCall.length, 1);
assert.equal(saveCall[0].args.p_key, "wondiilanternkey01");
assert.equal(Object.prototype.hasOwnProperty.call(saveCall[0].args.p_shelf[0], "favourite"), false);
assert.equal(JSON.stringify(saveCall[0].args.p_shelf).includes("https://"), false);
assert.match(saveCall[0].args.p_shelf[0].pages[0].imageUrlFallback, /^wondii-private:books\/b1791534140235-607078\/p0\.jpg$/);
assert.equal(saveCall[0].args.p_shelf[0].pages[1].imageUrlFallback, saveCall[0].args.p_shelf[0].pages[0].imageUrlFallback);
const paths = saved.uploads.map(item => item.path);
assert.ok(paths.includes(CHILD + "/books/b1791534140235-607078/p0.jpg"));
assert.ok(paths.includes(CHILD + "/books/b1791534140235-607078/cover.jpg"));
assert.ok(paths.includes(CHILD + "/books/b1791534140235-607078.json"));
assert.equal(paths.filter(item => item.endsWith("/p0.jpg")).length, 1);
saved.uploads.forEach(item => {
  assert.equal(item.headers["Cache-Control"], "private, no-store");
  assert.equal(Object.prototype.hasOwnProperty.call(item.headers, "x-upsert"), false);
  assert.equal(item.headers["Content-Type"] ? item.headers["Content-Type"].indexOf("multipart") : -1, -1);
});
const duplicateSave = loadLibrary({ duplicate: true });
assert.equal(await shelfCall(duplicateSave.api, book, "wondiilanternkey01"), null);
const deniedSave = loadLibrary({ deny: true });
const deniedError = await shelfCall(deniedSave.api, book, "wondiilanternkey01");
assert.ok(deniedError);
assert.match(String(deniedError.message || deniedError), /row-level security/);
const jsonUpload = saved.uploads.find(item => item.path.endsWith(".json"));
const storedJson = JSON.parse(await jsonUpload.blob.text());
assert.equal(storedJson.pages[0].imageUrlFallback.startsWith("wondii-private:"), true);
assert.equal(JSON.stringify(storedJson).includes("https://"), false);
const saveOrder = saved.uploads.findIndex(item => item.path.endsWith(".json"));
assert.ok(saveOrder > saved.uploads.findIndex(item => item.path.endsWith("/cover.jpg")));
assert.equal(saved.fetches.filter(item => item.method !== "POST").every(item => item.cache === "no-store"), true);

const again = await shelfCall(saved.api, book, "wondiilanternkey01");
assert.equal(again, null);
assert.equal(saved.rpcs.filter(call => call.name === "save_child_shelf").length, 2);
assert.equal(saved.rpcs.filter(call => call.name === "reserve_child_creation").length, 0);

const refused = loadLibrary({ rpcResult: { allowed: false, reason: "allowance", remaining: 0 } });
const refusedError = await shelfCall(refused.api, book, "wondiilanternkey01");
assert.ok(refusedError);
assert.equal(refused.uploads.some(item => item.path.endsWith(".json")), true);

const missingPicture = loadLibrary({ failPictures: true });
const missingError = await shelfCall(missingPicture.api, book, "wondiilanternkey01");
assert.equal(missingError && missingError.message, "picture_missing");
assert.equal(missingPicture.rpcs.some(call => call.name === "save_child_shelf"), false);
assert.equal(missingPicture.uploads.some(item => item.path.endsWith(".json")), false);

const foreign = loadLibrary({});
const foreignError = await shelfCall(foreign.api, {
  id: "b-foreign-book",
  title: "Outside",
  pages: [{ text: "No.", imageUrl: "https://example.com/secret.png" }]
}, "wondiilanternkey01");
assert.equal(foreignError && foreignError.message, "public_picture");
assert.equal(foreign.fetches.length, 0);
assert.equal(foreign.rpcs.some(call => call.name === "save_child_shelf"), false);

const coverFail = loadLibrary({ failCover: true });
const coverError = await shelfCall(coverFail.api, { id: "b-cover", title: "Cover", pages: [{ text: "Hi", imageDataUrl: PNG }] }, "wondiilanternkey01");
assert.equal(coverError && coverError.message, "cover_failed");
assert.equal(coverFail.rpcs.some(call => call.name === "save_child_shelf"), false);
assert.equal(coverFail.uploads.some(item => item.path.endsWith(".json")), false);

const textOnly = loadLibrary({});
const textError = await shelfCall(textOnly.api, { id: "b-text-only", title: "Words", pages: [{ text: "Hello" }] }, "wondii-text-key-0001");
assert.equal(textError, null);
assert.deepEqual(textOnly.uploads.map(item => item.path), [CHILD + "/books/b-text-only.json"]);

const shared = loadLibrary({});
const sharedResult = await new Promise(function (resolve) {
  shared.api.storeSharedPackage(CHILD, "share-book-1", {
    id: "adult-book",
    title: "Shared",
    pages: [{ text: "A page", imageUrlFallback: PICTURE }]
  }, null, function (err) { resolve(err || null); });
});
assert.equal(sharedResult, null);
assert.ok(shared.uploads.some(item => item.path === CHILD + "/shared/share-book-1/book.json"));
assert.ok(shared.uploads.some(item => item.path === CHILD + "/shared/share-book-1/p0.jpg"));
assert.ok(shared.uploads.some(item => item.path === CHILD + "/shared/share-book-1/cover.jpg"));
const sharedAgain = await new Promise(function (resolve) {
  shared.api.storeSharedPackage(CHILD, "share-book-1", {
    id: "adult-book",
    title: "Shared again",
    pages: [{ text: "A page", imageUrlFallback: PICTURE }]
  }, null, function (err) { resolve(err || null); });
});
assert.equal(sharedAgain, null);
const sharedPaths = shared.uploads.map(item => item.path);
assert.equal(sharedPaths.filter(item => item.endsWith("/book.json")).length, 2);
assert.equal(new Set(sharedPaths).size, 3);

const characterShare = loadLibrary({});
const characterError = await new Promise(function (resolve) {
  characterShare.api.storeSharedPackage(CHILD, "share-char-1", null, new Blob(["png"], { type: "image/png" }), function (err) {
    resolve(err || null);
  });
});
assert.equal(characterError, null);
assert.ok(characterShare.uploads.some(item => item.path.endsWith("/character.png")));
assert.ok(characterShare.uploads.some(item => item.path.endsWith("/cover.jpg")));

const reader = loadLibrary({});
const read = await new Promise(function (resolve) {
  reader.api.loadOwnedBook(CHILD, "b1791534140235-607078", function (err, item) { resolve({ err: err || null, item: item }); });
});
assert.equal(read.err, null);
assert.equal(read.item && read.item.title, "Saved");
assert.equal(reader.fetches.length, 1);
assert.equal(reader.fetches[0].cache, "no-store");
assert.equal(reader.fetches[0].url.includes("?"), false);
