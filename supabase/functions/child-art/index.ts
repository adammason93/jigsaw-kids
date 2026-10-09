import { handleChildArt } from "./handler.mjs";

/* Reads one private child_library object after the caller's session is checked.
   S3 credentials stay in the function environment and are never returned. */

Deno.serve((req) => handleChildArt(req, {
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  s3AccessKeyId: Deno.env.get("CHILD_ART_S3_ACCESS_KEY_ID") || "",
  s3SecretAccessKey: Deno.env.get("CHILD_ART_S3_SECRET_ACCESS_KEY") || "",
  s3Region: Deno.env.get("CHILD_ART_S3_REGION") || "eu-west-1"
}, fetch));
