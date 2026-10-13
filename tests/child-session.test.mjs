import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = { window: {}, URL, console };
context.globalThis = context.window;
vm.runInNewContext(fs.readFileSync(path.join(root, "js/child-session-rules.js"), "utf8"), context);
const rules = context.window.WondiiChildSession;

const family = fs.readFileSync(path.join(root, "js/family.js"), "utf8");
const join = fs.readFileSync(path.join(root, "js/child-join.js"), "utf8");
const sessionJs = fs.readFileSync(path.join(root, "js/wondii-session.js"), "utf8");
const childHtml = fs.readFileSync(path.join(root, "child.html"), "utf8");

assert.equal(
  rules.PAIRING_DISABLED_MESSAGE,
  "Adding devices is temporarily unavailable. Your family and existing profiles are safe."
);
assert.ok(family.includes(rules.PAIRING_DISABLED_MESSAGE));
assert.ok(family.indexOf("pairing_unavailable") < family.indexOf("if (/unavailable/.test(code))"));
assert.ok(family.indexOf("profile_unavailable") < family.indexOf("pairing_unavailable"));
assert.ok(family.includes("Log in again to manage your family."));
assert.ok(family.includes("Wondii could not open your family just now. Try again in a moment."));
assert.ok(family.includes("Check your connection and try again."));
assert.ok(family.indexOf("failed to fetch") < family.indexOf("if (/unavailable/.test(code))"));

