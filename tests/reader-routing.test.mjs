import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import vm from "node:vm";

const root = new URL("..", import.meta.url);

function text(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("the 3D reader file is unchanged", () => {
  const book = text("games/book-prototype/book.js");
  const sha = createHash("sha1").update(book).digest("hex");
  assert.equal(sha, "e1cc182e222e8fd75186911e17949a43629fd1b5");
  assert.equal(book.includes("sampleAssets()"), true);
});

test("saved-book links open the 3D reader and keep creation on the journey", () => {
  const portal = text("portal.js");
  const home = text("js/portal-home-model.js");
  const family = text("js/family.js");
  const child = text("js/child-join.js");
  const story = text("games/storybook.js");
  assert.equal(portal.includes('READ_URL = "games/book-prototype/"'), true);
  assert.equal(portal.includes('READ_URL + "?book="'), true);
  assert.equal(portal.includes("?create=1"), true);
  assert.equal(portal.includes('STORY_URL + "?book="'), false);
  assert.equal(home.includes("games/storybook.html?book="), false);
  assert.equal((home.match(/games\/book-prototype\/\?book=/g) || []).length, 3);
  assert.match(family, /book-prototype\/\?book=.*&child=/);
  assert.match(child, /book-prototype\/\?book=.*&shared=1/);
  assert.match(story, /function openShelfBook\(bookId\) \{\s*if \(!bookId\) return;\s*window\.location\.assign\("book-prototype\/\?book="/);
  assert.match(story, /book-prototype\/\?book=.*&shared=1/);
  assert.match(story, /wondii-journey-star/);
  assert.match(story, /function getSelectedFamilyPeople\(\) \{\s*return journeyFamilyPeople\.slice\(\);\s*\}/);
  assert.match(story, /book-prototype\/\?" \+ \(bootParams\.get\("demo"\) === "1" \? "demo=1" : "sample=1"\)/);
  const portalPage = text("portal.html");
  assert.equal(portalPage.includes("games/book-prototype/?sample=1"), true);
  assert.equal(portalPage.includes('games/book-prototype/">'), false);
});

test("the journey sends each real portrait and the verified picture-book style", () => {
  const journey = text("games/story-journey.js");
  const story = text("games/storybook.js");
  const page = text("games/storybook.html");
  assert.equal(journey.includes('portrait: "images/characters/crew/" + star()[0]'), false);
  assert.match(journey, /style: "soft_3d"/);
  assert.match(journey, /cast: members/);
  assert.match(journey, /members\.push\(\{ id: id, name: row\[1\], src: portraitSrc\(id\) \}\)/);
  assert.match(story, /function referenceForPerson/);
  assert.match(journey, /portraitSrc\(id\)/);
  assert.equal(journey.includes('|| "images/characters/crew/wondii-maya.jpg"'), false);
  assert.match(story, /value="soft_3d"/);
  assert.match(story, /next\.style === "soft_3d"/);
  assert.match(page, /value="clay3d" checked/);
  assert.match(page, /value="soft_3d"/);
});

function bootBookData(search, extras) {
  const listeners = {};
  const sandbox = {
    location: { search: search, hostname: "127.0.0.1" },
    sessionStorage: {
      getItem() {
        return "";
      }
    },
    setTimeout(fn) {
      sandbox.timeouts.push(fn);
      return sandbox.timeouts.length;
    },
    addEventListener(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
    },
    timeouts: [],
    dispatch(name) {
      (listeners[name] || []).forEach(function (fn) { fn(); });
    }
  };
  sandbox.window = sandbox;
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.Promise = Promise;
  Object.assign(sandbox, extras || {});
  vm.createContext(sandbox);
  vm.runInContext(text("games/book-prototype/book-data.js"), sandbox);
  return sandbox;
}

test("a bare reader URL is not the sample, and an explicit sample flag is", () => {
  const bare = bootBookData("");
  bare.history = {
    replaceState(_state, _title, url) {
      const query = String(url).includes("?") ? String(url).slice(String(url).indexOf("?")) : "";
      bare.location.search = query;
    }
  };
  bare.WondiiBookData.prepareReader();
  assert.equal(bare.location.search, "?book=");
  assert.equal(bare.WondiiBookData.requestedId(), "");

  const sample = bootBookData("?sample=1");
  let replaced = false;
  sample.history = { replaceState() { replaced = true; } };
  sample.WondiiBookData.prepareReader();
  assert.equal(replaced, false);
  assert.equal(sample.WondiiBookData.requestedId(), null);

  const demo = bootBookData("?demo=1");
  demo.history = { replaceState() { throw new Error("demo must stay explicit"); } };
  demo.WondiiBookData.prepareReader();
  assert.equal(demo.WondiiBookData.requestedId(), null);
});

test("a missing book id is an error and never the sample", async () => {
  const blank = bootBookData("");
  const sample = await blank.WondiiBookData.load();
  assert.equal(sample.ok, true);
  assert.equal(sample.kind, "sample");
  const missing = bootBookData("?book=");
  const unnamed = await missing.WondiiBookData.load();
  assert.equal(unnamed.ok, false);
  assert.equal(unnamed.reason, "missing");
  assert.equal(String(missing.WondiiBookData.message("missing")).includes("Golden"), false);
});

test("an unknown shelf book stays unavailable after the shelf refresh", async () => {
  let calls = 0;
  const sandbox = bootBookData("?book=missing-book", {
    WondiiSession: {
      subscribe(fn) {
        fn({ status: "authenticated", userId: "user-1" });
      }
    },
    StorybookShelfStore: {
      currentUserId() { return "user-1"; },
      getVisibleJson() {
        calls += 1;
        return Promise.resolve([{ id: "other", title: "Other", pages: [{ text: "Hi" }] }]);
      }
    }
  });
  const pending = sandbox.WondiiBookData.load();
  await Promise.resolve();
  sandbox.dispatch("kids-scorecard-refresh");
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unavailable");
  assert.equal(result.kind, undefined);
  assert.equal(calls, 1);
});

test("a parent read uses the child library and not the parent shelf", async () => {
  let shelf = 0;
  let owned = 0;
  const sandbox = bootBookData("?book=book-9&child=child-2", {
    WondiiSession: {
      subscribe(fn) {
        fn({ status: "authenticated", userId: "parent-1" });
      }
    },
    StorybookShelfStore: {
      currentUserId() { return "parent-1"; },
      getVisibleJson() {
        shelf += 1;
        return Promise.resolve([]);
      }
    },
    ChildLibrary: {
      isChildSession() { return false; },
      loadOwnedBook(child, id, cb) {
        owned += 1;
        assert.equal(child, "child-2");
        assert.equal(id, "book-9");
        cb(null, {
          id: id,
          title: "Teddy's walk",
          pages: [{ text: "Teddy went out.", imageDataUrl: "data:image/jpeg;base64,aa" }]
        });
      }
    }
  });
  const result = await sandbox.WondiiBookData.load();
  assert.equal(result.ok, true);
  assert.equal(result.plan.title, "Teddy's walk");
  assert.equal(result.plan.pages[0].text, "Teddy went out.");
  assert.equal(owned, 1);
  assert.equal(shelf, 0);
});

test("a shared book is refused for a parent and loaded for a child", async () => {
  const parent = bootBookData("?book=share-1&shared=1", {
    WondiiSession: {
      subscribe(fn) {
        fn({ status: "authenticated", userId: "parent-1" });
      }
    },
    ChildLibrary: {
      isChildSession() { return false; },
      loadSharedBook() {
        throw new Error("parent must not load a shared book");
      }
    }
  });
  const parentResult = await parent.WondiiBookData.load();
  assert.equal(parentResult.ok, false);
  assert.equal(parentResult.reason, "closed");

  const child = bootBookData("?book=share-1&shared=1", {
    WondiiSession: {
      subscribe(fn) {
        fn({ status: "authenticated", userId: "child-1" });
      }
    },
    ChildLibrary: {
      isChildSession() { return true; },
      loadSharedBook(id, cb) {
        assert.equal(id, "share-1");
        cb(new Error("missing"), null);
      }
    }
  });
  const childResult = await child.WondiiBookData.load();
  assert.equal(childResult.ok, false);
  assert.equal(childResult.reason, "closed");
});

test("a signed-out book id asks for sign-in", async () => {
  const sandbox = bootBookData("?book=book-1", {
    WondiiSession: {
      subscribe(fn) {
        fn({ status: "unauthenticated", userId: "" });
      }
    }
  });
  const signedOut = await sandbox.WondiiBookData.load();
  assert.equal(signedOut.ok, false);
  assert.equal(signedOut.reason, "unauthorised");
});
