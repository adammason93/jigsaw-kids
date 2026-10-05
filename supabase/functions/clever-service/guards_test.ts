import { assertEquals } from "jsr:@std/assert@1";
import {
  assessStorageProxyUrl,
  authenticateBearer,
  blankReferencePhotos,
  corsHeadersForOrigin,
  gptImageModerationFromEnv,
  isAllowedStoryOrigin,
  minimalJobMetadata,
  proxyRedirectAllowed,
  stripEmbeddedPhotoStrings,
} from "./guards.ts";

Deno.test("anon-key bearer is 401 and does not look up a user", async () => {
  let lookups = 0;
  const result = await authenticateBearer("anon-key-value", "anon-key-value", async () => {
    lookups += 1;
    return "user-1";
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
    assertEquals(result.detail, "anon_key_not_a_user");
  }
  assertEquals(lookups, 0);
});

Deno.test("missing bearer is 401", async () => {
  const result = await authenticateBearer("", "anon", async () => "user-1");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.status, 401);
});

Deno.test("role=anon JWT is 401 without a user lookup", async () => {
  const payload = btoa(JSON.stringify({ role: "anon", ref: "abc" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const token = `hdr.${payload}.sig`;
  let lookups = 0;
  const result = await authenticateBearer(token, "different-anon", async () => {
    lookups += 1;
    return "user-1";
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.detail, "not_a_user_session");
  assertEquals(lookups, 0);
});

Deno.test("user JWT is accepted only when getUser returns the same id", async () => {
  const payload = btoa(JSON.stringify({ role: "authenticated", sub: "user-123" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const token = `hdr.${payload}.sig`;
  const ok = await authenticateBearer(token, "anon", async () => "user-123");
  assertEquals(ok.ok, true);
  if (ok.ok) assertEquals(ok.userId, "user-123");

  const mismatch = await authenticateBearer(token, "anon", async () => "other-user");
  assertEquals(mismatch.ok, false);
});

const PROJECT = "https://enuzrcjnrxwglacivlnu.supabase.co";

Deno.test("image proxy rejects foreign hosts", () => {
  const foreign = assessStorageProxyUrl("https://evil.example/secret", PROJECT);
  assertEquals(foreign.ok, false);
  if (!foreign.ok) assertEquals(foreign.reason, "foreign_host");

  const openai = assessStorageProxyUrl(
    "https://oaiusercontent.com/file.png",
    PROJECT,
  );
  assertEquals(openai.ok, false);
});

Deno.test("image proxy allows this project's storage buckets only", () => {
  const ok = assessStorageProxyUrl(
    `${PROJECT}/storage/v1/object/public/storybook_images/gptimage/a.png`,
    PROJECT,
  );
  assertEquals(ok.ok, true);
  const priv = assessStorageProxyUrl(
    `${PROJECT}/storage/v1/object/sign/storybook_images_private/uid/storybook/a.png?token=abc`,
    PROJECT,
  );
  assertEquals(priv.ok, true);
  const otherBucket = assessStorageProxyUrl(
    `${PROJECT}/storage/v1/object/public/other_bucket/a.png`,
    PROJECT,
  );
  assertEquals(otherBucket.ok, false);
});

Deno.test("image proxy does not follow a redirect to another host", () => {
  const current = `${PROJECT}/storage/v1/object/public/storybook_images/gptimage/a.png`;
  const blocked = proxyRedirectAllowed(current, "https://evil.example/x", PROJECT);
  assertEquals(blocked.ok, false);
  if (!blocked.ok) assertEquals(blocked.reason, "proxy_redirect_blocked");
  const same = proxyRedirectAllowed(
    current,
    `${PROJECT}/storage/v1/object/public/storybook_images/gptimage/b.png`,
    PROJECT,
  );
  assertEquals(same.ok, true);
});

Deno.test("job metadata keeps lengths, not photos, names, or plot text", () => {
  const photo = "data:image/jpeg;base64," + "A".repeat(80);
  const meta = minimalJobMetadata({
    childName: "Freya",
    plotHint: "a secret door",
    character: "unicorn",
    place: "beach",
    heroReferenceImage: photo,
    characterReferencePhotos: [{ who: "hero", image: photo }],
  });
  const packed = JSON.stringify(meta);
  assertEquals(packed.includes("Freya"), false);
  assertEquals(packed.includes("secret door"), false);
  assertEquals(packed.includes("data:image"), false);
  assertEquals(meta.childNameLen, 5);
  assertEquals(meta.plotHintLen, "a secret door".length);
  assertEquals(meta.hadReferencePhotos, true);
});

Deno.test("terminal photo wipe removes data URLs and blanks the in-memory body", () => {
  const photo = "data:image/png;base64," + "B".repeat(40);
  const body: Record<string, unknown> = {
    childName: "Ada",
    referencePhoto: photo,
    heroReferenceImages: [photo],
  };
  blankReferencePhotos(body);
  assertEquals(body.referencePhoto, null);
  assertEquals(body.heroReferenceImages, null);
  const stripped = stripEmbeddedPhotoStrings({
    title: "Hello",
    imageUrl: "https://example.supabase.co/storage/v1/object/sign/storybook_images_private/a.png",
    referencePhoto: photo,
    pages: [{ text: "Hi", imageUrl: photo }],
  }) as { imageUrl: string; referencePhoto: null; pages: { imageUrl: string | null }[] };
  assertEquals(stripped.imageUrl.startsWith("https://"), true);
  assertEquals(stripped.referencePhoto, null);
  assertEquals(stripped.pages[0].imageUrl, null);
});

Deno.test("CORS allows the live site and localhost only", () => {
  assertEquals(isAllowedStoryOrigin("https://jigsaw-kids.adammason93.workers.dev"), true);
  assertEquals(isAllowedStoryOrigin("http://localhost:8787"), true);
  assertEquals(isAllowedStoryOrigin("http://127.0.0.1:5500"), true);
  assertEquals(isAllowedStoryOrigin("https://evil.example"), false);
  const headers = corsHeadersForOrigin("https://evil.example");
  assertEquals(headers["Access-Control-Allow-Origin"], undefined);
  const ok = corsHeadersForOrigin("http://localhost:3000");
  assertEquals(ok["Access-Control-Allow-Origin"], "http://localhost:3000");
});

Deno.test("image moderation defaults to auto unless the secret is low", () => {
  assertEquals(gptImageModerationFromEnv(undefined), "auto");
  assertEquals(gptImageModerationFromEnv(""), "auto");
  assertEquals(gptImageModerationFromEnv("auto"), "auto");
  assertEquals(gptImageModerationFromEnv("LOW"), "low");
  assertEquals(gptImageModerationFromEnv(" low "), "low");
});
