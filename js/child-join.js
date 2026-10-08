/* Child device entry. Redeems a pairing code through the server.
   The service role never comes to this page. */
(function (global) {
  "use strict";

  var statusNode = document.getElementById("childPairStatus");
  var form = document.getElementById("childPair");

  function say(text) {
    if (statusNode) statusNode.textContent = text;
  }

  function config() {
    return global.WONDII_CONFIG || global.SCORE_CONFIG || {};
  }

  function codeFromPage() {
    var params = new URLSearchParams(global.location.search);
    var fromLink = params.get("pair") || "";
    var field = form && form.code ? form.code.value : "";
    return String(fromLink || field).trim().toUpperCase();
  }

  function sessionClient(done) {
    if (!global.WondiiSession || !global.WondiiSession.client) {
      done(null);
      return;
    }
    global.WondiiSession.client(done);
  }

  function checkAccess(sb, done) {
    sb.rpc("child_content_access").then(function (res) {
      var allowed = res && res.data && res.data.allowed === true;
      done(allowed);
    }).catch(function () {
      done(false);
    });
  }

  function enter(session) {
    sessionClient(function (sb) {
      if (!sb) {
        say("Wondii could not open just now. Try the code once more.");
        return;
      }
      sb.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }).then(function (res) {
        if (!res || res.error || !res.data || !res.data.session) {
          say("Wondii could not open just now. Try the code once more.");
          return;
        }
        checkAccess(sb, function (allowed) {
          if (!allowed) {
            sb.auth.signOut();
            say("This device cannot open Wondii. Ask a grown-up for a new code.");
            return;
          }
          if (form) form.hidden = true;
          loadHome(sb);
        });
      }).catch(function () {
        say("Wondii could not open just now. Try the code once more.");
      });
    });
  }

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function svg(name, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  /* Same drawn portrait the family page uses when a crew picture is missing. */
  function portrait(crew) {
    var look = (crew && crew.placeholder) || {};
    var skin = look.skin || "#e0ac69";
    var hair = look.hair || "#3b2414";
    var top = look.top || "#7d5caf";
    var style = look.hairStyle || "short";
    var wrap = node("span", "family-portrait family-child__avatar");
    var picture = svg("svg", { viewBox: "0 0 80 80", "aria-hidden": "true" });
    picture.appendChild(svg("rect", { width: "80", height: "80", fill: "#f6f1fb" }));
    picture.appendChild(svg("rect", { x: "16", y: "56", width: "48", height: "30", rx: "16", fill: top }));
    if (style === "long" || style === "straight" || style === "braids") {
      picture.appendChild(svg("path", { d: "M20 34 Q18 72 30 76 L50 76 Q62 72 60 34 Q60 8 40 8 Q20 8 20 34 Z", fill: hair }));
    } else if (style === "curls") {
      picture.appendChild(svg("circle", { cx: "22", cy: "34", r: "12", fill: hair }));
      picture.appendChild(svg("circle", { cx: "58", cy: "34", r: "12", fill: hair }));
      picture.appendChild(svg("circle", { cx: "40", cy: "18", r: "16", fill: hair }));
    } else if (style === "bob") {
      picture.appendChild(svg("path", { d: "M18 40 Q18 10 40 10 Q62 10 62 40 Q62 58 40 56 Q18 58 18 40 Z", fill: hair }));
    } else {
      picture.appendChild(svg("path", { d: "M20 32 Q22 10 40 10 Q58 10 60 32 Q40 24 20 32 Z", fill: hair }));
    }
    picture.appendChild(svg("circle", { cx: "40", cy: "38", r: "16", fill: skin }));
    picture.appendChild(svg("circle", { cx: "34", cy: "36", r: "2", fill: "#243056" }));
    picture.appendChild(svg("circle", { cx: "46", cy: "36", r: "2", fill: "#243056" }));
    picture.appendChild(svg("path", { d: "M34 44 Q40 49 46 44", fill: "none", stroke: "#243056", "stroke-width": "1.6", "stroke-linecap": "round" }));
    wrap.appendChild(picture);
    var src = crew && crew.assets && crew.assets.idle;
    if (src) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = src;
      img.addEventListener("error", function () { img.hidden = true; });
      wrap.appendChild(img);
    }
    return wrap;
  }

  function loadHome(sb) {
    sb.rpc("child_home").then(function (res) {
      var data = res && res.data;
      if (!res || res.error || !data || data.allowed !== true) {
        say("This device is paired. Your Wondii space is not open yet.");
        return;
      }
      paintHome(data);
    }).catch(function () {
      say("This device is paired. Your Wondii space is not open yet.");
    });
  }

  function listOrEmpty(host, rows, emptyText, label) {
    if (!Array.isArray(rows) || !rows.length) {
      host.appendChild(node("p", null, emptyText));
      return;
    }
    var list = node("ul", "family-child__list");
    rows.forEach(function (row) {
      list.appendChild(node("li", null, row[label] || "Untitled"));
    });
    host.appendChild(list);
  }

  function paintHome(data) {
    var host = document.getElementById("childJoin");
    if (!host) return;
    var crew = global.WondiiCrew && global.WondiiCrew.get && global.WondiiCrew.get(data.avatarId);
    host.replaceChildren();
    host.classList.add("family-child__home");
    var hello = node("section", "family-child__welcome");
    hello.appendChild(portrait(crew));
    hello.appendChild(node("p", "family-child__hello", "Hello " + (data.nickname || "there")));
    hello.appendChild(node("p", "family-child__crew", crew ? crew.name + " is here with you" : "Your Wondii friend is here"));
    host.appendChild(hello);

    var make = node("section", "family-child__panel");
    make.appendChild(node("h2", null, "Make something"));
    var bookLink = node("a", "family-btn", "Create a book");
    bookLink.href = "games/storybook.html";
    make.appendChild(bookLink);
    var characterForm = node("form", "family-child__character");
    var name = document.createElement("input");
    name.name = "characterName";
    name.maxLength = 40;
    name.required = true;
    name.setAttribute("aria-label", "Character name");
    characterForm.appendChild(name);
    characterForm.appendChild(node("button", "family-btn", "Create a character"));
    characterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveCharacter(name.value.trim(), function (message) { say(message); });
    });
    make.appendChild(characterForm);
    host.appendChild(make);

    var games = node("section", "family-child__panel");
    games.appendChild(node("h2", null, "Play games"));
    if (data.canPlayGames) {
      [
        ["games/star-catcher.html", "Star Catcher"],
        ["games/memory.html", "Memory Match"],
        ["games/jigsaw.html", "Jigsaw"]
      ].forEach(function (item) {
        var link = node("a", "family-btn", item[1]);
        link.href = item[0];
        games.appendChild(link);
      });
    } else {
      games.appendChild(node("p", null, "Games are turned off today."));
    }
    host.appendChild(games);

    var mine = node("section", "family-child__panel");
    mine.appendChild(node("h2", null, "My books"));
    if (data.continueId) {
      var cont = node("a", "family-btn", "Continue reading");
      cont.href = "games/storybook.html";
      mine.appendChild(cont);
    }
    if (!Array.isArray(data.books) || !data.books.length) {
      mine.appendChild(node("p", null, "Your books will appear here."));
    } else {
      var bookList = node("ul", "family-child__list");
      data.books.forEach(function (book) {
        var item = node("li", null, book.title || "Untitled");
        var heart = node("button", "family-btn", book.favourite ? "Loved" : "Favourite");
        heart.type = "button";
        heart.addEventListener("click", function () {
          if (!global.ChildLibrary) return;
          global.ChildLibrary.setFavourite(book.id, !book.favourite, function (err) {
            if (err) say("That favourite was not saved.");
            else sessionClient(function (sb) { if (sb) loadHome(sb); });
          });
        });
        item.appendChild(heart);
        bookList.appendChild(item);
      });
      mine.appendChild(bookList);
    }
    var favourites = (data.books || []).filter(function (book) { return book && book.favourite; });
    mine.appendChild(node("h2", null, "Favourites"));
    listOrEmpty(mine, favourites, "Tap a book’s heart when you love it.", "title");
    mine.appendChild(node("h2", null, "My characters"));
    listOrEmpty(mine, data.characters, "Your characters will appear here.", "name");
    host.appendChild(mine);

    var shared = node("section", "family-child__panel");
    shared.appendChild(node("h2", null, "Family bookshelf"));
    listOrEmpty(shared, data.sharedBooks, "Books a grown-up shares will appear here.", "title");
    listOrEmpty(shared, data.sharedCharacters, "Characters a grown-up shares will appear here.", "title");
    host.appendChild(shared);

    var today = node("section", "family-child__panel");
    today.appendChild(node("h2", null, "Today"));
    var booksLeft = data.booksRemaining != null ? data.booksRemaining : data.booksPerDay;
    var charactersLeft = data.charactersRemaining != null ? data.charactersRemaining : data.charactersPerDay;
    today.appendChild(node("p", null, String(booksLeft) + " books left today"));
    today.appendChild(node("p", null, String(charactersLeft) + " characters left today"));
    host.appendChild(today);
    var status = node("p", null, "");
    status.id = "childPairStatus";
    status.setAttribute("role", "status");
    host.appendChild(status);
    statusNode = status;
  }

  function saveCharacter(name, done) {
    if (!name || !global.ChildLibrary) {
      done("Type a name for your character.");
      return;
    }
    global.ChildLibrary.reserve("character").then(function (gate) {
      if (!gate || gate.allowed !== true) {
        done("Today’s characters are used up.");
        return;
      }
      global.ChildLibrary.loadCharacters(function (err, list) {
        var next = Array.isArray(list) ? list.slice() : [];
        next.push({ id: gate.key, name: name });
        global.ChildLibrary.saveCharacters(next, gate.key, function (saveErr) {
          if (saveErr) {
            global.ChildLibrary.refund(gate.key);
            done("That character was not saved.");
            return;
          }
          done(name + " is saved.");
          sessionClient(function (sb) { if (sb) loadHome(sb); });
        });
      });
    });
  }

  function redeem(event) {
    if (event) event.preventDefault();
    var cfg = config();
    var code = codeFromPage();
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)) {
      say("Enter the 8-letter code from the grown-up’s screen.");
      return;
    }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      say("Wondii could not open just now. Try again in a moment.");
      return;
    }
    say("Checking your code…");
    fetch(cfg.supabaseUrl + "/functions/v1/child-pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey
      },
      body: JSON.stringify({ code: code })
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    }).then(function (result) {
      var data = result.data || {};
      if (!result.ok || data.allowed !== true || !data.access_token || !data.refresh_token) {
        say(data.reason === "profile_unavailable"
          ? "This profile is paused. Ask a grown-up to allow it again."
          : data.reason === "limited"
            ? "Too many tries. Wait a little while and ask for a new code."
            : "That code has expired or was already used.");
        return;
      }
      enter(data);
    }).catch(function () {
      say("Wondii could not check that code. Try again in a moment.");
    });
  }

  var opened = false;

  function openSpace() {
    if (opened) return;
    sessionClient(function (sb) {
      if (!sb) return;
      checkAccess(sb, function (allowed) {
        if (!allowed || opened) return;
        opened = true;
        if (form) form.hidden = true;
        loadHome(sb);
      });
    });
  }

  if (form) form.addEventListener("submit", redeem);
  if (new URLSearchParams(global.location.search).get("pair")) redeem();
  else if (global.WondiiSession && global.WondiiSession.subscribe) {
    global.WondiiSession.subscribe(function (snap) {
      if (snap && snap.status === "authenticated") openSpace();
    });
  }
})(window);
