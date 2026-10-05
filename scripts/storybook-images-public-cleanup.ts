/**
 * FOUNDER APPROVAL REQUIRED. This script is not run by CI or by `supabase db push`.
 *
 * It inventories the public `storybook_images` bucket, copies objects that are
 * still referenced into the private bucket, rewrites cloud shelf JSON to store
 * paths instead of public URLs, THEN deletes every public object and makes the
 * bucket private.
 *
 * Dry-run (no writes, no deletes) — safe to inspect:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     deno run --allow-net --allow-env scripts/storybook-images-public-cleanup.ts
 *
 * Destructive run — only after you choose to migrate rather than drop old pictures:
 *   CONFIRM_STORYBOOK_PUBLIC_DELETE=yes \
 *     deno run --allow-net --allow-env scripts/storybook-images-public-cleanup.ts --execute
 *
 * Choice:
 *   - Run with --execute: cloud shelves and job rows that point at public URLs
 *     are copied under {user id}/storybook/migrated/ and the shelf JSON is
 *     rewritten. Pictures that have no user (not on a cloud shelf and not on a
 *     job with user_id) are copied to _unassigned/ and then the public objects
 *     are still deleted. Books that exist only in a browser and were never
 *     uploaded are not visible here; those pictures will break.
 *   - Do not run it, and later delete or privatise the bucket yourself: every
 *     saved book whose only image URL is /object/public/storybook_images/ loses
 *     its pictures. New books already use the private bucket.
 *
 * Do not point this at a project you have not backed up.
 */

