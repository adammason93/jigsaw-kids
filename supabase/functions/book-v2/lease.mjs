/* A running job stays locked until this window passes with no further save.
   One model call observed in this pipeline stays inside the window. */

export const LEASE_MS = 180000;

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
