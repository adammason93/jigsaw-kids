import { handleChildArt } from "./handler.mjs";

/* Reads one private child_library object after the caller's session is checked.
   Not deployed. The service role stays in this function. */

Deno.serve((req) => handleChildArt(req, {
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
}, fetch));
