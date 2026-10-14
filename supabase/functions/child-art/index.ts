import { handleChildArt } from "./handler.mjs";
import { readPublishableKey, readServiceKey } from "../_shared/service-key.mjs";

/* Reads one private child_library object after the caller's session is checked.
   S3 credentials stay in the function environment and are never returned. */

const publicKey = readPublishableKey((name) => Deno.env.get(name)).key;
const namedServiceKey = readServiceKey((name) => Deno.env.get(name)).key;

Deno.serve((req) => handleChildArt(req, {
  supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
  anonKey: publicKey,
  serviceKey: namedServiceKey,
  s3AccessKeyId: Deno.env.get("CHILD_ART_S3_ACCESS_KEY_ID") || "",
  s3SecretAccessKey: Deno.env.get("CHILD_ART_S3_SECRET_ACCESS_KEY") || "",
  s3Region: Deno.env.get("CHILD_ART_S3_REGION") || "eu-west-1"
}, fetch));
