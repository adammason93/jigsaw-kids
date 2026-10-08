/* Child character studio. Uses the same creator as the family portal. */
(function (global) {
  "use strict";

  var host = document.getElementById("characterPage");
  var started = false;

  function say(text) {
    if (!host) return;
    host.replaceChildren();
    var note = document.createElement("p");
    note.textContent = text;
    var link = document.createElement("a");
    link.href = "child.html";
    link.textContent = "Join your Wondii";
    host.appendChild(note);
    host.appendChild(link);
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
