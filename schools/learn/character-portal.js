/* Characters inside the signed-in portal.
   My Characters belong to the active workspace. The Wondii Crew does not. */
(function () {
  "use strict";

  var host = null;
  var saved = [];
  var status = "idle";
  var loadError = "";
  var token = 0;
  var making = false;
  var renaming = null;
  var maker = { type: "hero", photo: "", image: "", busy: false, error: "", name: "" };
  var coarse = false;
  var showTools = true;

  function crew() { return window.WondiiCrew; }
  function account() { return window.WondiiAccount; }

  function workspace() {
    var Account = account();
    var view = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
    if (!Account) return null;
    return Account.workspaceFrom({
      userId: view && view.userId,
      organisation: view && view.organisation,
      role: view && view.role,
      organisationName: view && view.organisationName
    });
  }

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function svg(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function figure(row) {
    var look = row.placeholder || {};
    var skin = look.skin || "#e0ac69";
    var hair = look.hair || "#3b2414";
    var top = look.top || "#7d5caf";
    var bottom = look.bottom || "#2c3338";
    var style = look.hairStyle || "short";
    var picture = svg("svg", { viewBox: "0 0 220 420", class: "crew-figure", "aria-hidden": "true" });
    picture.setAttribute("data-hair", style);
    picture.setAttribute("data-gesture", row.gesture || "wave");
    var shadow = svg("ellipse", { cx: "110", cy: "392", rx: "46", ry: "10", fill: "rgba(20,27,77,0.12)" });
    var legL = svg("rect", { x: "86", y: "268", width: "18", height: "96", rx: "9", fill: bottom });
    var legR = svg("rect", { x: "116", y: "268", width: "18", height: "96", rx: "9", fill: bottom });
    var shoeL = svg("ellipse", { cx: "92", cy: "368", rx: "16", ry: "8", fill: "#2c3338" });
    var shoeR = svg("ellipse", { cx: "128", cy: "368", rx: "16", ry: "8", fill: "#2c3338" });
    var torso = svg("rect", { x: "68", y: "168", width: "84", height: "112", rx: "34", fill: top });
    var armL = svg("g", { class: "crew-figure__arm crew-figure__arm--left" });
    armL.appendChild(svg("rect", { x: "40", y: "176", width: "22", height: "92", rx: "11", fill: skin }));
    var armR = svg("g", { class: "crew-figure__arm crew-figure__arm--right" });
    armR.appendChild(svg("rect", { x: "158", y: "176", width: "22", height: "92", rx: "11", fill: skin }));
    var head = svg("circle", { cx: "110", cy: "108", r: "46", fill: skin });
    var blushL = svg("ellipse", { cx: "86", cy: "124", rx: "8", ry: "5", fill: "rgba(212,83,75,0.28)" });
    var blushR = svg("ellipse", { cx: "134", cy: "124", rx: "8", ry: "5", fill: "rgba(212,83,75,0.28)" });
    var eyeL = svg("circle", { cx: "94", cy: "104", r: "5", fill: "#243056" });
    var eyeR = svg("circle", { cx: "126", cy: "104", r: "5", fill: "#243056" });
    var smile = svg("path", { d: "M96 124 Q110 138 124 124", fill: "none", stroke: "#243056", "stroke-width": "3", "stroke-linecap": "round" });
    var hairNodes = [];
    if (style === "long") {
      hairNodes.push(svg("path", { d: "M70 96 Q60 210 78 250 Q90 160 110 150 Q130 160 142 250 Q160 210 150 96 Q150 40 110 36 Q70 40 70 96 Z", fill: hair }));
    } else if (style === "curls") {
      hairNodes.push(svg("circle", { cx: "70", cy: "96", r: "28", fill: hair }));
      hairNodes.push(svg("circle", { cx: "150", cy: "96", r: "28", fill: hair }));
      hairNodes.push(svg("circle", { cx: "110", cy: "58", r: "34", fill: hair }));
    } else if (style === "braids") {
      hairNodes.push(svg("path", { d: "M72 70 Q110 28 148 70 Q140 100 110 96 Q80 100 72 70 Z", fill: hair }));
      hairNodes.push(svg("rect", { x: "62", y: "100", width: "14", height: "120", rx: "7", fill: hair }));
      hairNodes.push(svg("rect", { x: "144", y: "100", width: "14", height: "120", rx: "7", fill: hair }));
    } else if (style === "bob") {
      hairNodes.push(svg("path", { d: "M64 108 Q64 48 110 42 Q156 48 156 108 Q156 150 110 146 Q64 150 64 108 Z", fill: hair }));
    } else if (style === "messy") {
      hairNodes.push(svg("ellipse", { cx: "110", cy: "62", rx: "48", ry: "26", fill: hair, transform: "rotate(-8 110 62)" }));
      hairNodes.push(svg("circle", { cx: "78", cy: "78", r: "16", fill: hair }));
      hairNodes.push(svg("circle", { cx: "146", cy: "70", r: "14", fill: hair }));
    } else if (style === "straight") {
      hairNodes.push(svg("path", { d: "M68 100 Q68 40 110 36 Q152 40 152 100 L146 168 Q110 150 74 168 Z", fill: hair }));
    } else {
      hairNodes.push(svg("path", { d: "M68 96 Q72 42 110 40 Q148 42 152 96 Q110 78 68 96 Z", fill: hair }));
    }
    [shadow, legL, legR, shoeL, shoeR, torso, armL, armR, head, blushL, blushR, eyeL, eyeR, smile].forEach(function (part) {
      picture.appendChild(part);
    });
    hairNodes.forEach(function (part) { picture.insertBefore(part, head); });
    return picture;
  }

  function stage(row, kind) {
    var box = el("div", "crew-card__stage");
    var idle = document.createElement("img");
    idle.className = "crew-card__art crew-card__art--idle";
    idle.alt = "";
    idle.src = row.assets ? row.assets.idle : (row.artwork || "");
    var hover = document.createElement("img");
    hover.className = "crew-card__art crew-card__art--hover";
    hover.alt = "";
    hover.src = row.assets ? row.assets.hover : (row.artwork || "");
    var stand = figure(row.placeholder ? row : { placeholder: { skin: "#e0ac69", hair: "#3b2414", hairStyle: "short", top: "#7d5caf", bottom: "#2c3338" }, gesture: "wave" });
    function hideMissing(img) {
      img.addEventListener("error", function () { img.hidden = true; });
    }
    hideMissing(idle);
    hideMissing(hover);
    if (kind === "workspace" && row.artwork) {
      idle.src = row.artwork;
      hover.src = row.artwork;
    }
    box.appendChild(idle);
    box.appendChild(hover);
    box.appendChild(stand);
    box.appendChild(el("span", "crew-card__spark"));
    box.setAttribute("data-hover", hover.src || "");
    return box;
  }

  function bindPose(card) {
    function apply(active) {
      var state = crew().poseState({ hover: active.hover, focus: active.focus, selected: card.classList.contains("is-selected") && coarse, reducedMotion: reducedMotion() });
      card.setAttribute("data-pose", state.pose);
      card.classList.toggle("is-reduced", !state.animate);
    }
    var active = { hover: false, focus: false };
    card.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch") return;
      active.hover = true;
      apply(active);
    });
    card.addEventListener("pointerleave", function () {
      active.hover = false;
      apply(active);
    });
    card.addEventListener("focusin", function () {
      active.focus = true;
      apply(active);
    });
    card.addEventListener("focusout", function () {
      active.focus = false;
      apply(active);
    });
    card.addEventListener("click", function (event) {
      if (!coarse) return;
      if (event.target.closest("button, a")) return;
      card.classList.toggle("is-selected");
      apply(active);
    });
  }

  function useControl(label, onUse) {
    var button = el("button", "w-btn w-btn--primary crew-card__use", label);
    button.type = "button";
    button.addEventListener("click", onUse);
    return button;
  }

  function crewCard(row, selected) {
    var card = el("article", "crew-card");
    card.tabIndex = 0;
    card.setAttribute("data-pose", "idle");
    card.setAttribute("data-character", row.id);
    if (selected) card.classList.add("is-selected");
    card.appendChild(el("span", "crew-check", "✓"));
    card.appendChild(stage(row, "system"));
    card.appendChild(el("h3", "", row.name));
    card.appendChild(el("span", "crew-pill", "✨ " + row.trait.toUpperCase()));
    card.appendChild(el("p", "", row.description));
    var use = useControl("Use " + row.name, function () {
      choose(crew().bookCast(row));
    });
    use.setAttribute("aria-label", "Use " + row.name);
    card.appendChild(use);
    bindPose(card);
    return card;
  }

  function mineCard(row, selected) {
    var card = el("article", "crew-card");
    card.tabIndex = 0;
    card.setAttribute("data-pose", "idle");
    card.setAttribute("data-character", row.id);
    if (selected) card.classList.add("is-selected");
    card.appendChild(el("span", "crew-check", "✓"));
    card.appendChild(stage({
      artwork: row.artwork,
      assets: { idle: row.artwork || row.reference, hover: row.artwork || row.reference },
      placeholder: { skin: "#e0ac69", hair: "#3b2414", hairStyle: "short", top: "#7d5caf", bottom: "#2c3338" },
      gesture: "wave"
    }, "workspace"));
    card.appendChild(el("h3", "", row.name || "Character"));
    card.appendChild(el("span", "crew-pill", "SAVED"));
    card.appendChild(el("p", "", "Ready for your stories."));
    var use = useControl("Use " + (row.name || "character"), function () {
      choose(crew().workspaceCast(row));
    });
    use.setAttribute("aria-label", "Use " + (row.name || "character"));
    card.appendChild(use);
    if (!showTools) {
      bindPose(card);
      return card;
    }
    var tools = el("div", "crew-card__tools");
    var edit = el("button", "w-btn w-btn--quiet", "Edit");
    edit.type = "button";
    edit.setAttribute("aria-label", "Edit " + (row.name || "character"));
    edit.addEventListener("click", function () { openRename(row); });
    var remove = el("button", "w-btn w-btn--quiet", "Delete");
    remove.type = "button";
    remove.setAttribute("aria-label", "Delete " + (row.name || "character"));
    remove.addEventListener("click", function () { removeCharacter(row); });
    tools.appendChild(edit);
    tools.appendChild(remove);
    card.appendChild(tools);
    bindPose(card);
    return card;
  }

  function choose(member) {
    if (!member) return;
    if (host && host._onChoose) {
      host._onChoose(member);
      return;
    }
    window.location.href = "games/storybook.html?create=1&cast=" + encodeURIComponent(member.characterId);
  }

  function grid(nodes, source) {
    var list = el("div", "crew-grid");
    if (source) {
      list.setAttribute("data-cast-source", source);
      list.setAttribute("aria-label", source === "saved" ? "My characters" : "Wondii Crew");
    }
    nodes.forEach(function (node) { list.appendChild(node); });
    return list;
  }

  function emptyMine() {
    var box = el("div", "crew-empty");
    box.appendChild(el("h3", "", "Create someone special"));
    box.appendChild(el("p", "", "Make your own character once, then bring them into every story."));
    var button = el("button", "w-btn w-btn--primary", "Create a character");
    button.type = "button";
    button.addEventListener("click", openMaker);
    box.appendChild(button);
    return box;
  }

  function page() {
    var root = el("div", "crew-page");
    var hero = el("header", "crew-hero");
    hero.appendChild(el("h1", "", "Characters"));
    hero.appendChild(el("p", "w-lead", "Bring your stories to life"));
    hero.appendChild(el("p", "", "Create someone of your own, or choose a friend from the Wondii Crew."));
    var add = el("button", "w-btn w-btn--primary", "+ Create a character");
    add.type = "button";
    add.addEventListener("click", openMaker);
    hero.appendChild(add);
    root.appendChild(hero);
    if (loadError) root.appendChild(el("p", "crew-note", loadError));

    var mine = el("section", "crew-section");
    mine.appendChild(el("h2", "", "My characters"));
    if (status === "loading") mine.appendChild(el("p", "crew-lead", "Opening your characters."));
    else if (!saved.length) mine.appendChild(emptyMine());
    else mine.appendChild(grid(saved.map(function (row) { return mineCard(row, false); })));
    root.appendChild(mine);

    var meet = el("section", "crew-section");
    meet.appendChild(el("h2", "", "Meet the Wondii Crew"));
    meet.appendChild(el("p", "crew-lead", "Every character brings a different spark to your story."));
    var people = crew() ? crew().list() : [];
    meet.appendChild(grid(people.map(function (row) { return crewCard(row, false); })));
    root.appendChild(meet);
    if (making) root.appendChild(makerDialog());
    if (renaming) root.appendChild(renameDialog(renaming));
    return root;
  }

  function render() {
    if (!host) return;
    var chosen = host._selected || {};
    host.replaceChildren(page());
    host.querySelectorAll(".crew-card").forEach(function (card) {
      if (chosen[card.getAttribute("data-character")]) card.classList.add("is-selected");
    });
    preload();
  }

  function preload() {
    if (!host || !window.IntersectionObserver) return;
    var seen = {};
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var src = entry.target.getAttribute("data-hover");
        if (src && !seen[src]) {
          seen[src] = true;
          var img = new Image();
          img.src = src;
        }
        watch.unobserve(entry.target);
      });
    }, { rootMargin: "240px" });
    host.querySelectorAll(".crew-card__stage").forEach(function (stageNode) { watch.observe(stageNode); });
  }

  function openMaker() {
    making = true;
    maker = { type: "hero", photo: "", image: "", busy: false, error: "", name: "" };
    render();
  }

  function closeMaker() {
    if (maker.busy) return;
    making = false;
    render();
  }

  function functionUrl() {
    var config = window.SCORE_CONFIG || window.SCORE_SYNC || {};
    var base = config.supabaseUrl ? String(config.supabaseUrl).replace(/\/$/, "") : "";
    return base ? base + "/functions/v1/clever-service" : "";
  }

  function childMaker() {
    return !!(window.ChildLibrary && window.ChildLibrary.isChildSession && window.ChildLibrary.isChildSession());
  }

  function generate(name) {
    var url = functionUrl();
    if (!url) {
      maker.busy = false;
      maker.error = "Character making is not available on this site yet.";
      render();
      return;
    }
    var config = window.SCORE_CONFIG || window.SCORE_SYNC || {};
    var key = config.supabaseAnonKey || "";
    var payload = { action: "generate_character", characterName: name, characterType: maker.type };
    if (maker.photo) payload.referencePhoto = maker.photo;
    var start = childMaker() ? window.ChildLibrary.reserve("character") : Promise.resolve({ allowed: true, reason: "adult" });
    start.then(function (gate) {
      if (childMaker() && (!gate || gate.allowed !== true)) {
        maker.busy = false;
        maker.error = "Today’s characters are used up. You can make another one tomorrow.";
        render();
        return;
      }
      if (gate && gate.key) {
        payload.creationKey = gate.key;
        try { sessionStorage.setItem("wondii-child-character-key", gate.key); } catch (e) {}
      }
      var bearer = key;
      if (childMaker() && window.WondiiSession && window.WondiiSession.get) {
        var auth = window.WondiiSession.get();
        if (auth && auth.session && auth.session.access_token) bearer = auth.session.access_token;
      }
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + bearer, apikey: key },
        body: JSON.stringify(payload)
      }).then(function (response) {
      return response.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        if (!response.ok || !json || !json.imageData) throw new Error((json && (json.detail || json.error)) || "Could not generate the character.");
        return json.imageData;
      });
    }).then(function (image) {
      maker.image = image;
      maker.busy = false;
      maker.error = "";
      render();
    }).catch(function (err) {
      if (gate && gate.key && childMaker()) window.ChildLibrary.refund(gate.key);
      console.error("character generate failed", err);
      maker.busy = false;
      maker.error = err.message || "Could not generate the character.";
      render();
    });
    });
  }

  function persist(name) {
    var store = window.CharacterStore;
    var space = workspace();
    var blob = store && store.dataUrlToBlob(maker.image);
    if (childMaker()) {
      if (!store || !store.saveCharacter || !blob) {
        maker.busy = false;
        maker.error = "Generate the character before saving.";
        render();
        return;
      }
      store.saveCharacter({ name: name, type: maker.type, createdAt: new Date().toISOString() }, blob, function (err, record) {
        maker.busy = false;
        if (err || !record) {
          maker.error = (err && err.message) || "The character was not saved.";
          render();
          return;
        }
        making = false;
        saved = [Object.assign({ artwork: maker.image }, record)].concat(saved.filter(function (row) { return row.id !== record.id; }));
        status = "ready";
        render();
      });
      return;
    }
    if (!space || !space.ownerId) {
      maker.busy = false;
      maker.error = account() ? account().authNotice(space).text : "Log in to Wondii to save a character.";
      render();
      return;
    }
    if (!store || !store.saveCharacter || !blob) {
      maker.busy = false;
      maker.error = "Generate the character before saving.";
      render();
      return;
    }
    store.saveCharacter({ name: name, type: maker.type, createdAt: new Date().toISOString() }, blob, function (err, record) {
      maker.busy = false;
      if (err || !record) {
        console.error("character save failed", err);
        maker.error = (err && err.message) || "The character was not saved.";
        render();
        return;
      }
      making = false;
      loadError = "";
      saved = [Object.assign({ artwork: maker.image }, record)].concat(saved.filter(function (row) { return row.id !== record.id; }));
      status = "ready";
      render();
    });
  }

  function makerDialog() {
    var dialog = document.createElement("dialog");
    dialog.className = "w-dialog w-dialog--wide";
    var form = el("form", "w-dialog__body");
    form.appendChild(el("h2", "w-h2", "Create a character"));
    if (maker.error) form.appendChild(el("p", "w-error", maker.error));
    var nameField = el("label", "w-field", "");
    nameField.appendChild(el("span", "", "Name"));
    var name = document.createElement("input");
    name.className = "w-input";
    name.maxLength = 60;
    name.required = true;
    name.value = maker.name || "";
    nameField.appendChild(name);
    form.appendChild(nameField);
    var types = el("div", "w-segment");
    ["hero", "buddy"].forEach(function (type) {
      var chip = el("button", "", type === "hero" ? "A real child" : "An imaginary buddy");
      chip.type = "button";
      chip.setAttribute("aria-pressed", maker.type === type ? "true" : "false");
      chip.addEventListener("click", function () {
        maker.type = type;
        maker.name = name.value;
        render();
      });
      types.appendChild(chip);
    });
    form.appendChild(types);
    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/jpeg,image/png,image/webp";
    file.addEventListener("change", function () {
      var chosen = file.files && file.files[0];
      if (!chosen) return;
      var reader = new FileReader();
      reader.onload = function () { maker.photo = String(reader.result || ""); maker.name = name.value; };
      reader.readAsDataURL(chosen);
    });
    form.appendChild(file);
    if (maker.image) {
      var preview = document.createElement("img");
      preview.alt = "";
      preview.src = maker.image;
      form.appendChild(preview);
    }
    var actions = el("div", "w-dialog__actions");
    var cancel = el("button", "w-btn w-btn--quiet", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", closeMaker);
    var save = el("button", "w-btn w-btn--primary", maker.image ? "Save character" : "Generate");
    save.type = "submit";
    if (maker.busy) save.classList.add("is-loading");
    actions.appendChild(cancel);
    actions.appendChild(save);
    form.appendChild(actions);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (maker.busy) return;
      var typed = String(name.value || "").trim();
      if (!typed) { maker.error = "Type a name before saving."; render(); return; }
      if (maker.type === "hero" && !maker.photo && !maker.image) {
        maker.error = "Add a photo of the child first.";
        maker.name = typed;
        render();
        return;
      }
      maker.name = typed;
      maker.error = "";
      maker.busy = true;
      render();
      if (!maker.image) generate(typed);
      else persist(typed);
    });
    dialog.appendChild(form);
    dialog.addEventListener("cancel", function (event) { event.preventDefault(); closeMaker(); });
    setTimeout(function () {
      if (dialog.showModal && !dialog.open) { try { dialog.showModal(); } catch (e) {} }
    }, 0);
    return dialog;
  }

  function openRename(row) {
    renaming = row;
    render();
  }

  function renameDialog(row) {
    var dialog = document.createElement("dialog");
    dialog.className = "w-dialog";
    var form = el("form", "w-dialog__body");
    form.appendChild(el("h2", "w-h2", "Edit " + (row.name || "character")));
    var field = el("label", "w-field");
    field.appendChild(el("span", "", "Name"));
    var name = document.createElement("input");
    name.className = "w-input";
    name.value = row.name || "";
    name.maxLength = 60;
    field.appendChild(name);
    form.appendChild(field);
    var actions = el("div", "w-dialog__actions");
    var cancel = el("button", "w-btn w-btn--quiet", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", function () { renaming = null; render(); });
    var save = el("button", "w-btn w-btn--primary", "Save");
    save.type = "submit";
    actions.appendChild(cancel);
    actions.appendChild(save);
    form.appendChild(actions);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var typed = String(name.value || "").trim();
      if (!typed) return;
      var store = window.CharacterStore;
      var space = workspace();
      if (!store || !account() || !space) return;
      store.loadCharacters(function (err, list) {
        if (err) {
          console.error("character rename failed", err);
          loadError = err.message || "The name was not saved.";
          renaming = null;
          render();
          return;
        }
        var next = (list || []).map(function (item) {
          return item.id === row.id ? Object.assign({}, item, { name: typed }) : item;
        });
        store.saveCharactersIndex(next, function (saveErr) {
          if (saveErr) {
            console.error("character rename failed", saveErr);
            loadError = saveErr.message || "The name was not saved.";
          } else {
            saved = saved.map(function (item) { return item.id === row.id ? Object.assign({}, item, { name: typed }) : item; });
          }
          renaming = null;
          render();
        });
      });
    });
    dialog.appendChild(form);
    dialog.addEventListener("cancel", function (event) { event.preventDefault(); renaming = null; render(); });
    setTimeout(function () { if (dialog.showModal && !dialog.open) { try { dialog.showModal(); } catch (e) {} } }, 0);
    return dialog;
  }

  function removeCharacter(row) {
    if (!window.confirm('Delete "' + (row.name || "this character") + '"?')) return;
    var store = window.CharacterStore;
    if (!store) return;
    store.deleteCharacterImage(row.id, function () {
      store.loadCharacters(function (err, list) {
        var next = (!err && Array.isArray(list) ? list : saved).filter(function (item) { return item.id !== row.id; });
        store.saveCharactersIndex(next, function (saveErr) {
          if (saveErr) {
            console.error("character delete failed", saveErr);
            loadError = saveErr.message || "The character was not deleted.";
            render();
            return;
          }
          saved = saved.filter(function (item) { return item.id !== row.id; });
          render();
        });
      });
    });
  }

  function finishSaved(list) {
    saved = list || [];
    status = "ready";
    loadError = "";
    var store = window.CharacterStore;
    if (!store || !store.getCharacterSignedUrl || !saved.length) {
      render();
      return;
    }
    var left = saved.length;
    saved.forEach(function (row) {
      store.getCharacterSignedUrl(row.id, function (err, url) {
        if (!err && url) row.artwork = url;
        left -= 1;
        if (left === 0) render();
      });
    });
  }

  var watching = false;

  function watchAccount() {
    if (watching) return;
    watching = true;
    document.addEventListener("wondii-org", function () {
      if (host) loadSaved();
    });
  }

  function loadSaved() {
    watchAccount();
    if (childMaker()) {
      var childStore = window.CharacterStore;
      if (!childStore || !childStore.loadCharacters) {
        saved = [];
        status = "error";
        loadError = "This character library is not open yet.";
        render();
        return;
      }
      status = "loading";
      render();
      childStore.loadCharacters(function (err, list) {
        if (err || !Array.isArray(list)) {
          saved = [];
          status = "error";
          loadError = "Could not open characters. " + ((err && err.message) || "Try again.");
          render();
          return;
        }
        finishSaved(list);
      });
      return;
    }
    var store = window.CharacterStore;
    var view = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
    if (!view || (view.status !== "ready" && view.status !== "error")) {
      saved = [];
      status = "loading";
      loadError = "";
      render();
      return;
    }
    var mine = ++token;
    var space = workspace();
    if (!space || !space.ownerId || !store || !store.loadCharacters) {
      saved = [];
      status = "ready";
      loadError = space && space.kind === "signed-out" && account()
        ? account().authNotice(space).text
        : (view.status === "error" ? "Could not open characters. Try again." : "");
      render();
      return;
    }
    status = "loading";
    render();
    store.loadCharacters(function (err, list) {
      if (mine !== token) return;
      if (err || !Array.isArray(list)) {
        saved = [];
        status = "error";
        var notice = account() ? account().authNotice(space) : null;
        loadError = err && (err.code === "school-signed-out" || err.code === "no_session") && notice
          ? notice.text
          : "Could not open characters. " + ((err && err.message) || "Try again.");
        if (err) console.error("character library load failed", err);
        render();
        return;
      }
      finishSaved(list);
    });
  }

  function renderPicker(node, options) {
    var opts = options || {};
    var selected = {};
    (opts.selected || []).forEach(function (id) { selected[id] = true; });
    var root = el("div", "crew-page crew-page--picker");
    host = root;
    host._onChoose = function (member) {
      if (opts.onToggle) opts.onToggle(member);
    };
    host._selected = selected;
    try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) { coarse = false; }
    showTools = false;
    var mine = el("section", "crew-section");
    mine.appendChild(el("h2", "", "My characters"));
    var rows = (opts.saved || []).filter(function (row) { return row && row.eligibleForBooks !== false; });
    if (!rows.length) {
      var empty = el("div", "crew-empty");
      empty.appendChild(el("h3", "", "Create someone special"));
      empty.appendChild(el("p", "", "Make your own character once, then bring them into every story."));
      var link = document.createElement("a");
      link.className = "w-btn w-btn--primary";
      link.href = "../portal.html#characters";
      link.textContent = "Create a character";
      empty.appendChild(link);
      mine.appendChild(empty);
    } else {
      mine.appendChild(grid(rows.map(function (row) { return mineCard(row, !!selected[row.id]); }), "saved"));
    }
    var meet = el("section", "crew-section");
    meet.appendChild(el("h2", "", "Wondii Crew"));
    meet.appendChild(el("p", "crew-lead", "Every character brings a different spark to your story."));
    var people = crew() ? crew().list() : [];
    meet.appendChild(grid(people.map(function (row) { return crewCard(row, !!selected[row.id]); }), "system"));
    showTools = true;
    root.appendChild(mine);
    root.appendChild(meet);
    node.replaceChildren(root);
    preload();
  }

  function mount(node, options) {
    host = node;
    if (options && options.onChoose) host._onChoose = options.onChoose;
    if (options && options.selected) host._selected = options.selected;
    try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) { coarse = false; }
    render();
    loadSaved();
  }

  window.WondiiCharacterPortal = { mount: mount, renderPicker: renderPicker, figure: figure };

  function bootCharactersPage() {
    var node = document.getElementById("characterPage");
    var view = (window.location.hash || "").replace("#", "").split("/")[0];
    if (!node || view !== "characters") return;
    mount(node);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootCharactersPage);
  else bootCharactersPage();
})();
