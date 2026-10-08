/* Speech allowance: one story, a shared connection, repeats, and a hard stop. */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SPEECH_BUSY_MESSAGE,
  TTS_HOUR_CHARS,
  TTS_HOUR_LONG,
  TTS_HOUR_SHORT,
  TTS_SHORT_CHARS,
  canonicalPublicAddress,
  createAtomicQuota,
  speechPlaybackPlan,
  speechSignature,
  verifiedSpeechAddress
} from "../supabase/functions/clever-service/job-access.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = "The little fox followed the moonlit path and found a warm lantern. ";
const pageText = page.repeat(8).slice(0, 450);
assert.ok(pageText.length > TTS_SHORT_CHARS);

function childStory(name) {
  const pages = [];
  for (let i = 0; i < 8; i++) pages.push(name + " page " + i + " " + pageText);
  const words = [];
  for (let i = 0; i < 25; i++) words.push(name + " word " + i);
  return { pages, words };
}

async function hear(quota, cache, bucket, text) {
  const key = bucket + "\n" + text;
  if (cache.has(key)) {
    const plan = speechPlaybackPlan({ cacheHit: true, quotaAllow: false });
    assert.strictEqual(plan.openai, false);
    assert.strictEqual(plan.counted, false);
    return plan;
  }
  const allowed = await quota.take(bucket, text);
  const plan = speechPlaybackPlan({ cacheHit: false, quotaAllow: allowed });
  if (plan.openai) cache.add(key);
  return plan;
}

const household = createAtomicQuota();
const householdCache = new Set();
for (const name of ["Ada", "Ben", "Cleo", "Dev"]) {
  const story = childStory(name);
  for (const text of story.pages.concat(story.words)) {
    const first = await hear(household, householdCache, "home", text);
    assert.strictEqual(first.openai, true);
    const again = await hear(household, householdCache, "home", text);
    assert.strictEqual(again.cached, true);
    assert.strictEqual(again.openai, false);
  }
}
const sharedWord = await hear(household, householdCache, "home", "lantern");
assert.strictEqual(sharedWord.openai, true);
const sharedAgain = await hear(household, householdCache, "home", "lantern");
assert.strictEqual(sharedAgain.cached, true);
assert.strictEqual(sharedAgain.counted, false);
const home = household.rows.get("home");
assert.strictEqual(home.longCount, 32);
assert.strictEqual(home.shortCount, 101);
assert.ok(home.chars < TTS_HOUR_CHARS);

const school = createAtomicQuota();
const schoolCache = new Set();
const children = [];
for (let i = 0; i < 30; i++) children.push("Pupil " + i);
for (const name of children) {
  const story = childStory(name);
  for (const text of story.pages.concat(story.words)) {
    const plan = await hear(school, schoolCache, "school", text);
    assert.strictEqual(plan.openai, true, name);
  }
}
const classUsage = school.rows.get("school");
assert.ok(classUsage.longCount === 240);
assert.ok(classUsage.shortCount === 750);
assert.ok(classUsage.chars < TTS_HOUR_CHARS);

const busy = speechPlaybackPlan({
  cacheHit: false,
  quotaAllow: false
});
assert.strictEqual(busy.openai, false);
assert.strictEqual(busy.status, 429);
assert.strictEqual(busy.message, SPEECH_BUSY_MESSAGE);

const failed = speechPlaybackPlan({ dbError: true, quotaAllow: true, cacheHit: false });
assert.strictEqual(failed.openai, false);
assert.strictEqual(failed.status, 503);
assert.strictEqual(failed.counted, false);

const parallel = createAtomicQuota();
const raced = await Promise.all(
  Array.from({ length: 800 }, function () { return parallel.take("race", "a".repeat(1000)); })
);
const allowedRaced = raced.filter(Boolean).length;
assert.strictEqual(allowedRaced, Math.floor(TTS_HOUR_CHARS / 1000));
assert.strictEqual(parallel.rows.get("race").chars, allowedRaced * 1000);
assert.ok(parallel.rows.get("race").longCount <= TTS_HOUR_LONG);

