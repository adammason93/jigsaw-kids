(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reveals = document.querySelectorAll(".w-reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* ---------- Try it: a quick templated sample story (no account, nothing sent anywhere) ---------- */

  var form = document.getElementById("tryForm");
  var nameIn = document.getElementById("tryName");
  var yearIn = document.getElementById("tryYear");
  var loveIn = document.getElementById("tryLove");
  var note = document.getElementById("tryNote");
  var dialog = document.getElementById("sampleDialog");
  var titleEl = document.getElementById("sampleTitle");
  var storyEl = document.getElementById("sampleStory");
  if (!form || !dialog) return;

  var THEMES = [
    { match: /dino|t-?rex|jurassic/i, place: "a valley where the dinosaurs still roam", friend: "a friendly baby triceratops", thing: "a giant glowing egg" },
    { match: /space|planet|rocket|star|moon|astronaut/i, place: "the edge of the Milky Way", friend: "a little robot called Bleep", thing: "a lost shooting star" },
    { match: /football|soccer|goal/i, place: "the Great Golden Stadium", friend: "a talking football called Bouncer", thing: "the missing golden boot" },
    { match: /unicorn|pony|horse/i, place: "the Rainbow Meadows", friend: "a shy unicorn called Moonbeam", thing: "a rainbow that had lost its colours" },
    { match: /princess|castle|knight|dragon/i, place: "a castle high in the clouds", friend: "a tiny dragon who could only sneeze bubbles", thing: "the queen’s missing crown" },
    { match: /ocean|sea|mermaid|fish|shark|dolphin/i, place: "a coral city under the sea", friend: "a giggly dolphin called Splash", thing: "a pearl that sang lullabies" },
    { match: /cat|kitten|dog|puppy|animal|pet/i, place: "the Whispering Woods", friend: "a puppy with very floppy ears", thing: "a trail of sparkly paw prints" },
    { match: /car|race|truck|train|tractor/i, place: "the Twisty Mountain racetrack", friend: "a cheeky little red car called Zoom", thing: "the shiniest trophy in the land" },
  ];
  var DEFAULT_THEME = { place: "a magical land at the bottom of the garden", friend: "a friendly fox with a star on its tail", thing: "a door that only opened for brave hearts" };

  var EARLY = { nursery: 1, reception: 1, y1: 1 };

  function cleanName(s) {
    s = String(s || "").replace(/[^\p{L}\p{M}' -]/gu, "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function cleanLove(s) {
    return String(s || "").replace(/[<>]/g, "").trim();
  }

  function pickTheme(love) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].match.test(love)) return THEMES[i];
    }
    return DEFAULT_THEME;
  }

  function firstLove(love) {
    var first = love.split(/,|\band\b|&/i)[0].trim().toLowerCase();
    return first || "adventures";
  }

  function buildStory(name, year, love) {
    var t = pickTheme(love);
    var loves = firstLove(love);
    var early = !!EARLY[year];
    var SMALL = { the: 1, a: 1, an: 1, of: 1, that: 1, had: 1, its: 1, in: 1, only: 1, for: 1 };
    var thing = t.thing.replace(/^(a|an|the) /i, "").split(" ").map(function (w) {
      return SMALL[w.toLowerCase()] ? w : w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
    var title = name + " and the " + thing;
    var paras = early
      ? [
          name + " loved " + loves + ". One night, a light shone under the bed. It was a map!",
          "The map took " + name + " to " + t.place + ". There, " + name + " met " + t.friend + ".",
          "“Can you help us find " + t.thing + "?” asked the friend. " + name + " smiled. “Yes! Let’s go!”",
        ]
      : [
          "Everyone knew that " + name + " loved " + loves + " more than almost anything. So when a crumpled map floated through the bedroom window one evening, " + name + " didn’t hesitate for a second.",
          "The map led all the way to " + t.place + ", where " + name + " was greeted by " + t.friend + " who had been waiting a very long time for someone brave enough to come.",
          "“We need your help,” the friend whispered. “Only you can find " + t.thing + ".” " + name + " took a deep breath, tightened a shoelace, and stepped into the adventure…",
        ];
    return { title: title, paras: paras };
  }

  var lastInput = null;

  function showStory(input) {
    var s = buildStory(input.name, input.year, input.love);
    titleEl.textContent = s.title;
    storyEl.textContent = "";
    s.paras.forEach(function (p) {
      var el = document.createElement("p");
      el.textContent = p;
      storyEl.appendChild(el);
    });
    var more = document.createElement("p");
    more.className = "w-sample__more";
    more.innerHTML = "<strong>In the full Game Room</strong>, " + "this becomes an illustrated book starring " + "<span></span>" + " — plus puzzles and games made from it.";
    more.querySelector("span").textContent = input.name;
    storyEl.appendChild(more);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = cleanName(nameIn.value);
    if (!name) {
      nameIn.classList.add("is-invalid");
      note.textContent = "Add their first name to see the sample.";
      note.classList.add("is-error");
      nameIn.focus();
      return;
    }
    nameIn.classList.remove("is-invalid");
    note.textContent = "No account needed to try it.";
    note.classList.remove("is-error");
    lastInput = { name: name, year: yearIn.value, love: cleanLove(loveIn.value) };
    showStory(lastInput);
  });

  nameIn.addEventListener("input", function () {
    if (nameIn.value.trim()) {
      nameIn.classList.remove("is-invalid");
      note.classList.remove("is-error");
      note.textContent = "No account needed to try it.";
    }
  });

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  document.getElementById("sampleClose").addEventListener("click", closeDialog);
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) closeDialog();
  });
  document.getElementById("sampleAgain").addEventListener("click", function () {
    closeDialog();
    loveIn.focus();
    loveIn.select();
  });
})();
