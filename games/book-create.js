/* Create-a-book journey. Talks only to the public book request.
   No picture calls and no percentage. */
(function () {
  "use strict";

  var Brain = window.WondiiBookBrain;
  var Cast = window.WondiiCharacterBible;
  var root = document.getElementById("bookV2");
  var editBar = document.getElementById("bookEdit");
  if (!root || !Brain || !Cast) return;

  ["sbLanding", "sbModal", "sbBusy", "sbPortalWelcome"].forEach(function (id) {
    var node = document.getElementById(id);
    if (!node) return;
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });

  var DRAFT_KEY = "wondii-book-draft";
  var TONE_LABELS = {
    adventure: "Adventure",
    funny: "Funny",
    magical: "Magical",
    mystery: "Mystery",
    bedtime: "Bedtime",
    surprise: "Surprise me"
  };
  var FRIENDLY = {
    "cast-size": "Choose one, two, three, or four characters.",
    "idea-missing": "Tell Wondii what should happen.",
    year: "Choose who's reading.",
    length: "Choose how long the story should be."
  };

  var state = {
    step: 1,
    castIds: [],
    idea: "",
    tone: null,
    yearGroup: "",
    ageBand: "",
    length: "storybook",
    result: null,
    mode: "create",
    pageId: "",
    note: "",
    castQueryApplied: false,
    savedCastReady: false
  };
  var savedRows = [];

  function params() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function loadDraft() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      var idea = params().get("idea");
      if (!saved) {
        if (idea) state.idea = String(idea).slice(0, 280);
        return;
      }
      state.castIds = saved.castIds || [];
      state.idea = idea || saved.idea || "";
      state.tone = saved.tone || null;
      state.yearGroup = saved.yearGroup || "";
      state.ageBand = saved.ageBand || "";
      state.length = saved.length || "storybook";
    } catch (e) {}
  }

  function saveDraft() {
    var request = Brain.publicRequest(currentInput());
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(request));
    } catch (e) {}
    return request;
  }

  function schoolContext() {
    var query = params();
    if (query.get("family") === "1") return false;
    if (query.get("school") === "1") return true;
    try {
      var org = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
      return !!(org && org.organisationId);
    } catch (e) {
      return false;
    }
  }

  function currentInput() {
    var school = schoolContext();
    return {
      castIds: state.castIds.slice(),
      idea: state.idea,
      yearGroup: school ? state.yearGroup : "",
      ageBand: school ? "" : state.ageBand,
      length: state.length,
      tone: state.tone,
      context: school ? "school" : "family"
    };
  }

  function catalogue() {
    var Lib = window.WondiiCharacterLibrary;
    var view = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
    var space = window.WondiiAccount && view ? window.WondiiAccount.workspaceFrom({
      userId: view.userId,
      organisation: view.organisation,
      role: view.role,
      organisationName: view.organisationName
    }) : null;
    if (Lib) return Lib.availableCharacters({
      bible: Cast,
      saved: savedRows,
      catalogue: window.WondiiCatalogue && window.WondiiCatalogue.characters ? window.WondiiCatalogue.characters() : [],
      ownerId: space && space.ownerId,
      ownerType: space && space.ownerType
    });
    return Cast.listCharacters().map(function (character) {
      return {
        id: character.characterId,
        name: character.name,
        source: "canonical",
        artwork: "",
        description: (character.personality || []).join(" and "),
        eligibleForBooks: true
      };
    });
  }

  function entryById(id) {
    var found = null;
    catalogue().forEach(function (entry) {
      if (entry.id === id) found = entry;
    });
    return found;
  }

  function names(ids) {
    return (ids || state.castIds).map(function (id) {
      var crewMember = window.WondiiCrew && window.WondiiCrew.get(id);
      if (crewMember) return crewMember.name;
      var entry = entryById(id);
      if (entry) return entry.name;
      var character = Cast.getCharacter(id);
      return character ? character.name : id;
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function avatar(entry) {
    var Lib = window.WondiiCharacterLibrary;
    var file = entry.artwork && Lib ? Lib.artworkSrc(entry.artwork, true) : entry.artwork;
    if (Lib && Lib.cardArtwork) file = Lib.cardArtwork(file);
    if (file) {
      var frame = el("span", "book-cast__frame");
      var photo = document.createElement("img");
      photo.className = "book-cast__photo";
      photo.alt = "";
      photo.src = file;
      if (entry.artworkFrame && file.indexOf("maya-v1-front.jpg") < 0) photo.setAttribute("data-frame", entry.artworkFrame);
      frame.appendChild(photo);
      return frame;
    }
    var face = el("span", "w-avatar w-avatar--room");
    face.textContent = entry.name.slice(0, 1);
    if (entry.accent) face.style.background = entry.accent;
    if (state.castIds.indexOf(entry.id) >= 0) face.classList.add("is-selected");
    return face;
  }

  function castCard(entry) {
    var on = state.castIds.indexOf(entry.id) >= 0;
    var card = el("button", "w-card w-card--interactive book-cast__card");
    card.type = "button";
    card.setAttribute("aria-pressed", on ? "true" : "false");
    card.setAttribute("aria-label", entry.name);
    card.appendChild(avatar(entry));
    card.appendChild(el("strong", "", entry.name));
    if (entry.description) card.appendChild(el("p", "w-help", entry.description));
    card.addEventListener("click", function () { toggleCast(entry.id); });
    return card;
  }

  function savedCard(entry) {
    var card = el("div", "w-card book-cast__card book-cast__card--saved");
    card.appendChild(avatar(entry));
    card.appendChild(el("strong", "", entry.name));
    var open = document.createElement("a");
    open.className = "w-help";
    open.href = "../portal.html#characters/" + encodeURIComponent(entry.id);
    open.textContent = "In your character library";
    card.appendChild(open);
    return card;
  }

  function faces() {
    var row = el("div", "w-faces");
    row.setAttribute("aria-label", "Chosen characters");
    state.castIds.forEach(function (id) {
      var crewMember = window.WondiiCrew && window.WondiiCrew.get(id);
      var entry = entryById(id);
      var character = Cast.getCharacter(id);
      var name = crewMember ? crewMember.name : (entry ? entry.name : (character ? character.name : ""));
      if (!name) return;
      var art = "";
      if (crewMember && window.WondiiCrew) {
        art = window.WondiiCrew.cardArt ? window.WondiiCrew.cardArt(crewMember) : (window.WondiiCrew.displayArt ? window.WondiiCrew.displayArt(crewMember) : "");
      }
      var face = el("span", "book-cast__joined");
      if (art) {
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = art.indexOf("games/") === 0 ? art.slice("games/".length) : art;
        face.appendChild(photo);
      }
      face.appendChild(document.createTextNode(name));
      face.title = name + " is in this story";
      row.appendChild(face);
    });
    return row;
  }

  function actions(buttons) {
    var row = el("div", "book-actions");
    buttons.forEach(function (item) {
      var button = el("button", "w-btn " + item.className, item.label);
      button.type = "button";
      button.addEventListener("click", item.on);
      row.appendChild(button);
    });
    return row;
  }

  function heading(title, lead) {
    var wrap = el("div", "w-wrap");
    var kicker = el("p", "w-kicker", "Wondii");
    var h = el("h1", "w-h1", title);
    h.id = "bookV2Title";
    wrap.appendChild(kicker);
    wrap.appendChild(h);
    if (lead) wrap.appendChild(el("p", "w-lead", lead));
    return wrap;
  }

  function paintCreate() {
    if (window.WondiiStorybookReader) window.WondiiStorybookReader.close();
    root.innerHTML = "";
    var wrap = heading(
      state.step === 1 ? "Who's in your story?" : state.step === 2 ? "What should happen?" : state.step === 3 ? (schoolContext() ? "Who's reading?" : "Who's the story for?") : "Your story",
      state.step === 1 ? "Choose your characters, give Wondii an idea, and we'll turn it into an illustrated book." : ""
    );
    if (state.step > 1) wrap.appendChild(faces());
    if (state.note) wrap.appendChild(el("p", "w-help w-error", state.note));

    if (state.step === 1) {
      var cast = catalogue();
      var picker = el("div", "book-cast-picker");
      picker.setAttribute("data-cast-source", "saved");
      wrap.appendChild(el("h2", "w-h2", "Choose your characters"));
      wrap.appendChild(picker);
      if (window.WondiiCharacterPortal && window.WondiiCharacterPortal.renderPicker) {
        window.WondiiCharacterPortal.renderPicker(picker, {
          saved: cast.filter(function (entry) { return entry.source === "saved"; }),
          selected: state.castIds,
          onToggle: function (member) { toggleCast(member.characterId); }
        });
      }
      wrap.appendChild(actions([{ className: "w-btn--primary", label: "Next", on: function () {
        state.note = state.castIds.length ? "" : "Choose at least one character.";
        if (!state.note) state.step = 2;
        paintCreate();
      } }]));
    }

    if (state.step === 2) {
      var field = el("label", "w-field");
      field.appendChild(el("span", "", "Your idea"));
      var box = document.createElement("textarea");
      box.maxLength = 280;
      box.value = state.idea;
      var who = names();
      box.placeholder = who.length
        ? who.join(" and ") + " find something that should not be there..."
        : "They find something that should not be there...";
      box.addEventListener("input", function () { state.idea = box.value; });
      field.appendChild(box);
      wrap.appendChild(field);
      var tones = el("div", "w-segment");
      tones.setAttribute("role", "group");
      tones.setAttribute("aria-label", "Story feel, optional");
      Brain.TONES.forEach(function (tone) {
        var chip = el("button", "", TONE_LABELS[tone]);
        chip.type = "button";
        chip.setAttribute("aria-pressed", state.tone === tone ? "true" : "false");
        chip.addEventListener("click", function () {
          state.tone = state.tone === tone ? null : tone;
          paintCreate();
        });
        tones.appendChild(chip);
      });
      wrap.appendChild(el("p", "w-help", "Optional. Leave this if you want Wondii to choose the feel."));
      wrap.appendChild(tones);
      wrap.appendChild(actions([
        { className: "w-btn--quiet", label: "Back", on: function () { state.step = 1; state.note = ""; paintCreate(); } },
        { className: "w-btn--primary", label: "Next", on: function () {
          state.note = state.idea.trim() ? "" : "Tell Wondii what should happen.";
          if (!state.note) state.step = 3;
          paintCreate();
        } }
      ]));
    }

    if (state.step === 3) {
      var school = schoolContext();
      var readers = el("div", "w-segment");
      readers.setAttribute("role", "group");
      readers.setAttribute("aria-label", school ? "Year" : "Age");
      if (school) {
        Brain.YEAR_GROUPS.forEach(function (year) {
          var chip = el("button", "", year);
          chip.type = "button";
          chip.setAttribute("aria-pressed", state.yearGroup === year ? "true" : "false");
          chip.addEventListener("click", function () {
            state.yearGroup = year;
            paintCreate();
          });
          readers.appendChild(chip);
        });
      } else {
        Object.keys(Brain.AGE_BANDS).forEach(function (band) {
          var chip = el("button", "", Brain.AGE_BANDS[band].ageRange);
          chip.type = "button";
          chip.setAttribute("aria-pressed", state.ageBand === band ? "true" : "false");
          chip.addEventListener("click", function () {
            state.ageBand = band;
            paintCreate();
          });
          readers.appendChild(chip);
        });
      }
      wrap.appendChild(readers);
      var order = ["quick", "storybook", "adventure"];
      var lengths = el("div", "book-length");
      lengths.setAttribute("role", "radiogroup");
      lengths.setAttribute("aria-label", "Book length");
      order.forEach(function (id) {
        var profile = Brain.lengthProfile(id);
        var card = el("button", "w-card w-card--interactive book-length__stop");
        card.type = "button";
        card.setAttribute("role", "radio");
        card.setAttribute("aria-checked", state.length === id ? "true" : "false");
        card.tabIndex = state.length === id ? 0 : -1;
        if (profile.recommended) card.appendChild(el("span", "w-kicker", "Recommended"));
        card.appendChild(el("strong", "", profile.title));
        card.appendChild(el("span", "w-help", profile.line));
        card.appendChild(el("span", "w-help", profile.scope));
        card.addEventListener("click", function () {
          state.length = id;
          paintCreate();
        });
        card.addEventListener("keydown", function (event) {
          var at = order.indexOf(state.length);
          if (event.key === "ArrowRight" || event.key === "ArrowDown") at = Math.min(order.length - 1, at + 1);
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp") at = Math.max(0, at - 1);
          else return;
          event.preventDefault();
          state.length = order[at];
          paintCreate();
          var next = root.querySelector('[role="radio"][aria-checked="true"]');
          if (next) next.focus();
        });
        lengths.appendChild(card);
      });
      wrap.appendChild(lengths);
      wrap.appendChild(actions([
        { className: "w-btn--quiet", label: "Back", on: function () { state.step = 2; state.note = ""; paintCreate(); } },
        { className: "w-btn--primary", label: "Next", on: function () {
          var readerMissing = school ? !state.yearGroup : !state.ageBand;
          state.note = readerMissing ? (school ? "Choose who's reading." : "Choose who's the story for.") : !state.length ? "Choose how long the story should be." : "";
          if (!state.note) state.step = 4;
          paintCreate();
        } }
      ]));
    }

    if (state.step === 4) {
      var summary = el("article", "w-hero");
      summary.appendChild(faces());
      summary.appendChild(el("p", "", schoolContext() ? state.yearGroup : ((Brain.AGE_BANDS[state.ageBand] || {}).ageRange || "")));
      var length = Brain.lengthProfile(state.length);
      var bits = [length ? length.title : ""];
      if (state.tone) bits.push(TONE_LABELS[state.tone]);
      summary.appendChild(el("p", "w-help", bits.filter(Boolean).join(" · ")));
      summary.appendChild(el("p", "w-story", state.idea));
      wrap.appendChild(summary);
      wrap.appendChild(actions([
        { className: "w-btn--quiet", label: "Back", on: function () { state.step = 3; state.note = ""; paintCreate(); } },
        { className: "w-btn--primary w-btn--room", label: "Create my book", on: begin }
      ]));
    }

    root.appendChild(wrap);
    root.hidden = false;
  }

  function toggleCast(id) {
    var crewMember = window.WondiiCrew && window.WondiiCrew.get(id);
    var entry = entryById(id);
    if (!crewMember && (!entry || !entry.eligibleForBooks)) return;
    var at = state.castIds.indexOf(id);
    if (at >= 0) state.castIds.splice(at, 1);
    else if (state.castIds.length >= 4) state.note = "Choose up to four characters.";
    else {
      state.castIds.push(id);
      state.note = "";
    }
    paintCreate();
  }

  function applyCastQuery() {
    if (state.castQueryApplied) return;
    var raw = params().get("cast") || "";
    if (!raw) return;
    var Lib = window.WondiiCharacterLibrary;
    var Crew = window.WondiiCrew;
    var ids = raw.split(",").map(function (id) { return id.trim(); }).filter(Boolean);
    var waiting = !state.savedCastReady && ids.some(function (id) {
      return !(Crew && Crew.get(id)) && !entryById(id);
    });
    if (waiting) return;
    state.castQueryApplied = true;
    var picked = Lib ? Lib.bookSelection(catalogue(), ids).map(function (item) { return item.characterId; }) : [];
    ids.forEach(function (id) {
      if (Crew && Crew.get(id) && picked.indexOf(id) < 0) picked.push(id);
    });
    state.castIds = picked.slice(0, 4);
  }

  function loadSavedCast() {
    var Store = window.CharacterStore;
    if (!Store || !Store.loadCharacters) return;
    Store.loadCharacters(function (err, list) {
      if (err || !Array.isArray(list)) {
        state.savedCastReady = true;
        applyCastQuery();
        return;
      }
      if (!list.length) {
        savedRows = [];
        state.savedCastReady = true;
        applyCastQuery();
        if (state.step === 1 && !state.result) paintCreate();
        return;
      }
      var rows = list.map(function (row) {
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          createdAt: row.createdAt,
          artwork: "",
          look: row.look || null,
          reference: row.reference || "",
          ownerId: row.ownerId || "",
          ownerType: row.ownerType || ""
        };
      });
      function showRows(next) {
        savedRows = next;
        state.savedCastReady = true;
        applyCastQuery();
        if (state.step === 1 && !state.result) paintCreate();
      }
      if (!Store.getCharacterSignedUrl) {
        showRows(rows);
        return;
      }
      var left = rows.length;
      rows.forEach(function (row) {
        Store.getCharacterSignedUrl(row.id, function (urlErr, url) {
          if (!urlErr && url) row.artwork = url;
          left -= 1;
          if (left === 0) showRows(rows);
        });
      });
    });
  }

  function selectedReferences() {
    var refs = [];
    var Crew = window.WondiiCrew;
    state.castIds.forEach(function (id) {
      if (Crew && Crew.get(id)) {
        refs.push(Crew.bookCast(id));
        return;
      }
      var entry = entryById(id);
      if (!entry || entry.source !== "saved" || !entry.reference || !entry.ownerId || !Crew) return;
      refs.push(Crew.workspaceCast(entry));
    });
    return refs;
  }

  function begin() {
    var request = saveDraft();
    request.characterReferences = selectedReferences();
    var accepted = Brain.acceptCreation(request);
    if (!accepted.ok) {
      state.note = FRIENDLY[accepted.problems[0]] || "Check the story and try again.";
      paintCreate();
      return;
    }
    root.innerHTML = "";
    var wrap = heading("Creating your book", "");
    wrap.appendChild(faces());
    ["dreaming", "planning"].forEach(function (stage) {
      wrap.appendChild(el("p", "", Brain.generationView({ stage: stage }).label));
    });
    wrap.appendChild(holdNote());
    root.appendChild(wrap);
    root.hidden = false;
  }

  function holdNote() {
    var note = el("div", "w-empty");
    note.appendChild(el("p", "w-empty__title", "Your idea is saved"));
    note.appendChild(el("p", "", "Wondii has your characters and your idea. Writing and pictures stay off until the next step. Nothing is being illustrated."));
    var row = actions([
      { className: "w-btn--quiet", label: "Edit story idea", on: function () { state.step = 2; state.mode = "create"; paintCreate(); } }
    ]);
    var back = el("a", "w-btn w-btn--quiet", "Back to stories");
    back.href = "../portal.html#stories";
    row.appendChild(back);
    note.appendChild(row);
    return note;
  }

  function paintReady() {
    var story = state.result.readerStory;
    root.innerHTML = "";
    var wrap = heading("Your book is ready", "");
    var cover = el("article", "w-card book-cover");
    cover.appendChild(el("h2", "w-h2", story.title));
    cover.appendChild(el("p", "", "Featuring " + story.featuring));
    cover.appendChild(el("p", "w-help", "Pictures have not been made yet."));
    wrap.appendChild(cover);
    wrap.appendChild(actions([
      { className: "w-btn--primary w-btn--room", label: "Read book", on: function () { openReader(false); } },
      { className: "w-btn--secondary", label: "Edit book", on: function () { openReader(true); } },
      { className: "w-btn--quiet", label: "Create another book", on: reset }
    ]));
    root.appendChild(wrap);
    root.hidden = false;
    if (editBar) editBar.hidden = true;
  }

  function openReader(editing) {
    var reader = window.WondiiStorybookReader;
    if (!reader || !state.result) return;
    root.hidden = true;
    reader.open(state.result.readerStory);
    reader.listen(function (spread) {
      state.pageId = spread.pageId || "";
      if (editing) paintEdit(spread);
    });
    if (editing) paintEdit({ pageId: state.result.pages[0].pageId, text: state.result.pages[0].prose });
    else if (editBar) editBar.hidden = true;
  }

  function paintEdit(spread) {
    if (!editBar) return;
    editBar.hidden = false;
    editBar.innerHTML = "";
    var wrap = el("div", "w-wrap");
    wrap.appendChild(el("p", "w-kicker", "This page"));
    var field = el("label", "w-field");
    field.appendChild(el("span", "", "Edit text"));
    var box = document.createElement("textarea");
    box.value = spread.text || "";
    field.appendChild(box);
    wrap.appendChild(field);
    if (state.note) wrap.appendChild(el("p", "w-help", state.note));
    wrap.appendChild(actions([
      { className: "w-btn--primary", label: "Save text", on: function () { saveText(spread.pageId, box.value); } },
      { className: "w-btn--quiet", label: "Rewrite", on: function () { later("rewrite", spread.pageId); } },
      { className: "w-btn--quiet", label: "Regenerate picture", on: function () { later("picture", spread.pageId); } },
      { className: "w-btn--quiet", label: "Regenerate page", on: function () { later("page", spread.pageId); } },
      { className: "w-btn--quiet", label: "Back to cover", on: paintReady }
    ]));
    editBar.appendChild(wrap);
  }

  function saveText(pageId, text) {
    var edited = Brain.applyTextEdit(state.result, pageId, text);
    state.note = "";
    if (!edited.ok) {
      state.note = "That sentence is a bit long for this year.";
      paintEdit({ pageId: pageId, text: text });
      return;
    }
    state.result.pages.forEach(function (page) {
      if (page.pageId === pageId) page.prose = edited.text;
    });
    state.result.readerStory.pages.forEach(function (page) {
      if (page.pageId === pageId) page.text = edited.text;
    });
    if (edited.imageStale) state.note = "The words changed the picture's job. The picture stays as it is until pictures are turned on.";
    if (window.WondiiStorybookReader) window.WondiiStorybookReader.updatePage(pageId, edited.text);
    paintEdit({ pageId: pageId, text: edited.text });
  }

  function later(action, pageId) {
    Brain.repairRequest(state.result, pageId);
    state.note = action === "rewrite"
      ? "Rewriting stays off until story writing is turned on."
      : "That stays off until pictures are turned on.";
    paintEdit({ pageId: pageId, text: (state.result.pages.filter(function (page) { return page.pageId === pageId; })[0] || {}).prose || "" });
  }

  function reset() {
    state.step = 1;
    state.castIds = [];
    state.idea = "";
    state.tone = null;
    state.yearGroup = "";
    state.ageBand = "";
    state.length = "storybook";
    state.result = null;
    state.note = "";
    if (editBar) editBar.hidden = true;
    if (window.WondiiStorybookReader) window.WondiiStorybookReader.close();
    paintCreate();
  }

  function openFixture(id) {
    var result = Brain.runFixture(id);
    if (!result.ok) {
      root.hidden = false;
      root.innerHTML = "";
      var wrap = heading("Your book needs another look", "");
      wrap.appendChild(el("p", "w-help", "Wondii could not finish this text book. No pictures were made."));
      root.appendChild(wrap);
      return;
    }
    result.shelfItem.savedAt = new Date().toISOString();
    state.result = result;
    if (window.WondiiStorybookReader) window.WondiiStorybookReader.shelve(result.shelfItem);
    paintReady();
  }

  loadDraft();
  applyCastQuery();
  function loadWhenReady() {
    var view = window.WondiiOrg && window.WondiiOrg.get && window.WondiiOrg.get();
    if (window.WondiiOrg && (!view || view.status !== "ready")) return;
    loadSavedCast();
  }
  if (window.WondiiOrg && window.WondiiOrg.subscribe) window.WondiiOrg.subscribe(loadWhenReady);
  loadWhenReady();
  var fixture = params().get("fixture");
  if (fixture) openFixture(fixture);
  else if (params().get("create") === "1" || document.documentElement.classList.contains("book-v2")) paintCreate();
})();
