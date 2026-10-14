import assert from "node:assert/strict";
import {
  readPublishableKey,
  readServiceKey,
  serviceAuthHeaders,
  stripSecretBearer,
} from "../supabase/functions/_shared/service-key.mjs";

const named = readServiceKey((name) => {
  if (name === "SUPABASE_SECRET_KEYS") {
    return JSON.stringify({ default: "sb_secret_old", cursornew: "sb_secret_new" });
  }
  if (name === "SUPABASE_SERVICE_ROLE_KEY") return "legacy-jwt";
  return "";
});
assert.equal(named.source, "cursornew");
assert.equal(named.key, "sb_secret_new");

const secretHeaders = serviceAuthHeaders(named.key, { "x-upsert": "true" });
assert.equal(secretHeaders.apikey, "sb_secret_new");
assert.equal(secretHeaders.Authorization, undefined);
assert.equal(secretHeaders["x-upsert"], "true");

const legacyHeaders = serviceAuthHeaders("legacy-jwt");
assert.equal(legacyHeaders.Authorization, "Bearer legacy-jwt");
assert.equal(legacyHeaders.apikey, "legacy-jwt");

const stripped = stripSecretBearer("sb_secret_new", {
  headers: { Authorization: "Bearer sb_secret_new", apikey: "sb_secret_new" },
});
assert.equal(new Headers(stripped.headers).get("Authorization"), null);
assert.equal(new Headers(stripped.headers).get("apikey"), "sb_secret_new");

const userKept = stripSecretBearer("sb_secret_new", {
  headers: { Authorization: "Bearer user-jwt", apikey: "sb_secret_new" },
});
assert.equal(new Headers(userKept.headers).get("Authorization"), "Bearer user-jwt");

const missing = readServiceKey((name) => (name === "SUPABASE_SERVICE_ROLE_KEY" ? "legacy-jwt" : ""));
assert.equal(missing.source, "missing");
assert.equal(missing.key, "");

const published = readPublishableKey((name) => {
  if (name === "SUPABASE_PUBLISHABLE_KEYS") return JSON.stringify({ default: "sb_publishable_web" });
  if (name === "SUPABASE_ANON_KEY") return "legacy-anon";
  return "";
});
assert.equal(published.source, "publishable");
assert.equal(published.key, "sb_publishable_web");

console.log("service-key tests passed");
