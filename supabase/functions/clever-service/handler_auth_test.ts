/**
 * Loads the real handler with the listener disabled. Anon bearer must be 401
 * before OpenAI (no network lookup).
 */
Deno.env.set("CLEVER_SERVICE_NO_LISTEN", "1");
Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");
Deno.env.set("OPENAI_API_KEY", "sk-test-should-not-be-used");

const { handleCleverService } = await import("./index.ts");

import { assertEquals } from "jsr:@std/assert@1";

Deno.test("POST with only the anon key is 401", async () => {
  const res = await handleCleverService(
    new Request("https://fn.local/clever-service", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-anon-key",
        apikey: "test-anon-key",
        "Content-Type": "application/json",
        Origin: "http://localhost:8787",
      },
      body: JSON.stringify({ childName: "Ada", character: "unicorn", place: "beach" }),
    }),
  );
  assertEquals(res.status, 401);
  const body = await res.json();
  assertEquals(body.error, "unauthorized");
});

Deno.test("GET TTS with no session is 401", async () => {
  const res = await handleCleverService(
    new Request("https://fn.local/clever-service?ttsText=hello", {
      method: "GET",
      headers: { Origin: "http://127.0.0.1:5500" },
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("job poll with anon key is 401", async () => {
  const res = await handleCleverService(
    new Request(
      "https://fn.local/clever-service?storybook_job=11111111-1111-1111-1111-111111111111",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer test-anon-key",
          Origin: "https://jigsaw-kids.adammason93.workers.dev",
        },
      },
    ),
  );
  assertEquals(res.status, 401);
});