const PUBLIC_BUCKET = "storybook_images";
const PRIVATE_BUCKET = "storybook_images_private";
const URL_RE =
  /\/storage\/v1\/object\/public\/storybook_images\/([^"'\s?]+)/g;

type RefHit = { objectPath: string; userId: string | null; source: string };

const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const execute = Deno.args.includes("--execute");
const confirmed = Deno.env.get("CONFIRM_STORYBOOK_PUBLIC_DELETE") === "yes";

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Nothing was changed.");
  Deno.exit(1);
}
if (execute && !confirmed) {
  console.error(
    "Refusing --execute without CONFIRM_STORYBOOK_PUBLIC_DELETE=yes. Nothing was changed.",
  );
  Deno.exit(1);
}

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

async function listAll(bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${bucket} ${res.status} ${await res.text()}`);
    const rows = await res.json() as { name: string; id: string | null }[];
    if (!rows.length) break;
    for (const row of rows) {
      const child = prefix ? `${prefix}${row.name}` : row.name;
      if (!row.id) {
        const nested = await listAll(bucket, `${child.replace(/\/+$/, "")}/`);
        out.push(...nested);
      } else {
        out.push(child);
      }
    }
    if (rows.length < 100) break;
    offset += rows.length;
  }
  return out;
}

function collectUrls(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(URL_RE)) {
    try {
      found.push(decodeURIComponent(match[1]));
    } catch {
      found.push(match[1]);
    }
  }
  return found;
}

async function downloadText(bucket: string, path: string): Promise<string> {
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`download ${path} ${res.status}`);
  return await res.text();
}

async function main() {
  console.log(execute ? "EXECUTE" : "DRY RUN (no writes, no deletes)");
  const objects = await listAll(PUBLIC_BUCKET);
  console.log(`public objects: ${objects.length}`);

  const hits: RefHit[] = [];
  const shelves = (await listAll("storybook_room")).filter((p) => p.endsWith("/storybook/shelf.json") || p.endsWith("shelf.json"));
  console.log(`shelf files: ${shelves.length}`);
  const shelfBodies = new Map<string, string>();
  for (const shelfPath of shelves) {
    const userId = shelfPath.split("/")[0] || null;
    const text = await downloadText("storybook_room", shelfPath);
    shelfBodies.set(shelfPath, text);
    for (const objectPath of collectUrls(text)) {
      hits.push({ objectPath, userId, source: `shelf:${shelfPath}` });
    }
  }

  const jobsRes = await fetch(
    `${url}/rest/v1/storybook_generation_jobs?select=id,user_id,result_payload`,
    { headers: headers({ Accept: "application/json" }) },
  );
  if (!jobsRes.ok) throw new Error(`jobs ${jobsRes.status} ${await jobsRes.text()}`);
  const jobs = await jobsRes.json() as { id: string; user_id: string | null; result_payload: unknown }[];
  for (const job of jobs) {
    const text = JSON.stringify(job.result_payload ?? "");
    for (const objectPath of collectUrls(text)) {
      hits.push({ objectPath, userId: job.user_id, source: `job:${job.id}` });
    }
  }

  const ownerByPath = new Map<string, string>();
  for (const hit of hits) {
    const current = ownerByPath.get(hit.objectPath);
    if (!hit.userId) continue;
    if (current && current !== hit.userId && current !== "_unassigned") {
      console.warn(`owner conflict ${hit.objectPath}: ${current} vs ${hit.userId} (${hit.source})`);
      continue;
    }
    ownerByPath.set(hit.objectPath, hit.userId);
  }
  for (const objectPath of objects) {
    if (!ownerByPath.has(objectPath)) ownerByPath.set(objectPath, "_unassigned");
  }

  const referenced = new Set(hits.map((h) => h.objectPath));
  console.log(`referenced public objects: ${referenced.size}`);
  console.log(`unreferenced public objects (deleted on execute, not copied): ${objects.filter((p) => !referenced.has(p)).length}`);
  console.log("sample:", objects.slice(0, 8).join("\n  "));

  if (!execute) {
    console.log("\nDry run finished. Nothing was copied or deleted.");
    console.log("To migrate then delete, re-run with --execute and CONFIRM_STORYBOOK_PUBLIC_DELETE=yes.");
    return;
  }

  const copied = new Map<string, string>();
  for (const objectPath of referenced) {
    if (!objects.includes(objectPath)) {
      console.warn(`referenced but missing in bucket: ${objectPath}`);
      continue;
    }
    const owner = ownerByPath.get(objectPath) ?? "_unassigned";
    const base = objectPath.split("/").pop() || "image.png";
    const dest = `${owner}/storybook/migrated/${base}`;
    const bin = await fetch(`${url}/storage/v1/object/${PUBLIC_BUCKET}/${objectPath}`, {
      headers: headers(),
    });
    if (!bin.ok) {
      console.warn(`skip copy ${objectPath}: ${bin.status}`);
      continue;
    }
    const bytes = new Uint8Array(await bin.arrayBuffer());
    const up = await fetch(`${url}/storage/v1/object/${PRIVATE_BUCKET}/${dest}`, {
      method: "POST",
      headers: headers({
        "Content-Type": "image/png",
        "x-upsert": "true",
      }),
      body: bytes,
    });
    if (!up.ok) {
      console.warn(`upload failed ${dest}: ${up.status} ${(await up.text()).slice(0, 180)}`);
      continue;
    }
    copied.set(objectPath, dest);
  }
  console.log(`copied: ${copied.size}`);

  for (const [shelfPath, text] of shelfBodies) {
    let next = text;
    let changed = false;
    for (const [from, dest] of copied) {
      if (!next.includes(from)) continue;
      changed = true;
      const publicRe = new RegExp(
        `https?:\\\\/\\\\/[^"'\\s]+\\/storage\\/v1\\/object\\/public\\/${PUBLIC_BUCKET}\\/${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g",
      );
      next = next.replace(publicRe, "");
    }
    if (!changed) continue;
    try {
      const parsed = JSON.parse(text) as unknown[];
      if (Array.isArray(parsed)) {
        for (const book of parsed) {
          if (!book || typeof book !== "object") continue;
          const rec = book as Record<string, unknown>;
          const scene = typeof rec.sceneUrlFallback === "string" ? rec.sceneUrlFallback : "";
          for (const [from, dest] of copied) {
            if (scene.includes(from)) {
              rec.sceneImageStoragePath = dest;
              rec.sceneUrlFallback = null;
            }
          }
          if (Array.isArray(rec.pages)) {
            for (const page of rec.pages) {
              if (!page || typeof page !== "object") continue;
              const p = page as Record<string, unknown>;
              const fb = typeof p.imageUrlFallback === "string" ? p.imageUrlFallback : "";
              for (const [from, dest] of copied) {
                if (fb.includes(from)) {
                  p.imageStoragePath = dest;
                  p.imageUrlFallback = null;
                }
              }
            }
          }
        }
        next = JSON.stringify(parsed);
      }
    } catch {
      console.warn(`shelf ${shelfPath} is not a JSON array; left unchanged`);
      continue;
    }
    const put = await fetch(`${url}/storage/v1/object/storybook_room/${shelfPath}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", "x-upsert": "true" }),
      body: next,
    });
    if (!put.ok) console.warn(`shelf rewrite failed ${shelfPath}: ${put.status}`);
    else console.log(`rewrote ${shelfPath}`);
  }

  for (let i = 0; i < objects.length; i += 50) {
    const batch = objects.slice(i, i + 50);
    const del = await fetch(`${url}/storage/v1/object/${PUBLIC_BUCKET}`, {
      method: "DELETE",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: batch }),
    });
    if (!del.ok) console.warn(`delete batch failed: ${del.status} ${(await del.text()).slice(0, 180)}`);
  }
  console.log(`deleted public objects: ${objects.length}`);

  const priv = await fetch(`${url}/storage/v1/bucket/${PUBLIC_BUCKET}`, {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ public: false }),
  });
  if (!priv.ok) {
    console.warn(`Could not mark bucket private via the API (${priv.status}). Run this SQL by hand:`);
    console.warn(`update storage.buckets set public = false where id = '${PUBLIC_BUCKET}';`);
  } else {
    console.log("storybook_images is now private.");
  }
}

if (import.meta.main) {
  await main();
}
