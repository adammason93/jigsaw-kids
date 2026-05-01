import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_SCRIPT_HOST = "https://cdn.babylonjs.com/";
const MAX_PROMPT_LEN = 480;
const MAX_HTML_OUT = 120_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unwrapJsonContent(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  return s;
}

function sanitizePrompt(raw: string): string {
  return raw
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_PROMPT_LEN);
}

/** Reject obviously unsafe patterns; keep false positives low. */
function validateGameHtml(html: string): string | null {
  if (html.length < 200 || html.length > MAX_HTML_OUT) return "html_size";
  const lower = html.toLowerCase();
  if (!lower.includes("cdn.babylonjs.com/babylon.js")) return "missing_babylon";
  if (/\beval\s*\(/i.test(html)) return "unsafe_eval";
  if (/\bnew\s+Function\s*\(/i.test(html)) return "unsafe_function";
  if (/\bfetch\s*\(/i.test(html)) return "unsafe_fetch";
  if (/\bXMLHttpRequest\b/i.test(html)) return "unsafe_xhr";
  if (/\bWebSocket\b/i.test(html)) return "unsafe_ws";
  if (/<iframe\b/i.test(html)) return "unsafe_iframe";
  const re = /<script\b[^>]*src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1].trim();
    if (!u.startsWith(ALLOWED_SCRIPT_HOST)) return "disallowed_script_src";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const apiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
  if (!apiKey) {
    return jsonResponse({ error: "server_misconfigured", detail: "OPENAI_API_KEY" }, 500);
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" }, 400);
  }

  const prompt = sanitizePrompt(String(body.prompt ?? ""));
  if (prompt.length < 8) {
    return jsonResponse({ error: "prompt_too_short" }, 400);
  }

  const system =
    `You build single-file Babylon.js mini-games for children (ages ~5–9), UK English any UI text.
Reply with JSON only: one object with key "html" (string).

The "html" value must be a full HTML document that runs offline in a browser with NO build step.

STRICT rules:
- Kid-safe: gentle, silly, no violence, scares, romance, weapons, or data collection.
- Load Babylon ONLY from these two script URLs in order (no other script src):
  https://cdn.babylonjs.com/babylon.js
  https://cdn.babylonjs.com/gui/babylon.gui.min.js
- Inline all CSS in <style>. Put game logic in <script> after those two tags.
- NO fetch, XMLHttpRequest, WebSocket, eval, new Function, import maps, workers, or iframes.
- NO other external script/link to JS except the two CDN lines above.
- Full-bleed 3D: html,body{margin:0;height:100%;overflow:hidden;} #renderCanvas{width:100%;height:100%;touch-action:none;display:block;}
- Use BABYLON globally (Engine, Scene, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, PointerEventTypes, etc.). Use BABYLON.GUI for a simple on-screen label and a large "Again" / restart button.
- Touch + mouse: pointer on canvas; big colourful shapes; one simple goal (e.g. tap moving targets, roll a ball to a zone, collect floating stars). Keep the Babylon JS portion concise (aim ~120–320 lines) but complete and runnable.
- Professional look: soft lighting (hemisphere + directional), subtle colours, rounded box/sphere toys — not flat clip-art.
- If a JS string must mention a closing script tag, split it with string concatenation so the HTML file stays valid.

Implement THIS idea from the child:
`;

  const user = prompt;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 12000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("[game-maker] openai", r.status, t.slice(0, 400));
    return jsonResponse(
      { error: "openai_failed", detail: t.slice(0, 200) },
      502,
    );
  }

  const data = await r.json();
  const content = String(data.choices?.[0]?.message?.content ?? "").trim();
  let parsed: { html?: string };
  try {
    parsed = JSON.parse(unwrapJsonContent(content)) as { html?: string };
  } catch (e) {
    console.error("[game-maker] json parse", e, content.slice(0, 400));
    return jsonResponse({ error: "bad_model_json" }, 502);
  }

  const html = String(parsed.html ?? "").trim();
  const bad = validateGameHtml(html);
  if (bad) {
    console.warn("[game-maker] validate failed", bad);
    return jsonResponse({ error: "unsafe_or_invalid_html", code: bad }, 422);
  }

  return jsonResponse({ html });
});
