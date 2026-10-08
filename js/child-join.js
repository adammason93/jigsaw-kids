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

  function paintHome(data) {
    var host = document.getElementById("childJoin");
    if (!host) return;
    var crew = global.WondiiCrew && global.WondiiCrew.get && global.WondiiCrew.get(data.avatarId);
    host.replaceChildren();
    host.classList.add("family-child__home");
    host.appendChild(node("p", "family-child__hello", "Hello " + (data.nickname || "there")));
    host.appendChild(node("p", "family-child__crew", crew ? crew.name : "Your Wondii friend"));
    var games = node("section", "family-child__panel");
    games.appendChild(node("h2", null, "Play"));
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
    mine.appendChild(node("h2", null, "My Wondii"));
    if (!Array.isArray(data.books) || !data.books.length) mine.appendChild(node("p", null, "Your books will appear here."));
    if (!Array.isArray(data.characters) || !data.characters.length) mine.appendChild(node("p", null, "Your characters will appear here."));
    host.appendChild(mine);
    var shared = node("section", "family-child__panel");
    shared.appendChild(node("h2", null, "From your family"));
    shared.appendChild(node("p", null, "Books and characters a grown-up shares will appear here."));
    host.appendChild(shared);
    var today = node("section", "family-child__panel");
    today.appendChild(node("h2", null, "Today"));
    today.appendChild(node("p", null, String(data.booksPerDay) + " books a day"));
    today.appendChild(node("p", null, String(data.charactersPerDay) + " characters a day"));
    host.appendChild(today);
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
