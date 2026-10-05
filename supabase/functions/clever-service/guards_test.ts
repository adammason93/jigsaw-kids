import { assertEquals } from "jsr:@std/assert@1";
import {
  authenticateBearer,
  corsHeadersForOrigin,
  isAllowedStoryOrigin,
} from "./guards.ts";

Deno.test("anon-key bearer is 401 and does not look up a user", async () => {
  let lookups = 0;
  const result = await authenticateBearer("anon-key-value", "anon-key-value", async () => {
    lookups += 1;
    return "user-1";
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
    assertEquals(result.detail, "anon_key_not_a_user");
  }
  assertEquals(lookups, 0);
});

Deno.test("missing bearer is 401", async () => {
  const result = await authenticateBearer("", "anon", async () => "user-1");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.status, 401);
});

Deno.test("role=anon JWT is 401 without a user lookup", async () => {
  const payload = btoa(JSON.stringify({ role: "anon", ref: "abc" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const token = `hdr.${payload}.sig`;
  let lookups = 0;
  const result = await authenticateBearer(token, "different-anon", async () => {
    lookups += 1;
    return "user-1";
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.detail, "not_a_user_session");
  assertEquals(lookups, 0);
});

Deno.test("user JWT is accepted only when getUser returns the same id", async () => {
  const payload = btoa(JSON.stringify({ role: "authenticated", sub: "user-123" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const token = `hdr.${payload}.sig`;
  const ok = await authenticateBearer(token, "anon", async () => "user-123");
  assertEquals(ok.ok, true);
  if (ok.ok) assertEquals(ok.userId, "user-123");

  const mismatch = await authenticateBearer(token, "anon", async () => "other-user");
  assertEquals(mismatch.ok, false);
});

Deno.test("CORS allows the live site and localhost only", () => {
  assertEquals(isAllowedStoryOrigin("https://jigsaw-kids.adammason93.workers.dev"), true);
  assertEquals(isAllowedStoryOrigin("http://localhost:8787"), true);
  assertEquals(isAllowedStoryOrigin("http://127.0.0.1:5500"), true);
  assertEquals(isAllowedStoryOrigin("https://evil.example"), false);
  const headers = corsHeadersForOrigin("https://evil.example");
  assertEquals(headers["Access-Control-Allow-Origin"], undefined);
  const ok = corsHeadersForOrigin("http://localhost:3000");
  assertEquals(ok["Access-Control-Allow-Origin"], "http://localhost:3000");
});
