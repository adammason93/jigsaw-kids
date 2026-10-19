/* Paid generation stays off until server secrets name one adult account and a budget.
   One story key still limits a controlled test. Self-service, for that same account
   only, starts when the server secret is exactly "on". A browser field cannot set it. */

export const MAX_BUDGET_USD = 8;

function refused() {
  return { ok: false, reason: "paid-generation-not-approved", budgetUsd: 0 };
}

export function paidJobAllowed(input) {
  const source = input || {};
  const secrets = source.secrets || {};
  const account = String(secrets.accountId || "").trim();
  const story = String(secrets.creationKey || "").trim();
  const budget = Number(secrets.budgetUsd);
  const selfService = String(secrets.selfService || "").trim() === "on";
  if (!account || !(budget > 0) || budget > MAX_BUDGET_USD) return refused();
  if (!selfService && !story) return refused();
  if (source.accountKind !== "adult") return refused();
  if (String(source.accountId || "") !== account) return refused();
  const creationKey = String(source.creationKey || "");
  if (!selfService && creationKey !== story) return refused();
  if (selfService && !/^[A-Za-z0-9_-]{8,80}$/.test(creationKey)) return refused();
  return {
    ok: true,
    reason: "ready",
    accountId: account,
    creationKey: selfService ? creationKey : story,
    budgetUsd: budget,
    selfService: selfService
  };
}

/* The parent must approve a new book. A book that has already started can continue
   without a second approval. An empty or forged plan is not a started book. */
export function mayStartPaid(input) {
  const allowed = paidJobAllowed(input);
  if (!allowed.ok) return { ok: false, reason: allowed.reason, budgetUsd: 0 };
  const source = input || {};
  if (source.approveGeneration === true) {
    return Object.assign({}, allowed, { ok: true, reason: "approved" });
  }
  const job = source.existingJob || {};
  const pictures = job.checkpoint && job.checkpoint.pictures || {};
  const entries = job.checkpoint && job.checkpoint.spend && job.checkpoint.spend.entries || [];
  const progressed = Object.keys(pictures).length > 0 || entries.length > 0;
  const live = job.status === "running" || job.status === "interrupted" || job.reason === "continue";
  if (progressed || live) return Object.assign({}, allowed, { ok: true, reason: "resume" });
  return { ok: false, reason: "approval-required", budgetUsd: 0 };
}

/* Display names only. A browser cannot store markup, an address, or a long legal name. */
export function authorCredit(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 40) return "";
  if (/[<>@]/.test(name)) return "";
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '&.,-]*$/u.test(name)) return "";
  return name;
}
