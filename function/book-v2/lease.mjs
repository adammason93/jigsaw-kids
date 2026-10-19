/* The hosted Pro worker may stay active for 400s. Story generation answers
   with 202 before the model call, so the 150s request idle limit does not
   cover that wait. The writer abort must fire first, leaving time to save
   an interrupted checkpoint before this lease allows another claim. */

export const STORY_WRITER_TIMEOUT_MS = 180000;
export const LEASE_MS = 240000;
/* One picture call, kept shorter than the lease so its checkpoint can land
   before another worker is allowed to claim the same story. */
export const PICTURE_CALL_TIMEOUT_MS = 150000;

export function storyWriterFailure(error) {
  return Object.assign(new Error("model-timeout"), { code: "model-timeout", cause: error || null });
}

export function pictureCallFailure(error) {
  return Object.assign(new Error("picture-timeout"), { code: "picture-timeout", cause: error || null });
}

export function claimGate(prior, now, leaseMs) {
  const windowMs = Number(leaseMs) > 0 ? Number(leaseMs) : LEASE_MS;
  if (prior && prior.status === "complete") return { ok: false, reason: "already-generated" };
  if (prior && prior.status === "running") {
    const age = Number(now) - Number(prior.startedAt || 0);
    if (age >= 0 && age < windowMs) return { ok: false, reason: "already-running" };
  }
  return { ok: true };
}

export function confirmLease(stored, lease) {
  return !!(stored && lease && stored.lease === lease);
}
