/* Homepage "Sofia's Story Books" shelf — reads the same library the story maker saves to. */
(function () {
  "use strict";

  var LS_KEY = "jigsawKids_storybookShelf_v1";
  var MAX_BOOKS = 12;
  var STORY_URL = "games/storybook.html";

  var track = document.getElementById("homeBooksTrack");
  var prevBtn = document.getElementById("homeBooksPrev");
  var nextBtn = document.getElementById("homeBooksNext");
  var sub = document.getElementById("homeBooksSub");
  if (!track) return;

  var lastSignature = null;

  function loadFromLocalStorage() {
    try {
      var data = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function loadBooks(cb) {
    var store = window.StorybookShelfStore;
    if (!store || typeof store.getJson !== "function") {
      cb([]);
      return;
    }
    store
      .getJson()
      .then(function (list) {
        cb(Array.isArray(list) ? list : []);
      })
      .catch(function () {
        cb([]);
      });
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  var COLOUR_HUES = [
    ["navy", 225], ["teal", 180], ["mint", 150], ["green", 130], ["blue", 205],
    ["lilac", 270], ["purple", 280], ["coral", 355], ["pink", 325], ["red", 8],
    ["orange", 30], ["yellow", 48],
  ];

  function hueFor(book) {
    var c = String(book.bookColor || "").toLowerCase();
    for (var i = 0; i < COLOUR_HUES.length; i++) {
      if (c.indexOf(COLOUR_HUES[i][0]) !== -1) return COLOUR_HUES[i][1];
    }
    return hash(String(book.id) + ":" + String(book.title)) % 360;
  }

  /** Candidate cover images, most reliable first (saved copies before remote links that may expire). */
  function coverSources(book) {
    var out = [];
    function add(u) {
      u = String(u || "").trim();
      if (u && out.indexOf(u) === -1 && u.indexOf("blob:") !== 0) {
        out.push(u);
      }
    }
    add(book.sceneDataUrl);
    add(book.sceneUrlFallback);
    var pages = Array.isArray(book.pages) ? book.pages : [];
    for (var i = 0; i < pages.length && out.length < 4; i++) {
      add(pages[i] && pages[i].imageDataUrl);
      add(pages[i] && pages[i].imageUrlFallback);
    }
    return out;
  }

  function shortTitle(t) {
    t = String(t || "My Story").trim() || "My Story";
    return t.length > 40 ? t.slice(0, 38) + "…" : t;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function bookCard(book, index) {
    var title = shortTitle(book.title);
    var li = el("li", "hbook");
    li.style.setProperty("--h", String(hueFor(book)));
    li.style.setProperty("--tilt", (index % 3 === 1 ? 0 : index % 3 === 0 ? -1.2 : 1.2) + "deg");

    var a = el("a", "hbook__link");
    a.href = STORY_URL + "?book=" + encodeURIComponent(book.id);
    a.setAttribute("aria-label", "Read " + title);

    var cover = el("span", "hbook__cover");
    var spine = el("span", "hbook__spine");
    spine.setAttribute("aria-hidden", "true");
    cover.appendChild(spine);

    var art = el("span", "hbook__art");
    var sources = coverSources(book);
    if (sources.length) {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      var at = 0;
      img.onerror = function () {
        at += 1;
        if (at < sources.length) {
          img.src = sources[at];
        } else {
          img.remove();
          cover.classList.add("hbook__cover--plain");
        }
      };
      img.src = sources[0];
      art.appendChild(img);
    } else {
      cover.classList.add("hbook__cover--plain");
    }
    cover.appendChild(art);

    var titleEl = el("span", "hbook__title", title);
    titleEl.setAttribute("aria-hidden", "true");
    cover.appendChild(titleEl);
    cover.appendChild(el("span", "hbook__shine"));

    a.appendChild(cover);
    a.appendChild(el("span", "hbook__label", title));
    li.appendChild(a);
    return li;
  }

  function extraCard(opts) {
    var li = el("li", "hbook hbook--extra" + (opts.cls ? " " + opts.cls : ""));
    var a = el("a", "hbook__link");
    a.href = opts.href;
    var cover = el("span", "hbook__cover");
    cover.appendChild(el("span", "hbook__extra-icon", opts.icon));
    cover.appendChild(el("span", "hbook__extra-text", opts.text));
    a.appendChild(cover);
    a.appendChild(el("span", "hbook__label", opts.label));
    li.appendChild(a);
    return li;
  }

  function render(books) {
    var list = books.filter(function (b) {
      return b && b.id && Array.isArray(b.pages) && b.pages.length;
    });
    var signature = list
      .slice(0, MAX_BOOKS)
      .map(function (b) {
        return b.id + "|" + (b.savedAt || "") + "|" + coverSources(b).length;
      })
      .join(",");
    if (signature === lastSignature) return;
    lastSignature = signature;

    track.textContent = "";
    var shown = list.slice(0, MAX_BOOKS);
    shown.forEach(function (b, i) {
      track.appendChild(bookCard(b, i));
    });

    if (!shown.length) {
      track.appendChild(
        extraCard({
          href: STORY_URL + "?sample=1",
          icon: "📖",
          text: "A sample story",
          label: "Read a sample",
          cls: "hbook--sample",
        }),
      );
    }
    track.appendChild(
      extraCard({
        href: STORY_URL,
        icon: "✨",
        text: shown.length ? "Make another book" : "Make your first book",
        label: "New book",
        cls: "hbook--new",
      }),
    );

    if (sub) {
      sub.textContent = shown.length
        ? "Read, explore and create your own stories."
        : "No books on the shelf yet — make one with the story maker and it will appear here!";
    }
    track.scrollLeft = 0;
    updateArrows();
  }

  function updateArrows() {
    if (!prevBtn || !nextBtn) return;
    var max = track.scrollWidth - track.clientWidth;
    var overflow = max > 4;
    prevBtn.hidden = !overflow;
    nextBtn.hidden = !overflow;
    prevBtn.disabled = track.scrollLeft <= 4;
    nextBtn.disabled = track.scrollLeft >= max - 4;
  }

  function scrollBy(dir) {
    var card = track.querySelector(".hbook");
    var step = card ? card.getBoundingClientRect().width + 16 : 220;
    var visible = Math.max(1, Math.floor(track.clientWidth / step));
    track.scrollBy({ left: dir * step * visible, behavior: "smooth" });
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { scrollBy(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { scrollBy(1); });
  track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  function refresh() {
    loadBooks(render);
  }

  refresh();
  window.addEventListener("kids-scorecard-refresh", refresh);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refresh();
  });
})();
