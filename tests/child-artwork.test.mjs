import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artworkPath, markerRelative, privateMarker } from "../js/child-library-rules.mjs";
import { claimDecision } from "../supabase/functions/clever-service/generation-allowance.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008240000_child_artwork.sql"), "utf8");
const library = fs.readFileSync(path.join(root, "js/child-library.js"), "utf8");
const characters = fs.readFileSync(path.join(root, "js/character-store.js"), "utf8");
const maker = fs.readFileSync(path.join(root, "schools/learn/character-portal.js"), "utf8");
const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const service = fs.readFileSync(path.join(root, "supabase/functions/clever-service/index.ts"), "utf8");
const join = fs.readFileSync(path.join(root, "js/child-join.js"), "utf8");
const family = fs.readFileSync(path.join(root, "js/family.js"), "utf8");

const child = "11111111-1111-4111-8111-111111111111";
assert.equal(artworkPath(child, ["books", "b12", "cover.jpg"]), child + "/books/b12/cover.jpg");
assert.equal(artworkPath(child, ["..", "books"]), "");
assert.equal(artworkPath("not-a-child", ["books", "b12"]), "");
assert.equal(privateMarker("books/b12/p0.jpg"), "wondii-private:books/b12/p0.jpg");
assert.equal(privateMarker("https://example.com/a.jpg"), "");
assert.equal(markerRelative("wondii-private:shared/share1/book.json"), "shared/share1/book.json");
assert.equal(markerRelative("wondii-private:books/b12/p0.jpg"), "books/b12/p0.jpg");
assert.equal(markerRelative("data:image/png;base64,aaaa"), "");

assert.equal(claimDecision("adult", null).proceed, true);
assert.equal(claimDecision(undefined, null).proceed, true);
assert.equal(claimDecision("child", { allowed: false, reason: "already_used" }).proceed, false);
assert.equal(claimDecision("child", { allowed: true, childId: child, key: "wondii12345678" }).reason, "claimed");
assert.equal(claimDecision("child", null).reason, "allowance");

assert.match(sql, /'child_library',\s*\n\s*'child_library',\s*\n\s*false/);
assert.match(sql, /private\.session_child_folder\(\)/);
assert.match(sql, /private\.child_share_visible/);
assert.match(sql, /private\.parent_owns_child_folder/);
assert.match(sql, /claim_child_generation/);
assert.match(sql, /on conflict do nothing/);
assert.match(sql, /grant execute on function public\.service_refund_child_generation\(uuid, text\) to service_role/);
assert.equal(sql.includes("grant execute on function public.claim_child_generation(text, text) to anon"), false);
assert.equal(sql.includes("grant execute on function public.service_refund_child_generation(uuid, text) to authenticated"), false);
assert.equal(sql.includes("drop policy if exists \"storybook_room"), false);
assert.equal(sql.includes("getPublicUrl"), false);

assert.match(library, /child_library/);
assert.equal(library.includes("getPublicUrl"), false);
assert.equal(library.includes("createSignedUrl"), false);
assert.match(library, /wondii-private:/);
assert.match(library, /storeSharedPackage/);
assert.match(library, /removeShareFiles/);

assert.match(characters, /storeCharacterArt/);
assert.match(maker, /ChildLibrary\.reserve\("character"\)/);
assert.match(story, /creationKey/);
assert.match(story, /loadSharedBook/);
assert.match(story, /loadOwnedBook/);
assert.match(join, /child-character\.html/);
assert.match(join, /Shared with me/);
assert.match(join, /My creations/);
assert.match(family, /storeSharedPackage/);
assert.match(family, /removeShareFiles/);

function appearsBefore(earlier, later) {
  const start = service.indexOf(earlier);
  const end = service.indexOf(later);
  assert.ok(start > 0 && end > start);
}
appearsBefore('claimChildGeneration(req, body as Record<string, unknown>, "character")', "const generated = await handleGenerateCharacter");
appearsBefore('claimChildGeneration(req, body as Record<string, unknown>, "book")', "EdgeRuntime.waitUntil(runStorybookGenerationJob");
appearsBefore('claimChildGeneration(req, body as Record<string, unknown>, "book")', "const syncBook = await executeStorybookPipeline");
assert.equal(service.split('claimChildGeneration(req, body as Record<string, unknown>, "book")').length, 3);
assert.match(service, /service_refund_child_generation/);
