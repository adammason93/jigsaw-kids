import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { handleGameMakerRequest } from "./handler.ts";
import { readPublishableKey, readServiceKey } from "../_shared/service-key.mjs";

readServiceKey((name) => Deno.env.get(name));
readPublishableKey((name) => Deno.env.get(name));

Deno.serve((req) => handleGameMakerRequest(req));