const failText = vm.runInNewContext(
  family.slice(family.indexOf("function failText"), family.indexOf("function applySnapshot")) +
    "\nfailText;",
  {}
);
assert.equal(
  failText({ message: "pairing_unavailable" }),
  "Adding devices is temporarily unavailable. Your family and existing profiles are safe."
);
assert.equal(
  failText({ message: "unavailable" }),
  "Wondii could not open your family just now. Try again in a moment."
);
assert.equal(failText({ message: "sign_in_required" }), "Log in again to manage your family.");
assert.equal(failText({ message: "Failed to fetch" }), "Check your connection and try again.");
assert.equal(failText({ message: "profile_unavailable" }), "Allow this profile again before pairing a device.");
assert.match(family, /Add a device for " \+ child\.nickname/);
assert.match(family, /create_child_pairing", \{ p_child: id \}/);

assert.equal(rules.bootAction("initialising", "AB23EFGH", false), "wait");
assert.equal(rules.bootAction("authenticated", "AB23EFGH", true), "restore");
assert.equal(rules.bootAction("unauthenticated", "AB23EFGH", true), "restore");
assert.equal(rules.bootAction("unauthenticated", "AB23EFGH", false), "redeem");
assert.equal(rules.bootAction("unauthenticated", "", false), "join");
assert.equal(rules.bootAction("error", "", true), "restore");
assert.equal(rules.bootAction("error", "AB23EFGH", false), "redeem");

assert.equal(rules.accessOutcome("allowed").signOut, false);
assert.equal(rules.accessOutcome("allowed").action, "open");
assert.equal(rules.accessOutcome("unavailable").signOut, false);
assert.equal(rules.accessOutcome("unavailable").action, "keep");
assert.equal(rules.accessOutcome("network").signOut, false);
assert.equal(rules.accessOutcome("profile_unavailable").signOut, false);
assert.equal(rules.accessOutcome("not_child").signOut, false);
assert.equal(rules.accessOutcome("device_revoked").signOut, true);
assert.equal(rules.accessOutcome("device_revoked").action, "join");

const firstDevice = rules.accessOutcome("allowed");
const secondDevice = rules.accessOutcome("device_revoked");
assert.equal(firstDevice.signOut, false);
assert.equal(secondDevice.signOut, true);
assert.notEqual(firstDevice.action, secondDevice.action);

assert.equal(rules.redeemFailureMessage("unavailable"), rules.PAIRING_DISABLED_MESSAGE);
assert.equal(rules.redeemFailureMessage("invalid"), "That code has expired or was already used.");
assert.match(rules.redeemFailureMessage("profile_unavailable"), /paused/);
assert.match(rules.redeemFailureMessage("limited"), /Too many tries/);
assert.match(rules.redeemFailureMessage("network"), /could not check that code/);

assert.equal(
  rules.stripPair("https://www.wondii.co.uk/child.html?pair=AB23EFGH"),
  "/child.html"
);
assert.equal(
  rules.stripPair("https://www.wondii.co.uk/child.html?pair=AB23EFGH&stay=1"),
  "/child.html?stay=1"
);

assert.match(sessionJs, /persistSession: true/);
assert.match(sessionJs, /autoRefreshToken: true/);
assert.match(sessionJs, /storage: global\.localStorage/);
assert.equal(sessionJs.includes("sessionStorage"), false);
assert.equal(sessionJs.includes("expiresIn"), false);

assert.ok(childHtml.indexOf("js/child-session-rules.js") < childHtml.indexOf("js/child-join.js"));
assert.match(join, /bootAction/);
assert.match(join, /accessOutcome/);
assert.match(join, /outcome\.signOut/);
assert.match(join, /forgetPairCode/);
assert.match(join, /restoreOrExplain/);
const start = join.slice(join.indexOf("function startChild"));
assert.match(start, /begin\(sessionRules\(\)\.bootAction/);
assert.match(start, /action === "restore"\) openSpace\(\)/);
assert.match(start, /action === "redeem"\) redeem\(\)/);
assert.equal(join.includes("sb.auth.signOut();\n            say(\"This device cannot open Wondii"), false);

function page(options) {
  const calls = { fetch: [], signOut: 0, rpc: [], replace: [] };
  const status = { textContent: "" };
  const form = {
    hidden: false,
    addEventListener() {},
    code: { value: "" }
  };
  const location = {
    hostname: "www.wondii.co.uk",
    href: options.href,
    pathname: "/child.html",
    search: options.search || "",
    hash: ""
  };
  const sb = {
    rpc(name) {
      calls.rpc.push(name);
      if (name === "child_content_access") return Promise.resolve({ data: options.access });
      return Promise.resolve({ data: { allowed: false } });
    },
    auth: {
      signOut() {
        calls.signOut += 1;
        return Promise.resolve();
      },
      setSession() {
        return Promise.resolve({ data: { session: { user: { id: "child" }, access_token: "saved" } } });
      },
      getSession() {
        return Promise.resolve({ data: { session: options.saved || null } });
      }
    }
  };
  const sandbox = {
    URL,
    URLSearchParams,
    document: {
      getElementById(id) {
        if (id === "childPairStatus") return status;
        if (id === "childPair") return form;
        if (id === "childJoin") return { insertBefore() {} };
        return null;
      },
      createElement() {
        return { appendChild() {}, setAttribute() {}, style: {}, addEventListener() {} };
      },
      createElementNS() {
        return { setAttribute() {} };
      }
    },
    fetch(url) {
      calls.fetch.push(String(url));
      return Promise.resolve({
        ok: options.pairOk === true,
        json() {
          return Promise.resolve(options.pairBody || { allowed: false, reason: "unavailable" });
        }
      });
    },
    window: null
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = location;
  sandbox.history = {
    replaceState(_state, _title, next) {
      calls.replace.push(next);
    }
  };
  sandbox.WondiiChildSession = rules;
  sandbox.SCORE_CONFIG = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon" };
  sandbox.WondiiSession = {
    client(done) { done(sb); },
    subscribe(fn) { fn(options.snap); }
  };
  vm.runInNewContext(join, sandbox);
  return { calls, status, form };
}

const savedUser = { user: { id: "child-a" }, access_token: "still-valid" };
const restored = page({
  href: "https://www.wondii.co.uk/child.html?pair=AB23EFGH",
  search: "?pair=AB23EFGH",
  snap: { status: "authenticated", session: savedUser },
  access: { allowed: true, reason: "allowed" }
});
await new Promise((resolve) => setTimeout(resolve, 20));
assert.deepEqual(restored.calls.fetch, []);
assert.ok(restored.calls.rpc.includes("child_content_access"));
assert.equal(restored.calls.signOut, 0);
assert.deepEqual(restored.calls.replace, ["/child.html"]);

const pairingOff = page({
  href: "https://www.wondii.co.uk/child.html?pair=AB23EFGH",
  search: "?pair=AB23EFGH",
  snap: { status: "unauthenticated", session: null },
  pairOk: false,
  pairBody: { allowed: false, reason: "unavailable" }
});
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(pairingOff.calls.fetch.length, 1);
assert.equal(pairingOff.calls.signOut, 0);
assert.equal(pairingOff.status.textContent, rules.PAIRING_DISABLED_MESSAGE);

const kept = page({
  href: "https://www.wondii.co.uk/child.html",
  search: "",
  snap: { status: "authenticated", session: savedUser },
  access: { allowed: false, reason: "unavailable" }
});
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(kept.calls.signOut, 0);
assert.equal(kept.calls.fetch.length, 0);
assert.match(kept.status.textContent, /stays linked/);

const revoked = page({
  href: "https://www.wondii.co.uk/child.html",
  search: "",
  snap: { status: "authenticated", session: savedUser },
  access: { allowed: false, reason: "device_revoked" }
});
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(revoked.calls.signOut, 1);
assert.match(revoked.status.textContent, /stopped/);
assert.equal(revoked.form.hidden, false);

console.log("child-session tests ok");
