/* Deploy target for Book V2. Not deployed by this change.
   The handler lives in scripts/book/handle-request.js and refuses paid generation.
   Supabase must be given that file with this function before a production call can succeed. */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const handle = require(join(here, "../../../scripts/book/handle-request.js"));

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, message: "Book V2 is not on this path." }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  let body: unknown = {};
  try {
    body = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ ok: false, message: "The story request could not be read." }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const result = handle.handleBookV2(body);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
