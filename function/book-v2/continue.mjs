/* Decides whether an already approved book should be handed to the next
   server step. A watch, a new unapproved book, a finished book, and a
   genuine stop never qualify. This file does not call a model. */

const STOP = {
  "picture-uncertain": true,
  "picture-lost": true,
  budget: true,
  "call-cap": true,
  uncertain: true,
  "model-timeout": true,
  "picture-timeout": true,
  "authorisation-withdrawn": true,
  picture: true,
  story: true,
  artwork: true,
  plan: true,
  "writer-not-connected": true,
  "paid-generation-not-approved": true
};

export function chainable(job, automaticOn) {
  if (automaticOn !== true) return false;
  if (!job || typeof job !== "object") return false;
  const status = String(job.status || "");
  const reason = String(job.reason || "");
  if (status === "complete" || status === "saved" || status === "running") return false;
  if (reason === "saved") return false;
  if (STOP[reason]) return false;
  const auto = job.auto && typeof job.auto === "object" ? job.auto : null;
  if (!auto || auto.authorised !== true || auto.revoked === true) return false;
  if (auto.accountKind !== "adult") return false;
  if (reason !== "continue") return false;
  if (job.recoverable === false) return false;
  return true;
}

/* Completion stores picture ids. While a book is being made, each picture is
   a record with accepted:true. Both shapes count. A loose string never counts
   before the book is saved. */
export function acceptedPictureCount(pictures, job) {
  if (!pictures || typeof pictures !== "object") return 0;
  const finished = !!(job && (job.status === "complete" || job.reason === "saved"));
  let count = 0;
  for (const picture of Object.values(pictures)) {
    if (picture && typeof picture === "object" && picture.accepted === true) count += 1;
    else if (finished && typeof picture === "string" && picture) count += 1;
  }
  return count;
}
