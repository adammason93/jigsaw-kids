import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canReserve,
  characterListMessage,
  characterListReason,
  creationRemaining,
  londonDay,
  newIds,
  parentOwnsPath,
  sharePreview,
} from "../js/child-library-rules.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008230000_child_library.sql"), "utf8");
const library = fs.readFileSync(path.join(root, "js/child-library.js"), "utf8");
const join = fs.readFileSync(path.join(root, "js/child-join.js"), "utf8");
const family = fs.readFileSync(path.join(root, "js/family.js"), "utf8");
const cloud = fs.readFileSync(path.join(root, "js/score-cloud.js"), "utf8");
const characters = fs.readFileSync(path.join(root, "js/character-store.js"), "utf8");
const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const portal = fs.readFileSync(path.join(root, "portal.js"), "utf8");
const childPage = fs.readFileSync(path.join(root, "child.html"), "utf8");

assert.equal(creationRemaining(3, 1, 1), 1);
assert.equal(creationRemaining(20, 0, 0), 10);
assert.equal(creationRemaining(2, 2, 0), 0);
assert.equal(canReserve(1, 0, 1), false);
assert.equal(canReserve(1, 0, 0), true);
assert.deepEqual(newIds(["a"], ["a", "b"]), ["b"]);
assert.equal(parentOwnsPath("user/storybook/shelf.json", "user"), true);
assert.equal(parentOwnsPath("other/storybook/shelf.json", "user"), false);
assert.equal(parentOwnsPath("user/storybook/shelf.json", ""), false);

const preview = sharePreview({
  title: "x".repeat(100),
  pages: [{ text: "y".repeat(600), image: "data:image/png;base64,abc" }, { text: "ok" }],
});
assert.equal(preview.title.length, 80);
assert.equal(preview.pages.length, 2);
assert.equal(preview.pages[0].text.length, 500);
assert.equal("image" in preview.pages[0], false);
assert.equal(JSON.stringify(preview).includes("data:"), false);

const winter = new Date("2026-01-15T23:30:00Z");
const summer = new Date("2026-07-15T23:30:00Z");
assert.equal(londonDay(winter), "2026-01-15");
assert.equal(londonDay(summer), "2026-07-16");

