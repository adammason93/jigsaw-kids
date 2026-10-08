/* Pairing decisions shared by the child-pair function.
   The database is the authority. These checks fail closed before any user is created. */

export const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalisePairingCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function pairingCodeIsShape(code) {
  return new RegExp("^[" + PAIRING_ALPHABET + "]{8}$").test(code);
}

/* Wrong, expired and already-used tickets look the same to the caller. */
export function ticketDecision(ticket, now) {
  if (!ticket || ticket.redeemedAt || !(ticket.expiresAt > now)) {
    return { allow: false, reason: "invalid" };
  }
  if (ticket.profileStatus !== "active") {
    return { allow: false, reason: "profile_unavailable" };
  }
  return { allow: true, reason: "ready" };
}

/* A refreshed access token still has to pass this. Revocation is the device row. */
export function deviceAccessDecision(row) {
  if (!row || row.accountKind !== "child") {
    return { allow: false, reason: "not_child" };
  }
  if (!row.deviceId || row.revokedAt) {
    return { allow: false, reason: "device_revoked" };
  }
  if (row.profileStatus !== "active") {
    return { allow: false, reason: "profile_unavailable" };
  }
  return { allow: true, reason: "ready" };
}

export function childDeviceEmail(deviceId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(deviceId || ""))) return "";
  return "device-" + deviceId + "@users.child.invalid";
}
