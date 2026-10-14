/* A child session may start one paid generation per reserved key.
   A signed-out or adult caller is unchanged. The database claim is the authority. */

export function claimDecision(accountKind, rpcData) {
  if (accountKind !== "child") return { proceed: true, reason: "adult" };
  if (rpcData && rpcData.allowed === true && rpcData.childId && rpcData.key) {
    return { proceed: true, reason: "claimed", childId: String(rpcData.childId), key: String(rpcData.key) };
  }
  return { proceed: false, reason: (rpcData && rpcData.reason) || "allowance" };
}