assert.match(sql, /timezone\('Europe\/London', now\(\)\)/);
assert.match(sql, /for update/);
assert.match(sql, /status = 'reserved'/);
assert.match(sql, /status = 'refunded'/);
assert.match(sql, /least\(/);
assert.equal(sql.includes("removed_at is null and created_on"), false);
assert.match(sql, /position\(auth\.uid\(\)::text \|\| '\/' in coalesce\(p_path, ''\)\) <> 1/);
assert.match(sql, /p_preview::text ilike '%data:%'/);
assert.match(sql, /private\.session_child_id\(\)/);
assert.match(sql, /perform private\.reject_child\(\)/);
assert.match(sql, /revoke all on private\.child_books from public, anon, authenticated/);
assert.match(sql, /revoke all on private\.library_shares from public, anon, authenticated/);
assert.equal(sql.includes("grant execute on function public.save_child_shelf(jsonb, text) to anon"), false);
assert.equal(sql.includes("grant execute on function public.share_library_item"), true);
assert.equal(sql.includes("to anon"), false);
assert.equal(sql.includes("service_role"), false);
assert.equal(sql.includes("drop policy"), false);
assert.equal(sql.includes("storybook_room_select_own"), false);
assert.match(sql, /create or replace function public\.set_child_book_favourite/);

assert.equal(library.includes("service_role"), false);
assert.match(library, /reserve_child_creation/);
assert.match(library, /save_child_shelf/);
assert.match(library, /save_child_characters/);
assert.equal(library.includes("storybook_room"), false);
assert.equal(library.includes("characters_room"), false);

const childDownload = cloud.slice(cloud.indexOf('account_kind === "child"'), cloud.indexOf('account_kind === "child"') + 500);
assert.match(childDownload, /ChildLibrary\.downloadShelf/);
assert.equal(childDownload.includes(".upload("), false);
assert.match(cloud, /ChildLibrary\.uploadShelf/);

const childSave = characters.slice(characters.indexOf("function saveCharacter("), characters.indexOf("function saveCharacter(") + 1200);
assert.match(childSave, /ChildLibrary\.reserve\("character"\)/);
assert.match(childSave, /ChildLibrary\.storeCharacterArt/);
assert.equal(childSave.includes("characters_room"), false);

assert.match(story, /ChildLibrary\.reserve\("book"\)/);
assert.match(story, /releaseChildBook/);
assert.match(portal, /location\.replace\("child\.html"\)/);

assert.match(join, /Create a book/);
assert.match(join, /Create a character/);
assert.match(join, /Play games/);
assert.match(join, /My books/);
assert.match(join, /My characters/);
assert.match(join, /Family bookshelf/);
assert.match(join, /Favourites/);
assert.match(join, /Continue reading/);
assert.match(join, /books left today/);
assert.equal(join.includes("innerHTML"), false);
assert.equal(join.includes("wondii-hq"), false);
assert.equal(join.includes("admin.html"), false);
assert.match(childPage, /no-referrer/);
assert.match(childPage, /child-library\.js/);

assert.match(family, /parent_child_activity/);
assert.match(family, /share_library_item/);
assert.match(family, /unshare_library_item/);
assert.match(family, /storybook\/shelf\.json/);
assert.match(family, /characters\/index\.json/);
assert.equal(family.includes("Books created: 0"), false);
assert.match(family, /View creations/);
assert.match(family, /ownedArtUrl/);
assert.match(family, /Only /);
assert.match(family, /family-creations/);
assert.match(family, /books\/" \+ book\.id \+ "\/cover\.jpg/);
assert.match(family, /Look closer/);
assert.match(join, /A grown-up in your family can open/);
assert.match(story, /parentReadingChild/);
assert.match(story, /Saved to your Wondii/);
assert.match(story, /Not saved yet/);
assert.equal(story.includes("signed in under"), true);

assert.equal(characterListReason(
  { allowed: false, reason: "not_child" },
  { allowed: false, reason: "unavailable" }
), "unavailable");
assert.equal(characterListReason(
  { allowed: false, reason: "not_child" },
  { allowed: false, reason: "device_revoked" }
), "device_revoked");
assert.equal(characterListReason(
  { allowed: false, reason: "not_child" },
  { allowed: false, reason: "profile_unavailable" }
), "profile_unavailable");
assert.equal(characterListReason({ allowed: false, reason: "not_child" }, null), "not_child");
assert.equal(characterListMessage("unavailable").includes("not_child"), false);
assert.equal(characterListMessage("not_child").includes("not_child"), false);
assert.match(characterListMessage("device_revoked"), /stopped/);
assert.match(characterListMessage("profile_unavailable"), /paused/);
assert.match(characterListMessage("unavailable"), /Try again/);

const loadFn = library.slice(library.indexOf("function loadCharacters"), library.indexOf("function setFavourite"));
assert.match(loadFn, /child_content_access/);
assert.match(loadFn, /characterListMessage/);
assert.equal(loadFn.includes('new Error("not_child")'), false);

const portalPage = fs.readFileSync(path.join(root, "schools/learn/character-portal.js"), "utf8");
const pageFn = portalPage.slice(portalPage.indexOf("function page("), portalPage.indexOf("function render("));
assert.ok(pageFn.indexOf('status === "error"') >= 0);
assert.ok(pageFn.indexOf('status === "error"') < pageFn.indexOf("emptyMine()"));
assert.match(portalPage, /Characters are not open just now/);
assert.match(portalPage, /Try again/);
const childLoad = portalPage.slice(portalPage.indexOf("childStore.loadCharacters"), portalPage.indexOf("finishSaved(list);"));
assert.equal(childLoad.includes("not_child"), false);
assert.equal(childLoad.includes('Could not open characters. " +'), false);
assert.match(childLoad, /Try again in a moment/);

const reasonSql = fs.readFileSync(path.join(root, "supabase/migrations/20261009190000_child_character_list_reason.sql"), "utf8");
assert.match(reasonSql, /public\.child_content_access\(\)/);
assert.match(reasonSql, /return access/);
assert.equal(reasonSql.includes("grant execute on function public.child_characters() to anon"), false);
assert.equal(reasonSql.includes("service_role"), false);
