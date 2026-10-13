import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const CHILD = "863ea310-302c-42d5-b139-0906124b3641";
const SHARE = "e7d4e450-2e5a-44af-a6bb-1d6afbf51c9f";

function text(path) {
  return readFileSync(new URL(path, root), "utf8");
}

function FileReaderPolyfill() {}
FileReaderPolyfill.prototype.readAsText = function (blob) {
  const reader = this;
  Promise.resolve(blob.text()).then(function (value) {
    reader.result = value;
    if (reader.onload) reader.onload();
  });
};

function boot(search, session, fetchImpl) {
  const sandbox = {
    location: { search: search, pathname: "/games/book-prototype/", hash: "", hostname: "127.0.0.1" },
    sessionStorage: { getItem() { return ""; } },
    setTimeout(fn) { sandbox.timeouts.push(fn); return sandbox.timeouts.length; },
    addEventListener() {},
    timeouts: [],
    URL: URL,
    URLSearchParams: URLSearchParams,
    Promise: Promise,
    Blob: Blob,
    Response: Response,
    FileReader: FileReaderPolyfill,
    fetch: fetchImpl,
    atob: atob
  };
  sandbox.window = sandbox;
  const user = {
    id: session.userId,
    app_metadata: {
      account_kind: session.kind,
      child_profile_id: session.childProfileId || ""
    }
  };
  const view = { status: "authenticated", userId: session.userId, session: { user: user, access_token: "token-test" } };
  sandbox.WondiiSession = {
    get() { return view; },
    subscribe(fn) { fn(view); },
    client(done) {
      done({
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "anon-test",
        auth: {
          getSession() {
            return Promise.resolve({ data: { session: { access_token: "token-test", user: user } } });
          }
        }
      });
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(text("js/child-library.js"), sandbox);
  vm.runInContext(text("games/book-prototype/book-data.js"), sandbox);
  return sandbox;
}

function bookResponse(book) {
  return Promise.resolve(new Response(JSON.stringify(book), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  }));
}

function denied() {
  return Promise.resolve(new Response(JSON.stringify({ allowed: false }), { status: 403 }));
}

test("a parent read uses the child-art path and returns that book's pages", async () => {
  const calls = [];
  const sandbox = boot("?book=book-9&child=" + CHILD, { kind: "parent", userId: "parent-1" }, function (url) {
    calls.push(String(url));
    assert.equal(String(url).includes(CHILD + "/books/book-9.json"), true);
    return bookResponse({
      id: "book-9",
      title: "The read-only walk",
      author: "Teddy",
      pages: [{ text: "Teddy walked to the gate.", imageUrlFallback: "https://example.invalid/page.jpg" }]
    });
  });
  const result = await sandbox.WondiiBookData.load();
  assert.equal(result.ok, true);
  assert.equal(result.kind, "saved");
  assert.equal(result.plan.title, "The read-only walk");
  assert.equal(result.plan.pages[0].text, "Teddy walked to the gate.");
  assert.equal(calls.length, 1);
});

test("a denied parent read and a child using the parent link stay closed", async () => {
  const deniedCalls = [];
  const deniedParent = boot("?book=book-9&child=" + CHILD, { kind: "parent", userId: "parent-1" }, function (url) {
    deniedCalls.push(String(url));
    return denied();
  });
  const deniedResult = await deniedParent.WondiiBookData.load();
  assert.equal(deniedResult.ok, false);
  assert.equal(deniedResult.reason, "closed");
  assert.equal(deniedResult.kind, undefined);
  assert.equal(deniedCalls.length, 1);

  let childCalls = 0;
  const childOnParentLink = boot("?book=book-9&child=" + CHILD, {
    kind: "child",
    userId: "child-user",
    childProfileId: CHILD
  }, function () {
    childCalls += 1;
    return denied();
  });
  const childResult = await childOnParentLink.WondiiBookData.load();
  assert.equal(childResult.ok, false);
  assert.equal(childResult.reason, "closed");
  assert.equal(childCalls, 0);
});

test("a shared book is loaded only for that child and only from the shared path", async () => {
  let adultCalls = 0;
  const adult = boot("?book=" + SHARE + "&shared=1", { kind: "parent", userId: "parent-1" }, function () {
    adultCalls += 1;
    return bookResponse({ id: SHARE, title: "Should not open", pages: [{ text: "no" }] });
  });
  const adultResult = await adult.WondiiBookData.load();
  assert.equal(adultResult.ok, false);
  assert.equal(adultResult.reason, "closed");
  assert.equal(adultCalls, 0);

  const calls = [];
  const child = boot("?book=" + SHARE + "&shared=1", {
    kind: "child",
    userId: "child-user",
    childProfileId: CHILD
  }, function (url) {
    calls.push(String(url));
    assert.equal(String(url).includes(CHILD + "/shared/" + SHARE + "/book.json"), true);
    return bookResponse({
      id: SHARE,
      title: "Shared picnic",
      pages: [{ text: "The basket stayed closed." }]
    });
  });
  const childResult = await child.WondiiBookData.load();
  assert.equal(childResult.ok, true);
  assert.equal(childResult.plan.title, "Shared picnic");
  assert.equal(childResult.plan.pages[0].text, "The basket stayed closed.");
  assert.equal(calls.length, 1);

  const refused = boot("?book=" + SHARE + "&shared=1", {
    kind: "child",
    userId: "child-user",
    childProfileId: CHILD
  }, function () {
    return denied();
  });
  const refusedResult = await refused.WondiiBookData.load();
  assert.equal(refusedResult.ok, false);
  assert.equal(refusedResult.reason, "closed");
  assert.equal(refusedResult.kind, undefined);
});

function libraryWithHome(kind, rpc) {
  const user = { id: "u1", app_metadata: { account_kind: kind, child_profile_id: CHILD } };
  const sandbox = {
    WondiiSession: {
      get() {
        return { status: "authenticated", session: { user: user } };
      },
      client(done) {
        done({ rpc: rpc });
      }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(text("js/child-library.js"), sandbox);
  return sandbox.ChildLibrary;
}

test("shared characters come from the child home and an adult is not given a substitute", async () => {
  const calls = [];
  const child = libraryWithHome("child", function (name) {
    calls.push(name);
    return Promise.resolve({
      data: {
        allowed: true,
        sharedCharacters: [{ id: SHARE, title: "Teddy", sourceId: "char_teddy" }]
      }
    });
  });
  const rows = await new Promise(function (resolve, reject) {
    child.listSharedCharacters(function (err, list) {
      if (err) reject(err);
      else resolve(list);
    });
  });
  assert.deepEqual(calls, ["child_home"]);
  assert.equal(rows[0].id, SHARE);
  assert.equal(rows[0].title, "Teddy");

  let adultCalls = 0;
  const adult = libraryWithHome("parent", function () {
    adultCalls += 1;
    return Promise.resolve({ data: { allowed: true, sharedCharacters: [] } });
  });
  const adultResult = await new Promise(function (resolve) {
    adult.listSharedCharacters(function (err, list) {
      resolve({ message: err && err.message, list: list });
    });
  });
  assert.equal(adultResult.message, "not_child");
  assert.equal(adultResult.list.length, 0);
  assert.equal(adultCalls, 0);
});
