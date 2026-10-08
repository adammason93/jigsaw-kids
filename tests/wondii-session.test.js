"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");

function bootSession() {
  var authListeners = [];
  var timers = [];
  var pendingSessions = [];
  var sandbox = {
    document: {
      createElement: function () { return {}; },
      head: { appendChild: function () {} },
      dispatchEvent: function () {}
    },
    SCORE_SYNC: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" },
    supabase: {
      createClient: function () {
        return {
          auth: {
            onAuthStateChange: function (fn) { authListeners.push(fn); },
            getSession: function () {
              return new Promise(function (resolve) { pendingSessions.push(resolve); });
            }
          }
        };
      }
    },
    setTimeout: function (fn) { timers.push(fn); return timers.length; },
    clearTimeout: function () {},
    localStorage: {},
    CustomEvent: function CustomEvent() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/wondii-session.js"), "utf8"), sandbox, { filename: "wondii-session.js" });
  return { sandbox: sandbox, authListeners: authListeners, timers: timers, pendingSessions: pendingSessions };
}

async function main() {
  var fresh = bootSession();
  assert.strictEqual(fresh.sandbox.WondiiSession.get().status, "initialising");
  assert.strictEqual(fresh.sandbox.WondiiSession.get().userId, "");

  var signedIn = bootSession();
  signedIn.authListeners[0]("INITIAL_SESSION", { user: { id: "user-1" }, access_token: "a" });
  assert.strictEqual(signedIn.sandbox.WondiiSession.get().status, "authenticated");
  assert.strictEqual(signedIn.sandbox.WondiiSession.get().userId, "user-1");
  signedIn.authListeners[0]("TOKEN_REFRESHED", { user: { id: "user-1" }, access_token: "b" });
  assert.strictEqual(signedIn.sandbox.WondiiSession.get().status, "authenticated");
  assert.strictEqual(signedIn.sandbox.WondiiSession.get().session.access_token, "b");

  var late = bootSession();
  late.authListeners[0]("INITIAL_SESSION", { user: { id: "user-1" }, access_token: "a" });
  late.timers[0]();
  assert.strictEqual(late.pendingSessions.length, 0, "a settled session must ignore the fallback read");

  var race = bootSession();
  race.timers[0]();
  assert.strictEqual(race.pendingSessions.length, 1);
  race.authListeners[0]("INITIAL_SESSION", { user: { id: "user-2" }, access_token: "kept" });
  race.pendingSessions[0]({ data: { session: null }, error: null });
  await Promise.resolve();
  assert.strictEqual(race.sandbox.WondiiSession.get().status, "authenticated");
  assert.strictEqual(race.sandbox.WondiiSession.get().userId, "user-2");

  var offline = bootSession();
  offline.timers[0]();
  offline.pendingSessions[0]({ data: { session: null }, error: { message: "network" } });
  await Promise.resolve();
  assert.strictEqual(offline.sandbox.WondiiSession.get().status, "error");
  assert.notStrictEqual(offline.sandbox.WondiiSession.get().status, "unauthenticated");

  var signedOut = bootSession();
  signedOut.authListeners[0]("INITIAL_SESSION", { user: { id: "user-1" }, access_token: "a" });
  signedOut.authListeners[0]("SIGNED_OUT", null);
  assert.strictEqual(signedOut.sandbox.WondiiSession.get().status, "unauthenticated");
  assert.strictEqual(signedOut.sandbox.WondiiSession.get().session, null);

  var portal = fs.readFileSync(path.join(root, "portal.html"), "utf8");
  var sessionAt = portal.indexOf("js/wondii-session.js");
  var cloudAt = portal.indexOf("js/score-cloud.js");
  assert.ok(sessionAt > 0 && sessionAt < cloudAt);
  assert.ok(portal.indexOf("js/character-store.js") > sessionAt);
  assert.ok(portal.indexOf("js/organisation.js") > sessionAt);

  var org = fs.readFileSync(path.join(root, "js/organisation.js"), "utf8");
  var store = fs.readFileSync(path.join(root, "js/character-store.js"), "utf8");
  var cloud = fs.readFileSync(path.join(root, "js/score-cloud.js"), "utf8");
  var school = fs.readFileSync(path.join(root, "js/school-store.js"), "utf8");
  var gate = fs.readFileSync(path.join(root, "portal-gate.js"), "utf8");
  var storybook = fs.readFileSync(path.join(root, "games/storybook.html"), "utf8");
  assert.strictEqual(org.indexOf("createClient"), -1);
  assert.strictEqual(org.indexOf("setTimeout"), -1);
  assert.strictEqual(store.indexOf("refreshSession"), -1);
  assert.strictEqual(cloud.indexOf(".refreshSession("), -1);
  assert.ok(store.indexOf('org.status !== "ready"') >= 0);
  assert.ok(school.indexOf("if (global.WondiiSession)") < school.indexOf("createClient"));
  assert.ok(gate.indexOf('auth.status === "initialising"') >= 0);
  assert.strictEqual(gate.indexOf("if (!session && !err"), -1);
  assert.ok(storybook.indexOf("wondii-session.js") < storybook.indexOf("score-cloud.js"));
  assert.ok(fs.readFileSync(path.join(root, "sw.js"), "utf8").indexOf("jigsaw-kids-v453") >= 0);
  assert.ok(portal.indexOf('id="pAccountMenu"') >= 0);
  assert.ok(portal.indexOf("My Wondii — Dashboard") >= 0);
  assert.ok(portal.indexOf('data-account="logout"') >= 0);
  assert.strictEqual(portal.indexOf('class="p-who" href="#characters"'), -1);
  var portalJs = fs.readFileSync(path.join(root, "portal.js"), "utf8");
  assert.ok(portalJs.indexOf("KidsScoreCloud.signOut") >= 0);
  assert.strictEqual(portalJs.indexOf("createClient"), -1);
  var cloudPatch = cloud.slice(cloud.indexOf("function patchSettingsUi"), cloud.indexOf("function subscribeAuth"));
  assert.ok(cloudPatch.indexOf("global.WondiiSession") < cloudPatch.indexOf("kidsSyncPassword"));
  assert.strictEqual(org.indexOf("chip.hidden = !!view.organisation"), -1);
  assert.ok(org.indexOf("chooseWorkspace: chooseWorkspace") >= 0);
  var css = fs.readFileSync(path.join(root, "schools/org-portal.css"), "utf8");
  assert.strictEqual(css.indexOf("body.org-on .p-who"), -1);
  assert.ok(css.indexOf("body.org-on #cast") >= 0);
  assert.ok(/\.org-lockup\[hidden\][\s\S]{0,120}display:\s*none/.test(css));
  assert.ok(/\.p-side__workspace\[hidden\][\s\S]{0,80}display:\s*none/.test(css));
  assert.ok(org.indexOf('name.textContent = view.organisation ? view.organisationName : ""') >= 0);
  var follow = org.slice(org.indexOf("function followSession"), org.indexOf("function schoolIntentFor"));
  var initBranch = follow.slice(follow.indexOf('auth.status === "initialising"'), follow.indexOf('auth.status === "error"'));
  assert.ok(initBranch.indexOf('seen = ""') >= 0, "a retry must not ignore the same signed-in user");
  var characters = fs.readFileSync(path.join(root, "schools/learn/character-portal.js"), "utf8");
  assert.ok(characters.indexOf('view.status !== "ready"') >= 0);
  assert.ok(characters.indexOf("wondii-org") >= 0);

  console.log("wondii-session tests ok");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
