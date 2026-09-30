/**
 * Thin runtime so `wrangler deploy` has an entry-point. Static files are served
 * from repo root (`assets.directory: "."`) via the ASSETS binding.
 */
interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ramsden" || url.pathname === "/ramsden/") {
      url.pathname = "/ramsden.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    if (url.pathname === "/schools/demo/electricity" || url.pathname === "/schools/demo/electricity/") {
      url.pathname = "/schools/demo/electricity.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    if (url.pathname === "/teacher/learning/create" || url.pathname === "/teacher/learning/create/") {
      url.pathname = "/schools/learn/create.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    if (url.pathname === "/teacher/learning/present" || url.pathname === "/teacher/learning/present/") {
      url.pathname = "/schools/learn/present.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    if (url.pathname === "/teacher/class" || url.pathname === "/teacher/class/") {
      url.pathname = "/schools/learn/class.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    if (url.pathname === "/join" || url.pathname === "/join/") {
      url.pathname = "/schools/learn/join.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }
    return env.ASSETS.fetch(request);
  },
};