const secret = "test-speech-secret";
const now = Date.UTC(2026, 9, 8, 17, 0, 30);
const address = "8.8.8.8";
const signature = await speechSignature(secret, address, Math.floor(now / 60000));
const trusted = new Headers();
trusted.set("x-forwarded-for", "10.1.2.3, 203.0.113.9");
trusted.set("cf-connecting-ip", "203.0.113.9");
trusted.set("x-wondii-speech-ip", address);
trusted.set("x-wondii-speech-sig", signature);
assert.strictEqual(await verifiedSpeechAddress(trusted, secret, now), address);
assert.strictEqual(canonicalPublicAddress("203.0.113.9"), "");
assert.strictEqual(canonicalPublicAddress("10.0.0.8"), "");
assert.strictEqual(canonicalPublicAddress("8.8.8.8"), "8.8.8.8");

const forged = new Headers();
forged.set("x-forwarded-for", "1.1.1.1");
forged.set("cf-connecting-ip", "1.1.1.1");
forged.set("x-wondii-speech-ip", "1.1.1.1");
forged.set("x-wondii-speech-sig", signature);
assert.strictEqual(await verifiedSpeechAddress(forged, secret, now), "");
assert.strictEqual(await verifiedSpeechAddress(trusted, "", now), "");

const worker = fs.readFileSync(path.join(root, "workers-site/index.ts"), "utf8");
const proxy = worker.slice(worker.indexOf("async function proxySpeech"), worker.indexOf("async function serveDocument"));
assert.ok(proxy.indexOf('request.headers.get("cf-connecting-ip")') >= 0);
assert.strictEqual(proxy.indexOf("x-forwarded-for"), -1);
assert.ok(proxy.indexOf("caches.default.match") < proxy.indexOf("await fetch("));

const service = fs.readFileSync(path.join(root, "supabase/functions/clever-service/index.ts"), "utf8");
const handler = service.slice(service.indexOf("async function handleSpeech"), service.indexOf("async function hostResolvesPublic"));
assert.ok(handler.indexOf("tts_audio_read") < handler.indexOf("tts_quota_take"));
assert.ok(handler.indexOf("tts_quota_take") < handler.indexOf("https://api.openai.com/v1/audio/speech"));
assert.strictEqual(handler.indexOf("x-forwarded-for"), -1);
assert.strictEqual(handler.indexOf("cf-connecting-ip"), -1);
assert.ok(handler.indexOf("return true") === -1);

const story = fs.readFileSync(path.join(root, "games/storybook.js"), "utf8");
const tts = story.slice(story.indexOf("function cleverServiceTtsUrl"), story.indexOf("function anonKey"));
assert.ok(tts.indexOf("?ttsText=") >= 0);
assert.ok(tts.indexOf("ttsVoice") >= 0);
assert.ok(tts.indexOf("/api/speech") >= 0);
assert.ok(story.indexOf(SPEECH_BUSY_MESSAGE) >= 0);
assert.ok(fs.readFileSync(path.join(root, "games/storybook.html"), "utf8").indexOf('id="sbReadNote"') >= 0);

const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261008180000_job_keys_and_child_guards.sql"), "utf8");
assert.ok(sql.indexOf("on conflict (bucket) do update") >= 0);
assert.ok(sql.indexOf("quota.chars + excluded.chars <= " + TTS_HOUR_CHARS) >= 0);
assert.ok(sql.indexOf("quota.short_count + excluded.short_count <= " + TTS_HOUR_SHORT) >= 0);
assert.ok(sql.indexOf("quota.long_count + excluded.long_count <= " + TTS_HOUR_LONG) >= 0);
assert.ok(sql.indexOf("public.tts_audio_read") >= 0);

console.log("speech-quota tests ok");
