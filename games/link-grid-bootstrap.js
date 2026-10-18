/* Loads level markup then starts the main game (levels are heavy — kept in link-grid-levels-content.html). */
(function () {
  var root = document.querySelector(".levels");
  if (!root) return;
  fetch("link-grid-levels-content.html")
    .then(function (r) {
      if (!r.ok) throw new Error("levels_load_failed");
      return r.text();
    })
    .then(function (html) {
      root.innerHTML = html.trim();
      var s = document.createElement("script");
      s.src = "link-grid-main.js";
      document.body.appendChild(s);
    })
    .catch(function (e) {
      console.error(e);
      root.innerHTML =
        "<pre id=\"fallback\" data-blurb=\"★\">blurb: Error\n---\n@=.=.\n    !\n. . .\n    !\n*=.=.</pre>";
      var s = document.createElement("script");
      s.src = "link-grid-main.js";
      document.body.appendChild(s);
    });
})();
