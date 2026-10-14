"use strict";

/* Local Book V2 endpoint. Binds to this computer only.
   It never reads an API key and never calls the picture or story model. */

var http = require("http");
var handle = require("./handle-request.js");

var port = Number(process.env.BOOK_V2_PORT || 8796);

function allowOrigin(origin) {
  if (!origin) return "";
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return origin;
  return "";
}

var server = http.createServer(function (req, res) {
  var origin = allowOrigin(req.headers.origin || "");
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Vary"] = "Origin";
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/v1/book") {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ ok: false, message: "Book V2 is not on this path." }));
    return;
  }
  var chunks = [];
  var size = 0;
  req.on("data", function (chunk) {
    size += chunk.length;
    if (size > 200000) {
      res.writeHead(413, headers);
      res.end(JSON.stringify({ ok: false, message: "That story request is too large." }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    var body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch (e) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ ok: false, message: "The story request could not be read." }));
      return;
    }
    var result = handle.handleBookV2(body);
    res.writeHead(result.status, headers);
    res.end(JSON.stringify(result.body));
  });
});

server.listen(port, "127.0.0.1", function () {
  console.log("Book V2 planning server on 127.0.0.1:" + port);
});
