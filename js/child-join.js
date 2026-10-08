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
  function portrait(crew, extra) {
    var look = (crew && crew.placeholder) || {};
    var skin = look.skin || "#e0ac69";
    var hair = look.hair || "#3b2414";
    var top = look.top || "#7d5caf";
    var style = look.hairStyle || "short";
    var wrap = node("span", extra ? "family-portrait " + extra : "family-portrait family-child__avatar");
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
      img.hidden = true;
      img.addEventListener("load", function () {
        if (img.naturalWidth > 0) img.hidden = false;
      });
      img.addEventListener("error", function () { img.remove(); });
      img.src = src;
      if (img.complete && img.naturalWidth > 0) img.hidden = false;
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

  function artImage(relative, label) {
    var img = document.createElement("img");
    img.className = "family-child__cover";
    img.alt = label || "";
    img.hidden = true;
    img.setAttribute("data-art", relative);
    img.addEventListener("load", function () {
      if (img.naturalWidth > 0) img.hidden = false;
    });
    img.addEventListener("error", function () { img.hidden = true; });
    return img;
  }

  function fillArt(root) {
    if (!global.ChildLibrary || !global.ChildLibrary.localArtUrl) return;
    root.querySelectorAll("[data-art]").forEach(function (img) {
      global.ChildLibrary.localArtUrl(img.getAttribute("data-art"), function (err, url) {
        if (err || !url) return;
        img.src = url;
        img.hidden = false;
      });
    });
  }

  function emptyState(text, href, label) {
    var box = node("div", "family-empty");
    box.appendChild(node("p", null, text));
    if (href && label) {
      var link = node("a", "family-btn", label);
      link.href = href;
      box.appendChild(link);
    }
    return box;
  }

  function bookGrid(rows, hrefFor, artFor, withHeart) {
    var list = node("ul", "family-books");
    rows.forEach(function (book) {
      var title = book.title || "Untitled";
      var item = node("li", "family-book");
      var open = node("a", "family-book__open", "");
      open.href = hrefFor(book);
      var cover = node("span", "family-book__cover");
      cover.style.setProperty("--hue", String((title.charCodeAt(0) * 47) % 360));
      cover.appendChild(artImage(artFor(book), title));
      var mark = node("span", "family-book__mark", title.trim().charAt(0).toUpperCase() || "W");
      mark.setAttribute("aria-hidden", "true");
      cover.appendChild(mark);
      open.appendChild(cover);
      open.appendChild(node("span", "family-book__title", title));
      item.appendChild(open);
      if (withHeart) {
        var heart = node("button", "family-heart" + (book.favourite ? " is-on" : ""), book.favourite ? "Loved" : "Favourite");
        heart.type = "button";
        heart.addEventListener("click", function () {
          if (!global.ChildLibrary) return;
          global.ChildLibrary.setFavourite(book.id, !book.favourite, function (err) {
            if (err) say("That favourite was not saved.");
            else sessionClient(function (sb) { if (sb) loadHome(sb); });
          });
        });
        item.appendChild(heart);
      }
      list.appendChild(item);
    });
    return list;
  }

  function personGrid(rows, hrefFor, artFor) {
    var list = node("ul", "family-people");
    rows.forEach(function (character) {
      var name = character.name || character.title || "Character";
      var item = node("li", "family-person");
      var open = hrefFor ? node("a", "family-person__open", "") : node("div", "family-person__open", "");
      if (hrefFor) open.href = hrefFor(character);
      var face = node("span", "family-person__face");
      face.style.setProperty("--hue", String((name.charCodeAt(0) * 47) % 360));
      face.appendChild(artImage(artFor(character), name));
      var initial = node("span", "family-person__mark", name.trim().charAt(0).toUpperCase() || "W");
      initial.setAttribute("aria-hidden", "true");
      face.appendChild(initial);
      open.appendChild(face);
      open.appendChild(node("span", "family-person__name", name));
      item.appendChild(open);
      list.appendChild(item);
    });
    return list;
  }

  function actionTile(href, tone, kicker, title) {
    var link = node("a", "family-tile family-tile--" + tone, "");
    link.href = href;
    link.appendChild(node("span", "family-tile__kicker", kicker));
    link.appendChild(node("span", "family-tile__title", title));
    return link;
  }

  function paintHome(data) {
    var host = document.getElementById("childJoin");
    if (!host) return;
    var crew = global.WondiiCrew && global.WondiiCrew.get && global.WondiiCrew.get(data.avatarId);
    var booksLeft = data.booksRemaining != null ? data.booksRemaining : data.booksPerDay;
    var charactersLeft = data.charactersRemaining != null ? data.charactersRemaining : data.charactersPerDay;
    host.replaceChildren();
    host.classList.remove("family-join");
    host.classList.add("family-child__home");

    var brand = node("a", "family-brand", "");
    brand.href = "child.html";
    var mark = document.createElement("img");
    mark.src = "games/images/brand/wondi-wordmark.svg";
    mark.alt = "Wondii";
    brand.appendChild(mark);
    host.appendChild(brand);

    var nav = node("nav", "family-child__nav");
    nav.setAttribute("aria-label", "Your Wondii");
    [
      ["child.html", "Home", true],
      ["#my-books", "Books", false],
      ["child-character.html", "Characters", false],
      ["#play", "Games", false]
    ].forEach(function (item) {
      var link = node("a", item[2] ? "is-current" : "", item[1]);
      link.href = item[0];
      if (item[2]) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });
    host.appendChild(nav);

    var hello = node("section", "family-child__hero");
    hello.appendChild(portrait(crew));
    var helloCopy = node("div", "family-child__hero-copy");
    helloCopy.appendChild(node("p", "family-kicker", "My Wondii"));
    helloCopy.appendChild(node("h1", "family-child__hello", "Hello " + (data.nickname || "there")));
    helloCopy.appendChild(node("p", "family-child__crew", crew ? crew.name + " is here with you" : "Your Wondii friend is here"));
    var today = node("ul", "family-child__today");
    today.appendChild(node("li", null, String(booksLeft) + " books left today"));
    today.appendChild(node("li", null, String(charactersLeft) + " characters left today"));
    helloCopy.appendChild(today);
    hello.appendChild(helloCopy);
    host.appendChild(hello);

    var make = node("section", "family-child__actions");
    make.appendChild(actionTile("games/storybook.html", "book", "A new story", "Create a book"));
    make.appendChild(actionTile("child-character.html", "character", "Someone new", "Create a character"));
    host.appendChild(make);

    var mine = node("section", "family-child__panel");
    mine.id = "my-books";
    mine.appendChild(node("p", "family-kicker", "My creations"));
    mine.appendChild(node("h2", null, "My books"));
    if (data.continueId) {
      var current = (data.books || []).filter(function (book) { return book && book.id === data.continueId; })[0];
      var cont = node("a", "family-continue", "");
      cont.href = "games/storybook.html?book=" + encodeURIComponent(data.continueId);
      cont.appendChild(node("span", "family-kicker", "Continue reading"));
      cont.appendChild(node("span", "family-continue__title", current && current.title ? current.title : "Your book"));
      mine.appendChild(cont);
    }
    if (!Array.isArray(data.books) || !data.books.length) {
      mine.appendChild(emptyState("Your books will appear here.", "games/storybook.html", "Create a book"));
    } else {
      mine.appendChild(bookGrid(data.books, function (book) {
        return "games/storybook.html?book=" + encodeURIComponent(book.id || "");
      }, function (book) {
        return "books/" + book.id + "/cover.jpg";
      }, true));
    }
    var favourites = (data.books || []).filter(function (book) { return book && book.favourite; });
    mine.appendChild(node("h2", null, "Favourites"));
    mine.appendChild(favourites.length
      ? bookGrid(favourites, function (book) {
        return "games/storybook.html?book=" + encodeURIComponent(book.id || "");
      }, function (book) {
        return "books/" + book.id + "/cover.jpg";
      }, false)
      : emptyState("Tap Favourite on a book when you love it.", "", ""));
    mine.appendChild(node("h2", null, "My characters"));
    mine.appendChild((!Array.isArray(data.characters) || !data.characters.length)
      ? emptyState("Your characters will appear here.", "child-character.html", "Create a character")
      : personGrid(data.characters, null, function (character) {
        return "characters/" + character.id + ".png";
      }));
    host.appendChild(mine);

    var shared = node("section", "family-child__panel family-child__panel--shared");
    shared.appendChild(node("p", "family-kicker", "Shared with me"));
    shared.appendChild(node("h2", null, "Family bookshelf"));
    shared.appendChild((!Array.isArray(data.sharedBooks) || !data.sharedBooks.length)
      ? emptyState("Books a grown-up shares will appear here.", "", "")
      : bookGrid(data.sharedBooks, function (book) {
        return "games/storybook.html?shared=" + encodeURIComponent(book.id || "");
      }, function (book) {
        return "shared/" + book.id + "/cover.jpg";
      }, false));
    shared.appendChild(node("h2", null, "Shared characters"));
    shared.appendChild((!Array.isArray(data.sharedCharacters) || !data.sharedCharacters.length)
      ? emptyState("Characters a grown-up shares will appear here.", "", "")
      : personGrid(data.sharedCharacters, function (character) {
        return "games/storybook.html?sharedChar=" + encodeURIComponent(character.id || "");
      }, function (character) {
        return "shared/" + character.id + "/character.png";
      }));
    host.appendChild(shared);
    fillArt(host);

    var games = node("section", "family-child__panel");
    games.id = "play";
    games.appendChild(node("h2", null, "Play games"));
    if (data.canPlayGames) {
      var row = node("div", "family-play");
      [
        ["games/star-catcher.html", "Star Catcher"],
        ["games/memory.html", "Memory Match"],
        ["games/jigsaw.html", "Jigsaw"]
      ].forEach(function (item) {
        var link = node("a", "family-play__link", item[1]);
        link.href = item[0];
        row.appendChild(link);
      });
      games.appendChild(row);
    } else {
      games.appendChild(node("p", null, "Games are turned off today."));
    }
    host.appendChild(games);

    var status = node("p", "family-status", "");
    status.id = "childPairStatus";
    status.setAttribute("role", "status");
    host.appendChild(status);
    statusNode = status;
  }

  function paintJoin() {
    var form = document.getElementById("childPair");
    var host = document.getElementById("childJoin");
    if (!form || !host || document.getElementById("childJoinCrew")) return;
    if (!global.WondiiCrew || !global.WondiiCrew.list) return;
    var row = node("ul", "family-join__crew");
    row.id = "childJoinCrew";
    row.setAttribute("aria-label", "Wondii Crew");
    global.WondiiCrew.list().forEach(function (member) {
      var item = node("li", null, "");
      item.appendChild(portrait(member, "family-join__face"));
      row.appendChild(item);
    });
    host.insertBefore(row, form);
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

  if (form) {
    form.addEventListener("submit", redeem);
    paintJoin();
  }
  if (new URLSearchParams(global.location.search).get("pair")) redeem();
  else if (global.WondiiSession && global.WondiiSession.subscribe) {
    global.WondiiSession.subscribe(function (snap) {
      if (snap && snap.status === "authenticated") openSpace();
    });
  }
})(window);
