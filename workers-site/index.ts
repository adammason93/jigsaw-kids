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
      return serveDocument(request, "/schools/learn/create.html", env);
    }
    if (url.pathname === "/teacher/learning/present" || url.pathname === "/teacher/learning/present/") {
      return serveDocument(request, "/schools/learn/present.html", env);
    }
    if (url.pathname === "/teacher/class" || url.pathname === "/teacher/class/") {
      return serveDocument(request, "/schools/learn/class.html", env);
    }
    if (url.pathname === "/join" || url.pathname === "/join/") {
      return serveDocument(request, "/schools/learn/join.html", env);
    }
    const learnPage = learnDocument(url.pathname);
    if (learnPage) return serveDocument(request, learnPage, env);
    return env.ASSETS.fetch(request);
  },
};

const LEARN_DOCUMENTS: Record<string, string> = {
  "/schools/learn/create": "/schools/learn/create.html",
  "/schools/learn/present": "/schools/learn/present.html",
  "/schools/learn/class": "/schools/learn/class.html",
  "/schools/learn/join": "/schools/learn/join.html",
};

function learnDocument(pathname: string): string | null {
  const bare = pathname.replace(/\/$/, "");
  if (LEARN_DOCUMENTS[bare]) return LEARN_DOCUMENTS[bare];
  if (bare.endsWith(".html") && LEARN_DOCUMENTS[bare.slice(0, -5)]) return LEARN_DOCUMENTS[bare.slice(0, -5)];
  return null;
}

async function serveDocument(request: Request, assetPath: string, env: Env): Promise<Response> {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (location) {
      const next = new URL(location, assetUrl);
      response = await env.ASSETS.fetch(new Request(next.toString(), request));
    }
  }
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache, must-revalidate");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
