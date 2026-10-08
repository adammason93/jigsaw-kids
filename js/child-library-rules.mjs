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
