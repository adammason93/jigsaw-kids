/**
 * Auth and CORS checks for game-maker. Run from the repo root:
 *   deno test supabase/functions/game-maker/handler_test.ts
 */
import { handleGameMakerRequest } from "./handler.ts";

/** Public anon key shipped in js/score-config.js. It is a valid JWT (role "anon"). */
const PUBLISHED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudXpyY2pucnh3Z2xhY2l2bG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDI2OTYsImV4cCI6MjA5MjgxODY5Nn0.vYbFLRoKgpeNkzPntutSc3P1DxURjBP7qd40_kk8peA";

const LIVE_ORIGIN = "https://jigsaw-kids.adammason93.workers.dev";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function assertEquals(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function jwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${enc({ alg: "none", typ: "JWT" })}.${enc(payload)}.sig`;
}

function userJwt(): string {
  return jwt({
    role: "authenticated",
    sub: USER_ID,
    aud: "authenticated",
  });
}

type Call = { url: string; authorization: string };

function recordingFetch(
  handler: (call: Call) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    const call = {
      url: String(input),
      authorization: headers.get("Authorization") ?? "",
    };
    calls.push(call);
    return Promise.resolve(handler(call));
  };
  return { fetchImpl, calls };
}

function post(
  headers: Record<string, string>,
  body: unknown = { prompt: "collect sparkly stars in a purple forest" },
): Request {
  return new Request("https://example.supabase.co/functions/v1/dynamic-action", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const baseEnv: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: PUBLISHED_ANON_KEY,
  OPENAI_API_KEY: "sk-test",
};

function getEnv(extra: Record<string, string> = {}) {
  const values = { ...baseEnv, ...extra };
  return (name: string) => values[name];
}

function sampleHtml(): string {
  return `<!DOCTYPE html><html><body>
<!-- ${"x".repeat(80)} -->
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
<script>const engine = new BABYLON.Engine(null, true);</script>
</body></html>`;
}

Deno.test("published anon key is 401 and does not call the network", async () => {
  const { fetchImpl, calls } = recordingFetch(() => {
    throw new Error("network should not be called");
  });
  const res = await handleGameMakerRequest(
    post({
      Origin: LIVE_ORIGIN,
      Authorization: `Bearer ${PUBLISHED_ANON_KEY}`,
      apikey: PUBLISHED_ANON_KEY,
      "Content-Type": "application/json",
    }),
    { getEnv: getEnv(), fetchImpl },
  );
  assertEquals(res.status, 401, "status");
  const body = await res.json();
  assertEquals(body.error, "sign_in_required", "error");
  assertEquals(calls.length, 0, "network calls");
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), LIVE_ORIGIN, "cors");
});

Deno.test("missing token, service role, and garbage are 401 with no network", async () => {
  const tokens = [
    "",
    `Bearer ${jwt({ role: "service_role" })}`,
    "Bearer not-a-jwt",
    "Basic abc",
  ];
  for (const authorization of tokens) {
    const { fetchImpl, calls } = recordingFetch(() => {
      throw new Error("network should not be called");
    });
    const headers: Record<string, string> = {
      Origin: LIVE_ORIGIN,
      "Content-Type": "application/json",
    };
    if (authorization) headers.Authorization = authorization;
    const res = await handleGameMakerRequest(post(headers), {
      getEnv: getEnv(),
      fetchImpl,
    });
    assertEquals(res.status, 401, authorization || "(none)");
    assertEquals(calls.length, 0, "network calls");
  }
});

Deno.test("user token rejected by auth is 401 and does not call OpenAI", async () => {
  const { fetchImpl, calls } = recordingFetch((call) => {
    if (call.url.endsWith("/auth/v1/user")) {
      return new Response(JSON.stringify({ message: "invalid" }), { status: 403 });
    }
    return new Response("openai should not be called", { status: 500 });
  });
  const res = await handleGameMakerRequest(
    post({
      Origin: "http://localhost:8080",
      Authorization: `Bearer ${userJwt()}`,
      apikey: PUBLISHED_ANON_KEY,
      "Content-Type": "application/json",
    }),
    { getEnv: getEnv(), fetchImpl },
  );
  assertEquals(res.status, 401, "status");
  assertEquals(calls.length, 1, "only auth lookup");
  assertEquals(calls[0].url, "https://example.supabase.co/auth/v1/user", "auth url");
  assertEquals(calls[0].authorization, `Bearer ${userJwt()}`, "user token");
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:8080",
    "localhost cors",
  );
});

Deno.test("auth outage returns 503 and does not call OpenAI", async () => {
  const { fetchImpl, calls } = recordingFetch(() => {
    throw new Error("auth down");
  });
  const res = await handleGameMakerRequest(
    post({
      Authorization: `Bearer ${userJwt()}`,
      "Content-Type": "application/json",
    }),
    { getEnv: getEnv(), fetchImpl },
  );
  assertEquals(res.status, 503, "status");
  assertEquals(calls.length, 1, "only the failed auth lookup");
  assertEquals(calls[0].url.includes("api.openai.com"), false, "no openai");
});

Deno.test("user-looking token without Supabase URL is 503 and does not call the network", async () => {
  const { fetchImpl, calls } = recordingFetch(() => {
    throw new Error("network should not be called");
  });
  const res = await handleGameMakerRequest(
    post({ Authorization: `Bearer ${userJwt()}`, "Content-Type": "application/json" }),
    {
      getEnv: (name) => (name === "SUPABASE_URL" ? undefined : getEnv()(name)),
      fetchImpl,
    },
  );
  assertEquals(res.status, 503, "status");
  assertEquals(calls.length, 0, "network calls");
});

Deno.test("signed-in user can reach OpenAI", async () => {
  const html = sampleHtml();
  const { fetchImpl, calls } = recordingFetch((call) => {
    if (call.url.endsWith("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: USER_ID, role: "authenticated" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (call.url === "https://api.openai.com/v1/chat/completions") {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ html }) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("unexpected", { status: 500 });
  });
  const res = await handleGameMakerRequest(
    post({
      Origin: LIVE_ORIGIN,
      Authorization: `Bearer ${userJwt()}`,
      apikey: PUBLISHED_ANON_KEY,
      "Content-Type": "application/json",
    }),
    { getEnv: getEnv(), fetchImpl },
  );
  assertEquals(res.status, 200, "status");
  const body = await res.json();
  assertEquals(typeof body.html, "string", "html type");
  assertEquals(body.html.includes("babylon.js"), true, "html body");
  assertEquals(calls.length, 2, "auth then openai");
  assertEquals(calls[1].url, "https://api.openai.com/v1/chat/completions", "openai url");
  assertEquals(calls[1].authorization, "Bearer sk-test", "openai key not the user token");
});

Deno.test("auth user with anon role is 401 even if the JWT claim looked authenticated", async () => {
  const { fetchImpl, calls } = recordingFetch(() =>
    new Response(JSON.stringify({ id: USER_ID, role: "anon" }), { status: 200 })
  );
  const res = await handleGameMakerRequest(
    post({ Authorization: `Bearer ${userJwt()}`, "Content-Type": "application/json" }),
    { getEnv: getEnv(), fetchImpl },
  );
  assertEquals(res.status, 401, "status");
  assertEquals(calls.length, 1, "no openai");
});

Deno.test("CORS allows the live sites, localhost, and an env origin only", async () => {
  const cases: Array<{ origin: string; allowed: string | null; env?: string }> = [
    { origin: LIVE_ORIGIN, allowed: LIVE_ORIGIN },
    { origin: "https://wondii.co.uk", allowed: "https://wondii.co.uk" },
    { origin: "https://www.wondii.co.uk", allowed: "https://www.wondii.co.uk" },
    { origin: "http://localhost:8787", allowed: "http://localhost:8787" },
    { origin: "http://127.0.0.1:8080", allowed: "http://127.0.0.1:8080" },
    { origin: "https://evil.example", allowed: null },
    { origin: "https://wondii.co.uk.evil.com", allowed: null },
    { origin: "https://notwondii.co.uk", allowed: null },
    { origin: "https://jigsaw-kids.adammason93.workers.dev.evil.com", allowed: null },
    { origin: "http://localhost.evil.com", allowed: null },
    {
      origin: "https://preview.example",
      allowed: "https://preview.example",
      env: "https://preview.example",
    },
  ];
  for (const item of cases) {
    const res = await handleGameMakerRequest(
      new Request("https://example.supabase.co/functions/v1/dynamic-action", {
        method: "OPTIONS",
        headers: { Origin: item.origin },
      }),
      { getEnv: getEnv(item.env ? { GAME_MAKER_ALLOWED_ORIGINS: item.env } : {}) },
    );
    assertEquals(res.status, 200, item.origin);
    assertEquals(
      res.headers.get("Access-Control-Allow-Origin"),
      item.allowed,
      item.origin,
    );
  }
});
