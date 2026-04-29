/**
 * AI storybook — calls Supabase Edge Function `storybook-generate`.
 * Requires: deploy function + OPENAI_API_KEY secret (see supabase/functions/storybook-generate/README.md).
 */
(function () {
  var CHARACTERS = [
    { id: "unicorn", label: "Unicorn" },
    { id: "dragon", label: "Little dragon" },
    { id: "robot", label: "Robot" },
    { id: "bunny", label: "Bunny" },
    { id: "teddy", label: "Teddy bear" },
  ];

  var PLACES = [
    { id: "beach", label: "Beach" },
    { id: "woods", label: "Woods" },
    { id: "castle", label: "Castle" },
    { id: "garden", label: "Garden" },
    { id: "space", label: "Space" },
  ];

  var wizard = document.getElementById("sbWizard");
  var book = document.getElementById("sbBook");
  var busy = document.getElementById("sbBusy");
  var nameInput = document.getElementById("sbName");
  var charRow = document.getElementById("sbCharacters");
  var placeRow = document.getElementById("sbPlaces");
  var errEl = document.getElementById("sbError");
  var btnGen = document.getElementById("sbGenerate");
  var bookTitle = document.getElementById("sbBookTitle");
  var pageText = document.getElementById("sbPageText");
  var pageArt = document.getElementById("sbPageArt");
  var pageImg = document.getElementById("sbPageImg");
  var btnPrev = document.getElementById("sbPrev");
  var btnNext = document.getElementById("sbNext");
  var pagerHint = document.getElementById("sbPagerHint");
  var btnNew = document.getElementById("sbNew");

  /** @type {string} */
  var selectedChar = "unicorn";
  /** @type {string} */
  var selectedPlace = "beach";
  /** @type {{ title: string, pages: { text: string, imageUrl: string|null }[] } | null} */
  var story = null;
  var pageIndex = 0;

  function setError(msg) {
    if (!errEl) return;
    if (!msg) {
      errEl.hidden = true;
      errEl.textContent = "";
      return;
    }
    errEl.hidden = false;
    errEl.textContent = msg;
  }

  function functionUrl() {
    var c = typeof window.SCORE_CONFIG !== "undefined" ? window.SCORE_CONFIG : null;
    var base = c && c.supabaseUrl ? String(c.supabaseUrl).replace(/\/$/, "") : "";
    if (!base) return "";
    return base + "/functions/v1/storybook-generate";
  }

  function anonKey() {
    var c = typeof window.SCORE_CONFIG !== "undefined" ? window.SCORE_CONFIG : null;
    return c && c.supabaseAnonKey ? String(c.supabaseAnonKey) : "";
  }

  function refreshCharacterChips() {
    if (!charRow) return;
    Array.prototype.forEach.call(charRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = CHARACTERS[i].id === selectedChar;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function refreshPlaceChips() {
    if (!placeRow) return;
    Array.prototype.forEach.call(placeRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = PLACES[i].id === selectedPlace;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function buildChipRows() {
    if (charRow) {
      charRow.textContent = "";
      CHARACTERS.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip";
        b.textContent = item.label;
        b.setAttribute("role", "radio");
        b.addEventListener("click", function () {
          selectedChar = item.id;
          refreshCharacterChips();
        });
        charRow.appendChild(b);
      });
      refreshCharacterChips();
    }
    if (placeRow) {
      placeRow.textContent = "";
      PLACES.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip";
        b.textContent = item.label;
        b.setAttribute("role", "radio");
        b.addEventListener("click", function () {
          selectedPlace = item.id;
          refreshPlaceChips();
        });
        placeRow.appendChild(b);
      });
      refreshPlaceChips();
    }
  }

  function showWizard() {
    story = null;
    pageIndex = 0;
    if (wizard) {
      wizard.classList.remove("is-hidden");
      wizard.hidden = false;
    }
    if (book) {
      book.classList.add("is-hidden");
      book.hidden = true;
    }
  }

  function showBook() {
    if (!story || !story.pages.length) return;
    if (wizard) {
      wizard.classList.add("is-hidden");
      wizard.hidden = true;
    }
    if (book) {
      book.classList.remove("is-hidden");
      book.hidden = false;
    }
    if (bookTitle) bookTitle.textContent = story.title;
    renderPage();
  }

  function renderPage() {
    if (!story) return;
    var p = story.pages[pageIndex];
    if (!p) return;
    if (pageText) pageText.textContent = p.text;
    if (p.imageUrl && pageImg && pageArt) {
      pageImg.src = p.imageUrl;
      pageImg.alt = "";
      pageArt.hidden = false;
    } else if (pageArt) {
      pageArt.hidden = true;
      if (pageImg) pageImg.removeAttribute("src");
    }
    if (pagerHint) {
      pagerHint.textContent = "Page " + (pageIndex + 1) + " of " + story.pages.length;
    }
    if (btnPrev) btnPrev.disabled = pageIndex === 0;
    if (btnNext) btnNext.disabled = pageIndex >= story.pages.length - 1;
  }

  function setBusy(on) {
    if (!busy) return;
    if (on) {
      busy.classList.remove("is-hidden");
      busy.hidden = false;
    } else {
      busy.classList.add("is-hidden");
      busy.hidden = true;
    }
  }

  buildChipRows();

  if (btnGen) {
    btnGen.addEventListener("click", function () {
      setError("");
      var url = functionUrl();
      var key = anonKey();
      if (!url || !key) {
        setError("Story server isn’t configured. Check score-config (Supabase URL + anon key).");
        return;
      }
      var childName = nameInput ? nameInput.value.trim() : "";
      setBusy(true);
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          apikey: key,
        },
        body: JSON.stringify({
          childName: childName || "Friend",
          character: selectedChar,
          place: selectedPlace,
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, status: r.status, body: j };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            var msg =
              out.body && out.body.error === "server_missing_openai"
                ? "OpenAI isn’t connected yet. A grown-up needs to set OPENAI_API_KEY on the story function."
                : out.body && out.body.error
                  ? "Couldn’t make the book (" + out.body.error + ")."
                  : "Couldn’t make the book (error " + out.status + ").";
            setError(msg);
            return;
          }
          story = {
            title: out.body.title,
            pages: out.body.pages || [],
          };
          pageIndex = 0;
          showBook();
        })
        .catch(function () {
          setError(
            "Network problem — is the story function deployed? See supabase/functions/storybook-generate/README.md."
          );
        })
        .finally(function () {
          setBusy(false);
        });
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      if (pageIndex > 0) {
        pageIndex--;
        renderPage();
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function () {
      if (story && pageIndex < story.pages.length - 1) {
        pageIndex++;
        renderPage();
      }
    });
  }
  if (btnNew) {
    btnNew.addEventListener("click", function () {
      showWizard();
    });
  }

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
