/* Child character studio. Uses the same creator as the family portal. */
(function (global) {
  "use strict";

  var host = document.getElementById("characterPage");
  var started = false;

  function say(text) {
    if (!host) return;
    host.replaceChildren();
    var card = document.createElement("section");
    card.className = "family-empty";
    var title = document.createElement("h1");
    title.className = "family-title";
    title.textContent = "My characters";
    var note = document.createElement("p");
    note.textContent = text;
    var link = document.createElement("a");
    link.className = "family-btn";
    link.href = "child.html";
    link.textContent = "Join your Wondii";
    card.appendChild(title);
    card.appendChild(note);
    card.appendChild(link);
    host.appendChild(card);
  }

  function open() {
    if (started || !host || !global.WondiiCharacterPortal) return;
    if (!global.ChildLibrary || !global.ChildLibrary.isChildSession || !global.ChildLibrary.isChildSession()) {
      say("Ask a grown-up for a pairing code to make a character.");
      return;
    }
    started = true;
    global.WondiiCharacterPortal.mount(host);
  }

  if (global.WondiiSession && global.WondiiSession.subscribe) {
    global.WondiiSession.subscribe(function (snap) {
      if (!snap || snap.status === "initialising") return;
      open();
    });
  } else {
    say("Ask a grown-up for a pairing code to make a character.");
  }
})(window);
