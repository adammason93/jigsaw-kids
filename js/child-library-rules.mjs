/* Rules mirrored by the child library migration. The database is the authority. */

export function creationRemaining(allowance, usedToday, reservedToday) {
  var cap = Math.min(Number(allowance) || 0, 10);
  var used = Math.max(0, Number(usedToday) || 0);
  var reserved = Math.max(0, Number(reservedToday) || 0);
  return Math.max(cap - used - reserved, 0);
}

export function canReserve(allowance, usedToday, reservedToday) {
  return creationRemaining(allowance, usedToday, reservedToday) > 0;
}

export function londonDay(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function parentOwnsPath(path, userId) {
  return typeof path === "string" && typeof userId === "string" && userId.length > 0 && path.indexOf(userId + "/") === 0;
}

export function sharePreview(book) {
  var pages = book && Array.isArray(book.pages) ? book.pages.slice(0, 12) : [];
  return {
    title: String(book && book.title || "").slice(0, 80),
    pages: pages.map(function (page) {
      return { text: String(page && page.text || "").slice(0, 500) };
    })
  };
}

export function newIds(existing, incoming) {
  var seen = {};
  (existing || []).forEach(function (id) { seen[id] = true; });
  return (incoming || []).filter(function (id) { return id && !seen[id]; });
}

var SAFE_PART = /^[A-Za-z0-9_.-]{1,80}$/;
var CHILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var RELATIVE = /^(books|characters|shared)\/[A-Za-z0-9_-]{1,80}(?:\/[A-Za-z0-9_.-]{1,80}){0,2}$/;

export function artworkPath(childId, parts) {
  if (!CHILD_ID.test(String(childId || ""))) return "";
  var clean = [];
  var i;
  for (i = 0; i < (parts || []).length; i++) {
    var part = String(parts[i] || "");
    if (!SAFE_PART.test(part) || part.indexOf("..") !== -1) return "";
    clean.push(part);
  }
  if (!clean.length) return "";
  return String(childId) + "/" + clean.join("/");
}

export function privateMarker(relativePath) {
  var path = String(relativePath || "");
  if (path.indexOf("..") !== -1 || !RELATIVE.test(path)) return "";
  return "wondii-private:" + path;
}

export function markerRelative(value) {
  var raw = String(value || "");
  if (raw.indexOf("wondii-private:") !== 0) return "";
  var path = raw.slice("wondii-private:".length);
  if (path.indexOf("..") !== -1 || path.indexOf("://") !== -1 || !RELATIVE.test(path)) return "";
  return path;
}
