/* Parent family dashboard. Uses the existing WondiiSession client.
   Child profiles are records. They are not logins. */
(function (global) {
  "use strict";

  var INTENT_KEY = "wondii-account-intent";
  var AVATARS = [
    { id: "wondii-maya", name: "Maya" },
    { id: "wondii-leo", name: "Leo" },
    { id: "wondii-amara", name: "Amara" },
    { id: "wondii-finn", name: "Finn" },
    { id: "wondii-zara", name: "Zara" },
    { id: "wondii-theo", name: "Theo" },
    { id: "wondii-nia", name: "Nia" },
    { id: "wondii-arlo", name: "Arlo" },
    { id: "wondii-sofia", name: "Sofia" },
    { id: "wondii-ravi", name: "Ravi" },
    { id: "wondii-elsie", name: "Elsie" },
    { id: "wondii-jasper", name: "Jasper" }
  ];
  var AGE_BANDS = [
    { id: "4-6", label: "Ages 4–6" },
    { id: "7-9", label: "Ages 7–9" },
    { id: "10-12", label: "Ages 10–12" }
  ];

  var snapshot = { family: null, children: [] };
  var message = "";
  var editing = null;
  var bound = false;
  var starting = false;

  function avatar(id) {
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i];
    return AVATARS[0];
  }

  function svg(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  /* Crew webp files are optional. The drawn portrait matches the characters page fallback. */
  function bust(look) {
    var skin = look.skin || "#e0ac69";
    var hair = look.hair || "#3b2414";
    var top = look.top || "#7d5caf";
    var style = look.hairStyle || "short";
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
    } else if (style === "messy") {
      picture.appendChild(svg("ellipse", { cx: "40", cy: "18", rx: "22", ry: "12", fill: hair }));
      picture.appendChild(svg("circle", { cx: "24", cy: "26", r: "8", fill: hair }));
      picture.appendChild(svg("circle", { cx: "58", cy: "22", r: "7", fill: hair }));
    } else {
      picture.appendChild(svg("path", { d: "M20 32 Q22 10 40 10 Q58 10 60 32 Q40 24 20 32 Z", fill: hair }));
    }
    picture.appendChild(svg("circle", { cx: "40", cy: "38", r: "16", fill: skin }));
    picture.appendChild(svg("circle", { cx: "34", cy: "36", r: "2", fill: "#243056" }));
    picture.appendChild(svg("circle", { cx: "46", cy: "36", r: "2", fill: "#243056" }));
    picture.appendChild(svg("path", { d: "M34 44 Q40 49 46 44", fill: "none", stroke: "#243056", "stroke-width": "1.6", "stroke-linecap": "round" }));
    if (style === "braids") {
      picture.appendChild(svg("rect", { x: "16", y: "36", width: "6", height: "28", rx: "3", fill: hair }));
      picture.appendChild(svg("rect", { x: "58", y: "36", width: "6", height: "28", rx: "3", fill: hair }));
    }
    return picture;
  }

  function portrait(id) {
    var row = global.WondiiCrew && global.WondiiCrew.get && global.WondiiCrew.get(id);
    var wrap = el("span", { className: "family-portrait" });
    var src = row && row.assets && row.assets.idle;
    if (src) {
      var img = el("img", { src: src, alt: "" });
      img.addEventListener("error", function () { img.hidden = true; });
      wrap.appendChild(img);
    }
    wrap.appendChild(bust((row && row.placeholder) || {}));
    return wrap;
  }

  function ageLabel(id) {
    for (var i = 0; i < AGE_BANDS.length; i++) if (AGE_BANDS[i].id === id) return AGE_BANDS[i].label;
    return id;
  }

  function schoolOn() {
    var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
    return !!(org && org.organisationId);
  }

  function signedIn() {
    var auth = global.WondiiSession && global.WondiiSession.get && global.WondiiSession.get();
    return !!(auth && auth.status === "authenticated" && auth.session);
  }

  function showNav(on) {
    document.querySelectorAll('[data-view-link="family"], [data-account="family"]').forEach(function (el) {
      el.hidden = !on || schoolOn();
    });
  }

  function client(done) {
    if (!global.WondiiSession || !global.WondiiSession.client) {
      done(null);
      return;
    }
    global.WondiiSession.client(done);
  }

  function failText(err) {
    var code = String((err && (err.message || err.code)) || "");
    if (/family_name/.test(code)) return "Enter your name, between 2 and 40 letters.";
    if (/nickname/.test(code)) return "Use a nickname of up to 24 letters, without an email address.";
    if (/avatar/.test(code)) return "Choose one of the Wondii avatars.";
    if (/age_band/.test(code)) return "Choose an age band.";
    if (/allowance/.test(code)) return "Daily allowances stay between 0 and 10.";
    if (/pending_deletion/.test(code)) return "Restore this profile before editing it.";
    if (/not_restorable|not_found/.test(code)) return "That profile can no longer be restored.";
    if (/sign_in_required/.test(code)) return "Log in again to manage your family.";
    if (/no_family/.test(code)) return "Create your family first.";
    return "That didn’t save. Check your connection and try again.";
  }

  function applySnapshot(data) {
    snapshot = {
      family: data && data.family ? data.family : null,
      children: data && Array.isArray(data.children) ? data.children : []
    };
    showNav(true);
    paint();
    paintInvite();
  }

  function call(name, args, done) {
    client(function (sb) {
      if (!sb) {
        done(new Error("unavailable"));
        return;
      }
      sb.rpc(name, args || {}).then(function (res) {
        if (res && res.error) {
          done(res.error);
          return;
        }
        if (res && res.data && res.data.family !== undefined) applySnapshot(res.data);
        done(null, res && res.data);
      }).catch(function (err) {
        done(err || new Error("failed"));
      });
    });
  }

  function refresh(done) {
    if (!signedIn()) {
      snapshot = { family: null, children: [] };
      if (done) done();
      return;
    }
    call("family_snapshot", {}, function () {
      if (done) done();
    });
  }

  function intent() {
    try {
      return JSON.parse(localStorage.getItem(INTENT_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function clearFamilyIntent() {
    var raw = intent();
    if (!raw || raw.intent !== "family") return;
    try { localStorage.removeItem(INTENT_KEY); } catch (e) {}
  }

  function maybeStartFromSignup() {
    if (starting || !signedIn() || snapshot.family) return;
    var raw = intent();
    var auth = global.WondiiSession.get();
    var email = auth.session && auth.session.user && auth.session.user.email;
    if (!raw || raw.intent !== "family" || !raw.displayName) return;
    if (email && raw.email && raw.email !== String(email).toLowerCase()) return;
    starting = true;
    call("start_family", { p_display_name: raw.displayName }, function (err) {
      starting = false;
      if (!err) clearFamilyIntent();
    });
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (key) {
      if (key === "className") node.className = attrs[key];
      else if (key === "hidden") node.hidden = !!attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    if (text != null) node.textContent = text;
    return node;
  }

  function field(label, control) {
    var wrap = el("label", { className: "family-field" });
    wrap.appendChild(el("span", null, label));
    wrap.appendChild(control);
    return wrap;
  }

  function formFor(child) {
    var form = el("form", { className: "family-form", id: "familyForm" });
    form.appendChild(el("h2", { className: "family-form__title" }, child ? "Manage profile" : "Add a child"));
    var nick = el("input", { name: "nickname", maxlength: "24", required: "true", autocomplete: "off" });
    nick.value = child ? child.nickname : "";
    form.appendChild(field("Nickname", nick));

    var avatars = el("div", { className: "family-avatars", role: "radiogroup", "aria-label": "Avatar" });
    AVATARS.forEach(function (item, index) {
      var choice = el("label", { className: "family-avatar" });
      var input = el("input", { type: "radio", name: "avatar", value: item.id, required: "true" });
      if ((child && child.avatarId === item.id) || (!child && index === 8)) input.checked = true;
      choice.appendChild(input);
      choice.appendChild(portrait(item.id));
      choice.appendChild(el("span", null, item.name));
      avatars.appendChild(choice);
    });
    form.appendChild(field("Avatar", avatars));

    var age = el("select", { name: "ageBand", required: "true" });
    AGE_BANDS.forEach(function (item) {
      var option = el("option", { value: item.id }, item.label);
      if (child && child.ageBand === item.id) option.selected = true;
      age.appendChild(option);
    });
    form.appendChild(field("Age band", age));

    var books = el("input", { name: "books", type: "number", min: "0", max: "10", required: "true" });
    books.value = String(child ? child.booksPerDay : 3);
    form.appendChild(field("Books a day, up to 10", books));
    var characters = el("input", { name: "characters", type: "number", min: "0", max: "10", required: "true" });
    characters.value = String(child ? child.charactersPerDay : 2);
    form.appendChild(field("Characters a day, up to 10", characters));
    var games = el("input", { type: "checkbox", name: "games" });
    games.checked = child ? !!child.canPlayGames : true;
    var gamesLabel = el("label", { className: "family-check" });
    gamesLabel.appendChild(games);
    gamesLabel.appendChild(el("span", null, "Games and activities"));
    form.appendChild(gamesLabel);
    form.appendChild(el("p", { className: "family-note" }, "These allowances are saved for later. Children cannot create on their own yet."));

    var actions = el("div", { className: "family-form__actions" });
    actions.appendChild(el("button", { type: "submit", className: "family-btn" }, child ? "Save profile" : "Add child"));
    actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--ghost", "data-family": "close" }, "Cancel"));
    form.appendChild(actions);
    if (child) form.setAttribute("data-id", child.id);
    return form;
  }

  function card(child) {
    var item = el("article", { className: "family-card" });
    item.appendChild(portrait(avatar(child.avatarId).id));
    var copy = el("div", { className: "family-card__copy" });
    copy.appendChild(el("h3", null, child.nickname));
    copy.appendChild(el("p", null, ageLabel(child.ageBand)));
    if (child.status === "suspended") copy.appendChild(el("p", { className: "family-card__flag" }, "Access paused"));
    var stats = el("ul", { className: "family-card__stats" });
    ["Books created: 0", "Characters created: 0", child.booksPerDay + " books a day", child.charactersPerDay + " characters a day"].forEach(function (line) {
      stats.appendChild(el("li", null, line));
    });
    copy.appendChild(stats);
    item.appendChild(copy);
    var actions = el("div", { className: "family-card__actions" });
    actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--ghost", "data-family": "library", "data-id": child.id }, "Open library"));
    actions.appendChild(el("button", { type: "button", className: "family-btn", "data-family": "edit", "data-id": child.id }, "Manage profile"));
    if (child.status === "suspended") {
      actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--ghost", "data-family": "resume", "data-id": child.id }, "Allow access"));
    } else {
      actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--ghost", "data-family": "pause", "data-id": child.id }, "Pause access"));
    }
    actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--quiet", "data-family": "remove", "data-id": child.id }, "Remove profile"));
    item.appendChild(actions);
    return item;
  }

  function removedCard(child) {
    var item = el("article", { className: "family-card family-card--quiet" });
    var when = child.purgeAfter ? new Date(child.purgeAfter) : null;
    var date = when && !isNaN(when.getTime())
      ? when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "30 days";
    item.appendChild(el("h3", null, child.nickname));
    item.appendChild(el("p", null, "Hidden from your family. You can restore this profile or download a copy until " + date + ". After that it is deleted and cannot be brought back."));
    var actions = el("div", { className: "family-card__actions" });
    actions.appendChild(el("button", { type: "button", className: "family-btn", "data-family": "restore", "data-id": child.id }, "Restore profile"));
    actions.appendChild(el("button", { type: "button", className: "family-btn family-btn--ghost", "data-family": "export", "data-id": child.id }, "Download copy"));
    item.appendChild(actions);
    return item;
  }

  function paintInvite() {
    var host = document.getElementById("familyInvite");
    if (!host) return;
    host.replaceChildren();
    if (!signedIn() || schoolOn() || snapshot.family) return;
    var box = el("section", { className: "family-invite" });
    box.appendChild(el("h2", null, "Create your family"));
    box.appendChild(el("p", null, "Add your children when you are ready. Your books, characters and school workspace stay where they are."));
    box.appendChild(el("a", { className: "family-btn", href: "#family" }, "Set up your family"));
    host.appendChild(box);
  }

  function paint() {
    var host = document.getElementById("familyDash");
    if (!host) return;
    bind();
    host.replaceChildren();
    if (schoolOn()) {
      host.appendChild(el("h1", { className: "family-title" }, "Your family"));
      host.appendChild(el("p", { className: "family-lead" }, "Family profiles stay in your personal workspace."));
      host.appendChild(el("button", { type: "button", className: "family-btn", "data-family": "personal" }, "Switch to Personal"));
      return;
    }
    if (!signedIn()) {
      host.appendChild(el("h1", { className: "family-title" }, "Your family"));
      host.appendChild(el("p", { className: "family-lead" }, "Log in to create your family."));
      return;
    }
    host.appendChild(el("h1", { className: "family-title" }, snapshot.family ? snapshot.family.displayName + "’s family" : "Your family"));
    host.appendChild(el("p", { className: "family-lead" }, snapshot.family
      ? "Add a child, choose an avatar and an age band, and decide their daily allowances."
      : "You are the adult for this family. Your existing books and characters are not moved."));
    if (message) host.appendChild(el("p", { className: "family-status", role: "status" }, message));

    if (!snapshot.family) {
      var start = el("form", { className: "family-form", id: "familyStart" });
      var name = el("input", { name: "displayName", maxlength: "40", required: "true", autocomplete: "name" });
      start.appendChild(field("Your name", name));
      start.appendChild(el("p", { className: "family-note" }, "Creating a family means you are the adult responsible for the child profiles you add. You can download or restore a removed profile for 30 days."));
      start.appendChild(el("button", { type: "submit", className: "family-btn" }, "Create my family"));
      host.appendChild(start);
      return;
    }

    var living = snapshot.children.filter(function (child) { return child.status !== "pending_deletion"; });
    var removed = snapshot.children.filter(function (child) { return child.status === "pending_deletion"; });
    var grid = el("div", { className: "family-grid" });
    living.forEach(function (child) { grid.appendChild(card(child)); });
    var add = el("button", { type: "button", className: "family-add", "data-family": "add" }, "Add a child");
    grid.appendChild(add);
    host.appendChild(grid);

    var library = el("section", { className: "family-panel" });
    library.appendChild(el("h2", null, "Recent family activity"));
    library.appendChild(el("p", null, "Books and characters created for a child will gather here. Nothing is tracked beyond those creations."));
    library.appendChild(el("a", { href: "#stories" }, "Your stories"));
    library.appendChild(document.createTextNode(" · "));
    library.appendChild(el("a", { href: "#characters" }, "Your characters"));
    host.appendChild(library);

    if (removed.length) {
      var bin = el("section", { className: "family-panel" });
      bin.appendChild(el("h2", null, "Removed profiles"));
      removed.forEach(function (child) { bin.appendChild(removedCard(child)); });
      host.appendChild(bin);
    }

    if (editing) {
      var sheet = el("div", { className: "family-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "familyFormTitle" });
      var form = formFor(editing === "new" ? null : editing);
      form.querySelector("h2").id = "familyFormTitle";
      sheet.appendChild(form);
      host.appendChild(sheet);
      var focus = form.querySelector("input[name='nickname']");
      if (focus) focus.focus();
    }
  }

  function childById(id) {
    for (var i = 0; i < snapshot.children.length; i++) {
      if (snapshot.children[i].id === id) return snapshot.children[i];
    }
    return null;
  }

  function onSubmit(event) {
    var form = event.target;
    if (form.id !== "familyStart" && form.id !== "familyForm") return;
    event.preventDefault();
    message = "";
    if (form.id === "familyStart") {
      call("start_family", { p_display_name: form.displayName.value.trim() }, function (err) {
        message = err ? failText(err) : "";
        if (!err) clearFamilyIntent();
        paint();
      });
      return;
    }
    var data = new FormData(form);
    call("save_child_profile", {
      p_id: form.getAttribute("data-id") || null,
      p_nickname: String(data.get("nickname") || "").trim(),
      p_avatar: String(data.get("avatar") || ""),
      p_age_band: String(data.get("ageBand") || ""),
      p_books: Number(data.get("books")),
      p_characters: Number(data.get("characters")),
      p_games: data.get("games") === "on"
    }, function (err) {
      if (err) {
        message = failText(err);
        paint();
        return;
      }
      editing = null;
      message = "";
      paint();
    });
  }

  function download(data, nickname) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = el("a", { href: url, download: nickname + "-wondii-profile.json" });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function onClick(event) {
    var button = event.target.closest("[data-family]");
    if (!button) return;
    var action = button.getAttribute("data-family");
    var id = button.getAttribute("data-id");
    if (action === "personal") {
      if (global.WondiiOrg && global.WondiiOrg.chooseWorkspace) global.WondiiOrg.chooseWorkspace("family");
      return;
    }
    if (action === "add") {
      editing = "new";
      message = "";
      paint();
      return;
    }
    if (action === "close") {
      editing = null;
      paint();
      return;
    }
    if (action === "edit") {
      editing = childById(id);
      paint();
      return;
    }
    if (action === "library") {
      message = "A child’s own library arrives with child sign-in. Your stories and characters are still under Stories and Characters.";
      paint();
      return;
    }
    if (action === "pause" || action === "resume") {
      call("set_child_status", { p_id: id, p_status: action === "pause" ? "suspended" : "active" }, function (err) {
        message = err ? failText(err) : "";
        paint();
      });
      return;
    }
    if (action === "remove") {
      var child = childById(id);
      var name = child ? child.nickname : "this child";
      if (!global.confirm("Remove " + name + "? The profile is hidden now. You can restore it or download a copy for 30 days. After that it is deleted.")) return;
      call("request_child_deletion", { p_id: id }, function (err) {
        message = err ? failText(err) : name + " is hidden. You can restore the profile for 30 days.";
        editing = null;
        paint();
      });
      return;
    }
    if (action === "restore") {
      call("restore_child_profile", { p_id: id }, function (err) {
        message = err ? failText(err) : "Profile restored.";
        paint();
      });
      return;
    }
    if (action === "export") {
      call("export_child_profile", { p_id: id }, function (err, data) {
        if (err) {
          message = failText(err);
          paint();
          return;
        }
        var profile = data && data.profile;
        download(data, (profile && profile.nickname) || "child");
      });
    }
  }

  function bind() {
    var host = document.getElementById("familyDash");
    if (!host || bound) return;
    bound = true;
    host.addEventListener("submit", onSubmit);
    host.addEventListener("click", onClick);
  }

  function boot() {
    showNav(signedIn());
    if (editing) return;
    refresh(function () {
      maybeStartFromSignup();
      paintInvite();
    });
  }

  global.WondiiFamily = {
    paint: paint,
    refresh: refresh,
    avatars: AVATARS
  };

  function listen() {
    if (global.WondiiSession && global.WondiiSession.subscribe) {
      global.WondiiSession.subscribe(function () {
        boot();
      });
    }
    document.addEventListener("wondii-org", function () {
      showNav(signedIn());
      paintInvite();
      if (editing) return;
      var view = document.querySelector('.p-view[data-view="family"]');
      if (view && !view.hidden) paint();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", listen);
  else listen();
})(typeof window !== "undefined" ? window : globalThis);
