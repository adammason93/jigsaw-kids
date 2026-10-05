import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { handleGameMakerRequest } from "./handler.ts";

Deno.serve((req) => handleGameMakerRequest(req));
