/* Internal showcase only. Does not touch school data. */
(function () {
  "use strict";

  var root = document.documentElement;
  var wondii = document.getElementById("themeWondii");
  var ramsden = document.getElementById("themeRamsden");
  var sample = document.getElementById("sampleDialog");
  var danger = document.getElementById("dangerDialog");
  var openSample = document.getElementById("openDialog");
  var openDanger = document.getElementById("openDanger");
  var loadBtn = document.getElementById("loadBtn");

  function theme(name) {
    if (name) root.setAttribute("data-school", name);
    else root.removeAttribute("data-school");
  }

  if (wondii) wondii.addEventListener("click", function () { theme(""); });
  if (ramsden) ramsden.addEventListener("click", function () { theme("ramsden"); });
  if (openSample && sample && sample.showModal) openSample.addEventListener("click", function () { sample.showModal(); });
  if (openDanger && danger && danger.showModal) openDanger.addEventListener("click", function () { danger.showModal(); });
  if (location.hash === "#ramsden") theme("ramsden");
  if (location.hash === "#dialog" && sample && sample.showModal) sample.showModal();
  if (location.hash === "#room") {
    var room = document.querySelector("[data-w-context='room']");
    if (room && room.scrollIntoView) room.scrollIntoView();
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", function () {
      loadBtn.classList.add("is-loading");
      loadBtn.disabled = true;
      window.setTimeout(function () {
        loadBtn.classList.remove("is-loading");
        loadBtn.disabled = false;
      }, 900);
    });
  }
})();
