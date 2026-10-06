"use strict";
/* Builds one self-contained HTML file of a finished lesson in the real Wondii class-screen player:
   present.html with every local script and stylesheet inlined, images as base64, the journey seeded
   into this browser's local library and a local live session started before present.js reads the
   address, so it opens on the class screen. No network, no Supabase. Lesson content is the pipeline
   output, unchanged. Provisional.
   Usage: node standalone.js SITE_DIR OUT.html --title "..." --review review.html --notice "..." */
var fs = require("fs");
var path = require("path");
function arg(name, fallback) { var at = process.argv.indexOf("--" + name); return at !== -1 ? process.argv[at + 1] : fallback; }
function escHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

function build(site, out, opts) {
  var learn = path.join(site, "schools/learn");
  var html = fs.readFileSync(path.join(learn, "present.html"), "utf8");
  function resolve(href) { return path.resolve(learn, href.split("?")[0]); }
  function esc(s) { return s.replace(/<\/script/gi, "<\\/script"); }
  html = html.replace(/<link rel="stylesheet" href="([^"]+)" \/>/g, function (m, href) { return /^https?:/.test(href) ? "" : "<style>/* " + href + " */\n" + fs.readFileSync(resolve(href), "utf8") + "\n</style>"; });
  html = html.replace(/<link href="https:\/\/fonts[^>]+>/g, "").replace(/<link rel="icon"[^>]+>/g, "");
  var journey = JSON.parse(fs.readFileSync(path.join(site, "sg/journey.json"), "utf8"));
  var js = JSON.stringify(journey).replace(/\/sg\/images\/([a-z0-9-]+\.jpg)/g, function (m, f) { return "data:image/jpeg;base64," + fs.readFileSync(path.join(site, "sg/images", f)).toString("base64"); });
  var seed = "<script>\n/* Self-contained provisional build: seed the local library and start a local live session. */\n(function(){\n" +
    "  var j=" + js.replace(/</g, "\\u003c") + ";\n" +
    "  var k=\"wondii-u:local-preview:wondii-learning-adventures\";\n" +
    "  var list=[];try{list=JSON.parse(localStorage.getItem(k)||\"[]\")||[];}catch(e){list=[];}\n" +
    "  list=list.filter(function(x){return x&&x.id!==j.id;});list.unshift(j);localStorage.setItem(k,JSON.stringify(list));\n" +
    "  var q=new URLSearchParams(location.search);\n" +
    "  var existing=q.get(\"session\")&&window.ClassRooms&&ClassRooms.get(q.get(\"session\"));\n" +
    "  if(!existing){var mine=(WondiiLearn.allJourneys?WondiiLearn.allJourneys():[]).filter(function(x){return x.id===j.id;})[0]||j;\n" +
    "    var c=ClassRooms.createSession(mine,\"live\",false,{});if(c&&c.code)history.replaceState(null,\"\",location.pathname+\"?session=\"+c.code);}\n" +
    "})();\n</script>";
  html = html.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) {
    var body;
    if (/score-config\.js/.test(src)) body = fs.readFileSync(path.join(site, "js/score-config.js"), "utf8");
    else if (/score-cloud\.js/.test(src)) body = fs.readFileSync(path.join(site, "js/score-cloud.js"), "utf8");
    else body = fs.readFileSync(resolve(src), "utf8");
    var tag = "<script>/* " + src + " */\n" + esc(body) + "\n</script>";
    return /present\.js/.test(src) ? seed + "\n" + tag : tag;
  });
  html = html.replace(/<script>\s*if \("serviceWorker" in navigator\)[\s\S]*?<\/script>/, "");
  var review = opts.review ? " <a href=\"" + escHtml(opts.review) + "\" style=\"color:#141b4d;font-weight:700\">Open the review page</a> (every fact with its source)." : "";
  var notice = "<div id=\"sgNotice\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"sgNoticeTitle\" style=\"position:fixed;inset:0;z-index:9999;background:rgba(10,14,40,.72);display:flex;align-items:center;justify-content:center;padding:16px\"><div style=\"max-width:640px;background:#fff8e1;color:#2b2000;font:15px/1.45 system-ui,sans-serif;padding:20px 22px;border-radius:14px;border:2px solid #b38600\"><h2 id=\"sgNoticeTitle\" style=\"margin:0 0 8px;font:700 18px system-ui\">Before you start</h2><p style=\"margin:0 0 14px\">" + escHtml(opts.notice) + review + "</p><button type=\"button\" id=\"sgNoticeOk\" onclick=\"document.getElementById('sgNotice').remove();document.getElementById('sgPill').style.display='block'\" style=\"font:700 15px system-ui;border:0;background:#141b4d;color:#fff;border-radius:10px;padding:10px 18px;cursor:pointer\">I understand</button></div></div><p id=\"sgPill\" style=\"display:none;position:fixed;left:8px;bottom:6px;z-index:9998;margin:0;background:#fff3cd;color:#3d2c00;font:600 12px system-ui;padding:3px 9px;border-radius:999px;border:1px solid #b38600\">Provisional: not classroom-ready, not human-reviewed" + (opts.review ? " · <a href=\"" + escHtml(opts.review) + "\" style=\"color:#3d2c00\">review page</a>" : "") + "</p>";
  html = html.replace("</body>", notice + "\n</body>");
  html = html.replace(/<head>/, "<head>\n  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:\" />");
  html = html.replace(/<title>[^<]*<\/title>/, "<title>" + escHtml(opts.title) + "</title>");
  fs.writeFileSync(out, html);
  var left = (html.match(/(?:src|href)="(?!data:|#|javascript:)[^"]+"/g) || []).filter(function (r) { return r.indexOf(opts.review || "\u0000") === -1; });
  return { bytes: html.length, externalRefsLeft: left.slice(0, 20) };
}

if (require.main === module) console.log(JSON.stringify(build(process.argv[2], process.argv[3], { title: arg("title", "Wondii lesson (provisional)"), review: arg("review", ""), notice: arg("notice", "Provisional. Not classroom-ready. Not human-reviewed.") })));
module.exports = { build: build };
