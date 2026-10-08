"use strict";
// Offline dry run of scripts/source-grounded/generate.js: node -r this-file generate.js ...
// Replaces the network with the offline stubs before the harness captures fetch. No paid call.
var Stubs = require("./offline-stubs.js");
global.fetch = function (url, init) {
  var href = String(url);
  var local = Stubs.network(href);
  if (local) return local;
  if (href.indexOf("https://api.openai.com/") === 0) return Stubs.openai(href, JSON.parse(init.body));
  return Promise.reject(new Error("offline dry run refused " + href));
};
