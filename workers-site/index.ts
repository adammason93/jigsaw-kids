/**
 * Thin runtime so `wrangler deploy` has an entry-point. Static files are served
 * from repo root (`assets.directory: "."`) via the ASSETS binding.
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
