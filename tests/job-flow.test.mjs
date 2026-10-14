/* Create an async story job, then poll it the way the browser does. */
import assert from "node:assert";
import {
  generateAccessKey,
  hashAccessKey,
  readJob
} from "../supabase/functions/clever-service/job-access.mjs";

const jobs = new Map();
const PRIVATE_PAGE = "The secret door opened only for Pip.";

async function createAsyncStoryJob() {
  const id = crypto.randomUUID();
  const accessKey = generateAccessKey();
  const stored = {
    id,
    status: "pending",
    progress: 0,
    progress_label: "Queued…",
    http_status: null,
    result_payload: null,
    access_key_hash: await hashAccessKey(accessKey),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_user_id: null
  };
  jobs.set(id, stored);
  return {
    status: 202,
    body: { storybook_job_id: id, storybook_job_key: accessKey, status: "pending" }
  };
}

async function poll(id, header) {
  return readJob(jobs.get(id) || null, header, Date.now());
}

function advance(id, patch) {
  jobs.set(id, Object.assign({}, jobs.get(id), patch, { updated_at: new Date().toISOString() }));
}

const created = await createAsyncStoryJob();
assert.strictEqual(created.status, 202);
const id = created.body.storybook_job_id;
const key = created.body.storybook_job_key;
const stored = jobs.get(id);
assert.strictEqual(key.length, 64);
assert.notStrictEqual(stored.access_key_hash, key);
assert.strictEqual(JSON.stringify(stored).includes(key), false);
assert.strictEqual(JSON.stringify(stored).includes(PRIVATE_PAGE), false);

const pending = await poll(id, key);
assert.strictEqual(pending.status, 200);
assert.strictEqual(pending.body.storybook_job_status, "pending");
assert.strictEqual(pending.body.result, null);

advance(id, { status: "running", progress: 40, progress_label: "Painting the pictures…" });
const running = await poll(id, key);
assert.strictEqual(running.body.storybook_job_status, "running");
assert.strictEqual(running.body.storybook_job_progress, 40);
assert.strictEqual(running.body.result, null);

advance(id, {
  status: "complete",
  progress: 100,
  progress_label: "Ready",
  http_status: 200,
  result_payload: { pages: [{ text: PRIVATE_PAGE }] }
});

const missing = await poll(id, "");
assert.strictEqual(missing.status, 404);
assert.strictEqual(missing.body.error, "storybook_job_not_found");
assert.strictEqual(JSON.stringify(missing.body).includes(PRIVATE_PAGE), false);

const queryOnly = await poll(id, "");
assert.strictEqual(queryOnly.status, 404);

const wrong = await poll(id, "f".repeat(64));
assert.strictEqual(wrong.status, 404);
assert.strictEqual(JSON.stringify(wrong.body).includes(PRIVATE_PAGE), false);

const unknown = await poll(crypto.randomUUID(), key);
assert.strictEqual(unknown.status, 404);
assert.deepStrictEqual(unknown.body, missing.body);

const ready = await poll(id, key);
assert.strictEqual(ready.status, 200);
assert.strictEqual(ready.body.storybook_job_status, "complete");
assert.strictEqual(ready.body.result.pages[0].text, PRIVATE_PAGE);

const legacyId = crypto.randomUUID();
jobs.set(legacyId, {
  id: legacyId,
  status: "complete",
  http_status: 200,
  result_payload: { pages: [{ text: "An older book." }] },
  access_key_hash: null,
  created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  owner_user_id: null
});
const legacy = await poll(legacyId, "");
assert.strictEqual(legacy.status, 200);
assert.strictEqual(legacy.body.result.pages[0].text, "An older book.");

jobs.get(legacyId).created_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
const expired = await poll(legacyId, "");
assert.strictEqual(expired.status, 404);
assert.strictEqual(JSON.stringify(expired.body).includes("An older book."), false);

console.log("job-flow tests ok");
