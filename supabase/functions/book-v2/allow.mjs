/* One adult account and one story key, both supplied by server secrets.
   A browser field cannot satisfy this check. Empty secrets keep paid generation off. */

export const MAX_BUDGET_USD = 8;

export function paidJobAllowed(input) {
  const source = input || {};
  const secrets = source.secrets || {};
  const account = String(secrets.accountId || "").trim();
  const story = String(secrets.creationKey || "").trim();
  const budget = Number(secrets.budgetUsd);
  if (!account || !story || !(budget > 0) || budget > MAX_BUDGET_USD) {
    return { ok: false, reason: "paid-generation-not-approved", budgetUsd: 0 };
  }
  if (source.accountKind !== "adult") {
    return { ok: false, reason: "paid-generation-not-approved", budgetUsd: 0 };
  }
  if (String(source.accountId || "") !== account) {
    return { ok: false, reason: "paid-generation-not-approved", budgetUsd: 0 };
  }
  if (String(source.creationKey || "") !== story) {
    return { ok: false, reason: "paid-generation-not-approved", budgetUsd: 0 };
  }
  return { ok: true, reason: "ready", accountId: account, creationKey: story, budgetUsd: budget };
}
