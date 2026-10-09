import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVATE_OBJECT_CACHE, sharedCacheMayStore } from "../js/child-library-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261008280000_child_library_private_cache.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase/rollbacks/20261008280000_child_library_private_cache.sql"), "utf8");
const library = fs.readFileSync(path.join(root, "js/child-library.js"), "utf8");
const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const cloud = fs.readFileSync(path.join(root, "js/score-cloud.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

assert.equal(PRIVATE_OBJECT_CACHE, "private, no-store");
assert.equal(sharedCacheMayStore("private, no-store"), false);
assert.equal(sharedCacheMayStore("public, max-age=0"), true);
assert.equal(sharedCacheMayStore("public, max-age=3600"), true);
assert.equal(sharedCacheMayStore("max-age=0"), true);
assert.equal(sharedCacheMayStore(""), true);

assert.match(library, /cacheControl: "private, no-store"/);
assert.equal(library.includes('cacheControl: "0"'), false);
assert.match(library, /"Cache-Control": "no-store"/);
assert.equal(cloud.includes("private, no-store"), false);
assert.equal(cloud.includes('cacheControl: "0"'), false);

assert.match(migration, /bucket_id = 'child_library'/);
assert.match(migration, /private, no-store/);
assert.match(migration, /perform private\.invalidate_child_library\(device\.child_profile_id\)/);
assert.match(migration, /perform private\.invalidate_child_library\(p_id\)/);
assert.match(migration, /child_library_cache_on_content_close/);
assert.match(migration, /new\.content_enabled is false/);
assert.equal(migration.includes("storybook_room"), false);
assert.equal(migration.includes("characters_room"), false);
assert.equal(migration.includes("drop policy"), false);
assert.equal(/update\s+private\.child_access_control/i.test(migration), false);
assert.equal(migration.includes("pairing_enabled = true"), false);
assert.equal(migration.includes("content_enabled = true"), false);
assert.match(rollback, /drop function if exists private\.invalidate_child_library\(uuid\)/);
assert.equal(rollback.includes("private, no-store"), false);

const stayAt = story.indexOf("stayOnStorybook = !!");
const goAt = story.indexOf("if (!stayOnStorybook) goToPortalStories");
const stayBlock = story.slice(stayAt, goAt);
assert.match(stayBlock, /bootParams\.get\("book"\)/);
assert.match(stayBlock, /bootParams\.get\("char"\)/);
assert.match(stayBlock, /bootParams\.get\("shared"\)/);
assert.match(stayBlock, /bootParams\.get\("sharedChar"\)/);
assert.match(stayBlock, /bootParams\.get\("sample"\)/);
assert.match(stayBlock, /bootParams\.get\("demo"\)/);
assert.match(story, /function openPrivateFromUrl/);
assert.match(story, /loadSharedBook/);

const fetchAt = sw.indexOf('self.addEventListener("fetch"');
const bypassAt = sw.indexOf("if (isPrivateContentRequest(e.request)) return;");
const respondAt = sw.indexOf("e.respondWith", fetchAt);
assert.ok(bypassAt > fetchAt && respondAt > bypassAt);
