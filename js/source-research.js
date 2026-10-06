/* Source research for Wondii lessons (Oct 2026).
   Input: { lessonText, topic, yearGroup (1-6), learningGoal, focusConcepts }.
   1. A pluggable provider finds candidate pages on an allowlist of trusted, child-appropriate sites.
      Search results and snippets are only used to find pages. They are never evidence.
   2. This module fetches each allowed page itself and extracts clean text passages.
      Each passage has an id, url, title, section, and retrieval time.
   3. Passages are ranked against the request so the knowledge step reads a bounded set.
   It makes no claim about truth. Quote checks and entailment live in lesson-brain.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiSourceResearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // One config list. A host matches a rule when it equals the domain or is a subdomain of it.
  // pathPrefix narrows a rule to one section of a site. suffix rules admit public-sector
  // and academic education pages. Everything else is refused before any fetch.
  var SOURCE_ALLOWLIST = [
    { id: "nhm", domain: "nhm.ac.uk", label: "Natural History Museum" },
    { id: "bitesize", domain: "bbc.co.uk", pathPrefix: "/bitesize", label: "BBC Bitesize" },
    { id: "oak", domain: "thenational.academy", label: "Oak National Academy" },
    { id: "britannica", domain: "britannica.com", label: "Britannica" },
    { id: "natgeo-kids", domain: "kids.nationalgeographic.com", label: "National Geographic Kids" },
    { id: "simple-wikipedia", domain: "simple.wikipedia.org", label: "Simple English Wikipedia" },
    { id: "wikipedia", domain: "en.wikipedia.org", label: "Wikipedia" },
    { id: "gov-uk", suffix: ".gov.uk", label: "UK public sector" },
    { id: "ac-uk", suffix: ".ac.uk", label: "UK academic or museum" }
  ];
  var WIKI_SKIP_NAMESPACE = /^(?:Special|Talk|User|User_talk|Wikipedia|File|Image|Template|Help|Category|Portal|Draft|Module|MediaWiki):/i;
  var NOT_EXPLANATORY_TITLE = /\((?:film|movie|disambiguation|band|album|song|video game|tv series|novel|comics?|franchise)\)|^list of\b|^lists of\b/i;
  var NOT_EXPLANATORY_DESCRIPTION = /\b(?:film|movie|television|tv series|documentary series|miniseries|novel|book series|video game|franchise|album|song|band|comic|fictional|theme park|amusement|musical|play by)\b/i;
  var WIKI_SKIP_SECTION = /^(?:references|notes|other websites|external links|see also|related pages|further reading|bibliography|sources|gallery|footnotes|citations)$/i;
  var BOILERPLATE = /\b(?:cookie|cookies|javascript|subscribe|newsletter|sign up|sign in|log in|privacy policy|terms of use|all rights reserved|copyright ©|advertisement|share this|follow us|click here|your browser)\b/i;
  var MAX_PAGE_BYTES = 2500000;
  var STOP = { the: 1, and: 1, for: 1, are: 1, was: 1, were: 1, with: 1, that: 1, this: 1, from: 1, into: 1, about: 1, how: 1, why: 1, what: 1, when: 1, which: 1, their: 1, they: 1, them: 1, have: 1, has: 1, had: 1, can: 1, could: 1, will: 1, would: 1, pupils: 1, students: 1, children: 1, year: 1, teach: 1, lesson: 1, understand: 1, learn: 1, explain: 1, describe: 1, able: 1, some: 1, more: 1, other: 1, also: 1, its: 1, use: 1, used: 1, using: 1 };

  function clean(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (max && text.length > max) text = text.slice(0, max).trim();
    return text;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; }
  }

  function isAllowedUrl(url, list) {
    var parsed;
    try { parsed = new URL(String(url || "")); } catch (e) { return { ok: false, reason: "not a url" }; }
    if (parsed.protocol !== "https:") return { ok: false, reason: "not https" };
    var host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    var path = parsed.pathname || "/";
    var rules = list || SOURCE_ALLOWLIST;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var hostOk = rule.domain
        ? (host === rule.domain || host.slice(-(rule.domain.length + 1)) === "." + rule.domain)
        : (rule.suffix && host.slice(-rule.suffix.length) === rule.suffix && host.length > rule.suffix.length);
      if (!hostOk) continue;
      if (rule.pathPrefix && path.indexOf(rule.pathPrefix) !== 0) continue;
      if (/wikipedia\.org$/.test(host)) {
        var title = decodeURIComponent(path.replace(/^\/wiki\//, ""));
        if (path.indexOf("/wiki/") !== 0 || WIKI_SKIP_NAMESPACE.test(title)) return { ok: false, reason: "not a wikipedia article" };
      }
      return { ok: true, rule: rule.id, label: rule.label };
    }
    return { ok: false, reason: "host not on the allowlist" };
  }

  function allowedDomains(list) {
    return (list || SOURCE_ALLOWLIST).filter(function (rule) { return rule.domain; }).map(function (rule) { return rule.domain; });
  }

  function keywords(text) {
    var seen = {};
    return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (word) {
      if (word.length < 3 || STOP[word] || seen[word]) return false;
      seen[word] = 1;
      return true;
    });
  }

  function stem(word) {
    return String(word || "").replace(/(?:ies)$/, "y").replace(/(?:es|s)$/, "").slice(0, 7);
  }

  var ENTITY = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "\u2013", mdash: "\u2014", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", hellip: "\u2026", eacute: "\u00e9", deg: "\u00b0", times: "\u00d7", middot: "\u00b7", copy: "\u00a9", shy: "" };

  function decodeEntities(text) {
    return String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (match, code) {
      if (code.charAt(0) === "#") {
        var n = code.charAt(1).toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        if (!n || n > 0x10ffff) return " ";
        try { return String.fromCodePoint(n); } catch (e) { return " "; }
      }
      var named = ENTITY[code.toLowerCase()];
      return named == null ? match : named;
    });
  }

  function stripTags(html) {
    return clean(decodeEntities(String(html || "").replace(/<sup\b[\s\S]*?<\/sup>/gi, "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")));
  }

  function titleFromHtml(html) {
    var og = String(html).match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (og) return clean(decodeEntities(og[1]), 160);
    var t = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return t ? clean(decodeEntities(t[1]), 160) : "";
  }

  // Readable blocks from an HTML page: headings, paragraphs, and list items inside the main
  // content. Navigation, headers, footers, scripts, forms, and figures are removed first.
  function htmlBlocks(html) {
    var body = String(html || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|iframe|form|nav|header|footer|aside|button|select|figure|table)\b[\s\S]*?<\/\1>/gi, " ");
    var main = body.match(/<main\b[\s\S]*?<\/main>/i) || body.match(/<article\b[\s\S]*?<\/article>/i);
    if (main) body = main[0];
    var blocks = [];
    var re = /<(h[1-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    var m;
    while ((m = re.exec(body))) {
      var tag = m[1].toLowerCase();
      var text = stripTags(m[2]);
      if (!text) continue;
      if (tag.charAt(0) === "h") { blocks.push({ heading: true, text: clean(text, 120) }); continue; }
      if (text.length < 40 || BOILERPLATE.test(text) && text.length < 220) continue;
      if (!/[.!?]["')\]]?$/.test(text) && tag === "li" && text.length < 80) continue;
      blocks.push({ heading: false, text: text });
    }
    return blocks;
  }

  // Wikipedia plain-text extracts mark sections with == Heading ==.
  function wikiBlocks(text) {
    var blocks = [];
    var skipping = false;
    String(text || "").split(/\n+/).forEach(function (line) {
      var heading = line.match(/^\s*(={2,6})\s*(.*?)\s*\1\s*$/);
      if (heading) {
        skipping = WIKI_SKIP_SECTION.test(heading[2]);
        if (!skipping) blocks.push({ heading: true, text: clean(heading[2], 120) });
        return;
      }
      if (skipping) return;
      var value = clean(line);
      if (value.length < 40) return;
      blocks.push({ heading: false, text: value });
    });
    return blocks;
  }

  // Groups paragraphs under their heading into passages of about 350 to 900 characters.
  // A paragraph is never split, so a quote cannot straddle an invented boundary.
  function passagesFromBlocks(blocks, meta, target) {
    var out = [];
    var section = "";
    var buffer = [];
    var size = target || 700;
    function flush() {
      if (!buffer.length) return;
      out.push({ section: section, text: buffer.join(" ") });
      buffer = [];
    }
    (blocks || []).forEach(function (block) {
      if (block.heading) { flush(); section = block.text; return; }
      var length = buffer.join(" ").length;
      if (length && length + block.text.length > size * 1.3) flush();
      buffer.push(block.text.length > 1800 ? block.text.slice(0, 1800) : block.text);
      if (buffer.join(" ").length >= size) flush();
    });
    flush();
    return out.map(function (item, index) {
      var n = index + 1;
      return {
        id: meta.sourceId + "-P" + (n < 10 ? "0" + n : String(n)),
        sourceId: meta.sourceId,
        url: meta.url,
        title: meta.title,
        section: item.section,
        text: item.text,
        retrievedAt: meta.retrievedAt
      };
    });
  }

  function withTimeout(ms) {
    if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) return { signal: AbortSignal.timeout(ms) };
    return {};
  }

  var USER_AGENT = "WondiiLessonResearch/1.0 (primary-school lesson preparation; https://wondii.co.uk)";

  function wikiTitleFromUrl(url) {
    var path = new URL(url).pathname.replace(/^\/wiki\//, "");
    return decodeURIComponent(path).replace(/_/g, " ");
  }

  // Fetches one allowed page and returns its passages. Wikipedia articles are read through
  // the Action API plain-text extract of the full article, which is the page text without
  // markup. Every other site is fetched as HTML and cleaned here.
  function fetchSource(candidate, sourceId, ports) {
    var fetchFn = ports.fetch;
    var now = ports.now || function () { return new Date().toISOString(); };
    var allowed = isAllowedUrl(candidate.url, ports.allowlist);
    if (!allowed.ok) return Promise.resolve({ ok: false, url: candidate.url, reason: allowed.reason });
    var host = hostOf(candidate.url);
    var retrievedAt = now();
    if (/wikipedia\.org$/.test(host)) {
      var title = wikiTitleFromUrl(candidate.url);
      var api = "https://" + host + "/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&formatversion=2&titles=" + encodeURIComponent(title);
      return fetchFn(api, Object.assign({ headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, withTimeout(20000))).then(function (res) {
        if (!res.ok) return { ok: false, url: candidate.url, reason: "HTTP " + res.status };
        return res.json().then(function (body) {
          var page = body && body.query && body.query.pages && body.query.pages[0];
          if (!page || page.missing || !page.extract) return { ok: false, url: candidate.url, reason: "no article text" };
          var canonical = "https://" + host + "/wiki/" + encodeURIComponent(String(page.title).replace(/ /g, "_"));
          var meta = { sourceId: sourceId, url: canonical, title: clean(page.title, 160) + " (" + (host.indexOf("simple.") === 0 ? "Simple English Wikipedia" : "Wikipedia") + ")", retrievedAt: retrievedAt };
          var passages = passagesFromBlocks(wikiBlocks(page.extract), meta);
          return { ok: passages.length > 0, url: canonical, requestedUrl: candidate.url, title: meta.title, rule: allowed.rule, fetchMethod: "wikipedia-action-api-full-article-extract", fetchUrl: api, retrievedAt: retrievedAt, bytes: page.extract.length, passages: passages, reason: passages.length ? "" : "no passages" };
        });
      }).catch(function (error) { return { ok: false, url: candidate.url, reason: "fetch failed: " + (error && error.message || error) }; });
    }
    return fetchFn(candidate.url, Object.assign({ redirect: "follow", headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" } }, withTimeout(20000))).then(function (res) {
      var finalUrl = res.url || candidate.url;
      var after = isAllowedUrl(finalUrl, ports.allowlist);
      if (!after.ok) return { ok: false, url: candidate.url, reason: "redirected off the allowlist: " + after.reason };
      if (!res.ok) return { ok: false, url: candidate.url, reason: "HTTP " + res.status };
      var type = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
      if (type && !/html/i.test(type)) return { ok: false, url: candidate.url, reason: "not html (" + type + ")" };
      return res.text().then(function (html) {
        if (html.length > MAX_PAGE_BYTES) html = html.slice(0, MAX_PAGE_BYTES);
        var meta = { sourceId: sourceId, url: finalUrl, title: titleFromHtml(html) || clean(candidate.title, 160) || finalUrl, retrievedAt: retrievedAt };
        var passages = passagesFromBlocks(htmlBlocks(html), meta);
        return { ok: passages.length > 0, url: finalUrl, requestedUrl: candidate.url, title: meta.title, rule: after.rule, fetchMethod: "https-get-html-extract", fetchUrl: finalUrl, retrievedAt: retrievedAt, bytes: html.length, passages: passages, reason: passages.length ? "" : "no readable passages" };
      });
    }).catch(function (error) { return { ok: false, url: candidate.url, reason: "fetch failed: " + (error && error.message || error) }; });
  }

  // Provider: Wikipedia and Simple English Wikipedia search through the free Action API.
  function wikipediaProvider(options) {
    options = options || {};
    var hosts = options.hosts || ["simple.wikipedia.org", "en.wikipedia.org"];
    var perQuery = options.perQuery || 2;
    return {
      id: "wikipedia-action-api",
      paid: false,
      search: function (queries, ports) {
        var jobs = [];
        hosts.forEach(function (host) {
          (queries || []).forEach(function (query) {
            // generator=search returns the short description with each hit, so films, TV
            // series and other media pages can be refused before any page is fetched.
            var url = "https://" + host + "/w/api.php?action=query&list=search&srnamespace=0&format=json&formatversion=2&srlimit=" + perQuery + "&srsearch=" + encodeURIComponent(query) + "&generator=search&gsrnamespace=0&gsrlimit=" + perQuery + "&gsrsearch=" + encodeURIComponent(query) + "&prop=description";
            jobs.push(ports.fetch(url, Object.assign({ headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, withTimeout(15000))).then(function (res) {
              if (!res.ok) return [];
              return res.json().then(function (body) {
                var rows = (body && body.query && body.query.search) || [];
                var described = {};
                ((body && body.query && body.query.pages) || []).forEach(function (page) { if (page && page.title) described[page.title] = clean(page.description, 160); });
                return rows.map(function (row, rank) {
                  return { url: "https://" + host + "/wiki/" + encodeURIComponent(String(row.title).replace(/ /g, "_")), title: row.title, description: described[row.title] || "", provider: "wikipedia-action-api", query: query, rank: rank, snippetIgnored: true };
                });
              });
            }).catch(function () { return []; }));
          });
        });
        return Promise.all(jobs).then(function (lists) {
          var out = [];
          var longest = 0;
          lists.forEach(function (list) { longest = Math.max(longest, list.length); });
          for (var i = 0; i < longest; i++) lists.forEach(function (list) { if (list[i]) out.push(list[i]); });
          return { candidates: out, calls: jobs.length, costUsd: 0 };
        });
      }
    };
  }

  // Provider: OpenAI Responses API web_search with allowed-domain filters. Paid. Only the URLs
  // are used; the model's text answer and the search snippets are discarded.
  // Focused searches: one web search call per group of teaching sites, so one site cannot
  // fill every slot and children's teaching sites get a turn. Groups are allowlist ids; a
  // group whose ids are not on the allowlist is skipped. Reusable for any topic.
  var SEARCH_GROUPS = [
    { ids: ["nhm"], focus: "Natural History Museum pages (nhm.ac.uk) that explain how the parts or features in this topic worked or what they were used for, and how scientists know (the evidence, and how it forms or is found)." },
    { ids: ["bitesize"], focus: "BBC Bitesize pages (bbc.co.uk/bitesize, web pages not PDFs) for primary pupils on this topic, including how we know about it." },
    { ids: ["britannica", "natgeo-kids"], focus: "Britannica or National Geographic Kids pages that explain how the parts or features in this topic worked, and how scientists know." }
  ];

  function openaiWebSearchProvider(options) {
    options = options || {};
    // gpt-4o-mini and gpt-4.1-mini both reject web_search domain filters (HTTP 400, live
    // runs 6 Oct 2026). gpt-6-luna supports the web search tool in the Responses API and is
    // the cheapest listed model ($0.10 in / $0.50 out per 1M tokens).
    var model = options.model || "gpt-6-luna";
    var reasoning = /^(?:gpt-5|gpt-6|o\d)/.test(model);
    function groupsFor(allowlist) {
      var rules = allowlist || SOURCE_ALLOWLIST;
      if (options.focusGroups === false) return [{ domains: allowedDomains(rules), focus: "", maxToolCalls: options.maxToolCalls || 3 }];
      return (options.focusGroups || SEARCH_GROUPS).map(function (group) {
        var domains = rules.filter(function (rule) { return rule.domain && group.ids.indexOf(rule.id) !== -1; }).map(function (rule) { return rule.domain; });
        return { domains: domains, focus: group.focus, maxToolCalls: options.maxToolCalls || 1 };
      }).filter(function (group) { return group.domains.length; });
    }
    function searchOne(group, queries, ports, request) {
      var input = [
        "Find web pages that explain this primary-school topic to children, from the allowed sites only.",
        "Topic: " + clean(request.topic, 120) + ". Year group: " + clean(request.yearGroup, 20) + ".",
        request.learningGoal ? "Lesson objective: " + clean(request.learningGoal, 240) + "." : "",
        request.requiredEvidence ? "The class must be able to: " + clean(request.requiredEvidence, 240) + " Prefer pages that explain how or why, not only lists of names." : "",
        group.focus ? "Look for: " + group.focus : "Look for pages that explain how the parts or features in this topic work or what they were used for, and pages that explain how scientists know.",
        "Search for: " + (queries || []).slice(0, 3).join("; ") + ".",
        "Reply with a short list of the page URLs you found, one per line, and nothing else."
      ].filter(Boolean).join("\n");
      var body = {
        model: model,
        tools: [{ type: "web_search", search_context_size: "low", filters: { allowed_domains: group.domains }, user_location: { type: "approximate", country: "GB" } }],
        tool_choice: "required",
        max_tool_calls: group.maxToolCalls,
        max_output_tokens: reasoning ? 2000 : 600,
        include: ["web_search_call.action.sources"],
        input: input
      };
      if (reasoning) body.reasoning = { effort: "low" };
      return ports.fetch("https://api.openai.com/v1/responses", Object.assign({
        method: "POST",
        headers: { Authorization: "Bearer " + options.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }, withTimeout(60000))).then(function (res) {
        return res.text().then(function (text) {
          var parsed = null;
          try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
          if (!res.ok || !parsed) return { urls: [], searchCalls: 0, error: "HTTP " + res.status + " " + clean(parsed && parsed.error && parsed.error.message, 160) };
          var urls = [];
          var searchCalls = 0;
          function add(url, title, how) {
            if (!url) return;
            var bare = String(url).replace(/[?&]utm_[^&#]*/g, "").replace(/[?&]$/, "");
            if (urls.some(function (item) { return item.url === bare; })) return;
            urls.push({ url: bare, title: clean(title, 160), provider: "openai-web-search", query: (queries || []).join("; "), via: how, snippetIgnored: true, group: group.domains.join(",") });
          }
          (parsed.output || []).forEach(function (item) {
            if (item.type === "web_search_call") {
              searchCalls += 1;
              var sources = item.action && item.action.sources;
              (sources || []).forEach(function (source) { add(source.url, source.title, "sources"); });
            }
            if (item.type === "message") {
              (item.content || []).forEach(function (part) {
                (part.annotations || []).forEach(function (note) { if (note.type === "url_citation") add(note.url, note.title, "citation"); });
                String(part.text || "").replace(/https:\/\/[^\s)\]>"']+/g, function (found) { add(found.replace(/[.,;]+$/, ""), "", "text"); return found; });
              });
            }
          });
          return { urls: urls, searchCalls: searchCalls, usage: parsed.usage || null };
        });
      }).catch(function (error) { return { urls: [], searchCalls: 0, error: String(error && error.message || error) }; });
    }
    return {
      id: "openai-web-search",
      paid: true,
      model: model,
      groups: function (allowlist) { return groupsFor(allowlist); },
      search: function (queries, ports, request) {
        if (!options.apiKey) return Promise.resolve({ candidates: [], calls: 0, error: "no api key" });
        var groups = groupsFor(ports.allowlist);
        return Promise.all(groups.map(function (group) { return searchOne(group, queries, ports, request); })).then(function (results) {
          // Round-robin across groups so each group's best page is queued before any group's second.
          var candidates = [];
          var longest = Math.max.apply(null, results.map(function (r) { return r.urls.length; }).concat([0]));
          for (var i = 0; i < longest; i++) {
            results.forEach(function (r) {
              var item = r.urls[i];
              if (item && !candidates.some(function (c) { return c.url === item.url; })) candidates.push(item);
            });
          }
          var errors = results.map(function (r) { return r.error; }).filter(Boolean);
          return {
            candidates: candidates,
            calls: groups.length,
            searchCalls: results.reduce(function (sum, r) { return sum + (r.searchCalls || 0); }, 0),
            usage: results.map(function (r) { return r.usage; }),
            model: model,
            error: errors.length === results.length && errors.length ? errors.join(" | ") : ""
          };
        });
      }
    };
  }

  function buildQueries(request) {
    var topic = clean(request.topic || "", 80);
    var goalWords = keywords(request.learningGoal || "").filter(function (word) {
      return keywords(topic).indexOf(word) === -1;
    }).slice(0, 4);
    var queries = [];
    if (topic) queries.push(topic);
    (request.focusConcepts || []).slice(0, 2).forEach(function (concept) {
      var q = clean(concept, 80);
      if (q && keywords(q).length && queries.indexOf(q) === -1) queries.push(keywords(topic).some(function (w) { return q.toLowerCase().indexOf(w) !== -1; }) ? q : topic + " " + q);
    });
    if (goalWords.length && queries.length < 3) queries.push(clean(topic + " " + goalWords.join(" "), 120));
    return queries.slice(0, 3);
  }

  // Lexical ranking only. It decides what the knowledge step reads; it is not support.
  // A sentence that names a body part or feature and says what it did is the evidence a
  // mechanism needs, so passages with one rank above definitions and general history.
  // Live runs (6 Oct 2026) chose mostly abstract passages (definitions, extinction, a craft page).
  var FEATURE_PART = /\b(?:legs?|necks?|tails?|teeth|tooth|jaws?|claws?|horns?|spikes?|plates?|armou?r|feathers?|wings?|skin|scales?|skulls?|bones?|beaks?|eyes?|nose|nostrils?|arms?|hands?|feet|foot|thumbs?|muscles?|frills?|crests?|fins?|shells?|fur|hair|stance|hips?|stomachs?|brains?|roots?|leaves|leaf|stems?|petals?|seeds?|spines?|hooves|paws|trunks?|tusks?|gills?|lungs?)\b/i;
  var FEATURE_FUNCTION = /\b(?:allow(?:s|ed)?|let(?:s)?|enabl(?:e|es|ed)|help(?:s|ed)?|used (?:for|to|as)|use[sd]? (?:its|their|the)\b|so (?:that|it|they) (?:could|can|would)|which (?:means|meant)|because|in order to|as a result|to (?:protect|defend|reach|catch|eat|grind|crush|slice|tear|cut|support|balance|attract|scare|fight|hunt|breathe|grip|hold|carry|chew|bite|run|walk|swim|fly|keep|stay))\b/i;
  var ACTIVITY_PAGE = /\b(?:you will need|you'll need|glue|scissors|cardboard|sellotape|step \d|print out|colouring|book (?:your )?tickets|opening times|gift shop)\b/i;
  function featureFunctionSentences(text) {
    return String(text || "").split(/(?<=[.!?])\s+/).filter(function (sentence) { return FEATURE_PART.test(sentence) && FEATURE_FUNCTION.test(sentence); }).length;
  }

  function rankPassages(passages, request, options) {
    options = options || {};
    var topicWords = keywords(request.topic).map(stem);
    var goalWords = keywords([request.learningGoal, request.requiredEvidence, (request.focusConcepts || []).join(" "), request.lessonText].join(" ")).map(stem);
    var scored = (passages || []).map(function (passage, index) {
      var words = keywords(passage.text + " " + passage.section).map(stem);
      var topicHits = topicWords.filter(function (w) { return words.indexOf(w) !== -1; }).length;
      var goalHits = goalWords.filter(function (w) { return words.indexOf(w) !== -1; }).length;
      var explains = /\b(because|so that|which (?:let|lets|allowed|helped|meant|means)|allowed|in order to|so it could|so they could|used (?:its|their) |used (?:for|to)|helped (?:it|them)|to help|to protect|for (?:defen[cs]e|protection))\b/i.test(passage.text) ? 1.5 : 0;
      var featureLinks = featureFunctionSentences(passage.text);
      var feature = featureLinks ? 3 + Math.min(featureLinks - 1, 2) : 0;
      var activity = ACTIVITY_PAGE.test(passage.text) ? 3 : 0;
      var score = topicHits * 2 + goalHits + explains + feature - activity - (passage.text.length < 160 ? 1 : 0);
      return { passage: passage, score: score, index: index };
    });
    scored.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    var perSource = {};
    var chosen = [];
    var budget = options.maxChars || 24000;
    var used = 0;
    scored.forEach(function (row) {
      if (chosen.length >= (options.maxPassages || 36)) return;
      if (row.score <= 0) return;
      var source = row.passage.sourceId;
      if ((perSource[source] || 0) >= (options.maxPerSource || 8)) return;
      if (used + row.passage.text.length > budget) return;
      perSource[source] = (perSource[source] || 0) + 1;
      used += row.passage.text.length;
      chosen.push({ id: row.passage.id, score: row.score, featureLinks: featureFunctionSentences(row.passage.text) });
    });
    return chosen;
  }

  // The research step. ports: { fetch, now, providers: [provider], allowlist, maxSources }.
  function researchTopic(request, ports) {
    ports = ports || {};
    request = request || {};
    var year = Number(String(request.yearGroup || "").replace(/\D/g, "")) || 0;
    var startedAt = (ports.now || function () { return new Date().toISOString(); })();
    var providers = ports.providers && ports.providers.length ? ports.providers : [wikipediaProvider()];
    var queries = buildQueries(request);
    var record = {
      version: 1,
      startedAt: startedAt,
      request: { lessonText: clean(request.lessonText, 400), topic: clean(request.topic, 120), yearGroup: year ? "Year " + year : "", learningGoal: clean(request.learningGoal, 240), focusConcepts: (request.focusConcepts || []).slice(0, 4) },
      allowlist: (ports.allowlist || SOURCE_ALLOWLIST).map(function (rule) { return rule.domain ? rule.domain + (rule.pathPrefix || "") : "*" + rule.suffix; }),
      queries: queries,
      providers: [],
      discovered: [],
      sources: [],
      refused: [],
      passages: [],
      selectedPassageIds: [],
      evidencePolicy: "Search results and snippets only locate pages. Evidence is text fetched from the page itself."
    };
    if (!year || year < 1 || year > 6) {
      record.error = "yearGroup must be 1 to 6";
      return Promise.resolve(record);
    }
    var maxSources = ports.maxSources || 6;
    return Promise.all(providers.map(function (provider) {
      return Promise.resolve(provider.search(queries, ports, request)).then(function (result) {
        record.providers.push({ id: provider.id, paid: !!provider.paid, calls: result.calls || 0, searchCalls: result.searchCalls || 0, found: (result.candidates || []).length, error: result.error || "", usage: result.usage || null });
        return result.candidates || [];
      }).catch(function (error) {
        record.providers.push({ id: provider.id, paid: !!provider.paid, error: String(error && error.message || error) });
        return [];
      });
    })).then(function (lists) {
      var seen = {};
      var queue = [];
      var longest = 0;
      lists.forEach(function (list) { longest = Math.max(longest, list.length); });
      for (var i = 0; i < longest; i++) {
        lists.forEach(function (list) {
          var item = list[i];
          if (!item) return;
          var key = String(item.url).replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
          if (seen[key]) return;
          seen[key] = 1;
          record.discovered.push({ url: item.url, title: item.title || "", description: item.description || "", provider: item.provider, query: item.query || "", via: item.via || "", snippetIgnored: true });
          var allowed = isAllowedUrl(item.url, ports.allowlist);
          if (!allowed.ok) { record.refused.push({ url: item.url, reason: allowed.reason }); return; }
          var label = clean(item.title, 160) || (/wikipedia\.org$/.test(hostOf(item.url)) ? wikiTitleFromUrl(item.url) : "");
          if (NOT_EXPLANATORY_TITLE.test(label)) { record.refused.push({ url: item.url, reason: "not an explanatory article: " + label }); return; }
          if (item.description && NOT_EXPLANATORY_DESCRIPTION.test(item.description)) { record.refused.push({ url: item.url, reason: "not an explanatory article: " + label + " (" + item.description + ")" }); return; }
          queue.push(item);
        });
      }
      // Pages whose address or title names the topic are fetched first. Search order is kept
      // inside each group, so a provider's own ranking still decides ties.
      var topicStems = keywords(request.topic).map(stem);
      function topicHits(item) {
        var where = "";
        try { where = decodeURIComponent(new URL(item.url).pathname); } catch (e) { where = String(item.url); }
        var words = keywords(where.replace(/[\/_.-]+/g, " ") + " " + (item.title || "")).map(stem);
        return topicStems.filter(function (word) { return words.indexOf(word) !== -1; }).length;
      }
      queue = queue.map(function (item, index) { return { item: item, index: index, hits: topicHits(item) }; })
        .sort(function (a, b) { return (b.hits > 0) - (a.hits > 0) || a.index - b.index; })
        .map(function (row) { return row.item; });
      var picked = queue.slice(0, maxSources + 4);
      var n = 0;
      return Promise.all(picked.map(function (candidate) {
        n += 1;
        return fetchSource(candidate, "S" + n, ports);
      }));
    }).then(function (results) {
      var kept = 0;
      (results || []).forEach(function (result) {
        if (!result.ok || kept >= maxSources) {
          record.refused.push({ url: result.url, reason: result.ok ? "source cap reached" : result.reason });
          return;
        }
        kept += 1;
        var sourceId = result.passages[0].sourceId;
        record.sources.push({ sourceId: sourceId, url: result.url, requestedUrl: result.requestedUrl, title: result.title, domain: hostOf(result.url), rule: result.rule, fetchMethod: result.fetchMethod, fetchUrl: result.fetchUrl, retrievedAt: result.retrievedAt, bytes: result.bytes, passageCount: result.passages.length });
        result.passages.forEach(function (passage) { record.passages.push(passage); });
      });
      record.selectedPassageIds = rankPassages(record.passages, request, ports.ranking).map(function (row) { return row.id; });
      record.finishedAt = (ports.now || function () { return new Date().toISOString(); })();
      return record;
    });
  }

  return {
    SOURCE_ALLOWLIST: SOURCE_ALLOWLIST,
    isAllowedUrl: isAllowedUrl,
    allowedDomains: allowedDomains,
    htmlBlocks: htmlBlocks,
    wikiBlocks: wikiBlocks,
    passagesFromBlocks: passagesFromBlocks,
    fetchSource: fetchSource,
    wikipediaProvider: wikipediaProvider,
    openaiWebSearchProvider: openaiWebSearchProvider,
    SEARCH_GROUPS: SEARCH_GROUPS,
    featureFunctionSentences: featureFunctionSentences,
    buildQueries: buildQueries,
    rankPassages: rankPassages,
    researchTopic: researchTopic
  };
});
